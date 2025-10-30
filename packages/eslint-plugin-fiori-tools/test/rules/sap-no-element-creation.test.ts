/**
 * @fileoverview Detect direct DOM insertion
 * @author Christopher Fenner, C5224075
 * @ESLint Version 0.22.1 / June 2015
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-element-creation';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
const MSG = 'Direct element creation, create a custom control instead' as const;
const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-element-creation', rule, {
    valid: [
        'myDocument.createElementSome(foo);',
        'var abd = abc[i];',
        'foo.back();',
        'window.eventfoo.returnValue = false;',
        "var oLink = document.createElement('a');",
        'var mydocument = document;mydocument[2](foo)',
        // false negative
        "var test = 'createElement'; document[test]();"
    ],
    invalid: [
        {
            code: 'document.createElement(foo);',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var mydocument = document;mydocument['createElement'](foo);",
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var x = window, w = window, mydocument = w.document;mydocument['createElement'](foo);",
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        // false positive, method document.test is called, not document.createElement
        {
            code: "var createElement = 'test'; document[createElement](foo);",
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
