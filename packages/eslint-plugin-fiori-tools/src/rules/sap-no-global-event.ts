/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import {
    type ASTNode,
    isMember,
    contains,
    asIdentifier,
    asMemberExpression,
    asVariableDeclarator,
    asAssignmentExpression,
    getParent
} from '../utils/helpers';

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * Check if a node is the target of an assignment expression.
 *
 * @param node The AST node to check
 * @returns True if the node is the target of an assignment expression
 */
function isAssignTarget(node: ASTNode): boolean {
    const parent = getParent(node);
    const assignmentParent = asAssignmentExpression(parent);
    return !!assignmentParent && assignmentParent.left === node;
}

/**
 * Check if a node represents the global window object.
 *
 * @param node The AST node to check
 * @returns True if the node represents the global window object
 */
function isWindow(node: unknown): boolean {
    const identifier = asIdentifier(node);
    return !!identifier && identifier.name === 'window';
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: RuleDefinition = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            globalEvent: 'Global event handling override is not permitted, please modify only single events'
        },
        schema: []
    },
    create(context: RuleContext) {
        const WINDOW_OBJECTS: string[] = [];
        const EVENT_OBJECTS: string[] = [];
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
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a node represents the window object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the window object or a reference to it
         */
        function isWindowObject(node: unknown): boolean {
            const identifier = asIdentifier(node);
            return isWindow(node) || (!!identifier && contains(WINDOW_OBJECTS, identifier.name));
        }

        /**
         * Check if a node represents the window.event object.
         *
         * @param node The AST node to check
         * @returns True if the node represents the window.event object
         */
        function isEvent(node: unknown): boolean {
            const memberNode = asMemberExpression(node);
            if (!memberNode) {
                return false;
            }
            const propertyId = asIdentifier(memberNode.property);
            return (
                !!memberNode &&
                isMember(node) &&
                isWindowObject(memberNode.object) &&
                !!propertyId &&
                propertyId.name === 'event'
            );
        }

        /**
         * Check if a node represents the event object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the event object or a reference to it
         */
        function isEventObject(node: unknown): boolean {
            const identifier = asIdentifier(node);
            return isEvent(node) || (!!identifier && contains(EVENT_OBJECTS, identifier.name));
        }

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a node represents a prohibited event usage.
         *
         * @param node The AST node to check
         */
        function processMemberExpression(node: ASTNode): void {
            const memberNode = asMemberExpression(node);
            if (!memberNode) {
                return;
            }

            const propertyId = asIdentifier(memberNode.property);
            if (!isAssignTarget(node) || !propertyId) {
                return;
            }

            if (
                (isWindowObject(memberNode.object) && contains(FORBIDDEN_GLOBAL_EVENT, propertyId.name)) ||
                (isEventObject(memberNode.object) &&
                    (propertyId.name === 'returnValue' || propertyId.name === 'cancelBubble'))
            ) {
                context.report({ node: node, messageId: 'globalEvent' });
            }
        }

        /**
         * Remember window object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if window object was remembered, false otherwise
         */
        function rememberWindow(left: unknown, right: unknown): boolean {
            const leftId = asIdentifier(left);
            if (isWindowObject(right) && leftId) {
                WINDOW_OBJECTS.push(leftId.name);
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
        function rememberEvent(left: unknown, right: unknown): boolean {
            const leftId = asIdentifier(left);
            if (isEventObject(right) && leftId) {
                EVENT_OBJECTS.push(leftId.name);
                return true;
            }
            return false;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node: ASTNode): boolean {
                const declarator = asVariableDeclarator(node);
                if (!declarator) {
                    return false;
                }
                return rememberWindow(declarator.id, declarator.init) || rememberEvent(declarator.id, declarator.init);
            },
            'AssignmentExpression': function (node: ASTNode): boolean {
                const assignment = asAssignmentExpression(node);
                if (!assignment) {
                    return false;
                }
                return (
                    rememberWindow(assignment.left, assignment.right) ||
                    rememberEvent(assignment.left, assignment.right)
                );
            },
            'MemberExpression': processMemberExpression
        };
    }
};

export default rule;
