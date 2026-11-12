---
name: sap-fiori-building-blocks
description: Add SAP Fiori Elements building blocks (Table, Chart, FilterBar, Field, Form, Page, Rich Text Editor, and custom column/filter/form-field/action) to an FPM view or fragment using the Fiori MCP server's add-building-block functionality (list_functionality → get_functionality_details → execute_functionality). Use when asked to add a building block, macro, table, chart, filter bar, or notes editor to a Fiori Elements app.
argument-hint: building block type (table/chart/filter-bar/field/form/page/rich-text-editor/custom-column/custom-filter-field/custom-form-field/action), the target page, and the annotation path or target property
metadata:
  author: sap-fiori-tools
  version: "0.0.1"
---

# SAP Fiori Elements Building Blocks

## Purpose

Add Fiori Elements **building blocks** (sap.fe macros) to a Flexible Programming Model (FPM) view or fragment.
This skill is the **"before"** — gathering the prerequisites (which annotation, which view, which aggregation
point). The **Fiori MCP server's `add-building-block` functionality** is the **"do it"** — it calls the same
generator as the SAP Page Editor (`@sap-ux/fe-fpm-writer`), so the XML, namespaces, and `manifest.json`
dependencies are always correct.

**Never hand-write building block XML or use write_file/edit_file on the view.** Manual XML produces wrong
namespaces, missing `sap.fe.macros` manifest entries, and hallucinated attributes. The `execute_functionality`
call with `functionalityId: "add-building-block"` is the only correct path.

## Scope

This skill **adds an existing building block** to an app. It does **not** author a new building-block *type* — that
is a separate developer task in `@sap-ux/fe-fpm-writer` (new macro, templates, prompts) and is out of scope here.

---

## Prerequisites

- ✅ **Fiori MCP Server** connected (provides the `list_functionality`, `get_functionality_details`,
  `execute_functionality`, and `search_docs` tools).
- ✅ An existing **FPM application** with a custom page or custom fragment to insert into. This tool inserts a
  building block into an existing view/fragment; it does not scaffold a page. If there is no FPM custom page yet,
  create one first (e.g. via the app-generation / page-modification tools).
- ✅ **Scope: OData/non-CAP apps.** For **Table, FilterBar, Form, and Chart** the tool **auto-writes the required UI
  annotation shell** (`@UI.LineItem`, `@UI.SelectionFields`, `@UI.FieldGroup`, `@UI.Chart`) into the app's annotation file when
  it does not already exist — you do not need to create it first. For other standard building blocks, and for **CAP
  (CDS) projects** (out of scope — the tool does not write `.cds`), the required UI annotation must already exist in
  the model before you call the tool. If unsure, check the annotation file first.

---

## Supported building block types

| buildingBlockType | Use for | Binding |
|---|---|---|
| `table` | list / line items | `metaPath` → `@com.sap.vocabularies.UI.v1.LineItem` |
| `chart` | graph / analytics | `metaPath` → `@com.sap.vocabularies.UI.v1.Chart` |
| `filter-bar` | search / filters | `metaPath` → `@com.sap.vocabularies.UI.v1.SelectionFields` |
| `field` | single property / value | `metaPath` → annotation path for the property |
| `form` | details section | `metaPath` → FieldGroup / property path |
| `page` | custom page layout | — |
| `rich-text-editor` | notes / rich text | `metaPath` → bound property path (e.g. `/Products/description`) |
| `rich-text-editor-button-groups` | RTE toolbar config | — |
| `custom-column` | extra table column | no `metaPath`; uses `embededFragment` |
| `custom-filter-field` | custom filter field | no `metaPath`; uses `embededFragment` |
| `custom-form-field` | custom form field | no `metaPath`; uses `embededFragment` |
| `action` | toolbar button / action | no `metaPath`; uses `embeddedAction` |

`metaPath` is required for `table`, `chart`, `filter-bar`, `field`, `form`, and `rich-text-editor` (for the
rich-text-editor it is the bound property path, e.g. `/Products/description`). Custom-* types and `action` do not
use `metaPath`.

### Floor plan support

Standard building blocks are not valid on every page type. Typical support (verify against the app's page type
before inserting):

| BB | List Report | Object Page | ALP | OVP | Custom Page |
|---|---|---|---|---|---|
| Table | ✅ | ✅ | ✅ | ❌ | ✅ |
| Chart | ✅ | ✅ | ✅ | ❌ | ✅ |
| FilterBar | ✅ | ❌ | ✅ | ❌ | ✅ |
| Field | ❌ | ✅ | ❌ | ❌ | ✅ |
| Form | ❌ | ✅ | ❌ | ❌ | ✅ |
| Rich Text Editor | ❌ | ✅ | ❌ | ❌ | ✅ (fragment only) |

If the requested building block is not supported on the target page type, tell the user instead of inserting it.

---

## Workflow

Modifying an existing Fiori app goes through the Fiori MCP server's **three-step functionality protocol**.
Adding a building block is the functionality with id **`add-building-block`**.

1. **Locate the app.** If the app path is unknown, call `list_fiori_apps`.
2. **Confirm the operation** (optional). Call `list_functionality` with the app path to confirm that
   `add-building-block` is available.
3. **Get the insertion points — let the tool do it, don't read files.** Call `get_functionality_details`
   with `{ appPath, functionalityId: "add-building-block" }`. Its `description` lists the **available
   insertion points**: every view/fragment file and the valid `aggregationPath` XPath options for it
   (e.g. `/mvc:View/content`). Its `parameters` is the JSON schema for the call in step 5. **Do not guess the
   `viewOrFragmentPath` or `aggregationPath`** — use the values it returns.
4. **Determine the binding.** For standard building blocks, pick the `metaPath` (an annotation path for
   `table`/`chart`/`filter-bar`/`field`/`form`; the bound property path such as `/Products/description` for
   `rich-text-editor`). If you are unsure which annotation path to use, call `search_docs`.
5. **Insert.** Call `execute_functionality` with the chosen parameters:
   ```json
   {
     "appPath": "<app path>",
     "functionalityId": "add-building-block",
     "parameters": {
       "viewOrFragmentPath": "<one of the files from step 3>",
       "aggregationPath": "<one of the XPaths from step 3>",
       "buildingBlockData": { "buildingBlockType": "table", "id": "myTable" }
     }
   }
   ```
   `buildingBlockData` carries `buildingBlockType`, an optional `id`, and the type-specific fields (e.g. `metaPath`).
6. **Multiple building blocks:** call `execute_functionality` **once per building block, in sequence** — not in
   parallel. Each call reads the view from disk; parallel calls won't see each other's writes and may produce
   duplicate element IDs.

---

## Example (non-CAP FPM app)

```
Add to the main custom page view (webapp/ext/main/Main.view.xml, aggregation /mvc:View/content):
1. A FilterBar: id productFilterBar,
   metaPath /Products/@com.sap.vocabularies.UI.v1.SelectionFields
2. A Table: id productTable,
   metaPath /Products/@com.sap.vocabularies.UI.v1.LineItem, linked to productFilterBar
3. A Rich Text Editor: id productNotesRte, metaPath /Products/description
```

(Leave `contextPath` unset — use an absolute `metaPath` with a leading slash as above.)

---

## Common mistakes

- Guessing the `aggregationPath` (or `viewOrFragmentPath`) instead of using the options returned by
  `get_functionality_details`.
- Expecting the tool to create annotations for types other than Table/FilterBar/Form/Chart, or on CAP apps — there the UI
  annotation must already exist.
- Hand-editing the view XML instead of using the tool.
- Calling the tool in parallel for several building blocks on the same view.

---

## References

- **SAP Fiori Elements building blocks (macros)**: https://ui5.sap.com/#/topic/9ce5d873d3214a6b872fe60f1cd5f4a9
- **Flexible Programming Model**: https://ui5.sap.com/#/topic/bb5508b13f6a4b7f865e2f6b70bdc9b5
