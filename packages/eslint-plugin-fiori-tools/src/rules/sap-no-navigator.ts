/**
 * @file Detect usage of navigator object
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import {
    getLiteralOrIdentifierName,
    type ASTNode,
    asCallExpression,
    asMemberExpression,
    asIdentifier
} from '../utils/helpers';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/**
 * Check if a node is of a specific type.
 *
 * @param node The AST node to check
 * @param type The type to check for
 * @returns True if the node is of the specified type
 */
function isType(node: ASTNode | undefined, type: string): boolean {
    return !!(node && typeof node === 'object' && node !== null && 'type' in node && node.type === type);
}

/**
 * Check if a node is an Identifier.
 *
 * @param node The AST node to check
 * @returns True if the node is an Identifier
 */
function isIdentifier(node: ASTNode | undefined): boolean {
    return isType(node, 'Identifier');
}

/**
 * Check if a node is a CallExpression.
 *
 * @param node The AST node to check
 * @returns True if the node is a CallExpression
 */
function isCall(node: ASTNode | undefined): boolean {
    return isType(node, 'CallExpression');
}

/**
 * Get the rightmost method name from a call expression node.
 *
 * @param node The call expression node to analyze
 * @returns The rightmost method name
 */
function getRightestMethodName(node: ASTNode): string {
    const callExpr = asCallExpression(node);
    if (!callExpr) {
        return '';
    }
    const memberCallee = asMemberExpression(callExpr.callee);
    if (memberCallee) {
        const identProp = asIdentifier(memberCallee.property);
        return identProp?.name ?? '';
    }
    const identCallee = asIdentifier(callExpr.callee);
    return identCallee?.name ?? '';
}

/**
 * Check if a node represents the global window object.
 *
 * @param node The AST node to check
 * @returns True if the node represents the global window object
 */
function isWindow(node: ASTNode | undefined): boolean {
    // true if node is the global variable 'window'
    return !!(
        isIdentifier(node) &&
        node &&
        typeof node === 'object' &&
        node !== null &&
        'name' in node &&
        getLiteralOrIdentifierName(node) === 'window'
    );
}

const rule: RuleDefinition = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            navigator: 'navigator usage is forbidden, use sap.ui.Device API instead'
        },
        schema: []
    },
    create(context: RuleContext) {
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
         * Check if a node represents the window object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the window object or a reference to it
         */
        function isWindowObject(node: ASTNode | undefined): boolean {
            // true if node is the global variable 'window' or a reference to it
            return !!(
                isWindow(node) ||
                (isIdentifier(node) &&
                    node &&
                    typeof node === 'object' &&
                    node !== null &&
                    'name' in node &&
                    WINDOW_OBJECTS.includes(getLiteralOrIdentifierName(node)))
            );
        }

        /**
         * Check if a node represents the navigator object.
         *
         * @param node The AST node to check
         * @returns True if the node represents the navigator object
         */
        function isNavigator(node: ASTNode | undefined): boolean {
            // true if node id the global variable 'navigator', 'window.navigator' or '<windowReference>.navigator'
            if (isIdentifier(node) && node && typeof node === 'object' && node !== null && 'name' in node) {
                return getLiteralOrIdentifierName(node) === 'navigator';
            }
            const memberNode = asMemberExpression(node);
            if (memberNode) {
                return isWindowObject(memberNode.object) && isNavigator(memberNode.property);
            }
            return false;
        }

        /**
         * Check if a node represents the navigator object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the navigator object or a reference to it
         */
        function isNavigatorObject(node: ASTNode | undefined): boolean {
            // true if node is the global variable 'navigator'/'window.navigator' or a reference to it
            return !!(
                isNavigator(node) ||
                (isIdentifier(node) &&
                    node &&
                    typeof node === 'object' &&
                    node !== null &&
                    'name' in node &&
                    NAVIGATOR_OBJECTS.includes(getLiteralOrIdentifierName(node)))
            );
        }

        /**
         * Remember window object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if the assignment was remembered
         */
        function rememberWindow(left: ASTNode, right: ASTNode): boolean {
            if (isWindowObject(right) && isIdentifier(left) && typeof left === 'object' && left !== null) {
                const identLeft = asIdentifier(left);
                if (identLeft) {
                    WINDOW_OBJECTS.push(identLeft.name);
                    return true;
                }
            }
            return false;
        }

        /**
         * Remember navigator object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if the assignment was remembered
         */
        function rememberNavigator(left: ASTNode, right: ASTNode): boolean {
            if (isNavigatorObject(right) && isIdentifier(left) && typeof left === 'object' && left !== null) {
                const identLeft = asIdentifier(left);
                if (identLeft) {
                    NAVIGATOR_OBJECTS.push(identLeft.name);
                    return true;
                }
            }
            return false;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'VariableDeclarator': function (node: any): boolean {
                return rememberWindow(node.id, node.init) || rememberNavigator(node.id, node.init);
            },
            'AssignmentExpression': function (node: any): boolean {
                return rememberWindow(node.left, node.right) || rememberNavigator(node.left, node.right);
            },
            'MemberExpression': function (node: any): void {
                if (isNavigatorObject(node.object)) {
                    const parent = node.parent as ASTNode;
                    if (isCall(parent)) {
                        const methodName = getRightestMethodName(parent);
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
