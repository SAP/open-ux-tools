# @sap-ux/ui5-proxy-middleware

## 2.0.8

### Patch Changes

#### Dependency Updates

- Upgrade i18next 25.10.10 → 26.3.6 [[28263d1](https://github.com/SAP/open-ux-tools/commit/28263d1cdcbb8599ee7b165c3482255b631604b8)]

#### Workspace Updates

- @sap-ux/ui5-config 1.0.5 → 1.0.5

## 2.0.7

### Patch Changes

#### Workspace Updates

- @sap-ux/logger 1.0.2 → 1.0.3
- @sap-ux/ui5-config 1.0.5 → 1.0.5

## 2.0.6

### Patch Changes

#### Workspace Updates

- @sap-ux/ui5-config 1.0.4 → 1.0.5

## 2.0.5

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

#### Workspace Updates

- @sap-ux/ui5-config 1.0.3 → 1.0.4
- @sap-ux/logger 1.0.1 → 1.0.2

## 2.0.4

### Patch Changes

#### Dependency Updates

- Upgrade patch-level dependencies [[aed328d](https://github.com/SAP/open-ux-tools/commit/aed328da8a5c93e226c58e4d7dc14c7c82756259)]

#### Workspace Updates

- @sap-ux/ui5-config 1.0.3 → 1.0.3

## 2.0.3

_Released: 2026-06-10T09:57:42Z_

### Patch Changes

- Updated dependencies [c8e8f7e]
    - @sap-ux/ui5-config@1.0.3

## 2.0.2

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/ui5-config@1.0.2
    - @sap-ux/logger@1.0.1

## 2.0.1

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- Updated dependencies [9580241]
    - @sap-ux/ui5-config@1.0.1

## 2.0.0

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
    - @sap-ux/ui5-config@1.0.0
    - @sap-ux/logger@1.0.0

## 1.7.1

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- Updated dependencies [9752c40]
    - @sap-ux/ui5-config@0.31.1

## 1.7.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/logger@0.9.0
    - @sap-ux/ui5-config@0.31.0

## 1.6.35

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/logger@0.8.6
    - @sap-ux/ui5-config@0.30.5

## 1.6.34

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- Updated dependencies [678a08e]
    - @sap-ux/ui5-config@0.30.4

## 1.6.33

_Released: 2026-04-15T11:53:17Z_

### Patch Changes

- 67d1f8b: Bump dotenv and configure "quiet" option

## 1.6.32

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- Updated dependencies [cc4450c]
    - @sap-ux/ui5-config@0.30.3

## 1.6.31

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- Updated dependencies [f1e4481]
    - @sap-ux/logger@0.8.5
    - @sap-ux/ui5-config@0.30.2

## 1.6.30

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(ui5-proxy-middleware): upgrade shared devDependencies (jest 30, i18next 25)
- Updated dependencies [c53a4ba]
    - @sap-ux/logger@0.8.4
    - @sap-ux/ui5-config@0.30.1

## 1.6.29

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: chore(ui5-proxy-middleware): upgrade i18next 25.8.18 → 25.8.20
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/logger@0.8.3
    - @sap-ux/ui5-config@0.30.1

## 1.6.28

_Released: 2026-03-20T16:07:49Z_

### Patch Changes

- Updated dependencies [25e5177]
    - @sap-ux/ui5-config@0.30.0

## 1.6.27

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 5d452e5: fix(deps): update dependency nock to v14
- 55417bb: fix(deps): update dependency i18next to v25.8.18
    - @sap-ux/ui5-config@0.29.21

## 1.6.26

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- 2917c4c: fix(deps): update dependency yaml to v2.8.2
- fdd57de: fix(deps): update dependency dotenv to v17
    - @sap-ux/ui5-config@0.29.21

## 1.6.25

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- Updated dependencies [45d4797]
    - @sap-ux/logger@0.8.2
    - @sap-ux/ui5-config@0.29.20

## 1.6.24

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- Updated dependencies [c09b843]
    - @sap-ux/ui5-config@0.29.20

## 1.6.23

_Released: 2026-02-26T13:45:24Z_

### Patch Changes

- d475c7f: feat: export TypeScript types for external consumption

## 1.6.22

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- 6c993f3: fix: turn off i18next support notice
    - @sap-ux/ui5-config@0.29.19

## 1.6.21

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- c043712: fix(deps): update dependency supertest to v7.2.2

## 1.6.20

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- Updated dependencies [d92cd35]
    - @sap-ux/ui5-config@0.29.19

## 1.6.19

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12
    - @sap-ux/ui5-config@0.29.18

## 1.6.18

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- Updated dependencies [bb310dc]
    - @sap-ux/ui5-config@0.29.18

## 1.6.17

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- Updated dependencies [e7f58d7]
    - @sap-ux/ui5-config@0.29.17

## 1.6.16

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- Updated dependencies [2fc459c]
    - @sap-ux/ui5-config@0.29.16

## 1.6.15

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- Updated dependencies [ad321ab]
    - @sap-ux/ui5-config@0.29.15

## 1.6.14

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- Updated dependencies [ea7a16c]
    - @sap-ux/logger@0.8.1
    - @sap-ux/ui5-config@0.29.14

## 1.6.13

_Released: 2026-01-23T23:57:30Z_

### Patch Changes

- c707af1: fix(deps): update dependency dotenv to v16.6.1

## 1.6.12

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- Updated dependencies [be67fc4]
    - @sap-ux/ui5-config@0.29.13

## 1.6.11

_Released: 2026-01-14T13:30:42Z_

### Patch Changes

- ce4b29c: Upgrade qs/body-parser/express

## 1.6.10

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/logger@0.8.0
    - @sap-ux/ui5-config@0.29.12

## 1.6.9

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/ui5-config@0.29.12
    - @sap-ux/logger@0.7.3

## 1.6.8

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/ui5-config@0.29.11
    - @sap-ux/logger@0.7.2

## 1.6.7

_Released: 2025-12-02T08:59:04Z_

### Patch Changes

- 67e2b43: add 'express' as peerDependency

## 1.6.6

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- Updated dependencies [5d0598d]
    - @sap-ux/ui5-config@0.29.10

## 1.6.5

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/ui5-config@0.29.9
    - @sap-ux/logger@0.7.1

## 1.6.4

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- Updated dependencies [9e94382]
    - @sap-ux/ui5-config@0.29.8

## 1.6.3

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/ui5-config@0.29.7

## 1.6.2

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- d866995: fix: pathReplace not taken into account or truncated in case of nested router instances
- Updated dependencies [d866995]
    - @sap-ux/ui5-config@0.29.6

## 1.6.1

_Released: 2025-10-01T15:27:06Z_

### Patch Changes

- d9acb53: Supports the pathReplace over the ui5-proxy-middleware

## 1.6.0

_Released: 2025-09-30T12:44:29Z_

### Minor Changes

- 64250ed: migrate to http-proxy-middleware v3

## 1.5.12

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- Updated dependencies [9872384]
    - @sap-ux/ui5-config@0.29.5

## 1.5.11

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- Updated dependencies [8ccc4da]
    - @sap-ux/ui5-config@0.29.4

## 1.5.10

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- Updated dependencies [4cfebaf]
    - @sap-ux/ui5-config@0.29.3

## 1.5.9

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- Updated dependencies [178dbea]
    - @sap-ux/ui5-config@0.29.2

## 1.5.8

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- Updated dependencies [43bc887]
    - @sap-ux/ui5-config@0.29.1

## 1.5.7

_Released: 2025-07-04T15:18:17Z_

### Patch Changes

- 69f62ec: i18next upgrade to 25.3.0
    - @sap-ux/ui5-config@0.29.0

## 1.5.6

_Released: 2025-07-04T09:34:59Z_

### Patch Changes

- Updated dependencies [c0fa1d1]
    - @sap-ux/ui5-config@0.29.0

## 1.5.5

_Released: 2025-07-03T12:14:55Z_

### Patch Changes

- 7a4543e: fix: remove usage of static webapp folder

## 1.5.4

_Released: 2025-06-30T08:46:50Z_

### Patch Changes

- b9675bb: Improve Fiori Tools UI Texts

## 1.5.3

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- Updated dependencies [f75b89d]
    - @sap-ux/ui5-config@0.28.3

## 1.5.2

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- Updated dependencies [61ea5c0]
    - @sap-ux/ui5-config@0.28.2

## 1.5.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- Updated dependencies [5e0020b]
    - @sap-ux/ui5-config@0.28.1

## 1.5.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/ui5-config@0.28.0
    - @sap-ux/logger@0.7.0

## 1.4.26

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- Updated dependencies [7590bc3]
    - @sap-ux/ui5-config@0.27.2

## 1.4.25

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- Updated dependencies [294bbe3]
    - @sap-ux/ui5-config@0.27.1

## 1.4.24

_Released: 2025-04-23T13:59:14Z_

### Patch Changes

- Updated dependencies [1ca4004]
    - @sap-ux/ui5-config@0.27.0

## 1.4.23

_Released: 2025-04-17T14:55:33Z_

### Patch Changes

- a4cb2f6: chore(deps): update dependency http-proxy-middleware to v2.0.9

## 1.4.22

_Released: 2025-04-15T11:46:39Z_

### Patch Changes

- a3da9a3: fix: adjust response type

## 1.4.21

_Released: 2025-04-15T06:12:23Z_

### Patch Changes

- 2260ad5: export directLoadProxy for reuse

## 1.4.20

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- Updated dependencies [224494c]
    - @sap-ux/ui5-config@0.26.5

## 1.4.19

_Released: 2025-03-17T09:06:50Z_

### Patch Changes

- 66be708: fix: UI5 2 directLoad

## 1.4.18

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- Updated dependencies [011c8c5]
    - @sap-ux/ui5-config@0.26.4

## 1.4.17

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- Updated dependencies [5817923]
    - @sap-ux/ui5-config@0.26.3

## 1.4.16

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- Updated dependencies [ed8a9b9]
    - @sap-ux/ui5-config@0.26.2

## 1.4.15

_Released: 2025-02-06T22:08:41Z_

### Patch Changes

- 59453ba: fix(security): security findings from github

## 1.4.14

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- Updated dependencies [19aad96]
    - @sap-ux/ui5-config@0.26.1

## 1.4.13

_Released: 2024-12-02T16:28:38Z_

### Patch Changes

- Updated dependencies [73475e5]
    - @sap-ux/ui5-config@0.26.0

## 1.4.12

_Released: 2024-11-25T12:18:22Z_

### Patch Changes

- 09a58bb: chore: upgrade vocabularies-types + pnpm updates

## 1.4.11

_Released: 2024-11-19T15:25:45Z_

### Patch Changes

- 2a72ad2: chore - Fix audit issues

## 1.4.10

_Released: 2024-11-18T20:38:37Z_

### Patch Changes

- Updated dependencies [1beac7e]
    - @sap-ux/ui5-config@0.25.2

## 1.4.9

_Released: 2024-11-05T21:46:19Z_

### Patch Changes

- Updated dependencies [6275288]
    - @sap-ux/ui5-config@0.25.1

## 1.4.8

_Released: 2024-10-22T22:47:19Z_

### Patch Changes

- bc75111: Upgrade http-proxy-middleware

## 1.4.7

_Released: 2024-09-23T10:02:33Z_

### Patch Changes

- Updated dependencies [484195d]
    - @sap-ux/ui5-config@0.25.0

## 1.4.6

_Released: 2024-09-05T07:04:23Z_

### Patch Changes

- 8aa367a: Fix: directLoad: true does not work and fails with Error: EISDIR: illegal operation on a directory, read

## 1.4.5

_Released: 2024-08-28T11:16:50Z_

### Patch Changes

- Updated dependencies [1a99abc]
    - @sap-ux/ui5-config@0.24.1

## 1.4.4

_Released: 2024-08-19T11:34:45Z_

### Patch Changes

- Updated dependencies [61721f2]
    - @sap-ux/ui5-config@0.24.0

## 1.4.3

_Released: 2024-08-01T17:28:17Z_

### Patch Changes

- e69db46: Upgrade fast-xml-parser

## 1.4.2

_Released: 2024-07-23T09:01:05Z_

### Patch Changes

- d549173: - Adjusts getMinUI5VersionAsArray so that semver valid check is included; the function now only returns valid versions.
    - Upgrade of @ui5/manifest to 1.66.0; adjustment of all components so that minimumUI5Version definitions as array are processed properly.

## 1.4.1

_Released: 2024-07-12T08:50:08Z_

### Patch Changes

- Updated dependencies [22e4ad8]
    - @sap-ux/ui5-config@0.23.1

## 1.4.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/logger@0.6.0
    - @sap-ux/ui5-config@0.23.0

## 1.3.16

_Released: 2024-06-26T13:30:18Z_

### Patch Changes

- Updated dependencies [1a1baeb0]
    - @sap-ux/ui5-config@0.22.10

## 1.3.15

_Released: 2024-06-26T13:08:21Z_

### Patch Changes

- 899cdb23: FIX: enabled running the middleware with karma

## 1.3.14

_Released: 2024-06-25T14:41:22Z_

### Patch Changes

- Updated dependencies [399d2ad8]
    - @sap-ux/ui5-config@0.22.9

## 1.3.13

_Released: 2024-06-18T15:06:09Z_

### Patch Changes

- Updated dependencies [a140cf8b]
    - @sap-ux/ui5-config@0.22.8

## 1.3.12

_Released: 2024-06-12T15:20:44Z_

### Patch Changes

- Updated dependencies [9188fe8b]
    - @sap-ux/ui5-config@0.22.7

## 1.3.11

_Released: 2024-06-07T14:16:07Z_

### Patch Changes

- @sap-ux/ui5-config@0.22.6

## 1.3.10

_Released: 2024-05-27T13:04:53Z_

### Patch Changes

- Updated dependencies [3684195d]
    - @sap-ux/ui5-config@0.22.5

## 1.3.9

_Released: 2024-05-14T08:36:35Z_

### Patch Changes

- Updated dependencies [e3d2324c]
    - @sap-ux/ui5-config@0.22.4

## 1.3.8

_Released: 2024-05-02T14:43:18Z_

### Patch Changes

- Updated dependencies [7f8105c7]
    - @sap-ux/ui5-config@0.22.3

## 1.3.7

_Released: 2024-04-23T22:35:35Z_

### Patch Changes

- Updated dependencies [b7d95fb3]
    - @sap-ux/ui5-config@0.22.2

## 1.3.6

_Released: 2024-04-16T06:40:59Z_

### Patch Changes

- 6291bc37: chore - update dependencies to fix audit warnings

## 1.3.5

_Released: 2024-04-04T13:19:16Z_

### Patch Changes

- Updated dependencies [efa35ddd]
    - @sap-ux/ui5-config@0.22.1

## 1.3.4

_Released: 2024-03-21T16:21:01Z_

### Patch Changes

- Updated dependencies [ec509c40]
    - @sap-ux/ui5-config@0.22.0

## 1.3.3

_Released: 2024-02-27T22:07:50Z_

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json
- Updated dependencies [c15435b6]
    - @sap-ux/ui5-config@0.21.1
    - @sap-ux/logger@0.5.1

## 1.3.2

_Released: 2024-02-08T13:37:06Z_

### Patch Changes

- Updated dependencies [2e0b1a6d]
    - @sap-ux/logger@0.5.0

## 1.3.1

_Released: 2023-11-22T08:53:28Z_

### Patch Changes

- Updated dependencies [3f977f21]
    - @sap-ux/ui5-config@0.21.0

## 1.3.0

_Released: 2023-10-19T12:06:19Z_

### Minor Changes

- 1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

- Updated dependencies [1aa0fc43]
    - @sap-ux/ui5-config@0.20.0
    - @sap-ux/logger@0.4.0

## 1.2.6

_Released: 2023-10-18T13:59:49Z_

### Patch Changes

- cbcad88d: fix(deps): update dependencies [i18next]

## 1.2.5

_Released: 2023-10-17T08:28:48Z_

### Patch Changes

- Updated dependencies [4052822f]
    - @sap-ux/logger@0.3.9
    - @sap-ux/ui5-config@0.19.5

## 1.2.4

_Released: 2023-10-09T17:37:13Z_

### Patch Changes

- Updated dependencies [65010b09]
    - @sap-ux/ui5-config@0.19.4

## 1.2.3

_Released: 2023-09-20T13:13:51Z_

### Patch Changes

- 63c698a8: chore - fix publishing of modules missed in failed release build
- Updated dependencies [63c698a8]
    - @sap-ux/logger@0.3.8
    - @sap-ux/ui5-config@0.19.3

## 1.2.2

_Released: 2023-09-19T15:51:30Z_

### Patch Changes

- Updated dependencies [3137514f]
    - @sap-ux/ui5-config@0.19.2

## 1.2.1

_Released: 2023-09-19T14:02:55Z_

### Patch Changes

- Updated dependencies [7c8a6946]
    - @sap-ux/ui5-config@0.19.1

## 1.2.0

_Released: 2023-09-14T08:28:08Z_

### Minor Changes

- 1f250333: Use default config if none is provided.

## 1.1.35

_Released: 2023-09-08T22:35:34Z_

### Patch Changes

- 118692c3: update dependency http-proxy-middleware to v2.0.6

## 1.1.34

_Released: 2023-08-28T15:04:29Z_

### Patch Changes

- bce98f84: Support usage when running in connect server like approuter

## 1.1.33

_Released: 2023-08-11T09:14:46Z_

### Patch Changes

- Updated dependencies [375ca861]
    - @sap-ux/ui5-config@0.19.0

## 1.1.32

_Released: 2023-08-09T18:54:10Z_

### Patch Changes

- d3e7d06b: Fixes for 'promises should not be misused' sonar bugs

## 1.1.31

_Released: 2023-06-27T14:58:54Z_

### Patch Changes

- 4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.
- Updated dependencies [4ba13898]
    - @sap-ux/ui5-config@0.18.2
    - @sap-ux/logger@0.3.7

## 1.1.30

_Released: 2023-06-26T15:34:40Z_

### Patch Changes

- Updated dependencies [d9355692]
    - @sap-ux/ui5-config@0.18.1

## 1.1.29

_Released: 2023-06-21T06:38:48Z_

### Patch Changes

- Updated dependencies [59863d93]
    - @sap-ux/ui5-config@0.18.0

## 1.1.28

_Released: 2023-06-12T08:03:49Z_

### Patch Changes

- 7f1971c1: Fix: handle missing manifest.json

## 1.1.27

_Released: 2023-06-12T06:59:29Z_

### Patch Changes

- 25911701: Fix for 'promises must be awaited' sonar issues
- Updated dependencies [25911701]
    - @sap-ux/logger@0.3.6
    - @sap-ux/ui5-config@0.17.1

## 1.1.26

_Released: 2023-06-01T08:16:47Z_

### Patch Changes

- Updated dependencies [31207b95]
    - @sap-ux/ui5-config@0.17.0

## 1.1.25

_Released: 2023-04-26T14:34:08Z_

### Patch Changes

- 100248f3: fix(security): upgrade yaml
- Updated dependencies [100248f3]
    - @sap-ux/ui5-config@0.16.6

## 1.1.24

_Released: 2023-03-24T14:54:37Z_

### Patch Changes

- Updated dependencies [e7614e5]
    - @sap-ux/ui5-config@0.16.5

## 1.1.23

_Released: 2023-02-23T13:56:23Z_

### Patch Changes

- d350038: chore - TypeScript 4.9.4 upgrade
- Updated dependencies [d350038]
    - @sap-ux/logger@0.3.5
    - @sap-ux/ui5-config@0.16.4

## 1.1.22

_Released: 2023-02-17T07:56:11Z_

### Patch Changes

- @sap-ux/ui5-config@0.16.3

## 1.1.21

_Released: 2023-02-10T14:09:06Z_

### Patch Changes

- ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues
- Updated dependencies [ed04f6f]
    - @sap-ux/logger@0.3.4
    - @sap-ux/ui5-config@0.16.2

## 1.1.20

_Released: 2022-12-16T11:48:52Z_

### Patch Changes

- Updated dependencies [c6f4c8c]
    - @sap-ux/logger@0.3.3

## 1.1.19

_Released: 2022-12-07T07:48:12Z_

### Patch Changes

- 5589854: Upgrade qs module and the modules using it because of a potential Denial of Service vulnerabity

## 1.1.18

_Released: 2022-12-05T07:50:58Z_

### Patch Changes

- 070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability
- Updated dependencies [070d8dc]
    - @sap-ux/logger@0.3.2
    - @sap-ux/ui5-config@0.16.1

## 1.1.17

_Released: 2022-11-04T17:06:16Z_

### Patch Changes

- Updated dependencies [d760b69]
    - @sap-ux/ui5-config@0.16.0

## 1.1.16

_Released: 2022-10-25T12:22:11Z_

### Patch Changes

- ee7f9a9: Refactor to use getProxyForUrl directly

## 1.1.15

_Released: 2022-10-21T07:04:47Z_

### Patch Changes

- @sap-ux/ui5-config@0.15.4

## 1.1.14

_Released: 2022-10-20T06:37:40Z_

### Patch Changes

- 748d24f: Consider ports when checking if a host is excluded from corporate proxy

## 1.1.13

_Released: 2022-10-14T14:52:33Z_

### Patch Changes

- 11c8f5d: Use manifest types from @sap-ux/project-access
- Updated dependencies [11c8f5d]
    - @sap-ux/ui5-config@0.15.3

## 1.1.12

_Released: 2022-10-11T14:06:32Z_

### Patch Changes

- 5b487ef: chore - Apply linting to test folders and linting fixes
- Updated dependencies [5b487ef]
    - @sap-ux/logger@0.3.1
    - @sap-ux/ui5-config@0.15.2

## 1.1.11

_Released: 2022-10-04T15:02:00Z_

### Patch Changes

- @sap-ux/ui5-config@0.15.1

## 1.1.10

_Released: 2022-09-20T15:47:25Z_

### Patch Changes

- fac7a5a: Replaced usage of express with simple code to reduce installation size.

## 1.1.9

_Released: 2022-09-14T16:06:49Z_

### Patch Changes

- Updated dependencies [83a7a1a]
    - @sap-ux/ui5-config@0.15.0

## 1.1.8

_Released: 2022-08-26T23:41:09Z_

### Patch Changes

- Updated dependencies [bc4cb3a]
    - @sap-ux/logger@0.3.0

## 1.1.7

_Released: 2022-08-25T13:08:21Z_

### Patch Changes

- Updated dependencies [b6d0c67]
    - @sap-ux/ui5-config@0.14.5

## 1.1.6

_Released: 2022-07-27T08:51:11Z_

### Patch Changes

- Updated dependencies [30afc5f]
    - @sap-ux/ui5-config@0.14.4

## 1.1.5

_Released: 2022-07-26T08:47:10Z_

### Patch Changes

- 5b46c30: Improve error handling of proxy middlewares

## 1.1.4

_Released: 2022-07-21T14:10:31Z_

### Patch Changes

- 09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies
- Updated dependencies [09c6eb5]
    - @sap-ux/logger@0.2.2
    - @sap-ux/ui5-config@0.14.3

## 1.1.3

_Released: 2022-07-20T14:42:08Z_

### Patch Changes

- Updated dependencies [7c4a4df]
    - @sap-ux/ui5-config@0.14.2

## 1.1.2

_Released: 2022-07-04T13:03:56Z_

### Patch Changes

- cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm
- Updated dependencies [cc1c406]
    - @sap-ux/logger@0.2.1
    - @sap-ux/ui5-config@0.14.1

## 1.1.1

_Released: 2022-06-16T09:49:08Z_

### Patch Changes

- 5c5c904: Add author to package.json

## 1.1.0

_Released: 2022-06-13T09:53:27Z_

### Minor Changes

- 6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

### Patch Changes

- Updated dependencies [6f51973]
    - @sap-ux/logger@0.2.0
    - @sap-ux/ui5-config@0.14.0

## 1.0.9

_Released: 2022-05-20T08:24:25Z_

### Patch Changes

- 47538c6: Read FIORI_TOOLS_UI5\* env variables of a run configuration

## 1.0.8

_Released: 2022-05-19T14:38:34Z_

### Patch Changes

- c70fd4d: chore(open-ux-tools) pnpm 7 and node 18 support.
- Updated dependencies [c70fd4d]
    - @sap-ux/logger@0.1.6
    - @sap-ux/ui5-config@0.13.3

## 1.0.7

_Released: 2022-04-27T16:48:18Z_

### Patch Changes

- Updated dependencies [b5ab868]
    - @sap-ux/ui5-config@0.13.2

## 1.0.6

_Released: 2022-04-22T11:27:29Z_

### Patch Changes

- c3eee4e: Set true as default for the secure option

## 1.0.5

_Released: 2022-04-01T07:00:29Z_

### Patch Changes

- Updated dependencies [5b5355c]
    - @sap-ux/ui5-config@0.13.1

## 1.0.4

_Released: 2022-03-31T13:41:16Z_

### Patch Changes

- 56409d0: Consolidated ui5 configuration types and enhanced API
- Updated dependencies [56409d0]
    - @sap-ux/ui5-config@0.13.0

## 1.0.3

_Released: 2022-03-29T13:57:37Z_

### Patch Changes

- c18fc5c: chore(open-ux-tools) update devDependencies and change dependabot config
- Updated dependencies [a34d058]
- Updated dependencies [c18fc5c]
    - @sap-ux/logger@0.1.5

## 1.0.2

_Released: 2022-03-24T07:10:57Z_

### Patch Changes

- 0837ac1: Add missing information to package.json and enforced use of higher version of minimist
- Updated dependencies [0837ac1]
    - @sap-ux/logger@0.1.4

## 1.0.1

_Released: 2022-03-22T19:34:16Z_

### Patch Changes

- aff88b6: Rename test-project folder to test-input to fix issue with changeset version script
- 7107fbc: chore - use import type in TS code.
- Updated dependencies [7107fbc]
    - @sap-ux/logger@0.1.3

## 1.0.0

### Major Changes

- 3e70b04: Add ui5-proxy-middleware
