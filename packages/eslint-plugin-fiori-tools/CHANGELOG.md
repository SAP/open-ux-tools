# @sap-ux/eslint-plugin-fiori-tools

## 9.3.3

### Patch Changes

- ea7a16c: Fix Extend lodash vulnerability
    - @sap-ux/fiori-annotation-api@0.9.6
    - @sap-ux/project-access@1.34.4

## 9.3.2

### Patch Changes

- c77df15: Exclude page name when reporting issue on application level for table creation mode

## 9.3.1

### Patch Changes

- ecc305d: Add statePreservationMode rule for OData V2 application.

## 9.3.0

### Minor Changes

- 416428c: Add copy to clipboard property rule for OData V2 application tables.

## 9.2.4

### Patch Changes

- Updated dependencies [6d71400]
    - @sap-ux/fiori-annotation-api@0.9.5
    - @sap-ux/project-access@1.34.3
    - @sap-ux/odata-annotation-core@0.2.13
    - @sap-ux/odata-entity-model@0.3.4
    - @sap-ux/odata-vocabularies@0.4.22

## 9.2.3

### Patch Changes

- 98a5947: fix: add auto fix for creation mode for table

## 9.2.2

### Patch Changes

- 40b2423: fix: revised text

## 9.2.1

### Patch Changes

- @sap-ux/fiori-annotation-api@0.9.4

## 9.2.0

### Minor Changes

- cd27778: Fix plugin integration issue when working with multiple projects: create new ProjectContext and cache diagnostics by file uri and ruleId.

## 9.1.3

### Patch Changes

- be67fc4: fix: fix path mappings and also lint custom mockserver extensions
- Updated dependencies [be67fc4]
    - @sap-ux/project-access@1.34.2
    - @sap-ux/fiori-annotation-api@0.9.3

## 9.1.2

### Patch Changes

- Updated dependencies [55ac9f0]
    - @sap-ux/project-access@1.34.1
    - @sap-ux/fiori-annotation-api@0.9.2

## 9.1.1

### Patch Changes

- 4d6695f: fix: add missing JSDoc
- Updated dependencies [4d6695f]
    - @sap-ux/fiori-annotation-api@0.9.1

## 9.1.0

### Minor Changes

- b132944: feat: add consistency rules `sap-flex-enabled`, `sap-disable-copy-to-clipboard` and `sap-width-including-column-header`.

### Patch Changes

- Updated dependencies [b132944]
- Updated dependencies [b132944]
    - @sap-ux/project-access@1.34.0
    - @sap-ux/fiori-annotation-api@0.9.0

## 9.0.5

### Patch Changes

- d667a5e: fix: add repository field to package.json

## 9.0.4

### Patch Changes

- d24f36d: refactor: update ESLint configuration to remove unnecessary `defineConfig` usage

## 9.0.3

### Patch Changes

- 904870c: Update README with migration guide for ESLint 9

## 9.0.2

### Patch Changes

- dad2bd7: Write Eslint 9 flat config for new project. Replace eslint-plugin-fiori-custom with @sap-ux/eslint-plugin-fiori-tools

## 9.0.1

### Patch Changes

- a9471d0: fix sonar issues

## 9.0.0

### Major Changes

- 0ffd46f: Merge eslint-plugin-fiori-custom into @sap-ux/eslint-plugin-fiori-tools. Upgrade to support eslint 9.
  Now using eslint 9 flat config file format.

## 0.6.2

### Patch Changes

- cfe9c13: Add deep link to package and changelog to README.md

## 0.6.1

### Patch Changes

- 43a2446: chore: fix Sonar issues

## 0.6.0

### Minor Changes

- a28357d: chore - drop node18 support as it is out of maintenance

## 0.5.0

### Minor Changes

- c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 0.4.2

### Patch Changes

- 398c4092: Relax some eslint rules for fiori typescript projects

## 0.4.1

### Patch Changes

- da0ecd9a: Enable Typscript type checking in eslint module @sap-ux/eslint-plugin-fiori-tools

## 0.3.2

### Patch Changes

- 4b29ddcc: Update TypeScript templates, eslint config and ui5 devDependencies

## 0.3.1

### Patch Changes

- c15435b6: fix: remove engines pnpm from package.json

## 0.3.0

### Minor Changes

- 1aa0fc43: Drop NodeJS 16 support, current supported versions NodeJS 18 and 20.

## 0.2.2

### Patch Changes

- 63c698a8: chore - fix publishing of modules missed in failed release build

## 0.2.1

### Patch Changes

- 4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.

## 0.2.0

### Minor Changes

- 7c70e25d: adds new writer ui5-library-writer

## 0.1.5

### Patch Changes

- 5c7f40c6: fix build cache for release artefact

## 0.1.4

### Patch Changes

- b6793a50: release new version

## 0.1.2

### Patch Changes

- 059f3fc0: Update Readme and bump version

## 0.1.1

### Patch Changes

- 495a22cb: Use @sap-ux/eslint-plugin-fiori-tools for JS projects with eslint option

## 0.1.0

### Minor Changes

- 7ac0cb40: Add new module containing an eslint plugin with reusable eslint configs
