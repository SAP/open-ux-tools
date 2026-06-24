# @sap-ux-private/preview-middleware-client

## 1.0.26

### Patch Changes

#### Release Date

2026-06-24

#### Bug Fixes

- remove static import to avoid eager sap.ui.dt load [[78d79c8](https://github.com/SAP/open-ux-tools/commit/78d79c8836a2a7768b8634ab226f1674b4bd0e78)]

## 1.0.25

## 1.0.24

### Patch Changes

#### Release Date

2026-06-17

#### Bug Fixes

- remove static import and use type-only imports to avoid eager sap.ui.rta load [[dec7cc5](https://github.com/SAP/open-ux-tools/commit/dec7cc5d001a561be36b59e3dfa6835b9e8e49e9)]

## 1.0.23

_Released: 2026-06-15T21:05:56Z_

## 1.0.22

_Released: 2026-06-14T10:40:09Z_

## 1.0.21

_Released: 2026-06-12T19:01:39Z_

## 1.0.20

_Released: 2026-06-12T14:48:41Z_

## 1.0.19

_Released: 2026-06-12T10:49:08Z_

### Patch Changes

- 6f3b596: fix: (Adaptation Editor) FL Variant changes do not appear in the unsaved changes list (history panel).

## 1.0.18

_Released: 2026-06-12T08:50:00Z_

### Patch Changes

- 0110219: fix regression writing wrong manifest path via the changes created via properties panel and remove unused control-property-editor-common code
- Updated dependencies [0110219]
    - @sap-ux-private/control-property-editor-common@1.0.3

## 1.0.17

_Released: 2026-06-12T06:53:23Z_

## 1.0.16

_Released: 2026-06-11T13:37:16Z_

## 1.0.15

_Released: 2026-06-11T10:54:17Z_

## 1.0.14

_Released: 2026-06-10T09:57:42Z_

## 1.0.13

_Released: 2026-06-09T14:35:01Z_

## 1.0.12

_Released: 2026-06-09T13:18:16Z_

## 1.0.11

_Released: 2026-06-09T09:41:14Z_

### Patch Changes

- bcfe9e3: Fix: Inconsistent property naming between RTA and CPE
- Updated dependencies [bcfe9e3]
    - @sap-ux-private/control-property-editor-common@1.0.2

## 1.0.10

_Released: 2026-06-04T13:54:21Z_

## 1.0.9

_Released: 2026-06-04T12:10:05Z_

## 1.0.8

_Released: 2026-06-04T10:19:37Z_

## 1.0.7

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux-private/control-property-editor-common@1.0.1

## 1.0.6

_Released: 2026-06-03T13:52:44Z_

## 1.0.5

_Released: 2026-06-02T21:37:28Z_

## 1.0.4

_Released: 2026-06-02T11:35:17Z_

## 1.0.3

_Released: 2026-06-02T08:56:31Z_

## 1.0.2

_Released: 2026-06-01T17:22:37Z_

## 1.0.1

_Released: 2026-06-01T15:15:26Z_

## 1.0.0

### Major Changes

- 32609a7: # Migration to ECMAScript Modules (ESM)

    Packages in the SAP Open UX Tools monorepo have been migrated from CommonJS (CJS) to ECMAScript Modules (ESM) with NodeNext module resolution.

    '@sap-ux/backend-proxy-middleware-cf' is experimental and will remain at major version 0.
    '@sap-ux/generator-odata-downloader' is a top level yeoman generator and will remain as CJS until validation as ESM is done.

    ## What Changed
    - **Module System**: Most packages now use native ESM (`"type": "module"` in package.json)
    - **TypeScript Configuration**: Updated to `module: "NodeNext"` and `moduleResolution: "NodeNext"`
    - **Import Statements**: All relative imports now include explicit `.js` extensions (per ESM spec)
    - **Build Output**: Generated JavaScript files are now ESM modules
    - **Node.js Requirement**: Minimum Node.js version remains >=22.x

    ### Jest Configuration (for Testing)

    If your project tests code that imports these packages, update your Jest configuration:

    ```js
    export default {
        extensionsToTreatAsEsm: ['.ts'],
        transform: {
            '^.+\\.ts$': ['ts-jest', { useESM: true }]
        }
    };
    ```

    And run Jest with: `NODE_OPTIONS='--experimental-vm-modules' jest`

### Patch Changes

- Updated dependencies [32609a7]
    - @sap-ux-private/control-property-editor-common@1.0.0

## 0.26.12

_Released: 2026-05-29T12:50:34Z_

## 0.26.11

_Released: 2026-05-29T06:59:27Z_

## 0.26.10

_Released: 2026-05-27T11:39:21Z_

## 0.26.9

_Released: 2026-05-27T10:42:47Z_

## 0.26.8

_Released: 2026-05-26T16:40:21Z_

## 0.26.7

_Released: 2026-05-22T13:30:05Z_

## 0.26.6

_Released: 2026-05-21T16:21:11Z_

## 0.26.5

_Released: 2026-05-21T14:58:44Z_

## 0.26.4

_Released: 2026-05-19T15:16:46Z_

## 0.26.3

_Released: 2026-05-18T08:15:14Z_

## 0.26.2

_Released: 2026-05-15T20:38:24Z_

## 0.26.1

_Released: 2026-05-15T13:12:06Z_

## 0.26.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux-private/control-property-editor-common@0.8.0

## 0.25.47

_Released: 2026-05-14T21:28:41Z_

## 0.25.46

_Released: 2026-05-14T14:16:50Z_

## 0.25.45

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux-private/control-property-editor-common@0.7.8

## 0.25.44

_Released: 2026-05-13T09:36:59Z_

## 0.25.43

_Released: 2026-05-12T18:00:39Z_

## 0.25.42

_Released: 2026-05-12T07:58:27Z_

### Patch Changes

- be5476f: feat: Display unhandled exceptions from the Controller extension inside the Info Center.

## 0.25.41

_Released: 2026-05-11T08:53:48Z_

### Patch Changes

- 17de742: fix: Add fragment list to model for custom fragments

## 0.25.40

_Released: 2026-05-07T07:06:42Z_

### Patch Changes

- f2bb2e4: Fix sonar issue 'Ensure that tainted data is validated before being used to construct a client-side request URL.' for method 'registerComponentDependencyPaths'

## 0.25.39

_Released: 2026-05-06T23:02:00Z_

## 0.25.38

_Released: 2026-05-04T08:49:55Z_

### Patch Changes

- 600f1b1: feat: Missing fragment or controller extension files errors to be shown in InfoCenter

## 0.25.37

_Released: 2026-05-01T15:46:09Z_

## 0.25.36

_Released: 2026-04-30T19:47:20Z_

## 0.25.35

_Released: 2026-04-30T14:23:24Z_

### Patch Changes

- c160401: fix: SONAR issues

## 0.25.34

_Released: 2026-04-30T13:10:33Z_

## 0.25.33

_Released: 2026-04-29T15:24:37Z_

## 0.25.32

_Released: 2026-04-27T19:47:46Z_

## 0.25.31

_Released: 2026-04-27T15:50:47Z_

### Patch Changes

- 165a6c2: feat: support ESLint 10

## 0.25.30

_Released: 2026-04-27T07:30:24Z_

## 0.25.29

_Released: 2026-04-23T12:54:21Z_

### Patch Changes

- 03d3ea1: fix(deps): Update dependency @ui5/manifest to v1.85.0

## 0.25.28

_Released: 2026-04-23T06:48:55Z_

## 0.25.27

_Released: 2026-04-22T12:38:46Z_

## 0.25.26

_Released: 2026-04-15T11:53:17Z_

## 0.25.25

_Released: 2026-04-15T08:11:32Z_

## 0.25.24

_Released: 2026-04-14T20:26:28Z_

## 0.25.23

_Released: 2026-04-14T12:35:35Z_

## 0.25.22

_Released: 2026-04-14T11:39:16Z_

## 0.25.21

_Released: 2026-04-09T11:02:11Z_

### Patch Changes

- 9696e29: Linting auto fix

## 0.25.20

_Released: 2026-04-09T07:00:16Z_

## 0.25.19

_Released: 2026-04-08T13:10:18Z_

### Patch Changes

- @sap-ux-private/control-property-editor-common@0.7.7

## 0.25.18

_Released: 2026-04-07T11:09:34Z_

## 0.25.17

_Released: 2026-04-06T06:37:05Z_

## 0.25.16

_Released: 2026-04-01T14:51:40Z_

## 0.25.15

_Released: 2026-04-01T13:59:33Z_

### Patch Changes

- 0153757: fix: RTA editor endpoint causing duplicate ID error if started from the launchpad sandbox

## 0.25.14

_Released: 2026-04-01T11:49:37Z_

## 0.25.13

_Released: 2026-04-01T06:34:51Z_

## 0.25.12

_Released: 2026-03-31T06:45:29Z_

## 0.25.11

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(preview-middleware-client): implement custom jsdom env for writable window.location; fix eslint config plugin scoping; upgrade shared devDependencies (jest 30)
    - @sap-ux-private/control-property-editor-common@0.7.7

## 0.25.10

_Released: 2026-03-30T14:18:57Z_

### Patch Changes

- 8408e10: enhancedHomePage - initialize cdm before bootstrap

## 0.19.1

_Released: 2026-03-20T16:53:08Z_

### Patch Changes

- 55eb5dc: fix: disable condensing in workspace connector for older SAPUI5 versions

## 0.19.0

_Released: 2026-03-17T14:06:05Z_

### Minor Changes

- 428ee72: fix: Rename action missing for Object Page elements in Adaptation Editor. Annotation changes are now explicitly disabled as they are not supported in developer mode.

## 0.18.27

_Released: 2026-03-17T08:35:25Z_

### Patch Changes

- 3626b55: fix: Add New Card flow broken for OVP adaptation projects

## 0.18.26

_Released: 2026-03-10T13:28:49Z_

### Patch Changes

- 05f3f4c: fix: Various ADP Generator fixes for CF flow

## 0.18.25

_Released: 2026-03-02T19:30:12Z_

### Patch Changes

- 8017bd3: updates for minimatch

    #37169

## 0.18.24

_Released: 2026-03-02T13:05:37Z_

### Patch Changes

- Updated dependencies [4f7b796]
    - @sap-ux-private/control-property-editor-common@0.7.7

## 0.18.23

_Released: 2026-02-25T14:21:41Z_

### Patch Changes

- ed1399d: Fix: Change custom column creation in v4 from addXML to appDescr change

## 0.18.22

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- 0ecc5f1: fix(deps): Update dependency @ui5/manifest to v1.83.0
- cc1c422: fix(deps): update dependency npm-run-all2 to v8
- Updated dependencies [cc1c422]
    - @sap-ux-private/control-property-editor-common@0.7.6

## 0.18.21

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- Updated dependencies [d588c26]
    - @sap-ux-private/control-property-editor-common@0.7.5

## 0.18.20

_Released: 2026-02-19T22:23:51Z_

### Patch Changes

- 88c68c9: fix(deps): update dependency @ui5/cli to v4.0.44

## 0.18.19

_Released: 2026-02-18T10:31:10Z_

### Patch Changes

- 227e704: Fix detection of sap.fe.macros.Table for newer UI5 versions.

## 0.18.18

_Released: 2026-02-18T07:50:55Z_

### Patch Changes

- 849529f: fix: Missing additional info for adaptation projects with local IDs

## 0.18.17

_Released: 2026-02-09T13:27:34Z_

### Patch Changes

- 40989a9: fix: Extension points under node 'element' not listed in Outline

## 0.18.16

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- Updated dependencies [9f11dd2]
    - @sap-ux-private/control-property-editor-common@0.7.4

## 0.18.15

_Released: 2026-01-30T10:12:51Z_

### Patch Changes

- 644a779: fix home page crashes from UI5 v1.142.2 and above

## 0.18.14

_Released: 2026-01-29T14:02:02Z_

### Patch Changes

- 6d71400: Changes to support v4.01 odata services

## 0.18.13

_Released: 2026-01-27T12:14:20Z_

### Patch Changes

- af8d6b8: fix: change table action creation for v4 from addXML to app descriptor change

## 0.18.12

_Released: 2026-01-26T14:35:00Z_

### Patch Changes

- c061595: fix: support rta and cpe for CAP node w/o mockserver

## 0.18.11

_Released: 2026-01-22T12:07:29Z_

### Patch Changes

- 1970178: Fix: Switch Page Action creation for OData V4 from addXML to appDescriptor based

## 0.18.10

_Released: 2026-01-16T13:57:39Z_

### Patch Changes

- be67fc4: adjust eslint config

## 0.18.9

_Released: 2026-01-09T11:35:48Z_

### Patch Changes

- e111d0d: fix sonar issues

## 0.18.8

_Released: 2025-12-23T18:45:16Z_

### Patch Changes

- d24f36d: refactor: update ESLint configuration to remove unnecessary `defineConfig` usage

## 0.18.7

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues
    - @sap-ux-private/control-property-editor-common@0.7.3

## 0.18.6

_Released: 2025-12-17T10:17:22Z_

### Patch Changes

- ffcf1b2: fix sonar issues: replace getAttribute() with .dataset

## 0.18.5

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux-private/control-property-editor-common@0.7.3

## 0.18.4

_Released: 2025-12-08T17:56:48Z_

### Patch Changes

- 037a430: fix high severity Sonar issues

## 0.18.3

_Released: 2025-11-27T14:58:09Z_

### Patch Changes

- 07725fe: Bump @sap/manifest version

## 0.18.2

_Released: 2025-11-20T16:33:02Z_

### Patch Changes

- d37ad9b: fix: adjust fallback UI5 version

## 0.18.1

_Released: 2025-11-18T12:29:09Z_

### Patch Changes

- 5475b5b: Store fragment parent control info in fragment body

## 0.18.0

_Released: 2025-11-13T12:09:57Z_

### Minor Changes

- a0a1570: feat(ADP)(OData): Display in the Info center the OData service connectivity status at startup of the Visual Editor.

## 0.17.4

_Released: 2025-11-07T10:42:49Z_

### Patch Changes

- 81c99f9: chore - upgrade ui5 devDeps

## 0.17.3

_Released: 2025-10-10T12:22:06Z_

### Patch Changes

- 9e94382: Disable flex changes for preview with virtual endpoints using UI5 sources from npmjs

## 0.17.2

_Released: 2025-10-06T17:09:01Z_

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 0.17.1

_Released: 2025-09-16T13:41:31Z_

### Patch Changes

- 4fa9dd9: fix: for disabling change table column quick action when variant management is disabled

## 0.17.0

_Released: 2025-08-20T14:35:17Z_

### Minor Changes

- 372e9ce: fix: [ADP][Info center] Remove all messages from the info center which overlap with messages added with the ui5 Log library.

## 0.16.0

_Released: 2025-08-20T10:21:41Z_

### Minor Changes

- a39e0d9: fix: [ADP] For ui5 components which do not provide api.json we do not display Documentation error in the info center.

## 0.15.3

_Released: 2025-08-06T13:30:46Z_

### Patch Changes

- ad49c30: fix: `Add Custom Table Column` Quick Action not using the correct fragment template.

## 0.15.2

_Released: 2025-08-05T07:36:16Z_

### Patch Changes

- f4da4a6: Fix Sonar issue: Invalid loop. Its body allows only one iteration.

## 0.15.1

_Released: 2025-08-04T07:58:35Z_

### Patch Changes

- 98fbd93: Store fragment parent control info in fragment body

## 0.15.0

_Released: 2025-08-01T13:45:39Z_

### Minor Changes

- b1213b1: feat: Track all errors/warnings/info messages created in the adaptation editor and display them in the Info center.

## 0.14.11

_Released: 2025-07-03T10:55:06Z_

### Patch Changes

- fc8cc4a: fix: detect all sync views

## 0.14.10

_Released: 2025-07-02T05:46:03Z_

### Patch Changes

- 6c2d08a: Create app descriptor changes for v4 add custom section quick action

## 0.14.9

_Released: 2025-06-27T13:35:21Z_

### Patch Changes

- 0db69d6: fix: wrong property path used for Show Counts configuration change

## 0.14.8

_Released: 2025-06-16T11:05:48Z_

### Patch Changes

- 59771f3: fix: Bump required versions of SAPUI5 for using ElementRegistry and RTA plugins

## 0.14.7

_Released: 2025-06-12T11:01:29Z_

### Patch Changes

- d4107bd: fix: enhanced homepage loading issues in ui5 v1.137.0

## 0.14.6

_Released: 2025-06-10T04:37:22Z_

### Patch Changes

- 135c3ae: fix: Duplicate Extension Points are selected in outline tree

## 0.14.5

_Released: 2025-06-03T11:51:09Z_

### Patch Changes

- 920c23d: Fix custom connector for flex changes in UI5 < 1.78

## 0.14.4

_Released: 2025-05-21T11:50:26Z_

### Patch Changes

- 225e7d7: fix: Add message when controller extension pending change is created

## 0.14.3

_Released: 2025-05-19T05:14:26Z_

### Patch Changes

- c9b65f0: Migrate code from cards-editor-middleware to preview-middleware.

## 0.14.2

_Released: 2025-05-16T08:49:04Z_

### Patch Changes

- b49c43f: fix: added apptype to quickactions and contextmenu

## 0.14.1

_Released: 2025-05-15T14:05:09Z_

### Patch Changes

- 5f3aa03: feat: Integration of ExtendControllerPlugin in Adaptation Editor

## 0.14.0

_Released: 2025-05-14T22:35:53Z_

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

## 0.13.22

_Released: 2025-05-14T08:48:37Z_

### Patch Changes

- e856125: Fix: Generic handling for change type and new UI component for displaying

## 0.13.21

_Released: 2025-05-02T15:10:51Z_

### Patch Changes

- c89bdc2: fix: new column is not visible after using `Add Custom Table Column` Quick Action

## 0.13.20

_Released: 2025-05-02T07:45:43Z_

### Patch Changes

- 9e7fa23: fix: Issues for Adaptation Projects using TypeScipt

## 0.13.19

_Released: 2025-04-25T13:08:37Z_

### Patch Changes

- 258ecca: refactor: Enhance XML Fragment context menu control with addXMLPlugin Integration

## 0.13.18

_Released: 2025-04-25T08:41:48Z_

### Patch Changes

- 091c3e9: fix: reuse component api consumption in Adaptation Editor

## 0.13.17

_Released: 2025-04-15T15:11:22Z_

### Patch Changes

- 838d2de: fix: nested Quick Actions not working if there are sections with only one child (e.g Change Table Columns)

## 0.13.16

_Released: 2025-04-15T12:59:48Z_

### Patch Changes

- 8fe1ab6: fix: added telemetry tracking for context menu

## 0.13.15

_Released: 2025-04-14T10:45:46Z_

### Patch Changes

- a64c215: feat: Change Table Actions CPE quick action added for ADP projects with OData V2 and V4

## 0.13.14

_Released: 2025-04-03T10:27:23Z_

### Patch Changes

- 3727441: fix: CPE Add Subpage Quick Action not displayed for SAP Fiori Elements for OData V4 applications in Adaptation Projects, if current page has `contextPath` defined in manifest instead of `entitySet`.

## 0.13.13

_Released: 2025-04-03T09:56:21Z_

### Patch Changes

- 9522deb: fix: Cannot create a Extension Point fragment when clicking create button in the dialog

## 0.13.12

_Released: 2025-04-02T15:24:36Z_

### Patch Changes

- 6095875: fix: Cannot create a Fragment and Controller Extension when clicking create button in the dialog

## 0.13.11

_Released: 2025-04-02T07:47:22Z_

### Patch Changes

- ed6c364: Reuse component detection

## 0.13.10

_Released: 2025-03-31T11:57:23Z_

### Patch Changes

- 59ab22b: feat: Add Subpage CPE quick action added for ADP projects with OData V4.

## 0.13.9

_Released: 2025-03-27T11:46:15Z_

### Patch Changes

- 6cedb61: fix: enable telemetry for quickactions in adp

## 0.13.8

_Released: 2025-03-20T17:49:21Z_

### Patch Changes

- 6e32009: feat: introduce enhanced flp homepage
    - controlled via boolean property `flp.enhancedHomePage`, which is false by default

## 0.13.7

_Released: 2025-03-19T11:57:33Z_

### Patch Changes

- 02874f7: feat: Feature toggle removed for Add Subpage CPE quick action

## 0.13.6

_Released: 2025-03-19T11:14:07Z_

### Patch Changes

- e754cb0: fix: disable "Add New Annotation File" Quick Action with tooltip, when 'metadata' is not loaded

## 0.13.5

_Released: 2025-03-14T14:57:28Z_

### Patch Changes

- b012c01: feat: Added new CPE Quick Action to create application subpages in V2 ADP projects

## 0.13.4

_Released: 2025-03-14T13:47:34Z_

### Patch Changes

- 1fd8b3f: fix: legacy free ui5 version handling

## 0.13.3

_Released: 2025-03-14T09:27:23Z_

### Patch Changes

- f659540: fix: disable "Add Header Field" Quick Action when `showHeaderContent` is set to `false` for `ObjectPageLayout`

## 0.13.2

_Released: 2025-03-11T09:32:55Z_

### Patch Changes

- 32dafd7: feat: refactor lrep connectors used for preview

## 0.13.1

_Released: 2025-03-06T08:13:39Z_

### Patch Changes

- 1c07ab9: Allow controller extensions for reuse components on OnPremise systems

## 0.13.0

_Released: 2025-03-05T14:45:32Z_

### Minor Changes

- 8568e6b: feat: Info Center for different type of messages

## 0.12.1

_Released: 2025-02-27T08:22:17Z_

### Patch Changes

- 1d4ba46: feat: handling of legacy free ui5 version

## 0.12.0

_Released: 2025-02-26T11:38:25Z_

### Minor Changes

- 127bd12: feat: Add Typescript support for Adaptation Project

## 0.11.69

_Released: 2025-02-20T16:17:08Z_

### Patch Changes

- df8d790: fix: 'Add Custom Table Column' CPE quick action is generating incorrect column fragment for Grid and Tree tables

## 0.11.68

_Released: 2025-02-20T14:59:15Z_

### Patch Changes

- 1bcd64f: Fix: "Add Table Custom Action" quick action not being working in some V2 apps

## 0.11.67

_Released: 2025-02-19T15:40:17Z_

### Patch Changes

- 583c4cd: Fix: Default aggregation array index to 1 for create page action and create table action

## 0.11.66

_Released: 2025-02-19T14:00:10Z_

### Patch Changes

- fd3bfb0: fix: "Add Table Custom Action" quick action not being working in some V2 apps

## 0.11.65

_Released: 2025-02-18T13:48:13Z_

### Patch Changes

- 8930179: fix: New column created by "Add Table Custom Column" quick action not being displayed, due to incomplete column data in the fragment

## 0.11.64

_Released: 2025-02-14T13:14:56Z_

### Patch Changes

- 931e735: Add stable ids to form elements

## 0.11.63

_Released: 2025-02-14T10:33:11Z_

### Patch Changes

- 354107e: fix: Fixed bug in CPE. In some ADP projects Change Table Columns Quick Action didn't work

## 0.11.62

_Released: 2025-02-13T15:50:31Z_

### Patch Changes

- 4d0b026: fix: undo redo issue for v2 manifest changes created via quickactions

## 0.11.61

_Released: 2025-02-12T10:20:01Z_

### Patch Changes

- 063a2f4: fix: enable manifest actions for v2 apps with array page structure

## 0.11.60

_Released: 2025-02-11T12:37:59Z_

### Patch Changes

- d95bade: fix: Fixed various bugs related to Enable Variant Management for Tables quick action. It was unnecessarily disabled in some apps on List Report; changing Object Page table type led to enabling this action again; action is disabled now for custom tables, where it can't be applied.

## 0.11.59

_Released: 2025-02-07T10:33:58Z_

### Patch Changes

- 644a9a6: feat: Scroll into view when clicking on a control that is not currently visible in the iframe

## 0.11.58

_Released: 2025-02-05T12:39:22Z_

### Patch Changes

- 9ddf98f: Feature to add context menu on outline

## 0.11.57

_Released: 2025-02-05T07:28:28Z_

### Patch Changes

- 5eff701: Fixed undo-redo issue for addAnnotationsToOdata change and updated title for the pending addAnnotationsToOdata change.

## 0.11.56

_Released: 2025-02-03T11:19:18Z_

### Patch Changes

- 740f4d9: fix: CPE Quick action bug fix in ALP v4 projects. Add Custom Table Action worked incorrectly on Analytical Pages with multiple action toolbars in charts and tables.
  Some V4 Quick Action code refactoring to optimize

## 0.11.55

_Released: 2025-02-03T08:48:10Z_

### Patch Changes

- 6b55228: Bind i18n models with namespace

## 0.11.54

_Released: 2025-01-31T13:54:48Z_

### Patch Changes

- 61edb7b: Fixed "Enable/Disable Semantic Date Range in Filter Bar" quick action in SAP Fiori Elements for OData V2 applications when using UI5 version lower than 1.126.

## 0.11.53

_Released: 2025-01-29T14:23:25Z_

### Patch Changes

- 1f98f07: Add stable ids in AddFragment and ControllerExtension forms

## 0.11.52

_Released: 2025-01-27T15:56:32Z_

### Patch Changes

- 34bfb02: fix: parameter type of fakeConnector create function

## 0.11.51

_Released: 2025-01-22T18:11:17Z_

### Patch Changes

- 1586cc3: CPE: Enable Variant Management in Tables and Charts Quick Action

## 0.11.50

_Released: 2025-01-22T13:03:36Z_

### Patch Changes

- b88531b: fix: Enabled missing quick actions on ALP in V2 adp projects

## 0.11.49

_Released: 2025-01-15T14:46:53Z_

### Patch Changes

- 2a9c788: Fixed wrong initial state for "Disable Semantic Date Range in Filter Bar" Quick Action.

## 0.11.48

_Released: 2025-01-13T18:05:42Z_

### Patch Changes

- f115bfa: fix: update quick action list on external changes

## 0.11.47

_Released: 2025-01-08T17:16:17Z_

### Patch Changes

- 19d51f3: feat: Quick Action For Add New Annotation File

## 0.11.46

_Released: 2025-01-08T16:18:38Z_

### Patch Changes

- 8b7ed76: Fixed outline not being displayed in SAP Fiori Elements for OData V4 applications with multiple views.

## 0.11.45

_Released: 2024-12-23T10:38:10Z_

### Patch Changes

- d529c38: Fixed Quick Actions not working after trying to open multiple dialogs and Quick Actions that create manifest changes in SAP Fiori Elements for OData V2 applications not showing correct state when there are unsaved manifest changes.

## 0.11.44

_Released: 2024-12-23T08:07:40Z_

### Patch Changes

- 0633837: Added quick action to enable Inline Rows Creation in the Object Page tables

## 0.11.43

_Released: 2024-12-16T20:04:55Z_

### Patch Changes

- 5c4dc74: feat: add a more precise method to determine the current UI5 version

## 0.11.42

_Released: 2024-12-05T14:52:52Z_

### Patch Changes

- 62c73b8: CPE - Hide Quick Actions in V2 application, if the application has old manifest structure.

## 0.11.41

_Released: 2024-12-05T13:35:32Z_

### Patch Changes

- 76d5dcb: CPE - Update tooltip text for disabled table filtering variant quick action

## 0.11.40

_Released: 2024-12-03T19:20:21Z_

### Patch Changes

- 0fb08df: Use ui5 version specific flp sandbox template instead of dynamic bootstrap

## 0.11.39

_Released: 2024-12-02T15:33:37Z_

### Patch Changes

- c10bf9f: fix: Various lint error fixes and code improvements

## 0.11.38

_Released: 2024-12-02T11:02:56Z_

### Patch Changes

- 70e6d46: CPE - Disable Add Custom Column Quick Action, if table rows are required and not available

## 0.11.37

_Released: 2024-11-29T13:58:32Z_

### Patch Changes

- 79d2435: fix: remove feature toggle check for Enable/Disable Semantic Date Range in Filter Bar
- ca82698: CPE - Enable Table Filtering Quick Action

## 0.11.36

_Released: 2024-11-27T09:57:43Z_

### Patch Changes

- 71bef63: fix: update quick action title for semantic date range

## 0.11.35

_Released: 2024-11-21T13:02:44Z_

### Patch Changes

- c39325c: Fix for Config Quick action state not reflecting properties in properties panel

## 0.11.34

_Released: 2024-11-21T09:29:17Z_

### Patch Changes

- 326dbe5: Enable adding fragment to elements cloned from a template

## 0.11.33

_Released: 2024-11-20T16:11:59Z_

### Patch Changes

- e9438d6: fix: restrict the '"Semantic Date Range" in filter bar' quick-action for certain UI5 versions which are not supported for V2 application.

## 0.11.32

_Released: 2024-11-19T15:25:45Z_

### Patch Changes

- 2a72ad2: chore - Fix audit issues

## 0.11.31

_Released: 2024-11-15T17:07:03Z_

### Patch Changes

- 1f7827c: handle higher layer changes

## 0.11.30

_Released: 2024-11-15T09:46:36Z_

### Patch Changes

- f2d3335: Hide "Semantic Date Range" Quick Action behind feature toggle.

## 0.11.29

_Released: 2024-11-13T16:02:41Z_

### Patch Changes

- 8c0ba5c: Fixed Adaptation Editor crash when project contains Personalization change.

## 0.11.28

_Released: 2024-11-13T12:42:43Z_

### Patch Changes

- 8b123e3: Fixed typo in "Semantic Date Range" quick action.

## 0.11.27

_Released: 2024-11-13T09:28:03Z_

### Patch Changes

- fcc5518: Remove feature flag from "Add Custom Table Action", "Add Custom Page Action", "Add Custom Table Column" and "Change Table Columns" Quick Actions.

## 0.11.26

_Released: 2024-11-12T14:14:38Z_

### Patch Changes

- 06e9468: Allow adaptations of manifest settings in FEv4 adaptation projects via Control Property Editor Property Panel

## 0.11.25

_Released: 2024-11-11T13:10:42Z_

### Patch Changes

- 838cdf1: fix: Unavailability of changeHandlerAPI in lower ui5 version causes console to be spammed with errors

## 0.11.24

_Released: 2024-11-08T11:05:11Z_

### Patch Changes

- 25488a9: fix: resolve the issue when add table action quick action in the object page didn't work because the Variant Management was disabled.

## 0.11.23

_Released: 2024-11-07T16:57:18Z_

### Patch Changes

- 0671c95: support semantic date range quick action for v2/v4

## 0.11.22

_Released: 2024-10-31T11:07:24Z_

### Patch Changes

- 61cea6d: Fix: Resolved an issue where Add Custom Table Column quick action didn't work with Analytical/Grid/Tree tables in SAP Fiori Elements for OData V2.

## 0.11.21

_Released: 2024-10-30T16:46:53Z_

### Patch Changes

- df6fd7f: Quick action added to create custom table columns

## 0.11.20

_Released: 2024-10-30T10:01:08Z_

### Patch Changes

- 29a4ef6: feat: create page and table action quick actions for OData(v4) applications

## 0.11.19

_Released: 2024-10-30T09:11:46Z_

### Patch Changes

- 4f9528e: Fixed incorrect displaying of inactive composite and control changes

## 0.11.18

_Released: 2024-10-25T14:04:19Z_

### Patch Changes

- 5ec7106: Modified indicators incorrectly displayed for some UI5 controls in Adaptation Project

## 0.11.17

_Released: 2024-10-24T10:07:41Z_

### Patch Changes

- c04007b: Enable quick actions by default

## 0.11.16

_Released: 2024-10-22T09:03:13Z_

### Patch Changes

- 9bda640: CPE loading changes from backend and not from workspace

## 0.11.15

_Released: 2024-10-16T14:50:28Z_

### Patch Changes

- 93ffe8d: Use feature toggles in the control property editor

## 0.11.14

_Released: 2024-10-08T12:31:45Z_

### Patch Changes

- e3c3927: fix: no longer load sap.ushell.Container syncronously

## 0.11.13

_Released: 2024-10-07T14:03:34Z_

### Patch Changes

- fd215c2: Fixed a bug - Add Custom Page Action is not shown on the Object Page in some cases

## 0.11.12

_Released: 2024-10-02T11:32:12Z_

### Patch Changes

- 7479bd3: fix: add page and table quick actions v2 app

## 0.11.11

_Released: 2024-10-01T09:10:42Z_

### Patch Changes

- 1da1e7a: Small CPE UI improvements

## 0.11.10

_Released: 2024-09-27T13:04:40Z_

### Patch Changes

- c1462a9: fix: check if the flexbox is in objectpage and in Dyanmic header.

## 0.11.9

_Released: 2024-09-26T15:06:27Z_

### Patch Changes

- 7579b99: UI improvements and bug fix in the Adaptation Editor

## 0.11.8

_Released: 2024-09-25T13:19:11Z_

### Patch Changes

- 595bdea: feat: enhance "add-header-field" quick action with the template

## 0.11.7

_Released: 2024-09-25T08:23:49Z_

### Patch Changes

- b37b4c1: Fixed application mode after reload and various other usability fixes for Quick Actions

## 0.11.6

_Released: 2024-09-24T11:55:25Z_

### Patch Changes

- 8f442a6: Usability improvements for Quick Actions that add fragments

## 0.11.5

_Released: 2024-09-18T16:51:00Z_

### Patch Changes

- 1c20352: Added missing notification when manifest change is created

## 0.11.4

_Released: 2024-09-17T10:23:36Z_

### Patch Changes

- 2fd82b1: Object Page Add Custom Section quick action support

## 0.11.3

_Released: 2024-09-16T16:29:20Z_

### Patch Changes

- 09f91c3: Fix changing index in Add Fragment dialog

## 0.11.2

_Released: 2024-09-11T07:18:24Z_

### Patch Changes

- c08bb59: Fixed quick actions panel not rendered in case of app running ui5 v.1.71

## 0.11.1

_Released: 2024-09-06T09:47:05Z_

### Patch Changes

- 247e0bb: fix: quick action titles

## 0.11.0

_Released: 2024-09-04T11:08:59Z_

### Minor Changes

- b1628da: Add quick actions to adaptation editor

## 0.10.9

_Released: 2024-08-20T13:19:53Z_

### Patch Changes

- 904b048: Move error utils to dedicated utils folder

## 0.10.8

_Released: 2024-08-19T16:20:56Z_

### Patch Changes

- bad92cf: refactor ui5 version handling

## 0.10.7

_Released: 2024-08-06T09:20:51Z_

### Patch Changes

- cea1f9f: Fixed Add XML Fragment dialog not working if there is an unsaved "hideControl" change

## 0.10.6

_Released: 2024-08-05T08:16:11Z_

### Patch Changes

- 089b984: Fix handling of undefined response from sap/ui/VersionInfo.load

## 0.10.5

_Released: 2024-07-31T13:34:22Z_

### Patch Changes

- ab2e5a0: Preview support for UI5 2.x

## 0.10.4

_Released: 2024-07-25T14:56:14Z_

### Patch Changes

- 42486a5: fix(locate-reuse-lib): corrected extraction of component name

## 0.10.3

_Released: 2024-07-18T06:30:32Z_

### Patch Changes

- 90a8291: Extension points break the outline tree sync for apps with UI5 version =< 1.96.33

## 0.10.2

_Released: 2024-07-10T14:03:43Z_

### Patch Changes

- 671242b: Disable add fragment and controller extension rt-a menu items if clicked element is from reuse component view

## 0.10.1

_Released: 2024-07-08T13:31:31Z_

### Patch Changes

- b2d5843: fix: Missing Scenario API in lower SAPUI5 versions

## 0.10.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.9.18

_Released: 2024-07-04T09:14:43Z_

### Patch Changes

- 8f57ac28: i18n bindings validation fails for nested \*.properties files

## 0.9.17

_Released: 2024-07-02T14:54:18Z_

### Patch Changes

- 0e0c2864: Fix Error message regression

## 0.9.16

_Released: 2024-06-26T14:04:41Z_

### Patch Changes

- fb2ff8d6: Reduce eslint warnings

## 0.9.15

_Released: 2024-06-03T07:02:28Z_

### Patch Changes

- 81026f96: Add explanation at the end of disabled context menu item due to non stable ID

## 0.9.14

_Released: 2024-05-28T14:57:10Z_

### Patch Changes

- 78de7813: RTA standard toolbar replaced with custom CPE toolbar

## 0.9.13

_Released: 2024-05-23T07:03:28Z_

### Patch Changes

- 56d8b0b9: Add default content for extension points to the outline in CPE

## 0.9.12

_Released: 2024-05-21T07:52:26Z_

### Patch Changes

- 52faf16f: Fix RTA initialization issue for UI5 versions less than 1.72.

## 0.9.11

_Released: 2024-05-17T10:35:55Z_

### Patch Changes

- 39665ea9: Fix for CPE does not start UI Adaptation for ADP Projects with lower UI5 Version than 1.120

## 0.9.10

_Released: 2024-05-16T08:55:59Z_

### Patch Changes

- 9e8af342: Disable fragment context menu item in CPE for controls with no stable id

## 0.9.9

_Released: 2024-05-10T12:37:23Z_

### Patch Changes

- cad21d4d: Enable Adding Controller Extension only on async views for Adp Projects

## 0.9.8

_Released: 2024-05-03T07:58:03Z_

### Patch Changes

- 7697dea4: Outsourcing of initialization routine to manage app state from fiori-tools-proxy to preview-middleware-client and updating to UI5 2.0

## 0.9.7

_Released: 2024-04-29T06:40:37Z_

### Patch Changes

- 2e296173: Enable telemetry for adaptation project

## 0.9.6

_Released: 2024-04-23T12:10:47Z_

### Patch Changes

- 00cf3025: Alternative approach to have a consistent save for XML Fragments

## 0.9.5

_Released: 2024-04-11T18:52:44Z_

### Patch Changes

- da0ecd9a: Enable Typscript type checking in eslint module @sap-ux/eslint-plugin-fiori-tools

## 0.9.4

_Released: 2024-04-10T08:23:35Z_

### Patch Changes

- 4cbb1639: "Open in VS Code" button for Controller Extension dialog does not work in BAS

## 0.9.3

_Released: 2024-03-21T16:21:01Z_

### Patch Changes

- 6a477fba: feat: Replace auto-refresh with message in case of manual flex file changes

## 0.9.2

_Released: 2024-03-14T16:45:54Z_

### Patch Changes

- 6d76e076: Enhance `preview-middleware` to allow running QUnit and OPA5 tests.

## 0.9.1

_Released: 2024-02-27T22:07:50Z_

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json

## 0.9.0

_Released: 2024-02-23T08:01:15Z_

### Minor Changes

- efd2f6d4: Support ui5 version 1.71.\* in CPE.

## 0.8.14

_Released: 2024-02-07T11:10:48Z_

### Patch Changes

- eb0b7b37: Chore - TypeScript 5 upgrade

## 0.8.13

_Released: 2024-01-15T08:59:06Z_

### Patch Changes

- 70296b55: Remove label and icon in control property editor

## 0.8.12

_Released: 2023-12-19T15:05:28Z_

### Patch Changes

- 83f25073: The extension points not shown as such in the Outline for ADP

## 0.8.11

_Released: 2023-12-15T08:21:23Z_

### Patch Changes

- 132ce16d: Do not block app loading if registering of reuse libs fails

## 0.8.10

_Released: 2023-12-08T15:48:19Z_

### Patch Changes

- a714d53d: No unsaved change shown when adding fragment to Extension Point

## 0.8.9

_Released: 2023-12-08T14:54:20Z_

### Patch Changes

- a44e9007: Invalid target aggregation and index are accepted in Add Fragment dialog

## 0.8.8

_Released: 2023-12-01T12:26:19Z_

### Patch Changes

- 733cec7b: No Datetime is shown for Code Ext changes in saved changes panel

## 0.8.7

_Released: 2023-12-01T09:42:31Z_

### Patch Changes

- ff457bef: Controller Extension and Fragment name now show error if there is a whitespace after their name

## 0.8.6

_Released: 2023-12-01T08:12:22Z_

### Patch Changes

- 76c751be: Save button for ui5 versions lower than 1.110 is shown

## 0.8.5

_Released: 2023-11-29T15:44:12Z_

### Patch Changes

- 5077d95f: Hide feedback and close buttons for adp projects

## 0.8.4

_Released: 2023-11-29T14:45:41Z_

### Patch Changes

- b4081d0a: Show warning message for adaptation project if ui5 version is less than 1.71

## 0.8.3

_Released: 2023-11-28T07:54:47Z_

### Patch Changes

- b5eb0792: Index field is disabled when aggregation with specialIndexHandling is chosen

## 0.8.2

_Released: 2023-11-24T13:24:36Z_

### Patch Changes

- 02609800: Fix for comp/control variant changes not updating in pending changes tab

## 0.8.1

_Released: 2023-11-15T07:35:31Z_

### Patch Changes

- 18c9d967: Add validation for property changes for i18n models

## 0.8.0

_Released: 2023-11-13T14:11:36Z_

### Minor Changes

- 793f846b: Open existing controller from project files instead of creating a new one

## 0.7.4

_Released: 2023-11-13T13:37:19Z_

### Patch Changes

- 061a6544: CPE UI is not updated when changes are saved or deleted

## 0.7.3

_Released: 2023-11-10T11:42:00Z_

### Patch Changes

- be8e3fb3: fix outline initialisation for the case when application is loaded, but outline is empty

## 0.7.2

_Released: 2023-11-08T11:15:50Z_

### Patch Changes

- e2b264c2: Make Control Property Editor aware which application (scenario) its running in the iframe

## 0.7.1

_Released: 2023-11-07T12:44:34Z_

### Patch Changes

- ca61803e: Fixed controller extension/fragment name longer than 64 chars error not showing up

## 0.7.0

_Released: 2023-11-06T16:53:10Z_

### Minor Changes

- 6d2d2255: support all kind of changes from command stack

## 0.6.0

_Released: 2023-11-03T13:38:39Z_

### Minor Changes

- 318e040e: Enables creation of XML fragments for Extension Points from the outline tree (when right-clicking on extension point) or from the application (when clicking on control).

## 0.5.1

_Released: 2023-10-23T07:22:27Z_

### Patch Changes

- 5f90873d: The features for all adaptation projects which are loaded from "WorkspaceConnector" in "preview-middleware-client" are with "isVariantAdaptationEnabled=true".

## 0.5.0

_Released: 2023-10-19T12:06:19Z_

### Minor Changes

- 1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

## 0.4.4

_Released: 2023-10-17T08:28:48Z_

### Patch Changes

- 4052822f: Corrected license reference in package.json (no license change)

## 0.4.3

_Released: 2023-10-16T09:28:25Z_

### Patch Changes

- aef0ccf3: Add bindingString prop for getBindingInfo expression to support maintenance version

## 0.4.2

_Released: 2023-10-10T10:00:09Z_

### Patch Changes

- d66dd0aa: support createRenderer method for maintenance versions

## 0.4.1

_Released: 2023-10-05T14:55:15Z_

### Patch Changes

- 8029360f: Add favicon for CPE and generator for variant-config

## 0.4.0

_Released: 2023-10-02T11:21:02Z_

### Minor Changes

- b023f4cb: Enhancing the preview-middleware with new functionality such as Controller Extension (creating "codeExt" change).

## 0.3.1

_Released: 2023-10-02T09:25:49Z_

### Patch Changes

- a7eda7c5: Fix and reuse manual mocks in unit test, removing ui5Facade, updating tsconfig

## 0.3.0

_Released: 2023-09-22T14:23:47Z_

### Minor Changes

- 0f2ac46a: Enhanced the client to be able to communicate with a wrapping frame running the @sap-ux/control-property-editor.

## 0.2.1

_Released: 2023-09-21T14:39:30Z_

### Patch Changes

- 0798e88e: Improving the FLP init script

## 0.2.0

_Released: 2023-09-20T14:21:57Z_

### Minor Changes

- ac0adb21: Enhancing the preview-middleware with new functionality such as adding an XML Fragment (creating "addXML" change).

## 0.1.2

_Released: 2023-09-20T13:13:51Z_

### Patch Changes

- 63c698a8: chore - fix publishing of modules missed in failed release build

## 0.1.1

_Released: 2023-09-20T09:01:40Z_

### Patch Changes

- 58424e73: chore(deps): update dependency @ui5/cli to v3.6.0

## 0.1.0

### Minor Changes

- a73935c5: Initial version of the module containing a typescript version of of the flp init script.
