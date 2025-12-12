/**
 * @fileoverview Tests for no-hardcoded-url rule.
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-hardcoded-url';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Hardcoded (non relative) URL found.' as const;
ruleTester.run('sap-no-hardcoded-url', rule, {
    valid: [
        "document.createElementNS('http://www.w3.org/2000/svg', 'line')",
        "constantsTx1['SAP_NAMESPACE'] = 'https://www.sap.com/Protocols/SAPData'",
        "'http://localhost/offline/my_contacts/ContactCollection(contactID='",
        'var x = 4'
    ],
    invalid: [
        {
            code: "var system = 'https://uxciebj.example.net:44315'; // EBJ",
            errors: [
                {
                    message: errorMessage,
                    type: 'Literal'
                }
            ]
        },
        {
            code: "var url_root = 'https://'+ host + '/sap/opu/odata/sap/';",
            errors: [
                {
                    message: errorMessage,
                    type: 'Literal'
                }
            ]
        },
        {
            code: "system = 'https://ldciqi3.example.net:44375';",
            errors: [
                {
                    message: errorMessage,
                    type: 'Literal'
                }
            ]
        }
    ]
});
