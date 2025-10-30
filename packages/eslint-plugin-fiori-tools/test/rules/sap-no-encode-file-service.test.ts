/**
 * @fileoverview Unit test for "sap-no-localhost".
 * @author Roman Horch (D030497), Christopher Fenner (C5224075) with advice from Armin Gienger (D028623)
 * @ESLint Version 0.14.0 / March 2015
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-encode-file-service';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
const ERROR_MSG = "Usage of phrase '/sap/bc/ui2/encode_file' detected" as const;
const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-encode-file-service', rule, {
    // Examples of code that should NOT trigger the rule
    valid: [
        "jQuery.sap.declare('js.aDelegates.alert');",
        'var faslePositive = windowSomething.mBindingParametersSome;',
        'var test = "http://localhost/offline/my_contacts/ContactCollection";',
        'var test = "https://localhost/offline/my_contacts/ContactCollection";',
        "var test = 'local' + 'host';"
    ],
    // Examples of code that should trigger the rule
    invalid: [
        {
            code:
                "oAtt.setEncodeUrl('/sap/bc/ui2/encode_file' + (sUrlParams ? '?' + sUrlParams : ''));" +
                "oFileUpload.setEncodeUrl('/sap/bc/ui2/encode_file' + (sUrlParams ? '?' + sUrlParams : '')); " +
                "oFileUpload.setEncodeUrl('/sap/bc/ui2/encode_file' + (oModel.aUrlParams && oModel.aUrlParams.length > 0 ? '?' + oModel.aUrlParams.join('&') : '')); " +
                '',
            errors: [
                {
                    message: ERROR_MSG,
                    type: 'Literal'
                },
                {
                    message: ERROR_MSG,
                    type: 'Literal'
                },
                {
                    message: ERROR_MSG,
                    type: 'Literal'
                }
            ]
        }
    ]
});
