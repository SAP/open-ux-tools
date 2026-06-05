# @sap-ux/odata-entity-model

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

## 0.4.0

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

## 0.3.8

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates

## 0.3.7

### Patch Changes

- dfa433e: feat: Enabled support of referenced external metadata

## 0.3.6

### Patch Changes

- cc1c422: fix(deps): update dependency npm-run-all2 to v8

## 0.3.5

### Patch Changes

- 3795bb2: Add Node.js engine requirement (>=20.x)

## 0.3.4

### Patch Changes

- d667a5e: fix: add repository field to package.json

## 0.3.3

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.

## 0.3.2

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md

## 0.3.1

### Patch Changes

- 93f8a83: chore - upgrade typescript 5.6.2

## 0.3.0

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.2.1

### Patch Changes

- eb0b7b37: Chore - TypeScript 5 upgrade

## 0.2.0

### Minor Changes

- d6151909: add target kinds directly to metadata element

## 0.1.1

### Patch Changes

- b7bce4f4: feat: move odata-entity-model module
