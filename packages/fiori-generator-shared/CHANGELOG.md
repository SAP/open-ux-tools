# @sap-ux/fiori-generator-shared

## 1.0.18

### Patch Changes

#### Workspace Updates

- @sap-ux/axios-extension 2.0.5 → 2.0.6
- @sap-ux/btp-utils 2.0.4 → 2.0.5
- @sap-ux/telemetry 1.0.15 → 1.0.16
- @sap-ux/project-access 2.1.5 → 2.1.6

## 1.0.17

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

#### Workspace Updates

- @sap-ux/axios-extension 2.0.4 → 2.0.5
- @sap-ux/project-access 2.1.4 → 2.1.5
- @sap-ux/btp-utils 2.0.3 → 2.0.4
- @sap-ux/telemetry 1.0.14 → 1.0.15

## 1.0.16

### Patch Changes

#### Workspace Updates

- @sap-ux/telemetry 1.0.13 → 1.0.14

## 1.0.15

### Patch Changes

#### Workspace Updates

- @sap-ux/telemetry 1.0.12 → 1.0.13

## 1.0.14

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.3 → 2.1.4
- @sap-ux/axios-extension 2.0.4 → 2.0.4
- @sap-ux/telemetry 1.0.11 → 1.0.12

## 1.0.13

### Patch Changes

#### Workspace Updates

- @sap-ux/axios-extension 2.0.3 → 2.0.4
- @sap-ux/btp-utils 2.0.2 → 2.0.3
- @sap-ux/telemetry 1.0.10 → 1.0.11

## 1.0.12

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.2 → 2.1.3
- @sap-ux/axios-extension 2.0.3 → 2.0.3
- @sap-ux/telemetry 1.0.9 → 1.0.10

## 1.0.11

_Released: 2026-06-12T06:53:23Z_

### Patch Changes

- @sap-ux/axios-extension@2.0.3

## 1.0.10

_Released: 2026-06-11T10:54:17Z_

### Patch Changes

- Updated dependencies [7bfa518]
    - @sap-ux/telemetry@1.0.9

## 1.0.9

_Released: 2026-06-10T09:57:42Z_

### Patch Changes

- @sap-ux/project-access@2.1.2
- @sap-ux/telemetry@1.0.8
- @sap-ux/axios-extension@2.0.2

## 1.0.8

_Released: 2026-06-09T14:35:01Z_

### Patch Changes

- Updated dependencies [0fa8305]
    - @sap-ux/btp-utils@2.0.2
    - @sap-ux/axios-extension@2.0.2
    - @sap-ux/telemetry@1.0.7

## 1.0.7

_Released: 2026-06-09T13:18:16Z_

### Patch Changes

- a328e14: refactor: move restoreServiceProviderLoggers to @sap-ux/fiori-generator-shared

## 1.0.6

_Released: 2026-06-04T13:54:21Z_

### Patch Changes

- Updated dependencies [fff7490]
    - @sap-ux/project-access@2.1.1
    - @sap-ux/telemetry@1.0.6

## 1.0.5

_Released: 2026-06-04T10:19:37Z_

### Patch Changes

- Updated dependencies [b326a9a]
    - @sap-ux/project-access@2.1.0
    - @sap-ux/telemetry@1.0.5

## 1.0.4

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/project-access@2.0.3
    - @sap-ux/btp-utils@2.0.1
    - @sap-ux/telemetry@1.0.4

## 1.0.3

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- @sap-ux/project-access@2.0.2
- @sap-ux/telemetry@1.0.3

## 1.0.2

_Released: 2026-06-02T11:35:17Z_

### Patch Changes

- @sap-ux/telemetry@1.0.2

## 1.0.1

_Released: 2026-06-01T15:15:26Z_

### Patch Changes

- Updated dependencies [aed799d]
    - @sap-ux/project-access@2.0.1
    - @sap-ux/telemetry@1.0.1

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
    - @sap-ux/btp-utils@2.0.0
    - @sap-ux/telemetry@1.0.0

## 0.15.6

_Released: 2026-05-27T11:39:21Z_

### Patch Changes

- @sap-ux/telemetry@0.7.5

## 0.15.5

_Released: 2026-05-27T10:42:47Z_

### Patch Changes

- @sap-ux/telemetry@0.7.4

## 0.15.4

_Released: 2026-05-26T16:40:21Z_

### Patch Changes

- Updated dependencies [01b70ca]
    - @sap-ux/btp-utils@1.2.1
    - @sap-ux/telemetry@0.7.3

## 0.15.3

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- @sap-ux/project-access@1.38.1
- @sap-ux/telemetry@0.7.2

## 0.15.2

_Released: 2026-05-19T15:16:46Z_

### Patch Changes

- Updated dependencies [63e6846]
    - @sap-ux/project-access@1.38.0
    - @sap-ux/telemetry@0.7.1

## 0.15.1

_Released: 2026-05-15T13:12:06Z_

### Patch Changes

- 2c76f8f: refactor(fiori-generator-shared): remove dead ExternalServiceConfig type and externalServices field from AppConfig

## 0.15.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/btp-utils@1.2.0
    - @sap-ux/project-access@1.37.0
    - @sap-ux/telemetry@0.7.0

## 0.14.2

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/btp-utils@1.1.16
    - @sap-ux/project-access@1.36.5
    - @sap-ux/telemetry@0.6.106

## 0.14.1

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- Updated dependencies [21abda3]
    - @sap-ux/project-access@1.36.4
    - @sap-ux/telemetry@0.6.105

## 0.14.0

_Released: 2026-05-12T18:00:39Z_

### Minor Changes

- 9360ea5: feat(fiori-app-sub-generator): support virtual endpoints in headless generator, defaulting to true

    Added `enableVirtualEndpoints` option to `AppConfig` in `fiori-generator-shared`. When used in the headless generator, this defaults to `true`, causing virtual preview endpoints to be used instead of generating `flpSandbox.html` and related test files.

## 0.13.105

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- 678a08e: chore: upgrade runtime dependencies (@sap/cf-tools 3.3.0 → 3.3.1, @vscode-logging/logger 2.0.8 → 2.0.9)
- Updated dependencies [678a08e]
    - @sap-ux/btp-utils@1.1.15
    - @sap-ux/telemetry@0.6.104
    - @sap-ux/project-access@1.36.3

## 0.13.104

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- Updated dependencies [c160401]
    - @sap-ux/telemetry@0.6.103
    - @sap-ux/project-access@1.36.2

## 0.13.103

_Released: 2026-04-29T15:24:37Z_

### Patch Changes

- Updated dependencies [3945459]
    - @sap-ux/project-access@1.36.1
    - @sap-ux/telemetry@0.6.102

## 0.13.102

_Released: 2026-04-27T19:47:46Z_

### Patch Changes

- Updated dependencies [1d60871]
    - @sap-ux/project-access@1.36.0
    - @sap-ux/telemetry@0.6.101

## 0.13.101

_Released: 2026-04-23T12:54:21Z_

### Patch Changes

- Updated dependencies [03d3ea1]
    - @sap-ux/project-access@1.35.21
    - @sap-ux/telemetry@0.6.100

## 0.13.100

_Released: 2026-04-23T06:48:55Z_

### Patch Changes

- 237371b: fix(axios-extension): export EntitySetData type
  feat(fiori-generator-shared): add ExternalServiceConfig headless type supporting metadata and entityData as inline values or file paths
  feat(fiori-app-sub-generator): resolve external service metadata and entityData file paths in headless generator before passing to writer

## 0.13.99

_Released: 2026-04-15T11:53:17Z_

### Patch Changes

- Updated dependencies [67d1f8b]
    - @sap-ux/telemetry@0.6.99

## 0.13.98

_Released: 2026-04-14T20:26:28Z_

### Patch Changes

- Updated dependencies [ee68603]
    - @sap-ux/btp-utils@1.1.14
    - @sap-ux/telemetry@0.6.98

## 0.13.97

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- Updated dependencies [cc4450c]
    - @sap-ux/btp-utils@1.1.13
    - @sap-ux/telemetry@0.6.97
    - @sap-ux/project-access@1.35.20

## 0.13.96

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- @sap-ux/btp-utils@1.1.12
- @sap-ux/project-access@1.35.19
- @sap-ux/telemetry@0.6.96

## 0.13.95

_Released: 2026-04-01T11:49:37Z_

### Patch Changes

- Updated dependencies [3291f6c]
    - @sap-ux/project-access@1.35.18
    - @sap-ux/telemetry@0.6.95

## 0.13.94

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(fiori-generator-shared): upgrade shared devDependencies (jest 30, i18next 25, @types/yeoman-generator 5.2.14)
- Updated dependencies [c53a4ba]
    - @sap-ux/telemetry@0.6.94
    - @sap-ux/btp-utils@1.1.12
    - @sap-ux/project-access@1.35.17

## 0.13.93

_Released: 2026-03-27T15:37:24Z_

### Patch Changes

- Updated dependencies [e92850e]
    - @sap-ux/telemetry@0.6.93

## 0.13.92

_Released: 2026-03-27T11:58:49Z_

### Patch Changes

- Updated dependencies [2e17a6b]
    - @sap-ux/btp-utils@1.1.12
    - @sap-ux/telemetry@0.6.92

## 0.13.91

_Released: 2026-03-26T20:06:10Z_

### Patch Changes

- Updated dependencies [b66e827]
    - @sap-ux/project-access@1.35.17
    - @sap-ux/telemetry@0.6.91

## 0.13.90

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: chore(fiori-generator-shared): upgrade runtime dependencies (i18next 25.8.20, logform 2.7.0)
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/btp-utils@1.1.11
    - @sap-ux/project-access@1.35.16
    - @sap-ux/telemetry@0.6.90

## 0.13.89

_Released: 2026-03-25T12:56:41Z_

### Patch Changes

- Updated dependencies [f384ace]
    - @sap-ux/project-access@1.35.15
    - @sap-ux/telemetry@0.6.89

## 0.13.88

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- @sap-ux/project-access@1.35.14
- @sap-ux/telemetry@0.6.88

## 0.13.87

_Released: 2026-03-18T16:51:44Z_

### Patch Changes

- ae6758f: fix: update ESLint plugin URL in README template to @sap-ux/eslint-plugin-fiori-tools

## 0.13.86

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18
- Updated dependencies [5d452e5]
    - @sap-ux/btp-utils@1.1.10
    - @sap-ux/telemetry@0.6.87

## 0.13.85

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- Updated dependencies [d834713]
    - @sap-ux/project-access@1.35.13
    - @sap-ux/telemetry@0.6.86

## 0.13.84

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- Updated dependencies [2917c4c]
- Updated dependencies [7c06ef0]
- Updated dependencies [fdd57de]
    - @sap-ux/telemetry@0.6.85
    - @sap-ux/project-access@1.35.12

## 0.13.83

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- @sap-ux/btp-utils@1.1.9
- @sap-ux/project-access@1.35.11
- @sap-ux/telemetry@0.6.84

## 0.13.82

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- @sap-ux/project-access@1.35.11
- @sap-ux/telemetry@0.6.83

## 0.13.81

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/project-access@1.35.10
    - @sap-ux/telemetry@0.6.82

## 0.13.80

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- 6c993f3: fix: turn off i18next support notice
    - @sap-ux/telemetry@0.6.81

## 0.13.79

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.9
- @sap-ux/telemetry@0.6.80

## 0.13.78

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- Updated dependencies [0ecc5f1]
    - @sap-ux/project-access@1.35.8
    - @sap-ux/telemetry@0.6.79

## 0.13.77

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.7
- @sap-ux/telemetry@0.6.78

## 0.13.76

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12
    - @sap-ux/telemetry@0.6.77

## 0.13.75

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- c94cc8e: fix(deps): update dependency @vscode-logging/logger to v2.0.8
- bb310dc: fix(deps): update dependency semver to v7.7.4
- Updated dependencies [bb310dc]
- Updated dependencies [e5bc3ca]
    - @sap-ux/project-access@1.35.6
    - @sap-ux/telemetry@0.6.76

## 0.13.74

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/project-access@1.35.5
    - @sap-ux/telemetry@0.6.75

## 0.13.73

_Released: 2026-02-16T18:48:13Z_

### Patch Changes

- Updated dependencies [dd2131c]
    - @sap-ux/btp-utils@1.1.9
    - @sap-ux/telemetry@0.6.74

## 0.13.72

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- @sap-ux/project-access@1.35.4
- @sap-ux/telemetry@0.6.73

## 0.13.71

_Released: 2026-02-13T16:18:58Z_

### Patch Changes

- @sap-ux/telemetry@0.6.72

## 0.13.70

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- Updated dependencies [346f09c]
    - @sap-ux/project-access@1.35.3
    - @sap-ux/telemetry@0.6.71

## 0.13.69

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- Updated dependencies [d2b772d]
    - @sap-ux/project-access@1.35.2
    - @sap-ux/telemetry@0.6.70

## 0.13.68

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/btp-utils@1.1.8
    - @sap-ux/telemetry@0.6.69
    - @sap-ux/project-access@1.35.1

## 0.13.67

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/project-access@1.35.0
    - @sap-ux/telemetry@0.6.68

## 0.13.66

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- Updated dependencies [467e6aa]
    - @sap-ux/project-access@1.34.7
    - @sap-ux/telemetry@0.6.67

## 0.13.65

_Released: 2026-02-05T13:53:56Z_

### Patch Changes

- @sap-ux/telemetry@0.6.66

## 0.13.64

_Released: 2026-02-05T11:39:04Z_

### Patch Changes

- @sap-ux/telemetry@0.6.65

## 0.13.63

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- ad321ab: fix(deps): update dependency semver to v7.7.3
- Updated dependencies [ad321ab]
    - @sap-ux/project-access@1.34.6
    - @sap-ux/telemetry@0.6.64

## 0.13.62

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- Updated dependencies [9f11dd2]
    - @sap-ux/btp-utils@1.1.7
    - @sap-ux/telemetry@0.6.63

## 0.13.61

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [89175fe]
    - @sap-ux/project-access@1.34.5
    - @sap-ux/telemetry@0.6.62

## 0.13.60

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- @sap-ux/btp-utils@1.1.6
- @sap-ux/project-access@1.34.4
- @sap-ux/telemetry@0.6.61

## 0.13.59

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- Updated dependencies [6d71400]
    - @sap-ux/project-access@1.34.3
    - @sap-ux/telemetry@0.6.60

## 0.13.58

_Released: 2026-01-28T00:19:05Z_

### Patch Changes

- @sap-ux/telemetry@0.6.59

## 0.13.57

_Released: 2026-01-23T23:57:30Z_

### Patch Changes

- Updated dependencies [c707af1]
    - @sap-ux/telemetry@0.6.58

## 0.13.56

_Released: 2026-01-23T22:30:10Z_

### Patch Changes

- d11943d: fix(deps): update dependency i18next to v25.8.0

## 0.13.55

_Released: 2026-01-23T12:49:27Z_

### Patch Changes

- @sap-ux/telemetry@0.6.57

## 0.13.54

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- Updated dependencies [be67fc4]
    - @sap-ux/project-access@1.34.2
    - @sap-ux/telemetry@0.6.56

## 0.13.53

_Released: 2026-01-16T12:32:24Z_

### Patch Changes

- @sap-ux/telemetry@0.6.55

## 0.13.52

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1
    - @sap-ux/telemetry@0.6.54

## 0.13.51

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0
    - @sap-ux/telemetry@0.6.53

## 0.13.50

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- Updated dependencies [f13d1c2]
    - @sap-ux/project-access@1.33.2
    - @sap-ux/telemetry@0.6.52

## 0.13.49

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/project-access@1.33.1
    - @sap-ux/telemetry@0.6.51

## 0.13.48

_Released: 2026-01-06T14:37:31Z_

### Patch Changes

- 03598eb: Remove codeAssist support during project generation prompts and writing.

## 0.13.47

_Released: 2026-01-05T14:16:22Z_

### Patch Changes

- 62bb798: set conflicter option

## 0.13.46

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/project-access@1.33.0
    - @sap-ux/btp-utils@1.1.6
    - @sap-ux/telemetry@0.6.50

## 0.13.45

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- Updated dependencies [a9471d0]
    - @sap-ux/project-access@1.32.17
    - @sap-ux/telemetry@0.6.49
    - @sap-ux/btp-utils@1.1.6

## 0.13.44

_Released: 2025-12-16T11:43:52Z_

### Patch Changes

- @sap-ux/telemetry@0.6.48

## 0.13.43

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/project-access@1.32.16
    - @sap-ux/btp-utils@1.1.6
    - @sap-ux/telemetry@0.6.47

## 0.13.42

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- Updated dependencies [7217d7d]
    - @sap-ux/project-access@1.32.15
    - @sap-ux/telemetry@0.6.46

## 0.13.41

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- Updated dependencies [4bdced0]
    - @sap-ux/project-access@1.32.14
    - @sap-ux/telemetry@0.6.45

## 0.13.40

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- Updated dependencies [985223a]
    - @sap-ux/project-access@1.32.13
    - @sap-ux/telemetry@0.6.44

## 0.13.39

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- Updated dependencies [037a430]
    - @sap-ux/telemetry@0.6.43

## 0.13.38

_Released: 2025-12-05T12:18:49Z_

### Patch Changes

- d202c17: Remove Code Assist from README file.

## 0.13.37

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- Updated dependencies [45fe64e]
    - @sap-ux/project-access@1.32.12
    - @sap-ux/telemetry@0.6.42

## 0.13.36

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- Updated dependencies [07725fe]
    - @sap-ux/project-access@1.32.11
    - @sap-ux/telemetry@0.6.41

## 0.13.35

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- @sap-ux/project-access@1.32.10
- @sap-ux/telemetry@0.6.40

## 0.13.34

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- Updated dependencies [7c09c8e]
- Updated dependencies [1c13c9c]
    - @sap-ux/project-access@1.32.9
    - @sap-ux/telemetry@0.6.39

## 0.13.33

_Released: 2025-11-06T15:12:51Z_

### Patch Changes

- Updated dependencies [56235f8]
    - @sap-ux/telemetry@0.6.38

## 0.13.32

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/project-access@1.32.8
    - @sap-ux/btp-utils@1.1.5
    - @sap-ux/telemetry@0.6.37

## 0.13.31

_Released: 2025-10-31T13:35:34Z_

### Patch Changes

- @sap-ux/telemetry@0.6.36

## 0.13.30

_Released: 2025-10-29T17:02:38Z_

### Patch Changes

- @sap-ux/telemetry@0.6.35

## 0.13.29

_Released: 2025-10-29T11:04:17Z_

### Patch Changes

- @sap-ux/telemetry@0.6.34

## 0.13.28

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- Updated dependencies [d895232]
    - @sap-ux/project-access@1.32.7
    - @sap-ux/telemetry@0.6.33

## 0.13.27

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- Updated dependencies [ea0a942]
    - @sap-ux/project-access@1.32.6
    - @sap-ux/telemetry@0.6.32

## 0.13.26

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- Updated dependencies [c5d7915]
    - @sap-ux/project-access@1.32.5
    - @sap-ux/telemetry@0.6.31

## 0.13.25

_Released: 2025-10-17T11:37:38Z_

### Patch Changes

- @sap-ux/telemetry@0.6.30

## 0.13.24

_Released: 2025-10-17T09:45:11Z_

### Patch Changes

- d4dabbd: Fix for label for Abap cloud returned as empty string

## 0.13.23

_Released: 2025-10-14T13:22:30Z_

### Patch Changes

- bacaf93: Connections to Abap cloud will always use re-entrance tickets instead of UAA/OAuth2
- Updated dependencies [bacaf93]
    - @sap-ux/telemetry@0.6.29

## 0.13.22

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- @sap-ux/project-access@1.32.4
- @sap-ux/telemetry@0.6.28

## 0.13.21

_Released: 2025-10-07T13:15:25Z_

### Patch Changes

- @sap-ux/telemetry@0.6.27

## 0.13.20

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/project-access@1.32.3
    - @sap-ux/btp-utils@1.1.4
    - @sap-ux/telemetry@0.6.26

## 0.13.19

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- @sap-ux/project-access@1.32.2
- @sap-ux/telemetry@0.6.25

## 0.13.18

_Released: 2025-09-23T20:14:56Z_

### Patch Changes

- Updated dependencies [998954b]
    - @sap-ux/btp-utils@1.1.3
    - @sap-ux/telemetry@0.6.24

## 0.13.17

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- Updated dependencies [9872384]
    - @sap-ux/btp-utils@1.1.2
    - @sap-ux/telemetry@0.6.23
    - @sap-ux/project-access@1.32.1

## 0.13.16

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- Updated dependencies [f9b4afe]
    - @sap-ux/project-access@1.32.0
    - @sap-ux/telemetry@0.6.22

## 0.13.15

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- Updated dependencies [c385a76]
    - @sap-ux/project-access@1.31.0
    - @sap-ux/telemetry@0.6.21

## 0.13.14

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- @sap-ux/project-access@1.30.14
- @sap-ux/telemetry@0.6.20

## 0.13.13

_Released: 2025-09-11T11:04:24Z_

### Patch Changes

- 3c094af: updated variant preview to use dynamic anchor if not using virtual endpoints

## 0.13.12

_Released: 2025-09-01T12:06:20Z_

### Patch Changes

- @sap-ux/telemetry@0.6.19

## 0.13.11

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- Updated dependencies [4cfebaf]
    - @sap-ux/btp-utils@1.1.1
    - @sap-ux/telemetry@0.6.18
    - @sap-ux/project-access@1.30.13

## 0.13.10

_Released: 2025-08-21T14:27:46Z_

### Patch Changes

- @sap-ux/telemetry@0.6.17

## 0.13.9

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- @sap-ux/project-access@1.30.12
- @sap-ux/telemetry@0.6.16

## 0.13.8

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/project-access@1.30.11
- @sap-ux/telemetry@0.6.15

## 0.13.7

_Released: 2025-08-07T06:27:29Z_

### Patch Changes

- Updated dependencies [18a5ee2]
    - @sap-ux/telemetry@0.6.14

## 0.13.6

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- @sap-ux/project-access@1.30.10
- @sap-ux/telemetry@0.6.13

## 0.13.5

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.9
- @sap-ux/telemetry@0.6.12

## 0.13.4

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- Updated dependencies [4e0bd83]
    - @sap-ux/project-access@1.30.8
    - @sap-ux/telemetry@0.6.11

## 0.13.3

_Released: 2025-07-22T13:05:35Z_

### Patch Changes

- ca44076: move headless AppConfig type and associated types to fiori gen shared module

## 0.13.2

_Released: 2025-07-10T11:49:34Z_

### Patch Changes

- d75db00: Append leading forward slash

## 0.13.1

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- Updated dependencies [58cdce6]
    - @sap-ux/project-access@1.30.7
    - @sap-ux/telemetry@0.6.10

## 0.13.0

_Released: 2025-07-07T08:44:59Z_

### Minor Changes

- 58abe82: Add optional isActive parameter to isExtensionInstalled function & add support for checking command registration

## 0.12.16

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- 69f62ec: i18next upgrade to 25.3.0
    - @sap-ux/telemetry@0.6.9

## 0.12.15

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- @sap-ux/project-access@1.30.6
- @sap-ux/telemetry@0.6.8

## 0.12.14

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- Updated dependencies [7a4543e]
    - @sap-ux/project-access@1.30.5
    - @sap-ux/telemetry@0.6.7

## 0.12.13

_Released: 2025-06-30T08:46:50Z_

### Patch Changes

- b9675bb: Improve Fiori Tools UI Texts

## 0.12.12

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- Updated dependencies [f75b89d]
    - @sap-ux/project-access@1.30.4
    - @sap-ux/telemetry@0.6.6

## 0.12.11

_Released: 2025-06-27T07:08:06Z_

### Patch Changes

- @sap-ux/telemetry@0.6.5

## 0.12.10

_Released: 2025-06-24T14:02:12Z_

### Patch Changes

- 4fef16a: ensure service runtimeName is upper case to match service id

## 0.12.9

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.3
- @sap-ux/telemetry@0.6.4

## 0.12.8

_Released: 2025-06-17T07:58:40Z_

### Patch Changes

- 163522f: fix non-virtual endpoint preview config

## 0.12.7

_Released: 2025-06-10T07:40:27Z_

### Patch Changes

- 4e6c22e: adds support for external param abapCSN

## 0.12.6

_Released: 2025-06-05T12:32:35Z_

### Patch Changes

- 95a816d: update external params on app gen info type

## 0.12.5

_Released: 2025-06-05T07:23:07Z_

### Patch Changes

- 15ec5c4: adds support for adding deployment config via headless generator

## 0.12.4

_Released: 2025-05-30T09:02:15Z_

### Patch Changes

- 91726b0: loop through workspace folders to find correct default

## 0.12.3

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- @sap-ux/project-access@1.30.2
- @sap-ux/telemetry@0.6.3

## 0.12.2

_Released: 2025-05-27T17:59:17Z_

### Patch Changes

- ac55cca: adds .appGenInfo.json file
- Updated dependencies [ac55cca]
    - @sap-ux/telemetry@0.6.2

## 0.12.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- @sap-ux/project-access@1.30.1
- @sap-ux/telemetry@0.6.1

## 0.12.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/project-access@1.30.0
    - @sap-ux/btp-utils@1.1.0
    - @sap-ux/telemetry@0.6.0

## 0.11.3

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- Updated dependencies [ea0e2c0]
    - @sap-ux/project-access@1.29.22
    - @sap-ux/telemetry@0.5.78

## 0.11.2

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- @sap-ux/project-access@1.29.21
- @sap-ux/telemetry@0.5.77

## 0.11.1

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- Updated dependencies [294bbe3]
    - @sap-ux/project-access@1.29.20
    - @sap-ux/telemetry@0.5.76

## 0.11.0

_Released: 2025-04-23T13:59:14Z_

### Minor Changes

- 1ca4004: updates for use for fiori tools preview middleware and use of virtual endpoints

### Patch Changes

- @sap-ux/project-access@1.29.19
- @sap-ux/telemetry@0.5.75

## 0.10.2

_Released: 2025-04-15T10:10:52Z_

### Patch Changes

- Updated dependencies [9392ebd]
    - @sap-ux/telemetry@0.5.74

## 0.10.1

_Released: 2025-04-14T22:24:07Z_

### Patch Changes

- Updated dependencies [d638daa]
    - @sap-ux/btp-utils@1.0.3
    - @sap-ux/telemetry@0.5.73

## 0.10.0

_Released: 2025-04-10T13:52:38Z_

### Minor Changes

- 23e055a: Adds new module @sap-ux/fiori-app-sub-generator

## 0.9.11

_Released: 2025-03-19T08:54:25Z_

### Patch Changes

- Updated dependencies [c3ebc82]
    - @sap-ux/project-access@1.29.18
    - @sap-ux/telemetry@0.5.72

## 0.9.10

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- @sap-ux/project-access@1.29.17
- @sap-ux/telemetry@0.5.71

## 0.9.9

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- Updated dependencies [011c8c5]
    - @sap-ux/btp-utils@1.0.2
    - @sap-ux/telemetry@0.5.70
    - @sap-ux/project-access@1.29.16

## 0.9.8

_Released: 2025-03-06T16:16:20Z_

### Patch Changes

- Updated dependencies [1ce7fe9]
    - @sap-ux/project-access@1.29.15
    - @sap-ux/telemetry@0.5.69

## 0.9.7

_Released: 2025-03-05T11:16:53Z_

### Patch Changes

- Updated dependencies [3cc8f8a]
    - @sap-ux/project-access@1.29.14
    - @sap-ux/telemetry@0.5.68

## 0.9.6

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- @sap-ux/project-access@1.29.13
- @sap-ux/telemetry@0.5.67

## 0.9.5

_Released: 2025-03-04T08:55:15Z_

### Patch Changes

- @sap-ux/project-access@1.29.12
- @sap-ux/telemetry@0.5.66

## 0.9.4

_Released: 2025-03-03T11:06:12Z_

### Patch Changes

- d47a1b1: Export interface used by exported API, `generateReadMe`

## 0.9.3

_Released: 2025-02-28T15:10:48Z_

### Patch Changes

- Updated dependencies [0f35b4b]
    - @sap-ux/project-access@1.29.11
    - @sap-ux/telemetry@0.5.65

## 0.9.2

_Released: 2025-02-27T14:15:03Z_

### Patch Changes

- Updated dependencies [4b8577f]
    - @sap-ux/telemetry@0.5.64
    - @sap-ux/project-access@1.29.10

## 0.9.1

_Released: 2025-02-27T08:22:17Z_

### Patch Changes

- Updated dependencies [c8c292c]
    - @sap-ux/project-access@1.29.9
    - @sap-ux/telemetry@0.5.63

## 0.9.0

_Released: 2025-02-24T09:17:17Z_

### Minor Changes

- fffc3a7: Add Freestyle OPA templates to ui5-test-writer

## 0.8.1

_Released: 2025-02-17T13:42:22Z_

### Patch Changes

- Updated dependencies [c50e09f]
    - @sap-ux/project-access@1.29.8
    - @sap-ux/telemetry@0.5.62

## 0.8.0

_Released: 2025-02-13T17:39:11Z_

### Minor Changes

- fb4e328: Adds interoperability between `@vscode-logging/logger` and `@sap-ux/logger` to prevent crashes where non-implemented log functions were being called.
  Fix entity-helper.ts to log error at correct level.

## 0.7.29

_Released: 2025-02-13T10:58:34Z_

### Patch Changes

- Updated dependencies [2c0d657]
    - @sap-ux/project-access@1.29.7
    - @sap-ux/telemetry@0.5.61

## 0.7.28

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- @sap-ux/project-access@1.29.6
- @sap-ux/telemetry@0.5.60

## 0.7.27

_Released: 2025-02-05T17:08:20Z_

### Patch Changes

- @sap-ux/project-access@1.29.5
- @sap-ux/telemetry@0.5.59

## 0.7.26

_Released: 2025-02-05T14:44:29Z_

### Patch Changes

- Updated dependencies [65f15d9]
    - @sap-ux/btp-utils@1.0.1
    - @sap-ux/telemetry@0.5.58

## 0.7.25

_Released: 2025-02-04T15:39:07Z_

### Patch Changes

- Updated dependencies [29abc73]
    - @sap-ux/project-access@1.29.4
    - @sap-ux/telemetry@0.5.57

## 0.7.24

_Released: 2025-02-04T14:25:43Z_

### Patch Changes

- Updated dependencies [9980073]
    - @sap-ux/btp-utils@1.0.0
    - @sap-ux/telemetry@0.5.56

## 0.7.23

_Released: 2025-01-30T10:04:50Z_

### Patch Changes

- Updated dependencies [096b021]
    - @sap-ux/project-access@1.29.3
    - @sap-ux/telemetry@0.5.55

## 0.7.22

_Released: 2025-01-29T13:31:31Z_

### Patch Changes

- Updated dependencies [df2d965]
    - @sap-ux/btp-utils@0.18.0
    - @sap-ux/telemetry@0.5.54

## 0.7.21

_Released: 2025-01-28T09:20:06Z_

### Patch Changes

- Updated dependencies [93ef8c1]
    - @sap-ux/project-access@1.29.2
    - @sap-ux/telemetry@0.5.53

## 0.7.20

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- @sap-ux/project-access@1.29.1
- @sap-ux/telemetry@0.5.52

## 0.7.19

_Released: 2025-01-16T02:22:29Z_

### Patch Changes

- Updated dependencies [88bf030]
    - @sap-ux/project-access@1.29.0
    - @sap-ux/telemetry@0.5.51

## 0.7.18

_Released: 2024-12-20T15:43:15Z_

### Patch Changes

- fe0878d: feat(flp-config): adds new flp config generator

## 0.7.17

_Released: 2024-12-17T15:31:53Z_

### Patch Changes

- Updated dependencies [e1edcd7]
    - @sap-ux/project-access@1.28.10
    - @sap-ux/telemetry@0.5.50

## 0.7.16

_Released: 2024-12-17T13:32:02Z_

### Patch Changes

- Updated dependencies [cb54b44]
    - @sap-ux/btp-utils@0.17.2
    - @sap-ux/telemetry@0.5.49

## 0.7.15

_Released: 2024-12-10T16:04:29Z_

### Patch Changes

- @sap-ux/telemetry@0.5.48

## 0.7.14

_Released: 2024-12-10T11:51:29Z_

### Patch Changes

- 1bb4d48: adds new module @sap-ux/abap-deploy-config-sub-generator

## 0.7.13

_Released: 2024-12-06T21:07:01Z_

### Patch Changes

- Updated dependencies [e93797a]
    - @sap-ux/project-access@1.28.9
    - @sap-ux/telemetry@0.5.47

## 0.7.12

_Released: 2024-12-04T12:27:41Z_

### Patch Changes

- Updated dependencies [2359524]
    - @sap-ux/btp-utils@0.17.1
    - @sap-ux/telemetry@0.5.46

## 0.7.11

_Released: 2024-12-02T16:28:38Z_

### Patch Changes

- @sap-ux/project-access@1.28.8
- @sap-ux/telemetry@0.5.45

## 0.7.10

_Released: 2024-11-19T13:21:01Z_

### Patch Changes

- 575ff89: fix for reading readme template

## 0.7.9

_Released: 2024-11-18T22:28:16Z_

### Patch Changes

- Updated dependencies [a62ff25]
    - @sap-ux/btp-utils@0.17.0
    - @sap-ux/telemetry@0.5.44

## 0.7.8

_Released: 2024-11-18T20:38:37Z_

### Patch Changes

- @sap-ux/project-access@1.28.7
- @sap-ux/telemetry@0.5.43

## 0.7.7

_Released: 2024-11-14T17:04:56Z_

### Patch Changes

- 2886db3: Moves `getCFAbapServiceChoices` to inquirer-common and exports.

## 0.7.6

_Released: 2024-11-11T17:55:13Z_

### Patch Changes

- Updated dependencies [3734fe8]
    - @sap-ux/btp-utils@0.16.0
    - @sap-ux/telemetry@0.5.42

## 0.7.5

_Released: 2024-11-08T08:58:34Z_

### Patch Changes

- Updated dependencies [fb26f92]
    - @sap-ux/project-access@1.28.6
    - @sap-ux/telemetry@0.5.41

## 0.7.4

_Released: 2024-11-05T21:46:19Z_

### Patch Changes

- @sap-ux/project-access@1.28.5
- @sap-ux/telemetry@0.5.40

## 0.7.3

_Released: 2024-11-05T13:50:29Z_

### Patch Changes

- 5a68903: adds new reference library sub generator
- Updated dependencies [5a68903]
    - @sap-ux/project-access@1.28.4
    - @sap-ux/telemetry@0.5.39

## 0.7.2

_Released: 2024-11-01T22:26:57Z_

### Patch Changes

- @sap-ux/telemetry@0.5.38

## 0.7.1

_Released: 2024-10-31T07:40:48Z_

### Patch Changes

- Updated dependencies [42f13eb]
    - @sap-ux/project-access@1.28.3
    - @sap-ux/telemetry@0.5.37

## 0.7.0

_Released: 2024-10-25T17:49:03Z_

### Minor Changes

- 231e713: adds new functions

## 0.6.4

_Released: 2024-10-16T08:21:13Z_

### Patch Changes

- Updated dependencies [eb38e5b]
    - @sap-ux/project-access@1.28.2

## 0.6.3

_Released: 2024-10-14T21:48:37Z_

### Patch Changes

- Updated dependencies [64e037d]
    - @sap-ux/project-access@1.28.1

## 0.6.2

_Released: 2024-10-14T16:41:16Z_

### Patch Changes

- Updated dependencies [15e6959]
    - @sap-ux/project-access@1.28.0

## 0.6.1

_Released: 2024-10-08T10:16:01Z_

### Patch Changes

- Updated dependencies [eb74890]
    - @sap-ux/project-access@1.27.6

## 0.6.0

_Released: 2024-10-04T19:18:33Z_

### Minor Changes

- d40af34: adds new module @sap-ux/ui5-library-sub-generator

## 0.5.1

_Released: 2024-10-02T14:28:15Z_

### Patch Changes

- Updated dependencies [a64a3a5]
    - @sap-ux/project-access@1.27.5

## 0.5.0

_Released: 2024-09-25T15:31:22Z_

### Minor Changes

- 04988f1: Refactor shared logic for generating package.json scripts for FF and FE

## 0.4.0

_Released: 2024-09-23T10:02:33Z_

### Minor Changes

- 484195d: Enhancements to FE & FF Configurations: The updates include adding the `start-variants-management` script to `package.json` for FE and FF. The OdataService interface now has an `ignoreCertError` property. UI5 application writer introduces the `sapuxLayer` property to `package.json` templates and adds `fiori-tools-preview middleware` to ui5, ui5-mock, and ui5-local.yaml. Additionally, the `addFioriToolsPreviewMiddleware` function has been added for YAML config integration.

### Patch Changes

- @sap-ux/project-access@1.27.4

## 0.3.21

_Released: 2024-09-18T14:01:49Z_

### Patch Changes

- Updated dependencies [070182d]
    - @sap-ux/project-access@1.27.3

## 0.3.20

_Released: 2024-09-12T09:42:45Z_

### Patch Changes

- Updated dependencies [09522df]
    - @sap-ux/project-access@1.27.2

## 0.3.19

_Released: 2024-09-03T19:06:21Z_

### Patch Changes

- Updated dependencies [d962ce1]
    - @sap-ux/project-access@1.27.1

## 0.3.18

_Released: 2024-08-30T06:05:30Z_

### Patch Changes

- Updated dependencies [df29368]
    - @sap-ux/project-access@1.27.0

## 0.3.17

_Released: 2024-08-28T11:16:50Z_

### Patch Changes

- @sap-ux/project-access@1.26.9

## 0.3.16

_Released: 2024-08-23T10:57:41Z_

### Patch Changes

- Updated dependencies [d3dafeb]
    - @sap-ux/btp-utils@0.15.2

## 0.3.15

_Released: 2024-08-22T19:38:11Z_

### Patch Changes

- 3e1a83a: FEAT - Move Guided Help code into a new module @sap-ux/guided-answers-helper

## 0.3.14

_Released: 2024-08-20T14:54:47Z_

### Patch Changes

- 12504d5: adds new module @sap-ux/abap-deploy-config-inquirer

## 0.3.13

_Released: 2024-08-20T10:06:29Z_

### Patch Changes

- Updated dependencies [df6262e]
    - @sap-ux/project-access@1.26.8

## 0.3.12

_Released: 2024-08-19T11:34:45Z_

### Patch Changes

- @sap-ux/project-access@1.26.7

## 0.3.11

_Released: 2024-08-12T10:50:52Z_

### Patch Changes

- Updated dependencies [82aaea3]
    - @sap-ux/project-access@1.26.6

## 0.3.10

_Released: 2024-08-08T07:33:51Z_

### Patch Changes

- Updated dependencies [cc16cbb]
    - @sap-ux/project-access@1.26.5

## 0.3.9

_Released: 2024-08-07T11:06:05Z_

### Patch Changes

- @sap-ux/project-access@1.26.4

## 0.3.8

_Released: 2024-08-01T18:27:11Z_

### Patch Changes

- Updated dependencies [88c8bf6]
    - @sap-ux/project-access@1.26.3

## 0.3.7

_Released: 2024-08-01T17:28:17Z_

### Patch Changes

- e69db46: Upgrade fast-xml-parser
- Updated dependencies [e69db46]
    - @sap-ux/project-access@1.26.2

## 0.3.6

_Released: 2024-08-01T16:21:31Z_

### Patch Changes

- Updated dependencies [a986655]
    - @sap-ux/project-access@1.26.1

## 0.3.5

_Released: 2024-08-01T14:53:05Z_

### Patch Changes

- Updated dependencies [518bf7e]
    - @sap-ux/project-access@1.26.0

## 0.3.4

_Released: 2024-08-01T12:24:50Z_

### Patch Changes

- Updated dependencies [99b7b5f]
    - @sap-ux/project-access@1.25.8

## 0.3.3

_Released: 2024-07-23T09:01:05Z_

### Patch Changes

- Updated dependencies [d549173]
    - @sap-ux/project-access@1.25.7

## 0.3.2

_Released: 2024-07-18T16:34:38Z_

### Patch Changes

- Updated dependencies [a9fac04]
    - @sap-ux/project-access@1.25.6

## 0.3.1

_Released: 2024-07-17T10:08:55Z_

### Patch Changes

- Updated dependencies [421f3ca]
    - @sap-ux/project-access@1.25.5

## 0.3.0

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

## 0.2.6

_Released: 2024-07-12T15:28:30Z_

### Patch Changes

- Updated dependencies [173b5f2]
    - @sap-ux/project-access@1.25.4

## 0.2.5

_Released: 2024-07-12T09:20:42Z_

### Patch Changes

- Updated dependencies [e7b9184]
    - @sap-ux/project-access@1.25.3

## 0.2.4

_Released: 2024-07-12T08:50:08Z_

### Patch Changes

- @sap-ux/project-access@1.25.2

## 0.2.3

_Released: 2024-07-10T11:59:21Z_

### Patch Changes

- Updated dependencies [0f3cf6b]
    - @sap-ux/project-access@1.25.1

## 0.2.2

_Released: 2024-07-09T12:14:56Z_

### Patch Changes

- Updated dependencies [f076dd3]
    - @sap-ux/project-access@1.25.0

## 0.2.1

_Released: 2024-07-09T08:05:42Z_

### Patch Changes

- Updated dependencies [0ae685e]
    - @sap-ux/project-access@1.24.0

## 0.2.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/project-access@1.23.0

## 0.1.2

_Released: 2024-07-05T07:32:09Z_

### Patch Changes

- bb7ebe9a: Fix: Include Templates in 'files' Array of fiori-generator-shared Package.json

## 0.1.1

_Released: 2024-07-03T10:48:46Z_

### Patch Changes

- Updated dependencies [9ea58ad4]
    - @sap-ux/project-access@1.22.4

## 0.1.0

_Released: 2024-06-26T14:43:53Z_

### Minor Changes

- 3b795703: Adding generate readme file functionalities

## 0.0.17

_Released: 2024-06-26T13:30:18Z_

### Patch Changes

- @sap-ux/project-access@1.22.3

## 0.0.16

_Released: 2024-06-25T14:41:22Z_

### Patch Changes

- Updated dependencies [399d2ad8]
    - @sap-ux/project-access@1.22.2

## 0.0.15

_Released: 2024-06-18T15:06:09Z_

### Patch Changes

- @sap-ux/project-access@1.22.1

## 0.0.14

_Released: 2024-06-13T16:04:23Z_

### Patch Changes

- Updated dependencies [ad93a484]
    - @sap-ux/project-access@1.22.0

## 0.0.13

_Released: 2024-06-12T15:20:44Z_

### Patch Changes

- @sap-ux/project-access@1.21.2

## 0.0.12

_Released: 2024-06-07T14:16:07Z_

### Patch Changes

- @sap-ux/project-access@1.21.1

## 0.0.11

_Released: 2024-06-04T12:43:36Z_

### Patch Changes

- Updated dependencies [69b8d6de]
    - @sap-ux/project-access@1.21.0

## 0.0.10

_Released: 2024-06-04T12:14:54Z_

### Patch Changes

- Updated dependencies [a7d78229]
    - @sap-ux/project-access@1.20.4

## 0.0.9

_Released: 2024-05-31T13:42:35Z_

### Patch Changes

- @sap-ux/project-access@1.20.3

## 0.0.8

_Released: 2024-05-29T14:07:16Z_

### Patch Changes

- Updated dependencies [54c91c6d]
    - @sap-ux/project-access@1.20.2

## 0.0.7

_Released: 2024-05-27T13:04:53Z_

### Patch Changes

- @sap-ux/project-access@1.20.1

## 0.0.6

_Released: 2024-05-14T08:36:35Z_

### Patch Changes

- Updated dependencies [e3d2324c]
    - @sap-ux/project-access@1.20.0

## 0.0.5

_Released: 2024-05-02T14:43:18Z_

### Patch Changes

- @sap-ux/project-access@1.19.14

## 0.0.4

_Released: 2024-04-26T19:12:20Z_

### Patch Changes

- Updated dependencies [99bca62c]
    - @sap-ux/project-access@1.19.13

## 0.0.3

_Released: 2024-04-23T22:35:35Z_

### Patch Changes

- Updated dependencies [b7d95fb3]
    - @sap-ux/project-access@1.19.12

## 0.0.2

_Released: 2024-04-23T07:22:50Z_

### Patch Changes

- Updated dependencies [4389c528]
    - @sap-ux/project-access@1.19.11

## 0.0.1

_Released: 2024-06-04T12:14:54Z_

### Patch Changes

- 58538723: adds new module @sap-ux/fiori-generator-shared
