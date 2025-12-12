/**
 * @fileoverview Unit test for "sap-usage-basemastercontroller".
 */
// ------------------------------------------------------------------------------
// Requirements (load "Main ESLint object" and "testing utility for ESLint")
// ------------------------------------------------------------------------------
import rule from '../../src/rules/sap-usage-basemastercontroller';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
const ERROR_MSG =
    "Usage of deprecated 'BaseMasterController' detected. Please use 'ScfldMasterController' instead." as const;
const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-usage-basemastercontroller', rule, {
    // Examples of code that should NOT trigger the rule
    valid: ["sap.ca.walldorf.md.controller.BaseMasterController.extend('myBaseCOntroller', {config: 'myconfig'});"],
    // Examples of code that should trigger the rule
    invalid: [
        {
            code: "sap.ca.scfld.md.controller.BaseMasterController.extend('myBaseCOntroller', {config: 'myconfig'});",
            errors: [
                {
                    message: ERROR_MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "define(['sap/ca/scfld/md/controller/BaseMasterController'], function(Controller){ Controller.extend('myBaseCOntroller', {config: 'myconfig'});})",
            errors: [
                {
                    message: ERROR_MSG,
                    type: 'Literal'
                }
            ]
        }
    ]
});
