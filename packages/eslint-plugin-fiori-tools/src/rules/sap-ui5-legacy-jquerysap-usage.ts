// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

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
            legacyJquerysapUsage: 'Legacy jQuery.sap usage is not allowed due to strict Content Security Policy.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const INTERESTING_METHODS_JQUERY = ['require', 'declare'];

        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------
        /**
         * Check if a node is of a specific type.
         *
         * @param node The AST node to check
         * @param type The type to check for
         * @returns True if the node is of the specified type
         */
        function isType(node: any, type: any) {
            return node?.type === type;
        }

        /**
         * Check if a node is an Identifier.
         *
         * @param node The AST node to check
         * @returns True if the node is an Identifier
         */
        function isIdentifier(node: any) {
            return isType(node, 'Identifier');
        }

        /**
         * Check if a node is a MemberExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is a MemberExpression
         */
        function isMember(node: any) {
            return isType(node, 'MemberExpression');
        }

        /**
         * Check if an array contains a specific object.
         *
         * @param a The array to search in
         * @param obj The object to search for
         * @returns True if the array contains the object
         */
        function contains(a, obj) {
            return a.includes(obj);
        }

        /**
         * Check if a call expression represents an interesting jQuery.sap usage.
         *
         * @param node The call expression node to check
         * @returns True if the call expression represents an interesting jQuery.sap usage
         */
        function isInteresting(node: any) {
            const callee = node.callee;
            if (isMember(callee)) {
                if (isIdentifier(callee.property) && contains(INTERESTING_METHODS_JQUERY, callee.property.name)) {
                    if (isMember(callee.object) && callee.object.property.name == 'sap') {
                        if (
                            isIdentifier(callee.object.object) &&
                            (callee.object.object.name == 'jQuery' || callee.object.object.name == '$')
                        ) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        return {
            'CallExpression': function (node): void {
                if (isInteresting(node)) {
                    context.report({ node: node, messageId: 'legacyJquerysapUsage' });
                }
            }
        };
    }
};

export default rule;
