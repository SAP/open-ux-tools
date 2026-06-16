# @sap-ux/fiori-docs-embeddings

## 1.2.0

### Minor Changes

- 08fb7a1: Add opa5_docu.md

## 1.1.1

### Patch Changes

- 4124656: Add OPA mock server testing guide as github-raw doc source and --source CLI flag for single-source builds

## 1.1.0

### Minor Changes

- 9f33150: Replace @xenova/transformers with @huggingface/transformers 4.2.0.

## 1.0.1

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)

## 1.0.0

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

### Patch Changes

- 12137f6: update doc for fiori extension

## 0.5.0

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

## 0.4.20

### Patch Changes

- 59537d3: chore: override sharp to >=0.33.5 to fix CI build on darwin-arm64

## 0.4.19

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates

## 0.4.18

### Patch Changes

- a5c05a8: Add additional guidance on the adding of extension in fiori

## 0.4.17

### Patch Changes

- e4a2488: feat - docs - how to add extensions to odata v4 fiori elements

## 0.4.16

*Released: 2026-02-27T15:42:39Z*

### Patch Changes

- ca2566b: Update fast-xml-parser

    Issue: #37278

## 0.4.15

*Released: 2026-02-18T21:45:35Z*

### Patch Changes

- d57cc47: Update fast-xml-parser

## 0.4.14

*Released: 2026-02-10T21:03:43Z*

### Patch Changes

- 3795bb2: Add Node.js engine requirement (>=20.x)

## 0.4.13

*Released: 2026-02-03T15:42:23Z*

### Patch Changes

- c3a1e07: fix: add documentation sources

## 0.4.12

*Released: 2026-01-30T16:18:20Z*

### Patch Changes

- 4eac0a7: Improve chunk creation to ensure code samples are not modified.

## 0.4.11

*Released: 2026-01-28T10:59:00Z*

### Patch Changes

- a686522: feat: add Fiori Tools commands and update total document count

## 0.4.10

*Released: 2026-01-23T17:12:38Z*

### Patch Changes

- c99758e: chore - Update embeddings docs from original sources for mcp server

## 0.4.9

*Released: 2026-01-12T09:10:27Z*

### Patch Changes

- d667a5e: fix: add repository field to package.json

## 0.4.8

*Released: 2026-01-09T11:35:48Z*

### Patch Changes

- e111d0d: fix sonar issues

## 0.4.7

*Released: 2025-12-18T21:05:02Z*

### Patch Changes

- a9471d0: fix sonar issues

## 0.4.6

*Released: 2025-12-15T10:50:50Z*

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.

## 0.4.5

*Released: 2025-12-01T17:31:14Z*

### Patch Changes

- 7cb3db2: feat: enhance downloaded readme content for better chunking

## 0.4.4

*Released: 2025-11-13T12:25:56Z*

### Patch Changes

- 10eb73e: fix: use existing version of ux-ui5-tooling-README.md in case of download errors

## 0.4.3

*Released: 2025-11-11T19:29:27Z*

### Patch Changes

- a990ed6: feat: add @sap-ux/create/README.md as resource

## 0.4.2

*Released: 2025-11-05T06:53:42Z*

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md

## 0.4.1

*Released: 2025-10-22T18:56:41Z*

### Patch Changes

- fa9580c: chore - Rimraf upgrade

## 0.4.0

*Released: 2025-10-20T15:41:39Z*

### Minor Changes

- 27585ad: Pre-process document sources with LLM and to clean-up an optimize for RAG code generation.

## 0.3.0

*Released: 2025-10-15T11:11:41Z*

### Minor Changes

- e75b594: Add Fiori Development portal documentation to embeddings

## 0.2.0

*Released: 2025-10-09T12:00:16Z*

### Minor Changes

- b5b6c9c: Add FPM Development portal documentation to embeddings

## 0.1.1

*Released: 2025-10-06T17:09:01Z*

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 0.1.0

*Released: 2025-10-06T11:26:22Z*

### Minor Changes

- b179405: Refactor doc search to return human readable results. Simplify search and doc indexing

## 0.0.2

*Released: 2025-09-18T23:50:28Z*

### Patch Changes

- 306561e: Fix publishing of embeddings package

## 0.0.1

*Released: 2025-09-17T14:22:31Z*

### Patch Changes

- a7b6272: Add doc_search tool to Fiori MCP server using data from embeddings module.
