/**
 * @fileoverview Rule to flag override of getters, setters, onBeforeRendering and onAfterRendering for SAPUI5 object from a list of namespaces
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-override-rendering';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Override of rendering or getter or setter is not permitted' as const;
ruleTester.run('sap-no-override-rendering', rule, {
    valid: [
        "var issueModel = new sap.ui.model.json.JSONModel();issueModel.setProperty('/SalesOrder',salesOrderFulfillmentIssueQuery.oData.SalesOrder);",
        'var issueModel = new sap.ui.model.json.JSONModel();issueModel.something.onAfterRendering = function render(){foo.bar = 1;};',
        'var oButton5 = new sap.mX.Button(); oButton5.setMe = function render(){foo.bar = 1;}'
    ],

    invalid: [
        {
            code:
                'var oButton5 = new sap.me.foo.bar.Button();' +
                'oButton5.onAfterRendering = function render(){foo.bar = 1;};',
            options: [],
            errors: [
                {
                    message: errorMessage,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: 'var oButton = new sap.m.Button();' + 'oButton.getMe = function render(){foo.bar = 1;};',
            errors: [
                {
                    message: errorMessage,
                    type: 'AssignmentExpression'
                }
            ]
        }
    ]
});
