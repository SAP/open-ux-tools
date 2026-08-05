# @sap-ux/odata-vocabularies

## 1.0.5

### Patch Changes

#### Release Date

2026-07-22

#### Bug Fixes

- vocabulary loader - support vocabulary [[b7f0c85](https://github.com/SAP/open-ux-tools/commit/b7f0c851a97e31f76398c6f8131d55e3c9f07c7a)]

## 1.0.4

### Patch Changes

#### Dependency Updates

- upgrade axios dependency [[526d59b](https://github.com/SAP/open-ux-tools/commit/526d59b558a653635ab44ab10dbfedccb3c0dc43)]

## 1.0.3

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

## 1.0.2

### Patch Changes

#### Release Date

2026-06-23

#### Bug Fixes

- vocabulary update [[80e7b43](https://github.com/SAP/open-ux-tools/commit/80e7b43c6b3bdb81b9667b48bc4176b7b630d472)]

## 1.0.1

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/odata-annotation-core-types@1.0.1

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
    - @sap-ux/odata-annotation-core-types@1.0.0

## 0.5.1

_Released: 2026-05-20T13:39:22Z_

### Patch Changes

- Updated dependencies [2f1ece0]
    - @sap-ux/odata-annotation-core-types@0.6.1

## 0.5.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/odata-annotation-core-types@0.6.0

## 0.4.32

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/odata-annotation-core-types@0.5.9

## 0.4.31

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- @sap-ux/odata-annotation-core-types@0.5.8

## 0.4.30

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(odata-vocabularies): upgrade prettier 2.5.1 → 3.8.1; remove @types/prettier (types now bundled in prettier 3.x)

## 0.4.29

_Released: 2026-03-16T17:06:45Z_

### Patch Changes

- Updated dependencies [dfa433e]
    - @sap-ux/odata-annotation-core-types@0.5.7

## 0.4.28

_Released: 2026-03-11T16:49:00Z_

### Patch Changes

- 79e69b9: fix: update vocabularies

## 0.4.27

_Released: 2026-03-04T09:03:38Z_

### Patch Changes

- Updated dependencies [a2cbf4e]
    - @sap-ux/odata-annotation-core-types@0.5.6

## 0.4.26

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- cc1c422: fix(deps): update dependency npm-run-all2 to v8
- Updated dependencies [cc1c422]
    - @sap-ux/odata-annotation-core-types@0.5.5

## 0.4.25

_Released: 2026-02-17T01:38:30Z_

### Patch Changes

- 1fa3bb7: update vocabularies

## 0.4.24

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- 2fc459c: Upgrade axios

## 0.4.23

_Released: 2026-02-10T21:03:43Z_

### Patch Changes

- 3795bb2: Add Node.js engine requirement (>=20.x)
- Updated dependencies [3795bb2]
    - @sap-ux/odata-annotation-core-types@0.5.4

## 0.4.22

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- Updated dependencies [6d71400]
    - @sap-ux/odata-annotation-core-types@0.5.3

## 0.4.21

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues

## 0.4.20

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/odata-annotation-core-types@0.5.2

## 0.4.19

_Released: 2025-12-04T09:20:42Z_

### Patch Changes

- 76742fa: vocabulary update

## 0.4.18

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/odata-annotation-core-types@0.5.1

## 0.4.17

_Released: 2025-10-15T11:57:34Z_

### Patch Changes

- ccb5285: vocabulary update

## 0.4.16

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 0.4.15

_Released: 2025-09-23T16:06:33Z_

### Patch Changes

- Updated dependencies [aa8bb7a]
    - @sap-ux/odata-annotation-core-types@0.5.0

## 0.4.14

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- 9872384: Upgrade axios module

## 0.4.13

_Released: 2025-09-16T20:04:56Z_

### Patch Changes

- Updated dependencies [1f18878]
    - @sap-ux/odata-annotation-core-types@0.4.6

## 0.4.12

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- 4cfebaf: Update axios module

## 0.4.11

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- Updated dependencies [c7db726]
    - @sap-ux/odata-annotation-core-types@0.4.5

## 0.4.10

_Released: 2025-06-16T13:15:49Z_

### Patch Changes

- 070dcb2: update vocabularies

## 0.4.9

_Released: 2025-06-10T10:19:01Z_

### Patch Changes

- Updated dependencies [08ed948]
    - @sap-ux/odata-annotation-core-types@0.4.4

## 0.4.8

_Released: 2025-05-14T22:35:53Z_

### Patch Changes

- @sap-ux/odata-annotation-core-types@0.4.3

## 0.4.7

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- 011c8c5: fix(deps): update dependency axios to v1.8.2 [security]

## 0.4.6

_Released: 2025-02-11T12:08:20Z_

### Patch Changes

- 3f273c9: update vocabularies

## 0.4.5

_Released: 2025-01-15T13:31:47Z_

### Patch Changes

- 54b6d61: fix: updateVocabularies

## 0.4.4

_Released: 2024-10-22T09:42:10Z_

### Patch Changes

- 8af1ba2: update vocabularies

## 0.4.3

_Released: 2024-10-04T15:21:13Z_

### Patch Changes

- 93f8a83: chore - upgrade typescript 5.6.2
- Updated dependencies [93f8a83]
    - @sap-ux/odata-annotation-core-types@0.4.2

## 0.4.2

_Released: 2024-08-19T09:48:14Z_

### Patch Changes

- 9c8dc5c: fix: update `axios` to `1.7.4`

## 0.4.1

_Released: 2024-08-07T11:06:05Z_

### Patch Changes

- @sap-ux/odata-annotation-core-types@0.4.1

## 0.4.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/odata-annotation-core-types@0.4.0

## 0.3.8

_Released: 2024-06-20T13:03:49Z_

### Patch Changes

- d09edfd5: Update vocabularies June 2024

## 0.3.7

_Released: 2024-04-03T09:16:44Z_

### Patch Changes

- 95c72dff: update vocabularies content

## 0.3.6

_Released: 2024-03-22T08:51:54Z_

### Patch Changes

- 61b46bc8: Security upgrade fixes

## 0.3.5

_Released: 2024-03-14T15:29:35Z_

### Patch Changes

- 82c07285: OData Vocabularies: Update Some Texts in Specific Vocabularies For Analytics Support in CDS

## 0.3.4

_Released: 2024-02-07T11:10:48Z_

### Patch Changes

- eb0b7b37: Chore - TypeScript 5 upgrade
- Updated dependencies [eb0b7b37]
    - @sap-ux/odata-annotation-core-types@0.3.1

## 0.3.3

_Released: 2024-01-24T11:05:22Z_

### Patch Changes

- aa8469f3: OData Vocabularies: Update Vocabularies Containing Cds Specific Analytics Annotations

## 0.3.2

_Released: 2024-01-19T16:44:06Z_

### Patch Changes

- 820ad0dc: odata-vocabularies for CDS analytics: use IsFLags for collection of enums, remove empty lines

## 0.3.1

_Released: 2024-01-17T08:59:35Z_

### Patch Changes

- 2f1f8366: fix(odata-vocabularies): replace alias ODataJSON with JSON

## 0.3.0

_Released: 2024-01-16T12:59:00Z_

### Minor Changes

- 39877d71: support loading additional terms for cap cds analytics features

## 0.2.1

_Released: 2024-01-09T09:27:13Z_

### Patch Changes

- Updated dependencies [d6151909]
    - @sap-ux/odata-annotation-core-types@0.3.0

## 0.2.0

_Released: 2023-12-12T07:54:42Z_

### Minor Changes

- 5b256cea: support applicable terms constraint

### Patch Changes

- Updated dependencies [5b256cea]
    - @sap-ux/odata-annotation-core-types@0.2.0

## 0.1.6

_Released: 2023-12-07T12:16:28Z_

### Patch Changes

- Updated dependencies [807e2857]
    - @sap-ux/odata-annotation-core-types@0.1.3

## 0.1.5

_Released: 2023-12-04T14:20:02Z_

### Patch Changes

- 1df7493f: fix: enable and fill applicableterms

## 0.1.4

_Released: 2023-11-24T09:29:29Z_

### Patch Changes

- 89a1bf27: fix: change access type of uppercaseNameMap prop

## 0.1.3

_Released: 2023-11-24T08:58:15Z_

### Patch Changes

- fd883c14: fix: enable uppercaseNameMap property in vocabulary service

## 0.1.2

_Released: 2023-11-22T12:13:22Z_

### Patch Changes

- 860a43a6: fix: update tesconfig to generate correct files order in dist

## 0.1.1

### Patch Changes

- 284c396c: feat: move ux vocabulary module
