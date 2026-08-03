# JavaScript Rule — Fast Path

## Read all of these in parallel (one turn):

1. `packages/eslint-plugin-fiori-tools/src/rules/sap-no-br-on-return.ts`
2. `packages/eslint-plugin-fiori-tools/src/rules/sap-no-global-variable.ts`
3. `packages/eslint-plugin-fiori-tools/src/rules/index.ts`
4. `packages/eslint-plugin-fiori-tools/src/index.ts`

No diagnostic constant needed — JS rules use `messageId` strings directly in `meta.messages`.

## Rule template:

```typescript
import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: { description: 'Short description.', recommended: false },
        messages: { myMessageId: 'Error message.' },
        schema: []
    },
    create(context: Rule.RuleContext) {
        return {
            CallExpression(node) {
                // context.report({ node, messageId: 'myMessageId' });
            }
        };
    }
};

export default rule;
```

## Test template:

```typescript
import rule from '../../src/rules/sap-[rule-name].js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester();
ruleTester.run('sap-[rule-name]', rule, {
    valid: ['validCode();'],
    invalid: [{ code: 'invalidCode();', errors: [{ messageId: 'myMessageId', type: 'CallExpression' }] }]
});
```

## Registration:

JS rules go into `baseFioriToolsRules` in `src/index.ts` (not `fioriLanguageConfig`). No diagnostic constant needed — skip Step 2 of the main checklist.
