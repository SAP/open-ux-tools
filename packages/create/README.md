[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/create/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/create)
# [`@sap-ux/create`](https://github.com/SAP/open-ux-tools/tree/main/packages/create) CLI Reference

Configure features for SAP Fiori applications and projects (@sap-ux/create version 0.13.162).

# [Usage](#usage)

It is recommended to use the cli using `npx` to always get the latest version without the need to install or update it manually. You can run it using:

```sh
npx -y @sap-ux/create@latest [command] [sub-command] /path/to/project
```

If you prefer to download the module, you can install it globally or add it as `devDependency` to a project. Once installed, you can run it using

```sh
# install globally
npm i -g @sap-ux/create@latest
# or install as devDependency
npm i -D @sap-ux/create@latest
# then run
sap-ux [command] [sub-command] /path/to/project
```

`Note:` If the project path is not provided, the current working directory is used.

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

The available subcommands are: `mockserver-config`, `smartlinks-config`, `cds-plugin-ui5`, `inbound-navigation`, `cards-editor`, `model`, `annotations`, `html`, `component-usages`, `deploy-config` and `variants-config`


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
- `-c, --config <string>` _(required)_ - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_

--------------------------------

## [`add cards-editor`](#add-cards-editor)

Add the necessary configuration to an existing YAML file and the script to the `package.json` file for cards generation. It uses the configuration from the YAML file passed by the CLI or default to `ui5.yaml`, as provided by the `fiori-tools-preview` or `preview-middleware`.

Example:

`npx --yes @sap-ux/create@latest add cards-editor`

Options:
- `-c, --config <string>` _(required)_ - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_
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

Example:

`npx --yes @sap-ux/create@latest add annotations`

Options:
- `-s, --simulate` - Simulate only. Do not write or install.
- `-c, --config <string>` _(required)_ - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_

--------------------------------

## [`add html`](#add-html)

Add HTML files for local preview and testing to the project. It uses the configuration from the `ui5.yaml` file as default, as provided by the `fiori-tools-preview` or `preview-middleware`.

Example:

`npx --yes @sap-ux/create@latest add html`

Options:
- `-c, --config <string>` _(required)_ - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_
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
- `-t, --target <string>` _(required)_ - Target for deployment: ABAP or Cloud Foundry (not yet implemented)
- `-s, --simulate` - Simulate only. Do not write. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.
- `-b, --base-file <string>` _(required)_ - The base config file of the project. _(default: "ui5.yaml")_
- `-d, --deploy-file <string>` _(required)_ - The name of the deploy config file to be written. _(default: "ui5-deploy.yaml")_

--------------------------------

## [`add variants-config`](#add-variants-config)

Add the necessary configuration to an existing YAML file and the script to the `package.json` file for variants creation. It uses the configuration from the YAML file passed by the CLI or default to `ui5.yaml`, as provided by the `fiori-tools-preview` or `preview-middleware`.

Example:

`npx --yes @sap-ux/create@latest add variants-config`

Options:
- `-c, --config <string>` _(required)_ - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_
- `-s, --simulate` - Simulate only. Do not write to the config file. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.

--------------------------------

## [`convert`](#convert)

Command group for converting existing SAP Fiori applications. A subcommand is required.

Usage: `npx --yes @sap-ux/create@latest convert [subcommand] [options]`

The available subcommands are: `preview-config`


--------------------------------

## [`convert preview-config`](#convert-preview-config)

Executed in the root folder of an app, it converts the respective app to the preview with virtual endpoints. It uses the configuration from the scripts in the `package.json` file to adjust the UI5 configuration YAML files accordingly. The obsolete JS and TS sources are deleted and the HTML files previously used for the preview are renamed to `*_old.html`.

Examples:

`npx --yes @sap-ux/create@latest convert preview-config --simulate=false --tests=false`

`npx --yes @sap-ux/create@latest convert preview-config`

Options:
- `-s, --simulate <boolean>` _(required)_ - Simulate only. Do not write.
- `-v, --verbose` - Show verbose information.
- `-t, --tests <boolean>` _(required)_ - Also, convert test suite and test runners.

--------------------------------

## [`remove`](#remove)

Command group for removing features from existing SAP Fiori applications. A subcommand is required.

Usage: `npx --yes @sap-ux/create@latest remove [subcommand] [options]`

The available subcommands are: `mockserver-config`


--------------------------------

## [`remove mockserver-config`](#remove-mockserver-config)

Removes the configuration for the `@sap-ux/ui5-middleware-fe-mockserver` mockserver module.

Example:

`npx --yes @sap-ux/create@latest remove mockserver-config`

Options:
- `-v, --verbose` - Show verbose information.
- `-f, --force` - Do not ask for confirmation when deleting files.

--------------------------------

## [`change`](#change)

Command group for changing existing SAP Fiori applications. A subcommand is required.

Usage: `npx --yes @sap-ux/create@latest change [subcommand] [options]`

The available subcommands are: `data-source` and `inbound`

--------------------------------

## [`change data-source`](#change-data-source)

Replace the OData Source of the base application in an adaptation project.

Example:

`npx --yes @sap-ux/create@latest change data-source`

Options:
- `-s, --simulate` - Simulate only. Do not write or install.
- `-c, --config <string>` _(required)_ - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_

--------------------------------

## [`change inbound`](#change-inbound)

Replace the inbound FLP configurations of the base application in an adaptation project.

Example:

`npx --yes @sap-ux/create@latest change inbound`

Options:
- `-s, --simulate` - Simulate only. Do not write or install.

