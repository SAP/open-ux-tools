/**
 * @file detects override of storage prototype
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
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
            overrideStoragePrototype:
                'Storage prototype should not be overridden as this can lead to unpredictable errors'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const FORBIDDEN_STR_OBJECT: any[] = [];
        const MEMBER = 'MemberExpression',
            IDENTIFIER = 'Identifier';

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         *
         * @param node
         * @param type
         */
        function isType(node: any, type: any) {
            return node?.type === type;
        }
        /**
         *
         * @param node
         */
        function isIdentifier(node: any) {
            return isType(node, IDENTIFIER);
        }
        /**
         *
         * @param node
         */
        function isMember(node: any) {
            return isType(node, MEMBER);
        }

        /**
         *
         * @param node
         */
        function buildCalleePath(node: any) {
            if (isMember(node.object)) {
                return buildCalleePath(node.object) + '.' + node.object.property.name;
            } else if (isIdentifier(node.object)) {
                return node.object.name;
            }
            return '';
        }

        /**
         *
         * @param a
         * @param obj
         */
        function contains(a, obj) {
            return a.includes(obj);
        }

        /**
         *
         * @param node
         */
        function checkAssignmentAgainstOverride(node: any) {
            if (node.left.type === 'MemberExpression' && node.right.type === 'FunctionExpression') {
                const memberExpression = node.left;

                const calleePath = buildCalleePath(memberExpression);

                if (calleePath === 'Storage.prototype' || contains(FORBIDDEN_STR_OBJECT, calleePath)) {
                    context.report({
                        node: node,
                        messageId: 'overrideStoragePrototype'
                    });
                }
            }
        }

        /**
         *
         * @param node
         */
        function processVariableDeclarator(node: any) {
            if (node.init) {
                if (node.init.type === 'MemberExpression') {
                    const firstElement = node.init.object.name,
                        secondElement = node.init.property.name;

                    if (firstElement + '.' + secondElement === 'Storage.prototype') {
                        FORBIDDEN_STR_OBJECT.push(node.id.name);
                    }
                }
            }
        }

        return {
            'VariableDeclarator': function (node) {
                processVariableDeclarator(node);
            },
            'AssignmentExpression': function (node) {
                checkAssignmentAgainstOverride(node);
            }
        };
    }
};

export default rule;
