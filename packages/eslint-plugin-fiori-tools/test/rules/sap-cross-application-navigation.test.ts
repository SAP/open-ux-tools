/**
 * @fileoverview
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-cross-application-navigation';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage = 'Do not use a static list of cross-application navigation targets.' as const;
ruleTester.run('sap-cross-application-navigation', rule, {
    // Examples of code that should NOT trigger the rule
    valid: [
        'var test;',
        'var mySap = sap; var myMobile = mySap.m; function test(){var myMobile = sap.m;}',
        "jQuery('#main').show();",
        'sap.m.Roggenbrot.show();',
        'var myMethod = myObj.getMyMethod();',
        "var myMobile = sap['m'];",
        'var array = [sap.m.MessageToast];',
        'sap.ushell.Container.getService(\'CrossApplicationNavigation\').toExternal({target:{shellHash: "#"}});',
        'sap.ushell.Container.getService(\'CrossApplicationNavigation\').toExternal({target:{shellHash: "#Shell-home"}});',
        'sap.ushell.Container.getService(\'CrossApplicationNavigation\').toExternal({target:{semanticObject: "Shell", action: "home"}});',
        'sap.ushell.Container.getService(\'CrossApplicationNavigation\').toExternal({target:{shellHash: ""}});'
    ],
    invalid: [
        {
            code: 'sap.ushell.Container.getService(\'CrossApplicationNavigation\').toExternal({target:{action: "#home"}});',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'sap.ushell.Container.getService(\'CrossApplicationNavigation\').toExternal({target:{semanticObject: "#Shell"}});',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'sap.ushell.Container.getService(\'CrossApplicationNavigation\').toExternal({target:{action: "home"}});',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'sap.ushell.Container.getService(\'CrossApplicationNavigation\').toExternal({target:{semanticObject: "Shell"}});',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: "sap.ushell.Container.getService('CrossApplicationNavigation').toExternal({});",
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: "sap.ushell.Container.getService('CrossApplicationNavigation').toExternal({target:{foo:'bar',shellHash:'shellFisch'}});",
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code:
                "var oCrossAppNavigator = fgetService('CrossApplicationNavigation');" +
                "oCrossAppNavigator['toExternal']({});",
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code:
                "var oCrossAppNavigator = fgetService && fgetService('CrossApplicationNavigation');" +
                'oCrossAppNavigator.toExternal({});',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code:
                'var oCrossAppNavigator;' +
                "oCrossAppNavigator = fgetService('CrossApplicationNavigation');" +
                'oCrossAppNavigator.toExternal({});',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code:
                'var oCrossAppNavigator;' +
                "oCrossAppNavigator = fgetService('CrossApplicationNavigation');" +
                'oCrossAppNavigator.toExternal();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
