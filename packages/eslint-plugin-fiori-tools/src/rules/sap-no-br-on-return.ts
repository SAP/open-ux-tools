/**
 * @file Detect the usage of document.queryCommandSupported with 'insertBrOnReturn' argument
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import {
    type ASTNode,
    isCall,
    createDocumentBasedRuleVisitors,
    getParent,
    asCallExpression,
    getPropertyName,
    asLiteral,
    asMemberExpression
} from '../utils/helpers';

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
            insertBrOnReturn:
                "insertBrOnReturn is not allowed since it is a Mozilla specific method, other browsers don't support that."
        },
        schema: []
    },
    create(context: RuleContext) {
        const createVisitors = createDocumentBasedRuleVisitors({
            isInteresting: (node: ASTNode, isDocumentObject: (node: unknown) => boolean): boolean => {
                const parent = getParent(node);
                const memberNode = asMemberExpression(node);
                if (!parent || !memberNode) {
                    return false;
                }

                const methodName = getPropertyName(memberNode.property);
                return isCall(parent) && isDocumentObject(memberNode.object) && methodName === 'queryCommandSupported';
            },
            isValid: (node: ASTNode): boolean => {
                const parent = getParent(node);
                const parentCall = asCallExpression(parent);
                if (!parentCall) {
                    return true;
                }

                if (parentCall.arguments.length === 0) {
                    return true;
                }

                const firstArg = asLiteral(parentCall.arguments[0]);
                return firstArg?.value !== 'insertBrOnReturn';
            },
            messageId: 'insertBrOnReturn'
        });

        return createVisitors(context);
    }
};

export default rule;
