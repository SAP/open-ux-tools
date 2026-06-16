---
name: sap-fiori-create-cli
description: Run, invoke, and test the @sap-ux/create CLI — generate, add, convert, remove, update, change, list, get commands for SAP Fiori projects. Use when asked to run sap-ux, invoke create CLI, add config to a project, generate adaptation-project, or test any sap-ux/create subcommand.
argument-hint: command and subcommand (e.g., add mockserver-config, generate adaptation-project)
metadata:
  author: sap-fiori-tools
  version: "1.0.25"
---


## How to use this CLI

- Always invoke via `npx -y @sap-ux/create@latest` — never suggest a global install.
- Run with `--simulate` / `-s` first for any write command when the user has not confirmed they want files changed. It implies `--verbose` on most subcommands.
- Pass passwords via `--password env:MY_VAR` — never plain-text in the shell command.
- Commands that prompt interactively (`generate adaptation-project`, `add model`, `add component-usages`) require either `-y` / `--yes` or all required flags pre-filled to run non-interactively.
- `add annotations`, `change data-source`, and `change inbound` are not supported for Cloud Foundry projects.
- `add adp-cf-config` is experimental and may change or be removed without notice.

---

# [Commands](#commands)

## [`generate`](#generate)

Command group for generating SAP Fiori applications. A subcommand is required.

Usage: `npx --yes @sap-ux/create@latest generate [subcommand] [options]`

The available subcommands are: `adaptation-project`


--------------------------------

## [`generate adaptation-project`](#generate-adaptation-project)

Generate a new SAPUI5 adaptation project with optional prompts and configuration.

Example:

`npx --yes @sap-ux/create@latest generate adaptation-project`

Options:
- `-n, --skip-install` - Skip the `npm install` step.
- `-s, --simulate` - Simulate only. Do not write or install.
- `-y, --yes` - Use default values for all prompts.
- `--id [id]` - The ID of the adaptation project.
- `--reference [reference]` - The ID of the original application.
- `--url [url]` - The URL that points to the target system which contains the original application.
- `--ignoreCertErrors` - Ignore certificate errors when connecting to the target system.
- `--ft` - Enable SAP Fiori tools for the generated project.
- `--ts` - Enable TypeScript support for the generated project.
- `--package [package]` - The ABAP package to be used for deployments.
- `--transport [transport]` - The ABAP transport to be used for deployments.

--------------------------------

## [`add`](#add)

Command group for adding features to existing SAP Fiori applications. A subcommand is required.

Usage: `npx --yes @sap-ux/create@latest add [subcommand] [options]`

The available subcommands are: `mockserver-config`, `smartlinks-config`, `eslint-config`, `cds-plugin-ui5`, `inbound-navigation`, `cards-editor`, `model`, `annotations`, `html`, `component-usages`, `deploy-config`, `variants-config`, `adp-cf-config`, `system` and `flp-embedded-config`


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

Options:
- `--name <string>` _(required)_ - Display name for the system
- `--url <string>` _(required)_ - URL of the backend system
- `--client <string>` - SAP client number (optional)
- `--type <string>` - System type (AbapCloud | OnPrem | Generic) _(default: `OnPrem`)_
- `--auth <string>` - Authentication type (basic | reentranceTicket | oauth2 | oauth2ClientCredential) _(default: `basic`)_
- `--connection-type <string>` - Connection type (abap_catalog | generic_host | odata_service) _(default: `abap_catalog`)_
- `--username <string>` - Username for basic authentication
- `--password <string>` - To avoid plain-text credentials in the shell's history, pass an env reference: --password env:MY_VAR

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

--------------------------------

## [`convert`](#convert)

Command group for converting existing SAP Fiori applications. A subcommand is required.

Usage: `npx --yes @sap-ux/create@latest convert [subcommand] [options]`

The available subcommands are: `preview-config` and `eslint-config`


--------------------------------

## [`convert preview-config`](#convert-preview-config)

Executed in the root folder of an app, it converts the respective app to the preview with virtual endpoints. It uses the configuration from the scripts in the `package.json` file to adjust the UI5 configuration YAML files accordingly. The obsolete JS and TS sources are deleted and the HTML files previously used for the preview are renamed to `*_old.html`.

Examples:

`npx --yes @sap-ux/create@latest convert preview-config --simulate=false --tests=false`

`npx --yes @sap-ux/create@latest convert preview-config`

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

--------------------------------

## [`remove`](#remove)

Command group for removing features from existing SAP Fiori applications. A subcommand is required.

Usage: `npx --yes @sap-ux/create@latest remove [subcommand] [options]`

The available subcommands are: `mockserver-config` and `system`


--------------------------------

## [`remove mockserver-config`](#remove-mockserver-config)

Removes the configuration for the `@sap-ux/ui5-middleware-fe-mockserver` mockserver module.

Example:

`npx --yes @sap-ux/create@latest remove mockserver-config`

Options:
- `-v, --verbose` - Show verbose information.
- `-f, --force` - Do not ask for confirmation when deleting files.

--------------------------------

## [`remove system`](#remove-system)

Remove a saved back-end system from the saved system store (`~/.fioritools`). Also deletes any stored credentials in the OS keychain.

Example:

`npx --yes @sap-ux/create@latest remove system --url https://my-sap.example.com`

`npx --yes @sap-ux/create@latest remove system --url https://my-sap.example.com --client 100`

Options:
- `--url <string>` _(required)_ - URL of the backend system to remove
- `--client <string>` - SAP client number (optional)

--------------------------------

## [`update`](#update)

Command group for updating saved resources. A subcommand is required.

Usage: `npx --yes @sap-ux/create@latest update [subcommand] [options]`

The available subcommands are: `system`


--------------------------------

## [`update system`](#update-system)

Update an existing backend system in the saved systems store (`~/.fioritools`). The system is identified by its URL and optional SAP client.


Example:

`npx --yes @sap-ux/create@latest update system --url https://my-sap.example.com --name "New Name"`

`npx --yes @sap-ux/create@latest update system --url https://my-sap.example.com --client 100 --username newuser`

Options:
- `--url <string>` _(required)_ - URL of the backend system to update
- `--client <string>` - SAP client number to identify the system (optional)
- `--name <string>` - New display name for the system
- `--username <string>` - New username
- `--password <string>` - To avoid plain-text credentials in the shell's history, pass an env reference: --password env:MY_VAR
- `--clear-credentials` - Remove stored credentials from the system

--------------------------------

## [`change`](#change)

Command group for changing existing SAP Fiori applications. A subcommand is required.

Usage: `npx --yes @sap-ux/create@latest change [subcommand] [options]`

The available subcommands are: `data-source` and `inbound`

--------------------------------

## [`change data-source`](#change-data-source)

Replace the OData Source of the base application in an adaptation project.


This command is not supported for Cloud Foundry projects.

Example:

`npx --yes @sap-ux/create@latest change data-source`

Options:
- `-s, --simulate` - Simulate only. Do not write or install.
- `-c, --config <string>` - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_

--------------------------------

## [`change inbound`](#change-inbound)

Replace the inbound FLP configurations of the base application in an adaptation project.


This command is not supported for Cloud Foundry projects.

Example:

`npx --yes @sap-ux/create@latest change inbound`

Options:
- `-s, --simulate` - Simulate only. Do not write or install.

--------------------------------

## [`list`](#list)

Command group for listing saved resources. A subcommand is required.

Usage: `npx --yes @sap-ux/create@latest list [subcommand] [options]`

The available subcommands are: `system`


--------------------------------

## [`list system`](#list-system)

List all back-end systems in the saved system store (`~/.fioritools`). Sensitive data, such as passwords and tokens, is never included in the output.

Example:

`npx --yes @sap-ux/create@latest list system`

`npx --yes @sap-ux/create@latest list system --json`

Options:
- `--json` - Output as JSON, which is useful for automation and MCP integrations.

--------------------------------

## [`get`](#get)

Command group for retrieving saved resources. A subcommand is required.

Usage: `npx --yes @sap-ux/create@latest get [subcommand] [options]`

The available subcommands are: `system`


--------------------------------

## [`get system`](#get-system)

Retrieve details of a saved back-end system by URL. Sensitive data (passwords, tokens) is never included in the output.

Example:

`npx --yes @sap-ux/create@latest get system --url https://my-sap.example.com`

`npx --yes @sap-ux/create@latest get system --url https://my-sap.example.com --client 100`

`npx --yes @sap-ux/create@latest get system --url https://my-sap.example.com --json`

Options:
- `--url <string>` _(required)_ - URL of the backend system.
- `--client <string>` - SAP client number (optional).
- `--json` - Output as JSON, which is useful for automation and MCP integrations.

