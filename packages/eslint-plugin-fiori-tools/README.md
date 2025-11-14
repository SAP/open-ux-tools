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

To consume this module, add @sap-ux/eslint-plugin-fiori-tools plugin to your `eslint.config.mjs`. You must specify one of the following configurations:

- defaultJS: contains rules for JavaScript for both prod and test code from plugin eslint-plugin-fiori-custom 
- defaultTS: contains rules for typescript and rules for both prod and test code from plugin eslint-plugin-fiori-custom 
- testcode: contains rules for typescript and rules for test code from plugin eslint-plugin-fiori-custom
- prodCode: contains rules for typescript and rules for production code from plugin eslint-plugin-fiori-custom

To use `manifest.json` specific rules update `eslint.config.mjs` with the relevant configuration:

```
import fioriToolsPlugin from "@sap-ux/eslint-plugin-fiori-tools";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    extends: [fioriToolsPlugin.configs["SAP-consistency"]],
  },
]);
```

Run with `npx eslint`. (eslint version 9 is required)