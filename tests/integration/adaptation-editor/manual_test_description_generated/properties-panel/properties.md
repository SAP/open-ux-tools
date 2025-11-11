# Properties Test Documentation

## Table of Contents

- [1. Change Button Text](#1-change-button-text)
- [2. Change Properties to Expression](#2-change-properties-to-expression)
- [3. Undo/Redo](#3-undoredo)
- [4. Filter Properties Show only editable properties](#4-filter-properties-show-only-editable-properties)
- [5. Tooltip for properties](#5-tooltip-for-properties)

<a id="1-change-button-text"></a>
## 1. Change Button Text

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on `Create` in the `Running Application Preview`
3. Check `Control Id: fiori.elements.v2.0::sap.suite.ui.generic.template.ListReport.view.ListReport::RootEntity--addEntry` and `Control Type: sap.m.Button` are visible in the Properties Panel
4. Check `Copy` button and its tooltip `Copy` is visible in the Properties Panel
5. Fill `Text` property with  `Create New` in the Properties Panel
6. Click elsewhere to loose focus from the input in Properties Panel
7. Click `Save` button in the toolBar
8. Check `Text` property value is `Create New` in the Properties Panel
9. Check `Text->Create New` text is visible in the Changes Panel
10. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "propertyChange",
  "content": {
    "property": "text",
    "newValue": "Create New"
  }
}
```



---

<a id="2-change-properties-to-expression"></a>
## 2. Change Properties to Expression

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on `Create` in the `Running Application Preview`
3. Set `Enabled` property to `True` in the Properties Panel
4. Check control with label `Create` is `enabled` in the `Running Application Preview`
5. Set `Enabled` property to `False` in the Properties Panel
6. Check control with label `Create` is `disabled` in the `Running Application Preview`
7. Click `Expression` value for `Enabled` property in the Properties Panel
8. Check `Enabled` property value is `{expression}` in the Properties Panel
9. Fill `Enabled` property with  `{expression` in the Properties Panel
10. Click elsewhere to loose focus from the input in Properties Panel
11. Check `Enabled` property value is `{expression` in the Properties Panel
12. Check `Enabled` property value has error and error message is`SyntaxError: no closing braces found in '{expression' after pos:0` in the Properties Panel
13. Fill `Enabled` property with  `{someExpression}` in the Properties Panel
14. Click elsewhere to loose focus from the input in Properties Panel
15. Check `Enabled` property value is `{someExpression}` in the Properties Panel
16. Check `Enabled` property value has no error in the Properties Panel
17. Check `Type` property value is `Transparent` in the Properties Panel
18. Click `Expression` value for `Type` property in the Properties Panel
19. Check `Type` property value is `{expression}` in the Properties Panel
20. Fill `Type` property with  `Back` in the Properties Panel
21. Check `Type` property value is `Back` in the Properties Panel

---

<a id="3-undoredo"></a>
## 3. Undo/Redo

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on `Delete` in the `Running Application Preview`
3. Fill `Text` property with  `Remove` in the Properties Panel
4. Click elsewhere to loose focus from the input in Properties Panel
5. Click `Undo` button in the toolBar
6. Check `Text` property value is `{i18n>DELETE}` in the Properties Panel
7. Click `Redo` button in the toolBar
8. Check `Text` property value is `Remove` in the Properties Panel

---

<a id="4-filter-properties-show-only-editable-properties"></a>
## 4. Filter Properties Show only editable properties

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on `Create` in the `Running Application Preview`
3. Check only following properties are rendered in the Properties Panel
     - Property name `Active Icon` and its value is `NO_VALUE_SET`
     - Property name `Blocked` and its value is `false`
     - Property name `Enabled` and its value is `true`
     - Property name `Icon` and its value is `NO_VALUE_SET`
     - Property name `Text` and its value is `{i18n>CREATE_OBJECT}`
     - Property name `Type` and its value is `Transparent`
     - Property name `Visible` and its value is `true`

4. Fill `Filter Properties` input field with `text`
5. Check properties list is filtered by `text` in the Properties Panel
6. Fill `Filter Properties` input field with ``
7. Click `Filter Options` button in the Manage Filters callout in the Properties Panel
8. Click `Show only editable properties` option to uncheck in the Manage Filters callout in Properties Panel
9. Check all properties editable and non editable are rendered

---

<a id="5-tooltip-for-properties"></a>
## 5. Tooltip for properties

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on `Create` in the `Running Application Preview`
3. Hover property `Blocked` to open tooltip in the Properties Panel
4. Verify tooltip content 
```json
{
  "title": "Blocked",
  "Property name": "blocked",
  "Property type": "boolean",
  "Default value": "false",
  "infoIconDesc": "This is default value set by SAP UI5 control and it may be different than the one that is used by SAP Fiori Elements. This means that after deleting all the changes for the property it's value may differ from the one displayed here.",
  "description": "Whether the control is currently in blocked state."
}
```



---

