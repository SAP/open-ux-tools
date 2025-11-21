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
         * Check if a node is a NewExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is a NewExpression
         */
        function isNewExpression(node: Rule.Node | undefined): boolean {
            return isType(node, 'NewExpression');
        }
        /**
         * Check if a node is an ArrayExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is an ArrayExpression
         */
        function isArrayExpression(node: Rule.Node | undefined): boolean {
            return isType(node, 'ArrayExpression');
        }
        /**
         * Check if a node is an ObjectExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is an ObjectExpression
         */
        function isObjectExpression(node: Rule.Node | undefined): boolean {
            return isType(node, 'ObjectExpression');
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
         * Check if a node represents an interesting UI5 form construct.
         *
         * @param node The AST node to analyze
         * @returns True if the node represents an interesting UI5 form construct
         */
        function isInteresting(node: any): boolean {
            const callee = node.callee;
            if (isMember(callee) && contains(INTERESTING_METHODS, callee.property.name)) {
                const argumentsNewExpression = node.arguments;
                for (let i = 0; i < argumentsNewExpression.length; i++) {
                    if (isObjectExpression(argumentsNewExpression[i])) {
                        const properties = argumentsNewExpression[i].properties;
                        for (let j = 0; j < properties.length; j++) {
                            if (
                                isIdentifier(properties[j].key) &&
                                isArrayExpression(properties[j].value) &&
                                properties[j].key.name == 'content'
                            ) {
                                const propertyValueElements = properties[j].value.elements;
                                for (let k = 0; k < propertyValueElements.length; k++) {
                                    if (isNewExpression(propertyValueElements[k])) {
                                        const calleeNewExpression = propertyValueElements[k].callee;
                                        if (
                                            isMember(calleeNewExpression) &&
                                            contains(INTERESTING_METHODS_CONTENT, calleeNewExpression.property.name)
                                        ) {
                                            return true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (isMember(callee) && contains(INTERESTING_PROPERTY_NAMES, callee.property.name)) {
                const valueElementArgs = node.arguments;
                for (let p = 0; p < valueElementArgs.length; p++) {
                    if (isObjectExpression(valueElementArgs[p])) {
                        const argProperties2 = valueElementArgs[p].properties;
                        for (let q = 0; q < argProperties2.length; q++) {
                            if (
                                contains(INTERESTING_PROPERTY_NAMES, argProperties2[q].key.name) &&
                                isArrayExpression(argProperties2[q].value)
                            ) {
                                const argPropElements = argProperties2[q].value.elements;
                                for (let r = 0; r < argPropElements.length; r++) {
                                    if (isNewExpression(argPropElements[r])) {
                                        const calleeToCheck = argPropElements[r].callee;
                                        if (
                                            isMember(calleeToCheck) &&
                                            contains(INTERESTING_METHODS_CONTENT, calleeToCheck.property.name)
                                        ) {
                                            return true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return false;
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
