# `@sap-ux/create` CLI Reference

Configure features for Fiori applications and projects (0.13.142).

# [Usage](#usage)

It is recommended to use the cli via `npx` to always get the latest version without the need to install or update it manually. You can run it using:

```sh
npx -y @sap-ux/create@latest [command] [sub-command] /path/to/project
```

If you prefer to download the module, you can install it globally or add it as `devDependency` to a project. Once installed, you can run it using

```sh
# install globally
npm i -g @sap-ux@latest
# or install as devDependency
npm i -D @sap-ux/create@latest
# then run
sap-ux [command] [sub-command] /path/to/project
```

`Note:` If the project path is not provided, the current working directory will be used.

---

# [Commands](#commands)

## [` generate`](#-generate)

Command group for generating SAP Fiori applications. A subcommand is required.

Usage: `$ npx --yes @sap-ux/create@latest generate [subcommand] [options]`

Available subcommands: adaptation-project


--------------------------------

## [` generate adaptation-project`](#-generate-adaptation-project)

Generate a new UI5 adaptation project with optional prompts and configuration.

Example usage:

`$ npx -y @sap-ux/create@latest generate adaptation-project`

**Options:**
- `-n, --skip-install` - skip npm install step
- `-s, --simulate` - simulate only do not write or install
- `-y, --yes` - use default values for all prompts
- `--id [id]` - id of the adaptation project
- `--reference [reference]` - id of the original application
- `--url [url]` - url pointing to the target system containing the original app
- `--ignoreCertErrors` - ignore certificate errors when connecting to the target system
- `--ft` - enable the Fiori tools for the generated project
- `--ts` - enable the TypeScript support for the generated project
- `--package [package]` - ABAP package to be used for deployments
- `--transport [transport]` - ABAP transport to be used for deployments

--------------------------------

## [` add`](#-add)

Command group for adding features to existing SAP Fiori applications. A subcommand is required.

Usage: `$ npx --yes @sap-ux/create@latest add [subcommand] [options]`

Available Subcommands: mockserver-config, smartlinks-config, cds-plugin-ui5, inbound-navigation, cards-editor, model, annotations, html, component-usages, deploy-config, variants-config


--------------------------------

## [` add mockserver-config`](#-add-mockserver-config)

Add the necessary configuration for mockserver module @sap-ux/ui5-middleware-fe-mockserver to enable local OData mocking.

Example usage:

`$ npx -y @sap-ux/create@latest add mockserver-config`

**Options:**
- `-i, --interactive` - ask for config options, otherwise use defaults
- `-n, --skip-install` - skip npm install step
- `-s, --simulate` - simulate only do not write or install; sets also --verbose
- `-v, --verbose` - show verbose information

--------------------------------

## [` add smartlinks-config`](#-add-smartlinks-config)

Add a smartLinks configuration to a project for cross-app navigation.

Example usage:

`$ npx -y @sap-ux/create@latest add smartlinks-config`

**Options:**
- `-s, --simulate` - simulate only do not write config; sets also --verbose
- `-v, --verbose` - show verbose information

--------------------------------

## [` add cds-plugin-ui5`](#-add-cds-plugin-ui5)

Add the cds-plugin-ui5 and all prerequisites to a CAP project for UI5 Server integration.

Example usage:

`$ npx -y @sap-ux/create@latest add cds-plugin-ui5`

**Options:**
- `-n, --skip-install` - skip npm install step
- `-s, --simulate` - simulate only, do not write or install; sets also --verbose
- `-v, --verbose` - show verbose information

--------------------------------

## [` add inbound-navigation`](#-add-inbound-navigation)

Add Fiori Launchpad inbound navigation configuration to a project.

Example usage:

`$ npx -y @sap-ux/create@latest add inbound-navigation`

**Options:**
- `-s, --simulate` - simulate only do not write config; sets also --verbose
- `-v, --verbose` - show verbose information
- `-c, --config <string>` _(required)_ - Path to project configuration file in YAML format _(default: "ui5.yaml")_

--------------------------------

## [` add cards-editor`](#-add-cards-editor)

Add the necessary configuration to an existing yaml file and the script to package.json for cards generation. It will use the configuration from the yaml file passed by cli or default to ui5.yaml, as provided by the fiori-tools-preview or preview-middleware.

Example usage:

`$ npx -y @sap-ux/create@latest add cards-editor`

**Options:**
- `-c, --config <string>` _(required)_ - Path to project configuration file in YAML format _(default: "ui5.yaml")_
- `-s, --simulate` - simulate only do not write config; sets also --verbose
- `-v, --verbose` - show verbose information

--------------------------------

## [` add model`](#-add-model)

Add a new OData service and UI5 model to an existing adaptation project.

Example usage:

`$ npx -y @sap-ux/create@latest add model`

**Options:**
- `-s, --simulate` - simulate only do not write or install

--------------------------------

## [` add annotations`](#-add-annotations)

Adds an annotation to the OData Source of the base application in an adaptation project.

Example usage:

`$ npx -y @sap-ux/create@latest add annotations`

**Options:**
- `-s, --simulate` - simulate only do not write or install
- `-c, --config <string>` _(required)_ - Path to project configuration file in YAML format _(default: "ui5.yaml")_

--------------------------------

## [` add html`](#-add-html)

Add html files for local preview and testing to the project. It will use the configuration from the `ui5.yaml` as default, as provided by the `fiori-tools-preview` or `preview-middleware`.

Example usage:

`$ npx -y @sap-ux/create@latest add html`

**Options:**
- `-c, --config <string>` _(required)_ - Path to project configuration file in YAML format _(default: "ui5.yaml")_
- `-s, --simulate` - simulate only do not write config; sets also --verbose
- `-v, --verbose` - show verbose information

--------------------------------

## [` add component-usages`](#-add-component-usages)

Add the component usages to an adaptation project.

Example usage:

`$ npx -y @sap-ux/create@latest add component-usages`

**Options:**
- `-s, --simulate` - simulate only do not write or install

--------------------------------

## [` add deploy-config`](#-add-deploy-config)

Prompt for ABAP deployment configuration details and add/update the project files accordingly.

Example usage:

`$ npx -y @sap-ux/create@latest add deploy-config`

**Options:**
- `-t, --target <string>` _(required)_ - target for deployment; ABAP or Cloud Foundry (not yet implemented)
- `-s, --simulate` - simulate only do not write; sets also --verbose
- `-v, --verbose` - show verbose information
- `-b, --base-file <string>` _(required)_ - the base file config file of the project; default : ui5.yaml
- `-d, --deploy-file <string>` _(required)_ - the name of the deploy config file to be written; default : ui5-deploy.yaml

--------------------------------

## [` add variants-config`](#-add-variants-config)

Add the necessary configuration to an existing yaml file and the script to package.json for variants creation. It will use the configuration from the yaml file passed by cli or default to `ui5.yaml`, as provided by the `fiori-tools-preview` or `preview-middleware`.

Example usage:

`$ npx -y @sap-ux/create@latest add variants-config`

**Options:**
- `-c, --config <string>` _(required)_ - Path to project configuration file in YAML format _(default: "ui5.yaml")_
- `-s, --simulate` - simulate only do not write config; sets also --verbose
- `-v, --verbose` - show verbose information

--------------------------------

## [` convert`](#-convert)

Command group for converting existing SAP Fiori applications. A subcommand is required.

Usage: `$ npx --yes @sap-ux/create@latest convert [subcommand] [options]`

Available Subcommands: preview-config


--------------------------------

## [` convert preview-config`](#-convert-preview-config)

Executed in the root folder of an app, it will convert the respective app to the preview with virtual endpoints. It will use the configuration from the scripts in the `package.json` file to adjust the UI5 configuration YAML files accordingly. The obsolete JS and TS sources will be deleted and the HTML files previously used for the preview will be renamed to `*_old.html`.

Example usage:

`$ npx -y @sap-ux/create@latest convert preview-config`

**Options:**
- `-s, --simulate <boolean>` _(required)_ - simulate only do not write
- `-v, --verbose` - show verbose information
- `-t, --tests <boolean>` _(required)_ - also convert test suite and test runners

--------------------------------

## [` remove`](#-remove)

Command group for removing features from existing SAP Fiori applications. A subcommand is required.

Usage: `$ npx --yes @sap-ux/create@latest remove [subcommand] [options]`

Available Subcommands: mockserver-config


--------------------------------

## [` remove mockserver-config`](#-remove-mockserver-config)

Removes the configuration for mockserver module @sap-ux/ui5-middleware-fe-mockserver.

Example usage:

`$ npx -y @sap-ux/create@latest remove mockserver-config`

**Options:**
- `-v, --verbose` - show verbose information
- `-f, --force` - do not ask for confirmation when deleting files

--------------------------------

## [` change`](#-change)

Command group for changing existing SAP Fiori applications. A subcommand is required.

Usage: `$ npx --yes @sap-ux/create@latest change [subcommand] [options]`

Available Subcommands: data-source, inbound

--------------------------------

## [` change data-source`](#-change-data-source)

Replace the OData Source of the base application in an adaptation project.

Example usage:

`$ npx -y @sap-ux/create@latest change data-source`

**Options:**
- `-s, --simulate` - simulate only do not write or install
- `-c, --config <string>` _(required)_ - Path to project configuration file in YAML format _(default: "ui5.yaml")_

--------------------------------

## [` change inbound`](#-change-inbound)

Replace the Inbound FLP configurations of the base application in an adaptation project.

Example usage:

`$ npx -y @sap-ux/create@latest change inbound`

**Options:**
- `-s, --simulate` - simulate only do not write or install

