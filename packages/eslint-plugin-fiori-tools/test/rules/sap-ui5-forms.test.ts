//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
import rule from '../../src/rules/sap-ui5-forms';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-ui5-forms', rule, {
    valid: [
        {
            code: `var oF1 = new sap.ui.layout.form.Form("F1", {
                                    title: "Supported Content",
                                    editable: true,
                                    layout: new sap.ui.layout.form.ResponsiveGridLayout(),
                                    formContainers: [
                                                      {
                                                         formElements: [
                                                            {
                                                               label: new sap.m.Label({text: "Label"}),
                                                               fields: [
                                                                  new sap.m.Input()
                                                               ]
                                                            }
                                                         ]
                                                      }
                                                    ]
                                 }).placeAt('content');`
        },
        {
            code: `new sap.ui.layout.form.FormElement({
                        label: new sap.m.Label({text: "Label"}),
                        fields: [
                            new sap.m.Input()
                        ]
                    })`
        },
        {
            code: `var oSF1 = new sap.ui.layout.form.SimpleForm("SF1", {
                                    title: "Supported Content",
                                    editable: true,
                                    content: [
                                        new sap.m.Label({text: "Label"}),
                                        new sap.m.Input()
                                    ]
                                }).placeAt('content');`
        },
        {
            code: `var oF1 = new sap.ui.layout.form.Form("F1", {
                                    title: "Supported Content",
                                    editable: true,
                                    layout: new sap.ui.layout.form.ResponsiveGridLayout(),
                                    formContainers: [
                                                            new sap.ui.layout.form.FormContainer({
                                                                formElements: [
                                                                    new sap.ui.layout.form.FormElement({
                                                                        label: new sap.m.Label({text: "Label"}),
                                                                        fields: [
                                                                            new sap.m.Input()
                                                                        ]
                                                                    })
                                                                ]
                                                            })
                                                         ]
                                }).placeAt('content');`
        },
        {
            code: `var oSF1 = new sap.ui.comp.smartform.SmartForm("SF1", {
                                    title: "Supported Content",
                                    editable: true,
                                    layout: new sap.ui.comp.smartform.Layout(),
                                    groups: [
                                                new sap.ui.comp.smartform.Group({
                                                    groupElements: [
                                                        new sap.ui.comp.smartform.GroupElement({
                                                            label: new sap.m.Label({text: "Label"}),
                                                            elements: [
                                                                new sap.m.Input()
                                                            ]
                                                        })
                                                    ]
                                                })
                                            ]
                                }).placeAt('content');`
        },
        {
            code: ` oParameters.show("", oParameters.mainNavigation, aActions, new sap.ui.layout.form.SimpleForm({
                    maxContainerCols: 2,
                    columnsL: 1,
                    columnsM: 1,
                    content: [
                        new sap.ui.core.Title({
                            text: oEvent.getSource().getText()
                        }),
                        new Label({
                            text: oi18n.getText("BUDGET_AVC")
                        })
                    ]
                }));`
        }
    ],
    invalid: [
        {
            code: `var oSF2 = new sap.ui.layout.form.SimpleForm("SF2", {
                                    title: "Unsupported VerticalLayout",
                                    editable: true,
                                    content: [
                                        new sap.ui.layout.VerticalLayout({
                                            content: [
                                                new sap.m.Label({text: "Label"}),
                                                new sap.m.Input()
                                            ]
                                        })
                                    ]
                                }).placeAt('content');`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: `var oSF3 = new sap.ui.layout.form.SimpleForm("SF3", {
                                    title: "Unsupported VBox",
                                    editable: true,
                                    content: [
                                        new sap.m.VBox({
                                            items: [
                                                new sap.m.Label({text: "Label"}),
                                                new sap.m.Input()
                                            ]
                                        })
                                    ]
                                }).placeAt('content');`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: `var oSF4 = new sap.ui.layout.form.SimpleForm("SF4", {
                                    title: "Unsupported HBox",
                                    editable: true,
                                    content: [
                                        new sap.m.HBox({
                                            items: [
                                                new sap.m.Label({text: "Label"}),
                                                new sap.m.Input()
                                            ]
                                        })
                                    ]
                                }).placeAt('content');`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: `var oSF5 = new sap.ui.layout.form.SimpleForm("SF5", {
                                    title: "Unsupported Table",
                                    editable: true,
                                    content: [
                                        new sap.m.Table({})
                                    ]
                                }).placeAt('content');`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: `var oF2 = new sap.ui.layout.form.Form("F2", {
                                    title: "Unsupported VerticalLayout",
                                    editable: true,
                                    layout: new sap.ui.layout.form.ResponsiveGridLayout(),
                                    formContainers: [
                                                            new sap.ui.layout.form.FormContainer({
                                                                formElements: [
                                                                    new sap.ui.layout.form.FormElement({
                                                                        fields: [
                                                                            new sap.ui.layout.VerticalLayout({
                                                                                content: [
                                                                                    new sap.m.Label({text: "Label"}),
                                                                                    new sap.m.Input()
                                                                                ]
                                                                            })
                                                                        ]
                                                                    })
                                                                ]
                                                            })
                                                         ]
                                }).placeAt('content');`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: `new sap.ui.layout.form.FormElement({
                        label: new sap.m.Label({text: "Label"}),
                        fields: [
                            new sap.ui.layout.VerticalLayout({
                                content: [
                                    new sap.m.Label({text: "Label"}),
                                    new sap.m.Input()
                                ]
                            })
                        ]
                    })`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: `var oF3 = new sap.ui.layout.form.Form("F3", {
                                    title: "Unsupported VBox",
                                    editable: true,
                                    layout: new sap.ui.layout.form.ResponsiveGridLayout(),
                                    formContainers: [
                                                            new sap.ui.layout.form.FormContainer({
                                                                formElements: [
                                                                    new sap.ui.layout.form.FormElement({
                                                                        fields: [
                                                                            new sap.m.VBox({
                                                                                items: [
                                                                                    new sap.m.Label({text: "Label"}),
                                                                                    new sap.m.Input()
                                                                                ]
                                                                            })
                                                                        ]
                                                                    })
                                                                ]
                                                            })
                                                         ]
                                }).placeAt('content');`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: `var oF4 = new sap.ui.layout.form.Form("F4", {
                                    title: "Unsupported HBox",
                                    editable: true,
                                    layout: new sap.ui.layout.form.ResponsiveGridLayout(),
                                    formContainers: [
                                                            new sap.ui.layout.form.FormContainer({
                                                                formElements: [
                                                                    new sap.ui.layout.form.FormElement({
                                                                        fields: [
                                                                            new sap.m.HBox({
                                                                                items: [
                                                                                    new sap.m.Label({text: "Label"}),
                                                                                    new sap.m.Input()
                                                                                ]
                                                                            })
                                                                        ]
                                                                    })
                                                                ]
                                                            })
                                                         ]
                                }).placeAt('content');`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: `var oF5 = new sap.ui.layout.form.Form("F5", {
                                    title: "Unsupported Table",
                                    editable: true,
                                    layout: new sap.ui.layout.form.ResponsiveGridLayout(),
                                    formContainers: [
                                                            new sap.ui.layout.form.FormContainer({
                                                                formElements: [
                                                                    new sap.ui.layout.form.FormElement({
                                                                        fields: [
                                                                            new sap.m.Table({})
                                                                        ]
                                                                    })
                                                                ]
                                                            })
                                                         ]
                                }).placeAt('content');`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: `var oSF2 = new sap.ui.comp.smartform.SmartForm("SF2", {
                                    title: "Unsupported VerticalLayout",
                                    editable: true,
                                    layout: new sap.ui.comp.smartform.Layout(),
                                    groups: [
                                                new sap.ui.comp.smartform.Group({
                                                    groupElements: [
                                                        new sap.ui.comp.smartform.GroupElement({
                                                            elements: [
                                                                new sap.ui.layout.VerticalLayout({
                                                                    content: [
                                                                        new sap.m.Label({text: "Label"}),
                                                                        new sap.m.Input()
                                                                    ]
                                                                })
                                                            ]
                                                        })
                                                    ]
                                                })
                                            ]
                                }).placeAt('content');`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: `var oSF3 = new sap.ui.comp.smartform.SmartForm("SF3", {
                                    title: "Unsupported VBox",
                                    editable: true,
                                    layout: new sap.ui.comp.smartform.Layout(),
                                    groups: [
                                                new sap.ui.comp.smartform.Group({
                                                    groupElements: [
                                                        new sap.ui.comp.smartform.GroupElement({
                                                            elements: [
                                                                new sap.m.VBox({
                                                                    items: [
                                                                        new sap.m.Label({text: "Label"}),
                                                                        new sap.m.Input()
                                                                    ]
                                                                })
                                                            ]
                                                        })
                                                    ]
                                                })
                                            ]
                                }).placeAt('content');`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: `var oSF4 = new sap.ui.comp.smartform.SmartForm("SF4", {
                                    title: "Unsupported HBox",
                                    editable: true,
                                    layout: new sap.ui.comp.smartform.Layout(),
                                    groups: [
                                                new sap.ui.comp.smartform.Group({
                                                    groupElements: [
                                                        new sap.ui.comp.smartform.GroupElement({
                                                            elements: [
                                                                new sap.m.HBox({
                                                                    items: [
                                                                        new sap.m.Label({text: "Label"}),
                                                                        new sap.m.Input()
                                                                    ]
                                                                })
                                                            ]
                                                        })
                                                    ]
                                                })
                                            ]
                                }).placeAt('content');`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: ` new sap.ui.comp.smartform.GroupElement({
                        elements: [
                            new sap.m.HBox({
                                items: [
                                    new sap.m.Label({text: "Label"}),
                                    new sap.m.Input()
                                ]
                            })
                        ]
                    })`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        },
        {
            code: `var oSF5 = new sap.ui.comp.smartform.SmartForm("SF5", {
                                    title: "Unsupported Table",
                                    editable: true,
                                    layout: new sap.ui.comp.smartform.Layout(),
                                    groups: [
                                                new sap.ui.comp.smartform.Group({
                                                    groupElements: [
                                                        new sap.ui.comp.smartform.GroupElement({
                                                            elements: [
                                                                new sap.m.Table({})
                                                            ]
                                                        })
                                                    ]
                                                })
                                            ]
                                }).placeAt('content');`,
            errors: [
                {
                    message: 'Invalid content for SimpleForm / Form / SmartForm.',
                    type: 'NewExpression'
                }
            ]
        }
    ]
});
