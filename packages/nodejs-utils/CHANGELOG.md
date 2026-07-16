# @sap-ux/nodejs-utils

## 1.0.7

### Patch Changes

#### Dependency Updates

- align vscode and types with fiori tools extensions [[369c494](https://github.com/SAP/open-ux-tools/commit/369c49497073e99fda01bad7dfda1840e68c029a)]

#### Workspace Updates

- @sap-ux/btp-utils 2.0.5 → 2.0.5

## 1.0.6

### Patch Changes

#### Workspace Updates

- @sap-ux/btp-utils 2.0.4 → 2.0.5

## 1.0.5

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

#### Workspace Updates

- @sap-ux/btp-utils 2.0.3 → 2.0.4

## 1.0.4

### Patch Changes

#### Workspace Updates

- @sap-ux/btp-utils 2.0.2 → 2.0.3

## 1.0.3

_Released: 2026-06-09T14:35:01Z_

### Patch Changes

- Updated dependencies [0fa8305]
    - @sap-ux/btp-utils@2.0.2

## 1.0.2

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/btp-utils@2.0.1

## 1.0.1

_Released: 2026-06-02T11:35:17Z_

### Patch Changes

- 41f327a: update to use yo directly to check version rather than npm

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
    - @sap-ux/btp-utils@2.0.0

## 0.3.2

_Released: 2026-05-27T11:39:21Z_

### Patch Changes

- ea9cbb1: feat(nodejs-utils): add i18n support and translations for `ensureValidYoVersion` error messages

## 0.3.1

_Released: 2026-05-26T16:40:21Z_

### Patch Changes

- Updated dependencies [01b70ca]
    - @sap-ux/btp-utils@1.2.1

## 0.3.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/btp-utils@1.2.0

## 0.2.23

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/btp-utils@1.1.16

## 0.2.22

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- Updated dependencies [678a08e]
    - @sap-ux/btp-utils@1.1.15

## 0.2.21

_Released: 2026-04-14T20:26:28Z_

### Patch Changes

- Updated dependencies [ee68603]
    - @sap-ux/btp-utils@1.1.14

## 0.2.20

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- Updated dependencies [cc4450c]
    - @sap-ux/btp-utils@1.1.13

## 0.2.19

_Released: 2026-03-27T11:58:49Z_

### Patch Changes

- Updated dependencies [2e17a6b]
    - @sap-ux/btp-utils@1.1.12

## 0.2.18

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: chore(nodejs-utils): upgrade fast-glob 3.3.1 → 3.3.3
- Updated dependencies [a41533f]
    - @sap-ux/btp-utils@1.1.11

## 0.2.17

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- Updated dependencies [5d452e5]
    - @sap-ux/btp-utils@1.1.10

## 0.2.16

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- bb310dc: fix(deps): update dependency semver to v7.7.4

## 0.2.15

_Released: 2026-02-16T18:48:13Z_

### Patch Changes

- Updated dependencies [dd2131c]
    - @sap-ux/btp-utils@1.1.9

## 0.2.14

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/btp-utils@1.1.8

## 0.2.13

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- ad321ab: fix(deps): update dependency semver to v7.7.3

## 0.2.12

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- Updated dependencies [9f11dd2]
    - @sap-ux/btp-utils@1.1.7

## 0.2.11

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
    - @sap-ux/btp-utils@1.1.6

## 0.2.10

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/btp-utils@1.1.6

## 0.2.9

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- 037a430: fix high severity Sonar issues

## 0.2.8

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/btp-utils@1.1.5

## 0.2.7

_Released: 2025-10-07T13:15:25Z_

### Patch Changes

- b268021: Compare proxy to environment variables

## 0.2.6

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/btp-utils@1.1.4

## 0.2.5

_Released: 2025-09-23T20:14:56Z_

### Patch Changes

- Updated dependencies [998954b]
    - @sap-ux/btp-utils@1.1.3

## 0.2.4

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- Updated dependencies [9872384]
    - @sap-ux/btp-utils@1.1.2

## 0.2.3

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- Updated dependencies [4cfebaf]
    - @sap-ux/btp-utils@1.1.1

## 0.2.2

_Released: 2025-07-17T13:47:26Z_

### Patch Changes

- 84a8d56: Adds logger support to CommandRunner

## 0.2.1

_Released: 2025-06-09T09:48:34Z_

### Patch Changes

- d6943aa: Adds GA link to deploy.

## 0.2.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/btp-utils@1.1.0

## 0.1.9

_Released: 2025-04-14T22:24:07Z_

### Patch Changes

- Updated dependencies [d638daa]
    - @sap-ux/btp-utils@1.0.3

## 0.1.8

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- Updated dependencies [011c8c5]
    - @sap-ux/btp-utils@1.0.2

## 0.1.7

_Released: 2025-02-05T14:44:29Z_

### Patch Changes

- Updated dependencies [65f15d9]
    - @sap-ux/btp-utils@1.0.1

## 0.1.6

_Released: 2025-02-04T14:25:43Z_

### Patch Changes

- Updated dependencies [9980073]
    - @sap-ux/btp-utils@1.0.0

## 0.1.5

_Released: 2025-01-29T13:31:31Z_

### Patch Changes

- Updated dependencies [df2d965]
    - @sap-ux/btp-utils@0.18.0

## 0.1.4

_Released: 2024-12-17T13:32:02Z_

### Patch Changes

- Updated dependencies [cb54b44]
    - @sap-ux/btp-utils@0.17.2

## 0.1.3

_Released: 2024-12-04T12:27:41Z_

### Patch Changes

- Updated dependencies [2359524]
    - @sap-ux/btp-utils@0.17.1

## 0.1.2

_Released: 2024-11-18T22:28:16Z_

### Patch Changes

- Updated dependencies [a62ff25]
    - @sap-ux/btp-utils@0.17.0

## 0.1.1

_Released: 2024-11-11T17:55:13Z_

### Patch Changes

- Updated dependencies [3734fe8]
    - @sap-ux/btp-utils@0.16.0

## 0.1.0

_Released: 2024-10-04T19:18:33Z_

### Minor Changes

- d40af34: adds new module @sap-ux/ui5-library-sub-generator

## 0.0.3

_Released: 2024-10-04T15:21:13Z_

### Patch Changes

- 93f8a83: chore - upgrade typescript 5.6.2

## 0.0.2

_Released: 2024-10-03T08:31:40Z_

### Patch Changes

- 546e02c: Fixes CommandRunner child proc execution on Windows (uses `shell = true`)

## 0.0.1

_Released: 2024-08-23T10:57:41Z_

### Patch Changes

- d3dafeb: FEAT - Add @sap-ux/nodejs-utils module
- Updated dependencies [d3dafeb]
    - @sap-ux/btp-utils@0.15.2
