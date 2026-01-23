/**
 * @file Detect some warning for usages of (window.)document APIs
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import {
    isType,
    isIdentifier,
    isMember,
    isCall,
    buildCalleePath,
    isForbiddenObviousApi,
    type ASTNode,
    getLiteralOrIdentifierName,
    asCallExpression,
    asMemberExpression,
    asIdentifier,
    asLiteral,
    asVariableDeclarator,
    asUnaryExpression,
    getParent,
    getPropertyName
} from '../utils/helpers';

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * Check if a node represents the window object.
 *
 * @param node The node to check
 * @returns True if the node represents the window object
 */
function isWindow(node: ASTNode | undefined): boolean {
    return !!(
        isIdentifier(node) &&
        node &&
        typeof node === 'object' &&
        node !== null &&
        'name' in node &&
        getLiteralOrIdentifierName(node) === 'window'
    );
}

/**
 * Get the rightmost method name from a call expression.
 *
 * @param node The call expression node
 * @returns The rightmost method name
 */
function getRightestMethodName(node: ASTNode): string {
    const callExpr = asCallExpression(node);
    if (!callExpr) {
        return '';
    }
    const memberCallee = asMemberExpression(callExpr.callee);
    if (memberCallee) {
        return getPropertyName(memberCallee.property) ?? '';
    }
    const identCallee = asIdentifier(callExpr.callee);
    return identCallee?.name ?? '';
}

/**
 * Check if a path represents direct body access.
 *
 * @param calleePathNonCmpt The callee path
 * @param speciousObjectNonCmpt The specious object
 * @returns True if this is direct body access
 */
function isDirectBodyAccess(calleePathNonCmpt: string, speciousObjectNonCmpt: string): boolean {
    return (
        (calleePathNonCmpt === 'document.body' || calleePathNonCmpt === 'window.document.body') &&
        speciousObjectNonCmpt === 'body'
    );
}

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
            domAccess: 'Direct DOM access, use jQuery selector instead',
            windowUsages: 'Proprietary Browser API access, use jQuery selector instead',
            historyUsages:
                'Direct history manipulation, does not work with deep links, use router and navigation events instead',
            globalSelection: 'Global selection modification, only modify local selections'
        },
        schema: []
    },
    create(context: RuleContext) {
        const FORBIDDEN_DOM_ACCESS = [
                'getElementById',
                'getElementsByClassName',
                'getElementsByName',
                'getElementsByTagName'
            ],
            FORBIDDEN_WINDOW_USAGES = ['innerWidth', 'innerHeight', 'getSelection'];
        const FORBIDDEN_METHODS = new Set(FORBIDDEN_DOM_ACCESS.concat(FORBIDDEN_WINDOW_USAGES));

        const FORBIDDEN_DOCUMENT_OBJECT: string[] = [],
            FORBIDDEN_SCREEN_OBJECT: string[] = [],
            FORBIDDEN_BODY_OBJECT: string[] = [],
            FORBIDDEN_HISTORY_OBJECT: string[] = [];

        const IF_CONDITION = 'IfStatement',
            CONDITION_EXP = 'ConditionalExpression';
        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         * Check if a node represents a condition statement.
         *
         * @param node The node to check
         * @returns True if the node represents a condition statement
         */
        function isCondition(node: ASTNode | undefined): boolean {
            return isType(node, IF_CONDITION) || isType(node, CONDITION_EXP);
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
         * Check if a node represents history object access.
         *
         * @param node The node to check
         * @param justHistory Whether to check only for history object
         * @returns True if the node represents history object access
         */
        function isHistory(node: ASTNode | undefined, justHistory: boolean): boolean {
            if (node && isIdentifier(node) && typeof node === 'object' && node !== null && 'name' in node) {
                return (
                    getLiteralOrIdentifierName(node) === 'history' ||
                    (!justHistory && FORBIDDEN_HISTORY_OBJECT.includes(getLiteralOrIdentifierName(node)))
                );
            }
            const memberNode = asMemberExpression(node);
            if (memberNode) {
                const identProp = asIdentifier(memberNode.property);
                return isWindow(memberNode.object) && identProp !== undefined && isHistory(memberNode.property, true);
            }
            return false;
        }

        /**
         * Process member expressions in variable declarations (e.g., var doc = window.document).
         *
         * @param node The variable declarator node
         * @param init The init node (member expression)
         */
        function processMemberInit(node: any, init: any): void {
            let firstElement = init.object.name;
            const secondElement = init.property.name;
            const fullPath = `${firstElement}.${secondElement}`;
            const varName = node.id.name;

            switch (fullPath) {
                case 'window.document':
                    FORBIDDEN_DOCUMENT_OBJECT.push(varName);
                    break;
                case 'window.history':
                    FORBIDDEN_HISTORY_OBJECT.push(varName);
                    break;
                case 'window.screen':
                    FORBIDDEN_SCREEN_OBJECT.push(varName);
                    break;
                default:
                    if (secondElement === 'body' && init.object.property) {
                        firstElement = init.object.property.name;
                        if (`${firstElement}.${secondElement}` === 'document.body') {
                            context.report({ node: node, messageId: 'windowUsages' });
                            FORBIDDEN_BODY_OBJECT.push(varName);
                        }
                    }
            }
        }

        /**
         * Process identifier expressions in variable declarations (e.g., var doc = document).
         *
         * @param node The variable declarator node
         * @param init The init node (identifier)
         */
        function processIdentifierInit(node: any, init: any): void {
            const varName = node.id.name;
            const initName = init.name;

            switch (initName) {
                case 'document':
                    FORBIDDEN_DOCUMENT_OBJECT.push(varName);
                    break;
                case 'screen':
                    FORBIDDEN_SCREEN_OBJECT.push(varName);
                    break;
                case 'history':
                    FORBIDDEN_HISTORY_OBJECT.push(varName);
                    break;
                default:
                // No action needed for other identifiers
            }
        }

        /**
         * Process variable declarator nodes to track browser API references.
         *
         * @param node The variable declarator node to process
         */
        function processVariableDeclarator(node: ASTNode): void {
            const declarator = asVariableDeclarator(node);
            if (!declarator) {
                return;
            }
            const init = declarator.init;
            if (!init) {
                return;
            }

            if (isMember(init)) {
                processMemberInit(node, init);
            } else if (isIdentifier(init)) {
                processIdentifierInit(node, init);
            }
        }

        /**
         * Check if a node is within a conditional statement up to a maximum depth.
         *
         * @param node The node to check
         * @param maxDepth Maximum depth to search for conditions
         * @returns True if the node is within a conditional statement
         */
        function isInCondition(node: ASTNode, maxDepth: number): boolean {
            // we check the depth here because the call might be nested in a block statement and in an expression statement (http://jointjs.com/demos/javascript-ast)
            // (true?history.back():''); || if(true) history.back(); || if(true){history.back();} || if(true){}else{history.back();}
            if (maxDepth > 0) {
                const parent = getParent(node);
                if (!parent) {
                    return false;
                }
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
        function isMinusOne(node: ASTNode): boolean {
            const unaryExpr = asUnaryExpression(node);
            if (!unaryExpr) {
                return false;
            }
            const literalArg = asLiteral(unaryExpr.argument);
            return unaryExpr.operator === '-' && literalArg?.value === 1;
        }

        /**
         * Handle history.forward() calls.
         *
         * @param node The call expression node
         */
        function handleHistoryForward(node: ASTNode): void {
            context.report({ node: node, messageId: 'historyUsages' });
        }

        /**
         * Handle history.back() calls.
         *
         * @param node The call expression node
         */
        function handleHistoryBack(node: ASTNode): void {
            if (!isInCondition(node, 3)) {
                context.report({ node: node, messageId: 'historyUsages' });
            }
        }

        /**
         * Handle history.go() calls.
         *
         * @param node The call expression node
         */
        function handleHistoryGo(node: ASTNode): void {
            const callExpr = asCallExpression(node);
            if (!callExpr) {
                return;
            }
            const args = callExpr.arguments;
            if (args.length === 1 && isMinusOne(args[0])) {
                if (!isInCondition(node, 3)) {
                    context.report({ node: node, messageId: 'historyUsages' });
                }
            } else {
                context.report({ node: node, messageId: 'historyUsages' });
            }
        }

        /**
         * Process history API method calls.
         *
         * @param node The call expression node
         * @param methodName The method name being called
         */
        function processHistoryMethod(node: ASTNode, methodName: string): void {
            switch (methodName) {
                case 'forward':
                    handleHistoryForward(node);
                    break;
                case 'back':
                    handleHistoryBack(node);
                    break;
                case 'go':
                    handleHistoryGo(node);
                    break;
                default:
                // No action needed for other methods
            }
        }

        /**
         * Process history API usage and report violations.
         *
         * @param node The call expression node to process
         */
        function processHistory(node: ASTNode): void {
            const callExpr = asCallExpression(node);
            if (!callExpr) {
                return;
            }
            const memberCallee = asMemberExpression(callExpr.callee);
            if (!memberCallee) {
                return;
            }

            const identProp = asIdentifier(memberCallee.property);
            if (isHistory(memberCallee.object, false) && identProp) {
                processHistoryMethod(node, identProp.name);
            }
        }

        // --------------------------------------------------------------------------
        // MemberExpression Helper Functions
        // --------------------------------------------------------------------------

        /**
         * Handle DOM access checks for forbidden methods.
         *
         * @param node The member expression node
         * @param methodName The method name
         * @param speciousObject The object being accessed
         */
        function handleDomAccessChecks(node: ASTNode, methodName: string, speciousObject: string): void {
            if (
                (speciousObject === 'document' && isDomAccess(methodName)) ||
                (speciousObject !== 'document' && FORBIDDEN_DOCUMENT_OBJECT.includes(speciousObject))
            ) {
                context.report({ node: node, messageId: 'domAccess' });
            }
        }

        /**
         * Handle window selection checks.
         *
         * @param node The member expression node
         * @param methodName The method name
         * @param speciousObject The object being accessed
         */
        function handleWindowSelectionChecks(node: ASTNode, methodName: string, speciousObject: string): void {
            if (speciousObject === 'window' && isWindowUsage(methodName) && methodName === 'getSelection') {
                context.report({ node: node, messageId: 'globalSelection' });
            }
        }

        /**
         * Check if a path represents a body element access.
         *
         * @param speciousObject The object being accessed
         * @param calleePath The full callee path
         * @returns True if this is a body element access
         */
        function isBodyElementAccess(speciousObject: string, calleePath: string): boolean {
            return (
                (speciousObject === 'body' && calleePath.includes('document.')) ||
                (speciousObject === 'body' &&
                    FORBIDDEN_DOCUMENT_OBJECT.includes(calleePath.slice(0, calleePath.lastIndexOf('.body')))) ||
                FORBIDDEN_BODY_OBJECT.includes(speciousObject)
            );
        }

        /**
         * Handle body element access checks.
         *
         * @param node The member expression node
         * @param speciousObject The object being accessed
         * @param calleePath The full callee path
         */
        function handleBodyElementChecks(node: ASTNode, speciousObject: string, calleePath: string): void {
            if (isBodyElementAccess(speciousObject, calleePath)) {
                context.report({ node: node, messageId: 'windowUsages' });
            }
        }

        /**
         * Handle forbidden methods in call expressions.
         *
         * @param node The member expression node
         * @param methodName The method name
         */
        function handleForbiddenMethodCall(node: ASTNode, methodName: string): void {
            const calleePath = buildCalleePath(node);
            const speciousObject = isForbiddenObviousApi(calleePath);

            handleDomAccessChecks(node, methodName, speciousObject);
            handleWindowSelectionChecks(node, methodName, speciousObject);
        }

        /**
         * Handle other method calls (non-forbidden methods).
         *
         * @param node The member expression node
         */
        function handleOtherMethodCall(node: ASTNode): void {
            const calleePath = buildCalleePath(node);
            const speciousObject = isForbiddenObviousApi(calleePath);

            handleBodyElementChecks(node, speciousObject, calleePath);
        }

        /**
         * Handle call expression member expressions.
         *
         * @param node The member expression node
         */
        function handleCallExpressionMember(node: ASTNode): void {
            const parent = getParent(node);
            if (!parent) {
                return;
            }
            const methodName = getRightestMethodName(parent);
            if (typeof methodName !== 'string') {
                return;
            }

            if (FORBIDDEN_METHODS.has(methodName)) {
                handleForbiddenMethodCall(node, methodName);
            } else {
                handleOtherMethodCall(node);
            }
        }

        /**
         * Check if a path represents screen access.
         *
         * @param calleePathNonCmpt The callee path
         * @returns True if this is screen access
         */
        function isScreenAccess(calleePathNonCmpt: string): boolean {
            return (
                calleePathNonCmpt === 'window.screen' ||
                calleePathNonCmpt === 'screen' ||
                FORBIDDEN_SCREEN_OBJECT.includes(calleePathNonCmpt)
            );
        }

        /**
         * Check if a path represents indirect body access.
         *
         * @param calleePathNonCmpt The callee path
         * @param speciousObjectNonCmpt The specious object
         * @returns True if this is indirect body access
         */
        function isIndirectBodyAccess(calleePathNonCmpt: string, speciousObjectNonCmpt: string): boolean {
            return (
                (speciousObjectNonCmpt === 'body' &&
                    FORBIDDEN_DOCUMENT_OBJECT.includes(
                        calleePathNonCmpt.slice(0, calleePathNonCmpt.lastIndexOf('.body'))
                    )) ||
                FORBIDDEN_BODY_OBJECT.includes(calleePathNonCmpt)
            );
        }

        /**
         * Handle non-call expression member expressions.
         *
         * @param node The member expression node
         */
        function handleNonCallExpressionMember(node: ASTNode): void {
            const calleePathNonCmpt = buildCalleePath(node);
            const speciousObjectNonCmpt = isForbiddenObviousApi(calleePathNonCmpt);

            // Handle window property access
            const memberNode = asMemberExpression(node);
            const propertyName = memberNode ? getPropertyName(memberNode.property) : undefined;
            if (
                (calleePathNonCmpt === 'window' && propertyName && isWindowUsage(propertyName)) ||
                isScreenAccess(calleePathNonCmpt)
            ) {
                context.report({ node: node, messageId: 'windowUsages' });
            }

            // Handle body access
            if (
                isDirectBodyAccess(calleePathNonCmpt, speciousObjectNonCmpt) ||
                isIndirectBodyAccess(calleePathNonCmpt, speciousObjectNonCmpt)
            ) {
                context.report({ node: node, messageId: 'windowUsages' });
            }
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'VariableDeclarator': function (node): void {
                processVariableDeclarator(node);
            },
            'CallExpression': function (node): void {
                processHistory(node);
            },
            'MemberExpression': function (node): void {
                const parent = getParent(node);
                if (isCall(parent) && !node.computed) {
                    handleCallExpressionMember(node);
                } else {
                    handleNonCallExpressionMember(node);
                }
            }
        };
    }
};

export default rule;
