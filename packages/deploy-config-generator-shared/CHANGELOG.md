# @sap-ux/deploy-config-generator-shared

## 1.0.13

### Patch Changes

#### Workspace Updates

- @sap-ux/btp-utils 2.0.2 → 2.0.3
- @sap-ux/fiori-generator-shared 1.0.12 → 1.0.13
- @sap-ux/nodejs-utils 1.0.3 → 1.0.4

## 1.0.12

### Patch Changes

#### Workspace Updates

- @sap-ux/fiori-generator-shared 1.0.11 → 1.0.12

## 1.0.11

_Released: 2026-06-12T06:53:23Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@1.0.11

## 1.0.10

_Released: 2026-06-11T10:54:17Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@1.0.10

## 1.0.9

_Released: 2026-06-10T09:57:42Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@1.0.9

## 1.0.8

_Released: 2026-06-09T14:35:01Z_

### Patch Changes

- Updated dependencies [0fa8305]
    - @sap-ux/btp-utils@2.0.2
    - @sap-ux/fiori-generator-shared@1.0.8
    - @sap-ux/nodejs-utils@1.0.3

## 1.0.7

_Released: 2026-06-09T13:18:16Z_

### Patch Changes

- Updated dependencies [a328e14]
    - @sap-ux/fiori-generator-shared@1.0.7

## 1.0.6

_Released: 2026-06-04T13:54:21Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@1.0.6

## 1.0.5

_Released: 2026-06-04T10:19:37Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@1.0.5

## 1.0.4

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/fiori-generator-shared@1.0.4
    - @sap-ux/nodejs-utils@1.0.2
    - @sap-ux/btp-utils@2.0.1

## 1.0.3

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@1.0.3

## 1.0.2

_Released: 2026-06-02T11:35:17Z_

### Patch Changes

- Updated dependencies [41f327a]
    - @sap-ux/nodejs-utils@1.0.1
    - @sap-ux/fiori-generator-shared@1.0.2

## 1.0.1

_Released: 2026-06-01T15:15:26Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@1.0.1

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
    - @sap-ux/nodejs-utils@1.0.0
    - @sap-ux/btp-utils@2.0.0

## 0.2.6

_Released: 2026-05-27T11:39:21Z_

### Patch Changes

- Updated dependencies [ea9cbb1]
    - @sap-ux/nodejs-utils@0.3.2
    - @sap-ux/fiori-generator-shared@0.15.6

## 0.2.5

_Released: 2026-05-27T10:42:47Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.15.5

## 0.2.4

_Released: 2026-05-26T16:40:21Z_

### Patch Changes

- Updated dependencies [01b70ca]
    - @sap-ux/btp-utils@1.2.1
    - @sap-ux/fiori-generator-shared@0.15.4
    - @sap-ux/nodejs-utils@0.3.1

## 0.2.3

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.15.3

## 0.2.2

_Released: 2026-05-19T15:16:46Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.15.2

## 0.2.1

_Released: 2026-05-15T13:12:06Z_

### Patch Changes

- 2c76f8f: chore: upgrade @sap-devx/yeoman-ui-types 1.23.0 → 1.25.0
- Updated dependencies [2c76f8f]
    - @sap-ux/fiori-generator-shared@0.15.1

## 0.2.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/btp-utils@1.2.0
    - @sap-ux/fiori-generator-shared@0.15.0
    - @sap-ux/nodejs-utils@0.3.0

## 0.1.127

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/btp-utils@1.1.16
    - @sap-ux/fiori-generator-shared@0.14.2
    - @sap-ux/nodejs-utils@0.2.23

## 0.1.126

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.14.1

## 0.1.125

_Released: 2026-05-12T18:00:39Z_

### Patch Changes

- Updated dependencies [9360ea5]
    - @sap-ux/fiori-generator-shared@0.14.0

## 0.1.124

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- 678a08e: chore: upgrade runtime dependencies (@sap/cf-tools 3.3.0 → 3.3.1, @vscode-logging/logger 2.0.8 → 2.0.9)
- Updated dependencies [678a08e]
- Updated dependencies [678a08e]
    - @sap-ux/btp-utils@1.1.15
    - @sap-ux/fiori-generator-shared@0.13.105
    - @sap-ux/nodejs-utils@0.2.22

## 0.1.123

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.104

## 0.1.122

_Released: 2026-04-29T15:24:37Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.103

## 0.1.121

_Released: 2026-04-27T19:47:46Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.102

## 0.1.120

_Released: 2026-04-23T12:54:21Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.101

## 0.1.119

_Released: 2026-04-23T06:48:55Z_

### Patch Changes

- Updated dependencies [237371b]
    - @sap-ux/fiori-generator-shared@0.13.100

## 0.1.118

_Released: 2026-04-15T11:53:17Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.99

## 0.1.117

_Released: 2026-04-14T20:26:28Z_

### Patch Changes

- Updated dependencies [ee68603]
    - @sap-ux/btp-utils@1.1.14
    - @sap-ux/fiori-generator-shared@0.13.98
    - @sap-ux/nodejs-utils@0.2.21

## 0.1.116

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- Updated dependencies [cc4450c]
    - @sap-ux/btp-utils@1.1.13
    - @sap-ux/fiori-generator-shared@0.13.97
    - @sap-ux/nodejs-utils@0.2.20

## 0.1.115

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.96
- @sap-ux/btp-utils@1.1.12
- @sap-ux/nodejs-utils@0.2.19

## 0.1.114

_Released: 2026-04-01T11:49:37Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.95

## 0.1.113

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(deploy-config-generator-shared): upgrade @sap-devx/yeoman-ui-types 1.22.0 → 1.23.0 (runtime dep); upgrade devDependencies (jest 30, i18next 25, @types/yeoman-generator 5.2.14)
- Updated dependencies [c53a4ba]
    - @sap-ux/fiori-generator-shared@0.13.94
    - @sap-ux/btp-utils@1.1.12
    - @sap-ux/nodejs-utils@0.2.19

## 0.1.112

_Released: 2026-03-27T15:37:24Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.93

## 0.1.111

_Released: 2026-03-27T11:58:49Z_

### Patch Changes

- Updated dependencies [2e17a6b]
    - @sap-ux/btp-utils@1.1.12
    - @sap-ux/fiori-generator-shared@0.13.92
    - @sap-ux/nodejs-utils@0.2.19

## 0.1.110

_Released: 2026-03-26T20:06:10Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.91

## 0.1.109

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: chore(deploy-config-generator-shared): upgrade i18next 25.8.18 → 25.8.20
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/btp-utils@1.1.11
    - @sap-ux/fiori-generator-shared@0.13.90
    - @sap-ux/nodejs-utils@0.2.18

## 0.1.108

_Released: 2026-03-25T12:56:41Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.89

## 0.1.107

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.88

## 0.1.106

_Released: 2026-03-18T16:51:44Z_

### Patch Changes

- Updated dependencies [ae6758f]
    - @sap-ux/fiori-generator-shared@0.13.87

## 0.1.105

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18
- Updated dependencies [5d452e5]
- Updated dependencies [55417bb]
    - @sap-ux/btp-utils@1.1.10
    - @sap-ux/fiori-generator-shared@0.13.86
    - @sap-ux/nodejs-utils@0.2.17

## 0.1.104

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.85

## 0.1.103

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.84

## 0.1.102

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- f5f9a78: fix(deps): update dependency @sap-devx/yeoman-ui-types to v1.22.0
    - @sap-ux/btp-utils@1.1.9
    - @sap-ux/fiori-generator-shared@0.13.83
    - @sap-ux/nodejs-utils@0.2.16

## 0.1.101

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.82

## 0.1.100

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.81

## 0.1.99

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- 6c993f3: fix: turn off i18next support notice
- Updated dependencies [6c993f3]
    - @sap-ux/fiori-generator-shared@0.13.80

## 0.1.98

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.79

## 0.1.97

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.78

## 0.1.96

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.77

## 0.1.95

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12
- Updated dependencies [cbd340a]
    - @sap-ux/fiori-generator-shared@0.13.76

## 0.1.94

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- c94cc8e: fix(deps): update dependency @vscode-logging/logger to v2.0.8
- Updated dependencies [c94cc8e]
- Updated dependencies [bb310dc]
    - @sap-ux/fiori-generator-shared@0.13.75
    - @sap-ux/nodejs-utils@0.2.16

## 0.1.93

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.74

## 0.1.92

_Released: 2026-02-16T18:48:13Z_

### Patch Changes

- Updated dependencies [dd2131c]
    - @sap-ux/btp-utils@1.1.9
    - @sap-ux/fiori-generator-shared@0.13.73
    - @sap-ux/nodejs-utils@0.2.15

## 0.1.91

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.72

## 0.1.90

_Released: 2026-02-13T16:18:58Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.71

## 0.1.89

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.70

## 0.1.88

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.69

## 0.1.87

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/btp-utils@1.1.8
    - @sap-ux/fiori-generator-shared@0.13.68
    - @sap-ux/nodejs-utils@0.2.14

## 0.1.86

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.67

## 0.1.85

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.66

## 0.1.84

_Released: 2026-02-05T13:53:56Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.65

## 0.1.83

_Released: 2026-02-05T11:39:04Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.64

## 0.1.82

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- Updated dependencies [ad321ab]
    - @sap-ux/fiori-generator-shared@0.13.63
    - @sap-ux/nodejs-utils@0.2.13

## 0.1.81

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- Updated dependencies [9f11dd2]
    - @sap-ux/btp-utils@1.1.7
    - @sap-ux/fiori-generator-shared@0.13.62
    - @sap-ux/nodejs-utils@0.2.12

## 0.1.80

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.61

## 0.1.79

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.60
- @sap-ux/btp-utils@1.1.6
- @sap-ux/nodejs-utils@0.2.11

## 0.1.78

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.59

## 0.1.77

_Released: 2026-01-28T00:19:05Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.58

## 0.1.76

_Released: 2026-01-23T23:57:30Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.57

## 0.1.75

_Released: 2026-01-23T22:30:10Z_

### Patch Changes

- d11943d: fix(deps): update dependency i18next to v25.8.0
- Updated dependencies [d11943d]
    - @sap-ux/fiori-generator-shared@0.13.56

## 0.1.74

_Released: 2026-01-23T12:49:27Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.55

## 0.1.73

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.54

## 0.1.72

_Released: 2026-01-16T12:32:24Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.53

## 0.1.71

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.52

## 0.1.70

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.51

## 0.1.69

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.50

## 0.1.68

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.49

## 0.1.67

_Released: 2026-01-06T14:37:31Z_

### Patch Changes

- Updated dependencies [03598eb]
    - @sap-ux/fiori-generator-shared@0.13.48

## 0.1.66

_Released: 2026-01-05T14:16:22Z_

### Patch Changes

- Updated dependencies [62bb798]
    - @sap-ux/fiori-generator-shared@0.13.47

## 0.1.65

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- @sap-ux/btp-utils@1.1.6
- @sap-ux/fiori-generator-shared@0.13.46
- @sap-ux/nodejs-utils@0.2.11

## 0.1.64

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- Updated dependencies [a9471d0]
    - @sap-ux/nodejs-utils@0.2.11
    - @sap-ux/fiori-generator-shared@0.13.45
    - @sap-ux/btp-utils@1.1.6

## 0.1.63

_Released: 2025-12-16T11:43:52Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.44

## 0.1.62

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/fiori-generator-shared@0.13.43
    - @sap-ux/nodejs-utils@0.2.10
    - @sap-ux/btp-utils@1.1.6

## 0.1.61

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.42

## 0.1.60

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.41

## 0.1.59

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.40

## 0.1.58

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- Updated dependencies [037a430]
    - @sap-ux/nodejs-utils@0.2.9
    - @sap-ux/fiori-generator-shared@0.13.39

## 0.1.57

_Released: 2025-12-05T12:18:49Z_

### Patch Changes

- Updated dependencies [d202c17]
    - @sap-ux/fiori-generator-shared@0.13.38

## 0.1.56

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.37

## 0.1.55

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.36

## 0.1.54

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.35

## 0.1.53

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.34

## 0.1.52

_Released: 2025-11-06T15:12:51Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.33

## 0.1.51

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/fiori-generator-shared@0.13.32
    - @sap-ux/nodejs-utils@0.2.8
    - @sap-ux/btp-utils@1.1.5

## 0.1.50

_Released: 2025-10-31T13:35:34Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.31

## 0.1.49

_Released: 2025-10-29T17:02:38Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.30

## 0.1.48

_Released: 2025-10-29T11:04:17Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.29

## 0.1.47

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.28

## 0.1.46

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.27

## 0.1.45

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.26

## 0.1.44

_Released: 2025-10-17T11:37:38Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.25

## 0.1.43

_Released: 2025-10-17T09:45:11Z_

### Patch Changes

- Updated dependencies [d4dabbd]
    - @sap-ux/fiori-generator-shared@0.13.24

## 0.1.42

_Released: 2025-10-14T13:22:30Z_

### Patch Changes

- Updated dependencies [bacaf93]
    - @sap-ux/fiori-generator-shared@0.13.23

## 0.1.41

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.22

## 0.1.40

_Released: 2025-10-07T13:15:25Z_

### Patch Changes

- Updated dependencies [b268021]
    - @sap-ux/nodejs-utils@0.2.7
    - @sap-ux/fiori-generator-shared@0.13.21

## 0.1.39

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- Updated dependencies [43a2446]
    - @sap-ux/fiori-generator-shared@0.13.20
    - @sap-ux/nodejs-utils@0.2.6
    - @sap-ux/btp-utils@1.1.4

## 0.1.38

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.19

## 0.1.37

_Released: 2025-09-23T20:14:56Z_

### Patch Changes

- Updated dependencies [998954b]
    - @sap-ux/btp-utils@1.1.3
    - @sap-ux/fiori-generator-shared@0.13.18
    - @sap-ux/nodejs-utils@0.2.5

## 0.1.36

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- Updated dependencies [9872384]
    - @sap-ux/btp-utils@1.1.2
    - @sap-ux/fiori-generator-shared@0.13.17
    - @sap-ux/nodejs-utils@0.2.4

## 0.1.35

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.16

## 0.1.34

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.15

## 0.1.33

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.14

## 0.1.32

_Released: 2025-09-11T11:04:24Z_

### Patch Changes

- Updated dependencies [3c094af]
    - @sap-ux/fiori-generator-shared@0.13.13

## 0.1.31

_Released: 2025-09-01T12:06:20Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.12

## 0.1.30

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- Updated dependencies [4cfebaf]
    - @sap-ux/btp-utils@1.1.1
    - @sap-ux/fiori-generator-shared@0.13.11
    - @sap-ux/nodejs-utils@0.2.3

## 0.1.29

_Released: 2025-08-21T14:27:46Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.10

## 0.1.28

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.9

## 0.1.27

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.8

## 0.1.26

_Released: 2025-08-07T06:27:29Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.7

## 0.1.25

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.6

## 0.1.24

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.5

## 0.1.23

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.4

## 0.1.22

_Released: 2025-07-22T13:05:35Z_

### Patch Changes

- Updated dependencies [ca44076]
    - @sap-ux/fiori-generator-shared@0.13.3

## 0.1.21

_Released: 2025-07-17T13:47:26Z_

### Patch Changes

- Updated dependencies [84a8d56]
    - @sap-ux/nodejs-utils@0.2.2

## 0.1.20

_Released: 2025-07-10T11:49:34Z_

### Patch Changes

- Updated dependencies [d75db00]
    - @sap-ux/fiori-generator-shared@0.13.2

## 0.1.19

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.13.1

## 0.1.18

_Released: 2025-07-07T08:44:59Z_

### Patch Changes

- Updated dependencies [58abe82]
    - @sap-ux/fiori-generator-shared@0.13.0

## 0.1.17

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- 69f62ec: i18next upgrade to 25.3.0
- Updated dependencies [69f62ec]
    - @sap-ux/fiori-generator-shared@0.12.16

## 0.1.16

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.12.15

## 0.1.15

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.12.14

## 0.1.14

_Released: 2025-06-30T08:46:50Z_

### Patch Changes

- b9675bb: Improve Fiori Tools UI Texts
- Updated dependencies [b9675bb]
    - @sap-ux/fiori-generator-shared@0.12.13

## 0.1.13

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.12.12

## 0.1.12

_Released: 2025-06-27T07:08:06Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.12.11

## 0.1.11

_Released: 2025-06-24T14:02:12Z_

### Patch Changes

- Updated dependencies [4fef16a]
    - @sap-ux/fiori-generator-shared@0.12.10

## 0.1.10

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.12.9

## 0.1.9

_Released: 2025-06-17T07:58:40Z_

### Patch Changes

- Updated dependencies [163522f]
    - @sap-ux/fiori-generator-shared@0.12.8

## 0.1.8

_Released: 2025-06-10T07:40:27Z_

### Patch Changes

- Updated dependencies [4e6c22e]
    - @sap-ux/fiori-generator-shared@0.12.7

## 0.1.7

_Released: 2025-06-09T09:48:34Z_

### Patch Changes

- Updated dependencies [d6943aa]
    - @sap-ux/nodejs-utils@0.2.1

## 0.1.6

_Released: 2025-06-05T12:32:35Z_

### Patch Changes

- Updated dependencies [95a816d]
    - @sap-ux/fiori-generator-shared@0.12.6

## 0.1.5

_Released: 2025-06-05T07:23:07Z_

### Patch Changes

- Updated dependencies [15ec5c4]
    - @sap-ux/fiori-generator-shared@0.12.5

## 0.1.4

_Released: 2025-05-30T09:02:15Z_

### Patch Changes

- Updated dependencies [91726b0]
    - @sap-ux/fiori-generator-shared@0.12.4

## 0.1.3

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.12.3

## 0.1.2

_Released: 2025-05-27T17:59:17Z_

### Patch Changes

- Updated dependencies [ac55cca]
    - @sap-ux/fiori-generator-shared@0.12.2

## 0.1.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.12.1

## 0.1.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/fiori-generator-shared@0.12.0
    - @sap-ux/nodejs-utils@0.2.0
    - @sap-ux/btp-utils@1.1.0

## 0.0.47

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.11.3

## 0.0.46

_Released: 2025-04-28T10:13:20Z_

### Patch Changes

- 65e178f: align npm modules

## 0.0.45

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.11.2

## 0.0.44

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.11.1

## 0.0.43

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- Updated dependencies [1ca4004]
    - @sap-ux/fiori-generator-shared@0.11.0

## 0.0.42

_Released: 2025-04-15T10:10:52Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.10.2

## 0.0.41

_Released: 2025-04-14T22:24:07Z_

### Patch Changes

- Updated dependencies [d638daa]
    - @sap-ux/btp-utils@1.0.3
    - @sap-ux/fiori-generator-shared@0.10.1
    - @sap-ux/nodejs-utils@0.1.9

## 0.0.40

_Released: 2025-04-10T13:52:38Z_

### Patch Changes

- Updated dependencies [23e055a]
    - @sap-ux/fiori-generator-shared@0.10.0

## 0.0.39

_Released: 2025-03-19T08:54:25Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.9.11

## 0.0.38

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.9.10

## 0.0.37

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- Updated dependencies [011c8c5]
    - @sap-ux/btp-utils@1.0.2
    - @sap-ux/fiori-generator-shared@0.9.9
    - @sap-ux/nodejs-utils@0.1.8

## 0.0.36

_Released: 2025-03-06T16:16:20Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.9.8

## 0.0.35

_Released: 2025-03-06T10:25:49Z_

### Patch Changes

- 19a19dd: add new main deploy gen module

## 0.0.34

_Released: 2025-03-05T11:16:53Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.9.7

## 0.0.33

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.9.6

## 0.0.32

_Released: 2025-03-04T08:55:15Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.9.5

## 0.0.31

_Released: 2025-03-03T11:06:12Z_

### Patch Changes

- Updated dependencies [d47a1b1]
    - @sap-ux/fiori-generator-shared@0.9.4

## 0.0.30

_Released: 2025-02-28T15:10:48Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.9.3

## 0.0.29

_Released: 2025-02-27T14:15:03Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.9.2

## 0.0.28

_Released: 2025-02-27T08:22:17Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.9.1

## 0.0.27

_Released: 2025-02-24T10:50:02Z_

### Patch Changes

- d6118c9: Changes to support adding CAP MTA prompt to allow user generate MTA

## 0.0.26

_Released: 2025-02-24T09:17:17Z_

### Patch Changes

- Updated dependencies [fffc3a7]
    - @sap-ux/fiori-generator-shared@0.9.0

## 0.0.25

_Released: 2025-02-17T13:42:22Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.8.1

## 0.0.24

_Released: 2025-02-13T17:39:11Z_

### Patch Changes

- Updated dependencies [fb4e328]
    - @sap-ux/fiori-generator-shared@0.8.0

## 0.0.23

_Released: 2025-02-13T10:58:34Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.29

## 0.0.22

_Released: 2025-02-13T10:39:20Z_

### Patch Changes

- 7c96039: fix spelling mistake

## 0.0.21

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.28

## 0.0.20

_Released: 2025-02-05T17:08:20Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.27

## 0.0.19

_Released: 2025-02-05T14:44:29Z_

### Patch Changes

- Updated dependencies [65f15d9]
    - @sap-ux/btp-utils@1.0.1
    - @sap-ux/fiori-generator-shared@0.7.26
    - @sap-ux/nodejs-utils@0.1.7

## 0.0.18

_Released: 2025-02-05T10:10:11Z_

### Patch Changes

- 9b755fc: adds new cf generator

## 0.0.17

_Released: 2025-02-04T15:39:07Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.25

## 0.0.16

_Released: 2025-02-04T14:25:43Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.24
- @sap-ux/nodejs-utils@0.1.6

## 0.0.15

_Released: 2025-01-30T10:04:50Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.23

## 0.0.14

_Released: 2025-01-29T13:31:31Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.22
- @sap-ux/nodejs-utils@0.1.5

## 0.0.13

_Released: 2025-01-28T09:20:06Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.21

## 0.0.12

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.20

## 0.0.11

_Released: 2025-01-20T11:37:42Z_

### Patch Changes

- 6b6c64a: adds new module cf deploy config sub gen

## 0.0.10

_Released: 2025-01-16T02:22:29Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.19

## 0.0.9

_Released: 2024-12-20T15:43:15Z_

### Patch Changes

- fe0878d: feat(flp-config): adds new flp config generator
- Updated dependencies [fe0878d]
    - @sap-ux/fiori-generator-shared@0.7.18

## 0.0.8

_Released: 2024-12-17T15:31:53Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.17

## 0.0.7

_Released: 2024-12-17T13:32:02Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.16

## 0.0.6

_Released: 2024-12-10T16:04:29Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.15

## 0.0.5

_Released: 2024-12-10T11:51:29Z_

### Patch Changes

- 1bb4d48: adds new module @sap-ux/abap-deploy-config-sub-generator
- Updated dependencies [1bb4d48]
    - @sap-ux/fiori-generator-shared@0.7.14

## 0.0.4

_Released: 2024-12-06T21:07:01Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.13

## 0.0.3

_Released: 2024-12-04T12:27:41Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.12

## 0.0.2

_Released: 2024-12-02T16:28:38Z_

### Patch Changes

- @sap-ux/fiori-generator-shared@0.7.11

## 0.0.1

_Released: 2025-01-16T02:22:29Z_

### Patch Changes

- 7c9e0cc: adds new deploy config shared module
