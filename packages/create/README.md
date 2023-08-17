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