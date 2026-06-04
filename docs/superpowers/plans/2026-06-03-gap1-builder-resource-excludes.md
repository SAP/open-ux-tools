# Gap 1 — `builder.resources.excludes` in base `ui5.yaml` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `builder.resources.excludes` the authoritative source for exclusions by writing it to `ui5.yaml` (base config) AND `ui5-deploy.yaml`, decoupling it from `addAbapDeployTask`/`addCloudFoundryDeployTask`.

**Architecture:** Add idempotent `addBuilderResourceExcludes()` to `UI5Config`. Remove the `appendTo` calls for `builder.resources.excludes` from `addAbapDeployTask` and `addCloudFoundryDeployTask`. Update `abap-deploy-config-writer` to call `addBuilderResourceExcludes()` in both `updateBaseConfig` (so `ui5.yaml` gets the entries) and `getDeployConfig` (so `ui5-deploy.yaml` always has them, including the lib path where builder is stripped before deploy config inheritance). Update `adp-tooling` to maintain its existing behavior. This fixes the silent misalignment where `ui5.yaml` never received `builder.resources.excludes`.

**Tech Stack:** TypeScript, `@sap-ux/yaml` (`YamlDocument.getSequence`, `appendTo`), Jest snapshots, pnpm workspace.

**Relevant issue:** https://github.com/SAP/open-ux-tools/issues/4756 (Gap 1 comment)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/ui5-config/src/ui5config.ts` | Add `addBuilderResourceExcludes()`; remove appendTo calls from `addAbapDeployTask` and `addCloudFoundryDeployTask` |
| Modify | `packages/ui5-config/test/index.test.ts` | Tests for `addBuilderResourceExcludes()`; update existing `addAbapDeployTask`/`addCloudFoundryDeployTask` snapshots |
| Modify | `packages/abap-deploy-config-writer/src/config.ts` | Call `addBuilderResourceExcludes()` in `updateBaseConfig` (+ always write base file) and `getDeployConfig` |
| Update | `packages/abap-deploy-config-writer/test/unit/__snapshots__/index.test.ts.snap` | `ui5.yaml` now has `builder.resources.excludes` |
| Modify | `packages/adp-tooling/src/writer/options.ts` | Call `addBuilderResourceExcludes()` before `addAbapDeployTask` in `enhanceUI5DeployYaml` |
| Update | `packages/adp-tooling/test/unit/writer/__snapshots__/index.test.ts.snap` | Snapshots should remain unchanged (behavior preserved) |
| Update | `packages/deploy-config-sub-generator/test/headless/__snapshots__/abap-headless.test.ts.snap` | `ui5.yaml` content in snapshot now has `builder.resources.excludes` |
| Create | `.changeset/gap1-builder-resource-excludes.md` | Changeset for `@sap-ux/ui5-config`, `@sap-ux/abap-deploy-config-writer`, `@sap-ux/adp-tooling` |

---

## Task 1: Add `addBuilderResourceExcludes()` to `UI5Config`

**Files:**
- Modify: `packages/ui5-config/src/ui5config.ts` (add after line ~628, before `addAbapDeployTask`)
- Modify: `packages/ui5-config/test/index.test.ts` (add `describe('addBuilderResourceExcludes', ...)` block before the existing `addAbapDeployTask` describe block at line ~848)

- [ ] **Step 1: Write the failing tests**

Add this `describe` block in `packages/ui5-config/test/index.test.ts`, just before the existing `describe('addAbapDeployTask', ...)` block (around line 848):

```typescript
describe('addBuilderResourceExcludes', () => {
    test('adds both default excludes to empty config', () => {
        ui5Config.addBuilderResourceExcludes();
        expect(ui5Config.toString()).toMatchSnapshot();
    });

    test('is idempotent — calling twice does not duplicate entries', () => {
        ui5Config.addBuilderResourceExcludes();
        ui5Config.addBuilderResourceExcludes();
        const result = ui5Config.toString();
        expect([...result.matchAll(/\/test\/\*\*/g)]).toHaveLength(1);
        expect([...result.matchAll(/\/localService\/\*\*/g)]).toHaveLength(1);
    });

    test('does not duplicate an entry that already exists', async () => {
        const partial = await UI5Config.newInstance(`builder:\n  resources:\n    excludes:\n      - /test/**\n`);
        partial.addBuilderResourceExcludes();
        const result = partial.toString();
        expect([...result.matchAll(/\/test\/\*\*/g)]).toHaveLength(1);
        expect(result).toContain('/localService/**');
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @sap-ux/ui5-config test -- --testNamePattern="addBuilderResourceExcludes"
```

Expected: FAIL — `ui5Config.addBuilderResourceExcludes is not a function`

- [ ] **Step 3: Implement `addBuilderResourceExcludes` in `ui5config.ts`**

Insert this method in `packages/ui5-config/src/ui5config.ts` immediately before the `addAbapDeployTask` JSDoc comment (around line 629):

```typescript
/**
 * Appends `/test/**` and `/localService/**` to `builder.resources.excludes` if not already present.
 * Safe to call multiple times — idempotent.
 *
 * @returns this UI5Config instance
 * @memberof UI5Config
 */
public addBuilderResourceExcludes(): this {
    const defaults = ['/test/**', '/localService/**'];
    let existing: string[] = [];
    try {
        existing = this.document.getSequence({ path: 'builder.resources.excludes' }).toJSON() as string[];
    } catch {
        // path not present yet — existing stays []
    }
    for (const value of defaults) {
        if (!existing.includes(value)) {
            this.document.appendTo({ path: 'builder.resources.excludes', value });
            existing.push(value);
        }
    }
    return this;
}
```

- [ ] **Step 4: Run tests to confirm they pass and accept new snapshot**

```bash
pnpm --filter @sap-ux/ui5-config test -- --testNamePattern="addBuilderResourceExcludes" --updateSnapshot
```

Expected: PASS — 3 tests pass, 1 snapshot created

- [ ] **Step 5: Run full `ui5-config` suite to confirm no regressions**

```bash
pnpm --filter @sap-ux/ui5-config test
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/ui5-config/src/ui5config.ts packages/ui5-config/test/index.test.ts packages/ui5-config/test/__snapshots__/index.test.ts.snap
git commit -m "feat(ui5-config): add idempotent addBuilderResourceExcludes() to UI5Config"
```

---

## Task 2: Remove `builder.resources.excludes` appendTo calls from deploy task methods

`addAbapDeployTask` (lines ~651–658) and `addCloudFoundryDeployTask` (lines ~694–701) currently call `this.document.appendTo` twice each for `builder.resources.excludes`. These calls must be removed — callers are now responsible for calling `addBuilderResourceExcludes()` first.

**Files:**
- Modify: `packages/ui5-config/src/ui5config.ts`
- Update: `packages/ui5-config/test/__snapshots__/index.test.ts.snap` (auto-updated via --updateSnapshot)

- [ ] **Step 1: Remove `appendTo` calls from `addAbapDeployTask`**

In `packages/ui5-config/src/ui5config.ts`, find `addAbapDeployTask` body. Delete these 8 lines:

```typescript
        this.document.appendTo({
            path: 'builder.resources.excludes',
            value: '/test/**'
        });
        this.document.appendTo({
            path: 'builder.resources.excludes',
            value: '/localService/**'
        });
```

The body of `addAbapDeployTask` after this change starts directly with `const configuration: {`.

- [ ] **Step 2: Remove `appendTo` calls from `addCloudFoundryDeployTask`**

Find `addCloudFoundryDeployTask` body. Delete the same 8-line block there too.

- [ ] **Step 3: Run tests — confirm failures (snapshots now stale)**

```bash
pnpm --filter @sap-ux/ui5-config test
```

Expected: FAIL — existing `addAbapDeployTask` and `addCloudFoundryDeployTask` snapshot tests fail because `builder.resources.excludes` is no longer in their output.

- [ ] **Step 4: Update snapshots**

```bash
pnpm --filter @sap-ux/ui5-config test -- --updateSnapshot
```

Expected: Snapshots updated — `builder.resources.excludes` section removed from `addAbapDeployTask` and `addCloudFoundryDeployTask` snapshots. The new `addBuilderResourceExcludes` snapshot remains.

- [ ] **Step 5: Verify snapshot diff is correct**

Inspect `packages/ui5-config/test/__snapshots__/index.test.ts.snap`. The 4 `addAbapDeployTask` snapshots and 3 `addCloudFoundryDeployTask` snapshots should no longer contain `builder.resources.excludes`. The `addBuilderResourceExcludes` snapshot should still be present.

- [ ] **Step 6: Run full suite to confirm all pass**

```bash
pnpm --filter @sap-ux/ui5-config test
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add packages/ui5-config/src/ui5config.ts packages/ui5-config/test/__snapshots__/index.test.ts.snap
git commit -m "refactor(ui5-config): move builder.resources.excludes out of addAbapDeployTask/addCloudFoundryDeployTask"
```

---

## Task 3: Update `abap-deploy-config-writer`

**Behaviour change:**
- `updateBaseConfig`: always calls `addBuilderResourceExcludes()` on `baseConfig` and always writes `basePath` (previously only wrote for `isLib=true`).
- `getDeployConfig`: calls `addBuilderResourceExcludes()` on `ui5DeployConfig` before `addAbapDeployTask`. This is a no-op for non-lib (excludes already in the cloned content) and required for lib (builder was stripped from base before deploy config creation).

**Files:**
- Modify: `packages/abap-deploy-config-writer/src/config.ts`
- Update: `packages/abap-deploy-config-writer/test/unit/__snapshots__/index.test.ts.snap`

- [ ] **Step 1: Update `updateBaseConfig` in `config.ts`**

Replace the current `updateBaseConfig` function body in `packages/abap-deploy-config-writer/src/config.ts`:

```typescript
export function updateBaseConfig(isLib: boolean, basePath: string, baseConfig: UI5Config, fs: Editor) {
    baseConfig.addBuilderResourceExcludes();
    if (isLib) {
        if (!baseConfig.findCustomTask(UI5_TASK_FLATTEN_LIB)) {
            const customTask = {
                name: UI5_TASK_FLATTEN_LIB,
                afterTask: 'generateResourcesJson'
            };
            baseConfig.addCustomTasks([customTask]);
        }
    }
    fs.write(basePath, baseConfig.toString());
    if (isLib) {
        baseConfig.removeConfig('builder');
    }
}
```

Key differences from the current implementation:
1. `addBuilderResourceExcludes()` called unconditionally at top
2. `fs.write` moved outside the `if (isLib)` block — always writes
3. `removeConfig('builder')` kept inside `if (isLib)` — happens AFTER write

- [ ] **Step 2: Update `getDeployConfig` in `config.ts`**

Add one line — `ui5DeployConfig.addBuilderResourceExcludes()` — after the comment call and before `addAbapDeployTask`:

```typescript
    ui5DeployConfig.addComment({
        comment: ' yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json',
        location: 'beginning'
    });

    ui5DeployConfig.addBuilderResourceExcludes();

    ui5DeployConfig.addAbapDeployTask(
        target as unknown as AbapTarget,
        config.app,
        true,
        ['/test/'],
        config.index,
        config.lrep,
        comments
    );
```

- [ ] **Step 3: Run tests — confirm failures (snapshots now stale)**

```bash
pnpm --filter @sap-ux/abap-deploy-config-writer test
```

Expected: FAIL — snapshots for `ui5.yaml` (base config) now contain `builder.resources.excludes` which wasn't there before.

- [ ] **Step 4: Update snapshots**

```bash
pnpm --filter @sap-ux/abap-deploy-config-writer test -- --updateSnapshot
```

Expected: Snapshots updated — `ui5.yaml` content in snapshots now shows:
```yaml
builder:
  resources:
    excludes:
      - /test/**
      - /localService/**
```

The `ui5-deploy.yaml` snapshots should be unchanged (excludes were already there, now coming from `addBuilderResourceExcludes()` instead).

- [ ] **Step 5: Verify the lib test case specifically**

Inspect the snapshot for `test.ui5.lib` — `ui5.yaml` (base) should now have `builder.resources.excludes`, and `deploy-config.yaml` should also have them (via `addBuilderResourceExcludes()` in `getDeployConfig`).

- [ ] **Step 6: Run full suite to confirm all pass**

```bash
pnpm --filter @sap-ux/abap-deploy-config-writer test
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add packages/abap-deploy-config-writer/src/config.ts packages/abap-deploy-config-writer/test/unit/__snapshots__/index.test.ts.snap
git commit -m "fix(abap-deploy-config-writer): write builder.resources.excludes to ui5.yaml via addBuilderResourceExcludes"
```

---

## Task 4: Update `adp-tooling`

`adp-tooling` calls `addAbapDeployTask` directly via `enhanceUI5DeployYaml` in `packages/adp-tooling/src/writer/options.ts`. Since Task 2 removed `builder.resources.excludes` from `addAbapDeployTask`, `enhanceUI5DeployYaml` must call `addBuilderResourceExcludes()` first to maintain existing behavior.

**Files:**
- Modify: `packages/adp-tooling/src/writer/options.ts`
- Verify: `packages/adp-tooling/test/unit/writer/__snapshots__/index.test.ts.snap` (should be unchanged)

- [ ] **Step 1: Update `enhanceUI5DeployYaml` in `options.ts`**

In `packages/adp-tooling/src/writer/options.ts`, replace the body of `enhanceUI5DeployYaml`:

```typescript
export function enhanceUI5DeployYaml(ui5Config: UI5Config, config: AdpWriterConfigWithDeploy) {
    ui5Config.addBuilderResourceExcludes();
    ui5Config.addAbapDeployTask(config.target, config.deploy, config.options?.fioriTools === true);
}
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @sap-ux/adp-tooling test
```

Expected: All tests pass with NO snapshot changes (behavior is preserved — `builder.resources.excludes` entries still appear in `ui5-deploy.yaml` output, just now from `addBuilderResourceExcludes()` instead of `addAbapDeployTask()`).

If snapshots DO change (i.e., entries appear duplicated because the base `ui5.yaml` fixture already had them), run `--updateSnapshot` and verify the output is still correct.

- [ ] **Step 3: Commit**

```bash
git add packages/adp-tooling/src/writer/options.ts
git commit -m "fix(adp-tooling): call addBuilderResourceExcludes() before addAbapDeployTask in enhanceUI5DeployYaml"
```

---

## Task 5: Update `deploy-config-sub-generator` snapshots

These are headless integration tests that run the full generator flow end-to-end. They capture `ui5.yaml` content. Now that `updateBaseConfig` writes `builder.resources.excludes` to `ui5.yaml`, the ABAP headless snapshots will change.

**Files:**
- Update: `packages/deploy-config-sub-generator/test/headless/__snapshots__/abap-headless.test.ts.snap`

- [ ] **Step 1: Run tests — confirm failures**

```bash
pnpm --filter @sap-ux/deploy-config-sub-generator test
```

Expected: FAIL — ABAP headless snapshots now out of date (base `ui5.yaml` captured in snapshot now includes `builder.resources.excludes`).

- [ ] **Step 2: Update snapshots**

```bash
pnpm --filter @sap-ux/deploy-config-sub-generator test -- --updateSnapshot
```

Expected: `abap-headless.test.ts.snap` updated — wherever `ui5.yaml` content appears it now includes:
```yaml
builder:
  resources:
    excludes:
      - /test/**
      - /localService/**
```

- [ ] **Step 3: Verify snapshot diff is correct**

The `ui5-deploy.yaml` portions of the snapshots should be unchanged (deploy config already had the excludes). Only `ui5.yaml` portions should gain the new section.

- [ ] **Step 4: Run full suite**

```bash
pnpm --filter @sap-ux/deploy-config-sub-generator test
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/deploy-config-sub-generator/test/headless/__snapshots__/abap-headless.test.ts.snap
git commit -m "test(deploy-config-sub-generator): update ABAP headless snapshots for ui5.yaml excludes"
```

---

## Task 6: Changeset + final quality gate

**Files:**
- Create: `.changeset/gap1-builder-resource-excludes.md`

- [ ] **Step 1: Create the changeset file**

Create `.changeset/gap1-builder-resource-excludes.md`:

```markdown
---
"@sap-ux/ui5-config": patch
"@sap-ux/abap-deploy-config-writer": patch
"@sap-ux/adp-tooling": patch
---

fix(ui5-config): add addBuilderResourceExcludes() to ensure builder.resources.excludes is written to both ui5.yaml and ui5-deploy.yaml

Addresses Gap 1 from issue #4756. Previously builder.resources.excludes was only appended inside addAbapDeployTask/addCloudFoundryDeployTask, so the base ui5.yaml never received these excludes. A new idempotent addBuilderResourceExcludes() method is added to UI5Config; abap-deploy-config-writer's updateBaseConfig now calls it unconditionally and always writes the base config file; getDeployConfig calls it before addAbapDeployTask. adp-tooling updated to maintain existing deploy yaml output.
```

- [ ] **Step 2: Run full quality gate**

```bash
pnpm --filter @sap-ux/ui5-config test
pnpm --filter @sap-ux/abap-deploy-config-writer test
pnpm --filter @sap-ux/adp-tooling test
pnpm --filter @sap-ux/deploy-config-sub-generator test
```

Expected: All pass

- [ ] **Step 3: Run lint**

```bash
pnpm --filter @sap-ux/ui5-config lint
pnpm --filter @sap-ux/abap-deploy-config-writer lint
pnpm --filter @sap-ux/adp-tooling lint
```

Expected: No lint errors

- [ ] **Step 4: Commit changeset**

```bash
git add .changeset/gap1-builder-resource-excludes.md
git commit -m "chore: add changeset for gap1 builder.resources.excludes fix"
```

---

## Self-Review

### Spec coverage

| Gap 1 requirement | Task |
|---|---|
| Add idempotent `addBuilderResourceExcludes()` | Task 1 |
| Remove `appendTo` calls from `addAbapDeployTask` | Task 2 |
| Remove `appendTo` calls from `addCloudFoundryDeployTask` | Task 2 |
| `updateBaseConfig`: call `addBuilderResourceExcludes()` | Task 3 |
| `updateBaseConfig`: always write base config file | Task 3 |
| `getDeployConfig`: call `addBuilderResourceExcludes()` before `addAbapDeployTask` | Task 3 |
| Snapshot updates: `@sap-ux/abap-deploy-config-writer` | Task 3 |
| Snapshot updates: `@sap-ux/adp-tooling` | Task 4 |
| Snapshot updates: `@sap-ux/deploy-config-sub-generator` | Task 5 |

**Note on `adp-tooling`:** The gap spec lists `adp-tooling` as needing only snapshot updates, but removing `appendTo` calls from `addAbapDeployTask` without updating `adp-tooling` source would silently drop `builder.resources.excludes` from its generated `ui5-deploy.yaml`. Task 4 includes the source fix (`addBuilderResourceExcludes()` call in `enhanceUI5DeployYaml`) to preserve correct behaviour.

### Type consistency

- `addBuilderResourceExcludes()` returns `this` — consistent with all other `UI5Config` chainable methods
- `updateBaseConfig` signature unchanged
- `getDeployConfig` signature unchanged

### No placeholders

Confirmed — all code blocks are complete and runnable.
