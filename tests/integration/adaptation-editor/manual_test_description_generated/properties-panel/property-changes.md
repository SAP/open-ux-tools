# Property Changes Test Documentation

## Table of Contents

- [1. UnSaved Change Indicator](#1-unsaved-change-indicator)
- [2. Saved and Unsaved Change Indicator](#2-saved-and-unsaved-change-indicator)
- [3. Delete Changes from Property's Tooltip](#3-delete-changes-from-propertys-tooltip)

<a id="1-unsaved-change-indicator"></a>
## 1. UnSaved Change Indicator

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on `Create` in the `Running Application Preview`
3. Fill `Text` property with  `Create New` in the Properties Panel
4. Click elsewhere to loose focus from the input in Properties Panel
5. Check `empty circle` (UnSaved) indicator is visible for the property `text` in the Properties Panel
6. Hover property `Text` to open tooltip in the Properties Panel
7. Verify tooltip content 
```json
{
  "title": "Text",
  "Property name": "text",
  "Property type": "string",
  "Default value": "-",
  "Current value": "Create New",
  "infoIconDesc": "This is default value set by SAP UI5 control and it may be different than the one that is used by SAP Fiori Elements. This means that after deleting all the changes for the property it's value may differ from the one displayed here.",
  "description": "Determines the text of the Button."
}
```


8. Find and click on `Create New` node in the Outline Panel
9. Check `Create New` node has `empty circle (UnSaved)` indicator in the Outline Panel

---

<a id="2-saved-and-unsaved-change-indicator"></a>
## 2. Saved and Unsaved Change Indicator

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on `Create` in the `Running Application Preview`
3. Fill `Text` property with  `Create New` in the Properties Panel
4. Click elsewhere to loose focus from the input in Properties Panel
5. Click `Save` button in the toolBar
6. Check `filled circle` (Saved) indicator is visible for the property `text` in the Properties Panel
7. Hover property `Text` to open tooltip in the Properties Panel
8. Verify tooltip content 
```json
{
  "title": "Text",
  "Property name": "text",
  "Property type": "string",
  "Default value": "-",
  "Saved value": "Create New",
  "infoIconDesc": "This is default value set by SAP UI5 control and it may be different than the one that is used by SAP Fiori Elements. This means that after deleting all the changes for the property it's value may differ from the one displayed here.",
  "description": "Determines the text of the Button."
}
```


9. Find and click on `Create New` node in the Outline Panel
10. Check `Create New` node has `filled circle (Saved)` indicator in the Outline Panel
11. Fill `Text` property with  `Create Newest` in the Properties Panel
12. Click elsewhere to loose focus from the input in Properties Panel
13. Check `half-filled circle` (SavedAndUnSaved) indicator is visible for the property `text` in the Properties Panel
14. Find and click on `Create Newest` node in the Outline Panel
15. Check `Create Newest` node has `half-filled circle (SavedAndUnSaved)` indicator in the Outline Panel

---

<a id="3-delete-changes-from-propertys-tooltip"></a>
## 3. Delete Changes from Property's Tooltip

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. Click on `Create` in the `Running Application Preview`
3. Fill `Text` property with  `Create New` in the Properties Panel
4. Click elsewhere to loose focus from the input in Properties Panel
5. Click `Save` button in the toolBar
6. Check saved changes stack contains `1` `Button` change(s)
7. Confirm there are 1 files in the workspace
8. Hover property `Text` to open tooltip in the Properties Panel
9. Click `Delete all changes for this property` button in the ``text` Property tooltip`
10. Click `Delete` button in the `Confirm property change deletion`
11. Confirm there are no files in the workspace

---

