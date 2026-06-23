# @sap-ux/annotation-generator

## 1.0.9

### Patch Changes

#### Release Date

2026-06-23

#### Workspace Updates

- @sap-ux/fiori-annotation-api 1.0.8 → 1.0.9

## 1.0.8

_Released: 2026-06-11T07:16:28Z_

### Patch Changes

- Updated dependencies [3443820]
    - @sap-ux/fiori-annotation-api@1.0.8

## 1.0.7

_Released: 2026-06-10T09:57:42Z_

### Patch Changes

- @sap-ux/project-access@2.1.2
- @sap-ux/fiori-annotation-api@1.0.7

## 1.0.6

_Released: 2026-06-09T19:59:54Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@1.0.6

## 1.0.5

_Released: 2026-06-04T13:54:21Z_

### Patch Changes

- Updated dependencies [fff7490]
    - @sap-ux/project-access@2.1.1
    - @sap-ux/fiori-annotation-api@1.0.5

## 1.0.4

_Released: 2026-06-04T10:19:37Z_

### Patch Changes

- Updated dependencies [b326a9a]
    - @sap-ux/project-access@2.1.0
    - @sap-ux/fiori-annotation-api@1.0.4

## 1.0.3

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/odata-annotation-core-types@1.0.1
    - @sap-ux/fiori-annotation-api@1.0.3
    - @sap-ux/odata-entity-model@1.0.1
    - @sap-ux/project-access@2.0.3

## 1.0.2

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- @sap-ux/project-access@2.0.2
- @sap-ux/fiori-annotation-api@1.0.2

## 1.0.1

_Released: 2026-06-01T15:15:26Z_

### Patch Changes

- Updated dependencies [aed799d]
    - @sap-ux/project-access@2.0.1
    - @sap-ux/fiori-annotation-api@1.0.1

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
    - @sap-ux/odata-annotation-core-types@1.0.0
    - @sap-ux/fiori-annotation-api@1.0.0
    - @sap-ux/odata-entity-model@1.0.0
    - @sap-ux/project-access@2.0.0

## 0.5.3

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- @sap-ux/project-access@1.38.1
- @sap-ux/fiori-annotation-api@0.11.1

## 0.5.2

_Released: 2026-05-20T13:39:22Z_

### Patch Changes

- Updated dependencies [2f1ece0]
- Updated dependencies [2f1ece0]
    - @sap-ux/fiori-annotation-api@0.11.0
    - @sap-ux/odata-annotation-core-types@0.6.1
    - @sap-ux/odata-entity-model@0.4.0

## 0.5.1

_Released: 2026-05-19T15:16:46Z_

### Patch Changes

- Updated dependencies [63e6846]
    - @sap-ux/project-access@1.38.0
    - @sap-ux/fiori-annotation-api@0.10.1

## 0.5.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/fiori-annotation-api@0.10.0
    - @sap-ux/odata-annotation-core-types@0.6.0
    - @sap-ux/odata-entity-model@0.4.0
    - @sap-ux/project-access@1.37.0

## 0.4.57

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/fiori-annotation-api@0.9.50
    - @sap-ux/odata-annotation-core-types@0.5.9
    - @sap-ux/odata-entity-model@0.3.8
    - @sap-ux/project-access@1.36.5

## 0.4.56

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- Updated dependencies [21abda3]
    - @sap-ux/project-access@1.36.4
    - @sap-ux/fiori-annotation-api@0.9.49

## 0.4.55

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- @sap-ux/project-access@1.36.3
- @sap-ux/fiori-annotation-api@0.9.48

## 0.4.54

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- Updated dependencies [c160401]
    - @sap-ux/fiori-annotation-api@0.9.47
    - @sap-ux/odata-annotation-core-types@0.5.8
    - @sap-ux/project-access@1.36.2
    - @sap-ux/odata-entity-model@0.3.7

## 0.4.53

_Released: 2026-04-29T15:24:37Z_

### Patch Changes

- Updated dependencies [3945459]
    - @sap-ux/project-access@1.36.1
    - @sap-ux/fiori-annotation-api@0.9.46

## 0.4.52

_Released: 2026-04-27T19:47:46Z_

### Patch Changes

- Updated dependencies [1d60871]
    - @sap-ux/project-access@1.36.0
    - @sap-ux/fiori-annotation-api@0.9.45

## 0.4.51

_Released: 2026-04-24T09:57:47Z_

### Patch Changes

- Updated dependencies [52f6549]
    - @sap-ux/fiori-annotation-api@0.9.44

## 0.4.50

_Released: 2026-04-23T12:54:21Z_

### Patch Changes

- Updated dependencies [03d3ea1]
    - @sap-ux/project-access@1.35.21
    - @sap-ux/fiori-annotation-api@0.9.43

## 0.4.49

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- @sap-ux/project-access@1.35.20
- @sap-ux/fiori-annotation-api@0.9.42

## 0.4.48

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.41
- @sap-ux/project-access@1.35.19

## 0.4.47

_Released: 2026-04-01T11:49:37Z_

### Patch Changes

- Updated dependencies [3291f6c]
    - @sap-ux/project-access@1.35.18
    - @sap-ux/fiori-annotation-api@0.9.40

## 0.4.46

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.39
- @sap-ux/project-access@1.35.17

## 0.4.45

_Released: 2026-03-26T20:06:10Z_

### Patch Changes

- Updated dependencies [b66e827]
    - @sap-ux/project-access@1.35.17
    - @sap-ux/fiori-annotation-api@0.9.38

## 0.4.44

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/fiori-annotation-api@0.9.37
    - @sap-ux/project-access@1.35.16

## 0.4.43

_Released: 2026-03-25T12:56:41Z_

### Patch Changes

- Updated dependencies [f384ace]
    - @sap-ux/project-access@1.35.15
    - @sap-ux/fiori-annotation-api@0.9.36

## 0.4.42

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- @sap-ux/project-access@1.35.14
- @sap-ux/fiori-annotation-api@0.9.35

## 0.4.41

_Released: 2026-03-18T14:50:43Z_

### Patch Changes

- Updated dependencies [436cad8]
    - @sap-ux/fiori-annotation-api@0.9.34

## 0.4.40

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.33

## 0.4.39

_Released: 2026-03-16T17:06:45Z_

### Patch Changes

- Updated dependencies [dfa433e]
    - @sap-ux/odata-annotation-core-types@0.5.7
    - @sap-ux/fiori-annotation-api@0.9.32
    - @sap-ux/odata-entity-model@0.3.7

## 0.4.38

_Released: 2026-03-11T16:49:00Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.31

## 0.4.37

_Released: 2026-03-10T07:46:29Z_

### Patch Changes

- Updated dependencies [e1ef0ba]
    - @sap-ux/fiori-annotation-api@0.9.30

## 0.4.36

_Released: 2026-03-05T16:08:22Z_

### Patch Changes

- Updated dependencies [d834713]
    - @sap-ux/project-access@1.35.13
    - @sap-ux/fiori-annotation-api@0.9.29

## 0.4.35

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- 7c06ef0: fix(deps): update dependencies [open-ux-odata]
- Updated dependencies [7c06ef0]
    - @sap-ux/fiori-annotation-api@0.9.28
    - @sap-ux/project-access@1.35.12

## 0.4.34

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.27
- @sap-ux/project-access@1.35.11

## 0.4.33

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- @sap-ux/project-access@1.35.11
- @sap-ux/fiori-annotation-api@0.9.26

## 0.4.32

_Released: 2026-03-04T09:03:38Z_

### Patch Changes

- Updated dependencies [a2cbf4e]
    - @sap-ux/odata-annotation-core-types@0.5.6
    - @sap-ux/fiori-annotation-api@0.9.25
    - @sap-ux/odata-entity-model@0.3.6

## 0.4.31

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- Updated dependencies [ca2566b]
    - @sap-ux/project-access@1.35.10
    - @sap-ux/fiori-annotation-api@0.9.24

## 0.4.30

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.23

## 0.4.29

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.9
- @sap-ux/fiori-annotation-api@0.9.22

## 0.4.28

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- cc1c422: fix(deps): update dependency npm-run-all2 to v8
- Updated dependencies [0ecc5f1]
- Updated dependencies [cc1c422]
    - @sap-ux/project-access@1.35.8
    - @sap-ux/fiori-annotation-api@0.9.21
    - @sap-ux/odata-annotation-core-types@0.5.5
    - @sap-ux/odata-entity-model@0.3.6

## 0.4.27

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- @sap-ux/project-access@1.35.7
- @sap-ux/fiori-annotation-api@0.9.20

## 0.4.26

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.19

## 0.4.25

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- Updated dependencies [bb310dc]
- Updated dependencies [e5bc3ca]
    - @sap-ux/project-access@1.35.6
    - @sap-ux/fiori-annotation-api@0.9.18

## 0.4.24

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- Updated dependencies [d57cc47]
    - @sap-ux/project-access@1.35.5
    - @sap-ux/fiori-annotation-api@0.9.17

## 0.4.23

_Released: 2026-02-17T01:38:30Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.16

## 0.4.22

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- @sap-ux/project-access@1.35.4
- @sap-ux/fiori-annotation-api@0.9.15

## 0.4.21

_Released: 2026-02-13T09:54:38Z_

### Patch Changes

- Updated dependencies [346f09c]
    - @sap-ux/project-access@1.35.3
    - @sap-ux/fiori-annotation-api@0.9.14

## 0.4.20

_Released: 2026-02-12T10:29:41Z_

### Patch Changes

- Updated dependencies [d2b772d]
    - @sap-ux/project-access@1.35.2
    - @sap-ux/fiori-annotation-api@0.9.13

## 0.4.19

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.12
- @sap-ux/project-access@1.35.1

## 0.4.18

_Released: 2026-02-10T21:03:43Z_

### Patch Changes

- 3795bb2: Add Node.js engine requirement (>=20.x)
- Updated dependencies [3795bb2]
    - @sap-ux/odata-annotation-core-types@0.5.4
    - @sap-ux/fiori-annotation-api@0.9.11
    - @sap-ux/odata-entity-model@0.3.5

## 0.4.17

_Released: 2026-02-09T11:21:43Z_

### Patch Changes

- Updated dependencies [a5ecd7f]
    - @sap-ux/project-access@1.35.0
    - @sap-ux/fiori-annotation-api@0.9.10

## 0.4.16

_Released: 2026-02-05T20:09:45Z_

### Patch Changes

- Updated dependencies [467e6aa]
    - @sap-ux/project-access@1.34.7
    - @sap-ux/fiori-annotation-api@0.9.9

## 0.4.15

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- Updated dependencies [ad321ab]
    - @sap-ux/project-access@1.34.6
    - @sap-ux/fiori-annotation-api@0.9.8

## 0.4.14

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- Updated dependencies [89175fe]
    - @sap-ux/project-access@1.34.5
    - @sap-ux/fiori-annotation-api@0.9.7

## 0.4.13

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.6
- @sap-ux/project-access@1.34.4

## 0.4.12

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- Updated dependencies [6d71400]
    - @sap-ux/odata-annotation-core-types@0.5.3
    - @sap-ux/fiori-annotation-api@0.9.5
    - @sap-ux/project-access@1.34.3
    - @sap-ux/odata-entity-model@0.3.4

## 0.4.11

_Released: 2026-01-23T22:30:10Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.4

## 0.4.10

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- Updated dependencies [be67fc4]
    - @sap-ux/project-access@1.34.2
    - @sap-ux/fiori-annotation-api@0.9.3

## 0.4.9

_Released: 2026-01-15T14:14:39Z_

### Patch Changes

- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1
    - @sap-ux/fiori-annotation-api@0.9.2

## 0.4.8

_Released: 2026-01-15T12:16:35Z_

### Patch Changes

- Updated dependencies [4d6695f]
    - @sap-ux/fiori-annotation-api@0.9.1

## 0.4.7

_Released: 2026-01-14T17:56:49Z_

### Patch Changes

- Updated dependencies [b132944]
- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0
    - @sap-ux/fiori-annotation-api@0.9.0

## 0.4.6

_Released: 2026-01-12T12:01:34Z_

### Patch Changes

- Updated dependencies [f13d1c2]
    - @sap-ux/project-access@1.33.2
    - @sap-ux/fiori-annotation-api@0.8.6

## 0.4.5

_Released: 2026-01-12T09:10:27Z_

### Patch Changes

- Updated dependencies [d667a5e]
    - @sap-ux/odata-entity-model@0.3.4
    - @sap-ux/fiori-annotation-api@0.8.5

## 0.4.4

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- e111d0d: fix sonar issues
- Updated dependencies [e111d0d]
    - @sap-ux/fiori-annotation-api@0.8.4
    - @sap-ux/project-access@1.33.1

## 0.4.3

_Released: 2026-01-08T17:12:17Z_

### Patch Changes

- 2204ad3: fix(deps): update dependencies @sap-ux/annotation-converter to v0.10.19 and @sap-ux/vocabularies-types to v0.14.5
- Updated dependencies [2204ad3]
    - @sap-ux/fiori-annotation-api@0.8.3

## 0.4.2

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/project-access@1.33.0
    - @sap-ux/fiori-annotation-api@0.8.2

## 0.4.1

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/fiori-annotation-api@0.8.1
    - @sap-ux/project-access@1.32.17

## 0.4.0

_Released: 2025-12-18T08:56:52Z_

### Minor Changes

- 5287327: Updated @sap-ux/annotation-converter to version 0.10.9 and @sap-ux/vocabularies-types to version 0.13.2 across multiple packages. These changes ensure that the latest versions with potential fixes and enhancements are used.

### Patch Changes

- Updated dependencies [5287327]
    - @sap-ux/fiori-annotation-api@0.8.0

## 0.3.85

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/odata-annotation-core-types@0.5.2
    - @sap-ux/fiori-annotation-api@0.7.23
    - @sap-ux/odata-entity-model@0.3.3
    - @sap-ux/project-access@1.32.16

## 0.3.84

_Released: 2025-12-12T12:38:21Z_

### Patch Changes

- Updated dependencies [7217d7d]
    - @sap-ux/project-access@1.32.15
    - @sap-ux/fiori-annotation-api@0.7.22

## 0.3.83

_Released: 2025-12-10T20:04:51Z_

### Patch Changes

- Updated dependencies [4bdced0]
    - @sap-ux/project-access@1.32.14
    - @sap-ux/fiori-annotation-api@0.7.21

## 0.3.82

_Released: 2025-12-10T09:08:56Z_

### Patch Changes

- Updated dependencies [985223a]
    - @sap-ux/project-access@1.32.13
    - @sap-ux/fiori-annotation-api@0.7.20

## 0.3.81

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- Updated dependencies [037a430]
    - @sap-ux/fiori-annotation-api@0.7.19

## 0.3.80

_Released: 2025-12-04T10:42:12Z_

### Patch Changes

- Updated dependencies [45fe64e]
    - @sap-ux/project-access@1.32.12
    - @sap-ux/fiori-annotation-api@0.7.18

## 0.3.79

_Released: 2025-12-04T09:20:42Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.7.17

## 0.3.78

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- Updated dependencies [07725fe]
    - @sap-ux/project-access@1.32.11
    - @sap-ux/fiori-annotation-api@0.7.16

## 0.3.77

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- @sap-ux/project-access@1.32.10
- @sap-ux/fiori-annotation-api@0.7.15

## 0.3.76

_Released: 2025-11-26T00:12:42Z_

### Patch Changes

- 597834f: chore - update "@sap-ux/annotation-converter": "0.10.8" and "@sap-ux/vocabularies-types": "0.13.1"
- Updated dependencies [597834f]
    - @sap-ux/fiori-annotation-api@0.7.14

## 0.3.75

_Released: 2025-11-24T12:45:14Z_

### Patch Changes

- Updated dependencies [7c09c8e]
- Updated dependencies [1c13c9c]
    - @sap-ux/project-access@1.32.9
    - @sap-ux/fiori-annotation-api@0.7.13

## 0.3.74

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/odata-annotation-core-types@0.5.1
    - @sap-ux/fiori-annotation-api@0.7.12
    - @sap-ux/odata-entity-model@0.3.2
    - @sap-ux/project-access@1.32.8

## 0.3.73

_Released: 2025-11-04T14:07:00Z_

### Patch Changes

- Updated dependencies [271847c]
    - @sap-ux/fiori-annotation-api@0.7.11

## 0.3.72

_Released: 2025-10-27T13:41:31Z_

### Patch Changes

- Updated dependencies [d895232]
    - @sap-ux/project-access@1.32.7
    - @sap-ux/fiori-annotation-api@0.7.10

## 0.3.71

_Released: 2025-10-22T09:32:12Z_

### Patch Changes

- Updated dependencies [ea0a942]
    - @sap-ux/project-access@1.32.6
    - @sap-ux/fiori-annotation-api@0.7.9

## 0.3.70

_Released: 2025-10-21T07:47:50Z_

### Patch Changes

- Updated dependencies [c5d7915]
    - @sap-ux/project-access@1.32.5
    - @sap-ux/fiori-annotation-api@0.7.8

## 0.3.69

_Released: 2025-10-15T11:57:34Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.7.7

## 0.3.68

_Released: 2025-10-14T14:20:59Z_

### Patch Changes

- Updated dependencies [1443680]
    - @sap-ux/fiori-annotation-api@0.7.6

## 0.3.67

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- @sap-ux/project-access@1.32.4
- @sap-ux/fiori-annotation-api@0.7.5

## 0.3.66

_Released: 2025-10-08T13:16:50Z_

### Patch Changes

- Updated dependencies [376daf5]
    - @sap-ux/fiori-annotation-api@0.7.4

## 0.3.65

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/fiori-annotation-api@0.7.3
    - @sap-ux/project-access@1.32.3

## 0.3.64

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- @sap-ux/project-access@1.32.2
- @sap-ux/fiori-annotation-api@0.7.2

## 0.3.63

_Released: 2025-09-26T12:52:39Z_

### Patch Changes

- Updated dependencies [321b09e]
    - @sap-ux/fiori-annotation-api@0.7.1

## 0.3.62

_Released: 2025-09-23T16:06:33Z_

### Patch Changes

- Updated dependencies [aa8bb7a]
    - @sap-ux/odata-annotation-core-types@0.5.0
    - @sap-ux/fiori-annotation-api@0.7.0
    - @sap-ux/odata-entity-model@0.3.1

## 0.3.61

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.6.23
- @sap-ux/project-access@1.32.1

## 0.3.60

_Released: 2025-09-19T00:44:48Z_

### Patch Changes

- Updated dependencies [f9b4afe]
    - @sap-ux/project-access@1.32.0
    - @sap-ux/fiori-annotation-api@0.6.22

## 0.3.59

_Released: 2025-09-18T07:30:28Z_

### Patch Changes

- Updated dependencies [c385a76]
    - @sap-ux/project-access@1.31.0
    - @sap-ux/fiori-annotation-api@0.6.21

## 0.3.58

_Released: 2025-09-16T20:04:56Z_

### Patch Changes

- Updated dependencies [1f18878]
    - @sap-ux/odata-annotation-core-types@0.4.6
    - @sap-ux/fiori-annotation-api@0.6.20
    - @sap-ux/odata-entity-model@0.3.1

## 0.3.57

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- @sap-ux/project-access@1.30.14
- @sap-ux/fiori-annotation-api@0.6.19

## 0.3.56

_Released: 2025-09-12T07:38:54Z_

### Patch Changes

- Updated dependencies [a6ff2aa]
    - @sap-ux/fiori-annotation-api@0.6.18

## 0.3.55

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.6.17
- @sap-ux/project-access@1.30.13

## 0.3.54

_Released: 2025-08-19T14:29:06Z_

### Patch Changes

- 810d7eb: fix: Annotations are not generated if navigation property can't be resolved.

## 0.3.53

_Released: 2025-08-19T12:23:05Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.6.16

## 0.3.52

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- @sap-ux/project-access@1.30.12
- @sap-ux/fiori-annotation-api@0.6.15

## 0.3.51

_Released: 2025-08-13T10:00:10Z_

### Patch Changes

- Updated dependencies [c7db726]
    - @sap-ux/odata-annotation-core-types@0.4.5
    - @sap-ux/fiori-annotation-api@0.6.14
    - @sap-ux/odata-entity-model@0.3.1
    - @sap-ux/project-access@1.30.11

## 0.3.50

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- @sap-ux/project-access@1.30.10
- @sap-ux/fiori-annotation-api@0.6.13

## 0.3.49

_Released: 2025-07-30T19:33:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.9
- @sap-ux/fiori-annotation-api@0.6.12

## 0.3.48

_Released: 2025-07-28T22:57:52Z_

### Patch Changes

- Updated dependencies [4e0bd83]
    - @sap-ux/project-access@1.30.8
    - @sap-ux/fiori-annotation-api@0.6.11

## 0.3.47

_Released: 2025-07-28T21:20:33Z_

### Patch Changes

- 2cae662: fix(deps): update dependency @sap-ux/annotation-converter to v0.10.3
- Updated dependencies [2cae662]
    - @sap-ux/fiori-annotation-api@0.6.10

## 0.3.46

_Released: 2025-07-08T12:06:04Z_

### Patch Changes

- Updated dependencies [58cdce6]
    - @sap-ux/project-access@1.30.7
    - @sap-ux/fiori-annotation-api@0.6.9

## 0.3.45

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.6.8

## 0.3.44

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- @sap-ux/project-access@1.30.6
- @sap-ux/fiori-annotation-api@0.6.7

## 0.3.43

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- Updated dependencies [7a4543e]
    - @sap-ux/project-access@1.30.5
    - @sap-ux/fiori-annotation-api@0.6.6

## 0.3.42

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- Updated dependencies [f75b89d]
    - @sap-ux/project-access@1.30.4
    - @sap-ux/fiori-annotation-api@0.6.5

## 0.3.41

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- @sap-ux/project-access@1.30.3
- @sap-ux/fiori-annotation-api@0.6.4

## 0.3.40

_Released: 2025-06-17T14:16:05Z_

### Patch Changes

- Updated dependencies [bdff312]
    - @sap-ux/fiori-annotation-api@0.6.3

## 0.3.39

_Released: 2025-06-16T13:15:49Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.6.2

## 0.3.38

_Released: 2025-06-12T12:47:49Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.6.1

## 0.3.37

_Released: 2025-06-10T11:56:07Z_

### Patch Changes

- Updated dependencies [d2c10e7]
    - @sap-ux/fiori-annotation-api@0.6.0

## 0.3.36

_Released: 2025-06-10T10:19:01Z_

### Patch Changes

- Updated dependencies [08ed948]
    - @sap-ux/odata-annotation-core-types@0.4.4
    - @sap-ux/fiori-annotation-api@0.5.8
    - @sap-ux/odata-entity-model@0.3.1

## 0.3.35

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- @sap-ux/project-access@1.30.2
- @sap-ux/fiori-annotation-api@0.5.7

## 0.3.34

_Released: 2025-05-23T13:07:21Z_

### Patch Changes

- Updated dependencies [e605d30]
    - @sap-ux/fiori-annotation-api@0.5.6

## 0.3.33

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- @sap-ux/project-access@1.30.1
- @sap-ux/fiori-annotation-api@0.5.5

## 0.3.32

_Released: 2025-05-14T22:35:53Z_

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/project-access@1.30.0
    - @sap-ux/odata-annotation-core-types@0.4.3
    - @sap-ux/fiori-annotation-api@0.5.4
    - @sap-ux/odata-entity-model@0.3.1

## 0.3.31

_Released: 2025-05-14T15:30:12Z_

### Patch Changes

- Updated dependencies [aeb23b0]
    - @sap-ux/fiori-annotation-api@0.5.3

## 0.3.30

_Released: 2025-05-05T13:48:20Z_

### Patch Changes

- Updated dependencies [ea0e2c0]
    - @sap-ux/project-access@1.29.22
    - @sap-ux/fiori-annotation-api@0.5.2

## 0.3.29

_Released: 2025-04-29T08:08:36Z_

### Patch Changes

- Updated dependencies [2024a9f]
    - @sap-ux/fiori-annotation-api@0.5.1

## 0.3.28

_Released: 2025-04-28T07:24:41Z_

### Patch Changes

- Updated dependencies [2a16531]
    - @sap-ux/fiori-annotation-api@0.5.0

## 0.3.27

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- @sap-ux/project-access@1.29.21
- @sap-ux/fiori-annotation-api@0.4.27

## 0.3.26

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- Updated dependencies [294bbe3]
    - @sap-ux/project-access@1.29.20
    - @sap-ux/fiori-annotation-api@0.4.26

## 0.3.25

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- @sap-ux/project-access@1.29.19
- @sap-ux/fiori-annotation-api@0.4.25

## 0.3.24

_Released: 2025-04-16T13:54:40Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.4.24

## 0.3.23

_Released: 2025-04-16T12:27:23Z_

### Patch Changes

- Updated dependencies [7cda000]
    - @sap-ux/fiori-annotation-api@0.4.23

## 0.3.22

_Released: 2025-03-20T17:18:47Z_

### Patch Changes

- d873cbd: chore - Add repository metadata in package.json
- Updated dependencies [d873cbd]
    - @sap-ux/fiori-annotation-api@0.4.22

## 0.3.21

_Released: 2025-03-19T08:54:25Z_

### Patch Changes

- Updated dependencies [c3ebc82]
    - @sap-ux/project-access@1.29.18
    - @sap-ux/fiori-annotation-api@0.4.21

## 0.3.20

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- @sap-ux/project-access@1.29.17
- @sap-ux/fiori-annotation-api@0.4.20

## 0.3.19

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.4.19
- @sap-ux/project-access@1.29.16

## 0.3.18

_Released: 2025-03-06T16:16:20Z_

### Patch Changes

- Updated dependencies [1ce7fe9]
    - @sap-ux/project-access@1.29.15
    - @sap-ux/fiori-annotation-api@0.4.18

## 0.3.17

_Released: 2025-03-05T12:32:21Z_

### Patch Changes

- Updated dependencies [282dd9a]
    - @sap-ux/fiori-annotation-api@0.4.17

## 0.3.16

_Released: 2025-03-05T11:16:53Z_

### Patch Changes

- Updated dependencies [3cc8f8a]
    - @sap-ux/project-access@1.29.14
    - @sap-ux/fiori-annotation-api@0.4.16

## 0.3.15

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- @sap-ux/project-access@1.29.13
- @sap-ux/fiori-annotation-api@0.4.15

## 0.3.14

_Released: 2025-03-04T08:55:15Z_

### Patch Changes

- Updated dependencies [cf05ceb]
    - @sap-ux/fiori-annotation-api@0.4.14
    - @sap-ux/project-access@1.29.12

## 0.3.13

_Released: 2025-02-28T15:10:48Z_

### Patch Changes

- Updated dependencies [0f35b4b]
    - @sap-ux/project-access@1.29.11
    - @sap-ux/fiori-annotation-api@0.4.13

## 0.3.12

_Released: 2025-02-28T14:22:29Z_

### Patch Changes

- Updated dependencies [d443dde]
    - @sap-ux/fiori-annotation-api@0.4.12

## 0.3.11

_Released: 2025-02-27T14:15:03Z_

### Patch Changes

- @sap-ux/project-access@1.29.10
- @sap-ux/fiori-annotation-api@0.4.11

## 0.3.10

_Released: 2025-02-27T08:22:17Z_

### Patch Changes

- Updated dependencies [c8c292c]
    - @sap-ux/project-access@1.29.9
    - @sap-ux/fiori-annotation-api@0.4.10

## 0.3.9

_Released: 2025-02-17T13:42:22Z_

### Patch Changes

- Updated dependencies [c50e09f]
    - @sap-ux/project-access@1.29.8
    - @sap-ux/fiori-annotation-api@0.4.9

## 0.3.8

_Released: 2025-02-13T10:58:34Z_

### Patch Changes

- Updated dependencies [2c0d657]
    - @sap-ux/project-access@1.29.7
    - @sap-ux/fiori-annotation-api@0.4.8

## 0.3.7

_Released: 2025-02-11T12:08:20Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.4.7

## 0.3.6

_Released: 2025-02-10T08:52:20Z_

### Patch Changes

- Updated dependencies [9e5c80f]
    - @sap-ux/fiori-annotation-api@0.4.6

## 0.3.5

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- @sap-ux/project-access@1.29.6
- @sap-ux/fiori-annotation-api@0.4.5

## 0.3.4

_Released: 2025-02-05T17:08:20Z_

### Patch Changes

- @sap-ux/project-access@1.29.5
- @sap-ux/fiori-annotation-api@0.4.4

## 0.3.3

_Released: 2025-02-04T15:39:07Z_

### Patch Changes

- Updated dependencies [29abc73]
    - @sap-ux/project-access@1.29.4
    - @sap-ux/fiori-annotation-api@0.4.3

## 0.3.2

_Released: 2025-01-31T16:09:34Z_

### Patch Changes

- Updated dependencies [1f0bb25]
    - @sap-ux/fiori-annotation-api@0.4.2

## 0.3.1

_Released: 2025-01-30T10:04:50Z_

### Patch Changes

- Updated dependencies [096b021]
    - @sap-ux/project-access@1.29.3
    - @sap-ux/fiori-annotation-api@0.4.1

## 0.3.0

_Released: 2025-01-28T14:20:43Z_

### Minor Changes

- e6f42df: Update @sap-ux/annotation-converter, @sap-ux/vocabularies-types, @sap/ux-cds-compiler-facade dependencies

### Patch Changes

- Updated dependencies [e6f42df]
    - @sap-ux/fiori-annotation-api@0.4.0

## 0.2.27

_Released: 2025-01-28T09:20:06Z_

### Patch Changes

- Updated dependencies [93ef8c1]
    - @sap-ux/project-access@1.29.2
    - @sap-ux/fiori-annotation-api@0.3.8

## 0.2.26

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- @sap-ux/project-access@1.29.1
- @sap-ux/fiori-annotation-api@0.3.7

## 0.2.25

_Released: 2025-01-16T08:54:53Z_

### Patch Changes

- 5fff6e1: Pass optional mem-fs editor to get project information in annotation generator

## 0.2.24

_Released: 2025-01-16T02:22:29Z_

### Patch Changes

- Updated dependencies [88bf030]
    - @sap-ux/project-access@1.29.0
    - @sap-ux/fiori-annotation-api@0.3.6

## 0.2.23

_Released: 2025-01-15T13:31:47Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.3.5

## 0.2.22

_Released: 2024-12-17T15:31:53Z_

### Patch Changes

- Updated dependencies [e1edcd7]
    - @sap-ux/project-access@1.28.10
    - @sap-ux/fiori-annotation-api@0.3.4

## 0.2.21

_Released: 2024-12-06T21:07:01Z_

### Patch Changes

- Updated dependencies [e93797a]
    - @sap-ux/project-access@1.28.9
    - @sap-ux/fiori-annotation-api@0.3.3

## 0.2.20

_Released: 2024-12-04T09:13:08Z_

### Patch Changes

- Updated dependencies [7d61e58]
    - @sap-ux/fiori-annotation-api@0.3.2

## 0.2.19

_Released: 2024-12-02T16:28:38Z_

### Patch Changes

- @sap-ux/project-access@1.28.8
- @sap-ux/fiori-annotation-api@0.3.1

## 0.2.18

_Released: 2024-11-25T12:18:22Z_

### Patch Changes

- 09a58bb: chore: upgrade vocabularies-types + pnpm updates
- Updated dependencies [09a58bb]
    - @sap-ux/fiori-annotation-api@0.3.0

## 0.2.17

_Released: 2024-11-18T20:38:37Z_

### Patch Changes

- @sap-ux/project-access@1.28.7
- @sap-ux/fiori-annotation-api@0.2.17

## 0.2.16

_Released: 2024-11-13T15:30:16Z_

### Patch Changes

- Updated dependencies [0235973]
    - @sap-ux/fiori-annotation-api@0.2.16

## 0.2.15

_Released: 2024-11-08T08:58:34Z_

### Patch Changes

- Updated dependencies [fb26f92]
    - @sap-ux/project-access@1.28.6
    - @sap-ux/fiori-annotation-api@0.2.15

## 0.2.14

_Released: 2024-11-05T21:46:19Z_

### Patch Changes

- @sap-ux/project-access@1.28.5
- @sap-ux/fiori-annotation-api@0.2.14

## 0.2.13

_Released: 2024-11-05T13:50:29Z_

### Patch Changes

- Updated dependencies [5a68903]
    - @sap-ux/project-access@1.28.4
    - @sap-ux/fiori-annotation-api@0.2.13

## 0.2.12

_Released: 2024-10-31T07:40:48Z_

### Patch Changes

- Updated dependencies [42f13eb]
    - @sap-ux/project-access@1.28.3
    - @sap-ux/fiori-annotation-api@0.2.12

## 0.2.11

_Released: 2024-10-22T09:42:10Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.2.11

## 0.2.10

_Released: 2024-10-16T08:21:13Z_

### Patch Changes

- Updated dependencies [eb38e5b]
    - @sap-ux/project-access@1.28.2
    - @sap-ux/fiori-annotation-api@0.2.10

## 0.2.9

_Released: 2024-10-14T21:48:37Z_

### Patch Changes

- Updated dependencies [64e037d]
    - @sap-ux/project-access@1.28.1
    - @sap-ux/fiori-annotation-api@0.2.9

## 0.2.8

_Released: 2024-10-14T16:41:16Z_

### Patch Changes

- Updated dependencies [15e6959]
    - @sap-ux/project-access@1.28.0
    - @sap-ux/fiori-annotation-api@0.2.8

## 0.2.7

_Released: 2024-10-08T10:16:01Z_

### Patch Changes

- Updated dependencies [eb74890]
    - @sap-ux/project-access@1.27.6
    - @sap-ux/fiori-annotation-api@0.2.7

## 0.2.6

_Released: 2024-10-04T15:21:13Z_

### Patch Changes

- Updated dependencies [93f8a83]
    - @sap-ux/odata-annotation-core-types@0.4.2
    - @sap-ux/odata-entity-model@0.3.1
    - @sap-ux/fiori-annotation-api@0.2.6

## 0.2.5

_Released: 2024-10-02T14:28:15Z_

### Patch Changes

- Updated dependencies [a64a3a5]
    - @sap-ux/project-access@1.27.5
    - @sap-ux/fiori-annotation-api@0.2.5

## 0.2.4

_Released: 2024-09-23T10:02:33Z_

### Patch Changes

- @sap-ux/project-access@1.27.4
- @sap-ux/fiori-annotation-api@0.2.4

## 0.2.3

_Released: 2024-09-18T14:01:49Z_

### Patch Changes

- Updated dependencies [070182d]
    - @sap-ux/project-access@1.27.3
    - @sap-ux/fiori-annotation-api@0.2.3

## 0.2.2

_Released: 2024-09-12T09:42:45Z_

### Patch Changes

- Updated dependencies [09522df]
    - @sap-ux/project-access@1.27.2
    - @sap-ux/fiori-annotation-api@0.2.2

## 0.2.1

_Released: 2024-09-10T14:58:16Z_

### Patch Changes

- a0836d0: Fixed writing SAP annotations to a file outside CDS project
- Updated dependencies [a0836d0]
    - @sap-ux/fiori-annotation-api@0.2.1

## 0.2.0

_Released: 2024-09-09T13:32:11Z_

### Minor Changes

- 6ac4f50: Enable generating SAP annotations for CAP CDS projects

### Patch Changes

- Updated dependencies [6ac4f50]
    - @sap-ux/fiori-annotation-api@0.2.0

## 0.1.31

_Released: 2024-09-09T11:35:24Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.1.41

## 0.1.30

_Released: 2024-09-03T19:06:21Z_

### Patch Changes

- Updated dependencies [d962ce1]
    - @sap-ux/project-access@1.27.1
    - @sap-ux/fiori-annotation-api@0.1.40

## 0.1.29

_Released: 2024-08-30T06:05:30Z_

### Patch Changes

- Updated dependencies [df29368]
    - @sap-ux/project-access@1.27.0
    - @sap-ux/fiori-annotation-api@0.1.39

## 0.1.28

_Released: 2024-08-28T11:16:50Z_

### Patch Changes

- @sap-ux/project-access@1.26.9
- @sap-ux/fiori-annotation-api@0.1.38

## 0.1.27

_Released: 2024-08-20T10:06:29Z_

### Patch Changes

- Updated dependencies [df6262e]
    - @sap-ux/project-access@1.26.8
    - @sap-ux/fiori-annotation-api@0.1.37

## 0.1.26

_Released: 2024-08-19T11:34:45Z_

### Patch Changes

- @sap-ux/project-access@1.26.7
- @sap-ux/fiori-annotation-api@0.1.36

## 0.1.25

_Released: 2024-08-19T09:48:14Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.1.35

## 0.1.24

_Released: 2024-08-12T11:41:22Z_

### Patch Changes

- Updated dependencies [26379ea]
    - @sap-ux/fiori-annotation-api@0.1.34

## 0.1.23

_Released: 2024-08-12T10:50:52Z_

### Patch Changes

- Updated dependencies [82aaea3]
    - @sap-ux/project-access@1.26.6
    - @sap-ux/fiori-annotation-api@0.1.33

## 0.1.22

_Released: 2024-08-08T07:33:51Z_

### Patch Changes

- Updated dependencies [cc16cbb]
    - @sap-ux/project-access@1.26.5
    - @sap-ux/fiori-annotation-api@0.1.32

## 0.1.21

_Released: 2024-08-07T11:06:05Z_

### Patch Changes

- @sap-ux/fiori-annotation-api@0.1.31
- @sap-ux/project-access@1.26.4
- @sap-ux/odata-annotation-core-types@0.4.1
- @sap-ux/odata-entity-model@0.3.0

## 0.1.20

_Released: 2024-08-01T18:27:11Z_

### Patch Changes

- Updated dependencies [88c8bf6]
    - @sap-ux/project-access@1.26.3
    - @sap-ux/fiori-annotation-api@0.1.30

## 0.1.19

_Released: 2024-08-01T17:28:17Z_

### Patch Changes

- e69db46: Upgrade fast-xml-parser
- Updated dependencies [e69db46]
    - @sap-ux/project-access@1.26.2
    - @sap-ux/fiori-annotation-api@0.1.29

## 0.1.18

_Released: 2024-08-01T16:21:31Z_

### Patch Changes

- Updated dependencies [a986655]
    - @sap-ux/project-access@1.26.1
    - @sap-ux/fiori-annotation-api@0.1.28

## 0.1.17

_Released: 2024-08-01T14:53:05Z_

### Patch Changes

- Updated dependencies [518bf7e]
    - @sap-ux/project-access@1.26.0
    - @sap-ux/fiori-annotation-api@0.1.27

## 0.1.16

_Released: 2024-08-01T12:24:50Z_

### Patch Changes

- Updated dependencies [99b7b5f]
    - @sap-ux/project-access@1.25.8
    - @sap-ux/fiori-annotation-api@0.1.26

## 0.1.15

_Released: 2024-07-24T15:25:31Z_

### Patch Changes

- Updated dependencies [0ec9420]
    - @sap-ux/fiori-annotation-api@0.1.25

## 0.1.14

_Released: 2024-07-23T09:01:05Z_

### Patch Changes

- Updated dependencies [d549173]
    - @sap-ux/project-access@1.25.7
    - @sap-ux/fiori-annotation-api@0.1.24

## 0.1.13

_Released: 2024-07-22T09:45:02Z_

### Patch Changes

- Updated dependencies [cd12eed]
    - @sap-ux/fiori-annotation-api@0.1.23

## 0.1.12

_Released: 2024-07-18T16:34:38Z_

### Patch Changes

- Updated dependencies [a9fac04]
    - @sap-ux/project-access@1.25.6
    - @sap-ux/fiori-annotation-api@0.1.22

## 0.1.11

_Released: 2024-07-17T10:08:55Z_

### Patch Changes

- Updated dependencies [421f3ca]
    - @sap-ux/project-access@1.25.5
    - @sap-ux/fiori-annotation-api@0.1.21

## 0.1.10

_Released: 2024-07-12T15:28:30Z_

### Patch Changes

- Updated dependencies [173b5f2]
    - @sap-ux/project-access@1.25.4
    - @sap-ux/fiori-annotation-api@0.1.20

## 0.1.9

_Released: 2024-07-12T09:20:42Z_

### Patch Changes

- Updated dependencies [e7b9184]
    - @sap-ux/project-access@1.25.3
    - @sap-ux/fiori-annotation-api@0.1.19

## 0.1.8

_Released: 2024-07-12T08:50:08Z_

### Patch Changes

- @sap-ux/project-access@1.25.2
- @sap-ux/fiori-annotation-api@0.1.18

## 0.1.7

_Released: 2024-07-10T11:59:21Z_

### Patch Changes

- Updated dependencies [0f3cf6b]
    - @sap-ux/project-access@1.25.1
    - @sap-ux/fiori-annotation-api@0.1.17

## 0.1.6

_Released: 2024-07-10T09:53:11Z_

### Patch Changes

- Updated dependencies [e10cf9e]
    - @sap-ux/fiori-annotation-api@0.1.16

## 0.1.5

_Released: 2024-07-10T07:45:51Z_

### Patch Changes

- Updated dependencies [8ef805b]
    - @sap-ux/fiori-annotation-api@0.1.15

## 0.1.4

_Released: 2024-07-09T14:03:41Z_

### Patch Changes

- Updated dependencies [94cee16]
    - @sap-ux/fiori-annotation-api@0.1.14

## 0.1.3

_Released: 2024-07-09T12:14:56Z_

### Patch Changes

- Updated dependencies [f076dd3]
    - @sap-ux/project-access@1.25.0
    - @sap-ux/fiori-annotation-api@0.1.13

## 0.1.2

_Released: 2024-07-09T08:05:42Z_

### Patch Changes

- Updated dependencies [0ae685e]
    - @sap-ux/project-access@1.24.0
    - @sap-ux/fiori-annotation-api@0.1.12

## 0.1.1

_Released: 2024-07-05T15:03:05Z_

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/odata-annotation-core-types@0.4.0
    - @sap-ux/odata-entity-model@0.3.0
    - @sap-ux/project-access@1.23.0
    - @sap-ux/fiori-annotation-api@0.1.11

## 0.1.0

### Minor Changes

- a8c26a67: Add default annotation generation for projects
