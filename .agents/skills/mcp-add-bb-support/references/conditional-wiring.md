# Conditional Wiring

Read this file only if the new type needs **any** of the following. Skip sections that don't apply.

---

## annotations.ts — only if you added an ANNOTATION_SHELL_TERMS entry in Step 3

File: `packages/fiori-mcp-server/src/tools/functionalities/building-block/annotations.ts`

Skip entirely if you did NOT add the new type to `ANNOTATION_SHELL_TERMS` in Step 3.

Read `buildAnnotationValue` — it has explicit branches for `FieldGroup` (record type) and `Chart`
(record type). All other terms fall through to `collection: []`.

Determine the term's shape from the OData vocabulary:
- **Collection-typed** (e.g. `LineItem`, `SelectionFields`) → no change needed, the default handles it
- **Record-typed** (e.g. `FieldGroup`) → add a branch mirroring how `FieldGroup` or `Chart` is handled

---

## get-functionality-details.ts — only if non-standard placement

File: `packages/fiori-mcp-server/src/tools/functionalities/building-block/get-functionality-details.ts`

Skip unless the new type has placement or handler rules that differ from the standard patterns —
this would have been apparent when classifying the type in Step 2.

Examples of types that needed updates:
- `RichTextEditor` — fragment-only placement
- `Page` — `replace: true`, single-per-view
- `RichTextEditorButtonGroups` — rewrites entire button group set

Standard standalone and aggregation child types need no change here.

---

## LLM documentation — developer responsibility

`search_docs` will not return results for the new type until someone registers it in
`packages/fiori-docs-embeddings/src/scripts/build-bb-macro-docs.ts` and regenerates
`data_local/bb_macro_api.md`. This requires the private sap.fe repo and is not automated by this
skill — leave it to the developer who owns the change.
