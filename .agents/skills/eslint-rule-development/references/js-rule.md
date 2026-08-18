# JavaScript / TypeScript Rule — Fast Path

## Read all of these in parallel (one turn):

1. `packages/eslint-plugin-fiori-tools/src/rules/sap-no-global-variable.ts` — simple visitor pattern
2. `packages/eslint-plugin-fiori-tools/src/rules/sap-no-br-on-return.ts` — uses `createDocumentBasedRuleVisitors` helper
3. `packages/eslint-plugin-fiori-tools/src/rules/index.ts`
4. `packages/eslint-plugin-fiori-tools/src/index.ts`
5. `packages/eslint-plugin-fiori-tools/test/rules/sap-no-global-variable.test.ts`

No diagnostic constant needed — JS/TS rules use `messageId` strings directly in `meta.messages` and do not use `createFioriRule` or the Fiori project model.

## Rule template:

```typescript
// packages/eslint-plugin-fiori-tools/src/rules/sap-[rule-name].ts
import type { Rule } from 'eslint';
import { type ASTNode } from '../utils/helpers.js';

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',  // or 'suggestion' / 'layout'
        docs: {
            description: 'Short description.',
            recommended: true
        },
        messages: {
            myMessageId: 'Error message. Use {{placeholder}} for dynamic data.'
        },
        // fixable: 'code',  // add only if the rule provides an auto-fix
        schema: []
    },

    create(context: Rule.RuleContext) {
        return {
            // Use the AST node type that matches your check, e.g.:
            // CallExpression, VariableDeclaration, MemberExpression, etc.
            CallExpression(node: ASTNode) {
                // context.report({ node, messageId: 'myMessageId' });
                // context.report({ node, messageId: 'myMessageId', data: { placeholder: 'value' } });
            }
        };
    }
};

export default rule;
```

## Test template:

```typescript
// packages/eslint-plugin-fiori-tools/test/rules/sap-[rule-name].test.ts
import rule from '../../src/rules/sap-[rule-name].js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({
    languageOptions: {
        ecmaVersion: 2018,
        sourceType: 'script'  // or 'module' depending on the target code
    }
});

ruleTester.run('sap-[rule-name]', rule, {
    valid: [
        'validCode();',
        'anotherValidPattern();'
    ],
    invalid: [
        {
            code: 'invalidCode();',
            errors: [{ message: 'Error message.' }]
        },
        {
            code: 'anotherInvalidCode();',
            errors: [{ message: 'Error message. Use value for dynamic data.' }]
        }
    ]
});
```

**`message` vs `messageId` in test assertions:** Always check `message` (the fully resolved string), not `messageId`. If the rule has no dynamic data the resolved message equals the string in `meta.messages`. If it has `{{placeholder}}` data write the fully resolved string — using `messageId` alone accepts any interpolated value and misses regressions.

**Note on TypeScript source:** JS/TS rules in this plugin lint UI5 application source code (JS/TS files). The `RuleTester` tests use plain JavaScript snippets — no TypeScript parser is needed in tests because the rules check patterns that appear in both JS and TS. The rule implementation itself is written in TypeScript (`Rule.RuleModule`), but it targets JS/TS AST nodes from ESLint's default parser.

## Registration:

JS/TS rules go into `baseFioriToolsRules` in `src/index.ts` (not `fioriLanguageConfig`):

```typescript
// In baseFioriToolsRules rules object:
'@sap-ux/fiori-tools/sap-my-new-rule': 'warn',
```

No `diagnostics.ts` entry needed — JS/TS rules declare messages directly in `meta.messages`.

In `src/rules/index.ts`, add the import and entry in alphabetical order:
```typescript
import sapMyNewRule from './sap-my-new-rule.js';
// ...
'sap-my-new-rule': sapMyNewRule,
```
