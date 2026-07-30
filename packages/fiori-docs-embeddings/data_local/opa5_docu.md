--------------------------------
**TITLE**: OPA5 Integration Tests for SAP Fiori Elements applications

**TAGS**: OPA5, integration-tests, fiori-elements, sap.fe.test, journey, page-objects, V4, V2, testing

# OPA5 Integration Tests for SAP Fiori Elements applications

## Introduction
This documentation covers writing OPA5 integration tests against SAP Fiori Elements applications. It is primarily focused on OData V4 using the `sap.fe.test` library. V2 API reference is included at the end.

## Rules

### API Usage

- **Always look up method names in the official `sap.fe.test` API docs — never invent or guess them.** The complete reference is at `https://ui5.sap.com/#/api/sap.fe.test`. For a specific UI5 version, add it before the hash: `https://ui5.sap.com/1.145.3/#/api/sap.fe.test`. Check the app's UI5 version in `ui5.yaml` under `framework.version` or in `manifest.json` under `sap.ui5.dependencies.minUI5Version`.
- Always try standard `sap.fe.test` API before writing custom selectors
- Use `onFilterBar()`, `onTable()`, `onHeader()`, `onForm()`, `onFooter()`, `onDialog()` for standard interactions
- For V4 apps, use `sap/fe/test/ListReport`, `sap/fe/test/ObjectPage`, or `sap/fe/test/TemplatePage` as page object base classes — Overview Page has no `sap.fe.test` support; FCL has no dedicated class, use `ListReport`/`ObjectPage` for the individual targets within the FCL
- For V2 apps, use `sap/suite/ui/generic/template/integration` API — never mix V4 and V2 APIs

### Test Structure

- Every `opaTest` MUST have at least one `Then` assertion — tests with 0 assertions fail
- Teardown must be called on `Given` (not chained on a page object), and always after at least one assertion:

```javascript
// ❌ Wrong — teardown chained on page object, no prior assertion
opaTest("Clean up", function(Given, When, Then) {
    Then.onTheList.iSeeThisPage()
        .and.onTheList.iTeardownMyApp();
});

// ✅ Correct — assertion first, teardown on Given as a separate step
opaTest("Clean up", function(Given, When, Then) {
    Then.onTheList.iSeeThisPage();
    Given.iTeardownMyApp();
});
```

- Use Given/When/Then semantics correctly: Given=preconditions, When=actions, Then=assertions
- Method chain with `.and` for multiple actions on the same component

### Page Object Configuration

- Register all page objects in `JourneyRunner.pages` before running journeys
- Use `sap.fe.test.JourneyRunner` instead of raw `Opa5.extendConfig` for SAP Fiori Elements apps

### Field Names

- OData property names are case-sensitive — always match exact case from `metadata.xml`
- Section IDs in `onForm({section: ...})` must match the `ID` from the `@UI.Facets` annotation, not the display label
- Button labels in `iExecuteAction()` must match exact i18n text rendered in the app

### Mock Data

- Mock data property names must match `metadata.xml` entity type property names exactly
- Provide at least 2 records per entity to enable count assertions
- Value help entities must have mock data if value help tests are included
- Navigation target keys in mock data must be consistent across related entity files
- Use static mock data (`generateMockData: false`) when tests assert specific values; use dynamic mock data (`generateMockData: true`) when tests only assert structure

### Stability

- Never use hardcoded generated control IDs — they change on re-render
- Use control type + stable properties (text, icon) for custom selectors
- When writing custom selectors, prefer OpaBuilder syntax (`sap.ui.test.OpaBuilder`) over raw `waitFor` — use `.description()` for readable success/failure messages
- Set `opaConfig.timeout` to 60 or higher for CI/CD environments

### Dialog Handling

- Any Cancel or Delete action that may trigger a confirmation dialog must handle the dialog
- Check whether a dialog appears after an action before assuming it doesn't

### Debugging

When a test fails, add this line to the test entry point before the runner to pause the app in the browser at the point of failure:

```javascript
sap.ui.test.qunitPause.pauseRule = "assert,timeout";
```

Remove it once all journeys pass.

---

## Anti-Patterns

### API Misuse

- Do NOT invent or guess method names — always verify against the official `sap.fe.test` API docs at `https://ui5.sap.com/#/api/sap.fe.test`
- Do NOT write custom `waitFor` selectors when standard `sap.fe.test` API covers the scenario
- Do NOT mix V4 (`sap.fe.test`) and V2 (`sap.suite.ui.generic.template`) API in the same test
- Do NOT use hardcoded generated IDs like `'__xmlview0--list--0'` — they are unstable
- Do NOT skip `iTeardownMyApp()` at the end of a journey (V4: `Given.iTeardownMyApp()`, V2: `Given.iTeardownMyApp()`)
- Do NOT chain teardown on a page object — always call it on `Given`

### Assertion Omission

- Do NOT write an `opaTest` with no `Then` block — it will report 0 assertions and fail
- Do NOT use `When` without eventually asserting the result with `Then`

### State Assumptions

- Do NOT assume the app is in a specific state between `opaTest` blocks — tests run sequentially but state can carry over
- Do NOT navigate in a test without asserting the target page is reached
- Do NOT call `iExecuteEdit()` without asserting `iSeeObjectPageInEditMode()` before interacting with form

### Data and Config

- Do NOT use property names that don't match `metadata.xml` (wrong casing causes timeout)
- Do NOT test with empty mock data — always provide at least 1 record
- Do NOT configure `JourneyRunner.pages` with a key that doesn't match the `onThe...` reference
- Do NOT ignore discard confirmation dialogs after Cancel or Delete

### Journey Design

- Do NOT create journeys with 10+ `opaTest` blocks in a single module — split into focused files
- Do NOT add tests for standard Fiori Elements behavior already tested by the `sap.fe.test` framework

---


## Version Detection

**Read `manifest.json`:**

| Indicator | Version | Test Library |
|-----------|---------|-------------|
| `"sap.fe.templates": {}` in `sap.ui5.dependencies.libs` | **V4** | `sap/fe/test/ListReport`, `sap/fe/test/ObjectPage` |
| `"sap.ui.generic.app"` root key | **V2** | `sap/suite/ui/generic/template/integration/...` |


---

## V4 API Fundamentals

### Identifier Pattern

Almost all `sap.fe.test` functions take an **identifier** as their first parameter to locate the UI element. Two forms:

- **String** — matches by the visible UI label. Quick to write but breaks if the label changes.
- **Object** — matches by stable IDs derived from OData annotations. Preferred for long-term stability.

```javascript
// String form — readable, label-dependent
Then.onTheObjectPage.onForm("General Information").iCheckField("Agency", "Hot Socks Travel");

// Object form — stable across label changes; IDs come from metadata.xml annotations
Then.onTheObjectPage
    .onForm({ section: "GeneralInfo", fieldGroup: "Travel" })
    .iCheckField({ property: "AgencyID" }, { value: "70007", description: "Hot Socks Travel" });
```

For the object form, find the IDs in `metadata.xml`:
- `CollectionFacet ID` → `section`
- `ReferenceFacet ID` → `fieldGroup`
- OData property name → `property`

### Function Naming Conventions

| Prefix | Meaning |
|--------|---------|
| `iExecute...` | Press a standard button (Go, Edit, Save, Delete) |
| `iCheck...` | Assert content, visibility, or enablement |
| `iChange...` | Change the value of a field |
| `iAdd/iRemove...` | Add or remove items from a list (e.g. filter fields) |
| `iPress...` | Click a table row or cell |

### Chaining

Functions within the same UI area chain with `.and.`:

```javascript
Then.onTheTravelList.onTable()
    .iCheckRows(5)
    .and.iCheckRows({ "Travel": "2" })
    .and.iCheckRows({ "Customer": "Ryan (594)" });
```

To switch UI areas within the same assertion step, use `.and.then.` to return to the page object, then call the next area accessor:

```javascript
Then.onTheTravelObjectPage
    .onHeader()
        .iCheckEdit({ visible: true, enabled: false })
        .and.then.onFooter()
            .iCheckSave({ visible: true, enabled: true });
```

`.and.` stays in the current area. `.and.then.` returns to the page object to pick a different area.

---

## V4: Fiori Elements V4

### Category 01: App Startup & Page Visibility

**Standard Patterns:**
```javascript
// Start app and verify page loaded
// iStartMyApp() uses the intent encoded in launchUrl in JourneyRunner.js
Given.iStartMyApp();
Then.onTheListReport.iSeeThisPage();

// Navigate to Object Page and verify
When.onTheListReport.onTable().iPressRow(0);
Then.onTheObjectPage.iSeeThisPage();

// Teardown (always at end of journey)
Given.iTearDownMyApp();
```

**Pattern: App Doesn't Start (🔴 Category 01)**

**Symptom**: `iSeeThisPage()` times out immediately
**Root Cause**: Wrong `appId`, `componentId`, or `launchUrl`

```javascript
// ❌ WRONG: componentId doesn't match manifest.json routing target
return new ListReport({
    appId: 'my.app',
    componentId: 'ListReport',  // ← Wrong if manifest has 'ProductList'
    entitySet: 'Product'
});

// ✅ FIXED: Match exact routing target ID from manifest.json
// manifest.json: "targets": { "ProductList": { ... } }
return new ListReport({
    appId: 'my.namespace.app',    // ← sap.app.id from manifest.json
    componentId: 'ProductList',   // ← exact key from targets object
    contextPath: '/Product'       // ← V4: use contextPath, not entitySet
});
```

**Teardown Discipline — Each opaTest Owns Its Lifecycle:**

```javascript
// ❌ ANTI-PATTERN — standalone teardown test
opaTest("My test", function(Given, When, Then) {
    Given.iStartMyApp();
    // ... no teardown!
});
opaTest("Teardown", function(Given, When, Then) {
    Given.iTearDownMyApp(); // ← breaks if any test inserted above also calls iStartMyApp
});

// ✅ CORRECT — self-contained
opaTest("My test", function(Given, When, Then) {
    Given.iStartMyApp();
    // ...
    Given.iTearDownMyApp(); // always here
});
```

**Fix JourneyRunner pages:**
```javascript
new JourneyRunner({
    launchUrl: sap.ui.require.toUrl("your/app") + "/test/flpSandbox.html",
    pages: {
        onTheProductList: ListReportPage,
        onTheProductObjectPage: ObjectPagePage
    }
}).run(FirstJourney.run);
```

---

### Category 02: FilterBar Operations

**Standard Patterns:**
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
When.onTheListReport.onFilterBar()
    .iChangeFilterField({ property: "Status" }, "Active", true)
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

**Pattern: FilterBar Field Not Found (🟡 Category 02)**

**Symptom**: Timeout on `iChangeFilterField(...)`
**Root Cause**: Field name doesn't match OData property name (case-sensitive)

```javascript
// ❌ WRONG: camelCase doesn't match OData property
When.onTheListReport.onFilterBar().iChangeFilterField({ property: "categoryId" }, "CAT001");

// ✅ FIXED: Match exact OData property name from metadata.xml
// metadata.xml: <Property Name="CategoryId" .../>
When.onTheListReport.onFilterBar().iChangeFilterField({ property: "CategoryId" }, "CAT001");
```

**Fix for value-help-backed FilterField:**
```javascript
// ❌ FAILS: iChangeFilterField times out for VH-backed fields
When.onTheListReport.onFilterBar().iChangeFilterField({ property: "SalesDocument" }, "4026");

// ✅ WORKS: Target the -inner input directly with EnterText
iFillSalesDocument: function(sValue) {
    this.waitFor({
        id: "{appId}::{pageId}--fe::FilterBar::{entitySet}::FilterField::SalesDocument-inner",
        actions: new EnterText({ text: sValue })
        // Note: NO idSuffix here — the id already ends in -inner
    });
}
```

---

### Category 03: Table Interactions

**Standard Patterns:**
```javascript
// Navigate to object page via row click
When.onTheListReport.onTable().iPressRow(0);                          // by index
When.onTheListReport.onTable().iPressRow({ProductID: "HT-1000"});    // by field value

// Assert row count
Then.onTheListReport.onTable().iCheckRows();                          // at least one row
Then.onTheListReport.onTable().iCheckRows(0);                         // table is empty
Then.onTheListReport.onTable().iCheckRows(5);                         // exact count
Then.onTheListReport.onTable().iCheckRows({Status: "Active"}, 3);    // filtered count

// Select rows (for mass actions)
When.onTheListReport.onTable().iSelectRows({ProductID: "HT-1000"});
When.onTheListReport.onTable().iSelectAllRows();

// Sort table by column
// IMPORTANT: The first argument is the visible column header label (as shown in the UI),
// NOT the OData property name.
// Second arg: "Ascending" | "Descending" | "None" (defaults to "Ascending")
When.onTheListReport.onTable().iChangeSortOrder("Product Name");                // ascending (default)
When.onTheListReport.onTable().iChangeSortOrder("Product Name", "Ascending");
When.onTheListReport.onTable().iChangeSortOrder("Product Name", "Descending");
When.onTheListReport.onTable().iChangeSortOrder("Product Name", "None");        // remove sorting

// Group by column
When.onTheListReport.onTable().iGroupByColumn("Product Name");
Then.onTheListReport.onTable().iCheckGroupByColumn("Product Name");

// Create / delete via table toolbar
When.onTheListReport.onTable().iExecuteCreate();
When.onTheListReport.onTable().iExecuteDelete();

// Execute a custom action from the table toolbar (use iExecuteAction, NOT iPressAction)
When.onTheListReport.onTable().iExecuteAction("Deduct Discount");
```

**Pattern: Table Row Not Found (🟡 Category 03)**

**Symptom**: `iPressRow({ProductID: "HT-1000"})` times out
**Root Cause**: Mock data file missing or doesn't contain the key value

```javascript
// Fix 1: Ensure mock data exists and has the record
// webapp/localService/mockdata/Product.json
[
    {
        "ProductID": "HT-1000",   // ← must match exactly
        "ProductName": "Notebook Basic 15",
        "Status": "Active"
    }
]

// Fix 2: Use index-based navigation if key is unknown
When.onTheListReport.onTable().iPressRow(0);  // First row
```

---

### Category 04: Header Actions

**Standard Patterns:**
```javascript
// Object Page header actions (standard)
When.onTheObjectPage.onHeader().iExecuteEdit();
When.onTheObjectPage.onHeader().iExecuteDelete();

// Custom action button by label
When.onTheObjectPage.onHeader().iExecuteAction("Approve");

// Check button state (enabled/disabled)
Then.onTheObjectPage.onHeader().iCheckAction("Approve", {enabled: true});

// Check header title and description fields
Then.onTheObjectPage.onHeader().iCheckTitle("HT-1000");
Then.onTheObjectPage.onHeader().iCheckDescription("Notebook Basic 15");

// List Report toolbar action
When.onTheListReport.onHeader().iExecuteAction("Export to Spreadsheet");

// Navigate between records
When.onTheObjectPage.onHeader().iPressNavigateDownButton();
When.onTheObjectPage.onHeader().iPressNavigateUpButton();
```

**Fix: Enable edit mode before accessing edit-only actions:**
```javascript
When.onTheObjectPage.onHeader().iExecuteEdit();
Then.onTheObjectPage.iSeeObjectPageInEditMode();
When.onTheObjectPage.onHeader().iExecuteAction("Approve");
```

---

### Category 05: Form Field Operations

> **Scope: SAP Fiori Elements-generated forms only.** The `{ property: "..." }` and `{ section: "SectionId" }` identifiers work by matching auto-generated control IDs. These IDs do **not** exist in custom extension sections containing hand-authored fragments. For those cases see Category 12 (Custom Selectors).

The `section` value in `onForm({ section: "..." })` must be the **ID** from the `@UI.Facets` `CollectionFacet`. The optional `fieldGroup` value is the `ReferenceFacet ID`. Never use display labels for either.

**Anti-pattern — `iCheckField` with only `{ value }` on a text-annotated field always times out:**

Any field that has `SAP__common.Text` or an explicit `TextArrangement` annotation is rendered as a combined display string (e.g. `"Christine Detemple (99)"`). Passing only `{ value: "99" }` will always time out. You **must** pass `{ value, description }`.

```javascript
// ❌ Wrong — times out for any field with SAP__common.Text or TextArrangement
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "CustomerID" }, { value: "99" });

// ✅ Fixed — always pass { value, description } for text-annotated fields
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "CustomerID" }, { value: "99", description: "Christine Detemple" });
```

**Standard Patterns:**
```javascript
// Must be in edit mode first
When.onTheObjectPage.onHeader().iExecuteEdit();
Then.onTheObjectPage.iSeeObjectPageInEditMode();

// Change a field in a specific section
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iChangeField({ property: "ProductName" }, "Updated Name");

// Assert a plain field value (no SAP__common.Text annotation)
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "ProductName" }, "Updated Name");

// Assert a text-annotated field (SAP__common.Text or TextArrangement present)
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "CustomerID" }, { value: "99", description: "Christine Detemple" });

// Open value help from form field
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iOpenValueHelp("Category");
```

**Fix: Section reference must match the facet ID:**
```javascript
// Fix: Use the ID from @UI.Facets annotation (e.g. <PropertyValue Property="ID" String="GeneralInformation"/>)
When.onTheObjectPage.onForm({section: "GeneralInformation"})
    .iChangeField({ property: "Name" }, "Test");
```

---

### Category 06: Footer Actions (Save / Cancel)

**Standard Patterns:**
```javascript
// Save changes
When.onTheObjectPage.onFooter().iExecuteSave();
Then.onTheObjectPage.iSeeObjectPageInDisplayMode();

// Check draft indicator label in footer
Then.onTheObjectPage.onFooter().iCheckDraftIndicator("Draft Saved");

// Cancel changes — always handle the discard confirmation dialog
When.onTheObjectPage.onFooter().iExecuteCancel();
When.onTheObjectPage.onDialog().iConfirm(); // Confirm the discard dialog
Then.onTheObjectPage.iSeeObjectPageInDisplayMode();
```

**Pattern: Save Fails / Page Stays in Edit Mode (🔴 Category 06)**

**Symptom**: `iExecuteSave()` runs but `iSeeObjectPageInDisplayMode()` times out
**Root Cause**: Validation error on backend, or mandatory field empty

```javascript
// Fix: Ensure all mandatory fields are set before saving
When.onTheObjectPage.onHeader().iExecuteEdit();
Then.onTheObjectPage.iSeeObjectPageInEditMode();
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iChangeField({ property: "Name" }, "My Product")
    .and.iChangeField({ property: "Price" }, "49.99");
When.onTheObjectPage.onFooter().iExecuteSave();
Then.onTheObjectPage.iSeeObjectPageInDisplayMode();
```

**Pattern: Cancel Dialog Not Handled (🟡 Category 06/07)**

**Symptom**: `iTearDownMyApp()` times out after cancel, or next test starts with dialog open
**Root Cause**: Cancel triggers a "Discard changes?" dialog — test doesn't handle it

```javascript
// ❌ WRONG: Cancel without handling the discard dialog
When.onTheObjectPage.onFooter().iExecuteCancel();
Then.onTheObjectPage.iSeeObjectPageInDisplayMode(); // ← Fails, dialog is blocking

// ✅ FIXED: Confirm the discard dialog
When.onTheObjectPage.onFooter().iExecuteCancel();
When.onTheObjectPage.onDialog().iConfirm();  // ← Confirm "Discard Changes"
Then.onTheObjectPage.iSeeObjectPageInDisplayMode();
```

---

### Category 07: Dialog Interactions

**Standard Patterns:**
```javascript
// Confirm a dialog
When.onTheObjectPage.onDialog().iConfirm();

// Cancel a dialog
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

### Category 08: Section Navigation

Always pass the section **ID** (from `@UI.Facets` annotation or manifest key) as an object `{ section: "SectionId" }`, not a plain string label.

**Standard Patterns:**
```javascript
// Navigate to a section — works for ALL sections including custom extension sections
When.onTheObjectPage.iGoToSection({ section: "StockStatus" });

// Assert a section is visible/active
Then.onTheObjectPage.iCheckSection({ section: "StockStatus" });

// Expand / collapse sections
When.onTheObjectPage.iExpandSection({ section: "AdditionalInfo" });
When.onTheObjectPage.iCollapseSection({ section: "AdditionalInfo" });
```

> `iGoToSection` is the correct method for ALL section navigation — including custom extension sections. The section ID is the `ID` property value from `@UI.Facets` (e.g. `<PropertyValue Property="ID" String="GeneralInformation"/>`) or the key in `manifest.json`. Never use the display label string.

---

### Category 09: Value Help

**Opening value help:**
```javascript
// Form field: pass the label as it appears on the form field in the UI
// (from @UI.FieldGroup / @UI.Identification annotation, NOT Common.Label on the OData property)
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iOpenValueHelp("Category");

// Filter bar field: pass { property: "<ODataPropertyName>" }
When.onTheListReport.onFilterBar()
    .iOpenValueHelp({ property: "CustomerID" });
```

**Searching within value help:**

Search via the generic search field. The search field is only available when the value help entity set is annotated as searchable in `metadata.xml`. Depending on the backend:
- **CAP**: `Search.SearchRestrictions` with `Searchable: true` (from `@Search.searchable: true` in CDS)
- **RAP**: `SAP__capabilities.SearchRestrictions` with `Searchable: true`

Generic search may return many results — prefer filtering by a specific field (see below) for a precise result set.

```javascript
When.onTheObjectPage.onValueHelpDialog()
    .iChangeSearchField("Elec")
    .and.iExecuteSearch();
```

Filter by a specific field. Two cases depending on the value help dialog layout. **Determine the case before writing the test** by grepping `metadata.xml` for `SearchRestrictions` on the value help target entity (found via the `NavigationProperty` path, e.g. `_Customer` → `Passenger` entity set):

- `Searchable: true` present → **Case A**
- Absent or `Searchable: false` → **Case B**

> For RAP backends, Case A is the default — standard VH entities expose `SAP__capabilities.SearchRestrictions` with `Searchable: true`. When in doubt, check the metadata rather than assuming Case B.

- **Case A: value help dialog has a search field** (filters are collapsed by default) — call `iExecuteShowHideFilters` first to expand the filter bar, then set the field:

```javascript
When.onTheObjectPage.onValueHelpDialog()
    .iExecuteShowHideFilters();
When.onTheObjectPage.onValueHelpDialog()
    .iChangeFilterField({ property: "CustomerID" }, "6")
    .and.iExecuteSearch();
```

- **Case B: value help dialog has no search field** (filter bar is always visible) — call `iChangeFilterField` directly:

```javascript
When.onTheObjectPage.onValueHelpDialog()
    .iChangeFilterField({ property: "CustomerID" }, "6")
    .and.iExecuteSearch();
```

**Selecting rows:**

Prefer index-based selection — always reliable regardless of result table columns.

```javascript
// Preferred: select by index
When.onTheObjectPage.onValueHelpDialog().iSelectRows(0);

// Alternative: select by field value (only when a specific record must be targeted)
When.onTheObjectPage.onValueHelpDialog().iSelectRows({CategoryId: "CAT001"});
```

**Single-select vs multi-select:**

```javascript
// Single-select VH (most form fields): selecting a row closes the dialog immediately
// Do NOT call iConfirm() — it will time out because the dialog is already gone
When.onTheObjectPage.onValueHelpDialog().iSelectRows(0);
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "Category" }, "Electronics");

// Multi-select VH (e.g. filter bar fields): call iConfirm() explicitly
When.onTheObjectPage.onValueHelpDialog().iSelectRows(0);
When.onTheObjectPage.onValueHelpDialog().iConfirm();
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "Category" }, "Electronics");
```

> Ensure the value help entity has mock data — `iSelectRows` times out if the entity set has no records.

---

### Category 10: Draft Handling

**Standard Patterns:**
```javascript
// Enter draft edit mode
When.onTheObjectPage.onHeader().iExecuteEdit();
Then.onTheObjectPage.iSeeObjectPageInEditMode();

// Make changes and activate
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iChangeField({ property: "Name" }, "Draft Name");
When.onTheObjectPage.onFooter().iExecuteSave();
Then.onTheObjectPage.iSeeObjectPageInDisplayMode();
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField({ property: "Name" }, "Draft Name");

// Discard draft
When.onTheObjectPage.onHeader().iExecuteEdit();
When.onTheObjectPage.onFooter().iExecuteCancel();
When.onTheObjectPage.onDialog().iConfirm();
```

---

### Category 11: Sub-Table in Object Page

**Standard Patterns:**
```javascript
// Navigate to sub-section with table
When.onTheObjectPage.iGoToSection({ section: "Items" });

// Create new sub-entity
When.onTheObjectPage.onTable({property: "items"}).iExecuteCreate();

// Navigate into sub-object
When.onTheObjectPage.onTable({property: "items"}).iPressRow(0);

// Check sub-table rows
Then.onTheObjectPage.onTable({property: "items"}).iCheckRows(3);
```

> `property` is the OData navigation property name, not the section label.

---

### Category 12: Custom Selectors (Last Resort)

**Use only when standard `sap.fe.test` API cannot cover the scenario.**

**Lookup order:**
1. Check standard patterns (Categories 01–11) for a ready-made snippet.
2. If not there, check the full API guide for a standard method.
3. Only if no standard API covers it, use a custom page object method.

**Preferred syntax: OpaBuilder** (`sap.ui.test.OpaBuilder`, available since UI5 1.74)

```javascript
// ✅ PREFERRED — OpaBuilder syntax (cleaner, auto error messages)
iClickMyBuildingBlockButton: function() {
    return OpaBuilder.create(this)
        .hasType("sap.m.Button")
        .hasProperties({ text: "My Building Block Button" })
        .doPress()
        .description("Pressing building block button")
        .execute();
},

iSeeCustomBanner: function(expectedText) {
    return OpaBuilder.create(this)
        .hasType("sap.m.MessageStrip")
        .has(function(oControl) { return oControl.getText() === expectedText; })
        .description("Custom banner visible: " + expectedText)
        .execute();
}

// ❌ RAW waitFor — acceptable but verbose; prefer OpaBuilder above
iClickMyBuildingBlockButton: function() {
    return this.waitFor({
        controlType: "sap.m.Button",
        properties: { text: "My Building Block Button" },
        actions: new Press(),
        errorMessage: "Could not find building block button"
    });
}
```

**OpaBuilder for aggregation and child element matching:**
```javascript
// Select all unselected list items — conditional action
OpaBuilder.create(this)
    .hasType("sap.m.CustomListItem")
    .doConditional(
        OpaBuilder.Matchers.properties({ selected: false }),
        OpaBuilder.Actions.press()
    )
    .description("Selecting unselected items")
    .execute();
```

**Custom extension sections — use string labels instead of IDs:**

When an Object Page extension section contains a hand-authored fragment, `onForm({ section: "..." })` and `iCheckField({ property: "..." })` do not work because auto-generated IDs don't exist. Use string labels instead:

```javascript
// ✅ Correct for custom extension sections
Then.onTheObjectPage
    .onForm("Breakout Section #2")        // section display title (manifest "title" value)
    .iCheckField("Journal Entry");         // field label from Common.Label annotation

// ❌ Fails for custom extension sections — IDs don't match
Then.onTheObjectPage
    .onForm({ section: "ExtensionSection2" })
    .iCheckField({ property: "AccountingDocument" });
```

**CustomFilterField runtime ID pattern:**
```javascript
// ❌ WRONG — annotation path does NOT appear in runtime ID
var IdBase = "{appId}::{pageId}--fe::FilterBar::{entitySet}::CustomFilterField::MyFilterKey";

// ✅ CORRECT — runtime ID uses only the CustomFilterField key
var IdBase = "{appId}::{pageId}--MyFilterKey";
// Full inner control ID: IdBase + "--{innerControlId}"
// Verify actual ID in browser debugger — always check before coding
```

**Opening sap.m.Select inside a CustomFilterField:**
```javascript
// ✅ CORRECT — Press with idSuffix "arrow" opens the dropdown
this.waitFor({
    id: IdBase + "--MRPElement",
    actions: new Press({ idSuffix: "arrow" })
});
// waitFor.id = SAPUI5 control ID; Press.idSuffix = DOM child suffix — these are independent
```

**EnterText on a -inner input (avoid double suffix):**
```javascript
// ❌ WRONG — idSuffix on EnterText creates <id>-inner-inner (doesn't exist)
this.waitFor({
    id: "...::FilterField::SalesDocument-inner",
    actions: new EnterText({ idSuffix: "inner", text: value })
});

// ✅ CORRECT — id already targets the inner input; no idSuffix needed on EnterText
this.waitFor({
    id: "...::FilterField::SalesDocument-inner",
    actions: new EnterText({ text: value })
});
```

**sap.m.ComboBox item selection:**
```javascript
// ❌ WRONG — sap.ui.core.ListItem is NOT rendered in the ComboBox popup
this.waitFor({
    controlType: "sap.ui.core.ListItem",
    matchers: new PropertyStrictEquals({ name: "key", value: "YES_TEXT" }),
    searchOpenDialogs: true,
    actions: new Press()
});

// ✅ CORRECT — two steps: open the dropdown, then click the rendered StandardListItem
// Step 1: open the dropdown
this.waitFor({
    id: "...--MyComboBox",
    actions: new Press({ idSuffix: "arrow" }),
    errorMessage: "ComboBox not found"
});
// Step 2: click the rendered list item
this.waitFor({
    controlType: "sap.m.StandardListItem",
    matchers: new PropertyStrictEquals({ name: "title", value: "Yes" }), // resolved i18n text
    searchOpenDialogs: true,
    actions: new Press(),
    errorMessage: "ComboBox item not found"
});
```

**sap.m.ObjectIdentifier title link:**
```javascript
// Press the active title link (e.g. material name that opens a quick view)
this.waitFor({
    controlType: "sap.m.ObjectIdentifier",
    matchers: new PropertyStrictEquals({ name: "title", value: "MATERIAL-001" }),
    actions: new Press({ idSuffix: "title" }),
    errorMessage: "ObjectIdentifier title link not found"
});
```

---

### Category 13: Chart and Analytical List Page (ALP) — V4

**Standard Patterns:**
```javascript
// Select a data point on the chart
When.onTheListReport.onChart().iSelectDataPoint({Status: "Active"});

// Deselect a data point
When.onTheListReport.onChart().iDeselectDataPoint({Status: "Active"});

// Check the current chart type
Then.onTheListReport.onChart().iCheckChartType("Bar");
```

---

### Category 14: Shell and Base Assertions

`onTheShell` is a framework built-in — it does not need to be registered in the `pages` map in `JourneyRunner.js`.

```javascript
// Navigate back via FLP back button
When.onTheShell.iNavigateBack();
```

`iSeeMessageToast` is a base assertion called directly on `Then` — not on `onTheShell`:

```javascript
Then.iSeeMessageToast("Object saved.");
```

---


### Pattern: Test Has No Assertion (🔴 All Categories)

**Symptom**: `Expected at least 1 assertion but got 0`
**Root Cause**: `opaTest` function has `When` steps but no `Then` step

```javascript
// ❌ WRONG: No Then = no assertions
opaTest("Click button", function(Given, When, Then) {
    When.onThePage.iClickButton();
    // Missing Then!
});

// ✅ FIXED: Always end with at least one Then
opaTest("Click button", function(Given, When, Then) {
    When.onThePage.iClickButton();
    Then.onThePage.iSeeThisPage();  // ← Minimum: verify page still exists
});
```

---

### Pattern: Flaky Test on CI (🔵 All Categories)

**Symptom**: Test passes locally, fails intermittently in CI
**Root Cause**: Default OPA timeout (15s) too low for slower CI environments

```javascript
// Fix: Increase timeout in opaTests.qunit.js
new JourneyRunner({
    opaConfig: {
        timeout: 60  // ← Increase from default 15 to 60 seconds
    },
    ...
}).run(FirstJourney.run);
```

---

## V2: Fiori Elements V2

The V2 test library (`fioriElementsTestLibrary`) is completely separate from `sap.fe.test`. Never mix the two — using methods from both in one journey will produce silent failures.

### V2 API Comparison

| Aspect | V2 (`fioriElementsTestLibrary`) | V4 (`sap.fe.test`) |
|--------|--------------------------------|--------------------|
| Runner | No JourneyRunner — use `Opa5.extendConfig` directly | `sap.fe.test.JourneyRunner` |
| Page objects | `onTheGenericListReport`, `onTheGenericObjectPage` (fixed names) | Custom names registered in JourneyRunner |
| App start | `Given.iStartMyAppInAFrame("index.html")` | `Given.iStartMyApp()` |
| Search | `onTheGenericListReport.iExecuteTheSearch()` | `onFilterBar().iExecuteSearch()` |
| Check rows | `onTheGenericListReport.theResultListContainsTheCorrectNumberOfItems(n)` | `onTable().iCheckRows(n)` |
| Navigate to item | `onTheGenericListReport.iNavigateFromListItemByLineNo(0)` | `onTable().iPressRow(0)` |
| Check OP title | `onTheGenericObjectPage.theObjectPageHeaderTitleIsCorrect(...)` | `onHeader().iCheckTitle(...)` |
| Edit | `onTheGenericObjectPage.iClickTheEditButton()` | `onHeader().iExecuteEdit()` |
| Save | `onTheGenericObjectPage.iSaveTheDraft()` | `onFooter().iExecuteSave()` |

### V2 Setup and Configuration

`appId` and `entitySet` drive all internal ID-prefix construction — getting these right is the single most important configuration step.

Configure the test library via `Opa5.extendConfig` **before** loading page objects:

```javascript
Opa5.extendConfig({
    testLibs: {
        fioriElementsTestLibrary: {
            Common: {
                appId: "my.namespace.app",   // sap.app.id from manifest.json
                entitySet: "MyEntitySet"      // primary entity set of the List Report
            }
        }
    },
    autoWait: true,
    timeout: 60,
    pollingInterval: 400,
    appParams: { "sap-ui-animation": false }
});
```

Then load the page object modules for your floorplan:

```javascript
// List Report + Object Page (most common)
sap.ui.define([
    "sap/suite/ui/generic/template/integration/testLibrary/ListReport/pages/ListReport",
    "sap/suite/ui/generic/template/integration/testLibrary/ObjectPage/pages/ObjectPage"
], function() { "use strict"; });

// Analytical List Page
sap.ui.define([
    "sap/suite/ui/generic/template/integration/testLibrary/AnalyticalListPage/pages/AnalyticalListPage"
], function() { "use strict"; });

// Flexible Column Layout
sap.ui.define([
    "sap/suite/ui/generic/template/integration/testLibrary/FCL/pages/FCL"
], function() { "use strict"; });
```

Loading these registers the global page objects: `onTheGenericListReport`, `onTheGenericObjectPage`, `onTheGenericAnalyticalListPage`, `onTheGenericFCLApp`.

### V2 App Startup

```javascript
// Add sap-ui-xx-viewCache=false to avoid stale view caches between test runs
Given.iStartMyAppInAFrame("index.html?sap-ui-xx-viewCache=false");

// Teardown (always at end of journey, on Given)
Given.iTeardownMyApp();
```

### V2 ListReport Actions (`onTheGenericListReport`)

#### Filter bar
| Method | Parameters | Description |
|--------|-----------|-------------|
| `iExecuteTheSearch()` | — | Press the Go button. Expands collapsed filter bar automatically. |
| `iSetTheFilter(oItem)` | `oItem.Field` (string), `oItem.Value` (string or number) | Set a Smart Filter Bar field by metadata property name. Use `"editStateFilter"` as Field for editing-status filter. |
| `iSetTheSearchField(sText)` | `sText: string` | Fill the search field and press Enter. |

#### Navigation
| Method | Parameters | Description |
|--------|-----------|-------------|
| `iNavigateFromListItemByLineNo(iIndex, sTableId)` | `iIndex` (0-based int), `sTableId` (optional, part after `--`) | Click a table row by index. |
| `iNavigateFromListItemByFieldValue(oItem)` | `oItem.Field`, `oItem.Value` | Click first row matching a field/value pair. Field name as in `$metadata`. |
| `iNavigateBack()` | — | Shell back button or `window.history.back()`. |

#### Buttons and selection
| Method | Parameters | Description |
|--------|-----------|-------------|
| `iClickTheCreateButton()` | — | Click the standard Create button. |
| `iClickTheButtonWithId(sId)` | short id (part after `--`) | Click a button by its short DOM id. |
| `iClickTheButtonHavingLabel(sLabelText, iIndex)` | label, optional 0-based index | Click a button by visible label text. |
| `iClickTheButtonOnTheDialog(sText)` | label string | Click a dialog button by label. |
| `iClickTheOverflowToolbarButton(sButtonName)` | button text | Click an OverflowToolbarButton by text. |
| `iSelectListItemsByLineNo(aItemIndex, bSelect, sTabKey)` | int array, bool (default true), optional tab key | Select/deselect rows by index. Pass `sTabKey` for multi-view tabs. |
| `iClickOnIconTabFilter(sKey)` | manifest variant key | Switch tab in Icon Tab Bar. |
| `iClickOnSegmentedButton(sKey)` | manifest variant key | Switch view via segmented button. |

### V2 ListReport Assertions (`onTheGenericListReport`)

| Method | Parameters | Description |
|--------|-----------|-------------|
| `theListReportPageIsVisible()` | — | Assert the DynamicPage is rendered. |
| `theResultListIsVisible()` | — | Assert the SmartTable is visible. |
| `theResultListContainsTheCorrectNumberOfItems(iItems, sTabKey)` | int, optional tab key | Assert exact row count. |
| `theResultListFieldHasTheCorrectValue(oItem, sTabKey)` | `oItem.Line` (0-based), `oItem.Field`, `oItem.Value`; optional tab key | Assert a cell value. |
| `theAvailableNumberOfItemsIsCorrect(iItems, tabId)` | int, optional tab id | Assert the count shown in the table header / info toolbar. |
| `iShouldSeeTheDialogWithTitle(sTitle)` | title string | Assert a dialog is open with the given title. |
| `iShouldSeeTheDialogWithContent(sContent)` | content string | Assert a dialog contains the given message text. |
| `iShouldSeeTheButtonOnTheDialog(sButton)` | label string | Assert a specific button exists on an open dialog. |
| `iShouldSeeTheMessageToastWithText(sExpectedText)` | text | Assert message toast with given text (handles `autoWait` internally). |
| `theButtonWithIdIsEnabled(sId, bEnabled)` | short id, bool | Assert button enabled state. |
| `iShouldSeeTheButtonWithId(sId)` | short id | Assert a button is visible. |

### V2 ObjectPage Actions (`onTheGenericObjectPage`)

#### Edit lifecycle
| Method | Parameters | Description |
|--------|-----------|-------------|
| `iClickTheEditButton()` | — | Click Edit to enter edit mode. |
| `iSaveTheDraft(bNonDraft)` | optional bool (default false) | Click Save. Pass `true` for non-draft apps; omit for draft-enabled apps. |
| `iCancelTheDraft()` | — | Click Cancel to discard the draft. |
| `iSelectTheOptionFromDiscardDraftPopUp(sOption)` | option label string | Select an option from the discard-draft confirmation popup. |

#### Field editing and navigation
| Method | Parameters | Description |
|--------|-----------|-------------|
| `iSetTheObjectPageDataField(sFieldGroup, sFieldName, sValue, sFieldGroupID)` | FieldGroup name, field name from metadata, new value, optional unique FieldGroup ID | Set a SmartField inside a specific FieldGroup. Requires edit mode. |
| `iSetTheInputFieldWithId(sId, sValue)` | short id, value string | Enter text into an editable input field by id. |
| `iNavigateFromObjectPageTableByLineNo(sTable, iIndex, sEntitySet, sTableID)` | nav property from metadata, 0-based index, optional entitySet, optional tableID | Click a row in an OP sub-table by line number. |
| `iNavigateFromObjectPageTableByFieldValue(sTable, oItem, sEntitySet, sTableID)` | nav property, `oItem.Field`/`oItem.Value`, optional entitySet, optional tableID | Click the first matching row in an OP sub-table. |
| `iSelectSectionOrSubSectionByName(sSectionText, sSubSectionText, iNthOP)` | section title, optional sub-section title, optional 1-based OP index (FCL) | Select a section by title. |
| `iNavigateBack()` | — | Shell back button or `window.history.back()`. |
| `iClickTheButtonWithId(sId, sEntitySet)` | short id, optional entitySet | Click a button by short id. |
| `iClickTheButtonHavingLabel(sLabelText, iIndex)` | label, optional 0-based index | Click a button by visible label. |
| `iClickTheButtonOnTheDialog(sText)` | label string | Click a dialog button by label. |
| `iClickTheOverflowToolbarButton(sButtonName)` | button text | Click an OverflowToolbarButton by text. |
| `iNavigateUpOrDownUsingObjectPageHeaderActionButton(sDirection)` | `"up"` or `"down"` | Click the previous/next navigation arrows in the OP header. |

### V2 ObjectPage Assertions (`onTheGenericObjectPage`)

| Method | Parameters | Description |
|--------|-----------|-------------|
| `theObjectPageIsInDisplayMode()` | — | Assert the Object Page is in read-only display mode. |
| `theObjectPageIsInEditMode()` | — | Assert the Object Page is in edit mode. |
| `theObjectPageHeaderTitleIsCorrect(sTitle, sEntitySet)` | expected title, optional entitySet (FCL sub-OP) | Assert the OP header title. |
| `theObjectPageDataFieldHasTheCorrectValue(oItem)` | `oItem.Field`, `oItem.Value` | Assert a field's binding value on the OP. |
| `theObjectPageTableFieldHasTheCorrectValue(sTable, oItem, sEntitySet, sTableID)` | nav property, `oItem.Line`/`oItem.Field`/`oItem.Value`, optional entitySet, optional tableID | Assert a cell value in an OP sub-table. |
| `iShouldSeeTheSections(aSections)` | array of section title strings | Assert sections exist by title. |
| `iShouldSeeTheDataField(sField, oSettings)` | field name from `$metadata`, optional `{Enabled, Editable, Mandatory}` | Assert a SmartField exists with specific states. |
| `theButtonWithIdIsEnabled(sId, bEnabled)` | short id, bool | Assert button enabled state. |
| `theButtonWithLabelIsEnabled(sLabel, bEnabled)` | label, bool | Assert button enabled state by label. |
| `iShouldSeeTheButtonWithId(sId, sEntitySet)` | short id, optional entitySet | Assert a button is visible. |
| `iShouldSeeTheButtonWithLabel(sLabel)` | label | Assert a button is visible by label. |
| `iShouldSeeTheDialogWithTitle(sTitle)` | title | Assert dialog is open with title. |
| `iShouldSeeTheDialogWithContent(sContent)` | message text | Assert dialog shows specific text. |
| `iShouldSeeTheButtonOnTheDialog(sButton)` | label | Assert button exists on open dialog. |
| `iShouldSeeTheMessageToastWithText(sExpectedText)` | text | Assert message toast with given text. |

### V2 ALP (Analytical List Page) — `onTheGenericAnalyticalListPage`

| Method | Parameters | Description |
|--------|-----------|-------------|
| `iExecuteTheSearch()` | — | Press the Go button on the Smart Filter Bar. |
| `iSetTheFilter(oItem)` | `oItem.Field`, `oItem.Value` | Set a Smart Filter Bar field. |
| `iSelectVFChart(sChartType, value, bSearchOpenDialogs, sFieldName)` | `"Bar"`, `"Line"`, or `"Donut"`; value; optional bool; optional OData property to disambiguate | Select a value in a Visual Filter chart. |
| `iDeselectVFChart(sChartType, value, bSearchOpenDialogs, sFieldName)` | same as above | Deselect a value in a Visual Filter chart. |
| `iNavigateFromListItemByLineNo(iIndex)` | 0-based int | Click a table row to navigate to the Object Page. |
| `iClickOnIconTabFilter(sKey)` | manifest variant key | Switch tab in Icon Tab Bar. |
| `theTableIsVisible()` | — | Assert the SmartTable is rendered. |
| `checkButtonEnablement(sId, bEnabled)` | short id, bool | Assert a button is enabled or disabled. |
| `iShouldSeeTheMessageToastWithText(sExpectedText)` | text | Assert message toast with given text. |

### V2 FCL — `onTheGenericFCLApp`

| Method | Parameters | Description |
|--------|-----------|-------------|
| `iSetTheFCLLayout(sLayout)` | layout string | Programmatically set the FCL layout. |
| `iClickTheFCLActionButton(sButtonId)` | `"fullScreen"`, `"exitFullScreen"`, or `"closeColumn"` | Click one of the three standard FCL column action buttons. |
| `iCheckFCLLayout(sLayout)` | layout string | Assert the current FCL layout. |
| `iCheckFCLActionButtonsVisibility(bVisible, sEntitySet)` | bool, optional entitySet | Assert at least one FCL action button is visible (true) or all are hidden (false). |
| `iCheckFCLHeaderActionButtonsVisibility(oButton, sEntitySet)` | object mapping button ids to bools, optional entitySet | Assert visibility of individual FCL header action buttons. e.g. `{fullScreen: true, exitFullScreen: false, closeColumn: false}` |
| `iCheckForFCLLayoutAppStateInUrl(sValue)` | optional layout string | Assert `FCLLayout=<sValue>` is present in the URL. If omitted, asserts no `FCLLayout` in URL. |

**Common FCL Layout Strings:**
```javascript
"OneColumn"
"TwoColumnsMidExpanded"
"TwoColumnsBeginExpanded"
"ThreeColumnsMidExpanded"
"ThreeColumnsEndExpanded"
"MidColumnFullScreen"
"EndColumnFullScreen"
```

### V2 Common Pitfalls

**Wrong `appId` or `entitySet`** — all control IDs are constructed from these. Double-check against `manifest.json` `sap.app.id` and the entity set in the `pages` config.

**Short IDs** — methods accepting `sId` expect only the part **after** the last `--` in the DOM id. The library prepends the full prefix internally.

**`iNavigateFromListItemByLineNo` uses a 0-based index and positional arguments:**
```javascript
When.onTheGenericListReport.iNavigateFromListItemByLineNo(0);               // first row
When.onTheGenericListReport.iNavigateFromListItemByLineNo(2, "responsiveTable"); // third row, specific table
```

**`iSaveTheDraft` — pass `true` for non-draft apps:**
```javascript
When.onTheGenericObjectPage.iSaveTheDraft();       // draft-enabled apps
When.onTheGenericObjectPage.iSaveTheDraft(true);   // non-draft apps
```

**Sub-table navigation uses the OData navigation property name, not the section label:**
```javascript
// ❌ Wrong — "Items" is the UI section label
When.onTheGenericObjectPage.iNavigateFromObjectPageTableByLineNo("Items", 0);

// ✅ Fixed — "to_Item" is the navigation property from metadata.xml
When.onTheGenericObjectPage.iNavigateFromObjectPageTableByLineNo("to_Item", 0, "SalesOrder");
```

**Message toast — always use the library method** (it handles `autoWait` internally):
```javascript
Then.onTheGenericListReport.iShouldSeeTheMessageToastWithText("Item saved");
```

**Grid vs Responsive table** — `iSelectListItemRange`, `iSelectAllListItems`, and `iDeselectAllListItems` do NOT work with `sap.m.Table` (responsive table). Use `iSelectListItemsByLineNo` for responsive tables.

**Tab keys for multi-view List Report** — when your LR uses `quickVariantSelectionX` (icon tabs) or `quickVariantSelection` (segmented button), pass `sTabKey` to selection and count assertions.

**Sub-Object Pages in FCL** — when multiple OPs are active simultaneously, always pass `sEntitySet` to disambiguate which OP you are addressing.

**`iClickTheEditButton` — older library versions use a longer alias:**
```javascript
When.onTheGenericObjectPage.iClickTheEditButton();                   // current
When.onTheGenericObjectPage.iClickTheEditButtonOnTheObjectPage();    // older versions
```

### V2 Complete Example

```javascript
opaTest("Edit an item and verify the result", function(Given, When, Then) {

    Given.iStartMyAppInAFrame("index.html?sap-ui-xx-viewCache=false");

    When.onTheGenericListReport
        .iSetTheFilter({ Field: "SoldToParty", Value: "C1" })
        .and.iExecuteTheSearch()
        .and.iNavigateFromListItemByLineNo(0);

    Then.onTheGenericObjectPage
        .theObjectPageHeaderTitleIsCorrect("My Item Title")
        .and.theObjectPageIsInDisplayMode();

    When.onTheGenericObjectPage
        .iClickTheEditButton()
        .and.iSetTheObjectPageDataField("MainGroup", "Description", "Updated")
        .and.iSaveTheDraft();

    Then.onTheGenericObjectPage
        .theObjectPageIsInDisplayMode()
        .and.theObjectPageDataFieldHasTheCorrectValue({ Field: "Description", Value: "Updated" });

    Given.iTeardownMyApp();
});
```

---

## File Structure Templates

**Minimal V4 Project Test Structure:**
```
webapp/
├── manifest.json
├── localService/
│   ├── metadata.xml
│   ├── mockserver.js
│   └── mockdata/
│       └── Product.json
└── test/
    ├── integration/
    │   ├── pages/
    │   │   ├── ProductList.js       ← ListReport page object
    │   │   └── ProductObjectPage.js ← ObjectPage page object
    │   ├── FirstJourney.js          ← Test scenarios
    │   ├── opaTests.qunit.html      ← Test runner HTML
    │   └── opaTests.qunit.js        ← JourneyRunner setup
    └── testsuite.qunit.html
```

**Page Object Template (V4):**
```javascript
// pages/ProductList.js
sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';
    return new ListReport({
        appId: 'your.namespace.app',     // manifest.json: sap.app.id
        componentId: 'ProductList',       // manifest.json: routing.targets key
        contextPath: '/Product'           // V4: contextPath to root entity
    });
    // No CustomPageDefinitions needed for standard sap.fe.test scenarios
});
```

**JourneyRunner Template (V4):**
```javascript
// opaTests.qunit.js
sap.ui.require([
    "sap/fe/test/JourneyRunner",
    "your/app/test/integration/pages/ProductList",
    "your/app/test/integration/pages/ProductObjectPage",
    "your/app/test/integration/FirstJourney"
], function(JourneyRunner, ProductList, ProductObjectPage, FirstJourney) {
    "use strict";
    new JourneyRunner({
        launchUrl: sap.ui.require.toUrl("your/app") + "/test/flpSandbox.html",
        launchParameters: {
            serverDelay: 0,
            responderOn: true,
            demoApp: "product-app",
            "sap-ui-language": "EN"
        },
        opaConfig: {
            timeout: 60
        },
        pages: {
            onTheProductList: ProductList,
            onTheProductObjectPage: ProductObjectPage
        }
    }).run(FirstJourney.run);
});
```

**V2 Complete Page Object Registration Template:**
```javascript
// webapp/test/integration/opaTests.qunit.js
sap.ui.define([
  "sap/ui/test/Opa5",
  "sap/suite/ui/generic/template/integration/testLibrary/ListReport/pages/ListReport",
  "sap/suite/ui/generic/template/integration/testLibrary/ObjectPage/pages/ObjectPage",
  "./journeys/ListReportJourney",
  "./journeys/ObjectPageJourney"
], function (Opa5, ListReport, ObjectPage) {
  "use strict";

  Opa5.extendConfig({
    testLibs: {
      fioriElementsTestLibrary: {
        Common: {
          appId: "my.travel.app",
          entitySet: "TravelSet"
        }
      }
    },
    autoWait: true,
    timeout: 60,
    pollingInterval: 400,
    viewNamespace: "my.travel.app.view"
  });

  QUnit.start();
});
```

---

## Error Pattern Reference

| Pattern | Severity | Root Cause | Fix Area |
|---------|----------|------------|----------|
| `Cannot read property of undefined` | 🔴 Fatal | Page object config mismatch (`appId`, `componentId`) | `pages/*.js` config |
| `Timeout waiting for control` | 🔴 Fatal | Control not rendered (wrong selector or mock data missing) | Selector or mock data |
| `Expected 1 assertion but got 0` | 🔴 Fatal | `opaTest` has no `Then` step | Add `Then` assertion |
| Row count mismatch | 🟡 Critical | Mock data has wrong number of entries | `mockdata/*.json` |
| Field value not updated | 🟡 Critical | Wrong field name (case mismatch) or field is read-only | OData property name |
| Dialog not handled | 🟡 Critical | Cancel/Delete action triggers dialog, test doesn't handle it | Add `onDialog().iConfirm()` |
| Flaky test on slow CI | 🔵 Advisory | OPA timeout too low | Increase `opaConfig.timeout` |

---
--------------------------------
