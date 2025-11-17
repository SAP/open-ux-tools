/**
 * @file Rule to ensure the correct usage ot the auto refresh interval options for sap.ushell.ui.footerbar.AddBookmarkButton.
 * @ESLint Version 0.8.0 / April 2016
 */

import type { Rule } from 'eslint';
import { isIdentifier, isLiteral, isProperty, isMember, isObject, contains } from '../utils/ast-helpers';

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
        const MIN = 0;
        const MAX = 300;
        const INTERESTING_KEY = 'serviceRefreshInterval';
        const INTERESTING_METHODS = ['setServiceRefreshInterval', 'setAppData'];

        // --------------------------------------------------------------------------
        // Rule-specific Helpers
        // --------------------------------------------------------------------------

        /**
         *
         * @param i
         */
        function isNumber(i: unknown): i is number {
            return Number(i) === i && i % 1 === 0;
        }

        /**
         *
         * @param node
         */
        function isInRange(node: unknown): boolean {
            return isNumber(node) && node > MIN && node < MAX;
        }

        /**
         *
         * @param node
         */
        function isInteresting(node: Rule.Node): boolean {
            const callee = (node as any).callee;
            if (isMember(callee)) {
                if (isIdentifier(callee.property) && contains(INTERESTING_METHODS, (callee.property as any).name)) {
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
        function isValid(node: Rule.Node): boolean {
            const args = (node as any).arguments;
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
