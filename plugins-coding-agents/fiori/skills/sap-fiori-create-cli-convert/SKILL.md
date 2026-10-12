---
name: sap-fiori-create-cli-convert
description: Use when running @sap-ux/create convert — preview-config, eslint-config.
metadata:
  author: sap-fiori-tools
  version: "1.4.14"
---

# [`convert`](#convert)

> For usage rules (--simulate, --password env:MY_VAR, CF restrictions) see the `sap-fiori-create-cli` skill.

The available subcommands are: preview-config, eslint-config

--------------------------------

## [`convert preview-config`](#convert-preview-config)

Executed in the root folder of an app, it converts the respective app to the preview with virtual endpoints. It uses the configuration from the scripts in the `package.json` file to adjust the UI5 configuration YAML files accordingly. The obsolete JS and TS sources are deleted and the HTML files previously used for the preview are renamed to `*_old.html`.

Examples:

`npx --yes @sap-ux/create@latest convert preview-config --simulate=false --tests=false`

`npx --yes @sap-ux/create@latest convert preview-config`

> For the full workflow guide including prerequisites and manual steps, read `references/convert-preview-config.md`.

Options:
- `-s, --simulate <boolean>` - Simulate only. Do not write.
- `-v, --verbose` - Show verbose information.
- `-t, --tests <boolean>` - Also, convert test suite and test runners.

--------------------------------

## [`convert eslint-config`](#convert-eslint-config)

Executed in the root folder of an app, it converts the ESLint configuration of the respective app to flat config format (used since ESLint version 9). It also introduces specific ESLint checks for SAP Fiori applications (using the `@sap-ux/eslint-plugin-fiori-tools` plugin), and deletes the deprecated `eslint-plugin-fiori-custom` plugin. To avoid dependency resolution conflicts, it deletes the `package-lock.json` file as well as the `@sap-ux/eslint-plugin-fiori-tools` module from the `node_modules` folder before running `npm install`.

Examples:

`npx --yes @sap-ux/create@latest convert eslint-config`

Options:
- `-s, --simulate` - Simulate only. Do not write to the config file. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.
- `-c, --config <string>` - The name of the SAP Fiori tools ESLint plugin configuration to be used. _(default: `recommended`)_
- `-n, --skip-install` - Skip the `npm install` step. Also skips deleting the `package-lock.json` file and the `@sap-ux/eslint-plugin-fiori-tools` module from the `node_modules` folder.

