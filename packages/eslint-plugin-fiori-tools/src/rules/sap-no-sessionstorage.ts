/**
 * @file Detect usage of session storage
 * @ESLint			Version 0.14.0 / February 2015
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
            sessionStorageUsage:
                'For security reasons, the usage of session storage is not allowed in a Fiori application'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const FORBIDDEN_STORAGE_OBJECT: any[] = [];

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
            return node && node.type === type;
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
            for (let i = 0; i < a.length; i++) {
                if (obj === a[i]) {
                    return true;
                }
            }
            return false;
        }

        /**
         *
         * @param calleePath
         */
        function isForbiddenObviousApi(calleePath) {
            const elementArray = calleePath.split('.');
            const lastElement = elementArray[elementArray.length - 1];

            return lastElement;
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
                    if (firstElement + '.' + secondElement === 'window.sessionStorage') {
                        FORBIDDEN_STORAGE_OBJECT.push(node.id.name);
                    }
                } else if (node.init.type === 'Identifier' && node.init.name === 'sessionStorage') {
                    FORBIDDEN_STORAGE_OBJECT.push(node.id.name);
                }
            }
        }

        return {
            'VariableDeclarator': function (node) {
                processVariableDeclarator(node);
            },
            'MemberExpression': function (node) {
                const memberExpressionNode = node;
                const calleePath = buildCalleePath(memberExpressionNode);
                const speciousObject = isForbiddenObviousApi(calleePath);

                if (
                    (calleePath === 'sessionStorage' || calleePath === 'window.sessionStorage') &&
                    speciousObject === 'sessionStorage'
                ) {
                    context.report({ node: node, messageId: 'sessionStorageUsage' });
                } else if (contains(FORBIDDEN_STORAGE_OBJECT, speciousObject)) {
                    context.report({ node: node, messageId: 'sessionStorageUsage' });
                }
            }
        };
    }
};

export default rule;
