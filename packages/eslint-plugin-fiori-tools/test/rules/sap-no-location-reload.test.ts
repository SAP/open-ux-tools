/**
 * @fileoverview Detect some forbidden usages of (window.)document APIs
 * @author Achref Kilani Jrad
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-location-reload';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'location.reload() is not permitted.' as const;
ruleTester.run('sap-no-location-reload', rule, {
    valid: ['var x = myLocation; x.reload();'],
    invalid: [
        {
            code: 'location.reload();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'var mylocation = location;mylocation.reload();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'var f = window, w = window; w.location.reload();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'var mylocation = window.location;mylocation.reload();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
