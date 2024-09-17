# @sap-ux/btp-utils

## 0.15.2

### Patch Changes

-   d3dafeb: FEAT - Add @sap-ux/nodejs-utils module

## 0.15.1

### Patch Changes

-   9c8dc5c: fix: update `axios` to `1.7.4`

## 0.15.0

### Minor Changes

-   c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.14.4

### Patch Changes

-   9a32e102: fix preview reload on SBAS, by exposing livereload server port over url

## 0.14.3

### Patch Changes

-   61b46bc8: Security upgrade fixes

## 0.14.2

### Patch Changes

-   811c4324: Expose types and introduce missing functionality

## 0.14.1

### Patch Changes

-   c15435b6: fix: remove engines pnpm from package.json

## 0.14.0

### Minor Changes

-   0f6e0e1b: Checks if an ABAP target system is on premise to log additional info when deploying.
    Change was made for ABAP developers to see a deployment info message indicating if ABAP target system is on premise.
    So that Developers can update URL to reflect the internal protocol, host and port using on premise configuration

## 0.13.0

### Minor Changes

-   de8a4878: Checks if an ABAP target system is on premise to log additional info when deploying.
    Change was made for ABAP developers to see a deployment info message indicating if ABAP target system is on premise.
    So that Developers can update URL to reflect the internal protocol, host and port using on premise configuration

## 0.12.1

### Patch Changes

-   286883cb: fix(deps): update dependency axios to v1.6.0 [security]

## 0.12.0

### Minor Changes

-   1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

## 0.11.9

### Patch Changes

-   63c698a8: chore - fix publishing of modules missed in failed release build

## 0.11.8

### Patch Changes

-   24e45780: Updated dependency: axios@1.4.0

## 0.11.7

### Patch Changes

-   4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.

## 0.11.6

### Patch Changes

-   25911701: Fix for 'promises must be awaited' sonar issues

## 0.11.5

### Patch Changes

-   d350038: chore - TypeScript 4.9.4 upgrade

## 0.11.4

### Patch Changes

-   ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues

## 0.11.3

### Patch Changes

-   070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability

## 0.11.2

### Patch Changes

-   5b487ef: chore - Apply linting to test folders and linting fixes

## 0.11.1

### Patch Changes

-   b8d5315: Relaxing interfaces when working with destinations.

## 0.11.0

### Minor Changes

-   bc4cb3a: New module @sap-ux/environment-check. Adds additional destination property 'HTML5.DynamicDestination' in @sap-ux/btp-utils

## 0.10.4

### Patch Changes

-   5710cfa: fix handling of full url destinations

## 0.10.3

### Patch Changes

-   09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies

## 0.10.2

### Patch Changes

-   cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm

## 0.10.1

### Patch Changes

-   6f0f217: Fix getting credentials for a destination service

## 0.10.0

### Minor Changes

-   6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

## 0.9.2

### Patch Changes

-   c70fd4d: chore(open-ux-tools) pnpm 7 and node 18 support.

## 0.9.1

### Patch Changes

-   815bf59: Correction of encoding of credentials for destination service instances.

## 0.9.0

### Minor Changes

-   9967c5f: Initial release of reusable modules for system access.
