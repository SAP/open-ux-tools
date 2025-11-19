/**
 * @file Detect some forbidden usages of (window.)document APIs
 */

import type { Rule } from 'eslint';
import { isIdentifier, isMember, isCall, isLiteral, contains } from '../utils/ast-helpers';

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
    create(context: Rule.RuleContext) {
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
         * Get the rightmost method name from a node.
         *
         * @param node The node to extract method name from
         * @returns The rightmost method name
         */
        function getRightestMethodName(node: Rule.Node): string {
            const callee = (node as any).callee;
            return isMember(callee) ? callee.property.name : callee.name;
        }

        /**
         * Build a path string from a callee node.
         *
         * @param node The callee node to build path from
         * @returns The path string representation
         */
        function buildCalleePath(node: Rule.Node): string {
            if (isMember((node as any).object)) {
                const propertyName = (node as any).object.property?.name ?? '';
                return `${buildCalleePath((node as any).object)}.${propertyName}`;
            } else if (isIdentifier((node as any).object)) {
                return (node as any).object.name;
            }
            return '';
        }

        /**
         * Check if the callee path represents a forbidden obvious API.
         *
         * @param calleePath The path to check
         * @returns The last element of the path
         */
        function isForbiddenObviousApi(calleePath: string): string {
            const elementArray = calleePath.split('.');
            return elementArray.at(-1) ?? '';
        }

        /**
         * Process document-related API usage and report violations.
         *
         * @param node The AST node to process
         * @param methodName The method name being called
         */
        function processDocumentMessage(node: Rule.Node, methodName: string): void {
            const parent = node.parent;
            if (contains(FORBIDDEN_DOM_INSERTION, methodName)) {
                if (
                    !(
                        methodName === 'createElement' &&
                        isCall(parent) &&
                        (parent as any).arguments &&
                        (parent as any).arguments.length > 0 &&
                        isLiteral((parent as any).arguments[0]) &&
                        (parent as any).arguments[0].value === 'a'
                    )
                ) {
                    context.report({ node: node, messageId: 'domInsertion' });
                }
            } else if (contains(FORBIDDEN_DOM_MANIPULATION, methodName)) {
                context.report({ node: node, messageId: 'domManipulation' });
            } else if (
                contains(FORBIDDEN_DOCUMENT_USAGE, methodName) &&
                (parent as any).arguments.length !== 0 &&
                (parent as any).arguments[0].value === 'insertBrOnReturn'
            ) {
                context.report({ node: node, messageId: 'forbiddenDocumentUsage' });
            }
        }

        /**
         * Process variable declarator nodes for API usage.
         *
         * @param node The variable declarator node to process
         */
        function processVariableDeclarator(node: Rule.Node): void {
            const init = (node as any).init;
            if (init) {
                if (isMember(init)) {
                    const firstElement = init.object.name;
                    const secondElement = init.property.name;
                    const fullPath = `${firstElement}.${secondElement}`;
                    if (fullPath === 'window.document') {
                        FORBIDDEN_DOCUMENT_OBJECT.push((node as any).id.name);
                    } else if (fullPath === 'window.location') {
                        FORBIDDEN_LOCATION_OBJECT.push((node as any).id.name);
                    } else if (fullPath === 'window.navigator') {
                        context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                    } else if (fullPath === 'window.event') {
                        FORBIDDEN_WINDOW_EVENT_OBJECT.push((node as any).id.name);
                    }
                } else if (isIdentifier(init)) {
                    if (init.name === 'document') {
                        FORBIDDEN_DOCUMENT_OBJECT.push((node as any).id.name);
                    } else if (init.name === 'location') {
                        FORBIDDEN_LOCATION_OBJECT.push((node as any).id.name);
                    } else if (init.name === 'navigator') {
                        context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                    } else if (init.name === 'window') {
                        context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                        FORBIDDEN_WINDOW_OBJECT.push((node as any).id.name);
                    }
                }
            }
        }

        /**
         * Process window-related API usage and report violations.
         *
         * @param node The AST node to process
         * @param methodName The method name being called
         */
        function processWindowMessage(node: Rule.Node, methodName: string): void {
            if (contains(FORBIDDEN_NAVIGATOR_WINDOW, methodName)) {
                context.report({ node: node, messageId: 'proprietaryBrowserApi' });
            } else if (contains(FORBIDDEN_DEF_GLOB, methodName)) {
                context.report({ node: node, messageId: 'forbiddenDefGlob' });
            }
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'VariableDeclarator': function (node): void {
                processVariableDeclarator(node);
            },
            'MemberExpression': function (node): void {
                const parent = node.parent;
                if (isCall(parent)) {
                    const methodName = getRightestMethodName(parent);
                    if (typeof methodName === 'string' && contains(FORBIDDEN_METHODS, methodName)) {
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
                        } else if (
                            speciousObject !== 'document' &&
                            contains(FORBIDDEN_DOCUMENT_OBJECT, speciousObject)
                        ) {
                            processDocumentMessage(node, methodName);
                        } else if (
                            speciousObject !== 'location' &&
                            contains(FORBIDDEN_LOCATION_OBJECT, speciousObject)
                        ) {
                            context.report({ node: node, messageId: 'locationReload' });
                        } else if (speciousObject !== 'window' && contains(FORBIDDEN_WINDOW_OBJECT, speciousObject)) {
                            context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                        }
                    }
                } else if ((node as any).computed) {
                    const calleePathCmpt = buildCalleePath((node as any).object);
                    const speciousObjectCmpt = isForbiddenObviousApi(calleePathCmpt),
                        methodNameCmpt =
                            (node as any).object &&
                            'property' in (node as any).object &&
                            (node as any).object.property &&
                            'name' in (node as any).object.property
                                ? (node as any).object.property.name
                                : '';
                    if (
                        typeof methodNameCmpt === 'string' &&
                        contains(FORBIDDEN_DYNAMIC_STYLE_INSERTION, methodNameCmpt) &&
                        speciousObjectCmpt === 'document'
                    ) {
                        /*
                         * document.styleSheets[i]; for exp
                         */
                        context.report({ node: node, messageId: 'dynamicStyleInsertion' });
                    } else if (
                        typeof methodNameCmpt === 'string' &&
                        contains(FORBIDDEN_DYNAMIC_STYLE_INSERTION, methodNameCmpt) &&
                        speciousObjectCmpt !== 'document' &&
                        contains(FORBIDDEN_DOCUMENT_OBJECT, speciousObjectCmpt)
                    ) {
                        /*
                         * myDocument.styleSheets[i]; for exp
                         */
                        context.report({ node: node, messageId: 'dynamicStyleInsertion' });
                    }
                } else {
                    const calleePathNonCmpt = buildCalleePath(node);
                    const speciousObjectNonCmpt = isForbiddenObviousApi(
                        calleePathNonCmpt.substr(0, calleePathNonCmpt.lastIndexOf('styleSheets') - 1)
                    );
                    if (
                        calleePathNonCmpt === 'navigator' ||
                        calleePathNonCmpt === 'window.navigator' ||
                        (calleePathNonCmpt === 'window' &&
                            (node as any).property &&
                            'name' in (node as any).property &&
                            (node as any).property.name === 'navigator')
                    ) {
                        // Only report if not inside CallExpression AND
                        // if it's window.navigator exactly (not a property access on it), don't report if parent is VariableDeclarator
                        const isWindowNavigatorAssignment =
                            (calleePathNonCmpt === 'window.navigator' ||
                                (calleePathNonCmpt === 'window' &&
                                    (node as any).property &&
                                    'name' in (node as any).property &&
                                    (node as any).property.name === 'navigator')) &&
                            node.parent.type === 'VariableDeclarator';

                        if (node.parent.parent.type !== 'CallExpression' && !isWindowNavigatorAssignment) {
                            /*
                             * const x = navigator.appCodeName; for exp
                             */
                            context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                        }
                    }
                    if (
                        calleePathNonCmpt === 'window' &&
                        (node as any).property &&
                        'name' in (node as any).property &&
                        !contains(FORBIDDEN_GLOB_EVENT, (node as any).property.name)
                    ) {
                        /*
                         * window.onresize = 16; for exp
                         */
                        processWindowMessage(node, (node as any).property.name);
                    } else if (
                        calleePathNonCmpt === 'window' &&
                        (node as any).property &&
                        'name' in (node as any).property &&
                        contains(FORBIDDEN_GLOB_EVENT, (node as any).property.name) &&
                        node.parent.type === 'AssignmentExpression' &&
                        (node.parent as any).left === node
                    ) {
                        context.report({ node: node, messageId: 'forbiddenGlobEvent' });
                    }

                    if (
                        (node as any).property &&
                        'name' in (node as any).property &&
                        ((node as any).property.name === 'returnValue' ||
                            (node as any).property.name === 'cancelBubble') &&
                        node.parent.type === 'AssignmentExpression' &&
                        (node.parent as any).left === node
                    ) {
                        if (calleePathNonCmpt === 'window.event') {
                            context.report({ node: node, messageId: 'forbiddenGlobEvent' });
                        } else if (contains(FORBIDDEN_WINDOW_EVENT_OBJECT, calleePathNonCmpt)) {
                            context.report({ node: node, messageId: 'forbiddenGlobEvent' });
                        }
                    }
                    if (calleePathNonCmpt.slice(-11) === 'styleSheets' && speciousObjectNonCmpt === 'document') {
                        /*
                         * const abc = document.styleSheets.length; for exp
                         */
                        context.report({ node: node, messageId: 'dynamicStyleInsertion' });
                    } else if (
                        calleePathNonCmpt.slice(-11) === 'styleSheets' &&
                        speciousObjectNonCmpt !== 'document' &&
                        contains(FORBIDDEN_DOCUMENT_OBJECT, speciousObjectNonCmpt)
                    ) {
                        /*
                         * const abc = myDocument.styleSheets.length; for exp
                         */
                        context.report({ node: node, messageId: 'dynamicStyleInsertion' });
                    }
                }
            }
        };
    }
};

export default rule;
