/**
 * @fileoverview Detect some forbidden usages of (window.)document APIs
 * @author Achref Kilani Jrad
 */

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

/*eslint-disable global-strict*/

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
module.exports = function (context) {
    'use strict';
    var FORBIDDEN_DOM_INSERTION = [
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

    var FULL_BLACKLIST = FORBIDDEN_DOM_INSERTION.concat(
        FORBIDDEN_DOM_MANIPULATION,
        FORBIDDEN_DYNAMIC_STYLE_INSERTION,
        FORBIDDEN_LOCATION_RELOAD,
        FORBIDDEN_NAVIGATOR_WINDOW,
        FORBIDDEN_DEF_GLOB,
        FORBIDDEN_GLOB_EVENT,
        FORBIDDEN_DOCUMENT_USAGE
    );
    FULL_BLACKLIST.push('back');

    var FORBIDDEN_DOCUMENT_OBJECT = [],
        FORBIDDEN_LOCATION_OBJECT = [],
        FORBIDDEN_WINDOW_OBJECT = [],
        FORBIDDEN_WINDOW_EVENT_OBJECT = [];

    var MESSAGE_DOM_INSERTION = 'Direct DOM insertion, create a custom control instead', // 16
        MESSAGE_DOM_MANIPULATION = 'Direct DOM Manipulation, better to use jQuery.appendTo if really needed', // 18
        MESSAGE_DYNAMIC_STYLE_INSERTION = 'Dynamic style insertion, use library CSS or lessifier instead', // 19
        MESSAGE_LOCATION_RELOAD = 'location.reload() is not permitted.', // 15
        MESSAGE_FORBIDDEN_DOCUMENT_USAGE =
            "insertBrOnReturn is not allowed since it is a Mozilla specific method, Chrome doesn't support that.", // 26
        MESSAGE_FORBIDDEN_PROPRIETARY_BROWSER_API = 'Proprietary Browser API access, use sap.ui.Device API instead', // 27
        MESSAGE_FORBIDDEN_DEF_GLOB = 'Definition of global variable/api in window object is not permitted.', // 28
        MESSAGE_FORBIDDEN_GLOB_EVENT =
            'Global event handling override is not permitted, please modify only single events'; // 31

    // --------------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------------
    function contains(a, obj) {
        for (var i = 0; i < a.length; i++) {
            if (obj === a[i]) {
                return true;
            }
        }
        return false;
    }

    function getRightestMethodName(node) {
        if (node.callee.type === 'MemberExpression') {
            return node.callee.property.name;
        } else {
            return node.callee.name;
        }
    }

    function buildCalleePath(memberExpressionNode, calleePath) {
        if (memberExpressionNode.object) {
            if (memberExpressionNode.object.type === 'MemberExpression') {
                return (
                    buildCalleePath(memberExpressionNode.object, calleePath) +
                    '.' +
                    memberExpressionNode.object.property.name
                );
            } else if (memberExpressionNode.object.type === 'Identifier') {
                calleePath += memberExpressionNode.object.name;
                return calleePath;
            }
        }
    }

    function isForbiddenObviousApi(calleePath) {
        var elementArray = calleePath.split('.');
        var lastElement = elementArray[elementArray.length - 1];

        return lastElement;
    }

    function processDocumentMessage(node, methodName) {
        if (contains(FORBIDDEN_DOM_INSERTION, methodName)) {
            context.report(node, MESSAGE_DOM_INSERTION);
        } else if (contains(FORBIDDEN_DOM_MANIPULATION, methodName)) {
            context.report(node, MESSAGE_DOM_MANIPULATION);
        } else if (
            contains(FORBIDDEN_DOCUMENT_USAGE, methodName) &&
            node.parent.arguments.length !== 0 &&
            node.parent.arguments[0].value === 'insertBrOnReturn'
        ) {
            context.report(node, MESSAGE_FORBIDDEN_DOCUMENT_USAGE);
        }
    }

    function processVariableDeclarator(node) {
        if (node.init) {
            if (node.init.type === 'MemberExpression') {
                var firstElement = node.init.object.name,
                    secondElement = node.init.property.name;
                if (firstElement + '.' + secondElement === 'window.document') {
                    FORBIDDEN_DOCUMENT_OBJECT.push(node.id.name);
                } else if (firstElement + '.' + secondElement === 'window.location') {
                    FORBIDDEN_LOCATION_OBJECT.push(node.id.name);
                } else if (firstElement + '.' + secondElement === 'window.navigator') {
                    context.report(node, MESSAGE_FORBIDDEN_PROPRIETARY_BROWSER_API);
                } else if (firstElement + '.' + secondElement === 'window.event') {
                    FORBIDDEN_WINDOW_EVENT_OBJECT.push(node.id.name);
                }
            } else if (node.init.type === 'Identifier' && node.init.name === 'document') {
                FORBIDDEN_DOCUMENT_OBJECT.push(node.id.name);
            } else if (node.init.type === 'Identifier' && node.init.name === 'location') {
                FORBIDDEN_LOCATION_OBJECT.push(node.id.name);
            } else if (node.init.type === 'Identifier' && node.init.name === 'navigator') {
                context.report(node, MESSAGE_FORBIDDEN_PROPRIETARY_BROWSER_API);
            } else if (node.init.type === 'Identifier' && node.init.name === 'window') {
                context.report(node, MESSAGE_FORBIDDEN_PROPRIETARY_BROWSER_API);
                FORBIDDEN_WINDOW_OBJECT.push(node.id.name);
            }
        }
    }

    function processWindowMessage(node, methodName) {
        if (contains(FORBIDDEN_NAVIGATOR_WINDOW, methodName)) {
            context.report(node, MESSAGE_FORBIDDEN_PROPRIETARY_BROWSER_API);
        } else if (contains(FORBIDDEN_DEF_GLOB, methodName)) {
            context.report(node, MESSAGE_FORBIDDEN_DEF_GLOB);
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
            if (node.parent.type === 'CallExpression') {
                var methodName = getRightestMethodName(node.parent);
                if (typeof methodName === 'string' && contains(FULL_BLACKLIST, methodName)) {
                    var memberExpressionNode = node;
                    var calleePath = '';
                    calleePath += buildCalleePath(memberExpressionNode, calleePath);
                    var speciousObject = isForbiddenObviousApi(calleePath);

                    if (speciousObject === 'document') {
                        processDocumentMessage(node, methodName);
                    } else if (speciousObject === 'location' && contains(FORBIDDEN_LOCATION_RELOAD, methodName)) {
                        context.report(node, MESSAGE_LOCATION_RELOAD);
                    } else if (speciousObject === 'navigator') {
                        context.report(node, MESSAGE_FORBIDDEN_PROPRIETARY_BROWSER_API);
                    } else if (speciousObject === 'window' && !contains(FORBIDDEN_GLOB_EVENT, methodName)) {
                        processWindowMessage(node, methodName);
                    } else if (speciousObject !== 'document' && contains(FORBIDDEN_DOCUMENT_OBJECT, speciousObject)) {
                        processDocumentMessage(node, methodName);
                    } else if (speciousObject !== 'location' && contains(FORBIDDEN_LOCATION_OBJECT, speciousObject)) {
                        context.report(node, MESSAGE_LOCATION_RELOAD);
                    } else if (speciousObject !== 'window' && contains(FORBIDDEN_WINDOW_OBJECT, speciousObject)) {
                        context.report(node, MESSAGE_FORBIDDEN_PROPRIETARY_BROWSER_API);
                    }
                }
            } else {
                if (node.computed) {
                    var calleePathCmpt = '';
                    calleePathCmpt += buildCalleePath(node.object, calleePathCmpt);
                    var speciousObjectCmpt = isForbiddenObviousApi(calleePathCmpt),
                        methodNameCmpt = node.object.property ? node.object.property.name : -1;

                    if (
                        contains(FORBIDDEN_DYNAMIC_STYLE_INSERTION, methodNameCmpt) &&
                        speciousObjectCmpt === 'document'
                    ) {
                        /*
                         * document.styleSheets[i]; for exp
                         */
                        context.report(node, MESSAGE_DYNAMIC_STYLE_INSERTION);
                    } else if (
                        contains(FORBIDDEN_DYNAMIC_STYLE_INSERTION, methodNameCmpt) &&
                        speciousObjectCmpt !== 'document' &&
                        contains(FORBIDDEN_DOCUMENT_OBJECT, speciousObjectCmpt)
                    ) {
                        /*
                         * myDocument.styleSheets[i]; for exp
                         */
                        context.report(node, MESSAGE_DYNAMIC_STYLE_INSERTION);
                    }
                } else {
                    var calleePathNonCmpt = '';
                    calleePathNonCmpt += buildCalleePath(node, calleePathNonCmpt);
                    var speciousObjectNonCmpt = isForbiddenObviousApi(
                        calleePathNonCmpt.substr(0, calleePathNonCmpt.lastIndexOf('styleSheets') - 1)
                    );

                    if (
                        calleePathNonCmpt === 'navigator' ||
                        calleePathNonCmpt === 'window.navigator' ||
                        (calleePathNonCmpt === 'window' &&
                            node.property &&
                            node.property.name === 'navigator' &&
                            node.parent.parent.type !== 'CallExpression' &&
                            node.child === 'undefined')
                    ) {
                        /*
                         * var x = navigator.appCodeName; for exp
                         */
                        context.report(node, MESSAGE_FORBIDDEN_PROPRIETARY_BROWSER_API);
                    }

                    if (
                        calleePathNonCmpt === 'window' &&
                        node.property &&
                        !contains(FORBIDDEN_GLOB_EVENT, node.property.name)
                    ) {
                        /*
                         * window.onresize = 16; for exp
                         */
                        processWindowMessage(node, node.property.name);
                    } else if (
                        calleePathNonCmpt === 'window' &&
                        node.property &&
                        contains(FORBIDDEN_GLOB_EVENT, node.property.name) &&
                        node.parent.type === 'AssignmentExpression' &&
                        node.parent.left === node
                    ) {
                        context.report(node, MESSAGE_FORBIDDEN_GLOB_EVENT);
                    }

                    if (
                        node.property &&
                        (node.property.name === 'returnValue' || node.property.name === 'cancelBubble') &&
                        node.parent.type === 'AssignmentExpression' &&
                        node.parent.left === node
                    ) {
                        if (calleePathNonCmpt === 'window.event') {
                            context.report(node, MESSAGE_FORBIDDEN_GLOB_EVENT);
                        } else if (contains(FORBIDDEN_WINDOW_EVENT_OBJECT, calleePathNonCmpt)) {
                            context.report(node, MESSAGE_FORBIDDEN_GLOB_EVENT);
                        }
                    }

                    if (calleePathNonCmpt.slice(-11) === 'styleSheets' && speciousObjectNonCmpt === 'document') {
                        /*
                         * var abc = document.styleSheets.length; for exp
                         */
                        context.report(node, MESSAGE_DYNAMIC_STYLE_INSERTION);
                    } else if (
                        calleePathNonCmpt.slice(-11) === 'styleSheets' &&
                        speciousObjectNonCmpt !== 'document' &&
                        contains(FORBIDDEN_DOCUMENT_OBJECT, speciousObjectNonCmpt)
                    ) {
                        /*
                         * var abc = myDocument.styleSheets.length; for exp
                         */
                        context.report(node, MESSAGE_DYNAMIC_STYLE_INSERTION);
                    }
                }
            }
        }
    };
};
