# @sap-ux/fiori-tools-settings

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

## 0.3.0

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

## 0.2.4

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates

## 0.2.3

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.

## 0.2.2

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md

## 0.2.1

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 0.2.0

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

## 0.1.0

### Minor Changes

- 04b3e6c: Added app info file handling logic to .fioritools folder
