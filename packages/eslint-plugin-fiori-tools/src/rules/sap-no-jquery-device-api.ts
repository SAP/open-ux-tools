/**
 * @file Rule to flag use of the deprecated JQuery.device API
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

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
            jqueryDeviceApi:
                'jQuery.device or $.device are deprecated since 1.20! use the respective functions of sap.ui.Device'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        return {
            'MemberExpression': function (node) {
                if (
                    node.object &&
                    'name' in node.object &&
                    (node.object.name === 'jQuery' || node.object.name === '$') &&
                    node.property &&
                    'name' in node.property &&
                    node.property.name === 'device'
                ) {
                    context.report({
                        node: node,
                        messageId: 'jqueryDeviceApi'
                    });
                }
            }
        };
    }
};

export default rule;
