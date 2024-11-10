# @sap-ux-private/preview-middleware-client

## 0.11.24

### Patch Changes

-   25488a9: fix: resolve the issue when add table action quick action in the object page didn't work because the Variant Management was disabled.

## 0.11.23

### Patch Changes

-   0671c95: support semantic date range quick action for v2/v4

## 0.11.22

### Patch Changes

-   61cea6d: Fix: Resolved an issue where Add Custom Table Column quick action didn't work with Analytical/Grid/Tree tables in SAP Fiori Elements for OData V2.

## 0.11.21

### Patch Changes

-   df6fd7f: Quick action added to create custom table columns

## 0.11.20

### Patch Changes

-   29a4ef6: feat: create page and table action quick actions for OData(v4) applications

## 0.11.19

### Patch Changes

-   4f9528e: Fixed incorrect displaying of inactive composite and control changes

## 0.11.18

### Patch Changes

-   5ec7106: Modified indicators incorrectly displayed for some UI5 controls in Adaptation Project

## 0.11.17

### Patch Changes

-   c04007b: Enable quick actions by default

## 0.11.16

### Patch Changes

-   9bda640: CPE loading changes from backend and not from workspace

## 0.11.15

### Patch Changes

-   93ffe8d: Use feature toggles in the control property editor

## 0.11.14

### Patch Changes

-   e3c3927: fix: no longer load sap.ushell.Container syncronously

## 0.11.13

### Patch Changes

-   fd215c2: Fixed a bug - Add Custom Page Action is not shown on the Object Page in some cases

## 0.11.12

### Patch Changes

-   7479bd3: fix: add page and table quick actions v2 app

## 0.11.11

### Patch Changes

-   1da1e7a: Small CPE UI improvements

## 0.11.10

### Patch Changes

-   c1462a9: fix: check if the flexbox is in objectpage and in Dyanmic header.

## 0.11.9

### Patch Changes

-   7579b99: UI improvements and bug fix in the Adaptation Editor

## 0.11.8

### Patch Changes

-   595bdea: feat: enhance "add-header-field" quick action with the template

## 0.11.7

### Patch Changes

-   b37b4c1: Fixed application mode after reload and various other usability fixes for Quick Actions

## 0.11.6

### Patch Changes

-   8f442a6: Usability improvements for Quick Actions that add fragments

## 0.11.5

### Patch Changes

-   1c20352: Added missing notification when manifest change is created

## 0.11.4

### Patch Changes

-   2fd82b1: Object Page Add Custom Section quick action support

## 0.11.3

### Patch Changes

-   09f91c3: Fix changing index in Add Fragment dialog

## 0.11.2

### Patch Changes

-   c08bb59: Fixed quick actions panel not rendered in case of app running ui5 v.1.71

## 0.11.1

### Patch Changes

-   247e0bb: fix: quick action titles

## 0.11.0

### Minor Changes

-   b1628da: Add quick actions to adaptation editor

## 0.10.9

### Patch Changes

-   904b048: Move error utils to dedicated utils folder

## 0.10.8

### Patch Changes

-   bad92cf: refactor ui5 version handling

## 0.10.7

### Patch Changes

-   cea1f9f: Fixed Add XML Fragment dialog not working if there is an unsaved "hideControl" change

## 0.10.6

### Patch Changes

-   089b984: Fix handling of undefined response from sap/ui/VersionInfo.load

## 0.10.5

### Patch Changes

-   ab2e5a0: Preview support for UI5 2.x

## 0.10.4

### Patch Changes

-   42486a5: fix(locate-reuse-lib): corrected extraction of component name

## 0.10.3

### Patch Changes

-   90a8291: Extension points break the outline tree sync for apps with UI5 version =< 1.96.33

## 0.10.2

### Patch Changes

-   671242b: Disable add fragment and controller extension rt-a menu items if clicked element is from reuse component view

## 0.10.1

### Patch Changes

-   b2d5843: fix: Missing Scenario API in lower SAPUI5 versions

## 0.10.0

### Minor Changes

-   c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.9.18

### Patch Changes

-   8f57ac28: i18n bindings validation fails for nested \*.properties files

## 0.9.17

### Patch Changes

-   0e0c2864: Fix Error message regression

## 0.9.16

### Patch Changes

-   fb2ff8d6: Reduce eslint warnings

## 0.9.15

### Patch Changes

-   81026f96: Add explanation at the end of disabled context menu item due to non stable ID

## 0.9.14

### Patch Changes

-   78de7813: RTA standard toolbar replaced with custom CPE toolbar

## 0.9.13

### Patch Changes

-   56d8b0b9: Add default content for extension points to the outline in CPE

## 0.9.12

### Patch Changes

-   52faf16f: Fix RTA initialization issue for UI5 versions less than 1.72.

## 0.9.11

### Patch Changes

-   39665ea9: Fix for CPE does not start UI Adaptation for ADP Projects with lower UI5 Version than 1.120

## 0.9.10

### Patch Changes

-   9e8af342: Disable fragment context menu item in CPE for controls with no stable id

## 0.9.9

### Patch Changes

-   cad21d4d: Enable Adding Controller Extension only on async views for Adp Projects

## 0.9.8

### Patch Changes

-   7697dea4: Outsourcing of initialization routine to manage app state from fiori-tools-proxy to preview-middleware-client and updating to UI5 2.0

## 0.9.7

### Patch Changes

-   2e296173: Enable telemetry for adaptation project

## 0.9.6

### Patch Changes

-   00cf3025: Alternative approach to have a consistent save for XML Fragments

## 0.9.5

### Patch Changes

-   da0ecd9a: Enable Typscript type checking in eslint module @sap-ux/eslint-plugin-fiori-tools

## 0.9.4

### Patch Changes

-   4cbb1639: "Open in VS Code" button for Controller Extension dialog does not work in BAS

## 0.9.3

### Patch Changes

-   6a477fba: feat: Replace auto-refresh with message in case of manual flex file changes

## 0.9.2

### Patch Changes

-   6d76e076: Enhance `preview-middleware` to allow running QUnit and OPA5 tests.

## 0.9.1

### Patch Changes

-   c15435b6: fix: remove engines pnpm from package.json

## 0.9.0

### Minor Changes

-   efd2f6d4: Support ui5 version 1.71.\* in CPE.

## 0.8.14

### Patch Changes

-   eb0b7b37: Chore - TypeScript 5 upgrade

## 0.8.13

### Patch Changes

-   70296b55: Remove label and icon in control property editor

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
