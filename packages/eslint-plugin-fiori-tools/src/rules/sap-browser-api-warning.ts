/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { Rule } from 'eslint';
import { isType, isIdentifier, isMember, isCall, isLiteral, buildCalleePath } from '../utils/ast-helpers';

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
            domAccess: 'Direct DOM access, use jQuery selector instead',
            windowUsages: 'Proprietary Browser API access, use jQuery selector instead',
            historyUsages:
                'Direct history manipulation, does not work with deep links, use router and navigation events instead',
            globalSelection: 'Global selection modification, only modify local selections'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const FORBIDDEN_DOM_ACCESS = [
                'getElementById',
                'getElementsByClassName',
                'getElementsByName',
                'getElementsByTagName'
            ],
            FORBIDDEN_WINDOW_USAGES = ['innerWidth', 'innerHeight', 'getSelection'];
        const FORBIDDEN_METHODS = FORBIDDEN_DOM_ACCESS.concat(FORBIDDEN_WINDOW_USAGES);

        const FORBIDDEN_DOCUMENT_OBJECT: string[] = [],
            FORBIDDEN_SCREEN_OBJECT: string[] = [],
            FORBIDDEN_BODY_OBJECT: string[] = [],
            FORBIDDEN_HISTORY_OBJECT: string[] = [],
            FORBIDDEN_LOCATION_OBJECT: string[] = [];

        const IF_CONDITION = 'IfStatement',
            CONDITION_EXP = 'ConditionalExpression',
            UNARY = 'UnaryExpression';
        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         * Check if a node represents a condition statement.
         *
         * @param node The node to check
         * @returns True if the node represents a condition statement
         */
        function isCondition(node: Rule.Node | undefined): boolean {
            return isType(node, IF_CONDITION) || isType(node, CONDITION_EXP);
        }
        /**
         * Check if a node represents a unary expression.
         *
         * @param node The node to check
         * @returns True if the node represents a unary expression
         */
        function isUnary(node: Rule.Node | undefined): boolean {
            return isType(node, UNARY);
        }

        /**
         * Check if a method name represents DOM access.
         *
         * @param methodName The method name to check
         * @returns True if the method name represents DOM access
         */
        function isDomAccess(methodName: string): boolean {
            return FORBIDDEN_DOM_ACCESS.includes(methodName);
        }

        /**
         * Check if a method name represents forbidden window usage.
         *
         * @param methodName The method name to check
         * @returns True if the method name represents forbidden window usage
         */
        function isWindowUsage(methodName: string): boolean {
            return FORBIDDEN_WINDOW_USAGES.includes(methodName);
        }

        /**
         * Check if a node represents the window object.
         *
         * @param node The node to check
         * @returns True if the node represents the window object
         */
        function isWindow(node: Rule.Node | undefined): boolean {
            return !!(isIdentifier(node) && node && 'name' in node && node.name === 'window');
        }

        /**
         * Check if a node represents history object access.
         *
         * @param node The node to check
         * @param justHistory Whether to check only for history object
         * @returns True if the node represents history object access
         */
        function isHistory(node: Rule.Node | undefined, justHistory: boolean): boolean {
            if (node && isIdentifier(node) && 'name' in node) {
                return node.name === 'history' || (!justHistory && FORBIDDEN_HISTORY_OBJECT.includes(node.name));
            } else if (node && isMember(node)) {
                return (
                    isWindow((node as any).object) &&
                    isIdentifier((node as any).property) &&
                    isHistory((node as any).property, true)
                );
            }
            return false;
        }

        /**
         * Get the rightmost method name from a call expression.
         *
         * @param node The call expression node
         * @returns The rightmost method name
         */
        function getRightestMethodName(node: Rule.Node): string {
            if (isMember((node as any).callee)) {
                return (node as any).callee.property.name;
            } else {
                return (node as any).callee.name;
            }
        }

        /**
         * Process variable declarator nodes to track browser API references.
         *
         * @param node The variable declarator node to process
         */
        function processVariableDeclarator(node: Rule.Node): void {
            if ((node as any).init) {
                if (isMember((node as any).init)) {
                    let firstElement = (node as any).init.object.name;
                    const secondElement = (node as any).init.property.name;

                    if (`${firstElement}.${secondElement}` === 'window.document') {
                        FORBIDDEN_DOCUMENT_OBJECT.push((node as any).id.name);
                    } else if (`${firstElement}.${secondElement}` === 'window.history') {
                        FORBIDDEN_HISTORY_OBJECT.push((node as any).id.name);
                    } else if (`${firstElement}.${secondElement}` === 'window.location') {
                        FORBIDDEN_LOCATION_OBJECT.push((node as any).id.name);
                    } else if (`${firstElement}.${secondElement}` === 'window.screen') {
                        FORBIDDEN_SCREEN_OBJECT.push((node as any).id.name);
                    } else if (secondElement === 'body' && (node as any).init.object.property) {
                        firstElement = (node as any).init.object.property.name;
                        if (`${firstElement}.${secondElement}` === 'document.body') {
                            context.report({ node: node, messageId: 'windowUsages' });
                            FORBIDDEN_BODY_OBJECT.push((node as any).id.name);
                        }
                    }
                } else if (isIdentifier((node as any).init) && (node as any).init.name === 'document') {
                    FORBIDDEN_DOCUMENT_OBJECT.push((node as any).id.name);
                } else if (isIdentifier((node as any).init) && (node as any).init.name === 'screen') {
                    FORBIDDEN_SCREEN_OBJECT.push((node as any).id.name);
                } else if (isIdentifier((node as any).init) && (node as any).init.name === 'location') {
                    FORBIDDEN_LOCATION_OBJECT.push((node as any).id.name);
                } else if (isIdentifier((node as any).init) && (node as any).init.name === 'history') {
                    FORBIDDEN_HISTORY_OBJECT.push((node as any).id.name);
                }
            }
        }

        /**
         * Check if a callee path represents a forbidden obvious API.
         *
         * @param calleePath The path to check for forbidden APIs
         * @returns The last element of the path
         */
        function isForbiddenObviousApi(calleePath: string): string {
            const elementArray = calleePath.split('.');
            const lastElement = elementArray.at(-1);
            return lastElement ?? '';
        }

        /**
         * Check if a node is within a conditional statement up to a maximum depth.
         *
         * @param node The node to check
         * @param maxDepth Maximum depth to search for conditions
         * @returns True if the node is within a conditional statement
         */
        function isInCondition(node: Rule.Node, maxDepth: number): boolean {
            // we check the depth here because the call might be nested in a block statement and in an expression statement (http://jointjs.com/demos/javascript-ast)
            // (true?history.back():''); || if(true) history.back(); || if(true){history.back();} || if(true){}else{history.back();}
            if (maxDepth > 0) {
                const parent = node.parent;
                return isCondition(parent) || isInCondition(parent, maxDepth - 1);
            }
            return false;
        }

        /**
         * Check if a node represents the value -1.
         *
         * @param node The node to check
         * @returns True if the node represents the value -1
         */
        function isMinusOne(node: Rule.Node): boolean {
            return (
                isUnary(node) &&
                (node as any).operator === '-' &&
                isLiteral((node as any).argument) &&
                (node as any).argument.value === 1
            );
        }

        /**
         * Process history API usage and report violations.
         *
         * @param node The call expression node to process
         */
        function processHistory(node: Rule.Node): void {
            const callee = (node as any).callee;
            if (isMember(callee)) {
                // process window.history.back() | history.forward() | const h = history; h.go()
                if (isHistory(callee.object, false) && isIdentifier(callee.property) && 'name' in callee.property) {
                    switch (callee.property.name) {
                        case 'forward':
                            context.report({ node: node, messageId: 'historyUsages' });
                            break;
                        case 'back':
                            if (!isInCondition(node, 3)) {
                                context.report({ node: node, messageId: 'historyUsages' });
                            }
                            break;
                        case 'go':
                            const args = (node as any).arguments;
                            if (args.length === 1 && isMinusOne(args[0])) {
                                if (!isInCondition(node, 3)) {
                                    context.report({ node: node, messageId: 'historyUsages' });
                                }
                            } else {
                                context.report({ node: node, messageId: 'historyUsages' });
                            }
                            break;
                        default:
                    }
                }
            }
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'VariableDeclarator': function (node) {
                processVariableDeclarator(node);
            },
            'CallExpression': function (node) {
                processHistory(node);
            },
            'MemberExpression': function (node) {
                if (isCall(node.parent) && !(node as any).computed) {
                    const methodName = getRightestMethodName(node.parent),
                        memberExpressionNode = node;
                    let calleePath;
                    if (typeof methodName === 'string' && FORBIDDEN_METHODS.includes(methodName)) {
                        calleePath = buildCalleePath(memberExpressionNode);
                        const speciousObject = isForbiddenObviousApi(calleePath);

                        if (speciousObject === 'document' && isDomAccess(methodName)) {
                            context.report({ node: node, messageId: 'domAccess' });
                        } else if (
                            speciousObject !== 'document' &&
                            FORBIDDEN_DOCUMENT_OBJECT.includes(speciousObject)
                        ) {
                            context.report({ node: node, messageId: 'domAccess' });
                        }

                        if (speciousObject === 'window' && isWindowUsage(methodName) && methodName === 'getSelection') {
                            context.report({ node: node, messageId: 'globalSelection' });
                        }
                    } else if (typeof methodName === 'string') {
                        calleePath = buildCalleePath(memberExpressionNode);
                        const speciousObjectElse = isForbiddenObviousApi(calleePath);

                        if (
                            (speciousObjectElse === 'body' && calleePath.indexOf('document.') !== -1) ||
                            (speciousObjectElse === 'body' &&
                                FORBIDDEN_DOCUMENT_OBJECT.includes(
                                    calleePath.slice(0, calleePath.lastIndexOf('.body'))
                                )) ||
                            FORBIDDEN_BODY_OBJECT.includes(speciousObjectElse)
                        ) {
                            context.report({ node: node, messageId: 'windowUsages' });
                        }
                    }
                } else {
                    const calleePathNonCmpt = buildCalleePath(node);
                    const speciousObjectNonCmpt = isForbiddenObviousApi(calleePathNonCmpt);

                    if (
                        calleePathNonCmpt === 'window' &&
                        (node as any).property &&
                        'name' in (node as any).property &&
                        isWindowUsage((node as any).property.name)
                    ) {
                        context.report({ node: node, messageId: 'windowUsages' });
                    } else if (
                        calleePathNonCmpt === 'window.screen' ||
                        calleePathNonCmpt === 'screen' ||
                        FORBIDDEN_SCREEN_OBJECT.includes(calleePathNonCmpt)
                    ) {
                        context.report({ node: node, messageId: 'windowUsages' });
                    }

                    if (
                        (calleePathNonCmpt === 'document.body' || calleePathNonCmpt === 'window.document.body') &&
                        speciousObjectNonCmpt === 'body'
                    ) {
                        context.report({ node: node, messageId: 'windowUsages' });
                    } else if (
                        (speciousObjectNonCmpt === 'body' &&
                            FORBIDDEN_DOCUMENT_OBJECT.includes(
                                calleePathNonCmpt.slice(0, calleePathNonCmpt.lastIndexOf('.body'))
                            )) ||
                        FORBIDDEN_BODY_OBJECT.includes(calleePathNonCmpt)
                    ) {
                        context.report({ node: node, messageId: 'windowUsages' });
                    }
                }
            }
        };
    }
};

export default rule;
