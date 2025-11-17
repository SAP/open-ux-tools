/**
 * @fileoverview Detect some warning for usages of (window.)document APIs
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-timeout-usage';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const errorMessage = 'Timeout with value > 0' as const;
const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-timeout-usage', rule, {
    valid: [
        "oViewModel = new JSONModel({ shareSendEmailMessage: this.getResourceBundle().getText('shareSendEmailWorklistMessage', [window.location.href])});",
        "setTimeout(function(){ alert('noError'); }, 0);",
        "setTimeout(function(){ alert('noError'); });",
        'window.setTimeout(myHandler);'
    ],
    invalid: [
        {
            code: "setTimeout(function(){ that.oReportTileOptionsCarousel.rerender(); }, '500');",
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'setTimeout(function(){ that.oReportTileOptionsCarousel.rerender(); }, 100);',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: "window.setTimeout(function(){ that.oReportTileOptionsCarousel.rerender(); }, '500');",
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: "var test0 = window, test1 = window; test1.setTimeout(myHandler, '500');",
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: "test2 = window; test2.setTimeout(myHandler, '500');",
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
