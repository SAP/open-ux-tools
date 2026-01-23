/**
 * @file Rule to ensure the correct usage ot the auto refresh interval options for sap.ushell.ui.footerbar.AddBookmarkButton.
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import type { ASTNode } from '../utils/helpers';
import {
    isObject,
    contains,
    asCallExpression,
    asMemberExpression,
    asObjectExpression,
    asProperty,
    asLiteral,
    asIdentifier,
    getPropertyName
} from '../utils/helpers';

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

/**
 * Check if a value is a number.
 *
 * @param i The value to check
 * @returns True if the value is a number
 */
function isNumber(i: unknown): i is number {
    return Number(i) === i && i % 1 === 0;
}

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
            performanceLimitation:
                'A value of more than 0 and less than 300 for the property serviceRefreshIntervall may result in performance limitations.'
        },
        schema: []
    },
    create(context: RuleContext) {
        const MIN = 0;
        const MAX = 300;
        const INTERESTING_KEY = 'serviceRefreshInterval';
        const INTERESTING_METHODS = ['setServiceRefreshInterval', 'setAppData'];

        // --------------------------------------------------------------------------
        // Rule-specific Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a node value is in the performance range.
         *
         * @param node The node to check
         * @returns True if the node value is in the performance range
         */
        function isInRange(node: unknown): boolean {
            return isNumber(node) && node > MIN && node < MAX;
        }

        /**
         * Check if a node represents an interesting method call.
         *
         * @param node The node to check
         * @returns True if the node represents an interesting method call
         */
        function isInteresting(node: ASTNode): boolean {
            const callExpr = asCallExpression(node);
            if (!callExpr) {
                return false;
            }
            const memberCallee = asMemberExpression(callExpr.callee);
            if (memberCallee) {
                const propertyName = getPropertyName(memberCallee.property);
                if (propertyName && contains(INTERESTING_METHODS, propertyName)) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Check if an object argument contains a valid serviceRefreshInterval property.
         *
         * @param argument The object argument to check
         * @returns True if the property value is valid
         */
        function isObjectArgumentValid(argument: ASTNode): boolean {
            const objectExpr = asObjectExpression(argument);
            if (!objectExpr) {
                return true;
            }
            const propertyList = objectExpr.properties;
            // argument is object literal, check every property
            for (const key in propertyList) {
                if (propertyList.hasOwnProperty(key)) {
                    const prop = asProperty(propertyList[key]);
                    if (prop) {
                        const keyName = asIdentifier(prop.key)?.name;
                        if (keyName && INTERESTING_KEY === keyName) {
                            const literalValue = asLiteral(prop.value);
                            if (literalValue) {
                                // check if value is in range
                                return !isInRange(literalValue.value);
                            }
                        }
                    }
                }
            }
            return true;
        }

        /*
         * @returns true if the parameters of the given functionCall are not critical.
         * */
        /**
         * Check if the function call parameters are valid.
         *
         * @param node The function call node to validate
         * @returns True if the function call parameters are valid
         */
        function isValid(node: ASTNode): boolean {
            const callExpr = asCallExpression(node);
            if (!callExpr) {
                return true;
            }
            const args = callExpr.arguments;
            if (args?.length > 0) {
                // get firtst argument
                const argument = args[0];
                if (isObject(argument)) {
                    return isObjectArgumentValid(argument);
                } else {
                    // argument is single literal
                    const literalArg = asLiteral(argument);
                    if (literalArg) {
                        // check if value is in range
                        return !isInRange(literalArg.value);
                    }
                }
            }
            return true;
        }

        return {
            'CallExpression': function (node): void {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'performanceLimitation' });
                }
            }
        };
    }
};

export default rule;
