/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------

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
            globalEvent: 'Global event handling override is not permitted, please modify only single events'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: any[] = [];
        const EVENT_OBJECTS: any[] = [];
        const FORBIDDEN_GLOBAL_EVENT = [
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

        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param node
         * @param type
         */
        function isType(node: any, type: any) {
            return node?.type === type;
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
            return isWindow(node) || (node && isIdentifier(node) && contains(WINDOW_OBJECTS, node.name));
        }

        /**
         *
         * @param node
         */
        function isEvent(node: any) {
            return (
                node &&
                isMember(node) &&
                isWindowObject(node.object) &&
                isIdentifier(node.property) &&
                node.property.name === 'event'
            );
        }

        /**
         *
         * @param node
         */
        function isEventObject(node: any) {
            return isEvent(node) || (node && isIdentifier(node) && contains(EVENT_OBJECTS, node.name));
        }

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         *
         * @param node
         */
        function isAssignTarget(node: any) {
            return node?.parent.type === 'AssignmentExpression' && node.parent.left === node;
        }

        /**
         *
         * @param node
         */
        function processMemberExpression(node: any) {
            if (isAssignTarget(node) && isIdentifier(node.property)) {
                if (isWindowObject(node.object) && contains(FORBIDDEN_GLOBAL_EVENT, node.property.name)) {
                    context.report({ node: node, messageId: 'globalEvent' });
                } else if (
                    isEventObject(node.object) &&
                    (node.property.name === 'returnValue' || node.property.name === 'cancelBubble')
                ) {
                    context.report({ node: node, messageId: 'globalEvent' });
                }
            }
        }

        /**
         *
         * @param left
         * @param right
         */
        function rememberWindow(left, right) {
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
        function rememberEvent(left, right) {
            if (isEventObject(right) && isIdentifier(left)) {
                EVENT_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node) {
                return rememberWindow(node.id, node.init) || rememberEvent(node.id, node.init);
            },
            'AssignmentExpression': function (node) {
                return rememberWindow(node.left, node.right) || rememberEvent(node.left, node.right);
            },
            'MemberExpression': processMemberExpression
        };
    }
};

export default rule;
