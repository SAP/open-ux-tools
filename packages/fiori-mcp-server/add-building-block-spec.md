# Spec: `add_building_block` MCP Tool

> For context on why this tool exists, who it is for, and how it works, see [add-building-block-overview.md](add-building-block-overview.md). This document covers the technical details: input/output schema, files changed, validation, and how the schema stays in sync with `fe-fpm-writer`.

---

## Tool Definition

### Input Schema

The outer parameters tell the tool where to insert — the app root, the target view or fragment, and the XPath aggregation path. The `buildingBlockData` field is a **discriminated union on `buildingBlockType`** — the shape of the object varies by type, but all types share a base set of fields.

**Outer fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `appPath` | ✅ | Absolute path to the Fiori app root (where `manifest.json` lives) |
| `viewOrFragmentPath` | ✅ | Relative path to the target view or fragment XML file |
| `aggregationPath` | ✅ | XPath to the aggregation element where the BB will be inserted |

**Shared base fields (all types):**

| Field | Required | Description |
|-------|----------|-------------|
| `buildingBlockType` | ✅ | One of the supported types (see below) |
| `id` | ✅ | ID for the inserted XML element |
| `metaPath` | — | Annotation path, e.g. `@com.sap.vocabularies.UI.v1.LineItem` |
| `contextPath` | — | Entity set path, e.g. `/SalesOrder` |

**Supported types and their additional fields:**

| `buildingBlockType` | Key extra fields |
|---------------------|-----------------|
| `table` | `filterBar`, `personalization`, `selectionMode`, `type`, `header`, `enableExport`, `readOnly` |
| `chart` | `filterBar`, `personalization`, `selectionMode`, `selectionChange` |
| `filter-bar` | `liveMode`, `showClearButton`, `showMessages`, `filterChanged`, `search` |
| `field` | `readOnly`, `semanticObject` |
| `form` | `title` ✅ |
| `page` | `title`, `description`, `templateType` |
| `rich-text-editor` | `targetProperty` |
| `rich-text-editor-button-groups` | _(base fields only)_ |
| `custom-filter-field` | `anchor` ✅, `label` ✅, `property` ✅, `required` ✅, `filterFieldKey` |
| `custom-form-field` | `label` ✅, `targetProperty` |
| `custom-column` | `title` ✅, `width`, `columnKey` |
| `action` | `actionKey` ✅, `text` ✅, `anchor`, `placement`, `requiresSelection` |

All inputs are validated against a typed Zod schema before the generator is called. Malformed requests are rejected with a clear error before any files are touched.

### Output Schema

```typescript
{
  status: 'success' | 'error';
  modifiedFiles: string[];       // Relative paths of files written
  message: string;               // Human-readable result or error description
}
```

---

## Files Changed

The implementation touches the MCP server and its test suite only. `fe-fpm-writer` is added as a runtime dependency (not devDependency) so that esbuild's external list preserves `__dirname` resolution needed by the generator's template files.

| File | Change |
|------|--------|
| `package.json` | Added `@sap-ux/fe-fpm-writer: workspace:*` to `dependencies`; added to esbuild `external` list in `scripts/bundle.mjs` |
| `src/tools/add-building-block.ts` | New — core implementation |
| `src/types/input.ts` | Added `AddBuildingBlockInputSchema` |
| `src/types/output.ts` | Added `AddBuildingBlockOutputSchema` |
| `src/types/index.ts` | Exported `AddBuildingBlockInput` / `AddBuildingBlockOutput` types |
| `src/tools/index.ts` | Exported `addBuildingBlock`, added tool definition to `tools` array |
| `src/server.ts` | Added import, `ToolArgs` union, `case 'add_building_block':` handler |
| `test/__mocks__/@sap-ux/fe-fpm-writer.cjs` | Added `generateBuildingBlock` and `createIdGenerator` stubs |
| `test/unit/server.test.ts` | Updated tool list and error message assertions |
| `test/unit/tools/add-building-block.test.ts` | New — unit tests for `addBuildingBlock` (8 cases, 100% coverage) |

---

## Validation

All five acceptance criteria passed:

1. Claude Code: "Use the `add_building_block` tool to add a Table building block..." → tool called, view XML updated ✅
2. Joule Desktop (via supergateway SSE): same prompt → `tools/call` logged, `status: 'success'` returned, file written to disk ✅
3. `generateBuildingBlock()` executes without error ✅
4. View XML updated with correct `<macros:Table>` element and attributes ✅
5. Tool returns list of modified files ✅

### Example prompt

Used in Joule Desktop to validate all three building block types in a single agent run:

```
I am working on a Fiori FPM app at /path/to/your/fiori-app

Add the following building blocks to the main custom page view.
Read webapp/manifest.json first to find the correct view/fragment files,
then read those files to determine the correct aggregationPath before
calling add_building_block. Do NOT write any XML manually.

1. A FilterBar with id productFilterBar,
   contextPath /CampaignsToProductsRelations

2. A Table with id productTable,
   contextPath /CampaignsToProductsRelations,
   linked to productFilterBar

3. A Rich Text Editor with id productNotesRte,
   targetProperty /CampaignsToProductsRelations/description
```

All three building blocks inserted correctly on the first call. Output was identical to what the Page Editor produces.

---

## Staying in Sync

The tool's Zod schema mirrors the set of building block types that `fe-fpm-writer` supports. When a developer adds a new type to `fe-fpm-writer`, they are responsible for updating the schema in the same PR. To prevent drift, the schema uses `BuildingBlockType` enum values imported directly from `fe-fpm-writer` rather than hardcoded strings — if a type is renamed or removed upstream, the TypeScript compiler catches it immediately. A small CI test will fail the build if a new `BuildingBlockType` value exists in `fe-fpm-writer` without a corresponding entry in the Zod schema, so the gap cannot be missed and cannot be merged.

---

## Local Development

To test changes with Joule Desktop:

```bash
cd packages/fiori-mcp-server
npm run start
# Starts supergateway SSE on http://localhost:9881/sse
```

Add `http://localhost:9881/sse` as an SSE MCP server in Joule Desktop settings.

---

## Out of Scope

- Adding building blocks to CAP projects (tool works with OData/non-CAP apps)
- `get_bb_state` integration
- Extending `@sap/ux-specification` to surface building block metadata
