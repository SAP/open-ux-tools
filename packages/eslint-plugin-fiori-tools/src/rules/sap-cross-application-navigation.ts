/**
 * @file Rule
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import {
    type ASTNode,
    getLiteralOrIdentifierName,
    asCallExpression,
    asLiteral,
    asMemberExpression,
    asObjectExpression,
    asIdentifier,
    asProperty
} from '../utils/helpers';

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * Check if a node is of a specific type.
 *
 * @param node The AST node to check
 * @param type The type to check for
 * @returns True if the node is of the specified type
 */
function isType(node: ASTNode | undefined, type: string): boolean {
    return node?.type === type;
}

/**
 * Check if a string ends with a specific suffix.
 *
 * @param string The string to check
 * @param suffix The suffix to look for
 * @returns True if the string ends with the suffix
 */
function endsWith(string: string, suffix: string): boolean {
    return typeof string === 'string' && typeof suffix === 'string' && string.endsWith(suffix);
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
 * Check if a node is a LogicalExpression.
 *
 * @param node The AST node to check
 * @returns True if the node is a LogicalExpression
 */
function isLogical(node: ASTNode | undefined): boolean {
    return isType(node, 'LogicalExpression');
}

/**
 * Get the identifier path from a node.
 *
 * @param node The AST node to extract path from
 * @returns The identifier path extracted from the node
 */
function getIdentifierPath(node: ASTNode): string {
    if (isIdentifier(node)) {
        return getLiteralOrIdentifierName(node);
    }
    const literal = asLiteral(node);
    if (literal && typeof literal.value === 'string') {
        return literal.value;
    }
    const member = asMemberExpression(node);
    if (member) {
        return `${getIdentifierPath(member.object)}.${getIdentifierPath(member.property)}`;
    }
    return '';
}

/**
 * Get the name from an identifier or literal node.
 *
 * @param node The AST node to extract name from
 * @returns The name extracted from the node, or null if not found
 */
function getName(node: ASTNode): string | null {
    if (isIdentifier(node)) {
        return getLiteralOrIdentifierName(node);
    }
    const literal = asLiteral(node);
    if (literal && typeof literal.value === 'string') {
        return literal.value;
    }
    return null;
}

/**
 * Method checks the given node, if it's a method call with 'CrossApplicationNavigation' as the only argument.
 *
 * @param node - a CallExpression node
 * @returns True if the node is a getService call with CrossApplicationNavigation
 */
function isGetServiceCall(node: ASTNode | undefined): boolean {
    const callExpr = asCallExpression(node);
    if (callExpr) {
        if (callExpr.arguments?.length === 1) {
            const firstArg = asLiteral(callExpr.arguments[0]);
            if (firstArg?.value === 'CrossApplicationNavigation') {
                return true;
            }
        }
    }
    return false;
}

/**
 * Get a property from an object node by key.
 *
 * @param node The object node to search in
 * @param key The property key to search for
 * @returns The property node if found, null otherwise
 */
function getProperty(node: ASTNode, key: string): ASTNode | null {
    // check if node is an object, only objects have properties
    const objectExpr = asObjectExpression(node);
    if (objectExpr) {
        // iterate properties
        for (const prop of objectExpr.properties) {
            const property = asProperty(prop);
            // return property value if property key matches given key
            if (property && getName(property.key) === key) {
                return property.value;
            }
        }
    }
    return null;
}

/**
 * Method checks if the assignment node contains any interesting nodes. Can handle nested conditions.
 *
 * @param node The assignment node to check
 * @returns True if the assignment contains interesting nodes
 */
function isInterestingAssignment(node: ASTNode | undefined): boolean {
    if (isGetServiceCall(node)) {
        return true;
    }
    if (isLogical(node) && node && typeof node === 'object') {
        const leftNode = 'left' in node ? node.left : undefined;
        const rightNode = 'right' in node ? node.right : undefined;
        return isInterestingAssignment(leftNode) || isInterestingAssignment(rightNode);
    }
    return false;
}

/**
 * Check if a navigation call has valid target configuration.
 *
 * @param node The call expression node to validate
 * @returns True if the navigation has valid target configuration
 */
function isValid(node: ASTNode): boolean {
    const callNode = node as { arguments?: unknown[] };
    if (callNode.arguments?.length && callNode.arguments.length > 0) {
        const target = getProperty(callNode.arguments[0], 'target');
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
            staticNavigationTargets: 'Do not use a static list of cross-application navigation targets.'
        },
        schema: []
    },
    create(context: RuleContext) {
        const VARIABLES: Record<string, boolean> = {};

        /**
         * Check if a call expression is interesting for cross-application navigation.
         *
         * @param node The call expression node to check
         * @returns True if the call expression is interesting for cross-application navigation
         */
        function isInterestingCall(node: ASTNode): boolean {
            const callExpr = asCallExpression(node);
            if (!callExpr) {
                return false;
            }
            const path = getIdentifierPath(callExpr.callee);
            if (endsWith(path, 'toExternal')) {
                const memberCallee = asMemberExpression(callExpr.callee);
                if (memberCallee) {
                    const object = memberCallee.object;
                    if (isGetServiceCall(object)) {
                        return true;
                    }
                    const identObject = asIdentifier(object);
                    if (identObject && VARIABLES[identObject.name]) {
                        return true;
                    }
                }
            }
            return false;
        }

        return {
            'VariableDeclarator': function (node: any): void {
                if (isInterestingAssignment(node.init) && node.id.type === 'Identifier') {
                    VARIABLES[node.id.name] = true;
                }
            },
            'AssignmentExpression': function (node: any): void {
                if (isInterestingAssignment(node.right) && node.left.type === 'Identifier') {
                    VARIABLES[node.left.name] = true;
                }
            },
            'CallExpression': function (node: any): void {
                if (isInterestingCall(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'staticNavigationTargets' });
                }
            }
        };
    }
};

export default rule;
