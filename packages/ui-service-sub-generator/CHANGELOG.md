# @sap-ux/ui-service-sub-generator

## 1.0.12

*Released: 2026-06-16T21:19:36Z*

### Patch Changes

#### Workspace Updates

- @sap-ux/ui-service-inquirer 1.0.11 → 1.0.12

## 1.0.11

*Released: 2026-06-12T06:53:23Z*

### Patch Changes

- Updated dependencies [41b3908]
    - @sap-ux/feature-toggle@1.0.2
    - @sap-ux/axios-extension@2.0.3
    - @sap-ux/inquirer-common@1.0.11
    - @sap-ux/fiori-generator-shared@1.0.11
    - @sap-ux/system-access@1.0.3
    - @sap-ux/ui-service-inquirer@1.0.11

## 1.0.10

*Released: 2026-06-11T10:54:17Z*

### Patch Changes

- Updated dependencies [7bfa518]
    - @sap-ux/telemetry@1.0.9
    - @sap-ux/fiori-generator-shared@1.0.10
    - @sap-ux/inquirer-common@1.0.10
    - @sap-ux/ui-service-inquirer@1.0.10

## 1.0.9

*Released: 2026-06-10T09:57:42Z*

### Patch Changes

- @sap-ux/telemetry@1.0.8
- @sap-ux/ui-service-inquirer@1.0.9
- @sap-ux/inquirer-common@1.0.9
- @sap-ux/axios-extension@2.0.2
- @sap-ux/fiori-generator-shared@1.0.9
- @sap-ux/system-access@1.0.2

## 1.0.8

*Released: 2026-06-09T14:35:01Z*

### Patch Changes

- Updated dependencies [0fa8305]
    - @sap-ux/btp-utils@2.0.2
    - @sap-ux/axios-extension@2.0.2
    - @sap-ux/fiori-generator-shared@1.0.8
    - @sap-ux/inquirer-common@1.0.8
    - @sap-ux/system-access@1.0.2
    - @sap-ux/telemetry@1.0.7
    - @sap-ux/ui-service-inquirer@1.0.8

## 1.0.7

*Released: 2026-06-09T13:18:16Z*

### Patch Changes

- Updated dependencies [a328e14]
    - @sap-ux/fiori-generator-shared@1.0.7
    - @sap-ux/inquirer-common@1.0.7
    - @sap-ux/ui-service-inquirer@1.0.7

## 1.0.6

*Released: 2026-06-04T13:54:21Z*

### Patch Changes

- @sap-ux/axios-extension@2.0.1
- @sap-ux/fiori-generator-shared@1.0.6
- @sap-ux/inquirer-common@1.0.6
- @sap-ux/system-access@1.0.1
- @sap-ux/telemetry@1.0.6
- @sap-ux/ui-service-inquirer@1.0.6

## 1.0.5

*Released: 2026-06-04T10:19:37Z*

### Patch Changes

- @sap-ux/axios-extension@2.0.1
- @sap-ux/fiori-generator-shared@1.0.5
- @sap-ux/inquirer-common@1.0.5
- @sap-ux/system-access@1.0.1
- @sap-ux/telemetry@1.0.5
- @sap-ux/ui-service-inquirer@1.0.5

## 1.0.4

*Released: 2026-06-03T14:58:37Z*

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/fiori-generator-shared@1.0.4
    - @sap-ux/ui-service-inquirer@1.0.4
    - @sap-ux/axios-extension@2.0.1
    - @sap-ux/inquirer-common@1.0.4
    - @sap-ux/feature-toggle@1.0.1
    - @sap-ux/system-access@1.0.1
    - @sap-ux/btp-utils@2.0.1
    - @sap-ux/telemetry@1.0.4
    - @sap-ux/logger@1.0.1

## 1.0.3

*Released: 2026-06-03T13:52:44Z*

### Patch Changes

- @sap-ux/telemetry@1.0.3
- @sap-ux/ui-service-inquirer@1.0.3
- @sap-ux/inquirer-common@1.0.3
- @sap-ux/axios-extension@2.0.0
- @sap-ux/fiori-generator-shared@1.0.3
- @sap-ux/system-access@1.0.0

## 1.0.2

*Released: 2026-06-02T11:35:17Z*

### Patch Changes

- @sap-ux/telemetry@1.0.2
- @sap-ux/ui-service-inquirer@1.0.2
- @sap-ux/fiori-generator-shared@1.0.2
- @sap-ux/inquirer-common@1.0.2

## 1.0.1

*Released: 2026-06-01T15:15:26Z*

### Patch Changes

- @sap-ux/axios-extension@2.0.0
- @sap-ux/fiori-generator-shared@1.0.1
- @sap-ux/inquirer-common@1.0.1
- @sap-ux/system-access@1.0.0
- @sap-ux/telemetry@1.0.1
- @sap-ux/ui-service-inquirer@1.0.1

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
    - @sap-ux/fiori-generator-shared@1.0.0
    - @sap-ux/ui-service-inquirer@1.0.0
    - @sap-ux/axios-extension@2.0.0
    - @sap-ux/inquirer-common@1.0.0
    - @sap-ux/feature-toggle@1.0.0
    - @sap-ux/system-access@1.0.0
    - @sap-ux/btp-utils@2.0.0
    - @sap-ux/telemetry@1.0.0
    - @sap-ux/logger@1.0.0

## 0.2.8

*Released: 2026-05-29T12:50:34Z*

### Patch Changes

- @sap-ux/inquirer-common@0.13.6
- @sap-ux/ui-service-inquirer@0.3.8

## 0.2.7

*Released: 2026-05-27T11:39:21Z*

### Patch Changes

- @sap-ux/telemetry@0.7.5
- @sap-ux/ui-service-inquirer@0.3.7
- @sap-ux/fiori-generator-shared@0.15.6
- @sap-ux/inquirer-common@0.13.5

## 0.2.6

*Released: 2026-05-27T10:42:47Z*

### Patch Changes

- @sap-ux/fiori-generator-shared@0.15.5
- @sap-ux/system-access@0.8.2
- @sap-ux/telemetry@0.7.4
- @sap-ux/ui-service-inquirer@0.3.6
- @sap-ux/inquirer-common@0.13.4

## 0.2.5

*Released: 2026-05-26T16:40:21Z*

### Patch Changes

- 01b70ca: chore: upgrade @sap/service-provider-apis 2.8.0 → 2.10.0 (security: axios vulnerability)
- Updated dependencies [01b70ca]
- Updated dependencies [01b70ca]
    - @sap-ux/axios-extension@1.26.1
    - @sap-ux/btp-utils@1.2.1
    - @sap-ux/fiori-generator-shared@0.15.4
    - @sap-ux/system-access@0.8.1
    - @sap-ux/ui-service-inquirer@0.3.5
    - @sap-ux/inquirer-common@0.13.3
    - @sap-ux/telemetry@0.7.3

## 0.2.4

*Released: 2026-05-25T14:44:33Z*

### Patch Changes

- @sap-ux/ui-service-inquirer@0.3.4

## 0.2.3

*Released: 2026-05-21T16:21:11Z*

### Patch Changes

- @sap-ux/telemetry@0.7.2
- @sap-ux/ui-service-inquirer@0.3.3
- @sap-ux/inquirer-common@0.13.2
- @sap-ux/axios-extension@1.26.0
- @sap-ux/fiori-generator-shared@0.15.3
- @sap-ux/system-access@0.8.0

## 0.2.2

*Released: 2026-05-19T15:16:46Z*

### Patch Changes

- @sap-ux/axios-extension@1.26.0
- @sap-ux/fiori-generator-shared@0.15.2
- @sap-ux/inquirer-common@0.13.1
- @sap-ux/system-access@0.8.0
- @sap-ux/telemetry@0.7.1
- @sap-ux/ui-service-inquirer@0.3.2

## 0.2.1

*Released: 2026-05-15T13:12:06Z*

### Patch Changes

- 2c76f8f: chore: upgrade @sap-devx/yeoman-ui-types 1.23.0 → 1.25.0
- Updated dependencies [2c76f8f]
- Updated dependencies [2c76f8f]
- Updated dependencies [2c76f8f]
    - @sap-ux/fiori-generator-shared@0.15.1
    - @sap-ux/inquirer-common@0.13.0
    - @sap-ux/ui-service-inquirer@0.3.1

## 0.2.0

*Released: 2026-05-15T08:12:20Z*

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/axios-extension@1.26.0
    - @sap-ux/btp-utils@1.2.0
    - @sap-ux/feature-toggle@0.4.0
    - @sap-ux/fiori-generator-shared@0.15.0
    - @sap-ux/inquirer-common@0.12.0
    - @sap-ux/logger@0.9.0
    - @sap-ux/system-access@0.8.0
    - @sap-ux/telemetry@0.7.0
    - @sap-ux/ui-service-inquirer@0.3.0

## 0.1.237

*Released: 2026-05-14T21:28:41Z*

### Patch Changes

- @sap-ux/inquirer-common@0.11.48
- @sap-ux/ui-service-inquirer@0.2.174

## 0.1.236

*Released: 2026-05-14T11:45:51Z*

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/axios-extension@1.25.37
    - @sap-ux/btp-utils@1.1.16
    - @sap-ux/feature-toggle@0.3.9
    - @sap-ux/fiori-generator-shared@0.14.2
    - @sap-ux/inquirer-common@0.11.47
    - @sap-ux/logger@0.8.6
    - @sap-ux/system-access@0.7.13
    - @sap-ux/telemetry@0.6.106
    - @sap-ux/ui-service-inquirer@0.2.173

## 0.1.235

*Released: 2026-05-13T09:36:59Z*

### Patch Changes

- Updated dependencies [21abda3]
    - @sap-ux/axios-extension@1.25.36
    - @sap-ux/fiori-generator-shared@0.14.1
    - @sap-ux/system-access@0.7.12
    - @sap-ux/ui-service-inquirer@0.2.172
    - @sap-ux/inquirer-common@0.11.46
    - @sap-ux/telemetry@0.6.105

## 0.1.234

*Released: 2026-05-12T18:00:39Z*

### Patch Changes

- Updated dependencies [9360ea5]
    - @sap-ux/fiori-generator-shared@0.14.0
    - @sap-ux/inquirer-common@0.11.45
    - @sap-ux/ui-service-inquirer@0.2.171

## 0.1.233

*Released: 2026-05-06T23:02:00Z*

### Patch Changes

- Updated dependencies [678a08e]
- Updated dependencies [678a08e]
    - @sap-ux/axios-extension@1.25.35
    - @sap-ux/btp-utils@1.1.15
    - @sap-ux/inquirer-common@0.11.44
    - @sap-ux/telemetry@0.6.104
    - @sap-ux/fiori-generator-shared@0.13.105
    - @sap-ux/system-access@0.7.11
    - @sap-ux/ui-service-inquirer@0.2.170

## 0.1.232

*Released: 2026-04-30T14:23:24Z*

### Patch Changes

- Updated dependencies [c160401]
    - @sap-ux/system-access@0.7.10
    - @sap-ux/telemetry@0.6.103
    - @sap-ux/axios-extension@1.25.34
    - @sap-ux/ui-service-inquirer@0.2.169
    - @sap-ux/fiori-generator-shared@0.13.104
    - @sap-ux/inquirer-common@0.11.43

## 0.1.231

*Released: 2026-04-30T13:10:33Z*

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.168

## 0.1.230

*Released: 2026-04-29T16:22:20Z*

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.167

## 0.1.229

*Released: 2026-04-29T15:24:37Z*

### Patch Changes

- Updated dependencies [3945459]
- Updated dependencies [3945459]
    - @sap-ux/axios-extension@1.25.33
    - @sap-ux/fiori-generator-shared@0.13.103
    - @sap-ux/system-access@0.7.9
    - @sap-ux/ui-service-inquirer@0.2.166
    - @sap-ux/inquirer-common@0.11.42
    - @sap-ux/telemetry@0.6.102

## 0.1.228

*Released: 2026-04-27T19:47:46Z*

### Patch Changes

- @sap-ux/axios-extension@1.25.32
- @sap-ux/fiori-generator-shared@0.13.102
- @sap-ux/inquirer-common@0.11.41
- @sap-ux/system-access@0.7.8
- @sap-ux/telemetry@0.6.101
- @sap-ux/ui-service-inquirer@0.2.165

## 0.1.227

*Released: 2026-04-23T12:54:21Z*

### Patch Changes

- @sap-ux/axios-extension@1.25.32
- @sap-ux/fiori-generator-shared@0.13.101
- @sap-ux/inquirer-common@0.11.40
- @sap-ux/system-access@0.7.8
- @sap-ux/telemetry@0.6.100
- @sap-ux/ui-service-inquirer@0.2.164

## 0.1.226

*Released: 2026-04-23T06:48:55Z*

### Patch Changes

- Updated dependencies [237371b]
    - @sap-ux/axios-extension@1.25.32
    - @sap-ux/fiori-generator-shared@0.13.100
    - @sap-ux/system-access@0.7.8
    - @sap-ux/ui-service-inquirer@0.2.163
    - @sap-ux/inquirer-common@0.11.39

## 0.1.225

*Released: 2026-04-22T12:38:46Z*

### Patch Changes

- @sap-ux/inquirer-common@0.11.38
- @sap-ux/ui-service-inquirer@0.2.162

## 0.1.224

*Released: 2026-04-15T11:53:17Z*

### Patch Changes

- Updated dependencies [67d1f8b]
    - @sap-ux/telemetry@0.6.99
    - @sap-ux/fiori-generator-shared@0.13.99
    - @sap-ux/inquirer-common@0.11.37
    - @sap-ux/ui-service-inquirer@0.2.161

## 0.1.223

*Released: 2026-04-14T20:26:28Z*

### Patch Changes

- Updated dependencies [ee68603]
    - @sap-ux/btp-utils@1.1.14
    - @sap-ux/axios-extension@1.25.31
    - @sap-ux/fiori-generator-shared@0.13.98
    - @sap-ux/inquirer-common@0.11.36
    - @sap-ux/system-access@0.7.7
    - @sap-ux/telemetry@0.6.98
    - @sap-ux/ui-service-inquirer@0.2.160

## 0.1.222

*Released: 2026-04-14T12:35:35Z*

### Patch Changes

- Updated dependencies [cc4450c]
    - @sap-ux/axios-extension@1.25.30
    - @sap-ux/btp-utils@1.1.13
    - @sap-ux/inquirer-common@0.11.35
    - @sap-ux/telemetry@0.6.97
    - @sap-ux/fiori-generator-shared@0.13.97
    - @sap-ux/system-access@0.7.6
    - @sap-ux/ui-service-inquirer@0.2.159

## 0.1.221

*Released: 2026-04-08T13:10:18Z*

### Patch Changes

- Updated dependencies [f1e4481]
- Updated dependencies [f1e4481]
    - @sap-ux/axios-extension@1.25.29
    - @sap-ux/inquirer-common@0.11.34
    - @sap-ux/logger@0.8.5
    - @sap-ux/fiori-generator-shared@0.13.96
    - @sap-ux/system-access@0.7.5
    - @sap-ux/ui-service-inquirer@0.2.158
    - @sap-ux/btp-utils@1.1.12
    - @sap-ux/telemetry@0.6.96

## 0.1.220

*Released: 2026-04-01T11:49:37Z*

### Patch Changes

- @sap-ux/axios-extension@1.25.28
- @sap-ux/fiori-generator-shared@0.13.95
- @sap-ux/inquirer-common@0.11.33
- @sap-ux/system-access@0.7.4
- @sap-ux/telemetry@0.6.95
- @sap-ux/ui-service-inquirer@0.2.157

## 0.1.219

*Released: 2026-03-30T22:24:11Z*

### Patch Changes

- c53a4ba: chore(ui-service-sub-generator): upgrade @sap-devx/yeoman-ui-types 1.22.0 → 1.23.0 (runtime dep); upgrade devDependencies (jest 30, i18next 25, @types/yeoman-generator 5.2.14)
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
    - @sap-ux/axios-extension@1.25.28
    - @sap-ux/feature-toggle@0.3.8
    - @sap-ux/fiori-generator-shared@0.13.94
    - @sap-ux/inquirer-common@0.11.32
    - @sap-ux/logger@0.8.4
    - @sap-ux/telemetry@0.6.94
    - @sap-ux/ui-service-inquirer@0.2.156
    - @sap-ux/system-access@0.7.4
    - @sap-ux/btp-utils@1.1.12

## 0.1.218

*Released: 2026-03-27T15:37:24Z*

### Patch Changes

- Updated dependencies [e92850e]
    - @sap-ux/telemetry@0.6.93
    - @sap-ux/fiori-generator-shared@0.13.93
    - @sap-ux/inquirer-common@0.11.31
    - @sap-ux/ui-service-inquirer@0.2.155

## 0.1.217

*Released: 2026-03-27T11:58:49Z*

### Patch Changes

- Updated dependencies [2e17a6b]
    - @sap-ux/btp-utils@1.1.12
    - @sap-ux/axios-extension@1.25.27
    - @sap-ux/fiori-generator-shared@0.13.92
    - @sap-ux/inquirer-common@0.11.30
    - @sap-ux/system-access@0.7.3
    - @sap-ux/telemetry@0.6.92
    - @sap-ux/ui-service-inquirer@0.2.154

## 0.1.216

*Released: 2026-03-26T20:06:10Z*

### Patch Changes

- @sap-ux/axios-extension@1.25.26
- @sap-ux/fiori-generator-shared@0.13.91
- @sap-ux/inquirer-common@0.11.29
- @sap-ux/system-access@0.7.2
- @sap-ux/telemetry@0.6.91
- @sap-ux/ui-service-inquirer@0.2.153

## 0.1.215

*Released: 2026-03-26T12:07:04Z*

### Patch Changes

- a41533f: chore(ui-service-sub-generator): upgrade i18next 25.8.18 → 25.8.20
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/axios-extension@1.25.26
    - @sap-ux/btp-utils@1.1.11
    - @sap-ux/fiori-generator-shared@0.13.90
    - @sap-ux/inquirer-common@0.11.28
    - @sap-ux/logger@0.8.3
    - @sap-ux/ui-service-inquirer@0.2.152
    - @sap-ux/system-access@0.7.2
    - @sap-ux/telemetry@0.6.90

## 0.1.214

*Released: 2026-03-25T12:56:41Z*

### Patch Changes

- @sap-ux/axios-extension@1.25.25
- @sap-ux/fiori-generator-shared@0.13.89
- @sap-ux/inquirer-common@0.11.27
- @sap-ux/system-access@0.7.1
- @sap-ux/telemetry@0.6.89
- @sap-ux/ui-service-inquirer@0.2.151

## 0.1.213

*Released: 2026-03-23T18:25:40Z*

### Patch Changes

- Updated dependencies [c0e05ab]
    - @sap-ux/axios-extension@1.25.25
    - @sap-ux/fiori-generator-shared@0.13.88
    - @sap-ux/system-access@0.7.1
    - @sap-ux/ui-service-inquirer@0.2.150

## 0.1.212

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- Updated dependencies [25e5177]
    - @sap-ux/system-access@0.7.0
    - @sap-ux/ui-service-inquirer@0.2.149
    - @sap-ux/inquirer-common@0.11.26
    - @sap-ux/telemetry@0.6.88
    - @sap-ux/axios-extension@1.25.24
    - @sap-ux/fiori-generator-shared@0.13.88

## 0.1.211

_Released: 2026-03-18T16:51:44Z_

### Patch Changes

- Updated dependencies [ae6758f]
    - @sap-ux/fiori-generator-shared@0.13.87
    - @sap-ux/inquirer-common@0.11.25
    - @sap-ux/ui-service-inquirer@0.2.148

## 0.1.210

_Released: 2026-03-17T07:55:04Z_

### Patch Changes

- Updated dependencies [a854433]
    - @sap-ux/axios-extension@1.25.24
    - @sap-ux/fiori-generator-shared@0.13.86
    - @sap-ux/system-access@0.6.66
    - @sap-ux/ui-service-inquirer@0.2.147

## 0.1.209

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18
- Updated dependencies [5d452e5]
- Updated dependencies [55417bb]
    - @sap-ux/axios-extension@1.25.23
    - @sap-ux/btp-utils@1.1.10
    - @sap-ux/system-access@0.6.65
    - @sap-ux/ui-service-inquirer@0.2.146
    - @sap-ux/fiori-generator-shared@0.13.86
    - @sap-ux/inquirer-common@0.11.24
    - @sap-ux/telemetry@0.6.87

## 0.1.208

_Released: 2026-03-06T14:12:58Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.145

## 0.1.207

_Released: 2026-03-06T13:19:33Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.23
- @sap-ux/ui-service-inquirer@0.2.144

## 0.1.206

_Released: 2026-03-05T23:21:37Z_

### Patch Changes

- Updated dependencies [2d21925]
    - @sap-ux/axios-extension@1.25.22
    - @sap-ux/fiori-generator-shared@0.13.85
    - @sap-ux/system-access@0.6.64
    - @sap-ux/ui-service-inquirer@0.2.143

## 0.1.205

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- @sap-ux/axios-extension@1.25.21
- @sap-ux/fiori-generator-shared@0.13.85
- @sap-ux/inquirer-common@0.11.22
- @sap-ux/system-access@0.6.63
- @sap-ux/telemetry@0.6.86
- @sap-ux/ui-service-inquirer@0.2.142

## 0.1.204

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- Updated dependencies [2917c4c]
- Updated dependencies [7c06ef0]
- Updated dependencies [fdd57de]
    - @sap-ux/telemetry@0.6.85
    - @sap-ux/axios-extension@1.25.21
    - @sap-ux/inquirer-common@0.11.21
    - @sap-ux/fiori-generator-shared@0.13.84
    - @sap-ux/ui-service-inquirer@0.2.141
    - @sap-ux/system-access@0.6.63

## 0.1.203

_Released: 2026-03-05T10:41:09Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.20
- @sap-ux/ui-service-inquirer@0.2.140

## 0.1.202

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- f5f9a78: fix(deps): update dependency @sap-devx/yeoman-ui-types to v1.22.0
- Updated dependencies [f5f9a78]
- Updated dependencies [45d4797]
    - @sap-ux/inquirer-common@0.11.19
    - @sap-ux/ui-service-inquirer@0.2.139
    - @sap-ux/logger@0.8.2
    - @sap-ux/axios-extension@1.25.20
    - @sap-ux/btp-utils@1.1.9
    - @sap-ux/fiori-generator-shared@0.13.83
    - @sap-ux/system-access@0.6.62
    - @sap-ux/telemetry@0.6.84

## 0.1.201

_Released: 2026-03-04T15:52:08Z_

### Patch Changes

- Updated dependencies [2302698]
- Updated dependencies [96e9b9e]
    - @sap-ux/inquirer-common@0.11.18
    - @sap-ux/axios-extension@1.25.19
    - @sap-ux/ui-service-inquirer@0.2.138
    - @sap-ux/fiori-generator-shared@0.13.82
    - @sap-ux/system-access@0.6.61

## 0.1.200

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.137
- @sap-ux/telemetry@0.6.83
- @sap-ux/inquirer-common@0.11.17
- @sap-ux/axios-extension@1.25.18
- @sap-ux/fiori-generator-shared@0.13.82
- @sap-ux/system-access@0.6.60

## 0.1.199

_Released: 2026-03-03T08:27:12Z_

### Patch Changes

- Updated dependencies [4af92b5]
    - @sap-ux/axios-extension@1.25.18
    - @sap-ux/ui-service-inquirer@0.2.136
    - @sap-ux/fiori-generator-shared@0.13.81
    - @sap-ux/system-access@0.6.60

## 0.1.198

_Released: 2026-02-27T17:32:57Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.135

## 0.1.197

_Released: 2026-02-27T16:28:36Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.134

## 0.1.196

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/axios-extension@1.25.17
    - @sap-ux/ui-service-inquirer@0.2.133
    - @sap-ux/inquirer-common@0.11.16
    - @sap-ux/fiori-generator-shared@0.13.81
    - @sap-ux/system-access@0.6.59
    - @sap-ux/telemetry@0.6.82

## 0.1.195

_Released: 2026-02-27T14:38:29Z_

### Patch Changes

- Updated dependencies [ae0bf31]
    - @sap-ux/ui-service-inquirer@0.2.132

## 0.1.194

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- 6c993f3: fix: turn off i18next support notice
- Updated dependencies [6c993f3]
    - @sap-ux/fiori-generator-shared@0.13.80
    - @sap-ux/ui-service-inquirer@0.2.131
    - @sap-ux/inquirer-common@0.11.15
    - @sap-ux/system-access@0.6.58
    - @sap-ux/telemetry@0.6.81

## 0.1.193

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- Updated dependencies [c043712]
    - @sap-ux/axios-extension@1.25.16
    - @sap-ux/fiori-generator-shared@0.13.79
    - @sap-ux/system-access@0.6.57
    - @sap-ux/ui-service-inquirer@0.2.130
    - @sap-ux/inquirer-common@0.11.14
    - @sap-ux/telemetry@0.6.80

## 0.1.192

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- @sap-ux/axios-extension@1.25.15
- @sap-ux/fiori-generator-shared@0.13.78
- @sap-ux/inquirer-common@0.11.13
- @sap-ux/system-access@0.6.56
- @sap-ux/telemetry@0.6.79
- @sap-ux/ui-service-inquirer@0.2.129

## 0.1.191

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- @sap-ux/telemetry@0.6.78
- @sap-ux/ui-service-inquirer@0.2.128
- @sap-ux/inquirer-common@0.11.12
- @sap-ux/axios-extension@1.25.15
- @sap-ux/fiori-generator-shared@0.13.77
- @sap-ux/system-access@0.6.56

## 0.1.190

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- d588c26: fix(deps): update dependency rimraf to v6.1.3
- Updated dependencies [ff634b0]
- Updated dependencies [d588c26]
    - @sap-ux/inquirer-common@0.11.11
    - @sap-ux/feature-toggle@0.3.7
    - @sap-ux/system-access@0.6.56
    - @sap-ux/ui-service-inquirer@0.2.127
    - @sap-ux/axios-extension@1.25.15
    - @sap-ux/fiori-generator-shared@0.13.76

## 0.1.189

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12
- Updated dependencies [cbd340a]
    - @sap-ux/fiori-generator-shared@0.13.76
    - @sap-ux/inquirer-common@0.11.10
    - @sap-ux/ui-service-inquirer@0.2.126
    - @sap-ux/system-access@0.6.55
    - @sap-ux/telemetry@0.6.77

## 0.1.188

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- c94cc8e: fix(deps): update dependency @vscode-logging/logger to v2.0.8
- Updated dependencies [c94cc8e]
- Updated dependencies [bb310dc]
    - @sap-ux/fiori-generator-shared@0.13.75
    - @sap-ux/inquirer-common@0.11.9
    - @sap-ux/ui-service-inquirer@0.2.125
    - @sap-ux/telemetry@0.6.76
    - @sap-ux/axios-extension@1.25.14
    - @sap-ux/system-access@0.6.54

## 0.1.187

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/axios-extension@1.25.14
    - @sap-ux/ui-service-inquirer@0.2.124
    - @sap-ux/inquirer-common@0.11.8
    - @sap-ux/fiori-generator-shared@0.13.74
    - @sap-ux/system-access@0.6.54
    - @sap-ux/telemetry@0.6.75

## 0.1.186

_Released: 2026-02-16T18:48:13Z_

### Patch Changes

- dd2131c: Axios upgrade from bas-sdk
- Updated dependencies [dd2131c]
    - @sap-ux/btp-utils@1.1.9
    - @sap-ux/axios-extension@1.25.13
    - @sap-ux/fiori-generator-shared@0.13.73
    - @sap-ux/inquirer-common@0.11.7
    - @sap-ux/system-access@0.6.53
    - @sap-ux/telemetry@0.6.74
    - @sap-ux/ui-service-inquirer@0.2.123

## 0.1.185

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- Updated dependencies [bda7356]
    - @sap-ux/axios-extension@1.25.12
    - @sap-ux/fiori-generator-shared@0.13.72
    - @sap-ux/system-access@0.6.52
    - @sap-ux/ui-service-inquirer@0.2.122
    - @sap-ux/telemetry@0.6.73
    - @sap-ux/inquirer-common@0.11.6

## 0.1.184

_Released: 2026-02-13T16:18:58Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.71
- @sap-ux/system-access@0.6.51
- @sap-ux/telemetry@0.6.72
- @sap-ux/ui-service-inquirer@0.2.121
- @sap-ux/inquirer-common@0.11.5

## 0.1.183

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- @sap-ux/axios-extension@1.25.11
- @sap-ux/fiori-generator-shared@0.13.70
- @sap-ux/inquirer-common@0.11.4
- @sap-ux/system-access@0.6.50
- @sap-ux/telemetry@0.6.71
- @sap-ux/ui-service-inquirer@0.2.120

## 0.1.182

_Released: 2026-02-12T12:53:37Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.119

## 0.1.181

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- @sap-ux/axios-extension@1.25.11
- @sap-ux/fiori-generator-shared@0.13.69
- @sap-ux/inquirer-common@0.11.3
- @sap-ux/system-access@0.6.50
- @sap-ux/telemetry@0.6.70
- @sap-ux/ui-service-inquirer@0.2.118

## 0.1.180

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/axios-extension@1.25.11
    - @sap-ux/inquirer-common@0.11.2
    - @sap-ux/btp-utils@1.1.8
    - @sap-ux/telemetry@0.6.69
    - @sap-ux/ui-service-inquirer@0.2.117
    - @sap-ux/fiori-generator-shared@0.13.68
    - @sap-ux/system-access@0.6.50

## 0.1.179

_Released: 2026-02-10T08:40:44Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.116

## 0.1.178

_Released: 2026-02-09T15:13:41Z_

### Patch Changes

- Updated dependencies [1ad56d1]
    - @sap-ux/inquirer-common@0.11.1
    - @sap-ux/ui-service-inquirer@0.2.115

## 0.1.177

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/inquirer-common@0.11.0
    - @sap-ux/ui-service-inquirer@0.2.114
    - @sap-ux/axios-extension@1.25.10
    - @sap-ux/fiori-generator-shared@0.13.67
    - @sap-ux/system-access@0.6.49
    - @sap-ux/telemetry@0.6.68

## 0.1.176

_Released: 2026-02-09T10:08:59Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.113

## 0.1.175

_Released: 2026-02-07T13:20:19Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.112

## 0.1.174

_Released: 2026-02-06T10:18:27Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.111

## 0.1.173

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- @sap-ux/axios-extension@1.25.10
- @sap-ux/fiori-generator-shared@0.13.66
- @sap-ux/system-access@0.6.49
- @sap-ux/telemetry@0.6.67
- @sap-ux/inquirer-common@0.10.26
- @sap-ux/ui-service-inquirer@0.2.110

## 0.1.172

_Released: 2026-02-05T13:53:56Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.65
- @sap-ux/system-access@0.6.49
- @sap-ux/telemetry@0.6.66
- @sap-ux/ui-service-inquirer@0.2.109
- @sap-ux/inquirer-common@0.10.25

## 0.1.171

_Released: 2026-02-05T11:39:04Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.64
- @sap-ux/system-access@0.6.48
- @sap-ux/telemetry@0.6.65
- @sap-ux/ui-service-inquirer@0.2.108
- @sap-ux/inquirer-common@0.10.24

## 0.1.170

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- Updated dependencies [ad321ab]
    - @sap-ux/fiori-generator-shared@0.13.63
    - @sap-ux/inquirer-common@0.10.23
    - @sap-ux/ui-service-inquirer@0.2.107
    - @sap-ux/telemetry@0.6.64
    - @sap-ux/axios-extension@1.25.10
    - @sap-ux/system-access@0.6.47

## 0.1.169

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- 9f11dd2: chore - address audit issues
- Updated dependencies [9f11dd2]
    - @sap-ux/ui-service-inquirer@0.2.106
    - @sap-ux/inquirer-common@0.10.22
    - @sap-ux/feature-toggle@0.3.6
    - @sap-ux/system-access@0.6.47
    - @sap-ux/btp-utils@1.1.7
    - @sap-ux/axios-extension@1.25.10
    - @sap-ux/fiori-generator-shared@0.13.62
    - @sap-ux/telemetry@0.6.63

## 0.1.168

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [89175fe]
    - @sap-ux/axios-extension@1.25.9
    - @sap-ux/fiori-generator-shared@0.13.61
    - @sap-ux/system-access@0.6.46
    - @sap-ux/ui-service-inquirer@0.2.105
    - @sap-ux/inquirer-common@0.10.21
    - @sap-ux/telemetry@0.6.62

## 0.1.167

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- Updated dependencies [ea7a16c]
    - @sap-ux/axios-extension@1.25.8
    - @sap-ux/inquirer-common@0.10.20
    - @sap-ux/logger@0.8.1
    - @sap-ux/fiori-generator-shared@0.13.60
    - @sap-ux/system-access@0.6.45
    - @sap-ux/ui-service-inquirer@0.2.104
    - @sap-ux/btp-utils@1.1.6
    - @sap-ux/telemetry@0.6.61

## 0.1.166

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.19
- @sap-ux/axios-extension@1.25.7
- @sap-ux/fiori-generator-shared@0.13.59
- @sap-ux/system-access@0.6.44
- @sap-ux/telemetry@0.6.60
- @sap-ux/ui-service-inquirer@0.2.103

## 0.1.165

_Released: 2026-01-28T15:52:09Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.102

## 0.1.164

_Released: 2026-01-28T12:56:39Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.101

## 0.1.163

_Released: 2026-01-28T00:19:05Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.58
- @sap-ux/system-access@0.6.44
- @sap-ux/telemetry@0.6.59
- @sap-ux/ui-service-inquirer@0.2.100
- @sap-ux/inquirer-common@0.10.18

## 0.1.162

_Released: 2026-01-26T09:14:13Z_

### Patch Changes

- Updated dependencies [0492325]
    - @sap-ux/axios-extension@1.25.7
    - @sap-ux/fiori-generator-shared@0.13.57
    - @sap-ux/system-access@0.6.43
    - @sap-ux/ui-service-inquirer@0.2.99

## 0.1.161

_Released: 2026-01-23T23:57:30Z_

### Patch Changes

- Updated dependencies [c707af1]
    - @sap-ux/telemetry@0.6.58
    - @sap-ux/fiori-generator-shared@0.13.57
    - @sap-ux/inquirer-common@0.10.17
    - @sap-ux/ui-service-inquirer@0.2.98

## 0.1.160

_Released: 2026-01-23T22:30:10Z_

### Patch Changes

- Updated dependencies [d11943d]
    - @sap-ux/fiori-generator-shared@0.13.56
    - @sap-ux/inquirer-common@0.10.16
    - @sap-ux/ui-service-inquirer@0.2.97

## 0.1.159

_Released: 2026-01-23T12:49:27Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.55
- @sap-ux/system-access@0.6.42
- @sap-ux/telemetry@0.6.57
- @sap-ux/ui-service-inquirer@0.2.96
- @sap-ux/inquirer-common@0.10.15

## 0.1.158

_Released: 2026-01-23T10:10:07Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.95

## 0.1.157

_Released: 2026-01-22T13:16:27Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.94

## 0.1.156

_Released: 2026-01-21T17:53:12Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.93

## 0.1.155

_Released: 2026-01-21T14:01:11Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.92

## 0.1.154

_Released: 2026-01-20T14:28:12Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.91

## 0.1.153

_Released: 2026-01-20T11:22:57Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.90

## 0.1.152

_Released: 2026-01-19T12:47:48Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.14
- @sap-ux/ui-service-inquirer@0.2.89

## 0.1.151

_Released: 2026-01-16T14:56:13Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.88

## 0.1.150

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- @sap-ux/telemetry@0.6.56
- @sap-ux/axios-extension@1.25.6
- @sap-ux/fiori-generator-shared@0.13.54
- @sap-ux/system-access@0.6.41
- @sap-ux/ui-service-inquirer@0.2.87
- @sap-ux/inquirer-common@0.10.13

## 0.1.149

_Released: 2026-01-16T12:32:24Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.53
- @sap-ux/system-access@0.6.41
- @sap-ux/telemetry@0.6.55
- @sap-ux/ui-service-inquirer@0.2.86
- @sap-ux/inquirer-common@0.10.12

## 0.1.148

_Released: 2026-01-16T10:16:49Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.85

## 0.1.147

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- @sap-ux/axios-extension@1.25.6
- @sap-ux/fiori-generator-shared@0.13.52
- @sap-ux/system-access@0.6.40
- @sap-ux/telemetry@0.6.54
- @sap-ux/inquirer-common@0.10.11
- @sap-ux/ui-service-inquirer@0.2.84

## 0.1.146

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- @sap-ux/axios-extension@1.25.6
- @sap-ux/fiori-generator-shared@0.13.51
- @sap-ux/system-access@0.6.40
- @sap-ux/telemetry@0.6.53
- @sap-ux/inquirer-common@0.10.10
- @sap-ux/ui-service-inquirer@0.2.83

## 0.1.145

_Released: 2026-01-13T18:24:08Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.82

## 0.1.144

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.81
- @sap-ux/axios-extension@1.25.6
- @sap-ux/fiori-generator-shared@0.13.50
- @sap-ux/system-access@0.6.40
- @sap-ux/telemetry@0.6.52
- @sap-ux/inquirer-common@0.10.9

## 0.1.143

_Released: 2026-01-12T09:10:27Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.80

## 0.1.142

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/axios-extension@1.25.6
    - @sap-ux/inquirer-common@0.10.8
    - @sap-ux/ui-service-inquirer@0.2.79
    - @sap-ux/fiori-generator-shared@0.13.49
    - @sap-ux/system-access@0.6.40
    - @sap-ux/telemetry@0.6.51

## 0.1.141

_Released: 2026-01-08T17:12:17Z_

### Patch Changes

- Updated dependencies [2204ad3]
    - @sap-ux/axios-extension@1.25.5
    - @sap-ux/inquirer-common@0.10.7
    - @sap-ux/ui-service-inquirer@0.2.78
    - @sap-ux/fiori-generator-shared@0.13.48
    - @sap-ux/system-access@0.6.39

## 0.1.140

_Released: 2026-01-07T16:03:58Z_

### Patch Changes

- Updated dependencies [4e0f204]
    - @sap-ux/axios-extension@1.25.4
    - @sap-ux/fiori-generator-shared@0.13.48
    - @sap-ux/system-access@0.6.38
    - @sap-ux/ui-service-inquirer@0.2.77

## 0.1.139

_Released: 2026-01-07T10:20:40Z_

### Patch Changes

- Updated dependencies [6382440]
    - @sap-ux/inquirer-common@0.10.6
    - @sap-ux/ui-service-inquirer@0.2.76

## 0.1.138

_Released: 2026-01-06T14:37:31Z_

### Patch Changes

- Updated dependencies [03598eb]
    - @sap-ux/fiori-generator-shared@0.13.48
    - @sap-ux/inquirer-common@0.10.5
    - @sap-ux/ui-service-inquirer@0.2.75

## 0.1.137

_Released: 2026-01-05T14:16:22Z_

### Patch Changes

- 62bb798: set conflicter option
- Updated dependencies [62bb798]
    - @sap-ux/fiori-generator-shared@0.13.47
    - @sap-ux/inquirer-common@0.10.4
    - @sap-ux/ui-service-inquirer@0.2.74

## 0.1.136

_Released: 2025-12-22T17:36:43Z_

### Patch Changes

- Updated dependencies [14a1bc2]
    - @sap-ux/axios-extension@1.25.3
    - @sap-ux/fiori-generator-shared@0.13.46
    - @sap-ux/system-access@0.6.37
    - @sap-ux/ui-service-inquirer@0.2.73

## 0.1.135

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/logger@0.8.0
    - @sap-ux/axios-extension@1.25.2
    - @sap-ux/btp-utils@1.1.6
    - @sap-ux/fiori-generator-shared@0.13.46
    - @sap-ux/inquirer-common@0.10.3
    - @sap-ux/system-access@0.6.36
    - @sap-ux/telemetry@0.6.50
    - @sap-ux/ui-service-inquirer@0.2.72

## 0.1.134

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/ui-service-inquirer@0.2.71
    - @sap-ux/axios-extension@1.25.1
    - @sap-ux/inquirer-common@0.10.2
    - @sap-ux/system-access@0.6.35
    - @sap-ux/telemetry@0.6.49
    - @sap-ux/logger@0.7.3
    - @sap-ux/fiori-generator-shared@0.13.45
    - @sap-ux/btp-utils@1.1.6

## 0.1.133

_Released: 2025-12-18T14:44:52Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.70

## 0.1.132

_Released: 2025-12-18T13:13:52Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.69
- @sap-ux/inquirer-common@0.10.1

## 0.1.131

_Released: 2025-12-18T08:56:52Z_

### Patch Changes

- Updated dependencies [5287327]
    - @sap-ux/axios-extension@1.25.0
    - @sap-ux/inquirer-common@0.10.0
    - @sap-ux/ui-service-inquirer@0.2.68
    - @sap-ux/fiori-generator-shared@0.13.44
    - @sap-ux/system-access@0.6.34

## 0.1.130

_Released: 2025-12-16T11:43:52Z_

### Patch Changes

- Updated dependencies [ba58398]
    - @sap-ux/system-access@0.6.33
    - @sap-ux/fiori-generator-shared@0.13.44
    - @sap-ux/telemetry@0.6.48
    - @sap-ux/ui-service-inquirer@0.2.67
    - @sap-ux/inquirer-common@0.9.17

## 0.1.129

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/fiori-generator-shared@0.13.43
    - @sap-ux/ui-service-inquirer@0.2.66
    - @sap-ux/axios-extension@1.24.6
    - @sap-ux/inquirer-common@0.9.16
    - @sap-ux/feature-toggle@0.3.5
    - @sap-ux/system-access@0.6.32
    - @sap-ux/btp-utils@1.1.6
    - @sap-ux/telemetry@0.6.47
    - @sap-ux/logger@0.7.2

## 0.1.128

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- @sap-ux/axios-extension@1.24.5
- @sap-ux/fiori-generator-shared@0.13.42
- @sap-ux/system-access@0.6.31
- @sap-ux/telemetry@0.6.46
- @sap-ux/inquirer-common@0.9.15
- @sap-ux/ui-service-inquirer@0.2.65

## 0.1.127

_Released: 2025-12-12T09:02:37Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.14
- @sap-ux/ui-service-inquirer@0.2.64

## 0.1.126

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- @sap-ux/axios-extension@1.24.5
- @sap-ux/fiori-generator-shared@0.13.41
- @sap-ux/system-access@0.6.31
- @sap-ux/telemetry@0.6.45
- @sap-ux/inquirer-common@0.9.13
- @sap-ux/ui-service-inquirer@0.2.63

## 0.1.125

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- @sap-ux/axios-extension@1.24.5
- @sap-ux/fiori-generator-shared@0.13.40
- @sap-ux/system-access@0.6.31
- @sap-ux/telemetry@0.6.44
- @sap-ux/inquirer-common@0.9.12
- @sap-ux/ui-service-inquirer@0.2.62

## 0.1.124

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- 037a430: fix high severity Sonar issues
- Updated dependencies [037a430]
    - @sap-ux/ui-service-inquirer@0.2.61
    - @sap-ux/axios-extension@1.24.5
    - @sap-ux/system-access@0.6.31
    - @sap-ux/telemetry@0.6.43
    - @sap-ux/fiori-generator-shared@0.13.39
    - @sap-ux/inquirer-common@0.9.11

## 0.1.123

_Released: 2025-12-08T11:51:00Z_

### Patch Changes

- Updated dependencies [f71a139]
    - @sap-ux/axios-extension@1.24.4
    - @sap-ux/fiori-generator-shared@0.13.38
    - @sap-ux/system-access@0.6.30
    - @sap-ux/ui-service-inquirer@0.2.60

## 0.1.122

_Released: 2025-12-05T12:18:49Z_

### Patch Changes

- Updated dependencies [d202c17]
    - @sap-ux/fiori-generator-shared@0.13.38
    - @sap-ux/inquirer-common@0.9.10
    - @sap-ux/ui-service-inquirer@0.2.59

## 0.1.121

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- @sap-ux/axios-extension@1.24.3
- @sap-ux/fiori-generator-shared@0.13.37
- @sap-ux/system-access@0.6.29
- @sap-ux/telemetry@0.6.42
- @sap-ux/inquirer-common@0.9.9
- @sap-ux/ui-service-inquirer@0.2.58

## 0.1.120

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- @sap-ux/axios-extension@1.24.3
- @sap-ux/fiori-generator-shared@0.13.36
- @sap-ux/system-access@0.6.29
- @sap-ux/telemetry@0.6.41
- @sap-ux/inquirer-common@0.9.8
- @sap-ux/ui-service-inquirer@0.2.57

## 0.1.119

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- Updated dependencies [5d0598d]
    - @sap-ux/axios-extension@1.24.3
    - @sap-ux/inquirer-common@0.9.7
    - @sap-ux/fiori-generator-shared@0.13.35
    - @sap-ux/system-access@0.6.29
    - @sap-ux/ui-service-inquirer@0.2.56
    - @sap-ux/telemetry@0.6.40

## 0.1.118

_Released: 2025-11-26T12:17:21Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.6
- @sap-ux/ui-service-inquirer@0.2.55

## 0.1.117

_Released: 2025-11-26T00:12:42Z_

### Patch Changes

- Updated dependencies [597834f]
    - @sap-ux/inquirer-common@0.9.5
    - @sap-ux/ui-service-inquirer@0.2.54

## 0.1.116

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- @sap-ux/axios-extension@1.24.2
- @sap-ux/fiori-generator-shared@0.13.34
- @sap-ux/system-access@0.6.28
- @sap-ux/telemetry@0.6.39
- @sap-ux/inquirer-common@0.9.4
- @sap-ux/ui-service-inquirer@0.2.53

## 0.1.115

_Released: 2025-11-19T18:58:06Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.52

## 0.1.114

_Released: 2025-11-18T22:51:59Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.51

## 0.1.113

_Released: 2025-11-12T10:01:42Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.50

## 0.1.112

_Released: 2025-11-07T14:33:42Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.49

## 0.1.111

_Released: 2025-11-07T13:23:57Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.3
- @sap-ux/ui-service-inquirer@0.2.48

## 0.1.110

_Released: 2025-11-06T15:12:51Z_

### Patch Changes

- Updated dependencies [56235f8]
    - @sap-ux/telemetry@0.6.38
    - @sap-ux/fiori-generator-shared@0.13.33
    - @sap-ux/inquirer-common@0.9.2
    - @sap-ux/ui-service-inquirer@0.2.47

## 0.1.109

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/fiori-generator-shared@0.13.32
    - @sap-ux/inquirer-common@0.9.1
    - @sap-ux/feature-toggle@0.3.4
    - @sap-ux/system-access@0.6.28
    - @sap-ux/btp-utils@1.1.5
    - @sap-ux/telemetry@0.6.37
    - @sap-ux/logger@0.7.1
    - @sap-ux/ui-service-inquirer@0.2.46
    - @sap-ux/axios-extension@1.24.2

## 0.1.108

_Released: 2025-11-03T15:21:45Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.45

## 0.1.107

_Released: 2025-11-03T10:50:00Z_

### Patch Changes

- Updated dependencies [4ddcff3]
    - @sap-ux/inquirer-common@0.9.0
    - @sap-ux/ui-service-inquirer@0.2.44

## 0.1.106

_Released: 2025-10-31T13:35:34Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.31
- @sap-ux/system-access@0.6.27
- @sap-ux/telemetry@0.6.36
- @sap-ux/ui-service-inquirer@0.2.43
- @sap-ux/inquirer-common@0.8.10

## 0.1.105

_Released: 2025-10-30T10:09:21Z_

### Patch Changes

- Updated dependencies [3253294]
    - @sap-ux/axios-extension@1.24.1
    - @sap-ux/fiori-generator-shared@0.13.30
    - @sap-ux/system-access@0.6.26
    - @sap-ux/ui-service-inquirer@0.2.42

## 0.1.104

_Released: 2025-10-29T17:02:38Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.30
- @sap-ux/system-access@0.6.25
- @sap-ux/telemetry@0.6.35
- @sap-ux/ui-service-inquirer@0.2.41
- @sap-ux/inquirer-common@0.8.9

## 0.1.103

_Released: 2025-10-29T11:04:17Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.29
- @sap-ux/system-access@0.6.24
- @sap-ux/telemetry@0.6.34
- @sap-ux/ui-service-inquirer@0.2.40
- @sap-ux/inquirer-common@0.8.8

## 0.1.102

_Released: 2025-10-28T13:36:39Z_

### Patch Changes

- Updated dependencies [cdeb18b]
    - @sap-ux/axios-extension@1.24.0
    - @sap-ux/fiori-generator-shared@0.13.28
    - @sap-ux/system-access@0.6.23
    - @sap-ux/ui-service-inquirer@0.2.39

## 0.1.101

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- @sap-ux/axios-extension@1.23.1
- @sap-ux/fiori-generator-shared@0.13.28
- @sap-ux/system-access@0.6.22
- @sap-ux/telemetry@0.6.33
- @sap-ux/inquirer-common@0.8.7
- @sap-ux/ui-service-inquirer@0.2.38

## 0.1.100

_Released: 2025-10-22T18:56:41Z_

### Patch Changes

- Updated dependencies [fa9580c]
    - @sap-ux/feature-toggle@0.3.3
    - @sap-ux/axios-extension@1.23.1
    - @sap-ux/inquirer-common@0.8.6
    - @sap-ux/fiori-generator-shared@0.13.27
    - @sap-ux/system-access@0.6.22
    - @sap-ux/ui-service-inquirer@0.2.37

## 0.1.99

_Released: 2025-10-22T10:38:40Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.36

## 0.1.98

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- @sap-ux/axios-extension@1.23.0
- @sap-ux/fiori-generator-shared@0.13.27
- @sap-ux/system-access@0.6.21
- @sap-ux/telemetry@0.6.32
- @sap-ux/inquirer-common@0.8.5
- @sap-ux/ui-service-inquirer@0.2.35

## 0.1.97

_Released: 2025-10-21T09:37:06Z_

### Patch Changes

- Updated dependencies [06bc541]
    - @sap-ux/inquirer-common@0.8.4
    - @sap-ux/ui-service-inquirer@0.2.34

## 0.1.96

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- @sap-ux/axios-extension@1.23.0
- @sap-ux/fiori-generator-shared@0.13.26
- @sap-ux/system-access@0.6.21
- @sap-ux/telemetry@0.6.31
- @sap-ux/inquirer-common@0.8.3
- @sap-ux/ui-service-inquirer@0.2.33

## 0.1.95

_Released: 2025-10-20T07:42:46Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.32

## 0.1.94

_Released: 2025-10-17T11:37:38Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.25
- @sap-ux/system-access@0.6.21
- @sap-ux/telemetry@0.6.30
- @sap-ux/ui-service-inquirer@0.2.31
- @sap-ux/inquirer-common@0.8.2

## 0.1.93

_Released: 2025-10-17T09:45:11Z_

### Patch Changes

- Updated dependencies [d4dabbd]
    - @sap-ux/fiori-generator-shared@0.13.24
    - @sap-ux/inquirer-common@0.8.1
    - @sap-ux/ui-service-inquirer@0.2.30

## 0.1.92

_Released: 2025-10-15T16:45:46Z_

### Patch Changes

- Updated dependencies [4053369]
    - @sap-ux/inquirer-common@0.8.0
    - @sap-ux/ui-service-inquirer@0.2.29

## 0.1.91

_Released: 2025-10-14T13:22:30Z_

### Patch Changes

- Updated dependencies [bacaf93]
    - @sap-ux/axios-extension@1.23.0
    - @sap-ux/fiori-generator-shared@0.13.23
    - @sap-ux/feature-toggle@0.3.2
    - @sap-ux/system-access@0.6.20
    - @sap-ux/telemetry@0.6.29
    - @sap-ux/ui-service-inquirer@0.2.28
    - @sap-ux/inquirer-common@0.7.51

## 0.1.90

_Released: 2025-10-13T14:40:48Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.27

## 0.1.89

_Released: 2025-10-10T13:53:56Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.50
- @sap-ux/ui-service-inquirer@0.2.26

## 0.1.88

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- @sap-ux/telemetry@0.6.28
- @sap-ux/ui-service-inquirer@0.2.25
- @sap-ux/axios-extension@1.22.10
- @sap-ux/fiori-generator-shared@0.13.22
- @sap-ux/system-access@0.6.19
- @sap-ux/inquirer-common@0.7.49

## 0.1.87

_Released: 2025-10-10T09:39:17Z_

### Patch Changes

- Updated dependencies [e015869]
    - @sap-ux/ui-service-inquirer@0.2.24

## 0.1.86

_Released: 2025-10-07T13:15:25Z_

### Patch Changes

- @sap-ux/telemetry@0.6.27
- @sap-ux/ui-service-inquirer@0.2.23
- @sap-ux/fiori-generator-shared@0.13.21
- @sap-ux/inquirer-common@0.7.48

## 0.1.85

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/fiori-generator-shared@0.13.20
    - @sap-ux/axios-extension@1.22.10
    - @sap-ux/inquirer-common@0.7.47
    - @sap-ux/system-access@0.6.19
    - @sap-ux/btp-utils@1.1.4
    - @sap-ux/telemetry@0.6.26
    - @sap-ux/ui-service-inquirer@0.2.22

## 0.1.84

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- @sap-ux/telemetry@0.6.25
- @sap-ux/ui-service-inquirer@0.2.21
- @sap-ux/axios-extension@1.22.9
- @sap-ux/fiori-generator-shared@0.13.19
- @sap-ux/system-access@0.6.18
- @sap-ux/inquirer-common@0.7.46

## 0.1.83

_Released: 2025-09-30T10:32:33Z_

### Patch Changes

- 2a3fff1: escape text in information message after generation

## 0.1.82

_Released: 2025-09-26T12:52:39Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.20

## 0.1.81

_Released: 2025-09-23T20:14:56Z_

### Patch Changes

- Updated dependencies [998954b]
    - @sap-ux/btp-utils@1.1.3
    - @sap-ux/axios-extension@1.22.9
    - @sap-ux/fiori-generator-shared@0.13.18
    - @sap-ux/inquirer-common@0.7.45
    - @sap-ux/system-access@0.6.18
    - @sap-ux/telemetry@0.6.24
    - @sap-ux/ui-service-inquirer@0.2.19

## 0.1.80

_Released: 2025-09-23T12:40:54Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.18

## 0.1.79

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- Updated dependencies [9872384]
    - @sap-ux/axios-extension@1.22.8
    - @sap-ux/inquirer-common@0.7.44
    - @sap-ux/btp-utils@1.1.2
    - @sap-ux/telemetry@0.6.23
    - @sap-ux/ui-service-inquirer@0.2.17
    - @sap-ux/fiori-generator-shared@0.13.17
    - @sap-ux/system-access@0.6.17

## 0.1.78

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- @sap-ux/axios-extension@1.22.7
- @sap-ux/fiori-generator-shared@0.13.16
- @sap-ux/system-access@0.6.16
- @sap-ux/telemetry@0.6.22
- @sap-ux/inquirer-common@0.7.43
- @sap-ux/ui-service-inquirer@0.2.16

## 0.1.77

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- @sap-ux/axios-extension@1.22.7
- @sap-ux/fiori-generator-shared@0.13.15
- @sap-ux/system-access@0.6.16
- @sap-ux/telemetry@0.6.21
- @sap-ux/inquirer-common@0.7.42
- @sap-ux/ui-service-inquirer@0.2.15

## 0.1.76

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- @sap-ux/telemetry@0.6.20
- @sap-ux/ui-service-inquirer@0.2.14
- @sap-ux/axios-extension@1.22.7
- @sap-ux/fiori-generator-shared@0.13.14
- @sap-ux/system-access@0.6.16
- @sap-ux/inquirer-common@0.7.41

## 0.1.75

_Released: 2025-09-11T11:04:24Z_

### Patch Changes

- Updated dependencies [3c094af]
    - @sap-ux/fiori-generator-shared@0.13.13
    - @sap-ux/inquirer-common@0.7.40
    - @sap-ux/ui-service-inquirer@0.2.13

## 0.1.74

_Released: 2025-09-03T14:26:25Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.12

## 0.1.73

_Released: 2025-09-03T13:57:15Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.11

## 0.1.72

_Released: 2025-09-02T13:22:05Z_

### Patch Changes

- Updated dependencies [04d2103]
    - @sap-ux/feature-toggle@0.3.1
    - @sap-ux/ui-service-inquirer@0.2.10
    - @sap-ux/axios-extension@1.22.7
    - @sap-ux/inquirer-common@0.7.39
    - @sap-ux/fiori-generator-shared@0.13.12
    - @sap-ux/system-access@0.6.16

## 0.1.71

_Released: 2025-09-01T12:06:20Z_

### Patch Changes

- @sap-ux/system-access@0.6.15
- @sap-ux/telemetry@0.6.19
- @sap-ux/ui-service-inquirer@0.2.9
- @sap-ux/fiori-generator-shared@0.13.12
- @sap-ux/inquirer-common@0.7.38

## 0.1.70

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- Updated dependencies [4cfebaf]
    - @sap-ux/axios-extension@1.22.6
    - @sap-ux/inquirer-common@0.7.37
    - @sap-ux/btp-utils@1.1.1
    - @sap-ux/telemetry@0.6.18
    - @sap-ux/ui-service-inquirer@0.2.8
    - @sap-ux/fiori-generator-shared@0.13.11
    - @sap-ux/system-access@0.6.14

## 0.1.69

_Released: 2025-08-26T14:19:56Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.7

## 0.1.68

_Released: 2025-08-26T10:18:25Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.6

## 0.1.67

_Released: 2025-08-25T12:19:51Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.5

## 0.1.66

_Released: 2025-08-21T14:27:46Z_

### Patch Changes

- @sap-ux/system-access@0.6.13
- @sap-ux/telemetry@0.6.17
- @sap-ux/ui-service-inquirer@0.2.4
- @sap-ux/fiori-generator-shared@0.13.10
- @sap-ux/inquirer-common@0.7.36

## 0.1.65

_Released: 2025-08-20T09:55:47Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.2.3

## 0.1.64

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- Updated dependencies [178dbea]
    - @sap-ux/ui-service-inquirer@0.2.2
    - @sap-ux/telemetry@0.6.16
    - @sap-ux/axios-extension@1.22.5
    - @sap-ux/fiori-generator-shared@0.13.9
    - @sap-ux/system-access@0.6.12
    - @sap-ux/inquirer-common@0.7.35

## 0.1.63

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/axios-extension@1.22.5
- @sap-ux/fiori-generator-shared@0.13.8
- @sap-ux/system-access@0.6.12
- @sap-ux/telemetry@0.6.15
- @sap-ux/inquirer-common@0.7.34
- @sap-ux/ui-service-inquirer@0.2.1

## 0.1.62

_Released: 2025-08-12T14:05:27Z_

### Patch Changes

- Updated dependencies [b6ce4a2]
    - @sap-ux/ui-service-inquirer@0.2.0
    - @sap-ux/inquirer-common@0.7.33

## 0.1.61

_Released: 2025-08-07T06:27:29Z_

### Patch Changes

- Updated dependencies [18a5ee2]
    - @sap-ux/telemetry@0.6.14
    - @sap-ux/fiori-generator-shared@0.13.7
    - @sap-ux/inquirer-common@0.7.32
    - @sap-ux/ui-service-inquirer@0.1.59

## 0.1.60

_Released: 2025-08-01T13:45:39Z_

### Patch Changes

- Updated dependencies [9f10a60]
    - @sap-ux/axios-extension@1.22.5
    - @sap-ux/ui-service-inquirer@0.1.58
    - @sap-ux/fiori-generator-shared@0.13.6
    - @sap-ux/system-access@0.6.12

## 0.1.59

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- @sap-ux/telemetry@0.6.13
- @sap-ux/ui-service-inquirer@0.1.57
- @sap-ux/axios-extension@1.22.4
- @sap-ux/fiori-generator-shared@0.13.6
- @sap-ux/system-access@0.6.11
- @sap-ux/inquirer-common@0.7.31

## 0.1.58

_Released: 2025-07-31T11:23:22Z_

### Patch Changes

- Updated dependencies [9fa7f0b]
    - @sap-ux/inquirer-common@0.7.30
    - @sap-ux/ui-service-inquirer@0.1.56

## 0.1.57

_Released: 2025-07-31T09:29:51Z_

### Patch Changes

- b63a36e: update "@sap/service-provider-apis": "2.1.9"

## 0.1.56

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- @sap-ux/axios-extension@1.22.4
- @sap-ux/fiori-generator-shared@0.13.5
- @sap-ux/system-access@0.6.11
- @sap-ux/telemetry@0.6.12
- @sap-ux/inquirer-common@0.7.29
- @sap-ux/ui-service-inquirer@0.1.55

## 0.1.55

_Released: 2025-07-30T11:42:24Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.54

## 0.1.54

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- @sap-ux/axios-extension@1.22.4
- @sap-ux/fiori-generator-shared@0.13.4
- @sap-ux/system-access@0.6.11
- @sap-ux/telemetry@0.6.11
- @sap-ux/inquirer-common@0.7.28
- @sap-ux/ui-service-inquirer@0.1.53

## 0.1.53

_Released: 2025-07-28T21:20:33Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.52

## 0.1.52

_Released: 2025-07-28T08:36:50Z_

### Patch Changes

- Updated dependencies [ffac61c]
    - @sap-ux/axios-extension@1.22.4
    - @sap-ux/ui-service-inquirer@0.1.51
    - @sap-ux/fiori-generator-shared@0.13.3
    - @sap-ux/system-access@0.6.11

## 0.1.51

_Released: 2025-07-24T09:25:40Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.50

## 0.1.50

_Released: 2025-07-23T09:52:23Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.49

## 0.1.49

_Released: 2025-07-22T13:05:35Z_

### Patch Changes

- Updated dependencies [ca44076]
    - @sap-ux/fiori-generator-shared@0.13.3
    - @sap-ux/inquirer-common@0.7.27
    - @sap-ux/ui-service-inquirer@0.1.48

## 0.1.48

_Released: 2025-07-21T13:01:41Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.26
- @sap-ux/ui-service-inquirer@0.1.47

## 0.1.47

_Released: 2025-07-17T13:47:26Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.46

## 0.1.46

_Released: 2025-07-16T12:23:18Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.25
- @sap-ux/ui-service-inquirer@0.1.45

## 0.1.45

_Released: 2025-07-11T15:10:00Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.44

## 0.1.44

_Released: 2025-07-10T11:49:34Z_

### Patch Changes

- Updated dependencies [d75db00]
    - @sap-ux/fiori-generator-shared@0.13.2
    - @sap-ux/inquirer-common@0.7.24
    - @sap-ux/ui-service-inquirer@0.1.43

## 0.1.43

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- @sap-ux/axios-extension@1.22.3
- @sap-ux/fiori-generator-shared@0.13.1
- @sap-ux/system-access@0.6.10
- @sap-ux/telemetry@0.6.10
- @sap-ux/inquirer-common@0.7.23
- @sap-ux/ui-service-inquirer@0.1.42

## 0.1.42

_Released: 2025-07-07T13:12:16Z_

### Patch Changes

- Updated dependencies [4459a7f]
    - @sap-ux/ui-service-inquirer@0.1.41

## 0.1.41

_Released: 2025-07-07T08:44:59Z_

### Patch Changes

- Updated dependencies [58abe82]
    - @sap-ux/fiori-generator-shared@0.13.0
    - @sap-ux/inquirer-common@0.7.22
    - @sap-ux/ui-service-inquirer@0.1.40

## 0.1.40

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- 69f62ec: i18next upgrade to 25.3.0
- Updated dependencies [69f62ec]
    - @sap-ux/fiori-generator-shared@0.12.16
    - @sap-ux/ui-service-inquirer@0.1.39
    - @sap-ux/inquirer-common@0.7.21
    - @sap-ux/system-access@0.6.10
    - @sap-ux/telemetry@0.6.9

## 0.1.39

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- @sap-ux/telemetry@0.6.8
- @sap-ux/ui-service-inquirer@0.1.38
- @sap-ux/axios-extension@1.22.3
- @sap-ux/fiori-generator-shared@0.12.15
- @sap-ux/system-access@0.6.9
- @sap-ux/inquirer-common@0.7.20

## 0.1.38

_Released: 2025-07-03T13:23:41Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.37

## 0.1.37

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- @sap-ux/axios-extension@1.22.3
- @sap-ux/fiori-generator-shared@0.12.14
- @sap-ux/system-access@0.6.9
- @sap-ux/telemetry@0.6.7
- @sap-ux/inquirer-common@0.7.19
- @sap-ux/ui-service-inquirer@0.1.36

## 0.1.36

_Released: 2025-06-30T11:02:16Z_

### Patch Changes

- 602e60d: handle namespace for storyboard metadata retrieval

## 0.1.35

_Released: 2025-06-30T08:46:50Z_

### Patch Changes

- b9675bb: Improve Fiori Tools UI Texts
- Updated dependencies [b9675bb]
    - @sap-ux/fiori-generator-shared@0.12.13
    - @sap-ux/ui-service-inquirer@0.1.35
    - @sap-ux/inquirer-common@0.7.18

## 0.1.34

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- @sap-ux/axios-extension@1.22.3
- @sap-ux/fiori-generator-shared@0.12.12
- @sap-ux/system-access@0.6.9
- @sap-ux/telemetry@0.6.6
- @sap-ux/inquirer-common@0.7.17
- @sap-ux/ui-service-inquirer@0.1.34

## 0.1.33

_Released: 2025-06-27T07:08:06Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.33
- @sap-ux/system-access@0.6.9
- @sap-ux/telemetry@0.6.5
- @sap-ux/fiori-generator-shared@0.12.11
- @sap-ux/inquirer-common@0.7.16

## 0.1.32

_Released: 2025-06-25T10:51:12Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.32

## 0.1.31

_Released: 2025-06-24T14:02:12Z_

### Patch Changes

- Updated dependencies [4fef16a]
    - @sap-ux/fiori-generator-shared@0.12.10
    - @sap-ux/inquirer-common@0.7.15
    - @sap-ux/ui-service-inquirer@0.1.31

## 0.1.30

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- Updated dependencies [f9ea9e3]
    - @sap-ux/axios-extension@1.22.3
    - @sap-ux/system-access@0.6.8
    - @sap-ux/ui-service-inquirer@0.1.30
    - @sap-ux/fiori-generator-shared@0.12.9
    - @sap-ux/telemetry@0.6.4
    - @sap-ux/inquirer-common@0.7.14

## 0.1.29

_Released: 2025-06-23T22:19:01Z_

### Patch Changes

- Updated dependencies [14214a3]
    - @sap-ux/axios-extension@1.22.2
    - @sap-ux/system-access@0.6.7
    - @sap-ux/ui-service-inquirer@0.1.29

## 0.1.28

_Released: 2025-06-20T08:26:14Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.28

## 0.1.27

_Released: 2025-06-19T10:31:56Z_

### Patch Changes

- Updated dependencies [a9f1808]
    - @sap-ux/axios-extension@1.22.1
    - @sap-ux/system-access@0.6.6
    - @sap-ux/ui-service-inquirer@0.1.27

## 0.1.26

_Released: 2025-06-19T04:44:24Z_

### Patch Changes

- Updated dependencies [aaf0c14]
    - @sap-ux/axios-extension@1.22.0
    - @sap-ux/system-access@0.6.5
    - @sap-ux/ui-service-inquirer@0.1.26

## 0.1.25

_Released: 2025-06-18T12:01:34Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.25

## 0.1.24

_Released: 2025-06-17T13:40:19Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.24

## 0.1.23

_Released: 2025-06-17T07:58:40Z_

### Patch Changes

- Updated dependencies [163522f]
    - @sap-ux/fiori-generator-shared@0.12.8
    - @sap-ux/inquirer-common@0.7.13
    - @sap-ux/ui-service-inquirer@0.1.23

## 0.1.22

_Released: 2025-06-16T09:52:52Z_

### Patch Changes

- Updated dependencies [20cc54f]
    - @sap-ux/inquirer-common@0.7.12
    - @sap-ux/ui-service-inquirer@0.1.22

## 0.1.21

_Released: 2025-06-13T14:12:57Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.11
- @sap-ux/ui-service-inquirer@0.1.21

## 0.1.20

_Released: 2025-06-13T10:58:52Z_

### Patch Changes

- Updated dependencies [bf752f3]
    - @sap-ux/inquirer-common@0.7.10
    - @sap-ux/ui-service-inquirer@0.1.20

## 0.1.19

_Released: 2025-06-11T12:23:45Z_

### Patch Changes

- Updated dependencies [b45093b]
    - @sap-ux/axios-extension@1.21.4
    - @sap-ux/system-access@0.6.4
    - @sap-ux/ui-service-inquirer@0.1.19

## 0.1.18

_Released: 2025-06-10T17:08:16Z_

### Patch Changes

- Updated dependencies [4303f99]
    - @sap-ux/axios-extension@1.21.3
    - @sap-ux/system-access@0.6.3
    - @sap-ux/ui-service-inquirer@0.1.18

## 0.1.17

_Released: 2025-06-10T07:40:27Z_

### Patch Changes

- Updated dependencies [4e6c22e]
    - @sap-ux/fiori-generator-shared@0.12.7
    - @sap-ux/inquirer-common@0.7.9
    - @sap-ux/ui-service-inquirer@0.1.17

## 0.1.16

_Released: 2025-06-09T09:48:34Z_

### Patch Changes

- Updated dependencies [d6943aa]
    - @sap-ux/inquirer-common@0.7.8
    - @sap-ux/ui-service-inquirer@0.1.16

## 0.1.15

_Released: 2025-06-05T16:14:06Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.15

## 0.1.14

_Released: 2025-06-05T12:32:35Z_

### Patch Changes

- Updated dependencies [95a816d]
    - @sap-ux/fiori-generator-shared@0.12.6
    - @sap-ux/inquirer-common@0.7.7
    - @sap-ux/ui-service-inquirer@0.1.14

## 0.1.13

_Released: 2025-06-05T07:23:07Z_

### Patch Changes

- Updated dependencies [15ec5c4]
    - @sap-ux/fiori-generator-shared@0.12.5
    - @sap-ux/ui-service-inquirer@0.1.13
    - @sap-ux/inquirer-common@0.7.6

## 0.1.12

_Released: 2025-06-04T10:59:54Z_

### Patch Changes

- Updated dependencies [61d4060]
    - @sap-ux/ui-service-inquirer@0.1.12
    - @sap-ux/axios-extension@1.21.2
    - @sap-ux/system-access@0.6.2

## 0.1.11

_Released: 2025-05-30T15:02:23Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.11

## 0.1.10

_Released: 2025-05-30T09:02:15Z_

### Patch Changes

- Updated dependencies [91726b0]
    - @sap-ux/fiori-generator-shared@0.12.4
    - @sap-ux/inquirer-common@0.7.5
    - @sap-ux/ui-service-inquirer@0.1.10

## 0.1.9

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- @sap-ux/telemetry@0.6.3
- @sap-ux/ui-service-inquirer@0.1.9
- @sap-ux/axios-extension@1.21.1
- @sap-ux/fiori-generator-shared@0.12.3
- @sap-ux/system-access@0.6.1
- @sap-ux/inquirer-common@0.7.4

## 0.1.8

_Released: 2025-05-28T07:35:56Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.8

## 0.1.7

_Released: 2025-05-27T17:59:17Z_

### Patch Changes

- Updated dependencies [ac55cca]
    - @sap-ux/fiori-generator-shared@0.12.2
    - @sap-ux/telemetry@0.6.2
    - @sap-ux/inquirer-common@0.7.3
    - @sap-ux/ui-service-inquirer@0.1.7

## 0.1.6

_Released: 2025-05-27T15:05:11Z_

### Patch Changes

- Updated dependencies [b3fe5b8]
    - @sap-ux/inquirer-common@0.7.2
    - @sap-ux/ui-service-inquirer@0.1.6

## 0.1.5

_Released: 2025-05-27T12:59:01Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.5

## 0.1.4

_Released: 2025-05-23T13:35:39Z_

### Patch Changes

- Updated dependencies [2224d63]
    - @sap-ux/axios-extension@1.21.1
    - @sap-ux/system-access@0.6.1
    - @sap-ux/ui-service-inquirer@0.1.4

## 0.1.3

_Released: 2025-05-21T14:23:57Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.3

## 0.1.2

_Released: 2025-05-20T15:02:49Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.1.2

## 0.1.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- Updated dependencies [66b88e1]
    - @sap-ux/inquirer-common@0.7.1
    - @sap-ux/telemetry@0.6.1
    - @sap-ux/ui-service-inquirer@0.1.1
    - @sap-ux/axios-extension@1.21.0
    - @sap-ux/fiori-generator-shared@0.12.1
    - @sap-ux/system-access@0.6.0

## 0.1.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/fiori-generator-shared@0.12.0
    - @sap-ux/ui-service-inquirer@0.1.0
    - @sap-ux/axios-extension@1.21.0
    - @sap-ux/inquirer-common@0.7.0
    - @sap-ux/feature-toggle@0.3.0
    - @sap-ux/system-access@0.6.0
    - @sap-ux/btp-utils@1.1.0
    - @sap-ux/telemetry@0.6.0
    - @sap-ux/logger@0.7.0

## 0.0.42

_Released: 2025-05-14T10:30:39Z_

### Patch Changes

- d41992e: use namespace correctly for transport and metadata requests
- Updated dependencies [d41992e]
    - @sap-ux/ui-service-inquirer@0.0.42

## 0.0.41

_Released: 2025-05-13T10:46:10Z_

### Patch Changes

- Updated dependencies [5585f0d]
    - @sap-ux/feature-toggle@0.2.4
    - @sap-ux/axios-extension@1.20.3
    - @sap-ux/inquirer-common@0.6.43
    - @sap-ux/system-access@0.5.39
    - @sap-ux/ui-service-inquirer@0.0.41

## 0.0.40

_Released: 2025-05-08T10:12:31Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.40

## 0.0.39

_Released: 2025-05-07T16:24:47Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.39

## 0.0.38

_Released: 2025-05-07T15:17:23Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.38

## 0.0.37

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- @sap-ux/axios-extension@1.20.2
- @sap-ux/fiori-generator-shared@0.11.3
- @sap-ux/system-access@0.5.38
- @sap-ux/telemetry@0.5.78
- @sap-ux/inquirer-common@0.6.42
- @sap-ux/ui-service-inquirer@0.0.37

## 0.0.36

_Released: 2025-05-02T16:07:01Z_

### Patch Changes

- Updated dependencies [cb8ff79]
    - @sap-ux/ui-service-inquirer@0.0.36

## 0.0.35

_Released: 2025-05-02T10:00:21Z_

### Patch Changes

- Updated dependencies [1a01c5e]
    - @sap-ux/axios-extension@1.20.2
    - @sap-ux/system-access@0.5.38
    - @sap-ux/ui-service-inquirer@0.0.35

## 0.0.34

_Released: 2025-05-01T13:52:16Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.41
- @sap-ux/ui-service-inquirer@0.0.34

## 0.0.33

_Released: 2025-05-01T11:45:06Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.33

## 0.0.32

_Released: 2025-04-30T09:58:47Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.32

## 0.0.31

_Released: 2025-04-30T08:50:36Z_

### Patch Changes

- Updated dependencies [a3a43b2]
    - @sap-ux/axios-extension@1.20.1
    - @sap-ux/system-access@0.5.37
    - @sap-ux/ui-service-inquirer@0.0.31

## 0.0.30

_Released: 2025-04-29T17:55:48Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.30

## 0.0.29

_Released: 2025-04-28T14:29:23Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.40
- @sap-ux/ui-service-inquirer@0.0.29

## 0.0.28

_Released: 2025-04-28T08:38:04Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.28

## 0.0.27

_Released: 2025-04-25T15:42:49Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.27

## 0.0.26

_Released: 2025-04-24T19:30:21Z_

### Patch Changes

- 10f1d60: show draft enabled prompt for compatible business objects
- Updated dependencies [10f1d60]
    - @sap-ux/ui-service-inquirer@0.0.26

## 0.0.25

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- @sap-ux/telemetry@0.5.77
- @sap-ux/ui-service-inquirer@0.0.25
- @sap-ux/axios-extension@1.20.0
- @sap-ux/fiori-generator-shared@0.11.2
- @sap-ux/system-access@0.5.36
- @sap-ux/inquirer-common@0.6.39

## 0.0.24

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- @sap-ux/axios-extension@1.20.0
- @sap-ux/fiori-generator-shared@0.11.1
- @sap-ux/system-access@0.5.36
- @sap-ux/telemetry@0.5.76
- @sap-ux/inquirer-common@0.6.38
- @sap-ux/ui-service-inquirer@0.0.24

## 0.0.23

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- Updated dependencies [1ca4004]
    - @sap-ux/fiori-generator-shared@0.11.0
    - @sap-ux/inquirer-common@0.6.37
    - @sap-ux/telemetry@0.5.75
    - @sap-ux/ui-service-inquirer@0.0.23
    - @sap-ux/axios-extension@1.20.0
    - @sap-ux/system-access@0.5.36

## 0.0.22

_Released: 2025-04-23T10:09:45Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.22

## 0.0.21

_Released: 2025-04-17T12:52:13Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.36
- @sap-ux/ui-service-inquirer@0.0.21

## 0.0.20

_Released: 2025-04-17T09:03:34Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.20

## 0.0.19

_Released: 2025-04-16T15:50:22Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.19

## 0.0.18

_Released: 2025-04-15T14:18:17Z_

### Patch Changes

- Updated dependencies [28c6594]
    - @sap-ux/axios-extension@1.20.0
    - @sap-ux/system-access@0.5.36
    - @sap-ux/ui-service-inquirer@0.0.18

## 0.0.17

_Released: 2025-04-15T10:10:52Z_

### Patch Changes

- Updated dependencies [9392ebd]
    - @sap-ux/telemetry@0.5.74
    - @sap-ux/fiori-generator-shared@0.10.2
    - @sap-ux/inquirer-common@0.6.35
    - @sap-ux/ui-service-inquirer@0.0.17

## 0.0.16

_Released: 2025-04-14T22:24:07Z_

### Patch Changes

- Updated dependencies [d638daa]
    - @sap-ux/btp-utils@1.0.3
    - @sap-ux/axios-extension@1.19.3
    - @sap-ux/fiori-generator-shared@0.10.1
    - @sap-ux/inquirer-common@0.6.34
    - @sap-ux/system-access@0.5.35
    - @sap-ux/telemetry@0.5.73
    - @sap-ux/ui-service-inquirer@0.0.16

## 0.0.15

_Released: 2025-04-14T19:08:52Z_

### Patch Changes

- d0b2dc2: remove draftEnabled prompt for ABAP CDS view
- Updated dependencies [d0b2dc2]
    - @sap-ux/ui-service-inquirer@0.0.15

## 0.0.14

_Released: 2025-04-14T10:01:18Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.14

## 0.0.13

_Released: 2025-04-14T08:07:15Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.13

## 0.0.12

_Released: 2025-04-10T13:52:38Z_

### Patch Changes

- Updated dependencies [23e055a]
    - @sap-ux/fiori-generator-shared@0.10.0
    - @sap-ux/inquirer-common@0.6.33
    - @sap-ux/ui-service-inquirer@0.0.12

## 0.0.11

_Released: 2025-04-04T14:37:20Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.11

## 0.0.10

_Released: 2025-04-01T14:03:23Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.10

## 0.0.9

_Released: 2025-04-01T08:11:09Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.9

## 0.0.8

_Released: 2025-03-26T12:15:41Z_

### Patch Changes

- Updated dependencies [ced5edf]
    - @sap-ux/axios-extension@1.19.2
    - @sap-ux/inquirer-common@0.6.32
    - @sap-ux/system-access@0.5.34
    - @sap-ux/ui-service-inquirer@0.0.8

## 0.0.7

_Released: 2025-03-26T09:06:26Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.7

## 0.0.6

_Released: 2025-03-22T09:43:02Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.6

## 0.0.5

_Released: 2025-03-20T14:57:37Z_

### Patch Changes

- @sap-ux/ui-service-inquirer@0.0.5

## 0.0.4

_Released: 2025-03-19T08:54:25Z_

### Patch Changes

- @sap-ux/axios-extension@1.19.1
- @sap-ux/fiori-generator-shared@0.9.11
- @sap-ux/system-access@0.5.33
- @sap-ux/telemetry@0.5.72
- @sap-ux/inquirer-common@0.6.31
- @sap-ux/ui-service-inquirer@0.0.4

## 0.0.3

_Released: 2025-03-18T22:01:55Z_

### Patch Changes

- a566e73: use package from existing value correctly
- Updated dependencies [a566e73]
    - @sap-ux/ui-service-inquirer@0.0.3

## 0.0.2

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- @sap-ux/telemetry@0.5.71
- @sap-ux/ui-service-inquirer@0.0.2
- @sap-ux/axios-extension@1.19.1
- @sap-ux/fiori-generator-shared@0.9.10
- @sap-ux/system-access@0.5.33
- @sap-ux/inquirer-common@0.6.30

## 0.0.1

_Released: 2025-04-01T14:03:23Z_

### Patch Changes

- fe34c7e: add new modules for ui service inquirer and sub gen
- Updated dependencies [fe34c7e]
    - @sap-ux/ui-service-inquirer@0.0.1
