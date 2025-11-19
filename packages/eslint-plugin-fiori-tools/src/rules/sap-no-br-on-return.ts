/**
 * @file Detect the usage of document.queryCommandSupported with 'insertBrOnReturn' argument
 */

import type { Rule } from 'eslint';
import {
    isIdentifier,
    isCall,
    isLiteral,
    createIsWindowObject,
    createRememberWindow,
    createIsDocument,
    createIsDocumentObject,
    createRememberDocument
} from '../utils/ast-helpers';

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
            description: 'Fiori custom ESLint rule',
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
        function isInteresting(node: any) {
            return (
                isCall(node.parent) &&
                isDocumentObject(node.object) &&
                ((isIdentifier(node.property) && node.property.name === 'queryCommandSupported') ||
                    (isLiteral(node.property) && node.property.value === 'queryCommandSupported'))
            );
        }

        /**
         * Check if a queryCommandSupported call is valid (not checking for insertBrOnReturn).
         *
         * @param node The AST node to validate
         * @returns True if the queryCommandSupported call is valid
         */
        function isValid(node: any) {
            return node.parent.arguments.length === 0 || node.parent.arguments[0].value !== 'insertBrOnReturn';
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node): boolean {
                return rememberWindow(node.id, node.init) || rememberDocument(node.id, node.init);
            },
            'AssignmentExpression': function (node): boolean {
                return rememberWindow(node.left, node.right) || rememberDocument(node.left, node.right);
            },
            'MemberExpression': function (node): void {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'insertBrOnReturn' });
                }
            }
        };
    }
};

export default rule;
