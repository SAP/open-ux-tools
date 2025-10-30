/**
 * @file Rule to ensure the correct usage ot the auto refresh interval options for sap.ushell.ui.footerbar.AddBookmarkButton.
 * @ESLint Version 0.8.0 / April 2016
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------
/* eslint-disable strict */
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
            performanceLimitation:
                'A value of more than 0 and less than 300 for the property serviceRefreshIntervall may result in performance limitations.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        'use strict';
        const MIN = 0;
        const MAX = 300;
        const INTERESTING_KEY = 'serviceRefreshInterval';
        const INTERESTING_METHODS = ['setServiceRefreshInterval', 'setAppData'];

        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------
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
        function isProperty(node: any) {
            return isType(node, 'Property');
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
        function isObject(node: any) {
            return isType(node, 'ObjectExpression');
        }

        /**
         *
         * @param a
         * @param obj
         */
        function contains(a, obj) {
            for (let i = 0; i < a.length; i++) {
                if (obj === a[i]) {
                    return true;
                }
            }
            return false;
        }

        /**
         *
         * @param i
         */
        function isNumber(i) {
            return Number(i) === i && i % 1 === 0;
        }

        /**
         *
         * @param node
         */
        function isInRange(node: any) {
            return isNumber(node) && node > MIN && node < MAX;
        }

        /**
         *
         * @param node
         */
        function isInteresting(node: any) {
            const callee = node.callee;
            if (isMember(callee)) {
                if (isIdentifier(callee.property) && contains(INTERESTING_METHODS, callee.property.name)) {
                    return true;
                }
            }
            return false;
        }

        /*
         * @returns true if the parameters of the given functionCall are not critical.
         * */
        /**
         *
         * @param node
         */
        function isValid(node: any) {
            const args = node.arguments;
            if (args && args.length > 0) {
                // get firtst argument
                const argument = args[0];
                if (isObject(argument)) {
                    const propertyList = argument.properties;
                    // argument is object literal, check every property
                    for (const key in propertyList) {
                        if (propertyList.hasOwnProperty(key)) {
                            const property = propertyList[key];
                            if (
                                isProperty(property) &&
                                INTERESTING_KEY === property.key.name &&
                                isLiteral(property.value)
                            ) {
                                // check if value is in range
                                return !isInRange(property.value.value);
                            }
                        }
                    }
                } else {
                    // argument is single literal
                    // check if value is in range
                    return !isInRange(argument.value);
                }
            }
            return true;
        }

        return {
            'CallExpression': function (node) {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'performanceLimitation' });
                }
            }
        };
    }
};

export default rule;
