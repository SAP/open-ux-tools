---
name: sap-fiori-create-cli-add
description: Use when running @sap-ux/create add — mockserver-config, smartlinks-config, eslint-config, cds-plugin-ui5, inbound-navigation, cards-editor, model, annotations, html, component-usages, deploy-config, variants-config, adp-cf-config, system, flp-embedded-config.
metadata:
  author: sap-fiori-tools
  version: "1.4.14"
---

# [`add`](#add)

> For usage rules (--simulate, --password env:MY_VAR, CF restrictions) see the `sap-fiori-create-cli` skill.

The available subcommands are: mockserver-config, smartlinks-config, eslint-config, cds-plugin-ui5, inbound-navigation, cards-editor, model, annotations, html, component-usages, deploy-config, variants-config, adp-cf-config, system, flp-embedded-config

--------------------------------

## [`add mockserver-config`](#add-mockserver-config)

Add the necessary configuration for the `@sap-ux/ui5-middleware-fe-mockserver` mockserver module to enable local OData mocking.

Example:

`npx --yes @sap-ux/create@latest add mockserver-config`

Options:
- `-i, --interactive` - Ask for config options or otherwise, use the default options.
- `-n, --skip-install` - Skip the `npm install` step.
- `-s, --simulate` - Simulate only. Do not write or install. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.

--------------------------------

## [`add smartlinks-config`](#add-smartlinks-config)

Add a `smartLinks` configuration to a project for cross-app navigation.

Example:

`npx --yes @sap-ux/create@latest add smartlinks-config`

Options:
- `-s, --simulate` - Simulate only. Do not write to the config file. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.

--------------------------------

## [`add eslint-config`](#add-eslint-config)

Add an ESLint configuration to a project including the SAP Fiori tools lint plugin (`@sap-ux/eslint-plugin-fiori-tools`).

Example:

`npx --yes @sap-ux/create@latest add eslint-config`

Options:
- `-s, --simulate` - Simulate only. Do not write to the config file. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.
- `-c, --config <string>` - The name of the SAP Fiori tools eslint plugin configuration to be used. _(default: `recommended`)_
- `-n, --skip-install` - Skip the `npm install` step.

--------------------------------

## [`add cds-plugin-ui5`](#add-cds-plugin-ui5)

Add the `cds-plugin-ui5` module and all prerequisites to a CAP project for UI5 server integration.

Example:

`npx --yes @sap-ux/create@latest add cds-plugin-ui5`

Options:
- `-n, --skip-install` - Skip the `npm install` step.
- `-s, --simulate` - Simulate only. Do not write or install. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.

--------------------------------

## [`add inbound-navigation`](#add-inbound-navigation)

Add SAP Fiori launchpad inbound navigation configuration to a project.

Example:

`npx --yes @sap-ux/create@latest add inbound-navigation`

Options:
- `-s, --simulate` - Simulate only. Do not write to the config file. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.
- `-c, --config <string>` - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_

--------------------------------

## [`add cards-editor`](#add-cards-editor)

Add the necessary configuration to an existing YAML file and the script to the `package.json` file for cards generation. It uses the configuration from the YAML file passed by the CLI or default to `ui5.yaml`, as provided by the `fiori-tools-preview` or `preview-middleware`.

Example:

`npx --yes @sap-ux/create@latest add cards-editor`

Options:
- `-c, --config <string>` - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_
- `-s, --simulate` - Simulate only. Do not write to the config file. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.

--------------------------------

## [`add model`](#add-model)

Add a new OData service and SAPUI5 model to an existing adaptation project.

Example:

`npx --yes @sap-ux/create@latest add model`

Options:
- `-s, --simulate` - Simulate only. Do not write or install.

--------------------------------

## [`add annotations`](#add-annotations)

Adds an annotation to the OData Source of the base application in an adaptation project.


This command is not supported for Cloud Foundry projects.

Example:

`npx --yes @sap-ux/create@latest add annotations`

Options:
- `-s, --simulate` - Simulate only. Do not write or install.
- `-c, --config <string>` - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_

--------------------------------

## [`add html`](#add-html)

Add HTML files for local preview and testing to the project. It uses the configuration from the `ui5.yaml` file as default, as provided by the `fiori-tools-preview` or `preview-middleware`.

Example:

`npx --yes @sap-ux/create@latest add html`

Options:
- `-c, --config <string>` - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_
- `-s, --simulate` - Simulate only. Do not write to the config file. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.

--------------------------------

## [`add component-usages`](#add-component-usages)

Add the component usages to an adaptation project.

Example:

`npx --yes @sap-ux/create@latest add component-usages`

Options:
- `-s, --simulate` - Simulate only. Do not write or install.

--------------------------------

## [`add deploy-config`](#add-deploy-config)

Prompt for ABAP deployment configuration details and adds and updates the project files accordingly.

Example:

`npx --yes @sap-ux/create@latest add deploy-config`

Options:
- `-t, --target <string>` - Target for deployment: ABAP or Cloud Foundry (not yet implemented)
- `-s, --simulate` - Simulate only. Do not write. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.
- `-b, --base-file <string>` - The base config file of the project. _(default: "ui5.yaml")_
- `-d, --deploy-file <string>` - The name of the deploy config file to be written. _(default: "ui5-deploy.yaml")_

--------------------------------

## [`add variants-config`](#add-variants-config)

Add the necessary configuration to an existing YAML file and the script to the `package.json` file for variants creation. It uses the configuration from the YAML file passed by the CLI or default to `ui5.yaml`, as provided by the `fiori-tools-preview` or `preview-middleware`.

Example:

`npx --yes @sap-ux/create@latest add variants-config`

Options:
- `-c, --config <string>` - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_
- `-s, --simulate` - Simulate only. Do not write to the config file. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.

--------------------------------

## [`add adp-cf-config`](#add-adp-cf-config)

Configure an existing Cloud Foundry adaptation project for local preview by fetching reusable libraries, building the project, and configuring ui5.yaml file middlewares.


**⚠️ Experimental**: This command is experimental and may be subject to breaking changes or even removal in future versions. Use with caution and be prepared to update your configuration or migrate to alternative solutions, if needed.

Example:

`npx --yes @sap-ux/create@latest add adp-cf-config`

Options:
- `-v, --verbose` - Show verbose information.
- `-c, --config <string>` - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_

--------------------------------

## [`add system`](#add-system)

Add a new back-end system to the saved systems store (`~/.fioritools`). Credentials are stored securely in the OS keychain.


System types: `AbapCloud`, `OnPrem`, `Generic`

Auth types: `basic`, `reentranceTicket`, `oauth2`, `oauth2ClientCredential`

Connection types: `abap_catalog`, `generic_host`, `odata_service`

Example:

`npx --yes @sap-ux/create@latest add system --name "My System" --url https://my-sap.example.com`

`npx --yes @sap-ux/create@latest add system --name "My System" --url https://my-sap.example.com --client 100 --username myuser`

`npx --yes @sap-ux/create@latest add system` (interactive mode)

Options:
- `--name <string>` - Display name for the system
- `--url <string>` - URL of the backend system
- `--client <string>` - SAP client number (optional)
- `--type <string>` - System type (AbapCloud | OnPrem | Generic) _(default: `OnPrem`)_
- `--auth <string>` - Authentication type (basic | reentranceTicket | oauth2 | oauth2ClientCredential) _(default: `basic`)_
- `--connection-type <string>` - Connection type (abap_catalog | generic_host | odata_service) _(default: `abap_catalog`)_
- `--username <string>` - Username for basic authentication
- `--password <string>` - To avoid plain-text credentials in the shell's history, pass an env reference: --password env:MY_VAR
- `--skip-credentials-prompt` - Skip credential prompts. No credentials will be saved, but may be added later if required
- `--skip-connection-validation` - Skip connection verification before saving

--------------------------------

## [`add flp-embedded-config`](#add-flp-embedded-config)

Add the necessary configuration for running a Fiori app in FLP Embedded Mode.
Adds a `start-embedded` script to `package.json` and creates an `flp.yaml` file
based on the existing `ui5.yaml`. Pre-existing files will be overridden.

Example:

`npx --yes @sap-ux/create@latest add flp-embedded-config --bspApplication my-bsp-app`

Options:
- `-b, --bspApplication <string>` _(required)_ - BSP application name of the deployed app
- `-c, --config <string>` - Path (relative to project root) to the ui5.yaml to use as base for flp.yaml _(default: `ui5.yaml`)_
- `--flp <string>` - FLP URL path used in the start-embedded script _(default: `sap/bc/ui5_ui5/ui2/ushell/shells/abap/Fiorilaunchpad.html`)_
- `-s, --simulate` - Simulate only. Do not write files. Also sets `--verbose`.
- `-v, --verbose` - Show verbose information.

