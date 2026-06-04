# Gap 2 — Derive `configuration.exclude` from `builder.resources.excludes` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `configuration.exclude` from newly generated `ui5-deploy.yaml` and make `deploy-tooling` read `builder.resources.excludes` as the authoritative exclude source, with `configuration.exclude` as a backward-compatible fallback, merging both when present.

**Architecture:** Gap 1 added `addBuilderResourceExcludes()` and ensures `builder.resources.excludes` is written to both `ui5.yaml` and `ui5-deploy.yaml`. Gap 2 makes `addAbapDeployTask` stop emitting `configuration.exclude` for new configs, and updates `deploy-tooling`'s UI5 task to read `builder.resources.excludes` from the yaml (converting glob patterns to regex-safe prefixes), falling back to and merging with `configuration.exclude` when present.

**Tech Stack:** TypeScript, `@sap-ux/yaml` (YAML document API), `adm-zip`, Node.js `fs/promises`, Jest snapshots.

---

## Branch Setup

- [ ] **Create branch from gap1**

```bash
git checkout -b fix/4756-gap2-builder-resource-excludes-derive origin/fix/4756-gap1-builder-resource-excludes
```

Expected: new branch checked out with all Gap 1 changes present.

---

## Task 1: `ui5-config` — Add `getBuilderResourceExcludes()` and strip hardcoded defaults from `addAbapDeployTask`

**Files:**
- Modify: `packages/ui5-config/src/ui5config.ts`
- Modify: `packages/ui5-config/test/index.test.ts`

### Context

On the gap1 branch, `addAbapDeployTask` (around line 668) always writes `configuration.exclude` by merging the `exclude` param with hardcoded `['/test/', '/localService/']`. New configs must NOT have `configuration.exclude` in the yaml — the deploy tooling will read from `builder.resources.excludes` instead.

- [ ] **Step 1.1: Write failing tests for `getBuilderResourceExcludes()`**

In `packages/ui5-config/test/index.test.ts`, add a `describe('getBuilderResourceExcludes', ...)` block after the existing `describe('addBuilderResourceExcludes', ...)` block:

```typescript
describe('getBuilderResourceExcludes', () => {
    test('returns empty array when builder.resources.excludes not present', () => {
        const result = ui5Config.getBuilderResourceExcludes();
        expect(result).toEqual([]);
    });

    test('returns values after addBuilderResourceExcludes has been called', () => {
        ui5Config.addBuilderResourceExcludes();
        const result = ui5Config.getBuilderResourceExcludes();
        expect(result).toEqual(['/test/**', '/localService/**']);
    });

    test('returns partial values when only some excludes are present', async () => {
        const partial = await UI5Config.newInstance(`builder:\n  resources:\n    excludes:\n      - /custom/**\n`);
        const result = partial.getBuilderResourceExcludes();
        expect(result).toEqual(['/custom/**']);
    });

    test('returns empty array for malformed excludes (null value)', async () => {
        const malformed = await UI5Config.newInstance(`builder:\n  resources:\n    excludes: ~\n`);
        const result = malformed.getBuilderResourceExcludes();
        expect(result).toEqual([]);
    });
});
```

- [ ] **Step 1.2: Run failing test**

```bash
pnpm --filter @sap-ux/ui5-config test -- --testNamePattern="getBuilderResourceExcludes"
```

Expected: FAIL — `getBuilderResourceExcludes is not a function`

- [ ] **Step 1.3: Write failing tests for updated `addAbapDeployTask` — no `configuration.exclude` in new configs**

In the existing `describe('addAbapDeployTask', ...)` block, add:

```typescript
test('does not write configuration.exclude when no exclude param is passed', () => {
    ui5Config.addAbapDeployTask({ url, client }, app);
    const result = ui5Config.toString();
    expect(result).not.toContain('configuration:\n        exclude:');
    // builder.resources.excludes is still written
    expect(result).toContain('builder:\n  resources:\n    excludes:');
});

test('writes configuration.exclude only when explicit exclude array is passed', () => {
    ui5Config.addAbapDeployTask({ url, client }, app, true, ['/custom/']);
    const result = ui5Config.toString();
    expect(result).toContain('exclude:');
    expect(result).toContain('/custom/');
    // hardcoded /test/ and /localService/ are NOT added
    expect(result).not.toContain('/test/');
    expect(result).not.toContain('/localService/');
});
```

- [ ] **Step 1.4: Run failing tests**

```bash
pnpm --filter @sap-ux/ui5-config test -- --testNamePattern="addAbapDeployTask"
```

Expected: FAIL — existing snapshot tests will still pass, new no-exclude tests fail because current impl always writes exclude.

- [ ] **Step 1.5: Implement `getBuilderResourceExcludes()` and update `addAbapDeployTask`**

In `packages/ui5-config/src/ui5config.ts`, after `addBuilderResourceExcludes()`:

```typescript
/**
 * Returns the current `builder.resources.excludes` sequence values.
 * Returns an empty array if the path does not exist or is malformed.
 *
 * @returns string array of exclude patterns
 * @memberof UI5Config
 */
public getBuilderResourceExcludes(): string[] {
    try {
        return (this.document.getSequence({ path: 'builder.resources.excludes' }).toJSON() as unknown[]).filter(
            (v): v is string => typeof v === 'string'
        );
    } catch {
        return [];
    }
}
```

Then update `addAbapDeployTask`. The key changes:
1. Remove hardcoded `['/test/', '/localService/']` from `deployExclude`
2. Make `configuration.exclude` conditional — omit when `deployExclude` is empty

```typescript
public addAbapDeployTask(
    target: AbapTarget,
    app: BspApp | Adp,
    fioriTools = true,
    exclude?: string[],
    index = false,
    lrep?: string,
    comments: NodeComment<CustomTask<AbapDeployConfig>>[] = []
): this {
    this.addBuilderResourceExcludes();
    const deployExclude = exclude ?? [];
    const configuration: {
        target: AbapTarget;
        app: BspApp | Adp;
        exclude?: string[];
        index?: boolean;
        lrep?: string;
    } = {
        target,
        app,
        lrep,
        ...(deployExclude.length > 0 ? { exclude: deployExclude } : {})
    };

    if (index) {
        configuration['index'] = true;
    }

    this.document.appendTo({
        path: 'builder.customTasks',
        value: {
            name: fioriTools ? 'deploy-to-abap' : 'abap-deploy-task',
            afterTask: 'generateCachebusterInfo',
            configuration
        },
        comments
    });
    return this;
}
```

- [ ] **Step 1.6: Run tests and update snapshots**

```bash
pnpm --filter @sap-ux/ui5-config test
```

Expected: new tests pass; snapshot tests for `addAbapDeployTask` will fail because existing snapshots still contain `configuration.exclude`. Update snapshots:

```bash
pnpm --filter @sap-ux/ui5-config test-u
```

Verify snapshots no longer contain `exclude: /test/ /localService/` in the deploy task `configuration` block, but still contain `builder.resources.excludes: /test/** /localService/**`.

- [ ] **Step 1.7: Commit**

```bash
git add packages/ui5-config/src/ui5config.ts packages/ui5-config/test/index.test.ts packages/ui5-config/test/__snapshots__/index.test.ts.snap
git commit -m "feat(ui5-config): add getBuilderResourceExcludes(); remove hardcoded configuration.exclude from addAbapDeployTask"
```

---

## Task 2: `abap-deploy-config-writer` — Remove hardcoded exclude from `getDeployConfig`

**Files:**
- Modify: `packages/abap-deploy-config-writer/src/config.ts`
- Modify: `packages/abap-deploy-config-writer/test/unit/__snapshots__/index.test.ts.snap`

### Context

On the gap1 branch, `getDeployConfig` in `packages/abap-deploy-config-writer/src/config.ts` calls:

```typescript
ui5DeployConfig.addAbapDeployTask(
    target as unknown as AbapTarget,
    config.app,
    true,
    ['/test/'],   // ← remove this
    config.index,
    config.lrep,
    comments
);
```

After Task 1, passing `undefined` (or removing the param) means no `configuration.exclude` is written. `addAbapDeployTask` still calls `addBuilderResourceExcludes()` internally so `builder.resources.excludes` is populated.

- [ ] **Step 2.1: Run existing tests to confirm current state**

```bash
pnpm --filter @sap-ux/abap-deploy-config-writer test
```

Expected: All pass. Note how many tests have `configuration.exclude` in snapshots.

- [ ] **Step 2.2: Update `getDeployConfig` — pass `undefined` for `exclude`**

In `packages/abap-deploy-config-writer/src/config.ts`, change the `addAbapDeployTask` call:

```typescript
ui5DeployConfig.addAbapDeployTask(
    target as unknown as AbapTarget,
    config.app,
    true,
    undefined,       // no explicit exclude — configuration.exclude omitted from yaml
    config.index,
    config.lrep,
    comments
);
```

- [ ] **Step 2.3: Update snapshots**

```bash
pnpm --filter @sap-ux/abap-deploy-config-writer test-u
```

Verify generated snapshots: `configuration.exclude` block is ABSENT from deploy task config; `builder.resources.excludes` with `/test/**` and `/localService/**` IS present.

- [ ] **Step 2.4: Run full test suite to confirm**

```bash
pnpm --filter @sap-ux/abap-deploy-config-writer test
```

Expected: All pass with new snapshots.

- [ ] **Step 2.5: Commit**

```bash
git add packages/abap-deploy-config-writer/src/config.ts packages/abap-deploy-config-writer/test/unit/__snapshots__/index.test.ts.snap
git commit -m "fix(abap-deploy-config-writer): remove hardcoded configuration.exclude from getDeployConfig"
```

---

## Task 3: `adp-tooling` and `deploy-config-sub-generator` — Update snapshots

**Files:**
- Modify: `packages/adp-tooling/test/unit/writer/__snapshots__/index.test.ts.snap`
- Modify: `packages/deploy-config-sub-generator/test/headless/__snapshots__/abap-headless.test.ts.snap`

### Context

`adp-tooling/src/writer/options.ts:132` calls:

```typescript
ui5Config.addAbapDeployTask(config.target, config.deploy, config.options?.fioriTools === true);
```

No `exclude` param passed. After Task 1's change to `addAbapDeployTask`, this call no longer produces `configuration.exclude` in the yaml. Snapshots must be updated.

`deploy-config-sub-generator` uses `abap-deploy-config-writer` internally, so its ABAP headless snapshots also contain `configuration.exclude`.

- [ ] **Step 3.1: Update adp-tooling snapshots**

```bash
pnpm --filter @sap-ux/adp-tooling test-u
```

- [ ] **Step 3.2: Verify adp-tooling tests pass**

```bash
pnpm --filter @sap-ux/adp-tooling test
```

Expected: All pass. Snapshots show no `configuration.exclude` in deploy task; `builder.resources.excludes` is present.

- [ ] **Step 3.3: Update deploy-config-sub-generator snapshots**

```bash
pnpm --filter @sap-ux/deploy-config-sub-generator test-u
```

- [ ] **Step 3.4: Verify deploy-config-sub-generator tests pass**

```bash
pnpm --filter @sap-ux/deploy-config-sub-generator test
```

Expected: All pass. ABAP headless snapshots no longer contain `configuration.exclude`.

- [ ] **Step 3.5: Commit**

```bash
git add packages/adp-tooling/test/unit/writer/__snapshots__/index.test.ts.snap packages/deploy-config-sub-generator/test/headless/__snapshots__/abap-headless.test.ts.snap
git commit -m "chore(adp-tooling,deploy-config-sub-generator): update snapshots — configuration.exclude removed from new configs"
```

---

## Task 4: `deploy-tooling` — Read `builder.resources.excludes` at runtime, merge with `configuration.exclude`

**Files:**
- Modify: `packages/deploy-tooling/src/ui5/index.ts`
- Modify: `packages/deploy-tooling/test/unit/ui5/index.test.ts`

### Context

The UI5 custom task (`src/ui5/index.ts`) is the runtime entry point. For new configs, `options.configuration.exclude` is undefined. For old configs it contains `['/test/', '/localService/']`. The task needs to:

1. Try reading `builder.resources.excludes` from `ui5-deploy.yaml` in `process.cwd()` (conventional path)
2. Convert glob patterns (`/test/**`) to regex-safe prefix patterns (`/test/`)
3. Merge with `config.exclude` (deduped)
4. Pass merged result to `createUi5Archive`

The glob→regex conversion: strip trailing `/**` or `/*` to get a prefix like `/test/` that works as a substring regex pattern.

- [ ] **Step 4.1: Write failing tests**

In `packages/deploy-tooling/test/unit/ui5/index.test.ts`, add (requires mocking `node:fs/promises` and `@sap-ux/ui5-config`):

```typescript
import { jest } from '@jest/globals';
// ... existing imports ...

const mockReadFile = jest.fn() as jest.Mock;
jest.unstable_mockModule('node:fs/promises', () => ({
    readFile: mockReadFile
}));

// Mock UI5Config.newInstance for the builder excludes lookup
const mockGetBuilderResourceExcludes = jest.fn().mockReturnValue([]);
const mockUI5ConfigInstance = { getBuilderResourceExcludes: mockGetBuilderResourceExcludes };
jest.unstable_mockModule('@sap-ux/ui5-config', async () => {
    const actual = await jest.importActual<typeof import('@sap-ux/ui5-config')>('@sap-ux/ui5-config');
    return {
        ...actual,
        UI5Config: {
            newInstance: jest.fn().mockResolvedValue(mockUI5ConfigInstance)
        }
    };
});

// ... then in the describe block, add:

describe('exclude handling', () => {
    test('uses builder.resources.excludes (converted) when configuration.exclude absent', async () => {
        mockReadFile.mockResolvedValue('builder:\n  resources:\n    excludes:\n      - /test/**\n      - /localService/**\n');
        mockGetBuilderResourceExcludes.mockReturnValue(['/test/**', '/localService/**']);
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);

        const configWithoutExclude: AbapDeployConfig = { ...configuration };
        await task({ workspace, options: { projectName, configuration: configWithoutExclude } } as any);

        // workspace.byGlob was called to get resources
        // archive was created — verify exclude patterns were derived (test/** → test/)
        expect(workspace.byGlob).toHaveBeenCalled();
    });

    test('falls back to configuration.exclude for old configs (no builder.resources.excludes)', async () => {
        mockReadFile.mockRejectedValue(new Error('file not found'));
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);

        const configWithExclude: AbapDeployConfig = { ...configuration, exclude: ['/test/', '/localService/'] };
        await expect(
            task({ workspace, options: { projectName, configuration: configWithExclude } } as any)
        ).resolves.not.toThrow();
    });

    test('merges both when configuration.exclude and builder.resources.excludes are present', async () => {
        mockReadFile.mockResolvedValue('builder:\n  resources:\n    excludes:\n      - /custom/**\n');
        mockGetBuilderResourceExcludes.mockReturnValue(['/custom/**']);
        mockedUi5RepoService.deploy.mockResolvedValue(undefined);

        const configWithExclude: AbapDeployConfig = { ...configuration, exclude: ['/test/'] };
        await expect(
            task({ workspace, options: { projectName, configuration: configWithExclude } } as any)
        ).resolves.not.toThrow();
    });
});
```

- [ ] **Step 4.2: Run failing tests**

```bash
pnpm --filter @sap-ux/deploy-tooling test -- --testNamePattern="exclude handling"
```

Expected: FAIL — current impl doesn't read builder excludes.

- [ ] **Step 4.3: Implement the new behavior in `src/ui5/index.ts`**

Add the following imports:

```typescript
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UI5Config, replaceEnvVariables } from '@sap-ux/ui5-config';
```

(Replace the existing `import { replaceEnvVariables } from '@sap-ux/ui5-config';` with the above.)

Add a helper function before `task`:

```typescript
/**
 * Convert a glob pattern to a regex-safe prefix string.
 * Strips trailing `/**` or `/*` so `/test/**` becomes `/test/`.
 *
 * @param pattern - glob pattern from builder.resources.excludes
 * @returns regex-safe prefix pattern
 */
function globToPrefix(pattern: string): string {
    return pattern.replace(/\/\*+$/, '/');
}

/**
 * Read builder.resources.excludes from ui5-deploy.yaml in the current working directory.
 * Returns an empty array if the file cannot be read or the path is absent.
 */
async function readBuilderExcludes(): Promise<string[]> {
    try {
        const content = await readFile(join(process.cwd(), 'ui5-deploy.yaml'), 'utf-8');
        const ui5Config = await UI5Config.newInstance(content);
        return ui5Config.getBuilderResourceExcludes().map(globToPrefix);
    } catch {
        return [];
    }
}
```

Update the `task` function body (replace the `createUi5Archive` call):

```typescript
async function task({ workspace, options }: TaskParameters<AbapDeployConfig>): Promise<void> {
    loadEnvConfig();
    const moduleName = `${NAME} ${options.projectName}`;
    const logLevel = resolveLogLevel(options.configuration?.log as string | number | undefined);
    const logger = new ToolsLogger({ transports: [new UI5ToolingTransport({ moduleName })], logLevel });

    if (logLevel >= LogLevel.Debug) {
        logger.debug({ ...options.configuration, credentials: undefined });
    }
    const config = validateConfig(options.configuration, logger);
    replaceEnvVariables(config);

    // Merge configuration.exclude (old format, backward compat) with
    // builder.resources.excludes read from ui5-deploy.yaml (new format).
    // Dedup so both sources can coexist without duplicate patterns.
    const builderExcludes = await readBuilderExcludes();
    const mergedExclude = [...new Set([...(config.exclude ?? []), ...builderExcludes])];

    const archive = await createUi5Archive(
        logger,
        workspace,
        options.projectNamespace ?? options.projectName,
        mergedExclude
    );
    await deploy(archive, config, logger);
}
```

- [ ] **Step 4.4: Run tests**

```bash
pnpm --filter @sap-ux/deploy-tooling test
```

Expected: All pass including new exclude-handling tests.

- [ ] **Step 4.5: Commit**

```bash
git add packages/deploy-tooling/src/ui5/index.ts packages/deploy-tooling/test/unit/ui5/index.test.ts
git commit -m "feat(deploy-tooling): merge builder.resources.excludes with configuration.exclude at runtime"
```

---

## Task 5: Changeset

**Files:**
- Create: `.changeset/gap2-builder-resource-excludes-derive.md`

- [ ] **Step 5.1: Create changeset**

```bash
cat > .changeset/gap2-builder-resource-excludes-derive.md << 'EOF'
---
"@sap-ux/ui5-config": minor
"@sap-ux/abap-deploy-config-writer": patch
"@sap-ux/deploy-tooling": patch
"@sap-ux/adp-tooling": patch
"@sap-ux/deploy-config-sub-generator": patch
---

fix(gap2): derive configuration.exclude from builder.resources.excludes; remove from new generated configs
EOF
```

Note: `ui5-config` is `minor` because `getBuilderResourceExcludes()` is a new public API.

- [ ] **Step 5.2: Commit**

```bash
git add .changeset/gap2-builder-resource-excludes-derive.md
git commit -m "chore: add changeset for gap2 builder.resources.excludes derivation"
```

---

## Task 6: Final Quality Gate

- [ ] **Step 6.1: Run all affected package tests**

```bash
pnpm --filter @sap-ux/ui5-config test && \
pnpm --filter @sap-ux/abap-deploy-config-writer test && \
pnpm --filter @sap-ux/deploy-tooling test && \
pnpm --filter @sap-ux/adp-tooling test && \
pnpm --filter @sap-ux/deploy-config-sub-generator test
```

Expected: All pass.

- [ ] **Step 6.2: Lint**

```bash
pnpm --filter @sap-ux/ui5-config lint && \
pnpm --filter @sap-ux/abap-deploy-config-writer lint && \
pnpm --filter @sap-ux/deploy-tooling lint && \
pnpm --filter @sap-ux/adp-tooling lint
```

Expected: No errors.

- [ ] **Step 6.3: Build**

```bash
pnpm --filter @sap-ux/ui5-config build && \
pnpm --filter @sap-ux/abap-deploy-config-writer build && \
pnpm --filter @sap-ux/deploy-tooling build && \
pnpm --filter @sap-ux/adp-tooling build
```

Expected: All build without errors.

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| New yamls have no `configuration.exclude` | Task 1 (addAbapDeployTask), Task 2 (getDeployConfig), Task 3 (adp-tooling/sub-gen snapshots) |
| Reliance on `builder.resources.excludes` for new configs | Task 4 (deploy-tooling reads yaml) |
| Backward compat: old configs with `configuration.exclude` still work | Task 4 (mergedExclude includes config.exclude) |
| Merge both if both present | Task 4 (Set merge in task) |
| New public method `getBuilderResourceExcludes()` | Task 1 |
| Glob→regex conversion (`/test/**` → `/test/`) | Task 4 (`globToPrefix`) |

### Known edge cases

- `deploy-tooling` task reads from `process.cwd() + '/ui5-deploy.yaml'` (conventional filename). If user renames the deploy yaml, `readBuilderExcludes` returns `[]` and falls back to `configuration.exclude`. Acceptable — documented behavior.
- Callers that explicitly pass `exclude: []` to `addAbapDeployTask` will get no `configuration.exclude` written (same as passing `undefined`). This is correct.
- `lrep` is included in the configuration object even when undefined (YAML will not emit a null key because `@sap-ux/yaml` skips undefined). Verify this is the existing behavior — it was in the original code.
