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
            globalEval: 'Usage of globalEval() / eval() is not allowed due to strict Content Security Policy.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const INTERESTING_METHODS_JQUERY = ['globalEval'];

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
        function isType(node: Rule.Node | undefined, type: string): boolean {
            return node?.type === type;
        }

        /**
         * Check if a node is an Identifier.
         *
         * @param node The AST node to check
         * @returns True if the node is an Identifier
         */
        function isIdentifier(node: Rule.Node | undefined): boolean {
            return isType(node, 'Identifier');
        }

        /**
         * Check if a node is a MemberExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is a MemberExpression
         */
        function isMember(node: Rule.Node | undefined): boolean {
            return isType(node, 'MemberExpression');
        }

        /**
         * Check if an array contains a specific object.
         *
         * @param a The array to search in
         * @param obj The object to search for
         * @returns True if the array contains the object
         */
        function contains(a: string[], obj: string): boolean {
            return a.includes(obj);
        }

        /**
         * Check if a node represents an interesting eval-related call.
         *
         * @param node The AST node to analyze
         * @returns True if the node represents an interesting eval-related call
         */
        function isInteresting(node: Rule.Node): boolean {
            const callNode = node as unknown as { callee: Rule.Node };
            const callee = callNode.callee;
            if (isMember(callee)) {
                const memberNode = callee as unknown as { property: Rule.Node };
                const identifierProp = memberNode.property as unknown as { name: string };
                if (isIdentifier(memberNode.property) && contains(INTERESTING_METHODS_JQUERY, identifierProp.name)) {
                    return true;
                }
            }
            return false;
        }

        return {
            'CallExpression': function (node: Rule.Node): void {
                if (isInteresting(node)) {
                    context.report({ node: node, messageId: 'globalEval' });
                }
            }
        };
    }
};

export default rule;
