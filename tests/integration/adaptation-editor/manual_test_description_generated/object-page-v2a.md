# Object Page V2a Test Documentation

## Table of Contents

- [1. Enable Variant Management in Tables](#1-enable-variant-management-in-tables)

<a id="1-enable-variant-management-in-tables"></a>
## 1. Enable Variant Management in Tables

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click `Navigation` button in the toolBar
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click `UI Adaptation` button in the toolBar
6. Click `Enable Variant Management in Tables` button in the Quick Actions Panel
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
      "component": "sap.suite.ui.generic.template.ObjectPage",
      "entitySet": "RootEntity"
    },
    "entityPropertyChange": {
      "propertyPath": "component/settings/sections/toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection/tableSettings",
      "operation": "UPSERT",
      "propertyValue": {
        "variantManagement": true
      }
    }
  }
}
```



---

