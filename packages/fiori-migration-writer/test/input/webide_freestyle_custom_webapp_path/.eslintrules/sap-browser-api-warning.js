/**
 * @fileoverview Detect some warning for usages of (window.)document APIs
 * @author Achref Kilani Jrad
 * @ESLint			Version 0.14.0 / February 2015
 */

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

/*eslint-disable global-strict*/

// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
module.exports = function (context) {
    'use strict';
    var FORBIDDEN_DOM_ACCESS = [
            'getElementById',
            'getElementsByClassName',
            'getElementsByName',
            'getElementsByTagName'
        ],
        FORBIDDEN_WINDOW_USAGES = ['innerWidth', 'innerHeight', 'setTimeout', 'getSelection'],
        FORBIDDEN_HISTROY_USAGES = ['go', 'back', 'forward'],
        FORBIDDEN_LOCATION_USAGES = ['href', 'hash', 'assign'];
    var FULL_BLACKLIST = FORBIDDEN_DOM_ACCESS.concat(
        FORBIDDEN_WINDOW_USAGES,
        FORBIDDEN_HISTROY_USAGES,
        FORBIDDEN_LOCATION_USAGES
    );

    var FORBIDDEN_DOCUMENT_OBJECT = [],
        FORBIDDEN_SCREEN_OBJECT = [],
        FORBIDDEN_BODY_OBJECT = [],
        FORBIDDEN_HISTORY_OBJECT = [],
        FORBIDDEN_LOCATION_OBJECT = [];

    var MESSAGE_DOM_ACCESS = 'Direct DOM access, use jQuery selector instead'; // 17
    var MESSAGE_WINDOW_USAGES = 'Proprietary Browser API access, use jQuery selector instead'; // 23
    var MESSAGE_TIMEOUT = 'Timeout with value > 0'; // 33
    var MESSAGE_HISTROY_USAGES =
        'Direct history manipulation, does not work with deep links, use router and navigation events instead'; // 34
    var MESSAGE_GLOBAL_SELECTION = 'Global selection modification, only modify local selections'; // 35
    var MESSAGE_LOCATION_ASSIGN = 'Usage of location.assign()'; // 30-3
    var MESSAGE_LOCATION_HASH = 'Direct Hash manipulation, use router instead'; // 30-2
    var MESSAGE_LOCATION_HREF = 'Usage of location.href'; // 30-1
    var MESSAGE_LOCATION_OVERR = 'Override of location'; // 30-1

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

    function processVariableDeclarator(node) {
        if (node.init) {
            if (node.init.type === 'MemberExpression') {
                var firstElement = node.init.object.name,
                    secondElement = node.init.property.name;

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
                        context.report(node, MESSAGE_WINDOW_USAGES);
                        FORBIDDEN_BODY_OBJECT.push(node.id.name);
                    }
                }
            } else if (node.init.type === 'Identifier' && node.init.name === 'document') {
                FORBIDDEN_DOCUMENT_OBJECT.push(node.id.name);
            } else if (node.init.type === 'Identifier' && node.init.name === 'screen') {
                FORBIDDEN_SCREEN_OBJECT.push(node.id.name);
            } else if (node.init.type === 'Identifier' && node.init.name === 'location') {
                FORBIDDEN_LOCATION_OBJECT.push(node.id.name);
            } else if (node.init.type === 'Identifier' && node.init.name === 'history') {
                FORBIDDEN_HISTORY_OBJECT.push(node.id.name);
            }
        }
    }

    function processSetTimeOut(node) {
        if (
            node.callee.type === 'Identifier' &&
            node.callee.name === 'setTimeout' &&
            node.arguments &&
            arguments[0].arguments[1].value > 0
        ) {
            context.report(node, MESSAGE_TIMEOUT);
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

    function processLocationMessage(node, methodName) {
        if (methodName === 'assign') {
            context.report(node, MESSAGE_LOCATION_ASSIGN);
        } else if (methodName === 'hash') {
            context.report(node, MESSAGE_LOCATION_HASH);
        } else if (methodName === 'href') {
            context.report(node, MESSAGE_LOCATION_HREF);
        }
    }

    function checkAssignmentAgainstOverride(node) {
        if (node.left.type === 'MemberExpression') {
            var memberExpression = node.left;

            var firstElement = memberExpression.object.name,
                secondElement = memberExpression.property.name;
            if (firstElement + '.' + secondElement === 'window.location') {
                context.report(node, MESSAGE_LOCATION_OVERR);
            }
        } else if (
            (node.left.type === 'Identifier' && node.left.name === 'location') ||
            (node.left.type === 'Identifier' && contains(FORBIDDEN_LOCATION_OBJECT, node.left.name))
        ) {
            context.report(node, MESSAGE_LOCATION_OVERR);
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
            processSetTimeOut(node);
        },
        'AssignmentExpression': function (node) {
            checkAssignmentAgainstOverride(node);
        },
        'MemberExpression': function (node) {
            if (node.parent.type === 'CallExpression' && !node.computed) {
                var methodName = getRightestMethodName(node.parent);
                if (typeof methodName === 'string' && contains(FULL_BLACKLIST, methodName)) {
                    var memberExpressionNode = node;
                    var calleePath = '';
                    calleePath += buildCalleePath(memberExpressionNode, calleePath);
                    var speciousObject = isForbiddenObviousApi(calleePath);

                    if (speciousObject === 'document' && contains(FORBIDDEN_DOM_ACCESS, methodName)) {
                        context.report(node, MESSAGE_DOM_ACCESS);
                    } else if (speciousObject !== 'document' && contains(FORBIDDEN_DOCUMENT_OBJECT, speciousObject)) {
                        context.report(node, MESSAGE_DOM_ACCESS);
                    } else if (speciousObject === 'history' && contains(FORBIDDEN_HISTROY_USAGES, methodName)) {
                        context.report(node, MESSAGE_HISTROY_USAGES);
                    } else if (
                        contains(FORBIDDEN_HISTROY_USAGES, methodName) &&
                        speciousObject !== 'history' &&
                        contains(FORBIDDEN_HISTORY_OBJECT, speciousObject)
                    ) {
                        context.report(node, MESSAGE_HISTROY_USAGES);
                    }

                    if (
                        speciousObject === 'window' &&
                        contains(FORBIDDEN_WINDOW_USAGES, methodName) &&
                        methodName === 'setTimeout'
                    ) {
                        context.report(node, MESSAGE_TIMEOUT);
                    }

                    if (
                        speciousObject === 'window' &&
                        contains(FORBIDDEN_WINDOW_USAGES, methodName) &&
                        methodName === 'getSelection'
                    ) {
                        context.report(node, MESSAGE_GLOBAL_SELECTION);
                    }

                    if (
                        (speciousObject === 'location' && contains(FORBIDDEN_LOCATION_USAGES, methodName)) ||
                        (speciousObject !== 'location' && contains(FORBIDDEN_LOCATION_OBJECT, speciousObject))
                    ) {
                        processLocationMessage(node, methodName);
                    }
                } else if (typeof methodName === 'string') {
                    memberExpressionNode = node;
                    calleePath = '';
                    calleePath += buildCalleePath(memberExpressionNode, calleePath);
                    speciousObject = isForbiddenObviousApi(calleePath);

                    if (
                        (speciousObject === 'body' && calleePath.indexOf('document.') !== -1) ||
                        (speciousObject === 'body' &&
                            contains(
                                FORBIDDEN_DOCUMENT_OBJECT,
                                calleePath.slice(0, calleePath.lastIndexOf('.body'))
                            )) ||
                        contains(FORBIDDEN_BODY_OBJECT, speciousObject)
                    ) {
                        context.report(node, MESSAGE_WINDOW_USAGES);
                    }
                }
            } else {
                var calleePathNonCmpt = '';
                calleePathNonCmpt += buildCalleePath(node, calleePathNonCmpt);
                var speciousObjectNonCmpt = isForbiddenObviousApi(calleePathNonCmpt);

                // console.log("methodName " + methodName);
                // console.log("calleePath " + calleePathNonCmpt);
                // console.log("speciousObject " + speciousObjectNonCmpt);
                // console.log("-----------------------");

                if (
                    calleePathNonCmpt === 'window' &&
                    node.property &&
                    contains(FORBIDDEN_WINDOW_USAGES, node.property.name)
                ) {
                    /*
                     * window.innerHeight = 16; for exp
                     */
                    context.report(node, MESSAGE_WINDOW_USAGES);
                } else if (
                    calleePathNonCmpt === 'window.screen' ||
                    calleePathNonCmpt === 'screen' ||
                    contains(FORBIDDEN_SCREEN_OBJECT, calleePathNonCmpt)
                ) {
                    context.report(node, MESSAGE_WINDOW_USAGES);
                }

                if (calleePathNonCmpt === 'history' || calleePathNonCmpt === 'window.history') {
                    context.report(node, MESSAGE_HISTROY_USAGES);
                }

                if (
                    (calleePathNonCmpt === 'document.body' || calleePathNonCmpt === 'window.document.body') &&
                    speciousObjectNonCmpt === 'body'
                ) {
                    context.report(node, MESSAGE_WINDOW_USAGES);
                } else if (
                    (speciousObjectNonCmpt === 'body' &&
                        contains(
                            FORBIDDEN_DOCUMENT_OBJECT,
                            calleePathNonCmpt.slice(0, calleePathNonCmpt.lastIndexOf('.body'))
                        )) ||
                    contains(FORBIDDEN_BODY_OBJECT, calleePathNonCmpt)
                ) {
                    context.report(node, MESSAGE_WINDOW_USAGES);
                }

                if (
                    ((calleePathNonCmpt === 'window.location' || calleePathNonCmpt === 'location') &&
                        node.property &&
                        contains(FORBIDDEN_LOCATION_USAGES, node.property.name)) ||
                    contains(FORBIDDEN_LOCATION_OBJECT, calleePathNonCmpt)
                ) {
                    processLocationMessage(node, node.property.name);
                }
            }
        }
    };
};
