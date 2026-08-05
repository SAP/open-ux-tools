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
// IMPORTANT: The first argument is the visible column header label (as shown in the UI),
// NOT the OData property name. Check the column header text from iCheckColumns or the annotation.
// Object form uses { name: "<key>" } where key is the selectedKey of the sort dialog ComboBox item.
When.onTheListReport.onTable().iChangeSortOrder("Product Name");                // ascending (default)
When.onTheListReport.onTable().iChangeSortOrder("Product Name", "Ascending");   // ascending
When.onTheListReport.onTable().iChangeSortOrder("Product Name", "Descending");  // descending
When.onTheListReport.onTable().iChangeSortOrder("Product Name", "None");        // remove sorting

// Add / remove a column via the table settings (Columns tab of the p13n dialog)
// First arg is the visible column header label, or { name: "<ODataPropertyName>" } for stability.
// The dialog is opened and confirmed automatically — no separate open/confirm call needed.
When.onTheListReport.onTable().iAddAdaptationColumn("Booking Confirmed");
When.onTheListReport.onTable().iRemoveAdaptationColumn("Booking Confirmed");

// Filter via the table settings (Filter tab of the p13n dialog)
// First arg is { name: "<ODataPropertyName>" } — use the exact OData property name from metadata.xml.
// The dialog is opened and confirmed automatically — no separate open/confirm call needed.
When.onTheListReport.onTable().iChangeFilterField({ name: "AgencyID" }, "70004");
When.onTheListReport.onTable().iChangeFilterField({ name: "AgencyID" }, "70004", true);  // bClearFirst: true

// Group by column — first arg is the visible column header label (same rule as iChangeSortOrder)
When.onTheListReport.onTable().iGroupByColumn("Product Name");
// Assert grouping is active for a column
Then.onTheListReport.onTable().iCheckGroupByColumn("Product Name");

// Create / delete via table toolbar
When.onTheListReport.onTable().iExecuteCreate();
When.onTheListReport.onTable().iExecuteDelete();

// Execute a custom action from the table toolbar (use iExecuteAction, NOT iPressAction)
When.onTheListReport.onTable().iExecuteAction("Deduct Discount");
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

**Anti-pattern — `iCheckField` with only `{ value }` on a text-annotated field always times out:**

Any field annotated with a text association in the metadata is rendered as a combined display string. Passing only `{ value: "99" }` will always time out — no control matches the partial object.

```javascript
// ❌ Wrong — times out for any field with a text annotation
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "CustomerID" }, { value: "99" });
```

Pass an object matching the `TextArrangement` of the field. Find the description by grepping the value help mock data file for the known ID.

**TextFirst / TextLast** (RAP default is TextFirst) — renders "Description (ID)" or "ID (Description)":
```javascript
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "CustomerID" }, { value: "99", description: "John Doe" });
```

**TextOnly** (CAP default) — renders description only:
```javascript
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "CustomerID" }, { description: "John Doe" });
```

To detect whether a field needs `{ value, description }`: check `metadata.xml` for a text annotation on the property target. Both backends use the same OData vocabulary terms — only the namespace alias differs:

| Backend | Annotation alias in metadata.xml | Fully qualified term |
|---|---|---|
| RAP | `SAP__common.Text` / `SAP__UI.TextArrangement` | `com.sap.vocabularies.Common.v1.Text` / `com.sap.vocabularies.UI.v1.TextArrangement` |
| CAP | `Common.Text` / `UI.TextArrangement` | same |

Grep for either alias form — or use the fully qualified term to catch both:

```bash
grep -A5 'Target=".*<PropertyName>"' metadata.xml
```

Replace `<PropertyName>` with the actual OData property name (e.g. `CustomerID`). This prints the `Annotations` element targeting that property plus the 5 lines after it, where the `Common.Text` or `TextArrangement` annotation will appear if present.

**Standard form edit/check workflow:**

```javascript
When.onTheObjectPage.onHeader().iExecuteEdit();
Then.onTheObjectPage.iSeeObjectPageInEditMode();

// Change a field in a section
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iChangeField({ property: "ProductName" }, "Updated Name");

// Assert a plain field value (no Common.Text / SAP__common.Text annotation)
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "ProductName" }, "Updated Name");

// Assert a text-annotated field (Common.Text / SAP__common.Text annotation present)
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "CustomerID" }, { value: "99", description: "John Doe" });

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
// ONLY works when the dialog uses sap.fe.Field building blocks (e.g. action parameter dialogs)
When.onTheObjectPage.onDialog()
    .iChangeDialogField({property: "Reason"}, "Test reason");

// Change a field and confirm in one chain
When.onTheObjectPage.onDialog()
    .iChangeDialogField({property: "RejectionReason"}, "Not applicable")
    .and.iConfirm();
```

> **`iChangeDialogField` cannot be used for the mass Edit action dialog.** It only works for dialogs that use `sap.fe.Field` building blocks (e.g. standard action parameter dialogs). The mass Edit dialog is NOT such a dialog.

### Mass Edit dialog

Use `onMassEditDialog()` instead of `onDialog()`, and `iChangeField` instead of `iChangeDialogField`.

To set a new value for a field, two steps are required:
1. Select `< Enter New Value >` from the dropdown for that field.
2. Set the actual value (as `rawText` for a plain input, or open value help for a VH-backed field).

```javascript
// Step 1: select "Enter New Value" from the field's dropdown
When.onTheTravelObjectPage.onMassEditDialog()
    .iChangeField({ property: "CustomerID" }, { dropDownText: "< Enter New Value >" });

// Step 2: type the value directly (for plain input fields)
When.onTheTravelObjectPage.onMassEditDialog()
    .iChangeField({ property: "CustomerID" }, { rawText: "45" });

// Confirm the mass edit dialog
When.onTheTravelObjectPage.onMassEditDialog().iConfirm();
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

Open value help from a form field or filter bar field.

**Form field**: pass the label as it appears on the form field in the UI.
This comes from the `Label` value in the `@UI.FieldGroup` / `@UI.Identification` annotation for that field, NOT from the `Common.Label` annotation on the OData property - those two often differ.
For example, `CustomerID` may have `Common.Label "Customer ID"` but the form field is labelled `"Customer"` - use `"Customer"`, not `"Customer ID"` and not `"CustomerID"`.
When in doubt, check the `@UI.FieldGroup` or `@UI.Identification` annotation, or inspect the rendered form.

```javascript
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iOpenValueHelp("Category");
```

**Filter bar field**: pass `{ property: "<ODataPropertyName>" }`.

```javascript
When.onTheListReport.onFilterBar()
    .iOpenValueHelp({ property: "CustomerID" });
```

Search via the generic search field. The search field is only available when the value help entity set is annotated as searchable in `metadata.xml`. Depending on the backend:
- **CAP**: `Capabilities.SearchRestrictions` with `Searchable: true` (opt-in via `@cds.search` on the entity in CDS)
- **RAP**: `SAP__capabilities.SearchRestrictions` with `Searchable: true`

Generic search may return many results - prefer filtering by a specific field (see below) for a precise result set.

```javascript
When.onTheObjectPage.onValueHelpDialog()
    .iChangeSearchField("Elec")
    .and.iExecuteSearch();
```

Filter by a specific field. Two cases depending on the value help dialog layout. **Determine the case before writing the test** by grepping `metadata.xml` for `SearchRestrictions` on the value help target entity (found via the `NavigationProperty` path, e.g. `_Customer` → `Passenger` entity set):

- `Searchable: true` present → **Case A**
- Absent or `Searchable: false` → **Case B**

> Backend defaults: **RAP** — Case A is the default, standard VH entities expose `SAP__capabilities.SearchRestrictions` with `Searchable: true`. **CAP** — search is opt-in via `@cds.search` on the entity; without it, CAP emits `Capabilities.SearchRestrictions` with `Searchable: false`, making Case B the default. When in doubt, always check the metadata rather than assuming.

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

Select a row by index or by field value.

**Prefer index-based selection** (`iSelectRows(0)`) — it is always reliable regardless of result table columns. Use field-based selection only when the test must select a specific record and cannot rely on position (e.g. unsorted results with multiple pages).

Field-based selection only works if the column exists in the value help dialog result table AND the column name key matches exactly (case-sensitive OData property name):

```javascript
// Preferred: select by index — works regardless of column layout
When.onTheObjectPage.onValueHelpDialog()
    .iSelectRows(0);

// Alternative: select by field value — only when a specific record must be targeted
When.onTheObjectPage.onValueHelpDialog()
    .iSelectRows({CategoryId: "CAT001"});
```

Confirm selection and assert the field was updated.

**Single-select value help dialog** (most form fields): selecting a row closes the dialog immediately — do NOT call `iConfirm()` afterwards, it will time out because the dialog is already gone:

```javascript
When.onTheObjectPage.onValueHelpDialog().iSelectRows(0);
// dialog closes automatically — no iConfirm() needed

Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "Category" }, "Electronics");
```

**Multi-select value help dialog** (e.g. filter bar fields): selecting rows does not close the dialog — call `iConfirm()` explicitly:

```javascript
When.onTheObjectPage.onValueHelpDialog().iSelectRows(0);
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

## Sub-Object Page (two-level navigation)

When an app has a sub-object page, a separate page object is needed for each level. The setup is the same as for a top-level Object Page (see `references/v4-instructions.md` and `references/v4-journeyrunner.md`) with one difference: the `contextPath` or `entitySet` in the page object constructor comes from the sub-object page's manifest target — always read it from `manifest.json`, never guess.

- `contextPath`: `/<ParentEntitySet>/<NavigationProperty>` — used when the manifest target has `contextPath` in its settings
- `entitySet`: `<SubEntitySet>` (no leading slash) — used when the manifest target has `entitySet` instead

**Journey** - navigate through all levels explicitly, asserting each page is reached:

```javascript
Given.iStartMyApp();
Then.onThe<Entity>List.iSeeThisPage();

When.onThe<Entity>List.onTable().iPressRow(0);
Then.onThe<Entity>ObjectPage.iSeeThisPage();

// <SectionId>   = section ID from @UI.Facets annotation
// <NavProperty> = OData navigation property name from metadata.xml
When.onThe<Entity>ObjectPage.iGoToSection({ section: "<SectionId>" });
When.onThe<Entity>ObjectPage.onTable({ property: "<NavProperty>" }).iPressRow(0);
Then.onThe<SubEntity>ObjectPage.iSeeThisPage();
```

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
