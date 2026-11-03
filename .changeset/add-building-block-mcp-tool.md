---
"@sap-ux/fiori-mcp-server": minor
"@sap-ux/fe-fpm-writer": minor
"@sap-ux/fiori-docs-embeddings": minor
---

FEAT: add `add-building-block` functionality for Fiori Elements building blocks

Adds building-block support to `@sap-ux/fiori-mcp-server` as a first-class `add-building-block` functionality in the
existing `list_functionality` → `get_functionality_details` → `execute_functionality` registry — not a standalone
tool — so there is one consistent way to add functionality to the server. It delegates to `@sap-ux/fe-fpm-writer`'s
`generateBuildingBlock()` (the same generator as the SAP Page Editor) to add building blocks (table, chart,
filter-bar, field, form, page, rich-text-editor, rich-text-editor-button-groups, custom-column, custom-filter-field,
custom-form-field, action) to an FPM view or fragment with correct XML and manifest wiring.

Property semantics are sourced from the generated `bb_macro_api.md` via the existing `search_docs` tool rather than
duplicated as inline schemas, so the per-type Zod schema stays lean (`zod.looseObject`) and only enforces the fields
the LLM must always provide; the per-type map is exhaustiveness-guarded against `BuildingBlockType` so adding a new
type upstream without a schema breaks the build. The functionality description carries the real UI5 version
constraints (RichTextEditor and RichTextEditorButtonGroups require UI5 >= 1.117.0; Page requires >= 1.136.0 basic /
>= 1.145.0 full layout) and the universal OData V4 requirement. `get_functionality_details` enriches its response with
the app's actual view/fragment files and their valid aggregation XPaths, so the client never has to read the XML. For
Table, FilterBar and Form on an OData app it auto-writes the required UI annotation shell (`UI.LineItem` /
`UI.SelectionFields` / `UI.FieldGroup`) when it is missing; failure to write the shell is non-fatal and surfaced as a
warning. Client-supplied view/fragment paths are validated to stay inside the app root.

`@sap-ux/fe-fpm-writer` now exports the `BuildingBlock` type, the `getFragmentAndViewFiles` /
`getXPathStringsForXmlFile` discovery helpers, and `MIN_UI5_VERSION_RICH_TEXT_EDITOR`.

`@sap-ux/fiori-docs-embeddings` adds `bb_macro_api.md` (generated from the `@public`-annotated `sap.fe` macro source
by the new `build-bb-macro-docs` script and wired into the embeddings build) so `search_docs` can return building
block property documentation.
