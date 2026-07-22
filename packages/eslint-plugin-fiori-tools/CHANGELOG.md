# @sap-ux/eslint-plugin-fiori-tools

## 10.7.11

### Patch Changes

#### Bug Fixes

- vocabulary loader - support vocabulary [[b7f0c85](https://github.com/SAP/open-ux-tools/commit/b7f0c851a97e31f76398c6f8131d55e3c9f07c7a)]

## 10.7.10

### Patch Changes

#### Release Date

2026-07-21

#### Dependency Updates

- `@sap-ux/project-access` dependency Update [[a94300d](https://github.com/SAP/open-ux-tools/commit/a94300db617727229f9e1c1fc7c878350e47deba)]

## 10.7.9

### Patch Changes

#### Release Date

2026-07-15

#### Bug Fixes

- Validate required fields are defined in the .change file when creating a FlexChange object. [[81e386d](https://github.com/SAP/open-ux-tools/commit/81e386dec63839016e43cd3b48889134ccac48f9)]

## 10.7.8

### Patch Changes

#### Release Date

2026-07-13

#### Features

- Enable linting applications with multiple views. [[c325423](https://github.com/SAP/open-ux-tools/commit/c32542308410ce93ea7e6eea8186b82963f8144c)]

## 10.7.7

### Patch Changes

#### Release Date

2026-07-10

#### Bug Fixes

- Deduplicate sap-description-column-label diagnostics when multiple entities share the same text property annotation [[949ade6](https://github.com/SAP/open-ux-tools/commit/949ade6264d223cd7e50e29725c42fe89072249e)]

## 10.7.6

### Patch Changes

#### Release Date

2026-07-08

#### Features

- Extend the sap-no-live-mode rule to detect and report liveMode usage in OData V2 applications. [[718643b](https://github.com/SAP/open-ux-tools/commit/718643b02e3e6d3611697df8fbbf4908cb71d42f)]

## 10.7.5

### Patch Changes

#### Dependency Updates

- align vscode and types with fiori tools extensions [[369c494](https://github.com/SAP/open-ux-tools/commit/369c49497073e99fda01bad7dfda1840e68c029a)]

## 10.7.4

### Patch Changes

#### Release Date

2026-07-06

#### Dependency Updates

- Rebuild bundle with updated @sap-ux/cds-odata-annotation-converter [[5b2a7f2](https://github.com/SAP/open-ux-tools/commit/5b2a7f2fce7f0faa43e2ab083ec25b80ea204503)]

## 10.7.3

### Patch Changes

#### Release Date

2026-07-03

#### Dependency Updates

- Rebuild bundle with updated @sap-ux/odata-vocabularies, @sap-ux/ui5-config [[526d59b](https://github.com/SAP/open-ux-tools/commit/526d59b558a653635ab44ab10dbfedccb3c0dc43)]

## 10.7.2

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

## 10.7.1

### Patch Changes

#### Release Date

2026-07-02

#### Bug Fixes

- Streamline plugin meta — remove duplicate inline meta with stale hardcoded version, add namespace to single exported meta constant [[8b75140](https://github.com/SAP/open-ux-tools/commit/8b7514012cb078912875bb12b3a96686fcb8db70)]

## 10.7.0

### Minor Changes

#### Release Date

2026-07-02

#### Features

- Create a new rule to check live mode is not enabled in the `manifest.json` file of OData V4 applications. [[ad4b0df](https://github.com/SAP/open-ux-tools/commit/ad4b0df880b4ac9ebc75f7d00f010834fdf6f284)]

## 10.6.6

### Patch Changes

#### Release Date

2026-06-30

#### Features

- Enhanced the eslint-plugin-fiori-tools to include precise source location (loc) data in all manifest-related ESLint diagnostics. [[1d0eee4](https://github.com/SAP/open-ux-tools/commit/1d0eee481cedd1fcac882ba55df18e8a7400f4a2)]

## 10.6.5

### Patch Changes

#### Release Date

2026-06-22

#### Features

- update OData V2 table export rule to consider "useExportToExcel" property for applications with minUI5Version lower than 1.145. [[85c2bc5](https://github.com/SAP/open-ux-tools/commit/85c2bc5afd41c610fc51d773ba2564243b36cbee)]

## 10.6.4

### Patch Changes

#### Release Date

2026-06-19

#### Bug Fixes

- detect property change file deletion and watch newly created .change files. [[d15e5fc](https://github.com/SAP/open-ux-tools/commit/d15e5fc0e86b92d652fee3db8b32a10fcc956fec)]

## 10.6.3

_Released: 2026-06-12T08:20:17Z_

### Patch Changes

- 0425d5f: fix(eslint-plugin-fiori-tools): bundle @babel/core, @babel/eslint-parser, @babel/parser to prevent version conflicts with ui5-tooling-transpile in consumer projects

## 10.6.2

_Released: 2026-06-10T09:12:01Z_

### Patch Changes

- e3d69d5: chore(eslint-plugin-fiori-tools): switch build from tsc to esbuild bundling

## 10.6.1

_Released: 2026-06-09T19:59:54Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@1.0.6

## 10.6.0

_Released: 2026-06-08T10:14:19Z_

### Minor Changes

- 409ad75: FEAT: Add support to lint .change files. Enable table paste and export rules for ODataV2 tables.

## 10.5.4

_Released: 2026-06-04T13:54:21Z_

### Patch Changes

- Updated dependencies [fff7490]
    - @sap-ux/project-access@2.1.1
    - @sap-ux/fiori-annotation-api@1.0.5

## 10.5.3

_Released: 2026-06-04T10:19:37Z_

### Patch Changes

- Updated dependencies [b326a9a]
    - @sap-ux/project-access@2.1.0
    - @sap-ux/fiori-annotation-api@1.0.4

## 10.5.2

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/odata-annotation-core@1.0.1
    - @sap-ux/fiori-annotation-api@1.0.3
    - @sap-ux/odata-entity-model@1.0.1
    - @sap-ux/odata-vocabularies@1.0.1
    - @sap-ux/project-access@2.0.3

## 10.5.1

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- @sap-ux/project-access@2.0.2
- @sap-ux/fiori-annotation-api@1.0.2

## 10.5.0

_Released: 2026-06-02T16:09:55Z_

### Minor Changes

- ca7d40f: fix: support ESLint 10 by upgrading `@babel/eslint-parser` and `@babel/core` to `8.0.0-rc.6` and adding `@babel/parser@8.0.0-rc.6` as a runtime dependency. This avoids `@babel/eslint-parser`'s `createRequire` failing to load `@babel/parser@8` (pure ESM) under pnpm's strict `node_modules` isolation, where `@babel/parser` is otherwise not visible from the consumer's resolution paths.

## 10.4.1

_Released: 2026-06-01T15:15:26Z_

### Patch Changes

- Updated dependencies [aed799d]
    - @sap-ux/project-access@2.0.1
    - @sap-ux/fiori-annotation-api@1.0.1

## 10.4.0

_Released: 2026-05-30T20:54:07Z_

### Minor Changes

- 32609a7: chore(eslint-plugin-fiori-tools): migrate to ESM module system

    Migrated internal code to ESM (ECMAScript Modules) with NodeNext module resolution. This is a non-breaking change for consumers as the plugin continues to work with ESLint 9.x and 10.x.

### Patch Changes

- Updated dependencies [32609a7]
    - @sap-ux/odata-annotation-core@1.0.0
    - @sap-ux/fiori-annotation-api@1.0.0
    - @sap-ux/odata-entity-model@1.0.0
    - @sap-ux/odata-vocabularies@1.0.0
    - @sap-ux/project-access@2.0.0

## 10.3.0

_Released: 2026-05-29T18:38:26Z_

### Minor Changes

- 0d6c80c: feat: enhance ESLint rules to support CDS annotations for sap-description-column-label and sap-text-arrangement-hidden

## 10.2.2

_Released: 2026-05-25T09:31:33Z_

### Patch Changes

- b3d4f62: Collect CAP application object page label to display in rule text messages.

## 10.2.1

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- @sap-ux/project-access@1.38.1
- @sap-ux/fiori-annotation-api@0.11.1

## 10.2.0

_Released: 2026-05-20T13:39:22Z_

### Minor Changes

- 2f1ece0: [rule] Add rule to check that a Common.Text description property has a meaningful Common.Label annotation

### Patch Changes

- Updated dependencies [2f1ece0]
    - @sap-ux/fiori-annotation-api@0.11.0
    - @sap-ux/odata-annotation-core@0.3.1
    - @sap-ux/odata-entity-model@0.4.0
    - @sap-ux/odata-vocabularies@0.5.1

## 10.1.2

_Released: 2026-05-19T15:16:46Z_

### Patch Changes

- Updated dependencies [63e6846]
    - @sap-ux/project-access@1.38.0
    - @sap-ux/fiori-annotation-api@0.10.1

## 10.1.1

_Released: 2026-05-15T14:04:17Z_

### Patch Changes

- b090449: Enable sap-no-data-field-intent-based-navigation rule to check UI.HeaderFacet annotation in CAP apps.

## 10.1.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/fiori-annotation-api@0.10.0
    - @sap-ux/odata-annotation-core@0.3.0
    - @sap-ux/odata-entity-model@0.4.0
    - @sap-ux/odata-vocabularies@0.5.0
    - @sap-ux/project-access@1.37.0

## 10.0.8

_Released: 2026-05-15T06:38:20Z_

### Patch Changes

- a34e4c2: Update table configuration related eslint rules to include object page section label in the reported issue message.

## 10.0.7

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/fiori-annotation-api@0.9.50
    - @sap-ux/odata-annotation-core@0.2.19
    - @sap-ux/odata-entity-model@0.3.8
    - @sap-ux/odata-vocabularies@0.4.32
    - @sap-ux/project-access@1.36.5

## 10.0.6

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- Updated dependencies [21abda3]
    - @sap-ux/project-access@1.36.4
    - @sap-ux/fiori-annotation-api@0.9.49

## 10.0.5

_Released: 2026-05-11T06:59:50Z_

### Patch Changes

- c520b5e: Add cds annotation code examples to rules documentation.

## 10.0.4

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- @sap-ux/project-access@1.36.3
- @sap-ux/fiori-annotation-api@0.9.48

## 10.0.3

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- Updated dependencies [c160401]
    - @sap-ux/fiori-annotation-api@0.9.47
    - @sap-ux/odata-annotation-core@0.2.18
    - @sap-ux/project-access@1.36.2
    - @sap-ux/odata-entity-model@0.3.7
    - @sap-ux/odata-vocabularies@0.4.31

## 10.0.2

_Released: 2026-04-29T15:24:37Z_

### Patch Changes

- Updated dependencies [3945459]
    - @sap-ux/project-access@1.36.1
    - @sap-ux/fiori-annotation-api@0.9.46

## 10.0.1

_Released: 2026-04-27T19:47:46Z_

### Patch Changes

- Updated dependencies [1d60871]
    - @sap-ux/project-access@1.36.0
    - @sap-ux/fiori-annotation-api@0.9.45

## 10.0.0

_Released: 2026-04-27T15:50:47Z_

### Major Changes

- 165a6c2: feat: support ESLint 10

## 9.13.0

_Released: 2026-04-24T09:57:47Z_

### Minor Changes

- 52f6549: Add .cds annotations support to enable linting of CAP apps with the eslint-plugin-fiori-tools.

### Patch Changes

- Updated dependencies [52f6549]
    - @sap-ux/fiori-annotation-api@0.9.44

## 9.12.3

_Released: 2026-04-23T12:54:21Z_

### Patch Changes

- Updated dependencies [03d3ea1]
    - @sap-ux/project-access@1.35.21
    - @sap-ux/fiori-annotation-api@0.9.43

## 9.12.2

_Released: 2026-04-21T09:57:38Z_

### Patch Changes

- 291351f: Update sap-no-data-field-intent-based-navigation rule documentation with information on semantic link navigation.

## 9.12.1

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- @sap-ux/project-access@1.35.20
- @sap-ux/fiori-annotation-api@0.9.42

## 9.12.0

_Released: 2026-04-13T07:28:19Z_

### Minor Changes

- 524690a: [rule] Add rule to check that a text property for a field with UI.TextArrangement is not hidden.

## 9.11.7

_Released: 2026-04-09T11:02:11Z_

### Patch Changes

- 9696e29: Add legacy fiori_tools_configure.eslintrc for `recommended` and `recommended-for-s4hana`

## 9.11.6

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- f1e4481: chore: upgrade lodash 4.17.23 → 4.18.1 (CVE security fix, vulnerable range <=4.17.23)
    - @sap-ux/fiori-annotation-api@0.9.41
    - @sap-ux/project-access@1.35.19

## 9.11.5

_Released: 2026-04-07T07:42:21Z_

### Patch Changes

- 0f7f5f3: Fix: Check minUI5 version for the sap-width-including-column-header rule

## 9.11.4

_Released: 2026-04-02T16:11:10Z_

### Patch Changes

- f65d718: fix: revert eslint peerDependency to ^9 instead of exact version

## 9.11.3

_Released: 2026-04-01T13:59:33Z_

### Patch Changes

- 0153757: add es2020 globals

## 9.11.2

_Released: 2026-04-01T11:49:37Z_

### Patch Changes

- Updated dependencies [3291f6c]
    - @sap-ux/project-access@1.35.18
    - @sap-ux/fiori-annotation-api@0.9.40

## 9.11.1

_Released: 2026-03-31T15:15:08Z_

### Patch Changes

- 896be16: Add legacy eslint config from file `fiori_tools_configure.eslintrc` and `fiori_tools_testcode.eslintrc` for recommended-for-s4hana

## 9.11.0

_Released: 2026-03-31T12:37:32Z_

### Minor Changes

- a61cb9b: [rule] Add rule to check that intent-based navigation data fields are not used.

## 9.10.5

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(eslint-plugin-fiori-tools): upgrade typescript-eslint 8.46.2 → 8.57.2; upgrade shared devDependencies (jest 30)
- Updated dependencies [c53a4ba]
    - @sap-ux/odata-vocabularies@0.4.30
    - @sap-ux/fiori-annotation-api@0.9.39
    - @sap-ux/project-access@1.35.17

## 9.10.4

_Released: 2026-03-26T20:06:10Z_

### Patch Changes

- Updated dependencies [b66e827]
    - @sap-ux/project-access@1.35.17
    - @sap-ux/fiori-annotation-api@0.9.38

## 9.10.3

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: fix(eslint-plugin-fiori-tools): upgrade runtime dependencies and fix @eslint/core 1.x compatibility
    - Upgrade @babel/core, @eslint/json, @eslint/config-helpers, globals, synckit, yaml, semver, @sap-ux/vocabularies-types
    - Cast rules to `Plugin['rules']` for stricter @eslint/core 1.x type definitions

- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/fiori-annotation-api@0.9.37
    - @sap-ux/project-access@1.35.16

## 9.10.2

_Released: 2026-03-25T12:56:41Z_

### Patch Changes

- Updated dependencies [f384ace]
    - @sap-ux/project-access@1.35.15
    - @sap-ux/fiori-annotation-api@0.9.36

## 9.10.1

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- @sap-ux/project-access@1.35.14
- @sap-ux/fiori-annotation-api@0.9.35

## 9.10.0

_Released: 2026-03-19T12:13:39Z_

### Minor Changes

- 8ec22c9: [rule] add sap-condensed-table-layout eslint rule

## 9.9.4

_Released: 2026-03-18T14:50:43Z_

### Patch Changes

- Updated dependencies [436cad8]
    - @sap-ux/fiori-annotation-api@0.9.34

## 9.9.3

_Released: 2026-03-17T13:16:55Z_

### Patch Changes

- 9afb66a: feat: add plugin version number to rule in readme

## 9.9.2

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.33

## 9.9.1

_Released: 2026-03-16T17:06:45Z_

### Patch Changes

- Updated dependencies [dfa433e]
    - @sap-ux/fiori-annotation-api@0.9.32
    - @sap-ux/odata-entity-model@0.3.7
    - @sap-ux/odata-annotation-core@0.2.17
    - @sap-ux/odata-vocabularies@0.4.29

## 9.9.0

_Released: 2026-03-16T10:24:20Z_

### Minor Changes

- 5055dde: Feat: add sap-strict-uom-filtering eslint rule

## 9.8.0

_Released: 2026-03-13T09:08:55Z_

### Minor Changes

- af65902: Add table personalization rule that checks that all table customization settings are available in OData V4 applications.

## 9.7.8

_Released: 2026-03-11T16:49:00Z_

### Patch Changes

- Updated dependencies [79e69b9]
    - @sap-ux/odata-vocabularies@0.4.28
    - @sap-ux/fiori-annotation-api@0.9.31

## 9.7.7

_Released: 2026-03-10T16:01:33Z_

### Patch Changes

- a9322c9: fix(deps): update dependency globals to v17

## 9.7.6

_Released: 2026-03-10T07:46:29Z_

### Patch Changes

- Updated dependencies [e1ef0ba]
    - @sap-ux/fiori-annotation-api@0.9.30

## 9.7.5

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- Updated dependencies [d834713]
    - @sap-ux/project-access@1.35.13
    - @sap-ux/fiori-annotation-api@0.9.29

## 9.7.4

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- 2917c4c: fix(deps): update dependency yaml to v2.8.2
- 7c06ef0: fix(deps): update dependencies [open-ux-odata]
- fa74f92: fix(deps): update dependency c8 to v11
- 83ca0e9: fix(deps): update dependency cross-env to v10
- Updated dependencies [7c06ef0]
    - @sap-ux/fiori-annotation-api@0.9.28
    - @sap-ux/project-access@1.35.12

## 9.7.3

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- f90fcca: fix(deps): update dependency @eslint/json to v0.14.0
    - @sap-ux/fiori-annotation-api@0.9.27
    - @sap-ux/project-access@1.35.11

## 9.7.2

_Released: 2026-03-04T15:52:08Z_

### Patch Changes

- 4dcf980: fix(deps): update dependency @eslint/config-helpers to v0.5.2

## 9.7.1

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- @sap-ux/project-access@1.35.11
- @sap-ux/fiori-annotation-api@0.9.26

## 9.7.0

_Released: 2026-03-04T12:59:11Z_

### Minor Changes

- 51236d3: Add sap-anchor-bar-visible eslint rule.

## 9.6.10

_Released: 2026-03-04T09:03:38Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.25
- @sap-ux/odata-annotation-core@0.2.16
- @sap-ux/odata-entity-model@0.3.6
- @sap-ux/odata-vocabularies@0.4.27

## 9.6.9

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/project-access@1.35.10
    - @sap-ux/fiori-annotation-api@0.9.24

## 9.6.8

_Released: 2026-02-27T14:38:29Z_

### Patch Changes

- 562469f: Update the readme with .mjs example for configuration

## 9.6.7

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.23

## 9.6.6

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.9
- @sap-ux/fiori-annotation-api@0.9.22

## 9.6.5

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- Updated dependencies [0ecc5f1]
- Updated dependencies [cc1c422]
    - @sap-ux/project-access@1.35.8
    - @sap-ux/fiori-annotation-api@0.9.21
    - @sap-ux/odata-annotation-core@0.2.15
    - @sap-ux/odata-entity-model@0.3.6
    - @sap-ux/odata-vocabularies@0.4.26

## 9.6.4

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.7
- @sap-ux/fiori-annotation-api@0.9.20

## 9.6.3

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.19

## 9.6.2

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- bb310dc: fix(deps): update dependency semver to v7.7.4
- Updated dependencies [bb310dc]
- Updated dependencies [e5bc3ca]
    - @sap-ux/project-access@1.35.6
    - @sap-ux/fiori-annotation-api@0.9.18

## 9.6.1

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/project-access@1.35.5
    - @sap-ux/fiori-annotation-api@0.9.17

## 9.6.0

_Released: 2026-02-18T10:31:10Z_

### Minor Changes

- 552c106: Fix: check table paste functionality is enabled on object pages only.

## 9.5.11

_Released: 2026-02-17T01:38:30Z_

### Patch Changes

- Updated dependencies [1fa3bb7]
    - @sap-ux/odata-vocabularies@0.4.25
    - @sap-ux/fiori-annotation-api@0.9.16

## 9.5.10

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- @sap-ux/project-access@1.35.4
- @sap-ux/fiori-annotation-api@0.9.15

## 9.5.9

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- Updated dependencies [346f09c]
    - @sap-ux/project-access@1.35.3
    - @sap-ux/fiori-annotation-api@0.9.14

## 9.5.8

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- Updated dependencies [d2b772d]
    - @sap-ux/project-access@1.35.2
    - @sap-ux/fiori-annotation-api@0.9.13

## 9.5.7

_Released: 2026-02-11T09:38:04Z_

### Patch Changes

- 47f2f3f: Add auto fix for `sap-width-including-column-header` rule

## 9.5.6

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/odata-vocabularies@0.4.24
    - @sap-ux/fiori-annotation-api@0.9.12
    - @sap-ux/project-access@1.35.1

## 9.5.5

_Released: 2026-02-10T21:03:43Z_

### Patch Changes

- Updated dependencies [3795bb2]
    - @sap-ux/odata-annotation-core@0.2.14
    - @sap-ux/fiori-annotation-api@0.9.11
    - @sap-ux/odata-entity-model@0.3.5
    - @sap-ux/odata-vocabularies@0.4.23

## 9.5.4

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/project-access@1.35.0
    - @sap-ux/fiori-annotation-api@0.9.10

## 9.5.3

_Released: 2026-02-09T10:08:59Z_

### Patch Changes

- 0e1d0f3: Remove statePreservationMode with auto fix option

## 9.5.2

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- Updated dependencies [467e6aa]
    - @sap-ux/project-access@1.34.7
    - @sap-ux/fiori-annotation-api@0.9.9

## 9.5.1

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- ad321ab: fix(deps): update dependency semver to v7.7.3
- Updated dependencies [ad321ab]
    - @sap-ux/project-access@1.34.6
    - @sap-ux/fiori-annotation-api@0.9.8

## 9.5.0

_Released: 2026-02-04T17:27:24Z_

### Minor Changes

- 5c8b645: Add tableColumnVerticalAlignment setting rule for Responsive tables in OData V2 applications.

## 9.4.1

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [89175fe]
    - @sap-ux/project-access@1.34.5
    - @sap-ux/fiori-annotation-api@0.9.7

## 9.4.0

_Released: 2026-02-02T11:51:30Z_

### Minor Changes

- 6a5469b: Added eslint rules to enable paste and export in OData V4 application tables.

## 9.3.3

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- ea7a16c: Fix Extend lodash vulnerability
    - @sap-ux/fiori-annotation-api@0.9.6
    - @sap-ux/project-access@1.34.4

## 9.3.2

_Released: 2026-01-30T15:15:44Z_

### Patch Changes

- c77df15: Exclude page name when reporting issue on application level for table creation mode

## 9.3.1

_Released: 2026-01-30T13:45:47Z_

### Patch Changes

- ecc305d: Add statePreservationMode rule for OData V2 application.

## 9.3.0

_Released: 2026-01-30T08:25:17Z_

### Minor Changes

- 416428c: Add copy to clipboard property rule for OData V2 application tables.

## 9.2.4

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- Updated dependencies [6d71400]
    - @sap-ux/fiori-annotation-api@0.9.5
    - @sap-ux/project-access@1.34.3
    - @sap-ux/odata-annotation-core@0.2.13
    - @sap-ux/odata-entity-model@0.3.4
    - @sap-ux/odata-vocabularies@0.4.22

## 9.2.3

_Released: 2026-01-27T14:39:50Z_

### Patch Changes

- 98a5947: fix: add auto fix for creation mode for table

## 9.2.2

_Released: 2026-01-27T10:15:32Z_

### Patch Changes

- 40b2423: fix: revised text

## 9.2.1

_Released: 2026-01-23T22:30:10Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.4

## 9.2.0

_Released: 2026-01-21T09:55:25Z_

### Minor Changes

- cd27778: Fix plugin integration issue when working with multiple projects: create new ProjectContext and cache diagnostics by file uri and ruleId.

## 9.1.3

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- be67fc4: fix: fix path mappings and also lint custom mockserver extensions
- Updated dependencies [be67fc4]
    - @sap-ux/project-access@1.34.2
    - @sap-ux/fiori-annotation-api@0.9.3

## 9.1.2

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1
    - @sap-ux/fiori-annotation-api@0.9.2

## 9.1.1

_Released: 2026-01-15T12:16:35Z_

### Patch Changes

- 4d6695f: fix: add missing JSDoc
- Updated dependencies [4d6695f]
    - @sap-ux/fiori-annotation-api@0.9.1

## 9.1.0

_Released: 2026-01-14T17:56:49Z_

### Minor Changes

- b132944: feat: add consistency rules `sap-flex-enabled`, `sap-disable-copy-to-clipboard` and `sap-width-including-column-header`.

### Patch Changes

- Updated dependencies [b132944]
- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0
    - @sap-ux/fiori-annotation-api@0.9.0

## 9.0.5

_Released: 2026-01-12T09:10:27Z_

### Patch Changes

- d667a5e: fix: add repository field to package.json

## 9.0.4

_Released: 2025-12-23T18:45:16Z_

### Patch Changes

- d24f36d: refactor: update ESLint configuration to remove unnecessary `defineConfig` usage

## 9.0.3

_Released: 2025-12-19T16:41:18Z_

### Patch Changes

- 904870c: Update README with migration guide for ESLint 9

## 9.0.2

_Released: 2025-12-19T15:33:24Z_

### Patch Changes

- dad2bd7: Write Eslint 9 flat config for new project. Replace eslint-plugin-fiori-custom with @sap-ux/eslint-plugin-fiori-tools

## 9.0.1

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues

## 9.0.0

_Released: 2025-12-18T16:52:25Z_

### Major Changes

- 0ffd46f: Merge eslint-plugin-fiori-custom into @sap-ux/eslint-plugin-fiori-tools. Upgrade to support eslint 9.
  Now using eslint 9 flat config file format.

## 0.6.2

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md

## 0.6.1

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 0.6.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

## 0.5.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.4.2

_Released: 2024-05-22T19:49:18Z_

### Patch Changes

- 398c4092: Relax some eslint rules for fiori typescript projects

## 0.4.1

_Released: 2024-04-11T18:52:44Z_

### Patch Changes

- da0ecd9a: Enable Typscript type checking in eslint module @sap-ux/eslint-plugin-fiori-tools

## 0.3.2

_Released: 2024-03-15T14:41:45Z_

### Patch Changes

- 4b29ddcc: Update TypeScript templates, eslint config and ui5 devDependencies

## 0.3.1

_Released: 2024-02-27T22:07:50Z_

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json

## 0.3.0

_Released: 2023-10-19T12:06:19Z_

### Minor Changes

- 1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

## 0.2.2

_Released: 2023-09-20T13:13:51Z_

### Patch Changes

- 63c698a8: chore - fix publishing of modules missed in failed release build

## 0.2.1

_Released: 2023-06-27T14:58:54Z_

### Patch Changes

- 4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.

## 0.2.0

_Released: 2023-06-12T13:22:02Z_

### Minor Changes

- 7c70e25d: adds new writer ui5-library-writer

## 0.1.5

_Released: 2023-05-24T18:07:01Z_

### Patch Changes

- 5c7f40c6: fix build cache for release artefact

## 0.1.4

_Released: 2023-05-24T17:45:06Z_

### Patch Changes

- b6793a50: release new version

## 0.1.2

_Released: 2023-05-24T17:15:34Z_

### Patch Changes

- 059f3fc0: Update Readme and bump version

## 0.1.1

_Released: 2023-05-24T10:35:22Z_

### Patch Changes

- 495a22cb: Use @sap-ux/eslint-plugin-fiori-tools for JS projects with eslint option

## 0.1.0

### Minor Changes

- 7ac0cb40: Add new module containing an eslint plugin with reusable eslint configs
