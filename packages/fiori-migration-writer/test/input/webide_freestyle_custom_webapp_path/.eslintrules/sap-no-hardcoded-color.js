/**
 * @fileoverview Rule to flag use of a hardcoded color
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
    // variables should be defined here

    // --------------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------------

    /*
     * What we will be looking for:
     *      color: #FFF,
     *      color: #ABABAB
     */
    function matchProhibited(name) {
        return name.match('#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})[^\\w]');
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

                if (result) {
                    context.report(node, 'Hardcoded colors are not allowed as they will break theming effort.');
                }
            }
        }
    };
};
