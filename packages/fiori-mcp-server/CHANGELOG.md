# @sap-ux/fiori-mcp-server

## 1.9.1

### Patch Changes

#### Features

- Add sap.fe.test JSDoc API as a new embedded data source [[d54fc9a](https://github.com/SAP/open-ux-tools/commit/d54fc9a6937632e19e5b50dbf79ba50f279b3a39)]

## 1.9.0

### Minor Changes

#### Release Date

2026-07-08

#### Features

- add skill for opa5 test development for fiori apps [[f189d25](https://github.com/SAP/open-ux-tools/commit/f189d253808541f2f58fa950e28b7e14679c80a5)]

## 1.8.9

### Patch Changes

#### Dependency Updates

- align vscode and types with fiori tools extensions [[369c494](https://github.com/SAP/open-ux-tools/commit/369c49497073e99fda01bad7dfda1840e68c029a)]

## 1.8.8

### Patch Changes

#### Release Date

2026-07-06

#### Dependency Updates

- Rebuild bundle with updated @sap-ux/cds-odata-annotation-converter [[5b2a7f2](https://github.com/SAP/open-ux-tools/commit/5b2a7f2fce7f0faa43e2ab083ec25b80ea204503)]

## 1.8.7

### Patch Changes

#### Features

- Officially publish CF workflow in the ADP generator. [[58e9645](https://github.com/SAP/open-ux-tools/commit/58e9645465b48c7832d9da548df3d609c5c0d590)]

## 1.8.6

### Patch Changes

#### Release Date

2026-07-03

#### Dependency Updates

- Rebuild bundle with updated @sap-ux/axios-extension, @sap-ux/btp-utils, @sap-ux/odata-vocabularies, @sap-ux/ui5-config, @sap-ux/telemetry [[526d59b](https://github.com/SAP/open-ux-tools/commit/526d59b558a653635ab44ab10dbfedccb3c0dc43)]

## 1.8.5

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

## 1.8.4

### Patch Changes

#### Release Date

2026-07-03

#### Bug Fixes

- Adds service lookup. Improve MCP server instructions and schema descriptions to prevent AI clients from constructing invalid parameters. Enhanced tool descriptions with explicit DO/DON'T guidance, removed misleading examples that were being treated as templates, added catalog error reporting in service lookup failures, and strengthened server-level instructions with visual markers and consequence warnings. [[13f8400](https://github.com/SAP/open-ux-tools/commit/13f8400cea408fc68db50077a66aa52fc118c086)]

## 1.8.3

### Patch Changes

#### Release Date

2026-07-01

#### Dependency Updates

- Rebuild bundle with updated @sap-ux/telemetry [[f25db35](https://github.com/SAP/open-ux-tools/commit/f25db35917824f4c91e6f688f6566ffd5298c4f1)]

## 1.8.2

### Patch Changes

#### Bug Fixes

- Trigger @sap-ux/fiori-mcp-server release [[17354e0](https://github.com/SAP/open-ux-tools/commit/17354e08c50f44f031ad2bedcbcb6ce01acd96ba)]

## 1.8.1

### Patch Changes

#### Dependency Updates

- Upgrade patch-level dependencies [[aed328d](https://github.com/SAP/open-ux-tools/commit/aed328da8a5c93e226c58e4d7dc14c7c82756259)]

## 1.8.0

### Minor Changes

#### Release Date

2026-06-25

#### Features

- add ESLint agent skills for Fiori projects (setup, migrate, lint) [[045738d](https://github.com/SAP/open-ux-tools/commit/045738db600206b7a6bf1e28fdf6d344ea6485ca)]

## 1.7.1

### Patch Changes

#### Release Date

2026-06-24

#### Bug Fixes

- rename skill name to sap-fiori-app-development [[88f17e9](https://github.com/SAP/open-ux-tools/commit/88f17e9a249caffcd2334a5fd6ac360dc8ab3c57)]

## 1.7.0

### Minor Changes

#### Release Date

2026-06-24

#### Features

- add skill for usage of @sap-ux/create cli [[2733268](https://github.com/SAP/open-ux-tools/commit/2733268fc635cdef7bded697ecafc5237a59e6b7)]

## 1.6.0

### Minor Changes

#### Release Date

2026-06-24

#### Features

- add new skill for fiori elements development [[b021644](https://github.com/SAP/open-ux-tools/commit/b021644a977c70bc4ed5c548e0121ce65975feed)]

## 1.5.1

### Patch Changes

#### Release Date

2026-06-23

#### Bug Fixes

- Update visual and analytical chart creation with RAP scenario [[46d6081](https://github.com/SAP/open-ux-tools/commit/46d6081f7b6956bc9406c880ea22d6b90ae65262)]

## 1.5.0

### Minor Changes

#### Release Date

2026-06-22

#### Features

- promote static functionalities to top-level MCP tools

    Promotes generate-fiori-ui-application, generate-fiori-ui-application-cap, fetch-service-metadata, and list-sap-systems to dedicated top-level MCP tools, removing them from the 3-step list/get_details/execute workflow. Reduces round-trips for generation workflows from 3 calls to 1. list_sap_systems and download_odata_service_metadata are environment-aware: on SAP Business Application Studio they use BTP destinations, on VSCode they use the Fiori tools system store. download_odata_service_metadata returns a destination field on BAS which must be passed into the generator service config. Errors from fetch-service-metadata return a structured response instead of propagating as unhandled exceptions. Entity names in generator config are normalised by stripping wrapping single quotes. Generator wrappers use Zod-inferred types instead of Record<string, unknown>. [[fdc185d](https://github.com/SAP/open-ux-tools/commit/fdc185d3db4046847d3d660354f1b371eff88c19)]

## 1.4.1

_Released: 2026-06-16T21:19:36Z_

### Patch Changes

#### Bug Fixes

- OPA5 embeddings chunk formatting [[70f934e](https://github.com/SAP/open-ux-tools/commit/70f934e20e2e91aabccc02fc6e3d8f25940edc95)]

## 1.4.0

_Released: 2026-06-12T13:04:20Z_

### Minor Changes

- a7ed101: Add opa5_docu.md to doc_search

## 1.3.0

_Released: 2026-06-11T19:07:40Z_

### Minor Changes

- c1d3564: FEAT: Add skill for analytical chart

## 1.2.0

_Released: 2026-06-11T16:48:19Z_

### Minor Changes

- 14c8584: FEAT: update visual filter skill with ABAP RAP support.

## 1.1.4

_Released: 2026-06-10T16:48:39Z_

### Patch Changes

- 2dffcb0: FIX: Apply TLS patch, fix Zowe keyring loading, format metadata XML, pass real HOME to MCP server,
    - Apply `TlsPatch` in `fetch-service-metadata` before constructing `AbapServiceProvider` (was bypassed by instantiating directly instead of via `createForAbap`)
    - Bundle `@zowe/secrets-for-zowe-sdk` native keyring via an inline shim that loads the platform `.node` binary directly from `dist/prebuilds/`, fixing credential lookup when running from a tgz install
    - Use `SAP_TOOLS_DIR || getSapToolsDirectory()` to locate `~/.saptools` independently of `HOME`, so stored SAP systems are found even when the test harness overrides `HOME`
    - Format fetched EDMX metadata with `xml-formatter` (4-space indent) before writing `metadata.xml`
    - Surface the original XML parse error message when EDMX validation fails
    - search_docs fails in BAS/Docker with "Unsupported device: cpu"

## 1.1.3

_Released: 2026-06-08T12:39:24Z_

### Patch Changes

- 74a3c3f: Switch to onnxruntime-web (WASM) to eliminate native binaries and reduce tgz to ~9 MB

## 1.1.2

_Released: 2026-06-05T20:41:12Z_

### Patch Changes

- 5a70fbf: Download ONNX model at runtime to reduce tgz below npm publish 100 MB limit

## 1.1.1

_Released: 2026-06-05T16:17:23Z_

### Patch Changes

- 889a217: Download ONNX model at runtime to reduce tgz below npm publish 100 MB limit

## 1.1.0

_Released: 2026-06-05T11:08:04Z_

### Minor Changes

- 9f33150: Build self-contained dist/ bundle (ONNX model, onnxruntime, embeddings data included);
  Replace @xenova/transformers with @huggingface/transformers 4.2.0;

## 1.0.3

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/fiori-docs-embeddings@1.0.1
    - @sap-ux/store@2.0.1

## 1.0.2

_Released: 2026-06-01T17:22:37Z_

### Patch Changes

- 0268c25: Replace negated typeof checks to avoid SonarQube findings
    - @sap-ux/fiori-docs-embeddings@1.0.0

## 1.0.1

_Released: 2026-05-31T21:32:23Z_

### Patch Changes

- 35962a9: fix: bundle odata-annotation-core, odata-annotation-core-types and text-document-utils instead of marking them as external

    These packages have no bundling obstacles and should be inlined into the dist rather than left as unresolved external imports that cause `ERR_MODULE_NOT_FOUND` when the server is run via npx.

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

### Patch Changes

- Updated dependencies [32609a7]
    - @sap-ux/fiori-docs-embeddings@1.0.0
    - @sap-ux/store@2.0.0

## 0.7.2

_Released: 2026-05-27T10:42:47Z_

### Patch Changes

- Updated dependencies [c12420a]
    - @sap-ux/store@1.6.1
    - @sap-ux/fiori-docs-embeddings@0.5.1

## 0.7.1

_Released: 2026-05-21T05:46:16Z_

### Patch Changes

- Updated dependencies [12137f6]
    - @sap-ux/fiori-docs-embeddings@0.5.1

## 0.7.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/fiori-docs-embeddings@0.5.0
    - @sap-ux/store@1.6.0

## 0.6.60

_Released: 2026-05-14T12:51:22Z_

### Patch Changes

- 59537d3: chore: override sharp to >=0.33.5 to fix CI build on darwin-arm64
- Updated dependencies [59537d3]
    - @sap-ux/fiori-docs-embeddings@0.4.20

## 0.6.59

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/fiori-docs-embeddings@0.4.19
    - @sap-ux/store@1.5.14

## 0.6.58

_Released: 2026-05-13T17:45:03Z_

### Patch Changes

- 4101c21: fix: connect stdio transport before telemetry init to fix Claude Desktop extension disconnect

## 0.6.57

_Released: 2026-05-12T23:31:37Z_

### Patch Changes

- c4bd625: Improve documentation Claude code, etc...

## 0.6.56

_Released: 2026-05-11T09:58:34Z_

### Patch Changes

- Updated dependencies [a5c05a8]
    - @sap-ux/fiori-docs-embeddings@0.4.18

## 0.6.55

_Released: 2026-05-07T13:23:43Z_

### Patch Changes

- 2781f39: fix: add missing apache-arrow runtime dependency required by @lancedb/lancedb

## 0.6.54

_Released: 2026-05-07T11:24:28Z_

### Patch Changes

- 35f4b68: chore: update plugin.json manifest name to sap-fiori-mcp-server and fix author metadata

## 0.6.53

_Released: 2026-05-04T15:49:13Z_

### Patch Changes

- Updated dependencies [e4a2488]
    - @sap-ux/fiori-docs-embeddings@0.4.17

## 0.6.52

_Released: 2026-04-28T09:04:02Z_

### Patch Changes

- cf59d8e: feat: add Claude Code plugin support

## 0.6.51

_Released: 2026-04-23T10:18:53Z_

### Patch Changes

- d9ae55c: fix: improve floorplan descriptions and make service/entityConfig optional for FF_SIMPLE (Basic template)

## 0.6.50

_Released: 2026-04-23T09:36:26Z_

### Patch Changes

- c88661f: fix(deps): update dependency @langchain/core to v1.1.40

## 0.6.49

_Released: 2026-04-14T09:46:36Z_

### Patch Changes

- 7746b58: feat: add MCP registry manifest for registry.modelcontextprotocol.io

## 0.6.48

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- f1e4481: chore(fiori-mcp-server): upgrade @modelcontextprotocol/sdk 1.28.0 → 1.29.0 (hono/express-rate-limit/path-to-regexp security fixes)
    - @sap-ux/fiori-docs-embeddings@0.4.16
    - @sap-ux/store@1.5.13

## 0.6.47

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(fiori-mcp-server): remove stale @types/diff devDependency (diff v8 ships own types); upgrade shared devDependencies (jest 30)
- Updated dependencies [c53a4ba]
    - @sap-ux/store@1.5.12
    - @sap-ux/fiori-docs-embeddings@0.4.16

## 0.6.46

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- Updated dependencies [a41533f]
    - @sap-ux/store@1.5.11
    - @sap-ux/fiori-docs-embeddings@0.4.16

## 0.6.45

_Released: 2026-03-23T14:11:51Z_

### Patch Changes

- 55d833f: fix i18next init showSupportNotice: false.

## 0.6.44

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18
- Updated dependencies [55417bb]
    - @sap-ux/store@1.5.10
    - @sap-ux/fiori-docs-embeddings@0.4.16

## 0.6.43

_Released: 2026-03-16T23:16:05Z_

### Patch Changes

- 1b7094e: fix(deps): update dependency @sap/ux-specification to v1.144.0

## 0.6.42

_Released: 2026-03-13T09:41:40Z_

### Patch Changes

- 681f169: fix: MCP server title

## 0.6.41

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- 7c06ef0: fix(deps): update dependencies [open-ux-odata]
    - @sap-ux/fiori-docs-embeddings@0.4.16

## 0.6.40

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- e773022: fix(deps): update dependency @sap-ai-sdk/foundation-models to v2.8.0
    - @sap-ux/fiori-docs-embeddings@0.4.16
    - @sap-ux/store@1.5.9

## 0.6.39

_Released: 2026-03-04T19:53:52Z_

### Patch Changes

- afd2fa2: feat: add icon and title to mcp server

## 0.6.38

_Released: 2026-03-04T15:52:08Z_

### Patch Changes

- a8f4e03: fix(deps): update dependency @sap-ai-sdk/langchain to v2.8.0
- 2302698: fix(deps): update dependency @sap-ux/edmx-parser to v0.10.0
    - @sap-ux/fiori-docs-embeddings@0.4.16

## 0.6.37

_Released: 2026-03-03T08:27:12Z_

### Patch Changes

- 4af92b5: add node: proto prefix to imports
    - @sap-ux/fiori-docs-embeddings@0.4.16

## 0.6.36

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/fiori-docs-embeddings@0.4.16

## 0.6.35

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- Updated dependencies [6c993f3]
    - @sap-ux/store@1.5.8
    - @sap-ux/fiori-docs-embeddings@0.4.15

## 0.6.34

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- 94d370f: fix(deps): update dependency @langchain/mcp-adapters to v1.1.3
    - @sap-ux/fiori-docs-embeddings@0.4.15

## 0.6.33

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- ff634b0: fix(deps): update dependency @sap-ux/edmx-parser to v0.9.8
    - @sap-ux/fiori-docs-embeddings@0.4.15

## 0.6.32

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12
- Updated dependencies [cbd340a]
    - @sap-ux/store@1.5.7
    - @sap-ux/fiori-docs-embeddings@0.4.15

## 0.6.31

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- 1371f6b: fix(deps): update dependency @langchain/core to v1.1.26
    - @sap-ux/fiori-docs-embeddings@0.4.15

## 0.6.30

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/fiori-docs-embeddings@0.4.15

## 0.6.29

_Released: 2026-02-13T16:18:58Z_

### Patch Changes

- Updated dependencies [9f94937]
    - @sap-ux/store@1.5.6
    - @sap-ux/fiori-docs-embeddings@0.4.14

## 0.6.28

_Released: 2026-02-10T21:03:43Z_

### Patch Changes

- Updated dependencies [3795bb2]
    - @sap-ux/fiori-docs-embeddings@0.4.14

## 0.6.27

_Released: 2026-02-05T13:53:56Z_

### Patch Changes

- Updated dependencies [38e215e]
    - @sap-ux/store@1.5.5
    - @sap-ux/fiori-docs-embeddings@0.4.13

## 0.6.26

_Released: 2026-02-05T11:39:04Z_

### Patch Changes

- b8efec5: Update dependency "@modelcontextprotocol/sdk": "1.26.0"
- Updated dependencies [83e3b70]
    - @sap-ux/store@1.5.4
    - @sap-ux/fiori-docs-embeddings@0.4.13

## 0.6.25

_Released: 2026-02-05T09:48:57Z_

### Patch Changes

- 32a9147: chore(deps): update dependency @langchain/mcp-adapters to v1.1.2
    - @sap-ux/fiori-docs-embeddings@0.4.13

## 0.6.24

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- 9f11dd2: chore - address audit issues
    - @sap-ux/fiori-docs-embeddings@0.4.13

## 0.6.23

_Released: 2026-02-04T17:27:24Z_

### Patch Changes

- bd48387: Update readme for Self-Signed SSL Certificates

## 0.6.22

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [c3a1e07]
    - @sap-ux/fiori-docs-embeddings@0.4.13

## 0.6.21

_Released: 2026-02-02T10:47:12Z_

### Patch Changes

- 6b659e7: feat: add tool annotations for better AI guidance

## 0.6.20

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- @sap-ux/fiori-docs-embeddings@0.4.12
- @sap-ux/store@1.5.3

## 0.6.19

_Released: 2026-01-30T16:18:20Z_

### Patch Changes

- Updated dependencies [4eac0a7]
    - @sap-ux/fiori-docs-embeddings@0.4.12

## 0.6.18

_Released: 2026-01-29T08:53:41Z_

### Patch Changes

- 5d50232: feat: add telemetry tracking for MCP server sessions and handlers

## 0.6.17

_Released: 2026-01-29T08:15:00Z_

### Patch Changes

- 529408b: refactor: adjust telemetry functionalityId reporting

## 0.6.16

_Released: 2026-01-28T10:59:00Z_

### Patch Changes

- Updated dependencies [a686522]
    - @sap-ux/fiori-docs-embeddings@0.4.11

## 0.6.15

_Released: 2026-01-28T00:19:05Z_

### Patch Changes

- Updated dependencies [be6ea11]
    - @sap-ux/store@1.5.2
    - @sap-ux/fiori-docs-embeddings@0.4.10

## 0.6.14

_Released: 2026-01-23T22:30:10Z_

### Patch Changes

- d11943d: fix(deps): update dependency i18next to v25.8.0
    - @sap-ux/fiori-docs-embeddings@0.4.10

## 0.6.13

_Released: 2026-01-23T17:12:38Z_

### Patch Changes

- Updated dependencies [c99758e]
    - @sap-ux/fiori-docs-embeddings@0.4.10

## 0.6.12

_Released: 2026-01-23T14:04:48Z_

### Patch Changes

- 924e26f: fix(deps): update dependency @sap/ux-specification to v1.142.0

## 0.6.11

_Released: 2026-01-23T12:49:27Z_

### Patch Changes

- Updated dependencies [32f8644]
    - @sap-ux/store@1.5.1
    - @sap-ux/fiori-docs-embeddings@0.4.9

## 0.6.10

_Released: 2026-01-19T11:29:24Z_

### Patch Changes

- f4cf1d2: Update readme to contain description of latest features

## 0.6.9

_Released: 2026-01-17T12:32:50Z_

### Patch Changes

- 5652318: fix(server): downgrade MCP protocol version to '2024-11-05' to better backward compatibility

## 0.6.8

_Released: 2026-01-16T12:32:24Z_

### Patch Changes

- Updated dependencies [c9fd939]
    - @sap-ux/store@1.5.0
    - @sap-ux/fiori-docs-embeddings@0.4.9

## 0.6.7

_Released: 2026-01-13T23:21:31Z_

### Patch Changes

- b116439: chore(deps): update dependency @modelcontextprotocol/sdk to v1.25.2
- d17fb22: chore(deps): update dependency @langchain/core to v1.1.8 [security]

## 0.6.6

_Released: 2026-01-12T11:11:42Z_

### Patch Changes

- 5c34d46: feat(telemetry): enhance telemetry data with MCP client info and do not pass telemetry data when unknownTool

## 0.6.5

_Released: 2026-01-12T09:10:27Z_

### Patch Changes

- Updated dependencies [d667a5e]
    - @sap-ux/fiori-docs-embeddings@0.4.9

## 0.6.4

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/fiori-docs-embeddings@0.4.8

## 0.6.3

_Released: 2026-01-08T17:12:17Z_

### Patch Changes

- 2204ad3: fix(deps): update dependencies @sap-ux/annotation-converter to v0.10.19 and @sap-ux/vocabularies-types to v0.14.5
    - @sap-ux/fiori-docs-embeddings@0.4.7

## 0.6.2

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- c7f9a60: Log to file instead of STDIO
    - @sap-ux/fiori-docs-embeddings@0.4.7
    - @sap-ux/store@1.4.2

## 0.6.1

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/fiori-docs-embeddings@0.4.7
    - @sap-ux/store@1.4.1

## 0.6.0

_Released: 2025-12-18T08:56:52Z_

### Minor Changes

- 5287327: Updated @sap-ux/annotation-converter to version 0.10.9 and @sap-ux/vocabularies-types to version 0.13.2 across multiple packages. These changes ensure that the latest versions with potential fixes and enhancements are used.

### Patch Changes

- @sap-ux/fiori-docs-embeddings@0.4.6

## 0.5.2

_Released: 2025-12-16T11:43:52Z_

### Patch Changes

- ba58398: adds mandatory props to backend systems and migrates existing
- Updated dependencies [ba58398]
    - @sap-ux/store@1.4.0
    - @sap-ux/fiori-docs-embeddings@0.4.6

## 0.5.1

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/fiori-docs-embeddings@0.4.6
    - @sap-ux/store@1.3.5

## 0.5.0

_Released: 2025-12-12T12:38:21Z_

### Minor Changes

- 7217d7d: Update to the latest `@sap/ux-specification` version and remove unused code related to the application model and schema parsing.

### Patch Changes

- @sap-ux/fiori-docs-embeddings@0.4.5

## 0.4.11

_Released: 2025-12-12T09:02:37Z_

### Patch Changes

- 63eec1e: fix(fiori-mcp): fix cap service schema and logger errors in stdio
    - @sap-ux/fiori-docs-embeddings@0.4.5

## 0.4.10

_Released: 2025-12-09T15:45:14Z_

### Patch Changes

- 8e8e7ce: fix(fiori-mcp): add service metadata validation

## 0.4.9

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- Updated dependencies [037a430]
    - @sap-ux/store@1.3.4
    - @sap-ux/fiori-docs-embeddings@0.4.5

## 0.4.8

_Released: 2025-12-04T14:58:56Z_

### Patch Changes

- d08a64c: fix: mcp server load the latest embeddings package on install/ npx

## 0.4.7

_Released: 2025-12-03T10:00:07Z_

### Patch Changes

- 3dd6b06: version bump for mcp sdk and specification

## 0.4.6

_Released: 2025-12-02T12:30:36Z_

### Patch Changes

- 4f7aa43: fix(fiori-mcp): improve non-cap app-gen input schema

## 0.4.5

_Released: 2025-12-01T12:26:44Z_

### Patch Changes

- 9d0c8e0: fix(fiori-mcp): fix missing dependency

## 0.4.4

_Released: 2025-11-28T13:00:10Z_

### Patch Changes

- 66ca93f: chore(fiori-mcp): fix pipeline

## 0.4.3

_Released: 2025-11-28T10:44:15Z_

### Patch Changes

- 00c7a0a: feat: add generate-fiori-ui-application functionality and rename existing generate-fiori-ui-app to generate-fiori-ui-application-cap

## 0.4.2

_Released: 2025-11-26T00:12:42Z_

### Patch Changes

- 597834f: chore - update "@sap-ux/annotation-converter": "0.10.8" and "@sap-ux/vocabularies-types": "0.13.1"

## 0.4.1

_Released: 2025-11-14T20:58:09Z_

### Patch Changes

- 9544c24: fix: page creation fails in v2

## 0.4.0

_Released: 2025-11-10T12:32:12Z_

### Minor Changes

- bfbdb77: - First integration tests using promptfoo
    - Updated input schema for 'execute-functionality' - sometimes input parameters was passed outside of `parameters` property

## 0.3.3

_Released: 2025-11-06T12:16:07Z_

### Patch Changes

- f1a2795: fix: Instrumentation key

## 0.3.2

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/fiori-docs-embeddings@0.4.2

## 0.3.1

_Released: 2025-10-29T12:50:30Z_

### Patch Changes

- f7cb5b1: Fix: Pass `layer` and `ui5Version` to the specification API method `exportConfig`.

## 0.3.0

_Released: 2025-10-27T13:41:31Z_

### Minor Changes

- d895232: - fix: V2 app crash when running `list-functionalities`
    - feat: add support for changing flex properties in V2 app

## 0.2.5

_Released: 2025-10-21T05:22:49Z_

### Patch Changes

- 8b7171e: chore: readme update - how to disable telemetry

## 0.2.4

_Released: 2025-10-15T11:11:41Z_

### Patch Changes

- e75b594: Add Fiori Development portal documentation to embeddings
- Updated dependencies [e75b594]
    - @sap-ux/fiori-docs-embeddings@0.3.0

## 0.2.3

_Released: 2025-10-10T09:39:17Z_

### Patch Changes

- e015869: chore: patch inquirer dependency

## 0.2.2

_Released: 2025-10-08T12:33:12Z_

### Patch Changes

- 8a97bcc: fix "Error [ERR_REQUIRE_ESM]" when starting fiori mcp server e.g. Nodejs 22.8.0

## 0.2.1

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/fiori-docs-embeddings@0.1.1

## 0.2.0

_Released: 2025-10-06T11:26:22Z_

### Minor Changes

- b179405: Refactor doc search to return human readable results. Simplify search and doc indexing

### Patch Changes

- Updated dependencies [b179405]
    - @sap-ux/fiori-docs-embeddings@0.1.0

## 0.1.6

_Released: 2025-09-30T05:59:47Z_

### Patch Changes

- f038ab8: Refactored `get-functionality-details` to return parameters as JSON Schema, unified with Zod validation (validateWithSchema) and schema conversion (convertion to JSON Schema).

## 0.1.5

_Released: 2025-09-23T10:15:54Z_

### Patch Changes

- 5591f68: feat: integrate ux logger utility across the fiori-mcp-server package

## 0.1.4

_Released: 2025-09-23T08:21:10Z_

### Patch Changes

- 8c01a6f: add hint for AGENTS.md to readme

## 0.1.3

_Released: 2025-09-22T12:45:08Z_

### Patch Changes

- f3768a9: Update MCP to use snake case instead of kebab case in MCP tool names. Rename doc_search to search_docs.

## 0.1.2

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- 9872384: Upgrade axios module

## 0.1.1

_Released: 2025-09-18T23:50:28Z_

### Patch Changes

- 306561e: Fix publishing of embeddings package

## 0.1.0

_Released: 2025-09-17T14:22:31Z_

### Minor Changes

- a7b6272: Add doc_search tool to Fiori MCP server using data from embeddings module.

## 0.0.11

_Released: 2025-09-16T20:04:56Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.6.20

## 0.0.10

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- @sap-ux/project-access@1.30.14
- @sap-ux/telemetry@0.6.20
- @sap-ux/fiori-annotation-api@0.6.19

## 0.0.9

_Released: 2025-09-15T09:07:18Z_

### Patch Changes

- 5b06421: Simplify "generate-fiori-ui-application-cap" input params by removing the "appGenConfig" nesting level and unnecessary properties such as "appGenConfig.telemetryData" and "projectPath".

## 0.0.8

_Released: 2025-09-12T07:38:54Z_

### Patch Changes

- Updated dependencies [a6ff2aa]
    - @sap-ux/fiori-annotation-api@0.6.18

## 0.0.7

_Released: 2025-09-11T13:45:54Z_

### Patch Changes

- e82605e: Move "npm install" outside MCP create app call.
  Add try catch on telemetry init

## 0.0.6

_Released: 2025-09-11T09:30:17Z_

### Patch Changes

- ac9a2d0: feat: collect telemetry

## 0.0.5

_Released: 2025-09-10T10:08:07Z_

### Patch Changes

- cbd2a6f: Use Zod schemas to generate input/output JSON schemas and TypeScript types

## 0.0.4

_Released: 2025-09-05T08:52:38Z_

### Patch Changes

- a8ca635: `execute-functionality`: Functionality `add-page` - imposible to add Custom Page as `viewName` is ignored.
  `get-functionality-details`: Functionality `add-page` - provide only `ObjectPage`, `ListReport`, `CustomPage` as valid creation options.

## 0.0.3

_Released: 2025-09-05T05:50:10Z_

### Patch Changes

- 4fad77a: Regenerate output schema for 'get_functionality_details' tool

## 0.0.2

_Released: 2025-09-03T15:46:36Z_

### Patch Changes

- b2effee: fix CAP preview after generation - do npm install on CAP project and make service path absolute

## 0.0.1

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- 38ecd39: Initial version of the fiori-mcp-server package

## 0.0.1

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.6.17
- @sap-ux/project-access@1.30.13
