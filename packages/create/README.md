# @sap-ux/create
Module which provides command line interface to configure features for SAP UX projects or applications.

## Installation

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
## Basic usage

```sh
npx sap-ux [command] [sub-command] /path/to/project
```
`Note:` If the project path is not provided, the current working directory will be used.

Options:
  - `-v | --version` output the module version number
  - `-h | --help` display help and options for module

### Command Options

To use a option for a specific command run:
```sh 
npx sap-ux [command] [sub-command] [options]
```
To see options for a specific command run: `npx sap-ux [command] [sub-command] -h`

Common Options:
- `-h | --help` display help and options for command
- `-v | --verbose` show verbose information
- `-s | --simulate` simulate only do not write config; sets also --verbose

## Command Overview
The `@sap-ux/create` modules provides commands for the following cases:
- `sap-ux add` - allows adding a feature
- `sap-ux change` allows changing a feature
- `sap-ux convert` allows converting an app to a new feature
- `sap-ux remove` allows removing a feature
- `sap-ux generate` allows generating a new project


## sap-ux add
Calling `sap-ux add` allows adding a feature to a project.


### annotations
Calling `sap-ux add annotations` allows adding an annotation to the OData Source of the base application in an adaptation project.
```sh
sap-ux add annotations [path]
```
- `-c | --config` path to project configuration file in YAML format, e.g.: `-c ui5Custom.yaml`


### cards-editor
Calling `sap-ux add cards-editor` adds a cards editor configuration to a project. To prevent overwriting, existing inbounds will be checked.
```sh
sap-ux add cards-editor [path]
```
- `-n | --skip-install` skip npm install step

### component-usages
Calling `sap-ux add component-usages` adds the component usages to an adaptation project.
```sh
sap-ux add component-usages [path]
```


### cds-plugin-ui5
Calling `sap-ux add cds-plugin-ui5` adds the cds-plugin-ui5 and all prerequisites to a CAP project.
```sh
sap-ux add cds-plugin-ui5 [path]
```
- `-n | --skip-install` skip npm install step


### deploy-config
Calling `sap-ux add deploy-config` will prompt for ABAP deployment configuration details and add/update the project files accordingly.
```sh
sap-ux add deploy-config [path]
```
- `-t | --target` target for deployment; ABAP or Cloud Foundry (not yet implemented)
- `-b | --base-file` the base file config file of the project; default: ui5.yaml
- `-d | --deploy-file` the name of the deploy config file to be written; default: ui5-deploy.yaml


### html
Calling `sap-ux add html` will add html files for local preview and testing to the project. It will use the configuration from the `ui5.yaml` as default, as provided by the `fiori-tools-preview` or `preview-middleware`.
```sh
sap-ux add html [path]
```
- `-c | --config` path to project configuration file in YAML format, e.g.: `-c ui5Custom.yaml`

### model
Calling `sap-ux add model` allows to add new OData Service and SAPUI5 Model to an existing adaptation project.
```sh
sap-ux add model [path]
```

### mockserver-config
Calling `sap-ux add mockserver-config` adds the necessary configuration for mockserver module @sap-ux/ui5-middleware-fe-mockserver. 
```sh
sap-ux add mockserver-config [path]
```
- `-i | --interactive` ask for config options, otherwise use defaults'
- `-n | --skip-install` skip npm install step

### smartlinks-config
Calling `sap-ux add smartlinks-config` adds a smartLinks configuration to a project 
```sh
sap-ux add smartlinks-config [path]
```

### variants-config
Calling `sap-ux add variants-config` will add the necessary configuration to an existing yaml file and the script to package.json for variants creation. It will use the configuration from the yaml file passed by cli or default to `ui5.yaml`, as provided by the `fiori-tools-preview` or `preview-middleware`.
```sh
sap-ux add variants-config [path]
```
- `-c | --config` path to project configuration file in YAML format, e.g.: `-c ui5Custom.yaml`

## sap-ux change
Calling `sap-ux change` allows changing a feature of a project.

### data-source
Calling `sap-ux change data-source` allows replacing the OData Source of the base application in an adaptation project.  
```sh
sap-ux change data-source [path]
```
- `-c | --config` path to project configuration file in YAML format, e.g.: `-c ui5Custom.yaml`

### inbound
Calling `sap-ux change inbound` allows replacing the Inbound FLP configurations of the base application in an adaptation project.  
```sh
sap-ux change inbound [path]
```

## sap-ux convert
Calling `sap-ux convert` allows converting an app to a new feature.

### preview
Calling `sap-ux convert preview-config` in the root folder of an app will convert the respective app to the preview with virtual files. It will use the configuration from the scripts in `package.json` to adjust the UI5 configuration yaml files accordingly. No longer needed js/ts sources will be deleted and the html files previously used for the preview will be renamed to *_old.html.
```sh
sap-ux convert preview [path]
```

## sap-ux remove
Calling `sap-ux remove` allows removing a feature to a project.

### mockserver-config
Calling `sap-ux remove mockserver-config` removes the configuration for mockserver module @sap-ux/ui5-middleware-fe-mockserver. 
```sh
sap-ux remove mockserver-config [path]
```
- `-f | --force` do not ask for confirmation when deleting files


## sap-ux generate
Calling `sap-ux generate` allows generating a new project.

### adaptation-project
Calling `sap-ux generate adaptation-project` allows generating a new adaptation project. Without further parameters the CLI will prompt the required parameters `id`, `reference` and `url`. To run the prompt non-interactively, it is also possible to execute
```sh
sap-ux generate adaptation-project --id my.adp --reference the.original.app --url http://my.sapsystem.example
```
- `-n | --skip-install` skip npm install step
- `-y | --yes` use default values for all prompts
- `--id [id]` id of the adaptation project
- `--reference [reference]` id of the original application
- `--url [url]` url pointing to the target system containing the original app
- `--ignoreCertErrors` ignore certificate errors when connecting to the target system
- `--ft` enable the Fiori tools for the generated project
- `--package [package]` ABAP package to be used for deployments
- `--transport [transport]` ABAP transport to be used for deployments
