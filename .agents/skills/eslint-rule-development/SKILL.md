---
name: eslint-rule-development
description: "Develop a new ESLint rule for @sap-ux/eslint-plugin-fiori-tools. Always use this skill when adding any rule to the plugin, implementing manifest.json/XML/CDS/flex-change validation, writing rule tests with project context, or creating rule documentation — even if the request sounds simple or the user doesn't mention 'ESLint' explicitly. Guides through the complete workflow: diagnostics constant, rule implementation, unit tests, docs, and registration."
compatibility: Requires the open-ux-tools monorepo at packages/eslint-plugin-fiori-tools. Assumes pnpm workspace with TypeScript 5+.
metadata:
  author: sap-fiori-tools
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
| **JavaScript / TypeScript rule** | Validates JS/TS application source code (UI5 patterns, global variables, deprecated APIs) | `references/js-ts-rule.md` |

Infer from the request:
- **Rule name** — `sap-[kebab-case-name]` pattern
- **OData version** — V2 only, V4 only, or both
- **Page scope** — which page types to check. **Default: all page types** (list report, object page, etc.) unless the spec explicitly restricts the scope. Do not limit to one page type based on the examples in the spec.
- **Auto-fix** — yes/no
- **Severity** — `error` or `warn`. Rules in `recommended-for-s4hana` MUST be `warn`.

**OData version determines the linker file — always follow the stated version:**

| OData version | Linker file | Manifest root |
|---|---|---|
| V2 only | `src/project-context/linker/fe-v2.ts` | `sap.ui.generic.app.pages.*` |
| V4 only | `src/project-context/linker/fe-v4.ts` | `sap.ui5.routing.targets.*` |
| Both | both linker files | both roots |

**Read the matching reference file immediately**, then read all the files it lists in a single parallel batch. If the rule spans multiple types (e.g. annotations + manifest, or manifest + flex changes), read all matching reference files and combine their templates and access patterns.

---

## Steps 2–10: Implementation Checklist

### Step 2 — Add diagnostic constant (annotation, manifest JSON, and flex change rules only; skip for JS/TS rules)

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

**Code quality requirements for every new or modified function:**

- **JSDoc** — add a JSDoc block (`@param`, `@returns`) to every new function. When modifying an existing function, update its JSDoc to reflect any signature or behaviour changes.
- **Cognitive complexity ≤ 15** — enforced by `sonarjs/cognitive-complexity`. If a function exceeds 15, extract branches or loops into well-named helper functions until the complexity falls within the limit. Do not inline complex logic in a single function to avoid this.

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

Use the test template from the reference file; run only the new test file (see efficiency rules at the top).

**Always check `message`, never `messageId`, in `errors` arrays.** When a rule message contains interpolated data (e.g. `{{tableType}}`), checking only `messageId` would accept any value for that placeholder and miss regressions. Use the fully resolved string instead:

```typescript
// ✅ Correct — verifies the interpolated value
errors: [
    {
        message:
            '"TreeTable" is not supported in Flexible Column Layout with a draft-enabled service.'
    }
]

// ❌ Wrong — does not verify the data interpolated into the message
errors: [{ messageId: 'sap-my-new-rule' }]
```

If tests show 0 errors when violations are expected, check the debug checklist at the bottom of the reference file.

### Step 6 — Write documentation

Create `packages/eslint-plugin-fiori-tools/docs/rules/sap-[rule-name].md`.
Read `packages/eslint-plugin-fiori-tools/docs/rules/TEMPLATE.md` for structure. Key sections:

- **H1 title** — one sentence describing the rule, with the rule ID in parentheses
- **Intro paragraph** — 2–3 sentences: what it detects, **why it was introduced** (motivation belongs here, not in a separate H2), and what to do instead
- **## Rule Details** — how the rule works; warning message; "The following patterns are considered warnings" + "The following patterns are not considered warnings" code examples
- **### How to Fix** — steps to remediate (omit if obvious from the examples)
- **## False Positives** — optional; include only if the rule can produce false positives
- **## Bug Report** — link to GitHub issues
- **## Further Reading** — optional; only include if you have a real, verifiable URL

### Step 7 — Update README

In `packages/eslint-plugin-fiori-tools/README.md`, do **two things**:

1. **Add your new rule** at the **top** of the rules table with `new` in the version column:
   ```markdown
   |  new  | [sap-my-new-rule](docs/rules/sap-my-new-rule.md) | Short description | | ✅ |
   ```

2. **Backfill any pending `new` versions**: if any rows still show `new` from prior rule additions that have since been released, look up each rule's release version in `packages/eslint-plugin-fiori-tools/CHANGELOG.md` and replace `new` with that version. After this cleanup, your newly added rule should be the only row showing `new`.

### Step 8 — Run full quality gates (once)

Run `lint:fix` to auto-fix ESLint errors and apply Prettier formatting across all modified files, then verify no issues remain:

```bash
# Fix lint errors and apply Prettier formatting
pnpm --filter @sap-ux/eslint-plugin-fiori-tools lint:fix

# Verify no remaining issues
pnpm --filter @sap-ux/eslint-plugin-fiori-tools lint
```

If `lint` reports errors after `lint:fix`:

- **`sonarjs/cognitive-complexity`** — resolve per the cognitive complexity guidance in Step 3.
- **`prettier/prettier`** — a formatting issue could not be auto-fixed. Apply the suggested change manually (usually a line that is too long or a multiline expression that needs restructuring).
- **`@typescript-eslint/no-unsafe-*`** — replace `any` casts or untyped values with proper interfaces or `unknown` + type guards.

Do not proceed to Step 9 until `pnpm lint` exits with code 0.

Then confirm all tests still pass:

```bash
pnpm --filter @sap-ux/eslint-plugin-fiori-tools test
```

### Step 9 — Create changeset

```bash
pnpm cset
```
Select `@sap-ux/eslint-plugin-fiori-tools`, choose `minor` for new rules:
```
FEAT: add sap-my-new-rule rule for [short description]
```

### Step 10 — Report

Summarize what was done:
- **Rule name and type** — rule ID and which type (annotation / manifest JSON / flex change / JS/TS)
- **Files created** — rule implementation, test file, doc file
- **Files modified** — diagnostics.ts, rules/index.ts, src/index.ts, README.md
- **Test results** — number of valid and invalid cases, all passing
- **Changeset** — package, bump type (`minor`), summary line

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
| **Annotation** | `linkedModel.apps` for page iteration; `index.apps[appKey]` for `getIndexedServiceForMainService` | Only check annotations **referenced from pages** — never scan all entity annotations. `pageNames` must list only pages that reference the specific annotation. See `annotation.md` for access patterns and the page-annotation-map template. |
| **Manifest JSON** | `linkedModel.apps` for page iteration; `index.apps[appKey]` for `parsedApp` (manifest URI, manifestObject) | Requires linked pages to find manifest config paths |
| **Flex change** | `context.sourceCode.projectContext.linkedModel.apps` | Guard on `FioriChangeSourceCode` first; linked model provides change file config via `page.lookup['table']` |
| **JavaScript / TypeScript** | Standard ESLint `context` — no `projectContext` | JS/TS rules don't use the Fiori project model; use `Rule.RuleModule`, not `createFioriRule` |
