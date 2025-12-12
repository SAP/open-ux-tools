/**
 * @file Detect the usage of document.queryCommandSupported with 'insertBrOnReturn' argument
 */

import type { Rule } from 'eslint';
import {
    type ASTNode,
    isIdentifier,
    isCall,
    isLiteral,
    createIsWindowObject,
    createRememberWindow,
    createIsDocument,
    createIsDocumentObject,
    createRememberDocument
} from '../utils/helpers';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
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
            insertBrOnReturn:
                "insertBrOnReturn is not allowed since it is a Mozilla specific method, other browsers don't support that."
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: string[] = [];
        const DOCUMENT_OBJECTS: string[] = [];

        // Initialize factory functions
        const isWindowObject = createIsWindowObject(WINDOW_OBJECTS);
        const rememberWindow = createRememberWindow(WINDOW_OBJECTS, isWindowObject);
        const isDocument = createIsDocument(isWindowObject);
        const isDocumentObject = createIsDocumentObject(DOCUMENT_OBJECTS, isDocument);
        const rememberDocument = createRememberDocument(DOCUMENT_OBJECTS, isDocumentObject);

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a node represents an interesting queryCommandSupported call.
         *
         * @param node The AST node to check
         * @returns True if the node represents an interesting queryCommandSupported call
         */
        function isInteresting(node: ASTNode): boolean {
            return (
                isCall((node as any).parent) &&
                isDocumentObject((node as any).object) &&
                ((isIdentifier((node as any).property) && (node as any).property.name === 'queryCommandSupported') ||
                    (isLiteral((node as any).property) && (node as any).property.value === 'queryCommandSupported'))
            );
        }

        /**
         * Check if a queryCommandSupported call is valid (not checking for insertBrOnReturn).
         *
         * @param node The AST node to validate
         * @returns True if the queryCommandSupported call is valid
         */
        function isValid(node: ASTNode): boolean {
            return (
                (node as any).parent.arguments.length === 0 ||
                (node as any).parent.arguments[0].value !== 'insertBrOnReturn'
            );
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator'(node: ASTNode): boolean {
                return (
                    rememberWindow((node as any).id, (node as any).init) ||
                    rememberDocument((node as any).id, (node as any).init)
                );
            },
            'AssignmentExpression'(node: ASTNode): boolean {
                return (
                    rememberWindow((node as any).left, (node as any).right) ||
                    rememberDocument((node as any).left, (node as any).right)
                );
            },
            'MemberExpression'(node: ASTNode): void {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'insertBrOnReturn' });
                }
            }
        };
    }
};

export default rule;
