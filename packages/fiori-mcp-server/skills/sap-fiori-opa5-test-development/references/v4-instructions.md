# OData V4 - `sap.fe.test` Library

## Generated Test Structure

When SAP Fiori tools generates an application, the integration test scaffold is created automatically (e.g. under `webapp/test/integration/` for ui5 cli type `application`).
The journey and page object files are always physically present:

```
webapp/test/integration/
├── FirstJourney.js         <- starter journey: start app, load table, navigate, teardown
└── pages/
    ├── JourneyRunner.js    <- shared JourneyRunner instance (Fiori-specific)
    ├── <EntityName>.js     <- ListReport page object per entity
    └── <Entity>ObjectPage.js <- ObjectPage page object per entity
```

Journey and page object files can be JavaScript (`.js`) or TypeScript (`.ts`) - both are supported. When the project uses TypeScript, generate `.ts` files and import them accordingly.

The test suite entry point (`opaTests.qunit.html` and `OpaTests.qunit.js`) may or may not be physically present - see `SKILL.md` "Test Endpoint and Running Tests" section for details on virtual vs. physical setup.

### Regenerating Test Files

Use the **Application Info** command in SAP Fiori tools (VS Code extension or SAP Business Application Studio) to regenerate journey files. The tooling inspects the project's OData annotations via `@sap/ux-specification` to produce tests reflecting the actual features (filter bars, tables, actions, navigation) at generation time.

> Regeneration overwrites existing generated files. Always keep custom test logic in separate journey files to avoid it being overwritten.

---

## JourneyRunner Configuration

SAP Fiori Elements apps use `sap.fe.test.JourneyRunner` instead of raw `Opa5.extendConfig`. This is the key structural difference from generic OPA5 projects.

**Never call `Opa5.extendConfig` directly in V4 projects.** All OPA configuration - including `autoWait`, `timeout`, and other options - must go through the `opaConfig` property of the `JourneyRunner` constructor in `pages/JourneyRunner.js`.

```javascript
const runner = new JourneyRunner({
    launchUrl: ...,
    pages: { ... },
    async: true,
    opaConfig: {
        autoWait: true,
        timeout: 60    // increase from default 15 for CI/CD environments
    }
});
```

Read `references/v4-journeyrunner.md` for the full configuration reference, including:
- How to determine the tile name for `iStartMyApp()` - from config or manifest
- The `pages` map and page object registration
- The portable journey pattern (`runner.run([journey])`)
- How to add new journeys without changing the central runner

---

## Page Object Pattern

Each page in the application gets one page object file extending the corresponding `sap.fe.test` base class. There are three base classes covering all standard SAP Fiori Elements floorplans:

| Base class | Import | Covers |
|---|---|---|
| `ListReport` | `sap/fe/test/ListReport` | List Report, Analytical List Page (ALP), Worklist |
| `ObjectPage` | `sap/fe/test/ObjectPage` | Object Page, sub-object pages, Form Entry Object Page |
| `TemplatePage` | `sap/fe/test/TemplatePage` | FPM custom pages (minimal built-in API) |

Overview Page has no `sap.fe.test` support. FCL (Flexible Column Layout) has no dedicated class - use the same `ListReport`/`ObjectPage` objects for the individual targets within the FCL.

**Example - List Report page object (JavaScript):**
```javascript
sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    const CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.myorg.myapp',       // sap.app.id from manifest.json
            componentId: 'EntityNameList',  // routing target key from manifest.json
            contextPath: '/EntityName'      // leading slash + entity set name
        },
        CustomPageDefinitions
    );
});
```

**Example - List Report page object (TypeScript):**
```typescript
import ListReport from "sap/fe/test/ListReport";

const customActions = {};
const customAssertions = {};

export default new ListReport(
    {
        appId: "com.myorg.myapp",
        componentId: "EntityNameList",
        contextPath: "/EntityName"
    },
    { actions: customActions, assertions: customAssertions }
);
```

**Example - Object Page page object:**
```javascript
sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    const CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.myorg.myapp',
            componentId: 'EntityNameObjectPage',
            contextPath: '/EntityName'      // leading slash + entity set name
        },
        CustomPageDefinitions
    );
});
```

> **V4 uses `contextPath` or `entitySet`** in the page object config - both are accepted. `contextPath: '/EntityName'` (leading slash + entity set name) is the modern form; `entitySet: 'EntityName'` (no leading slash) also works. Wrong values cause `iSeeThisPage()` to time out immediately.

Custom application-specific test functions go into `CustomPageDefinitions.actions` or `CustomPageDefinitions.assertions`.

For API navigation, naming conventions, identifier patterns, and chaining, read `references/v4-sap-fe-test-api-guide.md`.

---

## Common Anti-Patterns

**Cancel and Delete actions may trigger a confirmation dialog - always handle it.**

```javascript
// ❌ Cancel without handling the discard dialog - next assertion times out
When.onTheObjectPage.onFooter().iExecuteCancel();
Then.onTheObjectPage.iSeeObjectPageInDisplayMode();

// ✅ Confirm the discard dialog first
When.onTheObjectPage.onFooter().iExecuteCancel();
When.onTheObjectPage.onDialog().iConfirm();
Then.onTheObjectPage.iSeeObjectPageInDisplayMode();
```

**Always assert navigation target is reached before interacting with it.**

```javascript
// ❌ Calling iExecuteEdit() without confirming the object page loaded
When.onTheListReport.onTable().iPressRow(0);
When.onTheObjectPage.onHeader().iExecuteEdit();

// ✅ Assert the page is visible first
When.onTheListReport.onTable().iPressRow(0);
Then.onTheObjectPage.iSeeThisPage();
When.onTheObjectPage.onHeader().iExecuteEdit();
Then.onTheObjectPage.iSeeObjectPageInEditMode();
```

---

## SAPUI5 API Reference

The complete `sap.fe.test` API is documented at:
`https://ui5.sap.com/#/api/sap.fe.test` (latest version)

To browse the API for a specific UI5 version, add the version before the hash:
`https://ui5.sap.com/1.145.3/#/api/sap.fe.test`

Check the UI5 version your app uses in `ui5.yaml` under `framework.version`, or in `manifest.json` under `sap.ui5.dependencies.minUI5Version`.

Read `references/v4-sap-fe-test-api-guide.md` for guidance on how to navigate the docs, understand the API structure, and look up specific functions.

---

## Patterns and Fixes by UI Area

Use this section when a test is failing or timing out. Find the symptom, check the root cause, apply the fix.

### App Startup - `iSeeThisPage()` times out immediately

**Root cause:** `componentId` or `appId` in the page object constructor does not match `manifest.json`.

```javascript
// ❌ Wrong - componentId doesn't match manifest routing target
return new ListReport({
    appId: 'my.app',
    componentId: 'ListReport',   // manifest has 'ProductList'
    contextPath: '/Product'
});

// ✅ Fixed - match the exact key from manifest.json "targets" object
// manifest.json: "targets": { "ProductList": { ... } }
return new ListReport({
    appId: 'my.namespace.app',   // sap.app.id from manifest.json
    componentId: 'ProductList',  // exact key from targets object
    contextPath: '/Product'      // leading slash + entity set name
});
```

### FilterBar - field not found (timeout on `iChangeFilterField`)

**Root cause:** Field name doesn't match the OData property name - it is case-sensitive.

```javascript
// ❌ Wrong - wrong casing
When.onTheListReport.onFilterBar().iChangeFilterField("categoryId", "CAT001");

// ✅ Fixed - match exact Property Name from metadata.xml
// metadata.xml: <Property Name="CategoryId" .../>
When.onTheListReport.onFilterBar().iChangeFilterField("CategoryId", "CAT001");
```

### FilterBar - value-help-backed field times out

**Root cause:** `iChangeFilterField` cannot type into value-help-backed inputs directly.

**Fix:** Target the `-inner` input directly with `EnterText`. Do NOT add `idSuffix: "inner"` when the id already ends in `-inner` - that creates a double suffix `-inner-inner` which doesn't exist.

```javascript
// ❌ Wrong - iChangeFilterField times out for VH-backed fields
When.onTheListReport.onFilterBar().iChangeFilterField("SalesDocument", "4026");

// ✅ Fixed - target the inner input directly
// Replace {appId}, {pageId}, {entitySet} with real values from manifest.json and the browser debugger
iFillSalesDocument: function(sValue) {
    this.waitFor({
        id: "{appId}::{pageId}--fe::FilterBar::{entitySet}::FilterField::SalesDocument-inner",
        actions: new EnterText({ text: sValue })
        // No idSuffix here - the id already ends in -inner
    });
}
```

### Table - row not found (timeout on `iPressRow`)

**Root cause:** Mock data file missing, or key value doesn't match exactly.

```javascript
// Fix 1: Ensure mock data exists and contains the record
// webapp/localService/mainService/data/Product.json
[{ "ProductID": "HT-1000", "ProductName": "Notebook Basic 15" }]

// Fix 2: Use index-based navigation if key value is unknown
When.onTheListReport.onTable().iPressRow(0);
```

### Save - page stays in edit mode after `iExecuteSave()`

**Root cause:** Validation error on the backend, or a mandatory field was left empty.

**Fix:** Ensure all mandatory fields are filled before saving.

```javascript
When.onTheObjectPage.onHeader().iExecuteEdit();
Then.onTheObjectPage.iSeeObjectPageInEditMode();
When.onTheObjectPage.onForm({section: "GeneralInfo"})
    .iChangeField("Name", "My Product")
    .and.iChangeField("Price", "49.99");  // fill all required fields
When.onTheObjectPage.onFooter().iExecuteSave();
Then.onTheObjectPage.iSeeObjectPageInDisplayMode();
```

### Sub-table on Object Page

Use `onTable({property: "items"})` where `"items"` is the OData navigation property name (not the section label).

```javascript
// Navigate to the section first
When.onTheObjectPage.iGoToSection({ section: "Items" });

// Create a new sub-entity
When.onTheObjectPage.onTable({property: "items"}).iExecuteCreate();

// Navigate into a sub-object
When.onTheObjectPage.onTable({property: "items"}).iPressRow(0);

// Assert row count
Then.onTheObjectPage.onTable({property: "items"}).iCheckRows(3);
```

### Chart / Analytical List Page (ALP)

```javascript
// Select a data point
When.onTheListReport.onChart().iSelectDataPoint({Status: "Active"});

// Deselect a data point
When.onTheListReport.onChart().iDeselectDataPoint({Status: "Active"});

// Assert current chart type
Then.onTheListReport.onChart().iCheckChartType("Bar");
```

### ObjectPage - navigate between records

```javascript
// Navigate to the next record
When.onTheObjectPage.onHeader().iPressNavigateDownButton();
Then.onTheObjectPage.iSeeThisPage();

// Navigate to the previous record
When.onTheObjectPage.onHeader().iPressNavigateUpButton();
Then.onTheObjectPage.iSeeThisPage();
```

### Custom selectors

When the standard `sap.fe.test` API cannot cover a scenario, use custom selectors as a last resort. A good signal that you need one: the standard `onFilterBar()`, `onTable()`, `onHeader()`, `onForm()`, `onFooter()`, or `onDialog()` chain has no method matching your UI element, or the element is a custom extension control not generated by Fiori Elements. Read `references/v4-custom-selectors.md` for the full guide including OpaBuilder syntax, CustomFilterField runtime ID patterns, ComboBox item selection, and common suffix pitfalls.

For ready-made snippets without the debugging context, see `references/v4-standard-patterns.md`.

---

## Error Pattern Quick Reference

| Symptom | Severity | Root cause | Fix area |
|---|---|---|---|
| `iSeeThisPage()` times out immediately | Fatal | Wrong `appId` or `componentId` in page object | Page object constructor |
| `Cannot read property of undefined` | Fatal | Page object config mismatch | Page object constructor |
| `Timeout waiting for control` | Fatal | Wrong selector or mock data missing | Selector or mock data |
| `Expected 1 assertion but got 0` | Fatal | `opaTest` has no `Then` step | Add `Then` assertion |
| Row count mismatch | Critical | Mock data has wrong number of entries | Mock data JSON files |
| Field value not updated | Critical | Wrong field name (case mismatch) or field is read-only | OData property name |
| Dialog not handled | Critical | Cancel/Delete triggers dialog, test doesn't handle it | Add `onDialog().iConfirm()` |
| Save stays in edit mode | Critical | Mandatory field empty or backend validation error | Fill required fields |
| Flaky test on CI | Advisory | OPA timeout too low (default 15s) | `opaConfig.timeout: 60` in JourneyRunner |
