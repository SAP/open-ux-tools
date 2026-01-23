/**
 * @file Detect direct DOM insertion
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import {
    type ASTNode,
    isCall,
    isLiteral,
    contains,
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
            elementCreation: 'Direct element creation, create a custom control instead'
        },
        schema: []
    },
    create(context: RuleContext) {
        const FORBIDDEN_DOM_INSERTION = [
            'createElement',
            'createTextNode',
            'createElementNS',
            'createDocumentFragment',
            'createComment',
            'createAttribute',
            'createEvent'
        ];

        const createVisitors = createDocumentBasedRuleVisitors({
            isInteresting: (node: ASTNode, isDocumentObject: (node: unknown) => boolean): boolean => {
                const parent = getParent(node);
                const memberNode = asMemberExpression(node);
                return !!(node && parent && isCall(parent) && memberNode && isDocumentObject(memberNode.object));
            },
            isValid: (node: ASTNode): boolean => {
                const memberNode = asMemberExpression(node);
                if (!memberNode) {
                    return true;
                }

                const methodName = getPropertyName(memberNode.property);
                if (!methodName) {
                    return true;
                }

                const parent = getParent(node);
                const parentCall = asCallExpression(parent);

                const isValid =
                    !contains(FORBIDDEN_DOM_INSERTION, methodName) ||
                    (methodName === 'createElement' &&
                        parentCall &&
                        parentCall.arguments &&
                        parentCall.arguments.length > 0 &&
                        isLiteral(parentCall.arguments[0]) &&
                        asLiteral(parentCall.arguments[0])?.value === 'a');
                return !!isValid;
            },
            messageId: 'elementCreation'
        });

        return createVisitors(context);
    }
};

export default rule;
