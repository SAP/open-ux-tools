/**
 * @fileoverview Tests for no-hardcoded-color rule.
 * @author Achref Kilani Jrad - C5215143
 * @ESLint			Version 0.14.0 / February 2015
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-hardcoded-color';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-hardcoded-color', rule, {
    valid: ['sap.refgrass'],

    invalid: [
        {
            code: "lassoHelper = $(\"<div id='lasso-selection-help' style='position:absolute;pointer-events:none;background:#cccccc;'></div>\");",
            errors: [
                {
                    message: 'Hardcoded colors are not allowed as they will break theming effort.',
                    type: 'Literal'
                }
            ]
        }
    ]
});
