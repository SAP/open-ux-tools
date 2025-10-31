# Object Page V4 Test Documentation

## Table of Contents

- [1. Add Custom Table Column.](#1-add-custom-table-column)
- [2. Enable Variant Management in Tables.](#2-enable-variant-management-in-tables)
- [3. Enable Empty row mode.](#3-enable-empty-row-mode)
- [4. Change table actions](#4-change-table-actions)
- [5. Add SubObject Page Quick Action](#5-add-subobject-page-quick-action)

<a id="1-add-custom-table-column"></a>
## 1. Add Custom Table Column.

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Click `Add Custom Table Column` button in the Quick Actions Panel
7. Fill `Fragment Name` field with `table-column` in the dialog `Add Custom Table Column`
8. Click `Save and Reload` button in the toolBar
9. Verify changes:

**Fragment(s)**

**table-column.fragment.xml**
```xml
<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:table="sap.ui.mdc.table">
    <table:Column
        id="column-<UNIQUE_ID>"
        width="10%"
        header="New Column">
        <Text id="text-<UNIQUE_ID>" text="Sample data"/>
    </table:Column>
</core:FragmentDefinition>
```

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "addXML",
  "content": {
    "targetAggregation": "columns",
    "index": 3,
    "fragmentPath": "fragments/table-column.fragment.xml"
  }
}
```


10. Check Column Name is `New Column`
11. Check Column Data is `Sample data`

---

<a id="2-enable-variant-management-in-tables"></a>
## 2. Enable Variant Management in Tables.

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Click `Enable Variant Management in Tables` button in the Quick Actions Panel
7. Click `Save and Reload` button in the toolBar
8. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_fe_changePageConfiguration",
  "content": {
    "page": "RootEntityObjectPage",
    "entityPropertyChange": {
      "propertyPath": "variantManagement",
      "operation": "UPSERT",
      "propertyValue": "Control"
    }
  }
}
```



---

<a id="3-enable-empty-row-mode"></a>
## 3. Enable Empty row mode.

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Click `Enable Empty Row Mode for Tables` button in the Quick Actions Panel
7. Click `Save and Reload` button in the toolBar
8. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_fe_changePageConfiguration",
  "content": {
    "page": "RootEntityObjectPage",
    "entityPropertyChange": {
      "propertyPath": "controlConfiguration/toFirstAssociatedEntity/@com.sap.vocabularies.UI.v1.LineItem#tableSection/tableSettings/creationMode/name",
      "operation": "UPSERT",
      "propertyValue": "InlineCreationRows"
    }
  }
}
```



---

<a id="4-change-table-actions"></a>
## 4. Change table actions

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Click `Change Table Actions` button in the Quick Actions Panel
7. Check `Basic Search, Approve, Callback, Delete` exist in the `Toolbar Configuration` dialog
8. Hover over row `2` and click on `Move up` button in the row of `Toolbar Configuration` table
9. Check `Approve, Basic Search, Cancel, Delete` exist in the `Toolbar Configuration` dialog
10. Click `Save` button in the toolBar
11. Check saved changes stack contains `1` `Move Action Change` change(s)

---

<a id="5-add-subobject-page-quick-action"></a>
## 5. Add SubObject Page Quick Action

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Click `Add Subpage` button in the Quick Actions Panel
7. Click `Save and Reload` button in the toolBar
8. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_fe_addNewPage",
  "content": {
    "sourcePage": {
      "id": "RootEntityObjectPage",
      "navigationSource": "toFirstAssociatedEntity"
    },
    "targetPage": {
      "type": "Component",
      "id": "FirstAssociatedEntityObjectPage",
      "name": "sap.fe.templates.ObjectPage",
      "routePattern": "RootEntity({key})/toFirstAssociatedEntity({FirstAssociatedEntityKey}):?query:",
      "settings": {
        "contextPath": "/FirstAssociatedEntity",
        "editableHeaderContent": false,
        "entitySet": "FirstAssociatedEntity"
      }
    }
  }
}
```



---

