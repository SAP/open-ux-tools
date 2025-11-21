/**
 * @fileoverview Detect usage of document.styleSheets
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-dynamic-style-insertion';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Dynamic style insertion, use library CSS or lessifier instead' as const;
ruleTester.run('sap-no-dynamic-style-insertion', rule, {
    valid: [
        'myDocument.createElementSome(foo);',
        'var abd = abc[i];',
        'foo.back();',
        'window.eventfoo.returnValue = false;',
        "var oLink = document.createElement('a');"
    ],
    invalid: [
        {
            code: 'var sheet = document.styleSheets[i];',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var w= window, x = w.document, mydocument = w.document;var sheet = mydocument['styleSheets'][i];",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var mydocument = document;var sheet = mydocument.styleSheets[i];',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var abc = document.styleSheets.length;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var abcdocumnt = window.document; var sheet = abcdocumnt.styleSheets.length;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
