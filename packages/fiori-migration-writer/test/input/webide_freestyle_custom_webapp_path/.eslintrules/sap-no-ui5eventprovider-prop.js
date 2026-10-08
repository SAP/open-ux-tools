/**
 * @fileoverview 	Check "sap-no-ui5eventprovider-prop" should detect direct usage of private property names of sap.ui.base.EventProvider
 * @author 			Developer A (D000001) with advice from Developer B (D000002)
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

    // Alphabetical list of the "private property names" from UI5 event provider which this check shall detect
    var PRIVATE_MEMBERS = ['mEventRegistry', 'oEventPool'];

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
                context.report(node, 'Direct usage of a private property from sap.ui.base.EventProvider detected!');
            }
        }
    };
};
