/**
 * @fileoverview Detect some warning for usages of (window.)document APIs
 * @author Achref Kilani Jrad
 * @ESLint Version 0.14.0 / February 2015
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-dom-access';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Direct DOM access, use jQuery selector instead' as const;
ruleTester.run('sap-no-dom-access', rule, {
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
        {
            code: 'document.getElementById;',
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "document.getElementById('test');",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "window.document.getElementById('test');",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var w = window; w.document.getElementById('test');",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "var d = document; d.getElementById('test');",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "document.getElementsByClassName('test');",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "document.getElementsByTagName('test');",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: "document.getElementsByName('test');",
            errors: [
                {
                    message: errorMessage,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
