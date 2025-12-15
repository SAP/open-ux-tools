/**
 * @file detects usage of localstaorage
 */

import type { Rule } from 'eslint';
import {
    type ASTNode,
    type IdentifierNode,
    type MemberExpressionNode,
    buildCalleePath,
    contains,
    isForbiddenObviousApi
} from '../utils/helpers';

// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

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
            localStorageUsage: 'Local storage must not be used in a Fiori application'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const FORBIDDEN_STORAGE_OBJECT: string[] = [];

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Process variable declarator nodes for localStorage references.
         *
         * @param node The variable declarator node to process
         */
        function processVariableDeclarator(node: ASTNode): void {
            const declaratorNode = node as { init?: ASTNode; id: IdentifierNode };
            if (declaratorNode.init) {
                if (declaratorNode.init.type === 'MemberExpression') {
                    const memberInit = declaratorNode.init as MemberExpressionNode;
                    const objectNode = memberInit.object as IdentifierNode;
                    const propertyNode = memberInit.property as IdentifierNode;
                    const firstElement = objectNode.name;
                    const secondElement = propertyNode.name;
                    if (firstElement + '.' + secondElement === 'window.localStorage') {
                        FORBIDDEN_STORAGE_OBJECT.push(declaratorNode.id.name);
                    }
                } else if (
                    declaratorNode.init.type === 'Identifier' &&
                    (declaratorNode.init as IdentifierNode).name === 'localStorage'
                ) {
                    FORBIDDEN_STORAGE_OBJECT.push(declaratorNode.id.name);
                }
            }
        }

        return {
            'VariableDeclarator'(node: ASTNode): void {
                processVariableDeclarator(node);
            },
            'MemberExpression'(node: ASTNode): void {
                const memberExpressionNode = node as MemberExpressionNode;
                const calleePath = buildCalleePath(memberExpressionNode);
                const speciousObject = isForbiddenObviousApi(calleePath);

                if (
                    ((calleePath === 'localStorage' || calleePath === 'window.localStorage') &&
                        speciousObject === 'localStorage') ||
                    contains(FORBIDDEN_STORAGE_OBJECT, speciousObject)
                ) {
                    context.report({ node: node, messageId: 'localStorageUsage' });
                }
            }
        };
    }
};

export default rule;
