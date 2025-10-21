# `@sap-ux/create` CLI Reference

Configure features for Fiori applications and projects. (0.13.142)

# [Installation](#installation)

```sh
npm init @sap-ux@latest
# or
npx @sap-ux/create@latest
```
To avoid downloading and installing the module every time it is used, you might consider installing it globally or add it as `devDependency` to a project. Once installed, you can run it using

```sh
# globally installed
sap-ux
# locally
npx sap-ux
```

---

# [Basic usage](#basic-usage)

```sh
npx sap-ux [command] [sub-command] /path/to/project
```
`Note:` If the project path is not provided, the current working directory will be used.

---

# [Commands](#commands)

## [` generate`](#-generate)

Generate adaptation projects.
                    Available Subcommands: adaptation-project


---

## [` generate adaptation-project`](#-generate-adaptation-project)

Generate a new UI5 adaptation project with optional prompts and configuration.

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

---

## [` add`](#-add)

Add features to an SAP Fiori app.
                    Available Subcommands: mockserver-config, smartlinks-config, cds-plugin-ui5, inbound-navigation, cards-editor, model, annotations, html, component-usages, deploy-config, variants-config


---

## [` add mockserver-config`](#-add-mockserver-config)

Add configuration for the mockserver module to enable local OData mocking.

**Options:**
- `-i, --interactive` - ask for config options, otherwise use defaults
- `-n, --skip-install` - skip npm install step
- `-s, --simulate` - simulate only do not write or install; sets also --verbose
- `-v, --verbose` - show verbose information

---

## [` add smartlinks-config`](#-add-smartlinks-config)

Add a smartLinks configuration to a project for cross-app navigation.

**Options:**
- `-s, --simulate` - simulate only do not write config; sets also --verbose
- `-v, --verbose` - show verbose information

---

## [` add cds-plugin-ui5`](#-add-cds-plugin-ui5)

Add the cds-plugin-ui5 and all prerequisites to a CAP project for UI5 integration.

**Options:**
- `-n, --skip-install` - skip npm install step
- `-s, --simulate` - simulate only, do not write or install; sets also --verbose
- `-v, --verbose` - show verbose information

---

## [` add inbound-navigation`](#-add-inbound-navigation)

Add Fiori Launchpad inbound navigation configuration to a project.

**Options:**
- `-s, --simulate` - simulate only do not write config; sets also --verbose
- `-v, --verbose` - show verbose information
- `-c, --config <string>` _(required)_ - Path to project configuration file in YAML format _(default: "ui5.yaml")_

---

## [` add cards-editor`](#-add-cards-editor)

Add a cards editor configuration to a project, enabling card generation.

**Options:**
- `-c, --config <string>` _(required)_ - Path to project configuration file in YAML format _(default: "ui5.yaml")_
- `-s, --simulate` - simulate only do not write config; sets also --verbose
- `-v, --verbose` - show verbose information

---

## [` add model`](#-add-model)

Add a new OData service and UI5 model to an existing adaptation project.

**Options:**
- `-s, --simulate` - simulate only do not write or install

---

## [` add annotations`](#-add-annotations)

Add annotations to the OData service of an adaptation project.

**Options:**
- `-s, --simulate` - simulate only do not write or install
- `-c, --config <string>` _(required)_ - Path to project configuration file in YAML format _(default: "ui5.yaml")_

---

## [` add html`](#-add-html)

Add HTML files for local preview and testing, using the preview middleware configuration.

**Options:**
- `-c, --config <string>` _(required)_ - Path to project configuration file in YAML format _(default: "ui5.yaml")_
- `-s, --simulate` - simulate only do not write config; sets also --verbose
- `-v, --verbose` - show verbose information

---

## [` add component-usages`](#-add-component-usages)

Add component usages to an adaptation project, updating the manifest accordingly.

**Options:**
- `-s, --simulate` - simulate only do not write or install

---

## [` add deploy-config`](#-add-deploy-config)

Add or update ABAP deployment configuration files for the project.

**Options:**
- `-t, --target <string>` _(required)_ - target for deployment; ABAP or Cloud Foundry (not yet implemented)
- `-s, --simulate` - simulate only do not write; sets also --verbose
- `-v, --verbose` - show verbose information
- `-b, --base-file <string>` _(required)_ - the base file config file of the project; default : ui5.yaml
- `-d, --deploy-file <string>` _(required)_ - the name of the deploy config file to be written; default : ui5-deploy.yaml

---

## [` add variants-config`](#-add-variants-config)

Add configuration and scripts for variant management.

**Options:**
- `-c, --config <string>` _(required)_ - Path to project configuration file in YAML format _(default: "ui5.yaml")_
- `-s, --simulate` - simulate only do not write config; sets also --verbose
- `-v, --verbose` - show verbose information

---

## [` convert`](#-convert)

Convert existing SAP Fiori applications.
                    Available Subcommands: preview-config


---

## [` convert preview-config`](#-convert-preview-config)

Convert an app to use virtual preview endpoints and update configuration files.

**Options:**
- `-s, --simulate <boolean>` _(required)_ - simulate only do not write
- `-v, --verbose` - show verbose information
- `-t, --tests <boolean>` _(required)_ - also convert test suite and test runners

---

## [` remove`](#-remove)

Remove features from existing SAP Fiori applications.
                    Available Subcommands: mockserver-config


---

## [` remove mockserver-config`](#-remove-mockserver-config)

Remove the configuration for the mockserver module from a project.

**Options:**
- `-v, --verbose` - show verbose information
- `-f, --force` - do not ask for confirmation when deleting files

---

## [` change`](#-change)

Change existing adaptation projects.
                    Available Subcommands: data-source, inbound

---

## [` change data-source`](#-change-data-source)

Change the OData source of the base application in an adaptation project.

**Options:**
- `-s, --simulate` - simulate only do not write or install
- `-c, --config <string>` _(required)_ - Path to project configuration file in YAML format _(default: "ui5.yaml")_

---

## [` change inbound`](#-change-inbound)

Replace the Inbound FLP configurations of the base application in an adaptation project.

**Options:**
- `-s, --simulate` - simulate only do not write or install

