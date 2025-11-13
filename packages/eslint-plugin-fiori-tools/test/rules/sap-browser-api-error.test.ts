/**
 * @fileoverview Detect some forbidden usages of (window.)document APIs
 * @author Achref Kilani Jrad
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-browser-api-error';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage1 = 'location.reload() is not permitted.' as const;
const errorMessage2 = 'Global event handling override is not permitted, please modify only single events' as const;
const errorMessage3 = 'Proprietary Browser API access, use sap.ui.Device API instead' as const;
const errorMessage4 = 'Dynamic style insertion, use library CSS or lessifier instead' as const;
ruleTester.run('sap-browser-api-error', rule, {
    valid: [
        'myDocument.createElementSome(foo);',
        'var abd = abc[i];',
        'foo.back();',
        "var abc = document.queryCommandSupported('insertBrOnReturnSome');",
        'window.eventfoo.returnValue = false;',
        "var oLink = document.createElement('a');"
    ],
    invalid: [
        {
            code: 'document.createElement(foo);',
            errors: [
                {
                    message: 'Direct DOM insertion, create a custom control instead',
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var mydocument = document;mydocument.createElement(foo);',
            errors: [
                {
                    message: 'Direct DOM insertion, create a custom control instead',
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'document.execCommand(cmd, false, args);',
            errors: [
                {
                    message: 'Direct DOM Manipulation, better to use jQuery.appendTo if really needed',
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var abc = document.queryCommandSupported('insertBrOnReturn');",
            errors: [
                {
                    message:
                        "insertBrOnReturn is not allowed since it is a Mozilla specific method, Chrome doesn't support that.",
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'location.reload();',
            errors: [
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var mylocation = location;mylocation.reload();',
            errors: [
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var mylocation = window.location;mylocation.reload();',
            errors: [
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'window.event.returnValue = false;',
            errors: [
                {
                    message: errorMessage2,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var wev = window.event;wev.returnValue = false;',
            errors: [
                {
                    message: errorMessage2,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'window.onload = function(){ return Hammer; }',
            errors: [
                {
                    message: errorMessage2,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'if (window.addEventListener) {x=1;}',
            errors: [
                {
                    message: errorMessage3,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'navigator.back();',
            errors: [
                {
                    message: errorMessage3,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var x = navigator.appCodeName;',
            errors: [
                {
                    message: errorMessage3,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var mynavig = window.navigator;',
            errors: [
                {
                    message: errorMessage3,
                    type: 'VariableDeclarator'
                }
            ]
        },
        {
            code: 'var mynavig = navigator;',
            errors: [
                {
                    message: errorMessage3,
                    type: 'VariableDeclarator'
                }
            ]
        },
        {
            code: 'var mynavig = window;',
            errors: [
                {
                    message: errorMessage3,
                    type: 'VariableDeclarator'
                }
            ]
        },
        {
            code: 'var mynavig = window.top.tip;',
            errors: [
                {
                    message: 'Definition of global variable/api in window object is not permitted.',
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'window.define();',
            errors: [
                {
                    message: 'Definition of global variable/api in window object is not permitted.',
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var mywindow = window;mywindow.define();',
            errors: [
                {
                    message: errorMessage3,
                    type: 'VariableDeclarator'
                },
                {
                    message: errorMessage3,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var sheet = document.styleSheets[i];',
            errors: [
                {
                    message: errorMessage4,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var mydocument = window.document;var sheet = mydocument.styleSheets[i];',
            errors: [
                {
                    message: errorMessage4,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var mydocument = document;var sheet = mydocument.styleSheets[i];',
            errors: [
                {
                    message: errorMessage4,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var abc = document.styleSheets.length;',
            errors: [
                {
                    message: errorMessage4,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var abcdocumnt = window.document; var sheet = abcdocumnt.styleSheets.length;',
            errors: [
                {
                    message: errorMessage4,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
