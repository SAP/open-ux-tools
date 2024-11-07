#  `@sap-ux/deploy-tooling`

`@sap-ux/deploy-tooling` exposes the capabilities of custom tasks to deploy and undeploy SAP Fiori projects against ABAP servers.

### Pre-requisites

- SAP component SAP_UI 7.53 or higher is installed in your SAP system
- Service needs to be enabled and accessible from your development environment, [how to check this](https://help.sap.com/docs/SAP_NETWEAVER_AS_ABAP_752/68bf513362174d54b58cddec28794093/bb2bfe50645c741ae10000000a423f68.html?version=7.52.5)
- For operations on a SAPUI5 ABAP repository, you need the `S_DEVELOP` authorization, [how to check this](https://sapui5.hana.ondemand.com/sdk/#/topic/91f3ecc06f4d1014b6dd926db0e91070)

## CLI
The module also exposes two commands `deploy` and `undeploy`.

## Install

```bash
`npm install @sap-ux/deploy-tooling --save-dev`
# or
yarn add @sap-ux/deploy-tooling --dev
```

# Verify local installation
```
npx deploy -h
# or
./node_modules/.bin/deploy -h
```

## Usage

```bash
deploy [options]
# or
undeploy [options]
```

By default, YAML configuration is read from `ui5-deploy.yaml`, found in the root of your project when the `deploy` | `undeploy` commands are executed.

To change the default configuration location, run;

Deploy
```bash
deploy -c myproject/my-deploy-config.yaml
# or
deploy --config myproject/my-deploy-config.yaml
```

Undeploy
```bash
undeploy -c myproject/my-undeploy-config.yaml
# or
undeploy --config myproject/my-undeploy-config.yaml
```

#### Minimal Configuration

This is the minimal custom task configuration for deployment using package `$TMP`, without the change being recorded in a transport request.

```yaml
- name: abap-deploy-task
  configuration:
    app:
      name: Z_TEST
      package: $TMP
    target:
      url: https://target.example
    exclude:
      - /test/
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
Custom task YAML Configuration example:
```yaml
- name: abap-deploy-task
  configuration:
    log: 5
    app:
      name: Z_TEST
      package: $TMP
    target:
      url: https://target.example
    exclude:
      - /test/
```
Or setting `verbose: true` will set the log level to `Silly`:

```yaml
- name: abap-deploy-task
  configuration:
    verbose: true
    app:
      name: Z_TEST
      package: $TMP
    target:
      url: https://target.example
    exclude:
      - /test/
```

### Deploy
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
  --service                            (Optional) Alias for the target SAPUI5 Respository OData Service
  --client <sap-client>                Client number of target ABAP system
  --cloud                              target is an ABAP Cloud system
  --cloud-service-key <file-location>  JSON file location with the ABAP cloud service key.
  --cloud-service-env                  Load ABAP cloud service properties from either a .env file or your environment variables. Secrets in your .env should not be committed to source control.
  --username                           ABAP Service username
  --password                           ABAP Service password
  --authentication-type                Authentication type for the app (e.g. 'basic', 'reentranceTicket'). Required for 'reentranceTicket'.
  --create-transport                   Create a transport request during deployment/undeployment
  --transport <transport-request>      Transport number to record the change in the ABAP system
  --name <bsp-name>                    Project name of the app
  --no-strict-ssl                      Deactivate SSL certificate validation, enabled by default
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

#### Deploy Examples

Example 1 - Deploy to an ABAP Cloud system with strict SSL disabled

```bash
deploy --url <target-abap-system> --cloud true --name <app-name> --description '<app-description>' --package <package-name> --transport <transport-request> --no-strict-ssl
```
Using YAML configuration;
```YAML
# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json

specVersion: "3.1"
metadata:
  name: my.namespace.myappname
type: application
builder:
  resources:
    excludes:
      - /test/**
      - /localService/**
  customTasks:
    - name: abap-deploy-task
      afterTask: generateCachebusterInfo
      configuration:        
        target:
          url: <target-abap-system>
          cloud: true
        app:
          name: <app-name>
          description: <app-description>
          package: <package-name>
          transport: <transport-request>
        exclude:
          - /test/
```
Deploy CLI command;
```bash
deploy -c ui5-deploy.yaml --no-strict-ssl
```

### Undeploy
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
  --service                            (Optional) Alias for the target SAPUI5 Respository OData Service
  --client <sap-client>                Client number of target ABAP system
  --cloud                              target is an ABAP Cloud system
  --cloud-service-key <file-location>  JSON file location with the ABAP cloud service key.
  --cloud-service-env                  Load ABAP cloud service properties from either a .env file or your environment variables
  --username                           ABAP Service username
  --password                           ABAP Service password
  --authentication-type                Authentication type for the app (e.g. 'basic', 'reentranceTicket'). Required for 'reentranceTicket'.
  --transport <transport-request>      Transport number to record the change in the ABAP system
  --create-transport                   Create a transport request during deployment
  --package <abap-package>             Package name for deploy target ABAP system (only required when --create-transport is used)
  --name <bsp-name>                    Project name of the app
  --no-strict-ssl                      Deactivate SSL certificate validation, enabled by default
  --test                               Run in test mode. ABAP backend reports undeployment errors without actually undeploying (use --no-test to deactivate it).
  -v, --version                        version of the deploy tooling
  -h, --help                           display help for command
```

### Proxy Support

To enable support for TLS (Transport Layer Security) connections when using `HTTPS_PROXY`, update your environment by setting the `TOOLSUITE_FEATURES` environment variable with `sap.ux.enablePatchProxy`, as shown;

```bash
export TOOLSUITE_FEATURES=sap.ux.enablePatchProxy
export HTTPS_PROXY=<YOUR-PROXY:PORT>
```
Example Scenario

If you're using a proxy server to route your HTTPS traffic, the proxy server will need to create a secure, TLS-encrypted connection to the target server on your behalf. `tls.connect()` will be used to establish that encrypted tunnel between your client, the proxy, and the server.
