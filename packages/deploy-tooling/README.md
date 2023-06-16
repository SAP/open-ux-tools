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

#### Configuration with logging enabled
Set the level of detail for log messages, default is `Info`;
```json
Error = 0,
Warn = 1,
Info = 2,
Verbose = 3,
Debug = 4,
Silly = 5
```
Configuration example:
```yaml
- name: abap-deploy-task
  configuration:
    log: 5
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
  -c, --config <path-to-yaml>          Path to config yaml file
  -y, --yes                            yes to all questions (default: false)
  -n, --no-retry                       do not retry if deploy fails for any reason, for CI/CD pipeline flows this option needs to be included (default: false)
  --verbose                            verbose log output (default: false)
  --destination  <destination>         Destination in SAP BTP pointing to an ABAP system
  --url <target-url>                   URL of target ABAP system
  --client <sap-client>                Client number of target ABAP system
  --cloud                              target is an ABAP Cloud system
  --cloud-service-key <file-location>  JSON file location with the ABAP cloud service key.
  --cloud-service-env                  Load ABAP cloud service properties from either a .env file or your environment variables. Secrets in your .env should not be committed to source control.
  --transport <transport-request>      Transport number to record the change in the ABAP system
  --name <bsp-name>                    Project name of the app
  --strict-ssl                         Perform certificate validation (use --no-strict-ssl to deactivate it)
  --test                               Run in test mode. ABAP backend reports deployment errors without actually deploying. (use --no-test to deactivate it)
  --package <abap-package>             Package name for deploy target ABAP system
  --description <description>          Project description of the app
  --safe                               Prevents accidentally breaking deployments.
  --keep                               Keep a copy of the deployed archive in the project folder.
  --archive-url <url>                  Download app bundle from this url and upload this bundle for deployment
  --archive-path <path>                Provide path of the app bundle for deployment
  --archive-folder <path>              Provide path to a folder for deployment
  -v, --version                        version of the deploy tooling
  -h, --help                           display help for command
```

### undeploy
The `undeploy` command allows undeploying a previously deployed application. This functionality is only available as CLI command and not as ui5 task.

```
Usage: undeploy [options]

Options:
  -c, --config <path-to-yaml>          Path to config yaml file
  -y, --yes                            yes to all questions (default: false)
  -n, --no-retry                       do not retry if undeploy fails for any reason, for CI/CD pipeline flows this option needs to be included (default: false)
  --verbose                            verbose log output (default: false)
  --destination  <destination>         Destination in SAP BTP pointing to an ABAP system
  --url <target-url>                   URL of target ABAP system
  --client <sap-client>                Client number of target ABAP system
  --cloud                              target is an ABAP Cloud system
  --cloud-service-key <file-location>  JSON file location with the ABAP cloud service key.
  --cloud-service-env                  Load ABAP cloud service properties from either a .env file or your environment variables
  --transport <transport-request>      Transport number to record the change in the ABAP system
  --name <bsp-name>                    Project name of the app
  --strict-ssl                         Perform certificate validation (use --no-strict-ssl to deactivate it)
  --test                               Run in test mode. ABAP backend reports undeployment errors without actually undeploying (use --no-test to deactivate it).
  -v, --version                        version of the deploy tooling
  -h, --help                           display help for command
```