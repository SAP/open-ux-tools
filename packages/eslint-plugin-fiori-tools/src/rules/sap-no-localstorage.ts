/**
 * @file detects usage of localstaorage
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import { type ASTNode, createStorageRuleHelpers } from '../utils/helpers';

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
            localStorageUsage: 'Local storage must not be used in a Fiori application'
        },
        schema: []
    },
    create(context: RuleContext) {
        const FORBIDDEN_STORAGE_OBJECT: string[] = [];
        const storageHelpers = createStorageRuleHelpers('localStorage', 'localStorageUsage');

        return {
            'VariableDeclarator'(node: ASTNode): void {
                storageHelpers.processVariableDeclarator(node, FORBIDDEN_STORAGE_OBJECT);
            },
            'MemberExpression'(node: ASTNode): void {
                storageHelpers.checkMemberExpression(node, FORBIDDEN_STORAGE_OBJECT, context);
            }
        };
    }
};

export default rule;
