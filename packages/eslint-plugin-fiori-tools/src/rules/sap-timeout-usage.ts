/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { Rule } from 'eslint';
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
        function isTimeout(node: Rule.Node): boolean {
            return isIdentifier(node) && (node as { name: string }).name === 'setTimeout';
        }

        /**
         * Check if a node represents an interesting setTimeout call to analyze.
         *
         * @param node The AST node to check
         * @returns True if the node represents an interesting setTimeout call
         */
        function isInteresting(node: Rule.Node): boolean {
            let obj = (node as unknown as { callee: Rule.Node }).callee;
            if (isMember(obj)) {
                const memberObj = obj as unknown as { object: Rule.Node; property: Rule.Node };
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
        function isValid(node: Rule.Node): boolean {
            const args = (node as unknown as { arguments: Rule.Node[] }).arguments;
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
        function rememberWindow(left: Rule.Node, right: Rule.Node): void {
            if (right && isWindow(right) && left && isIdentifier(left)) {
                WINDOW_OBJECTS.push((left as { name: string }).name);
            }
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------
        return {
            'VariableDeclarator': function (node: Rule.Node): void {
                const declaratorNode = node as unknown as { id: Rule.Node; init?: Rule.Node };
                if (declaratorNode.init) {
                    rememberWindow(declaratorNode.id, declaratorNode.init);
                }
            },
            'AssignmentExpression': function (node: Rule.Node): void {
                const assignmentNode = node as unknown as { left: Rule.Node; right: Rule.Node };
                rememberWindow(assignmentNode.left, assignmentNode.right);
            },
            'CallExpression': function (node: Rule.Node): void {
                if (isInteresting(node) && !isValid(node)) {
                    context.report({ node: node, messageId: 'timeoutUsage' });
                }
            }
        };
    }
};

export default rule;
