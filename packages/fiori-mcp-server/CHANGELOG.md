# @sap-ux/fiori-mcp-server

## 0.2.3

### Patch Changes

-   e015869: chore: patch inquirer dependency

## 0.2.2

### Patch Changes

-   8a97bcc: fix "Error [ERR_REQUIRE_ESM]" when starting fiori mcp server e.g. Nodejs 22.8.0

## 0.2.1

### Patch Changes

-   43a2446: chore: fix Sonar issues
-   Updated dependencies [43a2446]
    -   @sap-ux/fiori-docs-embeddings@0.1.1

## 0.2.0

### Minor Changes

-   b179405: Refactor doc search to return human readable results. Simplify search and doc indexing

### Patch Changes

-   Updated dependencies [b179405]
    -   @sap-ux/fiori-docs-embeddings@0.1.0

## 0.1.6

### Patch Changes

-   f038ab8: Refactored `get-functionality-details` to return parameters as JSON Schema, unified with Zod validation (validateWithSchema) and schema conversion (convertion to JSON Schema).

## 0.1.5

### Patch Changes

-   5591f68: feat: integrate ux logger utility across the fiori-mcp-server package

## 0.1.4

### Patch Changes

-   8c01a6f: add hint for AGENTS.md to readme

## 0.1.3

### Patch Changes

-   f3768a9: Update MCP to use snake case instead of kebab case in MCP tool names. Rename doc_search to search_docs.

## 0.1.2

### Patch Changes

-   9872384: Upgrade axios module

## 0.1.1

### Patch Changes

-   306561e: Fix publishing of embeddings package

## 0.1.0

### Minor Changes

-   a7b6272: Add doc_search tool to Fiori MCP server using data from embeddings module.

## 0.0.11

### Patch Changes

-   @sap-ux/fiori-annotation-api@0.6.20

## 0.0.10

### Patch Changes

-   @sap-ux/project-access@1.30.14
-   @sap-ux/telemetry@0.6.20
-   @sap-ux/fiori-annotation-api@0.6.19

## 0.0.9

### Patch Changes

-   5b06421: Simplify "generate-fiori-ui-app" input params by removing the "appGenConfig" nesting level and unnecessary properties such as "appGenConfig.telemetryData" and "projectPath".

## 0.0.8

### Patch Changes

-   Updated dependencies [a6ff2aa]
    -   @sap-ux/fiori-annotation-api@0.6.18

## 0.0.7

### Patch Changes

-   e82605e: Move "npm install" outside MCP create app call.
    Add try catch on telemetry init

## 0.0.6

### Patch Changes

-   ac9a2d0: feat: collect telemetry

## 0.0.5

### Patch Changes

-   cbd2a6f: Use Zod schemas to generate input/output JSON schemas and TypeScript types

## 0.0.4

### Patch Changes

-   a8ca635: `execute-functionality`: Functionality `add-page` - imposible to add Custom Page as `viewName` is ignored.
    `get-functionality-details`: Functionality `add-page` - provide only `ObjectPage`, `ListReport`, `CustomPage` as valid creation options.

## 0.0.3

### Patch Changes

-   4fad77a: Regenerate output schema for 'get_functionality_details' tool

## 0.0.2

### Patch Changes

-   b2effee: fix CAP preview after generation - do npm install on CAP project and make service path absolute

## 0.0.1

### Patch Changes

-   38ecd39: Initial version of the fiori-mcp-server package

## 0.0.1

### Patch Changes

-   @sap-ux/fiori-annotation-api@0.6.17
-   @sap-ux/project-access@1.30.13
