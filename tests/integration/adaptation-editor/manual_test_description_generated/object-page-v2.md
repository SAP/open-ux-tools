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

1. page.goto(http://localhost:3000/adaptation-editor.html?fiori-tools-rta-mode=true#app-preview)
2. Check that UIAdaptation mode is enabled
3. Click on button `Navigation`
4. Click on row `1` of `Root Entities` table 
5. Click on button `UI Adaptation`
6. Click on button `Enable Empty Row Mode for Tables`
7. Click on button `Save and Reload`
8. Check `Save` button is disabled
9. Verify changes:

## Change(s)

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

1. page.goto(http://localhost:3000/adaptation-editor.html?fiori-tools-rta-mode=true#app-preview)
2. Check that UIAdaptation mode is enabled
3. Click on button `Navigation`
4. Click on row `1` of `Root Entities` table 
5. Click on button `UI Adaptation`
6. Click on button `Change Table Actions`
7. Check `SearchField - fiori.elements.v2.0::sap.suite.ui.generic.template.ObjectPage.view.Details::RootEntity--toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection::Table::Toolbar::SearchField, Button - Create, Button - Delete` exist in the `Rearrange Toolbar Content` dialog
8. Hover over row `1` and click on Move down button in the row of `Rearrange Toolbar Content` table
9. Check `Button - Create, SearchField - fiori.elements.v2.0::sap.suite.ui.generic.template.ObjectPage.view.Details::RootEntity--toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection::Table::Toolbar::SearchField, Button - Delete` exist in the `Rearrange Toolbar Content` dialog
10. Click on `OK` button of the dialog `Rearrange Toolbar Content`
11. Click on button `Save`
12. Check saved changes stack contains `1` `Toolbar Content Move Change` change(s)

---

<a id="3-add-controller-to-page"></a>
## 3. Add controller to page

### Steps

1. page.goto(http://localhost:3000/adaptation-editor.html?fiori-tools-rta-mode=true#app-preview)
2. Check that UIAdaptation mode is enabled
3. Click on button `Navigation`
4. Click on button `UI Adaptation`
5. Click on button `Add Controller to Page`
6. Fill `Controller Name` field with `TestController` in dialog `Extend With Controller`
7. Click on `Create` button in dialog `Extend With Controller`
8. Click on button `Save`
9. Verify changes:

## Coding

### TestController.js
```js
/ControllerExtension\.extend\("adp\.fiori\.elements\.v2\.TestController"/
```

## Change(s)

```json
{
  "fileType": "change",
  "changeType": "codeExt",
  "content": {
    "codeRef": "coding/TestController.js"
  }
}
```


10. Click on link `Reload`
11. Click on button `Show Page Controller`
12. Check file name `adp.fiori.elements.v2/changes/coding/TestController.js` is visible in dialog
13. Check `Open in VS Code` button visible in dialog.

---

<a id="4-add-custom-table-action"></a>
## 4. Add Custom Table Action

### Steps

1. page.goto(http://localhost:3000/adaptation-editor.html?fiori-tools-rta-mode=true#app-preview)
2. Check that UIAdaptation mode is enabled
3. Click on button `Navigation`
4. Click on button `UI Adaptation`
5. Click on button `Add Custom Table Action`
6. Fill `Fragment Name` field with `op-table-action` in dialog `Add Custom Table Action`
7. Click on `Create` button in dialog `Add Custom Table Action`
8. Click on button `Save and Reload`
9. Check `Save` button is disabled
10. Verify changes:

## Fragments

### op-table-action.fragment.xml
```xml
<!-- Use stable and unique IDs!-->
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
    <Button text="New Button"  id="btn-[a-z0-9]+"></Button>
</core:FragmentDefinition>
```

## Change(s)

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

1. page.goto(http://localhost:3000/adaptation-editor.html?fiori-tools-rta-mode=true#app-preview)
2. Check that UIAdaptation mode is enabled
3. Click on button `Navigation`
4. Click on row `1` of `Root Entities` table 
5. Click on button `UI Adaptation`
6. Click on button `Change Table Columns`
7. Check `String Property, Date Property` exist in the `View Settings` dialog

---

<a id="6-add-custom-table-column"></a>
## 6. Add Custom Table Column

### Steps

1. page.goto(http://localhost:3000/adaptation-editor.html?fiori-tools-rta-mode=true#app-preview)
2. Check that UIAdaptation mode is enabled
3. Click on button `Navigation`
4. Click on row `1` of `Root Entities` table 
5. Click on button `UI Adaptation`
6. Click on button `Add Custom Table Column`
7. Fill `Column Fragment Name` field with `table-column` in dialog `Add Custom Table Column`
8. Fill `Cell Fragment Name` field with `table-cell` in dialog `Add Custom Table Column`
9. Click on `Create` button in dialog `Add Custom Table Column`
10. Click on button `Save and Reload`
11. Check `Save` button is disabled
12. Verify changes:

## Fragments

### table-cell.fragment.xml
```xml
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
    <Text id="cell-text-[a-z0-9]+" text="Sample data" />
</core:FragmentDefinition>
```

### table-column.fragment.xml
```xml
<!-- Use stable and unique IDs!-->
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
     <Column id="column-[a-z0-9]+"
        width="12em"
        hAlign="Left"
        vAlign="Middle">
        <Text id="column-title-[a-z0-9]+" text="New column" />

        <customData>
            <core:CustomData key="p13nData" id="custom-data-[a-z0-9]+"
                value='\\{"columnKey": "column-[a-z0-9]+", "columnIndex": "3"}' />
        </customData>
    </Column>
</core:FragmentDefinition>
```

## Change(s)

### Change 1
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

### Change 2
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

1. page.goto(http://localhost:3000/adaptation-editor.html?fiori-tools-rta-mode=true#app-preview)
2. Check that UIAdaptation mode is enabled
3. Click on button `Navigation`
4. Click on row `1` of `Root Entities` table 
5. Click on button `UI Adaptation`
6. Click on button `Add Header Field`
7. Fill `Fragment Name` field with `op-header-field` in dialog `Add Header Field`
8. Click on `Create` button in dialog `Add Header Field`
9. Click on button `Save and Reload`
10. Check `Save` button is disabled
11. Verify changes:

## Fragments

### op-header-field.fragment.xml
```xml
<!-- Use stable and unique IDs!-->
<core:FragmentDefinition
    xmlns:uxap="sap.uxap"
    xmlns:core='sap.ui.core'
    xmlns='sap.m'
>
     <VBox id="vBox-[a-z0-9]+">
         <Label id="label-[a-z0-9]+" text="New Field"></Label>
    </VBox>
</core:FragmentDefinition>
```

## Change(s)

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

1. page.goto(http://localhost:3000/adaptation-editor.html?fiori-tools-rta-mode=true#app-preview)
2. Check that UIAdaptation mode is enabled
3. Click on button `Navigation`
4. Click on row `1` of `Root Entities` table 
5. Click on button `UI Adaptation`
6. Click on button `Add Custom Section`
7. Fill `Fragment Name` field with `op-section` in dialog `Add Custom Section`
8. Click on `Create` button in dialog `Add Custom Section`
9. Click on button `Save and Reload`
10. Check `Save` button is disabled
11. Verify changes:

## Fragments

### op-section.fragment.xml
```xml
<!-- Use stable and unique IDs!-->
<core:FragmentDefinition
    xmlns:uxap="sap.uxap"
    xmlns:core='sap.ui.core'
    xmlns='sap.m'
>
    <uxap:ObjectPageSection
        id="op-section-[a-z0-9]+"
        title="New Custom Section"
    >
        <uxap:ObjectPageSubSection id="op-subsection-[a-z0-9]+">
            <HBox id="hbox-[a-z0-9]+">
                <!--  add your xml here -->
            </HBox>
        </uxap:ObjectPageSubSection>
    </uxap:ObjectPageSection>
</core:FragmentDefinition>
```

## Change(s)

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

