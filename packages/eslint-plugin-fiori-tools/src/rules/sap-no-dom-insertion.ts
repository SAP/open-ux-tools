/**
 * @file Detect direct DOM insertion
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
            domInsertion: 'Direct DOM insertion is forbidden!'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const FORBIDDEN_DOM_INSERTION = ['insertBefore', 'appendChild', 'replaceChild'],
            FORBIDDEN_DOM_JQUERY_INSERTION = [
                'after',
                'before',
                'insertAfter',
                'insertBefore',
                'append',
                'prepend',
                'appendTo',
                'prependTo'
            ];
        const FORBIDDEN_METHODS: string[] = ([] as string[]).concat(
            FORBIDDEN_DOM_INSERTION,
            FORBIDDEN_DOM_JQUERY_INSERTION
        );

        // --------------------------------------------------------------------------
        // Helpers
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
         * @param node
         */
        function processDomInsertion(node: Rule.Node): void {
            const callee = (node as any).callee;
            if (isMember(callee)) {
                if (isIdentifier(callee.property) && 'name' in callee.property) {
                    if (FORBIDDEN_METHODS.includes(callee.property.name)) {
                        context.report({ node: node, messageId: 'domInsertion' });
                    }
                }
            }
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'CallExpression': function (node) {
                processDomInsertion(node);
            }
        };
    }
};

export default rule;
