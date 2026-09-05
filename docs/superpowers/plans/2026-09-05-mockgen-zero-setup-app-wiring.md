# MockGen Zero-Setup App Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the normal Fiori tools mockserver configuration install and wire
the lightweight MockGen npm package so a developer only needs
`npm run start-mock -- --mockgen` to opt in.

**Architecture:** `@sap-ux/mockserver-config-writer` remains the only owner of
generated `package.json` and `ui5-mock.yaml` changes. For the standard
`@sap-ux/ui5-middleware-fe-mockserver`, it adds the MockGen package as a direct
development dependency, wraps the existing simple `start-mock` command, and
adds one inactive provider block to the existing middleware. Custom mockserver
modules and unflagged startup remain unchanged; model and platform-runtime
acquisition are implemented in the separate managed-artifacts track.

**Tech Stack:** TypeScript 5.9, Node.js 22/24, Jest, mem-fs-editor,
`@sap-ux/ui5-config`, YAML snapshots, pnpm, Changesets.

---

## File structure

- Create `packages/mockserver-config-writer/src/mockserver-config/mockgen.ts`:
  shared package names, versions, launcher prefix, provider defaults, and the
  standard-mockserver eligibility check.
- Modify `packages/mockserver-config-writer/src/mockserver-config/package-json.ts`:
  add/remove the direct npm dependency and wrap/unwrap the generated command.
- Modify `packages/mockserver-config-writer/src/mockserver-config/ui5-mock-yaml.ts`:
  add or remove only the default MockGen provider block without changing other
  middleware configuration.
- Modify `packages/mockserver-config-writer/src/mockserver-config/index.ts`:
  pass one eligibility decision to both application files.
- Modify tests and snapshots under
  `packages/mockserver-config-writer/test/unit/mockserver-config/`: prove default,
  idempotent, custom-module, preservation, skip, and removal behavior.
- Modify `packages/mockserver-config-writer/README.md`: document automatic
  wiring and the two start commands.
- Modify
  `scripts/mockserver-data-generator-dev-kit/lib/bundle-installer.mjs` and its
  README comments only where the production writer now performs the default
  wiring; the dev kit continues replacing the registry version with a local
  tarball and may add development-only model paths.
- Create `.changeset/mockgen-zero-setup-app-wiring.md`: release the writer
  behavior change.

## Task 1: Add the direct package dependency and launcher

**Files:**

- Create: `packages/mockserver-config-writer/src/mockserver-config/mockgen.ts`
- Modify: `packages/mockserver-config-writer/src/mockserver-config/package-json.ts`
- Test: `packages/mockserver-config-writer/test/unit/mockserver-config/package-json.test.ts`

- [ ] **Step 1: Write failing default-wiring tests**

Add assertions that default configuration produces exactly these relevant
fields:

```ts
expect(packageJson.devDependencies).toEqual({
    '@sap-ux/ui5-middleware-fe-mockserver': '2',
    '@sap-ux/mockserver-data-generator': '0.1.0'
});
expect(packageJson.scripts?.['start-mock']).toBe(
    'mockserver-data-generator start -- fiori run --config ./ui5-mock.yaml'
);
expect(packageJson.ui5?.dependencies).toEqual(['@sap-ux/ui5-middleware-fe-mockserver']);
```

Add a second call to `enhancePackageJson` and assert that the launcher prefix
occurs once.

- [ ] **Step 2: Write failing custom-module and removal tests**

For `{ mockserverModule: 'dummy-mockserver', mockserverVersion: '1.2.3' }`,
assert that no MockGen dependency or launcher is added. Extend the removal
fixture with `@sap-ux/mockserver-data-generator` and a wrapped command, then
assert both are removed with the standard mockserver configuration.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
pnpm --filter @sap-ux/mockserver-config-writer test -- \
  --runTestsByPath test/unit/mockserver-config/package-json.test.ts
```

Expected: FAIL because the generator dependency and launcher are absent.

- [ ] **Step 4: Add shared MockGen wiring constants**

Create `mockgen.ts` with these exports:

```ts
import type { PackageJsonMockConfig } from '../types/index.js';

export const STANDARD_MOCKSERVER_MODULE = '@sap-ux/ui5-middleware-fe-mockserver';
export const MOCKGEN_MODULE = '@sap-ux/mockserver-data-generator';
export const MOCKGEN_VERSION = '0.1.0';
export const MOCKGEN_PROVIDER = '@sap-ux/mockserver-data-generator/fe-mockserver';
export const MOCKGEN_LAUNCHER_PREFIX = 'mockserver-data-generator start -- ';

export function supportsMockgen(config?: PackageJsonMockConfig): boolean {
    return !config?.skip &&
        (config?.mockserverModule === undefined || config.mockserverModule === STANDARD_MOCKSERVER_MODULE);
}
```

- [ ] **Step 5: Implement the minimal package mutation**

Import the constants and use `supportsMockgen(config)` once in
`enhancePackageJson`. For eligible apps, add `MOCKGEN_MODULE` only to
`devDependencies` and prefix the selected `start-mock` command exactly once.
Never add MockGen to `packageJson.ui5.dependencies`.

Use these focused helpers:

```ts
function addLauncher(script: string): string {
    return script.startsWith(MOCKGEN_LAUNCHER_PREFIX) ? script : `${MOCKGEN_LAUNCHER_PREFIX}${script}`;
}

function removeLauncher(script: string): string {
    return script.startsWith(MOCKGEN_LAUNCHER_PREFIX) ? script.slice(MOCKGEN_LAUNCHER_PREFIX.length) : script;
}
```

When a custom mockserver module is selected, delete only `MOCKGEN_MODULE` and
remove only the exact MockGen prefix. Extend `removeFromPackageJson` to delete
the direct generator dependency before the existing empty-object cleanup.

- [ ] **Step 6: Run tests and verify GREEN**

Run the command from Step 3. Expected: all package-json tests PASS with no
warnings.

- [ ] **Step 7: Commit the first TDD slice**

```bash
git add packages/mockserver-config-writer/src/mockserver-config/mockgen.ts \
  packages/mockserver-config-writer/src/mockserver-config/package-json.ts \
  packages/mockserver-config-writer/test/unit/mockserver-config/package-json.test.ts
git commit -m "feat(mockserver-config-writer): add MockGen launcher"
```

## Task 2: Add the inactive provider to the existing middleware

**Files:**

- Modify: `packages/mockserver-config-writer/src/mockserver-config/ui5-mock-yaml.ts`
- Test: `packages/mockserver-config-writer/test/unit/mockserver-config/ui5-mock-yaml.test.ts`
- Test snapshots:
  `packages/mockserver-config-writer/test/unit/mockserver-config/__snapshots__/ui5-mock-yaml.test.ts.snap`

- [ ] **Step 1: Write the failing provider test**

After `enhanceYaml`, resolve `sap-fe-mockserver` and assert:

```ts
expect(mockserverConfig?.configuration.mockDataGenerator).toEqual({
    name: '@sap-ux/mockserver-data-generator/fe-mockserver',
    options: {
        mode: 'auto',
        rowsPerEntity: 10,
        seed: 42,
        locale: 'en'
    }
});
```

Use a local intersection type in this package; do not modify the shared
`@sap-ux/ui5-config` type merely to serialize a provider-owned option:

```ts
type MockserverConfigWithMockgen = MockserverConfig & {
    mockDataGenerator?: {
        name: string;
        options: { mode: 'auto'; rowsPerEntity: number; seed: number; locale: string };
    };
};
```

- [ ] **Step 2: Write preservation and disablement tests**

Add an existing YAML fixture with
`mockDataGenerator.name: "example/custom-provider"`; call `enhanceYaml` and
assert it is unchanged. Add a fixture containing the exact MockGen provider,
call `enhanceYaml(fs, basePath, webappPath, undefined, false)`, and assert that
property is removed while services, annotations, and adjacent middleware
remain.

- [ ] **Step 3: Run the focused test and verify RED**

```bash
pnpm --filter @sap-ux/mockserver-config-writer test -- \
  --runTestsByPath test/unit/mockserver-config/ui5-mock-yaml.test.ts
```

Expected: FAIL because `mockDataGenerator` is absent.

- [ ] **Step 4: Implement one YAML helper**

Extend `enhanceYaml` with `configureMockgen = true` and call this helper after
the existing middleware has been created or updated:

```ts
function updateMockgenProvider(config: UI5Config, enabled: boolean): void {
    const middleware = config.findCustomMiddleware<MockserverConfigWithMockgen>('sap-fe-mockserver');
    if (!middleware) {
        throw new Error('Could not find sap-fe-mockserver');
    }
    const current = middleware.configuration.mockDataGenerator;
    if (enabled && current === undefined) {
        middleware.configuration.mockDataGenerator = {
            name: MOCKGEN_PROVIDER,
            options: { mode: 'auto', rowsPerEntity: 10, seed: 42, locale: 'en' }
        };
        config.updateCustomMiddleware(middleware);
    } else if (!enabled && current?.name === MOCKGEN_PROVIDER) {
        delete middleware.configuration.mockDataGenerator;
        config.updateCustomMiddleware(middleware);
    }
}
```

Do not overwrite another provider and do not create another middleware.

- [ ] **Step 5: Run the focused tests and inspect snapshots**

Run the Step 3 command. Expected: behavior assertions PASS and snapshots FAIL
only because the new provider block is present. Update the snapshots with:

```bash
pnpm --filter @sap-ux/mockserver-config-writer test -- \
  --runTestsByPath test/unit/mockserver-config/ui5-mock-yaml.test.ts -u
```

Inspect every changed snapshot and confirm each YAML document contains exactly
one `sap-fe-mockserver` and at most one `mockDataGenerator`.

- [ ] **Step 6: Commit the second TDD slice**

```bash
git add packages/mockserver-config-writer/src/mockserver-config/ui5-mock-yaml.ts \
  packages/mockserver-config-writer/test/unit/mockserver-config/ui5-mock-yaml.test.ts \
  packages/mockserver-config-writer/test/unit/mockserver-config/__snapshots__/ui5-mock-yaml.test.ts.snap
git commit -m "feat(mockserver-config-writer): configure MockGen provider"
```

## Task 3: Make the writer lifecycle atomic and test the public API

**Files:**

- Modify: `packages/mockserver-config-writer/src/mockserver-config/index.ts`
- Test: `packages/mockserver-config-writer/test/unit/mockserver-config/index.test.ts`
- Test snapshots:
  `packages/mockserver-config-writer/test/unit/mockserver-config/__snapshots__/index.test.ts.snap`

- [ ] **Step 1: Write failing public-API tests**

Update the default expected package JSON to include the exact generator version
and launcher. Assert the YAML provider through `UI5Config`. Add one test using a
custom mockserver module and one using `packageJsonConfig.skip: true`; both must
omit the MockGen provider.

- [ ] **Step 2: Run the public-API test and verify RED**

```bash
pnpm --filter @sap-ux/mockserver-config-writer test -- \
  --runTestsByPath test/unit/mockserver-config/index.test.ts
```

Expected: FAIL because `generateMockserverConfig` does not pass the shared
eligibility decision to YAML generation.

- [ ] **Step 3: Pass one eligibility decision through the writer**

Use the same `supportsMockgen` result for package and YAML changes:

```ts
const mockgenEnabled = supportsMockgen(data.packageJsonConfig);
if (!data.packageJsonConfig?.skip) {
    enhancePackageJson(fs, basePath, data.packageJsonConfig);
}
await enhanceYaml(fs, basePath, data.webappPath, data.ui5MockYamlConfig, mockgenEnabled);
```

Keep `removeMockserverConfig` unchanged except for the dependency cleanup
already owned by `removeFromPackageJson`; it deletes `ui5-mock.yaml` as before.

- [ ] **Step 4: Run the public and full writer tests**

```bash
pnpm --filter @sap-ux/mockserver-config-writer test -- \
  --runTestsByPath test/unit/mockserver-config/index.test.ts
pnpm --filter @sap-ux/mockserver-config-writer test
```

Expected: all writer tests PASS.

- [ ] **Step 5: Commit the public lifecycle slice**

```bash
git add packages/mockserver-config-writer/src/mockserver-config/index.ts \
  packages/mockserver-config-writer/test/unit/mockserver-config/index.test.ts \
  packages/mockserver-config-writer/test/unit/mockserver-config/__snapshots__/index.test.ts.snap
git commit -m "feat(mockserver-config-writer): wire MockGen by default"
```

## Task 4: Align the development kit and release documentation

**Files:**

- Modify: `scripts/mockserver-data-generator-dev-kit/lib/bundle-installer.mjs`
- Modify: `scripts/mockserver-data-generator-dev-kit/README.md`
- Modify: `packages/mockserver-config-writer/README.md`
- Modify:
  `docs/superpowers/specs/2026-09-03-mockserver-data-generator-design.md`
- Create: `.changeset/mockgen-zero-setup-app-wiring.md`

- [ ] **Step 1: Make the development override explicit**

Keep the dev kit's existing behavior: capture the pre-existing app command,
call the public writer, replace the registry dependency with the local tarball
specifier, idempotently wrap the command, and optionally write pilot-local
model paths. Update its comment to say that it overrides production defaults
for unpublished testing; do not remove its recovery journal or local artifact
verification.

- [ ] **Step 2: Document the production developer experience**

Add these commands to the writer README:

```text
npm run start-mock
npm run start-mock -- --mockgen
```

State that the first command stays standard, the second activates MockGen, and
the large model/runtime are not npm package contents. Mark the approved design
status as `Approved for implementation`.

- [ ] **Step 3: Add the changeset**

```md
---
'@sap-ux/mockserver-config-writer': minor
---

Configure the optional MockGen data generator in standard Fiori mockserver
applications while preserving the unflagged mockserver behavior.
```

- [ ] **Step 4: Format and commit**

```bash
pnpm exec prettier --write \
  packages/mockserver-config-writer/src/mockserver-config \
  packages/mockserver-config-writer/test/unit/mockserver-config \
  packages/mockserver-config-writer/README.md \
  scripts/mockserver-data-generator-dev-kit/lib/bundle-installer.mjs \
  scripts/mockserver-data-generator-dev-kit/README.md \
  docs/superpowers/specs/2026-09-03-mockserver-data-generator-design.md \
  .changeset/mockgen-zero-setup-app-wiring.md
git diff --check
git add packages/mockserver-config-writer scripts/mockserver-data-generator-dev-kit \
  docs/superpowers/specs/2026-09-03-mockserver-data-generator-design.md \
  .changeset/mockgen-zero-setup-app-wiring.md
git commit -m "docs(mockgen): document automatic app wiring"
```

## Task 5: Verify the generated application boundary

**Files:**

- Verify only; no new production file is introduced by this task.

- [ ] **Step 1: Run focused quality gates**

```bash
pnpm --filter @sap-ux/mockserver-config-writer build
pnpm --filter @sap-ux/mockserver-config-writer lint
pnpm --filter @sap-ux/mockserver-config-writer test
pnpm --filter @sap-ux/mockserver-data-generator build
pnpm --filter @sap-ux/mockserver-data-generator test -- \
  --runTestsByPath test/unit/start.test.ts
```

Expected: every command exits zero without new warnings.

- [ ] **Step 2: Verify package boundaries**

```bash
pnpm --filter @sap-ux/mockserver-data-generator check:package
git diff --check
```

Expected: the generator tarball remains below 5 MiB and contains no model or
runtime binary; the writer only emits the npm dependency string.

- [ ] **Step 3: Re-run the development-kit boundary tests**

```bash
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests test -- \
  --runTestsByPath src/dev-kit/build-dev-kit.test.ts
```

Expected: the development kit replaces the registry dependency with its local
tarball, keeps exactly one provider and launcher, and preserves the original
generated command.

- [ ] **Step 4: Rebuild the unpublished development kit**

```bash
pnpm mockserver-data-generator:dev-kit -- \
  --host-root /Users/I335123/SAPDevelop/Projects/open-ux-odata-mock-data-generator-spi \
  --out /Users/I335123/Downloads \
  --require-clean
```

Expected: the JSON report identifies one reproducible `.tgz`, its byte size,
fingerprint, SHA-256, and the three packed package hashes. The user's BAS run
will prove the two manual commands:

```text
npm run start-mock
npm run start-mock -- --mockgen
```

Expected: the first command performs no provider/model/cache/network work; the
second invokes exactly one provider and preserves authored mock data.

- [ ] **Step 5: Push without creating a pull request**

```bash
git status --short --branch
git push origin feat/mockserver-data-generator
```

Record the pushed commit, kit path, byte size, SHA-256, and remaining
managed-artifact work. Do not create a PR.

## Exit gate

A newly configured or refreshed standard Fiori application receives the
published lightweight MockGen npm package, exactly one existing mockserver
provider block, and the single wrapped `start-mock` script. Unflagged startup is
network- and MockGen-free. The `--mockgen` flag reaches the existing launcher.
Large model and native-runtime first-use acquisition remains the next,
separately testable managed-artifacts plan and must pass before the complete
zero-setup production experience is declared done.
