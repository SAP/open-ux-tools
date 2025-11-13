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
            proprietaryBrowserApi: 'Proprietary Browser API access, use jQuery selector instead'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        'use strict';
        const WINDOW_OBJECTS: any[] = [];
        const DOCUMENT_OBJECTS: any[] = [];
        const BODY_OBJECTS: any[] = [];
        const SCREEN_OBJECTS: any[] = [];
        const FORBIDDEN_WINDOW_PROPERTIES = ['innerWidth', 'innerHeight'];

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
        function isScreen(node: any) {
            //        console.log("isScreen");
            if (node) {
                if (isIdentifier(node)) {
                    // true if node id the global variable 'screen' console.log("identifier");
                    return node.name === 'screen';
                } else if (isMember(node)) {
                    // true if node id the global variable 'window.document' or '<windowReference>.document' console.log("member");
                    return isWindowObject(node.object) && isScreen(node.property);
                }
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isScreenObject(node: any) {
            // true if node is the global variable 'screen'/'window.screen' or a reference to it
            return isScreen(node) || (node && isIdentifier(node) && contains(SCREEN_OBJECTS, node.name));
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

        /**
         *
         * @param node
         */
        function isBody(node: any) {
            if (node && isMember(node)) {
                return isDocumentObject(node.object) && isIdentifier(node.property) && node.property.name === 'body';
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isBodyObject(node: any) {
            return isBody(node) || (node && isIdentifier(node) && contains(BODY_OBJECTS, node.name));
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
        function rememberScreen(left, right) {
            if (isScreenObject(right) && isIdentifier(left)) {
                SCREEN_OBJECTS.push(left.name);
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
         * @param left
         * @param right
         * @param parent
         */
        function rememberBody(left, right, parent) {
            if (isBodyObject(right) && isIdentifier(left)) {
                BODY_OBJECTS.push(left.name);
                // raise an issue if the the body property is assigned to a variable
                context.report({ node: parent, messageId: 'proprietaryBrowserApi' });
                return true;
            }
            return false;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node) {
                return (
                    rememberWindow(node.id, node.init) ||
                    rememberScreen(node.id, node.init) ||
                    rememberDocument(node.id, node.init) ||
                    rememberBody(node.id, node.init, node)
                );
            },
            'AssignmentExpression': function (node) {
                return (
                    rememberWindow(node.left, node.right) ||
                    rememberScreen(node.left, node.right) ||
                    rememberDocument(node.left, node.right) ||
                    rememberBody(node.left, node.right, node)
                );
            },
            'MemberExpression': function (node) {
                if (isBodyObject(node.object)) {
                    // report if there is any call of a document.body child (e.g. document.body.appendChild())
                    context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                } else if (isScreenObject(node.object)) {
                    // report if there is any call of a window.screen child (e.g. window.screen.appendChild())
                    context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                } else if (isWindowObject(node.object)) {
                    if (
                        isIdentifier(node.property) &&
                        'name' in node.property &&
                        contains(FORBIDDEN_WINDOW_PROPERTIES, node.property.name)
                    ) {
                        context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                    }
                }
            }
        };
    }
};

export default rule;
