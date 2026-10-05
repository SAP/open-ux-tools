/**
 * @fileoverview Rule to flag override of getters, setters, onBeforeRendering
 *               and onAfterRendering for SAPUI5 object from a list of
 *               namespaces
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
    var OBJECT_NAMESPACES = ['sap.ca', 'sap.m', 'sap.me', 'sap.ui', 'sap.uiext.inbox', 'sap.ushell', 'sap.viz.ui5'];
    var objectNamespacesLength = OBJECT_NAMESPACES.length;
    var ui5ObjectsToCheck = [];

    var CHECKED_METHODS = ['onBeforeRendering', 'onAfterRendering'];

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

    function checkIfNotAllowedMethod(property) {
        if (
            typeof property !== 'undefined' &&
            (contains(CHECKED_METHODS, property) || property.indexOf('get') === 0 || property.indexOf('set') === 0)
        ) {
            return true;
        }
        return false;
    }

    function calculateObjectName(memberExpressionObject) {
        var objectName = '';
        if (memberExpressionObject.type === 'MemberExpression') {
            objectName = memberExpressionObject.property.name;
        } else if (memberExpressionObject.type === 'Identifier') {
            objectName = memberExpressionObject.name;
        }
        return objectName;
    }

    function checkIfAncestorsContainsNewExpression(ancestors) {
        var ancestorsLength = ancestors.length;
        for (var i = 0; i < ancestorsLength; i++) {
            if (ancestors[i].type === 'NewExpression') {
                return i;
            }
        }
        return -1;
    }

    function checkIfReportedNamespace(namespace) {
        for (var i = 0; i < objectNamespacesLength; i++) {
            if (namespace.indexOf(OBJECT_NAMESPACES[i] + '.') === 0) {
                return true;
            }
        }
        return false;
    }

    function processMemberExpression(node) {
        if (node.object.type === 'Identifier') {
            var namespace = node.object.name + '.' + node.property.name,
                ancestors = context.getAncestors();

            ancestors.reverse();
            var newExpressionPosition = checkIfAncestorsContainsNewExpression(ancestors);
            if (newExpressionPosition !== -1) {
                for (var i = 0; i < newExpressionPosition; i++) {
                    if (ancestors[i].property) {
                        var propertyName = ancestors[i].property.name;
                        namespace += '.' + propertyName;
                    }
                }

                if (checkIfReportedNamespace(namespace) && ancestors[newExpressionPosition].parent.id) {
                    ui5ObjectsToCheck.push(ancestors[newExpressionPosition].parent.id.name);
                }
            }
        }
    }

    function checkAssignmentAgainstOverride(node) {
        if (node.left.type === 'MemberExpression' && node.right.type === 'FunctionExpression') {
            var memberExpression = node.left,
                objectProperty = memberExpression.property.name;
            var objectNameToCheck,
                memberExpressionObject = memberExpression.object;

            if (checkIfNotAllowedMethod(objectProperty)) {
                objectNameToCheck = calculateObjectName(memberExpressionObject);
                if (contains(ui5ObjectsToCheck, objectNameToCheck)) {
                    context.report(node, 'Override of rendering or getter or setter is not permitted');
                }
            }
        }
    }

    // --------------------------------------------------------------------------
    // Public
    // --------------------------------------------------------------------------

    return {
        'MemberExpression': function (node) {
            processMemberExpression(node);
        },
        'AssignmentExpression': function (node) {
            checkAssignmentAgainstOverride(node);
        }
    };
};
