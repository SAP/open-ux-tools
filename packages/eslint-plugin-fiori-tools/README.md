[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/eslint-plugin-fiori-tools)

# [`@sap-ux/eslint-plugin-fiori-tools`](https://github.com/SAP/open-ux-tools/tree/main/packages/eslint-plugin-fiori-tools)

Custom linting plugin for SAPUI5 Fiori apps

## Installation

Npm
`npm install --save @sap-ux/eslint-plugin-fiori-tools`

Yarn
`yarn add @sap-ux/eslint-plugin-fiori-tools`

Pnpm
`pnpm add @sap-ux/eslint-plugin-fiori-tools`

## Usage

To consume this module, add @sap-ux/eslint-plugin-fiori-tools in your project eslint config file (e.g. `eslint.config.js`). You must specify one of the following configurations:

- recommended: contains rules for JavaScript & TypeScript on both prod and test code.

- recommended-for-s4hana: contains rules for JavaScript & TypeScript on both prod and test code. recommended for SAP internal use.

`eslint.config.js`
```javascript
const { defineConfig } = require('eslint/config');

const fioriTools  = require('@sap-ux/eslint-plugin-fiori-tools');

module.exports = defineConfig([
    ...fioriTools.configs.recommended,
]);
```


## Manually Migrating from Eslint@8, @sap-ux/eslint-plugin-fiori-tools@0.6.x and/or eslint-plugin-fiori-custom

All rules from eslint-plugin-fiori-custom have been migrated to @sap-ux/eslint-plugin-fiori-tools@9.x.x
Eslint 9 required changing to use the new flat config.


 
1. Create `eslint.config.js`
```javascript
const { defineConfig } = require('eslint/config');

const fioriTools  = require('@sap-ux/eslint-plugin-fiori-tools');

module.exports = defineConfig([
    ...fioriTools.configs.recommended,
]);
```

2. Copy any values from `.eslintignore` (if it exists) into `eslint.config.js` by adding the `ignores` array.
   More info at https://eslint.org/docs/latest/use/configure/configuration-files#excluding-files-with-ignores

```javascript
const { defineConfig } = require('eslint/config');

const fioriTools  = require('@sap-ux/eslint-plugin-fiori-tools');

module.exports = defineConfig([
     {
     ignores: ['dist']
     },
    ...fioriTools.configs.recommended,
]);
```
3. Delete the `.eslintignore` file
4. If the `.eslintrc` file contains only either of these content it can be deleted. `eslint.config.js` from step 1 is the equivalent.
   ```
   {
    "extends": "plugin:@sap-ux/eslint-plugin-fiori-tools/defaultJS",
    "root": true
   }
   ```
   or 
   ```
   {
    "extends": "plugin:@sap-ux/eslint-plugin-fiori-tools/defaultTS",
    "root": true
   }
   ```
   **Note**: If you have custom rules or configuration in .eslintrc file please check https://eslint.org/docs/latest/use/migrate-to-9.0.0 for details on how it migrate the content.

5. In the package.json
Remove `eslint-plugin-fiori-custom` it exists in the package.json
Update `eslint` to version `^9`
Update `@sap-ux/eslint-plugin-fiori-tools` to version `^9`
