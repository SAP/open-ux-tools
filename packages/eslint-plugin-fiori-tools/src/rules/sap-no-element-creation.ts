/**
 * @file Detect direct DOM insertion
 */

import type { Rule } from 'eslint';
import {
    isIdentifier,
    isCall,
    isLiteral,
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
            elementCreation: 'Direct element creation, create a custom control instead'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: string[] = [];
        const DOCUMENT_OBJECTS: string[] = [];
        const FORBIDDEN_DOM_INSERTION = [
            'createElement',
            'createTextNode',
            'createElementNS',
            'createDocumentFragment',
            'createComment',
            'createAttribute',
            'createEvent'
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
         * Check if a node represents an interesting element creation call.
         *
         * @param node The AST node to check
         * @returns True if the node represents an interesting element creation call
         */
        function isInteresting(node: any) {
            return node && isCall(node.parent) && isDocumentObject(node.object);
        }

        /**
         * Check if an element creation call is valid (not forbidden).
         *
         * @param node The AST node to validate
         * @returns True if the element creation call is valid
         */
        function isValid(node: any) {
            let methodName: any = false;

            if (isIdentifier(node.property)) {
                methodName = node.property.name;
            } else if (isLiteral(node.property)) {
                methodName = node.property.value;
            }
            return (
                methodName &&
                (!contains(FORBIDDEN_DOM_INSERTION, methodName) ||
                    (methodName === 'createElement' &&
                        isCall(node.parent) &&
                        node.parent.arguments &&
                        node.parent.arguments.length > 0 &&
                        isLiteral(node.parent.arguments[0]) &&
                        node.parent.arguments[0].value === 'a'))
            );
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
                    context.report({ node: node, messageId: 'elementCreation' });
                }
            }
        };
    }
};

export default rule;
