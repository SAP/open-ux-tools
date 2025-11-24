/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { Rule } from 'eslint';
import type { ASTNode } from '../utils/helpers';
import { isIdentifier, isMember, isWindow, contains } from '../utils/helpers';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
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
            timeoutUsage: 'Timeout with value > 0'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const WINDOW_OBJECTS: string[] = [];
        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Check if a node represents setTimeout.
         *
         * @param node The AST node to check
         * @returns True if the node represents setTimeout
         */
        function isTimeout(node: ASTNode): boolean {
            return isIdentifier(node) && (node as { name: string }).name === 'setTimeout';
        }

        /**
         * Check if a node represents an interesting setTimeout call to analyze.
         *
         * @param node The AST node to check
         * @returns True if the node represents an interesting setTimeout call
         */
        function isInteresting(node: ASTNode): boolean {
            let obj = (node as unknown as { callee: ASTNode }).callee;
            if (isMember(obj)) {
                const memberObj = obj as unknown as { object: ASTNode; property: ASTNode };
                if (
                    isWindow(memberObj.object) ||
                    (isIdentifier(memberObj.object) &&
                        contains(WINDOW_OBJECTS, (memberObj.object as unknown as { name: string }).name))
                ) {
                    // is member expression on window, check property
                    obj = memberObj.property;
                } else {
                    // no call on window
                    return false;
                }
            }
            // here obj may not be node.callee any more but node.callee.property
            return isTimeout(obj);
        }

        /**
         * Check if a setTimeout call has valid timeout arguments.
         *
         * @param node The AST node to check
         * @returns True if the setTimeout call has valid timeout arguments
         */
        function isValid(node: ASTNode): boolean {
            const args = (node as unknown as { arguments: ASTNode[] }).arguments;
            return (
                args &&
                (args.length === 1 ||
                    (args.length > 1 &&
                        ((args[1] as unknown as { value: string | number }).value === 0 ||
                            (args[1] as unknown as { value: string | number }).value === '0')))
            );
        }

        /**
         * Remember window object references for later analysis.
         *
         * @param left The left side of the assignment
         * @param right The right side of the assignment
         */
        function rememberWindow(left: ASTNode, right: ASTNode): void {
            if (right && isWindow(right) && left && isIdentifier(left)) {
                WINDOW_OBJECTS.push((left as { name: string }).name);
            }
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node: ASTNode): void {
                const declaratorNode = node as unknown as { id: ASTNode; init?: ASTNode };
                if (declaratorNode.init) {
                    rememberWindow(declaratorNode.id, declaratorNode.init);
                }
            },
            'AssignmentExpression': function (node: ASTNode): void {
                const assignmentNode = node as unknown as { left: ASTNode; right: ASTNode };
                rememberWindow(assignmentNode.left, assignmentNode.right);
            },
            'CallExpression': function (node: ASTNode): void {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'timeoutUsage' });
                }
            }
        };
    }
};

export default rule;
