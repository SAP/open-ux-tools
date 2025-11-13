/**
 * @fileoverview Detect some warning for usages of (window.)document APIs
 * @author Achref Kilani Jrad
 * @ESLint Version 0.14.0 / February 2015
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-location-usage';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const MESSAGE_LOCATION_OVERR =
    'Writing to location is not allowed. Please consider using sap.m.URLHelper instead.' as const;
const MESSAGE_LOCATION_ASSIGN = 'Usage of location.assign()' as const;
const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-location-usage', rule, {
    valid: [
        'var interestingAddress = window.location;',
        'var interestingAddress = location;',
        'var interestingAddress = window.location.href;',
        'var interestingAddress = location.href;',
        'var loc = window.location; interestingAddress = loc.href;',
        'window.location.href;',
        'me.extend([window.location.href]);',
        "oViewModel = new JSONModel({ shareSendEmailMessage: this.getResourceBundle().getText('shareSendEmailWorklistMessage', [window.location.href])});",
        'sap.pas.href = x;' // increase code coverage
    ],
    invalid: [
        {
            code: 'location = this.oNavParams.toOppApp;',
            errors: [
                {
                    message: MESSAGE_LOCATION_OVERR,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: "location.href = 'test';",
            errors: [
                {
                    message: MESSAGE_LOCATION_OVERR,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: "var l = location; l.href = 'test';",
            errors: [
                {
                    message: MESSAGE_LOCATION_OVERR,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: "var l = window; l.location = 'test';",
            errors: [
                {
                    message: MESSAGE_LOCATION_OVERR,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: 'var l1 = window.location; var l2 = l1; l2.href = this.oNavParams.toOppApp;',
            errors: [
                {
                    message: MESSAGE_LOCATION_OVERR,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: 'var l1 = window; var l2 = l1.location; l2.href = this.oNavParams.toOppApp;',
            errors: [
                {
                    message: MESSAGE_LOCATION_OVERR,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: 'var l = window.location; l.href = this.oNavParams.toOppApp;',
            errors: [
                {
                    message: MESSAGE_LOCATION_OVERR,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: 'window.location.href = this.oNavParams.toOppApp;',
            errors: [
                {
                    message: MESSAGE_LOCATION_OVERR,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: 'window.location = this.oNavParams.toOppApp;',
            errors: [
                {
                    message: MESSAGE_LOCATION_OVERR,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: "window.location = 'my.new.address.com';",
            errors: [
                {
                    message: MESSAGE_LOCATION_OVERR,
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: 'location.assign(data.results[0].url);',
            errors: [
                {
                    message: MESSAGE_LOCATION_ASSIGN,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var x = location.assign; x(data.results[0].url)',
            errors: [
                {
                    message: MESSAGE_LOCATION_ASSIGN,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var x = location.assign;',
            errors: [
                {
                    message: MESSAGE_LOCATION_ASSIGN,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
