/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { Rule } from 'eslint';
import {
    isIdentifier,
    createIsWindowObject,
    createIsLocation,
    createIsLocationObject,
    createRememberLocation
} from '../utils/helpers';

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
            locationOverride: 'Writing to location is not allowed. Please consider using sap.m.URLHelper instead.',
            locationAssign: 'Usage of location.assign()'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: string[] = [];
        const LOCATION_OBJECTS: string[] = [];

        // Initialize factory functions
        const isWindowObject = createIsWindowObject(WINDOW_OBJECTS);
        const isLocation = createIsLocation(isWindowObject);
        const isLocationObject = createIsLocationObject(LOCATION_OBJECTS, isLocation);
        const rememberLocation = createRememberLocation(LOCATION_OBJECTS, isLocationObject);

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Check assignment expressions against location override violations.
         *
         * @param node The assignment expression node to check
         */
        function checkAssignmentAgainstOverride(node: any): void {
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
         * Process member expressions for location.assign violations.
         *
         * @param node The member expression node to process
         */
        function processMemberExpression(node: any): void {
            if (isLocationObject(node.object) && node.property.name === 'assign') {
                context.report({ node: node, messageId: 'locationAssign' });
            }
        }

        /**
         * Remember window object assignments for tracking references.
         *
         * @param left The left-hand side of the assignment
         * @param right The right-hand side of the assignment
         * @returns True if window object was remembered, false otherwise
         */
        function rememberWindow(left: any, right: any): boolean {
            if (isWindowObject(right) && isIdentifier(left)) {
                WINDOW_OBJECTS.push((left as any).name);
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
            'AssignmentExpression': checkAssignmentAgainstOverride,
            'MemberExpression': processMemberExpression
        };
    }
};

export default rule;
