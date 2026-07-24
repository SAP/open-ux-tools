# @sap-ux/project-input-validator

## 1.0.13

### Patch Changes

#### Dependency Updates

- Upgrade i18next 25.10.10 → 26.3.6 [[28263d1](https://github.com/SAP/open-ux-tools/commit/28263d1cdcbb8599ee7b165c3482255b631604b8)]

## 1.0.12

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.7 → 2.1.8

## 1.0.11

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.6 → 2.1.7

## 1.0.10

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.5 → 2.1.6

## 1.0.9

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

#### Workspace Updates

- @sap-ux/project-access 2.1.4 → 2.1.5

## 1.0.8

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.3 → 2.1.4

## 1.0.7

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.2 → 2.1.3

## 1.0.6

_Released: 2026-06-10T09:57:42Z_

### Patch Changes

- @sap-ux/project-access@2.1.2

## 1.0.5

_Released: 2026-06-04T13:54:21Z_

### Patch Changes

- Updated dependencies [fff7490]
    - @sap-ux/project-access@2.1.1

## 1.0.4

_Released: 2026-06-04T10:19:37Z_

### Patch Changes

- Updated dependencies [b326a9a]
    - @sap-ux/project-access@2.1.0

## 1.0.3

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/project-access@2.0.3

## 1.0.2

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- @sap-ux/project-access@2.0.2

## 1.0.1

_Released: 2026-06-01T15:15:26Z_

### Patch Changes

- Updated dependencies [aed799d]
    - @sap-ux/project-access@2.0.1

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
    - @sap-ux/project-access@2.0.0

## 0.7.2

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- @sap-ux/project-access@1.38.1

## 0.7.1

_Released: 2026-05-19T15:16:46Z_

### Patch Changes

- Updated dependencies [63e6846]
    - @sap-ux/project-access@1.38.0

## 0.7.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/project-access@1.37.0

## 0.6.84

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/project-access@1.36.5

## 0.6.83

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- Updated dependencies [21abda3]
    - @sap-ux/project-access@1.36.4

## 0.6.82

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- @sap-ux/project-access@1.36.3

## 0.6.81

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- @sap-ux/project-access@1.36.2

## 0.6.80

_Released: 2026-04-30T13:10:33Z_

### Patch Changes

- a4b90ca: fix: Execute validation for multiple segments in project name for internal Cloud Foundry adaptation projects

## 0.6.79

_Released: 2026-04-29T15:24:37Z_

### Patch Changes

- Updated dependencies [3945459]
    - @sap-ux/project-access@1.36.1

## 0.6.78

_Released: 2026-04-27T19:47:46Z_

### Patch Changes

- Updated dependencies [1d60871]
    - @sap-ux/project-access@1.36.0

## 0.6.77

_Released: 2026-04-23T12:54:21Z_

### Patch Changes

- Updated dependencies [03d3ea1]
    - @sap-ux/project-access@1.35.21

## 0.6.76

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- @sap-ux/project-access@1.35.20

## 0.6.75

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- @sap-ux/project-access@1.35.19

## 0.6.74

_Released: 2026-04-01T11:49:37Z_

### Patch Changes

- Updated dependencies [3291f6c]
    - @sap-ux/project-access@1.35.18

## 0.6.73

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(project-input-validator): upgrade shared devDependencies (jest 30, i18next 25)
    - @sap-ux/project-access@1.35.17

## 0.6.72

_Released: 2026-03-26T20:06:10Z_

### Patch Changes

- Updated dependencies [b66e827]
    - @sap-ux/project-access@1.35.17

## 0.6.71

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: chore(project-input-validator): upgrade i18next 25.8.18 → 25.8.20
- Updated dependencies [a41533f]
    - @sap-ux/project-access@1.35.16

## 0.6.70

_Released: 2026-03-25T12:56:41Z_

### Patch Changes

- Updated dependencies [f384ace]
    - @sap-ux/project-access@1.35.15

## 0.6.69

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- @sap-ux/project-access@1.35.14

## 0.6.68

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18

## 0.6.67

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- Updated dependencies [d834713]
    - @sap-ux/project-access@1.35.13

## 0.6.66

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- Updated dependencies [7c06ef0]
    - @sap-ux/project-access@1.35.12

## 0.6.65

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- @sap-ux/project-access@1.35.11

## 0.6.64

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/project-access@1.35.10

## 0.6.63

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- 6c993f3: fix: turn off i18next support notice

## 0.6.62

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- b96de78: fix(deps): update dependency validate-npm-package-name to v7
    - @sap-ux/project-access@1.35.9

## 0.6.61

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- Updated dependencies [0ecc5f1]
    - @sap-ux/project-access@1.35.8

## 0.6.60

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.7

## 0.6.59

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12

## 0.6.58

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- Updated dependencies [bb310dc]
- Updated dependencies [e5bc3ca]
    - @sap-ux/project-access@1.35.6

## 0.6.57

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/project-access@1.35.5

## 0.6.56

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- @sap-ux/project-access@1.35.4

## 0.6.55

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- Updated dependencies [346f09c]
    - @sap-ux/project-access@1.35.3

## 0.6.54

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- Updated dependencies [d2b772d]
    - @sap-ux/project-access@1.35.2

## 0.6.53

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- @sap-ux/project-access@1.35.1

## 0.6.52

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/project-access@1.35.0

## 0.6.51

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- Updated dependencies [467e6aa]
    - @sap-ux/project-access@1.34.7

## 0.6.50

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- Updated dependencies [ad321ab]
    - @sap-ux/project-access@1.34.6

## 0.6.49

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [89175fe]
    - @sap-ux/project-access@1.34.5

## 0.6.48

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- @sap-ux/project-access@1.34.4

## 0.6.47

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- Updated dependencies [6d71400]
    - @sap-ux/project-access@1.34.3

## 0.6.46

_Released: 2026-01-23T22:30:10Z_

### Patch Changes

- d11943d: fix(deps): update dependency i18next to v25.8.0

## 0.6.45

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- Updated dependencies [be67fc4]
    - @sap-ux/project-access@1.34.2

## 0.6.44

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1

## 0.6.43

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0

## 0.6.42

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- Updated dependencies [f13d1c2]
    - @sap-ux/project-access@1.33.2

## 0.6.41

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/project-access@1.33.1

## 0.6.40

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/project-access@1.33.0

## 0.6.39

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/project-access@1.32.17

## 0.6.38

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/project-access@1.32.16

## 0.6.37

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- Updated dependencies [7217d7d]
    - @sap-ux/project-access@1.32.15

## 0.6.36

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- Updated dependencies [4bdced0]
    - @sap-ux/project-access@1.32.14

## 0.6.35

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- Updated dependencies [985223a]
    - @sap-ux/project-access@1.32.13

## 0.6.34

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- Updated dependencies [45fe64e]
    - @sap-ux/project-access@1.32.12

## 0.6.33

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- Updated dependencies [07725fe]
    - @sap-ux/project-access@1.32.11

## 0.6.32

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- @sap-ux/project-access@1.32.10

## 0.6.31

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- Updated dependencies [7c09c8e]
- Updated dependencies [1c13c9c]
    - @sap-ux/project-access@1.32.9

## 0.6.30

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/project-access@1.32.8

## 0.6.29

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- Updated dependencies [d895232]
    - @sap-ux/project-access@1.32.7

## 0.6.28

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- Updated dependencies [ea0a942]
    - @sap-ux/project-access@1.32.6

## 0.6.27

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- Updated dependencies [c5d7915]
    - @sap-ux/project-access@1.32.5

## 0.6.26

_Released: 2025-10-13T14:40:48Z_

### Patch Changes

- 247a5a9: feat: Add ADP Generator Cloud Foundry prompting code

## 0.6.25

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- @sap-ux/project-access@1.32.4

## 0.6.24

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/project-access@1.32.3

## 0.6.23

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- @sap-ux/project-access@1.32.2

## 0.6.22

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- @sap-ux/project-access@1.32.1

## 0.6.21

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- Updated dependencies [f9b4afe]
    - @sap-ux/project-access@1.32.0

## 0.6.20

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- Updated dependencies [c385a76]
    - @sap-ux/project-access@1.31.0

## 0.6.19

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- @sap-ux/project-access@1.30.14

## 0.6.18

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- @sap-ux/project-access@1.30.13

## 0.6.17

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- @sap-ux/project-access@1.30.12

## 0.6.16

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/project-access@1.30.11

## 0.6.15

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- @sap-ux/project-access@1.30.10

## 0.6.14

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.9

## 0.6.13

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- Updated dependencies [4e0bd83]
    - @sap-ux/project-access@1.30.8

## 0.6.12

_Released: 2025-07-11T15:10:00Z_

### Patch Changes

- a1f282f: moves validate fiori app folder to before default is determined

## 0.6.11

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- Updated dependencies [58cdce6]
    - @sap-ux/project-access@1.30.7

## 0.6.10

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- 69f62ec: i18next upgrade to 25.3.0

## 0.6.9

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- @sap-ux/project-access@1.30.6

## 0.6.8

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- Updated dependencies [7a4543e]
    - @sap-ux/project-access@1.30.5

## 0.6.7

_Released: 2025-06-30T08:46:50Z_

### Patch Changes

- b9675bb: Improve Fiori Tools UI Texts

## 0.6.6

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- Updated dependencies [f75b89d]
    - @sap-ux/project-access@1.30.4

## 0.6.5

_Released: 2025-06-25T10:51:12Z_

### Patch Changes

- 83109eb: feat(generator-adp): Various bug fixes and improvements for ADP generator

## 0.6.4

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.3

## 0.6.3

_Released: 2025-06-17T13:40:19Z_

### Patch Changes

- c9f79c1: Check long Windows paths during project generation and deployment config generation.

## 0.6.2

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- @sap-ux/project-access@1.30.2

## 0.6.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- @sap-ux/project-access@1.30.1

## 0.6.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/project-access@1.30.0

## 0.5.6

_Released: 2025-05-08T10:12:31Z_

### Patch Changes

- 6cb23c8: feat: Add the Extension Project functionality and internal support information

## 0.5.5

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- Updated dependencies [ea0e2c0]
    - @sap-ux/project-access@1.29.22

## 0.5.4

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- @sap-ux/project-access@1.29.21

## 0.5.3

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- Updated dependencies [294bbe3]
    - @sap-ux/project-access@1.29.20

## 0.5.2

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- @sap-ux/project-access@1.29.19

## 0.5.1

_Released: 2025-04-17T09:03:34Z_

### Patch Changes

- 2db2c33: feat(generator-adp): Add Project Attributes page

## 0.5.0

_Released: 2025-03-26T09:06:26Z_

### Minor Changes

- ab81490: Rename validateTargetFolderForFioriApp to validateFioriAppTargetFolder for clarity and improve ts docs

## 0.4.0

_Released: 2025-03-22T09:43:02Z_

### Minor Changes

- c69752b: Move validate target project path logic from ui5-application-inquirer to project-input-validator for improved reuse

## 0.3.4

_Released: 2024-11-27T12:48:07Z_

### Patch Changes

- cfdd442: feat: FLP Configuration inquirer

## 0.3.3

_Released: 2024-08-07T14:42:33Z_

### Patch Changes

- 593ad0f: Adp-tooling prompting validations

## 0.3.2

_Released: 2024-08-01T10:59:20Z_

### Patch Changes

- 7ae8207: Add Adaptation Project's OData Service and SAPUI5 Model prompting

## 0.3.1

_Released: 2024-07-18T11:50:01Z_

### Patch Changes

- 108336f: Adds prompts for abap on premise systems to odata-service-inquirer

## 0.3.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.2.3

_Released: 2024-03-04T14:57:24Z_

### Patch Changes

- 1affcec6: New modules, first release

## 0.2.2

_Released: 2024-02-27T22:07:50Z_

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json

## 0.2.1

_Released: 2023-11-06T16:12:03Z_

### Patch Changes

- d0e46a5c: - Fixed test folder path in README
    - Corrected a typo in i18n key
    - Added indentation for displaying multiple app name validation issues

## 0.2.0

_Released: 2023-10-27T15:54:15Z_

### Minor Changes

- d31cfeff: Adds UI5 library prompt validators and tests

## 0.1.2

_Released: 2023-10-19T10:45:58Z_

### Patch Changes

- 966b396b: - Fixed a typo in validation message
    - Fixed a bug in transport number validation and updated unit tests

## 0.1.1

_Released: 2023-10-18T13:59:49Z_

### Patch Changes

- cbcad88d: fix(deps): update dependencies [i18next]

## 0.1.0

_Released: 2023-10-16T17:12:59Z_

### Minor Changes

- d7492b53: Initial release of reusable modules for validating the input constraints required by Fiori projects.
  This library provides a reusable validation utilities to support validations required in tools that support
  Fiori project generation, deployment configration, etc. The initial set of validation functions supports
  validation used in Fiori project deployment configurations.
