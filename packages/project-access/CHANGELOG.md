# @sap-ux/project-access

## 1.26.8

### Patch Changes

-   df6262e: fix: use manifest.json path as root for `i18n` folder

## 1.26.7

### Patch Changes

-   Updated dependencies [61721f2]
    -   @sap-ux/ui5-config@0.24.0

## 1.26.6

### Patch Changes

-   82aaea3: Parallelize filtering of applications by manifest path

## 1.26.5

### Patch Changes

-   cc16cbb: fix CAP CDS evironment e.g. loading cds jar dependencies

## 1.26.4

### Patch Changes

-   Updated dependencies [ac22b7e]
    -   @sap-ux/i18n@0.1.1

## 1.26.3

### Patch Changes

-   88c8bf6: new public/exported method "getCapServiceName" which returns CAP service name by passed datasource uri

## 1.26.2

### Patch Changes

-   e69db46: Upgrade fast-xml-parser

## 1.26.1

### Patch Changes

-   a986655: Revert "fix(#2173): consider variables in minUI5Version"

## 1.26.0

### Minor Changes

-   518bf7e: Update CAP serviceInfo API handling

## 1.25.8

### Patch Changes

-   99b7b5f: Fixed an issue where variables in minUI5Version were considered invalid

## 1.25.7

### Patch Changes

-   d549173: - Adjusts getMinUI5VersionAsArray so that semver valid check is included; the function now only returns valid versions.
    -   Upgrade of @ui5/manifest to 1.66.0; adjustment of all components so that minimumUI5Version definitions as array are processed properly.

## 1.25.6

### Patch Changes

-   a9fac04: Caching promise to load global cds module:
    -   When loading the global installed cds module is required, we call `cds --version` to locate the path to load from. As this call is quite expensive, so far, after the result was retrieved, the path was cached. Now, we already cache the promise waiting for the result and resolving to the loaded module.
    -   When `loadGlobalCdsModule` was called a second time before the first execution was finished, by this, we can avoid a useless second expensive call to `cds --version`.
    -   If your code is calling `loadGlobalCdsModule` (or any method using it) several times, you could possibly have observed sequential execution being faster than parallel execution. In that case you should consider to gain performance by changing to parallel execution now.

## 1.25.5

### Patch Changes

-   421f3ca: fix: module-loader fails to install specification dependecy in '.fioritools' folder when user has 'node_modules' in user home folder

## 1.25.4

### Patch Changes

-   173b5f2: export findCapProjectRoot, required by other modules

## 1.25.3

### Patch Changes

-   e7b9184: fix: outputs specification version when loading from cache

## 1.25.2

### Patch Changes

-   Updated dependencies [22e4ad8]
    -   @sap-ux/ui5-config@0.23.1

## 1.25.1

### Patch Changes

-   0f3cf6b: feat: Add path to specification

## 1.25.0

### Minor Changes

-   f076dd3: Add freestyle CAP app support.

## 1.24.0

### Minor Changes

-   0ae685e: Add feature to cache node modules locally, consumed by specification

## 1.23.0

### Minor Changes

-   c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

-   Updated dependencies [c2359077]
    -   @sap-ux/i18n@0.1.0
    -   @sap-ux/ui5-config@0.23.0

## 1.22.4

### Patch Changes

-   9ea58ad4: fix: Release version of @sap-ux/project-access with filterDataSourcesByType

## 1.22.3

### Patch Changes

-   Updated dependencies [1a1baeb0]
    -   @sap-ux/ui5-config@0.22.10

## 1.22.2

### Patch Changes

-   399d2ad8: adds new abap deploy config writer
-   Updated dependencies [399d2ad8]
    -   @sap-ux/ui5-config@0.22.9

## 1.22.1

### Patch Changes

-   Updated dependencies [a140cf8b]
    -   @sap-ux/ui5-config@0.22.8

## 1.22.0

### Minor Changes

-   ad93a484: Update functions for package.json and manifest.json that keeps previous indentation.

## 1.21.2

### Patch Changes

-   Updated dependencies [9188fe8b]
    -   @sap-ux/ui5-config@0.22.7

## 1.21.1

### Patch Changes

-   @sap-ux/ui5-config@0.22.6

## 1.21.0

### Minor Changes

-   69b8d6de: Introduces enhanced functionality by returning CDS information, extracted during the prompt phase, and is made available for later use .

## 1.20.4

### Patch Changes

-   a7d78229: Added new functions for retrieving the minUI5Version(s) from manifest

## 1.20.3

### Patch Changes

-   Updated dependencies [f80a4256]
    -   @sap-ux/i18n@0.0.7

## 1.20.2

### Patch Changes

-   54c91c6d: Export method 'clearCdsModuleCache' to provide option to clear cds module cache for passed project root path.

## 1.20.1

### Patch Changes

-   Updated dependencies [3684195d]
    -   @sap-ux/ui5-config@0.22.5

## 1.20.0

### Minor Changes

-   e3d2324c: Improvements for consumption

### Patch Changes

-   Updated dependencies [e3d2324c]
    -   @sap-ux/ui5-config@0.22.4

## 1.19.14

### Patch Changes

-   Updated dependencies [7f8105c7]
    -   @sap-ux/ui5-config@0.22.3

## 1.19.13

### Patch Changes

-   99bca62c: Add error code for cds mismatch

## 1.19.12

### Patch Changes

-   b7d95fb3: fix paths and config writers
-   Updated dependencies [b7d95fb3]
    -   @sap-ux/ui5-config@0.22.2

## 1.19.11

### Patch Changes

-   4389c528: expose library types

## 1.19.10

### Patch Changes

-   f8e16120: Add missing fiori tools settings enum

## 1.19.9

### Patch Changes

-   ee76e47f: fix: get i18n bundles for CAPJava

## 1.19.8

### Patch Changes

-   Updated dependencies [03167a06]
    -   @sap-ux/i18n@0.0.6

## 1.19.7

### Patch Changes

-   98496d57: adds new module @sap-ux/ui5-library-reference-inquirer
-   e3d2e003: Detect mismatching global and project installations of @sap/cds

## 1.19.6

### Patch Changes

-   f0e3263a: Adds missing constants entries, refactor duplicate constants, use project-access const instead

## 1.19.5

### Patch Changes

-   Updated dependencies [efa35ddd]
    -   @sap-ux/ui5-config@0.22.1

## 1.19.4

### Patch Changes

-   87c942e5: Remove setting of cds.root.

## 1.19.3

### Patch Changes

-   89013210: Revert setting of cds.root

## 1.19.2

### Patch Changes

-   Updated dependencies [ec509c40]
    -   @sap-ux/ui5-config@0.22.0

## 1.19.1

### Patch Changes

-   Updated dependencies [cc95c0a8]
    -   @sap-ux/i18n@0.0.5

## 1.19.0

### Minor Changes

-   a4f00f7c: Remove setting of cds.root. Set the project in cds.load() instead.

## 1.18.0

### Minor Changes

-   e6da2117: adds iscapproject function

## 1.17.6

### Patch Changes

-   c381d32f: feat(project-access): detect libraries with `.library`

## 1.17.5

### Patch Changes

-   33ec9ff9: fix: enhance `getI18nBundles` to be more tolerant

## 1.17.4

### Patch Changes

-   c15435b6: fix: remove engines pnpm from package.json
-   Updated dependencies [c15435b6]
    -   @sap-ux/ui5-config@0.21.1
    -   @sap-ux/i18n@0.0.4

## 1.17.3

### Patch Changes

-   2eda843d: feat(project-access): expose "toReferenceUri" in package interface

## 1.17.2

### Patch Changes

-   76ce5c2f: fix: expose getI18nPropertiesPaths and export types for browser in @sap-ux/i18n
-   Updated dependencies [76ce5c2f]
    -   @sap-ux/i18n@0.0.3

## 1.17.1

### Patch Changes

-   86da13e3: Add i18n support
-   Updated dependencies [86da13e3]
    -   @sap-ux/i18n@0.0.2

## 1.17.0

### Minor Changes

-   236146b4: Add retrieval of project structure

## 1.16.3

### Patch Changes

-   e6f454ab: Fix for detecting apps that are part of CAP

## 1.16.2

### Patch Changes

-   d5b99a28: cds.root is now set from passed project root

## 1.16.1

### Patch Changes

-   20a4dbfc: Fix for classification of freestyle apps in CAP Java projects

## 1.16.0

### Minor Changes

-   f7382bd1: Add getAppType() and getProjectType()

## 1.15.5

### Patch Changes

-   f11f9b2c: fix(deps): update dependency @ui5/manifest to v1.61.0

## 1.15.4

### Patch Changes

-   Updated dependencies [3f977f21]
    -   @sap-ux/ui5-config@0.21.0

## 1.15.3

### Patch Changes

-   a82759be: Fix for "TypeError: Cannot read properties of undefined (reading 'odata-v4')" which can occur when dynamically loading different @sap/cds verrsions

## 1.15.2

### Patch Changes

-   d7d52155: Find project root of adp by searching for package.json

## 1.15.1

### Patch Changes

-   e4821c0f: SonarCloud code smells

## 1.15.0

### Minor Changes

-   b458bf43: Adding functions getCdsFiles(), getCdsRoots(), getCdsServices()

## 1.14.0

### Minor Changes

-   1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

-   Updated dependencies [1aa0fc43]
    -   @sap-ux/ui5-config@0.20.0

## 1.13.8

### Patch Changes

-   @sap-ux/ui5-config@0.19.5

## 1.13.7

### Patch Changes

-   Updated dependencies [65010b09]
    -   @sap-ux/ui5-config@0.19.4

## 1.13.6

### Patch Changes

-   63c698a8: chore - fix publishing of modules missed in failed release build
-   Updated dependencies [63c698a8]
    -   @sap-ux/ui5-config@0.19.3

## 1.13.5

### Patch Changes

-   Updated dependencies [3137514f]
    -   @sap-ux/ui5-config@0.19.2

## 1.13.4

### Patch Changes

-   Updated dependencies [7c8a6946]
    -   @sap-ux/ui5-config@0.19.1

## 1.13.3

### Patch Changes

-   7fd593f0: fix(deps): update dependency @ui5/manifest to v1.59.0

## 1.13.2

### Patch Changes

-   164d52b5: chore(deps): update dependency vscode-uri to v3.0.7

## 1.13.1

### Patch Changes

-   56dc4c59: Fix for leading slashes on Windows

## 1.13.0

### Minor Changes

-   d13264b3: Add function to search for CAP project roots in local folders or workspace

## 1.12.1

### Patch Changes

-   f880ea76: fix for async function definition

## 1.12.0

### Minor Changes

-   6feb0cea: Add fallback to load @sap/cds from any module location

## 1.11.2

### Patch Changes

-   Updated dependencies [375ca861]
    -   @sap-ux/ui5-config@0.19.0

## 1.11.1

### Patch Changes

-   88861559: Fix for module loading after installation

## 1.11.0

### Minor Changes

-   1c267b37: Adding getMtaPath(appRoot: string, fs: Editor) utility function. It helps to identify if the input Fiori app is part of a MTA project or not.

## 1.10.2

### Patch Changes

-   c18f957a: add readonly for WorkspaceFolder usage

## 1.10.1

### Patch Changes

-   95a8daae: Ignore leading or trailing slashes when searching for services in CAP project

## 1.10.0

### Minor Changes

-   ff74ee09: Add functionality to convert CDS into EDMX

## 1.9.1

### Patch Changes

-   5ab0638f: Fix "getCapModelAndServices" for CDS v7

## 1.9.0

### Minor Changes

-   42b1de7b: Add utils method for getting absolute and reference uri for cap resources

## 1.8.4

### Patch Changes

-   4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.
-   Updated dependencies [4ba13898]
    -   @sap-ux/ui5-config@0.18.2

## 1.8.3

### Patch Changes

-   Updated dependencies [d9355692]
    -   @sap-ux/ui5-config@0.18.1

## 1.8.2

### Patch Changes

-   Updated dependencies [59863d93]
    -   @sap-ux/ui5-config@0.18.0

## 1.8.1

### Patch Changes

-   25911701: Fix for 'promises must be awaited' sonar issues
-   Updated dependencies [25911701]
    -   @sap-ux/ui5-config@0.17.1

## 1.8.0

### Minor Changes

-   61f4ecc7: Add cds-plugin-ui5 to CAP project

## 1.7.0

### Minor Changes

-   31207b95: abstract ui5-app-writer functions into appropriate modules

### Patch Changes

-   Updated dependencies [31207b95]
    -   @sap-ux/ui5-config@0.17.0

## 1.6.0

### Minor Changes

-   71a06864: Add path to manifest.appdescr_variant to search results of search for adaptation projects

## 1.5.1

### Patch Changes

-   7ed591a8: properly handle "@sap/cds" dynamic import

## 1.5.0

### Minor Changes

-   d80f6f34: Add findFioriArtifacts() to allow searching for apps, adaptation projects, extension projects, and libraries

## 1.4.0

### Minor Changes

-   f50c3517: Add getCapEnvironment() to allow getting project specific configuration

## 1.3.1

### Patch Changes

-   100248f3: fix(security): upgrade yaml
-   Updated dependencies [100248f3]
    -   @sap-ux/ui5-config@0.16.6

## 1.3.0

### Minor Changes

-   e7614e5: Add `readUi5Yaml` to read ui5.yaml files

### Patch Changes

-   Updated dependencies [e7614e5]
    -   @sap-ux/ui5-config@0.16.5

## 1.2.0

### Minor Changes

-   f8022a8: Add getAppLanguage to detect used app programming language JavaScript or TypeScript

## 1.1.3

### Patch Changes

-   8c45841: Fixed silent mode throwing an error when sapuxRequired was set to true

## 1.1.2

### Patch Changes

-   d350038: chore - TypeScript 4.9.4 upgrade
-   Updated dependencies [d350038]
    -   @sap-ux/ui5-config@0.16.4

## 1.1.1

### Patch Changes

-   @sap-ux/ui5-config@0.16.3

## 1.1.0

### Minor Changes

-   470275c: Add option for findProjectRoot function to not throw errors when no match is found

## 1.0.6

### Patch Changes

-   ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues
-   Updated dependencies [ed04f6f]
    -   @sap-ux/ui5-config@0.16.2

## 1.0.5

### Patch Changes

-   8cc76b5: chore: consume App Descriptor (manifest.json) types from @ui5/manifest

## 1.0.4

### Patch Changes

-   e49be41: Init modules to add, update, remove features

## 1.0.3

### Patch Changes

-   070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability
-   Updated dependencies [070d8dc]
    -   @sap-ux/ui5-config@0.16.1

## 1.0.2

### Patch Changes

-   Updated dependencies [d760b69]
    -   @sap-ux/ui5-config@0.16.0

## 1.0.1

### Patch Changes

-   @sap-ux/ui5-config@0.15.4

## 1.0.0

### Major Changes

-   11c8f5d: Adding module

### Patch Changes

-   Updated dependencies [11c8f5d]
    -   @sap-ux/ui5-config@0.15.3
