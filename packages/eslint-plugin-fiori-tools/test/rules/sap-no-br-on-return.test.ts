/**
 * @fileoverview Detect the usage of document.queryCommandSupported with 'insertBrOnReturn' argument
 * @author Christopher Fenner (C5224075) - 02/2016
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-br-on-return';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-br-on-return', rule, {
    valid: [
        "var w = window; w.document['queryCommandSupported']();",
        'document.queryCommandSupported()',
        "document.queryCommandSupported('test')",
        "var d = document; e = document; e.queryCommandSupported('test')"
    ],
    invalid: [
        {
            code: "var abc = document.queryCommandSupported('insertBrOnReturn');",
            errors: [
                {
                    message:
                        "insertBrOnReturn is not allowed since it is a Mozilla specific method, other browsers don't support that.",
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
