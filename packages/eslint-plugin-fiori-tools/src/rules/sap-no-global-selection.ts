/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import {
    type ASTNode,
    contains,
    createIsWindowObject,
    createRememberWindow,
    asMemberExpression,
    asIdentifier,
    asVariableDeclarator,
    asAssignmentExpression
} from '../utils/helpers';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------

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
            globalSelection: 'Global selection modification, only modify local selections'
        },
        schema: []
    },
    create(context: RuleContext) {
        const WINDOW_OBJECTS: string[] = [];
        const FORBIDDEN_METHODS = ['getSelection'];

        // Create helper functions using the utility functions
        const isWindowObject = createIsWindowObject(WINDOW_OBJECTS);
        const rememberWindow = createRememberWindow(WINDOW_OBJECTS, isWindowObject);

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator'(node: ASTNode): boolean {
                const declarator = asVariableDeclarator(node);
                return declarator ? rememberWindow(declarator.id, declarator.init) : false;
            },
            'AssignmentExpression'(node: ASTNode): boolean {
                const assignment = asAssignmentExpression(node);
                return assignment ? rememberWindow(assignment.left, assignment.right) : false;
            },
            'MemberExpression'(node: ASTNode): void {
                const memberNode = asMemberExpression(node);
                if (!memberNode) {
                    return;
                }

                const propertyId = asIdentifier(memberNode.property);
                if (isWindowObject(memberNode.object) && propertyId && contains(FORBIDDEN_METHODS, propertyId.name)) {
                    context.report({ node: node, messageId: 'globalSelection' });
                }
            }
        };
    }
};

export default rule;
