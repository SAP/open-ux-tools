/**
 * @fileoverview Tests for sap-no-ui5base-prop rule.
 * ESLint			Version 0.14.0 / February 2015
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-ui5base-prop';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-ui5base-prop', rule, {
    valid: [
        // exceptions
        'oDataModel.oMetadata;',
        // >>> should raise no error
        "jQuery.sap.declare('js.aDelegates.alert');",
        'var faslePositive = windowSomething.mBindingParametersSome;',
        'var oParent;',
        'oParent.split(foo);'
    ],

    invalid: [
        {
            code: 'oObject.oBindingContexts = 986;',
            errors: [
                {
                    message: 'Property oBindingContexts is a private member of sap.ui.base.ManagedObject!',
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'oObject.mEventRegistry = 987;',
            errors: [
                {
                    message: 'Property mEventRegistry is a private member of sap.ui.base.EventProvider!',
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'oObject.mParameters = 6598;',
            errors: [
                {
                    message: 'Property mParameters is a private member of sap.ui.base.Event!',
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'oObject.aBatchOperations = 6598;',
            errors: [
                {
                    message:
                        'Property aBatchOperations is a private member of sap.ui.model.odata.ODataModel or sap.ui.model.odata.v2.ODataModel!',
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
