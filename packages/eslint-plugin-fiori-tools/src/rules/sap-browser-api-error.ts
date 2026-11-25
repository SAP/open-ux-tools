/**
 * @file Detect some forbidden usages of (window.)document APIs
 */

import type { Rule } from 'eslint';
import type {
    MemberExpression,
    SimpleCallExpression,
    VariableDeclarator,
    AssignmentExpression,
    Identifier,
    Literal
} from 'estree';
import { isType, isCall, buildCalleePath, isForbiddenObviousApi, type ASTNode } from '../utils/helpers.js';

// ------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------

const FORBIDDEN_DOM_INSERTION = [
    'createElement',
    'createTextNode',
    'createElementNS',
    'createDocumentFragment',
    'createComment',
    'createAttribute',
    'createEvent'
] as const;

const FORBIDDEN_DOM_MANIPULATION = ['execCommand'] as const;
const FORBIDDEN_DYNAMIC_STYLE_INSERTION = ['styleSheets'] as const;
const FORBIDDEN_LOCATION_RELOAD = ['reload'] as const;
const FORBIDDEN_DOCUMENT_USAGE = ['queryCommandSupported'] as const;
const FORBIDDEN_NAVIGATOR_WINDOW = ['javaEnabled', 'addEventListener', 'onresize'] as const;
const FORBIDDEN_DEF_GLOB = ['define', 'top', 'groupBy'] as const;
const FORBIDDEN_GLOB_EVENT = [
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
] as const;

const FULL_BLOCKLIST = new Set<string>([
    ...FORBIDDEN_DOM_INSERTION,
    ...FORBIDDEN_DOM_MANIPULATION,
    ...FORBIDDEN_DYNAMIC_STYLE_INSERTION,
    ...FORBIDDEN_LOCATION_RELOAD,
    ...FORBIDDEN_DOCUMENT_USAGE,
    ...FORBIDDEN_NAVIGATOR_WINDOW,
    ...FORBIDDEN_DEF_GLOB,
    ...FORBIDDEN_GLOB_EVENT,
    'back'
]);

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

/**
 * Get the rightmost method name from a call expression node.
 *
 * @param node The call expression node
 * @returns The rightmost method name or undefined
 */
function getRightestMethodName(node: SimpleCallExpression): string | undefined {
    const { callee } = node;
    if (callee.type === 'MemberExpression') {
        const prop = callee.property;
        return prop.type === 'Identifier' ? prop.name : undefined;
    }
    if (callee.type === 'Identifier') {
        return callee.name;
    }
    return undefined;
}

/**
 * Extract the two-part dotted path from a MemberExpression init (e.g. "window.document").
 *
 * @param init The MemberExpression init node
 * @returns Dotted path string or undefined
 */
function getMemberExpressionPath(init: MemberExpression): string | undefined {
    const first = init.object.type === 'Identifier' ? (init.object as Identifier).name : undefined;
    const second = init.property.type === 'Identifier' ? (init.property as Identifier).name : undefined;
    return first && second ? `${first}.${second}` : undefined;
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description:
                'Detect forbidden browser API usages (direct DOM manipulation, navigator, location.reload, global events) that violate SAP Fiori development guidelines.',
            recommended: true
        },
        messages: {
            domInsertion: 'Direct DOM insertion, create a custom control instead',
            domManipulation: 'Direct DOM Manipulation, better to use jQuery.appendTo if really needed',
            dynamicStyleInsertion: 'Dynamic style insertion, use library CSS or lessifier instead',
            locationReload: 'location.reload() is not permitted.',
            forbiddenDocumentUsage:
                "insertBrOnReturn is not allowed since it is a Mozilla specific method, Chrome doesn't support that.",
            proprietaryBrowserApi: 'Proprietary Browser API access, use sap.ui.Device API instead',
            defGlob: 'Definition of global variable/api in window object is not permitted.',
            globEvent: 'Global event handling override is not permitted, please modify only single events'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const FORBIDDEN_DOCUMENT_OBJECT: string[] = [];
        const FORBIDDEN_LOCATION_OBJECT: string[] = [];
        const FORBIDDEN_WINDOW_OBJECT: string[] = [];
        const FORBIDDEN_WINDOW_EVENT_OBJECT: string[] = [];

        /**
         * Process document-related method calls and report violations.
         *
         * @param node The member expression node
         * @param methodName The method name being called
         */
        function processDocumentMessage(node: MemberExpression & Rule.NodeParentExtension, methodName: string): void {
            const { parent } = node;
            if (FORBIDDEN_DOM_INSERTION.includes(methodName as (typeof FORBIDDEN_DOM_INSERTION)[number])) {
                const parentCall = parent as SimpleCallExpression;
                const isAnchorException =
                    methodName === 'createElement' &&
                    isCall(parent) &&
                    parentCall.arguments.length > 0 &&
                    parentCall.arguments[0].type === 'Literal' &&
                    (parentCall.arguments[0] as Literal).value === 'a';
                if (!isAnchorException) {
                    context.report({ node, messageId: 'domInsertion' });
                }
            } else if (FORBIDDEN_DOM_MANIPULATION.includes(methodName as (typeof FORBIDDEN_DOM_MANIPULATION)[number])) {
                context.report({ node, messageId: 'domManipulation' });
            } else if (
                FORBIDDEN_DOCUMENT_USAGE.includes(methodName as (typeof FORBIDDEN_DOCUMENT_USAGE)[number]) &&
                isCall(parent) &&
                (parent as SimpleCallExpression).arguments.length > 0 &&
                ((parent as SimpleCallExpression).arguments[0] as Literal).value === 'insertBrOnReturn'
            ) {
                context.report({ node, messageId: 'forbiddenDocumentUsage' });
            }
        }

        /**
         * Process window-related method calls and report violations.
         *
         * @param node The member expression node
         * @param methodName The method name being accessed
         */
        function processWindowMessage(node: MemberExpression & Rule.NodeParentExtension, methodName: string): void {
            if (FORBIDDEN_NAVIGATOR_WINDOW.includes(methodName as (typeof FORBIDDEN_NAVIGATOR_WINDOW)[number])) {
                context.report({ node, messageId: 'proprietaryBrowserApi' });
            } else if (FORBIDDEN_DEF_GLOB.includes(methodName as (typeof FORBIDDEN_DEF_GLOB)[number])) {
                context.report({ node, messageId: 'defGlob' });
            }
        }

        /**
         * Process a MemberExpression init (e.g. `window.document`) in a variable declarator.
         *
         * @param node The variable declarator node (for reporting)
         * @param init The MemberExpression init
         * @param varName The declared variable name
         */
        function processMemberExpressionInit(
            node: VariableDeclarator & Rule.NodeParentExtension,
            init: MemberExpression,
            varName: string
        ): void {
            const path = getMemberExpressionPath(init);
            if (!path) {
                return;
            }
            if (path === 'window.document') {
                FORBIDDEN_DOCUMENT_OBJECT.push(varName);
            } else if (path === 'window.location') {
                FORBIDDEN_LOCATION_OBJECT.push(varName);
            } else if (path === 'window.navigator') {
                context.report({ node, messageId: 'proprietaryBrowserApi' });
            } else if (path === 'window.event') {
                FORBIDDEN_WINDOW_EVENT_OBJECT.push(varName);
            }
        }

        /**
         * Process an Identifier init (e.g. `document`, `window`) in a variable declarator.
         *
         * @param node The variable declarator node (for reporting)
         * @param init The Identifier init
         * @param varName The declared variable name
         */
        function processIdentifierInit(
            node: VariableDeclarator & Rule.NodeParentExtension,
            init: Identifier,
            varName: string
        ): void {
            const initName = init.name;
            if (initName === 'document') {
                FORBIDDEN_DOCUMENT_OBJECT.push(varName);
            } else if (initName === 'location') {
                FORBIDDEN_LOCATION_OBJECT.push(varName);
            } else if (initName === 'navigator') {
                context.report({ node, messageId: 'proprietaryBrowserApi' });
            } else if (initName === 'window') {
                context.report({ node, messageId: 'proprietaryBrowserApi' });
                FORBIDDEN_WINDOW_OBJECT.push(varName);
            }
        }

        /**
         * Process variable declarator to track aliased globals.
         *
         * @param node The variable declarator node
         */
        function processVariableDeclarator(node: VariableDeclarator & Rule.NodeParentExtension): void {
            const { init } = node;
            if (!init) {
                return;
            }
            const varName = node.id.type === 'Identifier' ? (node.id as Identifier).name : undefined;
            if (!varName) {
                return;
            }

            if (init.type === 'MemberExpression') {
                processMemberExpressionInit(node, init as MemberExpression, varName);
            } else if (init.type === 'Identifier') {
                processIdentifierInit(node, init as Identifier, varName);
            }
        }

        // --------------------------------------------------------------------------
        // MemberExpression call-expression handlers (parent is a CallExpression)
        // --------------------------------------------------------------------------

        /**
         * Handle document-related call expressions.
         *
         * @param node The member expression node
         * @param methodName The method name
         * @param speciousObject The object being accessed
         * @returns True if handled
         */
        function handleCallDocument(
            node: MemberExpression & Rule.NodeParentExtension,
            methodName: string,
            speciousObject: string
        ): boolean {
            if (speciousObject === 'document' || FORBIDDEN_DOCUMENT_OBJECT.includes(speciousObject)) {
                processDocumentMessage(node, methodName);
                return true;
            }
            return false;
        }

        /**
         * Handle location-related call expressions.
         *
         * @param node The member expression node
         * @param methodName The method name
         * @param speciousObject The object being accessed
         * @returns True if handled
         */
        function handleCallLocation(
            node: MemberExpression & Rule.NodeParentExtension,
            methodName: string,
            speciousObject: string
        ): boolean {
            if (
                (speciousObject === 'location' || FORBIDDEN_LOCATION_OBJECT.includes(speciousObject)) &&
                FORBIDDEN_LOCATION_RELOAD.includes(methodName as (typeof FORBIDDEN_LOCATION_RELOAD)[number])
            ) {
                context.report({ node, messageId: 'locationReload' });
                return true;
            }
            return false;
        }

        /**
         * Handle navigator-related call expressions.
         *
         * @param node The member expression node
         * @param speciousObject The object being accessed
         * @returns True if handled
         */
        function handleCallNavigator(
            node: MemberExpression & Rule.NodeParentExtension,
            speciousObject: string
        ): boolean {
            if (speciousObject === 'navigator') {
                context.report({ node, messageId: 'proprietaryBrowserApi' });
                return true;
            }
            return false;
        }

        /**
         * Handle window-related call expressions.
         *
         * @param node The member expression node
         * @param methodName The method name
         * @param speciousObject The object being accessed
         * @returns True if handled
         */
        function handleCallWindow(
            node: MemberExpression & Rule.NodeParentExtension,
            methodName: string,
            speciousObject: string
        ): boolean {
            if (speciousObject !== 'window') {
                return false;
            }
            if (!FORBIDDEN_GLOB_EVENT.includes(methodName as (typeof FORBIDDEN_GLOB_EVENT)[number])) {
                processWindowMessage(node, methodName);
                return true;
            }
            return false;
        }

        /**
         * Handle window-alias call expressions.
         *
         * @param node The member expression node
         * @param speciousObject The object being accessed
         * @returns True if handled
         */
        function handleCallWindowAlias(
            node: MemberExpression & Rule.NodeParentExtension,
            speciousObject: string
        ): boolean {
            if (speciousObject !== 'window' && FORBIDDEN_WINDOW_OBJECT.includes(speciousObject)) {
                context.report({ node, messageId: 'proprietaryBrowserApi' });
                return true;
            }
            return false;
        }

        /**
         * Handle a MemberExpression whose parent is a CallExpression.
         *
         * @param node The member expression node
         */
        function handleCallMemberExpression(node: MemberExpression & Rule.NodeParentExtension): void {
            const methodName = getRightestMethodName(node.parent as SimpleCallExpression);
            if (typeof methodName !== 'string' || !FULL_BLOCKLIST.has(methodName)) {
                return;
            }
            const calleePath = buildCalleePath(node as unknown as ASTNode);
            const speciousObject = isForbiddenObviousApi(calleePath);

            if (handleCallDocument(node, methodName, speciousObject)) {
                return;
            }
            if (handleCallLocation(node, methodName, speciousObject)) {
                return;
            }
            if (handleCallNavigator(node, speciousObject)) {
                return;
            }
            if (handleCallWindow(node, methodName, speciousObject)) {
                return;
            }
            handleCallWindowAlias(node, speciousObject);
        }

        // --------------------------------------------------------------------------
        // MemberExpression non-call handlers (parent is NOT a CallExpression)
        // --------------------------------------------------------------------------

        /**
         * Handle computed member expressions (e.g., document.styleSheets[i]).
         *
         * @param node The member expression node
         */
        function handleComputedMember(node: MemberExpression & Rule.NodeParentExtension): void {
            const obj = node.object;
            if (obj.type !== 'MemberExpression') {
                return;
            }
            const calleePathCmpt = buildCalleePath(obj as unknown as ASTNode);
            const speciousObjectCmpt = isForbiddenObviousApi(calleePathCmpt);
            const prop = obj.property;
            const methodNameCmpt = prop.type === 'Identifier' ? prop.name : undefined;

            const isDynStyle =
                typeof methodNameCmpt === 'string' &&
                FORBIDDEN_DYNAMIC_STYLE_INSERTION.includes(
                    methodNameCmpt as (typeof FORBIDDEN_DYNAMIC_STYLE_INSERTION)[number]
                );
            if (
                isDynStyle &&
                (speciousObjectCmpt === 'document' || FORBIDDEN_DOCUMENT_OBJECT.includes(speciousObjectCmpt))
            ) {
                context.report({ node, messageId: 'dynamicStyleInsertion' });
            }
        }

        /**
         * Handle navigator access in non-computed, non-call member expressions.
         *
         * @param node The member expression node
         * @param calleePathNonCmpt The callee path string
         */
        function handleNonCallNavigator(
            node: MemberExpression & Rule.NodeParentExtension,
            calleePathNonCmpt: string
        ): void {
            if (calleePathNonCmpt === 'navigator' || calleePathNonCmpt === 'window.navigator') {
                context.report({ node, messageId: 'proprietaryBrowserApi' });
            }
        }

        /**
         * Handle window property access (onresize, define, etc.) in non-call context.
         *
         * @param node The member expression node
         * @param calleePathNonCmpt The callee path string
         */
        function handleNonCallWindow(
            node: MemberExpression & Rule.NodeParentExtension,
            calleePathNonCmpt: string
        ): void {
            if (calleePathNonCmpt !== 'window') {
                return;
            }
            const prop = node.property;
            const propName = prop.type === 'Identifier' ? prop.name : undefined;
            if (!propName) {
                return;
            }
            if (!FORBIDDEN_GLOB_EVENT.includes(propName as (typeof FORBIDDEN_GLOB_EVENT)[number])) {
                processWindowMessage(node, propName);
            } else if (
                isType(node.parent, 'AssignmentExpression') &&
                (node.parent as AssignmentExpression).left === (node as MemberExpression)
            ) {
                context.report({ node, messageId: 'globEvent' });
            }
        }

        /**
         * Handle window.event / window event alias returnValue/cancelBubble access.
         *
         * @param node The member expression node
         * @param calleePathNonCmpt The callee path string
         */
        function handleNonCallWindowEvent(
            node: MemberExpression & Rule.NodeParentExtension,
            calleePathNonCmpt: string
        ): void {
            const prop = node.property;
            const propName = prop.type === 'Identifier' ? prop.name : undefined;
            if (propName !== 'returnValue' && propName !== 'cancelBubble') {
                return;
            }
            if (
                !isType(node.parent, 'AssignmentExpression') ||
                (node.parent as AssignmentExpression).left !== (node as MemberExpression)
            ) {
                return;
            }
            if (calleePathNonCmpt === 'window.event' || FORBIDDEN_WINDOW_EVENT_OBJECT.includes(calleePathNonCmpt)) {
                context.report({ node, messageId: 'globEvent' });
            }
        }

        /**
         * Handle non-computed styleSheets access (e.g., document.styleSheets.length).
         *
         * @param node The member expression node
         * @param calleePathNonCmpt The callee path string
         */
        function handleNonCallStyleSheets(
            node: MemberExpression & Rule.NodeParentExtension,
            calleePathNonCmpt: string
        ): void {
            if (!calleePathNonCmpt.endsWith('styleSheets')) {
                return;
            }
            const beforeStyleSheets = calleePathNonCmpt.slice(0, calleePathNonCmpt.lastIndexOf('styleSheets') - 1);
            const speciousObjectNonCmpt = isForbiddenObviousApi(beforeStyleSheets);
            if (speciousObjectNonCmpt === 'document' || FORBIDDEN_DOCUMENT_OBJECT.includes(speciousObjectNonCmpt)) {
                context.report({ node, messageId: 'dynamicStyleInsertion' });
            }
        }

        /**
         * Handle a MemberExpression whose parent is NOT a CallExpression.
         *
         * @param node The member expression node
         */
        function handleNonCallMemberExpression(node: MemberExpression & Rule.NodeParentExtension): void {
            if (node.computed) {
                handleComputedMember(node);
                return;
            }
            const calleePathNonCmpt = buildCalleePath(node as unknown as ASTNode);
            handleNonCallNavigator(node, calleePathNonCmpt);
            handleNonCallWindow(node, calleePathNonCmpt);
            handleNonCallWindowEvent(node, calleePathNonCmpt);
            handleNonCallStyleSheets(node, calleePathNonCmpt);
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            VariableDeclarator(node: VariableDeclarator & Rule.NodeParentExtension): void {
                processVariableDeclarator(node);
            },
            MemberExpression(node: MemberExpression & Rule.NodeParentExtension): void {
                if (isCall(node.parent)) {
                    handleCallMemberExpression(node);
                } else {
                    handleNonCallMemberExpression(node);
                }
            }
        };
    }
};

export default rule;
