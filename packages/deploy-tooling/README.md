#  `@sap-ux/deploy-tooling`

## ui5-task

To be documented ...

### Configuration Examples

#### Minimal Configuration
This is the minimal configuration for deployment to `$TMP` without the change being recorded in a transport.

```yaml
- name: abap-deploy-task
  configuration:
    app:
      name: Z_TEST
      package: $TMP
    target:
      url: https://target.example
```

## CLI
The module also exposes the two commands `deploy` and `undeploy`. 

### deploy
The `deploy` command executes the same functionality as the `abap-deploy` UI5 task independent of the `ui5 build` execution. This allows to separate the build and the deployment process e.g. for CI/CD or to provide configurations as CLI args instead of having them defined in the `ui5.yaml` - nevertheless, the `ui5.yaml` is always required as a basis for the configuration.

```
Usage: deploy [options]

Options:
  -c, --config <path-to-yaml>      Path to config yaml file
  -y, --yes                        yes to all questions (default: false)
  -v, --verbose                    verbose log output (default: false)
  -n, --no-retry                   do not retry if the deployment fails for any reason
  -V, --version                    output the version number
  --destination  <destination>     Destination in SAP BTP pointing to an ABAP system 
  --url <target-url>               URL of deploy target ABAP system
  --client <sap-client>            Client number of deploy target ABAP system
  --cloud                          true for deployments to ABAP Cloud
  --transport <transport-request>  Transport number to record the change in the ABAP system
  --name <bsp-name>                Project name of the app
  --strict-ssl                     Perform certificate validation (use --no-strict-ssl to deactivate it)
  --test                           Run in test mode. ABAP backend reports deployment errors without actually deploying (use --no-test to deactivate it)
  --package <abap-package>         Package name for deploy target ABAP system
  --description <description>      Project description of the app
  --keep                           Keep a copy of the deployed archive in the project folder.
  --archive-url <url>              Download app bundle from this url and upload this bundle for deployment
  --archive-path <path>            Provide path of the app bundle for deployment
  --archive-folder <path>          Provide path to a folder for deployment
  -h, --help                       display help for command
```

### undeploy
The `undeploy` command allows undeploying a previously deployed application. This functionality is only available as CLI command and not as ui5 task.

```
Usage: undeploy [options]

Options:
  -c, --config <path-to-yaml>      Path to config yaml file
  -y, --yes                        yes to all questions (default: false)
  -v, --verbose                    verbose log output (default: false)
  -n, --no-retry                   do not retry if the undeployment fails for any reason
  -V, --version                    output the version number
  --destination  <destination>     Destination in SAP BTP pointing to an ABAP system 
  --url <target-url>               URL of deploy target ABAP system
  --client <sap-client>            Client number of deploy target ABAP system
  --cloud                          true for undeployments from ABAP Cloud
  --transport <transport-request>  Transport number to record the change in the ABAP system
  --name <bsp-name>                Project name of the app
  --strict-ssl                     Perform certificate validation (use --no-strict-ssl to deactivate it)
  --test                           Run in test mode. ABAP backend reports deployment errors without actually deploying (use --no-test to deactivate it)
  -h, --help                       display help for command
```