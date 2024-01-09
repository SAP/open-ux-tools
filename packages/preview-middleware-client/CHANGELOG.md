# @sap-ux-private/preview-middleware-client

## 0.8.12

### Patch Changes

-   83f25073: The extension points not shown as such in the Outline for ADP

## 0.8.11

### Patch Changes

-   132ce16d: Do not block app loading if registering of reuse libs fails

## 0.8.10

### Patch Changes

-   a714d53d: No unsaved change shown when adding fragment to Extension Point

## 0.8.9

### Patch Changes

-   a44e9007: Invalid target aggregation and index are accepted in Add Fragment dialog

## 0.8.8

### Patch Changes

-   733cec7b: No Datetime is shown for Code Ext changes in saved changes panel

## 0.8.7

### Patch Changes

-   ff457bef: Controller Extension and Fragment name now show error if there is a whitespace after their name

## 0.8.6

### Patch Changes

-   76c751be: Save button for ui5 versions lower than 1.110 is shown

## 0.8.5

### Patch Changes

-   5077d95f: Hide feedback and close buttons for adp projects

## 0.8.4

### Patch Changes

-   b4081d0a: Show warning message for adaptation project if ui5 version is less than 1.71

## 0.8.3

### Patch Changes

-   b5eb0792: Index field is disabled when aggregation with specialIndexHandling is chosen

## 0.8.2

### Patch Changes

-   02609800: Fix for comp/control variant changes not updating in pending changes tab

## 0.8.1

### Patch Changes

-   18c9d967: Add validation for property changes for i18n models

## 0.8.0

### Minor Changes

-   793f846b: Open existing controller from project files instead of creating a new one

## 0.7.4

### Patch Changes

-   061a6544: CPE UI is not updated when changes are saved or deleted

## 0.7.3

### Patch Changes

-   be8e3fb3: fix outline initialisation for the case when application is loaded, but outline is empty

## 0.7.2

### Patch Changes

-   e2b264c2: Make Control Property Editor aware which application (scenario) its running in the iframe

## 0.7.1

### Patch Changes

-   ca61803e: Fixed controller extension/fragment name longer than 64 chars error not showing up

## 0.7.0

### Minor Changes

-   6d2d2255: support all kind of changes from command stack

## 0.6.0

### Minor Changes

-   318e040e: Enables creation of XML fragments for Extension Points from the outline tree (when right-clicking on extension point) or from the application (when clicking on control).

## 0.5.1

### Patch Changes

-   5f90873d: The features for all adaptation projects which are loaded from "WorkspaceConnector" in "preview-middleware-client" are with "isVariantAdaptationEnabled=true".

## 0.5.0

### Minor Changes

-   1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

## 0.4.4

### Patch Changes

-   4052822f: Corrected license reference in package.json (no license change)

## 0.4.3

### Patch Changes

-   aef0ccf3: Add bindingString prop for getBindingInfo expression to support maintenance version

## 0.4.2

### Patch Changes

-   d66dd0aa: support createRenderer method for maintenance versions

## 0.4.1

### Patch Changes

-   8029360f: Add favicon for CPE and generator for variant-config

## 0.4.0

### Minor Changes

-   b023f4cb: Enhancing the preview-middleware with new functionality such as Controller Extension (creating "codeExt" change).

## 0.3.1

### Patch Changes

-   a7eda7c5: Fix and reuse manual mocks in unit test, removing ui5Facade, updating tsconfig

## 0.3.0

### Minor Changes

-   0f2ac46a: Enhanced the client to be able to communicate with a wrapping frame running the @sap-ux/control-property-editor.

## 0.2.1

### Patch Changes

-   0798e88e: Improving the FLP init script

## 0.2.0

### Minor Changes

-   ac0adb21: Enhancing the preview-middleware with new functionality such as adding an XML Fragment (creating "addXML" change).

## 0.1.2

### Patch Changes

-   63c698a8: chore - fix publishing of modules missed in failed release build

## 0.1.1

### Patch Changes

-   58424e73: chore(deps): update dependency @ui5/cli to v3.6.0

## 0.1.0

### Minor Changes

-   a73935c5: Initial version of the module containing a typescript version of of the flp init script.
