# @sap-ux/preview-middleware

## 0.11.15

### Patch Changes

-   a44e9007: Invalid target aggregation and index are accepted in Add Fragment dialog

## 0.11.14

### Patch Changes

-   338fe503: Add integration test

## 0.11.13

### Patch Changes

-   733cec7b: No Datetime is shown for Code Ext changes in saved changes panel

## 0.11.12

### Patch Changes

-   ff457bef: Controller Extension and Fragment name now show error if there is a whitespace after their name

## 0.11.11

### Patch Changes

-   76c751be: Save button for ui5 versions lower than 1.110 is shown

## 0.11.10

### Patch Changes

-   Updated dependencies [5a1eb6ed]
    -   @sap-ux/adp-tooling@0.7.2

## 0.11.9

### Patch Changes

-   5077d95f: Hide feedback and close buttons for adp projects

## 0.11.8

### Patch Changes

-   b4081d0a: Show warning message for adaptation project if ui5 version is less than 1.71

## 0.11.7

### Patch Changes

-   237e69d1: Fix for missing delete icon for new comp/control variant views

## 0.11.6

### Patch Changes

-   a280785d: Fix for showing redundant warning dialog in CPE for adaptation projects

## 0.11.5

### Patch Changes

-   b5eb0792: Index field is disabled when aggregation with specialIndexHandling is chosen

## 0.11.4

### Patch Changes

-   02609800: Fix for comp/control variant changes not updating in pending changes tab

## 0.11.3

### Patch Changes

-   Updated dependencies [de818954]
    -   @sap-ux/adp-tooling@0.7.1

## 0.11.2

### Patch Changes

-   Updated dependencies [3f977f21]
    -   @sap-ux/adp-tooling@0.7.0

## 0.11.1

### Patch Changes

-   18c9d967: Add validation for property changes for i18n models

## 0.11.0

### Minor Changes

-   793f846b: Open existing controller from project files instead of creating a new one

### Patch Changes

-   Updated dependencies [793f846b]
    -   @sap-ux/adp-tooling@0.6.0

## 0.10.7

### Patch Changes

-   061a6544: CPE UI is not updated when changes are saved or deleted

## 0.10.6

### Patch Changes

-   @sap-ux/adp-tooling@0.5.5

## 0.10.5

### Patch Changes

-   dc2f9345: Outline tree for Fiori applications is not collapsed correctly

## 0.10.4

### Patch Changes

-   be8e3fb3: fix outline initialisation for the case when application is loaded, but outline is empty

## 0.10.3

### Patch Changes

-   @sap-ux/adp-tooling@0.5.4

## 0.10.2

### Patch Changes

-   e2b264c2: Make Control Property Editor aware which application (scenario) its running in the iframe

## 0.10.1

### Patch Changes

-   ca61803e: Fixed controller extension/fragment name longer than 64 chars error not showing up

## 0.10.0

### Minor Changes

-   6d2d2255: support all kind of changes from command stack

## 0.9.0

### Minor Changes

-   318e040e: Enables creation of XML fragments for Extension Points from the outline tree (when right-clicking on extension point) or from the application (when clicking on control).

## 0.8.7

### Patch Changes

-   8d16d0b3: Exports FlpConfig and RtaConfig types for usage in @sap/ux-ui5-tooling

## 0.8.6

### Patch Changes

-   @sap-ux/adp-tooling@0.5.3

## 0.8.5

### Patch Changes

-   942f7752: Fixes the configuration of the LocalStorageConnector to avoid conflicts with the WorkspaceConnector

## 0.8.4

### Patch Changes

-   96b115d8: Exports the initAdp function so that can be use in @sap/ux-ui5-tooling

## 0.8.3

### Patch Changes

-   5f90873d: The features for all adaptation projects which are loaded from "WorkspaceConnector" in "preview-middleware-client" are with "isVariantAdaptationEnabled=true".

## 0.8.2

### Patch Changes

-   Updated dependencies [aa2ff95b]
    -   @sap-ux/adp-tooling@0.5.2

## 0.8.1

### Patch Changes

-   @sap-ux/adp-tooling@0.5.1

## 0.8.0

### Minor Changes

-   1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

### Patch Changes

-   Updated dependencies [1aa0fc43]
    -   @sap-ux/adp-tooling@0.5.0
    -   @sap-ux/logger@0.4.0

## 0.7.14

### Patch Changes

-   @sap-ux/adp-tooling@0.4.5

## 0.7.13

### Patch Changes

-   b6e925f8: Adds local persistence of personalizations across local preview sessions

## 0.7.12

### Patch Changes

-   4052822f: Corrected license reference in package.json (no license change)
-   Updated dependencies [4052822f]
    -   @sap-ux/logger@0.3.9
    -   @sap-ux/adp-tooling@0.4.4

## 0.7.11

### Patch Changes

-   @sap-ux/adp-tooling@0.4.3

## 0.7.10

### Patch Changes

-   aef0ccf3: Add bindingString prop for getBindingInfo expression to support maintenance version

## 0.7.9

### Patch Changes

-   59167357: Adds sap.ui.rta to preload libs for variants management and adaptation projects

## 0.7.8

### Patch Changes

-   913e2a53: support createRenderer method for maintenance versions

## 0.7.7

### Patch Changes

-   @sap-ux/adp-tooling@0.4.2

## 0.7.6

### Patch Changes

-   Updated dependencies [5747ca18]
    -   @sap-ux/adp-tooling@0.4.1

## 0.7.5

### Patch Changes

-   8029360f: Add favicon for CPE and generator for variant-config

## 0.7.4

### Patch Changes

-   Updated dependencies [b023f4cb]
    -   @sap-ux/adp-tooling@0.4.0

## 0.7.3

### Patch Changes

-   9d0140fa: Make express peer dependency
-   Updated dependencies [9d0140fa]
    -   @sap-ux/adp-tooling@0.3.4

## 0.7.2

### Patch Changes

-   4f2d9ed8: Bump packages to release the dep fix
-   Updated dependencies [4f2d9ed8]
    -   @sap-ux/adp-tooling@0.3.3

## 0.7.1

### Patch Changes

-   b3baa9a1: Fixes/removes the express dependency
-   Updated dependencies [b3baa9a1]
    -   @sap-ux/adp-tooling@0.3.2

## 0.7.0

### Minor Changes

-   0f2ac46a: Added support for running an editor with SAPUI5 adaptation projects

## 0.6.3

### Patch Changes

-   555c0ac5: Disable unsupported mode to prevent incorrect changes

## 0.6.2

### Patch Changes

-   0798e88e: Improving the FLP init script

## 0.6.1

### Patch Changes

-   @sap-ux/adp-tooling@0.3.1

## 0.6.0

### Minor Changes

-   ac0adb21: Enhancing the preview-middleware with new functionality such as adding an XML Fragment (creating "addXML" change).

### Patch Changes

-   Updated dependencies [ac0adb21]
    -   @sap-ux/adp-tooling@0.3.0

## 0.5.7

### Patch Changes

-   63c698a8: chore - fix publishing of modules missed in failed release build
-   Updated dependencies [63c698a8]
    -   @sap-ux/adp-tooling@0.2.5
    -   @sap-ux/logger@0.3.8

## 0.5.6

### Patch Changes

-   30825ea6: Add an option for setting the UI5 theme

## 0.5.5

### Patch Changes

-   58424e73: chore(deps): update dependency @ui5/cli to v3.6.0

## 0.5.4

### Patch Changes

-   @sap-ux/adp-tooling@0.2.4

## 0.5.3

### Patch Changes

-   @sap-ux/adp-tooling@0.2.3

## 0.5.2

### Patch Changes

-   @sap-ux/adp-tooling@0.2.2

## 0.5.1

### Patch Changes

-   @sap-ux/adp-tooling@0.2.1

## 0.5.0

### Minor Changes

-   62148b07: Breaking change: separating preview from edit mode

### Patch Changes

-   Updated dependencies [62148b07]
    -   @sap-ux/adp-tooling@0.2.0

## 0.4.5

### Patch Changes

-   @sap-ux/adp-tooling@0.1.8

## 0.4.4

### Patch Changes

-   a73935c5: No change of functionality, just converted the init script to typescript

## 0.4.3

### Patch Changes

-   9096d8cb: Cleaner FLP sandbox init script

## 0.4.2

### Patch Changes

-   @sap-ux/adp-tooling@0.1.7

## 0.4.1

### Patch Changes

-   86f01c39: Log a warning if the preview middleware is used with a path that also exists in the filesystem

## 0.4.0

### Minor Changes

-   4b906238: Preview html is shown in CAP project using cds-plugin-ui5@0.4.0

## 0.3.9

### Patch Changes

-   @sap-ux/adp-tooling@0.1.6

## 0.3.8

### Patch Changes

-   44df3d5c: fix lint warnings in locate-reuse-libs.js

## 0.3.7

### Patch Changes

-   29179b5f: Add SAP icon loading in flpsandbox.html

## 0.3.6

### Patch Changes

-   @sap-ux/adp-tooling@0.1.5

## 0.3.5

### Patch Changes

-   @sap-ux/adp-tooling@0.1.4

## 0.3.4

### Patch Changes

-   @sap-ux/adp-tooling@0.1.3

## 0.3.3

### Patch Changes

-   Updated dependencies [a256cd54]
    -   @sap-ux/adp-tooling@0.1.2

## 0.3.2

### Patch Changes

-   99e84511: FIX: use relative path to app to work with cds-plugin-ui5 in CAP projects

## 0.3.1

### Patch Changes

-   68ef7224: FIX: local artifacts like controller extensions are not loaded
-   Updated dependencies [68ef7224]
    -   @sap-ux/adp-tooling@0.1.1

## 0.3.0

### Minor Changes

-   f13aabe6: export FlpSandbox class for programmatic use of the middleware

## 0.2.0

### Minor Changes

-   d2fd9a58: Feature: support for SAP UI5 adaptation projects added

### Patch Changes

-   Updated dependencies [d2fd9a58]
    -   @sap-ux/adp-tooling@0.1.0

## 0.1.0

### Minor Changes

-   d2428273: Initial version of a middleware for previewing applications in a local FLP.
