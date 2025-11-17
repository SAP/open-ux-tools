/**
 * @file 	Check "sap-no-ui5eventprovider-prop" should detect direct usage of private property names of sap.ui.base.EventProvider
 */

import type { Rule } from 'eslint';

// THIS RULE IS DEPRECATED --> sap-no-ui5base-prop
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
            ui5eventproviderProp: 'Direct usage of a private property from sap.ui.base.EventProvider detected!'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        // Alphabetical list of the "private property names" from UI5 event provider which this check shall detect
        const PRIVATE_MEMBERS = ['mEventRegistry', 'oEventPool'];

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param a
         * @param obj
         */
        function contains(a, obj) {
            return a.includes(obj);
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'MemberExpression': function (node) {
                if (!node.property || !('name' in node.property)) {
                    return;
                }
                const val = node.property.name;

                if (typeof val === 'string' && contains(PRIVATE_MEMBERS, val)) {
                    context.report({
                        node: node,
                        messageId: 'ui5eventproviderProp'
                    });
                }
            }
        };
    }
};

export default rule;
