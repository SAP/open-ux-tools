# Migration Plan: Remaining JS/TS Rules from `eslint-plugin-fiori-custom` → `@sap-ux/eslint-plugin-fiori-tools`

## Context

We previously migrated rules from the `rel-npmjs` branch of `~/git/SAPDevelop/eslint-plugin-fiori-custom`.
This plan covers the **delta** — rules on `origin/main` of that repo not yet in the target package.

- **Source:** `/Users/I058153/git/SAPDevelop/eslint-plugin-fiori-custom` (branch: `main`, CommonJS JS)
- **Target:** `/Users/I058153/git/SAPDevelop/open-ux-tools-1/packages/eslint-plugin-fiori-tools` (branch: `migrate_additional_rules_from_fiori_custom`, TypeScript)
- **Rule type:** All are **JS/TS rules** — standard ESLint `Rule.RuleModule`, NOT `createFioriRule`. No `diagnostics.ts` entries needed.
- **Skill reference:** `.claude/skills/eslint-rule-development/SKILL.md` + `references/js-ts-rule.md`

---

## Rules Skipped (Do Not Migrate)

| Rule | Reason |
|---|---|
| `sap-no-event-prop` | Deprecated — superseded by already-migrated `sap-no-ui5base-prop` |
| `sap-no-ui5eventprovider-prop` | Deprecated — superseded by `sap-no-ui5base-prop` |
| `sap-no-ui5odatamodel-prop` | Deprecated — superseded by `sap-no-ui5base-prop` |
| `sap-ui5-deprecated-symbols` | Duplicate of already-migrated `sap-ui5-global-eval`; no test file |
| `sap-no-debugger` | Redundant — `no-debugger: 'error'` already in `standardEslintRules` |
| `sap-no-window-alert` | Redundant — `no-alert: 'error'` already in `standardEslintRules` |

---

## Rules to Migrate (11 rules)

### Group 1 — Simple standalone rules (no new dependencies)

| Priority | Rule | Severity | Source file |
|---|---|---|---|
| 1 | `sap-eslint-disable-count` | `warn` | `lib/rules/sap-eslint-disable-count.js` |
| 2 | `sap-no-console-log` | `warn` | `lib/rules/sap-no-console-log.js` |
| 3 | `sap-no-upload` | `error` | `lib/rules/sap-no-upload.js` |
| 4 | `sap-no-core-model-usage` | `warn` | `lib/rules/sap-no-core-model-usage.js` |
| 5 | `sap-not-localized` | `warn` | `lib/rules/sap-not-localized.js` |
| 6 | `sap-concatenated-strings` | `warn` | `lib/rules/sap-concatenated-strings.js` |

### Group 2 — Security/XSS rules (moderate complexity)

| Priority | Rule | Severity | Source file |
|---|---|---|---|
| 7 | `sap-unescaped-write` | `error` | `lib/rules/sap-unescaped-write.js` |
| 8 | `sap-browser-api-error` | `error` | `lib/rules/sap-browser-api-error.js` |

### Group 3 — ControllerHook utility (prerequisite for Group 4)

Port `lib/helpers/ControllerHook.js` → `src/rules/utils/controller-hook.ts`.  
Replace `dox` dependency with `comment-parser` (already in workspace lockfile at v1.4.8).  
Add `comment-parser` to `packages/eslint-plugin-fiori-tools/package.json` `dependencies`.

### Group 4 — Controller hook rules (depend on Group 3)

| Priority | Rule | Severity | Source file |
|---|---|---|---|
| 9 | `sap-controller-hook-missing-callback-signature` | `warn` | `lib/rules/sap-controller-hook-missing-callback-signature.js` |
| 10 | `sap-controller-hook-name-convention` | `warn` | `lib/rules/sap-controller-hook-name-convention.js` |
| 11 | `sap-controller-hook-bad-callback-signature` | `warn` | `lib/rules/sap-controller-hook-bad-callback-signature.js` |

---

## Implementation Steps (per rule, following the skill)

For each rule:

1. **Read** the JS source in `eslint-plugin-fiori-custom/lib/rules/sap-[name].js` and its test in `tests/lib/rules/sap-[name].js`
2. **Create** `packages/eslint-plugin-fiori-tools/src/rules/sap-[name].ts` using `Rule.RuleModule` pattern (not `createFioriRule`)
3. **Register** in `src/rules/index.ts` (alphabetical import + entry)
4. **Register** in `src/index.ts` under `recommended-for-s4hana` at correct severity (alphabetical)
5. **Write** `test/rules/sap-[name].test.ts` — convert from Mocha to Jest; use `{ message: '...' }` not `{ messageId: '...' }` in `errors`
6. **Write** `docs/rules/sap-[name].md` (use `docs/rules/TEMPLATE.md`)
7. **Update** README.md rules table (add new row at top with `new` version)
8. **Run** individual test: `NODE_OPTIONS="--experimental-vm-modules" npx jest --testPathPatterns="sap-[name]" --no-coverage`

---

## Key Conversion Notes

### TypeScript pattern (JS/TS rules)
```typescript
import type { Rule } from 'eslint';
const rule: Rule.RuleModule = {
    meta: { type: 'problem', docs: {...}, messages: { myId: 'message' }, schema: [] },
    create(context: Rule.RuleContext) {
        return { CallExpression(node): void { ... } };
    }
};
export default rule;
```

### Mocha → Jest test conversion
- Replace `require(...)` with `import ... from '...'`
- Replace `var ruleTester = new RuleTester()` with `const ruleTester = new RuleTester()`
- Use `errors: [{ message: 'exact string' }]` (never `messageId`)
- Fix the `sap-no-upload` test: the source `ruleTester.run()` incorrectly uses `"sap-no-window-alert"` as the run name — fix to `"sap-no-upload"`

### ESLint 9 API compatibility
- Use `context.sourceCode` (not `context.getSourceCode()`)
- For `sap-eslint-disable-count`: report on `comment as unknown as Rule.Node`

### `ControllerHook.js` → TypeScript with `comment-parser`
- `dox` tag fields: `e.type === 'callback'`, `callback.string` (full text after tag)
- `comment-parser` equivalents: `e.tag === 'callback'`, `callback.name` (identifier) — the `~owner~name` value from `dox`'s `string` maps to `comment-parser`'s `name` field
- `param.types.length === 0` (dox array) → `param.type.length === 0` (comment-parser string)

### Per-rule gotchas
- **`sap-no-core-model-usage`**: Two `messageId`s (`coreGetModel`, `coreSetModel`); use `getMemberAsString` from `src/utils/helpers.ts` instead of reimplementing
- **`sap-not-localized`** / **`sap-concatenated-strings`**: Extract shared `LOCALIZATION_SETTER_METHODS` constant into `src/rules/utils/` (these two rules share `['setText', 'setHeaderText', 'setPurpose']`)
- **`sap-unescaped-write`**: Scope `orm` variable inside `create()` closure — source incorrectly uses module-level variable which leaks across files
- **`sap-browser-api-error`**: Source has `/*eslint-disable complexity*/` — must refactor into category handlers to comply with `sonarjs/cognitive-complexity ≤ 15`. Follow same decomposition pattern as `sap-browser-api-warning.ts`
- **`sap-controller-hook-bad-callback-signature`**: Replace the source's `ANALYZED_HOOKS` object (keyed by `JSON.stringify(comment)`) with `Map<ESTree.Comment, HookState>` for type safety
- **`sap-no-console-log`**: The unique value over the built-in `no-console` is alias detection (`var log = console.log; log()`); add null guard before accessing `node.callee.object`

---

## Registration in `src/index.ts`

All 11 new rules go into `recommended-for-s4hana` **only** — do NOT add them to `baseFioriToolsRules` (which drives the `recommended` config).

In the `recommended-for-s4hana` rules object (alphabetical):
```
'@sap-ux/fiori-tools/sap-browser-api-error': 'error',
'@sap-ux/fiori-tools/sap-concatenated-strings': 'warn',
'@sap-ux/fiori-tools/sap-controller-hook-bad-callback-signature': 'warn',
'@sap-ux/fiori-tools/sap-controller-hook-missing-callback-signature': 'warn',
'@sap-ux/fiori-tools/sap-controller-hook-name-convention': 'warn',
'@sap-ux/fiori-tools/sap-eslint-disable-count': 'warn',
'@sap-ux/fiori-tools/sap-no-console-log': 'warn',
'@sap-ux/fiori-tools/sap-no-core-model-usage': 'warn',
'@sap-ux/fiori-tools/sap-no-upload': 'error',
'@sap-ux/fiori-tools/sap-not-localized': 'warn',
'@sap-ux/fiori-tools/sap-unescaped-write': 'error',
```

The three security rules (`sap-browser-api-error`, `sap-no-upload`, `sap-unescaped-write`) were `'error'` in the source plugin and stay `'error'` here.

---

## Files Created Per Rule

| File | Purpose |
|---|---|
| `src/rules/sap-[name].ts` | Rule implementation |
| `test/rules/sap-[name].test.ts` | Jest tests |
| `docs/rules/sap-[name].md` | Rule documentation |
| `src/rules/utils/controller-hook.ts` | Shared ControllerHook utility (Groups 3+4 only) |

## Files Modified

| File | Change |
|---|---|
| `src/rules/index.ts` | Add import + entry per rule (alphabetical) |
| `src/index.ts` | Add to `recommended-for-s4hana` rules object at correct severity |
| `README.md` | Add row per rule at top of table with `new` version |
| `package.json` | Add `comment-parser` to `dependencies` (Groups 3+4) |

---

## Quality Gates (run after all rules complete)

```bash
# Per-rule during development
NODE_OPTIONS="--experimental-vm-modules" npx jest --testPathPatterns="sap-[name]" --no-coverage

# Full suite after all 11 rules
pnpm --filter @sap-ux/eslint-plugin-fiori-tools test

# Lint fix + verify
pnpm --filter @sap-ux/eslint-plugin-fiori-tools lint:fix
pnpm --filter @sap-ux/eslint-plugin-fiori-tools lint

# Changeset (minor — 11 new rules)
pnpm cset
# Package: @sap-ux/eslint-plugin-fiori-tools, type: minor
# Message: "FEAT: migrate sap-eslint-disable-count, sap-no-console-log, sap-no-upload, sap-no-core-model-usage, sap-not-localized, sap-concatenated-strings, sap-unescaped-write, sap-browser-api-error, and controller hook rules from eslint-plugin-fiori-custom"
```
