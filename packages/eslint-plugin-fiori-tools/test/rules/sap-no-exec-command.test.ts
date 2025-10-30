/**
 * @fileoverview Detect usage of execCommand
 * @author Christopher Fenner
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-exec-command';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Direct DOM Manipulation, better to use jQuery.appendTo if really needed' as const;
ruleTester.run('sap-no-exec-command', rule, {
    valid: [
        "var oLink = document.createElement('a');",
        'dom.execCommand();',
        // not covered
        "var key = 'execCommand'; document[key]()"
    ],
    invalid: [
        {
            code: 'document.execCommand(cmd, false, args);',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var w = window; var d = window.document; d.execCommand(cmd, false, args);',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'window.document.execCommand(cmd, false, args);',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "window.document['execCommand'](cmd, false, args);",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
