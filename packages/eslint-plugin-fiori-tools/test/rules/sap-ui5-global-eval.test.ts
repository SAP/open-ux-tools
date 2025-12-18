//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-ui5-global-eval';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-ui5-global-eval', rule, {
    valid: [
        {
            code:
                //There is no valid scenario for globalEval
                ``
        }
    ],
    invalid: [
        {
            code: `jQuery.globalEval( "var newVar = true;" );`,
            errors: [
                {
                    message: 'Usage of globalEval() / eval() is not allowed due to strict Content Security Policy.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `jQuery.sap.globalEval( "var newVar = true;" );`,
            errors: [
                {
                    message: 'Usage of globalEval() / eval() is not allowed due to strict Content Security Policy.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `$.globalEval( "var newVar = true;" );`,
            errors: [
                {
                    message: 'Usage of globalEval() / eval() is not allowed due to strict Content Security Policy.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `$.sap.globalEval( "var newVar = true;" );`,
            errors: [
                {
                    message: 'Usage of globalEval() / eval() is not allowed due to strict Content Security Policy.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `var a = jQuery.sap;
                                 a.globalEval( "var newVar = true;" );`,
            errors: [
                {
                    message: 'Usage of globalEval() / eval() is not allowed due to strict Content Security Policy.',
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
