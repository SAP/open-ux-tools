# @sap-ux/ui5-application-writer

## 0.17.14

### Patch Changes

-   070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability
-   Updated dependencies [070d8dc]
    -   @sap-ux/ui5-config@0.16.1

## 0.17.13

### Patch Changes

-   fdfa554: Disable codeAssist when Typescript is also selected. Since Typescript includes it's own code assist config.

## 0.17.12

### Patch Changes

-   964ab8e: Increased best (recommended) version of UI5 types modules to latest LTS version.

## 0.17.11

### Patch Changes

-   Updated dependencies [d760b69]
    -   @sap-ux/ui5-config@0.16.0

## 0.17.10

### Patch Changes

-   672b40b: Fix issue with tsconfig paths

## 0.17.9

### Patch Changes

-   324b802: Handle Typscript build step for Freestyle Simple templates

## 0.17.8

### Patch Changes

-   @sap-ux/ui5-config@0.15.4

## 0.17.7

### Patch Changes

-   11c8f5d: Use manifest types from @sap-ux/project-access
-   Updated dependencies [11c8f5d]
    -   @sap-ux/ui5-config@0.15.3

## 0.17.6

### Patch Changes

-   Updated dependencies [5b487ef]
    -   @sap-ux/ui5-config@0.15.2

## 0.17.5

### Patch Changes

-   e3e1275: Replacing json-merger with lodash.mergewith internally

## 0.17.4

### Patch Changes

-   @sap-ux/ui5-config@0.15.1

## 0.17.3

### Patch Changes

-   0fc1499: Code quality improvements but no functionality change

## 0.17.2

### Patch Changes

-   b72abf0: Fix: generate type dependency based on provided versions

## 0.17.1

### Patch Changes

-   d0b4660: Dont fail if unknown AppOptions are provided

## 0.17.0

### Minor Changes

-   83a7a1a: Enhancements to detect if a project is supporting typescript or not

### Patch Changes

-   Updated dependencies [83a7a1a]
    -   @sap-ux/ui5-config@0.15.0

## 0.16.1

### Patch Changes

-   b8d5315: Issues with typescript templates when testing the integration into SAP Fiori tools in BAS

## 0.16.0

### Minor Changes

-   4fb53ce: Fix sonar warnings

## 0.15.1

### Patch Changes

-   c86bfaf: Using better types and improved quality of generate TS projects

## 0.15.0

### Minor Changes

-   d351f81: Typescript support added

## 0.14.6

### Patch Changes

-   Updated dependencies [b6d0c67]
    -   @sap-ux/ui5-config@0.14.5

## 0.14.5

### Patch Changes

-   238f401: Fix: corrected minVersion calculation and handling of sapux setting

## 0.14.4

### Patch Changes

-   30afc5f: Override glob-parent due to ReDos vulnerability
-   Updated dependencies [30afc5f]
    -   @sap-ux/ui5-config@0.14.4

## 0.14.3

### Patch Changes

-   09c6eb5: chore(open-ux-tools) update .npmrc and devDependencies
-   Updated dependencies [09c6eb5]
    -   @sap-ux/ui5-config@0.14.3

## 0.14.2

### Patch Changes

-   Updated dependencies [7c4a4df]
    -   @sap-ux/ui5-config@0.14.2

## 0.14.1

### Patch Changes

-   cc1c406: chore(open-ux-tools) ignore source map files when publishing to npm
-   Updated dependencies [cc1c406]
    -   @sap-ux/ui5-config@0.14.1

## 0.14.0

### Minor Changes

-   6f51973: chore(open-ux-tools) Remove node 12 from the list of supported engines for all modules

### Patch Changes

-   Updated dependencies [6f51973]
    -   @sap-ux/ui5-config@0.14.0

## 0.13.1

### Patch Changes

-   c70fd4d: chore(open-ux-tools) pnpm 7 and node 18 support.
-   Updated dependencies [c70fd4d]
    -   @sap-ux/ui5-config@0.13.3

## 0.13.0

### Minor Changes

-   9726e2d: Feature: Adds support for setting the sourceTemplate toolsId into generated ui5 applications

## 0.12.8

### Patch Changes

-   b5ab868: Changing versions of dependent modules to fix vulnerabilities
-   Updated dependencies [b5ab868]
    -   @sap-ux/ui5-config@0.13.2

## 0.12.7

### Patch Changes

-   73d6a6b: Fix for #438 : Incorrect manifest version set for some ui5 versions

## 0.12.6

### Patch Changes

-   Updated dependencies [5b5355c]
    -   @sap-ux/ui5-config@0.13.1

## 0.12.5

### Patch Changes

-   Updated dependencies [56409d0]
    -   @sap-ux/ui5-config@0.13.0

## 0.12.4

### Patch Changes

-   c18fc5c: chore(open-ux-tools) update devDependencies and change dependabot config
-   Updated dependencies [c18fc5c]
    -   @sap-ux/ui5-config@0.12.3

## 0.12.3

### Patch Changes

-   0837ac1: Add missing information to package.json and enforced use of higher version of minimist
-   Updated dependencies [0837ac1]
    -   @sap-ux/ui5-config@0.12.2

## 0.12.2

### Patch Changes

-   7107fbc: chore - use import type in TS code.
-   Updated dependencies [7107fbc]
    -   @sap-ux/ui5-config@0.12.1

## 0.12.1

### Patch Changes

-   f989e61: Fix: incorrect json generated if optional paramater is missing

## 0.12.0

### Minor Changes

-   574bf78: New module @sap-ux/fiori-elements-writer. Bug fix and extended api to add template info to manifest.json @sap-ux/ui5-application-writer. Add template info to manifest.json @sap-ux/fiori-freestyle-writer.

## 0.11.2

### Patch Changes

-   893c924: Fix for: https://github.com/SAP/open-ux-tools/issues/345

## 0.11.1

### Patch Changes

-   0e72d5b: Fixes reuse libs loading from index.html. Adds optional support for reuse libs loading to ui5-application-writer.

## 0.11.0

### Minor Changes

-   2b12f4f: Remove UI5 version from ui5-application-writer

### Patch Changes

-   Updated dependencies [2b12f4f]
    -   @sap-ux/ui5-config@0.12.0

## 0.10.10

### Patch Changes

-   282b6af: Fixes invalid semantic versions being written to generated application

## 0.10.9

### Patch Changes

-   11909e1: Write dependencies to manifest.json

## 0.10.8

### Patch Changes

-   507b3de: change eslint template file

## 0.10.7

### Patch Changes

-   f47b932: fix packaging of module with dot files due to bug in pnpm

## 0.10.6

### Patch Changes

-   2038af1: use correct frameworkURL

## 0.10.5

### Patch Changes

-   Updated dependencies [04e4f35]
    -   @sap-ux/ui5-config@0.11.1

## 0.10.4

### Patch Changes

-   3fb2f48: Updated dependency to json-merge to remove nested vulnerable dependency of json-ptr

## 0.10.3

### Patch Changes

-   dbc8b1b: update eslint ignorePatterns in generated apps

## 0.10.2

### Patch Changes

-   Updated dependencies [3783887]
    -   @sap-ux/ui5-config@0.11.0

## 0.10.1

### Patch Changes

-   7cfdd9f: Update @ui5/cli@^2.14.1 to support SAPUI5 1.97.0+

## 0.10.0

### Minor Changes

-   a9ef807: Reorganized how different middlewares are added to the ui5\*.yaml files

## 0.9.9

### Patch Changes

-   ccff534: Add inline schema in ui5\*.yaml files for yaml-language-server

## 0.9.8

### Patch Changes

-   4bef87c: Use consistent whitespace for indentation in templates

## 0.9.7

### Patch Changes

-   b7ee596: port tool-suite change - add delay to appreload middleware

## 0.9.6

### Patch Changes

-   8de261b: Update npm dep and devDeps

## 0.9.5

### Patch Changes

-   a7670a0: Update ui5 verison handling for ui5.yaml. Allow setting view name in basic template, enhancements to yaml lib.

## 0.9.4

### Patch Changes

-   d37c8bd: Added support for selecting a custom view name for Fiori freestyle - Basic template

## 0.9.3

### Patch Changes

-   6888c5b: Add Readme for modules, add deploy script FF template, engines.node update to lts and small clean-up

## 0.9.2

### Patch Changes

-   a16d4e7: fix versions in modules for patch instead of minor

## 0.10.0

### Minor Changes

-   cd119ea: Fix missing client in fiori proxy config #138

## 0.9.1

### Patch Changes

-   f6e1223: Dummy update to test changesets and pipeline
