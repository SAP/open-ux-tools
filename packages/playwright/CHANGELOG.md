# @sap-ux-private/playwright

## 1.0.2

### Patch Changes

- d2b8d7b: chore: upgrade @playwright/test 1.58.2 → 1.60.0

## 1.0.1

### Patch Changes

- 21a3de7: FIX: TypeScript type errors in test files (ESM migration follow-up)
- Updated dependencies [21a3de7]
    - @sap-ux/logger@1.0.1

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
    - @sap-ux/logger@1.0.0

## 0.3.1

### Patch Changes

- fb00faa: fix(ci): use workspace:\* for internal monorepo dependencies

## 0.3.0

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/logger@0.9.0

## 0.2.16

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/logger@0.8.6

## 0.2.15

### Patch Changes

- Updated dependencies [f1e4481]
    - @sap-ux/logger@0.8.5

## 0.2.14

### Patch Changes

- Updated dependencies [c53a4ba]
    - @sap-ux/logger@0.8.4

## 0.2.13

### Patch Changes

- a41533f: fix(playwright): fix invalid @param JSDoc tags in interface property comments
- Updated dependencies [a41533f]
    - @sap-ux/logger@0.8.3

## 0.2.12

### Patch Changes

- 5aff25c: fix(deps): update dependency fs-extra to v11

## 0.2.11

### Patch Changes

- Updated dependencies [45d4797]
    - @sap-ux/logger@0.8.2

## 0.2.10

### Patch Changes

- 451b2f0: fix(deps): update dependency @playwright/test to v1.58.2

## 0.2.9

### Patch Changes

- 8017bd3: updates for minimatch

    #37169

## 0.2.8

### Patch Changes

- 9072d52: fix(deps): update dependency promisify-child-process to v5

## 0.2.7

### Patch Changes

- 97735d2: fix(deps): update dependency portfinder to v1.0.38

## 0.2.6

### Patch Changes

- Updated dependencies [ea7a16c]
    - @sap-ux/logger@0.8.1

## 0.2.5

### Patch Changes

- Updated dependencies [c7f9a60]
    - @sap-ux/logger@0.8.0

## 0.2.4

### Patch Changes

- a9471d0: fix sonar issues
- Updated dependencies [a9471d0]
    - @sap-ux/logger@0.7.3

## 0.2.3

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/logger@0.7.2

## 0.2.2

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/logger@0.7.1

## 0.2.1

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 0.2.0

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/logger@0.7.0

## 0.1.0

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

### Patch Changes

- Updated dependencies [c2359077]
    - @sap-ux/logger@0.6.0

## 0.0.3

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json
- Updated dependencies [c15435b6]
    - @sap-ux/logger@0.5.1

## 0.0.2

### Patch Changes

- Updated dependencies [2e0b1a6d]
    - @sap-ux/logger@0.5.0
