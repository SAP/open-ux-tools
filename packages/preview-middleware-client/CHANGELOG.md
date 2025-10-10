# @sap-ux-private/preview-middleware-client

## 0.17.3

### Patch Changes

-   9e94382: Disable flex changes for preview with virtual endpoints using UI5 sources from npmjs

## 0.17.2

### Patch Changes

-   43a2446: chore: fix Sonar issues

## 0.17.1

### Patch Changes

-   4fa9dd9: fix: for disabling change table column quick action when variant management is disabled

## 0.17.0

### Minor Changes

-   372e9ce: fix: [ADP][Info center] Remove all messages from the info center which overlap with messages added with the ui5 Log library.

## 0.16.0

### Minor Changes

-   a39e0d9: fix: [ADP] For ui5 components which do not provide api.json we do not display Documentation error in the info center.

## 0.15.3

### Patch Changes

-   ad49c30: fix: `Add Custom Table Column` Quick Action not using the correct fragment template.

## 0.15.2

### Patch Changes

-   f4da4a6: Fix Sonar issue: Invalid loop. Its body allows only one iteration.

## 0.15.1

### Patch Changes

-   98fbd93: Store fragment parent control info in fragment body

## 0.15.0

### Minor Changes

-   b1213b1: feat: Track all errors/warnings/info messages created in the adaptation editor and display them in the Info center.

## 0.14.11

### Patch Changes

-   fc8cc4a: fix: detect all sync views

## 0.14.10

### Patch Changes

-   6c2d08a: Create app descriptor changes for v4 add custom section quick action

## 0.14.9

### Patch Changes

-   0db69d6: fix: wrong property path used for Show Counts configuration change

## 0.14.8

### Patch Changes

-   59771f3: fix: Bump required versions of SAPUI5 for using ElementRegistry and RTA plugins

## 0.14.7

### Patch Changes

-   d4107bd: fix: enhanced homepage loading issues in ui5 v1.137.0

## 0.14.6

### Patch Changes

-   135c3ae: fix: Duplicate Extension Points are selected in outline tree

## 0.14.5

### Patch Changes

-   920c23d: Fix custom connector for flex changes in UI5 < 1.78

## 0.14.4

### Patch Changes

-   225e7d7: fix: Add message when controller extension pending change is created

## 0.14.3

### Patch Changes

-   c9b65f0: Migrate code from cards-editor-middleware to preview-middleware.

## 0.14.2

### Patch Changes

-   b49c43f: fix: added apptype to quickactions and contextmenu

## 0.14.1

### Patch Changes

-   5f3aa03: feat: Integration of ExtendControllerPlugin in Adaptation Editor

## 0.14.0

### Minor Changes

-   a28357d: chore - drop node18 support as it is out of maintenance

## 0.13.22

### Patch Changes

-   e856125: Fix: Generic handling for change type and new UI component for displaying

## 0.13.21

### Patch Changes

-   c89bdc2: fix: new column is not visible after using `Add Custom Table Column` Quick Action

## 0.13.20

### Patch Changes

-   9e7fa23: fix: Issues for Adaptation Projects using TypeScipt

## 0.13.19

### Patch Changes

-   258ecca: refactor: Enhance XML Fragment context menu control with addXMLPlugin Integration

## 0.13.18

### Patch Changes

-   091c3e9: fix: reuse component api consumption in Adaptation Editor

## 0.13.17

### Patch Changes

-   838d2de: fix: nested Quick Actions not working if there are sections with only one child (e.g Change Table Columns)

## 0.13.16

### Patch Changes

-   8fe1ab6: fix: added telemetry tracking for context menu

## 0.13.15

### Patch Changes

-   a64c215: feat: Change Table Actions CPE quick action added for ADP projects with OData V2 and V4

## 0.13.14

### Patch Changes

-   3727441: fix: CPE Add Subpage Quick Action not displayed for SAP Fiori Elements for OData V4 applications in Adaptation Projects, if current page has `contextPath` defined in manifest instead of `entitySet`.

## 0.13.13

### Patch Changes

-   9522deb: fix: Cannot create a Extension Point fragment when clicking create button in the dialog

## 0.13.12

### Patch Changes

-   6095875: fix: Cannot create a Fragment and Controller Extension when clicking create button in the dialog

## 0.13.11

### Patch Changes

-   ed6c364: Reuse component detection

## 0.13.10

### Patch Changes

-   59ab22b: feat: Add Subpage CPE quick action added for ADP projects with OData V4.

## 0.13.9

### Patch Changes

-   6cedb61: fix: enable telemetry for quickactions in adp

## 0.13.8

### Patch Changes

-   6e32009: feat: introduce enhanced flp homepage
    -   controlled via boolean property `flp.enhancedHomePage`, which is false by default

## 0.13.7

### Patch Changes

-   02874f7: feat: Feature toggle removed for Add Subpage CPE quick action

## 0.13.6

### Patch Changes

-   e754cb0: fix: disable "Add New Annotation File" Quick Action with tooltip, when 'metadata' is not loaded

## 0.13.5

### Patch Changes

-   b012c01: feat: Added new CPE Quick Action to create application subpages in V2 ADP projects

## 0.13.4

### Patch Changes

-   1fd8b3f: fix: legacy free ui5 version handling

## 0.13.3

### Patch Changes

-   f659540: fix: disable "Add Header Field" Quick Action when `showHeaderContent` is set to `false` for `ObjectPageLayout`

## 0.13.2

### Patch Changes

-   32dafd7: feat: refactor lrep connectors used for preview

## 0.13.1

### Patch Changes

-   1c07ab9: Allow controller extensions for reuse components on OnPremise systems

## 0.13.0

### Minor Changes

-   8568e6b: feat: Info Center for different type of messages

## 0.12.1

### Patch Changes

-   1d4ba46: feat: handling of legacy free ui5 version

## 0.12.0

### Minor Changes

-   127bd12: feat: Add Typescript support for Adaptation Project

## 0.11.69

### Patch Changes

-   df8d790: fix: 'Add Custom Table Column' CPE quick action is generating incorrect column fragment for Grid and Tree tables

## 0.11.68

### Patch Changes

-   1bcd64f: Fix: "Add Table Custom Action" quick action not being working in some V2 apps

## 0.11.67

### Patch Changes

-   583c4cd: Fix: Default aggregation array index to 1 for create page action and create table action

## 0.11.66

### Patch Changes

-   fd3bfb0: fix: "Add Table Custom Action" quick action not being working in some V2 apps

## 0.11.65

### Patch Changes

-   8930179: fix: New column created by "Add Table Custom Column" quick action not being displayed, due to incomplete column data in the fragment

## 0.11.64

### Patch Changes

-   931e735: Add stable ids to form elements

## 0.11.63

### Patch Changes

-   354107e: fix: Fixed bug in CPE. In some ADP projects Change Table Columns Quick Action didn't work

## 0.11.62

### Patch Changes

-   4d0b026: fix: undo redo issue for v2 manifest changes created via quickactions

## 0.11.61

### Patch Changes

-   063a2f4: fix: enable manifest actions for v2 apps with array page structure

## 0.11.60

### Patch Changes

-   d95bade: fix: Fixed various bugs related to Enable Variant Management for Tables quick action. It was unnecessarily disabled in some apps on List Report; changing Object Page table type led to enabling this action again; action is disabled now for custom tables, where it can't be applied.

## 0.11.59

### Patch Changes

-   644a9a6: feat: Scroll into view when clicking on a control that is not currently visible in the iframe

## 0.11.58

### Patch Changes

-   9ddf98f: Feature to add context menu on outline

## 0.11.57

### Patch Changes

-   5eff701: Fixed undo-redo issue for addAnnotationsToOdata change and updated title for the pending addAnnotationsToOdata change.

## 0.11.56

### Patch Changes

-   740f4d9: fix: CPE Quick action bug fix in ALP v4 projects. Add Custom Table Action worked incorrectly on Analytical Pages with multiple action toolbars in charts and tables.
    Some V4 Quick Action code refactoring to optimize

## 0.11.55

### Patch Changes

-   6b55228: Bind i18n models with namespace

## 0.11.54

### Patch Changes

-   61edb7b: Fixed "Enable/Disable Semantic Date Range in Filter Bar" quick action in SAP Fiori Elements for OData V2 applications when using UI5 version lower than 1.126.

## 0.11.53

### Patch Changes

-   1f98f07: Add stable ids in AddFragment and ControllerExtension forms

## 0.11.52

### Patch Changes

-   34bfb02: fix: parameter type of fakeConnector create function

## 0.11.51

### Patch Changes

-   1586cc3: CPE: Enable Variant Management in Tables and Charts Quick Action

## 0.11.50

### Patch Changes

-   b88531b: fix: Enabled missing quick actions on ALP in V2 adp projects

## 0.11.49

### Patch Changes

-   2a9c788: Fixed wrong initial state for "Disable Semantic Date Range in Filter Bar" Quick Action.

## 0.11.48

### Patch Changes

-   f115bfa: fix: update quick action list on external changes

## 0.11.47

### Patch Changes

-   19d51f3: feat: Quick Action For Add New Annotation File

## 0.11.46

### Patch Changes

-   8b7ed76: Fixed outline not being displayed in SAP Fiori Elements for OData V4 applications with multiple views.

## 0.11.45

### Patch Changes

-   d529c38: Fixed Quick Actions not working after trying to open multiple dialogs and Quick Actions that create manifest changes in SAP Fiori Elements for OData V2 applications not showing correct state when there are unsaved manifest changes.

## 0.11.44

### Patch Changes

-   0633837: Added quick action to enable Inline Rows Creation in the Object Page tables

## 0.11.43

### Patch Changes

-   5c4dc74: feat: add a more precise method to determine the current UI5 version

## 0.11.42

### Patch Changes

-   62c73b8: CPE - Hide Quick Actions in V2 application, if the application has old manifest structure.

## 0.11.41

### Patch Changes

-   76d5dcb: CPE - Update tooltip text for disabled table filtering variant quick action

## 0.11.40

### Patch Changes

-   0fb08df: Use ui5 version specific flp sandbox template instead of dynamic bootstrap

## 0.11.39

### Patch Changes

-   c10bf9f: fix: Various lint error fixes and code improvements

## 0.11.38

### Patch Changes

-   70e6d46: CPE - Disable Add Custom Column Quick Action, if table rows are required and not available

## 0.11.37

### Patch Changes

-   79d2435: fix: remove feature toggle check for Enable/Disable Semantic Date Range in Filter Bar
-   ca82698: CPE - Enable Table Filtering Quick Action

## 0.11.36

### Patch Changes

-   71bef63: fix: update quick action title for semantic date range

## 0.11.35

### Patch Changes

-   c39325c: Fix for Config Quick action state not reflecting properties in properties panel

## 0.11.34

### Patch Changes

-   326dbe5: Enable adding fragment to elements cloned from a template

## 0.11.33

### Patch Changes

-   e9438d6: fix: restrict the '"Semantic Date Range" in filter bar' quick-action for certain UI5 versions which are not supported for V2 application.

## 0.11.32

### Patch Changes

-   2a72ad2: chore - Fix audit issues

## 0.11.31

### Patch Changes

-   1f7827c: handle higher layer changes

## 0.11.30

### Patch Changes

-   f2d3335: Hide "Semantic Date Range" Quick Action behind feature toggle.

## 0.11.29

### Patch Changes

-   8c0ba5c: Fixed Adaptation Editor crash when project contains Personalization change.

## 0.11.28

### Patch Changes

-   8b123e3: Fixed typo in "Semantic Date Range" quick action.

## 0.11.27

### Patch Changes

-   fcc5518: Remove feature flag from "Add Custom Table Action", "Add Custom Page Action", "Add Custom Table Column" and "Change Table Columns" Quick Actions.

## 0.11.26

### Patch Changes

-   06e9468: Allow adaptations of manifest settings in FEv4 adaptation projects via Control Property Editor Property Panel

## 0.11.25

### Patch Changes

-   838cdf1: fix: Unavailability of changeHandlerAPI in lower ui5 version causes console to be spammed with errors

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
