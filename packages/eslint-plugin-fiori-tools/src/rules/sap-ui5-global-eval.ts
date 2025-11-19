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
            globalEval: 'Usage of globalEval() / eval() is not allowed due to strict Content Security Policy.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const INTERESTING_METHODS_JQUERY = ['globalEval'];

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
        function isMember(node: Rule.Node | undefined): boolean {
            return isType(node, 'MemberExpression');
        }

        /**
         *
         * @param a
         * @param obj
         */
        function contains(a: string[], obj: string): boolean {
            return a.includes(obj);
        }

        /**
         *
         * @param node
         */
        function isInteresting(node: Rule.Node): boolean {
            const callNode = node as unknown as { callee: Rule.Node };
            const callee = callNode.callee;
            if (isMember(callee)) {
                const memberNode = callee as unknown as { property: Rule.Node };
                const identifierProp = memberNode.property as unknown as { name: string };
                if (isIdentifier(memberNode.property) && contains(INTERESTING_METHODS_JQUERY, identifierProp.name)) {
                    return true;
                }
            }
            return false;
        }

        return {
            'CallExpression': function (node: Rule.Node) {
                if (isInteresting(node)) {
                    context.report({ node: node, messageId: 'globalEval' });
                }
            }
        };
    }
};

export default rule;
