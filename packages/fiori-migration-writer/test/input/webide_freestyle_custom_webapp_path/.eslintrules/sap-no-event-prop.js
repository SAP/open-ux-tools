/**
 * @fileoverview Rule to flag use of a private member from UI5 Event
 * @author Achref Kilani Jrad
 * @ESLint			Version 0.14.0 / February 2015
 */

// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------
/*eslint-disable global-strict*/

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = function (context) {
    'use strict';

    var PRIVATE_MEMBERS = ['oSource', 'mParameters', 'sId'];

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

    // --------------------------------------------------------------------------
    // Public
    // --------------------------------------------------------------------------

    return {
        'MemberExpression': function (node) {
            var val = node.property.name;

            if (typeof val === 'string' && contains(PRIVATE_MEMBERS, val)) {
                context.report(node, 'Direct usage of a private member from  sap.ui.base.Event detected!');
            }
        }
    };
};
