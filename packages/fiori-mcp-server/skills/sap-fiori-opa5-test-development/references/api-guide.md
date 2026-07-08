# sap.fe.test API Guide

The `sap.fe.test` library is documented in the SAPUI5 API reference. Always use the live docs as the source of truth for method signatures and parameters - the skill does not replicate them.

**Latest version:** `https://ui5.sap.com/#/api/sap.fe.test`

**Specific UI5 version** - add the version before the hash, e.g.:
`https://ui5.sap.com/1.145.3/#/api/sap.fe.test`

Check the UI5 version your app uses in `ui5.yaml` under `framework.version`, or in `manifest.json` under `sap.ui5.dependencies.minUI5Version`. The `@sapui5/types` version in `devDependencies` of `package.json` is another indicator, but it may lag behind if not kept in sync. When in doubt, fall back to the latest version URL.

---

## Navigating the API Docs

The namespace is organized into folders. Understanding the structure lets you find any function quickly:

| Docs folder | What it contains | Accessed via |
|---|---|---|
| `sap.fe.test.ListReport` | Access points for List Report UI areas (`onFilterBar()`, `onTable()`, `onDialog()`) | `onTheListPage` in journey |
| `sap.fe.test.ObjectPage` | Access points for Object Page UI areas (`onHeader()`, `onForm()`, `onTable()`, `onFooter()`) | `onTheObjectPage` in journey |
| `sap.fe.test.TemplatePage` | Access points for FPM/custom pages | `onTheCustomPage` in journey |
| `sap.fe.test.api` | The actual action and assertion functions, organized by UI area | chained after an access point |
| `sap.fe.test.JourneyRunner` | Runner configuration | `references/journeyrunner.md` |

The pattern is always: **page object** → **area accessor** → **action or assertion**.

```javascript
Then.onTheListPage          // page object (registered in JourneyRunner)
    .onTable()              // area accessor (from sap.fe.test.ListReport)
    .iCheckRows(5);         // action/assertion (from sap.fe.test.api.TableAssertions)
```

The `sap.fe.test.api` folder is where the actual functions live. It is split by UI area:

| API section | Functions |
|---|---|
| `FilterBarActions` / `FilterBarAssertions` | `iExecuteSearch`, `iChangeFilterField`, ... |
| `TableActions` / `TableAssertions` | `iCheckRows`, `iSelectRows`, `iPressRow`, `iExecuteDelete`, ... |
| `HeaderActions` / `HeaderAssertions` | `iExecuteEdit`, `iCheckTitle`, `iCheckEdit`, `iCheckAction`, ... |
| `FormActions` / `FormAssertions` | `iChangeField`, `iCheckField`, ... |
| `FooterActions` / `FooterAssertions` | `iExecuteSave`, `iCheckSave`, ... |
| `DialogActions` / `DialogAssertions` | `iConfirm`, `iCancel`, ... |
| `BaseAssertions` | `iSeeThisPage`, `iSeeMessageToast`, ... |

---

## Function Naming Conventions

All functions follow a consistent naming scheme:

| Prefix | Meaning |
|---|---|
| `iExecute...` | Press a standard button (Go, Edit, Save, Delete) |
| `iCheck...` | Assert content, visibility, or enablement |
| `iChange...` | Change the value of a field |
| `iAdd/iRemove...` | Add or remove items from a list (e.g. filter fields) |
| `iPress...` | Click a table row or cell |

---

## Identifier Pattern

Almost all functions take an **identifier** as their first parameter to locate the UI element. Two forms:

- **String** - matches by the visible UI label: `"Agency"`, `"Status"`, `"General Information"`
- **Object** - matches by internal stable ID parts derived from OData annotations

```javascript
// String form - quick, readable, but label-dependent
Then.onTheObjectPage.onForm("General Information").iCheckField("Agency", "Hot Socks Travel");

// Object form - stable across label changes; IDs come from metadata annotations
Then.onTheObjectPage
    .onForm({ section: "GeneralInfo", fieldGroup: "Travel" })
    .iCheckField({ property: "AgencyID" }, { value: "70007", description: "Hot Socks Travel" });
```

For the object form, find the IDs in your service's `metadata.xml`:
- `CollectionFacet ID` → `section`
- `ReferenceFacet ID` → `fieldGroup`
- OData property name → `property`

Use strings for quick tests; use objects for long-term stability.

---

## Chaining

Functions within the same UI area chain with `.and.`:

```javascript
Then.onTheTravelList.onTable()
    .iCheckRows(5)
    .and.iCheckRows({ "Travel": "2" })
    .and.iCheckRows({ "Customer": "Ryan (594)" });
```

To switch UI areas, use `.and.then.` to return to the page object, then call the next area accessor:

```javascript
Then.onTheTravelObjectPage
    .onHeader()
        .iCheckEdit({ visible: true, enabled: false })
        .and.iCheckAction({ service: "com.myservice", action: "MyAction" }, { visible: true, enabled: false })
        .and.then.onFooter()
            .iCheckSave({ visible: true, enabled: true });
```

`.and.` stays in the current area. `.and.then.` returns to the page object so you can pick a different area.

---

## Shell and Base Assertions

Two functions sit outside the page objects:

**`onTheShell.iNavigateBack()`** - presses the FLP back button. Requires the app to have been launched via `iStartMyApp()`.

**`iSeeMessageToast("text")`** - base assertion, called directly on `Then` with no page or area qualifier:
```javascript
Then.iSeeMessageToast("Object saved.");
```
