/**
 * @fileoverview Detect some warning for usages of (window.)document APIs
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-browser-api-warning';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage1 = 'Proprietary Browser API access, use jQuery selector instead' as const;
const errorMessage2 =
    'Direct history manipulation, does not work with deep links, use router and navigation events instead' as const;
ruleTester.run('sap-browser-api-warning', rule, {
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
            code: "document.getElementById('test');",
            errors: [
                {
                    message: 'Direct DOM access, use jQuery selector instead',
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var mydocument = window.document;mydocument.getElementById('test');",
            errors: [
                {
                    message: 'Direct DOM access, use jQuery selector instead',
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "document.body.appendChild(x);document.body.style.backgroundColor = 'yellow';",
            errors: [
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                },
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var mydocument = window.document;mydocument.body.appendChild(x);mydocument.body.style.backgroundColor = 'yellow';",
            errors: [
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                },
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var mydocument = document;mydocument.body.appendChild(x);mydocument.body.style.backgroundColor = 'yellow';",
            errors: [
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                },
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var abcss = window.document.body;abcss.appendChild(x);abcss.style.backgroundColor = 'yellow';",
            errors: [
                {
                    message: errorMessage1,
                    type: 'VariableDeclarator'
                },
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                },
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                }
            ]
        },
        // xxxxxxxxxxxxxxxxxxxx window xxxxxxxxxxxxxxxxxxxx
        {
            code: 'var variab1 = window.innerWidth;',
            errors: [
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                }
            ]
        },
        // xxxxxxxxxxxxxxxxxxxx Screen xxxxxxxxxxxxxxxxxxxx
        {
            code: 'var myscreen = screen;var variab5 = myscreen.something;',
            errors: [
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var myscreen = window.screen;var variab5 = myscreen.something;',
            errors: [
                {
                    message: errorMessage1,
                    type: 'MemberExpression'
                }
            ]
        },
        // xxxxxxxxxxxxxxxxxxxx History xxxxxxxxxxxxxxxxxxxx
        {
            code: 'history.go();',
            errors: [
                {
                    message: errorMessage2,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'history.back();',
            errors: [
                {
                    message: errorMessage2,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'window.history.forward();',
            errors: [
                {
                    message: errorMessage2,
                    type: 'CallExpression'
                }
            ]
        },
        // xxxxxxxxxx History-Objects xxxxxxxxxx
        {
            code: 'var x = history; x.back();',
            errors: [
                {
                    message: errorMessage2,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'var x = window.history; x.back();',
            errors: [
                {
                    message: errorMessage2,
                    type: 'CallExpression'
                }
            ]
        },
        // xxxxxxxxxx Conditions xxxxxxxxxx
        {
            code: 'history.go(-1);',
            errors: [
                {
                    message: errorMessage2,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'if(true) history.go(-2);',
            errors: [
                {
                    message: errorMessage2,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'if(true){history.go(-2);}',
            errors: [
                {
                    message: errorMessage2,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'if(true){}else{history.go(-2);}',
            errors: [
                {
                    message: errorMessage2,
                    type: 'CallExpression'
                }
            ]
        },
        // xxxxxxxxxxxxxxxxxxxx Selection xxxxxxxxxxxxxxxxxxxx
        {
            code: 'window.getSelection().rangeCount = 9;',
            errors: [
                {
                    message: 'Global selection modification, only modify local selections',
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
