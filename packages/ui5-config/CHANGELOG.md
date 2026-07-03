# @sap-ux/ui5-config

## 1.0.4

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

#### Workspace Updates

- @sap-ux/yaml 1.0.1 → 1.0.2

## 1.0.3

_Released: 2026-06-10T09:57:42Z_

### Patch Changes

- c8e8f7e: fix: write builder.resources.excludes to base ui5.yaml as well as ui5-deploy.yaml

## 1.0.2

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/yaml@1.0.1

## 1.0.1

_Released: 2026-06-03T13:52:44Z_

### Patch Changes

- 9580241: fix(ui5-config): addAbapDeployTask always includes /localService/ in deploy task configuration.exclude

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
    - @sap-ux/yaml@1.0.0

## 0.31.1

_Released: 2026-05-21T16:21:11Z_

### Patch Changes

- 9752c40: feat: add function to read yaml metadata section

## 0.31.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/yaml@0.18.0

## 0.30.5

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/yaml@0.17.8

## 0.30.4

_Released: 2026-05-06T23:02:00Z_

### Patch Changes

- 678a08e: chore: upgrade axios 1.15.0 → 1.16.0 (CVE-2025-62718, CVE prototype pollution fixes)

## 0.30.3

_Released: 2026-04-14T12:35:35Z_

### Patch Changes

- cc4450c: chore: upgrade axios 1.13.6 → 1.15.0 (security fix GHSA-3p68-rc4w-qgx5, GHSA-fvcv-3m26-pcqx)

## 0.30.2

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- f1e4481: chore: upgrade lodash 4.17.23 → 4.18.1 (CVE security fix, vulnerable range <=4.17.23)
- Updated dependencies [f1e4481]
    - @sap-ux/yaml@0.17.7

## 0.30.1

_Released: 2026-03-26T12:07:04Z_

### Patch Changes

- a41533f: chore(ui5-config): upgrade axios 1.13.5 → 1.13.6
- Updated dependencies [a41533f]
    - @sap-ux/yaml@0.17.6

## 0.30.0

_Released: 2026-03-20T16:07:49Z_

### Minor Changes

- 25e5177: support full service url systems in the application generator and generated apps for preview and deployment

## 0.29.21

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- Updated dependencies [2917c4c]
    - @sap-ux/yaml@0.17.5

## 0.29.20

_Released: 2026-03-04T14:39:10Z_

### Patch Changes

- c09b843: (ADP) Add small refactoring to deployment validatiors and remove the redundant ui5 config hasBuilderKey() method.

## 0.29.19

_Released: 2026-02-20T21:31:31Z_

### Patch Changes

- d92cd35: fix(deps): update dependency ajv to v8.18.0 [security]

## 0.29.18

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- bb310dc: fix(deps): update dependency semver to v7.7.4

## 0.29.17

_Released: 2026-02-16T16:08:11Z_

### Patch Changes

- e7f58d7: (ADP) Introduce Private Cloud feature

## 0.29.16

_Released: 2026-02-10T23:50:15Z_

### Patch Changes

- 2fc459c: Upgrade axios

## 0.29.15

_Released: 2026-02-05T08:38:39Z_

### Patch Changes

- ad321ab: fix(deps): update dependency semver to v7.7.3

## 0.29.14

_Released: 2026-01-30T16:59:27Z_

### Patch Changes

- ea7a16c: Fix Extend lodash vulnerability
- Updated dependencies [ea7a16c]
    - @sap-ux/yaml@0.17.4

## 0.29.13

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- be67fc4: feat: adjust type definitions

## 0.29.12

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues

## 0.29.11

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/yaml@0.17.3

## 0.29.10

_Released: 2025-11-26T14:39:37Z_

### Patch Changes

- 5d0598d: feat: save service metadata referenced in ValueListReferences and CodeList annotations.

## 0.29.9

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/yaml@0.17.2

## 0.29.8

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- 9e94382: Disable flex changes for preview with virtual endpoints using UI5 sources from npmjs

## 0.29.7

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues
- Updated dependencies [43a2446]
    - @sap-ux/yaml@0.17.1

## 0.29.6

_Released: 2025-10-06T10:53:53Z_

### Patch Changes

- d866995: fix: pathReplace not taken into account or truncated in case of nested router instances

## 0.29.5

_Released: 2025-09-19T16:36:41Z_

### Patch Changes

- 9872384: Upgrade axios module

## 0.29.4

_Released: 2025-09-16T06:28:11Z_

### Patch Changes

- 8ccc4da: fix: "Undeploy" does not work with the new ui5-deploy.yaml file for ADP

## 0.29.3

_Released: 2025-08-28T13:37:07Z_

### Patch Changes

- 4cfebaf: Update axios module

## 0.29.2

_Released: 2025-08-14T14:36:13Z_

### Patch Changes

- 178dbea: sanitize ignoreCertError (singular) configration option to ignoreCertErrors (plural)

## 0.29.1

_Released: 2025-08-01T09:39:39Z_

### Patch Changes

- 43bc887: add getter for ui5 framework

## 0.29.0

_Released: 2025-07-04T09:34:59Z_

### Minor Changes

- c0fa1d1: enhance support for adding and updating preview configuration

## 0.28.3

_Released: 2025-06-27T16:39:38Z_

### Patch Changes

- f75b89d: Get mock data server config from ui5 yaml file

## 0.28.2

_Released: 2025-05-30T07:18:36Z_

### Patch Changes

- 61ea5c0: fix: Incorrect types package put during adaptation project generation

## 0.28.1

_Released: 2025-05-15T13:36:04Z_

### Patch Changes

- 5e0020b: Support backend changes.

## 0.28.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/yaml@0.17.0

## 0.27.2

_Released: 2025-04-24T15:01:01Z_

### Patch Changes

- 7590bc3: Remove legacy CF deploy task

## 0.27.1

_Released: 2025-04-23T15:22:38Z_

### Patch Changes

- 294bbe3: code cleanup with help from copilot

## 0.27.0

_Released: 2025-04-23T13:59:14Z_

### Minor Changes

- 1ca4004: updates for use for fiori tools preview middleware and use of virtual endpoints

## 0.26.5

_Released: 2025-03-18T09:41:03Z_

### Patch Changes

- 224494c: Improved add, delete and get methods for service backends.

## 0.26.4

_Released: 2025-03-10T20:40:35Z_

### Patch Changes

- 011c8c5: fix(deps): update dependency axios to v1.8.2 [security]

## 0.26.3

_Released: 2025-03-05T09:14:02Z_

### Patch Changes

- 5817923: Adds `webappPath` and `basePath` parameters to resolve service paths during mockserver generation/update.

## 0.26.2

_Released: 2025-02-07T19:58:32Z_

### Patch Changes

- ed8a9b9: Handling of `ignoreCertError` property from service in proxy middleware.

## 0.26.1

_Released: 2025-01-27T18:57:16Z_

### Patch Changes

- 19aad96: Delete only one backend entry per service.

## 0.26.0

_Released: 2024-12-02T16:28:38Z_

### Minor Changes

- 73475e5: Support for multiple services and multiple annotations per service.

## 0.25.2

_Released: 2024-11-18T20:38:37Z_

### Patch Changes

- 1beac7e: adds reentrance ticket auth type to deploy config

## 0.25.1

_Released: 2024-11-05T21:46:19Z_

### Patch Changes

- 6275288: add new cf deploy writer and dependencies that it requires

## 0.25.0

_Released: 2024-09-23T10:02:33Z_

### Minor Changes

- 484195d: Enhancements to FE & FF Configurations: The updates include adding the `start-variants-management` script to `package.json` for FE and FF. The OdataService interface now has an `ignoreCertError` property. UI5 application writer introduces the `sapuxLayer` property to `package.json` templates and adds `fiori-tools-preview middleware` to ui5, ui5-mock, and ui5-local.yaml. Additionally, the `addFioriToolsPreviewMiddleware` function has been added for YAML config integration.

## 0.24.1

_Released: 2024-08-28T11:16:50Z_

### Patch Changes

- 1a99abc: separation between ui5libs and manifestlibs, to allow for different ui5 libraries set in manifest and other files

## 0.24.0

_Released: 2024-08-19T11:34:45Z_

### Minor Changes

- 61721f2: fpm v4 removed sap.fe.templates in manifest.json, now has dependency on sap.fe.core
  removed dependency on sap.ushell for v4 manifest.json

## 0.23.1

_Released: 2024-07-12T08:50:08Z_

### Patch Changes

- 22e4ad8: Generate correct ui5.yaml

## 0.23.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/yaml@0.16.0

## 0.22.10

_Released: 2024-06-26T13:30:18Z_

### Patch Changes

- 1a1baeb0: Revert "feat(fiori-elements-writer): remove `sap.fe.templates` dependency

## 0.22.9

_Released: 2024-06-25T14:41:22Z_

### Patch Changes

- 399d2ad8: adds new abap deploy config writer
- Updated dependencies [399d2ad8]
    - @sap-ux/yaml@0.15.1

## 0.22.8

_Released: 2024-06-18T15:06:09Z_

### Patch Changes

- a140cf8b: fix: incorrect fiori-tools-proxy config generated for adp

## 0.22.7

_Released: 2024-06-12T15:20:44Z_

### Patch Changes

- 9188fe8b: fpm v4 removed sap.fe.templates in manifest.json, now has dependency on sap.fe.core
  sap.ushell removed from ui5-application-writer, now loaded in fiori-elements and fiori-freestyle writers respectively

## 0.22.6

_Released: 2024-06-07T14:16:07Z_

### Patch Changes

- Updated dependencies [64a95bd1]
    - @sap-ux/yaml@0.15.0

## 0.22.5

_Released: 2024-05-27T13:04:53Z_

### Patch Changes

- 3684195d: adds authenticationType to fiori tools proxy backend and ability to add inline comments to yaml nodes
- Updated dependencies [3684195d]
    - @sap-ux/yaml@0.14.2

## 0.22.4

_Released: 2024-05-14T08:36:35Z_

### Patch Changes

- e3d2324c: Improvements for consumption

## 0.22.3

_Released: 2024-05-02T14:43:18Z_

### Patch Changes

- 7f8105c7: move replaceEnvVariables to ui5-config and export

## 0.22.2

_Released: 2024-04-23T22:35:35Z_

### Patch Changes

- b7d95fb3: fix paths and config writers

## 0.22.1

_Released: 2024-04-04T13:19:16Z_

### Patch Changes

- efa35ddd: adds new module @sap-ux/ui5-library-reference-writer

## 0.22.0

_Released: 2024-03-21T16:21:01Z_

### Minor Changes

- ec509c40: dynamically appends annotations from manifest.json for mockserver middleware config

## 0.21.1

_Released: 2024-02-27T22:07:50Z_

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json
- Updated dependencies [c15435b6]
    - @sap-ux/yaml@0.14.1

## 0.21.0

_Released: 2023-11-22T08:53:28Z_

### Minor Changes

- 3f977f21: Enhanced functionality to support adding customer properties

## 0.20.0

_Released: 2023-10-19T12:06:19Z_

### Minor Changes

- 1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

- Updated dependencies [1aa0fc43]
    - @sap-ux/yaml@0.14.0

## 0.19.5

_Released: 2023-10-17T08:28:48Z_

### Patch Changes

- Updated dependencies [4052822f]
    - @sap-ux/yaml@0.13.9

## 0.19.4

_Released: 2023-10-09T17:37:13Z_

### Patch Changes

- 65010b09: fix - use patch version 0 for ui5 types semver for more reliable installs

## 0.19.3

_Released: 2023-09-20T13:13:51Z_

### Patch Changes

- 63c698a8: chore - fix publishing of modules missed in failed release build
- Updated dependencies [63c698a8]
    - @sap-ux/yaml@0.13.8

## 0.19.2

_Released: 2023-09-19T15:51:30Z_

### Patch Changes

- 3137514f: use platform independent UI5 CDN URLs

## 0.19.1

_Released: 2023-09-19T14:02:55Z_

### Patch Changes

- 7c8a6946: fix(deps): update dependency semver to v7.5.4

## 0.19.0

_Released: 2023-08-11T09:14:46Z_

### Minor Changes

- 375ca861: publish npm module after failure on PR #1110

## 0.18.2

_Released: 2023-06-27T14:58:54Z_

### Patch Changes

- 4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.
- Updated dependencies [4ba13898]
    - @sap-ux/yaml@0.13.7

## 0.18.1

_Released: 2023-06-26T15:34:40Z_

### Patch Changes

- d9355692: Upgrade vulnerable modules semver and fast-xml-parser

## 0.18.0

_Released: 2023-06-21T06:38:48Z_

### Minor Changes

- 59863d93: Removed types determination workaround.

## 0.17.1

_Released: 2023-06-12T06:59:29Z_

### Patch Changes

- 25911701: Fix for 'promises must be awaited' sonar issues
- Updated dependencies [25911701]
    - @sap-ux/yaml@0.13.6

## 0.17.0

_Released: 2023-06-01T08:16:47Z_

### Minor Changes

- 31207b95: abstract ui5-app-writer functions into appropriate modules

## 0.16.6

_Released: 2023-04-26T14:34:08Z_

### Patch Changes

- 100248f3: fix(security): upgrade yaml
- Updated dependencies [100248f3]
    - @sap-ux/yaml@0.13.5

## 0.16.5

_Released: 2023-03-24T14:54:37Z_

### Patch Changes

- e7614e5: Add minor types for smartlinks configuration

## 0.16.4

_Released: 2023-02-23T13:56:23Z_

### Patch Changes

- d350038: chore - TypeScript 4.9.4 upgrade
- Updated dependencies [d350038]
    - @sap-ux/yaml@0.13.4

## 0.16.3

_Released: 2023-02-17T07:56:11Z_

### Patch Changes

- Updated dependencies [3327a3f]
    - @sap-ux/yaml@0.13.3

## 0.16.2

_Released: 2023-02-10T14:09:06Z_

### Patch Changes

- ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues
- Updated dependencies [ed04f6f]
    - @sap-ux/yaml@0.13.2

## 0.16.1

_Released: 2022-12-05T07:50:58Z_

### Patch Changes

- 070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability
- Updated dependencies [070d8dc]
    - @sap-ux/yaml@0.13.1

## 0.16.0

_Released: 2022-11-04T17:06:16Z_

### Minor Changes

- d760b69: Add functionality to set metadata, type, and update custom middleware

### Patch Changes

- Updated dependencies [d760b69]
    - @sap-ux/yaml@0.13.0

## 0.15.4

_Released: 2022-10-21T07:04:47Z_

### Patch Changes

- Updated dependencies [f3cbe4d]
    - @sap-ux/yaml@0.12.4

## 0.15.3

_Released: 2022-10-14T14:52:33Z_

### Patch Changes

- 11c8f5d: Use manifest types from @sap-ux/project-access

## 0.15.2

_Released: 2022-10-11T14:06:32Z_

### Patch Changes

- 5b487ef: chore - Apply linting to test folders and linting fixes

## 0.15.1

_Released: 2022-10-04T15:02:00Z_

### Patch Changes

- Updated dependencies [86fc1cd]
    - @sap-ux/yaml@0.12.3

## 0.15.0

_Released: 2022-09-14T16:06:49Z_

### Minor Changes

- 83a7a1a: Enhancements to detect if a project is supporting typescript or not

## 0.14.5

_Released: 2022-08-25T13:08:21Z_

### Patch Changes

- b6d0c67: Replaced used mockserver middleware

## 0.14.4

_Released: 2022-07-27T08:51:11Z_

### Patch Changes

- 30afc5f: Override glob-parent due to ReDos vulnerability

## 0.14.3

_Released: 2022-07-21T14:10:31Z_

### Patch Changes

- 09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies
- Updated dependencies [09c6eb5]
    - @sap-ux/yaml@0.12.2

## 0.14.2

_Released: 2022-07-20T14:42:08Z_

### Patch Changes

- 7c4a4df: trim themelib theme names

## 0.14.1

_Released: 2022-07-04T13:03:56Z_

### Patch Changes

- cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm
- Updated dependencies [cc1c406]
    - @sap-ux/yaml@0.12.1

## 0.14.0

_Released: 2022-06-13T09:53:27Z_

### Minor Changes

- 6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

### Patch Changes

- Updated dependencies [6f51973]
    - @sap-ux/yaml@0.12.0

## 0.13.3

_Released: 2022-05-19T14:38:34Z_

### Patch Changes

- c70fd4d: chore(open-ux-tools) pnpm 7 and node 18 support.
- Updated dependencies [c70fd4d]
    - @sap-ux/yaml@0.11.5

## 0.13.2

_Released: 2022-04-27T16:48:18Z_

### Patch Changes

- b5ab868: Changing versions of dependent modules to fix vulnerabilities

## 0.13.1

_Released: 2022-04-01T07:00:29Z_

### Patch Changes

- 5b5355c: Fix: adding a custom page to an empty FE FPM application with FCL enabled

## 0.13.0

_Released: 2022-03-31T13:41:16Z_

### Minor Changes

- 56409d0: Consolidated ui5 configuration types and enhanced API

## 0.12.3

_Released: 2022-03-29T13:57:37Z_

### Patch Changes

- c18fc5c: chore(open-ux-tools) update devDependencies and change dependabot config
- Updated dependencies [c18fc5c]
    - @sap-ux/yaml@0.11.4

## 0.12.2

_Released: 2022-03-24T07:10:57Z_

### Patch Changes

- 0837ac1: Add missing information to package.json and enforced use of higher version of minimist
- Updated dependencies [0837ac1]
    - @sap-ux/yaml@0.11.3

## 0.12.1

_Released: 2022-03-22T19:34:16Z_

### Patch Changes

- 7107fbc: chore - use import type in TS code.
- Updated dependencies [7107fbc]
    - @sap-ux/yaml@0.11.2

## 0.12.0

_Released: 2022-02-18T09:46:40Z_

### Minor Changes

- 2b12f4f: UI5 version removal from ui5.yaml and ui5-mock.yaml

## 0.11.1

_Released: 2022-01-17T14:31:10Z_

### Patch Changes

- 04e4f35: chore(yaml) - update yaml dependency
- Updated dependencies [04e4f35]
    - @sap-ux/yaml@0.11.1

## 0.11.0

_Released: 2021-12-14T12:31:46Z_

### Minor Changes

- 3783887: Enhance ui5-config module allowing to add the abap-deploy-task and remove any middleware

### Patch Changes

- Updated dependencies [3783887]
    - @sap-ux/yaml@0.11.0

## 0.10.3

_Released: 2021-11-03T14:20:52Z_

### Patch Changes

- b7ee596: port tool-suite change - add delay to appreload middleware
- Updated dependencies [b7ee596]
    - @sap-ux/yaml@0.10.3

## 0.10.2

_Released: 2021-11-01T18:18:45Z_

### Patch Changes

- 8de261b: Update npm dep and devDeps
- Updated dependencies [8de261b]
    - @sap-ux/yaml@0.10.2

## 0.10.1

_Released: 2021-10-28T12:12:48Z_

### Patch Changes

- a7670a0: Update ui5 verison handling for ui5.yaml. Allow setting view name in basic template, enhancements to yaml lib.
- Updated dependencies [a7670a0]
    - @sap-ux/yaml@0.10.1

## 0.10.0

_Released: 2021-10-22T12:53:00Z_

### Minor Changes

- d37c8bd: Added support for selecting a custom view name for Fiori freestyle - Basic template

### Patch Changes

- Updated dependencies [d37c8bd]
    - @sap-ux/yaml@0.10.0

## 0.9.3

_Released: 2021-10-22T16:07:57Z_

### Patch Changes

- 6888c5b: Add Readme for modules, add deploy script FF template, engines.node update to lts and small clean-up
- Updated dependencies [6888c5b]
    - @sap-ux/yaml@0.9.2

## 0.9.2

_Released: 2021-10-22T14:11:14Z_

### Patch Changes

- a16d4e7: fix versions in modules for patch instead of minor

## 0.10.0

_Released: 2021-10-22T12:53:00Z_

### Minor Changes

- cd119ea: Fix missing client in fiori proxy config #138

## 0.9.1

### Patch Changes

- f6e1223: Dummy update to test changesets and pipeline
- Updated dependencies [f6e1223]
    - @sap-ux/yaml@0.9.1
