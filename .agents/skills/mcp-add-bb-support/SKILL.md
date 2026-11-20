---
name: mcp-add-bb-support
description: 'Wire a new BuildingBlockType from @sap-ux/fe-fpm-writer into the fiori-mcp-server. Use when the schema.ts satisfies check fails after a new type was added to fe-fpm-writer.'
argument-hint: 'The new BuildingBlockType value (kebab-case, e.g. "custom-header")'
---

# Add a New BuildingBlockType to fiori-mcp-server

Use this skill when `@sap-ux/fe-fpm-writer` adds a new `BuildingBlockType` and the build errors with
a missing property in `schema.ts`, or when `bb-sync.test.ts` fails.

**Do not manually patch schema.ts and stop there** — that will compile but produce wrong runtime
behaviour. Work through every touchpoint using the steps below.

Before starting, create a task for each of the five steps below and mark them complete as you go.

## Step 1 — Find the missing type(s)

Build `@sap-ux/fiori-mcp-server` and read the tsc errors in `schema.ts` — the string value of the
missing type (e.g. `'custom-header'`) is what needs wiring. Alternatively run the `bb-sync` test
and read the failing test error messages — they name the missing type directly.

## Step 2 — Classify the new type

Read `references/discover-new-bb.md` and answer the five questions about the new type.
The answers determine which touchpoints apply.

## Step 3 — Wire into fiori-mcp-server

Read `references/wire-into-mcp-server.md` and apply all matching changes in one pass.

Use this as your working checklist — tick each item off as you complete it:

- [ ] `schema.ts` — add entry to `buildingBlockSchemaByType`
- [ ] `utils.ts` — add to `AGGREGATION_PARENT_MACRO` (if aggregation child)
- [ ] `utils.ts` — add to `ANNOTATION_SHELL_TERMS` (if needs annotation shell)
- [ ] `utils.ts` — add to `BB_TYPE_MIN_UI5_VERSION` + import constant (if versioned)
- [ ] `translate.ts` — add to `POSITION_WRAP_TYPES` (if has `position`) — **manual review, no test**
- [ ] `translate.ts` — add to `EMBEDDED_FRAGMENT_TYPES` (if has `embededFragment`) — **manual review, no test**
- [ ] `translate.ts` — add field rename `if` block (if XML → TS renames) — **manual review, no test**
- [ ] `translate.ts` — update `resolveAggregationChildDefaults` (if aggregation child with a key field) — **manual review, no test**
- [ ] `fe-fpm-writer.cjs` — add type to `BuildingBlockType` (always) + constant (if versioned)
- [ ] `execute-functionality.test.ts` — add type to local `BuildingBlockType` (always) + constant (if versioned)
- [ ] `utils.test.ts` — update `BB_TYPE_MIN_UI5_VERSION` keys assertion (if versioned)
- [ ] `schema.test.ts.snap` + `list-functionalities.test.ts.snap` — regenerate both snapshots
- [ ] `annotations.ts` — add branch (if annotation shell needed — see Step 4)
- [ ] `get-functionality-details.ts` — add special rules (if non-standard placement — see Step 4)

## Step 4 — Conditional wiring (only if needed)

Read `references/conditional-wiring.md` if the new type needs **any** of:
- An annotation shell (`ANNOTATION_SHELL_TERMS` entry added in Step 3)
- Non-standard placement rules

## Step 5 — Verify

```bash
pnpm --filter @sap-ux/fe-fpm-writer build
pnpm --filter @sap-ux/fiori-mcp-server build
pnpm --filter @sap-ux/fiori-mcp-server test
```

All tests must pass, including `bb-sync.test.ts`.

After all tests pass, print the following message verbatim:

---
✅ Skill complete — build and tests pass. Note the following before closing:

⚠️  Tests confirm registration, not correctness. Verify the translate.ts wiring decisions
(position, fragment, renames, aggregation defaults) match the new type's interface — a wrong
wiring compiles green but generates broken XML at runtime.

⚠️  search_docs won't return results for this new building block type until build-bb-macro-docs.ts is manually updated
and data_local/bb_macro_api.md is regenerated. See references/conditional-wiring.md.
---
