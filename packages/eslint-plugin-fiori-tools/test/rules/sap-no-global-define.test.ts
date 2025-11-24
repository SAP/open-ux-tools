/**
 * @fileoverview Detect the usage of window.define window.top and window.groupBy
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-global-define';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Definition of global variable/api in window object is not permitted.' as const;
ruleTester.run('sap-no-global-define', rule, {
    valid: ['window.location.myObject = {};'],
    invalid: [
        {
            code: 'var w = window, f = window; f.myObject = {};',
            errors: [
                {
                    message: errorMessage,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: "var w = window; w['myObject'] = {};",
            errors: [
                {
                    message: errorMessage,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: "var w = window; var key = 'myObject'; w[key] = {};",
            errors: [
                {
                    message: errorMessage,
                    type: 'AssignmentExpression'
                }
            ]
        }
    ]
});
