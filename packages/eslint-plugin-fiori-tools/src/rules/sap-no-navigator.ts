/**
 * @file Detect usage of navigator object
 * @ESLint Version 0.24.0
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

/*eslint-disable strict*/
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

        const FULL_BLACKLIST = FORBIDDEN_NAVIGATOR_WINDOW.concat(FORBIDDEN_GLOB_EVENT);
        FULL_BLACKLIST.push('back');

        const WINDOW_OBJECTS: any[] = [];
        const NAVIGATOR_OBJECTS: any[] = [];

        // --------------------------------------------------------------------------
        // Helpers
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
        function isCall(node: any) {
            return isType(node, 'CallExpression');
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
        function getRightestMethodName(node: any) {
            const callee = node.callee;
            return isMember(callee) ? callee.property.name : callee.name;
        }

        /**
         *
         * @param node
         */
        function isWindow(node: any) {
            // true if node is the global variable 'window'
            return isIdentifier(node) && node.name === 'window';
        }

        /**
         *
         * @param node
         */
        function isWindowObject(node: any) {
            // true if node is the global variable 'window' or a reference to it
            return isWindow(node) || (isIdentifier(node) && contains(WINDOW_OBJECTS, node.name));
        }

        /**
         *
         * @param node
         */
        function isNavigator(node: any) {
            // true if node id the global variable 'navigator', 'window.navigator' or '<windowReference>.navigator'
            return (
                (isIdentifier(node) && node.name === 'navigator') ||
                (isMember(node) && isWindowObject(node.object) && isNavigator(node.property))
            );
        }

        /**
         *
         * @param node
         */
        function isNavigatorObject(node: any) {
            // true if node is the global variable 'navigator'/'window.navigator' or a reference to it
            return isNavigator(node) || (isIdentifier(node) && contains(NAVIGATOR_OBJECTS, node.name));
        }

        /**
         *
         * @param left
         * @param right
         */
        function rememberWindow(left: any, right: any): boolean {
            if (isWindowObject(right) && isIdentifier(left)) {
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
        function rememberNavigator(left: any, right: any): boolean {
            if (isNavigatorObject(right) && isIdentifier(left)) {
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
                return rememberWindow(node.id, node.init) || rememberNavigator(node.id, node.init);
            },
            'AssignmentExpression': function (node) {
                return rememberWindow(node.left, node.right) || rememberNavigator(node.left, node.right);
            },
            'MemberExpression': function (node) {
                if (isNavigatorObject(node.object)) {
                    if (isCall(node.parent)) {
                        const methodName = getRightestMethodName(node.parent);
                        if (typeof methodName === 'string' && contains(FULL_BLACKLIST, methodName)) {
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
