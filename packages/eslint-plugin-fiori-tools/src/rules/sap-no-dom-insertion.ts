/**
 * @file Detect direct DOM insertion
 */

import type { Rule } from 'eslint';
import { type ASTNode } from '../utils/helpers';

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * Check if a node is of a specific type.
 *
 * @param node The AST node to check
 * @param type The type to check for
 * @returns True if the node is of the specified type
 */
function isType(node: ASTNode | undefined, type: string): boolean {
    return node?.type === type;
}

/**
 * Check if a node is an Identifier.
 *
 * @param node The AST node to check
 * @returns True if the node is an Identifier
 */
function isIdentifier(node: ASTNode | undefined): boolean {
    return isType(node, 'Identifier');
}

/**
 * Check if a node is a MemberExpression.
 *
 * @param node The AST node to check
 * @returns True if the node is a MemberExpression
 */
function isMember(node: ASTNode | undefined): boolean {
    return isType(node, 'MemberExpression');
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: Rule.RuleModule = {
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
            const callee = (node as any).callee;
            if (isMember(callee)) {
                if (isIdentifier(callee.property) && 'name' in callee.property) {
                    if (FORBIDDEN_METHODS.has(callee.property.name)) {
                        context.report({ node: node, messageId: 'domInsertion' });
                    }
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
