# Wire a New BuildingBlockType into fiori-mcp-server

For each change, find an existing type that matches the characteristic and mirror its pattern.
The existing types are the source of truth — not this document.

## schema.ts

Read `packages/fiori-mcp-server/src/tools/functionalities/building-block/schema.ts` and add an entry
for the new type to `buildingBlockSchemaByType` — mirror any existing entry.

## utils.ts — registration maps

Read `packages/fiori-mcp-server/src/tools/functionalities/building-block/utils.ts` and update the
relevant maps:

- **Aggregation child** → add to `AGGREGATION_PARENT_MACRO` — read the existing entries and mirror the
  one whose aggregation structure most closely matches the new type
- **Annotation shell** → add to `ANNOTATION_SHELL_TERMS` — read the existing entries and mirror the closest one
- **Version gate** → add to `BB_TYPE_MIN_UI5_VERSION` with `{ minVersion: <constant> }` and import the
  constant from `@sap-ux/fe-fpm-writer`

## translate.ts — behavioural wiring

Read `packages/fiori-mcp-server/src/tools/functionalities/building-block/translate.ts` and update:

- **Has `position`** → add to `POSITION_WRAP_TYPES` — mirror any existing entry in that set
- **Has `embededFragment`** → add to `EMBEDDED_FRAGMENT_TYPES` — mirror any existing entry in that set
- **Field renames** → add an `if (type === BuildingBlockType.X)` block with `renameField` calls — mirror the existing rename blocks
- **Aggregation child with key field** → update `resolveAggregationChildDefaults` — mirror the existing
  entry whose key field structure matches

## Two mocks — both must stay in sync

There are two separate mocks of `@sap-ux/fe-fpm-writer`. Add the new type to `BuildingBlockType` in
**both** files for every new type, regardless of whether it has a version constant. Only add the
version constant if the type is versioned.

- `packages/fiori-mcp-server/test/__mocks__/@sap-ux/fe-fpm-writer.cjs`
- `packages/fiori-mcp-server/test/unit/tools/functionalities/building-block/execute-functionality.test.ts`

If the new type is an **aggregation child**, also add its kebab-case value to the `AGGREGATION_CHILD_BB_TYPES`
array in `packages/fiori-mcp-server/test/__mocks__/@sap-ux/fe-fpm-writer.cjs`. The bb-sync forward-
completeness test imports this array — omitting it gives a false green.

## utils.test.ts — only if versioned

Read `packages/fiori-mcp-server/test/unit/tools/functionalities/building-block/utils.test.ts` and
update the `BB_TYPE_MIN_UI5_VERSION` keys assertion and the `versionRequirementsNote` assertion —
mirror the existing assertions for the versioned type whose constraint shape most closely matches the new type.

## Snapshots — always regenerate both

Update the `schema` and `list-functionalities` snapshots using the package's own test runner. Read
`packages/fiori-mcp-server/package.json` to find how its jest tests are invoked (script name, any
required `NODE_OPTIONS`), then run that with jest's `--updateSnapshot` scoped to the `schema` and
`list-functionalities` tests only — do not bulk-update every snapshot. Mirror the exact invocation
the package already uses rather than assuming flags; they change over time.

Regenerate snapshots only after all other wiring changes are complete.
Verify the updated `schema.test.ts.snap` contains the new type's kebab-case value in the `enum` array.
