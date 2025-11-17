/**
 * @file Detect usage of navigator object
 * @ESLint Version 0.24.0
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
            navigator: 'navigator usage is forbidden, use sap.ui.Device API instead'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const FORBIDDEN_NAVIGATOR_WINDOW = ['javaEnabled'],
            FORBIDDEN_GLOB_EVENT = [
                'onload',
                'onunload',
                'onabort',
                'onbeforeunload',
                'onerror',
                'onhashchange',
                'onpageshow',
                'onpagehide',
                'onscroll',
                'onblur',
                'onchange',
                'onfocus',
                'onfocusin',
                'onfocusout',
                'oninput',
                'oninvalid',
                'onreset',
                'onsearch',
                'onselect',
                'onsubmit',
                'onresize'
            ];

        const FORBIDDEN_METHODS = FORBIDDEN_NAVIGATOR_WINDOW.concat(FORBIDDEN_GLOB_EVENT);
        FORBIDDEN_METHODS.push('back');

        const WINDOW_OBJECTS: string[] = [];
        const NAVIGATOR_OBJECTS: string[] = [];

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

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
        function isIdentifier(node: Rule.Node | undefined): boolean {
            return isType(node, 'Identifier');
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
        function isCall(node: Rule.Node | undefined): boolean {
            return isType(node, 'CallExpression');
        }

        /**
         *
         * @param node
         */
        function getRightestMethodName(node: Rule.Node): string {
            const callee = (node as any).callee;
            return isMember(callee) ? callee.property.name : callee.name;
        }

        /**
         *
         * @param node
         */
        function isWindow(node: Rule.Node | undefined): boolean {
            // true if node is the global variable 'window'
            return !!(isIdentifier(node) && node && 'name' in node && node.name === 'window');
        }

        /**
         *
         * @param node
         */
        function isWindowObject(node: Rule.Node | undefined): boolean {
            // true if node is the global variable 'window' or a reference to it
            return !!(
                isWindow(node) ||
                (isIdentifier(node) && node && 'name' in node && WINDOW_OBJECTS.includes(node.name))
            );
        }

        /**
         *
         * @param node
         */
        function isNavigator(node: Rule.Node | undefined): boolean {
            // true if node id the global variable 'navigator', 'window.navigator' or '<windowReference>.navigator'
            return (
                (isIdentifier(node) && node && 'name' in node && node.name === 'navigator') ||
                (isMember(node) && isWindowObject((node as any).object) && isNavigator((node as any).property))
            );
        }

        /**
         *
         * @param node
         */
        function isNavigatorObject(node: Rule.Node | undefined): boolean {
            // true if node is the global variable 'navigator'/'window.navigator' or a reference to it
            return !!(
                isNavigator(node) ||
                (isIdentifier(node) && node && 'name' in node && NAVIGATOR_OBJECTS.includes(node.name))
            );
        }

        /**
         *
         * @param left
         * @param right
         */
        function rememberWindow(left: Rule.Node, right: Rule.Node): boolean {
            if (isWindowObject(right) && isIdentifier(left) && 'name' in left) {
                WINDOW_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        /**
         *
         * @param left
         * @param right
         */
        function rememberNavigator(left: Rule.Node, right: Rule.Node): boolean {
            if (isNavigatorObject(right) && isIdentifier(left) && 'name' in left) {
                NAVIGATOR_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'VariableDeclarator': function (node) {
                return (
                    rememberWindow((node as any).id, (node as any).init) ||
                    rememberNavigator((node as any).id, (node as any).init)
                );
            },
            'AssignmentExpression': function (node) {
                return (
                    rememberWindow((node as any).left, (node as any).right) ||
                    rememberNavigator((node as any).left, (node as any).right)
                );
            },
            'MemberExpression': function (node) {
                if (isNavigatorObject((node as any).object)) {
                    if (isCall(node.parent)) {
                        const methodName = getRightestMethodName(node.parent);
                        if (typeof methodName === 'string' && FORBIDDEN_METHODS.includes(methodName)) {
                            context.report({ node: node, messageId: 'navigator' });
                        }
                    } else {
                        context.report({ node: node, messageId: 'navigator' });
                    }
                }
            }
        };
    }
};

export default rule;
