/**
 * @fileoverview Rule to flag use of a hardcoded URL
 * @author Achref Kilani Jrad - C5215143
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
    // variables should be defined here
    var ALLOWED_DOMAINS_WHITELIST = [
        // http://www.w3.org/2000/svg
        'http://www.w3.org/',
        // While this is not a true domain, adding the 'http version' here
        // is way easier and safer than trying to modify the regexp.
        'HTTP/1.1',
        // https://jtrack/browse/CAINFRAANA-4
        'http://www.sap.com/Protocols/',
        // Used for the https://projectportal.neo.ondemand.com/projects/nw.core.extcfl project
        // Contact: Sandro Schiefner
        'http://www.sap.com/adt'
    ];

    // --------------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------------
    function contains(a, obj) {
        for (var i = 0; i < a.length; i++) {
            if (obj.indexOf(a[i]) >= 0) {
                return true;
            }
        }
        return false;
    }

    function matchProhibited(name) {
        return name.match('(http|https)(:/)?/([^:]+:[^@]+@)?[^:/]+[:/]?');
    }

    // --------------------------------------------------------------------------
    // Public
    // --------------------------------------------------------------------------

    return {
        'Literal': function (node) {
            var val = node.value,
                result;

            if (typeof val === 'string') {
                result = matchProhibited(node.value);

                if (result && !contains(ALLOWED_DOMAINS_WHITELIST, val)) {
                    context.report(node, 'Hardcoded (non relative) URL found.');
                }
            }
        }
    };
};
