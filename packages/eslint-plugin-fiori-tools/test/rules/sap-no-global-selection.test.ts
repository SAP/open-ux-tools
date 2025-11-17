/**
 * @fileoverview Detect some warning for usages of (window.)document APIs
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-global-selection';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Global selection modification, only modify local selections' as const;
ruleTester.run('sap-no-global-selection', rule, {
    valid: ['var w = Window; w.getSelection();'],
    invalid: [
        // xxxxxxxxxxxxxxxxxxxx Selection xxxxxxxxxxxxxxxxxxxx
        {
            code: 'window.getSelection().rangeCount = 9;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var w = window; w.getSelection().rangeCount = 9;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var w; w = window; w.getSelection().rangeCount = 9;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
