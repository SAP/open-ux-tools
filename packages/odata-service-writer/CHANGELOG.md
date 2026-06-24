# @sap-ux/odata-service-writer

## 1.0.7

### Patch Changes

#### Bug Fixes

- add builder.resources.excludes to ui5.yaml and ui5-local.yaml when adding an OData service [[51365e2](https://github.com/SAP/open-ux-tools/commit/51365e2da9e26a93b56196af0171f93bcccf5ce5)]

## 1.0.6

*Released: 2026-06-10T09:57:42Z*

### Patch Changes

- Updated dependencies [c8e8f7e]
    - @sap-ux/ui5-config@1.0.3
    - @sap-ux/mockserver-config-writer@1.0.6
    - @sap-ux/project-access@2.1.2

## 1.0.5

*Released: 2026-06-04T13:54:21Z*

### Patch Changes

- Updated dependencies [fff7490]
    - @sap-ux/project-access@2.1.1
    - @sap-ux/mockserver-config-writer@1.0.5

## 1.0.4

*Released: 2026-06-04T10:19:37Z*

### Patch Changes

- Updated dependencies [b326a9a]
    - @sap-ux/project-access@2.1.0
    - @sap-ux/mockserver-config-writer@1.0.4

## 1.0.3

*Released: 2026-06-03T14:58:37Z*

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/mockserver-config-writer@1.0.3
    - @sap-ux/project-access@2.0.3
    - @sap-ux/ui5-config@1.0.2

## 1.0.2

*Released: 2026-06-03T13:52:44Z*

### Patch Changes

- Updated dependencies [9580241]
    - @sap-ux/ui5-config@1.0.1
    - @sap-ux/mockserver-config-writer@1.0.2
    - @sap-ux/project-access@2.0.2

## 1.0.1

*Released: 2026-06-01T15:15:26Z*

### Patch Changes

- Updated dependencies [aed799d]
    - @sap-ux/project-access@2.0.1
    - @sap-ux/mockserver-config-writer@1.0.1

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

### Patch Changes

- Updated dependencies [32609a7]
    - @sap-ux/mockserver-config-writer@1.0.0
    - @sap-ux/project-access@2.0.0
    - @sap-ux/ui5-config@1.0.0

## 0.32.2

*Released: 2026-05-21T16:21:11Z*

### Patch Changes

- Updated dependencies [9752c40]
    - @sap-ux/ui5-config@0.31.1
    - @sap-ux/mockserver-config-writer@0.10.2
    - @sap-ux/project-access@1.38.1

## 0.32.1

*Released: 2026-05-19T15:16:46Z*

### Patch Changes

- Updated dependencies [63e6846]
    - @sap-ux/project-access@1.38.0
    - @sap-ux/mockserver-config-writer@0.10.1

## 0.32.0

*Released: 2026-05-15T08:12:20Z*

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/mockserver-config-writer@0.10.0
    - @sap-ux/project-access@1.37.0
    - @sap-ux/ui5-config@0.31.0

## 0.31.15

*Released: 2026-05-14T21:28:41Z*

### Patch Changes

- 138246a: fix(odata-service-writer): derive manifest odataVersion from EDMX metadata instead of minUI5Version

## 0.31.14

*Released: 2026-05-14T11:45:51Z*

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/mockserver-config-writer@0.9.78
    - @sap-ux/project-access@1.36.5
    - @sap-ux/ui5-config@0.30.5

## 0.31.13

*Released: 2026-05-13T09:36:59Z*

### Patch Changes

- 21abda3: chore: upgrade fast-xml-parser 5.7.2 → 5.8.0 (fixes fast-xml-builder CVE-2025-47916)
- Updated dependencies [21abda3]
    - @sap-ux/project-access@1.36.4
    - @sap-ux/mockserver-config-writer@0.9.77

## 0.31.12

*Released: 2026-05-06T23:02:00Z*

### Patch Changes

- Updated dependencies [678a08e]
    - @sap-ux/ui5-config@0.30.4
    - @sap-ux/mockserver-config-writer@0.9.76
    - @sap-ux/project-access@1.36.3

## 0.31.11

*Released: 2026-04-30T14:23:24Z*

### Patch Changes

- @sap-ux/project-access@1.36.2
- @sap-ux/mockserver-config-writer@0.9.75

## 0.31.10

*Released: 2026-04-29T15:24:37Z*

### Patch Changes

- 3945459: chore: upgrade fast-xml-parser 5.5.9 to 5.7.2 (security fix for XML comment/CDATA injection)
- Updated dependencies [3945459]
    - @sap-ux/project-access@1.36.1
    - @sap-ux/mockserver-config-writer@0.9.74

## 0.31.9

*Released: 2026-04-27T19:47:46Z*

### Patch Changes

- Updated dependencies [1d60871]
    - @sap-ux/project-access@1.36.0
    - @sap-ux/mockserver-config-writer@0.9.73

## 0.31.8

*Released: 2026-04-23T12:54:21Z*

### Patch Changes

- Updated dependencies [03d3ea1]
    - @sap-ux/project-access@1.35.21
    - @sap-ux/mockserver-config-writer@0.9.72

## 0.31.7

*Released: 2026-04-14T12:35:35Z*

### Patch Changes

- Updated dependencies [cc4450c]
    - @sap-ux/ui5-config@0.30.3
    - @sap-ux/mockserver-config-writer@0.9.71
    - @sap-ux/project-access@1.35.20

## 0.31.6

*Released: 2026-04-08T13:10:18Z*

### Patch Changes

- Updated dependencies [f1e4481]
    - @sap-ux/ui5-config@0.30.2
    - @sap-ux/project-access@1.35.19
    - @sap-ux/mockserver-config-writer@0.9.70

## 0.31.5

*Released: 2026-04-01T11:49:37Z*

### Patch Changes

- Updated dependencies [3291f6c]
    - @sap-ux/project-access@1.35.18
    - @sap-ux/mockserver-config-writer@0.9.69

## 0.31.4

*Released: 2026-03-30T22:24:11Z*

### Patch Changes

- c53a4ba: chore(odata-service-writer): upgrade shared devDependencies (jest 30, i18next 25)
- Updated dependencies [c53a4ba]
    - @sap-ux/mockserver-config-writer@0.9.68
    - @sap-ux/project-access@1.35.17
    - @sap-ux/ui5-config@0.30.1

## 0.31.3

*Released: 2026-03-26T20:06:10Z*

### Patch Changes

- Updated dependencies [b66e827]
    - @sap-ux/project-access@1.35.17
    - @sap-ux/mockserver-config-writer@0.9.67

## 0.31.2

*Released: 2026-03-26T12:07:04Z*

### Patch Changes

- a41533f: chore(odata-service-writer): simplify array element null check with optional chaining
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/mockserver-config-writer@0.9.66
    - @sap-ux/project-access@1.35.16
    - @sap-ux/ui5-config@0.30.1

## 0.31.1

*Released: 2026-03-25T12:56:41Z*

### Patch Changes

- Updated dependencies [f384ace]
    - @sap-ux/project-access@1.35.15
    - @sap-ux/mockserver-config-writer@0.9.65

## 0.31.0

_Released: 2026-03-20T16:07:49Z_

### Minor Changes

- 25e5177: support full service url systems in the application generator and generated apps for preview and deployment

### Patch Changes

- Updated dependencies [25e5177]
    - @sap-ux/ui5-config@0.30.0
    - @sap-ux/mockserver-config-writer@0.9.64
    - @sap-ux/project-access@1.35.14

## 0.30.1

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18
- Updated dependencies [55417bb]
    - @sap-ux/mockserver-config-writer@0.9.63
    - @sap-ux/ui5-config@0.29.21

## 0.30.0

_Released: 2026-03-06T13:19:33Z_

### Minor Changes

- 3edf6d7: Preserve preview path during service sync

## 0.29.34

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- Updated dependencies [d834713]
    - @sap-ux/project-access@1.35.13
    - @sap-ux/mockserver-config-writer@0.9.62

## 0.29.33

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- 7c06ef0: fix(deps): update dependencies [open-ux-odata]
- Updated dependencies [7c06ef0]
    - @sap-ux/project-access@1.35.12
    - @sap-ux/ui5-config@0.29.21
    - @sap-ux/mockserver-config-writer@0.9.61

## 0.29.32

_Released: 2026-03-05T10:41:09Z_

### Patch Changes

- 5aff25c: fix(deps): update dependency fs-extra to v11

## 0.29.31

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- ac58145: fix(deps): update dependency fs-extra to v10.1.0
    - @sap-ux/project-access@1.35.11
    - @sap-ux/ui5-config@0.29.20

## 0.29.30

_Released: 2026-03-04T15:52:08Z_

### Patch Changes

- 2302698: fix(deps): update dependency @sap-ux/edmx-parser to v0.10.0

## 0.29.29

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- Updated dependencies [c09b843]
    - @sap-ux/ui5-config@0.29.20
    - @sap-ux/mockserver-config-writer@0.9.60
    - @sap-ux/project-access@1.35.11

## 0.29.28

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- ca2566b: Update fast-xml-parser

    Issue: #37278

- Updated dependencies [ca2566b]
    - @sap-ux/project-access@1.35.10
    - @sap-ux/mockserver-config-writer@0.9.59

## 0.29.27

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- 6c993f3: fix: turn off i18next support notice
- Updated dependencies [6c993f3]
    - @sap-ux/mockserver-config-writer@0.9.58
    - @sap-ux/ui5-config@0.29.19

## 0.29.26

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.9
- @sap-ux/mockserver-config-writer@0.9.57

## 0.29.25

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- Updated dependencies [0ecc5f1]
    - @sap-ux/project-access@1.35.8
    - @sap-ux/mockserver-config-writer@0.9.56

## 0.29.24

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- Updated dependencies [d92cd35]
    - @sap-ux/ui5-config@0.29.19
    - @sap-ux/mockserver-config-writer@0.9.55
    - @sap-ux/project-access@1.35.7

## 0.29.23

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- ff634b0: fix(deps): update dependency @sap-ux/edmx-parser to v0.9.8

## 0.29.22

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12
- Updated dependencies [cbd340a]
    - @sap-ux/mockserver-config-writer@0.9.54
    - @sap-ux/ui5-config@0.29.18

## 0.29.21

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- bb310dc: fix(deps): update dependency semver to v7.7.4
- Updated dependencies [bb310dc]
- Updated dependencies [e5bc3ca]
    - @sap-ux/project-access@1.35.6
    - @sap-ux/ui5-config@0.29.18
    - @sap-ux/mockserver-config-writer@0.9.53

## 0.29.20

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- d57cc47: Update fast-xml-parser
- Updated dependencies [d57cc47]
    - @sap-ux/project-access@1.35.5
    - @sap-ux/mockserver-config-writer@0.9.52

## 0.29.19

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- Updated dependencies [e7f58d7]
    - @sap-ux/ui5-config@0.29.17
    - @sap-ux/mockserver-config-writer@0.9.51
    - @sap-ux/project-access@1.35.4

## 0.29.18

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- Updated dependencies [346f09c]
    - @sap-ux/project-access@1.35.3
    - @sap-ux/mockserver-config-writer@0.9.50

## 0.29.17

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- Updated dependencies [d2b772d]
    - @sap-ux/project-access@1.35.2
    - @sap-ux/mockserver-config-writer@0.9.49

## 0.29.16

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/ui5-config@0.29.16
    - @sap-ux/mockserver-config-writer@0.9.48
    - @sap-ux/project-access@1.35.1

## 0.29.15

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/project-access@1.35.0
    - @sap-ux/mockserver-config-writer@0.9.47

## 0.29.14

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- Updated dependencies [467e6aa]
    - @sap-ux/project-access@1.34.7
    - @sap-ux/mockserver-config-writer@0.9.46

## 0.29.13

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- ad321ab: fix(deps): update dependency semver to v7.7.3
- Updated dependencies [ad321ab]
    - @sap-ux/project-access@1.34.6
    - @sap-ux/ui5-config@0.29.15
    - @sap-ux/mockserver-config-writer@0.9.45

## 0.29.12

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- 89175fe: fix(deps): update dependency fast-xml-parser to v5 [security]
- Updated dependencies [89175fe]
    - @sap-ux/project-access@1.34.5
    - @sap-ux/mockserver-config-writer@0.9.44

## 0.29.11

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- ea7a16c: Fix Extend lodash vulnerability
- Updated dependencies [ea7a16c]
    - @sap-ux/ui5-config@0.29.14
    - @sap-ux/project-access@1.34.4
    - @sap-ux/mockserver-config-writer@0.9.43

## 0.29.10

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- 6d71400: Changes to support v4.01 odata services
- Updated dependencies [6d71400]
    - @sap-ux/project-access@1.34.3
    - @sap-ux/mockserver-config-writer@0.9.42

## 0.29.9

_Released: 2026-01-23T22:30:10Z_

### Patch Changes

- d11943d: fix(deps): update dependency i18next to v25.8.0
- Updated dependencies [d11943d]
    - @sap-ux/mockserver-config-writer@0.9.41

## 0.29.8

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- Updated dependencies [be67fc4]
- Updated dependencies [be67fc4]
    - @sap-ux/ui5-config@0.29.13
    - @sap-ux/project-access@1.34.2
    - @sap-ux/mockserver-config-writer@0.9.40

## 0.29.7

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1
    - @sap-ux/mockserver-config-writer@0.9.39

## 0.29.6

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0
    - @sap-ux/mockserver-config-writer@0.9.38

## 0.29.5

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- Updated dependencies [f13d1c2]
    - @sap-ux/project-access@1.33.2
    - @sap-ux/mockserver-config-writer@0.9.37

## 0.29.4

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/project-access@1.33.1
    - @sap-ux/mockserver-config-writer@0.9.36

## 0.29.3

_Released: 2026-01-08T17:12:17Z_

### Patch Changes

- 2204ad3: fix(deps): update dependencies @sap-ux/annotation-converter to v0.10.19 and @sap-ux/vocabularies-types to v0.14.5

## 0.29.2

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/project-access@1.33.0
    - @sap-ux/mockserver-config-writer@0.9.35
    - @sap-ux/ui5-config@0.29.12

## 0.29.1

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/project-access@1.32.17
    - @sap-ux/ui5-config@0.29.12
    - @sap-ux/mockserver-config-writer@0.9.34

## 0.29.0

_Released: 2025-12-18T13:13:52Z_

### Minor Changes

- 691ab27: Prompt user to download value helps for V4 services with associated value helps. Add downloaded value helps as multiple metadata files alongside the service in the generated project.

## 0.28.0

_Released: 2025-12-18T08:56:52Z_

### Minor Changes

- 5287327: Updated @sap-ux/annotation-converter to version 0.10.9 and @sap-ux/vocabularies-types to version 0.13.2 across multiple packages. These changes ensure that the latest versions with potential fixes and enhancements are used.

## 0.27.38

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/mockserver-config-writer@0.9.33
    - @sap-ux/project-access@1.32.16
    - @sap-ux/ui5-config@0.29.11

## 0.27.37

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- Updated dependencies [7217d7d]
    - @sap-ux/project-access@1.32.15
    - @sap-ux/mockserver-config-writer@0.9.32

## 0.27.36

_Released: 2025-12-12T09:02:37Z_

### Patch Changes

- e1647fe: fix: write external service metadata during project generation.

## 0.27.35

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- Updated dependencies [4bdced0]
    - @sap-ux/project-access@1.32.14
    - @sap-ux/mockserver-config-writer@0.9.31

## 0.27.34

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- Updated dependencies [985223a]
    - @sap-ux/project-access@1.32.13
    - @sap-ux/mockserver-config-writer@0.9.30

## 0.27.33

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- Updated dependencies [45fe64e]
    - @sap-ux/project-access@1.32.12
    - @sap-ux/mockserver-config-writer@0.9.29

## 0.27.32

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- Updated dependencies [07725fe]
    - @sap-ux/project-access@1.32.11
    - @sap-ux/mockserver-config-writer@0.9.28

## 0.27.31

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- 5d0598d: feat: save service metadata referenced in ValueListReferences and CodeList annotations.
- Updated dependencies [5d0598d]
    - @sap-ux/mockserver-config-writer@0.9.27
    - @sap-ux/ui5-config@0.29.10
    - @sap-ux/project-access@1.32.10

## 0.27.30

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- Updated dependencies [7c09c8e]
- Updated dependencies [1c13c9c]
    - @sap-ux/project-access@1.32.9
    - @sap-ux/mockserver-config-writer@0.9.26

## 0.27.29

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/mockserver-config-writer@0.9.25
    - @sap-ux/project-access@1.32.8
    - @sap-ux/ui5-config@0.29.9

## 0.27.28

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- Updated dependencies [d895232]
    - @sap-ux/project-access@1.32.7
    - @sap-ux/mockserver-config-writer@0.9.24

## 0.27.27

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- Updated dependencies [ea0a942]
    - @sap-ux/project-access@1.32.6
    - @sap-ux/mockserver-config-writer@0.9.23

## 0.27.26

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- Updated dependencies [c5d7915]
    - @sap-ux/project-access@1.32.5
    - @sap-ux/mockserver-config-writer@0.9.22

## 0.27.25

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- Updated dependencies [9e94382]
    - @sap-ux/ui5-config@0.29.8
    - @sap-ux/mockserver-config-writer@0.9.21
    - @sap-ux/project-access@1.32.4

## 0.27.24

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/mockserver-config-writer@0.9.20
    - @sap-ux/project-access@1.32.3
    - @sap-ux/ui5-config@0.29.7

## 0.27.23

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- Updated dependencies [d866995]
    - @sap-ux/ui5-config@0.29.6
    - @sap-ux/mockserver-config-writer@0.9.19
    - @sap-ux/project-access@1.32.2

## 0.27.22

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- Updated dependencies [9872384]
    - @sap-ux/ui5-config@0.29.5
    - @sap-ux/mockserver-config-writer@0.9.18
    - @sap-ux/project-access@1.32.1

## 0.27.21

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- Updated dependencies [f9b4afe]
    - @sap-ux/project-access@1.32.0
    - @sap-ux/mockserver-config-writer@0.9.17

## 0.27.20

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- Updated dependencies [c385a76]
    - @sap-ux/project-access@1.31.0
    - @sap-ux/mockserver-config-writer@0.9.16

## 0.27.19

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- Updated dependencies [8ccc4da]
    - @sap-ux/ui5-config@0.29.4
    - @sap-ux/mockserver-config-writer@0.9.15
    - @sap-ux/project-access@1.30.14

## 0.27.18

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- Updated dependencies [4cfebaf]
    - @sap-ux/ui5-config@0.29.3
    - @sap-ux/mockserver-config-writer@0.9.14
    - @sap-ux/project-access@1.30.13

## 0.27.17

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- 178dbea: sanitize ignoreCertError (singular) configration option to ignoreCertErrors (plural)
- Updated dependencies [178dbea]
    - @sap-ux/mockserver-config-writer@0.9.13
    - @sap-ux/ui5-config@0.29.2
    - @sap-ux/project-access@1.30.12

## 0.27.16

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/project-access@1.30.11
- @sap-ux/mockserver-config-writer@0.9.12

## 0.27.15

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- Updated dependencies [43bc887]
    - @sap-ux/ui5-config@0.29.1
    - @sap-ux/mockserver-config-writer@0.9.11
    - @sap-ux/project-access@1.30.10

## 0.27.14

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.9
- @sap-ux/mockserver-config-writer@0.9.10

## 0.27.13

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- Updated dependencies [4e0bd83]
    - @sap-ux/project-access@1.30.8
    - @sap-ux/mockserver-config-writer@0.9.9

## 0.27.12

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- Updated dependencies [58cdce6]
    - @sap-ux/project-access@1.30.7
    - @sap-ux/mockserver-config-writer@0.9.8

## 0.27.11

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- 69f62ec: i18next upgrade to 25.3.0
- Updated dependencies [69f62ec]
    - @sap-ux/mockserver-config-writer@0.9.7
    - @sap-ux/ui5-config@0.29.0

## 0.27.10

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- Updated dependencies [c0fa1d1]
    - @sap-ux/ui5-config@0.29.0
    - @sap-ux/mockserver-config-writer@0.9.6
    - @sap-ux/project-access@1.30.6

## 0.27.9

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- Updated dependencies [7a4543e]
    - @sap-ux/project-access@1.30.5
    - @sap-ux/mockserver-config-writer@0.9.5

## 0.27.8

_Released: 2025-06-30T08:46:50Z_

### Patch Changes

- b9675bb: Improve Fiori Tools UI Texts

## 0.27.7

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- Updated dependencies [f75b89d]
    - @sap-ux/project-access@1.30.4
    - @sap-ux/ui5-config@0.28.3
    - @sap-ux/mockserver-config-writer@0.9.4

## 0.27.6

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.3
- @sap-ux/mockserver-config-writer@0.9.3

## 0.27.5

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- Updated dependencies [61ea5c0]
    - @sap-ux/ui5-config@0.28.2
    - @sap-ux/mockserver-config-writer@0.9.2
    - @sap-ux/project-access@1.30.2

## 0.27.4

_Released: 2025-05-29T08:13:17Z_

### Patch Changes

- f9e4913: Allow to only update annotation and metada files without YAML file changes.

## 0.27.3

_Released: 2025-05-26T11:57:48Z_

### Patch Changes

- 6e2ef66: Do not stop service from being added in case if existing services are without annotation dataSources.

## 0.27.2

_Released: 2025-05-22T16:20:10Z_

### Patch Changes

- 07eaebf: Generation of a unique service name (if such service exists) and error for existing service URI.

## 0.27.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- 5e0020b: Support backend changes.
- Updated dependencies [5e0020b]
    - @sap-ux/ui5-config@0.28.1
    - @sap-ux/mockserver-config-writer@0.9.1
    - @sap-ux/project-access@1.30.1

## 0.27.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/mockserver-config-writer@0.9.0
    - @sap-ux/project-access@1.30.0
    - @sap-ux/ui5-config@0.28.0

## 0.26.18

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- Updated dependencies [ea0e2c0]
    - @sap-ux/project-access@1.29.22
    - @sap-ux/mockserver-config-writer@0.8.15

## 0.26.17

_Released: 2025-04-30T10:38:47Z_

### Patch Changes

- 8d4bca6: Write service annotations using `name` instead of `technicalName` to avoid sub folders

## 0.26.16

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- Updated dependencies [7590bc3]
    - @sap-ux/ui5-config@0.27.2
    - @sap-ux/mockserver-config-writer@0.8.14
    - @sap-ux/project-access@1.29.21

## 0.26.15

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- Updated dependencies [294bbe3]
    - @sap-ux/project-access@1.29.20
    - @sap-ux/ui5-config@0.27.1
    - @sap-ux/mockserver-config-writer@0.8.13

## 0.26.14

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- Updated dependencies [1ca4004]
    - @sap-ux/ui5-config@0.27.0
    - @sap-ux/mockserver-config-writer@0.8.12
    - @sap-ux/project-access@1.29.19

## 0.26.13

_Released: 2025-03-19T08:54:25Z_

### Patch Changes

- Updated dependencies [c3ebc82]
    - @sap-ux/project-access@1.29.18
    - @sap-ux/mockserver-config-writer@0.8.11

## 0.26.12

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- 224494c: Improved add, delete and get methods for service backends.
- Updated dependencies [224494c]
    - @sap-ux/ui5-config@0.26.5
    - @sap-ux/mockserver-config-writer@0.8.10
    - @sap-ux/project-access@1.29.17

## 0.26.11

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- Updated dependencies [011c8c5]
    - @sap-ux/ui5-config@0.26.4
    - @sap-ux/mockserver-config-writer@0.8.9
    - @sap-ux/project-access@1.29.16

## 0.26.10

_Released: 2025-03-06T16:16:20Z_

### Patch Changes

- Updated dependencies [1ce7fe9]
    - @sap-ux/project-access@1.29.15
    - @sap-ux/mockserver-config-writer@0.8.8

## 0.26.9

_Released: 2025-03-05T11:16:53Z_

### Patch Changes

- Updated dependencies [3cc8f8a]
    - @sap-ux/project-access@1.29.14
    - @sap-ux/mockserver-config-writer@0.8.7

## 0.26.8

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- Updated dependencies [5817923]
    - @sap-ux/mockserver-config-writer@0.8.6
    - @sap-ux/ui5-config@0.26.3
    - @sap-ux/project-access@1.29.13

## 0.26.7

_Released: 2025-03-04T08:55:15Z_

### Patch Changes

- @sap-ux/project-access@1.29.12
- @sap-ux/mockserver-config-writer@0.8.5

## 0.26.6

_Released: 2025-02-28T15:10:48Z_

### Patch Changes

- Updated dependencies [0f35b4b]
    - @sap-ux/project-access@1.29.11
    - @sap-ux/mockserver-config-writer@0.8.4

## 0.26.5

_Released: 2025-02-27T14:15:03Z_

### Patch Changes

- 4b8577f: fix: usage of static webapp path
- Updated dependencies [4b8577f]
    - @sap-ux/mockserver-config-writer@0.8.3
    - @sap-ux/project-access@1.29.10

## 0.26.4

_Released: 2025-02-27T08:22:17Z_

### Patch Changes

- Updated dependencies [c8c292c]
    - @sap-ux/project-access@1.29.9
    - @sap-ux/mockserver-config-writer@0.8.2

## 0.26.3

_Released: 2025-02-18T18:24:37Z_

### Patch Changes

- dbd725a: Write metadata.xml in update in odata-service-writer

## 0.26.2

_Released: 2025-02-17T16:12:15Z_

### Patch Changes

- Updated dependencies [c244f60]
    - @sap-ux/mockserver-config-writer@0.8.1

## 0.26.1

_Released: 2025-02-17T13:42:22Z_

### Patch Changes

- Updated dependencies [c50e09f]
    - @sap-ux/project-access@1.29.8
    - @sap-ux/mockserver-config-writer@0.8.0

## 0.26.0

_Released: 2025-02-14T10:07:13Z_

### Minor Changes

- f1f9cbe: Service update support.

### Patch Changes

- Updated dependencies [f1f9cbe]
    - @sap-ux/mockserver-config-writer@0.8.0

## 0.25.10

_Released: 2025-02-13T10:58:34Z_

### Patch Changes

- Updated dependencies [2c0d657]
    - @sap-ux/project-access@1.29.7
    - @sap-ux/mockserver-config-writer@0.7.3

## 0.25.9

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- ed8a9b9: Handling of `ignoreCertError` property from service in proxy middleware.
- Updated dependencies [ed8a9b9]
    - @sap-ux/ui5-config@0.26.2
    - @sap-ux/mockserver-config-writer@0.7.3
    - @sap-ux/project-access@1.29.6

## 0.25.8

_Released: 2025-02-05T17:08:20Z_

### Patch Changes

- @sap-ux/project-access@1.29.5
- @sap-ux/mockserver-config-writer@0.7.2

## 0.25.7

_Released: 2025-02-05T15:41:32Z_

### Patch Changes

- 4a90030: `@sap-ux/project-access` moved to dependencies.

## 0.25.6

_Released: 2025-02-05T09:24:10Z_

### Patch Changes

- f349f56: Fixed default naming for model.

## 0.25.5

_Released: 2025-01-28T17:41:21Z_

### Patch Changes

- 9910e7f: Improved set function for the default service model.

## 0.25.4

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- Updated dependencies [19aad96]
    - @sap-ux/ui5-config@0.26.1
    - @sap-ux/mockserver-config-writer@0.7.2

## 0.25.3

_Released: 2025-01-17T09:30:45Z_

### Patch Changes

- 625bca8: Removed local annotation definitions from mockserver middleware in ui5-local.yaml and ui5-mock.yaml files.
- Updated dependencies [625bca8]
    - @sap-ux/mockserver-config-writer@0.7.1

## 0.25.2

_Released: 2025-01-09T12:31:59Z_

### Patch Changes

- 326cd59: Uses "" model for mainService during generation if model for mainService already exists.

## 0.25.1

_Released: 2025-01-07T16:24:13Z_

### Patch Changes

- 0f1b457: Improved update function for manifest by reducing JSON write calls for manifest file.

## 0.25.0

_Released: 2024-12-16T11:25:26Z_

### Minor Changes

- 036b48b: Removed ejs for manifest enhancements.

## 0.24.2

_Released: 2024-12-11T18:23:38Z_

### Patch Changes

- 9f14de1: Improved manifest.json template to allow services with empty remote annotations array and added support for multiple local annotations.

## 0.24.1

_Released: 2024-12-06T07:34:32Z_

### Patch Changes

- 0c9e896: Update existing services in a way that is required for multiple services support - service files in their respective folders.

## 0.24.0

_Released: 2024-12-02T16:28:38Z_

### Minor Changes

- 73475e5: Support for multiple services and multiple annotations per service.

### Patch Changes

- Updated dependencies [73475e5]
    - @sap-ux/mockserver-config-writer@0.7.0
    - @sap-ux/ui5-config@0.26.0

## 0.23.3

_Released: 2024-11-18T20:38:37Z_

### Patch Changes

- Updated dependencies [1beac7e]
    - @sap-ux/ui5-config@0.25.2
    - @sap-ux/mockserver-config-writer@0.6.7

## 0.23.2

_Released: 2024-11-17T22:14:47Z_

### Patch Changes

- 8237f83: feat: add namespaces to annotation template

## 0.23.1

_Released: 2024-11-05T21:46:19Z_

### Patch Changes

- Updated dependencies [6275288]
    - @sap-ux/ui5-config@0.25.1
    - @sap-ux/mockserver-config-writer@0.6.6

## 0.23.0

_Released: 2024-09-23T10:02:33Z_

### Minor Changes

- 484195d: Enhancements to FE & FF Configurations: The updates include adding the `start-variants-management` script to `package.json` for FE and FF. The OdataService interface now has an `ignoreCertError` property. UI5 application writer introduces the `sapuxLayer` property to `package.json` templates and adds `fiori-tools-preview middleware` to ui5, ui5-mock, and ui5-local.yaml. Additionally, the `addFioriToolsPreviewMiddleware` function has been added for YAML config integration.

### Patch Changes

- Updated dependencies [484195d]
    - @sap-ux/ui5-config@0.25.0
    - @sap-ux/mockserver-config-writer@0.6.5

## 0.22.5

_Released: 2024-09-03T19:06:21Z_

### Patch Changes

- d962ce1: Move hasUI5CliV3 to project-access for common re-use
    - @sap-ux/mockserver-config-writer@0.6.4

## 0.22.4

_Released: 2024-08-28T11:16:50Z_

### Patch Changes

- Updated dependencies [1a99abc]
    - @sap-ux/ui5-config@0.24.1
    - @sap-ux/mockserver-config-writer@0.6.4

## 0.22.3

_Released: 2024-08-19T11:34:45Z_

### Patch Changes

- Updated dependencies [61721f2]
    - @sap-ux/ui5-config@0.24.0
    - @sap-ux/mockserver-config-writer@0.6.3

## 0.22.2

_Released: 2024-08-01T17:28:17Z_

### Patch Changes

- e69db46: Upgrade fast-xml-parser
- Updated dependencies [e69db46]
    - @sap-ux/mockserver-config-writer@0.6.2

## 0.22.1

_Released: 2024-07-23T09:01:05Z_

### Patch Changes

- d549173: - Adjusts getMinUI5VersionAsArray so that semver valid check is included; the function now only returns valid versions.
    - Upgrade of @ui5/manifest to 1.66.0; adjustment of all components so that minimumUI5Version definitions as array are processed properly.
    - @sap-ux/mockserver-config-writer@0.6.1

## 0.22.0

_Released: 2024-07-16T11:43:42Z_

### Minor Changes

- 5b243ac: Add `projectType` mandatory option to `App` interface to specify the type of project being processed. This option determines file inclusion/exclusion and script updates in the template:
    - For projects of type 'CAPJava' or 'CAPNodejs':
        - Exclude `ui5-local.yaml` and `.gitignore` from the template.
        - Update `package.json` to include only the script `deploy-config`.
        - Use full URLs to determine resource URLs in `webapp/index.html` and `flpSandbox.html`.
    - For projects of type 'EDMXBackend':
        - Include `ui5-local.yaml` and `.gitignore` in the template.
        - Update `package.json` to include the following scripts: start, start-local, build, start-noflp, start-mock, int-test, deploy, and sap-ux.
        - Include relative URLs to determine resource URLs in `webapp/index.html` and `flpSandbox.html`.

## 0.21.1

_Released: 2024-07-12T08:50:08Z_

### Patch Changes

- Updated dependencies [22e4ad8]
    - @sap-ux/ui5-config@0.23.1
    - @sap-ux/mockserver-config-writer@0.6.1

## 0.21.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/mockserver-config-writer@0.6.0
    - @sap-ux/ui5-config@0.23.0

## 0.20.5

_Released: 2024-06-26T13:30:18Z_

### Patch Changes

- Updated dependencies [1a1baeb0]
    - @sap-ux/ui5-config@0.22.10
    - @sap-ux/mockserver-config-writer@0.5.8

## 0.20.4

_Released: 2024-06-25T14:41:22Z_

### Patch Changes

- Updated dependencies [399d2ad8]
    - @sap-ux/ui5-config@0.22.9
    - @sap-ux/mockserver-config-writer@0.5.7

## 0.20.3

_Released: 2024-06-18T15:06:09Z_

### Patch Changes

- Updated dependencies [a140cf8b]
    - @sap-ux/ui5-config@0.22.8
    - @sap-ux/mockserver-config-writer@0.5.6

## 0.20.2

_Released: 2024-06-12T15:20:44Z_

### Patch Changes

- Updated dependencies [9188fe8b]
    - @sap-ux/ui5-config@0.22.7
    - @sap-ux/mockserver-config-writer@0.5.5

## 0.20.1

_Released: 2024-06-07T14:16:07Z_

### Patch Changes

- @sap-ux/ui5-config@0.22.6
- @sap-ux/mockserver-config-writer@0.5.4

## 0.20.0

_Released: 2024-06-06T14:34:12Z_

### Minor Changes

- e9a007af: Add support for CAP project services and annotations, based on the service type.

## 0.19.2

_Released: 2024-05-27T13:04:53Z_

### Patch Changes

- Updated dependencies [3684195d]
    - @sap-ux/ui5-config@0.22.5
    - @sap-ux/mockserver-config-writer@0.5.3

## 0.19.1

_Released: 2024-05-14T08:36:35Z_

### Patch Changes

- Updated dependencies [e3d2324c]
    - @sap-ux/ui5-config@0.22.4
    - @sap-ux/mockserver-config-writer@0.5.2

## 0.19.0

_Released: 2024-05-10T10:45:20Z_

### Minor Changes

- a47d0f5e: support for memfs within mockserver logic

## 0.18.0

_Released: 2024-05-10T09:32:39Z_

### Minor Changes

- 9ad3cf7a: conditionally writing synchronizationMode based on minUI5Version

## 0.17.2

_Released: 2024-05-07T14:01:29Z_

### Patch Changes

- 4e267684: chore - ejs upgrade

## 0.17.1

_Released: 2024-05-02T14:43:18Z_

### Patch Changes

- Updated dependencies [7f8105c7]
    - @sap-ux/ui5-config@0.22.3
    - @sap-ux/mockserver-config-writer@0.5.1

## 0.17.0

_Released: 2024-05-02T10:43:05Z_

### Minor Changes

- 8db928db: odata-service-writer now uses logic from mockserver-config-writer to generate mockserver

### Patch Changes

- Updated dependencies [8db928db]
    - @sap-ux/mockserver-config-writer@0.5.0

## 0.16.5

_Released: 2024-04-23T22:35:35Z_

### Patch Changes

- Updated dependencies [b7d95fb3]
    - @sap-ux/ui5-config@0.22.2

## 0.16.4

_Released: 2024-04-08T19:47:20Z_

### Patch Changes

- 1ec097f8: append annotations to ui5-mock.yaml during creation.

## 0.16.3

_Released: 2024-04-04T13:19:16Z_

### Patch Changes

- Updated dependencies [efa35ddd]
    - @sap-ux/ui5-config@0.22.1

## 0.16.2

_Released: 2024-03-21T16:21:01Z_

### Patch Changes

- Updated dependencies [ec509c40]
    - @sap-ux/ui5-config@0.22.0

## 0.16.1

_Released: 2024-02-27T22:07:50Z_

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json
- Updated dependencies [c15435b6]
    - @sap-ux/ui5-config@0.21.1

## 0.16.0

_Released: 2023-12-11T16:37:44Z_

### Minor Changes

- 446f290c: adds new service type

## 0.15.1

_Released: 2023-11-22T08:53:28Z_

### Patch Changes

- Updated dependencies [3f977f21]
    - @sap-ux/ui5-config@0.21.0

## 0.15.0

_Released: 2023-10-19T12:06:19Z_

### Minor Changes

- 1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

- Updated dependencies [1aa0fc43]
    - @sap-ux/ui5-config@0.20.0

## 0.14.36

_Released: 2023-10-18T13:59:49Z_

### Patch Changes

- cbcad88d: fix(deps): update dependencies [i18next]

## 0.14.35

_Released: 2023-10-17T08:28:48Z_

### Patch Changes

- @sap-ux/ui5-config@0.19.5

## 0.14.34

_Released: 2023-10-09T17:37:13Z_

### Patch Changes

- Updated dependencies [65010b09]
    - @sap-ux/ui5-config@0.19.4

## 0.14.33

_Released: 2023-09-20T13:13:51Z_

### Patch Changes

- 63c698a8: chore - fix publishing of modules missed in failed release build
- Updated dependencies [63c698a8]
    - @sap-ux/ui5-config@0.19.3

## 0.14.32

_Released: 2023-09-19T15:51:30Z_

### Patch Changes

- Updated dependencies [3137514f]
    - @sap-ux/ui5-config@0.19.2

## 0.14.31

_Released: 2023-09-19T14:02:55Z_

### Patch Changes

- 7c8a6946: fix(deps): update dependency semver to v7.5.4
- Updated dependencies [7c8a6946]
    - @sap-ux/ui5-config@0.19.1

## 0.14.30

_Released: 2023-09-08T12:21:47Z_

### Patch Changes

- f50523da: TechnicalName key might not be present in all scenarios

## 0.14.29

_Released: 2023-09-04T15:26:51Z_

### Patch Changes

- 98d40960: Technical Name key to be schema valid

## 0.14.28

_Released: 2023-09-01T07:49:28Z_

### Patch Changes

- 6e403f27: fix(deps): update dependency fast-xml-parser to v4.2.7

## 0.14.27

_Released: 2023-08-11T09:14:46Z_

### Patch Changes

- Updated dependencies [375ca861]
    - @sap-ux/ui5-config@0.19.0

## 0.14.26

_Released: 2023-06-27T14:58:54Z_

### Patch Changes

- 4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.
- Updated dependencies [4ba13898]
    - @sap-ux/ui5-config@0.18.2

## 0.14.25

_Released: 2023-06-26T15:34:40Z_

### Patch Changes

- d9355692: Upgrade vulnerable modules semver and fast-xml-parser
- Updated dependencies [d9355692]
    - @sap-ux/ui5-config@0.18.1

## 0.14.24

_Released: 2023-06-21T06:38:48Z_

### Patch Changes

- Updated dependencies [59863d93]
    - @sap-ux/ui5-config@0.18.0

## 0.14.23

_Released: 2023-06-12T06:59:29Z_

### Patch Changes

- 25911701: Fix for 'promises must be awaited' sonar issues
- Updated dependencies [25911701]
    - @sap-ux/ui5-config@0.17.1

## 0.14.22

_Released: 2023-06-09T06:11:17Z_

### Patch Changes

- e4f9748b: Upgrade vulnerable module fast-xml-parser

## 0.14.21

_Released: 2023-06-01T08:16:47Z_

### Patch Changes

- Updated dependencies [31207b95]
    - @sap-ux/ui5-config@0.17.0

## 0.14.20

_Released: 2023-04-26T14:34:08Z_

### Patch Changes

- 100248f3: fix(security): upgrade yaml
- Updated dependencies [100248f3]
    - @sap-ux/ui5-config@0.16.6

## 0.14.19

_Released: 2023-03-24T14:54:37Z_

### Patch Changes

- Updated dependencies [e7614e5]
    - @sap-ux/ui5-config@0.16.5

## 0.14.18

_Released: 2023-03-08T17:28:51Z_

### Patch Changes

- 35d1e15: tbi: Support @ui5/cli v3 in the generated projects

## 0.14.17

_Released: 2023-02-23T13:56:23Z_

### Patch Changes

- d350038: chore - TypeScript 4.9.4 upgrade
- Updated dependencies [d350038]
    - @sap-ux/ui5-config@0.16.4

## 0.14.16

_Released: 2023-02-17T07:56:11Z_

### Patch Changes

- @sap-ux/ui5-config@0.16.3

## 0.14.15

_Released: 2023-02-10T14:09:06Z_

### Patch Changes

- ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues
- Updated dependencies [ed04f6f]
    - @sap-ux/ui5-config@0.16.2

## 0.14.14

_Released: 2022-12-05T07:50:58Z_

### Patch Changes

- 070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability
- Updated dependencies [070d8dc]
    - @sap-ux/ui5-config@0.16.1

## 0.14.13

_Released: 2022-11-04T17:06:16Z_

### Patch Changes

- Updated dependencies [d760b69]
    - @sap-ux/ui5-config@0.16.0

## 0.14.12

_Released: 2022-10-21T07:04:47Z_

### Patch Changes

- @sap-ux/ui5-config@0.15.4

## 0.14.11

_Released: 2022-10-14T14:52:33Z_

### Patch Changes

- Updated dependencies [11c8f5d]
    - @sap-ux/ui5-config@0.15.3

## 0.14.10

_Released: 2022-10-11T14:06:32Z_

### Patch Changes

- Updated dependencies [5b487ef]
    - @sap-ux/ui5-config@0.15.2

## 0.14.9

_Released: 2022-10-04T15:02:00Z_

### Patch Changes

- @sap-ux/ui5-config@0.15.1

## 0.14.8

_Released: 2022-09-28T15:31:46Z_

### Patch Changes

- 0fc1499: Code quality improvements but no functionality change

## 0.14.7

_Released: 2022-09-14T16:06:49Z_

### Patch Changes

- Updated dependencies [83a7a1a]
    - @sap-ux/ui5-config@0.15.0

## 0.14.6

_Released: 2022-08-25T13:08:21Z_

### Patch Changes

- b6d0c67: Replaced used mockserver middleware
- Updated dependencies [b6d0c67]
    - @sap-ux/ui5-config@0.14.5

## 0.14.5

_Released: 2022-07-28T16:33:41Z_

### Patch Changes

- 6c22256: Fix: Prevent ejs.render() using oDataService props as options

## 0.14.4

_Released: 2022-07-27T08:51:11Z_

### Patch Changes

- 30afc5f: Override glob-parent due to ReDos vulnerability
- Updated dependencies [30afc5f]
    - @sap-ux/ui5-config@0.14.4

## 0.14.3

_Released: 2022-07-21T14:10:31Z_

### Patch Changes

- 09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies
- Updated dependencies [09c6eb5]
    - @sap-ux/ui5-config@0.14.3

## 0.14.2

_Released: 2022-07-20T14:42:08Z_

### Patch Changes

- Updated dependencies [7c4a4df]
    - @sap-ux/ui5-config@0.14.2

## 0.14.1

_Released: 2022-07-04T13:03:56Z_

### Patch Changes

- cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm
- Updated dependencies [cc1c406]
    - @sap-ux/ui5-config@0.14.1

## 0.14.0

_Released: 2022-06-15T14:52:21Z_

### Minor Changes

- c29bf99: Support for different project structures

## 0.13.0

_Released: 2022-06-13T09:53:27Z_

### Minor Changes

- 6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

### Patch Changes

- Updated dependencies [6f51973]
    - @sap-ux/ui5-config@0.14.0

## 0.12.2

_Released: 2022-05-19T14:38:34Z_

### Patch Changes

- c70fd4d: chore(open-ux-tools) pnpm 7 and node 18 support.
- Updated dependencies [c70fd4d]
    - @sap-ux/ui5-config@0.13.3

## 0.12.1

_Released: 2022-04-27T16:48:18Z_

### Patch Changes

- b5ab868: Changing versions of dependent modules to fix vulnerabilities
- Updated dependencies [b5ab868]
    - @sap-ux/ui5-config@0.13.2

## 0.12.0

_Released: 2022-04-26T13:41:08Z_

### Minor Changes

- cfca196: Feature: Adds support for Overview Page floorplan with odata v4 services. Fix: Use batch mode by default for v4 services.

## 0.11.6

_Released: 2022-04-01T07:00:29Z_

### Patch Changes

- Updated dependencies [5b5355c]
    - @sap-ux/ui5-config@0.13.1

## 0.11.5

_Released: 2022-03-31T13:41:16Z_

### Patch Changes

- 56409d0: Consolidated ui5 configuration types and enhanced API
- Updated dependencies [56409d0]
    - @sap-ux/ui5-config@0.13.0

## 0.11.4

_Released: 2022-03-29T13:57:37Z_

### Patch Changes

- c18fc5c: chore(open-ux-tools) update devDependencies and change dependabot config
- Updated dependencies [c18fc5c]
    - @sap-ux/ui5-config@0.12.3

## 0.11.3

_Released: 2022-03-24T07:10:57Z_

### Patch Changes

- 0837ac1: Add missing information to package.json and enforced use of higher version of minimist
- Updated dependencies [0837ac1]
    - @sap-ux/ui5-config@0.12.2

## 0.11.2

_Released: 2022-03-22T19:34:16Z_

### Patch Changes

- 7107fbc: chore - use import type in TS code.
- Updated dependencies [7107fbc]
    - @sap-ux/ui5-config@0.12.1

## 0.11.1

_Released: 2022-02-18T09:46:40Z_

### Patch Changes

- Updated dependencies [2b12f4f]
    - @sap-ux/ui5-config@0.12.0

## 0.11.0

_Released: 2022-02-02T17:47:04Z_

### Minor Changes

- d56ea73: Adds local annotations support

## 0.10.2

_Released: 2022-01-17T14:31:10Z_

### Patch Changes

- Updated dependencies [04e4f35]
    - @sap-ux/ui5-config@0.11.1

## 0.10.1

_Released: 2021-12-14T12:31:46Z_

### Patch Changes

- Updated dependencies [3783887]
    - @sap-ux/ui5-config@0.11.0

## 0.10.0

_Released: 2021-10-22T12:53:00Z_

### Minor Changes

- a9ef807: Reorganized how different middlewares are added to the ui5\*.yaml files

## 0.9.8

_Released: 2021-11-15T18:37:14Z_

### Patch Changes

- ccff534: Add inline schema in ui5\*.yaml files for yaml-language-server

## 0.9.7

_Released: 2021-11-03T14:20:52Z_

### Patch Changes

- b7ee596: port tool-suite change - add delay to appreload middleware
- Updated dependencies [b7ee596]
    - @sap-ux/ui5-config@0.10.3

## 0.9.6

_Released: 2021-11-01T18:18:45Z_

### Patch Changes

- 8de261b: Update npm dep and devDeps
- Updated dependencies [8de261b]
    - @sap-ux/ui5-config@0.10.2

## 0.9.5

_Released: 2021-10-28T12:12:48Z_

### Patch Changes

- a7670a0: Update ui5 verison handling for ui5.yaml. Allow setting view name in basic template, enhancements to yaml lib.
- Updated dependencies [a7670a0]
    - @sap-ux/ui5-config@0.10.1

## 0.9.4

_Released: 2021-10-27T16:42:33Z_

### Patch Changes

- d37c8bd: Added support for selecting a custom view name for Fiori freestyle - Basic template
- Updated dependencies [d37c8bd]
    - @sap-ux/ui5-config@0.10.0

## 0.9.3

_Released: 2021-10-22T16:07:57Z_

### Patch Changes

- 6888c5b: Add Readme for modules, add deploy script FF template, engines.node update to lts and small clean-up
- Updated dependencies [6888c5b]
    - @sap-ux/ui5-config@0.9.3

## 0.9.2

_Released: 2021-10-22T14:11:14Z_

### Patch Changes

- a16d4e7: fix versions in modules for patch instead of minor
- Updated dependencies [a16d4e7]
    - @sap-ux/ui5-config@0.9.2

## 0.10.0

_Released: 2021-10-22T12:53:00Z_

### Minor Changes

- cd119ea: Fix missing client in fiori proxy config #138

### Patch Changes

- Updated dependencies [cd119ea]
    - @sap-ux/ui5-config@0.10.0

## 0.9.1

### Patch Changes

- f6e1223: Dummy update to test changesets and pipeline
- Updated dependencies [f6e1223]
    - @sap-ux/ui5-config@0.9.1
