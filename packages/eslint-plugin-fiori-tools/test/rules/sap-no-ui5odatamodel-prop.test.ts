/**
 * @fileoverview 	Unit test for "sap-no-ui5odatamodel-prop" (detection of direct usage of property names of UI5 data model)
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-ui5odatamodel-prop';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage =
    'Direct usage of a private member from sap.ui.model.odata.ODataModel or sap.ui.model.odata.v2.ODataModel detected!' as const;
ruleTester.run('sap-no-ui5odatamodel-prop', rule, {
    // Examples of code that should NOT trigger the rule
    valid: [
        // exceptions
        'oDataModel.oMetadata;',
        // >>> should raise no error
        "jQuery.sap.declare('js.aDelegates.alert');",
        'var faslePositive = windowSomething.mBindingParametersSome;',
        'var oParent;',
        'oParent.split(foo);'
    ],

    // Examples of code that should trigger the rule
    invalid: [
        {
            code: 'oObject.aPendingRequestHandles = 986;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'oObject.sDefaultOperationMode = 987;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'oObject.sDefaultBindingMode = 6598;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
