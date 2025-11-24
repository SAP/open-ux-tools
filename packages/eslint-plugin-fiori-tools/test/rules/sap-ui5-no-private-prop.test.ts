/**
 * @fileoverview Tests for sap- rule.
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-ui5-no-private-prop';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
const MSG = 'Usage of a private property or function from UI5 element.' as const;
const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-ui5-no-private-prop', rule, {
    valid: [
        // >>> false positives
        // "var test = sap.m.foo; test = myObject; test._bar = 7;",
        // >>> should raise no error
        "var btn = new sap.uix.Button(); btn._myPrivateProperty = 'x';",
        "var btn = new sapo.Button(); btn._myPrivateProperty = 'x';",
        'me._age;                               ',
        'me._age = 10;                          ',
        'me.sister._age = 13;                   ',
        'me.getBrother()._age = 15;             ',
        'myAge = me._age;                       ',
        'me._setAge();                          ',
        'setMyAge = me._setAge;                 ',
        'new me()._setAge(10);                  ',
        'var meins = sap.meins; meins._gender;',
        'var me = sap.me; me.getGender();            ',
        "var me = sap['me']; me['gender'];         ",
        'var me = sap.me; me.brother.getGender();       ',
        "var me = sap.me; me['brother'].getGender();       ",
        'var me = sap.me; {var me = sap.me; me.getGender();}',
        "(true?sap.me._age:'')", // increase code coverage
        'var bSize = sap.m.foo.bar.Button.getColor();' +
            'var oButton, oButton2, oButton3, oButton4, oButton5 = new sap.me.foo.bar.Button();' +
            'var cButton = new sap.viz.ui5.Button();' +
            'var oViewData = {' +
            '    component: this,' +
            '    _mergeDataModel: function(salesOrderFulfillmentIssueQuery, salesOrderQuery,' +
            '            billingDocumentQuery) {' +
            '        var issueModel = new sap.ui.model.json.JSONModel();' +
            '        if (salesOrderFulfillmentIssueQuery) {' +
            '            issueModel.setProperty("/SalesOrder",' +
            '                    salesOrderFulfillmentIssueQuery.oData.SalesOrder);' +
            '            issueModel.setProperty("/DueDays",' +
            '                    salesOrderFulfillmentIssueQuery.oData.DueDays);' +
            '        }                         ' +
            '    }                             ' +
            '};                                ' +
            '                                  ' +
            'function createContent() {        ' +
            '                                  ' +
            '    window.alert("hello world");  ' +
            //                                    + "    oButton3.test = 12;           "
            '    var oViewData = {             ' +
            '        component: this           ' +
            '    };                            ' +
            '    return sap.ui.view({          ' +
            '        viewName: "sap.ca.scfld.md.sample.Main",  ' +
            '        type: sap.ui.core.mvc.ViewType.XML,       ' +
            '        viewData: oViewData                       ' +
            '    });                                           ' +
            '}                        ' +
            '                         ' +
            //                                    + "cButton.offset = \"foo\";"
            'var foobar = oButton2._funoffset().color;',
        // false positive (fixed)
        'var wmmData = this.wmmJsonModel.getData(); wmmData.cal_settings.FactoryCalErrorState = sap.ui.core.ValueState.Error;'
    ],
    invalid: [
        {
            code: 'var me = sap.me; me.methodThatReturnsMe()._age = 10;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // access private property
            code: 'var me = sap.me; me._age;',
            options: [
                {
                    'ns': [
                        'sap.ca.ui',
                        'sap.m',
                        'sap.makit',
                        'sap.me',
                        'sap.ndc',
                        'sap.ui',
                        'sap.uiext',
                        'sap.viz',
                        'sap.suite.ui',
                        'sap.ushell'
                    ]
                }
            ],
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // assign value to private property
            code: 'var me = sap.me; me._age = 10;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // assign value to private property
            code: 'var me = sap.me; me.age = 10;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // assign value to nested private property
            code: 'var me = sap.me; me.sister._age = 13;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // assign value to nested private property
            // (nested in method return value)
            code: 'var me = sap.me; me.getBrother()._age = 15;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // assign value of private property
            code: 'var me = sap.me; myAge = me._age;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // access private method
            code: 'var me = sap.me; me._setAge();                          ',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // access and invoce private method
            code: 'var me = sap.me; setMyAge = me._setAge; setMyAge(10);                ',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // access private method of new object
            code: 'var me = sap.me; new me()._setAge(10);                  ',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // usage of private property directly,
            code: 'sap.m.Button._myPrivateProperty;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // usage of private property directly,
            code: 'sap.m.Button.myPrivateProperty;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // usage of private property via variable
            code: 'var btn = sap.ca.ui.Button; btn.myPrivateProperty;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            // usage of private property via new object
            code: 'var btn = new sap.me.Button(); btn.myPrivateProperty;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var btn = sap.ui.Button; btn.myPrivateProperty;',
            options: [
                {
                    'ns': ['sap.ui']
                }
            ],
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var btn = sap.ushell.Button; btn._myPrivateProperty;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var btn = sap.viz.ui5.Button; btn._myPrivateProperty;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'var btn = sap.uiext.inbox.Button; btn._myPrivateProperty;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        },
        {
            code: 'sap.ca.ui.utils.BUSYDIALOG_TIMEOUT = 0;',
            errors: [
                {
                    message: MSG,
                    type: 'MemberExpression'
                }
            ]
        }
    ]
});
