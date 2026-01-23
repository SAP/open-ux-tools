/**
 * @file Detect some forbidden usages of (window.)document APIs
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import type { ASTNode } from '../utils/helpers';
import {
    isIdentifier,
    isCall,
    isLiteral,
    contains,
    isForbiddenObviousApi,
    asCallExpression,
    asMemberExpression,
    asIdentifier,
    asLiteral,
    asVariableDeclarator,
    asAssignmentExpression,
    getParent,
    getPropertyName
} from '../utils/helpers';

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

/**
 * Get the rightmost method name from a node.
 *
 * @param node The node to extract method name from
 * @returns The rightmost method name
 */
function getRightestMethodName(node: ASTNode): string {
    const callExpr = asCallExpression(node);
    if (!callExpr) {
        return '';
    }
    const callee = callExpr.callee;
    const memberExpr = asMemberExpression(callee);
    if (memberExpr) {
        return getPropertyName(memberExpr.property) ?? '';
    }
    const identifier = asIdentifier(callee);
    return identifier?.name ?? '';
}

/**
 * Build a path string from a callee node.
 *
 * @param node The callee node to build path from
 * @returns The path string representation
 */
function buildCalleePath(node: ASTNode): string {
    const memberExpr = asMemberExpression(node);
    if (!memberExpr) {
        return '';
    }

    const objAsMember = asMemberExpression(memberExpr.object);
    if (objAsMember) {
        const propertyName = getPropertyName(objAsMember.property) ?? '';
        return `${buildCalleePath(memberExpr.object)}.${propertyName}`;
    }

    const objAsIdentifier = asIdentifier(memberExpr.object);
    if (objAsIdentifier) {
        return objAsIdentifier.name;
    }

    return '';
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
            domInsertion: 'Direct DOM insertion, create a custom control instead',
            domManipulation: 'Direct DOM Manipulation, better to use jQuery.appendTo if really needed',
            dynamicStyleInsertion: 'Dynamic style insertion, use library CSS or lessifier instead',
            locationReload: 'location.reload() is not permitted.',
            forbiddenDocumentUsage:
                "insertBrOnReturn is not allowed since it is a Mozilla specific method, Chrome doesn't support that.",
            proprietaryBrowserApi: 'Proprietary Browser API access, use sap.ui.Device API instead',
            forbiddenDefGlob: 'Definition of global variable/api in window object is not permitted.',
            forbiddenGlobEvent: 'Global event handling override is not permitted, please modify only single events'
        },
        schema: []
    },
    create(context: RuleContext) {
        const FORBIDDEN_DOM_INSERTION = [
                'createElement',
                'createTextNode',
                'createElementNS',
                'createDocumentFragment',
                'createComment',
                'createAttribute',
                'createEvent'
            ],
            FORBIDDEN_DOM_MANIPULATION = ['execCommand'],
            FORBIDDEN_DYNAMIC_STYLE_INSERTION = ['styleSheets'],
            FORBIDDEN_LOCATION_RELOAD = ['reload'],
            FORBIDDEN_DOCUMENT_USAGE = ['queryCommandSupported'],
            FORBIDDEN_NAVIGATOR_WINDOW = ['javaEnabled', 'addEventListener', 'onresize'],
            FORBIDDEN_DEF_GLOB = ['define', 'top', 'groupBy'],
            FORBIDDEN_GLOB_EVENT = [
                'onload',
                'onunload',
                'onabort',
                'onbeforeunload',
                'onerror',
                'onhashchange',
                'onpageshow',
                'onpagehide',
                'onscroll',
                'onblur',
                'onchange',
                'onfocus',
                'onfocusin',
                'onfocusout',
                'oninput',
                'oninvalid',
                'onreset',
                'onsearch',
                'onselect',
                'onsubmit'
            ];

        const FORBIDDEN_METHODS = FORBIDDEN_DOM_INSERTION.concat(
            FORBIDDEN_DOM_MANIPULATION,
            FORBIDDEN_DYNAMIC_STYLE_INSERTION,
            FORBIDDEN_LOCATION_RELOAD,
            FORBIDDEN_NAVIGATOR_WINDOW,
            FORBIDDEN_DEF_GLOB,
            FORBIDDEN_GLOB_EVENT,
            FORBIDDEN_DOCUMENT_USAGE,
            'back'
        );

        const FORBIDDEN_DOCUMENT_OBJECT: string[] = [],
            FORBIDDEN_LOCATION_OBJECT: string[] = [],
            FORBIDDEN_WINDOW_OBJECT: string[] = [],
            FORBIDDEN_WINDOW_EVENT_OBJECT: string[] = [];

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------

        /**
         * Process document-related API usage and report violations.
         *
         * @param node The AST node to process
         * @param methodName The method name being called
         */
        function processDocumentMessage(node: ASTNode, methodName: string): void {
            const parent = asCallExpression(getParent(node));
            if (contains(FORBIDDEN_DOM_INSERTION, methodName)) {
                if (
                    !(
                        methodName === 'createElement' &&
                        parent &&
                        parent.arguments &&
                        parent.arguments.length > 0 &&
                        isLiteral(parent.arguments[0]) &&
                        asLiteral(parent.arguments[0])?.value === 'a'
                    )
                ) {
                    context.report({ node: node, messageId: 'domInsertion' });
                }
            } else if (contains(FORBIDDEN_DOM_MANIPULATION, methodName)) {
                context.report({ node: node, messageId: 'domManipulation' });
            } else if (
                contains(FORBIDDEN_DOCUMENT_USAGE, methodName) &&
                parent &&
                parent.arguments.length !== 0 &&
                asLiteral(parent.arguments[0])?.value === 'insertBrOnReturn'
            ) {
                context.report({ node: node, messageId: 'forbiddenDocumentUsage' });
            }
        }

        /**
         * Process identifier initializer for API usage.
         *
         * @param node The variable declarator node
         * @param init The identifier node
         */
        function processIdentifierInit(node: ASTNode, init: ASTNode): void {
            const initIdentifier = asIdentifier(init);
            const declarator = asVariableDeclarator(node);
            if (!initIdentifier || !declarator) {
                return;
            }

            const initName = initIdentifier.name;
            const idName = asIdentifier(declarator.id)?.name;
            if (!idName) {
                return;
            }

            if (initName === 'document') {
                FORBIDDEN_DOCUMENT_OBJECT.push(idName);
            } else if (initName === 'location') {
                FORBIDDEN_LOCATION_OBJECT.push(idName);
            } else if (initName === 'navigator') {
                context.report({ node: node, messageId: 'proprietaryBrowserApi' });
            } else if (initName === 'window') {
                context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                FORBIDDEN_WINDOW_OBJECT.push(idName);
            }
        }

        /**
         * Process variable declarator nodes for API usage.
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

            const memberInit = asMemberExpression(init);
            if (memberInit) {
                const firstElement = asIdentifier(memberInit.object)?.name;
                const secondElement = getPropertyName(memberInit.property);
                if (!firstElement || !secondElement) {
                    return;
                }

                const fullPath = `${firstElement}.${secondElement}`;
                const idName = asIdentifier(declarator.id)?.name;
                if (!idName) {
                    return;
                }

                if (fullPath === 'window.document') {
                    FORBIDDEN_DOCUMENT_OBJECT.push(idName);
                } else if (fullPath === 'window.location') {
                    FORBIDDEN_LOCATION_OBJECT.push(idName);
                } else if (fullPath === 'window.navigator') {
                    context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                } else if (fullPath === 'window.event') {
                    FORBIDDEN_WINDOW_EVENT_OBJECT.push(idName);
                }
            } else if (isIdentifier(init)) {
                processIdentifierInit(node, init);
            }
        }

        /**
         * Process window-related API usage and report violations.
         *
         * @param node The AST node to process
         * @param methodName The method name being called
         */
        function processWindowMessage(node: ASTNode, methodName: string): void {
            if (contains(FORBIDDEN_NAVIGATOR_WINDOW, methodName)) {
                context.report({ node: node, messageId: 'proprietaryBrowserApi' });
            } else if (contains(FORBIDDEN_DEF_GLOB, methodName)) {
                context.report({ node: node, messageId: 'forbiddenDefGlob' });
            }
        }

        // --------------------------------------------------------------------------
        // Helper Functions for MemberExpression Processing
        // --------------------------------------------------------------------------

        /**
         * Handle call expression cases for MemberExpression.
         *
         * @param node The MemberExpression node
         * @param parent The parent node (CallExpression)
         */
        function handleCallExpression(node: any, parent: any): void {
            const methodName = getRightestMethodName(parent);
            if (typeof methodName !== 'string' || !contains(FORBIDDEN_METHODS, methodName)) {
                return;
            }

            const calleePath = buildCalleePath(node);
            const speciousObject = isForbiddenObviousApi(calleePath);

            if (speciousObject === 'document') {
                processDocumentMessage(node, methodName);
            } else if (speciousObject === 'location' && contains(FORBIDDEN_LOCATION_RELOAD, methodName)) {
                context.report({ node: node, messageId: 'locationReload' });
            } else if (speciousObject === 'navigator') {
                context.report({ node: node, messageId: 'proprietaryBrowserApi' });
            } else if (speciousObject === 'window' && !contains(FORBIDDEN_GLOB_EVENT, methodName)) {
                processWindowMessage(node, methodName);
            } else if (speciousObject !== 'document' && contains(FORBIDDEN_DOCUMENT_OBJECT, speciousObject)) {
                processDocumentMessage(node, methodName);
            } else if (speciousObject !== 'location' && contains(FORBIDDEN_LOCATION_OBJECT, speciousObject)) {
                context.report({ node: node, messageId: 'locationReload' });
            } else if (speciousObject !== 'window' && contains(FORBIDDEN_WINDOW_OBJECT, speciousObject)) {
                context.report({ node: node, messageId: 'proprietaryBrowserApi' });
            }
        }

        /**
         * Handle computed property access cases for MemberExpression.
         *
         * @param node The MemberExpression node
         */
        function handleComputedProperty(node: any): void {
            const calleePathCmpt = buildCalleePath(node.object);
            const speciousObjectCmpt = isForbiddenObviousApi(calleePathCmpt);

            // For computed property, node.object might be a MemberExpression like mydocument.styleSheets
            // We need to get 'styleSheets' from it
            const objectAsMember = asMemberExpression(node.object);
            const methodNameCmpt = objectAsMember ? getPropertyName(objectAsMember.property) : undefined;

            if (typeof methodNameCmpt !== 'string' || !contains(FORBIDDEN_DYNAMIC_STYLE_INSERTION, methodNameCmpt)) {
                return;
            }

            if (speciousObjectCmpt === 'document' || contains(FORBIDDEN_DOCUMENT_OBJECT, speciousObjectCmpt)) {
                // document.styleSheets[i] or myDocument.styleSheets[i]; for exp
                context.report({ node: node, messageId: 'dynamicStyleInsertion' });
            }
        }

        /**
         * Handle navigator-related checks.
         *
         * @param node The MemberExpression node
         * @param calleePathNonCmpt The callee path
         */
        function handleNavigatorChecks(node: any, calleePathNonCmpt: string): void {
            const propertyName = getPropertyName(node.property);
            const isNavigatorAccess =
                calleePathNonCmpt === 'navigator' ||
                calleePathNonCmpt === 'window.navigator' ||
                (calleePathNonCmpt === 'window' && propertyName === 'navigator');

            if (!isNavigatorAccess) {
                return;
            }

            const parent = getParent(node);
            const isWindowNavigatorAssignment =
                (calleePathNonCmpt === 'window.navigator' ||
                    (calleePathNonCmpt === 'window' && propertyName === 'navigator')) &&
                parent?.type === 'VariableDeclarator';

            const grandparent = parent ? getParent(parent) : undefined;
            if (grandparent && grandparent.type !== 'CallExpression' && !isWindowNavigatorAssignment) {
                // const x = navigator.appCodeName; for exp
                context.report({ node: node, messageId: 'proprietaryBrowserApi' });
            }
        }

        /**
         * Handle window property checks.
         *
         * @param node The MemberExpression node
         * @param calleePathNonCmpt The callee path
         */
        function handleWindowPropertyChecks(node: any, calleePathNonCmpt: string): void {
            if (calleePathNonCmpt !== 'window') {
                return;
            }

            const propertyName = getPropertyName(node.property);
            if (!propertyName) {
                return;
            }

            const parent = getParent(node);
            if (!contains(FORBIDDEN_GLOB_EVENT, propertyName)) {
                // window.onresize = 16; for exp
                processWindowMessage(node, propertyName);
            } else if (contains(FORBIDDEN_GLOB_EVENT, propertyName) && parent?.type === 'AssignmentExpression') {
                const assignmentParent = asAssignmentExpression(parent);
                if (assignmentParent && assignmentParent.left === node) {
                    context.report({ node: node, messageId: 'forbiddenGlobEvent' });
                }
            }
        }

        /**
         * Handle event property checks.
         *
         * @param node The MemberExpression node
         * @param calleePathNonCmpt The callee path
         */
        function handleEventPropertyChecks(node: any, calleePathNonCmpt: string): void {
            const propertyName = getPropertyName(node.property);
            if (!propertyName) {
                return;
            }

            const parent = getParent(node);
            const isEventProperty = propertyName === 'returnValue' || propertyName === 'cancelBubble';
            if (!isEventProperty) {
                return;
            }

            const assignmentParent = asAssignmentExpression(parent);
            const isAssignmentTarget = assignmentParent && assignmentParent.left === node;

            if (!isAssignmentTarget) {
                return;
            }

            if (calleePathNonCmpt === 'window.event' || contains(FORBIDDEN_WINDOW_EVENT_OBJECT, calleePathNonCmpt)) {
                context.report({ node: node, messageId: 'forbiddenGlobEvent' });
            }
        }

        /**
         * Handle styleSheets property checks.
         *
         * @param node The MemberExpression node
         * @param calleePathNonCmpt The callee path
         * @param speciousObjectNonCmpt The specious object
         */
        function handleStyleSheetsChecks(node: any, calleePathNonCmpt: string, speciousObjectNonCmpt: string): void {
            if (!calleePathNonCmpt.endsWith('styleSheets')) {
                return;
            }

            if (speciousObjectNonCmpt === 'document' || contains(FORBIDDEN_DOCUMENT_OBJECT, speciousObjectNonCmpt)) {
                // const abc = document.styleSheets.length or myDocument.styleSheets.length; for exp
                context.report({ node: node, messageId: 'dynamicStyleInsertion' });
            }
        }

        /**
         * Handle non-computed property access cases for MemberExpression.
         *
         * @param node The MemberExpression node
         */
        function handleNonComputedProperty(node: any): void {
            const calleePathNonCmpt = buildCalleePath(node);
            const speciousObjectNonCmpt = isForbiddenObviousApi(
                calleePathNonCmpt.substring(0, calleePathNonCmpt.lastIndexOf('styleSheets') - 1)
            );

            handleNavigatorChecks(node, calleePathNonCmpt);
            handleWindowPropertyChecks(node, calleePathNonCmpt);
            handleEventPropertyChecks(node, calleePathNonCmpt);
            handleStyleSheetsChecks(node, calleePathNonCmpt, speciousObjectNonCmpt);
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'VariableDeclarator': function (node): void {
                processVariableDeclarator(node);
            },
            'MemberExpression': function (node): void {
                const parent = getParent(node);

                if (isCall(parent)) {
                    handleCallExpression(node, parent);
                } else if (node.computed) {
                    handleComputedProperty(node);
                } else {
                    handleNonComputedProperty(node);
                }
            }
        };
    }
};

export default rule;
