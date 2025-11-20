/**
 * @file Detect usage of execCommand
 */

import type { Rule } from 'eslint';
import {
    isIdentifier,
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
            execCommand: 'Direct DOM Manipulation, better to use jQuery.appendTo if really needed'
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
                if (
                    isDocumentObject(node.object) &&
                    ((isIdentifier(node.property) && 'name' in node.property && node.property.name === 'execCommand') ||
                        (isLiteral(node.property) && 'value' in node.property && node.property.value === 'execCommand'))
                ) {
                    context.report({ node: node, messageId: 'execCommand' });
                }
            }
        };
    }
};

export default rule;
