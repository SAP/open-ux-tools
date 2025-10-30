/**
 * @file Rule
 * @ESLint Version 0.24.x / November 2015
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
            staticNavigationTargets: 'Do not use a static list of cross-application navigation targets.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        'use strict';
        const VARIABLES = {};

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
        function isObject(node: any) {
            return isType(node, 'ObjectExpression');
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
        function isIdentifier(node: any) {
            return isType(node, 'Identifier');
        }
        /**
         *
         * @param node
         */
        function isCall(node: any) {
            return isType(node, 'CallExpression');
        }
        /**
         *
         * @param node
         */
        function isLogical(node: any) {
            return isType(node, 'LogicalExpression');
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
         * @param string
         * @param suffix
         */
        function endsWith(string, suffix) {
            return (
                typeof string === 'string' &&
                typeof suffix === 'string' &&
                string.indexOf(suffix, string.length - suffix.length) !== -1
            );
        }

        /**
         *
         * @param node
         */
        function getIdentifierPath(node: any) {
            if (isIdentifier(node)) {
                return node.name;
            } else if (isLiteral(node)) {
                return node.value;
            } else if (isMember(node)) {
                return getIdentifierPath(node.object) + '.' + getIdentifierPath(node.property);
            } else {
                return '';
            }
        }

        /**
         *
         * @param node
         */
        function getName(node: any) {
            if (isIdentifier(node)) {
                return node.name;
            } else if (isLiteral(node)) {
                return node.value;
            }
            return null;
        }

        /**
         *
         * @param node
         * @param key
         */
        function getProperty(node: any, key: any) {
            // check if node is an object, only objects have properties
            if (isObject(node)) {
                // iterate properties
                for (let i = 0; i < node.properties.length; i++) {
                    const property = node.properties[i];
                    // return property value if property key matches given key
                    if (isProperty(property) && getName(property.key) === key) {
                        return property.value;
                    }
                }
            }
            return null;
        }

        /*
         * Method checks the given node, if it's a method call with 'CrossApplicationNavigation' as the only argument.
         *
         * @param node - a CallExpression node
         **/
        /**
         *
         * @param node
         */
        function isGetServiceCall(node: any) {
            if (isCall(node)) {
                if (
                    node.arguments?.length === 1 &&
                    isLiteral(node.arguments[0]) &&
                    node.arguments[0].value === 'CrossApplicationNavigation'
                ) {
                    return true;
                }
            }
            return false;
        }

        /*
         * Method checks if the assignment node contains any interesting nodes. Can handle nested conditions.
         **/
        /**
         *
         * @param node
         */
        function isInterestingAssignment(node: any) {
            return (
                isGetServiceCall(node) || // const x = fgetService('CrossApplicationNavigation');
                // const x = fgetService && fgetService('CrossApplicationNavigation');
                (isLogical(node) && (isInterestingAssignment(node.left) || isInterestingAssignment(node.right)))
            );
        }

        /**
         *
         * @param node
         */
        function isInterestingCall(node: any) {
            const path = getIdentifierPath(node.callee);
            if (isCall(node) && endsWith(path, 'toExternal')) {
                const callee = node.callee;
                if (isMember(callee)) {
                    const object = callee.object;
                    if (isGetServiceCall(object) || (isIdentifier(object) && VARIABLES[object.name])) {
                        return true;
                    }
                }
            }
        }

        /**
         *
         * @param node
         */
        function isValid(node: any) {
            if (node?.arguments && node.arguments.length > 0) {
                const target = getProperty(node.arguments[0], 'target');
                if (target) {
                    // get property target from first argument, get property shellHash from property target
                    const shellHash = getProperty(target, 'shellHash');
                    // check if property shellHash has value '#' or '#Shell-home' or ""
                    if (
                        (shellHash && getName(shellHash) === '#Shell-home') ||
                        getName(shellHash) === '#' ||
                        getName(shellHash) === ''
                    ) {
                        return true;
                    }
                    const semanticObject = getProperty(target, 'semanticObject');
                    const action = getProperty(target, 'action');
                    // check if property semanticObject has value '#Shell' and action has the value '#home'
                    if (semanticObject && getName(semanticObject) === 'Shell' && action && getName(action) === 'home') {
                        return true;
                    }
                }
            }
            return false;
        }

        return {
            'VariableDeclarator': function (node) {
                if (isInterestingAssignment(node.init) && node.id.type === 'Identifier') {
                    VARIABLES[node.id.name] = true;
                }
            },
            'AssignmentExpression': function (node) {
                if (isInterestingAssignment(node.right) && node.left.type === 'Identifier') {
                    VARIABLES[node.left.name] = true;
                }
            },
            'CallExpression': function (node) {
                if (isInterestingCall(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'staticNavigationTargets' });
                }
            }
        };
    }
};

export default rule;
