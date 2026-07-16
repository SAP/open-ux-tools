# Fiori Elements OData v2 OPA5 Test Library

This library provides ready-made OPA5 page objects for integration-testing Fiori Elements
OData v2 applications. It covers the two core floorplans: **List Report** and **Object Page**.

## Setup

### 1. Configure the test library

In your OPA5 journey or a shared `start.js`, call `Opa5.extendConfig` with the
`fioriElementsTestLibrary` test-lib config **before** loading the page objects:

```javascript
Opa5.extendConfig({
  testLibs: {
    fioriElementsTestLibrary: {
      Common: {
        appId: "my.namespace.app",      // component ID (sap.app.id from manifest)
        entitySet: "MyEntitySet"         // primary entity set of the List Report
      }
    }
  },
  autoWait: true,
  appParams: { "sap-ui-animation": false }
});
```

`appId` and `entitySet` drive all internal ID-prefix construction - getting these right is
the single most important configuration step.

### 2. Load the page object modules

```javascript
sap.ui.define([
  "sap/suite/ui/generic/template/integration/testLibrary/ListReport/pages/ListReport",
  "sap/suite/ui/generic/template/integration/testLibrary/ObjectPage/pages/ObjectPage"
], function() { "use strict"; });
```

Loading these modules registers two global page objects on the OPA5 runtime:
- `onTheGenericListReport` - for List Report interactions
- `onTheGenericObjectPage` - for Object Page interactions

### 3. How IDs are built internally

`ApplicationSettings.getAppParameters()` constructs prefix IDs at runtime:

| Property | Pattern |
|---|---|
| `LRPrefixID` | `<appId>::sap.suite.ui.generic.template.ListReport.view.ListReport::<entitySet>` |
| `OPPrefixID` | `<appId>::sap.suite.ui.generic.template.ObjectPage.view.Details::<entitySet>` |
| `OPNavigation` | `<appId>::sap.suite.ui.generic.template.ObjectPage.view.Details::` |

When a method accepts a short `sId`, append it after `--` to get the full DOM id. The library
does this for you internally.

---

## List Report page object - `onTheGenericListReport`

### Actions

#### Filter bar

| Method | Parameters | Description |
|---|---|---|
| `iExecuteTheSearch()` | - | Press the Go button. Expands collapsed filter bar automatically. |
| `iSetTheFilter(oItem)` | `oItem.Field` (string), `oItem.Value` (string or number) | Set a Smart Filter Bar field. Use `"editStateFilter"` as Field for editing-status filter; values 0-4 for its options. Handles MultiInput tokens, DynamicDateRange, Input, ComboBox. |
| `iSetTheSearchField(sSearchText)` | `sSearchText` (string) | Fill the search field and press Enter. |

#### Navigation

| Method | Parameters | Description |
|---|---|---|
| `iNavigateFromListItemByLineNo(iIndex, sTableId)` | `iIndex` (0-based int), `sTableId` (optional string, part after `--`) | Click a table row by index. Works for `sap.m.Table`, `sap.ui.table.Table`, `sap.ui.table.AnalyticalTable`. |
| `iNavigateFromListItemByFieldValue(oItem)` | `oItem.Field` (string), `oItem.Value` (string) | Click first row matching a field/value pair. Field name as in `$metadata`. |
| `iNavigateBack()` | - | Clicks Shell back button if present, otherwise `window.history.back()`. |
| `iClickTheBackButtonOnFLP()` | - | Click the FLP Shell back button specifically. |
| `iClickOnItemFromTheShellNavigationMenu(sText)` | `sText` (string) | Open Shell navigation menu and click item by title. |

#### Buttons and links

| Method | Parameters | Description |
|---|---|---|
| `iClickTheCreateButton()` | - | Click the standard Create/Add Entry button. |
| `iClickTheButtonWithId(sId)` | `sId` (part after `--`) | Click a button by its short DOM id. |
| `iClickTheButtonWithIcon(sIcon)` | `sIcon` (SAP icon URI) | Click a button by its icon. |
| `iClickTheButtonHavingLabel(sLabelText, iIndex)` | label, optional 0-based index | Click a button by visible label text. |
| `iClickTheButtonOnTheDialog(sText)` | `sText` (string) | Click a dialog button by label. |
| `iClickTheOverflowToolbarButton(sButtonName)` | `sButtonName` (string) | Click an OverflowToolbarButton by text. |
| `iClickTheLink(sText, index)` | `sText` (string), `index` (optional, 1-based) | Click a link by its text; index selects among duplicates. |
| `iClickTheLinkWithId(sId)` | `sId` (part after `--`) | Click a link by its short id. |
| `iClickTheControlWithId(sId)` | `sId` (part after `--`) | Click any control by short id via `firePress()`. |
| `iClickTheControlWhichContainsId(sId)` | partial id string | Click the first control whose full id matches the partial string (regex). |

#### Selection

| Method | Parameters | Description |
|---|---|---|
| `iSelectListItemsByLineNo(aItemIndex, bSelect, sTabKey)` | int array, bool (default true), optional tab key | Select/deselect rows by index array. `sTabKey` needed for multiple-view tabs. |
| `iSelectListItemRange(iFirst, iLast, sTabKey)` | ints, optional tab key | Select a range (Grid/Analytical table only, not responsive). |
| `iSelectAllListItems(sTabKey)` | optional tab key | Select all (Grid/Analytical table only). |
| `iDeselectAllListItems(sTabKey)` | optional tab key | Deselect all (Grid/Analytical table only). |

#### Variant / views / tabs

| Method | Parameters | Description |
|---|---|---|
| `iClickOnIconTabFilter(sKey)` | `sKey` - manifest variant key | Switch tab in Icon Tab Bar (configured via `quickVariantSelectionX.variants`). |
| `iClickOnSegmentedButton(sKey)` | `sKey` - manifest variant key | Switch view via segmented button (`quickVariantSelection.variants`). |
| `iClickOnSmartVariantViewSelection(sSelectionButtonId)` | short id | Open Smart Variant dropdown. |

#### ComboBox / Select helpers

| Method | Parameters | Description |
|---|---|---|
| `iChoosetheItemInComboBox(sItem, sLabel)` | item text, optional label | Select from a ComboBox, optionally matching by label. |
| `iChoosetheItemInSelect(sItem, sLabel)` | item text, optional label | Select from a Select control. |
| `iSelectTheFirstComboBox()` | - | Click the first ComboBox on the page. |
| `iSelectTheItemFromFirstComboBox(sItem)` | `sItem` (string) | Select an item from the already-open first ComboBox. |
| `iClickTheMultiComboBoxArrow(sFieldName)` | field name from `$metadata` | Open a MultiComboBox dropdown by clicking its arrow icon. |
| `iSelectItemsFromMultiComboBox(sFieldName, sItem)` | field name, item text | Check an item inside an open MultiComboBox list. |
| `iClickTheListItemWithLabel(sLabelText, bState)` | label, bool | Check/uncheck a `sap.m.CustomListItem` checkbox. |

#### Misc

| Method | Parameters | Description |
|---|---|---|
| `iLookAtTheScreen()` | - | No-op; returns `this`. Useful for readability. |
| `iSetTheHeaderExpanded(bExpansionValue)` | bool | Expand or collapse the DynamicPage header. |
| `iSetThePropertyInTable(sTableId, sPropertyName, sPropertyValue)` | short table id, property name, value | Set a property on an `sap.m.Table` directly. |
| `iClickTheShowDetailsButtonOnTheTableToolBar(sTabKey)` | optional tab key | Click the Show Details button on the table toolbar. |

---

### Assertions

| Method | Parameters | Description |
|---|---|---|
| `theListReportPageIsVisible()` | - | Assert the DynamicPage is rendered. |
| `theResultListIsVisible()` | - | Assert the SmartTable is visible. |
| `theResultListContainsTheCorrectNumberOfItems(iItems, sTabKey)` | int, optional tab key | Assert row count. Handles all table types (Responsive, Grid, Tree, Analytical). |
| `theResultListFieldHasTheCorrectValue(oItem, sTabKey)` | `oItem.Line` (0-based int), `oItem.Field` (string), `oItem.Value`; optional tab key | Assert a cell value in the list. |
| `theAvailableNumberOfItemsIsCorrect(iItems, tabId)` | int, optional tab id | Assert the count shown in the table header / info toolbar. |
| `iShouldSeeTheExcelButton()` | - | Assert the Excel export button is visible. |
| `iShouldSeeTheButtonWithId(sId)` | short id | Assert a button is visible by id. |
| `iShouldSeeTheControlWithId(sId)` | short id | Assert any control is visible by id. |
| `theButtonWithIdIsEnabled(sId, bEnabled)` | short id, bool (default true) | Assert button enabled state. |
| `theListItemIsSelected(sTableId, iListItemIndex)` | short table id, 0-based index | Assert a row is selected. |
| `iCheckOverlayForTable(sId, bVisible)` | short id, bool | Assert a table overlay is visible or hidden. |
| `theHeaderExpandedPropertyIsCorrectlySet(bExpansionValue)` | bool | Assert DynamicPage header expanded state. |
| `iShouldSeeTheDialogWithTitle(sTitle)` | title string | Assert a dialog is open with the given title. |
| `iShouldSeeTheDialogWithContent(sContent)` | content string | Assert a dialog contains the given message text. |
| `iShouldSeeTheButtonOnTheDialog(sButton)` | label string | Assert a specific button exists on an open dialog. |
| `iShouldSeeTheButtonsOnTheDialog(aButton)` | array of label strings | Assert multiple buttons exist on an open dialog. |
| `iShouldSeeThePopoverWithTitle(sTitle)` | title string | Assert a popover is open with the given title. |

---

## Object Page page object - `onTheGenericObjectPage`

### Actions

#### Edit lifecycle

| Method | Parameters | Description |
|---|---|---|
| `iClickTheEditButton()` | - | Click Edit to enter edit mode. |
| `iSaveTheDraft()` | - | Click Save to persist the draft. |
| `iCancelTheDraft()` | - | Click Cancel to discard the draft. |
| `iSelectTheOptionFromDiscardDraftPopUp(sOption)` | option label string | Select a radio button option from the discard-draft confirmation popup. |

#### Field editing

| Method | Parameters | Description |
|---|---|---|
| `iSetTheObjectPageDataField(sSection, sFieldGroup, sField, sValue)` | section title, field group title, field name, value | Set a SmartField inside a specific FieldGroup. Requires edit mode. |
| `iSetTheInputFieldWithId(sId, sValue)` | short id, value string | Enter text into an editable input field by id. |

#### Navigation

| Method | Parameters | Description |
|---|---|---|
| `iNavigateFromObjectPageTableByLineNo(sTable, iIndex, sEntitySet, sTableID)` | nav property, 0-based index, optional entitySet, optional tableID | Click a row in an OP sub-table by line number. |
| `iNavigateFromObjectPageTableByFieldValue(sTable, oItem, sEntitySet, sTableID)` | nav property, `oItem.Field`/`oItem.Value`, optional entitySet, optional tableID | Click the first matching row in an OP sub-table. |
| `iNavigateFromOPListItemByFieldValue(oItem)` | `oItem.Field`, `oItem.Value` | Navigate from a list item on the OP by field/value. |
| `iNavigateBack()` | - | Shell back button or `window.history.back()`. |
| `iNavigateToRelatedApp(sAppTitle)` | app title string | Click a related app link. |
| `iClickTheLastBreadCrumbLink()` | - | Click the last entry in the breadcrumb trail. |
| `iNavigateUpOrDownUsingObjectPageHeaderActionButton(sDirection)` | `"up"` or `"down"` | Click the previous/next navigation arrows in the OP header. |
| `iCloseTheObjectPage()` | - | Close the Object Page (clicks the close/X button). |

#### Buttons and links

| Method | Parameters | Description |
|---|---|---|
| `iClickTheButtonWithId(sId, sEntitySet)` | short id, optional entitySet | Click a button by short id (optionally scoped to entitySet for sub-OPs). |
| `iClickTheButtonWithIcon(sIcon)` | SAP icon URI | Click a button by icon. |
| `iClickTheButtonHavingLabel(sLabelText, iIndex)` | label, optional 0-based index | Click a button by visible label. |
| `iClickTheButtonOnTheDialog(sText)` | label string | Click a dialog button by label. |
| `iClickTheOverflowToolbarButton(sButtonName)` | button text | Click an OverflowToolbarButton by text. |
| `iClickTheLink(sText, index)` | link text, optional 1-based index | Click a link by text. |
| `iClickTheSmartLinkWithLabel(sLabel)` | label string | Click a `sap.ui.comp.navpopover.SmartLink` by label. |
| `iClickTheControlWithId(sId, sEntitySet)` | short id, optional entitySet | Click any control by short id. |
| `iClickTheBackButtonOnFLP()` | - | Click the FLP Shell back button. |

#### Sections and tables

| Method | Parameters | Description |
|---|---|---|
| `iSelectSectionOrSubSectionByName(sSectionName)` | section title string | Scroll to and select a section/subsection by its i18n title. |
| `iSelectSectionOrSubSectionByIndex(iIndex, sEntitySet)` | 0-based index, optional entitySet | Select section by position. |
| `iClickOnSegmentedButton(sKey)` | manifest variant key | Switch view via segmented button on OP. |
| `iClickTheShowDetailsButtonOnTheTableToolBar(sTableId, sEntitySet)` | short table id, optional entitySet | Click Show Details button on a sub-table toolbar. |
| `iSelectListItemsByLineNo(sTableId, aItemIndex, bSelect, sEntitySet)` | short table id, int array, bool, optional entitySet | Select/deselect rows by index in an OP sub-table. |

#### ComboBox / Select helpers (same as LR equivalents)

`iChoosetheItemInComboBox`, `iChoosetheItemInSelect`, `iSelectTheFirstComboBox`,
`iSelectTheItemFromFirstComboBox`, `iClickTheMultiComboBoxArrow`,
`iSelectItemsFromMultiComboBox`, `iClickTheListItemWithLabel` - same signatures as LR.

#### Misc

| Method | Parameters | Description |
|---|---|---|
| `iLookAtTheScreen()` | - | No-op; returns `this`. |
| `iClickOnItemFromTheShellNavigationMenu(sText)` | item title | Open Shell nav menu and click item. |

---

### Assertions

| Method | Parameters | Description |
|---|---|---|
| `theObjectPageHeaderTitleIsCorrect(sTitle, sEntitySet)` | expected title, optional entitySet (FCL sub-OP) | Assert the OP header title. Works for both Standard and Dynamic header. |
| `theObjectPageIsInEditMode()` | - | Assert `ui>/editable` is true. |
| `theObjectPageIsInDisplayMode()` | - | Assert `ui>/editable` is false. |
| `iShouldSeeTheSections(aSections)` | array of section title strings | Assert sections exist by i18n title. |
| `iCheckTheIndexOfTheSectionIsCorrect(iIndex, sTitle, sEntitySet)` | 0-based index, title, optional entitySet | Assert a section is at a specific position. |
| `iShouldSeeTheDataField(sField, oSettings)` | field name from `$metadata`, optional `{Enabled, Editable, Mandatory}` booleans | Assert a SmartField exists with specific states. Defaults to `{Enabled:true, Editable:true, Mandatory:false}`. |
| `theObjectPageDataFieldHasTheCorrectValue(oItem)` | `oItem.Field`, `oItem.Value` | Assert a field's binding value on the OP. |
| `theObjectPageDataFieldWithStableIdHasTheCorrectValue(oItem)` | `oItem.StableId`, `oItem.Field`, `oItem.Value` | Assert a field with a custom stable ID annotation. |
| `theObjectPageTableFieldHasTheCorrectValue(sTable, oItem, sEntitySet, sTableID)` | nav property, `oItem.Line`/`oItem.Field`/`oItem.Value`, optional entitySet, optional tableID | Assert a cell value in an OP sub-table. |
| `theButtonWithIdIsEnabled(sId, bEnabled)` | short id, bool | Assert button enabled state. |
| `theButtonWithLabelIsEnabled(sLabel, bEnabled)` | label, bool | Assert button enabled state by label. |
| `iShouldSeeTheButtonWithId(sId, sEntitySet)` | short id, optional entitySet | Assert a button is visible. |
| `iShouldSeeTheButtonWithLabel(sLabel)` | label | Assert a button is visible by label. |
| `iShouldSeeTheButtonWithIcon(sIcon)` | icon URI | Assert a button with the given icon is visible. |
| `iShouldNotSeeTheButtonWithIdInToolbar(sToolBarId, sButtonId)` | short toolbar id, short button id | Assert a button is NOT in a toolbar. |
| `iShouldSeeTheControlWithId(sId, sEntitySet)` | short id, optional entitySet | Assert a control is visible. |
| `iShouldNotSeeTheControlWithId(sControlId)` | short id | Assert a control is NOT visible. |
| `iShouldSeeTheMenuItemWithLabel(sLabel)` | label | Assert a MenuItem is visible. |
| `theListItemIsSelected(sTableId, iListItemIndex)` | short table id, 0-based index | Assert a table row is selected. |
| `iShouldSeeTheDialogWithTitle(sTitle)` | title | Assert dialog is open with title. |
| `iShouldSeeTheDialogWithContent(sContent)` | message text | Assert dialog shows specific text. |
| `iShouldSeeTheButtonOnTheDialog(sButton)` | label | Assert button exists on open dialog. |
| `iShouldSeeTheButtonsOnTheDialog(aButton)` | array of labels | Assert multiple buttons on open dialog. |
| `iShouldSeeThePopoverWithTitle(sTitle)` | title | Assert popover is open with title. |
| `iShouldSeeThePopoverWithButtonLabel(sButtonlabel)` | label | Assert popover contains a button with the label. |
| `iShouldSeeTheMessageToastWithText(sExpectedText)` | text | Assert message toast is displayed with the given text. |
| `iCheckSelectedSectionByIdOrName(sSectionText, isSectionId, iNthOP)` | id or name, bool flag, optional 1-based OP index | Assert a specific section is currently selected. |
| `iCheckObjectPageIconTabBarValue(bIconTabBar, sEntitySet)` | bool, optional entitySet | Assert `useIconTabBar` property of ObjectPageLayout. |
| `iExpectFocusSetOnControlById(sId)` | short id | Assert DOM focus is on the given control. |
| `iSeeShellHeaderWithTitle(sTitle)` | title string | Assert the Shell header app title. |
| `iShouldSeeTheSections(aSections)` | array of section titles | Assert all listed sections exist. |

---

## FCL (Flexible Column Layout)

For apps using FCL, pass `sEntitySet` to disambiguate which Object Page you are addressing
when multiple are active simultaneously. The `OPNavigation` prefix is used:
```
<appId>::sap.suite.ui.generic.template.ObjectPage.view.Details::<sEntitySet>--<sId>
```

Also available on both page objects (via Common):
```javascript
// Assert current FCL layout type
onTheGenericObjectPage.theFCLHasLayout("TwoColumnsMidExpanded");
```

---

## Complete example

```javascript
opaTest("Create an item and verify it on the Object Page", function(Given, When, Then) {

  // Arrange
  Given.iStartMyAppInAFrame("index.html?sap-ui-xx-viewCache=false");

  // List Report - search and navigate
  When.onTheGenericListReport
    .iSetTheFilter({ Field: "SoldToParty", Value: "C1" })
    .and.iExecuteTheSearch()
    .and.iNavigateFromListItemByLineNo(0);

  // Object Page - assert and edit
  Then.onTheGenericObjectPage
    .theObjectPageHeaderTitleIsCorrect("My Item Title")
    .and.theObjectPageIsInDisplayMode();

  When.onTheGenericObjectPage
    .iClickTheEditButton()
    .and.iSetTheObjectPageDataField("GeneralSection", "MainGroup", "Description", "Updated")
    .and.iSaveTheDraft();

  Then.onTheGenericObjectPage
    .theObjectPageIsInDisplayMode()
    .and.theObjectPageDataFieldHasTheCorrectValue({ Field: "Description", Value: "Updated" });

  // Teardown
  Given.iTeardownMyApp();
});
```

---

## Common pitfalls

- **Wrong `appId` or `entitySet`**: All IDs are constructed from these. Double-check against
  `manifest.json` `sap.app.id` and the entity set annotation in `pages` config.
- **Short IDs**: Methods that accept `sId` expect only the part **after** the last `--` in the
  DOM id. The library prepends the full prefix internally.
- **Tab keys for multi-view LR**: When your List Report uses `quickVariantSelectionX` (icon
  tabs) or `quickVariantSelection` (segmented button), pass `sTabKey` to selection and count
  assertions so the correct tab's table is addressed.
- **Grid vs Responsive table**: `iSelectListItemRange`, `iSelectAllListItems`, and
  `iDeselectAllListItems` do NOT work with `sap.m.Table` (responsive table) - they assert
  failure for that case. Use `iSelectListItemsByLineNo` for responsive tables.
- **Sub-Object Pages**: When in FCL with multiple active OPs, always pass `sEntitySet` to
  disambiguate which OP you are addressing.
- **Edit mode required**: `iSetTheObjectPageDataField` and `iSetTheInputFieldWithId` require
  the page to already be in edit mode. Call `iClickTheEditButton()` first.
