/**
 * @file Detect some forbidden usages of (window.)document APIs
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

/*eslint-disable strict*/
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

        const FULL_BLACKLIST = FORBIDDEN_DOM_INSERTION.concat(
            FORBIDDEN_DOM_MANIPULATION,
            FORBIDDEN_DYNAMIC_STYLE_INSERTION,
            FORBIDDEN_LOCATION_RELOAD,
            FORBIDDEN_NAVIGATOR_WINDOW,
            FORBIDDEN_DEF_GLOB,
            FORBIDDEN_GLOB_EVENT,
            FORBIDDEN_DOCUMENT_USAGE
        );
        FULL_BLACKLIST.push('back');

        const FORBIDDEN_DOCUMENT_OBJECT: string[] = [],
            FORBIDDEN_LOCATION_OBJECT: string[] = [],
            FORBIDDEN_WINDOW_OBJECT: string[] = [],
            FORBIDDEN_WINDOW_EVENT_OBJECT: string[] = [];

        const MEMBER = 'MemberExpression', //
            CALL = 'CallExpression', //
            IDENTIFIER = 'Identifier', //
            //    UNARY = "UnaryExpression", //
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
         * @param node
         */
        function getRightestMethodName(node: any) {
            const callee = node.callee;
            return isMember(callee) ? callee.property.name : callee.name;
        }

        /**
         *
         * @param node
         */
        function buildCalleePath(node: any) {
            if (isMember(node.object)) {
                const propertyName =
                    node.object.property && 'name' in node.object.property ? node.object.property.name : '';
                return buildCalleePath(node.object) + '.' + propertyName;
            } else if (isIdentifier(node.object)) {
                return node.object.name;
            }
            return '';
        }

        /**
         *
         * @param calleePath
         */
        function isForbiddenObviousApi(calleePath) {
            const elementArray = calleePath.split('.');
            return elementArray[elementArray.length - 1];
        }

        /**
         *
         * @param node
         * @param methodName
         */
        function processDocumentMessage(node: any, methodName: any) {
            const parent = node.parent;
            if (contains(FORBIDDEN_DOM_INSERTION, methodName)) {
                if (
                    !(
                        methodName === 'createElement' &&
                        isCall(parent) &&
                        parent.arguments &&
                        parent.arguments.length > 0 &&
                        isLiteral(parent.arguments[0]) &&
                        parent.arguments[0].value === 'a'
                    )
                ) {
                    context.report({ node: node, messageId: 'domInsertion' });
                }
            } else if (contains(FORBIDDEN_DOM_MANIPULATION, methodName)) {
                context.report({ node: node, messageId: 'domManipulation' });
            } else if (
                contains(FORBIDDEN_DOCUMENT_USAGE, methodName) &&
                parent.arguments.length !== 0 &&
                parent.arguments[0].value === 'insertBrOnReturn'
            ) {
                context.report({ node: node, messageId: 'forbiddenDocumentUsage' });
            }
        }

        /**
         *
         * @param node
         */
        function processVariableDeclarator(node: any) {
            const init = node.init;
            if (init) {
                if (isMember(init)) {
                    const firstElement = init.object.name,
                        secondElement = init.property.name;
                    if (firstElement + '.' + secondElement === 'window.document') {
                        FORBIDDEN_DOCUMENT_OBJECT.push(node.id.name);
                    } else if (firstElement + '.' + secondElement === 'window.location') {
                        FORBIDDEN_LOCATION_OBJECT.push(node.id.name);
                    } else if (firstElement + '.' + secondElement === 'window.navigator') {
                        context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                    } else if (firstElement + '.' + secondElement === 'window.event') {
                        FORBIDDEN_WINDOW_EVENT_OBJECT.push(node.id.name);
                    }
                } else if (isIdentifier(init)) {
                    if (init.name === 'document') {
                        FORBIDDEN_DOCUMENT_OBJECT.push(node.id.name);
                    } else if (init.name === 'location') {
                        FORBIDDEN_LOCATION_OBJECT.push(node.id.name);
                    } else if (init.name === 'navigator') {
                        context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                    } else if (init.name === 'window') {
                        context.report({ node: node, messageId: 'proprietaryBrowserApi' });
                        FORBIDDEN_WINDOW_OBJECT.push(node.id.name);
                    }
                }
            }
        }

        /**
         *
         * @param node
         * @param methodName
         */
        function processWindowMessage(node: any, methodName: any) {
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
            'VariableDeclarator': function (node) {
                processVariableDeclarator(node);
            },
            'MemberExpression': function (node) {
                const parent = node.parent;
                if (isCall(parent)) {
                    const methodName = getRightestMethodName(parent);
                    if (typeof methodName === 'string' && contains(FULL_BLACKLIST, methodName)) {
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
                } else if (node.computed) {
                    const calleePathCmpt = buildCalleePath(node.object);
                    const speciousObjectCmpt = isForbiddenObviousApi(calleePathCmpt),
                        methodNameCmpt =
                            node.object &&
                            'property' in node.object &&
                            node.object.property &&
                            'name' in node.object.property
                                ? node.object.property.name
                                : -1;
                    if (
                        contains(FORBIDDEN_DYNAMIC_STYLE_INSERTION, methodNameCmpt) &&
                        speciousObjectCmpt === 'document'
                    ) {
                        /*
                         * document.styleSheets[i]; for exp
                         */
                        context.report({ node: node, messageId: 'dynamicStyleInsertion' });
                    } else if (
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
                            node.property &&
                            'name' in node.property &&
                            node.property.name === 'navigator')
                    ) {
                        // Only report if not inside CallExpression AND
                        // if it's window.navigator exactly (not a property access on it), don't report if parent is VariableDeclarator
                        const isWindowNavigatorAssignment =
                            (calleePathNonCmpt === 'window.navigator' ||
                                (calleePathNonCmpt === 'window' &&
                                    node.property &&
                                    'name' in node.property &&
                                    node.property.name === 'navigator')) &&
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
                        node.property &&
                        'name' in node.property &&
                        !contains(FORBIDDEN_GLOB_EVENT, node.property.name)
                    ) {
                        /*
                         * window.onresize = 16; for exp
                         */
                        processWindowMessage(node, node.property.name);
                    } else if (
                        calleePathNonCmpt === 'window' &&
                        node.property &&
                        'name' in node.property &&
                        contains(FORBIDDEN_GLOB_EVENT, node.property.name) &&
                        node.parent.type === 'AssignmentExpression' &&
                        node.parent.left === node
                    ) {
                        context.report({ node: node, messageId: 'forbiddenGlobEvent' });
                    }

                    if (
                        node.property &&
                        'name' in node.property &&
                        (node.property.name === 'returnValue' || node.property.name === 'cancelBubble') &&
                        node.parent.type === 'AssignmentExpression' &&
                        node.parent.left === node
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
