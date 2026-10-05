/**
 * @fileoverview Rule to flag use of the deprecated JQuery.device API
 * @author Achref Kilani Jrad - C5215143
 * @ESLint			Version 0.14.0 / February 2015
 */

// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = function (context) {
    'use strict';
    return {
        'MemberExpression': function (node) {
            if ((node.object.name === 'jQuery' || node.object.name === '$') && node.property.name === 'device') {
                context.report(
                    node,
                    'jQuery.device or $.device are deprecated since 1.20! use the respective functions of sap.ui.Device'
                );
            }
        }
    };
};
