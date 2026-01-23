/**
 * @file Detect direct DOM insertion
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import { type ASTNode, asCallExpression, asMemberExpression, asIdentifier } from '../utils/helpers';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: RuleDefinition = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            domInsertion: 'Direct DOM insertion is forbidden!'
        },
        schema: []
    },
    create(context: RuleContext) {
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
        const FORBIDDEN_METHODS = new Set([...FORBIDDEN_DOM_INSERTION, ...FORBIDDEN_DOM_JQUERY_INSERTION]);

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Process DOM insertion calls and report violations.
         *
         * @param node The call expression node to process
         */
        function processDomInsertion(node: ASTNode): void {
            const callExpr = asCallExpression(node);
            if (!callExpr) {
                return;
            }
            const memberCallee = asMemberExpression(callExpr.callee);
            if (memberCallee) {
                const identProp = asIdentifier(memberCallee.property);
                if (identProp && FORBIDDEN_METHODS.has(identProp.name)) {
                    context.report({ node: node, messageId: 'domInsertion' });
                }
            }
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'CallExpression': function (node): void {
                processDomInsertion(node);
            }
        };
    }
};

export default rule;
