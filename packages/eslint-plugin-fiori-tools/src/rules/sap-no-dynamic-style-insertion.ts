/**
 * @file Detect usage of document.styleSheets
 * @ESLint Version 0.24.0
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
            dynamicStyleInsertion: 'Dynamic style insertion, use library CSS or lessifier instead'
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
         * @param value
         */
        function isIdentifier(node: any, value: any) {
            return isType(node, 'Identifier') && (!value || node.name === value);
        }

        /**
         *
         * @param node
         * @param value
         */
        function isLiteral(node: any, value: any) {
            return isType(node, 'Literal') && (!value || node.value === value);
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
         * @param a
         * @param obj
         */
        function contains(a: any[], obj: any): boolean {
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
        function isWindow(node: any): boolean {
            // true if node is the global variable 'window'
            return node && isIdentifier(node, 'window');
        }

        /**
         *
         * @param node
         */
        function isWindowObject(node: any) {
            // true if node is the global variable 'window' or a reference to it
            return (
                isWindow(node) ||
                (node && isIdentifier(node, null) && 'name' in node && contains(WINDOW_OBJECTS, node.name))
            );
        }

        /**
         *
         * @param node
         */
        function isDocument(node: any): boolean {
            if (node) {
                if (isIdentifier(node, 'document')) {
                    // true if node id the global variable 'document'
                    return true;
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
            return (
                isDocument(node) ||
                (node && isIdentifier(node, null) && 'name' in node && contains(DOCUMENT_OBJECTS, node.name))
            );
        }

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param left
         * @param right
         */
        function rememberWindow(left: any, right: any): boolean {
            if (isWindowObject(right) && isIdentifier(left, null)) {
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
        function rememberDocument(left: any, right: any): boolean {
            if (isDocumentObject(right) && isIdentifier(left, null)) {
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
            if (
                isMember(node) &&
                isMember(node.object) &&
                isDocumentObject(node.object.object) &&
                (isIdentifier(node.object.property, 'styleSheets') || isLiteral(node.object.property, 'styleSheets'))
            ) {
                return true;
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
