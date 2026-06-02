# @sap-ux/odata-annotation-core-types

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
    - @sap-ux/text-document-utils@1.0.0

## 0.6.1

### Patch Changes

- 2f1ece0: [rule] Add rule to check that a Common.Text description property has a meaningful Common.Label annotation

## 0.6.0

### Minor Changes

- 72695e5: chore: drop Node 20 support as it is no longer maintained

### Patch Changes

- Updated dependencies [72695e5]
    - @sap-ux/text-document-utils@0.4.0

## 0.5.9

### Patch Changes

- 50a8ba5: chore: fresh release after workflow updates
- Updated dependencies [50a8ba5]
    - @sap-ux/text-document-utils@0.3.5

## 0.5.8

### Patch Changes

- Updated dependencies [c160401]
    - @sap-ux/text-document-utils@0.3.4

## 0.5.7

### Patch Changes

- dfa433e: feat: Enabled support of referenced external metadata

## 0.5.6

### Patch Changes

- a2cbf4e: Include `Partner` and `ContainsTarget` attributes from `NavigationProperty` to converted object of `MetadataElementProperties`

## 0.5.5

### Patch Changes

- cc1c422: fix(deps): update dependency npm-run-all2 to v8

## 0.5.4

### Patch Changes

- 3795bb2: Add Node.js engine requirement (>=20.x)

## 0.5.3

### Patch Changes

- 6d71400: Changes to support v4.01 odata services

## 0.5.2

### Patch Changes

- 4ecfbe2: Chore - upgrade eslint devDependenies, convert to flat config and fix lint issues.
- Updated dependencies [4ecfbe2]
    - @sap-ux/text-document-utils@0.3.3

## 0.5.1

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md
- Updated dependencies [cfe9c13]
    - @sap-ux/text-document-utils@0.3.2

## 0.5.0

### Minor Changes

- aa8bb7a: feat: Add missing referential constraint data to navigation property metadata elements.
  feat: Add type facets with constraints to metadata elements.

## 0.4.6

### Patch Changes

- 1f18878: feat: extend `deprecated-$value-syntax` diagnostic with data required to create a quick fix.

## 0.4.5

### Patch Changes

- c7db726: feat: add deprecated $value syntax diagnostic message.
- Updated dependencies [c7db726]
    - @sap-ux/text-document-utils@0.3.1

## 0.4.4

### Patch Changes

- 08ed948: feat: add `enumValues` property to `MetadataElement` and new `NoWhitespaceInPathExpression` diagnostic type.

## 0.4.3

### Patch Changes

- Updated dependencies [a28357d]
    - @sap-ux/text-document-utils@0.3.0

## 0.4.2

### Patch Changes

- 93f8a83: chore - upgrade typescript 5.6.2

## 0.4.1

### Patch Changes

- Updated dependencies [ac22b7e]
    - @sap-ux/text-document-utils@0.2.0

## 0.4.0

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.3.1

### Patch Changes

- eb0b7b37: Chore - TypeScript 5 upgrade

## 0.3.0

### Minor Changes

- d6151909: add target kinds directly to metadata element

## 0.2.0

### Minor Changes

- 5b256cea: support applicable terms constraint

## 0.1.3

### Patch Changes

- 807e2857: Vocabularies types and interfaces definitions optimization

## 0.1.2

### Patch Changes

- 120d6631: Added new package xml-odata-annotation-converter

## 0.1.1

### Patch Changes

- dbffe7bd: odata-annotation-core packages moved from UXTools
