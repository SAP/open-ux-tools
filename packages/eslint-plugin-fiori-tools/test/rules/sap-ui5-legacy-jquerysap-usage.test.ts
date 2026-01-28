//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-ui5-legacy-jquerysap-usage';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-ui5-legacy-jquerysap-usage', rule, {
    valid: [
        {
            code: `sap.ui.define(['sap/m/Button'], function(Button){
                                    Button.create({                               
                                        name: "myButton"
                                    });
                                });`
        }
    ],
    invalid: [
        {
            code: ` jQuery.sap.require( 'sap.m.Button' );`,
            errors: [
                {
                    message: 'Legacy jQuery.sap usage is not allowed due to strict Content Security Policy.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: ` $.sap.require( 'sap.m.Button' );`,
            errors: [
                {
                    message: 'Legacy jQuery.sap usage is not allowed due to strict Content Security Policy.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `jQuery.sap.declare( "myModule" , true);`,
            errors: [
                {
                    message: 'Legacy jQuery.sap usage is not allowed due to strict Content Security Policy.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `$.sap.declare( "myModule" , true);`,
            errors: [
                {
                    message: 'Legacy jQuery.sap usage is not allowed due to strict Content Security Policy.',
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
