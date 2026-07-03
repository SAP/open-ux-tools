# @sap-ux/axios-extension

## 2.0.5

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

#### Workspace Updates

- @sap-ux/feature-toggle 1.0.3 → 1.0.4
- @sap-ux/btp-utils 2.0.3 → 2.0.4
- @sap-ux/logger 1.0.1 → 1.0.2

## 2.0.4

### Patch Changes

#### Dependency Updates

- Upgrade patch-level dependencies [[aed328d](https://github.com/SAP/open-ux-tools/commit/aed328da8a5c93e226c58e4d7dc14c7c82756259)]

#### Workspace Updates

- @sap-ux/feature-toggle 1.0.2 → 1.0.3
- @sap-ux/btp-utils 2.0.2 → 2.0.3

## 2.0.3

_Released: 2026-06-12T06:53:23Z_

### Patch Changes

- Updated dependencies [41b3908]
    - @sap-ux/feature-toggle@1.0.2

## 2.0.2

_Released: 2026-06-09T14:35:01Z_

### Patch Changes

- Updated dependencies [0fa8305]
    - @sap-ux/btp-utils@2.0.2

## 2.0.1

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/feature-toggle@1.0.1
    - @sap-ux/btp-utils@2.0.1
    - @sap-ux/logger@1.0.1

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
    - @sap-ux/feature-toggle@1.0.0
    - @sap-ux/btp-utils@2.0.0
    - @sap-ux/logger@1.0.0

## 1.26.1

_Released: 2026-05-26T16:40:21Z_

### Patch Changes

- 01b70ca: chore: upgrade qs 6.15.0 → 6.15.2 (GHSA-q8mj-m7cp-5q26)
- Updated dependencies [01b70ca]
    - @sap-ux/btp-utils@1.2.1

## 1.26.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/btp-utils@1.2.0
    - @sap-ux/feature-toggle@0.4.0
    - @sap-ux/logger@0.9.0

## 1.25.37

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/btp-utils@1.1.16
    - @sap-ux/feature-toggle@0.3.9
    - @sap-ux/logger@0.8.6

## 1.25.36

_Released: 2026-05-13T09:36:59Z_

### Patch Changes

- 21abda3: chore: upgrade fast-xml-parser 5.7.2 → 5.8.0 (fixes fast-xml-builder CVE-2025-47916)

## 1.25.35

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- 678a08e: chore: upgrade axios 1.15.0 → 1.16.0 (CVE-2025-62718, CVE prototype pollution fixes)
- Updated dependencies [678a08e]
    - @sap-ux/btp-utils@1.1.15

## 1.25.34

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- c160401: fix: SONAR issues

## 1.25.33

_Released: 2026-04-29T15:24:37Z_

### Patch Changes

- 3945459: chore: upgrade fast-xml-parser 5.5.9 to 5.7.2 (security fix for XML comment/CDATA injection)
- 3945459: chore: upgrade @xmldom/xmldom 0.8.12 to 0.8.13 (security fix for XML injection vulnerabilities)

## 1.25.32

_Released: 2026-04-23T06:48:55Z_

### Patch Changes

- 237371b: fix(axios-extension): export EntitySetData type
  feat(fiori-generator-shared): add ExternalServiceConfig headless type supporting metadata and entityData as inline values or file paths
  feat(fiori-app-sub-generator): resolve external service metadata and entityData file paths in headless generator before passing to writer

## 1.25.31

_Released: 2026-04-14T20:26:28Z_

### Patch Changes

- Updated dependencies [ee68603]
    - @sap-ux/btp-utils@1.1.14

## 1.25.30

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- cc4450c: chore: upgrade axios 1.13.6 → 1.15.0 (security fix GHSA-3p68-rc4w-qgx5, GHSA-fvcv-3m26-pcqx)
- Updated dependencies [cc4450c]
    - @sap-ux/btp-utils@1.1.13

## 1.25.29

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- f1e4481: chore: upgrade lodash 4.17.23 → 4.18.1 (CVE security fix, vulnerable range <=4.17.23)
- f1e4481: chore(axios-extension): upgrade @xmldom/xmldom 0.8.11 → 0.8.12 (security fix)
- Updated dependencies [f1e4481]
    - @sap-ux/logger@0.8.5
    - @sap-ux/btp-utils@1.1.12

## 1.25.28

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(axios-extension): upgrade shared devDependencies (jest 30, axios 1.13.6, ws 8.20.0)
- Updated dependencies [c53a4ba]
- Updated dependencies [c53a4ba]
    - @sap-ux/feature-toggle@0.3.8
    - @sap-ux/logger@0.8.4
    - @sap-ux/btp-utils@1.1.12

## 1.25.27

_Released: 2026-03-27T11:58:49Z_

### Patch Changes

- Updated dependencies [2e17a6b]
    - @sap-ux/btp-utils@1.1.12

## 1.25.26

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: chore(axios-extension): upgrade runtime dependencies (axios 1.13.6, fast-xml-parser 5.5.9, qs 6.15.0, xpath 0.0.34, @xmldom/xmldom 0.8.11)
- Updated dependencies [a41533f]
- Updated dependencies [a41533f]
    - @sap-ux/btp-utils@1.1.11
    - @sap-ux/logger@0.8.3

## 1.25.25

_Released: 2026-03-23T18:25:40Z_

### Patch Changes

- c0e05ab: Updates catalog services dedup logic to include url

## 1.25.24

_Released: 2026-03-17T07:55:04Z_

### Patch Changes

- a854433: feat: Handle i18n translations from key user changes in ADP generator

## 1.25.23

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 5d452e5: fix(deps): update dependency nock to v14
- Updated dependencies [5d452e5]
    - @sap-ux/btp-utils@1.1.10

## 1.25.22

_Released: 2026-03-05T23:21:37Z_

### Patch Changes

- 2d21925: fix(deps): Update dependency open to v8.4.2 (latest CommonJS version)

## 1.25.21

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- 7c06ef0: fix(deps): update dependencies [open-ux-odata]

## 1.25.20

_Released: 2026-03-04T22:42:20Z_

### Patch Changes

- Updated dependencies [45d4797]
    - @sap-ux/logger@0.8.2
    - @sap-ux/btp-utils@1.1.9

## 1.25.19

_Released: 2026-03-04T15:52:08Z_

### Patch Changes

- 96e9b9e: fix(deps): update dependency open to v7.4.2

## 1.25.18

_Released: 2026-03-03T08:27:12Z_

### Patch Changes

- 4af92b5: add node: proto prefix to imports

## 1.25.17

_Released: 2026-02-27T15:42:39Z_

### Patch Changes

- ca2566b: Update fast-xml-parser

    Issue: #37278

## 1.25.16

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- c043712: fix(deps): update dependency supertest to v7.2.2

## 1.25.15

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- Updated dependencies [d588c26]
    - @sap-ux/feature-toggle@0.3.7

## 1.25.14

_Released: 2026-02-18T21:45:35Z_

### Patch Changes

- d57cc47: Update fast-xml-parser

## 1.25.13

_Released: 2026-02-16T18:48:13Z_

### Patch Changes

- Updated dependencies [dd2131c]
    - @sap-ux/btp-utils@1.1.9

## 1.25.12

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- bda7356: fix(deps): update dependency qs to v6.14.2 [security]

## 1.25.11

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- 2fc459c: Upgrade axios
- Updated dependencies [2fc459c]
    - @sap-ux/btp-utils@1.1.8

## 1.25.10

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- Updated dependencies [9f11dd2]
    - @sap-ux/feature-toggle@0.3.6
    - @sap-ux/btp-utils@1.1.7

## 1.25.9

_Released: 2026-02-03T15:42:23Z_

### Patch Changes

- 89175fe: fix(deps): update dependency fast-xml-parser to v5 [security]

## 1.25.8

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- ea7a16c: Fix Extend lodash vulnerability
- Updated dependencies [ea7a16c]
    - @sap-ux/logger@0.8.1
    - @sap-ux/btp-utils@1.1.6

## 1.25.7

_Released: 2026-01-26T09:14:13Z_

### Patch Changes

- 0492325: feat(generator-adp): Developer taking over Key-User changes

## 1.25.6

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- e111d0d: fix sonar issues

## 1.25.5

_Released: 2026-01-08T17:12:17Z_

### Patch Changes

- 2204ad3: fix(deps): update dependencies @sap-ux/annotation-converter to v0.10.19 and @sap-ux/vocabularies-types to v0.14.5

## 1.25.4

_Released: 2026-01-07T16:03:58Z_

### Patch Changes

- 4e0f204: update dependency qs to v6.14.1 [security]

## 1.25.3

_Released: 2025-12-22T17:36:43Z_

### Patch Changes

- 14a1bc2: Refactor generateServiceConfig to use Object.assign

## 1.25.2

_Released: 2025-12-19T11:36:13Z_

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/logger@0.8.0
    - @sap-ux/btp-utils@1.1.6

## 1.25.1

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/logger@0.7.3
    - @sap-ux/btp-utils@1.1.6

## 1.25.0

_Released: 2025-12-18T08:56:52Z_

### Minor Changes

- 5287327: Updated @sap-ux/annotation-converter to version 0.10.9 and @sap-ux/vocabularies-types to version 0.13.2 across multiple packages. These changes ensure that the latest versions with potential fixes and enhancements are used.

## 1.24.6

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/feature-toggle@0.3.5
    - @sap-ux/btp-utils@1.1.6
    - @sap-ux/logger@0.7.2

## 1.24.5

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- 037a430: fix high severity Sonar issues

## 1.24.4

_Released: 2025-12-08T11:51:00Z_

### Patch Changes

- f71a139: fix(adp): Problems with login in the Replace OData Service change editor.

## 1.24.3

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- 5d0598d: feat: save service metadata referenced in ValueListReferences and CodeList annotations.

## 1.24.2

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- Updated dependencies [cfe9c13]
    - @sap-ux/feature-toggle@0.3.4
    - @sap-ux/btp-utils@1.1.5
    - @sap-ux/logger@0.7.1

## 1.24.1

_Released: 2025-10-30T10:09:21Z_

### Patch Changes

- 3253294: encode service name to get service url

## 1.24.0

_Released: 2025-10-28T13:36:39Z_

### Minor Changes

- cdeb18b: feat: Integrate a new ABAP api for retrieval of the UI5 framework version for a system in the ADP generator.

## 1.23.1

_Released: 2025-10-22T18:56:41Z_

### Patch Changes

- Updated dependencies [fa9580c]
    - @sap-ux/feature-toggle@0.3.3

## 1.23.0

_Released: 2025-10-14T13:22:30Z_

### Minor Changes

- bacaf93: Connections to Abap cloud will always use re-entrance tickets instead of UAA/OAuth2

### Patch Changes

- Updated dependencies [bacaf93]
    - @sap-ux/feature-toggle@0.3.2

## 1.22.10

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/btp-utils@1.1.4

## 1.22.9

_Released: 2025-09-23T20:14:56Z_

### Patch Changes

- Updated dependencies [998954b]
    - @sap-ux/btp-utils@1.1.3

## 1.22.8

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- 9872384: Upgrade axios module
- Updated dependencies [9872384]
    - @sap-ux/btp-utils@1.1.2

## 1.22.7

_Released: 2025-09-02T13:22:05Z_

### Patch Changes

- Updated dependencies [04d2103]
    - @sap-ux/feature-toggle@0.3.1

## 1.22.6

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- 4cfebaf: Update axios module
- Updated dependencies [4cfebaf]
    - @sap-ux/btp-utils@1.1.1

## 1.22.5

_Released: 2025-08-01T13:45:39Z_

### Patch Changes

- 9f10a60: Use `ZLOCAL` to determine local packages and multiple minor bug fixes

## 1.22.4

_Released: 2025-07-28T08:36:50Z_

### Patch Changes

- ffac61c: Improved performance of v4 catalog service loading

## 1.22.3

_Released: 2025-06-24T07:18:46Z_

### Patch Changes

- f9ea9e3: feat: Enhance ADP FLP configuration generator

## 1.22.2

_Released: 2025-06-23T22:19:01Z_

### Patch Changes

- 14214a3: Cleanup documentation

## 1.22.1

_Released: 2025-06-19T10:31:56Z_

### Patch Changes

- a9f1808: Disable proxy for BAS

## 1.22.0

_Released: 2025-06-19T04:44:24Z_

### Minor Changes

- aaf0c14: support rap service generation

## 1.21.4

_Released: 2025-06-11T12:23:45Z_

### Patch Changes

- b45093b: Revert toggle, required to support BAS CLI flows

## 1.21.3

_Released: 2025-06-10T17:08:16Z_

### Patch Changes

- 4303f99: fix(axios): Disable System info params encoding

## 1.21.2

_Released: 2025-06-04T10:59:54Z_

### Patch Changes

- 61d4060: use accept header for service generator content request from config

## 1.21.1

_Released: 2025-05-23T13:35:39Z_

### Patch Changes

- 2224d63: Remove feature toggle, required to enable HTTPS proxy configurations

## 1.21.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/feature-toggle@0.3.0
    - @sap-ux/btp-utils@1.1.0
    - @sap-ux/logger@0.7.0

## 1.20.3

_Released: 2025-05-13T10:46:10Z_

### Patch Changes

- Updated dependencies [5585f0d]
    - @sap-ux/feature-toggle@0.2.4

## 1.20.2

_Released: 2025-05-02T10:00:21Z_

### Patch Changes

- 1a01c5e: Update README.adoc showing how to use proxy credentials

## 1.20.1

_Released: 2025-04-30T08:50:36Z_

### Patch Changes

- a3a43b2: Append warning message if the BSP properties do not match the deployed BSP properties

## 1.20.0

_Released: 2025-04-15T14:18:17Z_

### Minor Changes

- 28c6594: Added a new sub-generator: `@sap-ux/repo-app-download-sub-generator` to support downloading ABAP deployed Fiori apps from the repository. Enhanced `@sap-ux/axios-extension` to support Base64 download data.

## 1.19.3

_Released: 2025-04-14T22:24:07Z_

### Patch Changes

- Updated dependencies [d638daa]
    - @sap-ux/btp-utils@1.0.3

## 1.19.2

_Released: 2025-03-26T12:15:41Z_

### Patch Changes

- ced5edf: feat(generator-adp): Create a yeoman package for Adaptation Project generator

## 1.19.1

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- 011c8c5: fix(deps): update dependency axios to v1.8.2 [security]
- Updated dependencies [011c8c5]
    - @sap-ux/btp-utils@1.0.2

## 1.19.0

_Released: 2025-03-03T08:50:39Z_

### Minor Changes

- aaa432a: Export patchTls from `sap-ux/axios-extension`

## 1.18.6

_Released: 2025-02-17T11:44:22Z_

### Patch Changes

- 4fd3029: Allow using an alias for the reentrance url

## 1.18.5

_Released: 2025-02-05T14:44:29Z_

### Patch Changes

- Updated dependencies [65f15d9]
    - @sap-ux/btp-utils@1.0.1

## 1.18.4

_Released: 2025-02-04T14:25:43Z_

### Patch Changes

- Updated dependencies [9980073]
    - @sap-ux/btp-utils@1.0.0

## 1.18.3

_Released: 2025-01-29T13:31:31Z_

### Patch Changes

- Updated dependencies [df2d965]
    - @sap-ux/btp-utils@0.18.0

## 1.18.2

_Released: 2025-01-28T10:44:06Z_

### Patch Changes

- e516306: Handle partial deployment timeout by updating repo on second retry when timeout occurs.

## 1.18.1

_Released: 2025-01-14T16:54:17Z_

### Patch Changes

- 1559aee: add entry for s4 hana cloud urls with .lab

## 1.18.0

_Released: 2025-01-08T10:44:36Z_

### Minor Changes

- 2e3c15e: Proper check for cloud ABAP systems

## 1.17.8

_Released: 2024-12-17T13:32:02Z_

### Patch Changes

- Updated dependencies [cb54b44]
    - @sap-ux/btp-utils@0.17.2

## 1.17.7

_Released: 2024-12-10T10:48:59Z_

### Patch Changes

- 727fd86: Fix v4 odata services not paged

## 1.17.6

_Released: 2024-12-04T12:27:41Z_

### Patch Changes

- Updated dependencies [2359524]
    - @sap-ux/btp-utils@0.17.1

## 1.17.5

_Released: 2024-12-04T11:05:53Z_

### Patch Changes

- Updated dependencies [d04a40e]
    - @sap-ux/feature-toggle@0.2.3

## 1.17.4

_Released: 2024-11-18T22:28:16Z_

### Patch Changes

- Updated dependencies [a62ff25]
    - @sap-ux/btp-utils@0.17.0

## 1.17.3

_Released: 2024-11-17T22:14:47Z_

### Patch Changes

- 8237f83: feat: add namespaces to annotation template

## 1.17.2

_Released: 2024-11-11T17:55:13Z_

### Patch Changes

- Updated dependencies [3734fe8]
    - @sap-ux/btp-utils@0.16.0

## 1.17.1

_Released: 2024-11-08T15:21:08Z_

### Patch Changes

- 7551316: Small text cleanups

## 1.17.0

_Released: 2024-11-07T09:36:42Z_

### Minor Changes

- 0120dda: Handle HTTP(S) proxy configurations

## 1.16.7

_Released: 2024-10-22T09:03:13Z_

### Patch Changes

- 9bda640: CPE loading changes from backend and not from workspace

## 1.16.6

_Released: 2024-09-11T10:59:39Z_

### Patch Changes

- aa72f3c: Fix preview adp project with component dependencies

## 1.16.5

_Released: 2024-08-23T10:57:41Z_

### Patch Changes

- Updated dependencies [d3dafeb]
    - @sap-ux/btp-utils@0.15.2

## 1.16.4

_Released: 2024-08-19T09:48:14Z_

### Patch Changes

- 9c8dc5c: fix: update `axios` to `1.7.4`
- Updated dependencies [9c8dc5c]
    - @sap-ux/btp-utils@0.15.1

## 1.16.3

_Released: 2024-08-07T08:31:04Z_

### Patch Changes

- 0084205: linting: use optional chaining operator ?

## 1.16.2

_Released: 2024-08-01T17:28:17Z_

### Patch Changes

- e69db46: Upgrade fast-xml-parser

## 1.16.1

_Released: 2024-07-25T12:05:28Z_

### Patch Changes

- ad9b56d: Extend axios-extension services

## 1.16.0

_Released: 2024-07-18T09:34:40Z_

### Minor Changes

- 3a878f3: Add support for abap cds view service generation

## 1.15.1

_Released: 2024-07-05T16:16:30Z_

### Patch Changes

- abf491a7: add service type to catalog request results

## 1.15.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/btp-utils@0.15.0
    - @sap-ux/logger@0.6.0

## 1.14.4

_Released: 2024-07-01T14:53:05Z_

### Patch Changes

- 4492fe10: fix for ui service generation response parsing

## 1.14.3

_Released: 2024-07-01T13:51:23Z_

### Patch Changes

- d5d3626c: chore - Update to "qs": "6.11.0"

## 1.14.2

_Released: 2024-06-27T07:14:34Z_

### Patch Changes

- 65bfb244: Add Adaptation Project's Change Data Source generator prompting

## 1.14.1

_Released: 2024-06-26T11:28:03Z_

### Patch Changes

- 844e79c4: fix for v2 catalog services

## 1.14.0

_Released: 2024-06-26T10:58:33Z_

### Minor Changes

- 31cc53f8: Use new api endpoint for ui service generator

## 1.13.1

_Released: 2024-06-11T10:45:47Z_

### Patch Changes

- 869c1c0d: Prevents overwriting axios config params

## 1.13.0

_Released: 2024-06-06T11:57:02Z_

### Minor Changes

- b2ee99fc: Updates how service specific annotations are requested

## 1.12.6

_Released: 2024-05-29T09:49:51Z_

### Patch Changes

- 558891c2: cleanup logging statment

## 1.12.5

_Released: 2024-05-29T09:17:16Z_

### Patch Changes

- 69282b7d: add cookies for embedded steampunk service providers

## 1.12.4

_Released: 2024-05-22T13:22:39Z_

### Patch Changes

- 6e3d4da4: Add config needed in BAS

## 1.12.3

_Released: 2024-05-14T06:33:50Z_

### Patch Changes

- 19ec0f01: FIX: corrected scenario ID for S/4HANA Cloud Public Edition 2408 and onward

## 1.12.2

_Released: 2024-05-14T05:14:21Z_

### Patch Changes

- a41bbd95: Use correct param in business object request, add new exports

## 1.12.1

_Released: 2024-05-10T13:30:56Z_

### Patch Changes

- 1b5f7442: feat(axios-extension): Add PATH to debug output

## 1.12.0

_Released: 2024-05-08T23:06:17Z_

### Minor Changes

- 312919ec: Add new adt services for ui service generation and publish

## 1.11.9

_Released: 2024-05-06T12:14:11Z_

### Patch Changes

- Updated dependencies [9a32e102]
    - @sap-ux/btp-utils@0.14.4

## 1.11.8

_Released: 2024-05-03T11:18:51Z_

### Patch Changes

- 56b77fd9: fix: isS4Cloud returned wrong value when checking a development client

## 1.11.7

_Released: 2024-04-23T06:17:08Z_

### Patch Changes

- 31f5027c: Rename SCENARIO to FIORI_TOOLS_SCENARIO

## 1.11.6

_Released: 2024-04-12T08:47:33Z_

### Patch Changes

- 080e7b06: enhance lrep log messages

## 1.11.5

_Released: 2024-04-10T11:03:28Z_

### Patch Changes

- 1db4c60c: FIX: use correct url for reentrance tickets and enhance config to support it

## 1.11.4

_Released: 2024-03-22T08:51:54Z_

### Patch Changes

- 61b46bc8: Security upgrade fixes
- Updated dependencies [61b46bc8]
    - @sap-ux/btp-utils@0.14.3

## 1.11.3

_Released: 2024-02-28T11:01:55Z_

### Patch Changes

- Updated dependencies [811c4324]
    - @sap-ux/btp-utils@0.14.2

## 1.11.2

_Released: 2024-02-27T22:07:50Z_

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json
- Updated dependencies [c15435b6]
    - @sap-ux/btp-utils@0.14.1
    - @sap-ux/logger@0.5.1

## 1.11.1

_Released: 2024-02-23T08:01:15Z_

### Patch Changes

- efd2f6d4: Support ui5 version 1.71.\* in CPE.

## 1.11.0

_Released: 2024-02-21T13:16:24Z_

### Minor Changes

- 0f6e0e1b: Checks if an ABAP target system is on premise to log additional info when deploying.
  Change was made for ABAP developers to see a deployment info message indicating if ABAP target system is on premise.
  So that Developers can update URL to reflect the internal protocol, host and port using on premise configuration

### Patch Changes

- Updated dependencies [0f6e0e1b]
    - @sap-ux/btp-utils@0.14.0

## 1.10.2

_Released: 2024-02-20T12:39:56Z_

### Patch Changes

- 64f9c513: adds more concise logging of error from xml response

## 1.10.1

_Released: 2024-02-08T13:37:06Z_

### Patch Changes

- Updated dependencies [2e0b1a6d]
    - @sap-ux/logger@0.5.0

## 1.10.0

_Released: 2024-02-06T22:32:34Z_

### Minor Changes

- ecd5275d: fix log info order, remove showAddInfo

## 1.9.0

_Released: 2024-02-06T09:17:39Z_

### Minor Changes

- de8a4878: Checks if an ABAP target system is on premise to log additional info when deploying.
  Change was made for ABAP developers to see a deployment info message indicating if ABAP target system is on premise.
  So that Developers can update URL to reflect the internal protocol, host and port using on premise configuration

### Patch Changes

- Updated dependencies [de8a4878]
    - @sap-ux/btp-utils@0.13.0

## 1.8.1

_Released: 2024-01-16T14:33:35Z_

### Patch Changes

- 3000e8f4: adds additional log for deployment

## 1.8.0

_Released: 2024-01-16T12:59:00Z_

### Minor Changes

- 62232236: Use token for connecting to ABAP Cloud

## 1.7.3

_Released: 2023-11-13T08:06:13Z_

### Patch Changes

- 286883cb: fix(deps): update dependency axios to v1.6.0 [security]
- Updated dependencies [286883cb]
    - @sap-ux/btp-utils@0.12.1

## 1.7.2

_Released: 2023-11-09T16:10:49Z_

### Patch Changes

- db918804: App name with namespace (e.g. /NS/APPNAME) needs to be URI encoded in the UI% ABAP repository delete service request URL.

## 1.7.1

_Released: 2023-10-25T10:10:33Z_

### Patch Changes

- fa4537b2: cleanup how baseURL is used to deteremine if the service is created with a destination

## 1.7.0

_Released: 2023-10-20T09:47:31Z_

### Minor Changes

- aa2ff95b: Enhanced LREP and UI5_ABAP_REPO services to support deployment of adaptation projects

## 1.6.1

_Released: 2023-10-19T14:36:06Z_

### Patch Changes

- 3cfaba52: Apply additional logging if the endpoint is a destination

## 1.6.0

_Released: 2023-10-19T12:06:19Z_

### Minor Changes

- 1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

- Updated dependencies [1aa0fc43]
    - @sap-ux/btp-utils@0.12.0
    - @sap-ux/logger@0.4.0

## 1.5.1

_Released: 2023-10-17T08:28:48Z_

### Patch Changes

- Updated dependencies [4052822f]
    - @sap-ux/logger@0.3.9

## 1.5.0

_Released: 2023-10-16T17:12:59Z_

### Minor Changes

- d7492b53: Instead of returning empty array, `TransportChecksService.getTransportRequests()` now throws a specific error if input package is a local package. Consumer can check if
  the error message string equals `TransportChecksService.LocalPackageError`. This fix is to correctly identify
  local package because non-local package that is not associated with any transport request can also return emtpy array.

## 1.4.8

_Released: 2023-09-20T15:32:03Z_

### Patch Changes

- 0760c9f8: Support UAA credentials if available

## 1.4.7

_Released: 2023-09-20T13:13:51Z_

### Patch Changes

- 63c698a8: chore - fix publishing of modules missed in failed release build
- Updated dependencies [63c698a8]
    - @sap-ux/btp-utils@0.11.9
    - @sap-ux/logger@0.3.8

## 1.4.6

_Released: 2023-09-19T16:14:25Z_

### Patch Changes

- 7b156515: fix(deps): update dependency xpath to v0.0.33

## 1.4.5

_Released: 2023-09-19T15:51:30Z_

### Patch Changes

- 01fa690e: fix(deps): update dependency @xmldom/xmldom to v0.8.10

## 1.4.4

_Released: 2023-09-08T14:35:37Z_

### Patch Changes

- 676f8ba0: Note for customer to replace url with destination url.

## 1.4.3

_Released: 2023-09-01T07:49:28Z_

### Patch Changes

- 6e403f27: fix(deps): update dependency fast-xml-parser to v4.2.7

## 1.4.2

_Released: 2023-08-24T15:31:47Z_

### Patch Changes

- 29e71f68: Remove unnecessary uri encoding on the package name within ADT service query implementation `getTransportRequests`.

## 1.4.1

_Released: 2023-08-10T12:54:14Z_

### Patch Changes

- 24e45780: Updated dependency: axios@1.4.0
- Updated dependencies [24e45780]
    - @sap-ux/btp-utils@0.11.8

## 1.4.0

_Released: 2023-07-20T22:24:17Z_

### Minor Changes

- d2fd9a58: Enhanced LREP service to support merging of app descriptor variants

## 1.3.6

_Released: 2023-07-18T17:23:22Z_

### Patch Changes

- 23059e62: log longtext_url as clickable link

## 1.3.5

_Released: 2023-07-17T22:41:30Z_

### Patch Changes

- 69b88bcc: TransportChecksService API method `getTransportRequests` now encodes the packageName within its implementation.

## 1.3.4

_Released: 2023-07-14T13:06:36Z_

### Patch Changes

- da6fbb04: remove trailing slash from uaa url

## 1.3.3

_Released: 2023-06-28T08:45:23Z_

### Patch Changes

- 1599efac: encode app name for tr requests

## 1.3.2

_Released: 2023-06-27T14:58:54Z_

### Patch Changes

- 4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.
- Updated dependencies [4ba13898]
    - @sap-ux/btp-utils@0.11.7
    - @sap-ux/logger@0.3.7

## 1.3.1

_Released: 2023-06-26T15:34:40Z_

### Patch Changes

- d9355692: Upgrade vulnerable modules semver and fast-xml-parser

## 1.3.0

_Released: 2023-06-19T08:09:28Z_

### Minor Changes

- 42dc7395: handle btp uaa credentials

## 1.2.8

_Released: 2023-06-12T06:59:29Z_

### Patch Changes

- 25911701: Fix for 'promises must be awaited' sonar issues
- Updated dependencies [25911701]
    - @sap-ux/btp-utils@0.11.6
    - @sap-ux/logger@0.3.6

## 1.2.7

_Released: 2023-06-09T06:11:17Z_

### Patch Changes

- e4f9748b: Upgrade vulnerable module fast-xml-parser

## 1.2.6

_Released: 2023-06-06T13:23:15Z_

### Patch Changes

- 2d279633: handle 401 for undeployment

## 1.2.5

_Released: 2023-05-31T11:36:12Z_

### Patch Changes

- aeb4cd83: handle entry severity in logging

## 1.2.4

_Released: 2023-05-16T12:35:03Z_

### Patch Changes

- aeba5509: Better error logging when test mode is enabled

## 1.2.3

_Released: 2023-05-10T20:24:42Z_

### Patch Changes

- 31eb27c4: Only eject the fetch request interceptor when a valid csrf token is received

## 1.2.2

_Released: 2023-04-25T14:46:05Z_

### Patch Changes

- fa94bfd6: Only eject the fetch request interceptor when a valid csrf token is received

## 1.2.1

_Released: 2023-04-19T18:02:21Z_

### Patch Changes

- 3d3d8c64: Fixes for unsage usage of optional chaining sonar bugs

## 1.2.0

_Released: 2023-04-17T14:44:21Z_

### Minor Changes

- c775d787: This change implements a new ADT service `FileStoreService`.
  `FileStoreService` supports querying the file structure and file content in a deployed Fiori app archive.

    Example use case:

    ```
    const fileStoreService = await provider.getAdtService<FileStoreService>(FileStoreService);
    // Fetch a list of files and folders in the app's root folder.
    const rootFolderContent = await fileStoreService.getAppArchiveContent('folder' 'ZFIORIAPP');
    // Fetch a list of files and folders in <root>/webapp
    const webappFolderContent = await fileStoreService.getAppArchiveContent('folder' 'ZFIORIAPP', '/webapp');
    // Fetch the text content as string from <root>/package.json file.
    const fileContent = await fileStoreService.getAppArchiveContent('file' 'ZFIORIAPP', '/package.json');
    ```

## 1.1.0

_Released: 2023-04-03T13:53:13Z_

### Minor Changes

- 0fa9c31e: Show destination URL property as public facing URL

## 1.0.3

_Released: 2023-03-03T18:59:12Z_

### Patch Changes

- 7fd2810: improved logging

## 1.0.2

_Released: 2023-02-28T11:20:19Z_

### Patch Changes

- 8e059ae: consider segment parameters in service uri

## 1.0.1

_Released: 2023-02-23T13:56:23Z_

### Patch Changes

- d350038: chore - TypeScript 4.9.4 upgrade
- Updated dependencies [d350038]
    - @sap-ux/logger@0.3.5
    - @sap-ux/btp-utils@0.11.5

## 1.0.0

_Released: 2023-02-22T17:18:23Z_

### Major Changes

- 77ac998: Added a new AdtService class: ListPackageService. It provides API function
  `listPackages({maxResult: number, phrase: string})` which returns all existing package names that
  has prefix matching input parameter `phrase`.

    ```javascript
    const listPackageService = (await provider.getAdtService) < ListPackageService > ListPackageService;
    const packages = await listPackageService.listPackages({ maxResult: 50, phrase: 'Z_' });
    ```

## 0.14.1

_Released: 2023-02-10T14:09:06Z_

### Patch Changes

- ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues
- Updated dependencies [ed04f6f]
    - @sap-ux/btp-utils@0.11.4
    - @sap-ux/logger@0.3.4

## 0.14.0

_Released: 2022-12-22T09:52:07Z_

### Minor Changes

- 3748963: minor bug fix

## 0.13.4

_Released: 2022-12-16T11:48:52Z_

### Patch Changes

- Updated dependencies [c6f4c8c]
    - @sap-ux/logger@0.3.3

## 0.13.3

_Released: 2022-12-16T00:26:20Z_

### Patch Changes

- b727719: chore(open-ux-tools) upgrade @xmldom/xmldom

## 0.13.2

_Released: 2022-12-07T07:48:12Z_

### Patch Changes

- 5589854: Upgrade qs module and the modules using it because of a potential Denial of Service vulnerabity

## 0.13.1

_Released: 2022-12-05T07:50:58Z_

### Patch Changes

- 070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability
- Updated dependencies [070d8dc]
    - @sap-ux/btp-utils@0.11.3
    - @sap-ux/logger@0.3.2

## 0.13.0

_Released: 2022-11-17T07:22:49Z_

### Minor Changes

- 9b9b3d7: - Changed TransportRequestService implementation and API for creating new transport request number.
    - New TransportRequestService API now requires two extra input parameters `packageName` and `appName`.

## 0.12.0

_Released: 2022-11-16T17:10:24Z_

### Minor Changes

- 116ff5e: Changing API for deployment to be more flexible for different consumer use cases

## 0.11.1

_Released: 2022-11-02T14:24:56Z_

### Patch Changes

- 703dc96: Upgrade @xmldom/xmldom dependency to fix security vulnerability CVE-2022-39353

## 0.11.0

_Released: 2022-10-26T17:24:19Z_

### Minor Changes

- f4ab2cd: - Added ADT service for create transport request
    - Modified API to query ADT service. Now ADT services are obtained by calling the following getAdtService() method. E.g.
      const transportRequestSerivce = abapServiceProvider.getAdtService<TransportRequestService>(TransportRequestService);
      transportRequestSerivce.getTransportRequestList(...);
    - Modified API for AbapServiceProvider APIs:
      ui5AbapRepository() > getUi5AbapRepository()
      appIndex() > getAppIndex()
      layeredRepository() > getLayeredRepository()

## 0.10.3

_Released: 2022-10-21T07:04:47Z_

### Patch Changes

- f3cbe4d: Remove dependency to i18n libraries in Yaml module

## 0.10.2

_Released: 2022-10-12T08:59:54Z_

### Patch Changes

- 9820cef: Upgrade @xmldom/xmldom dependency to fix security vulnerability CVE-2022-37616

## 0.10.1

_Released: 2022-10-11T14:06:32Z_

### Patch Changes

- 5b487ef: chore - Apply linting to test folders and linting fixes
- Updated dependencies [5b487ef]
    - @sap-ux/btp-utils@0.11.2
    - @sap-ux/logger@0.3.1

## 0.10.0

_Released: 2022-10-05T17:11:40Z_

### Minor Changes

- 8778cbd: Change API of ADT request getTransportRequests to return transport req metadata associated with transport numbers

## 0.9.8

_Released: 2022-09-20T15:47:25Z_

### Patch Changes

- fac7a5a: Replaced usage of express with simple code to reduce installation size.

## 0.9.7

_Released: 2022-09-08T17:04:29Z_

### Patch Changes

- b8d5315: Relaxing interfaces when working with destinations.
- Updated dependencies [b8d5315]
    - @sap-ux/btp-utils@0.11.1

## 0.9.6

_Released: 2022-08-29T06:06:57Z_

### Patch Changes

- 12e4686: Fix handling of special characters in xml encode deployment payload

## 0.9.5

_Released: 2022-08-26T23:41:09Z_

### Patch Changes

- Updated dependencies [bc4cb3a]
    - @sap-ux/btp-utils@0.11.0
    - @sap-ux/logger@0.3.0

## 0.9.4

_Released: 2022-08-25T08:03:54Z_

### Patch Changes

- 2896b77: Fixed incorrect url parameter

## 0.9.3

_Released: 2022-08-24T14:12:45Z_

### Patch Changes

- 4342e1a: Fix: incorrect error thrown catalog service

## 0.9.2

_Released: 2022-08-16T17:30:03Z_

### Patch Changes

- d7b3e4f: Fixed issues with fetching annotations based on a service path

## 0.9.1

_Released: 2022-08-02T14:32:30Z_

### Patch Changes

- Updated dependencies [5710cfa]
    - @sap-ux/btp-utils@0.10.4

## 0.9.0

_Released: 2022-07-25T18:08:51Z_

### Minor Changes

- 49dcf36: Supports establishing abap connection from existing cookies without auth.

## 0.8.1

_Released: 2022-07-21T14:10:31Z_

### Patch Changes

- 09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies
- Updated dependencies [09c6eb5]
    - @sap-ux/btp-utils@0.10.3
    - @sap-ux/logger@0.2.2

## 0.8.0

_Released: 2022-07-20T05:54:40Z_

### Minor Changes

- 732171b: ADT service support in abap service provider

## 0.7.2

_Released: 2022-07-04T13:03:56Z_

### Patch Changes

- cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm
- Updated dependencies [cc1c406]
    - @sap-ux/btp-utils@0.10.2
    - @sap-ux/logger@0.2.1

## 0.7.1

_Released: 2022-06-23T12:02:11Z_

### Patch Changes

- Updated dependencies [6f0f217]
    - @sap-ux/btp-utils@0.10.1

## 0.7.0

_Released: 2022-06-13T09:53:27Z_

### Minor Changes

- 6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

### Patch Changes

- Updated dependencies [6f51973]
    - @sap-ux/btp-utils@0.10.0
    - @sap-ux/logger@0.2.0

## 0.6.0

_Released: 2022-05-20T08:03:01Z_

### Minor Changes

- 9864fb5: Add support for login with reentrance tickets

## 0.5.2

_Released: 2022-05-19T14:38:34Z_

### Patch Changes

- c70fd4d: chore(open-ux-tools) pnpm 7 and node 18 support.
- Updated dependencies [c70fd4d]
    - @sap-ux/btp-utils@0.9.2
    - @sap-ux/logger@0.1.6

## 0.5.1

_Released: 2022-05-16T16:22:38Z_

### Patch Changes

- Updated dependencies [815bf59]
    - @sap-ux/btp-utils@0.9.1

## 0.5.0

_Released: 2022-05-13T04:53:20Z_

### Minor Changes

- 439b9d0: Added abstraction for LREP service

## 0.4.0

### Minor Changes

- 9967c5f: Initial release of reusable modules for system access.

### Patch Changes

- Updated dependencies [9967c5f]
    - @sap-ux/btp-utils@0.9.0
