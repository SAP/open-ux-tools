# @sap-ux/sap-systems-ext-webapp

## 1.0.3

### Patch Changes

#### Dependency Updates

- Upgrade i18next 25.10.10 → 26.3.6 [[28263d1](https://github.com/SAP/open-ux-tools/commit/28263d1cdcbb8599ee7b165c3482255b631604b8)]

## 1.0.2

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

## 1.0.1

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)

## 1.0.0

_Released: 2026-05-30T20:54:07Z_

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

## 0.4.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

## 0.3.2

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates

## 0.3.1

_Released: 2026-05-12T12:59:14Z_

### Patch Changes

- ac6381f: remove default selected key for sap systems ext

## 0.3.0

_Released: 2026-04-30T12:29:22Z_

### Minor Changes

- 16d6382: feat(sap-systems-ext): pre-populate connection manager panel when creating a new system (#37892)

    When opening the connection manager to create a new system, the panel can now be pre-populated with system details such as URL, client and system type.

## 0.2.1

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(sap-systems-ext-webapp): upgrade shared devDependencies (jest 30, i18next 25)

## 0.2.0

_Released: 2026-03-28T09:24:50Z_

### Minor Changes

- 2d20f19: adds support for the generic host connection type

## 0.1.5

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18

## 0.1.4

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- 6c993f3: fix: turn off i18next support notice

## 0.1.3

_Released: 2026-02-23T23:44:05Z_

### Patch Changes

- 4d381b7: fix(deps): update dependencies [react]

## 0.1.2

_Released: 2026-02-21T00:10:36Z_

### Patch Changes

- 66869b2: text and ui updates

## 0.1.1

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12

## 0.1.0

_Released: 2026-02-13T16:18:58Z_

### Minor Changes

- 9f94937: support adding full service urls as a new connection type

## 0.0.12

_Released: 2026-02-10T21:03:43Z_

### Patch Changes

- 3795bb2: Add Node.js engine requirement (>=20.x)

## 0.0.11

_Released: 2026-01-29T15:31:52Z_

### Patch Changes

- 8f56f6b: Restrict the input of non-origin URLs for ABAP on Cloud systems

## 0.0.10

_Released: 2026-01-23T11:19:50Z_

### Patch Changes

- 3ffe28e: fix input background styling when Chrome autofill is applied

## 0.0.9

_Released: 2026-01-22T13:16:27Z_

### Patch Changes

- a90c3e7: restrict input of non origin urls for new systems, adjust validation messages

## 0.0.8

_Released: 2026-01-22T10:26:02Z_

### Patch Changes

- fc67b03: reword the readme

## 0.0.7

_Released: 2026-01-12T09:10:27Z_

### Patch Changes

- d667a5e: fix: add repository field to package.json

## 0.0.6

_Released: 2025-12-16T11:43:52Z_

### Patch Changes

- ba58398: adds mandatory props to backend systems and migrates existing

## 0.0.5

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.

## 0.0.4

_Released: 2025-11-12T10:01:42Z_

### Patch Changes

- caff0ca: fix for saving systems

## 0.0.3

_Released: 2025-11-06T15:44:36Z_

### Patch Changes

- fea04a4: Adjust cloud system component rendering logic, adjust log message. Add log message when testing connection, service summary include catalog results log.

## 0.0.2

_Released: 2025-11-03T13:24:11Z_

### Patch Changes

- 1e57e54: Adds a warning regarding OS credential manager policies.

## 0.0.1

_Released: 2026-01-23T11:19:50Z_

### Patch Changes

- cc65eec: adds new vscode sap systems extension
