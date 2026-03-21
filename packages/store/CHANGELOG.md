# @sap-ux/store

## 1.5.10

*Released: 2026-03-17T01:04:22Z*

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18

## 1.5.9

*Released: 2026-03-04T22:42:20Z*

### Patch Changes

- Updated dependencies [45d4797]
    - @sap-ux/logger@0.8.2

## 1.5.8

*Released: 2026-02-26T10:46:59Z*

### Patch Changes

- 6c993f3: fix: turn off i18next support notice

## 1.5.7

*Released: 2026-02-20T16:17:11Z*

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12

## 1.5.6

*Released: 2026-02-13T16:18:58Z*

### Patch Changes

- 9f94937: support adding full service urls as a new connection type

## 1.5.5

*Released: 2026-02-05T13:53:56Z*

### Patch Changes

- 38e215e: chore(deps): update dependency @zowe/secrets-for-zowe-sdk to v8.29.4

## 1.5.4

*Released: 2026-02-05T11:39:04Z*

### Patch Changes

- 83e3b70: check for presence of legacy systems.json file

## 1.5.3

*Released: 2026-01-30T16:59:27Z*

### Patch Changes

- Updated dependencies [ea7a16c]
    - @sap-ux/logger@0.8.1

## 1.5.2

*Released: 2026-01-28T00:19:05Z*

### Patch Changes

- be6ea11: fix(deps): update dependency i18next to v25.8.0

## 1.5.1

*Released: 2026-01-23T12:49:27Z*

### Patch Changes

- 32f8644: add support for filtering on system info property

## 1.5.0

*Released: 2026-01-16T12:32:24Z*

### Minor Changes

- c9fd939: update backend systems with system info from adt api

## 1.4.2

*Released: 2025-12-19T11:36:13Z*

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/logger@0.8.0

## 1.4.1

*Released: 2025-12-18T21:05:02Z*

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/logger@0.7.3

## 1.4.0

*Released: 2025-12-16T11:43:52Z*

### Minor Changes

- ba58398: adds mandatory props to backend systems and migrates existing

## 1.3.5

*Released: 2025-12-15T10:50:50Z*

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/logger@0.7.2

## 1.3.4

*Released: 2025-12-08T17:56:48Z*

### Patch Changes

- 037a430: fix high severity Sonar issues

## 1.3.3

*Released: 2025-11-05T06:53:42Z*

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/logger@0.7.1

## 1.3.2

*Released: 2025-10-31T13:35:34Z*

### Patch Changes

- cc65eec: adds new vscode sap systems extension

## 1.3.1

*Released: 2025-10-29T17:02:38Z*

### Patch Changes

- ae8dbc6: correction for merging systems added to legacy path

## 1.3.0

*Released: 2025-10-29T11:04:17Z*

### Minor Changes

- 36b0f19: migrate backend system file from .fioritools to .saptools

## 1.2.1

*Released: 2025-10-17T11:37:38Z*

### Patch Changes

- f8c596d: Reverts removal of @sensitiveData for service keys property of backend systems

## 1.2.0

*Released: 2025-10-14T13:22:30Z*

### Minor Changes

- bacaf93: Connections to Abap cloud will always use re-entrance tickets instead of UAA/OAuth2

## 1.1.5

*Released: 2025-10-06T17:09:01Z*

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 1.1.4

*Released: 2025-09-01T12:06:20Z*

### Patch Changes

- 77c1459: fix for returning systems after recovery

## 1.1.3

*Released: 2025-08-21T14:27:46Z*

### Patch Changes

- c6a0062: improve backend system recovery when file read fails

## 1.1.2

*Released: 2025-07-04T15:18:17Z*

### Patch Changes

- 69f62ec: i18next upgrade to 25.3.0

## 1.1.1

*Released: 2025-06-27T07:08:06Z*

### Patch Changes

- 77b3b22: update fiori gen to fetch credentials only upon system selection

## 1.1.0

*Released: 2025-05-14T22:35:53Z*

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/logger@0.7.0

## 1.0.0

*Released: 2024-12-10T16:04:29Z*

### Major Changes

- 3ebd767: Replace keytar with @zowe/secrets-for-zowe-sdk

## 0.9.3

*Released: 2024-11-01T22:26:57Z*

### Patch Changes

- ff75382: No error message for systems with denied keychain access

## 0.9.2

*Released: 2024-10-04T15:21:13Z*

### Patch Changes

- 93f8a83: chore - upgrade typescript 5.6.2

## 0.9.1

*Released: 2024-08-16T14:27:07Z*

### Patch Changes

- 08b788c: export getFioriToolsDirectory, FioriToolsSettings

## 0.9.0

*Released: 2024-08-14T12:04:43Z*

### Minor Changes

- e7a6c68: Load keytar from application modeler extension

## 0.8.0

*Released: 2024-08-14T08:37:46Z*

### Minor Changes

- dced368: Load keytar from application modeler extension

## 0.7.0

*Released: 2024-07-05T15:03:05Z*

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/logger@0.6.0

## 0.6.0

*Released: 2024-06-19T15:33:01Z*

### Minor Changes

- d02be637: Replaces AuthenticationType with const and string literal type

## 0.5.0

*Released: 2024-03-06T14:41:52Z*

### Minor Changes

- e443e534: Allow to disable access to secure storage via environment variable FIORI_TOOLS_DISABLE_SECURE_STORE

## 0.4.3

*Released: 2024-02-27T22:07:50Z*

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json
- Updated dependencies [c15435b6]
    - @sap-ux/logger@0.5.1

## 0.4.2

*Released: 2024-02-08T13:37:06Z*

### Patch Changes

- Updated dependencies [2e0b1a6d]
    - @sap-ux/logger@0.5.0

## 0.4.1

*Released: 2024-02-07T11:10:48Z*

### Patch Changes

- eb0b7b37: Chore - TypeScript 5 upgrade

## 0.4.0

*Released: 2023-10-19T12:06:19Z*

### Minor Changes

- 1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

- Updated dependencies [1aa0fc43]
    - @sap-ux/logger@0.4.0

## 0.3.16

*Released: 2023-10-18T13:59:49Z*

### Patch Changes

- cbcad88d: fix(deps): update dependencies [i18next]

## 0.3.15

*Released: 2023-10-17T08:28:48Z*

### Patch Changes

- 4052822f: Corrected license reference in package.json (no license change)
- Updated dependencies [4052822f]
    - @sap-ux/logger@0.3.9

## 0.3.14

*Released: 2023-09-20T13:13:51Z*

### Patch Changes

- 63c698a8: chore - fix publishing of modules missed in failed release build
- Updated dependencies [63c698a8]
    - @sap-ux/logger@0.3.8

## 0.3.13

*Released: 2023-09-19T15:06:34Z*

### Patch Changes

- 0dbad1b8: chore(deps): update dependency typescript to v4.9.5

## 0.3.12

*Released: 2023-06-27T14:58:54Z*

### Patch Changes

- 4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.
- Updated dependencies [4ba13898]
    - @sap-ux/logger@0.3.7

## 0.3.11

*Released: 2023-06-12T06:59:29Z*

### Patch Changes

- 25911701: Fix for 'promises must be awaited' sonar issues
- Updated dependencies [25911701]
    - @sap-ux/logger@0.3.6

## 0.3.10

*Released: 2023-02-23T13:56:23Z*

### Patch Changes

- d350038: chore - TypeScript 4.9.4 upgrade
- Updated dependencies [d350038]
    - @sap-ux/logger@0.3.5

## 0.3.9

*Released: 2023-02-10T14:09:06Z*

### Patch Changes

- ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues
- Updated dependencies [ed04f6f]
    - @sap-ux/logger@0.3.4

## 0.3.8

*Released: 2022-12-16T11:48:52Z*

### Patch Changes

- Updated dependencies [c6f4c8c]
    - @sap-ux/logger@0.3.3

## 0.3.7

*Released: 2022-12-05T07:50:58Z*

### Patch Changes

- 070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability
- Updated dependencies [070d8dc]
    - @sap-ux/logger@0.3.2

## 0.3.6

*Released: 2022-10-25T02:04:00Z*

### Patch Changes

- 0439760: Upgrade to keytar@7.9.0

## 0.3.5

*Released: 2022-10-11T14:06:32Z*

### Patch Changes

- 5b487ef: chore - Apply linting to test folders and linting fixes
- Updated dependencies [5b487ef]
    - @sap-ux/logger@0.3.1

## 0.3.4

*Released: 2022-09-20T11:29:57Z*

### Patch Changes

- dd98509: New module @sap-ux/ui-components. Remove unused dependencies from @sap-ux/store.

## 0.3.3

*Released: 2022-08-26T23:41:09Z*

### Patch Changes

- Updated dependencies [bc4cb3a]
    - @sap-ux/logger@0.3.0

## 0.3.2

*Released: 2022-07-21T14:10:31Z*

### Patch Changes

- 09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies
- Updated dependencies [09c6eb5]
    - @sap-ux/logger@0.2.2

## 0.3.1

*Released: 2022-07-04T13:03:56Z*

### Patch Changes

- cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm
- Updated dependencies [cc1c406]
    - @sap-ux/logger@0.2.1

## 0.3.0

*Released: 2022-06-24T14:55:09Z*

### Minor Changes

- ebc59b4: Added support for migrating api-hub settings from old to new format.

## 0.2.0

*Released: 2022-06-13T09:53:27Z*

### Minor Changes

- 6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

### Patch Changes

- Updated dependencies [6f51973]
    - @sap-ux/logger@0.2.0

## 0.1.5

*Released: 2022-05-19T14:38:34Z*

### Patch Changes

- c70fd4d: chore(open-ux-tools) pnpm 7 and node 18 support.
- Updated dependencies [c70fd4d]
    - @sap-ux/logger@0.1.6

## 0.1.4

*Released: 2022-05-18T15:24:28Z*

### Patch Changes

- 9f84d52: Intrdocded new backend-proxy-middleware.

## 0.1.3

*Released: 2022-03-29T13:57:37Z*

### Patch Changes

- c18fc5c: chore(open-ux-tools) update devDependencies and change dependabot config
- Updated dependencies [a34d058]
- Updated dependencies [c18fc5c]
    - @sap-ux/logger@0.1.5

## 0.1.2

*Released: 2022-03-24T07:10:57Z*

### Patch Changes

- 0837ac1: Add missing information to package.json and enforced use of higher version of minimist
- Updated dependencies [0837ac1]
    - @sap-ux/logger@0.1.4

## 0.1.1

*Released: 2022-03-22T19:34:16Z*

### Patch Changes

- 7107fbc: chore - use import type in TS code.
- Updated dependencies [7107fbc]
    - @sap-ux/logger@0.1.3

## 0.1.0

*Released: 2022-03-07T19:54:59Z*

### Minor Changes

- 51daada: tbi: add central telemetry settings api to be managed by store

## 0.0.3

*Released: 2022-02-03T20:45:25Z*

### Patch Changes

- 5aff853: fix(security): upgrade keytar module version

## 0.0.2

### Patch Changes

- 6da5408: Add store module
