/**
 * @file Detects the usage of sap.ui.commons objects.
 */

import type { Rule } from 'eslint';

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
            commonsUsage: 'Usage of sap.ui.commons controls is forbidden, please use controls from sap.m'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------
        /**
         * Check if a string starts with a substring.
         *
         * @param base The base string to check
         * @param sub The substring to look for at the start
         * @returns True if the base string starts with the substring
         */
        function startsWith(base, sub) {
            if (base.indexOf) {
                return base.indexOf(sub) === 0;
            }
        }

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
         * Check if a node is a Literal.
         *
         * @param node The AST node to check
         * @returns True if the node is a Literal
         */
        function isLiteral(node: any) {
            return isType(node, 'Literal');
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
         * Check if a node is an ArrayExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is an ArrayExpression
         */
        function isArray(node: any) {
            return isType(node, 'ArrayExpression');
        }

        /**
         * Convert a member expression to a string representation.
         *
         * @param node The AST node to convert
         * @returns String representation of the member expression
         */
        function getMemberAsString(node: any) {
            if (isMember(node)) {
                return getMemberAsString(node.object) + '.' + getMemberAsString(node.property);
            } else if (isLiteral(node)) {
                return node.value;
            } else if (isIdentifier(node)) {
                return node.name;
            }
            return '';
        }

        /**
         * Check if a node represents an interesting function call to analyze.
         *
         * @param node The AST node to check
         * @returns True if the node represents an interesting function call
         */
        function isInteresting(node: any) {
            const callee = node.callee;
            if (isMember(callee)) {
                if (getMemberAsString(callee) === 'sap.ui.define') {
                    return true;
                }
            }
            return false;
        }

        /**
         * Check if a function call has valid (non-commons) imports.
         *
         * @param node The function call node to validate
         * @returns True if the function call has valid imports, false if it contains commons usage
         */
        function isValid(node: any) {
            if (node.arguments && isArray(node.arguments[0])) {
                const importList = node.arguments[0].elements;
                for (const key in importList) {
                    if (importList.hasOwnProperty(key)) {
                        const lib = importList[key];
                        if (isLiteral(lib) && startsWith(lib.value, 'sap/ui/commons')) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }

        return {
            'NewExpression': function (node): void {
                if (isMember(node.callee) && startsWith(getMemberAsString(node.callee), 'sap.ui.commons')) {
                    context.report({ node: node, messageId: 'commonsUsage' });
                }
            },
            'CallExpression': function (node): void {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'commonsUsage' });
                }
            }
        };
    }
};

export default rule;
