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
         * Check if an array contains a specific object.
         *
         * @param a The array to search in
         * @param obj The object to search for
         * @returns True if the array contains the object
         */
        function contains(a, obj): boolean {
            return a.includes(obj);
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'MemberExpression': function (node): void {
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
