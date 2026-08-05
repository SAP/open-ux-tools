---
name: odata-vocabularies-sync
description: Sync odata-vocabularies package — update all vocabulary resource files to their latest published versions, and optionally add a new vocabulary given its JSON URL. Use when asked to update vocabularies, refresh vocabulary resources, or add a new vocabulary to @sap-ux/odata-vocabularies.
argument-hint: (optional) URL of the new vocabulary in JSON format (ending in .json), e.g. https://sap.github.io/odata-vocabularies/vocabularies/SomeNew.json — XML URLs are not supported
metadata:
  author: sap-fiori-tools
  version: "1.0.0"
---

# odata-vocabularies-sync

Keeps the `packages/odata-vocabularies` package in sync with the upstream OData vocabulary sources.

- **No argument** — update all existing vocabulary resource files to their latest published versions.
- **With a URL argument** — register and add the new vocabulary first, then update everything.

All file edits are relative to `packages/odata-vocabularies/`.

> **Note:** `com.sap.cds.vocabularies.*` files (ObjectModel, AnalyticsDetails) are hand-crafted and not managed by this skill. Do not attempt to add them via a URL.

---

## Step 1 — Add a new vocabulary (only when a URL argument is provided)

### 1a. Fetch and inspect the vocabulary JSON

Fetch the JSON at the provided URL (must end in `.json` — XML URLs are not supported by the update tool). Extract:
- `namespace` — the key of the top-level schema object (e.g. `Org.OData.NewThing.V1` or `com.sap.vocabularies.NewThing.v1`)
- `alias` — the value of `$Alias` inside that schema object (e.g. `NewThing`)

Determine the vocabulary family from the namespace:
- Starts with `Org.OData.` → **OASIS vocabulary**
- Starts with `com.sap.vocabularies.` → **SAP vocabulary**
- Starts with `com.sap.cds.` → **CDS vocabulary — stop.** These files are hand-crafted and cannot be added via this skill. Explain this to the user.
- Anything else → stop and ask the user to confirm the family before proceeding.

### 1b. Edit `tools/update.ts`

Add an entry to `SUPPORTED_VOCABULARIES` in alphabetical order within the existing entries:

```typescript
'<namespace>': {
    uri: '<the provided URL>'
},
```

> **Note:** The entry can include `update: false` to pin the vocabulary and exclude it from future automatic updates (e.g. `com.sap.vocabularies.CDS.v1` uses this because it is hand-maintained). Omit the field for normal auto-updating behaviour.

### 1c. Edit `src/resources/index.ts`

Make all six additions. All six are mandatory — missing any one will cause a runtime error.

1. **Import** — insert alphabetically by alias in the single import block (OASIS and SAP imports are interleaved by alias, not grouped by family):
   ```typescript
   import <Alias> from './<namespace>.js';
   ```
   Use the `$Alias` value from the JSON as the import identifier. **Exception:** if the alias is a reserved JS keyword or built-in (e.g. `JSON`, `Map`, `Error`), prefix it to form a valid identifier (e.g. `JSON` → `ODataJSON`). Check existing imports for precedent.

2. **Namespace union type** — add to the matching family type:
   - OASIS → `OasisVocabularyNamespace`
   - SAP → `SapVocabularyNamespace`
   ```typescript
   | '<namespace>'
   ```

3. **Alias union type** — add to the matching family type:
   - OASIS → `OasisVocabularyAlias`
   - SAP → `SapVocabularyAlias`
   ```typescript
   | '<Alias>'
   ```

4. **`NAMESPACE_TO_ALIAS` Map**:
   ```typescript
   ['<namespace>', '<Alias>'],
   ```

5. **`ALIAS_TO_NAMESPACE` Map**:
   ```typescript
   ['<Alias>', '<namespace>'],
   ```

6. **`vocabularies` Record**:
   ```typescript
   '<namespace>': <Alias>,
   ```

### 1d. Edit `src/loader.ts`

Add the namespace to `SUPPORTED_VOCABULARY_NAMESPACES` in alphabetical order within its family block:

```typescript
'<namespace>',
```

### 1e. Edit `README.md`

Add the alias to the correct bullet list in the "Supported Vocabularies" section, in alphabetical order:
- OASIS namespace → OASIS Vocabularies list
- SAP namespace → SAP Vocabularies list

```
* <Alias>
```

---

## Step 2 — Run the update tool

This fetches the latest JSON for every registered vocabulary (including any newly added one) and regenerates all `src/resources/*.ts` resource files.

Run from the repo root:

```bash
pnpm --filter @sap-ux/odata-vocabularies update:vocabularies
```

If the tool fails, stop and report the full error output before proceeding.

---

## Step 3 — Run tests and update snapshots

```bash
pnpm --filter @sap-ux/odata-vocabularies test -- -u
```

Report any test failures that are not snapshot-related. Snapshot updates are expected only when vocabulary content has actually changed (either upstream drift detected by the update tool, or a newly added vocabulary). If snapshots change beyond what was updated, inspect the diff before accepting — it may indicate a regression.

---

## Step 4 — Report

Summarise what was done:
- If a new vocabulary was added: confirm the namespace, alias, family, and all files changed.
- List vocabulary resource files regenerated by the update tool.
- Confirm tests pass.