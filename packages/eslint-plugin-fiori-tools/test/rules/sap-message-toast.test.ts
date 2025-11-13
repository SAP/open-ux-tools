/**
 * @fileoverview
 * @author Christopher Fenner - C5224075
 * @ESLint Version 0.17.1 / April 2015
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-message-toast';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Value for duration of sap.m.MessageToast.show should be greater or equal to 3000!' as const;
ruleTester.run('sap-message-toast', rule, {
    // Examples of code that should NOT trigger the rule
    valid: [
        'var test;',
        'var mySap = sap; var myMobile = mySap.m; function test(){var myMobile = sap.m;}',
        //                            "var getSap = function (){return myMobile = sap.m;}",
        "jQuery('#main').show();",
        'sap.m.Roggenbrot.show();',
        'var myMethod = myObj.getMyMethod();',
        "var myMobile = sap['m'];",
        'var array = [sap.m.MessageToast];',
        // valid method calls for MessageToast.show
        "sap.m.MessageToast.show('Toast is ready!');",
        "sap.m.MessageToast.show('Toast is ready!', toastOptions);",
        "sap.m.MessageToast.show('Toast is ready!', getToastOptions());",
        "sap.m.MessageToast.show('Toast is ready!', {" +
            "'duration': 3000, " +
            "width: '15em', " +
            'onClose: null,' +
            'autoClose: true,' +
            "my: 'center bottom', " +
            "at: 'center bottom', " +
            "collision: 'fit fit'" +
            '});',
        "var myToast = sap.m.MessageToast; myToast.show('Toast is ready!', {" +
            'duration: 3000, ' +
            "width: '15em', " +
            "my: 'center bottom', " +
            "at: 'center bottom' " +
            '});',
        // Examples of code that are not allowed but are NOT covered by the rule
        "sap.m.MessageToast.show('Toast is ready!', {" + 'duration: getDuration(1000)' + '});',
        "var myOwnDuration = 200; sap.m.MessageToast.show('Toast is ready!', {" + 'duration: myOwnDuration' + '});',
        "sap.m.MessageToast.show('Toast is ready!', {" + "width: '1500px', " + '});',
        "var myToast; myToast = sap.m.MessageToast; myToast.show('Toast is ready!', {duration: 1000});",
        "function getToast(){return sap.m.MessageToast;} getToast().show('Toast is ready!', { duration: 1000});",
        "var myApp = {}; myApp.toast = sap.m.MessageToast; myApp.toast.show('Toast is ready!', { duration: 1000});"
    ],
    invalid: [
        // test duration min
        {
            code: "sap.m.MessageToast.show('Toast is ready!', {duration: 1000});",
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        // test duration negative
        {
            code: "sap.m.MessageToast.show('Toast is ready!', {test: 1, duration: -1});",
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        // test position
        {
            code: "sap.m.MessageToast.show('Toast is ready!', {my: 'left top'});",
            errors: [
                {
                    message: 'Value for my of sap.m.MessageToast.show should be center bottom!',
                    type: 'CallExpression'
                }
            ]
        },
        // test position
        {
            code: "sap.m.MessageToast.show('Toast is ready!', {at: 'right bottom'});",
            errors: [
                {
                    message: 'Value for at of sap.m.MessageToast.show should be center bottom!',
                    type: 'CallExpression'
                }
            ]
        },
        // test width
        {
            code: "sap.m.MessageToast.show('Toast is ready!', {width: '40em'});",
            errors: [
                {
                    message: 'Value for width of sap.m.MessageToast.show should be less or equal to 35em!',
                    type: 'CallExpression'
                }
            ]
        },
        // test concealed object
        {
            code: "var myToast = sap.m.MessageToast; myToast.show('Toast is ready!', {duration: 1000});",
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        // test nestedconcealed object
        {
            code: "var mySap = sap; var myMobile = mySap.m; myMobile.MessageToast.show('Toast is ready!', {duration: 1000});",
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        // test concealed method
        {
            code: "var toastIt = sap.m.MessageToast.show; toastIt('Toast is ready!', {duration: 1000});",
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        }
    ]

    // Examples of code that should trigger the rule
    /*invalid: [ {
                    code: "oObject.mEventRegistry = 986;",
                    errors: [ {
                        message: "Direct usage of a private property from sap.ui.base.EventProvider detected!",
                        type: "MemberExpression"
                    } ]
                },
                {
                    code: "oObject.oEventPool = 6598;",
                    errors: [ {
                        message: "Direct usage of a private property from sap.ui.base.EventProvider detected!",
                        type: "MemberExpression"
                    } ]
                }]*/
});
