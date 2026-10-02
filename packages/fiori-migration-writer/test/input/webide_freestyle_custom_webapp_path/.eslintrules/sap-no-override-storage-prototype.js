/**
 * @fileoverview detects override of storage prototype
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
    var FORBIDDEN_STR_OBJECT = [];

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

    function checkAssignmentAgainstOverride(node) {
        if (node.left.type === 'MemberExpression' && node.right.type === 'FunctionExpression') {
            var memberExpression = node.left;

            var calleePath = '';
            calleePath += buildCalleePath(memberExpression, calleePath);

            if (calleePath === 'Storage.prototype' || contains(FORBIDDEN_STR_OBJECT, calleePath)) {
                context.report(
                    node,
                    'Storage prototype should not be overridden as this can lead to unpredictable errors'
                );
            }
        }
    }

    function processVariableDeclarator(node) {
        if (node.init) {
            if (node.init.type === 'MemberExpression') {
                var firstElement = node.init.object.name,
                    secondElement = node.init.property.name;

                if (firstElement + '.' + secondElement === 'Storage.prototype') {
                    FORBIDDEN_STR_OBJECT.push(node.id.name);
                }
            }
        }
    }

    return {
        'VariableDeclarator': function (node) {
            processVariableDeclarator(node);
        },
        'AssignmentExpression': function (node) {
            checkAssignmentAgainstOverride(node);
        }
    };
};
