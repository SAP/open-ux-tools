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
            locationReload: 'location.reload() is not permitted.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: any[] = [];
        const LOCATION_OBJECTS: any[] = [];
        // --------------------------------------------------------------------------
        // Helpers
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
         * Check if a node represents the location object.
         *
         * @param node The AST node to check
         * @returns True if the node represents the location object
         */
        function isLocation(node: any) {
            if (node) {
                if (isIdentifier(node)) {
                    // true if node id the global variable 'location'
                    return node.name === 'location';
                } else if (isMember(node)) {
                    // true if node id the global variable 'window.location' or '<windowReference>.location'
                    return isWindowObject(node.object) && isLocation(node.property);
                }
            }
            return false;
        }

        /**
         * Check if a node represents the location object or a reference to it.
         *
         * @param node The AST node to check
         * @returns True if the node represents the location object or a reference to it
         */
        function isLocationObject(node: any) {
            // true if node is the global variable 'location'/'window.location' or a reference to it
            return isLocation(node) || (node && isIdentifier(node) && contains(LOCATION_OBJECTS, node.name));
        }

        /**
         * Check if a call expression is interesting for location reload detection.
         *
         * @param node The call expression node to check
         * @returns True if the call expression is interesting for location reload detection
         */
        function isInteresting(node: any) {
            const obj = node.callee;
            if (isMember(obj)) {
                if (isLocationObject(obj.object)) {
                    // is member expression on location, check property
                    return isIdentifier(obj.property) && obj.property.name === 'reload';
                } else {
                    // no call on location
                    return false;
                }
            }
            return false;
        }

        /**
         * Check if a location reload call is valid.
         *
         * @returns Always returns false as location.reload() is not permitted
         */
        function isValid() {
            //        const args = node.arguments;
            //        return args
            //                && (args.length === 1 || args.length > 1
            //                        && (args[1].value === 0 || args[1].value === "0"));
            return false;
        }

        /**
         * Remember window object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if window object was remembered, false otherwise
         */
        function rememberWindow(left: any, right: any): boolean {
            if (isWindow(right) && isIdentifier(left)) {
                WINDOW_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        /**
         * Remember location object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if location object was remembered, false otherwise
         */
        function rememberLocation(left: any, right: any): boolean {
            if (isLocationObject(right) && isIdentifier(left)) {
                LOCATION_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node): boolean {
                return rememberWindow(node.id, node.init) || rememberLocation(node.id, node.init);
            },
            'AssignmentExpression': function (node): boolean {
                return rememberWindow(node.left, node.right) || rememberLocation(node.left, node.right);
            },
            'CallExpression': function (node): void {
                if (isInteresting(node) && !isValid()) {
                    context.report({ node: node, messageId: 'locationReload' });
                }
            }
        };
    }
};

export default rule;
