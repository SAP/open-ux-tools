/**
 * @fileoverview Autowait has to be true in Opa5.extendConfig
 * @author Syed Arij Hussain
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-opa5-autowait-true';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-opa5-autowait-true', rule, {
    valid: [
        {
            code: `Opa5.extendConfig({
                   arrangements: new Common(),
                   viewNamespace: "gs.fin.aptaxinvoice.view.",
                   autoWait: true,
                   appParams: {
                         "sap-ui-animation": false
                        },
                   timeout: 60,
                   testLibs: {
                        fioriElementsTestLibrary: {
                            Common: {
                                 appId: 'gs.fin.aptaxinvoice',
                                 entitySet: 'C_CN_TaxInputInvcTP'
                               }
                          }
                     }
                    });`
        }
    ],

    invalid: [
        {
            code: `Opa5.extendConfig({
                   arrangements: new Common(),
                   viewNamespace: "gs.fin.aptaxinvoice.view.",
                   autoWait: false,
                   appParams: {
                        "sap-ui-animation": false
                       },
                   timeout: 60,
                   testLibs: {
                       fioriElementsTestLibrary: {
                           Common: {
                                appId: 'gs.fin.aptaxinvoice',
                                entitySet: 'C_CN_TaxInputInvcTP'
                              }
                         }
                    }
            });`,
            errors: [
                {
                    message: 'Autowait must be true.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `Opa5.extendConfig({
                   arrangements: new Common(),
                   viewNamespace: "gs.fin.aptaxinvoice.view.",
                   appParams: {
                        "sap-ui-animation": false
                       },
                   timeout: 60,
                   testLibs: {
                       fioriElementsTestLibrary: {
                           Common: {
                                appId: 'gs.fin.aptaxinvoice',
                                entitySet: 'C_CN_TaxInputInvcTP'
                              }
                         }
                    }
             });`,
            errors: [
                {
                    message: 'Autowait must be present and true in extendConfig.',
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
