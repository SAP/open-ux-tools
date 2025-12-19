/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { Rule } from 'eslint';
import { type ASTNode, isIdentifier, contains, createDocumentBasedRuleVisitors } from '../utils/helpers';

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
            domAccess: 'Direct DOM access, use jQuery selector instead'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const FORBIDDEN_DOCUMENT_METHODS = [
            'getElementById',
            'getElementsByClassName',
            'getElementsByName',
            'getElementsByTagName'
        ];

        const createVisitors = createDocumentBasedRuleVisitors({
            isInteresting: (node: ASTNode, isDocumentObject: (node: unknown) => boolean): boolean => {
                return node && isDocumentObject((node as any).object);
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
