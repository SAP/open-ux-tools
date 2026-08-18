# @sap-ux/serve-static-middleware

## 1.0.3

### Patch Changes

#### Workspace Updates

- @sap-ux/logger 1.0.2 → 1.0.3

## 1.0.2

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

#### Workspace Updates

- @sap-ux/logger 1.0.1 → 1.0.2

## 1.0.1

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/logger@1.0.1

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
    - @sap-ux/logger@1.0.0

## 0.5.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/logger@0.9.0

## 0.4.14

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/logger@0.8.6

## 0.4.13

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- Updated dependencies [f1e4481]
    - @sap-ux/logger@0.8.5

## 0.4.12

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- Updated dependencies [c53a4ba]
    - @sap-ux/logger@0.8.4

## 0.4.11

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- Updated dependencies [a41533f]
    - @sap-ux/logger@0.8.3

## 0.4.10

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- Updated dependencies [45d4797]
    - @sap-ux/logger@0.8.2

## 0.4.9

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- c043712: fix(deps): update dependency supertest to v7.2.2

## 0.4.8

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- Updated dependencies [ea7a16c]
    - @sap-ux/logger@0.8.1

## 0.4.7

_Released: 2026-01-14T13:30:42Z_

### Patch Changes

- ce4b29c: Upgrade qs/body-parser/express

## 0.4.6

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- e111d0d: fix sonar issues

## 0.4.5

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/logger@0.8.0

## 0.4.4

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- Updated dependencies [a9471d0]
    - @sap-ux/logger@0.7.3

## 0.4.3

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/logger@0.7.2

## 0.4.2

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/logger@0.7.1

## 0.4.1

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 0.4.0

_Released: 2025-09-03T07:32:57Z_

### Minor Changes

- 4c69bd0: feat: by default the cache buster part of the URL will be ignored

## 0.3.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/logger@0.7.0

## 0.2.3

_Released: 2025-02-06T22:08:41Z_

### Patch Changes

- 59453ba: fix(security): security findings from github

## 0.2.2

_Released: 2024-11-25T12:18:22Z_

### Patch Changes

- 09a58bb: chore: upgrade vocabularies-types + pnpm updates

## 0.2.1

_Released: 2024-11-19T15:25:45Z_

### Patch Changes

- 2a72ad2: chore - Fix audit issues

## 0.2.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/logger@0.6.0

## 0.1.2

_Released: 2024-04-16T06:40:59Z_

### Patch Changes

- 6291bc37: chore - update dependencies to fix audit warnings

## 0.1.1

_Released: 2024-02-27T22:07:50Z_

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json
- Updated dependencies [c15435b6]
    - @sap-ux/logger@0.5.1

## 0.1.0

### Minor Changes

- c0c733bf: Add serve-static-middleware
