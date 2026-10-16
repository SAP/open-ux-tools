# sap.fe.test API Guide

The `sap.fe.test` library is documented in the SAPUI5 API reference. Always use the live docs as the source of truth for method signatures and parameters - the skill does not replicate them.

**Latest version:** `https://ui5.sap.com/#/api/sap.fe.test`

**Specific UI5 version** - add the version before the hash, e.g.:
`https://ui5.sap.com/1.145.3/#/api/sap.fe.test`

Check the UI5 version your app uses in `ui5.yaml` under `framework.version`, or in `manifest.json` under `sap.ui5.dependencies.minUI5Version`. The `@sapui5/types` version in `devDependencies` of `package.json` is another indicator, but it may lag behind if not kept in sync. When in doubt, fall back to the latest version URL.

---

## Accessing the API Docs — Tool-Specific Notes

The `SAPUI5 SDK - Demo Kit` (`ui5.sap.com`) uses client-side rendering (JavaScript SPA), so the hash-based URL (`#/api/...`) content is not available to a static fetcher.

Use the first available option below:

**Option 1 — Direct WebFetch or built-in URL access:**

Agents with a browser-capable fetch (e.g. GitHub Copilot) can access `ui5.sap.com` directly — no workaround needed.

**Option 2 — Download the API JSON (preferred fallback):**

SAP publishes the full `sap.fe.test` API as a structured JSON file. Download it once per session (262 KB), then query only the symbol or method you need — never load the whole file into context.

```bash
# Download (check first to avoid re-downloading within the same session)
APIJSON="${TEMP:-/tmp}/sap.fe.test.api.json"
[ -f "$APIJSON" ] || curl -s "https://ui5.sap.com/test-resources/sap/fe/test/designtime/apiref/api.json" -o "$APIJSON"

# Look up a specific method
node -e "
const data = JSON.parse(require('fs').readFileSync((process.env.TEMP || '/tmp') + '/sap.fe.test.api.json'));
const cls = data.symbols.find(s => s.name === 'sap.fe.test.api.TableActions');
const method = cls.methods.find(m => m.name === 'iChangeFilterField');
console.log(JSON.stringify(method, null, 2));
"

# List all methods of a class to discover what's available
node -e "
const data = JSON.parse(require('fs').readFileSync((process.env.TEMP || '/tmp') + '/sap.fe.test.api.json'));
const cls = data.symbols.find(s => s.name === 'sap.fe.test.api.TableActions');
console.log(cls.methods.map(m => m.name).join('\n'));
"
```

The top-level structure is `{ symbols: [ { name, methods, ... } ] }` — search `symbols` by `name` to find a class, then `methods` by `name` to find a method. On Windows use `process.env.TEMP`; on Linux/Mac use `/tmp`.

**Option 3 — Chrome DevTools MCP (when available):**

1. Navigate to the class page, e.g.:
   `https://ui5.sap.com/#/api/sap.fe.test.api.TableActions`
2. Then navigate to the specific method anchor to trigger lazy rendering of that section:
   `https://ui5.sap.com/#/api/sap.fe.test.api.TableActions%23methods/iChangeFilterField`
3. Use `wait_for` + `take_snapshot` to read the rendered parameter table.

The `%23` is a URL-encoded `#` — required because the fragment already uses `#` for the SPA route.

**Option 4 — `node_modules` source (last resort):**

Search for the method name directly in the installed `sap.fe` package under `node_modules`. This is version-exact and always available offline:

```bash
grep -r "iChangeFilterField" node_modules/@sap/ux-ui5-tooling/node_modules --include="*.js" -l
# or search the project's own node_modules for the sap.fe runtime
grep -r "iChangeFilterField" node_modules --include="TableActions*" -l
```

Once you find the file, read the JSDoc block above the method definition for the parameter list. The source files are minified in some distributions — in that case, look for a `.d.ts` type definition file alongside the `.js`, which is always readable.

---

## Navigating the API Docs

The namespace is organized into folders. Understanding the structure lets you find any function quickly:

| Docs folder | What it contains | Accessed via |
|---|---|---|
| `sap.fe.test.ListReport` | Access points for List Report UI areas (`onFilterBar()`, `onTable()`, `onDialog()`) | `onTheListPage` in journey |
| `sap.fe.test.ObjectPage` | Access points for Object Page UI areas (`onHeader()`, `onForm()`, `onTable()`, `onFooter()`) | `onTheObjectPage` in journey |
| `sap.fe.test.TemplatePage` | Access points for FPM/custom pages | `onTheCustomPage` in journey |
| `sap.fe.test.api` | The actual action and assertion functions, organized by UI area | chained after an access point |
| `sap.fe.test.JourneyRunner` | Runner configuration | `references/v4-journeyrunner.md` |

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
| `ObjectPage` (top-level) | `iSeeObjectPageInEditMode`, `iSeeObjectPageInDisplayMode` — called directly on the page object, not via an area accessor |

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
