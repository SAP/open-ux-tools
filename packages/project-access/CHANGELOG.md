# @sap-ux/project-access

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
