/**
 * @fileoverview Rule to flag use of sap ui5base prop
 * @author Armin Gienger
 * @ESLint			Version 0.14.0 / February 2015
 */

/*eslint-disable global-strict*/

// ------------------------------------------------------------------------------
// Rule Definition

// ------------------------------------------------------------------------------

module.exports = function (context) {
    'use strict';

    // variables should be defined here
    var ODATA_MODEL_V2_MEMBERS = ['oData'];

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

            if (typeof val === 'string' && contains(ODATA_MODEL_V2_MEMBERS, val)) {
                context.report(node, 'Property ' + val + ' is a private member of sap.ui.model.odata.v2.ODataModel');
            }
        }
    };
};
