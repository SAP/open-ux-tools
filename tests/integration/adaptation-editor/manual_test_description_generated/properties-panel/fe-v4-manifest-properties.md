# Fe V4 Manifest Properties Test Documentation

## Table of Contents

- [1. Change Button Text](#1-change-button-text)
- [2. Undo/Redo](#2-undoredo)
- [3. Filter Properties Show only editable properties](#3-filter-properties-show-only-editable-properties)
- [4. Tooltip for properties](#4-tooltip-for-properties)

<a id="1-change-button-text"></a>
## 1. Change Button Text

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on the table in the List Report
3. Fill `Header` property with  `List Report Table` in the Properties Panel
4. Click elsewhere to loose focus from the input in Properties Panel
5. Click `Save` button in the toolBar
6. Check `Header` property value is `List Report Table` in the Properties Panel
7. Check `header->List Report Table` text is visible in the Changes Panel
8. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_fe_changePageConfiguration",
  "content": {
    "page": "RootEntityList",
    "entityPropertyChange": {
      "propertyPath": "controlConfiguration/@com.sap.vocabularies.UI.v1.LineItem/tableSettings/header",
      "operation": "UPSERT",
      "propertyValue": "List Report Table"
    }
  }
}
```



---

<a id="2-undoredo"></a>
## 2. Undo/Redo

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on the table in the List Report
3. Fill `Header` property with  `List Report Table` in the Properties Panel
4. Click elsewhere to loose focus from the input in Properties Panel
5. Click `Undo` button in the toolBar
6. Check `Header` property value is `Root Entities` in the Properties Panel
7. Click `Redo` button in the toolBar
8. Check `Header` property value is `List Report Table` in the Properties Panel

---

<a id="3-filter-properties-show-only-editable-properties"></a>
## 3. Filter Properties Show only editable properties

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on the table in the List Report
3. Check only following properties are rendered in the Properties Panel
     - Property name `Before Rebind Table` and its value is `NO_VALUE_SET`
     - Property name `Condensed Table Layout` and its value is `false`
     - Property name `Enable Add Card To Insights` and its value is `false`
     - Property name `Enable Export` and its value is `true`
     - Property name `Frozen Column Count` and its value is `0`
     - Property name `Header` and its value is `Root Entities`
     - Property name `Header Visible` and its value is `true`
     - Property name `Hierarchy Qualifier` and its value is `NO_VALUE_SET`
     - Property name `Scroll Threshold` and its value is `200`
     - Property name `Select All` and its value is `false`
     - Property name `Selection Change` and its value is `NO_VALUE_SET`
     - Property name `Selection Limit` and its value is `200`
     - Property name `Selection Mode` and its value is `Multi`
     - Property name `Show Counts` and its value is `false`
     - Property name `Threshold` and its value is `30`
     - Property name `Type` and its value is `Responsive Table`
     - Property name `Width Including Column Header` and its value is `false`

4. Fill `Filter Properties` input field with `header`
5. Check properties list is filtered by `header` in the Properties Panel
6. Fill `Filter Properties` input field with ``
7. Click `Filter Options` button in the Manage Filters callout in the Properties Panel
8. Click `Show only editable properties` option to uncheck in the Manage Filters callout in Properties Panel
9. Check all properties editable and non editable are rendered

---

<a id="4-tooltip-for-properties"></a>
## 4. Tooltip for properties

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on the table in the List Report
3. Hover property `SelectionLimit` to open tooltip in the Properties Panel
4. Verify tooltip content 
```json
{
  "title": "Selection Limit",
  "Property name": "selectionLimit",
  "Default value": "300",
  "infoIconDesc": "This is default value set by SAP UI5 control and it may be different than the one that is used by SAP Fiori Elements. This means that after deleting all the changes for the property it's value may differ from the one displayed here.",
  "description": "Define the selection limit"
}
```



---

