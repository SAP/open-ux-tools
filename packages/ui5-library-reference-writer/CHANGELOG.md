# @sap-ux/ui5-library-reference-writer

## 1.0.8

### Patch Changes

#### Dependency Updates

- Upgrade patch-level dependencies [[aed328d](https://github.com/SAP/open-ux-tools/commit/aed328da8a5c93e226c58e4d7dc14c7c82756259)]

#### Release Date

2026-06-25

#### Workspace Updates

- @sap-ux/ui5-config 1.0.3 → 1.0.3

## 1.0.7

### Patch Changes

#### Workspace Updates

- @sap-ux/project-access 2.1.2 → 2.1.3

## 1.0.6

_Released: 2026-06-10T09:57:42Z_

### Patch Changes

- Updated dependencies [c8e8f7e]
    - @sap-ux/ui5-config@1.0.3
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
    - @sap-ux/ui5-config@1.0.2

## 1.0.2

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- Updated dependencies [9580241]
    - @sap-ux/ui5-config@1.0.1
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
    - @sap-ux/ui5-config@1.0.0

## 0.3.2

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- Updated dependencies [9752c40]
    - @sap-ux/ui5-config@0.31.1
    - @sap-ux/project-access@1.38.1

## 0.3.1

_Released: 2026-05-19T15:16:46Z_

### Patch Changes

- Updated dependencies [63e6846]
    - @sap-ux/project-access@1.38.0

## 0.3.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/project-access@1.37.0
    - @sap-ux/ui5-config@0.31.0

## 0.2.74

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/project-access@1.36.5
    - @sap-ux/ui5-config@0.30.5

## 0.2.73

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- Updated dependencies [21abda3]
    - @sap-ux/project-access@1.36.4

## 0.2.72

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- Updated dependencies [678a08e]
    - @sap-ux/ui5-config@0.30.4
    - @sap-ux/project-access@1.36.3

## 0.2.71

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- @sap-ux/project-access@1.36.2

## 0.2.70

_Released: 2026-04-29T15:24:37Z_

### Patch Changes

- Updated dependencies [3945459]
    - @sap-ux/project-access@1.36.1

## 0.2.69

_Released: 2026-04-27T19:47:46Z_

### Patch Changes

- Updated dependencies [1d60871]
    - @sap-ux/project-access@1.36.0

## 0.2.68

_Released: 2026-04-23T12:54:21Z_

### Patch Changes

- Updated dependencies [03d3ea1]
    - @sap-ux/project-access@1.35.21

## 0.2.67

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- Updated dependencies [cc4450c]
    - @sap-ux/ui5-config@0.30.3
    - @sap-ux/project-access@1.35.20

## 0.2.66

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- Updated dependencies [f1e4481]
    - @sap-ux/ui5-config@0.30.2
    - @sap-ux/project-access@1.35.19

## 0.2.65

_Released: 2026-04-01T11:49:37Z_

### Patch Changes

- Updated dependencies [3291f6c]
    - @sap-ux/project-access@1.35.18

## 0.2.64

_Released: 2026-03-26T20:06:10Z_

### Patch Changes

- Updated dependencies [b66e827]
    - @sap-ux/project-access@1.35.17

## 0.2.63

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/project-access@1.35.16
    - @sap-ux/ui5-config@0.30.1

## 0.2.62

_Released: 2026-03-25T12:56:41Z_

### Patch Changes

- Updated dependencies [f384ace]
    - @sap-ux/project-access@1.35.15

## 0.2.61

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- Updated dependencies [25e5177]
    - @sap-ux/ui5-config@0.30.0
    - @sap-ux/project-access@1.35.14

## 0.2.60

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- Updated dependencies [d834713]
    - @sap-ux/project-access@1.35.13

## 0.2.59

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- Updated dependencies [7c06ef0]
    - @sap-ux/project-access@1.35.12
    - @sap-ux/ui5-config@0.29.21

## 0.2.58

_Released: 2026-03-05T10:41:09Z_

### Patch Changes

- 5aff25c: fix(deps): update dependency fs-extra to v11

## 0.2.57

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- ac58145: fix(deps): update dependency fs-extra to v10.1.0
    - @sap-ux/project-access@1.35.11
    - @sap-ux/ui5-config@0.29.20

## 0.2.56

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- Updated dependencies [c09b843]
    - @sap-ux/ui5-config@0.29.20
    - @sap-ux/project-access@1.35.11

## 0.2.55

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/project-access@1.35.10

## 0.2.54

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.9

## 0.2.53

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- Updated dependencies [0ecc5f1]
    - @sap-ux/project-access@1.35.8

## 0.2.52

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- Updated dependencies [d92cd35]
    - @sap-ux/ui5-config@0.29.19
    - @sap-ux/project-access@1.35.7

## 0.2.51

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- Updated dependencies [bb310dc]
- Updated dependencies [e5bc3ca]
    - @sap-ux/project-access@1.35.6
    - @sap-ux/ui5-config@0.29.18

## 0.2.50

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/project-access@1.35.5

## 0.2.49

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- Updated dependencies [e7f58d7]
    - @sap-ux/ui5-config@0.29.17
    - @sap-ux/project-access@1.35.4

## 0.2.48

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- Updated dependencies [346f09c]
    - @sap-ux/project-access@1.35.3

## 0.2.47

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- Updated dependencies [d2b772d]
    - @sap-ux/project-access@1.35.2

## 0.2.46

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/ui5-config@0.29.16
    - @sap-ux/project-access@1.35.1

## 0.2.45

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/project-access@1.35.0

## 0.2.44

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- Updated dependencies [467e6aa]
    - @sap-ux/project-access@1.34.7

## 0.2.43

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- Updated dependencies [ad321ab]
    - @sap-ux/project-access@1.34.6
    - @sap-ux/ui5-config@0.29.15

## 0.2.42

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [89175fe]
    - @sap-ux/project-access@1.34.5

## 0.2.41

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- Updated dependencies [ea7a16c]
    - @sap-ux/ui5-config@0.29.14
    - @sap-ux/project-access@1.34.4

## 0.2.40

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- Updated dependencies [6d71400]
    - @sap-ux/project-access@1.34.3

## 0.2.39

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- Updated dependencies [be67fc4]
- Updated dependencies [be67fc4]
    - @sap-ux/ui5-config@0.29.13
    - @sap-ux/project-access@1.34.2

## 0.2.38

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1

## 0.2.37

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0

## 0.2.36

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- Updated dependencies [f13d1c2]
    - @sap-ux/project-access@1.33.2

## 0.2.35

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/project-access@1.33.1

## 0.2.34

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/project-access@1.33.0
    - @sap-ux/ui5-config@0.29.12

## 0.2.33

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- Updated dependencies [a9471d0]
    - @sap-ux/project-access@1.32.17
    - @sap-ux/ui5-config@0.29.12

## 0.2.32

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/project-access@1.32.16
    - @sap-ux/ui5-config@0.29.11

## 0.2.31

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- Updated dependencies [7217d7d]
    - @sap-ux/project-access@1.32.15

## 0.2.30

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- Updated dependencies [4bdced0]
    - @sap-ux/project-access@1.32.14

## 0.2.29

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- Updated dependencies [985223a]
    - @sap-ux/project-access@1.32.13

## 0.2.28

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- Updated dependencies [45fe64e]
    - @sap-ux/project-access@1.32.12

## 0.2.27

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- Updated dependencies [07725fe]
    - @sap-ux/project-access@1.32.11

## 0.2.26

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- Updated dependencies [5d0598d]
    - @sap-ux/ui5-config@0.29.10
    - @sap-ux/project-access@1.32.10

## 0.2.25

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- Updated dependencies [7c09c8e]
- Updated dependencies [1c13c9c]
    - @sap-ux/project-access@1.32.9

## 0.2.24

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/project-access@1.32.8
    - @sap-ux/ui5-config@0.29.9

## 0.2.23

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- Updated dependencies [d895232]
    - @sap-ux/project-access@1.32.7

## 0.2.22

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- Updated dependencies [ea0a942]
    - @sap-ux/project-access@1.32.6

## 0.2.21

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- Updated dependencies [c5d7915]
    - @sap-ux/project-access@1.32.5

## 0.2.20

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- Updated dependencies [9e94382]
    - @sap-ux/ui5-config@0.29.8
    - @sap-ux/project-access@1.32.4

## 0.2.19

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/project-access@1.32.3
    - @sap-ux/ui5-config@0.29.7

## 0.2.18

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- Updated dependencies [d866995]
    - @sap-ux/ui5-config@0.29.6
    - @sap-ux/project-access@1.32.2

## 0.2.17

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- Updated dependencies [9872384]
    - @sap-ux/ui5-config@0.29.5
    - @sap-ux/project-access@1.32.1

## 0.2.16

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- Updated dependencies [f9b4afe]
    - @sap-ux/project-access@1.32.0

## 0.2.15

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- Updated dependencies [c385a76]
    - @sap-ux/project-access@1.31.0

## 0.2.14

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- Updated dependencies [8ccc4da]
    - @sap-ux/ui5-config@0.29.4
    - @sap-ux/project-access@1.30.14

## 0.2.13

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- Updated dependencies [4cfebaf]
    - @sap-ux/ui5-config@0.29.3
    - @sap-ux/project-access@1.30.13

## 0.2.12

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- Updated dependencies [178dbea]
    - @sap-ux/ui5-config@0.29.2
    - @sap-ux/project-access@1.30.12

## 0.2.11

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/project-access@1.30.11

## 0.2.10

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- Updated dependencies [43bc887]
    - @sap-ux/ui5-config@0.29.1
    - @sap-ux/project-access@1.30.10

## 0.2.9

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.9

## 0.2.8

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- Updated dependencies [4e0bd83]
    - @sap-ux/project-access@1.30.8

## 0.2.7

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- Updated dependencies [58cdce6]
    - @sap-ux/project-access@1.30.7

## 0.2.6

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- Updated dependencies [c0fa1d1]
    - @sap-ux/ui5-config@0.29.0
    - @sap-ux/project-access@1.30.6

## 0.2.5

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- Updated dependencies [7a4543e]
    - @sap-ux/project-access@1.30.5

## 0.2.4

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- Updated dependencies [f75b89d]
    - @sap-ux/project-access@1.30.4
    - @sap-ux/ui5-config@0.28.3

## 0.2.3

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.3

## 0.2.2

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- Updated dependencies [61ea5c0]
    - @sap-ux/ui5-config@0.28.2
    - @sap-ux/project-access@1.30.2

## 0.2.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- Updated dependencies [5e0020b]
    - @sap-ux/ui5-config@0.28.1
    - @sap-ux/project-access@1.30.1

## 0.2.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/project-access@1.30.0
    - @sap-ux/ui5-config@0.28.0

## 0.1.61

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- Updated dependencies [ea0e2c0]
    - @sap-ux/project-access@1.29.22

## 0.1.60

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- Updated dependencies [7590bc3]
    - @sap-ux/ui5-config@0.27.2
    - @sap-ux/project-access@1.29.21

## 0.1.59

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- Updated dependencies [294bbe3]
    - @sap-ux/project-access@1.29.20
    - @sap-ux/ui5-config@0.27.1

## 0.1.58

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- Updated dependencies [1ca4004]
    - @sap-ux/ui5-config@0.27.0
    - @sap-ux/project-access@1.29.19

## 0.1.57

_Released: 2025-03-19T08:54:25Z_

### Patch Changes

- Updated dependencies [c3ebc82]
    - @sap-ux/project-access@1.29.18

## 0.1.56

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- Updated dependencies [224494c]
    - @sap-ux/ui5-config@0.26.5
    - @sap-ux/project-access@1.29.17

## 0.1.55

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- Updated dependencies [011c8c5]
    - @sap-ux/ui5-config@0.26.4
    - @sap-ux/project-access@1.29.16

## 0.1.54

_Released: 2025-03-06T16:16:20Z_

### Patch Changes

- Updated dependencies [1ce7fe9]
    - @sap-ux/project-access@1.29.15

## 0.1.53

_Released: 2025-03-05T11:16:53Z_

### Patch Changes

- Updated dependencies [3cc8f8a]
    - @sap-ux/project-access@1.29.14

## 0.1.52

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- Updated dependencies [5817923]
    - @sap-ux/ui5-config@0.26.3
    - @sap-ux/project-access@1.29.13

## 0.1.51

_Released: 2025-03-04T08:55:15Z_

### Patch Changes

- @sap-ux/project-access@1.29.12

## 0.1.50

_Released: 2025-02-28T15:10:48Z_

### Patch Changes

- Updated dependencies [0f35b4b]
    - @sap-ux/project-access@1.29.11

## 0.1.49

_Released: 2025-02-27T14:15:03Z_

### Patch Changes

- @sap-ux/project-access@1.29.10

## 0.1.48

_Released: 2025-02-27T08:22:17Z_

### Patch Changes

- Updated dependencies [c8c292c]
    - @sap-ux/project-access@1.29.9

## 0.1.47

_Released: 2025-02-17T13:42:22Z_

### Patch Changes

- Updated dependencies [c50e09f]
    - @sap-ux/project-access@1.29.8

## 0.1.46

_Released: 2025-02-13T10:58:34Z_

### Patch Changes

- Updated dependencies [2c0d657]
    - @sap-ux/project-access@1.29.7

## 0.1.45

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- Updated dependencies [ed8a9b9]
    - @sap-ux/ui5-config@0.26.2
    - @sap-ux/project-access@1.29.6

## 0.1.44

_Released: 2025-02-05T17:08:20Z_

### Patch Changes

- @sap-ux/project-access@1.29.5

## 0.1.43

_Released: 2025-02-04T15:39:07Z_

### Patch Changes

- Updated dependencies [29abc73]
    - @sap-ux/project-access@1.29.4

## 0.1.42

_Released: 2025-01-30T10:04:50Z_

### Patch Changes

- Updated dependencies [096b021]
    - @sap-ux/project-access@1.29.3

## 0.1.41

_Released: 2025-01-28T09:20:06Z_

### Patch Changes

- Updated dependencies [93ef8c1]
    - @sap-ux/project-access@1.29.2

## 0.1.40

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- Updated dependencies [19aad96]
    - @sap-ux/ui5-config@0.26.1
    - @sap-ux/project-access@1.29.1

## 0.1.39

_Released: 2025-01-16T02:22:29Z_

### Patch Changes

- Updated dependencies [88bf030]
    - @sap-ux/project-access@1.29.0

## 0.1.38

_Released: 2024-12-17T15:31:53Z_

### Patch Changes

- Updated dependencies [e1edcd7]
    - @sap-ux/project-access@1.28.10

## 0.1.37

_Released: 2024-12-06T21:07:01Z_

### Patch Changes

- Updated dependencies [e93797a]
    - @sap-ux/project-access@1.28.9

## 0.1.36

_Released: 2024-12-02T16:28:38Z_

### Patch Changes

- Updated dependencies [73475e5]
    - @sap-ux/ui5-config@0.26.0
    - @sap-ux/project-access@1.28.8

## 0.1.35

_Released: 2024-11-18T20:38:37Z_

### Patch Changes

- Updated dependencies [1beac7e]
    - @sap-ux/ui5-config@0.25.2
    - @sap-ux/project-access@1.28.7

## 0.1.34

_Released: 2024-11-08T08:58:34Z_

### Patch Changes

- Updated dependencies [fb26f92]
    - @sap-ux/project-access@1.28.6

## 0.1.33

_Released: 2024-11-05T21:46:19Z_

### Patch Changes

- Updated dependencies [6275288]
    - @sap-ux/ui5-config@0.25.1
    - @sap-ux/project-access@1.28.5

## 0.1.32

_Released: 2024-11-05T13:50:29Z_

### Patch Changes

- Updated dependencies [5a68903]
    - @sap-ux/project-access@1.28.4

## 0.1.31

_Released: 2024-10-31T07:40:48Z_

### Patch Changes

- Updated dependencies [42f13eb]
    - @sap-ux/project-access@1.28.3

## 0.1.30

_Released: 2024-10-16T08:21:13Z_

### Patch Changes

- Updated dependencies [eb38e5b]
    - @sap-ux/project-access@1.28.2

## 0.1.29

_Released: 2024-10-14T21:48:37Z_

### Patch Changes

- Updated dependencies [64e037d]
    - @sap-ux/project-access@1.28.1

## 0.1.28

_Released: 2024-10-14T16:41:16Z_

### Patch Changes

- Updated dependencies [15e6959]
    - @sap-ux/project-access@1.28.0

## 0.1.27

_Released: 2024-10-08T10:16:01Z_

### Patch Changes

- Updated dependencies [eb74890]
    - @sap-ux/project-access@1.27.6

## 0.1.26

_Released: 2024-10-02T14:28:15Z_

### Patch Changes

- Updated dependencies [a64a3a5]
    - @sap-ux/project-access@1.27.5

## 0.1.25

_Released: 2024-09-23T10:02:33Z_

### Patch Changes

- Updated dependencies [484195d]
    - @sap-ux/ui5-config@0.25.0
    - @sap-ux/project-access@1.27.4

## 0.1.24

_Released: 2024-09-18T14:01:49Z_

### Patch Changes

- Updated dependencies [070182d]
    - @sap-ux/project-access@1.27.3

## 0.1.23

_Released: 2024-09-12T09:42:45Z_

### Patch Changes

- Updated dependencies [09522df]
    - @sap-ux/project-access@1.27.2

## 0.1.22

_Released: 2024-09-03T19:06:21Z_

### Patch Changes

- Updated dependencies [d962ce1]
    - @sap-ux/project-access@1.27.1

## 0.1.21

_Released: 2024-08-30T06:05:30Z_

### Patch Changes

- Updated dependencies [df29368]
    - @sap-ux/project-access@1.27.0

## 0.1.20

_Released: 2024-08-28T11:16:50Z_

### Patch Changes

- Updated dependencies [1a99abc]
    - @sap-ux/ui5-config@0.24.1
    - @sap-ux/project-access@1.26.9

## 0.1.19

_Released: 2024-08-20T10:06:29Z_

### Patch Changes

- Updated dependencies [df6262e]
    - @sap-ux/project-access@1.26.8

## 0.1.18

_Released: 2024-08-19T11:34:45Z_

### Patch Changes

- Updated dependencies [61721f2]
    - @sap-ux/ui5-config@0.24.0
    - @sap-ux/project-access@1.26.7

## 0.1.17

_Released: 2024-08-12T10:50:52Z_

### Patch Changes

- Updated dependencies [82aaea3]
    - @sap-ux/project-access@1.26.6

## 0.1.16

_Released: 2024-08-08T07:33:51Z_

### Patch Changes

- Updated dependencies [cc16cbb]
    - @sap-ux/project-access@1.26.5

## 0.1.15

_Released: 2024-08-07T11:06:05Z_

### Patch Changes

- @sap-ux/project-access@1.26.4

## 0.1.14

_Released: 2024-08-01T18:27:11Z_

### Patch Changes

- Updated dependencies [88c8bf6]
    - @sap-ux/project-access@1.26.3

## 0.1.13

_Released: 2024-08-01T17:28:17Z_

### Patch Changes

- e69db46: Upgrade fast-xml-parser
- Updated dependencies [e69db46]
    - @sap-ux/project-access@1.26.2

## 0.1.12

_Released: 2024-08-01T16:21:31Z_

### Patch Changes

- Updated dependencies [a986655]
    - @sap-ux/project-access@1.26.1

## 0.1.11

_Released: 2024-08-01T14:53:05Z_

### Patch Changes

- Updated dependencies [518bf7e]
    - @sap-ux/project-access@1.26.0

## 0.1.10

_Released: 2024-08-01T12:24:50Z_

### Patch Changes

- Updated dependencies [99b7b5f]
    - @sap-ux/project-access@1.25.8

## 0.1.9

_Released: 2024-07-23T09:01:05Z_

### Patch Changes

- Updated dependencies [d549173]
    - @sap-ux/project-access@1.25.7

## 0.1.8

_Released: 2024-07-18T16:34:38Z_

### Patch Changes

- Updated dependencies [a9fac04]
    - @sap-ux/project-access@1.25.6

## 0.1.7

_Released: 2024-07-17T10:08:55Z_

### Patch Changes

- Updated dependencies [421f3ca]
    - @sap-ux/project-access@1.25.5

## 0.1.6

_Released: 2024-07-12T15:28:30Z_

### Patch Changes

- Updated dependencies [173b5f2]
    - @sap-ux/project-access@1.25.4

## 0.1.5

_Released: 2024-07-12T09:20:42Z_

### Patch Changes

- Updated dependencies [e7b9184]
    - @sap-ux/project-access@1.25.3

## 0.1.4

_Released: 2024-07-12T08:50:08Z_

### Patch Changes

- Updated dependencies [22e4ad8]
    - @sap-ux/ui5-config@0.23.1
    - @sap-ux/project-access@1.25.2

## 0.1.3

_Released: 2024-07-10T11:59:21Z_

### Patch Changes

- Updated dependencies [0f3cf6b]
    - @sap-ux/project-access@1.25.1

## 0.1.2

_Released: 2024-07-09T12:14:56Z_

### Patch Changes

- Updated dependencies [f076dd3]
    - @sap-ux/project-access@1.25.0

## 0.1.1

_Released: 2024-07-09T08:05:42Z_

### Patch Changes

- Updated dependencies [0ae685e]
    - @sap-ux/project-access@1.24.0

## 0.1.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/project-access@1.23.0
    - @sap-ux/ui5-config@0.23.0

## 0.0.24

_Released: 2024-07-03T10:48:46Z_

### Patch Changes

- Updated dependencies [9ea58ad4]
    - @sap-ux/project-access@1.22.4

## 0.0.23

_Released: 2024-06-26T13:30:18Z_

### Patch Changes

- Updated dependencies [1a1baeb0]
    - @sap-ux/ui5-config@0.22.10
    - @sap-ux/project-access@1.22.3

## 0.0.22

_Released: 2024-06-25T14:41:22Z_

### Patch Changes

- Updated dependencies [399d2ad8]
    - @sap-ux/project-access@1.22.2
    - @sap-ux/ui5-config@0.22.9

## 0.0.21

_Released: 2024-06-18T15:06:09Z_

### Patch Changes

- Updated dependencies [a140cf8b]
    - @sap-ux/ui5-config@0.22.8
    - @sap-ux/project-access@1.22.1

## 0.0.20

_Released: 2024-06-13T16:04:23Z_

### Patch Changes

- Updated dependencies [ad93a484]
    - @sap-ux/project-access@1.22.0

## 0.0.19

_Released: 2024-06-12T15:20:44Z_

### Patch Changes

- Updated dependencies [9188fe8b]
    - @sap-ux/ui5-config@0.22.7
    - @sap-ux/project-access@1.21.2

## 0.0.18

_Released: 2024-06-07T14:16:07Z_

### Patch Changes

- @sap-ux/ui5-config@0.22.6
- @sap-ux/project-access@1.21.1

## 0.0.17

_Released: 2024-06-04T12:43:36Z_

### Patch Changes

- Updated dependencies [69b8d6de]
    - @sap-ux/project-access@1.21.0

## 0.0.16

_Released: 2024-06-04T12:14:54Z_

### Patch Changes

- Updated dependencies [a7d78229]
    - @sap-ux/project-access@1.20.4

## 0.0.15

_Released: 2024-05-31T13:42:35Z_

### Patch Changes

- @sap-ux/project-access@1.20.3

## 0.0.14

_Released: 2024-05-29T14:07:16Z_

### Patch Changes

- Updated dependencies [54c91c6d]
    - @sap-ux/project-access@1.20.2

## 0.0.13

_Released: 2024-05-27T13:04:53Z_

### Patch Changes

- Updated dependencies [3684195d]
    - @sap-ux/ui5-config@0.22.5
    - @sap-ux/project-access@1.20.1

## 0.0.12

_Released: 2024-05-14T08:36:35Z_

### Patch Changes

- Updated dependencies [e3d2324c]
    - @sap-ux/project-access@1.20.0
    - @sap-ux/ui5-config@0.22.4

## 0.0.11

_Released: 2024-05-02T14:43:18Z_

### Patch Changes

- Updated dependencies [7f8105c7]
    - @sap-ux/ui5-config@0.22.3
    - @sap-ux/project-access@1.19.14

## 0.0.10

_Released: 2024-04-26T19:12:20Z_

### Patch Changes

- Updated dependencies [99bca62c]
    - @sap-ux/project-access@1.19.13

## 0.0.9

_Released: 2024-04-23T22:35:35Z_

### Patch Changes

- b7d95fb3: fix paths and config writers
- Updated dependencies [b7d95fb3]
    - @sap-ux/project-access@1.19.12
    - @sap-ux/ui5-config@0.22.2

## 0.0.8

_Released: 2024-04-23T07:22:50Z_

### Patch Changes

- Updated dependencies [4389c528]
    - @sap-ux/project-access@1.19.11

## 0.0.7

_Released: 2024-04-18T07:12:06Z_

### Patch Changes

- Updated dependencies [f8e16120]
    - @sap-ux/project-access@1.19.10

## 0.0.6

_Released: 2024-04-17T07:44:37Z_

### Patch Changes

- Updated dependencies [ee76e47f]
    - @sap-ux/project-access@1.19.9

## 0.0.5

_Released: 2024-04-15T19:27:29Z_

### Patch Changes

- @sap-ux/project-access@1.19.8

## 0.0.4

_Released: 2024-04-15T16:20:25Z_

### Patch Changes

- Updated dependencies [98496d57]
- Updated dependencies [e3d2e003]
    - @sap-ux/project-access@1.19.7

## 0.0.3

_Released: 2024-04-04T14:37:58Z_

### Patch Changes

- Updated dependencies [f0e3263a]
    - @sap-ux/project-access@1.19.6

## 0.0.2

_Released: 2024-06-13T16:04:23Z_

### Patch Changes

- efa35ddd: adds new module @sap-ux/ui5-library-reference-writer
- Updated dependencies [efa35ddd]
    - @sap-ux/ui5-config@0.22.1
    - @sap-ux/project-access@1.19.5
