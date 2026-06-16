# @sap-ux/sap-systems-ext-types

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

## 0.2.0

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

## 0.1.1

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates

## 0.1.0

### Minor Changes

- 2d20f19: adds support for the generic host connection type

## 0.0.4

*Released: 2026-01-16T12:32:24Z*

### Patch Changes

- c9fd939: update backend systems with system info from adt api

## 0.0.3

*Released: 2026-01-12T09:10:27Z*

### Patch Changes

- d667a5e: fix: add repository field to package.json

## 0.0.2

*Released: 2025-12-15T10:50:50Z*

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.

## 0.0.1

### Patch Changes

- cc65eec: adds new vscode sap systems extension
