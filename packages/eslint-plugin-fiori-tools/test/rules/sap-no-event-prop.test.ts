/**
 * @fileoverview Rule to flag use of a private member from UI5 Event
 * @author Achref Kilani Jrad
 * @ESLint			Version 0.14.0 / February 2015
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-event-prop';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-event-prop', rule, {
    valid: [
        "jQuery.sap.declare('js.sId.alert');",
        'var faslePositive = windowSomething.mParametersSome;',
        'var oSource;',
        'oSource.split(foo);'
    ],

    invalid: [
        {
            code: 'var oEvent;oEvent.oSource = 12;',
            errors: [
                {
                    message: 'Direct usage of a private member from  sap.ui.base.Event detected!',
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
