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
         * Check if a node is of a specific type.
         *
         * @param node The AST node to check
         * @param type The type to check for
         * @returns True if the node is of the specified type
         */
        function isType(node: any, type: any) {
            return node?.type === type;
        }

        /**
         * Check if a node is an Identifier.
         *
         * @param node The AST node to check
         * @returns True if the node is an Identifier
         */
        function isIdentifier(node: any) {
            return isType(node, 'Identifier');
        }

        /**
         * Check if a node is a MemberExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is a MemberExpression
         */
        function isMember(node: any) {
            return isType(node, 'MemberExpression');
        }

        /**
         * Check if an array contains a specific object.
         *
         * @param a The array to search in
         * @param obj The object to search for
         * @returns True if the array contains the object
         */
        function contains(a, obj) {
            return a.includes(obj);
        }

        /**
         * Check if a node represents the global window object.
         *
         * @param node The AST node to check
         * @returns True if the node represents the global window object
         */
        function isWindow(node: any) {
            // true if node is the global variable 'window'
            return isIdentifier(node) && node.name === 'window';
        }

        /**
         * Check if a node represents the window object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the window object or a reference to it
         */
        function isWindowObject(node: any) {
            // true if node is the global variable 'window' or a reference to it
            return isWindow(node) || (node && isIdentifier(node) && contains(WINDOW_OBJECTS, node.name));
        }

        /**
         * Check if a node represents the window.event object.
         *
         * @param node The AST node to check
         * @returns True if the node represents the window.event object
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
         * Check if a node represents the event object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the event object or a reference to it
         */
        function isEventObject(node: any) {
            return isEvent(node) || (node && isIdentifier(node) && contains(EVENT_OBJECTS, node.name));
        }

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a node is the target of an assignment expression.
         *
         * @param node The AST node to check
         * @returns True if the node is the target of an assignment expression
         */
        function isAssignTarget(node: any) {
            return node?.parent.type === 'AssignmentExpression' && node.parent.left === node;
        }

        /**
         * Check if a node represents a prohibited event usage.
         *
         * @param node The AST node to check
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
         * Remember window object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if window object was remembered, false otherwise
         */
        function rememberWindow(left, right) {
            if (isWindowObject(right) && isIdentifier(left)) {
                WINDOW_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        /**
         * Remember event object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if event object was remembered, false otherwise
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
