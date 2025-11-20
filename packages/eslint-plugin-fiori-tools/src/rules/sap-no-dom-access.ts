/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { Rule } from 'eslint';
import {
    isIdentifier,
    contains,
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
            domAccess: 'Direct DOM access, use jQuery selector instead'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: string[] = [];
        const DOCUMENT_OBJECTS: string[] = [];
        const FORBIDDEN_DOCUMENT_METHODS = [
            'getElementById',
            'getElementsByClassName',
            'getElementsByName',
            'getElementsByTagName'
        ];

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
         * Check if a node represents an interesting DOM access.
         *
         * @param node The AST node to check
         * @returns True if the node represents an interesting DOM access
         */
        function isInteresting(node: any): boolean {
            return node && isDocumentObject(node.object);
        }

        /**
         * Check if a DOM access is valid (not forbidden).
         *
         * @param node The AST node to validate
         * @returns True if the DOM access is valid
         */
        function isValid(node: any): boolean {
            return !(isIdentifier(node.property) && contains(FORBIDDEN_DOCUMENT_METHODS, node.property.name));
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
                    context.report({ node: node, messageId: 'domAccess' });
                }
            }
        };
    }
};

export default rule;
