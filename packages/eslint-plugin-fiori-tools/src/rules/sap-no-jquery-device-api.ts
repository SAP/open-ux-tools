/**
 * @file Rule to flag use of the deprecated JQuery.device API
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';

// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const rule: RuleDefinition = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            jqueryDeviceApi:
                'jQuery.device or $.device are deprecated since 1.20! use the respective functions of sap.ui.Device'
        },
        schema: []
    },
    create(context: RuleContext) {
        return {
            'MemberExpression': function (node): void {
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
