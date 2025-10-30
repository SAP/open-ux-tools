/**
 * @file Detect some warning for usages of (window.)document APIs
 * @ESLint Version 0.14.0 / February 2016
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
            locationOverride: 'Writing to location is not allowed. Please consider using sap.m.URLHelper instead.',
            locationAssign: 'Usage of location.assign()'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        'use strict';
        const WINDOW_OBJECTS: any[] = [];
        const LOCATION_OBJECTS: any[] = [];
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
            return isIdentifier(node) && node.name === 'window';
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
            if (isIdentifier(node)) {
                // true if node id the global variable 'location'
                return node.name === 'location';
            } else if (isMember(node)) {
                // true if node id the global variable 'window.location' or '<windowReference>.location'
                return isWindowObject(node.object) && isLocation(node.property);
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isLocationObject(node: any) {
            // true if node is the global variable 'location'/'window.location' or a reference to it
            return isLocation(node) || (isIdentifier(node) && contains(LOCATION_OBJECTS, node.name));
        }

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         *
         * @param node
         */
        function checkAssignmentAgainstOverride(node: any) {
            const identifier = node.left;
            if (
                isLocation(identifier) || // location = * || window.location = *
                isLocationObject(identifier.object)
            ) {
                // location.* = || window.location.* = || const l = location; l.* =
                context.report({ node: node, messageId: 'locationOverride' });
            }
        }

        /**
         *
         * @param node
         */
        function processMemberExpression(node: any) {
            if (isLocationObject(node.object) && node.property.name === 'assign') {
                context.report({ node: node, messageId: 'locationAssign' });
            }
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
        function rememberLocation(left, right) {
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
            'AssignmentExpression': checkAssignmentAgainstOverride,
            'MemberExpression': processMemberExpression
        };
    }
};

export default rule;
