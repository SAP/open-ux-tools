# @sap-ux/jest-runner-puppeteer

## 1.0.1

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

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

## 0.3.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

## 0.2.10

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates

## 0.2.9

_Released: 2026-03-03T08:27:12Z_

### Patch Changes

- 4af92b5: add node: proto prefix to imports

## 0.2.8

_Released: 2026-03-02T13:05:37Z_

### Patch Changes

- 3fc8c21: fix(deps): update dependency puppeteer-core to v24
  replace ignoreHTTPSErrors with acceptInsecureCerts after puppeteer v24 upgrade

## 0.2.7

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- 469c90c: fix(deps): update dependency which to v6

## 0.2.6

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- d588c26: fix(deps): update dependency rimraf to v6.1.3

## 0.2.5

_Released: 2026-02-10T21:03:43Z_

### Patch Changes

- 3795bb2: Add Node.js engine requirement (>=20.x)

## 0.2.4

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- 9f11dd2: chore - address audit issues

## 0.2.3

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.

## 0.2.2

_Released: 2025-11-26T15:31:06Z_

### Patch Changes

- 605fdca: Remove replace mkdirp with node native functionality

## 0.2.1

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md

## 0.2.0

_Released: 2025-10-08T10:34:44Z_

### Minor Changes

- f4cd036: Move rimraf to dependencies.

## 0.1.2

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 0.1.1

_Released: 2024-10-04T15:21:13Z_

### Patch Changes

- 93f8a83: chore - upgrade typescript 5.6.2

## 0.1.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.0.2

### Patch Changes

- 9b6f4c87: adds new jest runner puppeteer module
