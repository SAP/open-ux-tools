/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import { type ASTNode, isIdentifier, contains, createDocumentBasedRuleVisitors } from '../utils/helpers';

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
            domAccess: 'Direct DOM access, use jQuery selector instead'
        },
        schema: []
    },
    create(context: RuleContext) {
        const FORBIDDEN_DOCUMENT_METHODS = [
            'getElementById',
            'getElementsByClassName',
            'getElementsByName',
            'getElementsByTagName'
        ];

        const createVisitors = createDocumentBasedRuleVisitors({
            isInteresting: (node: ASTNode, isDocumentObject: (node: unknown) => boolean): boolean => {
                const n = node as any;
                return !!(n && isDocumentObject(n.object));
            },
            isValid: (node: ASTNode): boolean => {
                return !(
                    isIdentifier((node as any).property) &&
                    contains(FORBIDDEN_DOCUMENT_METHODS, (node as any).property.name)
                );
            },
            messageId: 'domAccess'
        });

        return createVisitors(context);
    }
};

export default rule;
