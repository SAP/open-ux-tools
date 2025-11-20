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
        function isInteresting(node: ASTNode): boolean {
            return node && isCall((node as any).parent) && isDocumentObject((node as any).object);
        }

        /**
         * Check if an element creation call is valid (not forbidden).
         *
         * @param node The AST node to validate
         * @returns True if the element creation call is valid
         */
        function isValid(node: ASTNode): boolean {
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
                    context.report({ node: node, messageId: 'elementCreation' });
                }
            }
        };
    }
};

export default rule;
