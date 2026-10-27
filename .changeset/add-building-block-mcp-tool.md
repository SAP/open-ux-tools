---
"@sap-ux/fiori-mcp-server": minor
"@sap-ux/fe-fpm-writer": patch
---

FEAT: add `add_building_block` MCP tool for Fiori Elements building blocks

Adds a new `add_building_block` MCP tool that delegates to `@sap-ux/fe-fpm-writer`'s `generateBuildingBlock()` — the
same generator as the SAP Page Editor — so any MCP client can add building blocks (table, chart, filter-bar, field,
form, page, rich-text-editor, rich-text-editor-button-groups, custom-column, custom-filter-field, custom-form-field,
action) to an FPM view or fragment with correct XML and manifest wiring. Input is validated with a Zod discriminated
union whose schema map is exhaustiveness-guarded against `BuildingBlockType`, so adding a new type upstream without a
schema breaks the build.

The tool has a progressive discovery mode: call it without `viewOrFragmentPath` to list the app's view/fragment
files, then without `aggregationPath` to get the valid aggregation XPaths for the chosen file (status
`needs_input`), so the client never has to read the XML or guess the insertion point. For Table, FilterBar and Form
on an OData app it also auto-writes the required UI annotation shell (`UI.LineItem` / `UI.SelectionFields` /
`UI.FieldGroup`) when it is missing; failure to write the shell is non-fatal and surfaced via `annotationWarning`.

`@sap-ux/fe-fpm-writer` now exports the `BuildingBlock` type and the `getFragmentAndViewFiles` /
`getXPathStringsForXmlFile` helpers used for discovery.
