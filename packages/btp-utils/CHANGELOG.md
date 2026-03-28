# @sap-ux/btp-utils

## 1.1.12

### Patch Changes

- 2e17a6b: fix: allow deployment to OnPremise destinations with WebIDEUsage odata_gen

    isAbapSystem now returns true for destinations with ProxyType=OnPremise, fixing deployments that failed with a cryptic 'bind' error when WebIDEUsage was set to odata_gen. deploy-tooling also now surfaces an actionable error message if a non-ABAP provider is resolved.

## 1.1.11

### Patch Changes

- a41533f: chore(btp-utils): fix indentation in boolean expressions (Prettier upgrade autofix)

## 1.1.10

*Released: 2026-03-17T01:04:22Z*

### Patch Changes

- 5d452e5: fix(deps): update dependency nock to v14

## 1.1.9

*Released: 2026-02-16T18:48:13Z*

### Patch Changes

- dd2131c: Axios upgrade from bas-sdk

## 1.1.8

*Released: 2026-02-10T23:50:15Z*

### Patch Changes

- 2fc459c: Upgrade axios

## 1.1.7

*Released: 2026-02-04T22:31:27Z*

### Patch Changes

- 9f11dd2: chore - address audit issues

## 1.1.6

*Released: 2025-12-15T10:50:50Z*

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.

## 1.1.5

*Released: 2025-11-05T06:53:42Z*

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md

## 1.1.4

*Released: 2025-10-06T17:09:01Z*

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 1.1.3

*Released: 2025-09-23T20:14:56Z*

### Patch Changes

- 998954b: Upgrade bas-sdk to get axios updates

## 1.1.2

*Released: 2025-09-19T16:36:41Z*

### Patch Changes

- 9872384: Upgrade axios module

## 1.1.1

*Released: 2025-08-28T13:37:07Z*

### Patch Changes

- 4cfebaf: Update axios module

## 1.1.0

*Released: 2025-05-14T22:35:53Z*

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

## 1.0.3

*Released: 2025-04-14T22:24:07Z*

### Patch Changes

- d638daa: Update @sap/bas-sdk dependency

## 1.0.2

*Released: 2025-03-10T20:40:35Z*

### Patch Changes

- 011c8c5: fix(deps): update dependency axios to v1.8.2 [security]

## 1.0.1

*Released: 2025-02-05T14:44:29Z*

### Patch Changes

- 65f15d9: Fix for btp-utils create dest api mapping. Adds feature CF Abap prompts for BAS.

## 1.0.0

*Released: 2025-02-04T14:25:43Z*

### Major Changes

- 9980073: Updates generateOAuth2UserTokenExchangeDestination API to accomodate multiple use-cases

## 0.18.0

*Released: 2025-01-29T13:31:31Z*

### Minor Changes

- df2d965: new functionality to generate OAuth2TokenExchange BTP destination using cf-tools

## 0.17.2

*Released: 2024-12-17T13:32:02Z*

### Patch Changes

- cb54b44: add CF instance types

## 0.17.1

*Released: 2024-12-04T12:27:41Z*

### Patch Changes

- 2359524: align versions of cf-tools

## 0.17.0

*Released: 2024-11-18T22:28:16Z*

### Minor Changes

- a62ff25: adds new options for listing destinations api

## 0.16.0

*Released: 2024-11-11T17:55:13Z*

### Minor Changes

- 3734fe8: Adds system prompting to `@sap-ux/odata-service-inquirer`

## 0.15.2

*Released: 2024-08-23T10:57:41Z*

### Patch Changes

- d3dafeb: FEAT - Add @sap-ux/nodejs-utils module

## 0.15.1

*Released: 2024-08-19T09:48:14Z*

### Patch Changes

- 9c8dc5c: fix: update `axios` to `1.7.4`

## 0.15.0

*Released: 2024-07-05T15:03:05Z*

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.14.4

*Released: 2024-05-06T12:14:11Z*

### Patch Changes

- 9a32e102: fix preview reload on SBAS, by exposing livereload server port over url

## 0.14.3

*Released: 2024-03-22T08:51:54Z*

### Patch Changes

- 61b46bc8: Security upgrade fixes

## 0.14.2

*Released: 2024-02-28T11:01:55Z*

### Patch Changes

- 811c4324: Expose types and introduce missing functionality

## 0.14.1

*Released: 2024-02-27T22:07:50Z*

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json

## 0.14.0

*Released: 2024-02-21T13:16:24Z*

### Minor Changes

- 0f6e0e1b: Checks if an ABAP target system is on premise to log additional info when deploying.
  Change was made for ABAP developers to see a deployment info message indicating if ABAP target system is on premise.
  So that Developers can update URL to reflect the internal protocol, host and port using on premise configuration

## 0.13.0

*Released: 2024-02-06T09:17:39Z*

### Minor Changes

- de8a4878: Checks if an ABAP target system is on premise to log additional info when deploying.
  Change was made for ABAP developers to see a deployment info message indicating if ABAP target system is on premise.
  So that Developers can update URL to reflect the internal protocol, host and port using on premise configuration

## 0.12.1

*Released: 2023-11-13T08:06:13Z*

### Patch Changes

- 286883cb: fix(deps): update dependency axios to v1.6.0 [security]

## 0.12.0

*Released: 2023-10-19T12:06:19Z*

### Minor Changes

- 1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

## 0.11.9

*Released: 2023-09-20T13:13:51Z*

### Patch Changes

- 63c698a8: chore - fix publishing of modules missed in failed release build

## 0.11.8

*Released: 2023-08-10T12:54:14Z*

### Patch Changes

- 24e45780: Updated dependency: axios@1.4.0

## 0.11.7

*Released: 2023-06-27T14:58:54Z*

### Patch Changes

- 4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.

## 0.11.6

*Released: 2023-06-12T06:59:29Z*

### Patch Changes

- 25911701: Fix for 'promises must be awaited' sonar issues

## 0.11.5

*Released: 2023-02-23T13:56:23Z*

### Patch Changes

- d350038: chore - TypeScript 4.9.4 upgrade

## 0.11.4

*Released: 2023-02-10T14:09:06Z*

### Patch Changes

- ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues

## 0.11.3

*Released: 2022-12-05T07:50:58Z*

### Patch Changes

- 070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability

## 0.11.2

*Released: 2022-10-11T14:06:32Z*

### Patch Changes

- 5b487ef: chore - Apply linting to test folders and linting fixes

## 0.11.1

*Released: 2022-09-08T17:04:29Z*

### Patch Changes

- b8d5315: Relaxing interfaces when working with destinations.

## 0.11.0

*Released: 2022-08-26T23:41:09Z*

### Minor Changes

- bc4cb3a: New module @sap-ux/environment-check. Adds additional destination property 'HTML5.DynamicDestination' in @sap-ux/btp-utils

## 0.10.4

*Released: 2022-08-02T14:32:30Z*

### Patch Changes

- 5710cfa: fix handling of full url destinations

## 0.10.3

*Released: 2022-07-21T14:10:31Z*

### Patch Changes

- 09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies

## 0.10.2

*Released: 2022-07-04T13:03:56Z*

### Patch Changes

- cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm

## 0.10.1

*Released: 2022-06-23T12:02:11Z*

### Patch Changes

- 6f0f217: Fix getting credentials for a destination service

## 0.10.0

*Released: 2022-06-13T09:53:27Z*

### Minor Changes

- 6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

## 0.9.2

*Released: 2022-05-19T14:38:34Z*

### Patch Changes

- c70fd4d: chore(open-ux-tools) pnpm 7 and node 18 support.

## 0.9.1

*Released: 2022-05-16T16:22:38Z*

### Patch Changes

- 815bf59: Correction of encoding of credentials for destination service instances.

## 0.9.0

### Minor Changes

- 9967c5f: Initial release of reusable modules for system access.
