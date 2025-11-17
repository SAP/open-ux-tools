/**
 * @file Detect usage of document.styleSheets
 * @ESLint Version 0.24.0
 */

import type { Rule } from 'eslint';
import {
    isIdentifier,
    isMember,
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
            dynamicStyleInsertion: 'Dynamic style insertion, use library CSS or lessifier instead'
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
         *
         * @param node
         */
        function isInteresting(node: any): boolean {
            if (isMember(node) && isMember(node.object) && isDocumentObject(node.object.object)) {
                const prop = node.object.property;
                if (isIdentifier(prop) && (prop as any).name === 'styleSheets') {
                    return true;
                }
                if (isLiteral(prop) && (prop as any).value === 'styleSheets') {
                    return true;
                }
            }
            return false;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node) {
                return rememberWindow(node.id, node.init) || rememberDocument(node.id, node.init);
            },
            'AssignmentExpression': function (node) {
                return rememberWindow(node.left, node.right) || rememberDocument(node.left, node.right);
            },
            'MemberExpression': function (node) {
                if (isInteresting(node)) {
                    context.report({ node: node, messageId: 'dynamicStyleInsertion' });
                }
            }
        };
    }
};

export default rule;
