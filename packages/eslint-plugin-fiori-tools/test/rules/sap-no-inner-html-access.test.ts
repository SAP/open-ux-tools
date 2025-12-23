/**
 * @fileoverview Rule to detect overriding of an elements inner html.
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-inner-html-access';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Accessing the inner html is not recommended.' as const;
ruleTester.run('sap-no-inner-html-access', rule, {
    valid: [
        'innerHTML = new sap.ui.model.json.JSONModel();',
        'var issueModel = new sap.ui.model.json.JSONModel();issueModel.something.onAfterRendering = function render(){foo.bar = 1;};',
        'var oButton5 = new sap.mX.Button(); oButton5.setMe = function render(){foo.bar = 1;}'
    ],
    invalid: [
        {
            code: "oControl.$().find('.sapMLabe')[0].innerHTML = 'reallybad';",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "test['innerHTML'] = 'reallybad';",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "if('test' === test['innerHTML']){;}",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
