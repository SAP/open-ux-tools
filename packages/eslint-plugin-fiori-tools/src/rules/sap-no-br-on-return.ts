/**
 * @file Detect the usage of document.queryCommandSupported with 'insertBrOnReturn' argument
 */

import type { Rule } from 'eslint';
import { type ASTNode, isIdentifier, isCall, isLiteral, createDocumentBasedRuleVisitors } from '../utils/helpers';

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
            insertBrOnReturn:
                "insertBrOnReturn is not allowed since it is a Mozilla specific method, other browsers don't support that."
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const createVisitors = createDocumentBasedRuleVisitors({
            isInteresting: (node: ASTNode, isDocumentObject: (node: unknown) => boolean): boolean => {
                return (
                    isCall((node as any).parent) &&
                    isDocumentObject((node as any).object) &&
                    ((isIdentifier((node as any).property) &&
                        (node as any).property.name === 'queryCommandSupported') ||
                        (isLiteral((node as any).property) && (node as any).property.value === 'queryCommandSupported'))
                );
            },
            isValid: (node: ASTNode): boolean => {
                return (
                    (node as any).parent.arguments.length === 0 ||
                    (node as any).parent.arguments[0].value !== 'insertBrOnReturn'
                );
            },
            messageId: 'insertBrOnReturn'
        });

        return createVisitors(context);
    }
};

export default rule;
