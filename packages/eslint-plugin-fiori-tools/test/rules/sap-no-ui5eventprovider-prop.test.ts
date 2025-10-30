/**
 * @fileoverview 	Unit test for "sap-no-ui5eventprovider-prop" (Detection of direct usage of private property names of sap.ui.base.EventProvider)
 * @author 			Roman Horch (D030497) with advice from Armin Gienger (D028623)
 * @ESLint			Version 0.14.0 / February 2015
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-ui5eventprovider-prop';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-ui5eventprovider-prop', rule, {
    // Examples of code that should NOT trigger the rule
    valid: [
        "jQuery.sap.declare('js.aDelegates.alert');",
        'var faslePositive = windowSomething.mBindingParametersSome;',
        'var oParent;',
        'oParent.split(foo);'
    ],

    // Examples of code that should trigger the rule
    invalid: [
        {
            code: 'oObject.mEventRegistry = 986;',
            errors: [
                {
                    message: 'Direct usage of a private property from sap.ui.base.EventProvider detected!',
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'oObject.oEventPool = 6598;',
            errors: [
                {
                    message: 'Direct usage of a private property from sap.ui.base.EventProvider detected!',
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
