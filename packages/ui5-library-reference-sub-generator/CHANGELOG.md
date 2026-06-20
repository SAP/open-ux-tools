# @sap-ux/ui5-library-reference-sub-generator

## 1.0.12

### Patch Changes

#### Workspace Updates

- @sap-ux/ui5-library-reference-inquirer 1.0.11 → 1.0.12

## 1.0.11

*Released: 2026-06-12T06:53:23Z*

### Patch Changes

- Updated dependencies [41b3908]
    - @sap-ux/feature-toggle@1.0.2
    - @sap-ux/fiori-generator-shared@1.0.11
    - @sap-ux/ui5-library-reference-inquirer@1.0.11

## 1.0.10

*Released: 2026-06-11T10:54:17Z*

### Patch Changes

- Updated dependencies [7bfa518]
    - @sap-ux/telemetry@1.0.9
    - @sap-ux/fiori-generator-shared@1.0.10
    - @sap-ux/ui5-library-reference-inquirer@1.0.10

## 1.0.9

*Released: 2026-06-10T09:57:42Z*

### Patch Changes

- @sap-ux/project-access@2.1.2
- @sap-ux/telemetry@1.0.8
- @sap-ux/ui5-library-reference-writer@1.0.6
- @sap-ux/fiori-generator-shared@1.0.9
- @sap-ux/ui5-library-reference-inquirer@1.0.9

## 1.0.8

*Released: 2026-06-09T14:35:01Z*

### Patch Changes

- @sap-ux/fiori-generator-shared@1.0.8
- @sap-ux/telemetry@1.0.7
- @sap-ux/ui5-library-reference-inquirer@1.0.8

## 1.0.7

*Released: 2026-06-09T13:18:16Z*

### Patch Changes

- Updated dependencies [a328e14]
    - @sap-ux/fiori-generator-shared@1.0.7
    - @sap-ux/ui5-library-reference-inquirer@1.0.7

## 1.0.6

*Released: 2026-06-04T13:54:21Z*

### Patch Changes

- Updated dependencies [fff7490]
    - @sap-ux/project-access@2.1.1
    - @sap-ux/fiori-generator-shared@1.0.6
    - @sap-ux/telemetry@1.0.6
    - @sap-ux/ui5-library-reference-inquirer@1.0.6
    - @sap-ux/ui5-library-reference-writer@1.0.5

## 1.0.5

*Released: 2026-06-04T10:19:37Z*

### Patch Changes

- Updated dependencies [b326a9a]
    - @sap-ux/project-access@2.1.0
    - @sap-ux/fiori-generator-shared@1.0.5
    - @sap-ux/telemetry@1.0.5
    - @sap-ux/ui5-library-reference-inquirer@1.0.5
    - @sap-ux/ui5-library-reference-writer@1.0.4

## 1.0.4

*Released: 2026-06-03T14:58:37Z*

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/ui5-library-reference-inquirer@1.0.4
    - @sap-ux/ui5-library-reference-writer@1.0.3
    - @sap-ux/fiori-generator-shared@1.0.4
    - @sap-ux/feature-toggle@1.0.1
    - @sap-ux/project-access@2.0.3
    - @sap-ux/telemetry@1.0.4

## 1.0.3

*Released: 2026-06-03T13:52:44Z*

### Patch Changes

- @sap-ux/project-access@2.0.2
- @sap-ux/telemetry@1.0.3
- @sap-ux/ui5-library-reference-writer@1.0.2
- @sap-ux/fiori-generator-shared@1.0.3
- @sap-ux/ui5-library-reference-inquirer@1.0.3

## 1.0.2

*Released: 2026-06-02T11:35:17Z*

### Patch Changes

- @sap-ux/telemetry@1.0.2
- @sap-ux/fiori-generator-shared@1.0.2
- @sap-ux/ui5-library-reference-inquirer@1.0.2

## 1.0.1

*Released: 2026-06-01T15:15:26Z*

### Patch Changes

- Updated dependencies [aed799d]
    - @sap-ux/project-access@2.0.1
    - @sap-ux/fiori-generator-shared@1.0.1
    - @sap-ux/telemetry@1.0.1
    - @sap-ux/ui5-library-reference-inquirer@1.0.1
    - @sap-ux/ui5-library-reference-writer@1.0.1

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
    - @sap-ux/ui5-library-reference-inquirer@1.0.0
    - @sap-ux/ui5-library-reference-writer@1.0.0
    - @sap-ux/fiori-generator-shared@1.0.0
    - @sap-ux/feature-toggle@1.0.0
    - @sap-ux/project-access@2.0.0
    - @sap-ux/telemetry@1.0.0

## 0.2.7

*Released: 2026-05-29T12:50:34Z*

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.5.7

## 0.2.6

*Released: 2026-05-27T11:39:21Z*

### Patch Changes

- @sap-ux/telemetry@0.7.5
- @sap-ux/fiori-generator-shared@0.15.6
- @sap-ux/ui5-library-reference-inquirer@0.5.6

## 0.2.5

*Released: 2026-05-27T10:42:47Z*

### Patch Changes

- @sap-ux/fiori-generator-shared@0.15.5
- @sap-ux/telemetry@0.7.4
- @sap-ux/ui5-library-reference-inquirer@0.5.5

## 0.2.4

*Released: 2026-05-26T16:40:21Z*

### Patch Changes

- @sap-ux/fiori-generator-shared@0.15.4
- @sap-ux/telemetry@0.7.3
- @sap-ux/ui5-library-reference-inquirer@0.5.4

## 0.2.3

*Released: 2026-05-21T16:21:11Z*

### Patch Changes

- @sap-ux/project-access@1.38.1
- @sap-ux/telemetry@0.7.2
- @sap-ux/ui5-library-reference-writer@0.3.2
- @sap-ux/fiori-generator-shared@0.15.3
- @sap-ux/ui5-library-reference-inquirer@0.5.3

## 0.2.2

*Released: 2026-05-19T15:16:46Z*

### Patch Changes

- Updated dependencies [63e6846]
    - @sap-ux/project-access@1.38.0
    - @sap-ux/fiori-generator-shared@0.15.2
    - @sap-ux/telemetry@0.7.1
    - @sap-ux/ui5-library-reference-inquirer@0.5.2
    - @sap-ux/ui5-library-reference-writer@0.3.1

## 0.2.1

*Released: 2026-05-15T13:12:06Z*

### Patch Changes

- 2c76f8f: chore: upgrade @sap-devx/yeoman-ui-types 1.23.0 → 1.25.0
- Updated dependencies [2c76f8f]
    - @sap-ux/fiori-generator-shared@0.15.1
    - @sap-ux/ui5-library-reference-inquirer@0.5.1

## 0.2.0

*Released: 2026-05-15T08:12:20Z*

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/feature-toggle@0.4.0
    - @sap-ux/fiori-generator-shared@0.15.0
    - @sap-ux/project-access@1.37.0
    - @sap-ux/telemetry@0.7.0
    - @sap-ux/ui5-library-reference-inquirer@0.5.0
    - @sap-ux/ui5-library-reference-writer@0.3.0

## 0.1.157

*Released: 2026-05-14T21:28:41Z*

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.157

## 0.1.156

*Released: 2026-05-14T11:45:51Z*

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/feature-toggle@0.3.9
    - @sap-ux/fiori-generator-shared@0.14.2
    - @sap-ux/project-access@1.36.5
    - @sap-ux/telemetry@0.6.106
    - @sap-ux/ui5-library-reference-inquirer@0.4.156
    - @sap-ux/ui5-library-reference-writer@0.2.74

## 0.1.155

*Released: 2026-05-13T09:36:59Z*

### Patch Changes

- Updated dependencies [21abda3]
    - @sap-ux/project-access@1.36.4
    - @sap-ux/fiori-generator-shared@0.14.1
    - @sap-ux/telemetry@0.6.105
    - @sap-ux/ui5-library-reference-inquirer@0.4.155
    - @sap-ux/ui5-library-reference-writer@0.2.73

## 0.1.154

*Released: 2026-05-12T18:00:39Z*

### Patch Changes

- Updated dependencies [9360ea5]
    - @sap-ux/fiori-generator-shared@0.14.0
    - @sap-ux/ui5-library-reference-inquirer@0.4.154

## 0.1.153

*Released: 2026-05-06T23:02:00Z*

### Patch Changes

- Updated dependencies [678a08e]
- Updated dependencies [678a08e]
    - @sap-ux/telemetry@0.6.104
    - @sap-ux/fiori-generator-shared@0.13.105
    - @sap-ux/ui5-library-reference-inquirer@0.4.153
    - @sap-ux/project-access@1.36.3
    - @sap-ux/ui5-library-reference-writer@0.2.72

## 0.1.152

*Released: 2026-04-30T14:23:24Z*

### Patch Changes

- Updated dependencies [c160401]
    - @sap-ux/telemetry@0.6.103
    - @sap-ux/fiori-generator-shared@0.13.104
    - @sap-ux/project-access@1.36.2
    - @sap-ux/ui5-library-reference-inquirer@0.4.152
    - @sap-ux/ui5-library-reference-writer@0.2.71

## 0.1.151

*Released: 2026-04-29T15:24:37Z*

### Patch Changes

- Updated dependencies [3945459]
    - @sap-ux/project-access@1.36.1
    - @sap-ux/fiori-generator-shared@0.13.103
    - @sap-ux/telemetry@0.6.102
    - @sap-ux/ui5-library-reference-inquirer@0.4.151
    - @sap-ux/ui5-library-reference-writer@0.2.70

## 0.1.150

*Released: 2026-04-27T19:47:46Z*

### Patch Changes

- Updated dependencies [1d60871]
    - @sap-ux/project-access@1.36.0
    - @sap-ux/fiori-generator-shared@0.13.102
    - @sap-ux/telemetry@0.6.101
    - @sap-ux/ui5-library-reference-inquirer@0.4.150
    - @sap-ux/ui5-library-reference-writer@0.2.69

## 0.1.149

*Released: 2026-04-23T12:54:21Z*

### Patch Changes

- Updated dependencies [03d3ea1]
    - @sap-ux/project-access@1.35.21
    - @sap-ux/fiori-generator-shared@0.13.101
    - @sap-ux/telemetry@0.6.100
    - @sap-ux/ui5-library-reference-inquirer@0.4.149
    - @sap-ux/ui5-library-reference-writer@0.2.68

## 0.1.148

*Released: 2026-04-23T06:48:55Z*

### Patch Changes

- Updated dependencies [237371b]
    - @sap-ux/fiori-generator-shared@0.13.100
    - @sap-ux/ui5-library-reference-inquirer@0.4.148

## 0.1.147

*Released: 2026-04-22T12:38:46Z*

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.147

## 0.1.146

*Released: 2026-04-15T11:53:17Z*

### Patch Changes

- Updated dependencies [67d1f8b]
    - @sap-ux/telemetry@0.6.99
    - @sap-ux/fiori-generator-shared@0.13.99
    - @sap-ux/ui5-library-reference-inquirer@0.4.146

## 0.1.145

*Released: 2026-04-14T20:26:28Z*

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.98
- @sap-ux/telemetry@0.6.98
- @sap-ux/ui5-library-reference-inquirer@0.4.145

## 0.1.144

*Released: 2026-04-14T12:35:35Z*

### Patch Changes

- Updated dependencies [cc4450c]
    - @sap-ux/telemetry@0.6.97
    - @sap-ux/fiori-generator-shared@0.13.97
    - @sap-ux/ui5-library-reference-inquirer@0.4.144
    - @sap-ux/project-access@1.35.20
    - @sap-ux/ui5-library-reference-writer@0.2.67

## 0.1.143

*Released: 2026-04-08T13:10:18Z*

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.96
- @sap-ux/ui5-library-reference-inquirer@0.4.143
- @sap-ux/project-access@1.35.19
- @sap-ux/telemetry@0.6.96
- @sap-ux/ui5-library-reference-writer@0.2.66

## 0.1.142

*Released: 2026-04-01T11:49:37Z*

### Patch Changes

- Updated dependencies [3291f6c]
    - @sap-ux/project-access@1.35.18
    - @sap-ux/fiori-generator-shared@0.13.95
    - @sap-ux/telemetry@0.6.95
    - @sap-ux/ui5-library-reference-inquirer@0.4.142
    - @sap-ux/ui5-library-reference-writer@0.2.65

## 0.1.141

*Released: 2026-03-30T22:24:11Z*

### Patch Changes

- c53a4ba: chore(ui5-library-reference-sub-generator): upgrade @sap-devx/yeoman-ui-types 1.22.0 → 1.23.0 (runtime dep); upgrade devDependencies (jest 30, i18next 25, @types/yeoman-generator 5.2.14)
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
    - @sap-ux/feature-toggle@0.3.8
    - @sap-ux/fiori-generator-shared@0.13.94
    - @sap-ux/telemetry@0.6.94
    - @sap-ux/ui5-library-reference-inquirer@0.4.141
    - @sap-ux/project-access@1.35.17

## 0.1.140

*Released: 2026-03-27T15:37:24Z*

### Patch Changes

- Updated dependencies [e92850e]
    - @sap-ux/telemetry@0.6.93
    - @sap-ux/fiori-generator-shared@0.13.93
    - @sap-ux/ui5-library-reference-inquirer@0.4.140

## 0.1.139

*Released: 2026-03-27T11:58:49Z*

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.92
- @sap-ux/telemetry@0.6.92
- @sap-ux/ui5-library-reference-inquirer@0.4.139

## 0.1.138

*Released: 2026-03-26T20:06:10Z*

### Patch Changes

- Updated dependencies [b66e827]
    - @sap-ux/project-access@1.35.17
    - @sap-ux/fiori-generator-shared@0.13.91
    - @sap-ux/telemetry@0.6.91
    - @sap-ux/ui5-library-reference-inquirer@0.4.138
    - @sap-ux/ui5-library-reference-writer@0.2.64

## 0.1.137

*Released: 2026-03-26T12:07:04Z*

### Patch Changes

- a41533f: chore(ui5-library-reference-sub-generator): upgrade i18next 25.8.18 → 25.8.20
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/fiori-generator-shared@0.13.90
    - @sap-ux/project-access@1.35.16
    - @sap-ux/ui5-library-reference-inquirer@0.4.137
    - @sap-ux/telemetry@0.6.90
    - @sap-ux/ui5-library-reference-writer@0.2.63

## 0.1.136

*Released: 2026-03-25T12:56:41Z*

### Patch Changes

- Updated dependencies [f384ace]
    - @sap-ux/project-access@1.35.15
    - @sap-ux/fiori-generator-shared@0.13.89
    - @sap-ux/telemetry@0.6.89
    - @sap-ux/ui5-library-reference-inquirer@0.4.136
    - @sap-ux/ui5-library-reference-writer@0.2.62

## 0.1.135

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- @sap-ux/project-access@1.35.14
- @sap-ux/telemetry@0.6.88
- @sap-ux/ui5-library-reference-writer@0.2.61
- @sap-ux/ui5-library-reference-inquirer@0.4.135
- @sap-ux/fiori-generator-shared@0.13.88

## 0.1.134

_Released: 2026-03-18T16:51:44Z_

### Patch Changes

- Updated dependencies [ae6758f]
    - @sap-ux/fiori-generator-shared@0.13.87
    - @sap-ux/ui5-library-reference-inquirer@0.4.134

## 0.1.133

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18
- Updated dependencies [55417bb]
    - @sap-ux/fiori-generator-shared@0.13.86
    - @sap-ux/ui5-library-reference-inquirer@0.4.133
    - @sap-ux/telemetry@0.6.87

## 0.1.132

_Released: 2026-03-06T13:19:33Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.132

## 0.1.131

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- Updated dependencies [d834713]
    - @sap-ux/project-access@1.35.13
    - @sap-ux/fiori-generator-shared@0.13.85
    - @sap-ux/telemetry@0.6.86
    - @sap-ux/ui5-library-reference-inquirer@0.4.131
    - @sap-ux/ui5-library-reference-writer@0.2.60

## 0.1.130

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- Updated dependencies [2917c4c]
- Updated dependencies [7c06ef0]
- Updated dependencies [fdd57de]
    - @sap-ux/telemetry@0.6.85
    - @sap-ux/project-access@1.35.12
    - @sap-ux/fiori-generator-shared@0.13.84
    - @sap-ux/ui5-library-reference-inquirer@0.4.130
    - @sap-ux/ui5-library-reference-writer@0.2.59

## 0.1.129

_Released: 2026-03-05T10:41:09Z_

### Patch Changes

- 5aff25c: fix(deps): update dependency fs-extra to v11
- Updated dependencies [5aff25c]
    - @sap-ux/ui5-library-reference-writer@0.2.58
    - @sap-ux/ui5-library-reference-inquirer@0.4.129

## 0.1.128

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- f5f9a78: fix(deps): update dependency @sap-devx/yeoman-ui-types to v1.22.0
- 4fc1fe5: fix(deps): update dependency @jest/types to v30.2.0
- ac58145: fix(deps): update dependency fs-extra to v10.1.0
- Updated dependencies [f5f9a78]
- Updated dependencies [ac58145]
    - @sap-ux/ui5-library-reference-inquirer@0.4.128
    - @sap-ux/ui5-library-reference-writer@0.2.57
    - @sap-ux/fiori-generator-shared@0.13.83
    - @sap-ux/project-access@1.35.11
    - @sap-ux/telemetry@0.6.84

## 0.1.127

_Released: 2026-03-04T15:52:08Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.127
- @sap-ux/fiori-generator-shared@0.13.82

## 0.1.126

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- @sap-ux/project-access@1.35.11
- @sap-ux/telemetry@0.6.83
- @sap-ux/ui5-library-reference-writer@0.2.56
- @sap-ux/fiori-generator-shared@0.13.82
- @sap-ux/ui5-library-reference-inquirer@0.4.126

## 0.1.125

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/project-access@1.35.10
    - @sap-ux/fiori-generator-shared@0.13.81
    - @sap-ux/telemetry@0.6.82
    - @sap-ux/ui5-library-reference-inquirer@0.4.125
    - @sap-ux/ui5-library-reference-writer@0.2.55

## 0.1.124

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- 6c993f3: fix: turn off i18next support notice
- Updated dependencies [6c993f3]
    - @sap-ux/ui5-library-reference-inquirer@0.4.124
    - @sap-ux/fiori-generator-shared@0.13.80
    - @sap-ux/telemetry@0.6.81

## 0.1.123

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.9
- @sap-ux/fiori-generator-shared@0.13.79
- @sap-ux/telemetry@0.6.80
- @sap-ux/ui5-library-reference-inquirer@0.4.123
- @sap-ux/ui5-library-reference-writer@0.2.54

## 0.1.122

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- Updated dependencies [0ecc5f1]
    - @sap-ux/project-access@1.35.8
    - @sap-ux/fiori-generator-shared@0.13.78
    - @sap-ux/telemetry@0.6.79
    - @sap-ux/ui5-library-reference-inquirer@0.4.122
    - @sap-ux/ui5-library-reference-writer@0.2.53

## 0.1.121

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.7
- @sap-ux/telemetry@0.6.78
- @sap-ux/ui5-library-reference-writer@0.2.52
- @sap-ux/fiori-generator-shared@0.13.77
- @sap-ux/ui5-library-reference-inquirer@0.4.121

## 0.1.120

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- d588c26: fix(deps): update dependency rimraf to v6.1.3
- Updated dependencies [d588c26]
    - @sap-ux/feature-toggle@0.3.7
    - @sap-ux/ui5-library-reference-inquirer@0.4.120
    - @sap-ux/fiori-generator-shared@0.13.76

## 0.1.119

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12
- Updated dependencies [cbd340a]
    - @sap-ux/fiori-generator-shared@0.13.76
    - @sap-ux/ui5-library-reference-inquirer@0.4.119
    - @sap-ux/telemetry@0.6.77

## 0.1.118

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- c94cc8e: fix(deps): update dependency @vscode-logging/logger to v2.0.8
- e5bc3ca: fix(deps): update dependency vscode-uri to v3.1.0
- Updated dependencies [c94cc8e]
- Updated dependencies [bb310dc]
- Updated dependencies [e5bc3ca]
    - @sap-ux/fiori-generator-shared@0.13.75
    - @sap-ux/project-access@1.35.6
    - @sap-ux/ui5-library-reference-inquirer@0.4.118
    - @sap-ux/telemetry@0.6.76
    - @sap-ux/ui5-library-reference-writer@0.2.51

## 0.1.117

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/project-access@1.35.5
    - @sap-ux/fiori-generator-shared@0.13.74
    - @sap-ux/telemetry@0.6.75
    - @sap-ux/ui5-library-reference-inquirer@0.4.117
    - @sap-ux/ui5-library-reference-writer@0.2.50

## 0.1.116

_Released: 2026-02-16T18:48:13Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.73
- @sap-ux/telemetry@0.6.74
- @sap-ux/ui5-library-reference-inquirer@0.4.116

## 0.1.115

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.72
- @sap-ux/project-access@1.35.4
- @sap-ux/telemetry@0.6.73
- @sap-ux/ui5-library-reference-writer@0.2.49
- @sap-ux/ui5-library-reference-inquirer@0.4.115

## 0.1.114

_Released: 2026-02-13T16:18:58Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.71
- @sap-ux/telemetry@0.6.72
- @sap-ux/ui5-library-reference-inquirer@0.4.114

## 0.1.113

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- Updated dependencies [346f09c]
    - @sap-ux/project-access@1.35.3
    - @sap-ux/fiori-generator-shared@0.13.70
    - @sap-ux/telemetry@0.6.71
    - @sap-ux/ui5-library-reference-inquirer@0.4.113
    - @sap-ux/ui5-library-reference-writer@0.2.48

## 0.1.112

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- Updated dependencies [d2b772d]
    - @sap-ux/project-access@1.35.2
    - @sap-ux/fiori-generator-shared@0.13.69
    - @sap-ux/telemetry@0.6.70
    - @sap-ux/ui5-library-reference-inquirer@0.4.112
    - @sap-ux/ui5-library-reference-writer@0.2.47

## 0.1.111

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/telemetry@0.6.69
    - @sap-ux/fiori-generator-shared@0.13.68
    - @sap-ux/ui5-library-reference-inquirer@0.4.111
    - @sap-ux/project-access@1.35.1
    - @sap-ux/ui5-library-reference-writer@0.2.46

## 0.1.110

_Released: 2026-02-09T15:13:41Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.110

## 0.1.109

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/project-access@1.35.0
    - @sap-ux/ui5-library-reference-inquirer@0.4.109
    - @sap-ux/fiori-generator-shared@0.13.67
    - @sap-ux/telemetry@0.6.68
    - @sap-ux/ui5-library-reference-writer@0.2.45

## 0.1.108

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- Updated dependencies [467e6aa]
    - @sap-ux/project-access@1.34.7
    - @sap-ux/fiori-generator-shared@0.13.66
    - @sap-ux/telemetry@0.6.67
    - @sap-ux/ui5-library-reference-inquirer@0.4.108
    - @sap-ux/ui5-library-reference-writer@0.2.44

## 0.1.107

_Released: 2026-02-05T13:53:56Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.65
- @sap-ux/telemetry@0.6.66
- @sap-ux/ui5-library-reference-inquirer@0.4.107

## 0.1.106

_Released: 2026-02-05T11:39:04Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.64
- @sap-ux/telemetry@0.6.65
- @sap-ux/ui5-library-reference-inquirer@0.4.106

## 0.1.105

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- Updated dependencies [ad321ab]
    - @sap-ux/fiori-generator-shared@0.13.63
    - @sap-ux/project-access@1.34.6
    - @sap-ux/ui5-library-reference-inquirer@0.4.105
    - @sap-ux/telemetry@0.6.64
    - @sap-ux/ui5-library-reference-writer@0.2.43

## 0.1.104

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- 9f11dd2: chore - address audit issues
- Updated dependencies [9f11dd2]
    - @sap-ux/feature-toggle@0.3.6
    - @sap-ux/ui5-library-reference-inquirer@0.4.104
    - @sap-ux/fiori-generator-shared@0.13.62
    - @sap-ux/telemetry@0.6.63

## 0.1.103

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [89175fe]
    - @sap-ux/project-access@1.34.5
    - @sap-ux/fiori-generator-shared@0.13.61
    - @sap-ux/telemetry@0.6.62
    - @sap-ux/ui5-library-reference-inquirer@0.4.103
    - @sap-ux/ui5-library-reference-writer@0.2.42

## 0.1.102

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.60
- @sap-ux/ui5-library-reference-inquirer@0.4.102
- @sap-ux/project-access@1.34.4
- @sap-ux/telemetry@0.6.61
- @sap-ux/ui5-library-reference-writer@0.2.41

## 0.1.101

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- Updated dependencies [6d71400]
    - @sap-ux/project-access@1.34.3
    - @sap-ux/fiori-generator-shared@0.13.59
    - @sap-ux/telemetry@0.6.60
    - @sap-ux/ui5-library-reference-inquirer@0.4.101
    - @sap-ux/ui5-library-reference-writer@0.2.40

## 0.1.100

_Released: 2026-01-28T00:19:05Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.58
- @sap-ux/telemetry@0.6.59
- @sap-ux/ui5-library-reference-inquirer@0.4.100

## 0.1.99

_Released: 2026-01-23T23:57:30Z_

### Patch Changes

- Updated dependencies [c707af1]
    - @sap-ux/telemetry@0.6.58
    - @sap-ux/fiori-generator-shared@0.13.57
    - @sap-ux/ui5-library-reference-inquirer@0.4.99

## 0.1.98

_Released: 2026-01-23T22:30:10Z_

### Patch Changes

- Updated dependencies [d11943d]
    - @sap-ux/fiori-generator-shared@0.13.56
    - @sap-ux/ui5-library-reference-inquirer@0.4.98

## 0.1.97

_Released: 2026-01-23T12:49:27Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.55
- @sap-ux/telemetry@0.6.57
- @sap-ux/ui5-library-reference-inquirer@0.4.97

## 0.1.96

_Released: 2026-01-19T12:47:48Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.96

## 0.1.95

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- Updated dependencies [be67fc4]
    - @sap-ux/project-access@1.34.2
    - @sap-ux/telemetry@0.6.56
    - @sap-ux/ui5-library-reference-writer@0.2.39
    - @sap-ux/fiori-generator-shared@0.13.54
    - @sap-ux/ui5-library-reference-inquirer@0.4.95

## 0.1.94

_Released: 2026-01-16T12:32:24Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.53
- @sap-ux/telemetry@0.6.55
- @sap-ux/ui5-library-reference-inquirer@0.4.94

## 0.1.93

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1
    - @sap-ux/fiori-generator-shared@0.13.52
    - @sap-ux/telemetry@0.6.54
    - @sap-ux/ui5-library-reference-inquirer@0.4.93
    - @sap-ux/ui5-library-reference-writer@0.2.38

## 0.1.92

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0
    - @sap-ux/fiori-generator-shared@0.13.51
    - @sap-ux/telemetry@0.6.53
    - @sap-ux/ui5-library-reference-inquirer@0.4.92
    - @sap-ux/ui5-library-reference-writer@0.2.37

## 0.1.91

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- Updated dependencies [f13d1c2]
    - @sap-ux/project-access@1.33.2
    - @sap-ux/fiori-generator-shared@0.13.50
    - @sap-ux/telemetry@0.6.52
    - @sap-ux/ui5-library-reference-inquirer@0.4.91
    - @sap-ux/ui5-library-reference-writer@0.2.36

## 0.1.90

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/project-access@1.33.1
    - @sap-ux/fiori-generator-shared@0.13.49
    - @sap-ux/ui5-library-reference-inquirer@0.4.90
    - @sap-ux/telemetry@0.6.51
    - @sap-ux/ui5-library-reference-writer@0.2.35

## 0.1.89

_Released: 2026-01-08T17:12:17Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.48
- @sap-ux/ui5-library-reference-inquirer@0.4.89

## 0.1.88

_Released: 2026-01-07T10:20:40Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.88

## 0.1.87

_Released: 2026-01-06T14:37:31Z_

### Patch Changes

- Updated dependencies [03598eb]
    - @sap-ux/fiori-generator-shared@0.13.48
    - @sap-ux/ui5-library-reference-inquirer@0.4.87

## 0.1.86

_Released: 2026-01-05T14:16:22Z_

### Patch Changes

- 62bb798: set conflicter option
- Updated dependencies [62bb798]
    - @sap-ux/fiori-generator-shared@0.13.47
    - @sap-ux/ui5-library-reference-inquirer@0.4.86

## 0.1.85

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/project-access@1.33.0
    - @sap-ux/fiori-generator-shared@0.13.46
    - @sap-ux/telemetry@0.6.50
    - @sap-ux/ui5-library-reference-inquirer@0.4.85
    - @sap-ux/ui5-library-reference-writer@0.2.34

## 0.1.84

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/ui5-library-reference-inquirer@0.4.84
    - @sap-ux/project-access@1.32.17
    - @sap-ux/telemetry@0.6.49
    - @sap-ux/fiori-generator-shared@0.13.45
    - @sap-ux/ui5-library-reference-writer@0.2.33

## 0.1.83

_Released: 2025-12-18T13:13:52Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.83

## 0.1.82

_Released: 2025-12-18T08:56:52Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.44
- @sap-ux/ui5-library-reference-inquirer@0.4.82

## 0.1.81

_Released: 2025-12-16T11:43:52Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.44
- @sap-ux/telemetry@0.6.48
- @sap-ux/ui5-library-reference-inquirer@0.4.81

## 0.1.80

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/ui5-library-reference-inquirer@0.4.80
    - @sap-ux/ui5-library-reference-writer@0.2.32
    - @sap-ux/fiori-generator-shared@0.13.43
    - @sap-ux/feature-toggle@0.3.5
    - @sap-ux/project-access@1.32.16
    - @sap-ux/telemetry@0.6.47

## 0.1.79

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- Updated dependencies [7217d7d]
    - @sap-ux/project-access@1.32.15
    - @sap-ux/fiori-generator-shared@0.13.42
    - @sap-ux/telemetry@0.6.46
    - @sap-ux/ui5-library-reference-inquirer@0.4.79
    - @sap-ux/ui5-library-reference-writer@0.2.31

## 0.1.78

_Released: 2025-12-12T09:02:37Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.78

## 0.1.77

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- Updated dependencies [4bdced0]
    - @sap-ux/project-access@1.32.14
    - @sap-ux/fiori-generator-shared@0.13.41
    - @sap-ux/telemetry@0.6.45
    - @sap-ux/ui5-library-reference-inquirer@0.4.77
    - @sap-ux/ui5-library-reference-writer@0.2.30

## 0.1.76

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- Updated dependencies [985223a]
    - @sap-ux/project-access@1.32.13
    - @sap-ux/fiori-generator-shared@0.13.40
    - @sap-ux/telemetry@0.6.44
    - @sap-ux/ui5-library-reference-inquirer@0.4.76
    - @sap-ux/ui5-library-reference-writer@0.2.29

## 0.1.75

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- Updated dependencies [037a430]
    - @sap-ux/telemetry@0.6.43
    - @sap-ux/fiori-generator-shared@0.13.39
    - @sap-ux/ui5-library-reference-inquirer@0.4.75

## 0.1.74

_Released: 2025-12-05T12:18:49Z_

### Patch Changes

- Updated dependencies [d202c17]
    - @sap-ux/fiori-generator-shared@0.13.38
    - @sap-ux/ui5-library-reference-inquirer@0.4.74

## 0.1.73

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- Updated dependencies [45fe64e]
    - @sap-ux/project-access@1.32.12
    - @sap-ux/fiori-generator-shared@0.13.37
    - @sap-ux/telemetry@0.6.42
    - @sap-ux/ui5-library-reference-inquirer@0.4.73
    - @sap-ux/ui5-library-reference-writer@0.2.28

## 0.1.72

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- Updated dependencies [07725fe]
    - @sap-ux/project-access@1.32.11
    - @sap-ux/fiori-generator-shared@0.13.36
    - @sap-ux/telemetry@0.6.41
    - @sap-ux/ui5-library-reference-inquirer@0.4.72
    - @sap-ux/ui5-library-reference-writer@0.2.27

## 0.1.71

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.35
- @sap-ux/project-access@1.32.10
- @sap-ux/telemetry@0.6.40
- @sap-ux/ui5-library-reference-writer@0.2.26
- @sap-ux/ui5-library-reference-inquirer@0.4.71

## 0.1.70

_Released: 2025-11-26T12:17:21Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.70

## 0.1.69

_Released: 2025-11-26T00:12:42Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.69

## 0.1.68

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- Updated dependencies [7c09c8e]
- Updated dependencies [1c13c9c]
    - @sap-ux/project-access@1.32.9
    - @sap-ux/fiori-generator-shared@0.13.34
    - @sap-ux/telemetry@0.6.39
    - @sap-ux/ui5-library-reference-inquirer@0.4.68
    - @sap-ux/ui5-library-reference-writer@0.2.25

## 0.1.67

_Released: 2025-11-07T13:23:57Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.67

## 0.1.66

_Released: 2025-11-06T15:12:51Z_

### Patch Changes

- Updated dependencies [56235f8]
    - @sap-ux/telemetry@0.6.38
    - @sap-ux/fiori-generator-shared@0.13.33
    - @sap-ux/ui5-library-reference-inquirer@0.4.66

## 0.1.65

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/ui5-library-reference-inquirer@0.4.65
    - @sap-ux/ui5-library-reference-writer@0.2.24
    - @sap-ux/fiori-generator-shared@0.13.32
    - @sap-ux/feature-toggle@0.3.4
    - @sap-ux/project-access@1.32.8
    - @sap-ux/telemetry@0.6.37

## 0.1.64

_Released: 2025-11-03T10:50:00Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.64

## 0.1.63

_Released: 2025-10-31T13:35:34Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.31
- @sap-ux/telemetry@0.6.36
- @sap-ux/ui5-library-reference-inquirer@0.4.63

## 0.1.62

_Released: 2025-10-29T17:02:38Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.30
- @sap-ux/telemetry@0.6.35
- @sap-ux/ui5-library-reference-inquirer@0.4.62

## 0.1.61

_Released: 2025-10-29T11:04:17Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.29
- @sap-ux/telemetry@0.6.34
- @sap-ux/ui5-library-reference-inquirer@0.4.61

## 0.1.60

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- Updated dependencies [d895232]
    - @sap-ux/project-access@1.32.7
    - @sap-ux/fiori-generator-shared@0.13.28
    - @sap-ux/telemetry@0.6.33
    - @sap-ux/ui5-library-reference-inquirer@0.4.60
    - @sap-ux/ui5-library-reference-writer@0.2.23

## 0.1.59

_Released: 2025-10-22T18:56:41Z_

### Patch Changes

- Updated dependencies [fa9580c]
    - @sap-ux/feature-toggle@0.3.3
    - @sap-ux/fiori-generator-shared@0.13.27
    - @sap-ux/ui5-library-reference-inquirer@0.4.59

## 0.1.58

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- Updated dependencies [ea0a942]
    - @sap-ux/project-access@1.32.6
    - @sap-ux/fiori-generator-shared@0.13.27
    - @sap-ux/telemetry@0.6.32
    - @sap-ux/ui5-library-reference-inquirer@0.4.58
    - @sap-ux/ui5-library-reference-writer@0.2.22

## 0.1.57

_Released: 2025-10-21T09:37:06Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.57

## 0.1.56

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- Updated dependencies [c5d7915]
    - @sap-ux/project-access@1.32.5
    - @sap-ux/fiori-generator-shared@0.13.26
    - @sap-ux/telemetry@0.6.31
    - @sap-ux/ui5-library-reference-inquirer@0.4.56
    - @sap-ux/ui5-library-reference-writer@0.2.21

## 0.1.55

_Released: 2025-10-17T11:37:38Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.25
- @sap-ux/telemetry@0.6.30
- @sap-ux/ui5-library-reference-inquirer@0.4.55

## 0.1.54

_Released: 2025-10-17T09:45:11Z_

### Patch Changes

- Updated dependencies [d4dabbd]
    - @sap-ux/fiori-generator-shared@0.13.24
    - @sap-ux/ui5-library-reference-inquirer@0.4.54

## 0.1.53

_Released: 2025-10-15T16:45:46Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.53

## 0.1.52

_Released: 2025-10-14T13:22:30Z_

### Patch Changes

- Updated dependencies [bacaf93]
    - @sap-ux/fiori-generator-shared@0.13.23
    - @sap-ux/feature-toggle@0.3.2
    - @sap-ux/telemetry@0.6.29
    - @sap-ux/ui5-library-reference-inquirer@0.4.52

## 0.1.51

_Released: 2025-10-10T13:53:56Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.51

## 0.1.50

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- @sap-ux/project-access@1.32.4
- @sap-ux/telemetry@0.6.28
- @sap-ux/ui5-library-reference-writer@0.2.20
- @sap-ux/fiori-generator-shared@0.13.22
- @sap-ux/ui5-library-reference-inquirer@0.4.50

## 0.1.49

_Released: 2025-10-10T09:39:17Z_

### Patch Changes

- Updated dependencies [e015869]
    - @sap-ux/ui5-library-reference-inquirer@0.4.49

## 0.1.48

_Released: 2025-10-07T13:15:25Z_

### Patch Changes

- @sap-ux/telemetry@0.6.27
- @sap-ux/fiori-generator-shared@0.13.21
- @sap-ux/ui5-library-reference-inquirer@0.4.48

## 0.1.47

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/ui5-library-reference-inquirer@0.4.47
    - @sap-ux/ui5-library-reference-writer@0.2.19
    - @sap-ux/fiori-generator-shared@0.13.20
    - @sap-ux/project-access@1.32.3
    - @sap-ux/telemetry@0.6.26

## 0.1.46

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- @sap-ux/project-access@1.32.2
- @sap-ux/telemetry@0.6.25
- @sap-ux/ui5-library-reference-writer@0.2.18
- @sap-ux/fiori-generator-shared@0.13.19
- @sap-ux/ui5-library-reference-inquirer@0.4.46

## 0.1.45

_Released: 2025-09-23T20:14:56Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.18
- @sap-ux/telemetry@0.6.24
- @sap-ux/ui5-library-reference-inquirer@0.4.45

## 0.1.44

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- Updated dependencies [9872384]
    - @sap-ux/telemetry@0.6.23
    - @sap-ux/fiori-generator-shared@0.13.17
    - @sap-ux/ui5-library-reference-inquirer@0.4.44
    - @sap-ux/project-access@1.32.1
    - @sap-ux/ui5-library-reference-writer@0.2.17

## 0.1.43

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- Updated dependencies [f9b4afe]
    - @sap-ux/project-access@1.32.0
    - @sap-ux/fiori-generator-shared@0.13.16
    - @sap-ux/telemetry@0.6.22
    - @sap-ux/ui5-library-reference-inquirer@0.4.43
    - @sap-ux/ui5-library-reference-writer@0.2.16

## 0.1.42

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- Updated dependencies [c385a76]
    - @sap-ux/project-access@1.31.0
    - @sap-ux/fiori-generator-shared@0.13.15
    - @sap-ux/telemetry@0.6.21
    - @sap-ux/ui5-library-reference-inquirer@0.4.42
    - @sap-ux/ui5-library-reference-writer@0.2.15

## 0.1.41

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- @sap-ux/project-access@1.30.14
- @sap-ux/telemetry@0.6.20
- @sap-ux/ui5-library-reference-writer@0.2.14
- @sap-ux/fiori-generator-shared@0.13.14
- @sap-ux/ui5-library-reference-inquirer@0.4.41

## 0.1.40

_Released: 2025-09-11T11:04:24Z_

### Patch Changes

- Updated dependencies [3c094af]
    - @sap-ux/fiori-generator-shared@0.13.13
    - @sap-ux/ui5-library-reference-inquirer@0.4.40

## 0.1.39

_Released: 2025-09-02T13:22:05Z_

### Patch Changes

- Updated dependencies [04d2103]
    - @sap-ux/feature-toggle@0.3.1
    - @sap-ux/fiori-generator-shared@0.13.12
    - @sap-ux/ui5-library-reference-inquirer@0.4.39

## 0.1.38

_Released: 2025-09-01T12:06:20Z_

### Patch Changes

- @sap-ux/telemetry@0.6.19
- @sap-ux/fiori-generator-shared@0.13.12
- @sap-ux/ui5-library-reference-inquirer@0.4.38

## 0.1.37

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- Updated dependencies [4cfebaf]
    - @sap-ux/telemetry@0.6.18
    - @sap-ux/fiori-generator-shared@0.13.11
    - @sap-ux/ui5-library-reference-inquirer@0.4.37
    - @sap-ux/project-access@1.30.13
    - @sap-ux/ui5-library-reference-writer@0.2.13

## 0.1.36

_Released: 2025-08-21T14:27:46Z_

### Patch Changes

- @sap-ux/telemetry@0.6.17
- @sap-ux/fiori-generator-shared@0.13.10
- @sap-ux/ui5-library-reference-inquirer@0.4.36

## 0.1.35

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- @sap-ux/project-access@1.30.12
- @sap-ux/telemetry@0.6.16
- @sap-ux/ui5-library-reference-writer@0.2.12
- @sap-ux/fiori-generator-shared@0.13.9
- @sap-ux/ui5-library-reference-inquirer@0.4.35

## 0.1.34

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/project-access@1.30.11
- @sap-ux/fiori-generator-shared@0.13.8
- @sap-ux/telemetry@0.6.15
- @sap-ux/ui5-library-reference-inquirer@0.4.34
- @sap-ux/ui5-library-reference-writer@0.2.11

## 0.1.33

_Released: 2025-08-12T14:05:27Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.33

## 0.1.32

_Released: 2025-08-07T06:27:29Z_

### Patch Changes

- Updated dependencies [18a5ee2]
    - @sap-ux/telemetry@0.6.14
    - @sap-ux/fiori-generator-shared@0.13.7
    - @sap-ux/ui5-library-reference-inquirer@0.4.32

## 0.1.31

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- @sap-ux/project-access@1.30.10
- @sap-ux/telemetry@0.6.13
- @sap-ux/ui5-library-reference-writer@0.2.10
- @sap-ux/fiori-generator-shared@0.13.6
- @sap-ux/ui5-library-reference-inquirer@0.4.31

## 0.1.30

_Released: 2025-07-31T11:23:22Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.30

## 0.1.29

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.9
- @sap-ux/fiori-generator-shared@0.13.5
- @sap-ux/telemetry@0.6.12
- @sap-ux/ui5-library-reference-inquirer@0.4.29
- @sap-ux/ui5-library-reference-writer@0.2.9

## 0.1.28

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- Updated dependencies [4e0bd83]
    - @sap-ux/project-access@1.30.8
    - @sap-ux/fiori-generator-shared@0.13.4
    - @sap-ux/telemetry@0.6.11
    - @sap-ux/ui5-library-reference-inquirer@0.4.28
    - @sap-ux/ui5-library-reference-writer@0.2.8

## 0.1.27

_Released: 2025-07-22T13:05:35Z_

### Patch Changes

- Updated dependencies [ca44076]
    - @sap-ux/fiori-generator-shared@0.13.3
    - @sap-ux/ui5-library-reference-inquirer@0.4.27

## 0.1.26

_Released: 2025-07-21T13:01:41Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.26

## 0.1.25

_Released: 2025-07-16T12:23:18Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.25

## 0.1.24

_Released: 2025-07-10T11:49:34Z_

### Patch Changes

- Updated dependencies [d75db00]
    - @sap-ux/fiori-generator-shared@0.13.2
    - @sap-ux/ui5-library-reference-inquirer@0.4.24

## 0.1.23

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- Updated dependencies [58cdce6]
    - @sap-ux/project-access@1.30.7
    - @sap-ux/fiori-generator-shared@0.13.1
    - @sap-ux/telemetry@0.6.10
    - @sap-ux/ui5-library-reference-inquirer@0.4.23
    - @sap-ux/ui5-library-reference-writer@0.2.7

## 0.1.22

_Released: 2025-07-07T08:44:59Z_

### Patch Changes

- Updated dependencies [58abe82]
    - @sap-ux/fiori-generator-shared@0.13.0
    - @sap-ux/ui5-library-reference-inquirer@0.4.22

## 0.1.21

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- 69f62ec: i18next upgrade to 25.3.0
- Updated dependencies [69f62ec]
    - @sap-ux/ui5-library-reference-inquirer@0.4.21
    - @sap-ux/fiori-generator-shared@0.12.16
    - @sap-ux/telemetry@0.6.9

## 0.1.20

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- @sap-ux/project-access@1.30.6
- @sap-ux/telemetry@0.6.8
- @sap-ux/ui5-library-reference-writer@0.2.6
- @sap-ux/fiori-generator-shared@0.12.15
- @sap-ux/ui5-library-reference-inquirer@0.4.20

## 0.1.19

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- Updated dependencies [7a4543e]
    - @sap-ux/project-access@1.30.5
    - @sap-ux/fiori-generator-shared@0.12.14
    - @sap-ux/telemetry@0.6.7
    - @sap-ux/ui5-library-reference-inquirer@0.4.19
    - @sap-ux/ui5-library-reference-writer@0.2.5

## 0.1.18

_Released: 2025-06-30T08:46:50Z_

### Patch Changes

- b9675bb: Improve Fiori Tools UI Texts
- Updated dependencies [b9675bb]
    - @sap-ux/ui5-library-reference-inquirer@0.4.18
    - @sap-ux/fiori-generator-shared@0.12.13

## 0.1.17

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- Updated dependencies [f75b89d]
    - @sap-ux/project-access@1.30.4
    - @sap-ux/fiori-generator-shared@0.12.12
    - @sap-ux/telemetry@0.6.6
    - @sap-ux/ui5-library-reference-inquirer@0.4.17
    - @sap-ux/ui5-library-reference-writer@0.2.4

## 0.1.16

_Released: 2025-06-27T07:08:06Z_

### Patch Changes

- @sap-ux/telemetry@0.6.5
- @sap-ux/fiori-generator-shared@0.12.11
- @sap-ux/ui5-library-reference-inquirer@0.4.16

## 0.1.15

_Released: 2025-06-24T14:02:12Z_

### Patch Changes

- Updated dependencies [4fef16a]
    - @sap-ux/fiori-generator-shared@0.12.10
    - @sap-ux/ui5-library-reference-inquirer@0.4.15

## 0.1.14

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.3
- @sap-ux/fiori-generator-shared@0.12.9
- @sap-ux/telemetry@0.6.4
- @sap-ux/ui5-library-reference-inquirer@0.4.14
- @sap-ux/ui5-library-reference-writer@0.2.3

## 0.1.13

_Released: 2025-06-17T07:58:40Z_

### Patch Changes

- Updated dependencies [163522f]
    - @sap-ux/fiori-generator-shared@0.12.8
    - @sap-ux/ui5-library-reference-inquirer@0.4.13

## 0.1.12

_Released: 2025-06-16T09:52:52Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.12

## 0.1.11

_Released: 2025-06-13T14:12:57Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.11

## 0.1.10

_Released: 2025-06-13T10:58:52Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.10

## 0.1.9

_Released: 2025-06-10T07:40:27Z_

### Patch Changes

- Updated dependencies [4e6c22e]
    - @sap-ux/fiori-generator-shared@0.12.7
    - @sap-ux/ui5-library-reference-inquirer@0.4.9

## 0.1.8

_Released: 2025-06-09T09:48:34Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.8

## 0.1.7

_Released: 2025-06-05T12:32:35Z_

### Patch Changes

- Updated dependencies [95a816d]
    - @sap-ux/fiori-generator-shared@0.12.6
    - @sap-ux/ui5-library-reference-inquirer@0.4.7

## 0.1.6

_Released: 2025-06-05T07:23:07Z_

### Patch Changes

- Updated dependencies [15ec5c4]
    - @sap-ux/fiori-generator-shared@0.12.5
    - @sap-ux/ui5-library-reference-inquirer@0.4.6

## 0.1.5

_Released: 2025-05-30T09:02:15Z_

### Patch Changes

- Updated dependencies [91726b0]
    - @sap-ux/fiori-generator-shared@0.12.4
    - @sap-ux/ui5-library-reference-inquirer@0.4.5

## 0.1.4

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- @sap-ux/project-access@1.30.2
- @sap-ux/telemetry@0.6.3
- @sap-ux/ui5-library-reference-writer@0.2.2
- @sap-ux/fiori-generator-shared@0.12.3
- @sap-ux/ui5-library-reference-inquirer@0.4.4

## 0.1.3

_Released: 2025-05-27T17:59:17Z_

### Patch Changes

- Updated dependencies [ac55cca]
    - @sap-ux/fiori-generator-shared@0.12.2
    - @sap-ux/telemetry@0.6.2
    - @sap-ux/ui5-library-reference-inquirer@0.4.3

## 0.1.2

_Released: 2025-05-27T15:05:11Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.4.2

## 0.1.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- @sap-ux/project-access@1.30.1
- @sap-ux/telemetry@0.6.1
- @sap-ux/ui5-library-reference-writer@0.2.1
- @sap-ux/ui5-library-reference-inquirer@0.4.1
- @sap-ux/fiori-generator-shared@0.12.1

## 0.1.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/ui5-library-reference-inquirer@0.4.0
    - @sap-ux/ui5-library-reference-writer@0.2.0
    - @sap-ux/fiori-generator-shared@0.12.0
    - @sap-ux/feature-toggle@0.3.0
    - @sap-ux/project-access@1.30.0
    - @sap-ux/telemetry@0.6.0

## 0.0.64

_Released: 2025-05-13T10:46:10Z_

### Patch Changes

- Updated dependencies [5585f0d]
    - @sap-ux/feature-toggle@0.2.4
    - @sap-ux/ui5-library-reference-inquirer@0.3.104

## 0.0.63

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- Updated dependencies [ea0e2c0]
    - @sap-ux/project-access@1.29.22
    - @sap-ux/fiori-generator-shared@0.11.3
    - @sap-ux/telemetry@0.5.78
    - @sap-ux/ui5-library-reference-inquirer@0.3.103
    - @sap-ux/ui5-library-reference-writer@0.1.61

## 0.0.62

_Released: 2025-05-01T13:52:16Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.102

## 0.0.61

_Released: 2025-04-28T14:29:23Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.101

## 0.0.60

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- @sap-ux/project-access@1.29.21
- @sap-ux/telemetry@0.5.77
- @sap-ux/ui5-library-reference-writer@0.1.60
- @sap-ux/fiori-generator-shared@0.11.2
- @sap-ux/ui5-library-reference-inquirer@0.3.100

## 0.0.59

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- Updated dependencies [294bbe3]
    - @sap-ux/project-access@1.29.20
    - @sap-ux/fiori-generator-shared@0.11.1
    - @sap-ux/telemetry@0.5.76
    - @sap-ux/ui5-library-reference-inquirer@0.3.99
    - @sap-ux/ui5-library-reference-writer@0.1.59

## 0.0.58

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- Updated dependencies [1ca4004]
    - @sap-ux/fiori-generator-shared@0.11.0
    - @sap-ux/project-access@1.29.19
    - @sap-ux/telemetry@0.5.75
    - @sap-ux/ui5-library-reference-writer@0.1.58
    - @sap-ux/ui5-library-reference-inquirer@0.3.98

## 0.0.57

_Released: 2025-04-17T12:52:13Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.97

## 0.0.56

_Released: 2025-04-15T10:10:52Z_

### Patch Changes

- Updated dependencies [9392ebd]
    - @sap-ux/telemetry@0.5.74
    - @sap-ux/fiori-generator-shared@0.10.2
    - @sap-ux/ui5-library-reference-inquirer@0.3.96

## 0.0.55

_Released: 2025-04-14T22:24:07Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.10.1
- @sap-ux/telemetry@0.5.73
- @sap-ux/ui5-library-reference-inquirer@0.3.95

## 0.0.54

_Released: 2025-04-10T13:52:38Z_

### Patch Changes

- Updated dependencies [23e055a]
    - @sap-ux/fiori-generator-shared@0.10.0
    - @sap-ux/ui5-library-reference-inquirer@0.3.94

## 0.0.53

_Released: 2025-03-26T12:15:41Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.93

## 0.0.52

_Released: 2025-03-19T08:54:25Z_

### Patch Changes

- Updated dependencies [c3ebc82]
    - @sap-ux/project-access@1.29.18
    - @sap-ux/fiori-generator-shared@0.9.11
    - @sap-ux/telemetry@0.5.72
    - @sap-ux/ui5-library-reference-inquirer@0.3.92
    - @sap-ux/ui5-library-reference-writer@0.1.57

## 0.0.51

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- @sap-ux/project-access@1.29.17
- @sap-ux/telemetry@0.5.71
- @sap-ux/ui5-library-reference-writer@0.1.56
- @sap-ux/fiori-generator-shared@0.9.10
- @sap-ux/ui5-library-reference-inquirer@0.3.91

## 0.0.50

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- Updated dependencies [011c8c5]
    - @sap-ux/telemetry@0.5.70
    - @sap-ux/fiori-generator-shared@0.9.9
    - @sap-ux/ui5-library-reference-inquirer@0.3.90
    - @sap-ux/project-access@1.29.16
    - @sap-ux/ui5-library-reference-writer@0.1.55

## 0.0.49

_Released: 2025-03-06T16:16:20Z_

### Patch Changes

- Updated dependencies [1ce7fe9]
    - @sap-ux/project-access@1.29.15
    - @sap-ux/fiori-generator-shared@0.9.8
    - @sap-ux/telemetry@0.5.69
    - @sap-ux/ui5-library-reference-inquirer@0.3.89
    - @sap-ux/ui5-library-reference-writer@0.1.54

## 0.0.48

_Released: 2025-03-05T11:16:53Z_

### Patch Changes

- Updated dependencies [3cc8f8a]
    - @sap-ux/project-access@1.29.14
    - @sap-ux/fiori-generator-shared@0.9.7
    - @sap-ux/telemetry@0.5.68
    - @sap-ux/ui5-library-reference-inquirer@0.3.88
    - @sap-ux/ui5-library-reference-writer@0.1.53

## 0.0.47

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- @sap-ux/project-access@1.29.13
- @sap-ux/telemetry@0.5.67
- @sap-ux/ui5-library-reference-writer@0.1.52
- @sap-ux/fiori-generator-shared@0.9.6
- @sap-ux/ui5-library-reference-inquirer@0.3.87

## 0.0.46

_Released: 2025-03-04T08:55:15Z_

### Patch Changes

- @sap-ux/project-access@1.29.12
- @sap-ux/fiori-generator-shared@0.9.5
- @sap-ux/telemetry@0.5.66
- @sap-ux/ui5-library-reference-inquirer@0.3.86
- @sap-ux/ui5-library-reference-writer@0.1.51

## 0.0.45

_Released: 2025-03-03T11:06:12Z_

### Patch Changes

- Updated dependencies [d47a1b1]
    - @sap-ux/fiori-generator-shared@0.9.4
    - @sap-ux/ui5-library-reference-inquirer@0.3.85

## 0.0.44

_Released: 2025-02-28T15:10:48Z_

### Patch Changes

- Updated dependencies [0f35b4b]
    - @sap-ux/project-access@1.29.11
    - @sap-ux/fiori-generator-shared@0.9.3
    - @sap-ux/telemetry@0.5.65
    - @sap-ux/ui5-library-reference-inquirer@0.3.84
    - @sap-ux/ui5-library-reference-writer@0.1.50

## 0.0.43

_Released: 2025-02-27T19:24:50Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.83

## 0.0.42

_Released: 2025-02-27T14:15:03Z_

### Patch Changes

- Updated dependencies [4b8577f]
    - @sap-ux/telemetry@0.5.64
    - @sap-ux/fiori-generator-shared@0.9.2
    - @sap-ux/project-access@1.29.10
    - @sap-ux/ui5-library-reference-inquirer@0.3.82
    - @sap-ux/ui5-library-reference-writer@0.1.49

## 0.0.41

_Released: 2025-02-27T08:22:17Z_

### Patch Changes

- Updated dependencies [c8c292c]
    - @sap-ux/project-access@1.29.9
    - @sap-ux/fiori-generator-shared@0.9.1
    - @sap-ux/telemetry@0.5.63
    - @sap-ux/ui5-library-reference-inquirer@0.3.81
    - @sap-ux/ui5-library-reference-writer@0.1.48

## 0.0.40

_Released: 2025-02-24T09:17:17Z_

### Patch Changes

- Updated dependencies [fffc3a7]
    - @sap-ux/fiori-generator-shared@0.9.0
    - @sap-ux/ui5-library-reference-inquirer@0.3.80

## 0.0.39

_Released: 2025-02-17T13:42:22Z_

### Patch Changes

- Updated dependencies [c50e09f]
    - @sap-ux/project-access@1.29.8
    - @sap-ux/fiori-generator-shared@0.8.1
    - @sap-ux/telemetry@0.5.62
    - @sap-ux/ui5-library-reference-inquirer@0.3.79
    - @sap-ux/ui5-library-reference-writer@0.1.47

## 0.0.38

_Released: 2025-02-13T17:39:11Z_

### Patch Changes

- Updated dependencies [fb4e328]
    - @sap-ux/fiori-generator-shared@0.8.0
    - @sap-ux/ui5-library-reference-inquirer@0.3.78

## 0.0.37

_Released: 2025-02-13T10:58:34Z_

### Patch Changes

- Updated dependencies [2c0d657]
    - @sap-ux/project-access@1.29.7
    - @sap-ux/fiori-generator-shared@0.7.29
    - @sap-ux/telemetry@0.5.61
    - @sap-ux/ui5-library-reference-inquirer@0.3.77
    - @sap-ux/ui5-library-reference-writer@0.1.46

## 0.0.36

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- @sap-ux/project-access@1.29.6
- @sap-ux/telemetry@0.5.60
- @sap-ux/ui5-library-reference-writer@0.1.45
- @sap-ux/fiori-generator-shared@0.7.28
- @sap-ux/ui5-library-reference-inquirer@0.3.76

## 0.0.35

_Released: 2025-02-05T17:08:20Z_

### Patch Changes

- @sap-ux/project-access@1.29.5
- @sap-ux/fiori-generator-shared@0.7.27
- @sap-ux/telemetry@0.5.59
- @sap-ux/ui5-library-reference-inquirer@0.3.75
- @sap-ux/ui5-library-reference-writer@0.1.44

## 0.0.34

_Released: 2025-02-05T14:44:29Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.26
- @sap-ux/telemetry@0.5.58
- @sap-ux/ui5-library-reference-inquirer@0.3.74

## 0.0.33

_Released: 2025-02-04T15:39:07Z_

### Patch Changes

- Updated dependencies [29abc73]
    - @sap-ux/project-access@1.29.4
    - @sap-ux/fiori-generator-shared@0.7.25
    - @sap-ux/telemetry@0.5.57
    - @sap-ux/ui5-library-reference-inquirer@0.3.73
    - @sap-ux/ui5-library-reference-writer@0.1.43

## 0.0.32

_Released: 2025-02-04T14:25:43Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.24
- @sap-ux/telemetry@0.5.56
- @sap-ux/ui5-library-reference-inquirer@0.3.72

## 0.0.31

_Released: 2025-01-30T10:04:50Z_

### Patch Changes

- Updated dependencies [096b021]
    - @sap-ux/project-access@1.29.3
    - @sap-ux/fiori-generator-shared@0.7.23
    - @sap-ux/telemetry@0.5.55
    - @sap-ux/ui5-library-reference-inquirer@0.3.71
    - @sap-ux/ui5-library-reference-writer@0.1.42

## 0.0.30

_Released: 2025-01-29T17:41:08Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.70

## 0.0.29

_Released: 2025-01-29T13:31:31Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.22
- @sap-ux/telemetry@0.5.54
- @sap-ux/ui5-library-reference-inquirer@0.3.69

## 0.0.28

_Released: 2025-01-28T09:20:06Z_

### Patch Changes

- Updated dependencies [93ef8c1]
    - @sap-ux/project-access@1.29.2
    - @sap-ux/fiori-generator-shared@0.7.21
    - @sap-ux/telemetry@0.5.53
    - @sap-ux/ui5-library-reference-inquirer@0.3.68
    - @sap-ux/ui5-library-reference-writer@0.1.41

## 0.0.27

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- @sap-ux/project-access@1.29.1
- @sap-ux/telemetry@0.5.52
- @sap-ux/ui5-library-reference-writer@0.1.40
- @sap-ux/fiori-generator-shared@0.7.20
- @sap-ux/ui5-library-reference-inquirer@0.3.67

## 0.0.26

_Released: 2025-01-22T17:11:37Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.66

## 0.0.25

_Released: 2025-01-16T02:22:29Z_

### Patch Changes

- Updated dependencies [88bf030]
    - @sap-ux/project-access@1.29.0
    - @sap-ux/fiori-generator-shared@0.7.19
    - @sap-ux/telemetry@0.5.51
    - @sap-ux/ui5-library-reference-inquirer@0.3.65
    - @sap-ux/ui5-library-reference-writer@0.1.39

## 0.0.24

_Released: 2025-01-08T15:30:03Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.64

## 0.0.23

_Released: 2025-01-08T11:51:44Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.63

## 0.0.22

_Released: 2024-12-20T15:43:15Z_

### Patch Changes

- Updated dependencies [fe0878d]
    - @sap-ux/fiori-generator-shared@0.7.18
    - @sap-ux/ui5-library-reference-inquirer@0.3.62

## 0.0.21

_Released: 2024-12-19T17:24:19Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.61

## 0.0.20

_Released: 2024-12-18T10:32:41Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.60

## 0.0.19

_Released: 2024-12-17T15:31:53Z_

### Patch Changes

- Updated dependencies [e1edcd7]
    - @sap-ux/project-access@1.28.10
    - @sap-ux/fiori-generator-shared@0.7.17
    - @sap-ux/telemetry@0.5.50
    - @sap-ux/ui5-library-reference-inquirer@0.3.59
    - @sap-ux/ui5-library-reference-writer@0.1.38

## 0.0.18

_Released: 2024-12-17T13:32:02Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.16
- @sap-ux/telemetry@0.5.49
- @sap-ux/ui5-library-reference-inquirer@0.3.58

## 0.0.17

_Released: 2024-12-10T16:04:29Z_

### Patch Changes

- @sap-ux/telemetry@0.5.48
- @sap-ux/fiori-generator-shared@0.7.15
- @sap-ux/ui5-library-reference-inquirer@0.3.57

## 0.0.16

_Released: 2024-12-10T14:32:00Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.56

## 0.0.15

_Released: 2024-12-10T11:51:29Z_

### Patch Changes

- Updated dependencies [1bb4d48]
    - @sap-ux/fiori-generator-shared@0.7.14
    - @sap-ux/ui5-library-reference-inquirer@0.3.55

## 0.0.14

_Released: 2024-12-06T21:07:01Z_

### Patch Changes

- Updated dependencies [e93797a]
    - @sap-ux/project-access@1.28.9
    - @sap-ux/fiori-generator-shared@0.7.13
    - @sap-ux/telemetry@0.5.47
    - @sap-ux/ui5-library-reference-inquirer@0.3.54
    - @sap-ux/ui5-library-reference-writer@0.1.37

## 0.0.13

_Released: 2024-12-04T15:30:32Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.53

## 0.0.12

_Released: 2024-12-04T12:27:41Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.52
- @sap-ux/fiori-generator-shared@0.7.12
- @sap-ux/telemetry@0.5.46

## 0.0.11

_Released: 2024-12-04T11:05:53Z_

### Patch Changes

- Updated dependencies [d04a40e]
    - @sap-ux/feature-toggle@0.2.3
    - @sap-ux/ui5-library-reference-inquirer@0.3.51

## 0.0.10

_Released: 2024-12-02T16:28:38Z_

### Patch Changes

- @sap-ux/project-access@1.28.8
- @sap-ux/telemetry@0.5.45
- @sap-ux/ui5-library-reference-writer@0.1.36
- @sap-ux/fiori-generator-shared@0.7.11
- @sap-ux/ui5-library-reference-inquirer@0.3.50

## 0.0.9

_Released: 2024-11-21T11:48:14Z_

### Patch Changes

- @sap-ux/ui5-library-reference-inquirer@0.3.49

## 0.0.8

_Released: 2024-11-19T13:21:01Z_

### Patch Changes

- Updated dependencies [575ff89]
    - @sap-ux/fiori-generator-shared@0.7.10
    - @sap-ux/ui5-library-reference-inquirer@0.3.48

## 0.0.7

_Released: 2024-11-18T22:28:16Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.9
- @sap-ux/telemetry@0.5.44
- @sap-ux/ui5-library-reference-inquirer@0.3.47

## 0.0.6

_Released: 2024-11-18T20:38:37Z_

### Patch Changes

- @sap-ux/project-access@1.28.7
- @sap-ux/telemetry@0.5.43
- @sap-ux/ui5-library-reference-writer@0.1.35
- @sap-ux/fiori-generator-shared@0.7.8
- @sap-ux/ui5-library-reference-inquirer@0.3.46

## 0.0.5

_Released: 2024-11-14T17:04:56Z_

### Patch Changes

- Updated dependencies [2886db3]
    - @sap-ux/fiori-generator-shared@0.7.7
    - @sap-ux/ui5-library-reference-inquirer@0.3.45

## 0.0.4

_Released: 2024-11-11T17:55:13Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.6
- @sap-ux/telemetry@0.5.42

## 0.0.3

_Released: 2024-11-08T08:58:34Z_

### Patch Changes

- Updated dependencies [fb26f92]
    - @sap-ux/project-access@1.28.6
    - @sap-ux/fiori-generator-shared@0.7.5
    - @sap-ux/telemetry@0.5.41
    - @sap-ux/ui5-library-reference-inquirer@0.3.44
    - @sap-ux/ui5-library-reference-writer@0.1.34

## 0.0.2

_Released: 2024-11-05T21:46:19Z_

### Patch Changes

- @sap-ux/project-access@1.28.5
- @sap-ux/telemetry@0.5.40
- @sap-ux/ui5-library-reference-writer@0.1.33
- @sap-ux/fiori-generator-shared@0.7.4
- @sap-ux/ui5-library-reference-inquirer@0.3.43

## 0.0.1

_Released: 2024-12-02T16:28:38Z_

### Patch Changes

- 5a68903: adds new reference library sub generator
- Updated dependencies [5a68903]
    - @sap-ux/fiori-generator-shared@0.7.3
    - @sap-ux/project-access@1.28.4
    - @sap-ux/telemetry@0.5.39
    - @sap-ux/ui5-library-reference-inquirer@0.3.42
    - @sap-ux/ui5-library-reference-writer@0.1.32
