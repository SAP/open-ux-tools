// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------
/* eslint-disable strict */

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
        'use strict';
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
        function isMember(node: any) {
            return isType(node, 'MemberExpression');
        }
        /**
         *
         * @param node
         */
        function isNewExpression(node: any) {
            return isType(node, 'NewExpression');
        }
        /**
         *
         * @param node
         */
        function isArrayExpression(node: any) {
            return isType(node, 'ArrayExpression');
        }
        /**
         *
         * @param node
         */
        function isObjectExpression(node: any) {
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
         * @param node
         */
        function isInteresting(node: any) {
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
            'NewExpression': function (node) {
                if (isInteresting(node)) {
                    context.report({ node: node, messageId: 'ui5Forms' });
                }
            }
        };
    }
};

export default rule;
