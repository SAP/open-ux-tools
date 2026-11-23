/**
 * @fileoverview Detect the usage of window.define window.top and window.groupBy
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-forbidden-window-property.js';
import { RuleTester } from 'eslint';
const MSG = 'Usage of a forbidden window property.' as const;
const MSG_ALERT =
    'A window.alert statement should not be part of the code that is committed to GIT! Use sap.m.MessageBox instead.' as const;

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-forbidden-window-property', rule, {
    valid: [
        'var test = window.location;',
        "jQuery.sap.declare('js.windowAlert');",
        'myMethod();',
        // false negatives
        "var fenster = window; var key = 'top'; var x = fenster[key];"
    ],
    invalid: [
        {
            code: 'var top = window.top;',
            errors: [
                {
                    message: MSG
                }
            ]
        },
        {
            code: "var fenster = window, tuer = window; var x = tuer['top'];",
            errors: [
                {
                    message: MSG
                }
            ]
        },
        {
            code: 'window.addEventListener();',
            errors: [
                {
                    message: MSG
                }
            ]
        },
        {
            code: "window.alert('hello world');",
            errors: [
                {
                    message: MSG_ALERT
                }
            ]
        }
    ]
});
