# @sap-ux-private/control-property-editor-common

## 1.0.4

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

## 1.0.3

_Released: 2026-06-12T08:50:00Z_

### Patch Changes

- 0110219: fix regression writing wrong manifest path via the changes created via properties panel and remove unused control-property-editor-common code

## 1.0.2

_Released: 2026-06-09T09:41:14Z_

### Patch Changes

- bcfe9e3: Fix: Inconsistent property naming between RTA and CPE

## 1.0.1

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)

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

## 0.8.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

## 0.7.8

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates

## 0.7.7

_Released: 2026-03-02T13:05:37Z_

### Patch Changes

- 4f7b796: fix(deps): update dependency ts-jest to v29.4.6

## 0.7.6

_Released: 2026-02-23T19:07:48Z_

### Patch Changes

- cc1c422: fix(deps): update dependency npm-run-all2 to v8

## 0.7.5

_Released: 2026-02-20T20:20:17Z_

### Patch Changes

- d588c26: fix(deps): update dependency rimraf to v6.1.3

## 0.7.4

_Released: 2026-02-04T22:31:27Z_

### Patch Changes

- 9f11dd2: chore - address audit issues

## 0.7.3

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.

## 0.7.2

_Released: 2025-11-05T06:53:42Z_

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md

## 0.7.1

_Released: 2025-10-22T18:56:41Z_

### Patch Changes

- fa9580c: chore - Rimraf upgrade

## 0.7.0

_Released: 2025-08-01T13:45:39Z_

### Minor Changes

- b1213b1: feat: Track all errors/warnings/info messages created in the adaptation editor and display them in the Info center.

## 0.6.5

_Released: 2025-05-16T08:49:04Z_

### Patch Changes

- b49c43f: fix: added apptype to quickactions and contextmenu

## 0.6.4

_Released: 2025-05-14T08:48:37Z_

### Patch Changes

- e856125: Fix: Generic handling for change type and new UI component for displaying

## 0.6.3

_Released: 2025-04-15T15:11:22Z_

### Patch Changes

- 838d2de: fix: nested Quick Actions not working if there are sections with only one child (e.g Change Table Columns)

## 0.6.2

_Released: 2025-04-15T12:59:48Z_

### Patch Changes

- 8fe1ab6: fix: added telemetry tracking for context menu

## 0.6.1

_Released: 2025-03-27T11:46:15Z_

### Patch Changes

- 6cedb61: fix: enable telemetry for quickactions in adp

## 0.6.0

_Released: 2025-03-05T14:45:32Z_

### Minor Changes

- 8568e6b: feat: Info Center for different type of messages

## 0.5.11

_Released: 2025-02-05T12:39:22Z_

### Patch Changes

- 9ddf98f: Feature to add context menu on outline

## 0.5.10

_Released: 2025-01-13T18:05:42Z_

### Patch Changes

- f115bfa: fix: update quick action list on external changes

## 0.5.9

_Released: 2025-01-08T17:16:17Z_

### Patch Changes

- 19d51f3: feat: Quick Action For Add New Annotation File

## 0.5.8

_Released: 2024-11-29T13:58:32Z_

### Patch Changes

- ca82698: CPE - Enable Table Filtering Quick Action

## 0.5.7

_Released: 2024-11-13T16:02:41Z_

### Patch Changes

- 8c0ba5c: Fixed Adaptation Editor crash when project contains Personalization change.

## 0.5.6

_Released: 2024-11-12T14:14:38Z_

### Patch Changes

- 06e9468: Allow adaptations of manifest settings in FEv4 adaptation projects via Control Property Editor Property Panel

## 0.5.5

_Released: 2024-10-25T14:04:19Z_

### Patch Changes

- 5ec7106: Modified indicators incorrectly displayed for some UI5 controls in Adaptation Project

## 0.5.4

_Released: 2024-10-04T15:21:13Z_

### Patch Changes

- 93f8a83: chore - upgrade typescript 5.6.2

## 0.5.3

_Released: 2024-09-25T08:23:49Z_

### Patch Changes

- b37b4c1: Fixed application mode after reload and various other usability fixes for Quick Actions

## 0.5.2

_Released: 2024-09-24T11:55:25Z_

### Patch Changes

- 8f442a6: Usability improvements for Quick Actions that add fragments

## 0.5.1

_Released: 2024-09-18T16:51:00Z_

### Patch Changes

- 1c20352: Added missing notification when manifest change is created

## 0.5.0

_Released: 2024-09-04T11:08:59Z_

### Minor Changes

- b1628da: Add quick actions to adaptation editor

## 0.4.0

_Released: 2024-07-05T15:03:05Z_

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.3.6

_Released: 2024-05-28T14:57:10Z_

### Patch Changes

- 78de7813: RTA standard toolbar replaced with custom CPE toolbar

## 0.3.5

_Released: 2024-05-23T07:03:28Z_

### Patch Changes

- 56d8b0b9: Add default content for extension points to the outline in CPE

## 0.3.4

_Released: 2024-05-10T12:37:23Z_

### Patch Changes

- cad21d4d: Enable Adding Controller Extension only on async views for Adp Projects

## 0.3.3

_Released: 2024-03-21T16:21:01Z_

### Patch Changes

- 6a477fba: feat: Replace auto-refresh with message in case of manual flex file changes

## 0.3.2

_Released: 2024-02-07T11:10:48Z_

### Patch Changes

- eb0b7b37: Chore - TypeScript 5 upgrade

## 0.3.1

_Released: 2023-11-08T11:15:50Z_

### Patch Changes

- e2b264c2: Make Control Property Editor aware which application (scenario) its running in the iframe

## 0.3.0

_Released: 2023-11-06T16:53:10Z_

### Minor Changes

- 6d2d2255: support all kind of changes from command stack

## 0.2.0

### Minor Changes

- 318e040e: Enables creation of XML fragments for Extension Points from the outline tree (when right-clicking on extension point) or from the application (when clicking on control).
