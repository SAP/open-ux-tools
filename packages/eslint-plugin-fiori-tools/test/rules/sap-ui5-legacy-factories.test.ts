//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-ui5-legacy-factories';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-ui5-legacy-factories', rule, {
    valid: [
        {
            code: `sap.ui.define(['sap/ui/core/mvc/View', 'sap/m/Panel'], function(View, Panel){								
                                 return View.extend("my.View", {        
                                    // define, which controller to use
                                    getControllerName: function() {
                                        return "my.Controller";
                                    },

                                    // whether the ID of content controls should be prefixed automatically with the view ID
                                    getAutoPrefixId: function() {
                                        return true; // default is false
                                    },

                                    // create view content and return the root control(s)
                                    createContent: function() {
                                        return new Promise(function(res, rej) {
                                            res(new Panel({}));
                                        }).catch(function(oError) {
                                            throw oError;
                                        });
                                    }                                                      
                                    });
                                });`
        },
        {
            code: `sap.ui.require(['sap/ui/core/Component'], function(Component){
                                    Component.create({                               
                                        name: "my.comp"
                                    }).then(function(oComp) {});
                                });`
        },
        {
            code: `sap.ui.require(['sap/ui/core/Fragment'], function(Fragment){
                                    Fragment.load({                               
                                        name: "my.fragment",                               
                                        type: "XML"                               
                                    });
                                });`
        },
        {
            code: `sap.ui.require(['sap/ui/core/Component'], function(Component){
                                    Component.load({                                
                                        name: "my.comp"                                
                                    }).then(function(oClass) {                                
                                        var oComponentInstance = new oClass({});                                
                                    });                                
                                });`
        },
        {
            code: `sap.ui.require(['sap/ui/core/Component'], function(Component){
                                  var oComponentInstance = Component.get("my-comp-id");                               
                                });`
        },
        {
            code: `sap.ui.require(['sap/ui/core/VersionInfo'], function(VersionInfo){
                                    VersionInfo.load({ 
                                        name: "version"
                                    });
                                });`
        },
        {
            code: ` sap.ui.require(['sap/base/i18n/ResourceBundle'], function(Resource){                               
                                    ResourceBundle.create({                                
                                        url: "mybundle.properties",
                                        async: true                               
                                    }).then(function(oResource) { });
                                });`
        },
        {
            code: `sap.ui.require(['sap/ui/core/ExtensionPoint'], function(ExtensionPoint){
                                    ExtensionPoint.load({      
                                        name: 'my.Extension'                     
                                    });
                                });`
        },
        {
            code: `sap.ui.require(['sap/ui/core/mvc/View'], function(View){
                                    View.create({                                 
                                        viewName: "my.View",                                
                                        type: "XML"                                
                                    }).then(function(oView) {});
                                });`
        },
        {
            code: `sap.ui.require(['sap/ui/core/mvc/XMLView'], function(XMLView){
                                    XMLView.create({                                 
                                        viewName: "my.View"                                
                                    }).then(function(oView) { });
                                });`
        },
        {
            code: `sap.ui.require(['sap/ui/core/mvc/Controller'], function(Controller){
                                    Controller.create({                                 
                                        name: "my.Controller"                                
                                    }).then(function(oController) {  });
                                });`
        }
    ],
    invalid: [
        {
            code: `var oView = sap.ui.jsview({								
                                     viewName: "my.View"                                                            
                                 });`,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `var oComponentInstance = sap.ui.component({								
                                    name: "my.comp"                                                          
                                 });`,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `sap.ui.component({
                                    name: "my.comp"                              
                                });`,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `var oComponentClass = sap.ui.component.load({
                                    name: "my.comp"                               
                                });`,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `var oComponentInstance = sap.ui.component("my-comp-id");`,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `var oView = sap.ui.view({
                                    viewName: "my.View",                              
                                    type: "XML"
                                
                                });`,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `var oView = sap.ui.xmlview({
                                    viewName: "my.View"                              
                                });`,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `var oController = sap.ui.controller({
                                    name: "my.Controller"                              
                                });`,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `var aControls = sap.ui.extensionpoint({
                                    name: "my.Point"                              
                                });`,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `var aControls = sap.ui.fragment({ 
                                    name: "my.fragment",                               
                                    type: "XML" 
                                });
                                `,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `var oVersionInfo = sap.ui.getVersionInfo();`,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `jQuery.sap.resources({
                                    url: "mybundle.properties"                                                            
                                });`,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `$.sap.resources({
                                    url: "mybundle.properties"                                                            
                                });`,
            errors: [
                {
                    message:
                        'Make use of sap.ui.define([...], function(...) {...} to load required dependencies. Legacy UI5 factories leading to synchronous loading.',
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
