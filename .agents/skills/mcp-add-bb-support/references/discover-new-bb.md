# Discover New Building Block Traits

Use the type name discovered in Step 1 of SKILL.md throughout. For each question, read the source — do not guess.

## 1. Is it an aggregation child?

Read `BUILDING_BLOCK_CONFIG` in `packages/fe-fpm-writer/src/building-block/processor.ts`.

If the new type appears as a key — it is an aggregation child. Note its `aggregationName`.
If not — it is standalone, no `AGGREGATION_PARENT_MACRO` entry needed.

To see how existing aggregation children are registered in `fiori-mcp-server`, read
`packages/fiori-mcp-server/src/tools/functionalities/building-block/utils.ts` and look at
`AGGREGATION_PARENT_MACRO` — mirror any existing entry.

## 2. Does it need special wiring in translate.ts?

Read the new type's interface in `packages/fe-fpm-writer/src/building-block/types.ts`, then read
`packages/fiori-mcp-server/src/tools/functionalities/building-block/translate.ts` and check:

- **Has `position?: Position`** — anchor/placement that gets wrapped into a nested object by translate.ts.
  Check `POSITION_WRAP_TYPES` and add the new type if it has this field.

- **Has `embededFragment`** — a fragment + handler config that translate.ts synthesizes into a child XML
  element. Check `EMBEDDED_FRAGMENT_TYPES` and add the new type if it has this field.

- **Has a different fragment-like or handler field** (e.g. `embeddedAction` on `Action`) — read how
  translate.ts already handles it. If the pattern is not covered by an existing set, a new branch may
  be needed. Mirror the closest existing type.

## 3. Does it have XML attribute → TypeScript field renames?

Compare the interface property names against what the macro XML uses. Short XML names get renamed to longer TS names.

Read the existing rename blocks in `packages/fiori-mcp-server/src/tools/functionalities/building-block/translate.ts`
and look for `renameField` calls — use those as examples.

## 4. Does it export a `MIN_UI5_VERSION_*` constant?

Read `packages/fe-fpm-writer/src/building-block/types.ts` and `packages/fe-fpm-writer/src/index.ts`
and look for a `MIN_UI5_VERSION_` constant associated with the new type. The constant name is not always
derived from the type name — a single constant can cover multiple types (e.g. one constant covers both
`RichTextEditor` and `RichTextEditorButtonGroups`). Read the existing entries in `BB_TYPE_MIN_UI5_VERSION`
in `utils.ts` to understand which constant applies.

If a constant exists — needs a `BB_TYPE_MIN_UI5_VERSION` entry with `{ minVersion: <constant> }`.

## 5. Does it need an annotation shell?

Read `ANNOTATION_SHELL_TERMS` in `packages/fiori-mcp-server/src/tools/functionalities/building-block/utils.ts`
to see which types currently need one. Determine whether the new type belongs in that set by checking
whether it drives an OData annotation (metaPath-based types like Table, FilterBar, Form, Chart do;
custom aggregation children and standalone layout types typically do not).

If yes — add it to `ANNOTATION_SHELL_TERMS` in Step 3 and read `conditional-wiring.md` in Step 4.
