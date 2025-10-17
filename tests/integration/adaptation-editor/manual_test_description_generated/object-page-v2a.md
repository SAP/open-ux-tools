# Object Page V2a Test Documentation

## Table of Contents

- [1. Enable Variant Management in Tables](#1-enable-variant-management-in-tables)

<a id="1-enable-variant-management-in-tables"></a>
## 1. Enable Variant Management in Tables

### Steps

1. Check that UIAdaptation mode is enabled
2. Click on button `Navigation`
3. Click on `Go` button.
4. Click on row `1` of `Root Entities` table 
5. Click on button `UI Adaptation`
6. Click on button `Enable Variant Management in Tables`
7. Click on button `Save and Reload`
8. Check `Save` button is disabled
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

