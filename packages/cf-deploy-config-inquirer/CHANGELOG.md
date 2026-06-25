# @sap-ux/cf-deploy-config-inquirer

## 1.0.14

### Patch Changes

#### Workspace Updates

- @sap-ux/inquirer-common 1.0.12 → 1.0.13

## 1.0.13

### Patch Changes

#### Release Date

2026-06-18

#### Features

- show warning when a full URL destination is selected [[d905991](https://github.com/SAP/open-ux-tools/commit/d905991ddc0ac82d5cde833cf4489d8a72bd7ad5)]

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

- @sap-ux/inquirer-common@1.0.9

## 1.0.8

_Released: 2026-06-09T14:35:01Z_

### Patch Changes

- Updated dependencies [0fa8305]
    - @sap-ux/btp-utils@2.0.2
    - @sap-ux/inquirer-common@1.0.8

## 1.0.7

_Released: 2026-06-09T13:18:16Z_

### Patch Changes

- @sap-ux/inquirer-common@1.0.7

## 1.0.6

_Released: 2026-06-04T13:54:21Z_

### Patch Changes

- @sap-ux/inquirer-common@1.0.6

## 1.0.5

_Released: 2026-06-04T10:19:37Z_

### Patch Changes

- @sap-ux/inquirer-common@1.0.5

## 1.0.4

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/inquirer-common@1.0.4
    - @sap-ux/btp-utils@2.0.1
    - @sap-ux/logger@1.0.1

## 1.0.3

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- @sap-ux/inquirer-common@1.0.3

## 1.0.2

_Released: 2026-06-02T11:35:17Z_

### Patch Changes

- @sap-ux/inquirer-common@1.0.2

## 1.0.1

_Released: 2026-06-01T15:15:26Z_

### Patch Changes

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
    - @sap-ux/btp-utils@2.0.0
    - @sap-ux/logger@1.0.0

## 0.6.7

_Released: 2026-05-29T12:50:34Z_

### Patch Changes

- @sap-ux/inquirer-common@0.13.6

## 0.6.6

_Released: 2026-05-27T11:39:21Z_

### Patch Changes

- @sap-ux/inquirer-common@0.13.5

## 0.6.5

_Released: 2026-05-27T10:42:47Z_

### Patch Changes

- @sap-ux/inquirer-common@0.13.4

## 0.6.4

_Released: 2026-05-26T16:40:21Z_

### Patch Changes

- Updated dependencies [01b70ca]
    - @sap-ux/btp-utils@1.2.1
    - @sap-ux/inquirer-common@0.13.3

## 0.6.3

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- @sap-ux/inquirer-common@0.13.2

## 0.6.2

_Released: 2026-05-19T15:16:46Z_

### Patch Changes

- @sap-ux/inquirer-common@0.13.1

## 0.6.1

_Released: 2026-05-15T13:12:06Z_

### Patch Changes

- Updated dependencies [2c76f8f]
    - @sap-ux/inquirer-common@0.13.0

## 0.6.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/btp-utils@1.2.0
    - @sap-ux/inquirer-common@0.12.0
    - @sap-ux/logger@0.9.0

## 0.5.130

_Released: 2026-05-14T21:28:41Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.48

## 0.5.129

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/btp-utils@1.1.16
    - @sap-ux/inquirer-common@0.11.47
    - @sap-ux/logger@0.8.6

## 0.5.128

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.46

## 0.5.127

_Released: 2026-05-12T18:00:39Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.45

## 0.5.126

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- Updated dependencies [678a08e]
    - @sap-ux/btp-utils@1.1.15
    - @sap-ux/inquirer-common@0.11.44

## 0.5.125

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.43

## 0.5.124

_Released: 2026-04-29T15:24:37Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.42

## 0.5.123

_Released: 2026-04-27T19:47:46Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.41

## 0.5.122

_Released: 2026-04-23T12:54:21Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.40

## 0.5.121

_Released: 2026-04-23T06:48:55Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.39

## 0.5.120

_Released: 2026-04-22T12:38:46Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.38

## 0.5.119

_Released: 2026-04-15T11:53:17Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.37

## 0.5.118

_Released: 2026-04-14T20:26:28Z_

### Patch Changes

- Updated dependencies [ee68603]
    - @sap-ux/btp-utils@1.1.14
    - @sap-ux/inquirer-common@0.11.36

## 0.5.117

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- Updated dependencies [cc4450c]
    - @sap-ux/btp-utils@1.1.13
    - @sap-ux/inquirer-common@0.11.35

## 0.5.116

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- Updated dependencies [f1e4481]
    - @sap-ux/inquirer-common@0.11.34
    - @sap-ux/logger@0.8.5
    - @sap-ux/btp-utils@1.1.12

## 0.5.115

_Released: 2026-04-01T11:49:37Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.33

## 0.5.114

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(cf-deploy-config-inquirer): upgrade shared devDependencies (jest 30, i18next 25, @types/yeoman-generator 5.2.14)
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
    - @sap-ux/inquirer-common@0.11.32
    - @sap-ux/logger@0.8.4
    - @sap-ux/btp-utils@1.1.12

## 0.5.113

_Released: 2026-03-27T15:37:24Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.31

## 0.5.112

_Released: 2026-03-27T11:58:49Z_

### Patch Changes

- Updated dependencies [2e17a6b]
    - @sap-ux/btp-utils@1.1.12
    - @sap-ux/inquirer-common@0.11.30

## 0.5.111

_Released: 2026-03-26T20:06:10Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.29

## 0.5.110

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: chore(cf-deploy-config-inquirer): upgrade i18next 25.8.18 → 25.8.20
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/btp-utils@1.1.11
    - @sap-ux/inquirer-common@0.11.28
    - @sap-ux/logger@0.8.3

## 0.5.109

_Released: 2026-03-25T12:56:41Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.27

## 0.5.108

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.26

## 0.5.107

_Released: 2026-03-18T16:51:44Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.25

## 0.5.106

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18
- Updated dependencies [5d452e5]
- Updated dependencies [55417bb]
    - @sap-ux/btp-utils@1.1.10
    - @sap-ux/inquirer-common@0.11.24

## 0.5.105

_Released: 2026-03-06T13:19:33Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.23

## 0.5.104

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.22

## 0.5.103

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- Updated dependencies [7c06ef0]
    - @sap-ux/inquirer-common@0.11.21

## 0.5.102

_Released: 2026-03-05T10:41:09Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.20

## 0.5.101

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- f5f9a78: fix(deps): update dependency @sap-devx/yeoman-ui-types to v1.22.0
- Updated dependencies [f5f9a78]
- Updated dependencies [45d4797]
    - @sap-ux/inquirer-common@0.11.19
    - @sap-ux/logger@0.8.2
    - @sap-ux/btp-utils@1.1.9

## 0.5.100

_Released: 2026-03-04T15:52:08Z_

### Patch Changes

- Updated dependencies [2302698]
    - @sap-ux/inquirer-common@0.11.18

## 0.5.99

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.17

## 0.5.98

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.16

## 0.5.97

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- 6c993f3: fix: turn off i18next support notice
- Updated dependencies [6c993f3]
    - @sap-ux/inquirer-common@0.11.15

## 0.5.96

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.14

## 0.5.95

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.13

## 0.5.94

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.12

## 0.5.93

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- Updated dependencies [ff634b0]
    - @sap-ux/inquirer-common@0.11.11

## 0.5.92

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12
- Updated dependencies [cbd340a]
    - @sap-ux/inquirer-common@0.11.10

## 0.5.91

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- Updated dependencies [bb310dc]
    - @sap-ux/inquirer-common@0.11.9

## 0.5.90

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.8

## 0.5.89

_Released: 2026-02-16T18:48:13Z_

### Patch Changes

- Updated dependencies [dd2131c]
    - @sap-ux/btp-utils@1.1.9
    - @sap-ux/inquirer-common@0.11.7

## 0.5.88

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.6

## 0.5.87

_Released: 2026-02-13T16:18:58Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.5

## 0.5.86

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.4

## 0.5.85

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- @sap-ux/inquirer-common@0.11.3

## 0.5.84

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/inquirer-common@0.11.2
    - @sap-ux/btp-utils@1.1.8

## 0.5.83

_Released: 2026-02-09T15:13:41Z_

### Patch Changes

- Updated dependencies [1ad56d1]
    - @sap-ux/inquirer-common@0.11.1

## 0.5.82

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/inquirer-common@0.11.0

## 0.5.81

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.26

## 0.5.80

_Released: 2026-02-05T13:53:56Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.25

## 0.5.79

_Released: 2026-02-05T11:39:04Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.24

## 0.5.78

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- Updated dependencies [ad321ab]
    - @sap-ux/inquirer-common@0.10.23

## 0.5.77

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- 9f11dd2: chore - address audit issues
- Updated dependencies [9f11dd2]
    - @sap-ux/inquirer-common@0.10.22
    - @sap-ux/btp-utils@1.1.7

## 0.5.76

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.21

## 0.5.75

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- Updated dependencies [ea7a16c]
    - @sap-ux/inquirer-common@0.10.20
    - @sap-ux/logger@0.8.1
    - @sap-ux/btp-utils@1.1.6

## 0.5.74

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.19

## 0.5.73

_Released: 2026-01-28T00:19:05Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.18

## 0.5.72

_Released: 2026-01-23T23:57:30Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.17

## 0.5.71

_Released: 2026-01-23T22:30:10Z_

### Patch Changes

- d11943d: fix(deps): update dependency i18next to v25.8.0
- Updated dependencies [d11943d]
    - @sap-ux/inquirer-common@0.10.16

## 0.5.70

_Released: 2026-01-23T12:49:27Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.15

## 0.5.69

_Released: 2026-01-19T12:47:48Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.14

## 0.5.68

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.13

## 0.5.67

_Released: 2026-01-16T12:32:24Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.12

## 0.5.66

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.11

## 0.5.65

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.10

## 0.5.64

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.9

## 0.5.63

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/inquirer-common@0.10.8

## 0.5.62

_Released: 2026-01-08T17:12:17Z_

### Patch Changes

- Updated dependencies [2204ad3]
    - @sap-ux/inquirer-common@0.10.7

## 0.5.61

_Released: 2026-01-07T10:20:40Z_

### Patch Changes

- Updated dependencies [6382440]
    - @sap-ux/inquirer-common@0.10.6

## 0.5.60

_Released: 2026-01-06T14:37:31Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.5

## 0.5.59

_Released: 2026-01-05T14:16:22Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.4

## 0.5.58

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/logger@0.8.0
    - @sap-ux/btp-utils@1.1.6
    - @sap-ux/inquirer-common@0.10.3

## 0.5.57

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/inquirer-common@0.10.2
    - @sap-ux/logger@0.7.3
    - @sap-ux/btp-utils@1.1.6

## 0.5.56

_Released: 2025-12-18T13:13:52Z_

### Patch Changes

- @sap-ux/inquirer-common@0.10.1

## 0.5.55

_Released: 2025-12-18T08:56:52Z_

### Patch Changes

- Updated dependencies [5287327]
    - @sap-ux/inquirer-common@0.10.0

## 0.5.54

_Released: 2025-12-16T11:43:52Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.17

## 0.5.53

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/inquirer-common@0.9.16
    - @sap-ux/btp-utils@1.1.6
    - @sap-ux/logger@0.7.2

## 0.5.52

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.15

## 0.5.51

_Released: 2025-12-12T09:02:37Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.14

## 0.5.50

_Released: 2025-12-11T09:08:37Z_

### Patch Changes

- d4291ec: Remove `None` as a CF router option

## 0.5.49

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.13

## 0.5.48

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.12

## 0.5.47

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.11

## 0.5.46

_Released: 2025-12-05T12:18:49Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.10

## 0.5.45

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.9

## 0.5.44

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.8

## 0.5.43

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.7

## 0.5.42

_Released: 2025-11-26T12:17:21Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.6

## 0.5.41

_Released: 2025-11-26T00:12:42Z_

### Patch Changes

- Updated dependencies [597834f]
    - @sap-ux/inquirer-common@0.9.5

## 0.5.40

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.4

## 0.5.39

_Released: 2025-11-07T13:23:57Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.3

## 0.5.38

_Released: 2025-11-06T15:12:51Z_

### Patch Changes

- @sap-ux/inquirer-common@0.9.2

## 0.5.37

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/inquirer-common@0.9.1
    - @sap-ux/btp-utils@1.1.5
    - @sap-ux/logger@0.7.1

## 0.5.36

_Released: 2025-11-03T10:50:00Z_

### Patch Changes

- Updated dependencies [4ddcff3]
    - @sap-ux/inquirer-common@0.9.0

## 0.5.35

_Released: 2025-10-31T13:35:34Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.10

## 0.5.34

_Released: 2025-10-29T17:02:38Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.9

## 0.5.33

_Released: 2025-10-29T11:04:17Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.8

## 0.5.32

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.7

## 0.5.31

_Released: 2025-10-22T18:56:41Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.6

## 0.5.30

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.5

## 0.5.29

_Released: 2025-10-21T09:37:06Z_

### Patch Changes

- Updated dependencies [06bc541]
    - @sap-ux/inquirer-common@0.8.4

## 0.5.28

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.3

## 0.5.27

_Released: 2025-10-17T11:37:38Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.2

## 0.5.26

_Released: 2025-10-17T09:45:11Z_

### Patch Changes

- @sap-ux/inquirer-common@0.8.1

## 0.5.25

_Released: 2025-10-15T16:45:46Z_

### Patch Changes

- Updated dependencies [4053369]
    - @sap-ux/inquirer-common@0.8.0

## 0.5.24

_Released: 2025-10-14T13:22:30Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.51

## 0.5.23

_Released: 2025-10-10T13:53:56Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.50

## 0.5.22

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.49

## 0.5.21

_Released: 2025-10-10T09:39:17Z_

### Patch Changes

- e015869: chore: patch inquirer dependency

## 0.5.20

_Released: 2025-10-07T13:15:25Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.48

## 0.5.19

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/inquirer-common@0.7.47
    - @sap-ux/btp-utils@1.1.4

## 0.5.18

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.46

## 0.5.17

_Released: 2025-09-23T20:14:56Z_

### Patch Changes

- Updated dependencies [998954b]
    - @sap-ux/btp-utils@1.1.3
    - @sap-ux/inquirer-common@0.7.45

## 0.5.16

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- Updated dependencies [9872384]
    - @sap-ux/inquirer-common@0.7.44
    - @sap-ux/btp-utils@1.1.2

## 0.5.15

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.43

## 0.5.14

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.42

## 0.5.13

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.41

## 0.5.12

_Released: 2025-09-11T11:04:24Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.40

## 0.5.11

_Released: 2025-09-02T13:22:05Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.39

## 0.5.10

_Released: 2025-09-01T12:06:20Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.38

## 0.5.9

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- Updated dependencies [4cfebaf]
    - @sap-ux/inquirer-common@0.7.37
    - @sap-ux/btp-utils@1.1.1

## 0.5.8

_Released: 2025-08-21T14:27:46Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.36

## 0.5.7

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- 178dbea: sanitize ignoreCertError (singular) configration option to ignoreCertErrors (plural)
    - @sap-ux/inquirer-common@0.7.35

## 0.5.6

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.34

## 0.5.5

_Released: 2025-08-12T14:05:27Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.33

## 0.5.4

_Released: 2025-08-07T06:27:29Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.32

## 0.5.3

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.31

## 0.5.2

_Released: 2025-07-31T11:23:22Z_

### Patch Changes

- Updated dependencies [9fa7f0b]
    - @sap-ux/inquirer-common@0.7.30

## 0.5.1

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.29

## 0.5.0

_Released: 2025-07-30T11:42:24Z_

### Minor Changes

- 6e2c5aa: fix overwrite prompt conflict

## 0.4.1

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.28

## 0.4.0

_Released: 2025-07-24T09:25:40Z_

### Minor Changes

- 089b56f: updates extension types and extends prompt options in sub gens

## 0.3.30

_Released: 2025-07-22T13:05:35Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.27

## 0.3.29

_Released: 2025-07-21T13:01:41Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.26

## 0.3.28

_Released: 2025-07-16T12:23:18Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.25

## 0.3.27

_Released: 2025-07-10T11:49:34Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.24

## 0.3.26

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.23

## 0.3.25

_Released: 2025-07-07T08:44:59Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.22

## 0.3.24

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- 69f62ec: i18next upgrade to 25.3.0
- Updated dependencies [69f62ec]
    - @sap-ux/inquirer-common@0.7.21

## 0.3.23

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.20

## 0.3.22

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.19

## 0.3.21

_Released: 2025-06-30T08:46:50Z_

### Patch Changes

- b9675bb: Improve Fiori Tools UI Texts
- b9675bb: Update the MTA ID error message.
- Updated dependencies [b9675bb]
    - @sap-ux/inquirer-common@0.7.18

## 0.3.20

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.17

## 0.3.19

_Released: 2025-06-27T09:27:28Z_

### Patch Changes

- 48af01a: Validate long Windows path in deployment configuration.

## 0.3.18

_Released: 2025-06-27T07:08:06Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.16

## 0.3.17

_Released: 2025-06-24T14:02:12Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.15

## 0.3.16

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.14

## 0.3.15

_Released: 2025-06-23T11:04:05Z_

### Patch Changes

- ff6ff97: Update the MTA ID error message.

## 0.3.14

_Released: 2025-06-17T13:40:19Z_

### Patch Changes

- c9f79c1: Check long Windows paths during project generation and deployment config generation.

## 0.3.13

_Released: 2025-06-17T07:58:40Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.13

## 0.3.12

_Released: 2025-06-16T09:52:52Z_

### Patch Changes

- Updated dependencies [20cc54f]
    - @sap-ux/inquirer-common@0.7.12

## 0.3.11

_Released: 2025-06-13T14:12:57Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.11

## 0.3.10

_Released: 2025-06-13T10:58:52Z_

### Patch Changes

- Updated dependencies [bf752f3]
    - @sap-ux/inquirer-common@0.7.10

## 0.3.9

_Released: 2025-06-10T07:40:27Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.9

## 0.3.8

_Released: 2025-06-09T09:48:34Z_

### Patch Changes

- Updated dependencies [d6943aa]
    - @sap-ux/inquirer-common@0.7.8

## 0.3.7

_Released: 2025-06-05T12:32:35Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.7

## 0.3.6

_Released: 2025-06-05T07:23:07Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.6

## 0.3.5

_Released: 2025-05-30T09:02:15Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.5

## 0.3.4

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.4

## 0.3.3

_Released: 2025-05-27T17:59:17Z_

### Patch Changes

- @sap-ux/inquirer-common@0.7.3

## 0.3.2

_Released: 2025-05-27T15:05:11Z_

### Patch Changes

- Updated dependencies [b3fe5b8]
    - @sap-ux/inquirer-common@0.7.2

## 0.3.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- Updated dependencies [66b88e1]
    - @sap-ux/inquirer-common@0.7.1

## 0.3.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/inquirer-common@0.7.0
    - @sap-ux/btp-utils@1.1.0
    - @sap-ux/logger@0.7.0

## 0.2.37

_Released: 2025-05-13T10:46:10Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.43

## 0.2.36

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.42

## 0.2.35

_Released: 2025-05-01T13:52:16Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.41

## 0.2.34

_Released: 2025-04-28T14:29:23Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.40

## 0.2.33

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.39

## 0.2.32

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.38

## 0.2.31

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.37

## 0.2.30

_Released: 2025-04-22T12:06:47Z_

### Patch Changes

- 6578d86: text changes

## 0.2.29

_Released: 2025-04-17T12:52:13Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.36

## 0.2.28

_Released: 2025-04-16T10:08:22Z_

### Patch Changes

- d809536: update text label and handle options

## 0.2.27

_Released: 2025-04-15T10:10:52Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.35

## 0.2.26

_Released: 2025-04-15T07:40:05Z_

### Patch Changes

- 0cdc387: Expose App Frontend Service from cf-sub-generator, with minor code cleanup

## 0.2.25

_Released: 2025-04-14T22:24:07Z_

### Patch Changes

- Updated dependencies [d638daa]
    - @sap-ux/btp-utils@1.0.3
    - @sap-ux/inquirer-common@0.6.34

## 0.2.24

_Released: 2025-04-10T13:52:38Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.33

## 0.2.23

_Released: 2025-04-09T09:52:51Z_

### Patch Changes

- 88d2a71: expose new UI prompting to support app frontend service

## 0.2.22

_Released: 2025-03-26T12:15:41Z_

### Patch Changes

- Updated dependencies [ced5edf]
    - @sap-ux/inquirer-common@0.6.32

## 0.2.21

_Released: 2025-03-19T08:54:25Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.31

## 0.2.20

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.30

## 0.2.19

_Released: 2025-03-14T10:33:46Z_

### Patch Changes

- c3e7f11: remove mta id prompt for CAP flow

## 0.2.18

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- Updated dependencies [011c8c5]
    - @sap-ux/btp-utils@1.0.2
    - @sap-ux/inquirer-common@0.6.29

## 0.2.17

_Released: 2025-03-06T16:16:20Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.28

## 0.2.16

_Released: 2025-03-05T11:16:53Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.27

## 0.2.15

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.26

## 0.2.14

_Released: 2025-03-04T08:55:15Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.25

## 0.2.13

_Released: 2025-03-03T11:06:12Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.24

## 0.2.12

_Released: 2025-02-28T15:10:48Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.23

## 0.2.11

_Released: 2025-02-27T19:24:50Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.22

## 0.2.10

_Released: 2025-02-27T14:15:03Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.21

## 0.2.9

_Released: 2025-02-27T08:22:17Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.20

## 0.2.8

_Released: 2025-02-24T10:50:02Z_

### Patch Changes

- d6118c9: Changes to support adding CAP MTA prompt to allow user generate MTA

## 0.2.7

_Released: 2025-02-24T09:17:17Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.19

## 0.2.6

_Released: 2025-02-17T13:42:22Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.18

## 0.2.5

_Released: 2025-02-13T17:39:11Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.17

## 0.2.4

_Released: 2025-02-13T10:58:34Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.16

## 0.2.3

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.15

## 0.2.2

_Released: 2025-02-05T17:08:20Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.14

## 0.2.1

_Released: 2025-02-05T14:44:29Z_

### Patch Changes

- Updated dependencies [65f15d9]
    - @sap-ux/btp-utils@1.0.1
    - @sap-ux/inquirer-common@0.6.13

## 0.2.0

_Released: 2025-02-05T10:10:11Z_

### Minor Changes

- 9b755fc: adds new cf generator

## 0.1.26

_Released: 2025-02-04T15:39:07Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.12

## 0.1.25

_Released: 2025-02-04T14:25:43Z_

### Patch Changes

- Updated dependencies [9980073]
    - @sap-ux/btp-utils@1.0.0
    - @sap-ux/inquirer-common@0.6.11

## 0.1.24

_Released: 2025-01-30T10:04:50Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.10

## 0.1.23

_Released: 2025-01-29T17:41:08Z_

### Patch Changes

- Updated dependencies [5e3a5f8]
    - @sap-ux/inquirer-common@0.6.9

## 0.1.22

_Released: 2025-01-29T13:31:31Z_

### Patch Changes

- Updated dependencies [df2d965]
    - @sap-ux/btp-utils@0.18.0
    - @sap-ux/inquirer-common@0.6.8

## 0.1.21

_Released: 2025-01-28T09:20:06Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.7

## 0.1.20

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.6

## 0.1.19

_Released: 2025-01-22T17:11:37Z_

### Patch Changes

- Updated dependencies [080bda2]
    - @sap-ux/inquirer-common@0.6.5

## 0.1.18

_Released: 2025-01-20T11:37:42Z_

### Patch Changes

- 6b6c64a: adds new module cf deploy config sub gen

## 0.1.17

_Released: 2025-01-16T02:22:29Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.4

## 0.1.16

_Released: 2025-01-08T15:30:03Z_

### Patch Changes

- Updated dependencies [40ba546]
    - @sap-ux/inquirer-common@0.6.3

## 0.1.15

_Released: 2025-01-08T11:51:44Z_

### Patch Changes

- Updated dependencies [dac696a]
    - @sap-ux/inquirer-common@0.6.2

## 0.1.14

_Released: 2024-12-20T15:43:15Z_

### Patch Changes

- @sap-ux/inquirer-common@0.6.1

## 0.1.13

_Released: 2024-12-19T17:24:19Z_

### Patch Changes

- Updated dependencies [112d29a]
    - @sap-ux/inquirer-common@0.6.0

## 0.1.12

_Released: 2024-12-18T17:26:19Z_

### Patch Changes

- 2fab480: handle CF router queston not returning service name

## 0.1.11

_Released: 2024-12-18T10:32:41Z_

### Patch Changes

- Updated dependencies [f8dda3b]
    - @sap-ux/inquirer-common@0.5.15

## 0.1.10

_Released: 2024-12-17T15:31:53Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.14

## 0.1.9

_Released: 2024-12-17T13:32:02Z_

### Patch Changes

- Updated dependencies [cb54b44]
    - @sap-ux/btp-utils@0.17.2
    - @sap-ux/inquirer-common@0.5.13

## 0.1.8

_Released: 2024-12-10T16:04:29Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.12

## 0.1.7

_Released: 2024-12-10T14:32:00Z_

### Patch Changes

- Updated dependencies [0c64478]
    - @sap-ux/inquirer-common@0.5.11

## 0.1.6

_Released: 2024-12-10T11:51:29Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.10

## 0.1.5

_Released: 2024-12-06T21:07:01Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.9

## 0.1.4

_Released: 2024-12-04T15:30:32Z_

### Patch Changes

- Updated dependencies [307706e]
    - @sap-ux/inquirer-common@0.5.8

## 0.1.3

_Released: 2024-12-04T12:27:41Z_

### Patch Changes

- Updated dependencies [2359524]
    - @sap-ux/inquirer-common@0.5.7
    - @sap-ux/btp-utils@0.17.1

## 0.1.2

_Released: 2024-12-04T11:05:53Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.6

## 0.1.1

_Released: 2024-12-02T16:28:38Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.5

## 0.1.0

_Released: 2024-11-29T16:33:10Z_

### Minor Changes

- d929fc9: Add App Router CF inquirer

## 0.0.11

_Released: 2024-11-21T11:48:14Z_

### Patch Changes

- Updated dependencies [74dc5fe]
    - @sap-ux/inquirer-common@0.5.4

## 0.0.10

_Released: 2024-11-19T13:21:01Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.3

## 0.0.9

_Released: 2024-11-18T22:28:16Z_

### Patch Changes

- a62ff25: adds new options for listing destinations api
- Updated dependencies [a62ff25]
    - @sap-ux/btp-utils@0.17.0
    - @sap-ux/inquirer-common@0.5.2

## 0.0.8

_Released: 2024-11-18T20:38:37Z_

### Patch Changes

- @sap-ux/inquirer-common@0.5.1

## 0.0.7

_Released: 2024-11-14T17:04:56Z_

### Patch Changes

- Updated dependencies [2886db3]
    - @sap-ux/inquirer-common@0.5.0

## 0.0.6

_Released: 2024-11-11T17:55:13Z_

### Patch Changes

- Updated dependencies [3734fe8]
    - @sap-ux/btp-utils@0.16.0

## 0.0.5

_Released: 2024-11-01T07:47:25Z_

### Patch Changes

- @sap-ux/inquirer-common@0.4.10

## 0.0.4

_Released: 2024-10-30T13:01:12Z_

### Patch Changes

- @sap-ux/inquirer-common@0.4.9

## 0.0.3

_Released: 2024-10-24T14:04:35Z_

### Patch Changes

- Updated dependencies [02e4f29]
    - @sap-ux/inquirer-common@0.4.8

## 0.0.2

_Released: 2024-10-23T12:50:19Z_

### Patch Changes

- Updated dependencies [d29b1a3]
    - @sap-ux/inquirer-common@0.4.7

## 0.0.1

_Released: 2024-11-19T13:21:01Z_

### Patch Changes

- 2fa3fda: add new module @sap-ux/cf-deploy-config-inquirer to get cf prompt options
