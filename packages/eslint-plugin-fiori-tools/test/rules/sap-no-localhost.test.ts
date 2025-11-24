/**
 * @fileoverview Unit test for "sap-no-localhost".
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-localhost';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
const ERROR_MSG = "Usage of 'localhost' detected" as const;
const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-localhost', rule, {
    // Examples of code that should NOT trigger the rule
    valid: [
        "jQuery.sap.declare('js.aDelegates.alert');",
        'var faslePositive = windowSomething.mBindingParametersSome;',
        'var test = "http://localhost/offline/my_contacts/ContactCollection";',
        'var test = "https://localhost/offline/my_contacts/ContactCollection";',
        "var test = 'local' + 'host';"
        //      false positive
        //      "var test = 'ich hasse localhost';"
    ],
    // Examples of code that should trigger the rule
    invalid: [
        {
            code: "location.hostname === 'localhost';",
            errors: [
                {
                    message: ERROR_MSG,
                    type: 'Literal'
                }
            ]
        },
        {
            code: "location.host.indexOf('localhost')",
            errors: [
                {
                    message: ERROR_MSG,
                    type: 'Literal'
                }
            ]
        }
    ]
});
