// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

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
            legacyJquerysapUsage: 'Legacy jQuery.sap usage is not allowed due to strict Content Security Policy.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const INTERESTING_METHODS_JQUERY = ['require', 'declare'];

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
        function isInteresting(node: any) {
            const callee = node.callee;
            if (isMember(callee)) {
                if (isIdentifier(callee.property) && contains(INTERESTING_METHODS_JQUERY, callee.property.name)) {
                    if (isMember(callee.object) && callee.object.property.name == 'sap') {
                        if (
                            isIdentifier(callee.object.object) &&
                            (callee.object.object.name == 'jQuery' || callee.object.object.name == '$')
                        ) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        return {
            'CallExpression': function (node) {
                if (isInteresting(node)) {
                    context.report({ node: node, messageId: 'legacyJquerysapUsage' });
                }
            }
        };
    }
};

export default rule;
