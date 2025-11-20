/**
 * @fileoverview flag global variable declaration
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-global-variable';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester({
    languageOptions: {
        ecmaVersion: 2018,
        sourceType: 'script'
    }
});
ruleTester.run('sap-no-global-variable', rule, {
    valid: ["function test(node){var node2 = 1, test = 'Apfelstrudel';};", 'var Infinity = 5;', 'var PDFJS = {};'],
    invalid: [
        {
            code: 'var global = true;',
            errors: [
                {
                    messageId: 'globalVariableNotAllowed',
                    data: { name: 'global' },
                    type: 'Identifier'
                }
            ]
        }
    ]
});
