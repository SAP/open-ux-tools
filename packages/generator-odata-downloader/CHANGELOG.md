# @sap-ux/generator-odata-downloader

## 0.3.3

### Patch Changes

- Updated dependencies [9580241]
    - @sap-ux/ui5-config@1.0.1
    - @sap-ux/mockserver-config-writer@1.0.2
    - @sap-ux/odata-service-writer@1.0.2
    - @sap-ux/project-access@2.0.2
    - @sap-ux/telemetry@1.0.3
    - @sap-ux/odata-service-inquirer@3.0.3
    - @sap-ux/inquirer-common@1.0.3
    - @sap-ux/axios-extension@2.0.0
    - @sap-ux/fiori-generator-shared@1.0.3

## 0.3.2

### Patch Changes

- @sap-ux/odata-service-inquirer@3.0.2
- @sap-ux/telemetry@1.0.2
- @sap-ux/fiori-generator-shared@1.0.2
- @sap-ux/inquirer-common@1.0.2

## 0.3.1

### Patch Changes

- Updated dependencies [aed799d]
    - @sap-ux/project-access@2.0.1
    - @sap-ux/axios-extension@2.0.0
    - @sap-ux/fiori-generator-shared@1.0.1
    - @sap-ux/inquirer-common@1.0.1
    - @sap-ux/mockserver-config-writer@1.0.1
    - @sap-ux/odata-service-inquirer@3.0.1
    - @sap-ux/odata-service-writer@1.0.1
    - @sap-ux/telemetry@1.0.1

## 0.3.0

### Minor Changes

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
    - @sap-ux/mockserver-config-writer@1.0.0
    - @sap-ux/fiori-generator-shared@1.0.0
    - @sap-ux/odata-service-inquirer@3.0.0
    - @sap-ux/odata-service-writer@1.0.0
    - @sap-ux/axios-extension@2.0.0
    - @sap-ux/inquirer-common@1.0.0
    - @sap-ux/project-access@2.0.0
    - @sap-ux/ui5-config@1.0.0
    - @sap-ux/btp-utils@2.0.0
    - @sap-ux/telemetry@1.0.0
    - @sap-ux/logger@1.0.0
    - @sap-ux/store@2.0.0

## 0.2.0

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

## 0.1.2

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates

## 0.1.1

### Patch Changes

- 18e298b: Package is self contained, no external dependencies required.

## 0.1.0

### Minor Changes

- 9244c23: Adds recursive hierarchy support

## 0.0.10

### Patch Changes

- c53a4ba: chore(generator-odata-downloader): upgrade shared devDependencies (jest 30, i18next 25, @types/yeoman-generator 5.2.14)

## 0.0.9

### Patch Changes

- 55d833f: fix i18next init showSupportNotice: false.

## 0.0.8

*Released: 2026-03-19T15:30:29Z*

### Patch Changes

- 42b558b: Updates readme. Move deps tto devDeps

## 0.0.7

*Released: 2026-03-18T16:51:44Z*

### Patch Changes

- Updated dependencies [ae6758f]
    - @sap-ux/fiori-generator-shared@0.13.87
    - @sap-ux/inquirer-common@0.11.25
    - @sap-ux/odata-service-inquirer@2.19.14

## 0.0.6

*Released: 2026-03-17T07:55:04Z*

### Patch Changes

- Updated dependencies [a854433]
    - @sap-ux/axios-extension@1.25.24
    - @sap-ux/fiori-generator-shared@0.13.86
    - @sap-ux/odata-service-inquirer@2.19.13
    - @sap-ux/odata-service-writer@0.30.1

## 0.0.5

*Released: 2026-03-17T01:04:22Z*

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18
- Updated dependencies [5d452e5]
- Updated dependencies [55417bb]
    - @sap-ux/axios-extension@1.25.23
    - @sap-ux/btp-utils@1.1.10
    - @sap-ux/fiori-generator-shared@0.13.86
    - @sap-ux/inquirer-common@0.11.24
    - @sap-ux/mockserver-config-writer@0.9.63
    - @sap-ux/odata-service-inquirer@2.19.12
    - @sap-ux/odata-service-writer@0.30.1
    - @sap-ux/store@1.5.10
    - @sap-ux/telemetry@0.6.87
    - @sap-ux/ui5-config@0.29.21

## 0.0.4

*Released: 2026-03-16T23:16:05Z*

### Patch Changes

- 1b7094e: fix(deps): update dependency @sap/ux-specification to v1.144.0
    - @sap-ux/odata-service-inquirer@2.19.11

## 0.0.3

*Released: 2026-03-13T18:19:04Z*

### Patch Changes

- 076623d: Renames folder, fixes publish by renaming package

## 0.0.2

### Patch Changes

- b7461bc: Adds new package @sap-ux/generator-odata-downloader
