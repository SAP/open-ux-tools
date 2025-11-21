# List Report V4 Test Documentation

## Table of Contents

- [1. Enable/Disable clear filter bar button](#1-enabledisable-clear-filter-bar-button)
- [2: Add Custom Table Column LR](#2-add-custom-table-column-lr)
- [3. Add New Annotation File](#3-add-new-annotation-file)
- [4. Enable Variant Management in Tables and Charts](#4-enable-variant-management-in-tables-and-charts)
- [5. Change table actions](#5-change-table-actions)
- [6: Add Custom Page Action to LR page](#6-add-custom-page-action-to-lr-page)
- [7: Add Custom Table Action to LR page](#7-add-custom-table-action-to-lr-page)
- [8. Enable/Disable Semantic Date Range in Filter Bar](#8-enabledisable-semantic-date-range-in-filter-bar)
- [9. Enable Table Filtering for Page Variants](#9-enable-table-filtering-for-page-variants)

<a id="1-enabledisable-clear-filter-bar-button"></a>
## 1. Enable/Disable clear filter bar button

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Check `Clear` button in the List Report filter bar is hidden
3. Click `Enable "Clear" Button in Filter Bar` button in the Quick Actions Panel
4. Click `Save and Reload` button in the toolBar
5. Check `Clear` button in the List Report filter bar is visible
6. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_fe_changePageConfiguration",
  "content": {
    "page": "RootEntityList",
    "entityPropertyChange": {
      "operation": "UPSERT",
      "propertyPath": "controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/showClearButton",
      "propertyValue": true
    }
  }
}
```



---

<a id="2-add-custom-table-column-lr"></a>
## 2: Add Custom Table Column LR

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Add Custom Table Column` button in the Quick Actions Panel
3. Fill `Fragment Name` field with `table-column` in the dialog `Add Custom Table Column`
4. Click `Save and Reload` button in the toolBar
5. Verify changes:

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
    "fragmentPath": "fragments/table-column.fragment.xml"
  }
}
```


6. Click `Navigation` button in the toolBar
7. Click `Go` button in the Running Application Preview
8. Check Column Name is `New Column`
9. Check Column Data is `Sample data`

---

<a id="3-add-new-annotation-file"></a>
## 3. Add New Annotation File

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Add Local Annotation File` button in the Quick Actions Panel
3. Click `Save and Reload` button in the toolBar
4. Verify changes:

**Annotations**
```xml
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/Common.xml">
        <edmx:Include Namespace="com.sap.vocabularies.Common.v1" Alias="Common"/>
    </edmx:Reference>
    <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/UI.xml">
        <edmx:Include Namespace="com.sap.vocabularies.UI.v1" Alias="UI"/>
    </edmx:Reference>
    <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/Communication.xml">
        <edmx:Include Namespace="com.sap.vocabularies.Communication.v1" Alias="Communication"/>
    </edmx:Reference>
    <edmx:Reference Uri="/sap/opu/odata/sap/SERVICE/\$metadata">
        <edmx:Include Namespace="SERVICE"/>
    </edmx:Reference>
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="local_<UNIQUE_ID>">
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>
```

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_app_addAnnotationsToOData",
  "content": {
    "dataSourceId": "mainService",
    "annotations": [
      {}
    ]
  }
}
```


5. Click `Show Local Annotation File` button in the Quick Actions Panel
6. Check filename `adp.fiori.elements.v2/changes/annotations/annotation_<UNIQUE_ID>.xml` is visible in the dialog
7. Check button `Show File in VSCode` is visible in the dialog

---

<a id="4-enable-variant-management-in-tables-and-charts"></a>
## 4. Enable Variant Management in Tables and Charts

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Enable Variant Management in Tables and Charts` button in the Quick Actions Panel
3. Click `Save and Reload` button in the toolBar
4. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_fe_changePageConfiguration",
  "content": {
    "page": "RootEntityList",
    "entityPropertyChange": {
      "propertyPath": "variantManagement",
      "operation": "UPSERT",
      "propertyValue": "Control"
    }
  }
}
```



---

<a id="5-change-table-actions"></a>
## 5. Change table actions

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Change Table Actions` button in the Quick Actions Panel
3. Check `Approve, Callback, Delete, Add Card to Insights` exist in the `Toolbar Configuration` dialog
4. Hover over row `2` and click on `Move up` button in the row of `Toolbar Configuration` table
5. Check `Callback, Approve, Delete, Add Card to Insights` exist in the `Toolbar Configuration` dialog
6. Click `Save` button in the toolBar
7. Check saved changes stack contains `1` `Move Action Change` change(s)

---

<a id="6-add-custom-page-action-to-lr-page"></a>
## 6: Add Custom Page Action to LR page

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Add Custom Page Action` button in the Quick Actions Panel
3. Fill `Action Id` field with `testActionId` in the dialog `Add Custom Page Action`
4. Fill `Button Text` field with `Test Page Action` in the dialog `Add Custom Page Action`
5. Click `Save and Reload` button in the toolBar
6. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_fe_changePageConfiguration",
  "content": {
    "page": "RootEntityList",
    "entityPropertyChange": {
      "operation": "UPSERT",
      "propertyPath": "content/header/actions/testActionId",
      "propertyValue": {
        "enabled": true,
        "press": "",
        "text": "Test Page Action",
        "visible": true
      }
    }
  }
}
```


7. Check control with label `Test Page Action` is visible in the `Running Application Preview`


<a id="7-add-custom-table-action-to-lr-page"></a>
## 7: Add Custom Table Action to LR page

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Add Custom Table Action` button in the Quick Actions Panel
3. Fill `Fragment Name` field with `test-table-action` in the dialog `Add Custom Table Action`
4. Click `Save and Reload` button in the toolBar
5. Verify changes:

**Fragment(s)**

**test-table-action.fragment.xml**
```xml
<core:FragmentDefinition  xmlns:core='sap.ui.core' xmlns='sap.m'>
   <actiontoolbar:ActionToolbarAction xmlns:actiontoolbar="sap.ui.mdc.actiontoolbar" id="toolbarAction-<UNIQUE_ID>" >
        <Button xmlns:m="sap.m" id="btn-<UNIQUE_ID>" visible="true" text="New Action" />
    </actiontoolbar:ActionToolbarAction>
</core:FragmentDefinition>
```

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "addXML",
  "content": {
    "targetAggregation": "actions",
    "fragmentPath": "fragments/test-table-action.fragment.xml",
    "index": 0
  },
  "selector": {
    "id": "fiori.elements.v4.0::RootEntityList--fe::table::RootEntity::LineItem"
  }
}
```


6. Check control with label `New Action` is visible in the `Running Application Preview`

---

<a id="8-enabledisable-semantic-date-range-in-filter-bar"></a>
## 8. Enable/Disable Semantic Date Range in Filter Bar

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on value help button of `Date Property` filter
4. Check semantic date range options have `Yesterday` for `DateProperty` filter
5. Click `UI Adaptation` button in the toolBar
6. Click `Disable Semantic Date Range in Filter Bar` button in the Quick Actions Panel
7. Click `Save and Reload` button in the toolBar
8. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_fe_changePageConfiguration",
  "content": {
    "entityPropertyChange": {
      "propertyPath": "controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/useSemanticDateRange",
      "propertyValue": false,
      "operation": "UPSERT"
    }
  }
}
```


9. Click `Navigation` button in the toolBar
10. Click on value help button of `Date Property` filter
11. Check `Define Conditions: Date Property` Dialog is open and click on value help button
12. Check that the calendar popover is displayed
13. Click button `Cancel` in the  `Define Conditions: Date Property` dialog
14. Click `UI Adaptation` button in the toolBar
15. Click `Enable Semantic Date Range in Filter Bar` button in the Quick Actions Panel
16. Click `Save and Reload` button in the toolBar
17. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_fe_changePageConfiguration",
  "content": {
    "entityPropertyChange": {
      "propertyPath": "controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/useSemanticDateRange",
      "propertyValue": true,
      "operation": "UPSERT"
    }
  }
}
```



---

<a id="9-enable-table-filtering-for-page-variants"></a>
## 9. Enable Table Filtering for Page Variants

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Change Table Columns` button in the Quick Actions Panel
3. Check tab(s) `Sort, Group, Columns` exist in the `View Settings` dialog
4. Click on `Cancel` button of the dialog `View Settings`
5. Click `Enable Table Filtering for Page Variants` button in the Quick Actions Panel
6. Click `Save and Reload` button in the toolBar
7. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_fe_changePageConfiguration",
  "content": {
    "page": "RootEntityList",
    "entityPropertyChange": {
      "propertyPath": "controlConfiguration/@com.sap.vocabularies.UI.v1.LineItem/tableSettings/personalization",
      "propertyValue": {
        "sort": true,
        "column": true,
        "filter": true,
        "group": true,
        "aggregate": true
      },
      "operation": "UPSERT"
    }
  }
}
```


8. Check `Enable Table Filtering for Page Variants` quick action is disabled 
9. Click `Change Table Columns` button in the Quick Actions Panel
10. Check tab(s) `Filter` exist in the `View Settings` dialog
11. Click on `Cancel` button of the dialog `View Settings`

---

