# List Report V4 Test Documentation

## Table of Contents

- [1. Enable/Disable clear filter bar button](#1-enabledisable-clear-filter-bar-button)
- [2: Add Custom Table Column LR](#2-add-custom-table-column-lr)
- [3. Add New Annotation File](#3-add-new-annotation-file)
- [4. Enable Variant Management in Tables and Charts](#4-enable-variant-management-in-tables-and-charts)
- [5. Change table actions](#5-change-table-actions)

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
7. Check Column Name is `New Column`
8. Check Column Data is `Sample data`

---

<a id="3-add-new-annotation-file"></a>
## 3. Add New Annotation File

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Add Local Annotation File` button in the Quick Actions Panel
3. Click `Save and Reload` button in the toolBar
4. Wait for selector `Show Local Annotation File` button in the Quick Actions Panel
5. Verify changes:

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


6. Click `Show Local Annotation File` button in the Quick Actions Panel
7. Check filename `adp.fiori.elements.v2/changes/annotations/annotation_<UNIQUE_ID>.xml` is visible in the dialog
8. Check button `Show File in VSCode` is visible in the dialog

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

