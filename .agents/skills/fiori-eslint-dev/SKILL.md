---
name: fiori-eslint-dev
description: Develop a new ESLint rule for @sap-ux/eslint-plugin-fiori-tools. Use when adding a new rule to the plugin, implementing manifest.json/XML/CDS validation, writing rule tests with project context, or creating rule documentation. Guides through the complete workflow: diagnostics constant, rule implementation, unit tests, docs, and registration.
compatibility: Requires the open-ux-tools monorepo at packages/eslint-plugin-fiori-tools. Assumes pnpm workspace with TypeScript 5+.
metadata:
  author: sap-ux
  version: "0.0.1"
---

# Fiori ESLint Rule Developer

Add a new ESLint rule to `@sap-ux/eslint-plugin-fiori-tools` following the established patterns in the monorepo.

## Step 1 — Identify the rule type

Before writing any code, determine which kind of rule you are implementing:

| Type | Use when | Key file to extend |
|---|---|---|
| **JavaScript rule** | Validates JS/TS source code (e.g. deprecated APIs, global variables) | `src/utils/helpers.ts` |
| **Fiori language rule — JSON** | Validates `manifest.json` properties across the project | `src/language/rule-factory.ts` |
| **Fiori language rule — XML** | Validates XML view or fragment files | `src/language/rule-factory.ts` |
| **Fiori language rule — CDS** | Validates OData annotations in `.cds` files | `src/language/rule-factory.ts` |
| **Fiori language rule — flex change file** | Validates `webapp/changes/*.change` (JSON) flex change files; used when a setting can be overridden by a flex change in V2 projects | `src/language/change/source-code.ts`, `src/language/rule-factory.ts` |

Read the rule request carefully and pick the correct type. Most new rules since 2024 are Fiori language rules operating on `manifest.json`.

Ask or infer:
- **Rule name** — must follow `sap-[kebab-case-name]` pattern
- **File type** — JSON manifest, XML, CDS, or JS/TS
- **OData version** — V2 only, V4 only, or both (affects linker and test setup)
- **Expected value / behavior** — what should be flagged and what is correct
- **Auto-fix** — should the rule be fixable? (If yes, determine the fix: remove property, set value, etc.)
- **Severity** — `error` or `warning` in the recommended configs. By default all rule for `recommended-for-s4hana` MUST be warning.

## Step 2 — Understand existing similar rules

Before writing code, read 1-2 existing rules that are similar in structure.

```bash
# List all rule files
ls packages/eslint-plugin-fiori-tools/src/rules/sap-*.ts

# For Fiori language rules on manifest.json — good reference rules:
cat packages/eslint-plugin-fiori-tools/src/rules/sap-flex-enabled.ts
cat packages/eslint-plugin-fiori-tools/src/rules/sap-table-column-vertical-alignment.ts

# For flex change file rules — good reference rules (use when rule covers V2 .change files):
cat packages/eslint-plugin-fiori-tools/src/rules/sap-enable-export.ts
cat packages/eslint-plugin-fiori-tools/src/rules/sap-enable-paste.ts

# For JavaScript rules — good reference rules:
cat packages/eslint-plugin-fiori-tools/src/rules/sap-no-br-on-return.ts
cat packages/eslint-plugin-fiori-tools/src/rules/sap-no-global-variable.ts
```

Also read the diagnostics file to understand how constants are named:
```bash
cat packages/eslint-plugin-fiori-tools/src/language/diagnostics.ts
```

And the relevant linker to understand what data is already extracted:
```bash
# V2 project linker (manifest → linked model)
cat packages/eslint-plugin-fiori-tools/src/project-context/linker/fe-v2.ts

# V4 project linker
cat packages/eslint-plugin-fiori-tools/src/project-context/linker/fe-v4.ts
```

## Step 3 — Add the diagnostic constant

For **Fiori language rules**, add a new string constant to `src/language/diagnostics.ts`:

```typescript
// Example: at the end of the constants section
export const MY_NEW_RULE = 'sap-my-new-rule';
```

The constant value must exactly match the rule name (the `sap-` prefix is standard).

```bash
# Edit the diagnostics file
# File: packages/eslint-plugin-fiori-tools/src/language/diagnostics.ts
```

**Skip this step for JavaScript rules** — they use `messageId` strings directly in the rule meta.

## Step 4 — Update the linker if needed (Fiori language rules only)

If your rule needs data from `manifest.json` that is not yet extracted into the linked model, update the relevant linker.

Check what the linker currently extracts:
```bash
cat packages/eslint-plugin-fiori-tools/src/project-context/linker/types.ts
```

If the property you need is not in `LinkedApp` or related types, add it:

1. **Add to types** (`src/project-context/linker/types.ts`): extend the `LinkedApp` or appropriate interface
2. **Add to linker** (`src/project-context/linker/fe-v2.ts` and/or `fe-v4.ts`): extract the property from the manifest

Example pattern in `fe-v2.ts`:
```typescript
// Inside the app linking function, after existing extractions:
const myProp = getDeepValue(manifest, ['sap.app', 'myProperty']);
app.myProperty = myProp;
```

## Step 5 — Implement the rule

Create `packages/eslint-plugin-fiori-tools/src/rules/sap-[rule-name].ts`.

### For a Fiori language rule (manifest.json):

```typescript
import type { FioriRuleDefinition } from '../types';
import { MY_NEW_RULE } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import { createJsonFixer } from '../language/rule-fixer';
import type { MemberNode } from '../language/json/types';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: MY_NEW_RULE,
    meta: {
        type: 'suggestion', // or 'problem'
        docs: {
            description: 'Short description of the rule',
            category: 'Best Practices',
            recommended: true
        },
        messages: {
            [MY_NEW_RULE]: 'Human-readable error message explaining the violation.'
        },
        fixable: 'code', // omit if no auto-fix
        schema: []
    },
    check(context) {
        const problems: ReturnType<typeof context.getDiagnostic>[] = [];
        for (const [, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (!app.isV2 && !app.isV4) continue; // filter by version if needed

            // Check the condition
            const value = app.myProperty; // from the linker
            if (value !== undefined && value !== 'expectedValue') {
                problems.push(context.getDiagnostic(MY_NEW_RULE, app));
            }
        }
        return problems;
    },
    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: MY_NEW_RULE,
                fix: createJsonFixer({
                    // Remove the setting: provide parent path to delete
                    deepestPathResult,
                    node
                })
            });
        }
});

export default rule;
```

### For a JavaScript rule:

```typescript
import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Short description',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            myMessageId: 'Human-readable error message.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        return {
            CallExpression(node) {
                // Check the node and report if needed
                // context.report({ node, messageId: 'myMessageId' });
            }
        };
    }
};

export default rule;
```

### For a flex change file rule (V2 `.change` files):

Rules that cover both `manifest.json` (V4) and flex `*.change` files (V2) must:

1. Accept both `FioriJSONSourceCode` and `FioriChangeSourceCode` in `check()`.
2. Use `createChangeVisitorHandler` (alongside `createJsonVisitorHandler`) in `createFioriRule`.
3. Use `FLEX_CHANGE_NEW_VALUE_PATH_RESULT` from `src/utils/helpers.ts` as the `deepestPathResult` for the fixer — change files use `operation: 'update'` (not `'delete'`) to set `content.newValue` to the correct value.
4. Set `changeFileUri` on the diagnostic object (populated by the linker from `ConfigurationProperty`).

```typescript
import { FioriJSONSourceCode } from '../language/json/source-code.js';
import { FioriChangeSourceCode } from '../language/change/source-code.js';
import { FLEX_CHANGE_NEW_VALUE_PATH_RESULT } from '../utils/helpers.js';
import { createJsonFixer } from '../language/rule-fixer.js';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: MY_RULE,
    meta: { /* ... */ },

    check(context) {
        if (
            !(context.sourceCode instanceof FioriJSONSourceCode) &&
            !(context.sourceCode instanceof FioriChangeSourceCode)
        ) {
            return [];
        }
        // ... collect diagnostics including changeFileUri from linker ...
        return problems;
    },

    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: MY_RULE,
                fix: createJsonFixer({ context, deepestPathResult, node, operation: 'delete' })
            });
        },

    createChangeVisitorHandler(context, diagnostic) {
        return function report(node: MemberNode): void {
            context.report({
                node,
                messageId: MY_RULE,
                fix: createJsonFixer({
                    context,
                    deepestPathResult: FLEX_CHANGE_NEW_VALUE_PATH_RESULT,
                    node,
                    operation: 'update',
                    value: true   // or whatever the correct value is
                })
            });
        };
    }
});
```

Key reference for the linker side: `src/project-context/linker/fe-v2.ts` `getTablePropertyChangeConfig` — this is how `changeFileUri` and `selector` are populated on a `ConfigurationProperty` from parsed flex change files.

## Step 6 — Register the rule

Add the rule to `packages/eslint-plugin-fiori-tools/src/rules/index.ts`:

```typescript
// 1. Add import (keep alphabetical order)
import sapMyNewRule from './sap-my-new-rule';

// 2. Add to the exported rules object (keep alphabetical order)
export const rules = {
    // ... existing rules ...
    'sap-my-new-rule': sapMyNewRule,
    // ... more rules ...
};
```

Then add it to the appropriate config in `packages/eslint-plugin-fiori-tools/src/index.ts`:

```typescript
// Inside configs['recommended-for-s4hana'].rules (for Fiori language rules)
// or inside configs.recommended.rules (for JS/TS rules)
'@sap-ux/fiori-tools/sap-my-new-rule': 'error', // or 'warn'
```

## Step 7 — Write unit tests

### Before writing tests, understand existing tests

```bash
# Check existing test files - v4
cat packages/eslint-plugin-fiori-tools/test/rules/sap-creation-mode-for-table-v4.test.ts
# Check existing test files - v2
cat packages/eslint-plugin-fiori-tools/test/rules/sap-creation-mode-for-table-v2.test.ts
# Check existing test with CAP/CDS support
cat packages/eslint-plugin-fiori-tools/test/rules/sap-width-including-column-header.test.ts
# Check existing test with flex change file support
cat packages/eslint-plugin-fiori-tools/test/rules/sap-enable-export.test.ts
```

Create `packages/eslint-plugin-fiori-tools/test/rules/sap-[rule-name].test.ts`.

### For Fiori language rules:

```typescript
import { RuleTester } from 'eslint';
import myNewRule from '../../src/rules/sap-my-new-rule';
import { meta, languages } from '../../src/index';
import {
    getManifestAsCode,
    setup,
    V4_MANIFEST,
    V4_MANIFEST_PATH,
    // Or V2_MANIFEST, V2_MANIFEST_PATH for V2 rules
} from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const { createValidTest, createInvalidTest } = setup('sap-my-new-rule');

ruleTester.run('sap-my-new-rule', myNewRule, {
    valid: [
        // Case 1: property not set — should be valid (rule only fires when wrong value present)
        createValidTest(
            {
                name: 'property not configured',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2)
            },
            [] // no project context changes needed
        ),
        // Case 2: property set to correct value
        createValidTest(
            {
                name: 'property set to correct value',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    { path: ['sap.app', 'myProperty'], value: 'expectedValue' }
                ])
            },
            []
        )
    ],
    invalid: [
        // Case 3: property set to wrong value
        createInvalidTest(
            {
                name: 'property set to wrong value',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    { path: ['sap.app', 'myProperty'], value: 'wrongValue' }
                ])
            },
            [],
            {
                errors: [{ messageId: 'sap-my-new-rule' }],
                // If fixable, include the expected output after fix:
                // output: getManifestAsCode(V4_MANIFEST, []) // property removed
            }
        )
    ]
});
```

### For CAP/CDS rules:

CAP rules run against a CAP project where annotations live in `.cds` files rather than `manifest.json`. Use `setup(name, CAP_APP_PATH)` to point the project context at the CAP test project — this also triggers an `npm install` of the CDS module if needed.

```typescript
import {
    getManifestAsCode,
    setup,
    CAP_APP_PATH,
    CAP_MANIFEST,
    CAP_MANIFEST_PATH,
    CAP_ANNOTATIONS_PATH,
} from '../test-helper';

// Regular (non-CAP) tester
const { createValidTest, createInvalidTest } = setup('sap-my-new-rule');

// CAP tester — second argument activates CAP project context
const { createValidTest: createValidTestCAP, createInvalidTest: createInvalidTestCAP } = setup(
    'sap-my-new-rule - CAP',
    CAP_APP_PATH
);

// Run a separate ruleTester.run() block for CAP cases:
ruleTester.run('sap-my-new-rule - CAP', myNewRule, {
    valid: [
        createValidTestCAP(
            {
                name: 'non manifest file - cds',
                filename: 'some-other-file.cds',
                code: ''
            },
            []
        ),
        createValidTestCAP(
            {
                name: 'property correct in CAP manifest',
                filename: CAP_MANIFEST_PATH,
                code: JSON.stringify(CAP_MANIFEST)
            },
            []
        )
    ],
    invalid: [
        createInvalidTestCAP(
            {
                name: 'property wrong in CAP manifest',
                filename: CAP_MANIFEST_PATH,
                code: getManifestAsCode(CAP_MANIFEST, [
                    { path: ['sap.app', 'myProperty'], value: 'wrongValue' }
                ])
            },
            {
                errors: [{ messageId: 'sap-my-new-rule' }]
            }
        )
    ]
});
```

**Note:** `CAP_ANNOTATIONS_PATH` (`annotations.cds`) is available when the rule operates on CDS annotation files directly. Pass it as `filename` in test cases that lint CDS content.

### For flex change file rules (V2 `.change` files):

```typescript
import {
    getManifestAsCode,
    setup,
    V2_MANIFEST,
    V2_MANIFEST_PATH,
    V2_FLEX_CHANGE_CONTENT,
    V2_FLEX_CHANGE_FILE_PATH,
} from '../test-helper';

const { createValidTest, createInvalidTest } = setup('sap-my-new-rule');

ruleTester.run('sap-my-new-rule', myNewRule, {
    valid: [
        // Change file present but property not set — no violation
        createValidTest(
            {
                name: 'V2 - change file without relevant property',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(V2_FLEX_CHANGE_CONTENT, undefined, 2)
            },
            []
        ),
        // Change file sets the property to the correct value
        createValidTest(
            {
                name: 'V2 - change file property set correctly',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(
                    { ...V2_FLEX_CHANGE_CONTENT, content: { ...V2_FLEX_CHANGE_CONTENT.content, property: 'myProperty', newValue: true } },
                    undefined, 2
                )
            },
            []
        )
    ],
    invalid: [
        // Change file sets the property to the wrong value
        createInvalidTest(
            {
                name: 'V2 - change file property set to wrong value',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(
                    { ...V2_FLEX_CHANGE_CONTENT, content: { ...V2_FLEX_CHANGE_CONTENT.content, property: 'myProperty', newValue: false } },
                    undefined, 2
                )
            },
            [],
            {
                errors: [{ messageId: 'sap-my-new-rule' }],
                // Fix should update content.newValue to true:
                // output: JSON.stringify({ ...V2_FLEX_CHANGE_CONTENT, content: { ...V2_FLEX_CHANGE_CONTENT.content, property: 'myProperty', newValue: true } }, undefined, 2)
            }
        )
    ]
});
```

### For JavaScript rules:

```typescript
import rule from '../../src/rules/sap-my-new-rule';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester();
ruleTester.run('sap-my-new-rule', rule, {
    valid: [
        'validCode();',
        'anotherValidPattern()'
    ],
    invalid: [
        {
            code: 'invalidPattern();',
            errors: [{ messageId: 'myMessageId', type: 'CallExpression' }]
        }
    ]
});
```

**Test naming guidelines:**
- Use descriptive test names (`name:` field)
- Test both V2 and V4 separately if the rule applies to both
- Cover: property absent (valid), property correct (valid), property wrong (invalid)
- If fixable, always include `output:` in invalid test cases to verify the fix

## Step 8 — Write rule documentation

Create `packages/eslint-plugin-fiori-tools/docs/rules/sap-[rule-name].md`:

```markdown
# sap-my-new-rule

## Rule Details

This rule ensures that `myProperty` is set to `'expectedValue'` in `manifest.json`.

Setting `myProperty` to any other value causes [specific problem].

## Why Was This Introduced?

[Context: what user-visible problem does this rule prevent?]

## Warning / Error Examples

The following configuration will trigger a warning/error:

\`\`\`json
{
  "sap.app": {
    "myProperty": "wrongValue"
  }
}
\`\`\`

**Error message:** `Human-readable error message explaining the violation.`

## Correct Patterns

The following configurations are valid:

**Property absent (default behavior applies):**
\`\`\`json
{
  "sap.app": {}
}
\`\`\`

**Property set to correct value:**
\`\`\`json
{
  "sap.app": {
    "myProperty": "expectedValue"
  }
}
\`\`\`

## How to Fix

[Describe how to resolve the violation. Mention if the rule is auto-fixable.]

If the rule is auto-fixable, running `eslint --fix` will [describe what the fix does].

## Bug Report

Report issues at: https://github.com/SAP/open-ux-tools/issues

## Further Reading

- [Link to relevant UI5 documentation]
- [Link to Fiori Design Guidelines if applicable]
```

## Step 9 — Update the README

Add the new rule to the rule table in `packages/eslint-plugin-fiori-tools/README.md`:

```bash
# Find the rules table in README
grep -n "sap-" packages/eslint-plugin-fiori-tools/README.md | head -20
```

Add a row in the correct alphabetical position:
```markdown
| [`sap-my-new-rule`](docs/rules/sap-my-new-rule.md) | Short description | ✅ | 🔧 |
```

(Use ✅ for enabled rules, 🔧 for fixable rules.)

## Step 10 — Run tests and lint

```bash
# Run only this package's tests (faster than full monorepo)
pnpm --filter @sap-ux/eslint-plugin-fiori-tools test

# Fix any lint issues
pnpm --filter @sap-ux/eslint-plugin-fiori-tools lint:fix

# Build to verify TypeScript compiles cleanly
pnpm --filter @sap-ux/eslint-plugin-fiori-tools build
```

If tests fail, check:
- Is the diagnostic constant exported from `diagnostics.ts`?
- Is the rule registered in `src/rules/index.ts`?
- Does the test helper `setup()` match the rule name exactly?
- Are the manifest paths correct in test cases?

## Step 11 — Create a changeset

```bash
pnpm cset
```

Select `@sap-ux/eslint-plugin-fiori-tools`, choose `minor` for new rules (or `patch` for fixes), and write a message following the convention:

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
| Linker types | `packages/eslint-plugin-fiori-tools/src/project-context/linker/types.ts` |
| V2 linker | `packages/eslint-plugin-fiori-tools/src/project-context/linker/fe-v2.ts` |
| V4 linker | `packages/eslint-plugin-fiori-tools/src/project-context/linker/fe-v4.ts` |
| Rule factory | `packages/eslint-plugin-fiori-tools/src/language/rule-factory.ts` |
| Rule fixer | `packages/eslint-plugin-fiori-tools/src/language/rule-fixer.ts` |
| Flex change source code | `packages/eslint-plugin-fiori-tools/src/language/change/source-code.ts` |
| Parser types (FlexChange) | `packages/eslint-plugin-fiori-tools/src/project-context/parser/types.ts` |
| Test helper | `packages/eslint-plugin-fiori-tools/test/test-helper.ts` |
| Test data (V4) | `packages/eslint-plugin-fiori-tools/test/data/v4-xml-start/` |
| Test data (V2) | `packages/eslint-plugin-fiori-tools/test/data/v2-xml-start/` |
| Test data (V2 flex changes) | `packages/eslint-plugin-fiori-tools/test/data/v2-xml-start/webapp/changes/` |
| Test data (CAP) | `packages/eslint-plugin-fiori-tools/test/data/cap-start/` |
| Rule docs | `packages/eslint-plugin-fiori-tools/docs/rules/sap-[name].md` |
| Docs template | `packages/eslint-plugin-fiori-tools/docs/rules/TEMPLATE.md` |
| README rules table | `packages/eslint-plugin-fiori-tools/README.md` |
