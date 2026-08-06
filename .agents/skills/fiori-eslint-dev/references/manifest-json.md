# Manifest JSON Rule — Fast Path

## Read all of these in parallel (one turn):

1. `packages/eslint-plugin-fiori-tools/src/language/diagnostics.ts`
2. `packages/eslint-plugin-fiori-tools/src/rules/sap-table-column-vertical-alignment.ts` — simplest manifest rule
3. `packages/eslint-plugin-fiori-tools/src/project-context/linker/types.ts` — check if your property is already in the linked model
4. `packages/eslint-plugin-fiori-tools/src/rules/index.ts`
5. `packages/eslint-plugin-fiori-tools/src/index.ts`
6. `packages/eslint-plugin-fiori-tools/test/test-helper.ts`

**Read linkers only if** the property you need is not yet in the linked model:
- `packages/eslint-plugin-fiori-tools/src/project-context/linker/fe-v4.ts`
- `packages/eslint-plugin-fiori-tools/src/project-context/linker/fe-v2.ts`

For complex rules with multiple messages, also read `src/rules/sap-creation-mode-for-table.ts`.

## Required diagnostic fields:

```typescript
export interface MyRuleDiagnostic {
    type: typeof MY_RULE;
    pageName?: string;
    pageSectionName?: string;
    manifest: ManifestPropertyDiagnosticData;  // { uri, object, propertyPath, loc }
}
```

## Rule template:

```typescript
import type { FioriRuleDefinition } from '../types.js';
import { MY_RULE } from '../language/diagnostics.js';
import { createFioriRule } from '../language/rule-factory.js';
import { createJsonFixer } from '../language/rule-fixer.js';
import type { MemberNode } from '../language/json/types.js';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: MY_RULE,
    meta: {
        type: 'suggestion',
        docs: { recommended: true, description: 'Short description.' },
        messages: { [MY_RULE]: 'Error message.' },
        fixable: 'code', // omit if no auto-fix
        schema: []
    },

    check(context) {
        const problems = [];
        // ✅ manifest rules use linkedModel.apps — pages are required to find manifest config paths
        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (!app.isV4) continue; // or app.type !== 'fe-v2', or both
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            for (const page of app.pages) {
                // ✅ Use page.lookup['table'] to access tables — not page.someTable
                for (const table of page.lookup['table'] ?? []) {
                    const config = table.configuration.myProperty;
                    if (config?.valueInFile !== undefined && config.valueInFile !== expectedValue) {
                        const node = context.sourceCode.getNode(
                            context.sourceCode.ast.body,
                            config.configurationPath
                        );
                        problems.push({
                            type: MY_RULE,
                            pageName: page.targetName,
                            manifest: {
                                uri: parsedApp.manifest.manifestUri,
                                object: parsedApp.manifestObject,
                                propertyPath: config.configurationPath,
                                loc: node.loc
                            }
                        });
                    }
                }
            }
        }
        return problems;
    },

    createJsonVisitorHandler: (context, diagnostic, deepestPathResult) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: MY_RULE,
                fix: createJsonFixer({ 
                    context,
                    deepestPathResult,
                    node
                 })
            });
        }
});

export default rule;
```

## Test template:

```typescript
import { RuleTester } from 'eslint';
import myRule from '../../src/rules/sap-[rule-name].js';
import { meta, languages } from '../../src/index.js';
import { getManifestAsCode, setup, V4_MANIFEST, V4_MANIFEST_PATH } from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const { createValidTest, createInvalidTest } = setup('sap-[rule-name]');

ruleTester.run('sap-[rule-name]', myRule, {
    valid: [
        createValidTest({ name: 'property not set', filename: V4_MANIFEST_PATH, code: JSON.stringify(V4_MANIFEST, undefined, 2) }, []),
        createValidTest({ name: 'correct value', filename: V4_MANIFEST_PATH, code: getManifestAsCode(V4_MANIFEST, [{ path: ['sap.ui5', 'myProp'], value: 'correct' }]) }, [])
    ],
    invalid: [
        createInvalidTest(
            { name: 'wrong value', filename: V4_MANIFEST_PATH, code: getManifestAsCode(V4_MANIFEST, [{ path: ['sap.ui5', 'myProp'], value: 'wrong' }]) },
            [],
            {
                errors: [{ messageId: 'sap-[rule-name]' }],
                // output: getManifestAsCode(V4_MANIFEST, []) // include if fixable
            }
        )
    ]
});
```

## Debug checklist (if tests show 0 errors when violations expected):

- Is `linkedModel.apps` used (correct for manifest rules)?
- Is `index.apps[appKey]` used to get `parsedApp` for `manifest.manifestUri` and `manifestObject`?
- Is `page.lookup['table']` used (not `page.someTable`) to access tables?
- Is the property path in `config.configurationPath` correct?
- Does `config?.valueInFile` actually contain a value from the test manifest?
