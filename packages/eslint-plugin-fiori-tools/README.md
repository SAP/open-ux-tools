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