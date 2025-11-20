/**
 * @file flag global variable declaration
 */

import type { Rule, Scope } from 'eslint';
import { type ASTNode } from '../utils/ast-helpers';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'disallow global variable declarations',
            category: 'Best Practices',
            recommended: true
        },
        fixable: undefined,
        schema: [],
        messages: {
            globalVariableNotAllowed: "Global variable '{{name}}' is not allowed"
        }
    },

    create(context: Rule.RuleContext) {
        const ALLOWED_VARIABLES = ['undefined', 'NaN', 'arguments', 'PDFJS', 'console', 'Infinity'];

        //--------------------------------------------------------------------------
        // Helpers
        //--------------------------------------------------------------------------

        /**
         * Check if an array contains a specific item.
         *
         * @param array The array to search in
         * @param item The item to search for
         * @returns True if the array contains the item, false otherwise
         */
        function contains(array: string[], item: string): boolean {
            return array.includes(item);
        }

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        return {
            VariableDeclaration(node: ASTNode) {
                const sourceCode = context.sourceCode ?? context.getSourceCode();
                const scope: Scope.Scope = sourceCode.getScope
                    ? sourceCode.getScope(node)
                    : (context as any).getScope();

                // Check if this is a global/module scope variable declaration
                if (scope.type === 'global' || scope.type === 'module') {
                    (node as any).declarations.forEach((declaration: any) => {
                        if (declaration.id?.type === 'Identifier') {
                            const name = declaration.id.name;
                            if (!contains(ALLOWED_VARIABLES, name)) {
                                context.report({
                                    node: declaration.id,
                                    messageId: 'globalVariableNotAllowed',
                                    data: { name }
                                });
                            }
                        }
                    });
                }
            }
        };
    }
};

export default rule;
