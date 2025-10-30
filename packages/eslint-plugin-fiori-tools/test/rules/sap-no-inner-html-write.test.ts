/**
 * @fileoverview Rule to detect overriding of an elements inner html.
 * @author Christopher Fenner / D065687
 * @ESLint Version 0.8.0 / March 2016
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-inner-html-write';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-inner-html-write', rule, {
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
                    message: 'Writing to the inner html is not allowed.',
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: "test['innerHTML'] = 'reallybad';",
            errors: [
                {
                    message: 'Writing to the inner html is not allowed.',
                    type: 'AssignmentExpression'
                }
            ]
        }
    ]
});
