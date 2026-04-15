# RFC: Deepen `MtaConfig` God Class into `MtaDeployment` Builder

**Status**: Proposed
**Package**: `@sap-ux/cf-deploy-config-writer`
**Created**: 2026-03-24
**Scope**: Internal refactor — no public API changes for callers outside this package

---

## Problem

`src/mta-config/mta.ts` is a 1,313-line god class (`MtaConfig`) with 20+ public methods covering three distinct responsibilities:

1. **Router management** — `addRouterType`, `addManagedAppRouter`, `addStandaloneRouter`, `addAppFrontAppRouter`, `addRoutingModules`
2. **Resource management** — `addXSUAAResource`, `addDestinationResource`, `addHTML5RepoResource`, `addConnectivityResource`, `addAbapService`
3. **Destination management** — `getExposedDestinations`, `appendInstanceBasedDestination`, `addDestinationToAppRouter`, `addMtaExtensionConfig`

All three share a single `Mta` instance, three `Map` caches (`apps`, `modules`, `resources`), and a `dirty` flag.

### Symptoms of friction

- **`app-config.ts:appendAppRouter()`** makes 6+ sequential async calls to `MtaConfig` with manual conditional logic — 40 lines of orchestration that could be 8.
- `mta.test.ts` is 398 lines that test the entire class surface; isolating "does the managed router wire correctly" requires setting up resource state too, because `addManagedAppRouter()` calls both.
- `addManagedAppRouter()` alone is 82 lines of deeply nested resource/module composition.
- Understanding "how to add a managed router" requires bouncing across `addManagedAppRouter`, `addDestinationResource`, `addXSUAAResource`, `addHTML5RepoResource`, and two private helpers.

---

## Proposed Solution: `MtaDeployment` Builder (Hybrid Design)

Replace the god class with a **single public builder class** (`MtaDeployment`) that has two primary entry points, backed internally by **three private manager classes** that enforce separation of concerns without leaking complexity to callers.

### Public API (what callers see)

```typescript
export class MtaDeployment {
  /** Factory — loads mta.yaml and caches state */
  static async create(mtaDir: string, logger?: Logger): Promise<MtaDeployment>;

  // --- PRIMARY ENTRY POINTS ---

  /** 80% case: full managed HTML5 app deployment in one call */
  async deployManagedApp(options: ManagedAppOptions): Promise<this>;

  /** Non-standard router types (standalone, appFront) */
  async deployWithRouter(options: RouterDeployOptions): Promise<this>;

  // --- ESCAPE HATCHES (direct access for edge cases) ---
  readonly resources: MtaResourceAccessor;   // read + add + update
  readonly modules: MtaModuleAccessor;       // read + add + update

  // --- STATE QUERIES ---
  readonly prefix: string;
  readonly hasAppFrontendRouter: boolean;
  readonly cloudServiceName: string | undefined;
  readonly exposedDestinations: string[];
  hasManagedXsuaaResource(): boolean;

  // --- LIFECYCLE ---
  async save(): Promise<boolean>;
}

export interface ManagedAppOptions {
  appName: string;
  appPath: string;
  destinationName?: string;
  addConnectivity?: boolean;
  abapService?: { name: string; btpService: string };
}

export interface RouterDeployOptions {
  routerType: RouterModuleType;
  addMissingModules?: boolean;
  addConnectivity?: boolean;
  abapService?: { name: string; btpService: string };
}
```

### Internal structure (private, not visible to callers)

```
MtaDeployment (public builder)
├── RouterConfigurator  (private) — addStandaloneRouter, addManagedRouter, addAppFrontRouter
├── ResourceManager     (private) — ensureXsuaaResource, ensureDestinationResource, ensureHtml5HostResource, ...
└── DestinationManager  (private) — addInstanceDestination, addAppFrontDestination, getExposedDestinations, ...

All three share an MtaContext (the Mta instance + Maps + dirty flag).
```

`RouterConfigurator`, `ResourceManager`, and `DestinationManager` are **not exported**. They exist to make private methods of `MtaDeployment` testable in isolation and to keep each file under ~250 lines.

---

## Before / After: Primary Caller

### Before (`app-config.ts:appendAppRouter`, ~40 lines)
```typescript
const mtaInstance = await getMtaConfig(cfConfig.rootPath);
if (mtaInstance) {
  await mtaInstance.addRoutingModules({
    isManagedApp: cfConfig.addManagedAppRouter,
    isAppFrontApp: cfConfig.addAppFrontendRouter,
    addMissingModules: !cfConfig.addAppFrontendRouter
  });
  const appRelativePath = toPosixPath(relative(cfConfig.rootPath, cfConfig.appPath));
  await mtaInstance.addApp(cfConfig.appId, appRelativePath ?? '.');
  if ((cfConfig.addMtaDestination && cfConfig.isCap) || cfConfig.destinationName === DefaultMTADestination) {
    cfConfig.destinationName =
      cfConfig.destinationName === DefaultMTADestination ? SRV_API : cfConfig.destinationName;
    await mtaInstance.addDestinationToAppRouter(cfConfig.destinationName);
    if (!mtaInstance.hasManagedXsuaaResource()) {
      cfConfig.destinationAuthentication = Authentication.NO_AUTHENTICATION;
    }
  }
  cleanupStandaloneRoutes(cfConfig, mtaInstance, fs);
  await saveMta(cfConfig, mtaInstance);
  cfConfig.cloudServiceName = mtaInstance.cloudServiceName;
  cfConfig.addAppFrontendRouter = mtaInstance.hasAppFrontendRouter();
}
```

### After (~12 lines)
```typescript
const mta = await MtaDeployment.create(cfConfig.rootPath);
const routerType = cfConfig.addAppFrontendRouter ? RouterModuleType.AppFront
  : cfConfig.addManagedAppRouter ? RouterModuleType.Managed
  : RouterModuleType.Standard;
await mta.deployManagedApp({
  appName: cfConfig.appId,
  appPath: toPosixPath(relative(cfConfig.rootPath, cfConfig.appPath)) ?? '.',
  destinationName: cfConfig.destinationName,
  addConnectivity: cfConfig.addConnectivityService
});
if (!mta.hasManagedXsuaaResource()) {
  cfConfig.destinationAuthentication = Authentication.NO_AUTHENTICATION;
}
cfConfig.cloudServiceName = mta.cloudServiceName;
cfConfig.addAppFrontendRouter = mta.hasAppFrontendRouter;
cleanupStandaloneRoutes(cfConfig, mta, fs);
await mta.save();
```

---

## File Structure After Refactor

```
src/mta-config/
  mta-deployment.ts        ← New: MtaDeployment public class (~200 lines)
  mta-context.ts           ← New: MtaContext interface + shared state (~60 lines)
  router-configurator.ts   ← New: private RouterConfigurator (~200 lines)
  resource-manager.ts      ← New: private ResourceManager (~250 lines)
  destination-manager.ts   ← New: private DestinationManager (~200 lines)
  mta.ts                   ← Kept but shrunk: MtaConfig kept as @deprecated wrapper (~100 lines)
  index.ts                 ← Updated exports
```

Total: ~1,010 lines across 6 focused files vs 1,313 lines in one file. More importantly, each file has a single reason to change.

---

## Test Impact

| Current test | Replaced by |
|---|---|
| `mta.test.ts` tests router wiring via full class | `router-configurator.test.ts` boundary tests — mock `MtaContext`, verify module additions |
| `mta.test.ts` tests resource creation via full class | `resource-manager.test.ts` boundary tests — mock `MtaContext`, verify resource additions |
| `index-app.test.ts` sets up 8+ mocks for a single append | `mta-deployment.test.ts` mocks `RouterConfigurator`, `ResourceManager`, `DestinationManager` |

Snapshot tests for generated mta.yaml content stay — they test the boundary of the public `MtaDeployment` class, which is the right level.

---

## Migration Strategy

1. **Add** `MtaDeployment` class alongside existing `MtaConfig` (no deletions yet)
2. **Refactor** `app-config.ts` to use `MtaDeployment` — this is the highest-value change
3. **Refactor** `cap-config.ts` and `base-config.ts`
4. **Mark** `MtaConfig` as `@deprecated` with JSDoc pointing to `MtaDeployment`
5. **Delete** `MtaConfig` in a follow-up PR (patch bump, old class was internal)

Steps 1–3 can be done incrementally across separate PRs, each passing all tests.

---

## What Is NOT Changing

- The external public API (`generateAppConfig`, `generateBaseConfig`, `generateCAPConfig`) — no callers outside this package are affected
- The `mta.yaml` output format — all existing snapshots should pass unchanged
- The `types/index.ts` type definitions
- The retry/delay logic in `getMtaConfig()` — that's a separate architectural concern (Candidate 3)

---

## Open Questions

- Should `MtaResourceAccessor` and `MtaModuleAccessor` (the escape hatches) be typed interfaces or concrete classes? Interfaces are easier to mock; concrete classes are simpler to implement initially.
- The `cleanupStandaloneRoutes()` call in `app-config.ts` currently takes an `MtaConfig` parameter — it will need updating to accept `MtaDeployment`. Check if it uses anything that won't be on the new class.

---

## Related Candidates (not in this RFC)

See separate RFC sections below for each candidate.

---

# RFC: Candidate 2 — HTML5 App Deployment Orchestration (`appendAppRouter`)

**Status**: Proposed
**Files**: `src/cf-writer/app-config.ts`, `src/utils.ts`, `src/mta-config/index.ts`

## Problem

`appendAppRouter()` in `app-config.ts` orchestrates 6+ sequential async calls to `MtaConfig` (soon `MtaDeployment`) while also mutating the `cfConfig` object in-place:

```typescript
// app-config.ts:282–309 — 40 lines of orchestration
async function appendAppRouter(cfConfig: CFConfig, fs: Editor): Promise<void> {
    const mtaInstance = await getMtaConfig(cfConfig.rootPath);
    if (mtaInstance) {
        await mtaInstance.addRoutingModules({ ... });          // router
        await mtaInstance.addApp(appModule, appRelativePath);  // app
        if (condition) {
            cfConfig.destinationName = ...;                    // mutates config
            await mtaInstance.addDestinationToAppRouter(...);  // destination
            if (!mtaInstance.hasManagedXsuaaResource()) {
                cfConfig.destinationAuthentication = ...;      // mutates config again
            }
        }
        cleanupStandaloneRoutes(cfConfig, mtaInstance, fs);
        await saveMta(cfConfig, mtaInstance);
        cfConfig.cloudServiceName = mtaInstance.cloudServiceName;   // mutates config
        cfConfig.addAppFrontendRouter = mtaInstance.hasAppFrontendRouter(); // mutates config
    }
}
```

### Friction points

- `cfConfig` is mutated at four different points inside the orchestrator — callers cannot know the final state without tracing the full function
- Testing requires a fully-initialised MTA fixture + 8+ mocks just to verify "does destination get wired if `addMtaDestination` is true"
- The `saveMta()` helper exists only to wrap the API Hub extension call alongside `save()` — this coupling is invisible

## Proposed Solution

Move the full orchestration into `MtaDeployment.deployManagedApp()` (which was designed for this). `appendAppRouter()` becomes a thin adapter that reads the final state back after a single call:

```typescript
// After: ~12 lines
async function appendAppRouter(cfConfig: CFConfig, fs: Editor): Promise<void> {
    const mta = await getMtaConfig(cfConfig.rootPath);
    if (!mta) return;

    const routerType = cfConfig.addAppFrontendRouter ? RouterModuleType.AppFront
        : cfConfig.addManagedAppRouter ? RouterModuleType.Managed
        : RouterModuleType.Standard;

    await mta.deployManagedApp({
        appName: cfConfig.appId,
        appPath: toPosixPath(relative(cfConfig.rootPath, cfConfig.appPath)) ?? '.',
        destinationName: shouldAddDestination(cfConfig) ? resolvedDestName(cfConfig) : undefined,
        addConnectivity: cfConfig.addConnectivityService
    });

    if (!mta.hasManagedXsuaaResource()) {
        cfConfig.destinationAuthentication = Authentication.NO_AUTHENTICATION;
    }
    cfConfig.cloudServiceName = mta.cloudServiceName;
    cfConfig.addAppFrontendRouter = mta.hasAppFrontendRouter();

    cleanupStandaloneRoutes(cfConfig, mta, fs);
    await saveMta(cfConfig, mta);
}
```

## Dependencies

- Candidate 1 (`MtaDeployment`) must be complete first — `deployManagedApp()` must accept `destinationName`

## Test Impact

- `index-app.test.ts`: fixture + 8-mock setup replaced with mock of `MtaDeployment` boundary
- Inline conditional logic (`cfConfig.destinationName === DefaultMTADestination`) moves inside `deployManagedApp()` where it belongs

---

# RFC: Candidate 3 — Hardcoded Delays / mta-lib Timing Seam

**Status**: DONE — branch `refactor/cf-deploy-config-hardcoded-delays`, commit `49a63f860`
**Files**: `src/mta-config/index.ts:getMtaConfig()`, `src/cf-writer/cap-config.ts:generateCAPConfig()`

## Problem

Two places use hardcoded `setTimeout` delays to work around `@sap/mta-lib` requiring files to be fully written before they can be read:

```typescript
// index.ts — 5 retries × 1000ms = up to 5s blocking
export async function getMtaConfig(rootPath: string): Promise<MtaConfig | undefined> {
    for (let retries = MAX_RETRIES; retries >= 0; retries--) {
        try {
            mtaConfig = await MtaConfig.newInstance(rootPath, ...);
            if (mtaConfig?.prefix) break;
        } catch (error) {
            await new Promise((resolve) => setTimeout(resolve, MTA_FILE_OPERATION_DELAY_MS)); // 1000ms
        }
    }
}

// cap-config.ts — 1000ms unconditional delay after cds generates mta.yaml
await generateCAPMTA(config, fs);
await new Promise((resolve) => setTimeout(resolve, MTA_FILE_OPERATION_DELAY_MS));
await addRoutingConfig(config, fs);
```

### Friction points

- `getMtaConfig()` can silently delay up to 5 seconds on slow filesystems with no visibility to callers
- The CAP delay is unconditional — it always waits 1 second even when the file was written instantly
- Tests mock away the delay entirely; the retry logic itself is never tested
- The constant `MTA_FILE_OPERATION_DELAY_MS` communicates "this is a known hack" but doesn't explain the root cause

## Proposed Solution

Replace both with a **file-ready predicate** that polls using `fs.existsSync` + MTA ID check, with a configurable timeout and exponential backoff:

```typescript
// New: src/mta-config/wait-for-mta.ts
export async function waitForMtaFile(
    mtaPath: string,
    { maxWaitMs = 5000, pollIntervalMs = 100 } = {}
): Promise<void> {
    const mtaFilePath = join(mtaPath, FileName.MtaYaml);
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
        if (existsSync(mtaFilePath)) {
            // File exists — verify it's readable and has an ID
            try {
                const mta = new Mta(mtaPath, false);
                const id = await mta.getMtaID();
                if (id) return;
            } catch { /* not ready yet */ }
        }
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    throw new Error(t('error.mtaFileNotReady', { mtaPath }));
}
```

`getMtaConfig()` drops the retry loop and calls `waitForMtaFile()` once before instantiating.
`generateCAPConfig()` replaces the fixed 1000ms delay with `waitForMtaFile()`.

## Test Impact

- `waitForMtaFile()` is independently testable — mock `existsSync` and `Mta.getMtaID()`
- `getMtaConfig()` test no longer needs to mock `setTimeout` timing
- The retry behaviour is now visible and verifiable rather than hidden in a loop

## Migration Note

`MTA_FILE_OPERATION_DELAY_MS` constant can be removed once both call sites are updated. Keep it only if external callers have adopted it (check with `grep -r MTA_FILE_OPERATION_DELAY_MS`).

---

# RFC: Candidate 4 — Global BTP Destinations Cache

**Status**: Proposed
**Files**: `src/utils.ts`

## Problem

A module-level mutable variable caches the BTP destinations list for the lifetime of the Node.js process:

```typescript
// utils.ts
let cachedDestinationsList: Destination[] | undefined;

export async function getBTPDestinations(): Promise<Destination[]> {
    if (!cachedDestinationsList) {
        cachedDestinationsList = await listDestinations();
    }
    return cachedDestinationsList;
}
```

### Friction points

- Any test or generator invocation that calls `getBTPDestinations()` twice gets the first call's result — including stale or empty results from a failed first call
- Tests must `jest.resetModules()` between runs or carefully order test cases to avoid cross-contamination
- If the user's BTP session changes (token refresh, new destination added) between calls within one process, the cache silently serves stale data
- There is no way to opt out of caching or force a refresh

## Proposed Solution

Scope the cache to the call site rather than the module. Replace the module-level variable with a factory that returns a scoped fetcher:

```typescript
// Option A: Simple — accept a cache parameter (easiest migration)
export async function getBTPDestinations(
    cache: { list?: Destination[] } = {}
): Promise<Destination[]> {
    cache.list ??= await listDestinations();
    return cache.list;
}
```

Callers that want caching create one cache object per generator run and pass it through:

```typescript
// In generateAppConfig():
const destinationCache: { list?: Destination[] } = {};
const props = await getDestinationProperties(destName, destinationCache);
```

This gives each generator invocation its own cache scope that is naturally garbage-collected when the run ends. Tests pass a fresh `{}` per test case — no module reset needed.

Alternatively, if the caching is genuinely needed for performance across multiple calls in one request, move it to a class:

```typescript
// Option B: Class-scoped cache
export class DestinationCache {
    private list?: Destination[];
    async get(): Promise<Destination[]> {
        this.list ??= await listDestinations();
        return this.list;
    }
    invalidate(): void { this.list = undefined; }
}
```

## Test Impact

- `utils.test.ts` no longer needs module reset between BTP destination tests
- `index-app.test.ts` can pass a pre-populated cache object instead of mocking `getBTPDestinations` module-wide

---

# RFC: Candidate 5 — Scattered Template Rendering

**Status**: Proposed
**Files**: `src/mta-config/mta.ts` (`addMtaExtensionConfig`), `src/utils.ts` (`addXSSecurityConfig`, `addRootPackage`, `addGitIgnore`), `src/mta-config/index.ts` (`createMTA`, `createCAPMTAAppFrontend`)

## Problem

EJS template rendering + `writeFileSync` + hardcoded `__dirname`-relative template paths are scattered across three files:

```typescript
// mta.ts:907 — inside a business logic method
const mtaExtTemplate = readFileSync(
    join(__dirname, `../../templates/app/${FileName.MtaExtYaml}`), 'utf-8'
);
writeFileSync(mtaExtFilePath, render(mtaExtTemplate, mtaExt));

// index.ts:92 — inside createMTA()
const mtaTemplate = readFileSync(getTemplatePath(`app/${FileName.MtaYaml}`), 'utf-8');
writeFileSync(join(config.mtaPath, FileName.MtaYaml), render(mtaTemplate, { ... }));

// utils.ts:addXSSecurityConfig, addRootPackage, addGitIgnore
// — use mem-fs copyTpl (different mechanism entirely)
```

### Friction points

- Two different template mechanisms in use: `readFileSync` + `render` + `writeFileSync` vs. `mem-fs-editor`'s `copyTpl`
- `addMtaExtensionConfig` in `mta.ts` bypasses `mem-fs` entirely, writing directly to disk — this means it cannot be inspected or rolled back via the in-memory FS in tests
- `__dirname`-relative paths are fragile if the package is bundled or the dist folder layout changes
- No single place to change the template engine or add template caching

## Proposed Solution

Consolidate all template rendering behind a single `TemplateRenderer` module that uses `mem-fs-editor.copyTpl` consistently:

```typescript
// New: src/mta-config/template-renderer.ts
export function renderTemplate(
    fs: Editor,
    templateName: string,
    outputPath: string,
    data: Record<string, unknown>
): void {
    fs.copyTpl(getTemplatePath(templateName), outputPath, data);
}
```

For the `addMtaExtensionConfig` case (which currently writes directly to disk because `mta-lib` needs to read it back), keep the `writeFileSync` but extract it to the same module so there is one place that knowingly bypasses `mem-fs`:

```typescript
// In template-renderer.ts
export function renderTemplateToDisk(
    templateName: string,
    outputPath: string,
    data: Record<string, unknown>
): void {
    // Intentionally bypasses mem-fs — mta-lib requires file to be on disk
    const template = readFileSync(getTemplatePath(templateName), 'utf-8');
    writeFileSync(outputPath, render(template, data));
}
```

This makes the bypass explicit and documented rather than hidden inside business logic.

## Migration Steps

1. Create `src/mta-config/template-renderer.ts` with both functions
2. Update `addMtaExtensionConfig` to call `renderTemplateToDisk`
3. Update `createMTA` and `createCAPMTAAppFrontend` to use `renderTemplateToDisk`
4. Verify `getTemplatePath()` is the single source of truth for `__dirname`-relative resolution

## Test Impact

- `addMtaExtensionConfig` tests can now assert on `renderTemplateToDisk` calls rather than mocking `writeFileSync` at the `fs` module level
- Template path resolution errors surface at the renderer boundary rather than inside business logic methods
