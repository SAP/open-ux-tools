---
name: fiori-eslint-dev
description: "Develop a new ESLint rule for @sap-ux/eslint-plugin-fiori-tools. Always use this skill when adding any rule to the plugin, implementing manifest.json/XML/CDS/flex-change validation, writing rule tests with project context, or creating rule documentation — even if the request sounds simple or the user doesn't mention 'ESLint' explicitly. Guides through the complete workflow: diagnostics constant, rule implementation, unit tests, docs, and registration."
compatibility: Requires the open-ux-tools monorepo at packages/eslint-plugin-fiori-tools. Assumes pnpm workspace with TypeScript 5+.
metadata:
  author: sap-ux
  version: "0.0.1"
---

# Fiori ESLint Rule Developer

Add a new ESLint rule to `@sap-ux/eslint-plugin-fiori-tools` following the established patterns in the monorepo.

## ⚡ Efficiency rules — read before doing anything

1. **Use the `Read` tool directly** — never `Bash cat` or spawn Explore subagents for file reading
2. **Read everything in one parallel batch** — each fast path lists the exact files; read them all at once in a single turn
3. **Run only the new test file** during development — not the full package suite:
   ```bash
   NODE_OPTIONS="--experimental-vm-modules" npx jest --testPathPatterns="sap-[rule-name]" --no-coverage
   ```

---

## Step 1 — Identify the rule type, then read the reference file

| Type | Use when | Reference file |
|---|---|---|
| **Annotation rule** | Validates `UI.*` OData annotations in `.xml` / `.cds` files | `references/annotation.md` |
| **Manifest JSON rule** | Validates `manifest.json` properties | `references/manifest-json.md` |
| **Flex change file rule** | Validates `webapp/changes/*.change` (Applicable only to OData V2 flex change properties) | `references/flex-change.md` |
| **JavaScript / TypeScript rule** | Validates JS/TS application source code (UI5 patterns, global variables, deprecated APIs) | `references/js-rule.md` |

Infer from the request:
- **Rule name** — `sap-[kebab-case-name]` pattern
- **OData version** — V2 only, V4 only, or both
- **Auto-fix** — yes/no
- **Severity** — `error` or `warning`. Rules in `recommended-for-s4hana` MUST be `warn`.

**Read the matching reference file immediately**, then read all the files it lists in a single parallel batch. If the rule spans multiple types (e.g. annotations + manifest, or annotations + flex changes), read all matching reference files and combine their templates and access patterns.

---

## Steps 2–9: Implementation Checklist

### Step 2 — Add diagnostic constant (Fiori language rules only; skip for JS/TS rules)

In `packages/eslint-plugin-fiori-tools/src/language/diagnostics.ts`:
```typescript
export const MY_RULE = 'sap-my-new-rule';

export interface MyRuleDiagnostic {
    type: typeof MY_RULE;
    // ... fields from the reference file's "Required diagnostic fields" table
}

// Add MyRuleDiagnostic to the Diagnostic union at the bottom
```

### Step 3 — Implement the rule

Use the template from the reference file for your rule type.

### Step 4 — Register the rule

**`src/rules/index.ts`** — add import + entry (alphabetical order):
```typescript
import sapMyNewRule from './sap-my-new-rule.js';
// ...
[MY_RULE]: sapMyNewRule,
```

**`src/index.ts`** — add to `fioriLanguageConfig` rules (Fiori language rules) or `baseFioriToolsRules` (JS/TS rules):
```typescript
'@sap-ux/fiori-tools/sap-my-new-rule': 'warn',
```

If the rule should also apply to S/4HANA projects, add it to the `recommended-for-s4hana` config in `src/index.ts` as well. Rules in this config **must** use `'warn'` severity:
```typescript
// In the recommended-for-s4hana config rules object:
'@sap-ux/fiori-tools/sap-my-new-rule': 'warn',
```

### Step 5 — Write tests

Use the test template from the reference file. Run only the new test file during development:
```bash
NODE_OPTIONS="--experimental-vm-modules" npx jest --testPathPatterns="sap-my-new-rule" --no-coverage
```

If tests show 0 errors when violations are expected, check the debug checklist at the bottom of the reference file.

### Step 6 — Write documentation

Create `packages/eslint-plugin-fiori-tools/docs/rules/sap-[rule-name].md`.
Read `packages/eslint-plugin-fiori-tools/docs/rules/TEMPLATE.md` for structure. Key sections: Rule Details, Why Was This Introduced?, Warning / Error Examples, Correct Patterns, How to Fix. Only include "Further Reading" if you have a real verifiable URL.

### Step 7 — Update README

In `packages/eslint-plugin-fiori-tools/README.md`, do **two things**:

1. **Add your new rule** at the **top** of the rules table with `new` in the version column:
   ```markdown
   |  new  | [sap-my-new-rule](docs/rules/sap-my-new-rule.md) | Short description | | ✅ |
   ```

2. **Update the previously added rule**: find the row that still has `new` in the version column (there should be exactly one after your addition) and replace `new` with the version it was introduced in. Look up that version in `packages/eslint-plugin-fiori-tools/CHANGELOG.md` — find the first version entry that mentions the rule name.

### Step 8 — Run full quality gates (once)

```bash
pnpm --filter @sap-ux/eslint-plugin-fiori-tools lint:fix
```

### Step 9 — Create changeset

```bash
pnpm cset
```
Select `@sap-ux/eslint-plugin-fiori-tools`, choose `minor` for new rules:
```
FEAT: add sap-my-new-rule rule for [short description]
```

---

## Quick Reference: Key Files

| Purpose | Path |
|---|---|
| Rule implementation | `packages/eslint-plugin-fiori-tools/src/rules/sap-[name].ts` |
| Rule registry | `packages/eslint-plugin-fiori-tools/src/rules/index.ts` |
| Plugin config & exports | `packages/eslint-plugin-fiori-tools/src/index.ts` |
| Diagnostic constants | `packages/eslint-plugin-fiori-tools/src/language/diagnostics.ts` |
| Annotation helper utilities | `packages/eslint-plugin-fiori-tools/src/project-context/linker/annotations.ts` |
| Annotation index key format | `packages/eslint-plugin-fiori-tools/src/project-context/parser/service.ts` (lines 50-57) |
| Linker types | `packages/eslint-plugin-fiori-tools/src/project-context/linker/types.ts` |
| V2 linker | `packages/eslint-plugin-fiori-tools/src/project-context/linker/fe-v2.ts` |
| V4 linker | `packages/eslint-plugin-fiori-tools/src/project-context/linker/fe-v4.ts` |
| Rule factory | `packages/eslint-plugin-fiori-tools/src/language/rule-factory.ts` |
| Rule fixer | `packages/eslint-plugin-fiori-tools/src/language/rule-fixer.ts` |
| Test helper | `packages/eslint-plugin-fiori-tools/test/test-helper.ts` |
| Rule docs template | `packages/eslint-plugin-fiori-tools/docs/rules/TEMPLATE.md` |
| README rules table | `packages/eslint-plugin-fiori-tools/README.md` |

## `check()` context access by rule type

| Rule type | Use in `check()` | Why |
|---|---|---|
| **Annotation** | `linkedModel.apps` for page iteration; `index.apps[appKey]` for `getIndexedServiceForMainService` | `linkedModel.apps` provides page/lookup structure; `index.apps` provides the parsed service |
| **Manifest JSON** | `linkedModel.apps` for page iteration; `index.apps[appKey]` for `parsedApp` (manifest URI, manifestObject) | Requires linked pages to find manifest config paths |
| **Flex change** | `context.sourceCode.projectContext.linkedModel.apps` | Guard on `FioriChangeSourceCode` first; linked model provides change file config via `page.lookup['table']` |
| **JavaScript / TypeScript** | Standard ESLint `context` — no `projectContext` | JS/TS rules don't use the Fiori project model; use `Rule.RuleModule`, not `createFioriRule` |
