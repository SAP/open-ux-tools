# @sap-ux/ui5-library-reference-inquirer

## 1.0.22

### Patch Changes

#### Workspace Updates

- @sap-ux/inquirer-common 1.0.20 → 1.0.21
- @sap-ux/project-access 2.1.6 → 2.1.6

## 1.0.21

### Patch Changes

#### Workspace Updates

- @sap-ux/inquirer-common 1.0.19 → 1.0.20

## 1.0.20

### Patch Changes

#### Workspace Updates

- @sap-ux/inquirer-common 1.0.18 → 1.0.19
- @sap-ux/project-access 2.1.5 → 2.1.6

## 1.0.19

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

#### Workspace Updates

- @sap-ux/inquirer-common 1.0.17 → 1.0.18
- @sap-ux/project-access 2.1.4 → 2.1.5

## 1.0.18

### Patch Changes

#### Workspace Updates

- @sap-ux/inquirer-common 1.0.16 → 1.0.17

## 1.0.17

### Patch Changes

#### Workspace Updates

- @sap-ux/inquirer-common 1.0.15 → 1.0.16

## 1.0.16

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.3 → 2.1.4
- @sap-ux/inquirer-common 1.0.14 → 1.0.15

## 1.0.15

### Patch Changes

#### Workspace Updates

- @sap-ux/inquirer-common 1.0.13 → 1.0.14

## 1.0.14

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.2 → 2.1.3
- @sap-ux/inquirer-common 1.0.12 → 1.0.13

## 1.0.13

### Patch Changes

#### Release Date

2026-06-23

#### Bug Fixes

- Update no libraries found message to include migration hint [[5ea737f](https://github.com/SAP/open-ux-tools/commit/5ea737f8f14c19f37744a2cba9c4cf7306c481d2)]

## 1.0.12

### Patch Changes

#### Workspace Updates

- @sap-ux/inquirer-common 1.0.11 → 1.0.12

## 1.0.11

_Released: 2026-06-12T06:53:23Z_

### Patch Changes

- @sap-ux/inquirer-common@1.0.11

## 1.0.10

_Released: 2026-06-11T10:54:17Z_

### Patch Changes

- @sap-ux/inquirer-common@1.0.10

## 1.0.9

_Released: 2026-06-10T09:57:42Z_

### Patch Changes

- @sap-ux/project-access@2.1.2
- @sap-ux/inquirer-common@1.0.9

## 1.0.8

_Released: 2026-06-09T14:35:01Z_

### Patch Changes

- @sap-ux/inquirer-common@1.0.8

## 1.0.7

_Released: 2026-06-09T13:18:16Z_

### Patch Changes

- @sap-ux/inquirer-common@1.0.7

## 1.0.6

_Released: 2026-06-04T13:54:21Z_

### Patch Changes

- Updated dependencies [fff7490]
    - @sap-ux/project-access@2.1.1
    - @sap-ux/inquirer-common@1.0.6

## 1.0.5

_Released: 2026-06-04T10:19:37Z_

### Patch Changes

- Updated dependencies [b326a9a]
    - @sap-ux/project-access@2.1.0
    - @sap-ux/inquirer-common@1.0.5

## 1.0.4

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/inquirer-common@1.0.4
    - @sap-ux/project-access@2.0.3

## 1.0.3

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- @sap-ux/project-access@2.0.2
- @sap-ux/inquirer-common@1.0.3

## 1.0.2

_Released: 2026-06-02T11:35:17Z_

### Patch Changes

- @sap-ux/inquirer-common@1.0.2

## 1.0.1

_Released: 2026-06-01T15:15:26Z_

### Patch Changes

- Updated dependencies [aed799d]
    - @sap-ux/project-access@2.0.1
    - @sap-ux/inquirer-common@1.0.1

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
    - @sap-ux/inquirer-common@1.0.0
    - @sap-ux/project-access@2.0.0

## 0.5.7

_Released: 2026-05-29T12:50:34Z_

### Patch Changes

- @sap-ux/inquirer-common@0.13.6

## 0.5.6

_Released: 2026-05-27T11:39:21Z_

### Patch Changes

- @sap-ux/inquirer-common@0.13.5

## 0.5.5

_Released: 2026-05-27T10:42:47Z_

### Patch Changes

- @sap-ux/inquirer-common@0.13.4

## 0.5.4

_Released: 2026-05-26T16:40:21Z_

### Patch Changes

- @sap-ux/inquirer-common@0.13.3

## 0.5.3

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- @sap-ux/project-access@1.38.1
- @sap-ux/inquirer-common@0.13.2

## 0.5.2

_Released: 2026-05-19T15:16:46Z_

### Patch Changes

- Updated dependencies [63e6846]
    - @sap-ux/project-access@1.38.0
    - @sap-ux/inquirer-common@0.13.1

## 0.5.1

_Released: 2026-05-15T13:12:06Z_

### Patch Changes

- Updated dependencies [2c76f8f]
    - @sap-ux/inquirer-common@0.13.0

## 0.5.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/inquirer-common@0.12.0
    - @sap-ux/project-access@1.37.0

## 0.4.157

_Released: 2026-05-14T21:28:41Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.48

## 0.4.156

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/inquirer-common@0.11.47
    - @sap-ux/project-access@1.36.5

## 0.4.155

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- Updated dependencies [21abda3]
    - @sap-ux/project-access@1.36.4
    - @sap-ux/inquirer-common@0.11.46

## 0.4.154

_Released: 2026-05-12T18:00:39Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.45

## 0.4.153

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- Updated dependencies [678a08e]
    - @sap-ux/inquirer-common@0.11.44
    - @sap-ux/project-access@1.36.3

## 0.4.152

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.43
- @sap-ux/project-access@1.36.2

## 0.4.151

_Released: 2026-04-29T15:24:37Z_

### Patch Changes

- Updated dependencies [3945459]
    - @sap-ux/project-access@1.36.1
    - @sap-ux/inquirer-common@0.11.42

## 0.4.150

_Released: 2026-04-27T19:47:46Z_

### Patch Changes

- Updated dependencies [1d60871]
    - @sap-ux/project-access@1.36.0
    - @sap-ux/inquirer-common@0.11.41

## 0.4.149

_Released: 2026-04-23T12:54:21Z_

### Patch Changes

- Updated dependencies [03d3ea1]
    - @sap-ux/project-access@1.35.21
    - @sap-ux/inquirer-common@0.11.40

## 0.4.148

_Released: 2026-04-23T06:48:55Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.39

## 0.4.147

_Released: 2026-04-22T12:38:46Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.38

## 0.4.146

_Released: 2026-04-15T11:53:17Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.37

## 0.4.145

_Released: 2026-04-14T20:26:28Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.36

## 0.4.144

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- Updated dependencies [cc4450c]
    - @sap-ux/inquirer-common@0.11.35
    - @sap-ux/project-access@1.35.20

## 0.4.143

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- Updated dependencies [f1e4481]
    - @sap-ux/inquirer-common@0.11.34
    - @sap-ux/project-access@1.35.19

## 0.4.142

_Released: 2026-04-01T11:49:37Z_

### Patch Changes

- Updated dependencies [3291f6c]
    - @sap-ux/project-access@1.35.18
    - @sap-ux/inquirer-common@0.11.33

## 0.4.141

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(ui5-library-reference-inquirer): upgrade shared devDependencies (jest 30, i18next 25)
- Updated dependencies [c53a4ba]
    - @sap-ux/inquirer-common@0.11.32
    - @sap-ux/project-access@1.35.17

## 0.4.140

_Released: 2026-03-27T15:37:24Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.31

## 0.4.139

_Released: 2026-03-27T11:58:49Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.30

## 0.4.138

_Released: 2026-03-26T20:06:10Z_

### Patch Changes

- Updated dependencies [b66e827]
    - @sap-ux/project-access@1.35.17
    - @sap-ux/inquirer-common@0.11.29

## 0.4.137

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: chore(ui5-library-reference-inquirer): upgrade i18next 25.8.18 → 25.8.20
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/inquirer-common@0.11.28
    - @sap-ux/project-access@1.35.16

## 0.4.136

_Released: 2026-03-25T12:56:41Z_

### Patch Changes

- Updated dependencies [f384ace]
    - @sap-ux/project-access@1.35.15
    - @sap-ux/inquirer-common@0.11.27

## 0.4.135

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.26
- @sap-ux/project-access@1.35.14

## 0.4.134

_Released: 2026-03-18T16:51:44Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.25

## 0.4.133

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18
- Updated dependencies [55417bb]
    - @sap-ux/inquirer-common@0.11.24

## 0.4.132

_Released: 2026-03-06T13:19:33Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.23

## 0.4.131

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- Updated dependencies [d834713]
    - @sap-ux/project-access@1.35.13
    - @sap-ux/inquirer-common@0.11.22

## 0.4.130

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- Updated dependencies [7c06ef0]
    - @sap-ux/inquirer-common@0.11.21
    - @sap-ux/project-access@1.35.12

## 0.4.129

_Released: 2026-03-05T10:41:09Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.20

## 0.4.128

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- f5f9a78: fix(deps): update dependency @sap-devx/yeoman-ui-types to v1.22.0
- Updated dependencies [f5f9a78]
    - @sap-ux/inquirer-common@0.11.19
    - @sap-ux/project-access@1.35.11

## 0.4.127

_Released: 2026-03-04T15:52:08Z_

### Patch Changes

- Updated dependencies [2302698]
    - @sap-ux/inquirer-common@0.11.18

## 0.4.126

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- @sap-ux/project-access@1.35.11
- @sap-ux/inquirer-common@0.11.17

## 0.4.125

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/project-access@1.35.10
    - @sap-ux/inquirer-common@0.11.16

## 0.4.124

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- 6c993f3: fix: turn off i18next support notice
- Updated dependencies [6c993f3]
    - @sap-ux/inquirer-common@0.11.15

## 0.4.123

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.9
- @sap-ux/inquirer-common@0.11.14

## 0.4.122

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- Updated dependencies [0ecc5f1]
    - @sap-ux/project-access@1.35.8
    - @sap-ux/inquirer-common@0.11.13

## 0.4.121

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.7
- @sap-ux/inquirer-common@0.11.12

## 0.4.120

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- Updated dependencies [ff634b0]
    - @sap-ux/inquirer-common@0.11.11

## 0.4.119

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12
- Updated dependencies [cbd340a]
    - @sap-ux/inquirer-common@0.11.10

## 0.4.118

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- Updated dependencies [bb310dc]
- Updated dependencies [e5bc3ca]
    - @sap-ux/inquirer-common@0.11.9
    - @sap-ux/project-access@1.35.6

## 0.4.117

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/project-access@1.35.5
    - @sap-ux/inquirer-common@0.11.8

## 0.4.116

_Released: 2026-02-16T18:48:13Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.7

## 0.4.115

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- @sap-ux/project-access@1.35.4
- @sap-ux/inquirer-common@0.11.6

## 0.4.114

_Released: 2026-02-13T16:18:58Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.5

## 0.4.113

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- Updated dependencies [346f09c]
    - @sap-ux/project-access@1.35.3
    - @sap-ux/inquirer-common@0.11.4

## 0.4.112

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- Updated dependencies [d2b772d]
    - @sap-ux/project-access@1.35.2
    - @sap-ux/inquirer-common@0.11.3

## 0.4.111

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/inquirer-common@0.11.2
    - @sap-ux/project-access@1.35.1

## 0.4.110

_Released: 2026-02-09T15:13:41Z_

### Patch Changes

- Updated dependencies [1ad56d1]
    - @sap-ux/inquirer-common@0.11.1

## 0.4.109

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/inquirer-common@0.11.0
    - @sap-ux/project-access@1.35.0

## 0.4.108

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- Updated dependencies [467e6aa]
    - @sap-ux/project-access@1.34.7
    - @sap-ux/inquirer-common@0.10.26

## 0.4.107

_Released: 2026-02-05T13:53:56Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.25

## 0.4.106

_Released: 2026-02-05T11:39:04Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.24

## 0.4.105

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- Updated dependencies [ad321ab]
    - @sap-ux/inquirer-common@0.10.23
    - @sap-ux/project-access@1.34.6

## 0.4.104

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- Updated dependencies [9f11dd2]
    - @sap-ux/inquirer-common@0.10.22

## 0.4.103

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [89175fe]
    - @sap-ux/project-access@1.34.5
    - @sap-ux/inquirer-common@0.10.21

## 0.4.102

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- Updated dependencies [ea7a16c]
    - @sap-ux/inquirer-common@0.10.20
    - @sap-ux/project-access@1.34.4

## 0.4.101

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- Updated dependencies [6d71400]
    - @sap-ux/project-access@1.34.3
    - @sap-ux/inquirer-common@0.10.19

## 0.4.100

_Released: 2026-01-28T00:19:05Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.18

## 0.4.99

_Released: 2026-01-23T23:57:30Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.17

## 0.4.98

_Released: 2026-01-23T22:30:10Z_

### Patch Changes

- Updated dependencies [d11943d]
    - @sap-ux/inquirer-common@0.10.16

## 0.4.97

_Released: 2026-01-23T12:49:27Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.15

## 0.4.96

_Released: 2026-01-19T12:47:48Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.14

## 0.4.95

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- Updated dependencies [be67fc4]
    - @sap-ux/project-access@1.34.2
    - @sap-ux/inquirer-common@0.10.13

## 0.4.94

_Released: 2026-01-16T12:32:24Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.12

## 0.4.93

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1
    - @sap-ux/inquirer-common@0.10.11

## 0.4.92

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0
    - @sap-ux/inquirer-common@0.10.10

## 0.4.91

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- Updated dependencies [f13d1c2]
    - @sap-ux/project-access@1.33.2
    - @sap-ux/inquirer-common@0.10.9

## 0.4.90

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/inquirer-common@0.10.8
    - @sap-ux/project-access@1.33.1

## 0.4.89

_Released: 2026-01-08T17:12:17Z_

### Patch Changes

- Updated dependencies [2204ad3]
    - @sap-ux/inquirer-common@0.10.7

## 0.4.88

_Released: 2026-01-07T10:20:40Z_

### Patch Changes

- Updated dependencies [6382440]
    - @sap-ux/inquirer-common@0.10.6

## 0.4.87

_Released: 2026-01-06T14:37:31Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.5

## 0.4.86

_Released: 2026-01-05T14:16:22Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.4

## 0.4.85

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/project-access@1.33.0
    - @sap-ux/inquirer-common@0.10.3

## 0.4.84

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/inquirer-common@0.10.2
    - @sap-ux/project-access@1.32.17

## 0.4.83

_Released: 2025-12-18T13:13:52Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.1

## 0.4.82

_Released: 2025-12-18T08:56:52Z_

### Patch Changes

- Updated dependencies [5287327]
    - @sap-ux/inquirer-common@0.10.0

## 0.4.81

_Released: 2025-12-16T11:43:52Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.17

## 0.4.80

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/inquirer-common@0.9.16
    - @sap-ux/project-access@1.32.16

## 0.4.79

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- Updated dependencies [7217d7d]
    - @sap-ux/project-access@1.32.15
    - @sap-ux/inquirer-common@0.9.15

## 0.4.78

_Released: 2025-12-12T09:02:37Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.14

## 0.4.77

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- Updated dependencies [4bdced0]
    - @sap-ux/project-access@1.32.14
    - @sap-ux/inquirer-common@0.9.13

## 0.4.76

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- Updated dependencies [985223a]
    - @sap-ux/project-access@1.32.13
    - @sap-ux/inquirer-common@0.9.12

## 0.4.75

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.11

## 0.4.74

_Released: 2025-12-05T12:18:49Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.10

## 0.4.73

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- Updated dependencies [45fe64e]
    - @sap-ux/project-access@1.32.12
    - @sap-ux/inquirer-common@0.9.9

## 0.4.72

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- Updated dependencies [07725fe]
    - @sap-ux/project-access@1.32.11
    - @sap-ux/inquirer-common@0.9.8

## 0.4.71

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.7
- @sap-ux/project-access@1.32.10

## 0.4.70

_Released: 2025-11-26T12:17:21Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.6

## 0.4.69

_Released: 2025-11-26T00:12:42Z_

### Patch Changes

- Updated dependencies [597834f]
    - @sap-ux/inquirer-common@0.9.5

## 0.4.68

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- Updated dependencies [7c09c8e]
- Updated dependencies [1c13c9c]
    - @sap-ux/project-access@1.32.9
    - @sap-ux/inquirer-common@0.9.4

## 0.4.67

_Released: 2025-11-07T13:23:57Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.3

## 0.4.66

_Released: 2025-11-06T15:12:51Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.2

## 0.4.65

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/inquirer-common@0.9.1
    - @sap-ux/project-access@1.32.8

## 0.4.64

_Released: 2025-11-03T10:50:00Z_

### Patch Changes

- Updated dependencies [4ddcff3]
    - @sap-ux/inquirer-common@0.9.0

## 0.4.63

_Released: 2025-10-31T13:35:34Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.10

## 0.4.62

_Released: 2025-10-29T17:02:38Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.9

## 0.4.61

_Released: 2025-10-29T11:04:17Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.8

## 0.4.60

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- Updated dependencies [d895232]
    - @sap-ux/project-access@1.32.7
    - @sap-ux/inquirer-common@0.8.7

## 0.4.59

_Released: 2025-10-22T18:56:41Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.6

## 0.4.58

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- Updated dependencies [ea0a942]
    - @sap-ux/project-access@1.32.6
    - @sap-ux/inquirer-common@0.8.5

## 0.4.57

_Released: 2025-10-21T09:37:06Z_

### Patch Changes

- Updated dependencies [06bc541]
    - @sap-ux/inquirer-common@0.8.4

## 0.4.56

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- Updated dependencies [c5d7915]
    - @sap-ux/project-access@1.32.5
    - @sap-ux/inquirer-common@0.8.3

## 0.4.55

_Released: 2025-10-17T11:37:38Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.2

## 0.4.54

_Released: 2025-10-17T09:45:11Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.1

## 0.4.53

_Released: 2025-10-15T16:45:46Z_

### Patch Changes

- Updated dependencies [4053369]
    - @sap-ux/inquirer-common@0.8.0

## 0.4.52

_Released: 2025-10-14T13:22:30Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.51

## 0.4.51

_Released: 2025-10-10T13:53:56Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.50

## 0.4.50

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- @sap-ux/project-access@1.32.4
- @sap-ux/inquirer-common@0.7.49

## 0.4.49

_Released: 2025-10-10T09:39:17Z_

### Patch Changes

- e015869: chore: patch inquirer dependency

## 0.4.48

_Released: 2025-10-07T13:15:25Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.48

## 0.4.47

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/inquirer-common@0.7.47
    - @sap-ux/project-access@1.32.3

## 0.4.46

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- @sap-ux/project-access@1.32.2
- @sap-ux/inquirer-common@0.7.46

## 0.4.45

_Released: 2025-09-23T20:14:56Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.45

## 0.4.44

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- Updated dependencies [9872384]
    - @sap-ux/inquirer-common@0.7.44
    - @sap-ux/project-access@1.32.1

## 0.4.43

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- Updated dependencies [f9b4afe]
    - @sap-ux/project-access@1.32.0
    - @sap-ux/inquirer-common@0.7.43

## 0.4.42

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- Updated dependencies [c385a76]
    - @sap-ux/project-access@1.31.0
    - @sap-ux/inquirer-common@0.7.42

## 0.4.41

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- @sap-ux/project-access@1.30.14
- @sap-ux/inquirer-common@0.7.41

## 0.4.40

_Released: 2025-09-11T11:04:24Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.40

## 0.4.39

_Released: 2025-09-02T13:22:05Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.39

## 0.4.38

_Released: 2025-09-01T12:06:20Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.38

## 0.4.37

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- Updated dependencies [4cfebaf]
    - @sap-ux/inquirer-common@0.7.37
    - @sap-ux/project-access@1.30.13

## 0.4.36

_Released: 2025-08-21T14:27:46Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.36

## 0.4.35

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- @sap-ux/project-access@1.30.12
- @sap-ux/inquirer-common@0.7.35

## 0.4.34

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/project-access@1.30.11
- @sap-ux/inquirer-common@0.7.34

## 0.4.33

_Released: 2025-08-12T14:05:27Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.33

## 0.4.32

_Released: 2025-08-07T06:27:29Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.32

## 0.4.31

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- @sap-ux/project-access@1.30.10
- @sap-ux/inquirer-common@0.7.31

## 0.4.30

_Released: 2025-07-31T11:23:22Z_

### Patch Changes

- Updated dependencies [9fa7f0b]
    - @sap-ux/inquirer-common@0.7.30

## 0.4.29

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.9
- @sap-ux/inquirer-common@0.7.29

## 0.4.28

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- Updated dependencies [4e0bd83]
    - @sap-ux/project-access@1.30.8
    - @sap-ux/inquirer-common@0.7.28

## 0.4.27

_Released: 2025-07-22T13:05:35Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.27

## 0.4.26

_Released: 2025-07-21T13:01:41Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.26

## 0.4.25

_Released: 2025-07-16T12:23:18Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.25

## 0.4.24

_Released: 2025-07-10T11:49:34Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.24

## 0.4.23

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- Updated dependencies [58cdce6]
    - @sap-ux/project-access@1.30.7
    - @sap-ux/inquirer-common@0.7.23

## 0.4.22

_Released: 2025-07-07T08:44:59Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.22

## 0.4.21

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- 69f62ec: i18next upgrade to 25.3.0
- Updated dependencies [69f62ec]
    - @sap-ux/inquirer-common@0.7.21

## 0.4.20

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- @sap-ux/project-access@1.30.6
- @sap-ux/inquirer-common@0.7.20

## 0.4.19

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- Updated dependencies [7a4543e]
    - @sap-ux/project-access@1.30.5
    - @sap-ux/inquirer-common@0.7.19

## 0.4.18

_Released: 2025-06-30T08:46:50Z_

### Patch Changes

- b9675bb: Improve Fiori Tools UI Texts
- Updated dependencies [b9675bb]
    - @sap-ux/inquirer-common@0.7.18

## 0.4.17

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- Updated dependencies [f75b89d]
    - @sap-ux/project-access@1.30.4
    - @sap-ux/inquirer-common@0.7.17

## 0.4.16

_Released: 2025-06-27T07:08:06Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.16

## 0.4.15

_Released: 2025-06-24T14:02:12Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.15

## 0.4.14

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.3
- @sap-ux/inquirer-common@0.7.14

## 0.4.13

_Released: 2025-06-17T07:58:40Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.13

## 0.4.12

_Released: 2025-06-16T09:52:52Z_

### Patch Changes

- Updated dependencies [20cc54f]
    - @sap-ux/inquirer-common@0.7.12

## 0.4.11

_Released: 2025-06-13T14:12:57Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.11

## 0.4.10

_Released: 2025-06-13T10:58:52Z_

### Patch Changes

- Updated dependencies [bf752f3]
    - @sap-ux/inquirer-common@0.7.10

## 0.4.9

_Released: 2025-06-10T07:40:27Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.9

## 0.4.8

_Released: 2025-06-09T09:48:34Z_

### Patch Changes

- Updated dependencies [d6943aa]
    - @sap-ux/inquirer-common@0.7.8

## 0.4.7

_Released: 2025-06-05T12:32:35Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.7

## 0.4.6

_Released: 2025-06-05T07:23:07Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.6

## 0.4.5

_Released: 2025-05-30T09:02:15Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.5

## 0.4.4

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- @sap-ux/project-access@1.30.2
- @sap-ux/inquirer-common@0.7.4

## 0.4.3

_Released: 2025-05-27T17:59:17Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.3

## 0.4.2

_Released: 2025-05-27T15:05:11Z_

### Patch Changes

- Updated dependencies [b3fe5b8]
    - @sap-ux/inquirer-common@0.7.2

## 0.4.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- Updated dependencies [66b88e1]
    - @sap-ux/inquirer-common@0.7.1
    - @sap-ux/project-access@1.30.1

## 0.4.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/inquirer-common@0.7.0
    - @sap-ux/project-access@1.30.0

## 0.3.104

_Released: 2025-05-13T10:46:10Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.43

## 0.3.103

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- Updated dependencies [ea0e2c0]
    - @sap-ux/project-access@1.29.22
    - @sap-ux/inquirer-common@0.6.42

## 0.3.102

_Released: 2025-05-01T13:52:16Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.41

## 0.3.101

_Released: 2025-04-28T14:29:23Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.40

## 0.3.100

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- @sap-ux/project-access@1.29.21
- @sap-ux/inquirer-common@0.6.39

## 0.3.99

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- Updated dependencies [294bbe3]
    - @sap-ux/project-access@1.29.20
    - @sap-ux/inquirer-common@0.6.38

## 0.3.98

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.37
- @sap-ux/project-access@1.29.19

## 0.3.97

_Released: 2025-04-17T12:52:13Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.36

## 0.3.96

_Released: 2025-04-15T10:10:52Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.35

## 0.3.95

_Released: 2025-04-14T22:24:07Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.34

## 0.3.94

_Released: 2025-04-10T13:52:38Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.33

## 0.3.93

_Released: 2025-03-26T12:15:41Z_

### Patch Changes

- Updated dependencies [ced5edf]
    - @sap-ux/inquirer-common@0.6.32

## 0.3.92

_Released: 2025-03-19T08:54:25Z_

### Patch Changes

- Updated dependencies [c3ebc82]
    - @sap-ux/project-access@1.29.18
    - @sap-ux/inquirer-common@0.6.31

## 0.3.91

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- @sap-ux/project-access@1.29.17
- @sap-ux/inquirer-common@0.6.30

## 0.3.90

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- Updated dependencies [011c8c5]
    - @sap-ux/inquirer-common@0.6.29
    - @sap-ux/project-access@1.29.16

## 0.3.89

_Released: 2025-03-06T16:16:20Z_

### Patch Changes

- Updated dependencies [1ce7fe9]
    - @sap-ux/project-access@1.29.15
    - @sap-ux/inquirer-common@0.6.28

## 0.3.88

_Released: 2025-03-05T11:16:53Z_

### Patch Changes

- Updated dependencies [3cc8f8a]
    - @sap-ux/project-access@1.29.14
    - @sap-ux/inquirer-common@0.6.27

## 0.3.87

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- @sap-ux/project-access@1.29.13
- @sap-ux/inquirer-common@0.6.26

## 0.3.86

_Released: 2025-03-04T08:55:15Z_

### Patch Changes

- @sap-ux/project-access@1.29.12
- @sap-ux/inquirer-common@0.6.25

## 0.3.85

_Released: 2025-03-03T11:06:12Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.24

## 0.3.84

_Released: 2025-02-28T15:10:48Z_

### Patch Changes

- Updated dependencies [0f35b4b]
    - @sap-ux/project-access@1.29.11
    - @sap-ux/inquirer-common@0.6.23

## 0.3.83

_Released: 2025-02-27T19:24:50Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.22

## 0.3.82

_Released: 2025-02-27T14:15:03Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.21
- @sap-ux/project-access@1.29.10

## 0.3.81

_Released: 2025-02-27T08:22:17Z_

### Patch Changes

- Updated dependencies [c8c292c]
    - @sap-ux/project-access@1.29.9
    - @sap-ux/inquirer-common@0.6.20

## 0.3.80

_Released: 2025-02-24T09:17:17Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.19

## 0.3.79

_Released: 2025-02-17T13:42:22Z_

### Patch Changes

- Updated dependencies [c50e09f]
    - @sap-ux/project-access@1.29.8
    - @sap-ux/inquirer-common@0.6.18

## 0.3.78

_Released: 2025-02-13T17:39:11Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.17

## 0.3.77

_Released: 2025-02-13T10:58:34Z_

### Patch Changes

- Updated dependencies [2c0d657]
    - @sap-ux/project-access@1.29.7
    - @sap-ux/inquirer-common@0.6.16

## 0.3.76

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- @sap-ux/project-access@1.29.6
- @sap-ux/inquirer-common@0.6.15

## 0.3.75

_Released: 2025-02-05T17:08:20Z_

### Patch Changes

- @sap-ux/project-access@1.29.5
- @sap-ux/inquirer-common@0.6.14

## 0.3.74

_Released: 2025-02-05T14:44:29Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.13

## 0.3.73

_Released: 2025-02-04T15:39:07Z_

### Patch Changes

- Updated dependencies [29abc73]
    - @sap-ux/project-access@1.29.4
    - @sap-ux/inquirer-common@0.6.12

## 0.3.72

_Released: 2025-02-04T14:25:43Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.11

## 0.3.71

_Released: 2025-01-30T10:04:50Z_

### Patch Changes

- Updated dependencies [096b021]
    - @sap-ux/project-access@1.29.3
    - @sap-ux/inquirer-common@0.6.10

## 0.3.70

_Released: 2025-01-29T17:41:08Z_

### Patch Changes

- Updated dependencies [5e3a5f8]
    - @sap-ux/inquirer-common@0.6.9

## 0.3.69

_Released: 2025-01-29T13:31:31Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.8

## 0.3.68

_Released: 2025-01-28T09:20:06Z_

### Patch Changes

- Updated dependencies [93ef8c1]
    - @sap-ux/project-access@1.29.2
    - @sap-ux/inquirer-common@0.6.7

## 0.3.67

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- @sap-ux/project-access@1.29.1
- @sap-ux/inquirer-common@0.6.6

## 0.3.66

_Released: 2025-01-22T17:11:37Z_

### Patch Changes

- Updated dependencies [080bda2]
    - @sap-ux/inquirer-common@0.6.5

## 0.3.65

_Released: 2025-01-16T02:22:29Z_

### Patch Changes

- Updated dependencies [88bf030]
    - @sap-ux/project-access@1.29.0
    - @sap-ux/inquirer-common@0.6.4

## 0.3.64

_Released: 2025-01-08T15:30:03Z_

### Patch Changes

- Updated dependencies [40ba546]
    - @sap-ux/inquirer-common@0.6.3

## 0.3.63

_Released: 2025-01-08T11:51:44Z_

### Patch Changes

- Updated dependencies [dac696a]
    - @sap-ux/inquirer-common@0.6.2

## 0.3.62

_Released: 2024-12-20T15:43:15Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.1

## 0.3.61

_Released: 2024-12-19T17:24:19Z_

### Patch Changes

- Updated dependencies [112d29a]
    - @sap-ux/inquirer-common@0.6.0

## 0.3.60

_Released: 2024-12-18T10:32:41Z_

### Patch Changes

- Updated dependencies [f8dda3b]
    - @sap-ux/inquirer-common@0.5.15

## 0.3.59

_Released: 2024-12-17T15:31:53Z_

### Patch Changes

- Updated dependencies [e1edcd7]
    - @sap-ux/project-access@1.28.10
    - @sap-ux/inquirer-common@0.5.14

## 0.3.58

_Released: 2024-12-17T13:32:02Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.13

## 0.3.57

_Released: 2024-12-10T16:04:29Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.12

## 0.3.56

_Released: 2024-12-10T14:32:00Z_

### Patch Changes

- Updated dependencies [0c64478]
    - @sap-ux/inquirer-common@0.5.11

## 0.3.55

_Released: 2024-12-10T11:51:29Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.10

## 0.3.54

_Released: 2024-12-06T21:07:01Z_

### Patch Changes

- Updated dependencies [e93797a]
    - @sap-ux/project-access@1.28.9
    - @sap-ux/inquirer-common@0.5.9

## 0.3.53

_Released: 2024-12-04T15:30:32Z_

### Patch Changes

- Updated dependencies [307706e]
    - @sap-ux/inquirer-common@0.5.8

## 0.3.52

_Released: 2024-12-04T12:27:41Z_

### Patch Changes

- Updated dependencies [2359524]
    - @sap-ux/inquirer-common@0.5.7

## 0.3.51

_Released: 2024-12-04T11:05:53Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.6

## 0.3.50

_Released: 2024-12-02T16:28:38Z_

### Patch Changes

- @sap-ux/project-access@1.28.8
- @sap-ux/inquirer-common@0.5.5

## 0.3.49

_Released: 2024-11-21T11:48:14Z_

### Patch Changes

- Updated dependencies [74dc5fe]
    - @sap-ux/inquirer-common@0.5.4

## 0.3.48

_Released: 2024-11-19T13:21:01Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.3

## 0.3.47

_Released: 2024-11-18T22:28:16Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.2

## 0.3.46

_Released: 2024-11-18T20:38:37Z_

### Patch Changes

- @sap-ux/project-access@1.28.7
- @sap-ux/inquirer-common@0.5.1

## 0.3.45

_Released: 2024-11-14T17:04:56Z_

### Patch Changes

- Updated dependencies [2886db3]
    - @sap-ux/inquirer-common@0.5.0

## 0.3.44

_Released: 2024-11-08T08:58:34Z_

### Patch Changes

- Updated dependencies [fb26f92]
    - @sap-ux/project-access@1.28.6

## 0.3.43

_Released: 2024-11-05T21:46:19Z_

### Patch Changes

- @sap-ux/project-access@1.28.5

## 0.3.42

_Released: 2024-11-05T13:50:29Z_

### Patch Changes

- Updated dependencies [5a68903]
    - @sap-ux/project-access@1.28.4

## 0.3.41

_Released: 2024-11-01T07:47:25Z_

### Patch Changes

- @sap-ux/inquirer-common@0.4.10

## 0.3.40

_Released: 2024-10-31T07:40:48Z_

### Patch Changes

- Updated dependencies [42f13eb]
    - @sap-ux/project-access@1.28.3

## 0.3.39

_Released: 2024-10-30T13:01:12Z_

### Patch Changes

- @sap-ux/inquirer-common@0.4.9

## 0.3.38

_Released: 2024-10-24T14:04:35Z_

### Patch Changes

- Updated dependencies [02e4f29]
    - @sap-ux/inquirer-common@0.4.8

## 0.3.37

_Released: 2024-10-23T12:50:19Z_

### Patch Changes

- Updated dependencies [d29b1a3]
    - @sap-ux/inquirer-common@0.4.7

## 0.3.36

_Released: 2024-10-16T08:21:13Z_

### Patch Changes

- Updated dependencies [eb38e5b]
    - @sap-ux/project-access@1.28.2

## 0.3.35

_Released: 2024-10-14T21:48:37Z_

### Patch Changes

- Updated dependencies [64e037d]
    - @sap-ux/project-access@1.28.1

## 0.3.34

_Released: 2024-10-14T16:41:16Z_

### Patch Changes

- Updated dependencies [15e6959]
    - @sap-ux/project-access@1.28.0

## 0.3.33

_Released: 2024-10-08T10:16:01Z_

### Patch Changes

- Updated dependencies [eb74890]
    - @sap-ux/project-access@1.27.6

## 0.3.32

_Released: 2024-10-02T14:28:15Z_

### Patch Changes

- Updated dependencies [a64a3a5]
    - @sap-ux/project-access@1.27.5

## 0.3.31

_Released: 2024-09-23T10:02:33Z_

### Patch Changes

- @sap-ux/project-access@1.27.4

## 0.3.30

_Released: 2024-09-18T14:01:49Z_

### Patch Changes

- Updated dependencies [070182d]
    - @sap-ux/project-access@1.27.3

## 0.3.29

_Released: 2024-09-12T09:42:45Z_

### Patch Changes

- Updated dependencies [09522df]
    - @sap-ux/project-access@1.27.2

## 0.3.28

_Released: 2024-09-03T19:06:21Z_

### Patch Changes

- Updated dependencies [d962ce1]
    - @sap-ux/project-access@1.27.1

## 0.3.27

_Released: 2024-08-30T06:05:30Z_

### Patch Changes

- Updated dependencies [df29368]
    - @sap-ux/project-access@1.27.0

## 0.3.26

_Released: 2024-08-28T11:16:50Z_

### Patch Changes

- @sap-ux/project-access@1.26.9

## 0.3.25

_Released: 2024-08-20T10:06:29Z_

### Patch Changes

- Updated dependencies [df6262e]
    - @sap-ux/project-access@1.26.8

## 0.3.24

_Released: 2024-08-19T11:34:45Z_

### Patch Changes

- @sap-ux/project-access@1.26.7

## 0.3.23

_Released: 2024-08-19T09:48:14Z_

### Patch Changes

- @sap-ux/inquirer-common@0.4.6

## 0.3.22

_Released: 2024-08-16T10:46:05Z_

### Patch Changes

- @sap-ux/inquirer-common@0.4.5

## 0.3.21

_Released: 2024-08-12T10:50:52Z_

### Patch Changes

- Updated dependencies [82aaea3]
    - @sap-ux/project-access@1.26.6

## 0.3.20

_Released: 2024-08-08T13:01:35Z_

### Patch Changes

- @sap-ux/inquirer-common@0.4.4

## 0.3.19

_Released: 2024-08-08T07:33:51Z_

### Patch Changes

- Updated dependencies [cc16cbb]
    - @sap-ux/project-access@1.26.5

## 0.3.18

_Released: 2024-08-07T11:06:05Z_

### Patch Changes

- @sap-ux/project-access@1.26.4

## 0.3.17

_Released: 2024-08-01T18:27:11Z_

### Patch Changes

- Updated dependencies [88c8bf6]
    - @sap-ux/project-access@1.26.3

## 0.3.16

_Released: 2024-08-01T17:28:17Z_

### Patch Changes

- e69db46: Upgrade fast-xml-parser
- Updated dependencies [e69db46]
    - @sap-ux/project-access@1.26.2

## 0.3.15

_Released: 2024-08-01T16:21:31Z_

### Patch Changes

- Updated dependencies [a986655]
    - @sap-ux/project-access@1.26.1

## 0.3.14

_Released: 2024-08-01T14:53:05Z_

### Patch Changes

- Updated dependencies [518bf7e]
    - @sap-ux/project-access@1.26.0

## 0.3.13

_Released: 2024-08-01T12:24:50Z_

### Patch Changes

- Updated dependencies [99b7b5f]
    - @sap-ux/project-access@1.25.8

## 0.3.12

_Released: 2024-08-01T10:59:20Z_

### Patch Changes

- Updated dependencies [7ae8207]
    - @sap-ux/inquirer-common@0.4.3

## 0.3.11

_Released: 2024-07-23T09:01:05Z_

### Patch Changes

- Updated dependencies [d549173]
    - @sap-ux/project-access@1.25.7

## 0.3.10

_Released: 2024-07-22T13:28:51Z_

### Patch Changes

- @sap-ux/inquirer-common@0.4.2

## 0.3.9

_Released: 2024-07-18T16:34:38Z_

### Patch Changes

- Updated dependencies [a9fac04]
    - @sap-ux/project-access@1.25.6

## 0.3.8

_Released: 2024-07-18T11:50:01Z_

### Patch Changes

- Updated dependencies [108336f]
    - @sap-ux/inquirer-common@0.4.1

## 0.3.7

_Released: 2024-07-17T10:08:55Z_

### Patch Changes

- Updated dependencies [421f3ca]
    - @sap-ux/project-access@1.25.5

## 0.3.6

_Released: 2024-07-12T15:28:30Z_

### Patch Changes

- Updated dependencies [173b5f2]
    - @sap-ux/project-access@1.25.4

## 0.3.5

_Released: 2024-07-12T09:20:42Z_

### Patch Changes

- Updated dependencies [e7b9184]
    - @sap-ux/project-access@1.25.3

## 0.3.4

_Released: 2024-07-12T08:50:08Z_

### Patch Changes

- @sap-ux/project-access@1.25.2

## 0.3.3

_Released: 2024-07-10T11:59:21Z_

### Patch Changes

- Updated dependencies [0f3cf6b]
    - @sap-ux/project-access@1.25.1

## 0.3.2

_Released: 2024-07-09T12:14:56Z_

### Patch Changes

- Updated dependencies [f076dd3]
    - @sap-ux/project-access@1.25.0

## 0.3.1

_Released: 2024-07-09T08:05:42Z_

### Patch Changes

- Updated dependencies [0ae685e]
    - @sap-ux/project-access@1.24.0

## 0.3.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/inquirer-common@0.4.0
    - @sap-ux/project-access@1.23.0

## 0.2.37

_Released: 2024-07-03T10:48:46Z_

### Patch Changes

- Updated dependencies [9ea58ad4]
    - @sap-ux/project-access@1.22.4

## 0.2.36

_Released: 2024-06-27T07:14:34Z_

### Patch Changes

- Updated dependencies [65bfb244]
    - @sap-ux/inquirer-common@0.3.1

## 0.2.35

_Released: 2024-06-26T13:30:18Z_

### Patch Changes

- @sap-ux/project-access@1.22.3

## 0.2.34

_Released: 2024-06-25T14:41:22Z_

### Patch Changes

- Updated dependencies [399d2ad8]
    - @sap-ux/project-access@1.22.2

## 0.2.33

_Released: 2024-06-18T15:06:09Z_

### Patch Changes

- @sap-ux/project-access@1.22.1

## 0.2.32

_Released: 2024-06-17T12:35:55Z_

### Patch Changes

- Updated dependencies [1ea831d5]
    - @sap-ux/inquirer-common@0.3.0

## 0.2.31

_Released: 2024-06-13T16:04:23Z_

### Patch Changes

- Updated dependencies [ad93a484]
    - @sap-ux/project-access@1.22.0

## 0.2.30

_Released: 2024-06-12T15:20:44Z_

### Patch Changes

- @sap-ux/project-access@1.21.2

## 0.2.29

_Released: 2024-06-07T14:16:07Z_

### Patch Changes

- @sap-ux/project-access@1.21.1

## 0.2.28

_Released: 2024-06-04T12:43:36Z_

### Patch Changes

- Updated dependencies [69b8d6de]
    - @sap-ux/project-access@1.21.0

## 0.2.27

_Released: 2024-06-04T12:14:54Z_

### Patch Changes

- Updated dependencies [a7d78229]
    - @sap-ux/project-access@1.20.4

## 0.2.26

_Released: 2024-05-31T13:42:35Z_

### Patch Changes

- @sap-ux/project-access@1.20.3

## 0.2.25

_Released: 2024-05-29T14:07:16Z_

### Patch Changes

- Updated dependencies [54c91c6d]
    - @sap-ux/project-access@1.20.2

## 0.2.24

_Released: 2024-05-27T13:04:53Z_

### Patch Changes

- @sap-ux/project-access@1.20.1

## 0.2.23

_Released: 2024-05-14T08:36:35Z_

### Patch Changes

- Updated dependencies [e3d2324c]
    - @sap-ux/project-access@1.20.0

## 0.2.22

_Released: 2024-05-10T15:53:32Z_

### Patch Changes

- @sap-ux/inquirer-common@0.2.8

## 0.2.21

_Released: 2024-05-03T11:39:22Z_

### Patch Changes

- Updated dependencies [4098bed2]
    - @sap-ux/inquirer-common@0.2.7

## 0.2.20

_Released: 2024-05-02T14:43:18Z_

### Patch Changes

- @sap-ux/project-access@1.19.14

## 0.2.19

_Released: 2024-04-26T19:12:20Z_

### Patch Changes

- Updated dependencies [99bca62c]
    - @sap-ux/project-access@1.19.13

## 0.2.18

_Released: 2024-04-23T22:35:35Z_

### Patch Changes

- Updated dependencies [b7d95fb3]
    - @sap-ux/project-access@1.19.12

## 0.2.17

_Released: 2024-04-23T07:22:50Z_

### Patch Changes

- Updated dependencies [4389c528]
    - @sap-ux/project-access@1.19.11

## 0.2.16

_Released: 2024-04-18T07:12:06Z_

### Patch Changes

- Updated dependencies [f8e16120]
    - @sap-ux/project-access@1.19.10

## 0.2.15

_Released: 2024-04-17T07:44:37Z_

### Patch Changes

- Updated dependencies [ee76e47f]
    - @sap-ux/project-access@1.19.9

## 0.2.14

_Released: 2024-04-16T14:18:28Z_

### Patch Changes

- f8b24a3a: fix additional msgs and readme
- Updated dependencies [f8b24a3a]
    - @sap-ux/inquirer-common@0.2.6

## 0.2.13

_Released: 2024-04-16T13:12:31Z_

### Patch Changes

- @sap-ux/inquirer-common@0.2.5

## 0.2.12

_Released: 2024-04-16T09:42:12Z_

### Patch Changes

- 0d0d1784: fix prompt choice issue

## 0.2.11

_Released: 2024-04-15T19:27:29Z_

### Patch Changes

- @sap-ux/project-access@1.19.8

## 0.2.10

### Patch Changes

- 98496d57: adds new module @sap-ux/ui5-library-reference-inquirer
- Updated dependencies [98496d57]
- Updated dependencies [e3d2e003]
    - @sap-ux/inquirer-common@0.2.4
    - @sap-ux/project-access@1.19.7
