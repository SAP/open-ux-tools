/**
 * @file flag global variable declaration
 */
import type { RuleDefinition, RuleContext } from '@eslint/core';
import { type ASTNode, asVariableDeclaration } from '../utils/helpers';

//------------------------------------------------------------------------------
// Helper Functions
//------------------------------------------------------------------------------

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

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const rule: RuleDefinition = {
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

    create(context: RuleContext) {
        const ALLOWED_VARIABLES = ['undefined', 'NaN', 'arguments', 'PDFJS', 'console', 'Infinity'];

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        return {
            VariableDeclaration(node: ASTNode) {
                const sourceCode = context.sourceCode;
                const scope = (sourceCode as any).getScope(node);

                // Check if this is a global/module scope variable declaration
                if (scope.type === 'global' || scope.type === 'module') {
                    const varDecl = asVariableDeclaration(node);
                    if (varDecl) {
                        varDecl.declarations.forEach((declaration: unknown) => {
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
            }
        };
    }
};

export default rule;
