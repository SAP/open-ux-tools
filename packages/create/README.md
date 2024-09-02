# @sap-ux/create
Module which provides command line interface to configure features for SAP UX projects or applications.

To see usage, run

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

## add
Calling `sap-ux add` allows adding a feature to a project.

### html
Calling `sap-ux add html` will add html files for local preview and testing to the project. It will use the configuration from the `ui5.yaml` as default, as provided by the `fiori-tools-preview` or `preview-middleware` e.g.:
```sh
sap-ux change add html ui5-test.yaml
```
### annotations
Calling `sap-ux add annotations` allows adding an annotation to the OData Source of the base application in an adaptation project.
```sh
sap-ux add annotations /path/to/adaptation-project
```
### deploy-config
Calling `sap-ux add deploy-config` will prompt for ABAP deployment configuration details and add/update the project files accordingly
```sh
sap-ux add deploy-config /path/to/project
```
#### deploy-config options: 
`--target` abap | cf (cf deploy config inquirer not yet implemented)\
`--base-file` e.g ui5.yaml\
`--deploy-file` e.g. ui5-deploy.yaml

### model
Calling `sap-ux add model` allows to add new OData Service and SAPUI5 Model to an existing adaptation project.  
```sh
sap-ux add model /path/to/adaptation-project
```
If the project path is not provided, the current working directory will be used.

## change
Calling `sap-ux change` allows changing a feature of a project.

### data-source
Calling `sap-ux change data-source` allows replacing the OData Source of the base application in an adaptation project.  
```sh
sap-ux change data-source /path/to/adaptation-project
```
If the project path is not provided, the current working directory will be used.

### inbound
Calling `sap-ux change inbound` allows replacing the Inbound FLP configurations of the base application in an adaptation project.  
```sh
sap-ux change inbound /path/to/adaptation-project
```
If the project path is not provided, the current working directory will be used.

## remove
Calling `sap-ux remove` allows removing a feature to a project.

## generate
Calling `sap-ux generate` allows generating a new project.

### adaptation-project
Calling `sap-ux generate adaptation-project` allows generating a new adaptation project. Without further parameters the CLI will prompt the required parameters `id`, `reference` and `url`. To run the prompt non-interactively, it is also possible to execute
```sh
sap-ux generate adaptation-project --id my.adp --reference the.original.app --url http://my.sapsystem.example
```
Additional options are `--skip-install` to skip running `npm install` after the project generation and `--simulate` to only simulate the files that would be generated instead of writing them to the file system.
