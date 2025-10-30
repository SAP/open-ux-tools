/**
 * @fileoverview Detect some warning for usages of (window.)document APIs
 * @author Achref Kilani Jrad
 * @ESLint Version 0.14.0 / February 2015
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-dom-insertion';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
const MESSAGE_DOM_INSERTION = 'Direct DOM insertion is forbidden!' as const;
const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-dom-insertion', rule, {
    valid: [
        'append();',
        'append[1]()',
        'myObj.body.createObj();',
        "documentSome.getElementById('test');",
        'var test = test.body;',
        'window.location.href;',
        'me.extend([window.location.href]);',
        "oViewModel = new JSONModel({ shareSendEmailMessage: this.getResourceBundle().getText('shareSendEmailWorklistMessage', [window.location.href])});",
        "setTimeout(function(){ alert('noError'); }, 0);"
    ],
    invalid: [
        {
            code: "$('#container').append('Test');",
            errors: [
                {
                    message: MESSAGE_DOM_INSERTION,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: "var list = document.getElementById('myList1');List.insertBefore(node, list.childNodes[0]);",
            errors: [
                {
                    message: MESSAGE_DOM_INSERTION,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'myObject.after(document.body);',
            errors: [
                {
                    message: MESSAGE_DOM_INSERTION,
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
