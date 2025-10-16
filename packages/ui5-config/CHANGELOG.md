# @sap-ux/ui5-config

## 0.29.8

### Patch Changes

-   9e94382: Disable flex changes for preview with virtual endpoints using UI5 sources from npmjs

## 0.29.7

### Patch Changes

-   43a2446: chore: fix Sonar issues
-   Updated dependencies [43a2446]
    -   @sap-ux/yaml@0.17.1

## 0.29.6

### Patch Changes

-   d866995: fix: pathReplace not taken into account or truncated in case of nested router instances

## 0.29.5

### Patch Changes

-   9872384: Upgrade axios module

## 0.29.4

### Patch Changes

-   8ccc4da: fix: "Undeploy" does not work with the new ui5-deploy.yaml file for ADP

## 0.29.3

### Patch Changes

-   4cfebaf: Update axios module

## 0.29.2

### Patch Changes

-   178dbea: sanitize ignoreCertError (singular) configration option to ignoreCertErrors (plural)

## 0.29.1

### Patch Changes

-   43bc887: add getter for ui5 framework

## 0.29.0

### Minor Changes

-   c0fa1d1: enhance support for adding and updating preview configuration

## 0.28.3

### Patch Changes

-   f75b89d: Get mock data server config from ui5 yaml file

## 0.28.2

### Patch Changes

-   61ea5c0: fix: Incorrect types package put during adaptation project generation

## 0.28.1

### Patch Changes

-   5e0020b: Support backend changes.

## 0.28.0

### Minor Changes

-   a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

-   Updated dependencies [a28357d]
    -   @sap-ux/yaml@0.17.0

## 0.27.2

### Patch Changes

-   7590bc3: Remove legacy CF deploy task

## 0.27.1

### Patch Changes

-   294bbe3: code cleanup with help from copilot

## 0.27.0

### Minor Changes

-   1ca4004: updates for use for fiori tools preview middleware and use of virtual endpoints

## 0.26.5

### Patch Changes

-   224494c: Improved add, delete and get methods for service backends.

## 0.26.4

### Patch Changes

-   011c8c5: fix(deps): update dependency axios to v1.8.2 [security]

## 0.26.3

### Patch Changes

-   5817923: Adds `webappPath` and `basePath` parameters to resolve service paths during mockserver generation/update.

## 0.26.2

### Patch Changes

-   ed8a9b9: Handling of `ignoreCertError` property from service in proxy middleware.

## 0.26.1

### Patch Changes

-   19aad96: Delete only one backend entry per service.

## 0.26.0

### Minor Changes

-   73475e5: Support for multiple services and multiple annotations per service.

## 0.25.2

### Patch Changes

-   1beac7e: adds reentrance ticket auth type to deploy config

## 0.25.1

### Patch Changes

-   6275288: add new cf deploy writer and dependencies that it requires

## 0.25.0

### Minor Changes

-   484195d: Enhancements to FE & FF Configurations: The updates include adding the `start-variants-management` script to `package.json` for FE and FF. The OdataService interface now has an `ignoreCertError` property. UI5 application writer introduces the `sapuxLayer` property to `package.json` templates and adds `fiori-tools-preview middleware` to ui5, ui5-mock, and ui5-local.yaml. Additionally, the `addFioriToolsPreviewMiddleware` function has been added for YAML config integration.

## 0.24.1

### Patch Changes

-   1a99abc: separation between ui5libs and manifestlibs, to allow for different ui5 libraries set in manifest and other files

## 0.24.0

### Minor Changes

-   61721f2: fpm v4 removed sap.fe.templates in manifest.json, now has dependency on sap.fe.core
    removed dependency on sap.ushell for v4 manifest.json

## 0.23.1

### Patch Changes

-   22e4ad8: Generate correct ui5.yaml

## 0.23.0

### Minor Changes

-   c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

-   Updated dependencies [c2359077]
    -   @sap-ux/yaml@0.16.0

## 0.22.10

### Patch Changes

-   1a1baeb0: Revert "feat(fiori-elements-writer): remove `sap.fe.templates` dependency

## 0.22.9

### Patch Changes

-   399d2ad8: adds new abap deploy config writer
-   Updated dependencies [399d2ad8]
    -   @sap-ux/yaml@0.15.1

## 0.22.8

### Patch Changes

-   a140cf8b: fix: incorrect fiori-tools-proxy config generated for adp

## 0.22.7

### Patch Changes

-   9188fe8b: fpm v4 removed sap.fe.templates in manifest.json, now has dependency on sap.fe.core
    sap.ushell removed from ui5-application-writer, now loaded in fiori-elements and fiori-freestyle writers respectively

## 0.22.6

### Patch Changes

-   Updated dependencies [64a95bd1]
    -   @sap-ux/yaml@0.15.0

## 0.22.5

### Patch Changes

-   3684195d: adds authenticationType to fiori tools proxy backend and ability to add inline comments to yaml nodes
-   Updated dependencies [3684195d]
    -   @sap-ux/yaml@0.14.2

## 0.22.4

### Patch Changes

-   e3d2324c: Improvements for consumption

## 0.22.3

### Patch Changes

-   7f8105c7: move replaceEnvVariables to ui5-config and export

## 0.22.2

### Patch Changes

-   b7d95fb3: fix paths and config writers

## 0.22.1

### Patch Changes

-   efa35ddd: adds new module @sap-ux/ui5-library-reference-writer

## 0.22.0

### Minor Changes

-   ec509c40: dynamically appends annotations from manifest.json for mockserver middleware config

## 0.21.1

### Patch Changes

-   c15435b6: fix: remove engines pnpm from package.json
-   Updated dependencies [c15435b6]
    -   @sap-ux/yaml@0.14.1

## 0.21.0

### Minor Changes

-   3f977f21: Enhanced functionality to support adding customer properties

## 0.20.0

### Minor Changes

-   1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

-   Updated dependencies [1aa0fc43]
    -   @sap-ux/yaml@0.14.0

## 0.19.5

### Patch Changes

-   Updated dependencies [4052822f]
    -   @sap-ux/yaml@0.13.9

## 0.19.4

### Patch Changes

-   65010b09: fix - use patch version 0 for ui5 types semver for more reliable installs

## 0.19.3

### Patch Changes

-   63c698a8: chore - fix publishing of modules missed in failed release build
-   Updated dependencies [63c698a8]
    -   @sap-ux/yaml@0.13.8

## 0.19.2

### Patch Changes

-   3137514f: use platform independent UI5 CDN URLs

## 0.19.1

### Patch Changes

-   7c8a6946: fix(deps): update dependency semver to v7.5.4

## 0.19.0

### Minor Changes

-   375ca861: publish npm module after failure on PR #1110

## 0.18.2

### Patch Changes

-   4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.
-   Updated dependencies [4ba13898]
    -   @sap-ux/yaml@0.13.7

## 0.18.1

### Patch Changes

-   d9355692: Upgrade vulnerable modules semver and fast-xml-parser

## 0.18.0

### Minor Changes

-   59863d93: Removed types determination workaround.

## 0.17.1

### Patch Changes

-   25911701: Fix for 'promises must be awaited' sonar issues
-   Updated dependencies [25911701]
    -   @sap-ux/yaml@0.13.6

## 0.17.0

### Minor Changes

-   31207b95: abstract ui5-app-writer functions into appropriate modules

## 0.16.6

### Patch Changes

-   100248f3: fix(security): upgrade yaml
-   Updated dependencies [100248f3]
    -   @sap-ux/yaml@0.13.5

## 0.16.5

### Patch Changes

-   e7614e5: Add minor types for smartlinks configuration

## 0.16.4

### Patch Changes

-   d350038: chore - TypeScript 4.9.4 upgrade
-   Updated dependencies [d350038]
    -   @sap-ux/yaml@0.13.4

## 0.16.3

### Patch Changes

-   Updated dependencies [3327a3f]
    -   @sap-ux/yaml@0.13.3

## 0.16.2

### Patch Changes

-   ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues
-   Updated dependencies [ed04f6f]
    -   @sap-ux/yaml@0.13.2

## 0.16.1

### Patch Changes

-   070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability
-   Updated dependencies [070d8dc]
    -   @sap-ux/yaml@0.13.1

## 0.16.0

### Minor Changes

-   d760b69: Add functionality to set metadata, type, and update custom middleware

### Patch Changes

-   Updated dependencies [d760b69]
    -   @sap-ux/yaml@0.13.0

## 0.15.4

### Patch Changes

-   Updated dependencies [f3cbe4d]
    -   @sap-ux/yaml@0.12.4

## 0.15.3

### Patch Changes

-   11c8f5d: Use manifest types from @sap-ux/project-access

## 0.15.2

### Patch Changes

-   5b487ef: chore - Apply linting to test folders and linting fixes

## 0.15.1

### Patch Changes

-   Updated dependencies [86fc1cd]
    -   @sap-ux/yaml@0.12.3

## 0.15.0

### Minor Changes

-   83a7a1a: Enhancements to detect if a project is supporting typescript or not

## 0.14.5

### Patch Changes

-   b6d0c67: Replaced used mockserver middleware

## 0.14.4

### Patch Changes

-   30afc5f: Override glob-parent due to ReDos vulnerability

## 0.14.3

### Patch Changes

-   09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies
-   Updated dependencies [09c6eb5]
    -   @sap-ux/yaml@0.12.2

## 0.14.2

### Patch Changes

-   7c4a4df: trim themelib theme names

## 0.14.1

### Patch Changes

-   cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm
-   Updated dependencies [cc1c406]
    -   @sap-ux/yaml@0.12.1

## 0.14.0

### Minor Changes

-   6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

### Patch Changes

-   Updated dependencies [6f51973]
    -   @sap-ux/yaml@0.12.0

## 0.13.3

### Patch Changes

-   c70fd4d: chore(open-ux-tools) pnpm 7 and node 18 support.
-   Updated dependencies [c70fd4d]
    -   @sap-ux/yaml@0.11.5

## 0.13.2

### Patch Changes

-   b5ab868: Changing versions of dependent modules to fix vulnerabilities

## 0.13.1

### Patch Changes

-   5b5355c: Fix: adding a custom page to an empty FE FPM application with FCL enabled

## 0.13.0

### Minor Changes

-   56409d0: Consolidated ui5 configuration types and enhanced API

## 0.12.3

### Patch Changes

-   c18fc5c: chore(open-ux-tools) update devDependencies and change dependabot config
-   Updated dependencies [c18fc5c]
    -   @sap-ux/yaml@0.11.4

## 0.12.2

### Patch Changes

-   0837ac1: Add missing information to package.json and enforced use of higher version of minimist
-   Updated dependencies [0837ac1]
    -   @sap-ux/yaml@0.11.3

## 0.12.1

### Patch Changes

-   7107fbc: chore - use import type in TS code.
-   Updated dependencies [7107fbc]
    -   @sap-ux/yaml@0.11.2

## 0.12.0

### Minor Changes

-   2b12f4f: UI5 version removal from ui5.yaml and ui5-mock.yaml

## 0.11.1

### Patch Changes

-   04e4f35: chore(yaml) - update yaml dependency
-   Updated dependencies [04e4f35]
    -   @sap-ux/yaml@0.11.1

## 0.11.0

### Minor Changes

-   3783887: Enhance ui5-config module allowing to add the abap-deploy-task and remove any middleware

### Patch Changes

-   Updated dependencies [3783887]
    -   @sap-ux/yaml@0.11.0

## 0.10.3

### Patch Changes

-   b7ee596: port tool-suite change - add delay to appreload middleware
-   Updated dependencies [b7ee596]
    -   @sap-ux/yaml@0.10.3

## 0.10.2

### Patch Changes

-   8de261b: Update npm dep and devDeps
-   Updated dependencies [8de261b]
    -   @sap-ux/yaml@0.10.2

## 0.10.1

### Patch Changes

-   a7670a0: Update ui5 verison handling for ui5.yaml. Allow setting view name in basic template, enhancements to yaml lib.
-   Updated dependencies [a7670a0]
    -   @sap-ux/yaml@0.10.1

## 0.10.0

### Minor Changes

-   d37c8bd: Added support for selecting a custom view name for Fiori freestyle - Basic template

### Patch Changes

-   Updated dependencies [d37c8bd]
    -   @sap-ux/yaml@0.10.0

## 0.9.3

### Patch Changes

-   6888c5b: Add Readme for modules, add deploy script FF template, engines.node update to lts and small clean-up
-   Updated dependencies [6888c5b]
    -   @sap-ux/yaml@0.9.2

## 0.9.2

### Patch Changes

-   a16d4e7: fix versions in modules for patch instead of minor

## 0.10.0

### Minor Changes

-   cd119ea: Fix missing client in fiori proxy config #138

## 0.9.1

### Patch Changes

-   f6e1223: Dummy update to test changesets and pipeline
-   Updated dependencies [f6e1223]
    -   @sap-ux/yaml@0.9.1
