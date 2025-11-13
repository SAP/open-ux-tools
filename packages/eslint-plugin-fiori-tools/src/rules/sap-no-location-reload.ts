/**
 * @file Detect some warning for usages of (window.)document APIs
 * @ESLint          Version 0.14.0 / February 2015
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

/*eslint-disable strict*/
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
         *
         * @param node
         */
        function isLocationObject(node: any) {
            // true if node is the global variable 'location'/'window.location' or a reference to it
            return isLocation(node) || (node && isIdentifier(node) && contains(LOCATION_OBJECTS, node.name));
        }

        /**
         *
         * @param node
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
         *
         */
        function isValid() {
            //        const args = node.arguments;
            //        return args
            //                && (args.length === 1 || args.length > 1
            //                        && (args[1].value === 0 || args[1].value === "0"));
            return false;
        }

        /**
         *
         * @param left
         * @param right
         */
        function rememberWindow(left: any, right: any): boolean {
            if (isWindow(right) && isIdentifier(left)) {
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
            'VariableDeclarator': function (node) {
                return rememberWindow(node.id, node.init) || rememberLocation(node.id, node.init);
            },
            'AssignmentExpression': function (node) {
                return rememberWindow(node.left, node.right) || rememberLocation(node.left, node.right);
            },
            'CallExpression': function (node) {
                if (isInteresting(node) && !isValid()) {
                    context.report({ node: node, messageId: 'locationReload' });
                }
            }
        };
    }
};

export default rule;
