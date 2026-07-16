# V4 Standard Patterns by UI Area

Quick-reference example catalogue for the `sap.fe.test` API organized by UI area.
One snippet per pattern - enough to know what exists and how to call it.

For full method signatures and parameter details, read `references/sap-fe-test-api-guide.md`.

---

## App Startup and Page Visibility

```javascript
// Start app and verify page loaded
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
    .iChangeFilterField("CategoryId", "CAT001")
    .and.iExecuteSearch();

// Assert a filter field has a specific value
Then.onTheListReport.onFilterBar()
    .iCheckFilterField("CategoryId", "CAT001");

// Set multiple filters
When.onTheListReport.onFilterBar()
    .iChangeFilterField("Status", "Active")
    .and.iChangeFilterField("CategoryId", "Electronics")
    .and.iExecuteSearch();

// Clear a filter field (pass null + true as third argument)
When.onTheListReport.onFilterBar()
    .iChangeFilterField("Status", null, true)
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
Then.onTheListReport.onTable().iCheckRows(5);                         // exact count
Then.onTheListReport.onTable().iCheckRows({Status: "Active"}, 3);     // filtered count

// Assert a specific cell value by row index and column name
Then.onTheListReport.onTable().iCheckCellValue(0, "ProductName", "Laptop");

// Row selection (for mass actions)
When.onTheListReport.onTable().iSelectRows({ProductID: "HT-1000"});
When.onTheListReport.onTable().iSelectAllRows();
When.onTheListReport.onTable().iDeselectAllRows();
Then.onTheListReport.onTable().iCheckSelectedRows(2);

// Sort by column
When.onTheListReport.onTable().iChangeSorting("ProductName");         // toggle
When.onTheListReport.onTable().iChangeSorting("ProductName", true);   // ascending

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

```javascript
// Enter edit mode first
When.onTheObjectPage.onHeader().iExecuteEdit();
Then.onTheObjectPage.iSeeObjectPageInEditMode();

// Change a field in a section (section must match @UI.Facets annotation label exactly)
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iChangeField("ProductName", "Updated Name");

// Assert a field value
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField("ProductName", "Updated Name");

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

// Assert dialog title
Then.onTheObjectPage.onDialog().iCheckDialogTitle("Confirm Deletion");

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

```javascript
// Navigate to a section (title must match @UI.Facets annotation label exactly)
When.onTheObjectPage.iGoToSection("Stock Status");

// Assert a section is visible/active
Then.onTheObjectPage.iCheckSection("Stock Status");

// Expand / collapse sections
When.onTheObjectPage.iExpandSection("Additional Info");
When.onTheObjectPage.iCollapseSection("Additional Info");
```

---

## Value Help Dialog

```javascript
// Open value help from a form field
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iOpenValueHelp("Category");

// Search within the value help dialog
When.onTheObjectPage.onValueHelpDialog()
    .iChangeSearchField("Elec")
    .and.iExecuteSearch();

// Select a row by field value
When.onTheObjectPage.onValueHelpDialog()
    .iSelectRows({CategoryId: "CAT001"});

// Confirm selection
When.onTheObjectPage.onValueHelpDialog().iConfirm();

// Assert the field was updated
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField("Category", "Electronics");
```

> Ensure the value help entity has mock data - `iSelectRows` times out if the VH entity set has no records.

---

## Sub-Table on Object Page

```javascript
// Navigate to the section containing the sub-table
When.onTheObjectPage.iGoToSection("Items");

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

```javascript
// Navigate back via FLP back button
Then.onTheShell.iNavigateBack();

// Assert message toast (called directly on Then, no page qualifier)
Then.iSeeMessageToast("Object saved.");
```
