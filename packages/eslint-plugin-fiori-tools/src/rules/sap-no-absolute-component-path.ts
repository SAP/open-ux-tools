/**
 * @file Rule to detect absolute path to component
 * @ESLint Version 0.17.1 / April 2015
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
            absolutePath: "Value for metadata/includes must not be absolute (leading '/')."
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        'use strict';

        const T_MEMBER = 'MemberExpression';
        const T_ARRAY = 'ArrayExpression';
        const T_IDENTIFIER = 'Identifier';
        const T_OBJECT = 'ObjectExpression';
        const T_PROPERTY = 'Property';
        const P_METADATA = 'metadata';
        const P_INCLUDES = 'includes';

        /**
         *
         * @param node
         */
        function getLiteralOrIdentifiertName(node: any) {
            let result = '';
            if (node.type === T_IDENTIFIER) {
                result = node.name;
            } else {
                result = node.value;
            }
            return result;
        }

        /**
         *
         * @param node
         */
        function getIdentifierPath(node: any) {
            let result = '';
            //        if (node) {
            switch (node.type) {
                case T_IDENTIFIER:
                    result = node.name;
                    break;
                case T_MEMBER:
                    result = getIdentifierPath(node.object) + '.' + getLiteralOrIdentifiertName(node.property);
                    break;
                default:
            }
            //        }
            return result;
        }

        // Search ObjectExpression to find certain property
        /**
         *
         * @param node
         * @param propertyName
         */
        function getPropertyFromObjectExpression(node: any, propertyName: any) {
            // Check if node is of type object expression
            if (node?.type === T_OBJECT) {
                // Get property list from object expression
                const propertyList = node.properties;
                // Go through the properties
                let property;
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
                        //                    }
                    }
                }
            }
        }

        // Search options parameter
        /**
         *
         * @param node
         */
        function validateFunctionOptions(node: any) {
            if (node.arguments.length > 1) {
                // get options parameter (2nd)
                const options = node.arguments[1];
                // Get metadata data
                const metadata = getPropertyFromObjectExpression(options, P_METADATA);
                // Get includes data
                const includes = getPropertyFromObjectExpression(metadata, P_INCLUDES);
                // Check if includes type is array expression
                if (includes?.type === T_ARRAY) {
                    // Get array elements
                    const includesElements = includes.elements;
                    let element;
                    for (const key in includesElements) {
                        // all in one if-statement to reach code coverage
                        if (
                            includesElements.hasOwnProperty(key) &&
                            (element = includesElements[key]) &&
                            getLiteralOrIdentifiertName(element).indexOf('/') === 0
                        ) {
                            context.report({ node: node, messageId: 'absolutePath' });
                            //                        }
                        }
                    }
                }
            }
        }

        /**
         *
         * @param string
         * @param suffix
         */
        function endsWith(string, suffix) {
            return string.indexOf(suffix, string.length - suffix.length) !== -1;
        }

        /**
         *
         * @param node
         */
        function processCallExpression(node: any) {
            const path = getIdentifierPath(node.callee);
            if (endsWith(path, '.' + 'extend')) {
                validateFunctionOptions(node);
            }
        }

        return {
            'CallExpression': processCallExpression
        };
    }
};

export default rule;
