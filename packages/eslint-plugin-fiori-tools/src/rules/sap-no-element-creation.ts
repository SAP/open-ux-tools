/**
 * @file Detect direct DOM insertion
 */

import type { Rule } from 'eslint';
import {
    type ASTNode,
    isIdentifier,
    isCall,
    isLiteral,
    contains,
    createDocumentBasedRuleVisitors
} from '../utils/helpers';

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
            elementCreation: 'Direct element creation, create a custom control instead'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
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
                return node && isCall((node as any).parent) && isDocumentObject((node as any).object);
            },
            isValid: (node: ASTNode): boolean => {
                let methodName: string | false = false;

                if (isIdentifier((node as any).property)) {
                    methodName = (node as any).property.name;
                } else if (isLiteral((node as any).property)) {
                    methodName = (node as any).property.value;
                }
                return (
                    methodName &&
                    (!contains(FORBIDDEN_DOM_INSERTION, methodName) ||
                        (methodName === 'createElement' &&
                            isCall((node as any).parent) &&
                            (node as any).parent.arguments &&
                            (node as any).parent.arguments.length > 0 &&
                            isLiteral((node as any).parent.arguments[0]) &&
                            (node as any).parent.arguments[0].value === 'a'))
                );
            },
            messageId: 'elementCreation'
        });

        return createVisitors(context);
    }
};

export default rule;
