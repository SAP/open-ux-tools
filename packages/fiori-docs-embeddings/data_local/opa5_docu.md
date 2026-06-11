# OPA5 Integration Tests for SAP Fiori Elements applications

## Introduction
This documentation is a structured AI agent workflow for writing OPA5 integration tests against SAP Fiori Elements applications (both V4 and V2).

## Rules

### API Usage

- Always try standard `sap.fe.test` API before writing custom selectors
- Use `onFilterBar()`, `onTable()`, `onHeader()`, `onForm()`, `onFooter()`, `onDialog()` for standard interactions
- For V4 apps, use `sap/fe/test/ListReport` and `sap/fe/test/ObjectPage` as page object base classes
- For V2 apps, use `sap/suite/ui/generic/template/integration` API — never mix V4 and V2 APIs

### Test Structure

- Every `opaTest` MUST have at least one `Then` assertion — tests with 0 assertions fail
- Every journey MUST end with `iTearDownMyApp()` in a final `opaTest`
- Use Given/When/Then semantics correctly: Given=preconditions, When=actions, Then=assertions
- Method chain with `.and` for multiple actions on the same component

### Page Object Configuration

- Register all page objects in `JourneyRunner.pages` before running journeys

### Field Names

- OData property names are case-sensitive — always match exact case from `metadata.xml`
- Section IDs/labels in `onForm({section: ...})` must match `@UI.Facets` annotation label exactly
- Button labels in `iExecuteAction()` must match exact i18n text rendered in the app

### Mock Data

- Mock data property names must match `metadata.xml` entity type property names exactly
- Provide at least 2 records per entity to enable count assertions
- Value help entities must have mock data if value help tests are included
- Navigation target keys in mock data must be consistent across related entity files

### Stability

- Never use hardcoded generated control IDs — they change on re-render
- Use control type + stable properties (text, icon) for custom selectors
- When writing custom selectors, prefer OpaBuilder syntax (`sap.ui.test.OpaBuilder`) over raw `waitFor` — use `.description()` for readable success/failure messages
- Set `opaConfig.timeout` to 60 or higher for CI/CD environments
- Tests must pass consistently 3 times in a row before being considered stable

### Dialog Handling

- Any Cancel or Delete action that may trigger a confirmation dialog must handle the dialog
- Check whether a dialog appears after an action before assuming it doesn't

---

## Anti-Patterns

### API Misuse

- Do NOT write custom `waitFor` selectors when standard `sap.fe.test` API covers the scenario
- Do NOT mix V4 (`sap.fe.test`) and V2 (`sap.suite.ui.generic.template`) API in the same test
- Do NOT use hardcoded generated IDs like `'__xmlview0--list--0'` — they are unstable
- Do NOT skip `iTearDownMyApp()` at the end of a journey

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

## V4: Fiori Elements V4

### Category 01: App Startup & Page Visibility

**Standard Patterns:**
```javascript
// V4 - Start app and verify page
Given.iStartMyApp();
Then.onTheListReport.iSeeThisPage();

// V4 - Navigate to Object Page and verify
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
// Set filter and execute search
When.onTheListReport.onFilterBar()
    .iChangeFilterField("CategoryId", "CAT001")
    .and.iExecuteSearch();

// Check filter value is set correctly
Then.onTheListReport.onFilterBar()
    .iCheckFilterField("CategoryId", "CAT001");

// Multiple filters
When.onTheListReport.onFilterBar()
    .iChangeFilterField("Status", "Active")
    .and.iChangeFilterField("Category", "Electronics")
    .and.iExecuteSearch();

// Open filter adaptation panel
When.onTheListReport.onFilterBar().iOpenFilterAdaptation();
When.onTheListReport.onFilterBar().iConfirmFilterAdaptation();
When.onTheListReport.onFilterBar().iCancelFilterAdaptation();

// Reset all active filters
When.onTheListReport.onFilterBar().iResetFilters();
```

**Pattern: FilterBar Field Not Found (🟡 Category 02)**

**Symptom**: Timeout on `iChangeFilterField("fieldName", ...)`
**Root Cause**: Field name doesn't match OData property name (case-sensitive)

```javascript
// ❌ WRONG: camelCase doesn't match OData property
When.onTheListReport.onFilterBar().iChangeFilterField("categoryId", "CAT001");

// ✅ FIXED: Match exact OData property name from metadata.xml
// metadata.xml: <Property Name="CategoryId" .../>
When.onTheListReport.onFilterBar().iChangeFilterField("CategoryId", "CAT001");
```

**Fix for value-help-backed FilterField:**
```javascript
// ❌ FAILS: iChangeFilterField times out for VH-backed fields
When.onTheListReport.onFilterBar().iChangeFilterField("SalesDocument", "4026");

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
When.onTheListReport.onTable().iPressRow(0);           // by index
When.onTheListReport.onTable().iPressRow({ProductID: "HT-1000"}); // by field value

// Assert row count
Then.onTheListReport.onTable().iCheckRows(5);          // exact count
Then.onTheListReport.onTable().iCheckRows({Status: "Active"}, 3); // filtered count

// Select rows (for mass actions)
When.onTheListReport.onTable().iSelectRows({ProductID: "HT-1000"});
When.onTheListReport.onTable().iSelectAllRows();
When.onTheListReport.onTable().iDeselectAllRows();

// Check selected rows
Then.onTheListReport.onTable().iCheckSelectedRows(2);

// Sort table by column
When.onTheListReport.onTable().iChangeSorting("ProductName");     // toggle sort
When.onTheListReport.onTable().iChangeSorting("ProductName", true); // ascending

// Check a specific cell value by row index and column name
Then.onTheListReport.onTable().iCheckCellValue(0, "ProductName", "Laptop");
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
// List Report toolbar action
When.onTheListReport.onHeader().iExecuteAction("Export to Spreadsheet");

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
```

**Fix: Enable edit mode before accessing edit-only actions:**
```javascript
When.onTheObjectPage.onHeader().iExecuteEdit();
Then.onTheObjectPage.iSeeObjectPageInEditMode();
When.onTheObjectPage.onHeader().iExecuteAction("Approve");
```

---

### Category 05: Form Field Operations

**Standard Patterns:**
```javascript
// Must be in edit mode first
When.onTheObjectPage.onHeader().iExecuteEdit();

// Change field in a specific section
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iChangeField("ProductName", "Updated Name");

When.onTheObjectPage.onForm({section: "PricingSection"})
    .iChangeField("Price", "99.99");

// Check field value
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField("ProductName", "Updated Name");

// Open value help from form field
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iOpenValueHelp("Category");
```

**Fix: Section reference must match the facet ID:**
```javascript
// Fix: Use exact section title from @UI.Facets annotation
// @UI.Facets: [{ Label: 'General Information', ... }]
When.onTheObjectPage.onForm({section: "GeneralInformation"})
    .iChangeField("Name", "Test");
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

// Cancel changes
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
// ✅ Fill all required fields before save
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iChangeField("Name", "My Product")
    .and.iChangeField("Price", "49.99");
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

// Check dialog title
Then.onTheObjectPage.onDialog().iCheckDialogTitle("Confirm Deletion");
```

**Fix: Fill required dialog fields before confirming:**
```javascript
When.onTheObjectPage.onDialog()
    .iChangeDialogField({property: "RejectionReason"}, "Not applicable")
    .and.iConfirm();
```

---

### Category 08: Section Navigation

**Standard Patterns:**
```javascript
// Navigate to a section by title
When.onTheObjectPage.iGoToSection("Stock Status");

// Check section is visible/active
Then.onTheObjectPage.iCheckSection("Stock Status");

// Expand / collapse sections
When.onTheObjectPage.iExpandSection("Additional Info");
When.onTheObjectPage.iCollapseSection("Additional Info");
```

**Fix: Use exact section title — read from MCP or annotation:**
```javascript
// If fiori MCP available: list_functionality(appPath) returns section config with labels
// Fallback: check @UI.Facets annotation label in metadata or CDS view
// @UI.Facets: [{ Label: 'Stock Status', ... }]
When.onTheObjectPage.iGoToSection("Stock Status");  // ← must match exactly
```

---

### Category 09: Value Help

**Standard Patterns:**
```javascript
// Open value help from form field
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iOpenValueHelp("Category");

// Select row in value help
When.onTheObjectPage.onValueHelpDialog()
    .iSelectRows({CategoryId: "CAT001"});

// Search within value help dialog
When.onTheObjectPage.onValueHelpDialog()
    .iChangeSearchField("Elec")
    .and.iExecuteSearch();

// Confirm selection
When.onTheObjectPage.onValueHelpDialog().iConfirm();

// Check field was updated
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField("Category", "Electronics");
```

**Fix: Ensure VH entity has mock data:**
```javascript
// localService/mockdata/Category.json must exist with valid entries
When.onTheObjectPage.onValueHelpDialog()
    .iSelectRows({CategoryId: "CAT001"}) // CAT001 must exist in Category.json
    .and.iConfirm();
```

---

### Category 10: Draft Handling

**Standard Patterns:**
```javascript
// Enter draft edit mode
When.onTheObjectPage.onHeader().iExecuteEdit();
Then.onTheObjectPage.iSeeObjectPageInEditMode();

// Make changes and activate
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iChangeField("Name", "Draft Name");
When.onTheObjectPage.onFooter().iExecuteSave();
Then.onTheObjectPage.iSeeObjectPageInDisplayMode();
Then.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iCheckField("Name", "Draft Name");

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
When.onTheObjectPage.iGoToSection("Items");

// Create new sub-entity
When.onTheObjectPage.onTable({property: "items"}).iExecuteCreate();

// Navigate into sub-object
When.onTheObjectPage.onTable({property: "items"}).iPressRow(0);

// Check sub-table rows
Then.onTheObjectPage.onTable({property: "items"}).iCheckRows(3);
```

---

### Category 12: Custom Selectors (Last Resort)

**Use only when standard `sap.fe.test` API cannot cover the scenario.**

**Preferred syntax: OpaBuilder** (`sap.ui.test.OpaBuilder`, available since UI5 1.74)

```javascript
// ✅ PREFERRED — OpaBuilder syntax (cleaner, auto error messages)
var CustomPageDefinitions = {
    actions: {
        iClickMyBuildingBlockButton: function() {
            return OpaBuilder.create(this)
                .hasType("sap.m.Button")
                .hasProperties({ text: "My Building Block Button" })
                .doPress()
                .description("Pressing building block button")
                .execute();
        }
    },
    assertions: {
        iSeeCustomBanner: function(expectedText) {
            return OpaBuilder.create(this)
                .hasType("sap.m.MessageStrip")
                .has(function(oControl) { return oControl.getText() === expectedText; })
                .description("Custom banner visible: " + expectedText)
                .execute();
        }
    }
};

// ❌ RAW waitFor — acceptable but verbose; prefer OpaBuilder above
var CustomPageDefinitions = {
    actions: {
        iClickMyBuildingBlockButton: function() {
            return this.waitFor({
                controlType: "sap.m.Button",
                properties: { text: "My Building Block Button" },
                actions: new Press(),
                errorMessage: "Could not find building block button"
            });
        }
    }
};
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
    id: IdBase + "--MRPElement",  // SAPUI5 control ID (no -arrow suffix here)
    actions: new Press({
        idSuffix: "arrow"          // DOM sub-element suffix for the dropdown arrow
    })
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

// ✅ CORRECT — ComboBox picker renders sap.m.StandardListItem; match by title (i18n text)
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
    errorMessage: "ObjectIdentifier not found"
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

### Category 14: ObjectPage Navigation Buttons

**Standard Patterns:**
```javascript
// Navigate to the next record (down arrow)
When.onTheObjectPage.onHeader().iPressNavigateDownButton();
Then.onTheObjectPage.iSeeThisPage();

// Navigate to the previous record (up arrow)
When.onTheObjectPage.onHeader().iPressNavigateUpButton();
Then.onTheObjectPage.iSeeThisPage();
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

The V2 test library uses a completely different API. Never mix V4 and V2.

### V2 API Comparison

| Task | V4 (`sap.fe.test`) | V2 (`fioriElementsTestLibrary`) |
|------|--------------------|--------------------------------------|
| Start app | `Given.iStartMyApp()` | `Given.iStartMyAppInAFrame("./index.html")` |
| Search | `onFilterBar().iExecuteSearch()` | `iExecuteTheSearch()` |
| Check rows | `onTable().iCheckRows(n)` | `theResultListContainsTheCorrectNumberOfItems(n)` |
| Navigate to item | `onTable().iPressRow(0)` | `iNavigateFromListItemByLineNo({ iIndex: 0 })` |
| Check OP title | `onHeader().iCheckTitle(...)` | `theObjectPageHeaderTitleIsCorrect(...)` |
| Edit | `onHeader().iExecuteEdit()` | `iClickTheEditButton()` |
| Save | `onFooter().iExecuteSave()` | `iSaveTheDraft()` |
| Page scope | Chained: `onTable().iCheckRows()` | Flat: `theResultListContainsTheCorrectNumberOfItems()` |

### V2 Setup and Configuration

```javascript
// Import page objects for V2
sap.ui.define([
  "sap/suite/ui/generic/template/integration/testLibrary/ListReport/pages/ListReport",
  "sap/suite/ui/generic/template/integration/testLibrary/ObjectPage/pages/ObjectPage"
], function (ListReport, ObjectPage) { ... });

// Configure via Opa5.extendConfig
Opa5.extendConfig({
  testLibs: {
    fioriElementsTestLibrary: {
      Common: {
        appId: "my.application.id",   // from manifest.json sap.app.id
        entitySet: "MyEntitySet"      // primary entity set
      }
    }
  },
  autoWait: true,
  timeout: 60,
  pollingInterval: 400
});
```

### V2 ListReport Actions

| Method | Parameters | Description |
|--------|-----------|-------------|
| `iExecuteTheSearch()` | — | Clicks the Go/Search button on the filter bar |
| `iSetTheSearchField(sText)` | `sText: string` | Sets text in the basic search field |
| `iSetTheFilter({Field, Value})` | `Field: string, Value: string` | Sets a filter field by label |
| `iNavigateFromListItemByLineNo({iIndex, sTableId})` | `iIndex: number` (0-based), `sTableId?: string` | Navigates to Object Page by clicking a row |
| `iNavigateFromListItemByFieldValue({Field, Value})` | `Field: string, Value: string` | Navigates by matching a specific field value |
| `iSelectListItemsByLineNo([indices], bSelect, iTabIndex)` | `indices: number[]`, `bSelect: boolean` | Selects/deselects rows by index array |
| `iClickTheCreateButton()` | — | Clicks the Create button on the list report toolbar |
| `iClickOnIconTabFilter(sKey)` | `sKey: string` | Clicks an IconTabBar filter tab by key |

### V2 ListReport Assertions

| Method | Parameters | Description |
|--------|-----------|-------------|
| `theResultListIsVisible()` | — | Confirms the result table is rendered and visible |
| `theResultListContainsTheCorrectNumberOfItems(iItems, sTabKey)` | `iItems: number`, `sTabKey?: string` | Asserts exact row count |
| `theResultListFieldHasTheCorrectValue({Line, Field, Value}, iTabIndex)` | `Line: number`, `Field: string`, `Value: string` | Asserts a cell value at specific row/field |
| `iShouldSeeTheMessageToastWithText(sExpectedText)` | `sExpectedText: string` | Asserts a message toast with specific text. **Requires autoWait: false** |
| `checkButtonEnablement(sName, bEnabled)` | `sName: string`, `bEnabled: boolean` | Asserts whether a named button is enabled or disabled |

### V2 ObjectPage Actions

| Method | Parameters | Description |
|--------|-----------|-------------|
| `iClickTheEditButton()` | — | Clicks the Edit button to enter edit mode |
| `iCancelTheDraft()` | — | Clicks Cancel and discards the draft |
| `iSaveTheDraft(bNonDraft)` | `bNonDraft?: boolean` | Saves the draft. Pass `true` for non-draft save |
| `iSelectTheOptionFromDiscardDraftPopUp(sOption)` | `sOption: string` | Selects "Keep Draft" or "Discard" in the discard dialog |
| `iSetTheObjectPageDataField(sFieldGroup, sFieldName, sValue, sFieldGroupID)` | `sFieldGroup: string`, `sFieldName: string`, `sValue: string` | Sets a field value |
| `iSelectSectionOrSubSectionByName(sSectionText, sSubSectionText, iNthOP)` | `sSectionText: string` | Navigates to a section by label text |
| `iNavigateFromObjectPageTableByLineNo(sNavigationProperty, iIndex, sEntitySet, sTableId)` | `sNavigationProperty: string`, `iIndex: number` | Navigates from a sub-table row |

### V2 ObjectPage Assertions

| Method | Parameters | Description |
|--------|-----------|-------------|
| `theObjectPageIsInDisplayMode()` | — | Asserts the Object Page is in read-only display mode |
| `theObjectPageIsInEditMode()` | — | Asserts the Object Page is in edit mode |
| `theObjectPageHeaderTitleIsCorrect(sTitle, sEntitySet)` | `sTitle: string` | Asserts the Object Page header title |
| `theObjectPageDataFieldHasTheCorrectValue({Field, Value})` | `Field: string`, `Value: string` | Asserts a field value |
| `iShouldSeeTheSections(aSections)` | `aSections: string[]` | Asserts all listed section titles are visible |
| `iShouldSeeTheDialogWithTitle(sTitle)` | `sTitle: string` | Asserts a dialog with the given title is open |

### V2 FCL (Flexible Column Layout)

| Method | Parameters | Description |
|--------|-----------|-------------|
| `iSetTheFCLLayout(sLayout)` | `sLayout: string` | Programmatically sets the FCL layout (e.g., `"TwoColumnsMidExpanded"`) |
| `iClickTheFCLActionButton(sButtonId)` | `"fullScreen"\|"exitFullScreen"\|"closeColumn"` | Clicks FCL column action buttons |
| `iCheckFCLLayout(sLayout)` | `sLayout: string` | Asserts the current FCL layout |

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

### V2 ALP (Analytical List Page) — Visual Filter

| Method | Parameters | Description |
|--------|-----------|-------------|
| `iSelectVFChart(sChartType, value, bSearchOpenDialogs, sFieldName)` | `sChartType: string`, `value: string` | Selects a value in a Visual Filter chart |
| `iDeselectVFChart(sChartType, value)` | `sChartType: string`, `value: string` | Deselects a value in a Visual Filter chart |

### V2-Specific Gotchas

**autoWait must be false for message toast:**
```javascript
// V2 message toast check
Then.waitFor({
  autoWait: false,
  check: function () {
    return sap.m.MessageToast._current && sap.m.MessageToast._current.getText() === sExpectedText;
  }
});
// Or use the library method which handles this internally:
Then.onTheListReportPage.iShouldSeeTheMessageToastWithText("Item saved");
```

**iNavigateFromListItemByLineNo uses 0-based index:**
```javascript
When.onTheListReportPage.iNavigateFromListItemByLineNo({ iIndex: 0 });
// With specific table ID:
When.onTheListReportPage.iNavigateFromListItemByLineNo({ iIndex: 2, sTableId: "responsiveTable" });
```

**iSaveTheDraft — pass true for non-draft apps:**
```javascript
When.onTheObjectPage.iSaveTheDraft();       // for draft-enabled apps
When.onTheObjectPage.iSaveTheDraft(true);   // for non-draft apps
```

**ObjectPage sub-table navigation requires navigation property name (NOT section label):**
```javascript
// "to_Item" is the OData navigation property name from metadata.xml
When.onTheObjectPage.iNavigateFromObjectPageTableByLineNo("to_Item", 0, "SalesOrder");
```

**iClickTheEditButton — may be iClickTheEditButtonOnTheObjectPage in older library versions:**
```javascript
When.onTheObjectPage.iClickTheEditButton();
// or in older library versions:
When.onTheObjectPage.iClickTheEditButtonOnTheObjectPage();
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
