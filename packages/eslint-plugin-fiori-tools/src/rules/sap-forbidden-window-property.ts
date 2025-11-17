/**
 * @file Detect the definition of global properties in the window object
 * @ESLint Version 0.24.0
 */

import type { Rule } from 'eslint';

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
            forbiddenWindowProperty: 'Usage of a forbidden window property.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: string[] = [];
        const FORBIDDEN_PROPERTIES = ['top', 'addEventListener'];

        // --------------------------------------------------------------------------
        // Basic Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param node
         * @param type
         */
        function isType(node: Rule.Node | undefined, type: string): boolean {
            return node?.type === type;
        }

        /**
         *
         * @param node
         */
        function isIdentifier(node: Rule.Node | undefined): boolean {
            return isType(node, 'Identifier');
        }

        /**
         *
         * @param node
         */
        function isLiteral(node: Rule.Node | undefined): boolean {
            return isType(node, 'Literal');
        }

        /**
         *
         * @param node
         */
        function isMember(node: Rule.Node | undefined): boolean {
            return isType(node, 'MemberExpression');
        }

        /**
         *
         * @param node
         */
        function isWindow(node: Rule.Node | undefined): boolean {
            // true if node is the global variable 'window'
            return !!(isIdentifier(node) && node && 'name' in node && node.name === 'window');
        }

        /**
         *
         * @param node
         */
        function isWindowObject(node: Rule.Node | undefined): boolean {
            // true if node is the global variable 'window' or a reference to it
            return !!(
                isWindow(node) ||
                (node && isIdentifier(node) && 'name' in node && WINDOW_OBJECTS.includes(node.name))
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
        function rememberWindow(left: Rule.Node, right: Rule.Node): boolean {
            if (isWindowObject(right) && isIdentifier(left) && 'name' in left) {
                WINDOW_OBJECTS.push(left.name);
                return true;
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isInteresting(node: Rule.Node): boolean {
            return isMember(node) && isWindowObject((node as any).object);
        }

        /**
         *
         * @param node
         */
        function isValid(node: Rule.Node): boolean {
            let method = '';

            if (isIdentifier((node as any).property) && 'name' in (node as any).property) {
                method = (node as any).property.name;
            }

            if (isLiteral((node as any).property) && 'value' in (node as any).property) {
                method = (node as any).property.value;
            }
            return !FORBIDDEN_PROPERTIES.includes(method);
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node) {
                return rememberWindow((node as any).id, (node as any).init);
            },
            'AssignmentExpression': function (node) {
                return rememberWindow((node as any).left, (node as any).right);
            },
            'MemberExpression': function (node) {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'forbiddenWindowProperty' });
                }
            }
        };
    }
};

export default rule;
