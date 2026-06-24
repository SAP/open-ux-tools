# @sap-ux/ui5-test-writer

## 1.2.3

### Patch Changes

#### Workspace Updates

- @sap-ux/preview-middleware 1.0.26 → 1.0.27

## 1.2.2

### Patch Changes

#### Workspace Updates

- @sap-ux/preview-middleware 1.0.25 → 1.0.26

## 1.2.1

### Patch Changes

#### Release Date

2026-06-23

#### Bug Fixes

- Add the `WARNING: AUTO-GENERATED FILE` header banner to the TypeScript page object templates (`ListReport.ts`, `ObjectPage.ts`) and to the journey types template (`OpaJourneyTypes.d.ts`), matching the existing JS variants. [[20bed6c](https://github.com/SAP/open-ux-tools/commit/20bed6cef0000c14d3a886f2b43d3ff268287ea0)]

## 1.2.0

### Minor Changes

#### Release Date

2026-06-22

#### Features

- Rework standalone OPA regeneration to preserve user files

    Standalone OPA regeneration (`generateOPAFiles(..., standalone=true)`) no longer relocates an existing `integration/` folder to `integration_old/`. Instead the generator now coexists with the existing setup:
    - New apps and apps without an `integration/` folder still receive a full test scaffold and a starter `FirstJourney.{js,ts}`.
    - Apps with a compatible setup (own `pages/JourneyRunner.{js,ts}`) now have generator-owned files written with a `.gen` suffix; user files are preserved and the existing `JourneyRunner`, `opaTests.qunit.js` and `OpaJourneyTypes.d.ts` are spliced rather than rewritten.
    - Apps with an incompatible setup (no own `JourneyRunner` but `JourneyRunner` references in `opaTests.qunit.js` or an `AllJourneys.json`) only receive `.gen` Page and Journey files; the existing test harness is left untouched and an info log explains why.
      The same scenario flow now applies to TypeScript projects (`enableTypeScript: true`). `JourneyRunner.ts` is spliced via a new TS-aware splicer, `OpaJourneyTypes.d.ts` is updated through a new `opaJourneyTypesUtils` splicer, and the generator-owned `.gen` page entries always carry a `Generated` variable-name suffix to avoid collisions with hand-authored bindings to the same `targetKey`.
      Splice helpers (`addPagesToJourneyRunner`, `addPathsToQUnitJs`, `addJourneysToOpaJourneyTypes`) accept an optional logger and warn instead of silently swallowing exceptions when an existing file cannot be updated. [[4a97e9f](https://github.com/SAP/open-ux-tools/commit/4a97e9fb7dcd6b30084e73e0d9b76401f508f6fb)]

## 1.1.13

### Patch Changes

#### Workspace Updates

- @sap-ux/preview-middleware 1.0.24 → 1.0.25

## 1.1.12

### Patch Changes

#### Workspace Updates

- @sap-ux/preview-middleware 1.0.23 → 1.0.24

## 1.1.11

_Released: 2026-06-15T21:05:56Z_

### Patch Changes

#### Workspace Updates

- @sap-ux/preview-middleware 1.0.22 → 1.0.23

## 1.1.10

_Released: 2026-06-14T10:40:09Z_

### Patch Changes

- Updated dependencies [adae40d]
    - @sap-ux/preview-middleware@1.0.22

## 1.1.9

_Released: 2026-06-12T19:01:39Z_

### Patch Changes

- Updated dependencies [00ddb82]
    - @sap-ux/preview-middleware@1.0.21

## 1.1.8

_Released: 2026-06-12T14:48:41Z_

### Patch Changes

- Updated dependencies [d4e24a7]
    - @sap-ux/preview-middleware@1.0.20

## 1.1.7

_Released: 2026-06-12T10:49:08Z_

### Patch Changes

- Updated dependencies [6f3b596]
    - @sap-ux/preview-middleware@1.0.19

## 1.1.6

_Released: 2026-06-12T08:50:00Z_

### Patch Changes

- Updated dependencies [0110219]
    - @sap-ux/preview-middleware@1.0.18

## 1.1.5

_Released: 2026-06-12T06:53:23Z_

### Patch Changes

- @sap-ux/preview-middleware@1.0.17
- @sap-ux/fiori-generator-shared@1.0.11

## 1.1.4

_Released: 2026-06-11T19:22:44Z_

### Patch Changes

- f02b950: fix(ui5-test-writer): force JS test file generation when any page uses the FPM template, ignoring enableTypeScript and tsconfig auto-detection

## 1.1.3

_Released: 2026-06-11T13:37:16Z_

### Patch Changes

- Updated dependencies [e66a8a9]
    - @sap-ux/ui5-application-writer@2.0.4
    - @sap-ux/preview-middleware@1.0.16

## 1.1.2

_Released: 2026-06-11T10:54:17Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@1.0.10
- @sap-ux/preview-middleware@1.0.15

## 1.1.1

_Released: 2026-06-10T16:18:03Z_

### Patch Changes

- c9b0659: force js file for fpm opa tests

## 1.1.0

_Released: 2026-06-10T12:57:40Z_

### Minor Changes

- c084184: Add TypeScript support for OPA test generation

## 1.0.14

_Released: 2026-06-10T09:57:42Z_

### Patch Changes

- @sap-ux/project-access@2.1.2
- @sap-ux/ui5-application-writer@2.0.3
- @sap-ux/preview-middleware@1.0.14
- @sap-ux/fiori-generator-shared@1.0.9

## 1.0.13

_Released: 2026-06-09T14:35:01Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@1.0.8
- @sap-ux/preview-middleware@1.0.13

## 1.0.12

_Released: 2026-06-09T13:18:16Z_

### Patch Changes

- Updated dependencies [a328e14]
    - @sap-ux/fiori-generator-shared@1.0.7
    - @sap-ux/preview-middleware@1.0.12

## 1.0.11

_Released: 2026-06-09T09:41:14Z_

### Patch Changes

- Updated dependencies [bcfe9e3]
    - @sap-ux/preview-middleware@1.0.11

## 1.0.10

_Released: 2026-06-04T13:54:21Z_

### Patch Changes

- Updated dependencies [fff7490]
    - @sap-ux/project-access@2.1.1
    - @sap-ux/fiori-generator-shared@1.0.6
    - @sap-ux/preview-middleware@1.0.10
    - @sap-ux/ui5-application-writer@2.0.2

## 1.0.9

_Released: 2026-06-04T12:10:05Z_

### Patch Changes

- @sap-ux/preview-middleware@1.0.9

## 1.0.8

_Released: 2026-06-04T10:19:37Z_

### Patch Changes

- Updated dependencies [b326a9a]
    - @sap-ux/project-access@2.1.0
    - @sap-ux/preview-middleware@1.0.8
    - @sap-ux/fiori-generator-shared@1.0.5
    - @sap-ux/ui5-application-writer@2.0.2

## 1.0.7

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/fiori-generator-shared@1.0.4
    - @sap-ux/ui5-application-writer@2.0.2
    - @sap-ux/preview-middleware@1.0.7
    - @sap-ux/project-access@2.0.3
    - @sap-ux/logger@1.0.1

## 1.0.6

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- @sap-ux/project-access@2.0.2
- @sap-ux/ui5-application-writer@2.0.1
- @sap-ux/preview-middleware@1.0.6
- @sap-ux/fiori-generator-shared@1.0.3

## 1.0.5

_Released: 2026-06-02T21:37:28Z_

### Patch Changes

- Updated dependencies [3506d2c]
    - @sap-ux/preview-middleware@1.0.5

## 1.0.4

_Released: 2026-06-02T11:35:17Z_

### Patch Changes

- @sap-ux/preview-middleware@1.0.4
- @sap-ux/fiori-generator-shared@1.0.2

## 1.0.3

_Released: 2026-06-02T08:56:31Z_

### Patch Changes

- @sap-ux/preview-middleware@1.0.3

## 1.0.2

_Released: 2026-06-01T17:22:37Z_

### Patch Changes

- Updated dependencies [8024912]
    - @sap-ux/preview-middleware@1.0.2

## 1.0.1

_Released: 2026-06-01T15:15:26Z_

### Patch Changes

- Updated dependencies [aed799d]
    - @sap-ux/project-access@2.0.1
    - @sap-ux/fiori-generator-shared@1.0.1
    - @sap-ux/preview-middleware@1.0.1
    - @sap-ux/ui5-application-writer@2.0.0

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
    - @sap-ux/fiori-generator-shared@1.0.0
    - @sap-ux/ui5-application-writer@2.0.0
    - @sap-ux/preview-middleware@1.0.0
    - @sap-ux/project-access@2.0.0
    - @sap-ux/logger@1.0.0

## 0.9.15

_Released: 2026-05-29T12:50:34Z_

### Patch Changes

- @sap-ux/preview-middleware@0.26.12

## 0.9.14

_Released: 2026-05-29T06:59:27Z_

### Patch Changes

- Updated dependencies [9a980a9]
    - @sap-ux/preview-middleware@0.26.11

## 0.9.13

_Released: 2026-05-27T11:39:21Z_

### Patch Changes

- @sap-ux/preview-middleware@0.26.10
- @sap-ux/fiori-generator-shared@0.15.6

## 0.9.12

_Released: 2026-05-27T10:42:47Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.15.5
- @sap-ux/preview-middleware@0.26.9

## 0.9.11

_Released: 2026-05-27T09:55:48Z_

### Patch Changes

- Updated dependencies [162059e]
    - @sap-ux/ui5-application-writer@1.9.2

## 0.9.10

_Released: 2026-05-26T21:32:06Z_

### Patch Changes

- 03d1cdd: add OPA tests for LR semantic key filters and global search

## 0.9.9

_Released: 2026-05-26T16:40:21Z_

### Patch Changes

- Updated dependencies [01b70ca]
    - @sap-ux/preview-middleware@0.26.8
    - @sap-ux/fiori-generator-shared@0.15.4

## 0.9.8

_Released: 2026-05-22T13:30:05Z_

### Patch Changes

- @sap-ux/preview-middleware@0.26.7

## 0.9.7

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- @sap-ux/project-access@1.38.1
- @sap-ux/ui5-application-writer@1.9.1
- @sap-ux/preview-middleware@0.26.6
- @sap-ux/fiori-generator-shared@0.15.3

## 0.9.6

_Released: 2026-05-21T14:58:44Z_

### Patch Changes

- @sap-ux/preview-middleware@0.26.5

## 0.9.5

_Released: 2026-05-19T15:16:46Z_

### Patch Changes

- Updated dependencies [63e6846]
    - @sap-ux/project-access@1.38.0
    - @sap-ux/fiori-generator-shared@0.15.2
    - @sap-ux/preview-middleware@0.26.4
    - @sap-ux/ui5-application-writer@1.9.0

## 0.9.4

_Released: 2026-05-19T10:17:18Z_

### Patch Changes

- 8d4a8a4: Generate tests for Actions on the Object Page

## 0.9.3

_Released: 2026-05-18T08:15:14Z_

### Patch Changes

- @sap-ux/preview-middleware@0.26.3

## 0.9.2

_Released: 2026-05-15T20:38:24Z_

### Patch Changes

- Updated dependencies [fb00faa]
    - @sap-ux/preview-middleware@0.26.2

## 0.9.1

_Released: 2026-05-15T13:12:06Z_

### Patch Changes

- Updated dependencies [2c76f8f]
    - @sap-ux/fiori-generator-shared@0.15.1
    - @sap-ux/preview-middleware@0.26.1

## 0.9.0

_Released: 2026-05-15T12:26:02Z_

### Minor Changes

- 2f0c182: feat: support virtual preview endpoints for test generation

    When `useVirtualPreviewEndpoints` is enabled, test harness files (testsuite, unitTests, opaTests) are served virtually and not written to disk. UI5 yaml files are updated with `flp.path: test/flp.html` and test framework entries (OPA5, Testsuite, QUnit) are added to ui5-mock.yaml.

## 0.8.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/fiori-generator-shared@0.15.0
    - @sap-ux/logger@0.9.0
    - @sap-ux/project-access@1.37.0
    - @sap-ux/ui5-application-writer@1.9.0

## 0.7.114

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/fiori-generator-shared@0.14.2
    - @sap-ux/logger@0.8.6
    - @sap-ux/project-access@1.36.5
    - @sap-ux/ui5-application-writer@1.8.9

## 0.7.113

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- Updated dependencies [21abda3]
    - @sap-ux/project-access@1.36.4
    - @sap-ux/fiori-generator-shared@0.14.1
    - @sap-ux/ui5-application-writer@1.8.8

## 0.7.112

_Released: 2026-05-12T18:00:39Z_

### Patch Changes

- Updated dependencies [9360ea5]
    - @sap-ux/fiori-generator-shared@0.14.0

## 0.7.111

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- Updated dependencies [678a08e]
    - @sap-ux/fiori-generator-shared@0.13.105
    - @sap-ux/project-access@1.36.3
    - @sap-ux/ui5-application-writer@1.8.8

## 0.7.110

_Released: 2026-04-30T15:37:27Z_

### Patch Changes

- 865fb96: fixes for app info generation

## 0.7.109

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- @sap-ux/ui5-application-writer@1.8.7
- @sap-ux/project-access@1.36.2

## 0.7.108

_Released: 2026-04-29T15:24:37Z_

### Patch Changes

- 287e3a4: Generate tests for Form and Table content in Object Page Sections
- Updated dependencies [3945459]
    - @sap-ux/project-access@1.36.1
    - @sap-ux/ui5-application-writer@1.8.7

## 0.7.107

_Released: 2026-04-27T19:47:46Z_

### Patch Changes

- Updated dependencies [1d60871]
    - @sap-ux/project-access@1.36.0
    - @sap-ux/ui5-application-writer@1.8.7

## 0.7.106

_Released: 2026-04-27T15:50:47Z_

### Patch Changes

- Updated dependencies [165a6c2]
    - @sap-ux/ui5-application-writer@1.8.7

## 0.7.105

_Released: 2026-04-23T12:54:21Z_

### Patch Changes

- Updated dependencies [03d3ea1]
    - @sap-ux/ui5-application-writer@1.8.6
    - @sap-ux/project-access@1.35.21

## 0.7.104

_Released: 2026-04-22T15:02:56Z_

### Patch Changes

- d36d5d7: app info generation fixes

## 0.7.103

_Released: 2026-04-14T21:37:37Z_

### Patch Changes

- 4357b0b: generate opa5 tests from app info

## 0.7.102

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- @sap-ux/project-access@1.35.20
- @sap-ux/ui5-application-writer@1.8.5

## 0.7.101

_Released: 2026-04-09T20:40:49Z_

### Patch Changes

- 17d8e42: fixes for object page opa test failures

## 0.7.100

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- Updated dependencies [f1e4481]
    - @sap-ux/logger@0.8.5
    - @sap-ux/ui5-application-writer@1.8.4
    - @sap-ux/project-access@1.35.19

## 0.7.99

_Released: 2026-04-01T11:49:37Z_

### Patch Changes

- Updated dependencies [3291f6c]
    - @sap-ux/project-access@1.35.18
    - @sap-ux/ui5-application-writer@1.8.3

## 0.7.98

_Released: 2026-04-01T09:52:29Z_

### Patch Changes

- 9d272d7: Fix header form field identifier values

## 0.7.97

_Released: 2026-03-31T14:07:26Z_

### Patch Changes

- 791e9b9: Generate OPA5 existence checks for object page sections & subsections

## 0.7.96

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(ui5-test-writer): upgrade shared devDependencies (jest 30, i18next 25)
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
    - @sap-ux/logger@0.8.4
    - @sap-ux/ui5-application-writer@1.8.3
    - @sap-ux/project-access@1.35.17

## 0.7.95

_Released: 2026-03-27T16:43:53Z_

### Patch Changes

- aa2baf3: fix action button state test based on line item selection

## 0.7.94

_Released: 2026-03-26T20:06:10Z_

### Patch Changes

- Updated dependencies [b66e827]
    - @sap-ux/project-access@1.35.17
    - @sap-ux/ui5-application-writer@1.8.2

## 0.7.93

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: chore(ui5-test-writer): upgrade i18next 25.8.18 → 25.8.20
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/logger@0.8.3
    - @sap-ux/project-access@1.35.16
    - @sap-ux/ui5-application-writer@1.8.2

## 0.7.92

_Released: 2026-03-25T12:56:41Z_

### Patch Changes

- Updated dependencies [f384ace]
    - @sap-ux/project-access@1.35.15
    - @sap-ux/ui5-application-writer@1.8.1

## 0.7.91

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- @sap-ux/project-access@1.35.14
- @sap-ux/ui5-application-writer@1.8.1

## 0.7.90

_Released: 2026-03-19T16:10:59Z_

### Patch Changes

- b516f01: add new opa tests for LR and OP, refactor file writing

## 0.7.89

_Released: 2026-03-18T12:34:00Z_

### Patch Changes

- Updated dependencies [b5c7d47]
    - @sap-ux/ui5-application-writer@1.8.0

## 0.7.88

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18
- Updated dependencies [55417bb]
    - @sap-ux/ui5-application-writer@1.7.20

## 0.7.87

_Released: 2026-03-16T23:16:05Z_

### Patch Changes

- 1b7094e: fix(deps): update dependency @sap/ux-specification to v1.144.0

## 0.7.86

_Released: 2026-03-06T12:16:42Z_

### Patch Changes

- 295cacc: fix: remove sap-no-global-define eslint annotations from testsuite templates

## 0.7.85

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- Updated dependencies [d834713]
    - @sap-ux/project-access@1.35.13
    - @sap-ux/ui5-application-writer@1.7.19

## 0.7.84

_Released: 2026-03-05T13:30:55Z_

### Patch Changes

- Updated dependencies [bd95e55]
    - @sap-ux/ui5-application-writer@1.7.19

## 0.7.83

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- Updated dependencies [7c06ef0]
    - @sap-ux/project-access@1.35.12
    - @sap-ux/ui5-application-writer@1.7.18

## 0.7.82

_Released: 2026-03-05T10:41:09Z_

### Patch Changes

- 5aff25c: fix(deps): update dependency fs-extra to v11
- Updated dependencies [5aff25c]
    - @sap-ux/ui5-application-writer@1.7.17

## 0.7.81

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- ac58145: fix(deps): update dependency fs-extra to v10.1.0
- Updated dependencies [ac58145]
- Updated dependencies [45d4797]
    - @sap-ux/ui5-application-writer@1.7.16
    - @sap-ux/logger@0.8.2
    - @sap-ux/project-access@1.35.11

## 0.7.80

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- @sap-ux/project-access@1.35.11
- @sap-ux/ui5-application-writer@1.7.15

## 0.7.79

_Released: 2026-03-04T11:44:41Z_

### Patch Changes

- 7d643c3: remove Filterbar OPA tests for Worklist app

## 0.7.78

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/project-access@1.35.10
    - @sap-ux/ui5-application-writer@1.7.14

## 0.7.77

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- 6c993f3: fix: turn off i18next support notice
- Updated dependencies [6c993f3]
    - @sap-ux/ui5-application-writer@1.7.14

## 0.7.76

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.9
- @sap-ux/ui5-application-writer@1.7.13

## 0.7.75

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- Updated dependencies [0ecc5f1]
    - @sap-ux/project-access@1.35.8
    - @sap-ux/ui5-application-writer@1.7.13

## 0.7.74

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.7
- @sap-ux/ui5-application-writer@1.7.12

## 0.7.73

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- d588c26: fix(deps): update dependency rimraf to v6.1.3

## 0.7.72

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12
- Updated dependencies [cbd340a]
    - @sap-ux/ui5-application-writer@1.7.11

## 0.7.71

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- Updated dependencies [bb310dc]
- Updated dependencies [e5bc3ca]
    - @sap-ux/project-access@1.35.6
    - @sap-ux/ui5-application-writer@1.7.10

## 0.7.70

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/project-access@1.35.5
    - @sap-ux/ui5-application-writer@1.7.9

## 0.7.69

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- @sap-ux/project-access@1.35.4
- @sap-ux/ui5-application-writer@1.7.9

## 0.7.68

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- Updated dependencies [346f09c]
    - @sap-ux/project-access@1.35.3
    - @sap-ux/ui5-application-writer@1.7.8

## 0.7.67

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- Updated dependencies [d2b772d]
    - @sap-ux/project-access@1.35.2
    - @sap-ux/ui5-application-writer@1.7.8

## 0.7.66

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- @sap-ux/project-access@1.35.1
- @sap-ux/ui5-application-writer@1.7.8

## 0.7.65

_Released: 2026-02-10T17:22:04Z_

### Patch Changes

- Updated dependencies [2bffca7]
    - @sap-ux/ui5-application-writer@1.7.7

## 0.7.64

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/project-access@1.35.0
    - @sap-ux/ui5-application-writer@1.7.6

## 0.7.63

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- Updated dependencies [467e6aa]
    - @sap-ux/project-access@1.34.7
    - @sap-ux/ui5-application-writer@1.7.6

## 0.7.62

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- Updated dependencies [ad321ab]
    - @sap-ux/project-access@1.34.6
    - @sap-ux/ui5-application-writer@1.7.6

## 0.7.61

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- 9f11dd2: chore - address audit issues

## 0.7.60

_Released: 2026-02-04T14:42:07Z_

### Patch Changes

- 185a8cf: Align @sap/ux-specification version

## 0.7.59

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [89175fe]
    - @sap-ux/project-access@1.34.5
    - @sap-ux/ui5-application-writer@1.7.5

## 0.7.58

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- Updated dependencies [ea7a16c]
    - @sap-ux/logger@0.8.1
    - @sap-ux/ui5-application-writer@1.7.5
    - @sap-ux/project-access@1.34.4

## 0.7.57

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- 6d71400: Changes to support v4.01 odata services
- Updated dependencies [6d71400]
    - @sap-ux/ui5-application-writer@1.7.4
    - @sap-ux/project-access@1.34.3

## 0.7.56

_Released: 2026-01-28T00:19:05Z_

### Patch Changes

- be6ea11: fix(deps): update dependency i18next to v25.8.0
- Updated dependencies [be6ea11]
    - @sap-ux/ui5-application-writer@1.7.3

## 0.7.55

_Released: 2026-01-23T14:04:48Z_

### Patch Changes

- 924e26f: fix(deps): update dependency @sap/ux-specification to v1.142.0

## 0.7.54

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- Updated dependencies [be67fc4]
    - @sap-ux/project-access@1.34.2
    - @sap-ux/ui5-application-writer@1.7.2

## 0.7.53

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- 55ac9f0: enable generation of OPA5 tests based on project spec
- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1
    - @sap-ux/ui5-application-writer@1.7.1

## 0.7.52

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0
    - @sap-ux/ui5-application-writer@1.7.1

## 0.7.51

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- Updated dependencies [f13d1c2]
    - @sap-ux/project-access@1.33.2
    - @sap-ux/ui5-application-writer@1.7.1

## 0.7.50

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/ui5-application-writer@1.7.1
    - @sap-ux/project-access@1.33.1

## 0.7.49

_Released: 2026-01-06T14:37:31Z_

### Patch Changes

- Updated dependencies [03598eb]
    - @sap-ux/ui5-application-writer@1.7.0

## 0.7.48

_Released: 2025-12-23T18:45:16Z_

### Patch Changes

- Updated dependencies [d24f36d]
    - @sap-ux/ui5-application-writer@1.6.8

## 0.7.47

_Released: 2025-12-19T15:33:24Z_

### Patch Changes

- dad2bd7: Write Eslint 9 flat config for new project. Replace eslint-plugin-fiori-custom with @sap-ux/eslint-plugin-fiori-tools
- Updated dependencies [dad2bd7]
    - @sap-ux/ui5-application-writer@1.6.7

## 0.7.46

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
- Updated dependencies [c7f9a60]
    - @sap-ux/logger@0.8.0
    - @sap-ux/project-access@1.33.0
    - @sap-ux/ui5-application-writer@1.6.6

## 0.7.45

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/ui5-application-writer@1.6.6
    - @sap-ux/project-access@1.32.17
    - @sap-ux/logger@0.7.3

## 0.7.44

_Released: 2025-12-17T11:17:40Z_

### Patch Changes

- Updated dependencies [63c0f52]
    - @sap-ux/ui5-application-writer@1.6.5

## 0.7.43

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/ui5-application-writer@1.6.4
    - @sap-ux/project-access@1.32.16
    - @sap-ux/logger@0.7.2

## 0.7.42

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- Updated dependencies [7217d7d]
    - @sap-ux/project-access@1.32.15
    - @sap-ux/ui5-application-writer@1.6.3

## 0.7.41

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- Updated dependencies [4bdced0]
    - @sap-ux/project-access@1.32.14
    - @sap-ux/ui5-application-writer@1.6.3

## 0.7.40

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- Updated dependencies [985223a]
    - @sap-ux/project-access@1.32.13
    - @sap-ux/ui5-application-writer@1.6.3

## 0.7.39

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- Updated dependencies [45fe64e]
    - @sap-ux/project-access@1.32.12
    - @sap-ux/ui5-application-writer@1.6.3

## 0.7.38

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- Updated dependencies [07725fe]
    - @sap-ux/ui5-application-writer@1.6.3
    - @sap-ux/project-access@1.32.11

## 0.7.37

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- @sap-ux/project-access@1.32.10
- @sap-ux/ui5-application-writer@1.6.2

## 0.7.36

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- Updated dependencies [7c09c8e]
- Updated dependencies [1c13c9c]
    - @sap-ux/project-access@1.32.9
    - @sap-ux/ui5-application-writer@1.6.1

## 0.7.35

_Released: 2025-11-12T16:47:06Z_

### Patch Changes

- Updated dependencies [744fa93]
    - @sap-ux/ui5-application-writer@1.6.1

## 0.7.34

_Released: 2025-11-10T14:56:50Z_

### Patch Changes

- Updated dependencies [aa2c7df]
    - @sap-ux/ui5-application-writer@1.6.0

## 0.7.33

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/ui5-application-writer@1.5.20
    - @sap-ux/project-access@1.32.8
    - @sap-ux/logger@0.7.1

## 0.7.32

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- Updated dependencies [d895232]
    - @sap-ux/project-access@1.32.7
    - @sap-ux/ui5-application-writer@1.5.19

## 0.7.31

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- Updated dependencies [ea0a942]
    - @sap-ux/project-access@1.32.6
    - @sap-ux/ui5-application-writer@1.5.19

## 0.7.30

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- Updated dependencies [c5d7915]
    - @sap-ux/project-access@1.32.5
    - @sap-ux/ui5-application-writer@1.5.19

## 0.7.29

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- Updated dependencies [9e94382]
    - @sap-ux/ui5-application-writer@1.5.19
    - @sap-ux/project-access@1.32.4

## 0.7.28

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/ui5-application-writer@1.5.18
    - @sap-ux/project-access@1.32.3

## 0.7.27

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- @sap-ux/project-access@1.32.2
- @sap-ux/ui5-application-writer@1.5.17

## 0.7.26

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- @sap-ux/project-access@1.32.1
- @sap-ux/ui5-application-writer@1.5.16

## 0.7.25

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- Updated dependencies [f9b4afe]
    - @sap-ux/project-access@1.32.0
    - @sap-ux/ui5-application-writer@1.5.15

## 0.7.24

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- Updated dependencies [c385a76]
    - @sap-ux/project-access@1.31.0
    - @sap-ux/ui5-application-writer@1.5.15

## 0.7.23

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- @sap-ux/project-access@1.30.14
- @sap-ux/ui5-application-writer@1.5.15

## 0.7.22

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- @sap-ux/project-access@1.30.13
- @sap-ux/ui5-application-writer@1.5.14

## 0.7.21

_Released: 2025-08-20T14:17:32Z_

### Patch Changes

- 1fff3c0: use self contained journeys for OPA tests

## 0.7.20

_Released: 2025-08-14T15:20:59Z_

### Patch Changes

- Updated dependencies [55bb22e]
    - @sap-ux/ui5-application-writer@1.5.13

## 0.7.19

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- Updated dependencies [178dbea]
    - @sap-ux/ui5-application-writer@1.5.12
    - @sap-ux/project-access@1.30.12

## 0.7.18

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/project-access@1.30.11
- @sap-ux/ui5-application-writer@1.5.11

## 0.7.17

_Released: 2025-08-11T13:59:55Z_

### Patch Changes

- 944af3e: Update all UI5 OPA test runner HTML files to use relative resource paths instead of absolute paths

## 0.7.16

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- @sap-ux/project-access@1.30.10
- @sap-ux/ui5-application-writer@1.5.11

## 0.7.15

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.9
- @sap-ux/ui5-application-writer@1.5.10

## 0.7.14

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- Updated dependencies [4e0bd83]
    - @sap-ux/project-access@1.30.8
    - @sap-ux/ui5-application-writer@1.5.10

## 0.7.13

_Released: 2025-07-25T11:40:41Z_

### Patch Changes

- 2809593: update test snapshots to reflect latest template and linting changes
- Updated dependencies [2809593]
    - @sap-ux/ui5-application-writer@1.5.9

## 0.7.12

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- Updated dependencies [58cdce6]
    - @sap-ux/project-access@1.30.7
    - @sap-ux/ui5-application-writer@1.5.8

## 0.7.11

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- 69f62ec: i18next upgrade to 25.3.0
- Updated dependencies [69f62ec]
    - @sap-ux/ui5-application-writer@1.5.8

## 0.7.10

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- Updated dependencies [c0fa1d1]
    - @sap-ux/ui5-application-writer@1.5.7
    - @sap-ux/project-access@1.30.6

## 0.7.9

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- Updated dependencies [7a4543e]
    - @sap-ux/project-access@1.30.5
    - @sap-ux/ui5-application-writer@1.5.6

## 0.7.8

_Released: 2025-06-30T08:46:50Z_

### Patch Changes

- b9675bb: Improve Fiori Tools UI Texts
- Updated dependencies [b9675bb]
    - @sap-ux/ui5-application-writer@1.5.6

## 0.7.7

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- Updated dependencies [f75b89d]
    - @sap-ux/project-access@1.30.4
    - @sap-ux/ui5-application-writer@1.5.5

## 0.7.6

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.3
- @sap-ux/ui5-application-writer@1.5.4

## 0.7.5

_Released: 2025-06-18T16:15:15Z_

### Patch Changes

- 7fd2583: Fix wrong dependency type

## 0.7.4

_Released: 2025-06-18T14:50:19Z_

### Patch Changes

- Updated dependencies [3ea811a]
    - @sap-ux/ui5-application-writer@1.5.4

## 0.7.3

_Released: 2025-06-17T07:58:40Z_

### Patch Changes

- Updated dependencies [163522f]
    - @sap-ux/ui5-application-writer@1.5.3

## 0.7.2

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- @sap-ux/ui5-application-writer@1.5.2

## 0.7.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- @sap-ux/ui5-application-writer@1.5.1

## 0.7.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/ui5-application-writer@1.5.0
    - @sap-ux/logger@0.7.0

## 0.6.7

_Released: 2025-04-30T17:25:02Z_

### Patch Changes

- Updated dependencies [0d8918a]
    - @sap-ux/ui5-application-writer@1.4.3

## 0.6.6

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- @sap-ux/ui5-application-writer@1.4.2

## 0.6.5

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- @sap-ux/ui5-application-writer@1.4.1

## 0.6.4

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- Updated dependencies [1ca4004]
    - @sap-ux/ui5-application-writer@1.4.0

## 0.6.3

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- @sap-ux/ui5-application-writer@1.3.3

## 0.6.2

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- @sap-ux/ui5-application-writer@1.3.2

## 0.6.1

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- @sap-ux/ui5-application-writer@1.3.1

## 0.6.0

_Released: 2025-03-04T15:37:10Z_

### Minor Changes

- db575f3: Update unit test template for Freestyle version 1.120.0

## 0.5.2

_Released: 2025-02-27T19:24:50Z_

### Patch Changes

- Updated dependencies [88520b4]
    - @sap-ux/ui5-application-writer@1.3.0

## 0.5.1

_Released: 2025-02-26T11:18:15Z_

### Patch Changes

- f4867e5: Fix: Path Compatibility for Windows in FF Test Template Generation

## 0.5.0

_Released: 2025-02-24T09:17:17Z_

### Minor Changes

- fffc3a7: Add Freestyle OPA templates to ui5-test-writer

## 0.4.1

_Released: 2024-08-01T17:28:17Z_

### Patch Changes

- e69db46: Upgrade fast-xml-parser

## 0.4.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.3.3

_Released: 2024-05-07T14:01:29Z_

### Patch Changes

- 4e267684: chore - ejs upgrade

## 0.3.2

_Released: 2024-02-27T22:07:50Z_

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json

## 0.3.1

_Released: 2023-11-10T10:22:27Z_

### Patch Changes

- deabc5bd: fix template issues for worklist OPA test

## 0.3.0

_Released: 2023-10-19T12:06:19Z_

### Minor Changes

- 1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

## 0.2.1

_Released: 2023-10-18T13:59:49Z_

### Patch Changes

- cbcad88d: fix(deps): update dependencies [i18next]

## 0.2.0

_Released: 2023-09-29T18:36:57Z_

### Minor Changes

- bf1281ca: Adds support for "contextPath"

## 0.1.11

_Released: 2023-09-20T13:13:51Z_

### Patch Changes

- 63c698a8: chore - fix publishing of modules missed in failed release build

## 0.1.10

_Released: 2023-06-27T14:58:54Z_

### Patch Changes

- 4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.

## 0.1.9

_Released: 2023-06-14T13:41:00Z_

### Patch Changes

- 080f89ac: Opa tests to use flpSandbox.html when index.html is not generated

## 0.1.8

_Released: 2023-06-12T06:59:29Z_

### Patch Changes

- 25911701: Fix for 'promises must be awaited' sonar issues

## 0.1.7

_Released: 2023-02-23T13:56:23Z_

### Patch Changes

- d350038: chore - TypeScript 4.9.4 upgrade

## 0.1.6

_Released: 2023-02-10T14:09:06Z_

### Patch Changes

- ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues

## 0.1.5

_Released: 2022-12-05T07:50:58Z_

### Patch Changes

- 070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability

## 0.1.4

_Released: 2022-10-14T14:52:33Z_

### Patch Changes

- 11c8f5d: Use manifest types from @sap-ux/project-access

## 0.1.3

_Released: 2022-10-11T14:06:32Z_

### Patch Changes

- 5b487ef: chore - Apply linting to test folders and linting fixes
- Updated dependencies [5b487ef]
    - @sap-ux/ui5-config@0.15.2

## 0.1.2

_Released: 2022-10-04T15:02:00Z_

### Patch Changes

- @sap-ux/ui5-config@0.15.1

## 0.1.1

_Released: 2022-09-14T16:06:49Z_

### Patch Changes

- Updated dependencies [83a7a1a]
    - @sap-ux/ui5-config@0.15.0

## 0.1.0

_Released: 2022-09-05T07:44:52Z_

### Minor Changes

- 5e3708b: Initial version of SAP UI5 OPA writer
