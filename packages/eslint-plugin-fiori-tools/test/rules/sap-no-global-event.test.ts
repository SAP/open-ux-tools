/**
 * @fileoverview Detect some forbidden usages of (window.)document APIs
 * @author Achref Kilani Jrad
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-global-event';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Global event handling override is not permitted, please modify only single events' as const;
ruleTester.run('sap-no-global-event', rule, {
    valid: ['var method = window.onload;', 'window.eventfoo.returnValue = false;'],
    invalid: [
        {
            code: 'window.event.returnValue = false;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var w = window; w.event.returnValue = false;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var w = window; var x = window; x.event.cancelBubble = false;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var wev = window.event;wev.returnValue = false;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'window.onload = function(){ return Hammer; }',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
