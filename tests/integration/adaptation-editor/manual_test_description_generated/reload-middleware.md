# Reload Middleware Test Documentation

## Table of Contents

- [1. Manually change flex change file - SAVED CHANGES](#1-manually-change-flex-change-file---saved-changes)
- [2. Manually change flex change file - UNSAVED CHANGES](#2-manually-change-flex-change-file---unsaved-changes)
- [3. External deletion of the local flex change file](#3-external-deletion-of-the-local-flex-change-file)
- [4. UI change deletion - DELETE SAVED CHANGE](#4-ui-change-deletion---delete-saved-change)

<a id="1-manually-change-flex-change-file---saved-changes"></a>
## 1. Manually change flex change file - SAVED CHANGES

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Create change flex file `id_create_propertyChange.change` in the changes folder with content 
```json
{
  "changeType": "propertyChange",
  "reference": "adp.fiori.elements.v2",
  "namespace": "apps/adp.fiori.elements.v2/changes/",
  "creation": "2025-11-04T07:53:54.822Z",
  "projectId": "adp.fiori.elements.v2",
  "packageName": "$TMP",
  "support": {
    "generator": "@sap-ux/control-property-editor",
    "sapui5Version": "1.141.1",
    "command": "property"
  },
  "originalLanguage": "EN",
  "layer": "CUSTOMER_BASE",
  "fileType": "change",
  "fileName": "id_create_propertyChange.change",
  "content": {
    "property": "text",
    "newValue": "Create New"
  },
  "texts": {},
  "selector": {
    "id": "fiori.elements.v2.0::sap.suite.ui.generic.template.ListReport.view.ListReport::RootEntity--addEntry",
    "type": "sap.m.Button",
    "idIsLocal": false
  },
  "dependentSelector": {},
  "jsOnly": false
}
          
```


3. Check `Changes Detected` text is visible in the Changes Panel
4. Click `Reload` link in the Changes Panel
5. Check app rendered in the preview iframe `Running Application Preview`
6. Check `Text->Create New` text is visible in the Changes Panel

---

<a id="2-manually-change-flex-change-file---unsaved-changes"></a>
## 2. Manually change flex change file - UNSAVED CHANGES

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on `Create` in the `Running Application Preview`
3. Fill `Text` property with  `Update` in the Properties Panel
4. Create change flex file `id_create_propertyChange.change` in the changes folder with content 
```json
{
  "changeType": "propertyChange",
  "reference": "adp.fiori.elements.v2",
  "namespace": "apps/adp.fiori.elements.v2/changes/",
  "creation": "2025-11-04T07:53:54.822Z",
  "projectId": "adp.fiori.elements.v2",
  "packageName": "$TMP",
  "support": {
    "generator": "@sap-ux/control-property-editor",
    "sapui5Version": "1.141.1",
    "command": "property"
  },
  "originalLanguage": "EN",
  "layer": "CUSTOMER_BASE",
  "fileType": "change",
  "fileName": "id_create_propertyChange.change",
  "content": {
    "property": "text",
    "newValue": "Create New"
  },
  "texts": {},
  "selector": {
    "id": "fiori.elements.v2.0::sap.suite.ui.generic.template.ListReport.view.ListReport::RootEntity--addEntry",
    "type": "sap.m.Button",
    "idIsLocal": false
  },
  "dependentSelector": {},
  "jsOnly": false
}
          
```


5. Check `Changes Detected` text is visible in the Changes Panel
6. Click `Reload` link in the Changes Panel
7. Check app rendered in the preview iframe `Running Application Preview`
8. Check `Text->Update` text is visible in the Changes Panel
9. Check control's label is `Update` in the `Running Application Preview`

---

<a id="3-external-deletion-of-the-local-flex-change-file"></a>
## 3. External deletion of the local flex change file

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Create change flex file `id_create_propertyChange.change` in the changes folder with content 
```json
{
  "changeType": "propertyChange",
  "reference": "adp.fiori.elements.v2",
  "namespace": "apps/adp.fiori.elements.v2/changes/",
  "creation": "2025-11-04T07:53:54.822Z",
  "projectId": "adp.fiori.elements.v2",
  "packageName": "$TMP",
  "support": {
    "generator": "@sap-ux/control-property-editor",
    "sapui5Version": "1.141.1",
    "command": "property"
  },
  "originalLanguage": "EN",
  "layer": "CUSTOMER_BASE",
  "fileType": "change",
  "fileName": "id_create_propertyChange.change",
  "content": {
    "property": "text",
    "newValue": "Create New"
  },
  "texts": {},
  "selector": {
    "id": "fiori.elements.v2.0::sap.suite.ui.generic.template.ListReport.view.ListReport::RootEntity--addEntry",
    "type": "sap.m.Button",
    "idIsLocal": false
  },
  "dependentSelector": {},
  "jsOnly": false
}
          
```


3. Check `Changes Detected` text is visible in the Changes Panel
4. Click `Reload` link in the Changes Panel
5. Check app rendered in the preview iframe `Running Application Preview`
6. Check `Text->Create New` text is visible in the Changes Panel
7. Check control's label is `Create New` in the `Running Application Preview`
8. Click `Reload` link in the Changes Panel
9. Check `No historic changes` text is visible in the Changes Panel
10. Check app rendered in the preview iframe `Running Application Preview`
11. Check control's label is `Create` in the `Running Application Preview`

---

<a id="4-ui-change-deletion---delete-saved-change"></a>
## 4. UI change deletion - DELETE SAVED CHANGE

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on `Create` in the `Running Application Preview`
3. Fill `Text` property with  `Manage` in the Properties Panel
4. Click `Save` button in the toolBar
5. Check `SAVED CHANGES` text is visible in the Changes Panel
6. Check `Text->Manage` text is visible in the Changes Panel
7. Click `Delete` button for `Text->Manage` item in the Changes Panel
8. Click `Delete` button in the dialog to confirm change deletion in the Changes Panel
9. Click `Reload` link in the Changes Panel
10. Check `No historic changes` text is visible in the Changes Panel
11. Check app rendered in the preview iframe `Running Application Preview`
12. Check control's label is `Create` in the `Running Application Preview`

---

