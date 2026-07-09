# @sap-ux/project-integrity

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

## 0.3.2

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

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

## 0.2.74

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/project-access@1.36.5

## 0.2.73

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- Updated dependencies [21abda3]
    - @sap-ux/project-access@1.36.4

## 0.2.72

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

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

- @sap-ux/project-access@1.35.20

## 0.2.66

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

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

- a41533f: fix(project-integrity): fix ReadStream data event handler for @types/node 20.x (chunk type widened to `string | Buffer`)
- Updated dependencies [a41533f]
    - @sap-ux/project-access@1.35.16

## 0.2.62

_Released: 2026-03-25T12:56:41Z_

### Patch Changes

- Updated dependencies [f384ace]
    - @sap-ux/project-access@1.35.15

## 0.2.61

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

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

## 0.2.58

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- @sap-ux/project-access@1.35.11

## 0.2.57

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/project-access@1.35.10

## 0.2.56

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.9

## 0.2.55

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- Updated dependencies [0ecc5f1]
    - @sap-ux/project-access@1.35.8

## 0.2.54

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.7

## 0.2.53

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- Updated dependencies [bb310dc]
- Updated dependencies [e5bc3ca]
    - @sap-ux/project-access@1.35.6

## 0.2.52

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/project-access@1.35.5

## 0.2.51

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- @sap-ux/project-access@1.35.4

## 0.2.50

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- Updated dependencies [346f09c]
    - @sap-ux/project-access@1.35.3

## 0.2.49

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- Updated dependencies [d2b772d]
    - @sap-ux/project-access@1.35.2

## 0.2.48

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- @sap-ux/project-access@1.35.1

## 0.2.47

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/project-access@1.35.0

## 0.2.46

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- Updated dependencies [467e6aa]
    - @sap-ux/project-access@1.34.7

## 0.2.45

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- Updated dependencies [ad321ab]
    - @sap-ux/project-access@1.34.6

## 0.2.44

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [89175fe]
    - @sap-ux/project-access@1.34.5

## 0.2.43

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- @sap-ux/project-access@1.34.4

## 0.2.42

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- Updated dependencies [6d71400]
    - @sap-ux/project-access@1.34.3

## 0.2.41

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- Updated dependencies [be67fc4]
    - @sap-ux/project-access@1.34.2

## 0.2.40

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1

## 0.2.39

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0

## 0.2.38

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- Updated dependencies [f13d1c2]
    - @sap-ux/project-access@1.33.2

## 0.2.37

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- Updated dependencies [e111d0d]
    - @sap-ux/project-access@1.33.1

## 0.2.36

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/project-access@1.33.0

## 0.2.35

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/project-access@1.32.17

## 0.2.34

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/project-access@1.32.16

## 0.2.33

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- Updated dependencies [7217d7d]
    - @sap-ux/project-access@1.32.15

## 0.2.32

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- Updated dependencies [4bdced0]
    - @sap-ux/project-access@1.32.14

## 0.2.31

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- Updated dependencies [985223a]
    - @sap-ux/project-access@1.32.13

## 0.2.30

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- 037a430: fix high severity Sonar issues

## 0.2.29

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- Updated dependencies [45fe64e]
    - @sap-ux/project-access@1.32.12

## 0.2.28

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- Updated dependencies [07725fe]
    - @sap-ux/project-access@1.32.11

## 0.2.27

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- @sap-ux/project-access@1.32.10

## 0.2.26

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- Updated dependencies [7c09c8e]
- Updated dependencies [1c13c9c]
    - @sap-ux/project-access@1.32.9

## 0.2.25

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/project-access@1.32.8

## 0.2.24

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- Updated dependencies [d895232]
    - @sap-ux/project-access@1.32.7

## 0.2.23

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- Updated dependencies [ea0a942]
    - @sap-ux/project-access@1.32.6

## 0.2.22

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- Updated dependencies [c5d7915]
    - @sap-ux/project-access@1.32.5

## 0.2.21

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- @sap-ux/project-access@1.32.4

## 0.2.20

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/project-access@1.32.3

## 0.2.19

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- @sap-ux/project-access@1.32.2

## 0.2.18

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- @sap-ux/project-access@1.32.1

## 0.2.17

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- Updated dependencies [f9b4afe]
    - @sap-ux/project-access@1.32.0

## 0.2.16

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- Updated dependencies [c385a76]
    - @sap-ux/project-access@1.31.0

## 0.2.15

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- @sap-ux/project-access@1.30.14

## 0.2.14

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- @sap-ux/project-access@1.30.13

## 0.2.13

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- @sap-ux/project-access@1.30.12

## 0.2.12

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- @sap-ux/project-access@1.30.11

## 0.2.11

_Released: 2025-08-11T13:59:55Z_

### Patch Changes

- 944af3e: Update all UI5 OPA test runner HTML files to use relative resource paths instead of absolute paths

## 0.2.10

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

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

## 0.2.3

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.3

## 0.2.2

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- @sap-ux/project-access@1.30.2

## 0.2.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- @sap-ux/project-access@1.30.1

## 0.2.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/project-access@1.30.0

## 0.1.21

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- Updated dependencies [ea0e2c0]
    - @sap-ux/project-access@1.29.22

## 0.1.20

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- @sap-ux/project-access@1.29.21

## 0.1.19

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- Updated dependencies [294bbe3]
    - @sap-ux/project-access@1.29.20

## 0.1.18

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- @sap-ux/project-access@1.29.19

## 0.1.17

_Released: 2025-04-09T12:10:50Z_

### Patch Changes

- 3005a27: fix: make integrity check format free

## 0.1.16

_Released: 2025-03-19T08:54:25Z_

### Patch Changes

- Updated dependencies [c3ebc82]
    - @sap-ux/project-access@1.29.18

## 0.1.15

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- @sap-ux/project-access@1.29.17

## 0.1.14

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- @sap-ux/project-access@1.29.16

## 0.1.13

_Released: 2025-03-07T09:29:37Z_

### Patch Changes

- 5148043: Fix to ensure writing of encoded integrity data

## 0.1.12

_Released: 2025-03-06T16:16:20Z_

### Patch Changes

- Updated dependencies [1ce7fe9]
    - @sap-ux/project-access@1.29.15

## 0.1.11

_Released: 2025-03-05T11:16:53Z_

### Patch Changes

- Updated dependencies [3cc8f8a]
    - @sap-ux/project-access@1.29.14

## 0.1.10

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- @sap-ux/project-access@1.29.13

## 0.1.9

_Released: 2025-03-04T08:55:15Z_

### Patch Changes

- @sap-ux/project-access@1.29.12

## 0.1.8

_Released: 2025-02-28T15:10:48Z_

### Patch Changes

- Updated dependencies [0f35b4b]
    - @sap-ux/project-access@1.29.11

## 0.1.7

_Released: 2025-02-27T14:15:03Z_

### Patch Changes

- @sap-ux/project-access@1.29.10

## 0.1.6

_Released: 2025-02-27T08:22:17Z_

### Patch Changes

- Updated dependencies [c8c292c]
    - @sap-ux/project-access@1.29.9

## 0.1.5

_Released: 2025-02-17T13:42:22Z_

### Patch Changes

- Updated dependencies [c50e09f]
    - @sap-ux/project-access@1.29.8

## 0.1.4

_Released: 2025-02-13T10:58:34Z_

### Patch Changes

- Updated dependencies [2c0d657]
    - @sap-ux/project-access@1.29.7

## 0.1.3

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- @sap-ux/project-access@1.29.6

## 0.1.2

_Released: 2025-02-05T17:08:20Z_

### Patch Changes

- @sap-ux/project-access@1.29.5

## 0.1.1

_Released: 2025-02-04T15:39:07Z_

### Patch Changes

- Updated dependencies [29abc73]
    - @sap-ux/project-access@1.29.4

## 0.1.0

_Released: 2025-01-31T10:47:16Z_

### Minor Changes

- 42fd8f6: Add function to check if Fiori project integrity is initialized

## 0.0.7

_Released: 2025-01-30T10:04:50Z_

### Patch Changes

- Updated dependencies [096b021]
    - @sap-ux/project-access@1.29.3

## 0.0.6

_Released: 2025-01-28T09:20:06Z_

### Patch Changes

- Updated dependencies [93ef8c1]
    - @sap-ux/project-access@1.29.2

## 0.0.5

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- @sap-ux/project-access@1.29.1

## 0.0.4

_Released: 2025-01-16T21:27:08Z_

### Patch Changes

- cd2ee02: Cleanup test project

## 0.0.3

_Released: 2025-01-16T02:22:29Z_

### Patch Changes

- Updated dependencies [88bf030]
    - @sap-ux/project-access@1.29.0

## 0.0.2

### Patch Changes

- 2bf91ea: New module @sap-ux/project-integrity
