# Change Summary Test Documentation

## Table of Contents

- [1. Summary view](#1-summary-view)
- [2. Change button text - UNSAVED CHANGES](#2-change-button-text---unsaved-changes)
- [3. Undo and Redo UNSAVED CHANGES](#3-undo-and-redo-unsaved-changes)
- [4. Save changes](#4-save-changes)
- [5. Delete Saved changes](#5-delete-saved-changes)
- [6. Sticky Filter Bar](#6-sticky-filter-bar)

<a id="1-summary-view"></a>
## 1. Summary view

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. `Click` on `Create` in the `Running Application Preview`
3. Check `No historic changes` text is visible in the Changes Panel
4. Check `This application was not modified yet` text is visible in the Changes Panel
5. Check `HistoryClock` icon is visible in the Changes Panel

---

<a id="2-change-button-text---unsaved-changes"></a>
## 2. Change button text - UNSAVED CHANGES

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. `Click` on `Create` in the `Running Application Preview`
3. Fill `Text` property with  `Manage` in the Properties Panel
4. Check `UNSAVED CHANGES` text is visible in the Changes Panel
5. Check `Text->Manage` text is visible in the Changes Panel

---

<a id="3-undo-and-redo-unsaved-changes"></a>
## 3. Undo and Redo UNSAVED CHANGES

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. `Click` on `Create` in the `Running Application Preview`
3. Fill `Text` property with  `Manage` in the Properties Panel
4. Click `Undo` button in the toolBar
5. Check `Undo` button in the toolbar is disabled
6. Click `Redo` button in the toolBar
7. Check `Undo` button in the toolbar is enabled

---

<a id="4-save-changes"></a>
## 4. Save changes

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. `Click` on `Create` in the `Running Application Preview`
3. Fill `Text` property with  `Manage` in the Properties Panel
4. Click `Save` button in the toolBar
5. Check `SAVED CHANGES` text is visible in the Changes Panel
6. Check `Text->Manage` text is visible in the Changes Panel

---

<a id="5-delete-saved-changes"></a>
## 5. Delete Saved changes

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. `Click` on `Create` in the `Running Application Preview`
3. Fill `Text` property with  `Manage` in the Properties Panel
4. Click `Save` button in the toolBar
5. Hover item with `Text->Manage` text and check `delete` is visible in the Changes Panel
6. Click `Delete` button for `Text->Manage` item in the Changes Panel
7. Click `Delete` button in the dialog to confirm change deletion in the Changes Panel
8. Verify in the project `webapp --> changes` folder, change file is deleted.

---

<a id="6-sticky-filter-bar"></a>
## 6. Sticky Filter Bar

### Steps

1. Check `UIAdaptation` mode in the toolbar is enabled
2. `Click` on `Create` in the `Running Application Preview`
3. Create multiple changes to enable scrollbar
4. Check `Changes Panel` filter bar is sticky in the Changes Panel

---

