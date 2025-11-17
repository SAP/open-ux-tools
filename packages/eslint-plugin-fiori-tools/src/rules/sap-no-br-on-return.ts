/**
 * @file Detect the usage of document.queryCommandSupported with 'insertBrOnReturn' argument
 * @ESLint Version 0.26.0
 */

import type { Rule } from 'eslint';

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
        const WINDOW_OBJECTS: any[] = [];
        const DOCUMENT_OBJECTS: any[] = [];

        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param node
         * @param type
         */
        function isType(node: any, type: any) {
            return node && node.type === type;
        }

        /**
         *
         * @param node
         */
        function isIdentifier(node: any) {
            return isType(node, 'Identifier');
        }

        /**
         *
         * @param node
         */
        function isLiteral(node: any) {
            return isType(node, 'Literal');
        }

        /**
         *
         * @param node
         */
        function isMember(node: any) {
            return isType(node, 'MemberExpression');
        }

        /**
         *
         * @param node
         */
        function isCall(node: any) {
            return isType(node, 'CallExpression');
        }

        /**
         *
         * @param a
         * @param obj
         */
        function contains(a, obj) {
            for (let i = 0; i < a.length; i++) {
                if (obj === a[i]) {
                    return true;
                }
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isWindow(node: any) {
            // true if node is the global variable 'window'
            return node && isIdentifier(node) && node.name === 'window';
        }

        /**
         *
         * @param node
         */
        function isWindowObject(node: any) {
            // true if node is the global variable 'window' or a reference to it
            return isWindow(node) || (node && isIdentifier(node) && contains(WINDOW_OBJECTS, node.name));
        }

        /**
         *
         * @param node
         */
        function isDocument(node: any) {
            if (node) {
                if (isIdentifier(node)) {
                    // true if node id the global variable 'document'
                    return node.name === 'document';
                } else if (isMember(node)) {
                    // true if node id the global variable 'window.document' or '<windowReference>.document'
                    return isWindowObject(node.object) && isDocument(node.property);
                }
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isDocumentObject(node: any) {
            // true if node is the global variable 'document'/'window.document' or a reference to it
            return isDocument(node) || (node && isIdentifier(node) && contains(DOCUMENT_OBJECTS, node.name));
        }

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param left
         * @param right
         */
        function rememberWindow(left, right) {
            if (isWindowObject(right) && isIdentifier(left)) {
                WINDOW_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        /**
         *
         * @param left
         * @param right
         */
        function rememberDocument(left, right) {
            if (isDocumentObject(right) && isIdentifier(left)) {
                DOCUMENT_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        /**
         *
         * @param node
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
         *
         * @param node
         */
        function isValid(node: any) {
            return node.parent.arguments.length === 0 || node.parent.arguments[0].value !== 'insertBrOnReturn';
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
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'insertBrOnReturn' });
                }
            }
        };
    }
};

export default rule;
