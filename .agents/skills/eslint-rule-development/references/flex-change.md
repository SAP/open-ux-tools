# Flex Change File Rule (V2 `.change`) — Fast Path

## Read all of these in parallel (one turn):

1. `packages/eslint-plugin-fiori-tools/src/language/diagnostics.ts`
2. `packages/eslint-plugin-fiori-tools/src/rules/sap-enable-export.ts`
3. `packages/eslint-plugin-fiori-tools/src/rules/sap-no-live-mode.ts`
4. `packages/eslint-plugin-fiori-tools/src/project-context/linker/fe-v2.ts` — see `getPropertyChangeConfig` for how `changeFileUri` is populated
5. `packages/eslint-plugin-fiori-tools/src/rules/index.ts`
6. `packages/eslint-plugin-fiori-tools/src/index.ts`
7. `packages/eslint-plugin-fiori-tools/test/test-helper.ts`

Use `sap-no-live-mode.ts` as the reference if the rule must also cover a V4 manifest property.

## Required diagnostic fields:

```typescript
export interface MyRuleDiagnostic {
    type: typeof MY_RULE;
    property: string;        // property name as it appears in the .change file — required for Page Editor
    pageName: string;
    pageSectionName?: string;
    changeFileUri?: string;  // required for Page Editor navigation to the change file
    manifest?: ManifestPropertyDiagnosticData; // only if rule also covers V4 manifest
}
```

## Rule template (V2 flex change only):

```typescript
import type { FioriRuleDefinition } from '../types.js';
import { MY_RULE } from '../language/diagnostics.js';
import { createFioriRule } from '../language/rule-factory.js';
import { FioriChangeSourceCode } from '../language/change/source-code.js';
import { createJsonFixer } from '../language/rule-fixer.js'; // only if auto-fix
import { FLEX_CHANGE_NEW_VALUE_PATH_RESULT } from '../utils/helpers.js'; // only if auto-fixable
import type { MemberNode } from '@humanwhocodes/momoa';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: MY_RULE,
    meta: {
        type: 'suggestion',
        docs: { recommended: true, description: 'Short description.' },
        messages: { [MY_RULE]: 'Error message.' },
        fixable: 'code', // add only if the rule provides an auto-fix
        schema: []
    },

    check(context) {
        // Guard: only run for .change files (V2). Add FioriJSONSourceCode guard if also covering V4 manifest.
        if (!(context.sourceCode instanceof FioriChangeSourceCode)) {
            return [];
        }
        const problems = [];
        for (const [, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            for (const page of app.pages) {
                // ✅ Use page.lookup['table'] to access tables — not page.someTable
                for (const table of page.lookup['table'] ?? []) {
                    const config = table.configuration.myProperty;
                    // Check for the incorrect value — type and value depend on the property
                    // e.g. !== true, === false, !== 'expectedValue', etc.
                    if (config && config.valueInFile !== expectedValue) {
                        problems.push({
                            type: MY_RULE,
                            property: 'myPropertyName',      // ← as it appears in the .change file
                            pageName: page.targetName,
                            changeFileUri: config.changeFileUri  // ← enables Page Editor navigation
                        });
                    }
                }
            }
        }
        return problems;
    },

    createChangeVisitorHandler(context, diagnostic) {
        return function report(node: MemberNode): void {
            context.report({
                node,
                messageId: MY_RULE,
                // Add fix, if there is a single correct defined value:
                fix: createJsonFixer({
                    context,
                    deepestPathResult: FLEX_CHANGE_NEW_VALUE_PATH_RESULT,
                    node,
                    operation: 'update',
                    value: correctValue  // ← the value to fix to; type matches the property (boolean, string, etc.)
                })
            });
        };
    }
});

export default rule;
```

For a rule covering both V2 flex change **and** V4 manifest, add `FioriJSONSourceCode` to the guard and add a `manifest` field to the diagnostic. See `sap-no-live-mode.ts` for the full pattern.

## Test template:

```typescript
import { RuleTester } from 'eslint';
import myRule from '../../src/rules/sap-[rule-name].js';
import { meta, languages } from '../../src/index.js';
import {
    setup,
    V2_FLEX_CHANGE_CONTENT, V2_FLEX_CHANGE_FILE_PATH
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const { createValidTest, createInvalidTest } = setup('sap-[rule-name]');

ruleTester.run('sap-[rule-name]', myRule, {
    valid: [
        createValidTest(
            { name: 'V2: property not set in change file', filename: V2_FLEX_CHANGE_FILE_PATH, code: JSON.stringify(V2_FLEX_CHANGE_CONTENT, undefined, 2) },
            []
        ),
        createValidTest(
            { name: 'V2: property set correctly', filename: V2_FLEX_CHANGE_FILE_PATH, code: JSON.stringify({ ...V2_FLEX_CHANGE_CONTENT, content: { ...V2_FLEX_CHANGE_CONTENT.content, property: 'myProp', newValue: true } }, undefined, 2) },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            { name: 'V2: property set incorrectly', filename: V2_FLEX_CHANGE_FILE_PATH, code: JSON.stringify({ ...V2_FLEX_CHANGE_CONTENT, content: { ...V2_FLEX_CHANGE_CONTENT.content, property: 'myProp', newValue: false } }, undefined, 2) },
            [],
            { errors: [{ message: '<fully resolved error message string>' }] }
        )
    ]
});
```

## Debug checklist (if tests show 0 errors when violations expected):

- Is the `FioriChangeSourceCode` guard in place?
- Is `config.changeFileUri` populated? (check `getPropertyChangeConfig` in `fe-v2.ts`)
- Is `linkedModel.apps` used (correct for flex change rules)?
- Is `page.lookup['table']` used (not `page.someTable`) to access tables?
- Hybrid V2+V4 rule: is the `FioriJSONSourceCode` guard also in place for the manifest branch of `check()`? (`context.sourceCode instanceof FioriJSONSourceCode`)
