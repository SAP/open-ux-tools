/**
 * @fileoverview Detect the usage of window.define window.top and window.groupBy
 * @author Christopher Fenner (C5224075) - 02/2016
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-forbidden-window-property';
import { RuleTester } from 'eslint';
const MSG = 'Usage of a forbidden window property.' as const;

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-forbidden-window-property', rule, {
    valid: [
        'var test = window.location;',
        // false negatives
        "var fenster = window; var key = 'top'; var x = fenster[key];"
    ],
    invalid: [
        {
            code: 'var top = window.top;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var fenster = window, tuer = window; var x = tuer['top'];",
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'window.addEventListener();',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
