# Object Page V2 Test Documentation

## Table of Contents

- [1. Object Page: Enable Empty row mode](#1-object-page-enable-empty-row-mode)
- [2. Change table actions](#2-change-table-actions)
- [3. Add controller to page](#3-add-controller-to-page)
- [4. Add Custom Table Action](#4-add-custom-table-action)
- [5. Change table columns](#5-change-table-columns)
- [6. Add Custom Table Column](#6-add-custom-table-column)
- [7. Add Header Field](#7-add-header-field)
- [8. Add Custom Section](#8-add-custom-section)

<a id="1-object-page-enable-empty-row-mode"></a>
## 1. Object Page: Enable Empty row mode

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Click `Enable Empty Row Mode for Tables` button in the Quick Actions Panel
7. Click `Save and Reload` button in the toolBar
8. Check `Save` button in the toolbar is disabled
9. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "appdescr_ui_generic_app_changePageConfiguration",
  "content": {
    "parentPage": {
      "component": "sap.suite.ui.generic.template.ObjectPage"
    },
    "entityPropertyChange": {
      "propertyPath": "component/settings/sections/toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection/createMode",
      "propertyValue": "creationRows"
    }
  }
}
```



---

<a id="2-change-table-actions"></a>
## 2. Change table actions

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Click `Change Table Actions` button in the Quick Actions Panel
7. Check `SearchField - fiori.elements.v2.0::sap.suite.ui.generic.template.ObjectPage.view.Details::RootEntity--toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection::Table::Toolbar::SearchField, Button - Create, Button - Delete` exist in the `Rearrange Toolbar Content` dialog
8. Hover over row `1` and click on Move down button in the row of `Rearrange Toolbar Content` table
9. Check `Button - Create, SearchField - fiori.elements.v2.0::sap.suite.ui.generic.template.ObjectPage.view.Details::RootEntity--toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection::Table::Toolbar::SearchField, Button - Delete` exist in the `Rearrange Toolbar Content` dialog
10. Click on `OK` button of the dialog `Rearrange Toolbar Content`
11. Click `Save` button in the toolBar
12. Check saved changes stack contains `1` `Toolbar Content Move Change` change(s)

---

<a id="3-add-controller-to-page"></a>
## 3. Add controller to page

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click `UI Adaptation` button in the toolBar
5. Click `Add Controller to Page` button in the Quick Actions Panel
6. Fill `Controller Name` field with `TestController` in the dialog `Extend With Controller`
7. Click on `Create` button in the dialog `Extend With Controller`
8. Click `Save` button in the toolBar
9. Verify changes:

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


10. Click `Reload` link in the Changes Panel
11. Click `Show Page Controller` button in the Quick Actions Panel
12. Check file name `adp.fiori.elements.v2/changes/coding/TestController.js` is visible in dialog
13. Check `Open in VS Code` button visible in dialog.

---

<a id="4-add-custom-table-action"></a>
## 4. Add Custom Table Action

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click `UI Adaptation` button in the toolBar
5. Click `Add Custom Table Action` button in the Quick Actions Panel
6. Fill `Fragment Name` field with `op-table-action` in the dialog `Add Custom Table Action`
7. Click on `Create` button in the dialog `Add Custom Table Action`
8. Click `Save and Reload` button in the toolBar
9. Check `Save` button in the toolbar is disabled
10. Verify changes:

**Fragment(s)**

**op-table-action.fragment.xml**
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
    "fragmentPath": "fragments/op-table-action.fragment.xml"
  }
}
```



---

<a id="5-change-table-columns"></a>
## 5. Change table columns

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Click `Change Table Columns` button in the Quick Actions Panel
7. Check `String Property, Date Property` exist in the `View Settings` dialog

---

<a id="6-add-custom-table-column"></a>
## 6. Add Custom Table Column

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Click `Add Custom Table Column` button in the Quick Actions Panel
7. Fill `Column Fragment Name` field with `table-column` in the dialog `Add Custom Table Column`
8. Fill `Cell Fragment Name` field with `table-cell` in the dialog `Add Custom Table Column`
9. Click on `Create` button in the dialog `Add Custom Table Column`
10. Click `Save and Reload` button in the toolBar
11. Check `Save` button in the toolbar is disabled
12. Verify changes:

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


13. Check Column Name is `New Column`
14. Check Column Data is `Sample data`

---

<a id="7-add-header-field"></a>
## 7. Add Header Field

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Click `Add Header Field` button in the Quick Actions Panel
7. Fill `Fragment Name` field with `op-header-field` in the dialog `Add Header Field`
8. Click on `Create` button in the dialog `Add Header Field`
9. Click `Save and Reload` button in the toolBar
10. Check `Save` button in the toolbar is disabled
11. Verify changes:

**Fragment(s)**

**op-header-field.fragment.xml**
```xml
<!-- Use stable and unique IDs!-->
<core:FragmentDefinition
    xmlns:uxap="sap.uxap"
    xmlns:core='sap.ui.core'
    xmlns='sap.m'
>
     <VBox id="vBox-<UNIQUE_ID>">
         <Label id="label-<UNIQUE_ID>" text="New Field"></Label>
    </VBox>
</core:FragmentDefinition>
```

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "addXML",
  "content": {
    "targetAggregation": {},
    "fragmentPath": "fragments/op-header-field.fragment.xml"
  }
}
```



---

<a id="8-add-custom-section"></a>
## 8. Add Custom Section

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Click `Add Custom Section` button in the Quick Actions Panel
7. Fill `Fragment Name` field with `op-section` in the dialog `Add Custom Section`
8. Click on `Create` button in the dialog `Add Custom Section`
9. Click `Save and Reload` button in the toolBar
10. Check `Save` button in the toolbar is disabled
11. Verify changes:

**Fragment(s)**

**op-section.fragment.xml**
```xml
<!-- Use stable and unique IDs!-->
<core:FragmentDefinition
    xmlns:uxap="sap.uxap"
    xmlns:core='sap.ui.core'
    xmlns='sap.m'
>
    <uxap:ObjectPageSection
        id="op-section-<UNIQUE_ID>"
        title="New Custom Section"
    >
        <uxap:ObjectPageSubSection id="op-subsection-<UNIQUE_ID>">
            <HBox id="hbox-<UNIQUE_ID>">
                <!--  add your xml here -->
            </HBox>
        </uxap:ObjectPageSubSection>
    </uxap:ObjectPageSection>
</core:FragmentDefinition>
```

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "addXML",
  "content": {
    "targetAggregation": "sections",
    "fragmentPath": "fragments/op-section.fragment.xml"
  }
}
```



---

