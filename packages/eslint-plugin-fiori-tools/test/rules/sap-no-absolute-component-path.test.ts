/**
 * @fileoverview Unit test for "sap-no-absolute-component-path".
 * @author Christopher Fenner (C5224075) with advice from Armin Gienger (D028623)
 * @ESLint Version 0.14.0 / May 2015
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-absolute-component-path';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
const ERROR_MSG = "Value for metadata/includes must not be absolute (leading '/')." as const;
const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-absolute-component-path', rule, {
    // Examples of code that should NOT trigger the rule
    valid: [
        "sap.ui.core.UIComponent.extend('sap.ui.demokit.explored.Component', true);",
        "sap.ui.core.UIComponent.extend('sap.ui.demokit.explored.Component');",
        `sap.ui.core.UIComponent.extend('sap.ui.demokit.explored.Component', { 
                                    metadata : { includes : 'css/titles.css' } });`,
        `sap.ui.core.UIComponent.extend('sap.ui.demokit.explored.Component', { 
                                    metadata : { mannheim : [ 'css/style1.css', 'css/style2.css', 'css/titles.css' ] } });`
    ],
    // Examples of code that should trigger the rule
    invalid: [
        {
            code: `sap.ui.core.UIComponent.extend('sap.ui.demokit.explored.Component', { 
                                        metadata : { 
                                        includes : [ 
                                        'css/style2.css', 
                                        '/css/style2.css', 
                                        '/css/titles.css' 
                                        ], 
                                        routing : { 
                                        config : { 
                                        routerClass : MyRouter, 
                                        viewType : 'XML', 
                                        viewPath : 'sap.ui.demokit.explored.view', 
                                        targetControl : 'splitApp', 
                                        clearTarget : false 
                                        }, 
                                        routes : [ { 
                                        pattern : 'entity/{id}/{part}', 
                                        name : 'entity', 
                                        view : 'entity', 
                                        viewLevel : 3, 
                                        targetAggregation : 'detailPages' 
                                        } ] } } });`,
            errors: [
                {
                    message: ERROR_MSG,
                    type: 'CallExpression'
                },
                {
                    message: ERROR_MSG,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `var test = sap.ui.core.UIComponent; test.extend('sap.ui.demokit.explored.Component', { 
                                        metadata : { 
                                        includes : [ 
                                        '/css/style2.css', 
                                        '/css/titles.css' 
                                        ], 
                                        routing : { 
                                        routes : [ { 
                                        pattern : 'entity/{id}/{part}', 
                                        name : 'entity', 
                                        view : 'entity', 
                                        viewLevel : 3, 
                                        targetAggregation : 'detailPages' 
                                        } ] }  }  });`,
            errors: [
                {
                    message: ERROR_MSG,
                    type: 'CallExpression'
                },
                {
                    message: ERROR_MSG,
                    type: 'CallExpression'
                }
            ]
        },
        // false positive
        {
            code: `var test = sap.m.Button; test.extend('sap.ui.demokit.explored.Component', { 
                                        metadata : { 
                                        includes : [ 
                                        '/css/style2.css', 
                                        '/css/titles.css' 
                                        ], 
                                        } 
                                        });`,
            errors: [
                {
                    message: ERROR_MSG,
                    type: 'CallExpression'
                },
                {
                    message: ERROR_MSG,
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
