# Support Icons Test Documentation

## Table of Contents

- [1. Change icon property for button control](#1-change-icon-property-for-button-control)

<a id="1-change-icon-property-for-button-control"></a>
## 1. Change icon property for button control

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on `Create` in the `Running Application Preview`
3. Hover `Value Help` icon for `ActiveIcon` property in the Properties Panel
4. Check the `tooltip` is `Select Icon`
5. Click `Value Help` icon for `ActiveIcon` property in the Properties Panel
6. Fill `Filter Icons` input field with `action` in the `Select Icon` dialog
7. Click `cell` with `action-settings` in the `Select Icon` dialog
8. Click `OK` button in the `Select Icon Dialog`
9. Click `Save` button in the toolBar
10. Check `ActiveIcon` property value is `sap-icon://action-settings` in the Properties Panel
11. Verify changes:

**Change(s)**

```json
{
  "fileType": "change",
  "changeType": "propertyChange",
  "content": {
    "property": "activeIcon",
    "newValue": "sap-icon://action-settings"
  }
}
```



---

