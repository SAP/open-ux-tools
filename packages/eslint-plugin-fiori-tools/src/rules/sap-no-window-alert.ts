/**
 * @file Rule to flag use of alert
 * @ESLint			Version 0.14.0 / February 2015
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------
/*eslint-disable strict*/
// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Fiori custom ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            windowAlert:
                'A window.alert statement should not be part of the code that is committed to GIT! Use sap.m.MessageBox instead.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        'use strict';
        return {
            'CallExpression': function (node) {
                if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
                    if (
                        node.callee.object &&
                        'name' in node.callee.object &&
                        node.callee.object.name === 'window' &&
                        node.callee.property &&
                        'name' in node.callee.property &&
                        node.callee.property.name === 'alert'
                    ) {
                        context.report({
                            node: node,
                            messageId: 'windowAlert'
                        });
                    }
                }
            }
        };
    }
};

export default rule;
