/**
 * @file Checks if autowait is true in Opa5.extendConfig
 */

import type { Rule } from 'eslint';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Fiori custom ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            autowaitTrue: 'Autowait must be true.',
            autowaitPresent: 'Autowait must be present and true in extendConfig.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        //----------------------------------------------------------------------
        // Helpers
        //----------------------------------------------------------------------

        // any helper functions should go here or else delete this section

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            CallExpression(node) {
                if (node.callee.type == 'MemberExpression') {
                    if (node.callee.object && 'name' in node.callee.object && node.callee.object.name === 'Opa5') {
                        if (
                            node.callee.property &&
                            'name' in node.callee.property &&
                            node.callee.property.name === 'extendConfig'
                        ) {
                            if (node.arguments[0].type == 'ObjectExpression') {
                                const propsList = node.arguments[0].properties;
                                let ifautoWaitExists = false;
                                let boolValueAutoWait;
                                for (const property in propsList) {
                                    if (
                                        propsList[property].type === 'Property' &&
                                        'key' in propsList[property] &&
                                        'name' in propsList[property].key
                                    ) {
                                        const key = propsList[property].key.name;
                                        if (key == 'autoWait') {
                                            ifautoWaitExists = true;
                                            if (
                                                'value' in propsList[property] &&
                                                'value' in propsList[property].value
                                            ) {
                                                boolValueAutoWait = propsList[property].value.value;
                                            }
                                        }
                                    }
                                }
                                if (!ifautoWaitExists) {
                                    context.report({ node: node, messageId: 'autowaitPresent' });
                                } else if (!boolValueAutoWait) {
                                    context.report({ node: node, messageId: 'autowaitTrue' });
                                }
                            }
                        }
                    }
                }
            }
        };
    }
};

export default rule;
