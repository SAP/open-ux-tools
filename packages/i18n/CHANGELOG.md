# @sap-ux/i18n

## 1.0.2

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

## 1.0.1

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/text-document-utils@1.0.1

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
    - @sap-ux/text-document-utils@1.0.0

## 0.4.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/text-document-utils@0.4.0

## 0.3.12

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/text-document-utils@0.3.5

## 0.3.11

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- Updated dependencies [c160401]
    - @sap-ux/text-document-utils@0.3.4

## 0.3.10

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: chore(i18n): upgrade vscode-languageserver-textdocument 1.0.11 → 1.0.12

## 0.3.9

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- fd8de2b: fix(deps): update dependency jsonc-parser to v3.3.1

## 0.3.8

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- cc1c422: fix(deps): update dependency npm-run-all2 to v8

## 0.3.7

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues

## 0.3.6

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/text-document-utils@0.3.3

## 0.3.5

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/text-document-utils@0.3.2

## 0.3.4

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 0.3.3

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- Updated dependencies [c7db726]
    - @sap-ux/text-document-utils@0.3.1

## 0.3.2

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- 009143e: fix: resolve i18n key

## 0.3.1

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- f9ea9e3: feat: Enhance ADP FLP configuration generator

## 0.3.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/text-document-utils@0.3.0

## 0.2.3

_Released: 2025-03-04T08:55:15Z_

### Patch Changes

- cf05ceb: Update `vscode-languageserver-textdocument` dependency

## 0.2.2

_Released: 2025-02-27T14:15:03Z_

### Patch Changes

- 4b8577f: fix: usage of static webapp path

## 0.2.1

_Released: 2025-02-05T17:08:20Z_

### Patch Changes

- 78bc772: Introduce ADP FLP config generator

## 0.2.0

_Released: 2024-08-30T06:05:30Z_

### Minor Changes

- df29368: Methods `createCapI18nEntries`, `getCapI18nFolder` - handle absolute path to cds file instead of relative path

## 0.1.1

_Released: 2024-08-07T11:06:05Z_

### Patch Changes

- ac22b7e: feat: new package for text document utility functions and types
- Updated dependencies [ac22b7e]
    - @sap-ux/text-document-utils@0.2.0

## 0.1.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.0.7

_Released: 2024-05-31T13:42:35Z_

### Patch Changes

- f80a4256: chore - upgrade jest 29.7.0 - change in src to check object is defined before accessing it.

## 0.0.6

_Released: 2024-04-15T19:27:29Z_

### Patch Changes

- 03167a06: add utility method to extract mustache key

## 0.0.5

_Released: 2024-03-18T10:40:39Z_

### Patch Changes

- cc95c0a8: Fix infinite loop when comment on last line of properties file

## 0.0.4

_Released: 2024-02-27T22:07:50Z_

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json

## 0.0.3

_Released: 2024-02-19T10:29:40Z_

### Patch Changes

- 76ce5c2f: fix: expose getI18nPropertiesPaths and export types for browser in @sap-ux/i18n
