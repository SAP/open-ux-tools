/**
 * @fileoverview Tests for sap-no-window-alert rule.
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-window-alert';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-window-alert', rule, {
    valid: ["jQuery.sap.declare('js.windowAlert');", 'myMethod();'],
    invalid: [
        {
            code: "window.alert('hello world');",
            errors: [
                {
                    message:
                        'A window.alert statement should not be part of the code that is committed to GIT! Use sap.m.MessageBox instead.',
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
