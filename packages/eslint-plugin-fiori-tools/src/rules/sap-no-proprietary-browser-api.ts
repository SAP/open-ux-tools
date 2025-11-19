/**
 * @file Detect some warning for usages of (window.)document APIs
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
            proprietaryBrowserApi: 'Proprietary Browser API access, use jQuery selector instead'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: any[] = [];
        const DOCUMENT_OBJECTS: any[] = [];
        const BODY_OBJECTS: any[] = [];
        const SCREEN_OBJECTS: any[] = [];
        const FORBIDDEN_WINDOW_PROPERTIES = ['innerWidth', 'innerHeight'];

        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------
        /**
         * Check if a node is of a specific type.
         *
         * @param node The AST node to check
         * @param type The type to check for
         * @returns True if the node is of the specified type
         */
        function isType(node: any, type: any) {
            return node?.type === type;
        }

        /**
         * Check if a node is an Identifier.
         *
         * @param node The AST node to check
         * @returns True if the node is an Identifier
         */
        function isIdentifier(node: any) {
            return isType(node, 'Identifier');
        }

        /**
         * Check if a node is a MemberExpression.
         *
         * @param node The AST node to check
         * @returns True if the node is a MemberExpression
         */
        function isMember(node: any) {
            return isType(node, 'MemberExpression');
        }

        /**
         * Check if an array contains a specific object.
         *
         * @param a The array to search in
         * @param obj The object to search for
         * @returns True if the array contains the object
         */
        function contains(a, obj) {
            return a.includes(obj);
        }

        /**
         * Check if a node represents the global window object.
         *
         * @param node The AST node to check
         * @returns True if the node represents the global window object
         */
        function isWindow(node: any) {
            // true if node is the global variable 'window'
            return node && isIdentifier(node) && node.name === 'window';
        }

        /**
         * Check if a node represents the window object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the window object or a reference to it
         */
        function isWindowObject(node: any) {
            // true if node is the global variable 'window' or a reference to it
            return isWindow(node) || (node && isIdentifier(node) && contains(WINDOW_OBJECTS, node.name));
        }

        /**
         * Check if a node represents the screen object.
         *
         * @param node The AST node to check
         * @returns True if the node represents the screen object
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
         * Check if a node represents the screen object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the screen object or a reference to it
         */
        function isScreenObject(node: any) {
            // true if node is the global variable 'screen'/'window.screen' or a reference to it
            return isScreen(node) || (node && isIdentifier(node) && contains(SCREEN_OBJECTS, node.name));
        }

        /**
         * Check if a node represents the document object.
         *
         * @param node The AST node to check
         * @returns True if the node represents the document object
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
         * Check if a node represents the document object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the document object or a reference to it
         */
        function isDocumentObject(node: any) {
            // true if node is the global variable 'document'/'window.document' or a reference to it
            return isDocument(node) || (node && isIdentifier(node) && contains(DOCUMENT_OBJECTS, node.name));
        }

        /**
         * Check if a node represents the document body.
         *
         * @param node The AST node to check
         * @returns True if the node represents the document body
         */
        function isBody(node: any) {
            if (node && isMember(node)) {
                return isDocumentObject(node.object) && isIdentifier(node.property) && node.property.name === 'body';
            }
            return false;
        }

        /**
         * Check if a node represents the body object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the body object or a reference to it
         */
        function isBodyObject(node: any) {
            return isBody(node) || (node && isIdentifier(node) && contains(BODY_OBJECTS, node.name));
        }

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         * Remember window object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if window object was remembered, false otherwise
         */
        function rememberWindow(left, right) {
            if (isWindowObject(right) && isIdentifier(left)) {
                WINDOW_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        /**
         * Remember screen object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if screen object was remembered, false otherwise
         */
        function rememberScreen(left, right) {
            if (isScreenObject(right) && isIdentifier(left)) {
                SCREEN_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        /**
         * Remember document object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if document object was remembered, false otherwise
         */
        function rememberDocument(left, right) {
            if (isDocumentObject(right) && isIdentifier(left)) {
                DOCUMENT_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        /**
         * Remember body object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @param parent The parent node for reporting violations
         * @returns True if body object was remembered, false otherwise
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
