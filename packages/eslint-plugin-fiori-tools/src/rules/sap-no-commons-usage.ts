/**
 * @file Detects the usage of sap.ui.commons objects.
 * @ESLint Version 0.8.0 / April 2016
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
         *
         * @param base
         * @param sub
         */
        function startsWith(base, sub) {
            if (base.indexOf) {
                return base.indexOf(sub) === 0;
            }
        }

        /**
         *
         * @param node
         * @param type
         */
        function isType(node: any, type: any) {
            return node && node.type === type;
        }

        /**
         *
         * @param node
         */
        function isIdentifier(node: any) {
            return isType(node, 'Identifier');
        }

        /**
         *
         * @param node
         */
        function isLiteral(node: any) {
            return isType(node, 'Literal');
        }

        /**
         *
         * @param node
         */
        function isMember(node: any) {
            return isType(node, 'MemberExpression');
        }

        /**
         *
         * @param node
         */
        function isArray(node: any) {
            return isType(node, 'ArrayExpression');
        }

        /**
         *
         * @param node
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
         *
         * @param node
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
         *
         * @param node
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
            'NewExpression': function (node) {
                if (isMember(node.callee) && startsWith(getMemberAsString(node.callee), 'sap.ui.commons')) {
                    context.report({ node: node, messageId: 'commonsUsage' });
                }
            },
            'CallExpression': function (node) {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'commonsUsage' });
                }
            }
        };
    }
};

export default rule;
