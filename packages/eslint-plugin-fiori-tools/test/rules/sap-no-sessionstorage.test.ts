/**
 * @fileoverview Detect usage of session storage
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-sessionstorage';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage =
    'For security reasons, the usage of session storage is not allowed in a Fiori application' as const;
ruleTester.run('sap-no-sessionstorage', rule, {
    valid: ['sessionStorageSome.setObj(this.SETTINGS_NAME, this.objSettings);'],

    invalid: [
        {
            code: 'sessionStorage.setObj(this.SETTINGS_NAME, this.objSettings);',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var abc = sessionStorage;abc.setObj(this.SETTINGS_NAME, this.objSettings);',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var abc = window.sessionStorage;abc.setObj(this.SETTINGS_NAME, this.objSettings);',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
