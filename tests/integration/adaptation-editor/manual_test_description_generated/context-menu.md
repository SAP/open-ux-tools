# Context Menu Test Documentation

## Table of Contents

- [1: Trigger Add Fragment at OverflowToolbar node via context menu](#1-trigger-add-fragment-at-overflowtoolbar-node-via-context-menu)
- [2: Rename "Create" button via context menu](#2-rename-create-button-via-context-menu)
- [3: Rename  Object Page Section via context menu](#3-rename-object-page-section-via-context-menu)
- [4: Add Fragment at Section node via context menu](#4-add-fragment-at-section-node-via-context-menu)

<a id="1-trigger-add-fragment-at-overflowtoolbar-node-via-context-menu"></a>
## 1: Trigger Add Fragment at OverflowToolbar node via context menu

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Find and right click on `OverflowToolbar` node in the Outline Panel
3. Click `Add: Fragment` item in the context menu of the Outline Panel
4. Fill `Fragment Name` field with `toolbar-fragment` in the dialog `Add XML Fragment`
5. Click `Save and Reload` button in the toolBar
6. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "addXML",
  "content": {
    "targetAggregation": "content",
    "index": 10,
    "fragmentPath": "fragments/toolbar-fragment.fragment.xml"
  }
}
```



---

<a id="2-rename-create-button-via-context-menu"></a>
## 2: Rename "Create" button via context menu

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Find and right click on `Create` node in the Outline Panel
3. Click `Rename` item in the context menu of the Outline Panel
4. Fill `Selected Label:` field with `Add New` in the dialog `Rename`
5. Click on `Create` button in the dialog `Rename`
6. Click `Save` button in the toolBar
7. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "rename",
  "texts": {
    "newText": {
      "value": "Add New",
      "type": "XBUT"
    }
  },
  "selector": {
    "id": "fiori.elements.v2.0::sap.suite.ui.generic.template.ListReport.view.ListReport::RootEntity--addEntry"
  }
}
```



---

<a id="3-rename-object-page-section-via-context-menu"></a>
## 3: Rename  Object Page Section via context menu

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click `Go` button in the Running Application Preview
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Find and right click on `ObjectPageSubSection` node in the Outline Panel
7. Click `Rename` item in the context menu of the Outline Panel
8. Fill `Selected Label:` field with `Basic information` in the dialog `Rename`
9. Click on `Create` button in the dialog `Rename`
10. Click `Save` button in the toolBar
11. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "rename",
  "texts": {
    "newText": {
      "value": "Basic information",
      "type": "XGRP"
    }
  },
  "selector": {
    "id": "fiori.elements.v2.0::sap.suite.ui.generic.template.ObjectPage.view.Details::RootEntity--com.sap.vocabularies.UI.v1.FieldGroup::GeneralInfo::SubSection"
  }
}
```



---

<a id="4-add-fragment-at-section-node-via-context-menu"></a>
## 4: Add Fragment at Section node via context menu

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click `Go` button in the Running Application Preview
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Find and right click on `ObjectPageLayout` node in the Outline Panel
7. Click `Add: Fragment` item in the context menu of the Outline Panel
8. Fill `Fragment Name` field with `custom-section` in the dialog `Add XML Fragment`
9. Click on `Create` button in the dialog `Add XML Fragment`
10. Click `Save and Reload` button in the toolBar
11. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "addXML",
  "content": {
    "targetAggregation": "sections",
    "index": 3,
    "fragmentPath": "fragments/custom-section.fragment.xml"
  }
}
```



---

