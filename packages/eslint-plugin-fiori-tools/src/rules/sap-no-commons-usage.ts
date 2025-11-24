/**
 * @file Detects the usage of sap.ui.commons objects.
 */

import type { Rule } from 'eslint';
import { type ASTNode, isMember, isLiteral, isArray, startsWith, getMemberAsString } from '../utils/helpers';

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
            commonsUsage: 'Usage of sap.ui.commons controls is forbidden, please use controls from sap.m'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        /**
         * Check if a node represents an interesting function call to analyze.
         *
         * @param node The AST node to check
         * @returns True if the node represents an interesting function call
         */
        function isInteresting(node: ASTNode): boolean {
            const callee = (node as any).callee;
            if (isMember(callee)) {
                if (getMemberAsString(callee) === 'sap.ui.define') {
                    return true;
                }
            }
            return false;
        }

        /**
         * Check if a function call has valid (non-commons) imports.
         *
         * @param node The function call node to validate
         * @returns True if the function call has valid imports, false if it contains commons usage
         */
        function isValid(node: ASTNode): boolean {
            const nodeWithArgs = node as any;
            if (nodeWithArgs.arguments && isArray(nodeWithArgs.arguments[0])) {
                const importList = (nodeWithArgs.arguments[0] as any).elements;
                for (const key in importList) {
                    if (importList.hasOwnProperty(key)) {
                        const lib = importList[key];
                        if (isLiteral(lib) && startsWith((lib as any).value, 'sap/ui/commons')) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }

        return {
            'NewExpression'(node: ASTNode): void {
                if (
                    isMember((node as any).callee) &&
                    startsWith(getMemberAsString((node as any).callee), 'sap.ui.commons')
                ) {
                    context.report({ node: node, messageId: 'commonsUsage' });
                }
            },
            'CallExpression'(node: ASTNode): void {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'commonsUsage' });
                }
            }
        };
    }
};

export default rule;
