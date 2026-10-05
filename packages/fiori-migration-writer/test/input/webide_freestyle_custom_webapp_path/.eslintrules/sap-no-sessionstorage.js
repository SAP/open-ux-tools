/**
 * @fileoverview Detect usage of session storage
 * @author Achref Kilani Jrad
 * @ESLint			Version 0.14.0 / February 2015
 */

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
module.exports = function (context) {
    'use strict';
    var FORBIDDEN_STORAGE_OBJECT = [];

    var MESSAGE_LOCAL_STORAGE =
        'For security reasons, the usage of session storage is not allowed in An SAP Fiori application';

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

    function contains(a, obj) {
        for (var i = 0; i < a.length; i++) {
            if (obj === a[i]) {
                return true;
            }
        }
        return false;
    }

    function isForbiddenObviousApi(calleePath) {
        var elementArray = calleePath.split('.');
        var lastElement = elementArray[elementArray.length - 1];

        return lastElement;
    }

    function processVariableDeclarator(node) {
        if (node.init) {
            if (node.init.type === 'MemberExpression') {
                var firstElement = node.init.object.name,
                    secondElement = node.init.property.name;
                if (firstElement + '.' + secondElement === 'window.sessionStorage') {
                    FORBIDDEN_STORAGE_OBJECT.push(node.id.name);
                }
            } else if (node.init.type === 'Identifier' && node.init.name === 'sessionStorage') {
                FORBIDDEN_STORAGE_OBJECT.push(node.id.name);
            }
        }
    }

    return {
        'VariableDeclarator': function (node) {
            processVariableDeclarator(node);
        },
        'MemberExpression': function (node) {
            var memberExpressionNode = node;
            var calleePath = '';

            calleePath += buildCalleePath(memberExpressionNode, calleePath);
            var speciousObject = isForbiddenObviousApi(calleePath);

            if (
                (calleePath === 'sessionStorage' || calleePath === 'window.sessionStorage') &&
                speciousObject === 'sessionStorage'
            ) {
                context.report(node, MESSAGE_LOCAL_STORAGE);
            } else if (contains(FORBIDDEN_STORAGE_OBJECT, speciousObject)) {
                context.report(node, MESSAGE_LOCAL_STORAGE);
            }
        }
    };
};
