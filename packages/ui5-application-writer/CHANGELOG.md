# @sap-ux/ui5-application-writer

## 1.5.19

### Patch Changes

-   9e94382: Disable flex changes for preview with virtual endpoints using UI5 sources from npmjs
-   Updated dependencies [9e94382]
    -   @sap-ux/ui5-config@0.29.8

## 1.5.18

### Patch Changes

-   43a2446: chore: fix Sonar issues
-   Updated dependencies [43a2446]
    -   @sap-ux/ui5-config@0.29.7

## 1.5.17

### Patch Changes

-   Updated dependencies [d866995]
    -   @sap-ux/ui5-config@0.29.6

## 1.5.16

### Patch Changes

-   Updated dependencies [9872384]
    -   @sap-ux/ui5-config@0.29.5

## 1.5.15

### Patch Changes

-   Updated dependencies [8ccc4da]
    -   @sap-ux/ui5-config@0.29.4

## 1.5.14

### Patch Changes

-   Updated dependencies [4cfebaf]
    -   @sap-ux/ui5-config@0.29.3

## 1.5.13

### Patch Changes

-   55bb22e: updates cap projects to use npm workspaces by default

## 1.5.12

### Patch Changes

-   178dbea: sanitize ignoreCertError (singular) configration option to ignoreCertErrors (plural)
-   Updated dependencies [178dbea]
    -   @sap-ux/ui5-config@0.29.2

## 1.5.11

### Patch Changes

-   Updated dependencies [43bc887]
    -   @sap-ux/ui5-config@0.29.1

## 1.5.10

### Patch Changes

-   4e0bd83: fix(deps): update dependency @ui5/manifest to v1.76.0

## 1.5.9

### Patch Changes

-   2809593: update test snapshots to reflect latest template and linting changes

## 1.5.8

### Patch Changes

-   69f62ec: i18next upgrade to 25.3.0
    -   @sap-ux/ui5-config@0.29.0

## 1.5.7

### Patch Changes

-   c0fa1d1: enhance support for adding and updating preview configuration
-   Updated dependencies [c0fa1d1]
    -   @sap-ux/ui5-config@0.29.0

## 1.5.6

### Patch Changes

-   b9675bb: Improve Fiori Tools UI Texts

## 1.5.5

### Patch Changes

-   Updated dependencies [f75b89d]
    -   @sap-ux/ui5-config@0.28.3

## 1.5.4

### Patch Changes

-   3ea811a: Bump @ui5/cli version

## 1.5.3

### Patch Changes

-   163522f: fix non-virtual endpoint preview config

## 1.5.2

### Patch Changes

-   Updated dependencies [61ea5c0]
    -   @sap-ux/ui5-config@0.28.2

## 1.5.1

### Patch Changes

-   Updated dependencies [5e0020b]
    -   @sap-ux/ui5-config@0.28.1

## 1.5.0

### Minor Changes

-   a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

-   Updated dependencies [a28357d]
    -   @sap-ux/ui5-config@0.28.0

## 1.4.3

### Patch Changes

-   0d8918a: updates for cap and virtual endpoints

## 1.4.2

### Patch Changes

-   Updated dependencies [7590bc3]
    -   @sap-ux/ui5-config@0.27.2

## 1.4.1

### Patch Changes

-   Updated dependencies [294bbe3]
    -   @sap-ux/ui5-config@0.27.1

## 1.4.0

### Minor Changes

-   1ca4004: updates for use for fiori tools preview middleware and use of virtual endpoints

### Patch Changes

-   Updated dependencies [1ca4004]
    -   @sap-ux/ui5-config@0.27.0

## 1.3.3

### Patch Changes

-   Updated dependencies [224494c]
    -   @sap-ux/ui5-config@0.26.5

## 1.3.2

### Patch Changes

-   Updated dependencies [011c8c5]
    -   @sap-ux/ui5-config@0.26.4

## 1.3.1

### Patch Changes

-   Updated dependencies [5817923]
    -   @sap-ux/ui5-config@0.26.3

## 1.3.0

### Minor Changes

-   88520b4: Export functions for Manifest Version Retrieval, and UI5 Version Info

## 1.2.10

### Patch Changes

-   Updated dependencies [ed8a9b9]
    -   @sap-ux/ui5-config@0.26.2

## 1.2.9

### Patch Changes

-   Updated dependencies [19aad96]
    -   @sap-ux/ui5-config@0.26.1

## 1.2.8

### Patch Changes

-   21f0b20: TBI - Prevent CRLF injection in logs

## 1.2.7

### Patch Changes

-   Updated dependencies [73475e5]
    -   @sap-ux/ui5-config@0.26.0

## 1.2.6

### Patch Changes

-   Updated dependencies [1beac7e]
    -   @sap-ux/ui5-config@0.25.2

## 1.2.5

### Patch Changes

-   d0331b8: fix - locate-reuse-libs.js|ts - sanitize server response before logging

## 1.2.4

### Patch Changes

-   7cf9ed0: Fix lint issue in templates

## 1.2.3

### Patch Changes

-   Updated dependencies [6275288]
    -   @sap-ux/ui5-config@0.25.1

## 1.2.2

### Patch Changes

-   b2de757: Fix @ui5/linter errors in locate-reuse-lib.js

## 1.2.1

### Patch Changes

-   f626d47: remove @sap/ux-specification from generated apps

## 1.2.0

### Minor Changes

-   484195d: Enhancements to FE & FF Configurations: The updates include adding the `start-variants-management` script to `package.json` for FE and FF. The OdataService interface now has an `ignoreCertError` property. UI5 application writer introduces the `sapuxLayer` property to `package.json` templates and adds `fiori-tools-preview middleware` to ui5, ui5-mock, and ui5-local.yaml. Additionally, the `addFioriToolsPreviewMiddleware` function has been added for YAML config integration.

### Patch Changes

-   Updated dependencies [484195d]
    -   @sap-ux/ui5-config@0.25.0

## 1.1.6

### Patch Changes

-   8cfd71a: ui5-application-writer - fix backward support for older ui5 versions in locate-reuse-libs.js

## 1.1.5

### Patch Changes

-   1a99abc: separation between ui5libs and manifestlibs, to allow for different ui5 libraries set in manifest and other files
-   Updated dependencies [1a99abc]
    -   @sap-ux/ui5-config@0.24.1

## 1.1.4

### Patch Changes

-   61721f2: fpm v4 removed sap.fe.templates in manifest.json, now has dependency on sap.fe.core
    removed dependency on sap.ushell for v4 manifest.json
-   Updated dependencies [61721f2]
    -   @sap-ux/ui5-config@0.24.0

## 1.1.3

### Patch Changes

-   e69db46: Upgrade fast-xml-parser

## 1.1.2

### Patch Changes

-   42486a5: fix(locate-reuse-lib): corrected extraction of component name

## 1.1.1

### Patch Changes

-   d549173: - Adjusts getMinUI5VersionAsArray so that semver valid check is included; the function now only returns valid versions.
    -   Upgrade of @ui5/manifest to 1.66.0; adjustment of all components so that minimumUI5Version definitions as array are processed properly.

## 1.1.0

### Minor Changes

-   1a0e478: Removal of private: true Flag from Package.json Templates

## 1.0.0

### Major Changes

-   5b243ac: Add `projectType` mandatory option to `App` interface to specify the type of project being processed. This option determines file inclusion/exclusion and script updates in the template:
    -   For projects of type 'CAPJava' or 'CAPNodejs':
        -   Exclude `ui5-local.yaml` and `.gitignore` from the template.
        -   Update `package.json` to include only the script `deploy-config`.
        -   Use full URLs to determine resource URLs in `webapp/index.html` and `flpSandbox.html`.
    -   For projects of type 'EDMXBackend':
        -   Include `ui5-local.yaml` and `.gitignore` in the template.
        -   Update `package.json` to include the following scripts: start, start-local, build, start-noflp, start-mock, int-test, deploy, and sap-ux.
        -   Include relative URLs to determine resource URLs in `webapp/index.html` and `flpSandbox.html`.

## 0.27.2

### Patch Changes

-   Updated dependencies [22e4ad8]
    -   @sap-ux/ui5-config@0.23.1

## 0.27.1

### Patch Changes

-   8b7ee1f: Do not add reuse libraries to the ui5-local.yaml

## 0.27.0

### Minor Changes

-   c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

-   Updated dependencies [c2359077]
    -   @sap-ux/ui5-config@0.23.0

## 0.26.18

### Patch Changes

-   Updated dependencies [1a1baeb0]
    -   @sap-ux/ui5-config@0.22.10

## 0.26.17

### Patch Changes

-   Updated dependencies [399d2ad8]
    -   @sap-ux/ui5-config@0.22.9

## 0.26.16

### Patch Changes

-   Updated dependencies [a140cf8b]
    -   @sap-ux/ui5-config@0.22.8

## 0.26.15

### Patch Changes

-   9188fe8b: fpm v4 removed sap.fe.templates in manifest.json, now has dependency on sap.fe.core
    sap.ushell removed from ui5-application-writer, now loaded in fiori-elements and fiori-freestyle writers respectively
-   Updated dependencies [9188fe8b]
    -   @sap-ux/ui5-config@0.22.7

## 0.26.14

### Patch Changes

-   @sap-ux/ui5-config@0.22.6

## 0.26.13

### Patch Changes

-   Updated dependencies [3684195d]
    -   @sap-ux/ui5-config@0.22.5

## 0.26.12

### Patch Changes

-   Updated dependencies [e3d2324c]
    -   @sap-ux/ui5-config@0.22.4

## 0.26.11

### Patch Changes

-   4e267684: chore - ejs upgrade

## 0.26.10

### Patch Changes

-   6684f851: fix(\*-writer): remove the incomplete JSDoc annotations

## 0.26.9

### Patch Changes

-   Updated dependencies [7f8105c7]
    -   @sap-ux/ui5-config@0.22.3

## 0.26.8

### Patch Changes

-   Updated dependencies [b7d95fb3]
    -   @sap-ux/ui5-config@0.22.2

## 0.26.7

### Patch Changes

-   da0ecd9a: Enable Typscript type checking in eslint module @sap-ux/eslint-plugin-fiori-tools

## 0.26.6

### Patch Changes

-   Updated dependencies [efa35ddd]
    -   @sap-ux/ui5-config@0.22.1

## 0.26.5

### Patch Changes

-   Updated dependencies [ec509c40]
    -   @sap-ux/ui5-config@0.22.0

## 0.26.4

### Patch Changes

-   4b29ddcc: Update TypeScript templates, eslint config and ui5 devDependencies

## 0.26.3

### Patch Changes

-   c15435b6: fix: remove engines pnpm from package.json
-   Updated dependencies [c15435b6]
    -   @sap-ux/ui5-config@0.21.1

## 0.26.2

### Patch Changes

-   f11f9b2c: fix(deps): update dependency @ui5/manifest to v1.61.0

## 0.26.1

### Patch Changes

-   Updated dependencies [3f977f21]
    -   @sap-ux/ui5-config@0.21.0

## 0.26.0

### Minor Changes

-   1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

-   Updated dependencies [1aa0fc43]
    -   @sap-ux/ui5-config@0.20.0

## 0.25.10

### Patch Changes

-   cbcad88d: fix(deps): update dependencies [i18next]

## 0.25.9

### Patch Changes

-   4087bffb: Allow more flexible @types type loading for TypeScript generate projects

## 0.25.8

### Patch Changes

-   @sap-ux/ui5-config@0.19.5

## 0.25.7

### Patch Changes

-   65010b09: fix - use patch version 0 for ui5 types semver for more reliable installs
-   Updated dependencies [65010b09]
    -   @sap-ux/ui5-config@0.19.4

## 0.25.6

### Patch Changes

-   63c698a8: chore - fix publishing of modules missed in failed release build
-   Updated dependencies [63c698a8]
    -   @sap-ux/ui5-config@0.19.3

## 0.25.5

### Patch Changes

-   3137514f: use platform independent UI5 CDN URLs
-   Updated dependencies [3137514f]
    -   @sap-ux/ui5-config@0.19.2

## 0.25.4

### Patch Changes

-   7c8a6946: fix(deps): update dependency semver to v7.5.4
-   Updated dependencies [7c8a6946]
    -   @sap-ux/ui5-config@0.19.1

## 0.25.3

### Patch Changes

-   7fd593f0: fix(deps): update dependency @ui5/manifest to v1.59.0

## 0.25.2

### Patch Changes

-   a794dad7: Update ui5-tooling-transpile in templates

## 0.25.1

### Patch Changes

-   b63aea83: Update ui5 yaml spec to 3.1

## 0.25.0

### Minor Changes

-   de0b13f2: Update templates to use Typescript version 5

## 0.24.3

### Patch Changes

-   44df3d5c: fix lint warnings in locate-reuse-libs.js

## 0.24.2

### Patch Changes

-   29179b5f: Add SAP icon loading in flpsandbox.html

## 0.24.1

### Patch Changes

-   Updated dependencies [375ca861]
    -   @sap-ux/ui5-config@0.19.0

## 0.24.0

### Minor Changes

-   eba8741e: Use @sapui5/types with UI5 1.113 and newer

## 0.23.5

### Patch Changes

-   4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.
-   Updated dependencies [4ba13898]
    -   @sap-ux/ui5-config@0.18.2

## 0.23.4

### Patch Changes

-   d9355692: Upgrade vulnerable modules semver and fast-xml-parser
-   Updated dependencies [d9355692]
    -   @sap-ux/ui5-config@0.18.1

## 0.23.3

### Patch Changes

-   Updated dependencies [59863d93]
    -   @sap-ux/ui5-config@0.18.0

## 0.23.2

### Patch Changes

-   743a5dc7: Chore - bump version of @sap-ux/eslint-plugin-fiori-tools used in templates

## 0.23.1

### Patch Changes

-   25911701: Fix for 'promises must be awaited' sonar issues
-   Updated dependencies [25911701]
    -   @sap-ux/ui5-config@0.17.1

## 0.23.0

### Minor Changes

-   31207b95: abstract ui5-app-writer functions into appropriate modules

### Patch Changes

-   Updated dependencies [31207b95]
    -   @sap-ux/ui5-config@0.17.0

## 0.22.3

### Patch Changes

-   906b7fea: Fix: incorrect settings for ui5-middleware-transpile

## 0.22.2

### Patch Changes

-   495a22cb: Use @sap-ux/eslint-plugin-fiori-tools for JS projects with eslint option

## 0.22.1

### Patch Changes

-   91e95ef8: BUG - Generated Controller Extensions do not always work with TS

## 0.22.0

### Minor Changes

-   7ac0cb40: Add new module containing an eslint plugin with reusable eslint configs

## 0.21.1

### Patch Changes

-   100248f3: fix(security): upgrade yaml
-   Updated dependencies [100248f3]
    -   @sap-ux/ui5-config@0.16.6

## 0.21.0

### Minor Changes

-   e39c14d7: Add configuration option generateIndex to toggle the generation of index.html

## 0.20.0

### Minor Changes

-   f3ec7324: Update eslint fiori custom package and rules

## 0.19.2

### Patch Changes

-   c06de66b: TBI - refactor locate-reuse-lib.js template to use modern API's and fix lint issues

## 0.19.1

### Patch Changes

-   8f167e8a: TBI - Fiori Elements V2 type support

## 0.19.0

### Minor Changes

-   7df492ae: move locate-reuse-libs.js to webapp/test, update references and remove reference from index.html

## 0.18.10

### Patch Changes

-   Updated dependencies [e7614e5]
    -   @sap-ux/ui5-config@0.16.5

## 0.18.9

### Patch Changes

-   35d1e15: tbi: Support @ui5/cli v3 in the generated projects

## 0.18.8

### Patch Changes

-   81e3f25: chore - TS writers update `"ui5-tooling-transpile": "^0.3.7"`
    `"addControllerStaticPropsToExtend": true` is added to typescript app's `.babelrc.json` to support controller extension class syntax

## 0.18.7

### Patch Changes

-   d350038: chore - TypeScript 4.9.4 upgrade
-   Updated dependencies [d350038]
    -   @sap-ux/ui5-config@0.16.4

## 0.18.6

### Patch Changes

-   @sap-ux/ui5-config@0.16.3

## 0.18.5

### Patch Changes

-   76603f8: Align FF ListDetail temple between JS and TS and add test utils

## 0.18.4

### Patch Changes

-   ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues
-   Updated dependencies [ed04f6f]
    -   @sap-ux/ui5-config@0.16.2

## 0.18.3

### Patch Changes

-   aab6b0d: tbi - hide transpile warnings for /Component-preload.js

## 0.18.2

### Patch Changes

-   eaf7214: TBI - refactor pre scripts for start and build for typescript projects

## 0.18.1

### Patch Changes

-   ac7f8f3: chore - TS writers udpate "ui5-tooling-transpile": "^0.2.1",

## 0.18.0

### Minor Changes

-   b3945f3: consume version mapping from @ui5/manifest

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
