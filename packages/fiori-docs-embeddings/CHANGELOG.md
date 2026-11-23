# @sap-ux/fiori-docs-embeddings

## 1.3.0

### Minor Changes

#### Features

- add `add-building-block` functionality for Fiori Elements building blocks

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

    > = 1.145.0 full layout) and the universal OData V4 requirement. `get_functionality_details` enriches its response with
    > the app's actual view/fragment files and their valid aggregation XPaths, so the client never has to read the XML. For
    > Table, FilterBar and Form on an OData app it auto-writes the required UI annotation shell (`UI.LineItem` /
    > `UI.SelectionFields` / `UI.FieldGroup`) when it is missing; failure to write the shell is non-fatal and surfaced as a
    > warning. Client-supplied view/fragment paths are validated to stay inside the app root.
    > `@sap-ux/fe-fpm-writer` now exports the `BuildingBlock` type, the `getFragmentAndViewFiles` /
    > `getXPathStringsForXmlFile` discovery helpers, and `MIN_UI5_VERSION_RICH_TEXT_EDITOR`.
    > `@sap-ux/fiori-docs-embeddings` adds `bb_macro_api.md` (generated from the `@public`-annotated `sap.fe` macro source
    > by the new `build-bb-macro-docs` script and wired into the embeddings build) so `search_docs` can return building
    > block property documentation. [[6ecb16c](https://github.com/SAP/open-ux-tools/commit/6ecb16c7f4a2b26742b36f80adc6a8d0e03cb0b4)]

## 1.2.9

### Patch Changes

#### Release Date

2026-11-13

#### Bug Fixes

- Replace abandoned node-fetch with native fetch (Node >=20 built-in) [[73fdfbf](https://github.com/SAP/open-ux-tools/commit/73fdfbfe2a371d5b9666d2a69b55d1ed977bb69e)]

## 1.2.8

### Patch Changes

#### Release Date

2026-10-05

#### Bug Fixes

- Replace opa5_docu.md and fiori-tools-opa-guide.md with OPA5 skill reference files as embeddings source [[3c76112](https://github.com/SAP/open-ux-tools/commit/3c7611299ff6b7b8f610285e2846430fffd859dd)]

## 1.2.7

### Patch Changes

#### Release Date

2026-08-10

#### Dependency Updates

- Rebuild embeddings with updated @sap-ux/create docs (update metadata command, --service and --no-value-help options, EDMX-backend-only limitation) [[a5c33b0](https://github.com/SAP/open-ux-tools/commit/a5c33b05411d86208f77ed3be91c2c1e14991c14)]

## 1.2.6

### Patch Changes

#### Release Date

2026-07-08

#### Features

- Add sap.fe.test JSDoc API as a new embedded data source [[d54fc9a](https://github.com/SAP/open-ux-tools/commit/d54fc9a6937632e19e5b50dbf79ba50f279b3a39)]

## 1.2.5

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

## 1.2.4

### Patch Changes

#### Release Date

2026-06-30

#### Bug Fixes

- Trigger @sap-ux/fiori-mcp-server release [[17354e0](https://github.com/SAP/open-ux-tools/commit/17354e08c50f44f031ad2bedcbcb6ce01acd96ba)]

## 1.2.3

### Patch Changes

#### Release Date

2026-06-18

#### Bug Fixes

- Validate GitHub host/token inputs to prevent argument injection; validate output path to prevent path traversal [[74a9959](https://github.com/SAP/open-ux-tools/commit/74a9959edf34f8f9ef99ca125fa71524c741aabd)]

## 1.2.2

### Patch Changes

#### Release Date

2026-06-18

#### Bug Fixes

- Update opa5_docu.md: clear filter fields [[6776415](https://github.com/SAP/open-ux-tools/commit/6776415f52f25bbbf29728bec85e026a868e8687)]

## 1.2.1

### Patch Changes

#### Release Date

2026-06-16

#### Bug Fixes

- OPA5 embeddings chunk formatting [[70f934e](https://github.com/SAP/open-ux-tools/commit/70f934e20e2e91aabccc02fc6e3d8f25940edc95)]

## 1.2.0

_Released: 2026-06-12T08:20:17Z_

### Minor Changes

- 08fb7a1: Add opa5_docu.md

## 1.1.1

_Released: 2026-06-11T15:27:53Z_

### Patch Changes

- 4124656: Add OPA mock server testing guide as github-raw doc source and --source CLI flag for single-source builds

## 1.1.0

_Released: 2026-06-05T11:08:04Z_

### Minor Changes

- 9f33150: Replace @xenova/transformers with @huggingface/transformers 4.2.0.

## 1.0.1

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)

## 1.0.0

_Released: 2026-05-30T20:54:07Z_

### Major Changes

- 32609a7: # Migration to ECMAScript Modules (ESM)

    Packages in the SAP Open UX Tools monorepo have been migrated from CommonJS (CJS) to ECMAScript Modules (ESM) with NodeNext module resolution.

    '@sap-ux/backend-proxy-middleware-cf' is experimental and will remain at major version 0.
    '@sap-ux/generator-odata-downloader' is a top level yeoman generator and will remain as CJS until validation as ESM is done.

    ## What Changed
    - **Module System**: Most packages now use native ESM (`"type": "module"` in package.json)
    - **TypeScript Configuration**: Updated to `module: "NodeNext"` and `moduleResolution: "NodeNext"`
    - **Import Statements**: All relative imports now include explicit `.js` extensions (per ESM spec)
    - **Build Output**: Generated JavaScript files are now ESM modules
    - **Node.js Requirement**: Minimum Node.js version remains >=22.x

    ### Jest Configuration (for Testing)

    If your project tests code that imports these packages, update your Jest configuration:

    ```js
    export default {
        extensionsToTreatAsEsm: ['.ts'],
        transform: {
            '^.+\\.ts$': ['ts-jest', { useESM: true }]
        }
    };
    ```

    And run Jest with: `NODE_OPTIONS='--experimental-vm-modules' jest`

## 0.5.1

_Released: 2026-05-21T05:46:16Z_

### Patch Changes

- 12137f6: update doc for fiori extension

## 0.5.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

## 0.4.20

_Released: 2026-05-14T12:51:22Z_

### Patch Changes

- 59537d3: chore: override sharp to >=0.33.5 to fix CI build on darwin-arm64

## 0.4.19

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates

## 0.4.18

_Released: 2026-05-11T09:58:34Z_

### Patch Changes

- a5c05a8: Add additional guidance on the adding of extension in fiori

## 0.4.17

_Released: 2026-05-04T15:49:13Z_

### Patch Changes

- e4a2488: feat - docs - how to add extensions to odata v4 fiori elements

## 0.4.16

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- ca2566b: Update fast-xml-parser

    Issue: #37278

## 0.4.15

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- d57cc47: Update fast-xml-parser

## 0.4.14

_Released: 2026-02-10T21:03:43Z_

### Patch Changes

- 3795bb2: Add Node.js engine requirement (>=20.x)

## 0.4.13

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- c3a1e07: fix: add documentation sources

## 0.4.12

_Released: 2026-01-30T16:18:20Z_

### Patch Changes

- 4eac0a7: Improve chunk creation to ensure code samples are not modified.

## 0.4.11

_Released: 2026-01-28T10:59:00Z_

### Patch Changes

- a686522: feat: add Fiori Tools commands and update total document count

## 0.4.10

_Released: 2026-01-23T17:12:38Z_

### Patch Changes

- c99758e: chore - Update embeddings docs from original sources for mcp server

## 0.4.9

_Released: 2026-01-12T09:10:27Z_

### Patch Changes

- d667a5e: fix: add repository field to package.json

## 0.4.8

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- e111d0d: fix sonar issues

## 0.4.7

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues

## 0.4.6

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.

## 0.4.5

_Released: 2025-12-01T17:31:14Z_

### Patch Changes

- 7cb3db2: feat: enhance downloaded readme content for better chunking

## 0.4.4

_Released: 2025-11-13T12:25:56Z_

### Patch Changes

- 10eb73e: fix: use existing version of ux-ui5-tooling-README.md in case of download errors

## 0.4.3

_Released: 2025-11-11T19:29:27Z_

### Patch Changes

- a990ed6: feat: add @sap-ux/create/README.md as resource

## 0.4.2

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md

## 0.4.1

_Released: 2025-10-22T18:56:41Z_

### Patch Changes

- fa9580c: chore - Rimraf upgrade

## 0.4.0

_Released: 2025-10-20T15:41:39Z_

### Minor Changes

- 27585ad: Pre-process document sources with LLM and to clean-up an optimize for RAG code generation.

## 0.3.0

_Released: 2025-10-15T11:11:41Z_

### Minor Changes

- e75b594: Add Fiori Development portal documentation to embeddings

## 0.2.0

_Released: 2025-10-09T12:00:16Z_

### Minor Changes

- b5b6c9c: Add FPM Development portal documentation to embeddings

## 0.1.1

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 0.1.0

_Released: 2025-10-06T11:26:22Z_

### Minor Changes

- b179405: Refactor doc search to return human readable results. Simplify search and doc indexing

## 0.0.2

_Released: 2025-09-18T23:50:28Z_

### Patch Changes

- 306561e: Fix publishing of embeddings package

## 0.0.1

_Released: 2025-09-17T14:22:31Z_

### Patch Changes

- a7b6272: Add doc_search tool to Fiori MCP server using data from embeddings module.
