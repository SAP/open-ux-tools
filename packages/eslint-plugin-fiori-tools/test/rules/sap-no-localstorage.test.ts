/**
 * @fileoverview detects usage of localstaorage
 * @author Achref Kilani Jrad
 * @ESLint			Version 0.14.0 / February 2015
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-localstorage';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Local storage must not be used in a Fiori application' as const;
ruleTester.run('sap-no-localstorage', rule, {
    valid: ['localStorageABC.setObj(this.SETTINGS_NAME, this.objSettings);'],

    invalid: [
        {
            code: 'localStorage.setObj(this.SETTINGS_NAME, this.objSettings);',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var abc = localStorage;abc.setObj(this.SETTINGS_NAME, this.objSettings);',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var abc = window.localStorage;abc.setObj(this.SETTINGS_NAME, this.objSettings);',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
