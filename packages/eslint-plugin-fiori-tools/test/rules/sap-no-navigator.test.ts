/**
 * @fileoverview Detect some forbidden usages of (window.)document APIs
 * @author Achref Kilani Jrad
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-navigator';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
const MSG = 'navigator usage is forbidden, use sap.ui.Device API instead' as const;
const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-navigator', rule, {
    valid: [
        'var a = window;                    ',
        'var b = navigator;                 ',
        'var c = window.navigator;          ',
        'var d; d = navigator;              ',
        'var e; e = a.navigator;            ',
        'var x = window, w = window; w.navigator.forward();'
    ],
    invalid: [
        {
            code: 'var x = window, w = window; w.navigator.back();',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var x = navigator.appCodeName;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
