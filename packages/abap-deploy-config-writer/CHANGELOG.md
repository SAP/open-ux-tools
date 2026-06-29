# @sap-ux/abap-deploy-config-writer

## 1.0.10

### Patch Changes

#### Dependency Updates

- Upgrade patch-level dependencies [[aed328d](https://github.com/SAP/open-ux-tools/commit/aed328da8a5c93e226c58e4d7dc14c7c82756259)]

#### Workspace Updates

- @sap-ux/system-access 1.0.3 → 1.0.4
- @sap-ux/ui5-config 1.0.3 → 1.0.3

## 1.0.9

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.2 → 2.1.3
- @sap-ux/system-access 1.0.3 → 1.0.3

## 1.0.8

_Released: 2026-06-12T06:53:23Z_

### Patch Changes

- @sap-ux/system-access@1.0.3

## 1.0.7

_Released: 2026-06-10T09:57:42Z_

### Patch Changes

- c8e8f7e: fix: write builder.resources.excludes to base ui5.yaml as well as ui5-deploy.yaml
- Updated dependencies [c8e8f7e]
    - @sap-ux/ui5-config@1.0.3
    - @sap-ux/project-access@2.1.2
    - @sap-ux/system-access@1.0.2

## 1.0.6

_Released: 2026-06-09T14:35:01Z_

### Patch Changes

- @sap-ux/system-access@1.0.2

## 1.0.5

_Released: 2026-06-04T13:54:21Z_

### Patch Changes

- Updated dependencies [fff7490]
    - @sap-ux/project-access@2.1.1
    - @sap-ux/system-access@1.0.1

## 1.0.4

_Released: 2026-06-04T10:19:37Z_

### Patch Changes

- Updated dependencies [b326a9a]
    - @sap-ux/project-access@2.1.0
    - @sap-ux/system-access@1.0.1

## 1.0.3

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/project-access@2.0.3
    - @sap-ux/system-access@1.0.1
    - @sap-ux/ui5-config@1.0.2

## 1.0.2

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- Updated dependencies [9580241]
    - @sap-ux/ui5-config@1.0.1
    - @sap-ux/project-access@2.0.2
    - @sap-ux/system-access@1.0.0

## 1.0.1

_Released: 2026-06-01T15:15:26Z_

### Patch Changes

- Updated dependencies [aed799d]
    - @sap-ux/project-access@2.0.1
    - @sap-ux/system-access@1.0.0

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
    - @sap-ux/system-access@1.0.0
    - @sap-ux/ui5-config@1.0.0

## 0.4.4

_Released: 2026-05-27T10:42:47Z_

### Patch Changes

- @sap-ux/system-access@0.8.2
- @sap-ux/ui5-config@0.31.1

## 0.4.3

_Released: 2026-05-26T16:40:21Z_

### Patch Changes

- @sap-ux/system-access@0.8.1

## 0.4.2

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- Updated dependencies [9752c40]
    - @sap-ux/ui5-config@0.31.1
    - @sap-ux/project-access@1.38.1
    - @sap-ux/system-access@0.8.0

## 0.4.1

_Released: 2026-05-19T15:16:46Z_

### Patch Changes

- Updated dependencies [63e6846]
    - @sap-ux/project-access@1.38.0
    - @sap-ux/system-access@0.8.0

## 0.4.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/project-access@1.37.0
    - @sap-ux/system-access@0.8.0
    - @sap-ux/ui5-config@0.31.0

## 0.3.18

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/project-access@1.36.5
    - @sap-ux/system-access@0.7.13
    - @sap-ux/ui5-config@0.30.5

## 0.3.17

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- Updated dependencies [21abda3]
    - @sap-ux/project-access@1.36.4
    - @sap-ux/system-access@0.7.12

## 0.3.16

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- Updated dependencies [678a08e]
    - @sap-ux/ui5-config@0.30.4
    - @sap-ux/system-access@0.7.11
    - @sap-ux/project-access@1.36.3

## 0.3.15

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- Updated dependencies [c160401]
    - @sap-ux/system-access@0.7.10
    - @sap-ux/project-access@1.36.2

## 0.3.14

_Released: 2026-04-29T15:24:37Z_

### Patch Changes

- Updated dependencies [3945459]
    - @sap-ux/project-access@1.36.1
    - @sap-ux/system-access@0.7.9

## 0.3.13

_Released: 2026-04-27T19:47:46Z_

### Patch Changes

- Updated dependencies [1d60871]
    - @sap-ux/project-access@1.36.0
    - @sap-ux/system-access@0.7.8

## 0.3.12

_Released: 2026-04-23T12:54:21Z_

### Patch Changes

- Updated dependencies [03d3ea1]
    - @sap-ux/project-access@1.35.21
    - @sap-ux/system-access@0.7.8

## 0.3.11

_Released: 2026-04-23T06:48:55Z_

### Patch Changes

- @sap-ux/system-access@0.7.8

## 0.3.10

_Released: 2026-04-14T20:26:28Z_

### Patch Changes

- @sap-ux/system-access@0.7.7

## 0.3.9

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- Updated dependencies [cc4450c]
    - @sap-ux/ui5-config@0.30.3
    - @sap-ux/system-access@0.7.6
    - @sap-ux/project-access@1.35.20

## 0.3.8

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- f1e4481: chore: upgrade lodash 4.17.23 → 4.18.1 (CVE security fix, vulnerable range <=4.17.23)
- Updated dependencies [f1e4481]
    - @sap-ux/ui5-config@0.30.2
    - @sap-ux/system-access@0.7.5
    - @sap-ux/project-access@1.35.19

## 0.3.7

_Released: 2026-04-01T11:49:37Z_

### Patch Changes

- Updated dependencies [3291f6c]
    - @sap-ux/project-access@1.35.18
    - @sap-ux/system-access@0.7.4

## 0.3.6

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- @sap-ux/system-access@0.7.4
- @sap-ux/project-access@1.35.17
- @sap-ux/ui5-config@0.30.1

## 0.3.5

_Released: 2026-03-27T11:58:49Z_

### Patch Changes

- @sap-ux/system-access@0.7.3

## 0.3.4

_Released: 2026-03-26T20:06:10Z_

### Patch Changes

- Updated dependencies [b66e827]
    - @sap-ux/project-access@1.35.17
    - @sap-ux/system-access@0.7.2

## 0.3.3

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: chore(abap-deploy-config-writer): upgrade fast-glob 3.3.1 → 3.3.3
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/project-access@1.35.16
    - @sap-ux/ui5-config@0.30.1
    - @sap-ux/system-access@0.7.2

## 0.3.2

_Released: 2026-03-25T12:56:41Z_

### Patch Changes

- Updated dependencies [f384ace]
    - @sap-ux/project-access@1.35.15
    - @sap-ux/system-access@0.7.1

## 0.3.1

_Released: 2026-03-23T18:25:40Z_

### Patch Changes

- @sap-ux/system-access@0.7.1

## 0.3.0

_Released: 2026-03-20T16:07:49Z_

### Minor Changes

- 25e5177: support full service url systems in the application generator and generated apps for preview and deployment

### Patch Changes

- Updated dependencies [25e5177]
    - @sap-ux/system-access@0.7.0
    - @sap-ux/ui5-config@0.30.0
    - @sap-ux/project-access@1.35.14

## 0.2.93

_Released: 2026-03-17T07:55:04Z_

### Patch Changes

- @sap-ux/system-access@0.6.66

## 0.2.92

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- Updated dependencies [5d452e5]
    - @sap-ux/system-access@0.6.65
    - @sap-ux/ui5-config@0.29.21

## 0.2.91

_Released: 2026-03-05T23:21:37Z_

### Patch Changes

- @sap-ux/system-access@0.6.64

## 0.2.90

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- Updated dependencies [d834713]
    - @sap-ux/project-access@1.35.13
    - @sap-ux/system-access@0.6.63

## 0.2.89

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- Updated dependencies [7c06ef0]
    - @sap-ux/project-access@1.35.12
    - @sap-ux/ui5-config@0.29.21
    - @sap-ux/system-access@0.6.63

## 0.2.88

_Released: 2026-03-05T10:41:09Z_

### Patch Changes

- 5aff25c: fix(deps): update dependency fs-extra to v11

## 0.2.87

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- ac58145: fix(deps): update dependency fs-extra to v10.1.0
    - @sap-ux/project-access@1.35.11
    - @sap-ux/system-access@0.6.62
    - @sap-ux/ui5-config@0.29.20

## 0.2.86

_Released: 2026-03-04T15:52:08Z_

### Patch Changes

- @sap-ux/system-access@0.6.61

## 0.2.85

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- Updated dependencies [c09b843]
    - @sap-ux/ui5-config@0.29.20
    - @sap-ux/project-access@1.35.11
    - @sap-ux/system-access@0.6.60

## 0.2.84

_Released: 2026-03-03T08:27:12Z_

### Patch Changes

- @sap-ux/system-access@0.6.60

## 0.2.83

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/project-access@1.35.10
    - @sap-ux/system-access@0.6.59

## 0.2.82

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- @sap-ux/system-access@0.6.58
- @sap-ux/ui5-config@0.29.19

## 0.2.81

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.9
- @sap-ux/system-access@0.6.57

## 0.2.80

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- Updated dependencies [0ecc5f1]
    - @sap-ux/project-access@1.35.8
    - @sap-ux/system-access@0.6.56

## 0.2.79

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- Updated dependencies [d92cd35]
    - @sap-ux/ui5-config@0.29.19
    - @sap-ux/project-access@1.35.7
    - @sap-ux/system-access@0.6.56

## 0.2.78

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- Updated dependencies [d588c26]
    - @sap-ux/system-access@0.6.56

## 0.2.77

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- @sap-ux/system-access@0.6.55
- @sap-ux/ui5-config@0.29.18

## 0.2.76

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- bb310dc: fix(deps): update dependency semver to v7.7.4
- Updated dependencies [bb310dc]
- Updated dependencies [e5bc3ca]
    - @sap-ux/project-access@1.35.6
    - @sap-ux/ui5-config@0.29.18
    - @sap-ux/system-access@0.6.54

## 0.2.75

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/project-access@1.35.5
    - @sap-ux/system-access@0.6.54

## 0.2.74

_Released: 2026-02-16T18:48:13Z_

### Patch Changes

- @sap-ux/system-access@0.6.53

## 0.2.73

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- Updated dependencies [e7f58d7]
    - @sap-ux/ui5-config@0.29.17
    - @sap-ux/system-access@0.6.52
    - @sap-ux/project-access@1.35.4

## 0.2.72

_Released: 2026-02-13T16:18:58Z_

### Patch Changes

- @sap-ux/system-access@0.6.51
- @sap-ux/ui5-config@0.29.16

## 0.2.71

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- Updated dependencies [346f09c]
    - @sap-ux/project-access@1.35.3
    - @sap-ux/system-access@0.6.50

## 0.2.70

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- Updated dependencies [d2b772d]
    - @sap-ux/project-access@1.35.2
    - @sap-ux/system-access@0.6.50

## 0.2.69

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/ui5-config@0.29.16
    - @sap-ux/system-access@0.6.50
    - @sap-ux/project-access@1.35.1

## 0.2.68

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/project-access@1.35.0
    - @sap-ux/system-access@0.6.49

## 0.2.67

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- Updated dependencies [467e6aa]
    - @sap-ux/project-access@1.34.7
    - @sap-ux/system-access@0.6.49

## 0.2.66

_Released: 2026-02-05T13:53:56Z_

### Patch Changes

- @sap-ux/system-access@0.6.49
- @sap-ux/ui5-config@0.29.15

## 0.2.65

_Released: 2026-02-05T11:39:04Z_

### Patch Changes

- @sap-ux/system-access@0.6.48
- @sap-ux/ui5-config@0.29.15

## 0.2.64

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- ad321ab: fix(deps): update dependency semver to v7.7.3
- Updated dependencies [ad321ab]
    - @sap-ux/project-access@1.34.6
    - @sap-ux/ui5-config@0.29.15
    - @sap-ux/system-access@0.6.47

## 0.2.63

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- Updated dependencies [9f11dd2]
    - @sap-ux/system-access@0.6.47

## 0.2.62

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [89175fe]
    - @sap-ux/project-access@1.34.5
    - @sap-ux/system-access@0.6.46

## 0.2.61

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- ea7a16c: Fix Extend lodash vulnerability
- Updated dependencies [ea7a16c]
    - @sap-ux/ui5-config@0.29.14
    - @sap-ux/system-access@0.6.45
    - @sap-ux/project-access@1.34.4

## 0.2.60

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- Updated dependencies [6d71400]
    - @sap-ux/project-access@1.34.3
    - @sap-ux/system-access@0.6.44

## 0.2.59

_Released: 2026-01-28T00:19:05Z_

### Patch Changes

- @sap-ux/system-access@0.6.44
- @sap-ux/ui5-config@0.29.13

## 0.2.58

_Released: 2026-01-26T09:14:13Z_

### Patch Changes

- @sap-ux/system-access@0.6.43

## 0.2.57

_Released: 2026-01-23T12:49:27Z_

### Patch Changes

- @sap-ux/system-access@0.6.42
- @sap-ux/ui5-config@0.29.13

## 0.2.56

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- Updated dependencies [be67fc4]
- Updated dependencies [be67fc4]
    - @sap-ux/ui5-config@0.29.13
    - @sap-ux/project-access@1.34.2
    - @sap-ux/system-access@0.6.41

## 0.2.55

_Released: 2026-01-16T12:32:24Z_

### Patch Changes

- @sap-ux/system-access@0.6.41
- @sap-ux/ui5-config@0.29.12

## 0.2.54

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1
    - @sap-ux/system-access@0.6.40

## 0.2.53

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0
    - @sap-ux/system-access@0.6.40

## 0.2.52

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- Updated dependencies [f13d1c2]
    - @sap-ux/project-access@1.33.2
    - @sap-ux/system-access@0.6.40

## 0.2.51

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/project-access@1.33.1
    - @sap-ux/system-access@0.6.40

## 0.2.50

_Released: 2026-01-08T17:12:17Z_

### Patch Changes

- @sap-ux/system-access@0.6.39

## 0.2.49

_Released: 2026-01-07T16:03:58Z_

### Patch Changes

- @sap-ux/system-access@0.6.38

## 0.2.48

_Released: 2025-12-22T17:36:43Z_

### Patch Changes

- @sap-ux/system-access@0.6.37

## 0.2.47

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/project-access@1.33.0
    - @sap-ux/system-access@0.6.36
    - @sap-ux/ui5-config@0.29.12

## 0.2.46

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/project-access@1.32.17
    - @sap-ux/system-access@0.6.35
    - @sap-ux/ui5-config@0.29.12

## 0.2.45

_Released: 2025-12-18T08:56:52Z_

### Patch Changes

- @sap-ux/system-access@0.6.34

## 0.2.44

_Released: 2025-12-16T11:43:52Z_

### Patch Changes

- Updated dependencies [ba58398]
    - @sap-ux/system-access@0.6.33
    - @sap-ux/ui5-config@0.29.11

## 0.2.43

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/project-access@1.32.16
    - @sap-ux/system-access@0.6.32
    - @sap-ux/ui5-config@0.29.11

## 0.2.42

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- Updated dependencies [7217d7d]
    - @sap-ux/project-access@1.32.15
    - @sap-ux/system-access@0.6.31

## 0.2.41

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- Updated dependencies [4bdced0]
    - @sap-ux/project-access@1.32.14
    - @sap-ux/system-access@0.6.31

## 0.2.40

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- Updated dependencies [985223a]
    - @sap-ux/project-access@1.32.13
    - @sap-ux/system-access@0.6.31

## 0.2.39

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- 037a430: fix high severity Sonar issues
- Updated dependencies [037a430]
    - @sap-ux/system-access@0.6.31
    - @sap-ux/ui5-config@0.29.10

## 0.2.38

_Released: 2025-12-08T11:51:00Z_

### Patch Changes

- @sap-ux/system-access@0.6.30

## 0.2.37

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- Updated dependencies [45fe64e]
    - @sap-ux/project-access@1.32.12
    - @sap-ux/system-access@0.6.29

## 0.2.36

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- Updated dependencies [07725fe]
    - @sap-ux/project-access@1.32.11
    - @sap-ux/system-access@0.6.29

## 0.2.35

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- Updated dependencies [5d0598d]
    - @sap-ux/ui5-config@0.29.10
    - @sap-ux/system-access@0.6.29
    - @sap-ux/project-access@1.32.10

## 0.2.34

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- Updated dependencies [7c09c8e]
- Updated dependencies [1c13c9c]
    - @sap-ux/project-access@1.32.9
    - @sap-ux/system-access@0.6.28

## 0.2.33

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/project-access@1.32.8
    - @sap-ux/system-access@0.6.28
    - @sap-ux/ui5-config@0.29.9

## 0.2.32

_Released: 2025-10-31T13:35:34Z_

### Patch Changes

- @sap-ux/system-access@0.6.27
- @sap-ux/ui5-config@0.29.8

## 0.2.31

_Released: 2025-10-30T10:09:21Z_

### Patch Changes

- @sap-ux/system-access@0.6.26

## 0.2.30

_Released: 2025-10-29T17:02:38Z_

### Patch Changes

- @sap-ux/system-access@0.6.25
- @sap-ux/ui5-config@0.29.8

## 0.2.29

_Released: 2025-10-29T11:04:17Z_

### Patch Changes

- @sap-ux/system-access@0.6.24
- @sap-ux/ui5-config@0.29.8

## 0.2.28

_Released: 2025-10-28T13:36:39Z_

### Patch Changes

- @sap-ux/system-access@0.6.23

## 0.2.27

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- Updated dependencies [d895232]
    - @sap-ux/project-access@1.32.7
    - @sap-ux/system-access@0.6.22

## 0.2.26

_Released: 2025-10-22T18:56:41Z_

### Patch Changes

- @sap-ux/system-access@0.6.22

## 0.2.25

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- Updated dependencies [ea0a942]
    - @sap-ux/project-access@1.32.6
    - @sap-ux/system-access@0.6.21

## 0.2.24

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- Updated dependencies [c5d7915]
    - @sap-ux/project-access@1.32.5
    - @sap-ux/system-access@0.6.21

## 0.2.23

_Released: 2025-10-17T11:37:38Z_

### Patch Changes

- @sap-ux/system-access@0.6.21
- @sap-ux/ui5-config@0.29.8

## 0.2.22

_Released: 2025-10-14T13:22:30Z_

### Patch Changes

- Updated dependencies [bacaf93]
    - @sap-ux/system-access@0.6.20
    - @sap-ux/ui5-config@0.29.8

## 0.2.21

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- Updated dependencies [9e94382]
    - @sap-ux/ui5-config@0.29.8
    - @sap-ux/project-access@1.32.4
    - @sap-ux/system-access@0.6.19

## 0.2.20

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/project-access@1.32.3
    - @sap-ux/system-access@0.6.19
    - @sap-ux/ui5-config@0.29.7

## 0.2.19

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- Updated dependencies [d866995]
    - @sap-ux/ui5-config@0.29.6
    - @sap-ux/project-access@1.32.2
    - @sap-ux/system-access@0.6.18

## 0.2.18

_Released: 2025-10-03T09:25:07Z_

### Patch Changes

- 4b0b8fb: fix: Missing build script for ADP onPremise projects leads to error during deployment

## 0.2.17

_Released: 2025-09-23T20:14:56Z_

### Patch Changes

- @sap-ux/system-access@0.6.18

## 0.2.16

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- Updated dependencies [9872384]
    - @sap-ux/ui5-config@0.29.5
    - @sap-ux/system-access@0.6.17
    - @sap-ux/project-access@1.32.1

## 0.2.15

_Released: 2025-09-19T12:41:40Z_

### Patch Changes

- c15aa4f: fix: Wrong npm deploy scripts are created for ADP onPremise projects

## 0.2.14

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- Updated dependencies [f9b4afe]
    - @sap-ux/project-access@1.32.0
    - @sap-ux/system-access@0.6.16

## 0.2.13

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- Updated dependencies [c385a76]
    - @sap-ux/project-access@1.31.0
    - @sap-ux/system-access@0.6.16

## 0.2.12

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- Updated dependencies [8ccc4da]
    - @sap-ux/ui5-config@0.29.4
    - @sap-ux/project-access@1.30.14
    - @sap-ux/system-access@0.6.16

## 0.2.11

_Released: 2025-09-02T13:22:05Z_

### Patch Changes

- @sap-ux/system-access@0.6.16

## 0.2.10

_Released: 2025-09-01T12:06:20Z_

### Patch Changes

- @sap-ux/system-access@0.6.15
- @sap-ux/ui5-config@0.29.3

## 0.2.9

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- Updated dependencies [4cfebaf]
    - @sap-ux/ui5-config@0.29.3
    - @sap-ux/system-access@0.6.14
    - @sap-ux/project-access@1.30.13

## 0.2.8

_Released: 2025-08-21T14:27:46Z_

### Patch Changes

- @sap-ux/system-access@0.6.13
- @sap-ux/ui5-config@0.29.2

## 0.2.7

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- Updated dependencies [178dbea]
    - @sap-ux/ui5-config@0.29.2
    - @sap-ux/project-access@1.30.12
    - @sap-ux/system-access@0.6.12

## 0.2.6

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/project-access@1.30.11
- @sap-ux/system-access@0.6.12

## 0.2.5

_Released: 2025-08-01T13:45:39Z_

### Patch Changes

- @sap-ux/system-access@0.6.12

## 0.2.4

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- Updated dependencies [43bc887]
    - @sap-ux/ui5-config@0.29.1
    - @sap-ux/project-access@1.30.10
    - @sap-ux/system-access@0.6.11

## 0.2.3

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.9
- @sap-ux/system-access@0.6.11

## 0.2.2

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- Updated dependencies [4e0bd83]
    - @sap-ux/project-access@1.30.8
    - @sap-ux/system-access@0.6.11

## 0.2.1

_Released: 2025-07-28T08:36:50Z_

### Patch Changes

- @sap-ux/system-access@0.6.11

## 0.2.0

_Released: 2025-07-16T14:40:22Z_

### Minor Changes

- e53c1f8: Remove archive.zip from deploy script to allow passing any of the additional CLI params.

## 0.1.17

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- Updated dependencies [58cdce6]
    - @sap-ux/project-access@1.30.7
    - @sap-ux/system-access@0.6.10

## 0.1.16

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- @sap-ux/system-access@0.6.10
- @sap-ux/ui5-config@0.29.0

## 0.1.15

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- Updated dependencies [c0fa1d1]
    - @sap-ux/ui5-config@0.29.0
    - @sap-ux/project-access@1.30.6
    - @sap-ux/system-access@0.6.9

## 0.1.14

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- Updated dependencies [7a4543e]
    - @sap-ux/project-access@1.30.5
    - @sap-ux/system-access@0.6.9

## 0.1.13

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- Updated dependencies [f75b89d]
    - @sap-ux/project-access@1.30.4
    - @sap-ux/ui5-config@0.28.3
    - @sap-ux/system-access@0.6.9

## 0.1.12

_Released: 2025-06-27T07:08:06Z_

### Patch Changes

- @sap-ux/system-access@0.6.9
- @sap-ux/ui5-config@0.28.2

## 0.1.11

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- @sap-ux/system-access@0.6.8
- @sap-ux/project-access@1.30.3

## 0.1.10

_Released: 2025-06-23T22:19:01Z_

### Patch Changes

- @sap-ux/system-access@0.6.7

## 0.1.9

_Released: 2025-06-19T10:31:56Z_

### Patch Changes

- @sap-ux/system-access@0.6.6

## 0.1.8

_Released: 2025-06-19T04:44:24Z_

### Patch Changes

- @sap-ux/system-access@0.6.5

## 0.1.7

_Released: 2025-06-18T14:50:19Z_

### Patch Changes

- 3ea811a: Bump @ui5/cli version

## 0.1.6

_Released: 2025-06-11T12:23:45Z_

### Patch Changes

- @sap-ux/system-access@0.6.4

## 0.1.5

_Released: 2025-06-10T17:08:16Z_

### Patch Changes

- @sap-ux/system-access@0.6.3

## 0.1.4

_Released: 2025-06-04T10:59:54Z_

### Patch Changes

- @sap-ux/system-access@0.6.2

## 0.1.3

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- Updated dependencies [61ea5c0]
    - @sap-ux/ui5-config@0.28.2
    - @sap-ux/project-access@1.30.2
    - @sap-ux/system-access@0.6.1

## 0.1.2

_Released: 2025-05-23T13:35:39Z_

### Patch Changes

- @sap-ux/system-access@0.6.1

## 0.1.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- Updated dependencies [5e0020b]
    - @sap-ux/ui5-config@0.28.1
    - @sap-ux/project-access@1.30.1
    - @sap-ux/system-access@0.6.0

## 0.1.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/project-access@1.30.0
    - @sap-ux/system-access@0.6.0
    - @sap-ux/ui5-config@0.28.0

## 0.0.110

_Released: 2025-05-13T10:46:10Z_

### Patch Changes

- @sap-ux/system-access@0.5.39

## 0.0.109

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- Updated dependencies [ea0e2c0]
    - @sap-ux/project-access@1.29.22
    - @sap-ux/system-access@0.5.38

## 0.0.108

_Released: 2025-05-02T10:00:21Z_

### Patch Changes

- @sap-ux/system-access@0.5.38

## 0.0.107

_Released: 2025-04-30T08:50:36Z_

### Patch Changes

- @sap-ux/system-access@0.5.37

## 0.0.106

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- Updated dependencies [7590bc3]
    - @sap-ux/ui5-config@0.27.2
    - @sap-ux/project-access@1.29.21
    - @sap-ux/system-access@0.5.36

## 0.0.105

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- Updated dependencies [294bbe3]
    - @sap-ux/project-access@1.29.20
    - @sap-ux/ui5-config@0.27.1
    - @sap-ux/system-access@0.5.36

## 0.0.104

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- Updated dependencies [1ca4004]
    - @sap-ux/ui5-config@0.27.0
    - @sap-ux/project-access@1.29.19
    - @sap-ux/system-access@0.5.36

## 0.0.103

_Released: 2025-04-15T14:18:17Z_

### Patch Changes

- @sap-ux/system-access@0.5.36

## 0.0.102

_Released: 2025-04-14T22:24:07Z_

### Patch Changes

- @sap-ux/system-access@0.5.35

## 0.0.101

_Released: 2025-03-26T12:15:41Z_

### Patch Changes

- @sap-ux/system-access@0.5.34

## 0.0.100

_Released: 2025-03-19T08:54:25Z_

### Patch Changes

- Updated dependencies [c3ebc82]
    - @sap-ux/project-access@1.29.18
    - @sap-ux/system-access@0.5.33

## 0.0.99

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- Updated dependencies [224494c]
    - @sap-ux/ui5-config@0.26.5
    - @sap-ux/project-access@1.29.17
    - @sap-ux/system-access@0.5.33

## 0.0.98

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- Updated dependencies [011c8c5]
    - @sap-ux/ui5-config@0.26.4
    - @sap-ux/system-access@0.5.33
    - @sap-ux/project-access@1.29.16

## 0.0.97

_Released: 2025-03-06T16:16:20Z_

### Patch Changes

- Updated dependencies [1ce7fe9]
    - @sap-ux/project-access@1.29.15
    - @sap-ux/system-access@0.5.32

## 0.0.96

_Released: 2025-03-05T11:16:53Z_

### Patch Changes

- Updated dependencies [3cc8f8a]
    - @sap-ux/project-access@1.29.14
    - @sap-ux/system-access@0.5.32

## 0.0.95

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- Updated dependencies [5817923]
    - @sap-ux/ui5-config@0.26.3
    - @sap-ux/project-access@1.29.13
    - @sap-ux/system-access@0.5.32

## 0.0.94

_Released: 2025-03-04T08:55:15Z_

### Patch Changes

- @sap-ux/project-access@1.29.12
- @sap-ux/system-access@0.5.32

## 0.0.93

_Released: 2025-03-03T08:50:39Z_

### Patch Changes

- @sap-ux/system-access@0.5.32

## 0.0.92

_Released: 2025-02-28T15:10:48Z_

### Patch Changes

- Updated dependencies [0f35b4b]
    - @sap-ux/project-access@1.29.11
    - @sap-ux/system-access@0.5.31

## 0.0.91

_Released: 2025-02-27T14:15:03Z_

### Patch Changes

- @sap-ux/project-access@1.29.10
- @sap-ux/system-access@0.5.31

## 0.0.90

_Released: 2025-02-27T08:22:17Z_

### Patch Changes

- Updated dependencies [c8c292c]
    - @sap-ux/project-access@1.29.9
    - @sap-ux/system-access@0.5.31

## 0.0.89

_Released: 2025-02-17T13:42:22Z_

### Patch Changes

- Updated dependencies [c50e09f]
    - @sap-ux/project-access@1.29.8
    - @sap-ux/system-access@0.5.31

## 0.0.88

_Released: 2025-02-17T11:44:22Z_

### Patch Changes

- @sap-ux/system-access@0.5.31

## 0.0.87

_Released: 2025-02-13T10:58:34Z_

### Patch Changes

- Updated dependencies [2c0d657]
    - @sap-ux/project-access@1.29.7
    - @sap-ux/system-access@0.5.30

## 0.0.86

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- Updated dependencies [ed8a9b9]
    - @sap-ux/ui5-config@0.26.2
    - @sap-ux/project-access@1.29.6
    - @sap-ux/system-access@0.5.30

## 0.0.85

_Released: 2025-02-05T17:08:20Z_

### Patch Changes

- @sap-ux/project-access@1.29.5
- @sap-ux/system-access@0.5.30

## 0.0.84

_Released: 2025-02-05T14:44:29Z_

### Patch Changes

- @sap-ux/system-access@0.5.30

## 0.0.83

_Released: 2025-02-04T15:39:07Z_

### Patch Changes

- Updated dependencies [29abc73]
    - @sap-ux/project-access@1.29.4
    - @sap-ux/system-access@0.5.29

## 0.0.82

_Released: 2025-02-04T14:25:43Z_

### Patch Changes

- @sap-ux/system-access@0.5.29

## 0.0.81

_Released: 2025-01-30T10:04:50Z_

### Patch Changes

- Updated dependencies [096b021]
    - @sap-ux/project-access@1.29.3
    - @sap-ux/system-access@0.5.28

## 0.0.80

_Released: 2025-01-29T13:31:31Z_

### Patch Changes

- @sap-ux/system-access@0.5.28

## 0.0.79

_Released: 2025-01-28T10:44:06Z_

### Patch Changes

- @sap-ux/system-access@0.5.27

## 0.0.78

_Released: 2025-01-28T09:20:06Z_

### Patch Changes

- Updated dependencies [93ef8c1]
    - @sap-ux/project-access@1.29.2
    - @sap-ux/system-access@0.5.26

## 0.0.77

_Released: 2025-01-27T22:28:20Z_

### Patch Changes

- ccb96dd: enhancements for deploying ui5 libs

## 0.0.76

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- Updated dependencies [19aad96]
    - @sap-ux/ui5-config@0.26.1
    - @sap-ux/project-access@1.29.1
    - @sap-ux/system-access@0.5.26

## 0.0.75

_Released: 2025-01-22T09:48:33Z_

### Patch Changes

- 71e5a5e: fix issues for library deployment

## 0.0.74

_Released: 2025-01-16T02:22:29Z_

### Patch Changes

- Updated dependencies [88bf030]
    - @sap-ux/project-access@1.29.0
    - @sap-ux/system-access@0.5.26

## 0.0.73

_Released: 2025-01-14T16:54:17Z_

### Patch Changes

- @sap-ux/system-access@0.5.26

## 0.0.72

_Released: 2025-01-08T10:44:36Z_

### Patch Changes

- @sap-ux/system-access@0.5.25

## 0.0.71

_Released: 2024-12-17T15:31:53Z_

### Patch Changes

- Updated dependencies [e1edcd7]
    - @sap-ux/project-access@1.28.10
    - @sap-ux/system-access@0.5.24

## 0.0.70

_Released: 2024-12-17T13:32:02Z_

### Patch Changes

- @sap-ux/system-access@0.5.24

## 0.0.69

_Released: 2024-12-10T16:04:29Z_

### Patch Changes

- @sap-ux/system-access@0.5.23
- @sap-ux/ui5-config@0.26.0

## 0.0.68

_Released: 2024-12-10T11:51:29Z_

### Patch Changes

- 1bb4d48: adds new module @sap-ux/abap-deploy-config-sub-generator

## 0.0.67

_Released: 2024-12-10T10:48:59Z_

### Patch Changes

- @sap-ux/system-access@0.5.22

## 0.0.66

_Released: 2024-12-06T21:07:01Z_

### Patch Changes

- Updated dependencies [e93797a]
    - @sap-ux/project-access@1.28.9
    - @sap-ux/system-access@0.5.21

## 0.0.65

_Released: 2024-12-04T12:27:41Z_

### Patch Changes

- @sap-ux/system-access@0.5.21

## 0.0.64

_Released: 2024-12-04T11:05:53Z_

### Patch Changes

- @sap-ux/system-access@0.5.20

## 0.0.63

_Released: 2024-12-02T16:28:38Z_

### Patch Changes

- Updated dependencies [73475e5]
    - @sap-ux/ui5-config@0.26.0
    - @sap-ux/project-access@1.28.8
    - @sap-ux/system-access@0.5.19

## 0.0.62

_Released: 2024-11-18T22:28:16Z_

### Patch Changes

- @sap-ux/system-access@0.5.19

## 0.0.61

_Released: 2024-11-18T20:38:37Z_

### Patch Changes

- 1beac7e: adds reentrance ticket auth type to deploy config
- Updated dependencies [1beac7e]
    - @sap-ux/ui5-config@0.25.2
    - @sap-ux/project-access@1.28.7
    - @sap-ux/system-access@0.5.18

## 0.0.60

_Released: 2024-11-17T22:14:47Z_

### Patch Changes

- @sap-ux/system-access@0.5.18

## 0.0.59

_Released: 2024-11-11T17:55:13Z_

### Patch Changes

- Updated dependencies [3734fe8]
    - @sap-ux/btp-utils@0.16.0
    - @sap-ux/system-access@0.5.17

## 0.0.58

_Released: 2024-11-08T15:21:08Z_

### Patch Changes

- @sap-ux/system-access@0.5.16

## 0.0.57

_Released: 2024-11-08T08:58:34Z_

### Patch Changes

- Updated dependencies [fb26f92]
    - @sap-ux/project-access@1.28.6
    - @sap-ux/system-access@0.5.15

## 0.0.56

_Released: 2024-11-07T09:36:42Z_

### Patch Changes

- @sap-ux/system-access@0.5.15

## 0.0.55

_Released: 2024-11-05T21:46:19Z_

### Patch Changes

- Updated dependencies [6275288]
    - @sap-ux/ui5-config@0.25.1
    - @sap-ux/project-access@1.28.5
    - @sap-ux/system-access@0.5.14

## 0.0.54

_Released: 2024-11-05T13:50:29Z_

### Patch Changes

- Updated dependencies [5a68903]
    - @sap-ux/project-access@1.28.4
    - @sap-ux/system-access@0.5.14

## 0.0.53

_Released: 2024-11-01T22:26:57Z_

### Patch Changes

- @sap-ux/system-access@0.5.14
- @sap-ux/ui5-config@0.25.0

## 0.0.52

_Released: 2024-10-31T07:40:48Z_

### Patch Changes

- Updated dependencies [42f13eb]
    - @sap-ux/project-access@1.28.3
    - @sap-ux/system-access@0.5.13

## 0.0.51

_Released: 2024-10-22T09:03:13Z_

### Patch Changes

- @sap-ux/system-access@0.5.13

## 0.0.50

_Released: 2024-10-16T08:21:13Z_

### Patch Changes

- Updated dependencies [eb38e5b]
    - @sap-ux/project-access@1.28.2
    - @sap-ux/system-access@0.5.12

## 0.0.49

_Released: 2024-10-14T21:48:37Z_

### Patch Changes

- Updated dependencies [64e037d]
    - @sap-ux/project-access@1.28.1
    - @sap-ux/system-access@0.5.12

## 0.0.48

_Released: 2024-10-14T16:41:16Z_

### Patch Changes

- Updated dependencies [15e6959]
    - @sap-ux/project-access@1.28.0
    - @sap-ux/system-access@0.5.12

## 0.0.47

_Released: 2024-10-08T10:16:01Z_

### Patch Changes

- Updated dependencies [eb74890]
    - @sap-ux/project-access@1.27.6
    - @sap-ux/system-access@0.5.12

## 0.0.46

_Released: 2024-10-04T15:21:13Z_

### Patch Changes

- 93f8a83: chore - upgrade typescript 5.6.2
    - @sap-ux/system-access@0.5.12
    - @sap-ux/ui5-config@0.25.0

## 0.0.45

_Released: 2024-10-02T14:28:15Z_

### Patch Changes

- Updated dependencies [a64a3a5]
    - @sap-ux/project-access@1.27.5
    - @sap-ux/system-access@0.5.11

## 0.0.44

_Released: 2024-09-23T10:02:33Z_

### Patch Changes

- Updated dependencies [484195d]
    - @sap-ux/ui5-config@0.25.0
    - @sap-ux/project-access@1.27.4
    - @sap-ux/system-access@0.5.11

## 0.0.43

_Released: 2024-09-18T14:01:49Z_

### Patch Changes

- Updated dependencies [070182d]
    - @sap-ux/project-access@1.27.3
    - @sap-ux/system-access@0.5.11

## 0.0.42

_Released: 2024-09-12T09:42:45Z_

### Patch Changes

- Updated dependencies [09522df]
    - @sap-ux/project-access@1.27.2
    - @sap-ux/system-access@0.5.11

## 0.0.41

_Released: 2024-09-11T10:59:39Z_

### Patch Changes

- @sap-ux/system-access@0.5.11

## 0.0.40

_Released: 2024-09-03T19:06:21Z_

### Patch Changes

- Updated dependencies [d962ce1]
    - @sap-ux/project-access@1.27.1
    - @sap-ux/system-access@0.5.10

## 0.0.39

_Released: 2024-08-30T06:05:30Z_

### Patch Changes

- Updated dependencies [df29368]
    - @sap-ux/project-access@1.27.0
    - @sap-ux/system-access@0.5.10

## 0.0.38

_Released: 2024-08-28T11:16:50Z_

### Patch Changes

- Updated dependencies [1a99abc]
    - @sap-ux/ui5-config@0.24.1
    - @sap-ux/project-access@1.26.9
    - @sap-ux/system-access@0.5.10

## 0.0.37

_Released: 2024-08-23T10:57:41Z_

### Patch Changes

- Updated dependencies [d3dafeb]
    - @sap-ux/btp-utils@0.15.2
    - @sap-ux/system-access@0.5.10

## 0.0.36

_Released: 2024-08-20T10:06:29Z_

### Patch Changes

- Updated dependencies [df6262e]
    - @sap-ux/project-access@1.26.8
    - @sap-ux/system-access@0.5.9

## 0.0.35

_Released: 2024-08-19T11:34:45Z_

### Patch Changes

- Updated dependencies [61721f2]
    - @sap-ux/ui5-config@0.24.0
    - @sap-ux/project-access@1.26.7
    - @sap-ux/system-access@0.5.9

## 0.0.34

_Released: 2024-08-19T09:48:14Z_

### Patch Changes

- Updated dependencies [9c8dc5c]
    - @sap-ux/btp-utils@0.15.1
    - @sap-ux/system-access@0.5.9

## 0.0.33

_Released: 2024-08-16T14:27:07Z_

### Patch Changes

- @sap-ux/system-access@0.5.8
- @sap-ux/ui5-config@0.23.1

## 0.0.32

_Released: 2024-08-14T12:04:43Z_

### Patch Changes

- @sap-ux/system-access@0.5.7
- @sap-ux/ui5-config@0.23.1

## 0.0.31

_Released: 2024-08-14T08:37:46Z_

### Patch Changes

- @sap-ux/system-access@0.5.6
- @sap-ux/ui5-config@0.23.1

## 0.0.30

_Released: 2024-08-12T10:50:52Z_

### Patch Changes

- Updated dependencies [82aaea3]
    - @sap-ux/project-access@1.26.6
    - @sap-ux/system-access@0.5.5

## 0.0.29

_Released: 2024-08-08T07:33:51Z_

### Patch Changes

- Updated dependencies [cc16cbb]
    - @sap-ux/project-access@1.26.5
    - @sap-ux/system-access@0.5.5

## 0.0.28

_Released: 2024-08-07T11:06:05Z_

### Patch Changes

- @sap-ux/project-access@1.26.4
- @sap-ux/system-access@0.5.5

## 0.0.27

_Released: 2024-08-07T08:31:04Z_

### Patch Changes

- @sap-ux/system-access@0.5.5

## 0.0.26

_Released: 2024-08-01T18:27:11Z_

### Patch Changes

- Updated dependencies [88c8bf6]
    - @sap-ux/project-access@1.26.3
    - @sap-ux/system-access@0.5.4

## 0.0.25

_Released: 2024-08-01T17:28:17Z_

### Patch Changes

- e69db46: Upgrade fast-xml-parser
- Updated dependencies [e69db46]
    - @sap-ux/project-access@1.26.2
    - @sap-ux/system-access@0.5.4

## 0.0.24

_Released: 2024-08-01T16:21:31Z_

### Patch Changes

- Updated dependencies [a986655]
    - @sap-ux/project-access@1.26.1
    - @sap-ux/system-access@0.5.3

## 0.0.23

_Released: 2024-08-01T14:53:05Z_

### Patch Changes

- Updated dependencies [518bf7e]
    - @sap-ux/project-access@1.26.0
    - @sap-ux/system-access@0.5.3

## 0.0.22

_Released: 2024-08-01T12:24:50Z_

### Patch Changes

- Updated dependencies [99b7b5f]
    - @sap-ux/project-access@1.25.8
    - @sap-ux/system-access@0.5.3

## 0.0.21

_Released: 2024-07-25T12:05:28Z_

### Patch Changes

- @sap-ux/system-access@0.5.3

## 0.0.20

_Released: 2024-07-23T09:01:05Z_

### Patch Changes

- Updated dependencies [d549173]
    - @sap-ux/project-access@1.25.7
    - @sap-ux/system-access@0.5.2

## 0.0.19

_Released: 2024-07-18T16:34:38Z_

### Patch Changes

- Updated dependencies [a9fac04]
    - @sap-ux/project-access@1.25.6
    - @sap-ux/system-access@0.5.2

## 0.0.18

_Released: 2024-07-18T09:34:40Z_

### Patch Changes

- @sap-ux/system-access@0.5.2

## 0.0.17

_Released: 2024-07-17T10:08:55Z_

### Patch Changes

- Updated dependencies [421f3ca]
    - @sap-ux/project-access@1.25.5
    - @sap-ux/system-access@0.5.1

## 0.0.16

_Released: 2024-07-12T15:28:30Z_

### Patch Changes

- Updated dependencies [173b5f2]
    - @sap-ux/project-access@1.25.4
    - @sap-ux/system-access@0.5.1

## 0.0.15

_Released: 2024-07-12T09:20:42Z_

### Patch Changes

- Updated dependencies [e7b9184]
    - @sap-ux/project-access@1.25.3
    - @sap-ux/system-access@0.5.1

## 0.0.14

_Released: 2024-07-12T08:50:08Z_

### Patch Changes

- Updated dependencies [22e4ad8]
    - @sap-ux/ui5-config@0.23.1
    - @sap-ux/project-access@1.25.2
    - @sap-ux/system-access@0.5.1

## 0.0.13

_Released: 2024-07-10T11:59:21Z_

### Patch Changes

- Updated dependencies [0f3cf6b]
    - @sap-ux/project-access@1.25.1
    - @sap-ux/system-access@0.5.1

## 0.0.12

_Released: 2024-07-09T12:14:56Z_

### Patch Changes

- Updated dependencies [f076dd3]
    - @sap-ux/project-access@1.25.0
    - @sap-ux/system-access@0.5.1

## 0.0.11

_Released: 2024-07-09T08:05:42Z_

### Patch Changes

- Updated dependencies [0ae685e]
    - @sap-ux/project-access@1.24.0
    - @sap-ux/system-access@0.5.1

## 0.0.10

_Released: 2024-07-05T16:16:30Z_

### Patch Changes

- @sap-ux/system-access@0.5.1

## 0.0.9

_Released: 2024-07-05T15:03:05Z_

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/btp-utils@0.15.0
    - @sap-ux/project-access@1.23.0
    - @sap-ux/system-access@0.5.0
    - @sap-ux/ui5-config@0.23.0

## 0.0.8

_Released: 2024-07-03T10:48:46Z_

### Patch Changes

- Updated dependencies [9ea58ad4]
    - @sap-ux/project-access@1.22.4
    - @sap-ux/system-access@0.4.7

## 0.0.7

_Released: 2024-07-01T14:53:05Z_

### Patch Changes

- @sap-ux/system-access@0.4.7

## 0.0.6

_Released: 2024-07-01T13:51:23Z_

### Patch Changes

- @sap-ux/system-access@0.4.6

## 0.0.5

_Released: 2024-06-27T07:14:34Z_

### Patch Changes

- @sap-ux/system-access@0.4.5

## 0.0.4

_Released: 2024-06-26T13:30:18Z_

### Patch Changes

- Updated dependencies [1a1baeb0]
    - @sap-ux/ui5-config@0.22.10
    - @sap-ux/project-access@1.22.3
    - @sap-ux/system-access@0.4.4

## 0.0.3

_Released: 2024-06-26T11:28:03Z_

### Patch Changes

- @sap-ux/system-access@0.4.4

## 0.0.2

_Released: 2024-06-26T10:58:33Z_

### Patch Changes

- @sap-ux/system-access@0.4.3

## 0.0.1

_Released: 2024-07-05T16:16:30Z_

### Patch Changes

- 399d2ad8: adds new abap deploy config writer
- Updated dependencies [399d2ad8]
    - @sap-ux/project-access@1.22.2
    - @sap-ux/ui5-config@0.22.9
    - @sap-ux/system-access@0.4.2
