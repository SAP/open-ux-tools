# V4 Standard Patterns by UI Area

Quick-reference example catalogue for the `sap.fe.test` API organized by UI area.
One snippet per pattern - enough to know what exists and how to call it.

For full method signatures and parameter details, read `references/v4-sap-fe-test-api-guide.md`.

---

## App Startup and Page Visibility

```javascript
// Start app and verify page loaded
// iStartMyApp() uses the intent encoded in launchUrl in JourneyRunner.js — see references/v4-journeyrunner.md
Given.iStartMyApp();
Then.onTheListReport.iSeeThisPage();

// Navigate to Object Page and verify
When.onTheListReport.onTable().iPressRow(0);
Then.onTheObjectPage.iSeeThisPage();

// Teardown - always last in a journey
Given.iTearDownMyApp();
```

---

## FilterBar

```javascript
// Set a filter field and execute search
When.onTheListReport.onFilterBar()
    .iChangeFilterField({ property: "CategoryId" }, "CAT001")
    .and.iExecuteSearch();

// Assert a filter field has a specific value
Then.onTheListReport.onFilterBar()
    .iCheckFilterField({ property: "CategoryId" }, "CAT001");

// Set multiple filters
When.onTheListReport.onFilterBar()
    .iChangeFilterField({ property: "Status" }, "Active")
    .and.iChangeFilterField({ property: "CategoryId" }, "Electronics")
    .and.iExecuteSearch();

// Set a filter field value, clearing any existing content first (bClearFirst: true)
// Use when the field already has a value and you want to replace it, not append
When.onTheListReport.onFilterBar()
    .iChangeFilterField({ property: "Status" }, "Active", true)
    .and.iExecuteSearch();

// Set a filter field value without clearing first (appends to existing content)
When.onTheListReport.onFilterBar()
    .iChangeFilterField({ property: "Status" }, "Active")
    .and.iExecuteSearch();

// Clear a filter field completely
When.onTheListReport.onFilterBar()
    .iChangeFilterField({ property: "Status" }, "", true)
    .and.iExecuteSearch();

// Filter adaptation panel
When.onTheListReport.onFilterBar().iOpenFilterAdaptation();
When.onTheListReport.onFilterBar().iConfirmFilterAdaptation();
When.onTheListReport.onFilterBar().iCancelFilterAdaptation();
```

---

## Table

```javascript
// Navigate to Object Page via row click
When.onTheListReport.onTable().iPressRow(0);                          // by index
When.onTheListReport.onTable().iPressRow({ProductID: "HT-1000"});     // by field value

// Assert row count
Then.onTheListReport.onTable().iCheckRows();                          // asserts the table has at least one row
Then.onTheListReport.onTable().iCheckRows(0);                         // asserts the table is empty
Then.onTheListReport.onTable().iCheckRows(5);                         // exact count
Then.onTheListReport.onTable().iCheckRows({Status: "Active"}, 3);     // filtered count

// Row selection (for mass actions)
When.onTheListReport.onTable().iSelectRows({ProductID: "HT-1000"});
When.onTheListReport.onTable().iSelectAllRows();

// Sort by column (second arg: "Ascending" | "Descending" | "None", defaults to "Ascending")
When.onTheListReport.onTable().iChangeSortOrder("ProductName");                // ascending (default)
When.onTheListReport.onTable().iChangeSortOrder("ProductName", "Ascending");   // ascending
When.onTheListReport.onTable().iChangeSortOrder("ProductName", "Descending");  // descending
When.onTheListReport.onTable().iChangeSortOrder("ProductName", "None");        // remove sorting

// Create / delete via table toolbar
When.onTheListReport.onTable().iExecuteCreate();
When.onTheListReport.onTable().iExecuteDelete();
```

---

## Header

```javascript
// Standard Object Page header actions
When.onTheObjectPage.onHeader().iExecuteEdit();
When.onTheObjectPage.onHeader().iExecuteDelete();

// Custom action by label
When.onTheObjectPage.onHeader().iExecuteAction("Approve");

// Assert button state
Then.onTheObjectPage.onHeader().iCheckAction("Approve", {enabled: true});

// Assert header title and description
Then.onTheObjectPage.onHeader().iCheckTitle("HT-1000");
Then.onTheObjectPage.onHeader().iCheckDescription("Notebook Basic 15");

// List Report toolbar action
When.onTheListReport.onHeader().iExecuteAction("Export to Spreadsheet");

// Navigate between records
When.onTheObjectPage.onHeader().iPressNavigateDownButton();
When.onTheObjectPage.onHeader().iPressNavigateUpButton();
```

---

## Form

> **Scope: SAP Fiori Elements-generated forms only.** The `{ property: "..." }` and `{ section: "SectionId" }` identifiers work by matching auto-generated control IDs like `FormElement::DataField::PropertyName` and subsection IDs like `fe::FacetSubSection::SectionId`. These IDs do **not** exist in custom extension sections whose content is a hand-authored fragment (e.g. a `sap.ui.layout.form.Form` containing `macros:Field` building blocks). For those cases see `references/v4-custom-selectors.md`.

The `section` value in `onForm({ section: "..." })` must be the **ID** from the `@UI.Facets` annotation, not the display label.

```javascript
When.onTheObjectPage.onHeader().iExecuteEdit();
Then.onTheObjectPage.iSeeObjectPageInEditMode();

// Change a field in a section
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iChangeField({ property: "ProductName" }, "Updated Name");

// Assert a field value
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "ProductName" }, "Updated Name");

// Open value help from a form field
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iOpenValueHelp("Category");
```

---

## Footer

```javascript
// Save changes
When.onTheObjectPage.onFooter().iExecuteSave();
Then.onTheObjectPage.iSeeObjectPageInDisplayMode();

// Assert draft indicator label
Then.onTheObjectPage.onFooter().iCheckDraftIndicator("Draft Saved");

// Cancel - always handle the discard confirmation dialog
When.onTheObjectPage.onFooter().iExecuteCancel();
When.onTheObjectPage.onDialog().iConfirm();
Then.onTheObjectPage.iSeeObjectPageInDisplayMode();
```

---

## Dialog

```javascript
// Confirm or cancel a dialog
When.onTheObjectPage.onDialog().iConfirm();
When.onTheObjectPage.onDialog().iCancel();

// Change a field inside a dialog
When.onTheObjectPage.onDialog()
    .iChangeDialogField({property: "Reason"}, "Test reason");

// Change a field and confirm in one chain
When.onTheObjectPage.onDialog()
    .iChangeDialogField({property: "RejectionReason"}, "Not applicable")
    .and.iConfirm();
```

---

## Section Navigation

Always pass the section **ID** (from `@UI.Facets` annotation or manifest key) as an object `{ section: "SectionId" }`, not a plain string label.

```javascript
// Navigate to a section — works for ALL sections including custom extension sections
When.onTheObjectPage.iGoToSection({ section: "StockStatus" });

// Assert a section is visible/active
Then.onTheObjectPage.iCheckSection({ section: "StockStatus" });

// Expand / collapse sections
When.onTheObjectPage.iExpandSection({ section: "AdditionalInfo" });
When.onTheObjectPage.iCollapseSection({ section: "AdditionalInfo" });
```

> `iGoToSection` is the correct method for ALL section navigation — including custom extension sections. Do NOT use custom page object methods for this.
> The section ID is the `ID` property value from `@UI.Facets` (e.g. `<PropertyValue Property="ID" String="GeneralInformation"/>`) or the key in `manifest.json` (e.g. `"ExtensionSection2"`). Never use the display label string.

---

## Value Help Dialog

Open value help from a form field or filter bar field:

```javascript
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iOpenValueHelp("Category");

When.onTheListReport.onFilterBar()
    .iOpenValueHelp({ property: "CustomerID" });
```

Search via the generic search field. The search field is only available when the value help entity set is annotated as searchable in `metadata.xml`. Depending on the backend:
- **CAP**: `Search.SearchRestrictions` with `Searchable: true` (from `@Search.searchable: true` in CDS)
- **RAP**: `SAP__capabilities.SearchRestrictions` with `Searchable: true`

Generic search may return many results - prefer filtering by a specific field (see below) for a precise result set.

```javascript
When.onTheObjectPage.onValueHelpDialog()
    .iChangeSearchField("Elec")
    .and.iExecuteSearch();
```

Filter by a specific field. Two cases depending on the value help dialog layout:

- **Case A: value help dialog has a search field** (filters are collapsed by default) - call `iExecuteShowHideFilters` first to expand the filter bar, then set the field:

```javascript
When.onTheObjectPage.onValueHelpDialog()
    .iExecuteShowHideFilters();
When.onTheObjectPage.onValueHelpDialog()
    .iChangeFilterField({ property: "CustomerID" }, "6")
    .and.iExecuteSearch();
```

- **Case B: value help dialog has no search field** (filter bar is always visible) - call `iChangeFilterField` directly:

```javascript
When.onTheObjectPage.onValueHelpDialog()
    .iChangeFilterField({ property: "CustomerID" }, "6")
    .and.iExecuteSearch();
```

Select a row by index (use when field-based selection is unreliable due to column naming) or by field value (only works if the column exists in the value help dialog result table):

```javascript
When.onTheObjectPage.onValueHelpDialog()
    .iSelectRows(0);

When.onTheObjectPage.onValueHelpDialog()
    .iSelectRows({CategoryId: "CAT001"});
```

Confirm selection and assert the field was updated:

```javascript
When.onTheObjectPage.onValueHelpDialog().iConfirm();

Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "Category" }, "Electronics");
```

> Ensure the value help entity has mock data - `iSelectRows` times out if the value help entity set has no records.

---

## Sub-Table on Object Page

```javascript
// Navigate to the section containing the sub-table
When.onTheObjectPage.iGoToSection({ section: "Items" });

// Create a new sub-entity
When.onTheObjectPage.onTable({property: "items"}).iExecuteCreate();

// Navigate into a sub-object
When.onTheObjectPage.onTable({property: "items"}).iPressRow(0);

// Assert sub-table row count
Then.onTheObjectPage.onTable({property: "items"}).iCheckRows(3);
```

> `property` is the OData navigation property name, not the section label.

---

## Chart / Analytical List Page (ALP)

```javascript
// Select / deselect a data point
When.onTheListReport.onChart().iSelectDataPoint({Status: "Active"});
When.onTheListReport.onChart().iDeselectDataPoint({Status: "Active"});

// Assert current chart type
Then.onTheListReport.onChart().iCheckChartType("Bar");
```

---

## Shell and Base Assertions

`onTheShell` is a framework built-in provided by `sap.fe.test` - it does not need to be registered in the `pages` map in `JourneyRunner.js`.

```javascript
// Navigate back via FLP back button
When.onTheShell.iNavigateBack();
```

`iSeeMessageToast` is a base assertion called directly on `Then` with no page or area qualifier - it is not on `onTheShell`:

```javascript
Then.iSeeMessageToast("Object saved.");
```
```
