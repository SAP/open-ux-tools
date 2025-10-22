# List Report V2 Test Documentation

## Table of Contents

- [1. Enable/Disable clear filter bar button](#1-enabledisable-clear-filter-bar-button)
- [2. Add controller to page](#2-add-controller-to-page)
- [3. Change table columns](#3-change-table-columns)
- [4. Add Custom Table Action](#4-add-custom-table-action)
- [5. Add Custom Table Column](#5-add-custom-table-column)
- [6. Enable/Disable Semantic Date Range in Filter Bar](#6-enabledisable-semantic-date-range-in-filter-bar)
- [7. Enable Variant Management in Tables and Charts](#7-enable-variant-management-in-tables-and-charts)
- [8. Change table actions](#8-change-table-actions)
- [9. Add New Annotation File](#9-add-new-annotation-file)

<a id="1-enabledisable-clear-filter-bar-button"></a>
## 1. Enable/Disable clear filter bar button

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Check `Clear` Button in the List Report filter bar is hidden
3. Click `Enable "Clear" Button in Filter Bar` button in the Quick Actions Panel
4. Check `Clear` Button in the List Report filter bar is visible
5. Click `Save` button in the toolBar
6. Check `Save` button in the toolbar is disabled
7. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "propertyChange",
  "content": {
    "property": "showClearOnFB",
    "newValue": true
  }
}
```


8. Click `Disable "Clear" Button in Filter Bar` button in the Quick Actions Panel
9. Check `Clear` Button in the List Report filter bar is hidden
10. Click `Save` button in the toolBar
11. Check `Save` button in the toolbar is disabled
12. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "propertyChange",
  "content": {
    "property": "showClearOnFB",
    "newValue": false
  }
}
```



---

<a id="2-add-controller-to-page"></a>
## 2. Add controller to page

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Add Controller to Page` button in the Quick Actions Panel
3. Fill `Controller Name` field with `TestController` in the dialog `Extend With Controller`
4. Click on `Create` button in the dialog `Extend With Controller`
5. Click `Save` button in the toolBar
6. Verify changes:

**Coding**

**TestController.js**
```js
/ControllerExtension\.extend\("adp\.fiori\.elements\.v2\.TestController"/
```

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "codeExt",
  "content": {
    "codeRef": "coding/TestController.js"
  }
}
```


7. Click `Reload` link in the Changes Panel
8. Click `Show Page Controller` button in the Quick Actions Panel
9. Check filename `adp.fiori.elements.v2/changes/coding/TestController.js` is visible
10. Check `Open in VS Code` button is visible

---

<a id="3-change-table-columns"></a>
## 3. Change table columns

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Change Table Columns` button in the Quick Actions Panel
3. Check `String Property, Boolean Property, Currency` exist in the `View Settings` dialog

---

<a id="4-add-custom-table-action"></a>
## 4. Add Custom Table Action

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Add Custom Table Action` button in the Quick Actions Panel
3. Fill `Fragment Name` field with `table-action` in the dialog `Add Custom Table Action`
4. Click on `Create` button in the dialog `Add Custom Table Action`
5. Click `Save and Reload` button in the toolBar
6. Check `Save` button in the toolbar is disabled
7. Verify changes:

**Fragment(s)**

**table-action.fragment.xml**
```xml
<!-- Use stable and unique IDs!-->
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
    <Button text="New Button"  id="btn-<UNIQUE_ID>"></Button>
</core:FragmentDefinition>

```

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "addXML",
  "content": {
    "targetAggregation": "content",
    "fragmentPath": "fragments/table-action.fragment.xml"
  }
}
```



---

<a id="5-add-custom-table-column"></a>
## 5. Add Custom Table Column

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click `UI Adaptation` button in the toolBar
5. Click `Add Custom Table Column` button in the Quick Actions Panel
6. Fill `Column Fragment Name` field with `table-column` in the dialog `Add Custom Table Column`
7. Fill `Cell Fragment Name` field with `table-cell` in the dialog `Add Custom Table Column`
8. Click on `Create` button in the dialog `Add Custom Table Column`
9. Click `Save and Reload` button in the toolBar
10. Check `Save` button in the toolbar is disabled
11. Verify changes:

**Fragment(s)**

**table-cell.fragment.xml**
```xml
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
    <Text id="cell-text-<UNIQUE_ID>" text="Sample data" />
</core:FragmentDefinition>
```

**table-column.fragment.xml**
```xml
<!-- Use stable and unique IDs!-->
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
     <Column id="column-<UNIQUE_ID>"
        width="12em"
        hAlign="Left"
        vAlign="Middle">
        <Text id="column-title-<UNIQUE_ID>" text="New column" />

        <customData>
            <core:CustomData key="p13nData" id="custom-data-<UNIQUE_ID>"
                value='\\{"columnKey": "column-<UNIQUE_ID>", "columnIndex": "3"}' />
        </customData>
    </Column>
</core:FragmentDefinition>
```

**Change(s)**

**Change** 1
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

**Change** 2
```json
{
  "fileType": "change",
  "changeType": "addXML",
  "content": {
    "boundAggregation": "items",
    "targetAggregation": "cells",
    "fragmentPath": "fragments/table-cell.fragment.xml"
  }
}
```


12. Click `Navigation` button in the toolBar
13. Click on `Go` button.
14. Check Column Name is `New Column`
15. Check Column Data is `Sample data`

---

<a id="6-enabledisable-semantic-date-range-in-filter-bar"></a>
## 6. Enable/Disable Semantic Date Range in Filter Bar

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on value help button of `Date Property` filter
4. Check semantic date `Yesterday` visible in filter
5. Click `UI Adaptation` button in the toolBar
6. Click `Disable Semantic Date Range in Filter Bar` button in the Quick Actions Panel
7. Click `Save and Reload` button in the toolBar
8. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_ui_generic_app_changePageConfiguration",
  "content": {
    "entityPropertyChange": {
      "propertyPath": "component/settings/filterSettings/dateSettings",
      "propertyValue": {
        "useDateRange": false
      }
    }
  }
}
```


9. Click `Navigation` button in the toolBar
10. Click on value help button of `Date Property` filter
11. Click `UI Adaptation` button in the toolBar
12. Click `Enable Semantic Date Range in Filter Bar` button in the Quick Actions Panel
13. Click `Save and Reload` button in the toolBar
14. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_ui_generic_app_changePageConfiguration",
  "content": {
    "entityPropertyChange": {
      "propertyPath": "component/settings/filterSettings/dateSettings",
      "propertyValue": {
        "useDateRange": true
      }
    }
  }
}
```



---

<a id="7-enable-variant-management-in-tables-and-charts"></a>
## 7. Enable Variant Management in Tables and Charts

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Enable Variant Management in Tables and Charts` button in the Quick Actions Panel
3. Click `Save and Reload` button in the toolBar
4. Check `Save` button in the toolbar is disabled
5. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_ui_generic_app_changePageConfiguration",
  "content": {
    "parentPage": {
      "component": "sap.suite.ui.generic.template.ListReport"
    },
    "entityPropertyChange": {
      "propertyPath": "component/settings",
      "propertyValue": {
        "smartVariantManagement": false
      }
    }
  }
}
```



---

<a id="8-change-table-actions"></a>
## 8. Change table actions

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Change Table Actions` button in the Quick Actions Panel
3. Check `Button - Create, Button - Delete, Button - Add Card to Insights` exist in the `Rearrange Toolbar Content` dialog
4. Hover over row `2` and click on `Move up` button in the row of `Rearrange Toolbar Content` table
5. Check `Button - Delete, Button - Create, Button - Add Card to Insights` exist in the `Rearrange Toolbar Content` dialog
6. Click on `OK` button of the dialog `Rearrange Toolbar Content`
7. Click `Save` button in the toolBar
8. Check `Save` button in the toolbar is disabled
9. Check saved changes stack contains `1` `Toolbar Content Move Change` change(s)

---

<a id="9-add-new-annotation-file"></a>
## 9. Add New Annotation File

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `UI Adaptation` button in the toolBar
3. Click `Add Local Annotation File` button in the Quick Actions Panel
4. Click `Save and Reload` button in the toolBar
5. Check `Save` button in the toolbar is disabled
6. Verify changes:

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


7. Click `Show Local Annotation File` button in the Quick Actions Panel
8. Check filename `adp.fiori.elements.v2/changes/annotations/annotation_<UNIQUE_ID>.xml` is visible in the dialog
9. Check button `Show File in VSCode` is visible in the dialog

---

