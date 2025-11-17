/**
 * @file Rule to flag use of sap ui5base prop
 */

import type { Rule } from 'eslint';

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
            ui5PropWarning: 'Property {{property}} is a private member of sap.ui.model.odata.v2.ODataModel'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        // variables should be defined here
        const ODATA_MODEL_V2_MEMBERS = ['oData'];

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

                if (typeof val === 'string' && contains(ODATA_MODEL_V2_MEMBERS, val)) {
                    context.report({
                        node: node,
                        messageId: 'ui5PropWarning',
                        data: { property: val }
                    });
                }
            }
        };
    }
};

export default rule;
