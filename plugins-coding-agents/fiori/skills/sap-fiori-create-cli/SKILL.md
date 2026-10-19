---
name: sap-fiori-create-cli
description: Invokes the @sap-ux/create CLI — generate, add, convert, remove, update, change, list, get commands for SAP Fiori projects. Use when asked to run sap-ux, invoke create CLI, add config to a project, generate adaptation-project, or use any sap-ux/create subcommand. Full options for each command group are in the linked references.
argument-hint: command and subcommand (e.g., add mockserver-config, generate adaptation-project)
metadata:
  author: sap-fiori-tools
  version: "1.4.18"
---

## How to use this CLI

- Always invoke via `npx -y @sap-ux/create@latest` — never suggest a global install.
- Run with `--simulate` / `-s` first for any write command when the user has not confirmed they want files changed. It implies `--verbose` on most subcommands.
- Pass passwords via `--password env:MY_VAR` — never plain-text in the shell command.
- Commands that prompt interactively (`generate adaptation-project`, `add model`, `add component-usages`) require either `-y` / `--yes` or all required flags pre-filled to run non-interactively.
- `add annotations`, `change data-source`, and `change inbound` are not supported for Cloud Foundry projects.
- `add adp-cf-config` is experimental and may change or be removed without notice.

---

# Commands

## `generate`

Command group for generating SAP Fiori applications. A subcommand is required.

| Subcommand | Description |
|---|---|
| `adaptation-project` | Generate a new SAPUI5 adaptation project with optional prompts and configuration. |
| `opa5-tests` | Generate OPA5 integration tests for an existing SAP Fiori elements (OData V4) application. |

> Full options and flags: `references/generate.md`

--------------------------------

## `add`

Command group for adding features to existing SAP Fiori applications. A subcommand is required.

| Subcommand | Description |
|---|---|
| `mockserver-config` | Add the necessary configuration for the `@sap-ux/ui5-middleware-fe-mockserver` mockserver module to enable local OData mocking. |
| `smartlinks-config` | Add a `smartLinks` configuration to a project for cross-app navigation. |
| `eslint-config` | Add an ESLint configuration to a project including the SAP Fiori tools lint plugin (`@sap-ux/eslint-plugin-fiori-tools`). |
| `cds-plugin-ui5` | Add the `cds-plugin-ui5` module and all prerequisites to a CAP project for UI5 server integration. |
| `inbound-navigation` | Add SAP Fiori launchpad inbound navigation configuration to a project. |
| `cards-editor` | Add the necessary configuration to an existing YAML file and the script to the `package.json` file for cards generation. It uses the configuration from the YAML file passed by the CLI or default to `ui5.yaml`, as provided by the `fiori-tools-preview` or `preview-middleware`. |
| `model` | Add a new OData service and SAPUI5 model to an existing adaptation project. |
| `annotations` | Adds an annotation to the OData Source of the base application in an adaptation project. |
| `html` | Add HTML files for local preview and testing to the project. It uses the configuration from the `ui5.yaml` file as default, as provided by the `fiori-tools-preview` or `preview-middleware`. |
| `component-usages` | Add the component usages to an adaptation project. |
| `deploy-config` | Prompt for ABAP deployment configuration details and adds and updates the project files accordingly. |
| `variants-config` | Add the necessary configuration to an existing YAML file and the script to the `package.json` file for variants creation. It uses the configuration from the YAML file passed by the CLI or default to `ui5.yaml`, as provided by the `fiori-tools-preview` or `preview-middleware`. |
| `adp-cf-config` | Configure an existing Cloud Foundry adaptation project for local preview by fetching reusable libraries, building the project, and configuring ui5.yaml file middlewares. |
| `system` | Add a new back-end system to the saved systems store (`~/.fioritools`). Credentials are stored securely in the OS keychain. |
| `flp-embedded-config` | Add the necessary configuration for running a Fiori app in FLP Embedded Mode. |

> Full options and flags: `references/add.md`

--------------------------------

## `convert`

Command group for converting existing SAP Fiori applications. A subcommand is required.

| Subcommand | Description |
|---|---|
| `preview-config` | Executed in the root folder of an app, it converts the respective app to the preview with virtual endpoints. It uses the configuration from the scripts in the `package.json` file to adjust the UI5 configuration YAML files accordingly. The obsolete JS and TS sources are deleted and the HTML files previously used for the preview are renamed to `*_old.html`. |
| `eslint-config` | Executed in the root folder of an app, it converts the ESLint configuration of the respective app to flat config format (used since ESLint version 9). It also introduces specific ESLint checks for SAP Fiori applications (using the `@sap-ux/eslint-plugin-fiori-tools` plugin), and deletes the deprecated `eslint-plugin-fiori-custom` plugin. To avoid dependency resolution conflicts, it deletes the `package-lock.json` file as well as the `@sap-ux/eslint-plugin-fiori-tools` module from the `node_modules` folder before running `npm install`. |

> Full options and flags: `references/convert.md`

--------------------------------

## `remove`

Command group for removing features from existing SAP Fiori applications. A subcommand is required.

| Subcommand | Description |
|---|---|
| `mockserver-config` | Removes the configuration for the `@sap-ux/ui5-middleware-fe-mockserver` mockserver module. |
| `system` | Remove a saved back-end system from the saved system store (`~/.fioritools`). Also deletes any stored credentials in the OS keychain. |

> Full options and flags: `references/remove.md`

--------------------------------

## `update`

Command group for updating saved resources. A subcommand is required.

| Subcommand | Description |
|---|---|
| `system` | Update an existing backend system in the saved systems store (`~/.fioritools`). The system is identified by its URL and optional SAP client. |
| `service-metadata` | Refresh the local OData service metadata.xml from the live backend for a Fiori application. |

> Full options and flags: `references/update.md`

--------------------------------

## `change`

Command group for changing existing SAP Fiori applications. A subcommand is required.

| Subcommand | Description |
|---|---|
| `data-source` | Replace the OData Source of the base application in an adaptation project. |
| `inbound` | Replace the inbound FLP configurations of the base application in an adaptation project. |

> Full options and flags: `references/change.md`

--------------------------------

## `list`

Command group for listing saved resources. A subcommand is required.

| Subcommand | Description |
|---|---|
| `system` | List all back-end systems in the saved system store (`~/.fioritools`). Sensitive data, such as passwords and tokens, is never included in the output. |

> Full options and flags: `references/list.md`

--------------------------------

## `get`

Command group for retrieving saved resources. A subcommand is required.

| Subcommand | Description |
|---|---|
| `system` | Retrieve details of a saved back-end system by URL. Sensitive data (passwords, tokens) is never included in the output. |

> Full options and flags: `references/get.md`

--------------------------------

## `migrate`

Migrate legacy WebIDE Fiori project to modern Fiori tools format. In BAS, a destination is required. Outside BAS, hostname and client are required; destination is optional.

| Option | Description |
|---|---|
| `-d, --destination <name>` | SAP System destination name (required in BAS) |
| `-s, --sap-system-name <name>` | SAP System name (alias for destination) |
| `-H, --hostname <host>` | Backend hostname (required outside BAS unless resolved from a saved system) |
| `-c, --client <client>` | SAP Client (required outside BAS unless resolved from destination or saved system) |
| `-u, --ui5-version <version>` | UI5 version (defaults to source project version) |
| `-f, --force` | Force migration even if project is already a Fiori tools project |
| `-n, --skip-install` | Skip the `npm install` step after migration |

> Full options and flags: `references/migrate.md`
