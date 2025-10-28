# @sap-ux/eslint-plugin-fiori-tools

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

To use `manifest.json` specific rules update `eslint.config.mjs`:

```
import { defineConfig } from "eslint/config";
import fiori from "@sap-ux/eslint-plugin-fiori-tools";

export default defineConfig([
  {
    files: ["**/manifest.json"],
    plugins: { fiori },
    extends: ["fiori/manifest"],
    language: "fiori/json",
  },
]);
```

Run with `npx eslint`. (eslint version 9 is required)