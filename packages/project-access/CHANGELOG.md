# @sap-ux/project-access

## 1.32.6

### Patch Changes

-   ea0a942: Improve function `refreshSpecificationDistTags` - prevent caching `specification-dist-tags.json` if an error is returned in the JSON from `npm view @sap/ux-specification dist-tags --json`

## 1.32.5

### Patch Changes

-   c5d7915: Improve method `getSpecification` - retry loading specification `specification-dist-tags.json` if the initial load contains an error.

## 1.32.4

### Patch Changes

-   Updated dependencies [9e94382]
    -   @sap-ux/ui5-config@0.29.8

## 1.32.3

### Patch Changes

-   43a2446: chore: fix Sonar issues
-   Updated dependencies [43a2446]
    -   @sap-ux/ui5-config@0.29.7
    -   @sap-ux/i18n@0.3.4

## 1.32.2

### Patch Changes

-   Updated dependencies [d866995]
    -   @sap-ux/ui5-config@0.29.6

## 1.32.1

### Patch Changes

-   Updated dependencies [9872384]
    -   @sap-ux/ui5-config@0.29.5

## 1.32.0

### Minor Changes

-   f9b4afe: Enhanced the Project type with the capCustomPaths property to store information about custom paths in CAP projects. These custom paths should be considered during performance optimization checks.

## 1.31.0

### Minor Changes

-   c385a76: Enhanced the Project type with the capCustomPaths property to store information about custom paths in CAP projects. These custom paths should be considered during performance optimization checks.

## 1.30.14

### Patch Changes

-   Updated dependencies [8ccc4da]
    -   @sap-ux/ui5-config@0.29.4

## 1.30.13

### Patch Changes

-   Updated dependencies [4cfebaf]
    -   @sap-ux/ui5-config@0.29.3

## 1.30.12

### Patch Changes

-   Updated dependencies [178dbea]
    -   @sap-ux/ui5-config@0.29.2

## 1.30.11

### Patch Changes

-   @sap-ux/i18n@0.3.3

## 1.30.10

### Patch Changes

-   Updated dependencies [43bc887]
    -   @sap-ux/ui5-config@0.29.1

## 1.30.9

### Patch Changes

-   Updated dependencies [009143e]
    -   @sap-ux/i18n@0.3.2

## 1.30.8

### Patch Changes

-   4e0bd83: fix(deps): update dependency @ui5/manifest to v1.76.0

## 1.30.7

### Patch Changes

-   58cdce6: fix: Windows path issue for CAP CDS projects

## 1.30.6

### Patch Changes

-   Updated dependencies [c0fa1d1]
    -   @sap-ux/ui5-config@0.29.0

## 1.30.5

### Patch Changes

-   7a4543e: fix: remove usage of static webapp folder

## 1.30.4

### Patch Changes

-   f75b89d: Get mock data server config from ui5 yaml file
-   Updated dependencies [f75b89d]
    -   @sap-ux/ui5-config@0.28.3

## 1.30.3

### Patch Changes

-   Updated dependencies [f9ea9e3]
    -   @sap-ux/i18n@0.3.1

## 1.30.2

### Patch Changes

-   Updated dependencies [61ea5c0]
    -   @sap-ux/ui5-config@0.28.2

## 1.30.1

### Patch Changes

-   Updated dependencies [5e0020b]
    -   @sap-ux/ui5-config@0.28.1

## 1.30.0

### Minor Changes

-   a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

-   Updated dependencies [a28357d]
    -   @sap-ux/ui5-config@0.28.0
    -   @sap-ux/i18n@0.3.0

## 1.29.22

### Patch Changes

-   ea0e2c0: Use memFs if passed while application access creation

## 1.29.21

### Patch Changes

-   Updated dependencies [7590bc3]
    -   @sap-ux/ui5-config@0.27.2

## 1.29.20

### Patch Changes

-   294bbe3: code cleanup with help from copilot
-   Updated dependencies [294bbe3]
    -   @sap-ux/ui5-config@0.27.1

## 1.29.19

### Patch Changes

-   Updated dependencies [1ca4004]
    -   @sap-ux/ui5-config@0.27.0

## 1.29.18

### Patch Changes

-   c3ebc82: fix: wrong convert preview-config prerequisites check for usage of cds-plugin-ui5

## 1.29.17

### Patch Changes

-   Updated dependencies [224494c]
    -   @sap-ux/ui5-config@0.26.5

## 1.29.16

### Patch Changes

-   Updated dependencies [011c8c5]
    -   @sap-ux/ui5-config@0.26.4

## 1.29.15

### Patch Changes

-   1ce7fe9: Improve `getModule` to attempt module reinstallation if loading fails.

## 1.29.14

### Patch Changes

-   3cc8f8a: fix: check files in srv folder of CAP project when srv folder contains subfolders

## 1.29.13

### Patch Changes

-   Updated dependencies [5817923]
    -   @sap-ux/ui5-config@0.26.3

## 1.29.12

### Patch Changes

-   Updated dependencies [cf05ceb]
    -   @sap-ux/i18n@0.2.3

## 1.29.11

### Patch Changes

-   0f35b4b: ignore error thrown when no .library file found

## 1.29.10

### Patch Changes

-   Updated dependencies [4b8577f]
    -   @sap-ux/i18n@0.2.2

## 1.29.9

### Patch Changes

-   c8c292c: Fix: method 'getCapModelAndServices' not returning 'odata-v4' services

## 1.29.8

### Patch Changes

-   c50e09f: Improve performance and fix code smells

## 1.29.7

### Patch Changes

-   2c0d657: Export `getI18nBundles` function

## 1.29.6

### Patch Changes

-   Updated dependencies [ed8a9b9]
    -   @sap-ux/ui5-config@0.26.2

## 1.29.5

### Patch Changes

-   Updated dependencies [78bc772]
    -   @sap-ux/i18n@0.2.1

## 1.29.4

### Patch Changes

-   29abc73: feat: support component type

## 1.29.3

### Patch Changes

-   096b021: filter CAP services to include odata only

## 1.29.2

### Patch Changes

-   93ef8c1: Improved `getWebappPath` for projects that has relative webapp path defined in ui5.yaml.

## 1.29.1

### Patch Changes

-   Updated dependencies [19aad96]
    -   @sap-ux/ui5-config@0.26.1

## 1.29.0

### Minor Changes

-   88bf030: Add optional mem-fs editor to function in project-access

## 1.28.10

### Patch Changes

-   e1edcd7: Make module caching more robust in case of failed installations

## 1.28.9

### Patch Changes

-   e93797a: Added the `convert` command to convert local preview files of a project to virtual files.

## 1.28.8

### Patch Changes

-   Updated dependencies [73475e5]
    -   @sap-ux/ui5-config@0.26.0

## 1.28.7

### Patch Changes

-   Updated dependencies [1beac7e]
    -   @sap-ux/ui5-config@0.25.2

## 1.28.6

### Patch Changes

-   fb26f92: Enhance RTA handling for variants-config command

## 1.28.5

### Patch Changes

-   Updated dependencies [6275288]
    -   @sap-ux/ui5-config@0.25.1

## 1.28.4

### Patch Changes

-   5a68903: adds new reference library sub generator

## 1.28.3

### Patch Changes

-   42f13eb: **Fix**: Resolved an issue where running `npm install` after executing a create command would fail on Windows. This fix ensures that the installation process completes successfully across all platforms.

## 1.28.2

### Patch Changes

-   eb38e5b: refactor: Update variable declarations in getCapModelAndServices function

## 1.28.1

### Patch Changes

-   64e037d: TBI - Optionally allow filtering CAP folder(s) to compile CAP model from

## 1.28.0

### Minor Changes

-   15e6959: TBI - refactor validation on target folder in app inquirer

## 1.27.6

### Patch Changes

-   eb74890: Fix the bug for the app folder within CAP as the target folder for the new project.

## 1.27.5

### Patch Changes

-   a64a3a5: Alert and prevent from generating a Fiori application into a CAP project folder

## 1.27.4

### Patch Changes

-   Updated dependencies [484195d]
    -   @sap-ux/ui5-config@0.25.0

## 1.27.3

### Patch Changes

-   070182d: New public API method 'deleteCapApp', which allow delete application from CAP project

## 1.27.2

### Patch Changes

-   09522df: Validates provided path does not contain a Fiori project, appropriate validation message displayed.

## 1.27.1

### Patch Changes

-   d962ce1: Move hasUI5CliV3 to project-access for common re-use

## 1.27.0

### Minor Changes

-   df29368: Method `createCapI18nEntries` - handle absolute path to cds file instead of relative path

### Patch Changes

-   Updated dependencies [df29368]
    -   @sap-ux/i18n@0.2.0

## 1.26.9

### Patch Changes

-   Updated dependencies [1a99abc]
    -   @sap-ux/ui5-config@0.24.1

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
