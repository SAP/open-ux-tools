# List Report V2a Test Documentation

## Table of Contents

- [1. Enable/Disable Semantic Date Range in Filter Bar](#1-enabledisable-semantic-date-range-in-filter-bar)

<a id="1-enabledisable-semantic-date-range-in-filter-bar"></a>
## 1. Enable/Disable Semantic Date Range in Filter Bar

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
11. Check that the calendar popover is displayed
12. Click `UI Adaptation` button in the toolBar
13. Click `Enable Semantic Date Range in Filter Bar` button in the Quick Actions Panel
14. Click `Save and Reload` button in the toolBar
15. Verify changes:

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

