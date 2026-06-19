# @sap-ux/jest-file-matchers

## 1.0.1

*Released: 2026-06-03T14:58:37Z*

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)

## 1.0.0

*Released: 2026-05-30T20:54:07Z*

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

*Released: 2026-05-15T08:12:20Z*

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

## 0.2.12

*Released: 2026-05-14T11:45:51Z*

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates

## 0.2.11

*Released: 2026-03-05T12:30:25Z*

### Patch Changes

- ce6ed1d: fix(deps): update dependency filenamify to v4.3.0

## 0.2.10

*Released: 2026-03-03T10:41:51Z*

### Patch Changes

- b82db06: Direct minimatch version upgrade

## 0.2.9

*Released: 2026-02-10T21:03:43Z*

### Patch Changes

- 3795bb2: Add Node.js engine requirement (>=20.x)

## 0.2.8

*Released: 2025-12-15T10:50:50Z*

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.

## 0.2.7

*Released: 2025-11-26T15:31:06Z*

### Patch Changes

- 605fdca: Remove replace mkdirp with node native functionality

## 0.2.6

*Released: 2025-11-05T06:53:42Z*

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md

## 0.2.5

*Released: 2025-10-06T17:09:01Z*

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 0.2.4

*Released: 2025-07-10T10:39:56Z*

### Patch Changes

- edac6f4: adds matcher for ui5 version in appgeninfo

## 0.2.3

*Released: 2025-06-30T08:46:50Z*

### Patch Changes

- b9675bb: Improve Fiori Tools UI Texts

## 0.2.2

*Released: 2025-05-27T17:59:17Z*

### Patch Changes

- ac55cca: adds .appGenInfo.json file

## 0.2.1

*Released: 2024-10-04T15:21:13Z*

### Patch Changes

- 93f8a83: chore - upgrade typescript 5.6.2

## 0.2.0

*Released: 2024-07-05T15:03:05Z*

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.1.2

*Released: 2024-02-19T14:48:07Z*

### Patch Changes

- dbaba67c: export types

## 0.1.1

*Released: 2024-02-07T11:10:48Z*

### Patch Changes

- eb0b7b37: Chore - TypeScript 5 upgrade

## 0.1.0

### Minor Changes

- f3519607: creates new module sap-ux/jest-file-matchers
