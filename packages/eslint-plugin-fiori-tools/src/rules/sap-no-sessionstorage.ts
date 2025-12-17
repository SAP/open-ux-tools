/**
 * @file Detect usage of session storage
 */

import type { Rule } from 'eslint';
import { type ASTNode, createStorageRuleHelpers } from '../utils/helpers';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            sessionStorageUsage:
                'For security reasons, the usage of session storage is not allowed in a Fiori application'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const FORBIDDEN_STORAGE_OBJECT: string[] = [];
        const storageHelpers = createStorageRuleHelpers('sessionStorage', 'sessionStorageUsage');

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
