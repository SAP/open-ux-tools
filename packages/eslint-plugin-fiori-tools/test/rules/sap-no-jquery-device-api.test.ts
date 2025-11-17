/**
 * @fileoverview Tests for sap-no-jquery-device-api rule.
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-jquery-device-api';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-jquery-device-api', rule, {
    valid: ['var event = new jQuery.Event();'],

    invalid: [
        {
            code: 'if (jQuery.device.is.android_phone === false) {}',
            errors: [
                {
                    message:
                        'jQuery.device or $.device are deprecated since 1.20! use the respective functions of sap.ui.Device',
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'if ($.device.is.android_phone === false) {}',
            errors: [
                {
                    message:
                        'jQuery.device or $.device are deprecated since 1.20! use the respective functions of sap.ui.Device',
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
