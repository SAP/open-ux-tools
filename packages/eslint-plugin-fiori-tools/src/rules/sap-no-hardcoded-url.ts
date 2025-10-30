/**
 * @file Rule to flag use of a hardcoded URL
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------
/*eslint-disable strict*/
// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Fiori custom ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            hardcodedUrl: 'Hardcoded (non relative) URL found.'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        'use strict';
        // variables should be defined here,  return name.match("(http|https)(:/)?/([^:]+:[^@]+@)?[^:/]+[:/]?");
        const ALLOWED_DOMAINS_WHITELIST = [
            // http://www.w3.org/2000/svg
            'http://www.w3.org/',
            // While this is not a true domain, adding the 'http version' here
            // is way easier and safer than trying to modify the regexp.
            'HTTP/1.1',
            // https://jtrack/browse/CAINFRAANA-4
            'http://www.sap.com/Protocols/',
            // Used for the https://projectportal.neo.ondemand.com/projects/nw.core.extcfl project
            // Contact: Sandro Schiefner
            'http://www.sap.com/adt',
            // localhost
            'http://localhost/offline/',
            'https://localhost/offline/'
        ];

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param a
         * @param obj
         */
        function contains(a, obj) {
            for (let i = 0; i < a.length; i++) {
                if (obj.indexOf(a[i]) >= 0) {
                    return true;
                }
            }
            return false;
        }

        /**
         *
         * @param name
         */
        function matchProhibited(name) {
            return name.match('(http|https)://.*');
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'Literal': function (node) {
                const val = node.value;
                let result;

                if (typeof val === 'string') {
                    result = matchProhibited(node.value);

                    if (result && !contains(ALLOWED_DOMAINS_WHITELIST, val)) {
                        context.report({ node: node, messageId: 'hardcodedUrl' });
                    }
                }
            }
        };
    }
};

export default rule;
