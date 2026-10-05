/**
 * @fileoverview Rule to flag use of alert
 * @author Achref Kilani Jrad - C5215143
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
    return {
        'CallExpression': function (node) {
            if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
                if (node.callee.object.name === 'window' && node.callee.property.name === 'alert') {
                    context.report(
                        node,
                        'A window.alert statement should not be part of the code that is committed to GIT! Use sap.m.MessageBox instead.'
                    );
                }
            }
        }
    };
};
