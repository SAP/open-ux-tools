/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import {
    type ASTNode,
    contains,
    createDocumentBasedRuleVisitors,
    asMemberExpression,
    getPropertyName
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
                const memberNode = asMemberExpression(node);
                return !!(memberNode && isDocumentObject(memberNode.object));
            },
            isValid: (node: ASTNode): boolean => {
                const propertyName = getPropertyName(asMemberExpression(node)?.property);
                return !propertyName || !contains(FORBIDDEN_DOCUMENT_METHODS, propertyName);
            },
            messageId: 'domAccess'
        });

        return createVisitors(context);
    }
};

export default rule;
