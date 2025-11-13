# Unsupported content in SimpleForm, Form or SmartForm (sap-ui5-forms)

This rule checks for unsupported content in SimpleForm, Form or SmartForm.

## Rule details

Form Form, SimpleForm or SmartForm only controls implementing interface sap.ui.core.IFormContent are supported. Other controls, especially layouts, tables, views or complex controls are not supported. Using unsupported controls might bring visual issues, breaking the designed responsiveness, bringing issues with keyboard support or screen-reader support. Please use only labels and controls implementing interface sap.ui.core.IFormContent as content of a Form.

### warning message: Invalid content for SimpleForm / Form / SmartForm.

The following code snippet is fine:

```js
var oSF1 = new sap.ui.layout.form.SimpleForm("SF1", {
                                    title: "Supported Content",
                                    editable: true,
                                    content: [
                                        new sap.m.Label({text: "Label"}),
                                        new sap.m.Input()
                                    ]
                                }).placeAt('content');
```


```js
var oF1 = new sap.ui.layout.form.Form("F1", {
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
                                }).placeAt('content');
```


```js
var oSF1 = new sap.ui.comp.smartform.SmartForm("SF1", {
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
                                }).placeAt('content');
```




The following code snippets are unsupported and raise Warnings:

```js
var oSF2 = new sap.ui.layout.form.SimpleForm("SF2", {
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
                                }).placeAt('content');
```


```js
var oF2 = new sap.ui.layout.form.Form("F2", {
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
                                }).placeAt('content');
```


```js
var oSF2 = new sap.ui.comp.smartform.SmartForm("SF2", {
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
                                }).placeAt('content');
```


## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

