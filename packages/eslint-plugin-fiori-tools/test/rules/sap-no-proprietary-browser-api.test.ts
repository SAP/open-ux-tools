/**
 * @fileoverview Detect some warning for usages of (window.)document APIs
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-proprietary-browser-api';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Proprietary Browser API access, use jQuery selector instead' as const;
ruleTester.run('sap-no-proprietary-browser-api', rule, {
    valid: [
        'myObj.body.createObj();',
        'var myBody = myObj.body;',
        "documentSome.getElementById('test');",
        'var interestingAddress = window.location;',
        'var interestingAddress = location;',
        'var interestingAddress = window.location.href;',
        'var interestingAddress = location.href;',
        'var loc = window.location; interestingAddress = loc.href;',
        'var test = test.body;',
        'window.location.href;',
        'me.extend([window.location.href]);',
        "oViewModel = new JSONModel({ shareSendEmailMessage: this.getResourceBundle().getText('shareSendEmailWorklistMessage', [window.location.href])});",
        'if(true) history.go(-1);',
        'if(true){}else{history.go(-1);}',
        'if(true){history.back();}',
        "(true?history.go(-1):'');",
        "(true?history.fly(-1):'');", // increase code coverage
        'sap.pas.href = x;', // increase code coverage
        // Beispiel
        'if (sPreviousHash !== undefined || !oCrossAppNavigator) {history.go(-1);}',
        // false negatives
        'var m = window.history.go; m(-2);',
        'function myHiddenGo(go, delta){go(delta);} myHiddenGo(history.go, -5);'
    ],
    invalid: [
        // xxxxxxxxxxxxxxxxxxxx Document xxxxxxxxxxxxxxxxxxxx
        {
            code: "document.body.appendChild(x);document.body.style.backgroundColor = 'yellow';",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                },
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var w = window; var mydocument = w.document;mydocument.body.appendChild(x);mydocument.body.style.backgroundColor = 'yellow';",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                },
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var mydocument = document;mydocument.body.appendChild(x);mydocument.body.style.backgroundColor = 'yellow';",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                },
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var abcss = window.document.body;abcss.appendChild(x);abcss.style.backgroundColor = 'yellow';",
            errors: [
                {
                    message: errorMessage,
                    type: 'VariableDeclarator'
                },
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                },
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        // xxxxxxxxxxxxxxxxxxxx window xxxxxxxxxxxxxxxxxxxx
        {
            code: 'var variab1 = window.innerWidth;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        // xxxxxxxxxxxxxxxxxxxx Screen xxxxxxxxxxxxxxxxxxxx
        {
            code: 'var myscreen = screen;var variab5 = myscreen.something;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var myscreen = window.screen;var variab5 = myscreen.something;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
