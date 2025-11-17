/**
 * @file Rule to detect absolute path to component
 * @ESLint Version 0.17.1 / April 2015
 */

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
            absolutePath: "Value for metadata/includes must not be absolute (leading '/')."
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
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
        function getLiteralOrIdentifiertName(node: Rule.Node): string {
            let result = '';
            if (node.type === T_IDENTIFIER) {
                result = (node as any).name;
            } else {
                result = (node as any).value;
            }
            return result;
        }

        /**
         *
         * @param node
         */
        function getIdentifierPath(node: Rule.Node): string {
            let result = '';
            switch (node.type) {
                case T_IDENTIFIER:
                    result = (node as any).name;
                    break;
                case T_MEMBER:
                    result = `${getIdentifierPath((node as any).object)}.${getLiteralOrIdentifiertName((node as any).property)}`;
                    break;
                default:
            }
            return result;
        }

        /**
         * Search ObjectExpression to find certain property
         *
         * @param node
         * @param propertyName
         */
        function getPropertyFromObjectExpression(
            node: Rule.Node | undefined,
            propertyName: string
        ): Rule.Node | undefined {
            // Check if node is of type object expression
            if (node?.type === T_OBJECT) {
                // Get property list from object expression
                const propertyList = (node as any).properties;
                // Go through the properties
                let property;
                for (const key in propertyList) {
                    // Check if element is of type we are looking for
                    // all in one if-statement to reach code coverage
                    if (
                        propertyList.hasOwnProperty(key) &&
                        (property = propertyList[key]) &&
                        property.type === T_PROPERTY &&
                        getLiteralOrIdentifiertName((property as any).key) === propertyName
                    ) {
                        return (property as any).value;
                    }
                }
            }
        }

        /**
         * Search options parameter
         *
         * @param node
         */
        function validateFunctionOptions(node: Rule.Node): void {
            if ((node as any).arguments.length > 1) {
                // get options parameter (2nd)
                const options = (node as any).arguments[1];
                // Get metadata data
                const metadata = getPropertyFromObjectExpression(options, P_METADATA);
                // Get includes data
                const includes = getPropertyFromObjectExpression(metadata, P_INCLUDES);
                // Check if includes type is array expression
                if (includes?.type === T_ARRAY) {
                    // Get array elements
                    const includesElements = (includes as any).elements;
                    let element;
                    for (const key in includesElements) {
                        // all in one if-statement to reach code coverage
                        if (
                            includesElements.hasOwnProperty(key) &&
                            (element = includesElements[key]) &&
                            getLiteralOrIdentifiertName(element).indexOf('/') === 0
                        ) {
                            context.report({ node: node, messageId: 'absolutePath' });
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
        function endsWith(string: string, suffix: string): boolean {
            return string.indexOf(suffix, string.length - suffix.length) !== -1;
        }

        /**
         *
         * @param node
         */
        function processCallExpression(node: Rule.Node): void {
            const path = getIdentifierPath((node as any).callee);
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
