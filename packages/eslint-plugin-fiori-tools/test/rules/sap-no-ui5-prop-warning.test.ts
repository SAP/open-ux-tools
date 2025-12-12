/**
 * @fileoverview Tests for sap-no-ui5-prop-warning rule.
 * ESLint			Version 0.14.0 / February 2015
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-ui5-prop-warning';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-ui5-prop-warning', rule, {
    valid: [
        "jQuery.sap.declare('js.aDelegates.alert');",
        'var faslePositive = windowSomething.mBindingParametersSome;',
        'var oParent;',
        'oParent.split(foo);'
    ],

    invalid: [
        {
            code: 'oObject.oData = 6598;',
            errors: [
                {
                    message: 'Property oData is a private member of sap.ui.model.odata.v2.ODataModel',
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
