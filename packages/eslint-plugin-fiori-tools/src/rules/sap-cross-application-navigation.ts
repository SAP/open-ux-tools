/**
 * @file Rule
 * @ESLint Version 0.24.x / November 2015
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
            staticNavigationTargets: 'Do not use a static list of cross-application navigation targets.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const VARIABLES: Record<string, boolean> = {};

        /**
         *
         * @param node
         * @param type
         */
        function isType(node: Rule.Node | undefined, type: string): boolean {
            return node?.type === type;
        }
        /**
         *
         * @param node
         */
        function isObject(node: Rule.Node | undefined): boolean {
            return isType(node, 'ObjectExpression');
        }
        /**
         *
         * @param node
         */
        function isMember(node: Rule.Node | undefined): boolean {
            return isType(node, 'MemberExpression');
        }
        /**
         *
         * @param node
         */
        function isIdentifier(node: Rule.Node | undefined): boolean {
            return isType(node, 'Identifier');
        }
        /**
         *
         * @param node
         */
        function isCall(node: Rule.Node | undefined): boolean {
            return isType(node, 'CallExpression');
        }
        /**
         *
         * @param node
         */
        function isLogical(node: Rule.Node | undefined): boolean {
            return isType(node, 'LogicalExpression');
        }
        /**
         *
         * @param node
         */
        function isLiteral(node: Rule.Node | undefined): boolean {
            return isType(node, 'Literal');
        }
        /**
         *
         * @param node
         */
        function isProperty(node: Rule.Node | undefined): boolean {
            return isType(node, 'Property');
        }

        /**
         *
         * @param string
         * @param suffix
         */
        function endsWith(string: string, suffix: string): boolean {
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
        function getIdentifierPath(node: Rule.Node): string {
            if (isIdentifier(node)) {
                return (node as any).name;
            } else if (isLiteral(node)) {
                return (node as any).value;
            } else if (isMember(node)) {
                return `${getIdentifierPath((node as any).object)}.${getIdentifierPath((node as any).property)}`;
            } else {
                return '';
            }
        }

        /**
         *
         * @param node
         */
        function getName(node: Rule.Node): string | null {
            if (isIdentifier(node)) {
                return (node as any).name;
            } else if (isLiteral(node)) {
                return (node as any).value;
            }
            return null;
        }

        /**
         *
         * @param node
         * @param key
         */
        function getProperty(node: Rule.Node, key: string): Rule.Node | null {
            // check if node is an object, only objects have properties
            if (isObject(node)) {
                // iterate properties
                for (let i = 0; i < (node as any).properties.length; i++) {
                    const property = (node as any).properties[i];
                    // return property value if property key matches given key
                    if (isProperty(property) && getName((property as any).key) === key) {
                        return (property as any).value;
                    }
                }
            }
            return null;
        }

        /**
         * Method checks the given node, if it's a method call with 'CrossApplicationNavigation' as the only argument.
         *
         * @param node - a CallExpression node
         */
        function isGetServiceCall(node: Rule.Node | undefined): boolean {
            if (isCall(node)) {
                if (
                    (node as any).arguments?.length === 1 &&
                    isLiteral((node as any).arguments[0]) &&
                    (node as any).arguments[0].value === 'CrossApplicationNavigation'
                ) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Method checks if the assignment node contains any interesting nodes. Can handle nested conditions.
         *
         * @param node
         */
        function isInterestingAssignment(node: Rule.Node | undefined): boolean {
            return (
                isGetServiceCall(node) || // const x = fgetService('CrossApplicationNavigation');
                // const x = fgetService && fgetService('CrossApplicationNavigation');
                (isLogical(node) &&
                    (isInterestingAssignment((node as any).left) || isInterestingAssignment((node as any).right)))
            );
        }

        /**
         *
         * @param node
         */
        function isInterestingCall(node: Rule.Node): boolean {
            const path = getIdentifierPath((node as any).callee);
            if (isCall(node) && endsWith(path, 'toExternal')) {
                const callee = (node as any).callee;
                if (isMember(callee)) {
                    const object = callee.object;
                    if (isGetServiceCall(object) || (isIdentifier(object) && VARIABLES[object.name])) {
                        return true;
                    }
                }
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isValid(node: Rule.Node): boolean {
            if ((node as any).arguments?.length > 0) {
                const target = getProperty((node as any).arguments[0], 'target');
                if (target) {
                    // get property target from first argument, get property shellHash from property target
                    const shellHash = getProperty(target, 'shellHash');
                    // check if property shellHash has value '#' or '#Shell-home' or ""
                    if (
                        (shellHash && getName(shellHash) === '#Shell-home') ||
                        (shellHash && getName(shellHash) === '#') ||
                        (shellHash && getName(shellHash) === '')
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
                if (isInterestingAssignment((node as any).init) && (node as any).id.type === 'Identifier') {
                    VARIABLES[(node as any).id.name] = true;
                }
            },
            'AssignmentExpression': function (node) {
                if (isInterestingAssignment((node as any).right) && (node as any).left.type === 'Identifier') {
                    VARIABLES[(node as any).left.name] = true;
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
