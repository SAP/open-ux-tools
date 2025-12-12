/**
 * @fileoverview Detects the usage of sap.ui.commons objects.
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-commons-usage';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
const MSG = 'Usage of sap.ui.commons controls is forbidden, please use controls from sap.m' as const;
const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-commons-usage', rule, {
    valid: ["any.method(['sap/ui/commons/layout/MatrixLayoutCell'])"],
    invalid: [
        {
            code: "function getLayout() { return new sap.ui.commons.layout.MatrixLayoutCell({ content : [ '' ], vAlign : 'Middle', hAlign : ''});}",
            errors: [
                {
                    message: MSG,
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: "sap.ui.define(['sap/ui/commons/layout/MatrixLayoutCell'], function(MatrixLayout) {})",
            errors: [
                {
                    message: MSG,
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
