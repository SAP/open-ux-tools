// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

import type { Rule } from 'eslint';
import { type ASTNode } from '../utils/helpers';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/**
 * Check if a node is of a specific type.
 *
 * @param node The AST node to check
 * @param type The type to check for
 * @returns True if the node is of the specified type
 */
function isType(node: ASTNode | undefined, type: string): boolean {
    return node?.type === type;
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

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            ui5Forms: 'Invalid content for SimpleForm / Form / SmartForm.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const INTERESTING_METHODS = ['SimpleForm', 'Form', 'SmartForm'];
        const INTERESTING_METHODS_CONTENT = ['Table', 'HBox', 'VBox', 'VerticalLayout'];
        const INTERESTING_PROPERTY_NAMES = [
            'formContainers',
            'groups',
            'FormContainer',
            'Group',
            'formElements',
            'groupElements',
            'FormElement',
            'GroupElement',
            'elements',
            'fields'
        ];
        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------
        /**
         * Check if a node is an Identifier.
         *
         * @param node The AST node to check
         * @returns True if the node is an Identifier
         */
        function isIdentifier(node: ASTNode | undefined): boolean {
            return isType(node, 'Identifier');
        }
        /**
         * Check if a node is a MemberExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is a MemberExpression
         */
        function isMember(node: ASTNode | undefined): boolean {
            return isType(node, 'MemberExpression');
        }
        /**
         * Check if a node is a NewExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is a NewExpression
         */
        function isNewExpression(node: ASTNode | undefined): boolean {
            return isType(node, 'NewExpression');
        }
        /**
         * Check if a node is an ArrayExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is an ArrayExpression
         */
        function isArrayExpression(node: ASTNode | undefined): boolean {
            return isType(node, 'ArrayExpression');
        }
        /**
         * Check if a node is an ObjectExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is an ObjectExpression
         */
        function isObjectExpression(node: ASTNode | undefined): boolean {
            return isType(node, 'ObjectExpression');
        }
        /**
         * Check if array element contains interesting content methods
         *
         * @param elements
         */
        function hasInterestingContentMethods(elements: any[]): boolean {
            for (const element of elements) {
                if (isNewExpression(element)) {
                    const calleeNewExpression = element.callee;
                    if (
                        isMember(calleeNewExpression) &&
                        contains(INTERESTING_METHODS_CONTENT, calleeNewExpression.property.name)
                    ) {
                        return true;
                    }
                }
            }
            return false;
        }

        /**
         * Check object properties for content arrays with interesting methods
         *
         * @param properties
         */
        function hasContentWithInterestingMethods(properties: any[]): boolean {
            for (const prop of properties) {
                if (isIdentifier(prop.key) && isArrayExpression(prop.value) && prop.key.name === 'content') {
                    if (hasInterestingContentMethods(prop.value.elements)) {
                        return true;
                    }
                }
            }
            return false;
        }

        /**
         * Check arguments for object expressions with interesting content
         *
         * @param args
         */
        function hasArgumentsWithInterestingContent(args: any[]): boolean {
            for (const arg of args) {
                if (isObjectExpression(arg)) {
                    if (hasContentWithInterestingMethods(arg.properties)) {
                        return true;
                    }
                }
            }
            return false;
        }

        /**
         * Check if node has interesting methods pattern
         *
         * @param node
         */
        function hasInterestingMethodsPattern(node: any): boolean {
            const callee = node.callee;
            if (!(isMember(callee) && contains(INTERESTING_METHODS, callee.property.name))) {
                return false;
            }
            return hasArgumentsWithInterestingContent(node.arguments);
        }

        /**
         * Check property elements for interesting content methods
         *
         * @param elements
         */
        function hasPropertyElementsWithInterestingMethods(elements: any[]): boolean {
            for (const element of elements) {
                if (isNewExpression(element)) {
                    const calleeToCheck = element.callee;
                    if (isMember(calleeToCheck) && contains(INTERESTING_METHODS_CONTENT, calleeToCheck.property.name)) {
                        return true;
                    }
                }
            }
            return false;
        }

        /**
         * Check properties for interesting property names and array values
         *
         * @param properties
         */
        function hasPropertiesWithInterestingNames(properties: any[]): boolean {
            for (const prop of properties) {
                if (contains(INTERESTING_PROPERTY_NAMES, prop.key.name) && isArrayExpression(prop.value)) {
                    if (hasPropertyElementsWithInterestingMethods(prop.value.elements)) {
                        return true;
                    }
                }
            }
            return false;
        }

        /**
         * Check arguments for object expressions with interesting property names
         *
         * @param args
         */
        function hasArgumentsWithInterestingPropertyNames(args: any[]): boolean {
            for (const arg of args) {
                if (isObjectExpression(arg)) {
                    if (hasPropertiesWithInterestingNames(arg.properties)) {
                        return true;
                    }
                }
            }
            return false;
        }

        /**
         * Check if node has interesting property names pattern
         *
         * @param node
         */
        function hasInterestingPropertyNamesPattern(node: any): boolean {
            const callee = node.callee;
            if (!(isMember(callee) && contains(INTERESTING_PROPERTY_NAMES, callee.property.name))) {
                return false;
            }
            return hasArgumentsWithInterestingPropertyNames(node.arguments);
        }

        /**
         * Check if a node represents an interesting UI5 form construct.
         *
         * @param node The AST node to analyze
         * @returns True if the node represents an interesting UI5 form construct
         */
        function isInteresting(node: any): boolean {
            return hasInterestingMethodsPattern(node) || hasInterestingPropertyNamesPattern(node);
        }

        return {
            'NewExpression': function (node): void {
                if (isInteresting(node)) {
                    context.report({ node: node, messageId: 'ui5Forms' });
                }
            }
        };
    }
};

export default rule;
