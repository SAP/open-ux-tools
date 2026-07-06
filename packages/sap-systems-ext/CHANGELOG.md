# sap-ux-sap-systems-ext

## 1.0.7

### Patch Changes

#### Features

- Officially publish CF workflow in the ADP generator. [[58e9645](https://github.com/SAP/open-ux-tools/commit/58e9645465b48c7832d9da548df3d609c5c0d590)]

## 1.0.6

### Patch Changes

#### Release Date

2026-07-03

#### Dependency Updates

- Rebuild bundle with updated @sap-ux/axios-extension, @sap-ux/btp-utils, @sap-ux/ui5-config, @sap-ux/telemetry [[526d59b](https://github.com/SAP/open-ux-tools/commit/526d59b558a653635ab44ab10dbfedccb3c0dc43)]

## 1.0.5

### Patch Changes

#### Dependency Updates

- Bulk upgrade of minor dependencies and devDependencies [[5ce779c](https://github.com/SAP/open-ux-tools/commit/5ce779c43ae81d9a4ed85414bfb6f0ca8f882afc)]

## 1.0.4

### Patch Changes

#### Release Date

2026-07-01

#### Dependency Updates

- Rebuild bundle with updated @sap-ux/telemetry [[f25db35](https://github.com/SAP/open-ux-tools/commit/f25db35917824f4c91e6f688f6566ffd5298c4f1)]

## 1.0.3

### Patch Changes

#### Release Date

2026-06-18

#### Dependency Updates

- Bump version for release [[9318f21](https://github.com/SAP/open-ux-tools/commit/9318f218c26086ff2773582943e5225785b57086)]

## 1.0.2

_Released: 2026-06-03T14:58:37Z_

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)

## 1.0.1

_Released: 2026-06-02T12:38:22Z_

### Patch Changes

- 93591d4: fix(sap-systems-ext): remove unsafe Logger/ExtensionLogger casts in SystemsLogger

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

## 0.6.0

_Released: 2026-05-15T08:12:20Z_

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

## 0.5.3

_Released: 2026-05-14T11:45:51Z_

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates

## 0.5.2

_Released: 2026-05-12T12:59:14Z_

### Patch Changes

- ac6381f: remove default selected key for sap systems ext

## 0.5.1

_Released: 2026-05-11T10:59:15Z_

### Patch Changes

- 9661c7b: adds new internal create command to avoid collisions with other registered commands

## 0.5.0

_Released: 2026-04-30T12:29:22Z_

### Minor Changes

- 16d6382: feat(sap-systems-ext): pre-populate connection manager panel when creating a new system (#37892)

    When opening the connection manager to create a new system, the panel can now be pre-populated with system details such as URL, client and system type.

## 0.4.5

_Released: 2026-04-09T14:24:08Z_

### Patch Changes

- 66e2099: Fix right click options on systems

## 0.4.4

_Released: 2026-03-31T14:52:03Z_

### Patch Changes

- 6379785: fix name validation

## 0.4.3

_Released: 2026-03-30T22:24:11Z_

### Patch Changes

- c53a4ba: chore(sap-systems-ext): upgrade shared devDependencies (jest 30, i18next 25)

## 0.4.2

_Released: 2026-03-30T12:11:57Z_

### Patch Changes

- 26fd5de: Align VS Code minimum supported version (^1.102.0) with Fiori tools

## 0.4.1

_Released: 2026-03-30T09:06:01Z_

### Patch Changes

- e976fdb: bump vscode version to align with @types/vscode

## 0.4.0

_Released: 2026-03-28T09:24:50Z_

### Minor Changes

- 2d20f19: adds support for the generic host connection type

## 0.3.11

_Released: 2026-03-17T01:04:22Z_

### Patch Changes

- 55417bb: fix(deps): update dependency i18next to v25.8.18

## 0.3.10

_Released: 2026-03-05T12:30:25Z_

### Patch Changes

- 83ca0e9: fix(deps): update dependency cross-env to v10

## 0.3.9

_Released: 2026-03-03T08:27:12Z_

### Patch Changes

- 4af92b5: add node: proto prefix to imports

## 0.3.8

_Released: 2026-02-26T10:46:59Z_

### Patch Changes

- 6c993f3: fix: turn off i18next support notice

## 0.3.7

_Released: 2026-02-24T12:43:07Z_

### Patch Changes

- 89cfeaf: correct error handling and confirmation prompt text

## 0.3.6

_Released: 2026-02-23T22:35:31Z_

### Patch Changes

- fd8de2b: fix(deps): update dependency jsonc-parser to v3.3.1

## 0.3.5

_Released: 2026-02-23T13:41:31Z_

### Patch Changes

- bdf59e5: fix naming validation when importing

## 0.3.4

_Released: 2026-02-21T00:10:36Z_

### Patch Changes

- 66869b2: text and ui updates

## 0.3.3

_Released: 2026-02-20T16:17:11Z_

### Patch Changes

- cbd340a: fix(deps): update dependency i18next to v25.8.12

## 0.3.2

_Released: 2026-02-20T13:46:55Z_

### Patch Changes

- e5bc3ca: fix(deps): update dependency vscode-uri to v3.1.0

## 0.3.1

_Released: 2026-02-17T13:59:10Z_

### Patch Changes

- ff31574: fix(sap-systems): url-validation

## 0.3.0

_Released: 2026-02-13T16:18:58Z_

### Minor Changes

- 9f94937: support adding full service urls as a new connection type

## 0.2.4

_Released: 2026-02-05T13:53:56Z_

### Patch Changes

- 38e215e: chore(deps): update dependency @zowe/secrets-for-zowe-sdk to v8.29.4

## 0.2.3

_Released: 2026-01-29T15:31:52Z_

### Patch Changes

- 8f56f6b: Restrict the input of non-origin URLs for ABAP on Cloud systems

## 0.2.2

_Released: 2026-01-23T11:19:50Z_

### Patch Changes

- 3ffe28e: fix input background styling when Chrome autofill is applied

## 0.2.1

_Released: 2026-01-22T13:16:27Z_

### Patch Changes

- a90c3e7: restrict input of non origin urls for new systems, adjust validation messages

## 0.2.0

_Released: 2026-01-16T12:32:24Z_

### Minor Changes

- c9fd939: update backend systems with system info from adt api

## 0.1.4

_Released: 2025-12-18T21:05:02Z_

### Patch Changes

- a9471d0: fix sonar issues

## 0.1.3

_Released: 2025-12-18T15:47:41Z_

### Patch Changes

- 7b02fb9: fix refresh command

## 0.1.2

_Released: 2025-12-16T11:43:52Z_

### Patch Changes

- ba58398: adds mandatory props to backend systems and migrates existing

## 0.1.1

_Released: 2025-12-15T10:50:50Z_

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.

## 0.1.0

_Released: 2025-11-19T17:02:20Z_

### Minor Changes

- bdf6eb7: Update extension name and readme

## 0.0.11

_Released: 2025-11-19T07:32:43Z_

### Patch Changes

- 7ac21d6: fix for sap systems extension

## 0.0.10

_Released: 2025-11-12T10:01:42Z_

### Patch Changes

- caff0ca: fix for saving systems

## 0.0.9

_Released: 2025-11-07T10:42:49Z_

### Patch Changes

- 452e49a: correct publisher

## 0.0.8

_Released: 2025-11-06T15:44:36Z_

### Patch Changes

- fea04a4: Adjust cloud system component rendering logic, adjust log message. Add log message when testing connection, service summary include catalog results log.

## 0.0.7

_Released: 2025-11-06T12:16:07Z_

### Patch Changes

- f1a2795: fix: Instrumentation key

## 0.0.6

_Released: 2025-11-04T15:21:04Z_

### Patch Changes

- b0b210b: change to draft release for extensions

## 0.0.5

_Released: 2025-11-04T11:51:40Z_

### Patch Changes

- 4b00366: testing pipeline config

## 0.0.4

_Released: 2025-11-04T10:29:26Z_

### Patch Changes

- 931505d: test config update

## 0.0.3

_Released: 2025-11-04T09:59:02Z_

### Patch Changes

- 7ab5311: config test

## 0.0.2

_Released: 2025-11-04T09:14:44Z_

### Patch Changes

- 7677587: pipeline test

## 0.0.1

_Released: 2025-11-12T10:01:42Z_

### Patch Changes

- cc65eec: adds new vscode sap systems extension
