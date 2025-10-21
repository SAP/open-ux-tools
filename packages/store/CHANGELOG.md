# @sap-ux/store

## 1.2.1

### Patch Changes

-   f8c596d: Reverts removal of @sensitiveData for service keys property of backend systems

## 1.2.0

### Minor Changes

-   bacaf93: Connections to Abap cloud will always use re-entrance tickets instead of UAA/OAuth2

## 1.1.5

### Patch Changes

-   43a2446: chore: fix Sonar issues

## 1.1.4

### Patch Changes

-   77c1459: fix for returning systems after recovery

## 1.1.3

### Patch Changes

-   c6a0062: improve backend system recovery when file read fails

## 1.1.2

### Patch Changes

-   69f62ec: i18next upgrade to 25.3.0

## 1.1.1

### Patch Changes

-   77b3b22: update fiori gen to fetch credentials only upon system selection

## 1.1.0

### Minor Changes

-   a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

-   Updated dependencies [a28357d]
    -   @sap-ux/logger@0.7.0

## 1.0.0

### Major Changes

-   3ebd767: Replace keytar with @zowe/secrets-for-zowe-sdk

## 0.9.3

### Patch Changes

-   ff75382: No error message for systems with denied keychain access

## 0.9.2

### Patch Changes

-   93f8a83: chore - upgrade typescript 5.6.2

## 0.9.1

### Patch Changes

-   08b788c: export getFioriToolsDirectory, FioriToolsSettings

## 0.9.0

### Minor Changes

-   e7a6c68: Load keytar from application modeler extension

## 0.8.0

### Minor Changes

-   dced368: Load keytar from application modeler extension

## 0.7.0

### Minor Changes

-   c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

-   Updated dependencies [c2359077]
    -   @sap-ux/logger@0.6.0

## 0.6.0

### Minor Changes

-   d02be637: Replaces AuthenticationType with const and string literal type

## 0.5.0

### Minor Changes

-   e443e534: Allow to disable access to secure storage via environment variable FIORI_TOOLS_DISABLE_SECURE_STORE

## 0.4.3

### Patch Changes

-   c15435b6: fix: remove engines pnpm from package.json
-   Updated dependencies [c15435b6]
    -   @sap-ux/logger@0.5.1

## 0.4.2

### Patch Changes

-   Updated dependencies [2e0b1a6d]
    -   @sap-ux/logger@0.5.0

## 0.4.1

### Patch Changes

-   eb0b7b37: Chore - TypeScript 5 upgrade

## 0.4.0

### Minor Changes

-   1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

-   Updated dependencies [1aa0fc43]
    -   @sap-ux/logger@0.4.0

## 0.3.16

### Patch Changes

-   cbcad88d: fix(deps): update dependencies [i18next]

## 0.3.15

### Patch Changes

-   4052822f: Corrected license reference in package.json (no license change)
-   Updated dependencies [4052822f]
    -   @sap-ux/logger@0.3.9

## 0.3.14

### Patch Changes

-   63c698a8: chore - fix publishing of modules missed in failed release build
-   Updated dependencies [63c698a8]
    -   @sap-ux/logger@0.3.8

## 0.3.13

### Patch Changes

-   0dbad1b8: chore(deps): update dependency typescript to v4.9.5

## 0.3.12

### Patch Changes

-   4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.
-   Updated dependencies [4ba13898]
    -   @sap-ux/logger@0.3.7

## 0.3.11

### Patch Changes

-   25911701: Fix for 'promises must be awaited' sonar issues
-   Updated dependencies [25911701]
    -   @sap-ux/logger@0.3.6

## 0.3.10

### Patch Changes

-   d350038: chore - TypeScript 4.9.4 upgrade
-   Updated dependencies [d350038]
    -   @sap-ux/logger@0.3.5

## 0.3.9

### Patch Changes

-   ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues
-   Updated dependencies [ed04f6f]
    -   @sap-ux/logger@0.3.4

## 0.3.8

### Patch Changes

-   Updated dependencies [c6f4c8c]
    -   @sap-ux/logger@0.3.3

## 0.3.7

### Patch Changes

-   070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability
-   Updated dependencies [070d8dc]
    -   @sap-ux/logger@0.3.2

## 0.3.6

### Patch Changes

-   0439760: Upgrade to keytar@7.9.0

## 0.3.5

### Patch Changes

-   5b487ef: chore - Apply linting to test folders and linting fixes
-   Updated dependencies [5b487ef]
    -   @sap-ux/logger@0.3.1

## 0.3.4

### Patch Changes

-   dd98509: New module @sap-ux/ui-components. Remove unused dependencies from @sap-ux/store.

## 0.3.3

### Patch Changes

-   Updated dependencies [bc4cb3a]
    -   @sap-ux/logger@0.3.0

## 0.3.2

### Patch Changes

-   09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies
-   Updated dependencies [09c6eb5]
    -   @sap-ux/logger@0.2.2

## 0.3.1

### Patch Changes

-   cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm
-   Updated dependencies [cc1c406]
    -   @sap-ux/logger@0.2.1

## 0.3.0

### Minor Changes

-   ebc59b4: Added support for migrating api-hub settings from old to new format.

## 0.2.0

### Minor Changes

-   6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

### Patch Changes

-   Updated dependencies [6f51973]
    -   @sap-ux/logger@0.2.0

## 0.1.5

### Patch Changes

-   c70fd4d: chore(open-ux-tools) pnpm 7 and node 18 support.
-   Updated dependencies [c70fd4d]
    -   @sap-ux/logger@0.1.6

## 0.1.4

### Patch Changes

-   9f84d52: Intrdocded new backend-proxy-middleware.

## 0.1.3

### Patch Changes

-   c18fc5c: chore(open-ux-tools) update devDependencies and change dependabot config
-   Updated dependencies [a34d058]
-   Updated dependencies [c18fc5c]
    -   @sap-ux/logger@0.1.5

## 0.1.2

### Patch Changes

-   0837ac1: Add missing information to package.json and enforced use of higher version of minimist
-   Updated dependencies [0837ac1]
    -   @sap-ux/logger@0.1.4

## 0.1.1

### Patch Changes

-   7107fbc: chore - use import type in TS code.
-   Updated dependencies [7107fbc]
    -   @sap-ux/logger@0.1.3

## 0.1.0

### Minor Changes

-   51daada: tbi: add central telemetry settings api to be managed by store

## 0.0.3

### Patch Changes

-   5aff853: fix(security): upgrade keytar module version

## 0.0.2

### Patch Changes

-   6da5408: Add store module
