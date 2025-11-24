/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { Rule } from 'eslint';
import { type ASTNode, isIdentifier, contains, createIsWindowObject, createRememberWindow } from '../utils/helpers';

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
            globalSelection: 'Global selection modification, only modify local selections'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
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
                return rememberWindow((node as any).id, (node as any).init);
            },
            'AssignmentExpression'(node: ASTNode): boolean {
                return rememberWindow((node as any).left, (node as any).right);
            },
            'MemberExpression'(node: ASTNode): void {
                if (
                    node &&
                    isWindowObject((node as any).object) &&
                    isIdentifier((node as any).property) &&
                    'name' in (node as any).property &&
                    contains(FORBIDDEN_METHODS, (node as any).property.name)
                ) {
                    context.report({ node: node, messageId: 'globalSelection' });
                }
            }
        };
    }
};

export default rule;
