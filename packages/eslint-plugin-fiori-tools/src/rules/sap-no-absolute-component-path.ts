/**
 * @file Rule to detect absolute path to component
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import { type ASTNode, asCallExpression, asObjectExpression, asArrayExpression } from '../utils/helpers';

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * Check if a string ends with a specific suffix.
 *
 * @param string The string to check
 * @param suffix The suffix to look for
 * @returns True if the string ends with the suffix
 */
function endsWith(string: string, suffix: string): boolean {
    return string.endsWith(suffix);
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
            absolutePath: "Value for metadata/includes must not be absolute (leading '/')."
        },
        schema: []
    },
    create(context: RuleContext) {
        const T_MEMBER = 'MemberExpression';
        const T_IDENTIFIER = 'Identifier';
        const T_PROPERTY = 'Property';
        const P_METADATA = 'metadata';
        const P_INCLUDES = 'includes';

        /**
         * Get the name from a literal or identifier node.
         *
         * @param node The AST node to extract name from
         * @returns The name extracted from the literal or identifier node
         */
        function getLiteralOrIdentifiertName(node: ASTNode): string {
            const n = node as { type: string; name?: string; value?: string };
            let result = '';
            if (n && typeof n === 'object' && n.type === T_IDENTIFIER) {
                result = n.name ?? '';
            } else {
                result = n.value ?? '';
            }
            return result;
        }

        /**
         * Get the identifier path from a node.
         *
         * @param node The AST node to extract path from
         * @returns The identifier path extracted from the node
         */
        function getIdentifierPath(node: ASTNode): string {
            const n = node as { type?: string; name?: string; object?: any; property?: any };
            let result = '';
            if (!n || typeof n !== 'object') {
                return result;
            }
            switch (n.type) {
                case T_IDENTIFIER:
                    result = n.name ?? '';
                    break;
                case T_MEMBER:
                    result = `${getIdentifierPath(n.object)}.${getLiteralOrIdentifiertName(n.property)}`;
                    break;
                default:
            }
            return result;
        }

        /**
         * Search ObjectExpression to find certain property.
         *
         * @param node The object expression node to search
         * @param propertyName The name of the property to find
         * @returns The property node if found, undefined otherwise
         */
        function getPropertyFromObjectExpression(node: ASTNode | undefined, propertyName: string): ASTNode | undefined {
            // Check if node is of type object expression
            const objectExpr = asObjectExpression(node);
            if (objectExpr) {
                // Get property list from object expression
                const propertyList = objectExpr.properties as any[];
                // Go through the properties
                let property: any;
                for (const key in propertyList) {
                    // Check if element is of type we are looking for
                    // all in one if-statement to reach code coverage
                    if (
                        propertyList.hasOwnProperty(key) &&
                        (property = propertyList[key]) &&
                        property.type === T_PROPERTY &&
                        getLiteralOrIdentifiertName(property.key) === propertyName
                    ) {
                        return property.value;
                    }
                }
            }
            return undefined;
        }

        /**
         * Search options parameter.
         *
         * @param node The function call node to validate
         */
        function validateFunctionOptions(node: ASTNode): void {
            const callExpr = asCallExpression(node);
            if (!callExpr || callExpr.arguments.length <= 1) {
                return;
            }
            // get options parameter (2nd)
            const options = callExpr.arguments[1];
            // Get metadata data
            const metadata = getPropertyFromObjectExpression(options, P_METADATA);
            // Get includes data
            const includes = getPropertyFromObjectExpression(metadata, P_INCLUDES);
            // Check if includes type is array expression
            const arrayExpr = asArrayExpression(includes);
            if (arrayExpr) {
                // Get array elements
                const includesElements = arrayExpr.elements;
                let element;
                for (const key in includesElements) {
                    // all in one if-statement to reach code coverage
                    if (
                        includesElements.hasOwnProperty(key) &&
                        (element = includesElements[key]) &&
                        getLiteralOrIdentifiertName(element).startsWith('/')
                    ) {
                        context.report({ node: node, messageId: 'absolutePath' });
                    }
                }
            }
        }

        /**
         * Process a call expression node to check for violations.
         *
         * @param node The call expression node to process
         */
        function processCallExpression(node: ASTNode): void {
            const callExpr = asCallExpression(node);
            if (!callExpr) {
                return;
            }
            const path = getIdentifierPath(callExpr.callee);
            if (endsWith(path, `.${'extend'}`)) {
                validateFunctionOptions(node);
            }
        }

        return {
            'CallExpression': processCallExpression
        };
    }
};

export default rule;
