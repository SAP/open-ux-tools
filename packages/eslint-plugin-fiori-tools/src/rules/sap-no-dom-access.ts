/**
 * @file Detect some warning for usages of (window.)document APIs
 * @ESLint          Version 0.14.0 / February 2015
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------
/*eslint-disable strict*/
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
        'use strict';
        const WINDOW_OBJECTS: any[] = [];
        const DOCUMENT_OBJECTS: any[] = [];
        const FORBIDDEN_DOCUMENT_METHODS = [
            'getElementById',
            'getElementsByClassName',
            'getElementsByName',
            'getElementsByTagName'
        ];

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
        function isMember(node: any) {
            return isType(node, 'MemberExpression');
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
            return node && isDocumentObject(node.object);
        }

        /**
         *
         * @param node
         */
        function isValid(node: any) {
            return !(isIdentifier(node.property) && contains(FORBIDDEN_DOCUMENT_METHODS, node.property.name));
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
                    context.report({ node: node, messageId: 'domAccess' });
                }
            }
        };
    }
};

export default rule;
