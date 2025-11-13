/**
 * @file Detect some warning for usages of (window.)document APIs
 * @ESLint          Version 0.14.0 / February 2015
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

/*eslint-disable strict*/
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
        const FULL_BLACKLIST = FORBIDDEN_DOM_ACCESS.concat(FORBIDDEN_WINDOW_USAGES);

        const FORBIDDEN_DOCUMENT_OBJECT: string[] = [],
            FORBIDDEN_SCREEN_OBJECT: string[] = [],
            FORBIDDEN_BODY_OBJECT: string[] = [],
            FORBIDDEN_HISTORY_OBJECT: string[] = [],
            FORBIDDEN_LOCATION_OBJECT: string[] = [];

        const MEMBER = 'MemberExpression',
            CALL = 'CallExpression',
            IDENTIFIER = 'Identifier',
            IF_CONDITION = 'IfStatement',
            CONDITION_EXP = 'ConditionalExpression',
            UNARY = 'UnaryExpression',
            LITERAL = 'Literal';
        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param node
         * @param type
         */
        function isType(node: any, type: any) {
            return node && node.type === type;
        }
        /**
         *
         * @param node
         */
        function isIdentifier(node: any) {
            return isType(node, IDENTIFIER);
        }
        /**
         *
         * @param node
         */
        function isMember(node: any) {
            return isType(node, MEMBER);
        }
        /**
         *
         * @param node
         */
        function isCall(node: any) {
            return isType(node, CALL);
        }
        /**
         *
         * @param node
         */
        function isCondition(node: any) {
            return isType(node, IF_CONDITION) || isType(node, CONDITION_EXP);
        }
        /**
         *
         * @param node
         */
        function isUnary(node: any) {
            return isType(node, UNARY);
        }
        /**
         *
         * @param node
         */
        function isLiteral(node: any) {
            return isType(node, LITERAL);
        }

        /**
         *
         * @param a
         * @param obj
         */
        function contains(a, obj) {
            for (let i = 0; i < a.length; i++) {
                if (obj === a[i]) {
                    return true;
                }
            }
            return false;
        }

        /**
         *
         * @param methodName
         */
        function isDomAccess(methodName) {
            return contains(FORBIDDEN_DOM_ACCESS, methodName);
        }

        /**
         *
         * @param methodName
         */
        function isWindowUsage(methodName) {
            return contains(FORBIDDEN_WINDOW_USAGES, methodName);
        }

        /**
         *
         * @param node
         */
        function isWindow(node: any): boolean {
            return isIdentifier(node) && 'name' in node && node.name === 'window';
        }

        /**
         *
         * @param node
         * @param justHistory
         */
        function isHistory(node: any, justHistory: any): boolean {
            if (isIdentifier(node) && 'name' in node) {
                return node.name === 'history' || (!justHistory && contains(FORBIDDEN_HISTORY_OBJECT, node.name));
            } else if (isMember(node)) {
                return isWindow(node.object) && isIdentifier(node.property) && isHistory(node.property, true);
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function getRightestMethodName(node: any) {
            if (isMember(node.callee)) {
                return node.callee.property.name;
            } else {
                return node.callee.name;
            }
        }

        /**
         *
         * @param node
         */
        function processVariableDeclarator(node: any) {
            if (node.init) {
                if (isMember(node.init)) {
                    let firstElement = node.init.object.name;
                    const secondElement = node.init.property.name;

                    if (firstElement + '.' + secondElement === 'window.document') {
                        FORBIDDEN_DOCUMENT_OBJECT.push(node.id.name);
                    } else if (firstElement + '.' + secondElement === 'window.history') {
                        FORBIDDEN_HISTORY_OBJECT.push(node.id.name);
                    } else if (firstElement + '.' + secondElement === 'window.location') {
                        FORBIDDEN_LOCATION_OBJECT.push(node.id.name);
                    } else if (firstElement + '.' + secondElement === 'window.screen') {
                        FORBIDDEN_SCREEN_OBJECT.push(node.id.name);
                    } else if (secondElement === 'body' && node.init.object.property) {
                        firstElement = node.init.object.property.name;
                        if (firstElement + '.' + secondElement === 'document.body') {
                            context.report({ node: node, messageId: 'windowUsages' });
                            FORBIDDEN_BODY_OBJECT.push(node.id.name);
                        }
                    }
                } else if (isIdentifier(node.init) && node.init.name === 'document') {
                    FORBIDDEN_DOCUMENT_OBJECT.push(node.id.name);
                } else if (isIdentifier(node.init) && node.init.name === 'screen') {
                    FORBIDDEN_SCREEN_OBJECT.push(node.id.name);
                } else if (isIdentifier(node.init) && node.init.name === 'location') {
                    FORBIDDEN_LOCATION_OBJECT.push(node.id.name);
                } else if (isIdentifier(node.init) && node.init.name === 'history') {
                    FORBIDDEN_HISTORY_OBJECT.push(node.id.name);
                }
            }
        }

        /**
         *
         * @param memberExpressionNode
         */
        function buildCalleePath(memberExpressionNode: any): string {
            const obj = memberExpressionNode.object;
            if (isIdentifier(obj)) {
                return obj.name;
            } else if (isMember(obj)) {
                const propertyName = obj.property && 'name' in obj.property ? obj.property.name : '';
                return buildCalleePath(obj) + '.' + propertyName;
            } else {
                return '';
            }
        }

        /**
         *
         * @param calleePath
         */
        function isForbiddenObviousApi(calleePath: string): string {
            const elementArray = calleePath.split('.');
            const lastElement = elementArray[elementArray.length - 1];
            return lastElement;
        }

        /**
         *
         * @param node
         * @param maxDepth
         */
        function isInCondition(node: any, maxDepth: any) {
            // we check the depth here because the call might be nested in a block statement and in an expression statement (http://jointjs.com/demos/javascript-ast)
            // (true?history.back():''); || if(true) history.back(); || if(true){history.back();} || if(true){}else{history.back();}
            if (maxDepth > 0) {
                const parent = node.parent;
                return isCondition(parent) || isInCondition(parent, maxDepth - 1);
            }
            return false;
        }

        /**
         *
         * @param node
         */
        function isMinusOne(node: any) {
            return isUnary(node) && node.operator === '-' && isLiteral(node.argument) && node.argument.value === 1;
        }

        /**
         *
         * @param node
         */
        function processHistory(node: any) {
            const callee = node.callee;
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
                            const args = node.arguments;
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
                // ELSE:
                // TODO: check if node.callee is identifier and identifier is a reference to history.back / .go / .forward
                // processing const go = history.go; go();
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
                if (isCall(node.parent) && !node.computed) {
                    const methodName = getRightestMethodName(node.parent),
                        memberExpressionNode = node;
                    let calleePath;
                    if (typeof methodName === 'string' && contains(FULL_BLACKLIST, methodName)) {
                        calleePath = buildCalleePath(memberExpressionNode);
                        const speciousObject = isForbiddenObviousApi(calleePath);

                        if (speciousObject === 'document' && isDomAccess(methodName)) {
                            context.report({ node: node, messageId: 'domAccess' });
                        } else if (
                            speciousObject !== 'document' &&
                            contains(FORBIDDEN_DOCUMENT_OBJECT, speciousObject)
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
                                contains(
                                    FORBIDDEN_DOCUMENT_OBJECT,
                                    calleePath.slice(0, calleePath.lastIndexOf('.body'))
                                )) ||
                            contains(FORBIDDEN_BODY_OBJECT, speciousObjectElse)
                        ) {
                            context.report({ node: node, messageId: 'windowUsages' });
                        }
                    }
                } else {
                    const calleePathNonCmpt = buildCalleePath(node);
                    const speciousObjectNonCmpt = isForbiddenObviousApi(calleePathNonCmpt);

                    // console.log("methodName " + methodName);
                    // console.log("calleePath " + calleePathNonCmpt);
                    // console.log("speciousObject " + speciousObjectNonCmpt);
                    // console.log("-----------------------");

                    if (
                        calleePathNonCmpt === 'window' &&
                        node.property &&
                        'name' in node.property &&
                        isWindowUsage(node.property.name)
                    ) {
                        /*
                         * window.innerHeight = 16; for exp
                         */
                        context.report({ node: node, messageId: 'windowUsages' });
                    } else if (
                        calleePathNonCmpt === 'window.screen' ||
                        calleePathNonCmpt === 'screen' ||
                        contains(FORBIDDEN_SCREEN_OBJECT, calleePathNonCmpt)
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
                            contains(
                                FORBIDDEN_DOCUMENT_OBJECT,
                                calleePathNonCmpt.slice(0, calleePathNonCmpt.lastIndexOf('.body'))
                            )) ||
                        contains(FORBIDDEN_BODY_OBJECT, calleePathNonCmpt)
                    ) {
                        context.report({ node: node, messageId: 'windowUsages' });
                    }
                }
            }
        };
    }
};

export default rule;
