
--------------------------------

**TITLE**: Deploying an SAP Fiori Application (ABAP and Cloud Foundry)

**INTRODUCTION**: This guide describes how to deploy SAP Fiori applications using SAP Fiori tools to ABAP systems (via the SAPUI5 Repository) and to SAP Business Technology Platform Cloud Foundry (via the HTML5 Repository). It includes prerequisites, artifact requirements, the deployment process, troubleshooting commands, and CLI help commands developers use during deployment.

**TAGS**: fiori-tools, SAPUI5, ABAP, CloudFoundry, HTML5Repository, deployment, troubleshooting, CLI

STEP: 1 — Deployment Overview

DESCRIPTION: Purpose and high-level behavior. SAP Fiori tools allow deferring the deployment target (ABAP or Cloud Foundry) until deployment time. The deployment artifact for ABAP is a zipped dist folder (SAP Fiori application). Cloud Foundry uses an HTML5 Repository service instance to host/upload the application.

LANGUAGE: Text

CODE:
```text
- Deployment targets supported: ABAP (SAPUI5 Repository) and Cloud Foundry (HTML5 Repository)
- ABAP deployment artifact: zipped `dist` folder (SAP Fiori application)
- Cloud Foundry: create instance of HTML5 Repository service to upload and host the app
```

STEP: 2 — Deploying to ABAP (Prerequisites and Artifact)

DESCRIPTION: Ensure all prerequisites for using an OData service to load data to the SAPUI5 ABAP repository are met. The backend hosts, routes, and authenticates the app. Deploy by uploading a zipped `dist` folder of your SAP Fiori tools project to the SAPUI5 Repository service on the ABAP system.

LANGUAGE: Text

CODE:
```text
Prerequisite:
- Verify prerequisites described at:
  https://ui5.sap.com/#/topic/a883327a82ef4cc792f3c1e7b7a48de8

Artifact:
- Zip the `dist` folder of your SAP Fiori tools project:
  -> This zipped archive is the deployment artifact uploaded to the SAPUI5 Repository
```

STEP: 3 — Deploying to SAP BTP Cloud Foundry (Prerequisites)

DESCRIPTION: Create an instance of the HTML5 Repository service in Cloud Foundry. Ensure other required runtime services are available/instantiated to run the application. Use the HTML5 Repository to upload and host the deployment artifact.

LANGUAGE: Text

CODE:
```text
- Create an instance of the HTML5 Repository service in your Cloud Foundry org/space
- Upload the application artifact (zipped `dist` or configured Cloud Foundry deployment package)
```

STEP: 4 — Generate Deployment Configurations (Process Links)

DESCRIPTION: Before deploying, generate the required deployment configuration files. Reference the specific generator documentation for your target.

LANGUAGE: Text

CODE:
```text
Generate deployment configurations:
- Generate Deployment Configuration ABAP:
  generate-deployment-configuration-abap-c06b9cb.md
- Generate Deployment Configuration Cloud Foundry:
  generate-deployment-configuration-cloud-foundry-41e63bd.md
- SAP Fiori Launchpad Configuration:
  sap-fiori-launchpad-configuration-bc3cb89.md

Follow:
- Deployment of Application:
  deployment-of-application-607014e.md
```

STEP: 5 — Troubleshooting Tips & Server Diagnostics

DESCRIPTION: Common issues and commands to collect more detailed logs. When the SAPUI5 repository service is not reachable, check activation and service accessibility. If you receive HTTP 400 during deploy, inspect console and backend logs via `/IWFND/ERROR_LOG` and verify virus scan profile configuration via `/IWFND/VIRUS_SCAN`.

LANGUAGE: Text

CODE:
```text
Troubleshooting checklist:
- If SAP_UI >= 7.53 but repository can't be reached:
  -> Confirm service activation (see UI5 documentation link above)
- If deployment returns "Request failed with status code 400":
  -> Check client console output
  -> Review backend logs in transaction: /IWFND/ERROR_LOG
  -> Verify virus scan profile in transaction: /IWFND/VIRUS_SCAN

Collect detailed logs during deployment:
- Detailed backend service logs (archiving/deploying message detail):
  macOS/Linux:
    DEBUG=ux-odata-client npm run deploy
  Windows:
    set DEBUG=ux-odata-client & npm run deploy
```

STEP: 6 — SAP Fiori Tools CLI Help

DESCRIPTION: Use the SAP Fiori tools CLI to list available commands and get help for specific commands related to deployment.

LANGUAGE: Bash

CODE:
```bash
# List all available fiori CLI commands:
npx fiori help

# Get details about a specific command, e.g. deploy:
npx fiori deploy help
```
--------------------------------

**TITLE**: UI5 Deployment Configuration (ui5-deploy.yaml) — Fields, Defaults, and Examples

**INTRODUCTION**: Short, actionable reference for configuring deployment to SAP back ends using ui5-deploy.yaml (and environment variables via dotenv/.env). Use this to generate deployment YAML, CI/CD scripts, or runtime config loaders for automated deployments.

**TAGS**: fiori-tools, ui5, deployment, abap, sap, dotenv, ci/cd, ui5-deploy.yaml, ui5.yaml, mta

STEP: 1 — Reference environment variables (dotenv support)

DESCRIPTION: Use environment variables in ui5-deploy.yaml by referencing them with the pattern env:VAR_NAME. The deployment task loads variables from the project's root .env file (via dotenv). Prefer env references for credentials and secrets to avoid embedding them in source files.

LANGUAGE: YAML

CODE:
```yaml
# Example usage in ui5-deploy.yaml:
target:
  url: env:TARGET_URL
credentials:
  username: env:XYZ_USER
  password: env:XYZ_PASSWORD
```

STEP: 2 — Configure target object

DESCRIPTION: Define the target SAP system connection. Required: url. Optional fields: client, params, scp, service. Defaults: scp=false, service=/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV. The client maps to URL parameter sap-client=<client>. params are appended as query string parameters (e.g., sap-language=<code>).

LANGUAGE: YAML

CODE:
```yaml
target:
  url: <string>           # Required. pattern: <protocol>://<hostname>[:<port>]
  client: <number>        # Optional. 0..999, becomes sap-client=<client>
  params: "<string>"      # Optional. Additional query params, e.g. "sap-language=EN"
  scp: false              # Optional. default: false. Set true for ABAP Environment on BTP
  service: "/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV"  # Optional. OData service path
```

STEP: 3 — Configure credentials (for CI/CD only; prefer env refs)

DESCRIPTION: Provide credentials for CI/CD deployments. Use env:VAR references instead of hardcoding. For local use (outside SAP Business Application Studio) prefer OS secure storage; credential object is not recommended for local workflows. Required properties: username, password.

LANGUAGE: YAML

CODE:
```yaml
credentials:
  username: env:XYZ_USER   # Required for CI/CD flows
  password: env:XYZ_PASSWORD  # Required for CI/CD flows; avoid plaintext here
```

STEP: 4 — Configure app object (name, package, transport, description, exclude, index)

DESCRIPTION: Define the back-end ABAP application details. name is required. package is required only for creating new apps; ignored for updates. transport optional (transport request id), description optional. exclude accepts an array of regex strings; matching uses JavaScript string.match(). index (boolean, default false) controls generation/deployment of an additional index.html to run the app standalone.

LANGUAGE: YAML

CODE:
```yaml
app:
  name: "<string>"            # Required. Unique application name (used in URL and ABAP object)
  package: "<string>"         # Required only for new app creation
  transport: "<string>"       # Optional. Transport request number if package requires transport
  description: "<string>"     # Optional. Description stored in back end
  exclude:                    # Optional. Array of regex strings; evaluated with string.match()
    - ".*\\.map$"
    - "^tests/"
  index: true                 # Optional. Default false. true generates and deploys index.html
```

STEP: 5 — Exclude behavior and regex evaluation

DESCRIPTION: When excluding files from deployment (exclude array), expressions are evaluated with JavaScript string.match(). Provide regex strings accordingly. This controls what files are included in the generated .zip sent to the back end.

LANGUAGE: Plain

CODE:
```text
# Example patterns (use as strings in exclude array):
".*\\.map$"    # exclude source map files
"^tests/"      # exclude files under tests/ directory
```

STEP: 6 — MTA directory resolution and prefix

DESCRIPTION: The tool locates the MTA directory by searching parent folders for mta.yaml; if not found, it uses the app's parent directory. Prefix (used for MTA ID and service names) defaults to the application namespace or to "test" if none exists. Choose a unique prefix to avoid service name collisions.

LANGUAGE: Plain

CODE:
```text
# File paths referenced by the deployment tool:
- ui5.yaml        # project UI5 configuration (optional defaults)
- ui5-deploy.yaml # deployment configuration you edit
- mta.yaml        # used to auto-detect MTA directory (nearest parent)
- .env            # optional, root-level environment variables (dotenv)
```

STEP: 7 — Destination for Cloud Foundry

DESCRIPTION: If deploying to a backend on Cloud Foundry, configure the destination. If ui5.yaml contains a destination value, the tool uses it as the default. Ensure the destination is reachable and properly configured for authentication.

LANGUAGE: Plain

CODE:
```text
# Destination is defined/configured outside ui5-deploy.yaml (e.g., CF destination config).
# ui5.yaml may include a default destination entry that the deployment task will use.
```

STEP: 8 — Example full ui5-deploy.yaml template

DESCRIPTION: Minimal practical template combining the fields above. Replace env references with actual variable names set in your CI/CD environment or .env file. Do not commit secrets.

LANGUAGE: YAML

CODE:
```yaml
# ui5-deploy.yaml (example)
target:
  url: env:TARGET_URL
  client: env:TARGET_CLIENT
  params: "sap-language=EN"
  scp: false
  service: "/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV"

credentials:
  username: env:XYZ_USER
  password: env:XYZ_PASSWORD

app:
  name: "com.example.myapp"
  package: "Z_MY_PACKAGE"    # required only for new apps
  transport: "Z123456"       # optional
  description: "My Fiori app"
  exclude:
    - ".*\\.map$"
    - "^tests/"
  index: true
```

STEP: 9 — Optional: .env file format (sample)

DESCRIPTION: Create a .env file at the project root to supply environment variables referenced via env:VAR_NAME. Keep this file out of source control if it contains secrets.

LANGUAGE: text

CODE:
```
XYZ_USER=[MY_USER_NAME]
XYZ_PASSWORD=[MY_PASSWORD]
```
--------------------------------

**TITLE**: Deploying SAP Fiori Applications (ABAP, Cloud Foundry, Test Mode)

**INTRODUCTION**: Action-oriented guide for deploying SAP Fiori projects using fiori-tools. Covers deploying to ABAP (including archive deployments and test mode) and Cloud Foundry (MTA). Includes commands, configuration pointers, and troubleshooting tips (telemetry, SAPUI5 version warnings, authentication prompts).

**TAGS**: fiori-tools, deployment, ABAP, Cloud-Foundry, ui5, mta, archive, test-mode

STEP: Pre-deployment checks and environment
DESCRIPTION: Validate environment and know common prompts/errors before deploying. Use SAP Fiori environment check in SAP Business Application Studio when facing deployment issues. Expect an authentication prompt if backend requires credentials. If target ABAP has lower SAPUI5 version, you may see a warning recommending additional testing (Use Run Control). If no internet during deployment, telemetry error appears — disable telemetry via env var.
LANGUAGE: Bash
CODE:
```bash
# Disable fiori-tools telemetry if needed
export SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY=true
```

STEP: Deploy to ABAP (interactive / CLI)
DESCRIPTION: Deploy the selected SAP Fiori project to an ABAP system. You can use the Visual Studio Code / Business Application Studio Command Palette entry "Fiori: Deploy Application" or run the npm script from the project folder. Follow prompts to confirm configuration and provide credentials when requested. After success, logs contain the deployed application URL to open in a browser.
LANGUAGE: Bash
CODE:
```bash
# From project folder
npm run deploy
```

STEP: Sample generated logs after successful ABAP deployment
DESCRIPTION: Example console output produced after a successful ABAP deployment. Copy or click the App URL in the logs to open the deployed app.
LANGUAGE: Text
CODE:
```
...info builder:custom deploy-to-abap * Done *
...info builder:custom deploy-to-abap App available at https://host:port/sap/bc/ui5_ui5/sap/app/index.html
...
...info builder:custom deploy-to-abap Deployment Successful.
...info builder:builder Build succeeded in 18 s
```

STEP: Deploy an archive to ABAP (local file)
DESCRIPTION: Deploy a prepared ABAP archive (zip) by specifying the archive file path. The archive must be a valid ABAP archive.
LANGUAGE: Bash
CODE:
```bash
npx fiori deploy --archive-path 'somefile.zip'
```

STEP: Deploy an archive to ABAP (remote URL)
DESCRIPTION: Deploy a prepared ABAP archive retrieved from a remote URL that is accessible without authentication.
LANGUAGE: Bash
CODE:
```bash
npx fiori deploy --archive-url 'https://someurl.com/archive.zip'
```

STEP: Archive deployment optional parameters
DESCRIPTION: Append these parameters to provide required deployment configuration for an archive deployment (destination, transport, package, config file, etc.). Provide values according to your target ABAP environment.
LANGUAGE: JSON
CODE:
```json
{
  "-d": "destination",
  "-u": "url",
  "-l": "client",
  "-t": "transport",
  "-n": "name",
  "-p": "package",
  "-e": "description",
  "-c": "/path/to/ui5-deploy.yaml"
}
```

STEP: Deployment to Cloud Foundry — build and deploy MTA
DESCRIPTION: Build the multi-target archive (MTA) and deploy to Cloud Foundry. Ensure you run the npm build command from the mta project's root folder (folder containing mta.yaml). Use the Command Palette "Fiori: Deploy Application" or run the npm deploy script.
LANGUAGE: Bash
CODE:
```bash
# From the folder containing mta.yaml (if currently in a subfolder)
cd ..

# Build MTA artifact
npm run build

# Deploy the built artifact
npm run deploy
```

STEP: Preview deployed application — Standalone Approuter (Cloud Foundry)
DESCRIPTION: In SAP BTP Cockpit, open the target space and use the Applications tab to find the approuter by name. The deployed URL is listed under Application Routes. Click the route to open the HTML5 application.
LANGUAGE: Text
CODE:
# (UI steps, no code)

STEP: Preview deployed application — Managed Approuter (Cloud Foundry) and CLI retrieval
DESCRIPTION: For managed approuter deployments, use the HTML5 Applications tab in the target space to open apps. To retrieve the deployed HTML5 application URL via Cloud Foundry CLI, use the html5-list plugin and run the command with your mta-id and destination resource name.
LANGUAGE: Bash
CODE:
```bash
# Install html5-plugin (required to use html5-list)
cf install-plugin -r CF-Community "html5-plugin"

# Retrieve deployed HTML5 applications (replace <mta-id> with the mta.yaml ID)
cf html5-list -u -di <mta-id>-destination-service -u --runtime launchpad
```
NOTE: `<mta-id>-destination-service` must match the resource name of type `destination` defined in your mta.yaml. If you do not have project sources, run `cf html5-list` to list all HTML5 apps in the space and identify the correct mta-id.

STEP: Business Application Studio MTA build caution
DESCRIPTION: Right-clicking mta.yaml in SAP Business Application Studio and selecting "Build MTA Project" creates an artifact not deployable with `npm run deploy`. Always run the npm build command shown below to create a compatible multi-target archive.
LANGUAGE: Bash
CODE:
```bash
npm run build
```

STEP: ABAP Deployment in Test Mode — prepare package.json
DESCRIPTION: Test Mode simulates ABAP upload operations (create/read/update/delete) without actually deploying to the ABAP system. Confirm your project package.json contains a deploy-test script that runs fiori deploy with --testMode true. Ensure @sap/ux-ui5-tooling version is >= 1.3.5.
LANGUAGE: JSON
CODE:
```json
{
  "scripts": {
    "deploy-test": "fiori deploy --config ui5-deploy.yaml --testMode true"
  }
}
```

STEP: Update tooling and run Test Mode
DESCRIPTION: Update @sap/ux-ui5-tooling if needed, then run the deploy-test script from the project folder to execute Test Mode simulation.
LANGUAGE: Bash
CODE:
```bash
# Update tool to latest (ensure version >= 1.3.5)
npm i @sap/ux-ui5-tooling@latest --save-dev

# From the project folder, run test-mode deployment
npm run deploy-test
```
--------------------------------

**TITLE**: Expose Fiori Application to Central Application Router (cAR / cFLP)

**INTRODUCTION**: Step-by-step instructions to expose a deployed Fiori application to the central application router / central Fiori Launchpad (cFLP) on SAP BTP. Covers creating and exposing XSUAA and HTML5 Application Repository service instances as subaccount-level destinations, preparing service keys, and enabling public exposure in the application's manifest.json. Requires Organization Manager authorizations.

**TAGS**: fiori-tools, sap, btp, xsuaa, html5-repo, destinations, cflp, mta, application-router

**STEP**: 1 — Open BTP Cockpit
**DESCRIPTION**: Open your SAP BTP Cockpit to the target global account/subaccount where the MTA is deployed.
- URL example: https://account.int.sap.eu2.hana.ondemand.com/cockpit#/globalaccount/<globalAccountID>/subaccount/<subaccountID>
- Ensure you have Organization Manager permissions for the subaccount.
**LANGUAGE**: Manual/Console
**CODE**:
```text
Open SAP BTP Cockpit and navigate to your subaccount.
```

**STEP**: 2 — Prepare Authentication (XSUAA) Service
**DESCRIPTION**: Locate the XSUAA (Authorization & Trust Management) service instance created by your MTA. If a service key does not exist, create one and copy its name.
Actionable items:
- In Cockpit: Instances and Subscriptions > Authorization & Trust Management (XSUAA)
- Find the XSUAA instance (e.g. type filter: test-<something_unique>)
- Click the instance row > (details). If no service key exists, create a new service key (three dots menu).
- Copy the service key name. Example service key name: test-<something_unique>-uaa-service-key
**LANGUAGE**: Manual/Console
**CODE**:
```text
Service instance example: test-<something_unique>-uaa
Service key example: test-<something_unique>-uaa-service-key
```

**STEP**: 3 — Expose XSUAA as Subaccount Destination
**DESCRIPTION**: Create a subaccount-level destination for the XSUAA service so the central router can access it.
Actionable items:
- Navigate: Connectivity > Destinations > New Destination
- Type: Service Instance
- Service Instance: select your XSUAA instance (e.g. test-<something_unique>-uaa)
- Name: meaningful name, e.g. test-<something_unique>-uaa
- Click Next
- Add property: ServiceKeyName = <copied service key name> (e.g. test-<something_unique>-uaa-service-key)
- Add property: sap.cloud.service = test-<something_unique>
- Save the destination
**LANGUAGE**: Manual/Console
**CODE**:
```text
Destination properties (example):
Name: test-<something_unique>-uaa
Type: Service Instance
ServiceKeyName: test-<something_unique>-uaa-service-key
sap.cloud.service: test-<something_unique>
```

**STEP**: 4 — Prepare HTML5 Application Repository Service
**DESCRIPTION**: Locate the HTML5 Application Repository (app-host) service instance created by your MTA and copy/create its service key.
Actionable items:
- Cockpit: Instances and Subscriptions > HTML5 Application Repository
- Find the service instance with plan "app-host" (e.g. type filter: test-<something_unique>)
- Click instance details; if no service key exists, create one
- Copy the service key name. Example key: test-<something_unique>-deployer-<something_unique>-html5-repo-host-credentials
**LANGUAGE**: Manual/Console
**CODE**:
```text
Service instance example: test-<something_unique>-html5-repo-host
Service key example: test-<something_unique>-deployer-<something_unique>-html5-repo-host-credentials
```

**STEP**: 5 — Expose HTML5 Repository as Subaccount Destination
**DESCRIPTION**: Create a subaccount destination for the HTML5 repository instance so the central router can access application artifacts.
Actionable items:
- Connectivity > Destinations > New Destination
- Type: Service Instance
- Service Instance: select your HTML5 repo instance (e.g. test-<something_unique>-html5-repo-host)
- Name: meaningful name, e.g. test-<something_unique>-html5-repo-host
- Click Next
- Add property: ServiceKeyName = <copied html5 repo service key name>
- Ensure property sap.cloud.service is set to the same value used for xsuaa (test-<something_unique>)
- Save the destination
**LANGUAGE**: Manual/Console
**CODE**:
```text
Destination properties (example):
Name: test-<something_unique>-html5-repo-host
Type: Service Instance
ServiceKeyName: test-<something_unique>-deployer-<something_unique>-html5-repo-host-credentials
sap.cloud.service: test-<something_unique>
```

**STEP**: 6 — Test Application in HTML5 Applications
**DESCRIPTION**: Verify the application appears in the HTML5 Application Repository and can be opened.
Actionable items:
- Cockpit: HTML5 Applications (or Service: HTML5 Application Repository > Applications)
- Search for your deployed app (e.g. test-<something_unique>)
- Click application entry to view details (e.g. test<something_unique>ztravel)
**LANGUAGE**: Manual/Console
**CODE**:
```text
Open HTML5 Applications and verify app 'test-<something_unique>' is listed and accessible.
```

**STEP**: 7 — Enable Integration into central Fiori Launchpad (cFLP)
**DESCRIPTION**: Make your application public for the central router by adding sap.cloud properties to the root of your application's manifest.json, then rebuild and redeploy the MTA.
Actionable items:
- Edit webapp/manifest.json (root node) to include the sap.cloud block shown below.
- Rebuild and deploy your MTA (mta build / cf deploy or your CI/CD pipeline).
- Note: If you skip this, the app may be configurable in cFLP but will fail at runtime when loaded.
**LANGUAGE**: JSON
**CODE**:
```json
"sap.cloud": {
    "public": true,
    "service": "test-<something_unique>"
  }
```

**STEP**: 8 — Post-deploy verification
**DESCRIPTION**: After deployment, verify:
- The application is reachable via central application router/cFLP.
- Destinations in Connectivity are correct and use the intended service keys and sap.cloud.service value.
- No runtime authorization errors occur when loading the app in cFLP.
**LANGUAGE**: Manual/Console
**CODE**:
```text
Verify:
- Destinations: test-<something_unique>-uaa and test-<something_unique>-html5-repo-host exist at subaccount level.
- manifest.json contains sap.cloud.public = true and correct service name.
- Re-deployed MTA application functions in central Fiori Launchpad without errors.
```
--------------------------------

**TITLE**: Generate Deployment Configuration for ABAP (ui5-deploy.yaml)

**INTRODUCTION**: Create and configure a ui5-deploy.yaml to deploy SAP Fiori apps to an ABAP backend using the SAPUI5 Repository OData service. This guide covers prerequisites, creating the configuration via VS Code / CLI, the interactive prompts, transport handling options, SSL handling, and two example ui5-deploy.yaml configurations you can reuse.

**TAGS**: fiori-tools, ABAP, ui5, deployment, ui5-deploy.yaml, CLI, VSCode, BAS

STEP: 1 — ABAP prerequisites and limitations

DESCRIPTION: Verify system and authorization requirements before generating a deployment configuration. Understand limitations of the deployment task.

LANGUAGE: Plaintext

CODE:
```text
Prerequisites:
- SAP component SAP_UI 7.53 or higher installed.
  Note: For systems below 7.53, the alternative is to upload the application manually.
- The SAPUI5 Repository OData service must be enabled and accessible from your development environment.
  (See "activate and maintain services" in SAP help.)
- You need the S_DEVELOP authorization for operations on an SAPUI5 ABAP repository.

Limitations:
- The task does not create ABAP transports. If the target ABAP package requires a transport, you must provide an existing transport or choose a transport creation option during configuration.
- Basic Authentication (user/password) is supported for all back-end systems.
- OAuth2 authentication is additionally supported for ABAP systems on SAP Business Technology Platform.
```

STEP: 2 — Launch the deployment configuration wizard or CLI

DESCRIPTION: Start the generator that creates ui5-deploy.yaml and updates package.json so you can run npm run deploy. You can run from VS Code Command Palette or the project folder CLI.

LANGUAGE: Shell

CODE:
```bash
# From VS Code Command Palette:
# Run "Fiori: Add Deployment Configuration" and choose the target SAP Fiori project.

# From the project folder (CLI):
npx fiori add deploy-config

# After generation, to build with the generated configuration:
ui5 build --config ui5-deploy.yaml

# After package.json is updated, deploy via:
npm run deploy
```

STEP: 3 — Interactive prompts and required fields

DESCRIPTION: When the wizard/CLI runs, provide or choose values for these fields. Use the descriptions to programmatically populate ui5-deploy.yaml or to validate user input.

LANGUAGE: Plaintext

CODE:
```text
Prompts (and expected values):
- Please choose the target:
  -> "ABAP"

- Select Target System:
  -> Choose a saved SAP system or provide a Target system URL (VS Code only).

- Destination (SAP Business Application Studio only):
  -> Choose the deployment destination from the provided list.

- Enter client:
  -> Add a new client or leave default.

- SAPUI5 ABAP Repository:
  -> Add the repository name for the deployed application (app name).

- Deployment Description:
  -> Optional description for the deployed application.

- Package:
  -> Add a valid ABAP package name.

- How do you want to enter Transport Request:
  -> Enter manually: supply transport request manually.
  -> Choose from existing: retrieve applicable transport requests from target system and select one.
  -> Create new: create a new transport automatically; description will be:
     "Created by SAP Fiori tools for ABAP repository <repository name>"
     If creation fails, manual entry is required.
  -> Create during deployment: transport created automatically at first deployment;
     description will be: "Created by SAP Open UX Tools for ABAP repository <repository name>"
     If creation fails, deployment fails.

- Transport Request:
  -> When prompted, choose from the retrieved list or provide a valid transport request manually.
```

STEP: 4 — SSL certificate handling note

DESCRIPTION: If the target system uses an invalid SSL certificate (expired, wrong host, unverified leaf), you can bypass Node.js certificate validation for testing only. Prefer fixing the certificate in production.

LANGUAGE: Shell

CODE:
```bash
# Temporarily ignore SSL certificate validation (NOT recommended for production).
# Unix / macOS:
export NODE_TLS_REJECT_UNAUTHORIZED=0
# Then run:
ui5 build --config ui5-deploy.yaml

# Windows PowerShell:
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
# Then run:
ui5 build --config ui5-deploy.yaml
```

STEP: 5 — Example configuration (ui5-deploy.yaml) — ABAP deployment (basic)

DESCRIPTION: Save this content as ui5-deploy.yaml in the project root. Running ui5 build --config ui5-deploy.yaml will deploy the built dist files to the ABAP system. This example deploys everything under dist except files matching .*\.test.js and internal.md. Authentication reads username/password from environment variables XYZ_USER and XYZ_PASSWORD. Target system is https://XYZ.sap-system.corp:44311 and client 200. App created/updated at /TEST/SAMPLE_APP in package /TEST/UPLOAD under transport XYZQ300582.

LANGUAGE: YAML

CODE:
```yaml
builder:
  customTasks:
  - name: deploy-to-abap
    afterTask: replaceVersion
    configuration:
      target:
        url: https://XYZ.sap-system.corp:44311
        client: 200
        auth: basic
      credentials:
        username: env:XYZ_USER
        password: env:XYZ_PASSWORD
      app:
        name: /TEST/SAMPLE_APP
        package: /TEST/UPLOAD
        transport: XYZQ300582
      exclude:
      - .*\.test.js
      - internal.md
```

STEP: 6 — Example configuration (ui5-deploy.yaml) — Additional params (sap-language)

DESCRIPTION: Add backend-specific params such as sap-language under target.params. Use this template to pass query parameters to the ABAP OData repository service.

LANGUAGE: YAML

CODE:
```yaml
builder:
  customTasks:
  - name: deploy-to-abap
    afterTask: replaceVersion
    configuration:
      target:
        url: https://XYZ.sap-system.corp:44311
        client: 200
        auth: basic
        params: 
          sap-language: en
      credentials:
        username: env:XYZ_USER
        password: env:XYZ_PASSWORD
      app:
        name: /TEST/SAMPLE_APP
        package: /TEST/UPLOAD
        transport: XYZQ300582
      exclude:
      - .*\.test.js
      - internal.md
```
--------------------------------

**TITLE**: Generate Cloud Foundry Deployment Configuration (MTA) for SAP Fiori Projects

**INTRODUCTION**: Step-by-step developer-focused instructions to prepare, generate, and integrate a Cloud Foundry deployment configuration (mta.yaml) for SAP Fiori projects using SAP Fiori tools. Includes prerequisites, required CLI installers/plugins, commands, generator usage (VS Code / command line), build & deploy commands, and result artifact structure.

**TAGS**: sap, cloud-foundry, mta, fiori-tools, deployment, sap-business-application-studio, cf-cli, multiapps

**STEP**: Cloud Foundry Prerequisites - Install MTA tool

**DESCRIPTION**: Install the MTA tool globally (used to validate and build mta.yaml). If installing on macOS or Windows, follow platform-specific notes below.

**LANGUAGE**: bash

**CODE**:
```bash
npm i -g mta
```

**STEP**: macOS Permission Fix for MTA

**DESCRIPTION**: If npm installation fails with permission errors, change ownership of the install directory to the current user.

**LANGUAGE**: bash

**CODE**:
```bash
# If you see: Error: EACCES: permission denied, mkdir bin.
sudo chown -R $(whoami) FOLDER-NAME
```

**STEP**: Windows Note for MTA Builds

**DESCRIPTION**: To build an MTA archive on Windows, ensure GNU Make 4.2.1 is installed. See Cloud MTA Build Tool docs for details.

**LANGUAGE**: text

**CODE**:
```text
# Install GNU Make 4.2.1 (Windows) - see:
# https://sap.github.io/cloud-mta-build-tool/makefile
```

**STEP**: Install Cloud Foundry CLI

**DESCRIPTION**: Install the official CF CLI to access SAP BTP and perform cf login, push, etc. Follow platform-specific installation instructions from Cloud Foundry docs.

**LANGUAGE**: text

**CODE**:
```text
# Download and install CF CLI:
# https://github.com/cloudfoundry/cli#installers-and-compressed-binaries-1
# Installation guidance: https://docs.cloudfoundry.org/cf-cli/install-go-cli.html
```

**STEP**: Windows: Create CF_HOME environment variable

**DESCRIPTION**: On Windows, create CF_HOME as a user variable and grant write permission for the directory to avoid CLI permission issues.

**LANGUAGE**: text

**CODE**:
```text
# Windows GUI steps:
# 1. Open Environment Variables.
# 2. Click New under User Variables.
# 3. Set Variable name: CF_HOME
# 4. Set write permission for the directory.
# 5. Click OK and restart command windows.
```

**STEP**: Install MultiApps Cloud Foundry Plugin

**DESCRIPTION**: Install the MultiApps plugin (multiapps) for MTA operations on Cloud Foundry (deploy/remove/view).

**LANGUAGE**: bash

**CODE**:
```bash
cf install-plugin -r CF-Community "multiapps"
```

**STEP**: Cloud Foundry Login

**DESCRIPTION**: Log into your Cloud Foundry environment (example endpoint). Replace the API endpoint with your target Cloud Foundry API URL.

**LANGUAGE**: bash

**CODE**:
```bash
cf login -a https://api.cf.sap.hana.ondemand.com
```

**STEP**: Generate Deployment Configuration (Wizard or CLI)

**DESCRIPTION**: Launch the deployment configuration generator. You can run from the editor Command Palette (Fiori: Add Deployment Configuration) and select your SAP Fiori project, or run the CLI generator in your project folder:

- VS Code / SAP Business Application Studio: Command Palette -> "Fiori: Add Deployment Configuration" -> choose project
- CLI: run npx in the project root

**LANGUAGE**: bash

**CODE**:
```bash
# From project root:
npx fiori add deploy-config
```

**STEP**: Generator Prompts and Required Entries

**DESCRIPTION**: When prompted by the generator, provide the following minimum inputs:

- Choose Target: select "Cloud Foundry"
- Destination Name: enter the destination name (if empty or incorrect, type the correct destination)

Note: Any instance-based destinations defined in an existing project mta.yaml are displayed with the label "Instance Based Destination". If no mta.yaml exists, the wizard offers to create one.

**LANGUAGE**: text

**CODE**:
```text
# Example prompt responses:
# Choose Target -> Cloud Foundry
# Destination Name -> <your-destination-name>
```

**STEP**: Build and Deploy (after configuration)

**DESCRIPTION**: After the generator creates/updates mta.yaml and adds deployment artifacts, run the build and deployment scripts in the MTA directory containing your application module.

**LANGUAGE**: bash

**CODE**:
```bash
# Build the MTA deployable archive (run in the mta directory)
npm run build

# Deploy the built MTA archive to Cloud Foundry (run in the mta directory)
npm run deploy
```

**STEP**: Resulting Artifacts and Project Structure

**DESCRIPTION**: The generator creates or updates these files in your project. Typical resulting directory structure:

**LANGUAGE**: text

**CODE**:
```text
mta_directory
|_ application_directory
   |_ ...
   |_ webapp
      |_ ...
      |_ manifest.json
   |_ ui5-deploy.yaml
   |_ ui5.yaml
   |_ xs-app.json
...
|_ package.json
|_ mta.yaml
|_ xs-security.json
```

**STEP**: SAP Business Application Studio — Create MTA Workspace (if none exists)

**DESCRIPTION**: If you do not have an MTA workspace in SAP Business Application Studio, create one via the provided template, then add approuter and SAP Fiori app modules to the mta.yaml.

**LANGUAGE**: text

**CODE**:
```text
# In SAP Business Application Studio:
# 1. File > New Project from Template
# 2. Select "Basic Multitarget Application"
# 3. Enter project name and click Finish
#
# Then add app router:
# 1. Right-click mta.yaml > Create MTA Module from Template
# 2. Select "Approuter Configuration", provide details, click Next
#   -> mta.yaml updated with destination-content module
#
# Then add SAP Fiori app:
# 1. Right-click mta.yaml > Create MTA Module from Template
# 2. Choose SAP Fiori application generator and provide details
#   -> Deployment configuration will be enabled and added to mta.yaml by default
```

**STEP**: Notes and References

**DESCRIPTION**: Keep these references for deeper configuration, MTA plugin docs, and SAP Fiori Elements MTA integration.

**LANGUAGE**: text

**CODE**:
```text
# References:
# - MTA tool: https://github.com/SAP/cloud-mta
# - Cloud MTA Build Tool: https://sap.github.io/cloud-mta-build-tool/makefile
# - Cloud Foundry CLI installers: https://github.com/cloudfoundry/cli#installers-and-compressed-binaries-1
# - MultiApps plugin docs: https://plugins.cloudfoundry.org
# - SAP Fiori Elements MTA config: ../Generating-an-Application/SAP-Fiori-Elements/sap-fiori-elements-1488469.md
# - SAP Business Application Studio Managed Approuter result:
#   https://help.sap.com/docs/SAP%20Business%20Application%20Studio/0e2ec06ee34742fd9054fabe09c12d35/cb57602041e04cd3910e6c7bd613b4a9.html
```
--------------------------------

**TITLE**: Add SAP Fiori Launchpad Configuration (manifest.json inbound)

**INTRODUCTION**: Instructions to add the SAP Fiori Launchpad inbound navigation configuration to an application's manifest.json. Use the VS Code command "Fiori: Add Fiori Launchpad Configuration" to run the wizard that updates manifest.json, or use the @sap-ux/create module from the terminal. The configuration creates an inbound entry required for integration with SAP Fiori launchpad tiles/intent-based navigation.

**TAGS**: fiori-tools, fiori, sap, launchpad, manifest.json, inbound, sap-ux

**STEP**: 1 — Run the Fiori wizard in VS Code

**DESCRIPTION**: Open the VS Code Command Palette and run the built-in wizard that creates/updates the inbound entry in your application's manifest.json. The wizard writes the required navigation inbound (semantic object + action) into the manifest.

**LANGUAGE**: Plain text

**CODE**:
```text
Fiori: Add Fiori Launchpad Configuration
```

**STEP**: 2 — Fields required by the wizard (what to provide)

**DESCRIPTION**: Provide the values the wizard asks for. These are used to create the inbound entry in manifest.json and the tile metadata used by SAP Fiori launchpad.

- Semantic Object: name (unique)
- Action: display
- Title: Title of an application
- Subtitle (Optional): Subtitle to be used by the tile

Provide these values when prompted by the wizard. The wizard will update manifest.json with an inbound entry using the semantic object and action (commonly "display").

**LANGUAGE**: JSON

**CODE**:
```json
{
  "sap.app": {
    "crossNavigation": {
      "inbounds": {
        "<semanticObject>-display": {
          "semanticObject": "<semanticObject>",
          "action": "display",
          "title": "Title of an application",
          "subTitle": "Optional subtitle",
          "signature": {
            "parameters": {}
          }
        }
      }
    }
  }
}
```

**STEP**: 3 — Alternative: use @sap-ux/create from the terminal

**DESCRIPTION**: From a terminal you can run the open-ux-tools create module to add Fiori launchpad configuration. This is useful for scripted setups or when not using VS Code. See the package documentation for interactive options and additional parameters.

**LANGUAGE**: Shell

**CODE**:
```bash
# Run the open-ux-tools create package (interactive)
npx @sap-ux/create
# Follow prompts to add SAP Fiori launchpad configuration (inbound)
```

**STEP**: 4 — Where the configuration is written

**DESCRIPTION**: The wizard or create module updates your application's manifest.json (the app descriptor) with the inbound entry under sap.app.crossNavigation.inbounds. Ensure you commit the changed manifest.json to your project so the launchpad can discover the inbound navigation entry when deploying.
--------------------------------

**TITLE**: Security (fiori-tools)

**INTRODUCTION**: Brief guidance for developers using fiori-tools: when deploying a SAPUI5/Fiori application, consult the SAPUI5 "Securing Apps" documentation for required security scans and deployment recommendations. Use this reference during CI/CD, release, and deployment stages to ensure applications meet security standards.

**TAGS**: fiori-tools, security, SAPUI5, deployment, scans, guidance

**STEP**: 1 — Reference official Securing Apps documentation before deployment

**DESCRIPTION**: When preparing a Fiori/SAPUI5 app for deployment, review the official "Securing Apps" documentation to learn about required security scans and recommended security practices. Add the documentation link to your deployment checklist, CI/CD pipeline documentation, or automated release tasks so teams always run the correct security checks prior to production deployment.

**LANGUAGE**: Markdown

**CODE**:
```markdown
<!-- loio8a147c6dd06b42a7a0fd8cb0bb824028 -->

# Security

When deploying to a system, see the [Securing Apps](https://ui5.sap.com/sdk/#/topic/91f3d8706f4d1014b6dd926db0e91070) section for additional information about security scans of SAPUI5 applications.
```
--------------------------------

**TITLE**: Undeploy an Application (ABAP and Cloud Foundry)

**INTRODUCTION**: This guide shows exact commands and configuration details to undeploy SAP Fiori applications from ABAP systems and from Cloud Foundry (CF) on SAP Business Technology Platform. Use the provided commands from within a project or from outside a project (VS Code or SAP Business Application Studio). Keep ui5-deploy.yaml for ABAP target values.

**TAGS**: fiori-tools, undeploy, ABAP, Cloud Foundry, cf, @sap/ux-ui5-tooling, ui5-deploy.yaml

**STEP**: Undeploy from ABAP (from within the project)

**DESCRIPTION**: Run the undeploy script defined in your project's package.json. Confirm the undeployment when prompted. This assumes the project contains an undeploy npm script that invokes the fiori undeploy command with your ui5-deploy.yaml configuration.

**LANGUAGE**: Shell

**CODE**:
```bash
npm run undeploy
```

**STEP**: Ensure package.json has undeploy script (update if missing)

**DESCRIPTION**: If package.json does not include an undeploy script, add it so npm run undeploy calls the UI5 tooling undeploy command using ui5-deploy.yaml.

- Edit your project's package.json and add the "undeploy" script under "scripts".

**LANGUAGE**: JSON

**CODE**:
```json
"undeploy": "fiori undeploy --config ui5-deploy.yaml"
```

**STEP**: Undeploy from ABAP (from outside a specific project — VS Code)

**DESCRIPTION**: Run this command from any folder (no project config file required). Replace placeholders with values from your ui5-deploy.yaml (Target_ABAP_system_url, Application_name, Transport_request, Client_number). Include --noConfig to skip reading local config files.

**LANGUAGE**: Shell

**CODE**:
```bash
npx @sap/ux-ui5-tooling fiori undeploy --url <Target_ABAP_system_url> --name <Application_name> --transport <Transport_request> --client <Client_number> --noConfig
```

**STEP**: Undeploy from ABAP (from outside a specific project — SAP Business Application Studio)

**DESCRIPTION**: Use the destination configured in SAP Business Application Studio instead of a direct URL. Replace placeholders with values from your ui5-deploy.yaml. Use --noConfig to skip local project config.

**LANGUAGE**: Shell

**CODE**:
```bash
npx @sap/ux-ui5-tooling fiori undeploy --destination <Destination_name> --name <Application_name> --transport <Transport_request> --client <Client_number> --noConfig
```

**STEP**: Locate ABAP undeploy values

**DESCRIPTION**: To find the correct values for URL, destination, application name, transport request, and client number, open and read the ui5-deploy.yaml file in your application/project root. Use those values to replace command placeholders.

**LANGUAGE**: YAML

**CODE**:
```yaml
# Example: ui5-deploy.yaml (open your project's file to read actual values)
# destination: my_abap_destination
# name: my.application.id
# transport: ABCD123456
# client: 100
```

**STEP**: Undeploy from Cloud Foundry — authenticate

**DESCRIPTION**: Authenticate with Cloud Foundry API endpoint before undeploy. Use your CF API endpoint if required (example: https://api.cf.sap.hana.ondemand.com). Follow your organization and space selection prompts during login.

**LANGUAGE**: Shell

**CODE**:
```bash
cf login -a
```

**STEP**: Undeploy from Cloud Foundry — remove application and services

**DESCRIPTION**: Undeploy a multi-target application (MTA) by its mta-id. Use flags to delete bound services and service keys along with the application. Replace <mta-id> with your application's MTA ID.

**LANGUAGE**: Shell

**CODE**:
```bash
cf undeploy <mta-id> --delete-services --delete-service-keys
```
--------------------------------

**TITLE**: Form Actions — Add, Move, Group, and Maintain in SAP Fiori Page Editor

**INTRODUCTION**: Practical, action-oriented instructions for managing form actions in SAP Fiori Page Editor. Covers adding, deleting, moving, and grouping actions (annotation-based or manifest-based) and lists constraints and tips developers must follow when implementing UI.DataFieldForAction, UI.DataFieldForIntentBasedNavigation, and UI.DataFieldForActionGroup actions.

**TAGS**: fiori-tools, UI.DataFieldForAction, UI.DataFieldForIntentBasedNavigation, UI.DataFieldForActionGroup, actions, form, annotations, page-editor, manifest

**STEP**: Add, delete, and maintain form/header actions
**DESCRIPTION**: Use the Page Editor to add, remove, or modify header and form actions. Form actions based on UI.DataFieldForAction execute inside the current application. Actions based on UI.DataFieldForIntentBasedNavigation trigger external navigation (launchpad target). Use the same workflows as Table Actions when working with header actions.
**LANGUAGE**: Instructions
**CODE**:
```Instructions
1. Open Page Editor for the target Fiori page.
2. To add an action:
   - Select the form section (or page header) where the action should appear.
   - Choose Add > Action.
   - For internal actions select "Annotation: UI.DataFieldForAction".
   - For external navigation select "Annotation: UI.DataFieldForIntentBasedNavigation".
   - Configure Label, Action name / SemanticObject & Action (for intent navigation), and other annotation properties.
3. To delete or edit an action:
   - Select the action in the editor and choose Edit or Delete.
4. For header actions follow the same steps as described in Table Actions procedures.
```

**STEP**: Move actions between form sections, header, and footer
**DESCRIPTION**: You can relocate actions to other form sections or to the page header/footer if the destination is based on the same main entity type. External navigation actions (UI.DataFieldForIntentBasedNavigation) can be moved to the page header. Internal actions (UI.DataFieldForAction) can be moved to header and footer, provided the target section is based on the same entity as the source form section.
**LANGUAGE**: Instructions
**CODE**:
```Instructions
1. Confirm both source and target sections are based on the same main entity.
2. In Page Editor select the action to move.
3. Drag-and-drop the action to the target form section, header, or footer OR use Move > Select target section.
4. Validate:
   - UI.DataFieldForIntentBasedNavigation (external) -> allowed to move to page header.
   - UI.DataFieldForAction (internal) -> allowed to move to page header and footer.
5. If entity mismatch occurs, relocate the action only to sections sharing the same main entity.
```

**STEP**: Group annotation-based actions into action menus (UI.DataFieldForActionGroup)
**DESCRIPTION**: Create action menus that contain one or more annotation-based actions. You can add actions to an existing action menu or move eligible actions into a menu. Note that actions with criticality cannot be placed inside action menus because criticality is not supported for menu actions.
**LANGUAGE**: Instructions
**CODE**:
```Instructions
1. In Page Editor select the form section or header where you want an action menu.
2. Choose Add > Action Menu (Annotation: UI.DataFieldForActionGroup).
3. Inside the action menu, add children actions:
   - Add > Action -> select Annotation: UI.DataFieldForAction (one or more).
4. To move an existing annotation action into a menu:
   - Select the action -> Move -> target: Action Menu.
5. Validation rules:
   - Do NOT move actions that define criticality into action menus (unsupported).
```

**STEP**: Manifest-based actions restriction
**DESCRIPTION**: Manifest-based actions are configured in the app manifest and cannot be grouped into action menus using the Page Editor UI. They remain standalone and must be edited directly in the manifest (or in code) if grouping is required by custom development.
**LANGUAGE**: Instructions
**CODE**:
```Instructions
1. If action is defined in manifest.json (manifest-based), do NOT attempt to group it via Page Editor.
2. To change grouping for manifest-based actions, edit manifest.json or implement grouping in code (custom control/extension).
3. Recommended check: Search for actions in manifest.json under sap.ui5 or component settings before trying to group in Page Editor.
```

**STEP**: Property relevance tip for form actions
**DESCRIPTION**: Properties that apply only to table action columns (for example Importance and Requires Context) are not relevant for form actions. Do not set or depend on these properties for form-based action behavior.
**LANGUAGE**: Instructions
**CODE**:
```Instructions
1. When configuring form actions (annotation-based or manifest-based) ignore:
   - Importance (table-column-specific)
   - Requires Context (table-column-specific)
2. Use form/action-specific properties such as Label, Action, SemanticObject/Action (for intents), and Criticality (only for non-menu actions).
```
--------------------------------

**TITLE**: Analytical Chart (List Report - Page Editor)

**INTRODUCTION**: Configure an Analytical Chart on a List Report page (OData V4 flavor of Analytical List Page) to display aggregated/grouped data above or instead of the list table. Use this guide to perform required checks, add/delete the chart, and manage chart properties (measures, dimensions, presentation/sort).

**TAGS**: fiori-tools, analytical-chart, list-report, UI.Chart, OData, aggregation, SAPUI5

**STEP**: Prerequisites

**DESCRIPTION**: Verify the List Report is eligible for an Analytical Chart before attempting to add it.
- Ensure the List Report does NOT use Multiple Views (delete all views except the single table based on the main entity to enable chart).
- Ensure the main entity contains aggregable and groupable properties (annotations required).
- If Add Chart is disabled, hover the button for tooltip hints explaining missing annotations or Multiple Views usage.
- Required files referenced by the editor (icons/CSS/images) must be accessible.

**LANGUAGE**: text

**CODE**:
```text
Prerequisites:
- No Multiple Views in List Report (see multiple-views-c62b82e.md)
- Main entity must contain:
  - aggregable properties
  - groupable properties

Resources referenced:
- images/Fiori_tools_List_Report_Analytical_Chart_not_enabled_48ed87b.png
- images/Fiori_Tools_Chart_Properties_c4705fa.png
- ../css/sap-icons.css
```

**STEP**: Add sap-icons stylesheet (page header)

**DESCRIPTION**: Ensure the page includes the SAP icons stylesheet referenced by the Page Editor and UI controls.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**STEP**: Adding Analytical Chart (quick actions)

**DESCRIPTION**: Add an Analytical Chart via the Page Editor and supply the minimal inputs. The editor generates annotation + manifest changes automatically.
Actions:
1. Click "Add Chart" in the Page Editor header.
2. Provide required fields:
   - Chart Type (choose from supported chart types)
   - Dimension (choose a groupable property)
   - Measure (choose an existing measure or create a new one)
     - Use existing measure: choose a measure defined with custom or transformation aggregations
     - Create new measure: select an aggregable property and an aggregation method (generates a dynamic measure)
   - Generated technical name and label can be edited later in Properties pane
3. Click "Add" to generate the UI.Chart annotation and manifest changes; chart appears above the table.

**LANGUAGE**: text

**CODE**:
```text
Add Chart steps:
- Click: Add Chart
- Required: chart type, one dimension (groupable), one measure (existing or new)
- Measure options:
  - Use existing measure (custom or transformation aggregation)
  - Create new measure (select aggregable property + aggregation method)
- Click: Add
Notes:
- Generated artifacts: UI.Chart annotation + manifest changes
- If using transformation aggregations: require SAPUI5 >= 1.106 for @Analytics.AggregatedProperty support
- Deprecated: @Analytics.AggregatedProperties (use @Analytics.AggregatedProperty instead)
Reference: https://sap.github.io/odata-vocabularies/vocabularies/Analytics.html
```

**STEP**: Deleting Analytical Chart

**DESCRIPTION**: Remove the chart and revert the page to a standard List Report.
Actions:
- In the outline/layout, select the chart layout node and click the Delete (wastebasket) icon. This removes the chart and reverts layout.

**LANGUAGE**: text

**CODE**:
```text
Delete Chart:
- Action: Select chart node → Click: 🗑️ (Delete)
- Result: UI.Chart annotation removed from manifest/annotation references; floorplan reverts to single table List Report
```

**STEP**: Maintain Analytical Chart Properties (overview)

**DESCRIPTION**: After chart generation, open the chart node in the Outline and use the Properties pane to edit/extend properties: Chart Type, Title, Measures, Dimensions, Presentation Variant (sorting). Only minimal properties are generated initially—use the Properties pane to add more.

**LANGUAGE**: text

**CODE**:
```text
Properties to manage:
- Chart Type
- Title (translatable, see i18n)
- Measures (custom and transformation-based supported)
- Dimensions (groupable properties)
- Presentation Variant (UI.SelectionPresentationVariant or UI.PresentationVariant)
```

**STEP**: Measures — Add / Modify / Delete / Label / Order (detailed)

**DESCRIPTION**: Manage chart measures (aggregated values). Key constraints and actions:
- At least one default measure is required (displayed on app start or as defined by variant management).
- Mixing sequence of custom and transformation-based default measures is not allowed in UI.Chart.
- Add Measure: Generate a dynamic measure by selecting an aggregable property + aggregation method (Add New Measure → Apply).
- Modify Measure: Set a different measure as Default; deactivate Default on current.
- Define Measure Label: Label comes from Common.Label or @title (CAP CDS). If missing, set Label in Measure row. Removing label text does not delete underlying annotations.
- Add & Move Measures: Add additional measures if additional aggregable properties exist. Reorder default measures via drag/drop or Move Up / Move Down icons.
- Delete Measures: You may delete transformation-based measures defined for the current app as long as at least one default measure remains.

**LANGUAGE**: text

**CODE**:
```text
Measure annotations and rules:
- @Aggregation.CustomAggregate (service must expose properties aggregated with this for custom aggregations)
- Transformation aggregation requirement:
  - Use: @Analytics.AggregatedProperty (supported)
  - Deprecated: @Analytics.AggregatedProperties (do not use)
- SAPUI5 requirement for transformation aggregation: version >= 1.106
- UI annotation: UI.Chart defines measures collection
Label sources:
- Common.Label
- CAP CDS: @title
UI constraints:
- At least one Default measure required
- Cannot mix order of custom and transformation default measures in UI.Chart
```

**STEP**: Dimensions — Add / Modify / Label / Order / Text Arrangement

**DESCRIPTION**: Manage chart dimensions (grouping categories). Key actions and constraints:
- Each chart requires at least one default dimension.
- Default dimension(s) determine initial categorization unless variant management defines otherwise.
- Modify Dimension: Choose a different groupable property in Property dropdown; toggle Default per dimension row header.
- Define Dimension Label: Label comes from Common.Label or @title; edit in Dimension row label input if missing. Removing label text does not remove underlying annotations.
- Text & Text Arrangement: Set Text and Text Arrangement per Dimension (text values must come from same entity as the dimension).
- Reorder default dimensions via drag/drop or Move Up / Move Down.

**LANGUAGE**: text

**CODE**:
```text
Dimension annotations and rules:
- Dimension property must be groupable on the entity
- Text/Arrangement: set Text and Text Arrangement in the Dimension table
- Text values must originate from the same entity as the dimension
References:
- Appendix: appendix-457f2e9.md#loio5d1cc16e80ce48de8a47f2835a42cc47
Label sources:
- Common.Label
- CAP CDS: @title
```

**STEP**: Presentation Variant and Sort Order (generate/reuse/remove)

**DESCRIPTION**: Control sorting of chart data using Presentation Variants. Options:
- Set Presentation Variant property to:
  - New — create UI.SelectionPresentationVariant or UI.PresentationVariant for the chart
  - From Table — reuse the table's Presentation Variant (sort applies to both chart and table)
  - None — remove Presentation Variant (then UI.Chart referenced directly in manifest and sorting is not applied)
- Sort Order: When a Presentation Variant exists, add one or more Sort Properties (choose direct properties of the chart entity and sort direction). Reorder sort properties via drag/drop or Move Up / Move Down.
- Removing Presentation Variant deletes corresponding annotation from the manifest; run cleanup to remove unreferenced annotation file entries.

**LANGUAGE**: text

**CODE**:
```text
Presentation Variant options:
- UI.SelectionPresentationVariant
- UI.PresentationVariant
- Set via Chart Properties: New | From Table | None

Sort Order actions:
- Add Sort Property: choose direct property + direction
- Reorder via drag/drop or Move Up / Move Down
- Remove Presentation Variant: deletes UI.SelectionPresentationVariant or UI.PresentationVariant from manifest

Cleanup:
- Run cleanup procedure to delete unreferenced selection/presentation variant annotations from annotation files
```

**STEP**: Notes & Links (technical references)

**DESCRIPTION**: Preserve important technical notes and external references for implementation and compatibility.

**LANGUAGE**: text

**CODE**:
```text
Important notes:
- Transformation aggregation with @Analytics.AggregatedProperty supported on SAPUI5 >= 1.106
- @Analytics.AggregatedProperties is deprecated in favor of @Analytics.AggregatedProperty
- Custom aggregation requires service properties annotated with @Aggregation.CustomAggregate
- Changing measure/dimension labels has global effect unless overridden

Links:
- OData Analytics vocabularies: https://sap.github.io/odata-vocabularies/vocabularies/Analytics.html
- Internationalization (i18n): internationalization-i18n-eb427f2.md
- Multiple Views: multiple-views-c62b82e.md
- Appendix: appendix-457f2e9.md#loio5d1cc16e80ce48de8a47f2835a42cc47

Image resources:
- images/Fiori_tools_List_Report_Analytical_Chart_not_enabled_48ed87b.png
- images/Fiori_Tools_Chart_Properties_c4705fa.png
```
--------------------------------

**TITLE**: Annotation Support

**INTRODUCTION**: Describes how the Fiori Tools Page Editor locates and writes annotation changes for CAP and non-CAP projects. Use this to determine which annotation file will be modified, where new annotation files are created, and how overrides across layers/apps are handled.

**TAGS**: fiori-tools, annotations, CAP, non-CAP, CDS, manifest.json, page-editor, webapp

**STEP**: CAP Project — Determine and modify top-level .cds annotation file

**DESCRIPTION**: Page Editor writes all generated changes to a single top-level local .cds annotation file in the application folder. Identify or create the top-level file and apply overrides according to layering rules.

- Locate the top-level .cds file:
  - Search the application directory for a .cds file that is not registered in index.cds or service.cds.
  - If none found, create annotations.cds in the application folder with a using directive pointing to the service.
  - If index.cds does not exist, create it and update it with a using directive pointing to the newly created annotations.cds.
  - If multiple candidate files are found, determine top-level based on using directives. If multiple files are at the same top level, use the first found file.

- Special handling when annotation to modify is defined elsewhere:
  - If defined in the base layer (lower file set), override it in the top-level file.
    - Note: Some property values (e.g., measures and currencies) cannot be overridden if defined in the base layer.
  - If defined in a different .cds file of the same app at the same hierarchy level: override in the top-level file and add a using directive to the overridden file to establish layering.
  - If defined in a .cds file of a different app: cannot override from the current app. Open Page Editor for the original app to modify. Use the Page Editor tooltip to check the original app name.

**LANGUAGE**: CDS

**CODE**:
```cds
# Typical filenames referenced by Page Editor:
index.cds
service.cds
annotations.cds
```

**LANGUAGE**: bash

**CODE**:
```bash
# Command to open the Annotation File Manager (use in VS Code):
Fiori: Open Annotation File Manager
```

**STEP**: Non-CAP Project — Determine and modify top-level local annotation file

**DESCRIPTION**: Page Editor modifies the local annotation file at the top of the annotation source hierarchy (highest precedence). It never edits lower-level sources (service metadata or bottom-level local files). If a change requires editing an annotation present in a lower layer, Page Editor copies that annotation into the top-most local annotation file and edits it there, overriding the lower-layer annotation.

- Determine the top of the annotation source hierarchy:
  - The top is determined by the last entry in the manifest.json <datasources => annotations file>.
  - The last entry has the highest precedence.

- Creation and registration behavior:
  - If the local annotation file does not exist, it is automatically created when the first annotation change is made.
  - The new file is placed under webapp/annotations and is registered in manifest.json.

- Manage hierarchy and visibility:
  - View and change annotation file hierarchy in the Annotation File Manager.
  - Use the command "Fiori: Open Annotation File Manager" to open it.

**LANGUAGE**: JSON

**CODE**:
```json
# The manifest.json entry used to determine precedence:
<datasources => annotations file>
```

**LANGUAGE**: text

**CODE**:
```text
# Filesystem location for created annotation files in non-CAP projects:
webapp/annotations/<new-annotation-file>.xml or .json (as appropriate)
```
--------------------------------

**TITLE**: Appendix — Fiori Tools: Field/Column/Chart Annotation & Page Editor Actions

**INTRODUCTION**: Action-oriented reference for implementing SAP Fiori annotations and Page Editor configurations. Use these steps to apply annotations or configure properties (criticality, value help, text arrangement, measures, images, tooltips, hiding logic, micro charts, etc.) in CDS/service annotations or via the Page Editor. All technical details, file paths, and original code examples are preserved.

**TAGS**: fiori-tools, annotations, CDS, UI, ValueHelp, Criticality, TextArrangement, Measures, ImageURL, Tooltip

**STEP**: Contact & Contact-related properties (Contact, Job Title, Photo, Role, Department, Address, Phone, Email)

**DESCRIPTION**: Use the Communication.Contact model properties to populate contact columns/fields. If you must base a Contact column on a different property, delete it in Page Editor and add a new contact column. Address, Phone, Email are collection properties with specific record types and table row fields — map UI columns to the corresponding properties listed below.

- Contact -> Communication.Contact.fn (Contact Name) — cannot be changed in Property Panel.
- Job Title -> Communication.Contact.title
- Photo -> Communication.Contact.photo
- Role -> Communication.Contact.role
- Department -> Communication.Contact.department
- Address -> Communication.Contact.adr (record type Communication.AddressType)
  - Street -> Communication.AddressType.street
  - City -> Communication.AddressType.locality
  - State/Province -> Communication.AddressType.region
  - Postal Code -> Communication.AddressType.code
  - Country -> Communication.AddressType.country
- Phone -> Communication.Contact.tel (record type Communication.PhoneNumberType)
  - Phone -> Communication.PhoneNumberType.uri
  - Type -> Communication.PhoneNumberType.type enums: work, cell, fax mapped to Work, Mobile, Fax
- Email -> Communication.Contact.email (record type Communication.EmailAddressType)
  - Email -> Communication.EmailAddressType.email

**LANGUAGE**: TEXT

**CODE**:
```text
# Contact mapping (informational)
Contact: Communication.Contact.fn
JobTitle: Communication.Contact.title
Photo: Communication.Contact.photo
Role: Communication.Contact.role
Department: Communication.Contact.department
Address: Communication.Contact.adr -> AddressType { street, locality, region, code, country }
Phone: Communication.Contact.tel -> PhoneNumberType { uri, type (work/cell/fax) }
Email: Communication.Contact.email -> EmailAddressType { email }
```

**STEP**: Criticality — Basic Fields/Columns

**DESCRIPTION**: To show semantic coloring (and optionally an icon) for a field/column, select the UI property that contains criticality and set it in the Page Editor Properties -> Criticality. This adds the Criticality property to the UI.DataField record and enables semantic coloring. Optionally override default icon behavior via Criticality Representation.

- Procedure:
  1. Select the table column or field in the outline.
  2. In Properties pane, set the Criticality property to the service property representing status criticality.

**LANGUAGE**: TEXT

**CODE**:
```text
# Result: UI.DataField record will include:
Criticality: <serviceProperty>
# Optional: set Criticality Representation to With Icon or Without Icon
```

**STEP**: Criticality — Micro Charts, Progress Indicators & Criticality Source

**DESCRIPTION**: For micro charts (comparison, harvey, stacked bar) and progress indicators, select Criticality property or set Criticality Source to Calculation.

- If Criticality Source = Property:
  - Choose Criticality Value property (service-side criticality computation).
- If Criticality Source = Calculation:
  - Define Improvement Direction and deviation/tolerance ranges (see Improvement Direction step).

**LANGUAGE**: TEXT

**CODE**:
```text
# Example settings (conceptual)
CriticalitySource: Property | Calculation
CriticalityValue: <serviceProperty>   # used when CriticalitySource = Property
```

**STEP**: Criticality Representation

**DESCRIPTION**: Controls whether the icon is shown in addition to semantic color.

- Options:
  - None (use SAP Fiori elements default)
  - With Icon (force icon + color)
  - Without Icon (force color only)
- Effect: Adds CriticalityRepresentation property to UI.DataField record and overrides default representation.

**LANGUAGE**: TEXT

**CODE**:
```text
# UI.DataField:
CriticalityRepresentation: #WithIcon | #WithoutIcon | #None
```

**STEP**: Improvement Direction (for Calculation-based Criticality)

**DESCRIPTION**: Required when Criticality Source = Calculation for area, bullet, radial, column micro charts. Choose improvement direction to determine which deviation/tolerance values are required.

- Minimize -> requires DeviationHighValue and ToleranceHighValue
- Maximize -> requires DeviationLowValue and ToleranceLowValue
- Target (not for radial) -> requires DeviationLowValue, ToleranceLowValue, DeviationHighValue, ToleranceHighValue

**LANGUAGE**: TEXT

**CODE**:
```text
# Example:
ImprovementDirection: #Minimize | #Maximize | #Target
DeviationHighValue: <number|property>
ToleranceHighValue: <number|property>
DeviationLowValue: <number|property>
ToleranceLowValue: <number|property>
```

**STEP**: Description, Dimension, Display as Image

**DESCRIPTION**:
- Description: For header section types (progress, micro charts) set Description in Page Editor -> Properties -> Description. Strings can be prepared for translation (see internationalization-i18n-eb427f2.md).
- Dimension: Required for area, line, and column micro charts. Choose dimension property for the x-axis.
- Display as Image: For string properties containing image URLs, toggle Display as Image to render URL as image at runtime. This applies @UI.IsImageURL: true to the property. If the property is annotated in a lower layer with @UI.IsImageURL or @Core.MediaType/@Core.IsURL, setting is read-only.

**LANGUAGE**: CDS

**CODE**:
```c
# Example: annotate a property as an image URL
myImageProp : String @UI.IsImageURL: true;
# Note: If @UI.IsImageURL is defined in the service or lower layer, Page Editor cannot change it.
```

**STEP**: Display Type, Restrictions, Hidden, Hide by Property

**DESCRIPTION**:
- Display Type: Controls edit/create representation (Value Help, TextArea, value help options depend on metadata).
- Restrictions: Configure field as mandatory, optional, or read-only.
- Hidden: Toggle Hidden to hide columns/fields. Use Hide by Property to choose a boolean property as hide condition; when true -> element hidden.
- Hide by Property: Choose boolean property from dropdown. Impact depends on UI element. See SAP UI.Hidden annotation docs.

**LANGUAGE**: TEXT

**CODE**:
```text
# Example:
UI.Hidden: <true|false|property>
# Hide by Property -> select boolean service property: e.g. isHidden (Edm.Boolean)
```

**STEP**: Importance (mobile rendering) & Label (sections/fields/columns/actions)

**DESCRIPTION**:
- Importance: Set High/Medium/Low to control field visibility on small screens (High -> phone, High/Medium -> tablet).
- Label: Change section labels in Page Editor -> Properties -> Label. Label is assigned to ReferenceFacet.Label in Facet annotation and is translatable via i18n.
- Fields/Columns/Actions: Labels can come from Common.Label / @title annotations or be generated on DataField records. Deletion removes the DataField record’s label; underlying property annotations are not removed automatically.

**LANGUAGE**: TEXT

**CODE**:
```text
# Example concept:
ReferenceFacet.Label : "My Section Label"    # translatable via i18n
DataField.Label : "Column Label"
Common.Label / @title on property -> used if present
```

**STEP**: Maximum/Minimum Value and Types (bullet & harvey micro charts)

**DESCRIPTION**:
- Maximum/Minimum Value Type: Choose expression type (constant number or numeric property). This sets the source for Maximum/Minimum Value.
- Maximum Value: Required for bullet and harvey micro charts; scale uses min (default 0) and chosen max.
- Minimum Value: Choose decimal number for starting value.

**LANGUAGE**: TEXT

**CODE**:
```text
# Example:
MaximumValueType: "Number" | "Property"
MaximumValue: 100.0 | <numericProperty>
MinimumValueType: "Number" | "Property"
MinimumValue: 0.0 | <numericProperty>
```

**STEP**: Measures & Currencies (Measures.ISOCurrency)

**DESCRIPTION**: To display a value with currency or measure unit (e.g., price + currency, weight + unit):

1. Select the field/column in outline.
2. Properties pane -> Measures and Currencies -> choose Currency Unit or Measure Unit.
3. In popup choose Path (property from associated entity) or String (literal unit text), then Apply.
4. Page Editor applies Measures.ISOCurrency annotation referencing chosen property/string. Change Type/Unit or set to None to remove.

**LANGUAGE**: TEXT

**CODE**:
```text
# Resulting annotation mapping:
@Measures.ISOCurrency: <propertyPath | 'USD' | 'kg'>
# Example (conceptual):
price             : Decimal;
price@Measures.ISOCurrency : 'USD' | currencyProperty;
```

**STEP**: Forecast Value, Target, Target Type, Target Value

**DESCRIPTION**:
- Forecast Value: Optional for bullet micro charts. Choose a numeric service property for forecast display.
- Target Type: For progress sections/columns, choose expression type for goal (constant or property).
- Target Value: Required for radial micro charts, optional for area/bullet. Choose numeric property for target.

**LANGUAGE**: TEXT

**CODE**:
```text
# Example:
ForecastValue: <numericProperty>
TargetType: "Number" | "Property"
TargetValue: <numericProperty> | 100.0
```

**STEP**: Text & Text Arrangement (field + Value Help synchronization) — includes original CDS annotation examples

**DESCRIPTION**: To display IDs/codes with descriptive text, set Text to a descriptive service property. This applies Common.Text annotation. When Text is set, UI.TextArrangement appears. Use None to defer to SAP Fiori elements defaults unless UI.TextArrangement is already defined in lower layers.

- Text Arrangement options:
  - TextFirst, TextLast, TextOnly, IDOnly, None.
- Synchronize field Text and Value Help Value Description Property with the Page Editor Take Over button.

- Original code examples (as generated by Page Editor) — preserve exact examples:

**LANGUAGE**: CDS

**CODE**:
```c
entity CapexType : managed {
    key type            : String;
        typedescription : String;
}

```

**LANGUAGE**: CDS

**CODE**:
```c
entity CapexBase : managed {
        type : Association to CapexType;
}

```

**LANGUAGE**: CDS

**CODE**:
```c
annotate service.Capex with {
    type @(
        Common.Text : type.typedescription,
        Common.Text.@UI.TextArrangement : #TextOnly,
    )
};
```

**LANGUAGE**: CDS

**CODE**:
```c
annotate service.CapexType with {
    type @(
        Common.Text : typedescription,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};
```

**STEP**: Text Arrangement Behavior Notes & Take Over button

**DESCRIPTION**:
- If Common.Text or UI.TextArrangement exists in a lower layer, Page Editor won’t offer None.
- The Take Over button synchronizes Text/Value Description Property and Text Arrangement between a field and its Value Help source.
- Result: Common.Text annotations on both field and value help source property point to the same property and UI.TextArrangement has identical enum value.

**LANGUAGE**: TEXT

**CODE**:
```text
# Resulting annotations after synchronization:
Common.Text -> <typedescription property>
UI.TextArrangement -> #TextOnly | #TextFirst | #TextLast | #IDOnly
```

**STEP**: Tooltip & Tooltip Source

**DESCRIPTION**: Configure tooltips for supported header/column types (progress/rating columns/sections, data point headers). Tooltip source can be a String (fixed translatable text) or Property (string service property).

- Procedure:
  1. Select header section or column supporting tooltip.
  2. In Properties pane, set Tooltip Source: String or Property.
  3. Enter text or pick service property.

**LANGUAGE**: TEXT

**CODE**:
```text
# Example:
TooltipSource: "String" | "Property"
Tooltip: "Fixed translatable text" | <serviceStringProperty>
# Note: Strings can be prepared for translation (see internationalization-i18n-eb427f2.md)
```

**STEP**: Semantic Object Name & Semantic Object Property Mapping

**DESCRIPTION**:
- Semantic Object Name: Set when field/column should navigate to other applications via Launchpad inbound navigation (configured in target manifest.json).
- Semantic Object Property Mapping: When Semantic Object Name is defined, map source property name to target application semantic object property if names differ.

**LANGUAGE**: TEXT

**CODE**:
```text
# Example:
SemanticObject: "PurchaseOrder"
SemanticObjectMapping: { sourcePropertyName -> targetSemanticPropertyName }
```

**STEP**: Value Help — configuration and generated annotations

**DESCRIPTION**: To configure Value Help for fields/columns/filter fields:

- Requirements: service must expose the entity set representing list of eligible values.
- Page Editor -> set Display Type = Value Help -> Define Value Help Properties:
  - Label
  - Value Source Entity (entity set)
  - Value Source Property (input value)
  - External ID (human-readable identifier)
  - Value Description Property (display text)
  - Text Arrangement
  - Display as Dropdown (combo vs dialog)
  - Result List (add columns, set dependencies In/Out/InOut/None)
  - Sort Order (Add Sort Property)

- On Apply, Page Editor generates/updates application-layer annotations:
  - UI.MultiLineText
  - Common.ValueList
  - Common.ValueListWithFixedValues
  - Common.Text
  - UI.PresentationVariant (auto-generated qualifier, referenced by PresentationVariantQualifier)

- Notes:
  - Several value help variants may exist; Page Editor only reads/updates the default one.
  - Value help variants in @Common.ValueListRelevantQualifiers are not supported.

**LANGUAGE**: TEXT

**CODE**:
```text
# Required service example for CapexType value help:
entity CapexType : managed {
    key type            : String;
        typedescription : String;
}
# For fields that are associations, Page Editor auto-suggests associated entity as Value Source Entity:
entity CapexBase : managed {
        type : Association to CapexType;
}
# Generated annotations mapping include:
# UI.MultiLineText, Common.ValueList, Common.ValueListWithFixedValues, Common.Text, UI.PresentationVariant (with qualifier)
```

**STEP**: Additional notes & resources

**DESCRIPTION**: Keep these references for further action in Page Editor and translation:

- Internationalization file: internationalization-i18n-eb427f2.md
- Hiding features / UI.Hidden annotation: https://sapui5.hana.ondemand.com/#/topic/ca00ee45fe344a73998f482cb2e669bb
- Images referenced by Page Editor are located relative to the doc: images/*. Use as needed:
  - images/Criticallity_ac93cba.png
  - images/Measure_and_Currencies_3bd7c70.png
  - images/Value_help_screenshot_adf0b9c.png
  - images/example_d6376cf.jpg
  - images/Filter_Field_properties_a32bce5.jpg
  - images/Value_Help_properties_cf241c6.jpg
  - images/example_1_0556254.jpg
  - images/Filter_Field_Properties_Example_2_5778877.jpg
  - images/Value_Help_Properties_Example_2_dbcc00a.jpg
  - images/Take_Over_Button_6452fbf.jpg

**LANGUAGE**: TEXT

**CODE**:
```text
# References:
- internationalization-i18n-eb427f2.md
- project-cleanup-2640899.md
- Value Help images & screenshots under images/ (see list above)
```
--------------------------------

**TITLE**: Automatic Generation of UI Annotations for Fiori Tools

**INTRODUCTION**: Describes how the Fiori generator can automatically add UI annotation terms (UI.LineItem, UI.FieldGroup, UI.Facets) for the main entity when you choose the automatic option during entity selection. Includes generation rules, exclusion rules, and example annotation snippets (OData XML and CDS) that code generators should produce and where to add them.

**TAGS**: fiori-tools, annotations, UI.LineItem, UI.FieldGroup, UI.Facets, OData, CDS, code-generation

**STEP**: 1 - Enable automatic generation

**DESCRIPTION**: Select the "Yes" option during the entity selection step of the application generator to enable automatic generation of UI annotations for the main entity. The generator will write a local annotation file (local annotations) only when the following annotation terms are not already defined on the main entity to avoid overriding existing annotations.

**LANGUAGE**: N/A

**CODE**:
```text
Action: During the generator's "Entity Selection" step choose: Yes
Result: Generator will create local annotations if UI.FieldGroup, UI.Facets, and UI.LineItem are not already present.
```

**STEP**: 2 - Generation rules and exclusions

**DESCRIPTION**: The generator applies this logic when writing annotations for the selected main entity:
- Generate UI.LineItem for the List Report: create UI.DataField records referencing the first properties of the main entity type.
  - Exclude: hidden properties and properties of type UUID.
- Generate UI.FieldGroup for Form/Object Page: create UI.DataField records for all direct properties of the main entity type.
  - Exclude: hidden properties.
- Generate UI.Facets that reference UI.FieldGroup using UI.ReferenceFacet records (used by Form and Object Page).
- Write annotations to the local annotation file only if those annotation terms are not already present on the main entity.

**LANGUAGE**: N/A

**CODE**:
```text
Generation logic summary:
- If UI.LineItem not defined:
    create UI.LineItem with UI.DataField entries for first N properties
    skip properties: hidden, type == UUID

- If UI.FieldGroup not defined:
    create UI.FieldGroup (qualifier e.g., "Form") with UI.DataField entries for all direct properties
    skip properties: hidden

- If UI.Facets not defined:
    create UI.Facets with UI.ReferenceFacet entries referencing the UI.FieldGroup qualifier

- Output: local annotation file (created/updated only when annotations are missing)
```

**STEP**: 3 - Example OData annotation (XML) for main entity

**DESCRIPTION**: Example of generated OData XML annotations: a UI.LineItem for the list report, a qualifying UI.FieldGroup for the form/object page, and UI.Facets referencing that field group via UI.ReferenceFacet. Use AnnotationPath to reference the FieldGroup qualifier.

**LANGUAGE**: XML

**CODE**:
```xml
<EntityType Name="MainEntityType">
  <!-- Generated LineItem for List Report -->
  <Annotation Term="UI.LineItem">
    <Collection>
      <Record Type="UI.DataField">
        <PropertyValue Property="Value" Path="Name"/>
      </Record>
      <Record Type="UI.DataField">
        <PropertyValue Property="Value" Path="CreatedAt"/>
      </Record>
      <!-- Excludes hidden properties and UUID-typed properties -->
    </Collection>
  </Annotation>

  <!-- Generated FieldGroup for Form / Object Page (qualifier "Form") -->
  <Annotation Term="UI.FieldGroup" Qualifier="Form">
    <Collection>
      <Record Type="UI.DataField">
        <PropertyValue Property="Value" Path="Name"/>
      </Record>
      <Record Type="UI.DataField">
        <PropertyValue Property="Value" Path="Description"/>
      </Record>
      <!-- Contains direct properties, hidden properties excluded -->
    </Collection>
  </Annotation>

  <!-- Generated Facets referencing the FieldGroup via ReferenceFacet -->
  <Annotation Term="UI.Facets">
    <Collection>
      <Record Type="UI.ReferenceFacet">
        <PropertyValue Property="Label" String="General"/>
        <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Form"/>
      </Record>
    </Collection>
  </Annotation>
</EntityType>
```

**STEP**: 4 - Example CDS-style annotation (for generators that emit CDS)

**DESCRIPTION**: Example of equivalent annotations in CDS-style syntax. Use these structures when generating CDS annotations. Exclude hidden and UUID properties per rules.

**LANGUAGE**: CDS

**CODE**:
```cds
entity MainEntityType {
  key ID        : UUID;
  Name          : String;
  Description   : String;
  CreatedAt     : Timestamp;
  // ... other direct properties
}

// LineItem for List Report (exclude UUID and hidden properties)
annotate MainEntityType with
  @UI.lineItem: [
    { type: #DataField, value: 'Name' },
    { type: #DataField, value: 'CreatedAt' }
  ];

// FieldGroup qualifier for Form/Object Page (exclude hidden properties)
annotate MainEntityType with
  @UI.fieldGroup#Form: [
    { type: #DataField, value: 'Name' },
    { type: #DataField, value: 'Description' }
  ];

// Facets referencing the FieldGroup qualifier
annotate MainEntityType with
  @UI.facets: [
    { type: #ReferenceFacet, label: 'General', target: @UI.fieldGroup#Form }
  ];
```

**STEP**: 5 - Integration notes for code generators

**DESCRIPTION**: Implementation details for code generators:
- Check for existing UI.FieldGroup, UI.Facets, UI.LineItem annotations on the main entity. If any exist, skip creating that term to avoid overriding user-defined annotations.
- Determine property order and "first properties" for UI.LineItem based on entity metadata; exclude hidden flags and UUID-typed properties.
- For UI.FieldGroup, include all direct properties except those marked hidden.
- Emit annotations to a local annotation file (local annotations) associated with the service or project; follow the project conventions for file naming and location.
- Use qualifiers for FieldGroup (e.g., "Form") and reference them from UI.Facets via AnnotationPath or @ qualifier reference depending on output format (XML vs CDS).

**LANGUAGE**: N/A

**CODE**:
```text
Generator integration checklist:
1. Read entity metadata (properties, types, "hidden" flags).
2. If annotation term missing:
   - Build annotation records per rules.
3. Write to project's local annotation file(s).
4. Do not overwrite existing annotations (detect presence and skip).
```
--------------------------------

**TITLE**: Basic Columns (Fiori Tools)

**INTRODUCTION**: Actionable reference for adding, configuring, moving, and deleting Basic Columns in a table using the Page Editor. Includes required asset references and the exact UI steps and property links to use programmatically or to automate UI interactions.

**TAGS**: fiori-tools, basic-column, table, UI, Page Editor, SAP Fiori

**STEP**: Asset references (icons and image)

**DESCRIPTION**: Ensure SAP icon stylesheet is loaded for icon glyphs used in the UI and reference the example image used in the documentation.

**LANGUAGE**: HTML/Markdown

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

```markdown
![](images/Basic_Column_8c30f41.png)
```

**STEP**: Adding a Basic Column

**DESCRIPTION**: UI steps to add one or more basic columns to a table in a section via the Page Editor. Follow the exact sequence to reproduce or automate this action.

**LANGUAGE**: Text

**CODE**:
```
1. Click the ➕ (Add) icon next to the Columns node.
2. Click "Add Basic Columns".
3. Select columns in the Columns dropdown (you can multi-select).
4. Click "Add".

Note: You cannot add the column based on the same value twice into the table.
```

**STEP**: Basic Column Properties (available depending on value type and draft enablement)

**DESCRIPTION**: Preserve these property names and appendix links for programmatic mapping or UI automation. A subset of these properties may be shown depending on the value type.

**LANGUAGE**: Markdown

**CODE**:
```markdown
- Label — appendix-457f2e9.md#loiod44832d99bdf4f73ba14cdbb16dc9301
- Importance — appendix-457f2e9.md#loio7fe32a215209419da6d6c19da0f69ccb
- Hidden — appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0
- External ID — appendix-457f2e9.md#loio13f6d7fd6c6c4f60908cefa7d4260e49
- Text (for all value types except Boolean) — appendix-457f2e9.md#loio5d1cc16e80ce48de8a47f2835a42cc47
- Text Arrangement (for all value types except Boolean) — appendix-457f2e9.md#loioecd5568919bf43c5a04dd6b5e8e173f6
- Display Type (for string values) — appendix-457f2e9.md#loio6544398b07024f4faff4bad25949b64d
- Restrictions — appendix-457f2e9.md#loio58fec66ebb1f48fbbd3092d3a1b27fda
- Criticality (for string and numeric values) — appendix-457f2e9.md#loio19d82b5d8bc940738afcb49b51a48bed
- Criticality Representation (for string and numeric values) — appendix-457f2e9.md#loiof2b7486cb4644441979d818802b79940
- Display as Image — appendix-457f2e9.md#loio344568c1e4014621905d78857cf66401
- Measures and Currencies (for numeric values) — appendix-457f2e9.md#loio8ad2438ea4ed4a52ab530ff104530f98
- Semantic Object Name — appendix-457f2e9.md#loio90e03983431d4bfd927b51593a937955
- Semantic Object Property Mapping — appendix-457f2e9.md#loio7726cb0d97194461973e3ec176c8a888
```

**STEP**: Moving a Basic Column

**DESCRIPTION**: Two supported UI options to reorder columns. Use drag-and-drop for bulk moves; arrow icons move single columns.

**LANGUAGE**: Text/HTML

**CODE**:
```
Option A — Drag and Drop:
- Hover over the table column outline.
- Press and hold the mouse button, move the column to the desired position (eligible positions highlighted in green), then release.
- To move multiple columns at once while dragging, press [CTRL] + [\+\] .

Option B — Arrow Icons (single-column moves):
- Click the <span class="SAP-icons-V5"></span> (Move Up) or <span class="SAP-icons-V5"></span> (Move Down) icon next to the column name.
```

**STEP**: Deleting a Basic Column

**DESCRIPTION**: UI steps to remove a column from the table and confirm the deletion.

**LANGUAGE**: Text

**CODE**:
```
1. Navigate to the column to delete.
2. Click the 🗑️ (Delete) icon to open the Delete Confirmation popup.
3. Click "Delete" to confirm.
```
--------------------------------

**TITLE**: Basic Fields — Add / Move / Delete / Maintain Field Properties (Fiori Tools)

**INTRODUCTION**: Practical, code-focused instructions for managing basic fields on a Fiori object page using Fiori Tools Page Editor. Covers adding, moving, deleting fields, and editing field/section properties and restrictions. Includes technical annotations and excluded properties to use when writing automation or editor plugins.

**TAGS**: fiori-tools, UI5, annotations, object-page, fields, UI.FieldGroup, UI.DataField, Edm.Guid, draft, metadata

STEP: Add Basic Fields

DESCRIPTION: How to add one or more fields to an existing section via the Page Editor UI. Use this to programmatically or interactively add field references (UI.DataField) to a section (UI.FieldGroup). Note excluded properties that must not appear in the Add Fields dialog or be added.

LANGUAGE: HTML

CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

LANGUAGE: Text

CODE:
```
Add Fields workflow (UI steps):
1. Expand required section and focus the field layer.
2. Click the Add (+) control to open the Add Fields pop-up.
3. Search/select one or several fields from the drop-down.
4. Click Add to add new field references to the Form section.

Excluded entity properties (must not be presented or added):
- Properties of type: Edm.Guid
- Draft-specific properties: IsActiveEntity, HasActiveEntity, HasDraftEntity
- Draft-specific navigation properties: SiblingEntity, DraftAdministrativeData
- Properties already referenced in any section
Note: You cannot add the same field twice to the same section.
```

STEP: Move Basic Fields (Drag-and-Drop and Arrow Buttons)

DESCRIPTION: Programmatic and UI behaviors for moving fields within or across sections. Use drag-and-drop or Move Up/Move Down controls. Rules: same-field duplicate prevention and Section/Entity annotation constraints.

LANGUAGE: Text

CODE:
```
Move behaviors:
- Drag-and-Drop:
  * Drag the required field(s); when target highlights green, drop to reposition within the same section or into a different section.
- Arrow buttons:
  * Move Up (icon: SAP-icons-V5 glyph) — shifts selected field up or into previous section.
  * Move Down (icon: SAP-icons-V5 glyph) — shifts selected field down or into next section.

Move to another section:
- Fields can be moved to another section only if the FieldGroup or Identification annotation is applied to the SAME entity as the originating section.

Move multiple fields:
- Use Ctrl + Click to multi-select fields, then drag the selected fields to desired position.
Note: Cannot move a field into a section that already contains the same field.
```

STEP: Delete Basic Fields

DESCRIPTION: Delete a field reference from a section in the Page Editor. Deleting removes the UI.DataField record from the UI.FieldGroup annotation only; entity property annotations remain intact.

LANGUAGE: Text

CODE:
```
Delete workflow (UI steps):
1. Expand required section and focus the field layer.
2. Click the Delete (wastebasket) icon to open Delete Confirmation.
3. Click Delete to confirm.

Technical effect:
- UI.DataField record is removed from the UI.FieldGroup annotation.
- Annotations applied to the entity properties (metadata) are NOT deleted.
```

STEP: Maintain Basic Field Properties

DESCRIPTION: Editable field properties in the Page Editor. Use these to generate or update annotations and UI metadata for fields. If the object page entity is not draft-enabled (read-only), Display Type and Restrictions are not available.

LANGUAGE: Text

CODE:
```
Editable field properties (apply via annotations/metadata or editor):
- Criticality (see appendix)
- Display as Image
- External ID
- Hidden
- Hide by Property
- Label
- Restrictions (Mandatory/Optional/ReadOnly/None)
- Semantic Object Name
- Semantic Object Property Mapping
- Text
- Text Arrangement
- Display Type

Notes:
- If a restriction value is defined in a lower layer (e.g., backend service), the option is shown as "(base layer)". If backend restriction cannot be resolved, it may display "Complex (base layer)".
- For non-draft-enabled entities, Display Type and Restrictions are not editable in the property panel.
References: Appendix links (preserve original appendix anchors) for detailed annotation semantics.
```

STEP: Change Section Label

DESCRIPTION: How to rename a section label in the Page Editor; this updates both the Page Editor and the application preview.

LANGUAGE: Text

CODE:
```
Change Section Label (UI steps):
1. Select the required section and open the properties pane.
2. Enter new text in the Label text box.
Effect:
- The section label is updated in the Page Editor and application preview.
Reference: Label appendix anchor for annotation details.
```

STEP: Define Restrictions (Field Input State)

DESCRIPTION: Set field input state for create/edit modes: None, Optional, Mandatory, ReadOnly. Use Restrictions to control required/optional/read-only behavior. Understand how backend (base layer) restrictions are surfaced.

LANGUAGE: Text

CODE:
```
Restrictions options and meanings:
- None: No annotations applied; field is considered optional by default.
- Optional: Field can be left empty; not mandatory.
- Mandatory: Field must have a value; cannot be empty.
- ReadOnly: Field is displayed as read-only; no editing allowed.

Notes:
- If backend defines restriction, UI shows option suffixed with "(base layer)"; "None" may be omitted.
- If backend restriction is unresolved due to unsupported annotations, UI shows "Complex (base layer)".
- Display Type and Restrictions are hidden for non-draft-enabled entities because fields cannot be edited.
```
--------------------------------

**TITLE**: Change the Code — Guided Development Snippets (Fiori Tools)

**INTRODUCTION**: This document describes how to apply and customize guided-development code snippets in Fiori Tools. It shows the exact HTML snippets provided by guides, explains the Copy / Insert Snippet workflow, parameter behavior (dependencies, validation, prefilled values), and how i18n keys are generated and added to your i18n.properties file.

**TAGS**: fiori-tools, guided-development, snippets, i18n, OData, annotations, UI

**STEP**: 1 — Add SAP icons stylesheet

**DESCRIPTION**: When a guide requires SAP icon fonts, insert the provided stylesheet link into your HTML (for example, index.html or component root). Use Copy to copy the tag to clipboard or Insert Snippet to inject it into the relevant file.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**STEP**: 2 — Use Copy / Insert Snippet actions

**DESCRIPTION**: After supplying any required parameter values in a guide, choose one of:
- Copy: copies the generated snippet to the clipboard so you can manually paste and adjust it.
- Insert Snippet: automatically inserts the snippet into the target file. The change is highlighted and confirmation appears.

Insert Snippet is disabled if the guide cannot be applied (for example: mismatched OData version, wrong page type, or no project selected).

**LANGUAGE**: Text

**CODE**:
```
UI Actions:
- Copy
- Insert Snippet
Confirmation text displayed on success:
"Code snippet has been successfully applied"
Insert Snippet is disabled when guide-project context mismatches (OData version, page type, or no project).
```

**STEP**: 3 — Parameter types, dependencies, and validation

**DESCRIPTION**: Guides expose parameters via drop-downs and text fields. Key behaviors you must handle in code generation:
- Dropdowns can be context-dependent (populated only when project/context available) or static.
- Some parameters are dependent on previous selections; dependent parameters are marked with an information icon and require the parent parameter to be selected first.
- Mandatory parameters are marked with an asterisk (*) and must be filled before Insert Snippet is enabled.
- Inline validation errors appear for formatting issues, missing dependent values, or duplicated parameters; fix errors to re-enable Insert Snippet.

Use the provided information-icon markup to detect dependent parameters in the guide UI:

**LANGUAGE**: HTML

**CODE**:
```html
<span class="SAP-icons-V5"></span> (Information)
```

**STEP**: 4 — Prefilled parameters and context reflection

**DESCRIPTION**: Some guides prefill parameter values in subsequent steps:
- Values selected for parameters like "Entity" in step 1 are carried forward to step 2 and shown as prefilled with a tooltip.
- Some guides (e.g., Configure multiple selection for a table, Configure table type) reflect current project settings and prefill accordingly.
- When qualifiers are used to reference annotations, enter the existing qualifier to populate the remaining fields with current annotation values; then edit and Insert Snippet to update annotations.

**LANGUAGE**: Text

**CODE**:
```
Prefill behavior examples:
- "Entity" selected in step 1 → prefilled in step 2 (shows tooltip "1")
- Table configuration guides → fields prefilled from current project settings
- Annotation qualifiers → enter qualifier to load current annotation values, then update and Insert Snippet
```

**STEP**: 5 — Generate i18n keys from input fields

**DESCRIPTION**: To add localized text keys automatically from a guide input:
1. Enter the text value into the input field in the guide UI.
2. Click the Internationalization (globe) icon to open the i18n generation dialog.
3. Confirm by clicking Apply. The generated i18n key is added to your project's i18n.properties file.
4. Use the Internationalization icon to jump to the i18n.properties file for further edits.

This process updates the file at:
- i18n.properties

**LANGUAGE**: Text

**CODE**:
```
i18n generation workflow:
- Click :globe_with_meridians: (Internationalization) icon
- Popup appears → Click "Apply"
- Entry is added to i18n.properties (open file to review or edit)
```
--------------------------------

**TITLE**: Chart Column (fiori-tools) — Add, Configure, Move, Delete, and Sort Chart Columns

**INTRODUCTION**: Instructions and actionable examples for adding and configuring chart columns in table controls on List Report or Object Page sections using the Page Editor. Includes required properties per chart type, UI actions, manifest.json requirement for sorting, and generated annotations (UI.Chart and UI.DataPoint) examples to guide code/annotation generation.

**TAGS**: fiori-tools, chart-column, UI.Chart, UI.DataPoint, PresentationVariant, manifest.json, sapui5, micro-chart, sorting

STEP: 1 — Include SAP icons stylesheet (if required by Page Editor/UI)
DESCRIPTION: Add the sap-icons stylesheet reference used in examples and UI icons. Keep the provided relative path exactly as used in the project.
LANGUAGE: HTML
CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: 2 — Add a Chart Column via Page Editor (UI steps)
DESCRIPTION: UI steps to add a chart column to a table in a section. Note: Add Chart Column is disabled when the table entity has no numeric properties. The minimal required input will generate UI.Chart and UI.DataPoint annotations automatically; you can extend them in the Property Panel after creation.
LANGUAGE: Plain Text
CODE:
```
1. In Page Editor: expand the target Page -> Section -> Table.
2. Click + (Add) on Columns node -> "Add Chart Column".
3. Choose Chart Type from the tree control. (Depending on chart type, additional properties are required.)
4. Click "Add". A UI.Chart and UI.DataPoint annotation are created.
```

STEP: 3 — Example generated annotation placeholders (conceptual JSON)
DESCRIPTION: Example structure of the annotations that the Page Editor generates. Use these placeholders to create/extend real annotation files (OData/Vocab XML or JSON-LD) in your project. Replace entity/property names with real values.
LANGUAGE: JSON
CODE:
```json
{
  "Annotations": {
    "Target": "MyService.MyEntityType",
    "UI.Chart": {
      "Qualifier": "Chart1",
      "ChartType": "Area",
      "DataPoints": ["DataPoint1"],
      "Measures": ["Sales"],
      "Dimensions": ["Month"]
    },
    "UI.DataPoint": {
      "ID": "DataPoint1",
      "Value": "Sales",
      "TargetValue": "SalesTarget",
      "Criticality": "SalesCriticality"
    }
  }
}
```

STEP: 4 — Required properties per chart type (use when generating annotations or UI metadata)
DESCRIPTION: For code generation or annotation editing, set at least the listed mandatory properties for each chart type. Additional optional properties (label, importance, hidden, criticality, thresholds, etc.) can be added in the Property Panel or annotation file.

- Area Chart: Value Source (data property), Measure, Dimension (x-axis)
LANGUAGE: JSON
CODE:
```json
{
  "ChartType": "Area",
  "ValueSource": "SalesValue",
  "Measure": "Amount",
  "Dimension": "Month",
  "Optional": ["Label", "Importance", "Hidden", "TargetValue", "CriticalitySource"]
}
```

- Bullet Chart: Value (numeric), MaximumValue (path or fixed)
LANGUAGE: JSON
CODE:
```json
{
  "ChartType": "Bullet",
  "Value": "CurrentValue",
  "MaximumValuePath": "MaxValue",
  "Optional": ["Label", "Importance", "Hidden", "TargetValue", "MaximumValueType", "MinimumValue", "ForecastValue", "CriticalitySource"]
}
```

- Column Chart: Value Source, Measure, Dimension
LANGUAGE: JSON
CODE:
```json
{
  "ChartType": "Column",
  "ValueSource": "SalesValue",
  "Measure": "Amount",
  "Dimension": "Category",
  "Optional": ["Label", "Importance", "Hidden", "CriticalitySource"]
}
```

- Line Chart: Value Source, Measure(s), Dimension
LANGUAGE: JSON
CODE:
```json
{
  "ChartType": "Line",
  "ValueSource": "SalesValue",
  "Measures": ["Amount", "AmountPrevious"],
  "Dimension": "Month",
  "Optional": ["Label", "Importance", "Hidden"]
}
```

- Radial Chart: Value, TargetValue (path)
LANGUAGE: JSON
CODE:
```json
{
  "ChartType": "Radial",
  "Value": "Completion",
  "TargetValuePath": "CompletionTarget",
  "Optional": ["Label", "Importance", "Hidden", "CriticalitySource"]
}
```

- Comparison Chart: Value Source, Measure, Dimension
LANGUAGE: JSON
CODE:
```json
{
  "ChartType": "Comparison",
  "ValueSource": "SalesValue",
  "Measure": "Amount",
  "Dimension": "Region",
  "Optional": ["Label", "Importance", "Hidden", "Criticality"]
}
```

- Harvey Chart: Value, MaximumValue (path)
LANGUAGE: JSON
CODE:
```json
{
  "ChartType": "Harvey",
  "Value": "Progress",
  "MaximumValuePath": "MaxProgress",
  "Optional": ["Label", "Importance", "Hidden", "MaximumValue", "Criticality"]
}
```

- Stacked Bar Chart: Value Source, Measure(s)
LANGUAGE: JSON
CODE:
```json
{
  "ChartType": "StackedBar",
  "ValueSource": "CategoryValues",
  "Measures": ["ValuePart1", "ValuePart2"],
  "Optional": ["Label", "Importance", "Hidden", "Criticality"]
}
```

STEP: 5 — Move columns inside a table (Drag & Drop or Arrow icons)
DESCRIPTION: Two ways to reorder columns programmatically or in the editor workflow. Drag and Drop supports moving multiple selected columns (use modifier key). Arrow icons move a single column up/down.
LANGUAGE: Plain Text
CODE:
```
- Drag & Drop:
  Hover column outline -> press and hold mouse -> move to highlighted green position -> release.
  To move multiple: hold CTRL while selecting and dragging.

- Arrow Icons:
  Click "Move Up" or "Move Down" icon next to the column name. Moves one column at a time.
```

STEP: 6 — Delete a Chart Column
DESCRIPTION: Steps for deletion via Page Editor; after deletion, remove any unreferenced annotations (UI.Chart, UI.DataPoint, UI.PresentationVariant) from annotation files via cleanup.
LANGUAGE: Plain Text
CODE:
```
1. Select the column in Page Editor.
2. Click Delete (wastebasket icon).
3. Confirm in Delete Confirmation popup -> Delete.
4. Run annotation cleanup to remove unreferenced UI.Chart/UI.DataPoint/UI.PresentationVariant entries.
```

STEP: 7 — Sorting micro charts in chart columns (Presentation Variant requirement)
DESCRIPTION: Sorting of micro chart data is controlled by the chart column's Sort Order property which is visible only if a UI.PresentationVariant is referenced. Requirement: set minUI5Version to 1.130 or higher in manifest.json to enable this in the Page Editor. Only supported for area, line, column, comparison, and stacked bar micro charts.
LANGUAGE: JSON
CODE:
```json
// manifest.json snippet: set minUI5Version >= 1.130
{
  "sap.ui5": {
    "dependencies": {
      "minUI5Version": "1.130.0"
    }
  }
}
```

STEP: 8 — Define PresentationVariant and SortOrder (example)
DESCRIPTION: Create or reference a UI.PresentationVariant to expose the Presentation Variant: Sort Order property for the micro chart column. Define one or more sort properties with Property and Direction fields. Move sort properties to change precedence. Remove annotation reference by setting Presentation Variant: Annotation to None, and run cleanup to remove unreferenced annotations.
LANGUAGE: JSON
CODE:
```json
{
  "UI.PresentationVariant": {
    "Qualifier": "PV_Chart1",
    "SortOrder": [
      { "Property": "Month", "Direction": "Ascending" },
      { "Property": "Sales", "Direction": "Descending" }
    ],
    "Visualizations": [
      { "Chart": "Chart1" }
    ]
  }
}
```

STEP: 9 — Notes and post-generation tasks
DESCRIPTION: After adding a chart column the Page Editor generates minimal UI.Chart and UI.DataPoint annotations. Use the Property Panel or directly edit annotation files to:
- Add labels, importance, hidden flags.
- Configure criticality, target/threshold values, max/min types and values, forecast values where applicable.
- Add/modify UI.PresentationVariant qualifiers to enable Sort Order.
- Run cleanup to remove unreferenced annotations and keep the annotation file tidy.
LANGUAGE: Plain Text
CODE:
```
Checklist after adding chart column:
- Edit UI.Chart/UI.DataPoint to add optional properties (labels, thresholds, criticality).
- If sorting required: add UI.PresentationVariant and set Presentation Variant: Annotation -> New.
- Set minUI5Version >= 1.130 in manifest.json to expose sort order.
- Run annotation cleanup to remove unreferenced annotations.
```
--------------------------------

**TITLE**: Add, Delete, and Maintain Chart Section (Fiori Tools)

**INTRODUCTION**: This document describes the exact UI actions and resulting annotation changes needed to add, delete, and maintain an Object Page Chart Section in Fiori Tools. Use this as a code-centric checklist for generating or updating annotations (UI.Chart, UI.ReferenceFacet, UI.Facets) and related metadata (Analytics aggregated properties, CAP CDS using statements).

**TAGS**: fiori-tools, UI.Chart, UI.ReferenceFacet, UI.Facets, Analytics, Aggregation, CAP, CDS, Object Page, Chart

STEP: Required stylesheet for icon display

DESCRIPTION: Include the SAP icons stylesheet used by the editor UI (present in the original documentation). Ensure the relative path is correct in your environment.

LANGUAGE: HTML

CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: Adding Chart Section

DESCRIPTION: Action steps to add a chart section from the Page Editor and the exact annotation and model changes that must be created/updated by the code generator.

- UI actions to automate:
  1. Open the Object/Form Entry Page in the Page Editor.
  2. In the outline, locate the section node and trigger the "Add" action.
  3. Select "Add Chart Section" from the section-type drop-down.
  4. Populate the chart attributes in the pop-up:
     - Label
     - Entity
     - Type
     - Dimension
     - Measure (choose one):
       - Use existing measure — select an existing measure defined with custom or transformation aggregations.
       - Create new measure — choose an aggregable property and an aggregation method to create a dynamic measure.
  5. Confirm "Add".

- Required code/annotation outcomes to implement in generated files:
  - Add a new UI.Chart annotation and add a new UI.ReferenceFacet that includes an annotationPath pointing to the newly created UI.Chart inside the existing UI.Facets collection for the Object Page entity.
  - If the user created a new measure:
    - Apply @Analytics.AggregatedProperty to the selected aggregable property with the chosen aggregation method (creates a dynamic measure).
  - If UI.Facets is not present for the entity, create a new UI.Facets annotation under that entity.
  - If UI.Facets exists in an underlying layer, override it by writing the UI.Facets annotation in the current (higher) layer.
  - For CAP CDS projects: add a using statement to the overridden file if it does not yet include it.

- Notes for automation:
  - The technical name and label for created artifacts are generated automatically; ensure the generated label can be adjusted in the Property Panel after creation.
  - Ensure annotationPath values point to the correct annotation identifier.
  - Maintain layer override behavior: do not mutate annotations in a lower layer; instead create an overriding annotation in the current layer file.

LANGUAGE: Description / Annotation actions (no additional code snippet provided)

CODE:
```text
Outcomes (conceptual):
- New UI.Chart annotation
- New UI.ReferenceFacet with annotationPath -> created UI.Chart
- UI.Facets created/updated under the entity
- @Analytics.AggregatedProperty applied when creating new measures
- CAP CDS: add using statement if missing
```

STEP: Deleting Chart Section

DESCRIPTION: Steps to remove a chart section from the Object Page and the annotation cleanup behavior to implement.

- UI actions to automate:
  1. In the outline, select the section node.
  2. Trigger the Delete action (wastebasket icon).
  3. Confirm deletion in the Delete Confirmation popup.

- Required code/annotation outcomes:
  - Remove the generated UI.ReferenceFacet from the UI.Facets collection for the entity.
  - Ensure the UI.Chart annotation is cleaned up during the standard cleanup procedure (do not rely on immediate deletion unless part of a cleanup routine).
  - When overriding annotations, consider removing the overriding UI.Facets entry if it only existed to host the removed reference facet and is no longer needed.

LANGUAGE: Description / Annotation actions

CODE:
```text
Deletion outcomes:
- Delete generated UI.ReferenceFacet from UI.Facets
- UI.Chart annotation removed during cleanup
```

STEP: Maintaining Chart Section Properties

DESCRIPTION: How to update chart properties and where to delegate property-specific editing to the Property Panel and other docs.

- Actions:
  - Use the Property Panel to change the section label (see "Change Form Section Label" reference).
  - Use the Property Panel to maintain analytical chart properties (see "Maintain Analytical Chart Properties" reference).
  - Ensure property edits update the corresponding annotation attributes (e.g., labels, chart type, dimension/measure bindings).

- Cross-reference links (retain for implementers):
  - Change Form Section Label: form-section-4102b3d.md#loio4102b3d63d9047c881108e6f0caae15e__changeformsectionlabel
  - Maintain Analytical Chart Properties: analytical-chart-9c086ec.md#loio9c086ecaace540be83b0e50101244e78__analyticalchartproperties

LANGUAGE: Description / Documentation links

CODE:
```text
Use Property Panel to update:
- Section label
- Chart type, dimensions, measures, and optional properties

See:
- form-section-4102b3d.md#loio4102b3d63d9047c881108e6f0caae15e__changeformsectionlabel
- analytical-chart-9c086ec.md#loio9c086ecaace540be83b0e50101244e78__analyticalchartproperties
```

STEP: Hidden Property Reference

DESCRIPTION: If chart or section visibility needs to be controlled programmatically, reference the "Hidden" appendix for rules and examples. Automations that toggle visibility should update annotation-level visibility settings accordingly.

- Reference link:
  - Hidden: appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0

LANGUAGE: Description / Documentation link

CODE:
```text
See:
- appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0
```
--------------------------------

**TITLE**: XML Annotation Code Completion — How to Trigger and Use Suggestions

**INTRODUCTION**: This guide explains how to use the XML annotation language server code completion to insert or modify annotation targets, terms, attributes, and annotation value elements. It covers how suggestions are generated, how to trigger the list, navigate it, accept entries (including segment-by-segment path completion using '/'), and use completion for word-based entries and code blocks. Reference: micro-snippets-addf811.md

**TAGS**: fiori-tools, code-completion, annotations, OData, XML, language-server, micro-snippets

**STEP**: 1 — How suggestions are generated

**DESCRIPTION**: Understand the sources and contexts used to produce completion suggestions so you can predict and filter results when coding. Suggestions are produced from:
- Project metadata (local OData metadata, service definitions)
- OData vocabularies (standard and extended vocabularies)
- Analysis of the project structure (available files, annotation files, component names)
- The immediate XML context where completion is triggered (targets, terms, attributes, values, or blocks)

Use knowledge of these sources to narrow your typing and filter suggestions quickly.

**LANGUAGE**: text

**CODE**:
```text
Sources: project metadata, OData vocabularies, project structure, current XML context
```

**STEP**: 2 — Trigger code completion

**DESCRIPTION**: Open the completion list at the current cursor position. Use the OS-specific keyboard shortcut. This works anywhere completion is supported (targets, terms, attributes, annotation values, code blocks, micro-snippets).

- Windows/Linux: Press Ctrl + Space
- macOS: Press CMD + Space

If your OS reserves CMD+Space (e.g., Spotlight), ensure the editor receives that shortcut or use the editor's menu/command to trigger "Trigger Suggest" / "Show IntelliSense".

**LANGUAGE**: text

**CODE**:
```text
Windows/Linux: Ctrl + Space
macOS: CMD + Space
```

**STEP**: 3 — Filter suggestions by typing

**DESCRIPTION**: Narrow the suggestion list by typing additional characters after triggering completion. The list filters in real time to match the typed prefix. Use this to quickly find long term names, attributes, or complex targets.

**LANGUAGE**: text

**CODE**:
```text
Example: Type "Com" after triggering completion to filter to entries starting with "Com"
```

**STEP**: 4 — Navigate and accept suggestions

**DESCRIPTION**: Move through suggestions and accept the highlighted item.

- Navigate: Up / Down arrow keys or mouse
- Accept: Enter key or mouse click

Accepting inserts or replaces text at the cursor based on the current context (single-value replacement, partial segment insertion, or code-block insertion).

**LANGUAGE**: text

**CODE**:
```text
Navigate: Up / Down
Accept: Enter or click
```

**STEP**: 5 — Segment-by-segment path completion (use '/' to proceed)

**DESCRIPTION**: When adding or modifying annotation targets or path values that contain segments separated by '/', you can accept the current segment and immediately trigger completion for the next segment by pressing '/'.

- Type part of a segment, select suggestion, then press '/'
- The selected segment is accepted and completion opens for the next segment
- Continue until the full path or target is built

This speeds construction of long path expressions (e.g., EntitySet/NavigationProperty/Property).

**LANGUAGE**: text

**CODE**:
```text
Workflow:
1. Trigger completion
2. Select segment suggestion
3. Press '/' to accept segment and open next-segment completion
4. Repeat until path is complete
```

**STEP**: 6 — Use cases: add/change values, word-based completion, and code blocks

**DESCRIPTION**: Code completion supports multiple operations:

- Adding new annotation entries (terms, targets, attributes)
- Modifying existing values (replace the current token with a selected suggestion)
- Word-based completion: complete partial words inside values or comments
- Code-block insertion: accept suggestions that insert multi-line snippets or micro-snippets

For micro-snippets and pre-built blocks, refer to the micro-snippets documentation: micro-snippets-addf811.md

**LANGUAGE**: text

**CODE**:
```text
Use completion to:
- Insert terms/attributes: select and press Enter
- Replace values: place cursor on value token, trigger completion, select suggestion
- Insert code blocks: choose snippet suggestion to insert multi-line XML
Reference: micro-snippets-addf811.md
```

**STEP**: 7 — View vocabulary and hint information for suggestions

**DESCRIPTION**: While browsing the suggestion list, view extra information about each vocabulary term or suggestion (description, type, origin). Use the editor's quick info / hover or the suggestion details pane to inspect the selected item before accepting it.

**LANGUAGE**: text

**CODE**:
```text
Action: Select suggestion -> open details/hover -> read vocabulary description and origin
```
--------------------------------

**TITLE**: Configure Page Elements with Page Editor (SAP Fiori tools)

**INTRODUCTION**: This guide explains how to configure SAP Fiori elements apps using the Page Editor in Fiori tools. It covers adding the SAP icons stylesheet, locating and selecting the correct @sap/ux-specification version, opening and using the Page Editor, supported templates, and enabling JSON schema files in the Application Modeler tree view. Use these steps to automate or script setup and to drive UI configuration programmatically.

**TAGS**: fiori-tools, sapui5, page-editor, ux-specification, manifest, flexibility, ODataV2, ODataV4, application-modeler

**STEP**: Add SAP icons stylesheet to pages

**DESCRIPTION**: Include the SAP icons stylesheet in your HTML pages or shell so UI icons render correctly. Keep this link in your app root or relevant HTML template.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**STEP**: Locate and verify @sap/ux-specification in the project

**DESCRIPTION**: The Page Editor uses the configuration properties from the @sap/ux-specification node module installed in the application's root folder. Confirm the package is installed and determine the available versions (matching your target UI5). Use npm commands to inspect or install the appropriate version. The module is located at ./node_modules/@sap/ux-specification in your project root.

- Check installed version
- List available versions (to match UI5-* tags)
- Install or update to a specific version if required

**LANGUAGE**: Shell

**CODE**:
```bash
# Show installed version (if any)
npm ls @sap/ux-specification

# List all published versions (to find UI5-* matching tags)
npm view @sap/ux-specification versions --json

# Install a specific version (example)
npm install --save-dev @sap/ux-specification@<version>
```

**STEP**: Match @sap/ux-specification to your SAPUI5 version

**DESCRIPTION**: Choose the correct @sap/ux-specification release by checking the UI5-* tags on the package page (npm). If you need to change the minUI5version for the app, update manifest settings accordingly (see project SAPUI5 version docs). Use the npm/version list from the previous step to select the right package version.

**LANGUAGE**: Text

**CODE**:
```
Action:
1. Visit https://www.npmjs.com/package/@sap/ux-specification and inspect UI5-* tags for compatible releases.
2. Update package.json or install the matching @sap/ux-specification version.
3. If required, update manifest.json "minUI5Version" property to the desired UI5 baseline.
```

**STEP**: Open the Page Editor (ways to start)

**DESCRIPTION**: Multiple entry points to open the Page Editor. Use whichever fits automation or manual workflows:

- Right-click the app root or any workspace folder in Explorer → Show Page Map (opens Page Map)
- Select the target page and click the pencil icon (Configure Page)
- Open the project sidebar Application Modeler and click the page node in the tree view
- In the virtual JSON page editor, click the Show Page Editor icon in the Editor Title menu

Note: Icons referenced in UI: :pencil2: (Configure Page) and SAP-icons-V5 "" (Show Page Editor).

**LANGUAGE**: Text

**CODE**:
```
Open Page Editor:
- Explorer: Right-click project/folder -> Show Page Map
- Page: Select page -> click 'Configure Page' (pencil icon)
- Application Modeler: Sidebar -> click page node
- Virtual JSON file: Editor Title -> click 'Show Page Editor' (SAP icon)
```

**STEP**: Page Editor features and capabilities

**DESCRIPTION**: Use the Page Editor to view and edit configurable elements and properties for pages (manifest and UI5 flexibility). Key features:

- Outline view of configurable elements on the selected page
- Click a node to open the Property Panel
- Property Panel features:
  - Editable properties (manifest and UI5 flexibility)
  - Search filter
  - Info tooltips for each property
  - Direct edit links to the associated file (virtual JSON or manifest)
- Create/maintain annotation-based UI elements for List Report, Object Page, and Form Entry Page (OData V4)
- Access Configuration Documentation: right-click project in Application Modeler tree view

Supported templates (Page Editor supports these templates and OData versions):
- List Report Page — OData V2 and OData V4
- Worklist Page — OData V2 and OData V4
- Analytical List Page — OData V2 and OData V4
- Overview Page — OData V2 and OData V4
- Form Entry Object Page — OData V4
- Custom Page — OData V4

**LANGUAGE**: Text

**CODE**:
```
Page Editor:
- Outline view -> select node -> open Property Panel
- Property Panel: search, tooltips, direct file edit
- Supports annotation-based elements for OData V4 pages (List Report, Object Page, Form Entry)
- Supported templates: List Report, Worklist, Analytical List, Overview, Form Entry Object, Custom (see OData V2/V4 compatibility above)
- Configuration Documentation: Right-click project -> Configuration Documentation
```

**STEP**: Application Modeler tree view and enabling JSON schema files

**DESCRIPTION**: The Application Modeler tree view shows a simplified virtual hierarchy by default (Project Name > App Name > Pages > Page Name). To view the technical view (full generated files and JSON schemas), enable JSON schema files in settings. Once enabled, the tree view is updated with the generated JSON schema files that the Page Editor and modeler reference.

Steps:
1. Open Settings in the Application Modeler or Fiori tools settings.
2. Select the "Show JSON Schemas" checkbox.
3. The tree view will refresh to include generated JSON schema files.

**LANGUAGE**: Text

**CODE**:
```
Enable JSON schema files:
1. Settings -> Show JSON Schemas (checkbox)
2. Tree view refreshes to include generated JSON schema files
Result: Technical view with full paths and generated JSON schemas available for direct inspection.
```
--------------------------------

**TITLE**: Connected Fields (Object Page) — Add, Move, Delete, Maintain

**INTRODUCTION**: Practical, code-focused instructions for manipulating "Connected Fields" in an SAP Fiori Tools Object Page. Use these steps to add a connected-fields node (two semantically connected properties under one label), move it, delete it, and maintain its properties. Includes the exact icon HTML snippets and annotation names referenced by the tool.

**TAGS**: fiori-tools, object-page, connected-fields, UI.ConnectedFields, UI.DataField, UI.FieldGroup, UI.Identification, annotations

STEP: 1 — Add Connected Fields

DESCRIPTION: Add two semantically connected properties under a single label to a Form Section or Identification Section inside an Object Page. Steps to perform in the editor UI:
- Expand target section and locate the Fields node.
- Click the Add icon and choose "Add Connected Fields".
- In the popup, set the common label and choose Field 1 and Field 2 (two different properties). Note: a property already used in another connected fields node cannot be selected.
- Optionally set a delimiter (single or multiple text characters like ":", "/", "-") to appear between the two field values. If unset, a space is used.
- Click Add to create the connected fields node.

Preserve: you cannot reuse properties already part of another connected fields node inside the same section.

LANGUAGE: HTML

CODE:
```html
<!-- Include icons (editor UI uses SAP icons CSS) -->
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>

<!-- Example doc links you may reference while adding -->
Form section doc: form-section-4102b3d.md
Identification section doc: identification-section-b83f501.md
```

STEP: 2 — Move Connected Fields

DESCRIPTION: Move a connected-fields node within a section or to a different content-area section, and swap the order of the two fields inside the node. Two supported methods:

- Drag and drop:
  - Drag the connected-fields node and drop where highlighted in green. Use Ctrl + Click to select multiple fields/nodes for grouped moving.
  - Drag a field inside the connected-fields node and drop above/below the other field to swap order.

- Arrow buttons:
  - Use Move Up / Move Down icons next to the connected fields label to move the node within the section or to another section.
  - Use Move Up / Move Down icons next to the child field inside the connected-fields node to swap the two field positions.

Constraint: Connected fields cannot be moved to the Header Section.

LANGUAGE: HTML

CODE:
```html
<!-- Editor uses SAP icon glyphs for move controls -->
<!-- Move Up / Move Down icons used in the UI: -->
<span class="SAP-icons-V5"></span> <!-- Move Up -->
<span class="SAP-icons-V5"></span> <!-- Move Down -->

<!-- Note: Header section reference (not movable to): -->
Header Section doc: header-a05d7fc.md#loio8a127fc36f5640abaab0056e632fe630
```

STEP: 3 — Delete Connected Fields

DESCRIPTION: Delete the entire connected-fields node (including its child fields). You cannot delete the individual fields inside the node separately. Steps:
- Expand the target section and locate the connected-fields node.
- Click the Delete (wastebasket) icon and confirm in the Delete Confirmation popup.
- Effect on annotations: deleting removes the UI.DataField record from UI.FieldGroup or UI.Identification. The entity-property annotations remain intact.
- Cleanup: removing a node can leave orphaned UI.ConnectedFields annotations. You must explicitly run the cleanup procedure to remove unreferenced annotations.

LANGUAGE: PlainText

CODE:
```
Editor delete icon: 🗑️ (Delete - opens Delete Confirmation)
Behavior on delete:
- UI.DataField record removed from UI.FieldGroup or UI.Identification
- Annotations on entity properties are NOT deleted
- Orphaned UI.ConnectedFields annotations must be removed via explicit cleanup procedure
```

STEP: 4 — Maintain Connected Field Properties

DESCRIPTION: Update label, delimiter, visibility, and other allowed properties for a connected-fields node. Key rules and actions:
- Label: maintained like basic fields (shared/common label). See Fields docs for label behavior.
- Delimiter: can be one or more literal characters (e.g., ":", "/", "-"). If unset, a single space separates values. Delimiter values are not translatable.
- Hidden: set node hidden either statically (boolean) or dynamically by binding to a boolean property. After enabling Hidden, use "Hide by Property" to specify the dynamic condition.
- Restrictions: You cannot change which properties are used as Field 1/Field 2 within an existing connected-fields node. To change properties, delete the node and re-add it.
- Individual field-level properties: you may set all basic field properties on the individual fields except Label and Hidden (those are controlled at node level).

References for maintenance operations:
- Hidden behavior: appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0
- Hide by Property: appendix-457f2e9.md#loio4e8bb3df433546f8a80f16e53b29e4c1
- Maintaining basic field properties: link provided in docs

LANGUAGE: PlainText

CODE:
```
Delimiter examples (literal characters): ":", "/", "-" 
If delimiter unset => fields separated by single space
Delimiter is NOT translatable

Hidden options:
- Static: hidden: true/false
- Dynamic: hidden bound to boolean property (use "Hide by Property" control)

Cannot change Field 1/Field 2 properties in-place. To change them:
1) Delete connected-fields node (see deletion)
2) Add new connected-fields node with desired properties

References:
- Fields: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/457f2e9699b5437fb09d56311055a4a0.html#fields
- Hidden: appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0
- Hide by Property: appendix-457f2e9.md#loio4e8bb3df433546f8a80f16e53b29e4c1
- Maintaining Basic Field Properties: https://help.sap.com/docs/SAP_FIORI_tools/bdf9573a206b492382cc747e731cf34b/2953503145dd428194c6dff252744ac1.html?state=DRAFT&version=DEV&q=label#maintaining-basic-field-properties
```

STEP: 5 — Important Annotation and Cleanup Notes

DESCRIPTION: Summary of annotation impacts and cleanup responsibility for implementers and code generators:
- Deleting a connected-fields node removes UI.DataField entries from UI.FieldGroup or UI.Identification annotations.
- Property annotations applied to the entity remain; they are not removed by deletion of UI.DataField.
- Orphaned UI.ConnectedFields annotation entries must be removed with an explicit cleanup procedure (tooling or script) — this is not automatic.

LANGUAGE: PlainText

CODE:
```
Annotations affected:
- Removed: UI.DataField entries in UI.FieldGroup or UI.Identification (when connected-fields node deleted)
- Not removed: annotations applied to entity properties
- Orphan cleanup: UI.ConnectedFields annotation(s) must be explicitly cleaned up (run cleanup procedure to delete unreferenced annotations)
```
--------------------------------

**TITLE**: Contact Column — add, move, and delete in Table (List Report / Object Page)

**INTRODUCTION**: Instructions for adding a Contact Column to a table inside a Fiori Tools Page Editor (list report or object page section), moving columns within a table, and deleting a contact column. Includes default behavior (Communication.Contact annotation) and relevant UI properties.

**TAGS**: fiori-tools, contact-column, table, list-report, object-page, annotation, Communication.Contact, UI

STEP: Adding a Contact Column

DESCRIPTION: In the Page Editor, add a Contact Column to a table/section. This creates a Communication.Contact annotation with the default label "Contact Name". You can change the label, importance, hidden state, or contact mapping in the Property Panel. Follow the UI actions below exactly.

- In Page Editor > Columns node:
  1. Click the Add (+) icon.
  2. Choose "Add Contact Column".
  3. In the tree control, select "Contacts".
  4. Click "Add".
- Result: A new Communication.Contact annotation is created (default label: Contact Name). Edit properties in Property Panel.
- Contact Column properties:
  - Label (see appendix: appendix-457f2e9.md#loiod44832d99bdf4f73ba14cdbb16dc9301)
  - Importance (appendix-457f2e9.md#loio7fe32a215209419da6d6c19da0f69ccb)
  - Hidden (appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0)
  - Contact mapping (appendix-457f2e9.md#loio82d94533569741e5888536d49052198c)

LANGUAGE: PlainText

CODE:
```PlainText
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>

Image path (reference):
images/FIORI_TOOLS_CONTACT_COLUMN_0e0431c.png

Notes:
- A new Communication.Contact annotation is created by the editor (default label: "Contact Name").
- To change the label or map different properties, use the Property Panel for the Contact Column.
- See appendix links for property definitions:
  - appendix-457f2e9.md#loiod44832d99bdf4f73ba14cdbb16dc9301
  - appendix-457f2e9.md#loio7fe32a215209419da6d6c19da0f69ccb
  - appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0
  - appendix-457f2e9.md#loio82d94533569741e5888536d49052198c
```

STEP: Moving a Contact Column

DESCRIPTION: Move a column within a table using drag-and-drop (multiple columns supported) or arrow icons (single column). Use highlighted eligible positions when dragging.

- Drag and Drop:
  - Hover the column header outline.
  - Press and hold mouse button; drag to the highlighted eligible position; release to drop.
  - To move multiple selected columns at once: press [CTRL] + [+] while dragging.
- Arrow Icons:
  - Click Move Up (icon: ) or Move Down (icon: ) next to the column name to move one column at a time.

LANGUAGE: PlainText

CODE:
```PlainText
Drag & Drop:
- Hover over column header outline
- Mouse down -> drag -> release at highlighted position
- Multi-column move: press [CTRL] + [+]

Arrow Icons:
- Use icons next to column name:
  - Move Up: SAP-icons-V5 symbol 
  - Move Down: SAP-icons-V5 symbol 
```

STEP: Deleting a Contact Column

DESCRIPTION: Remove a contact column from a table via the Page Editor.

- Navigate to the column in Page Editor.
- Click the Delete (wastebasket) icon to open Delete Confirmation dialog.
- Confirm by clicking "Delete".

LANGUAGE: PlainText

CODE:
```PlainText
Delete steps:
1. Select the column in the Page Editor.
2. Click the Delete (🗑️) icon.
3. In the Delete Confirmation popup, click "Delete" to confirm.
```
--------------------------------

**TITLE**: Contact Field (SAP Fiori Tools)

**INTRODUCTION**: Configure and manage a Contact Field in an SAP Fiori Object Page to display contact information as a quick view for a Form Section or Identification Section. This guide describes the UI actions and the annotation element used (Communication.Contact) and preserves related file paths and assets needed for implementation.

**TAGS**: fiori-tools, sap-fiori, annotation, Communication.Contact, object-page, contact-field, ui

**STEP**: 1 — Add a Contact Field

**DESCRIPTION**: Use the Page Editor to add a Contact Field to a Form or Identification section. This creates a Communication.Contact annotation entry. Follow these UI actions precisely:
- In the Page Editor, under the Form or Identification node, click the + (Add) icon and choose "Add Contact Field".
- In the tree control choose "Contact".
- Click "Add" to create a new Communication.Contact annotation.
- Ensure any referenced assets and styles (icons) are available; the application uses the sap icons stylesheet.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

```text
Annotation to create: Communication.Contact
Related docs (for reference): ../form-section-4102b3d.md, ../identification-section-b83f501.md
```

**STEP**: 2 — Move a Contact Field

**DESCRIPTION**: Move the contact field within the same section or between sections in the Page Editor. Moving is allowed unless blocked by annotation path constraints. If you move a Contact Field across different annotation scopes or files, update the relative paths and references of the Communication.Contact annotation in the annotation/metadata files so the UI can resolve the annotation correctly.

**LANGUAGE**: text

**CODE**:
```text
Rules:
- You can move a Contact Field within a section like any other field.
- Moving between sections is permitted only if the relative paths of Communication.Contact and base annotations remain valid.
- If moving between files or annotation scopes, update annotation paths/references in the metadata/annotations files accordingly.

Reference doc filenames:
- form-section-4102b3d.md
- identification-section-b83f501.md
```

**STEP**: 3 — Delete a Contact Field

**DESCRIPTION**: Delete a contact column or field from the Page Editor and remove its annotation entry from your annotations/metadata files to fully remove it from the application.
UI deletion steps:
- Navigate to the field in the Page Editor.
- Click the wastebasket (Delete) icon to open the Delete Confirmation popup.
- Click "Delete" to confirm.
Post-delete: remove the corresponding Communication.Contact annotation and any unused references/assets from your annotations and metadata files to prevent orphaned entries.

**LANGUAGE**: text

**CODE**:
```text
UI Delete Steps:
1. Select field
2. Click Delete (wastebasket) icon
3. Confirm in Delete Confirmation popup

Post-delete actions for code:
- Remove the Communication.Contact annotation entry from your annotation/metadata file(s)
- Remove any unused references or paths that referenced the deleted contact field
```
--------------------------------

**TITLE**: Guided Development: Available Fiori Tools Guides (Actionable Reference)

**INTRODUCTION**: Short, actionable reference listing currently available guided-development guides for Fiori Tools. Each step describes the goal, the typical files or artifacts to change, and the relevant implementation languages/types to use when writing code or automation for these guides.

**TAGS**: fiori-tools, guided-development, UI5, CAP, OData, XML, TypeScript, Manifest, CDS, ABAP, Extension Point, Page Configuration Change, Flexible Programming Model

STEP: Add a chart building block
DESCRIPTION: Add a chart building block to a page. Update view XML (or page configuration), CDS model (CAP) and OData V4 metadata as needed; connect chart to OData V4 service and Flexible Programming Model annotations/config.
LANGUAGE: CAP CDS, OData V4, Flexible Programming Model
CODE:
```text
// No source code snippet provided. Implement view XML and CDS annotations for chart.
// Typical files: webapp/view/*.xml, srv/*.cds, annotation files, manifest.json
```

STEP: Add a custom action to a page using extensions
DESCRIPTION: Implement a custom action in the page via extension point: create an extension TypeScript or JavaScript file, register it in the manifest or ext folder, add the action handler and UI control placement.
LANGUAGE: OData V2, OData V4, TypeScript
CODE:
```text
// No source code snippet provided. Create extension files under webapp/ext or src/extension.
// Typical files: webapp/extension/MyAction.ts, manifest.json (sap.ui5/extends)
```

STEP: Add a custom card to an overview page
DESCRIPTION: Add a custom card to an overview page by adding new card configuration in the page's XML/JSON configuration or page descriptor and implementing the card renderer as needed.
LANGUAGE: Extension Point
CODE:
```text
// No source code snippet provided. Modify page configuration and implement card under webapp/cards/.
```

STEP: Add a custom filter to the filter bar
DESCRIPTION: Extend the filter bar with a custom filter control using extension points and TypeScript to implement control logic and data binding.
LANGUAGE: TypeScript, Extension Point
CODE:
```text
// No source code snippet provided. Create extension handler and register filter control in the filter bar.
```

STEP: Add a custom section to an object page using extensions
DESCRIPTION: Use extension points to insert a custom section into an object page. Implement controller/fragment or component and register via manifest extensions.
LANGUAGE: OData V2, OData V4
CODE:
```text
// No source code snippet provided. Typical artifacts: webapp/fragment/CustomSection.fragment.xml, extension handler registration.
```

STEP: Add a field group to an object page
DESCRIPTION: Add a field group to an object page by updating view XML, and if applicable, add CDS annotations (CAP or ABAP CDS) to expose fields and groups.
LANGUAGE: XML, CAP CDS, ABAP CDS
CODE:
```text
<!-- No code snippet provided. Update object page view XML and CDS model with @UI.fieldGroup annotations. -->
```

STEP: Add a filter bar building block
DESCRIPTION: Add a filter bar building block using the Flexible Programming Model: update page configuration and CDS/annotations to expose filterable properties and default behavior.
LANGUAGE: Flexible Programming Model
CODE:
```text
// No source code snippet provided. Modify page configuration and annotations in CDS/service definition.
```

STEP: Add a header facet to an object page using data points
DESCRIPTION: Add a header facet populated by data points: update XML header section and CAP/ABAP CDS annotations for DataPoint UI.
LANGUAGE: XML, CAP CDS, ABAP CDS
CODE:
```xml
<!-- No snippet provided. Update header facet in object page XML and use @UI.dataPoint annotations in CDS. -->
```

STEP: Add a link list card to an overview page
DESCRIPTION: Add a link list card by adding the card configuration in the overview page container XML or descriptor and provide an OData or static data source.
LANGUAGE: XML
CODE:
```xml
<!-- No snippet provided. Add card configuration to the overview page XML or manifest card section. -->
```

STEP: Add a list card to an overview page
DESCRIPTION: Insert a list card into the overview page by editing the page/cards XML and wiring the card to a data source (OData).
LANGUAGE: XML
CODE:
```xml
<!-- No snippet provided. Update overview page container XML with card element for list card. -->
```

STEP: Add a new contact view column to a table
DESCRIPTION: Add contact view column to a table in view XML and annotate CDS models (CAP/ABAP) to provide contact data or association; update column template and binding.
LANGUAGE: XML, CAP CDS, ABAP CDS
CODE:
```xml
<!-- No snippet provided. Modify table column definitions in view XML and add CDS annotations for contact fields. -->
```

STEP: Add a new section to an object page
DESCRIPTION: Add a new content section to an object page by editing the object page XML, adding new section/subsection nodes and mapping to the entity properties via bindings and annotations.
LANGUAGE: XML, CAP CDS, ABAP CDS
CODE:
```xml
<!-- No snippet provided. Edit objectPageLayout sections in view XML and update CDS annotations accordingly. -->
```

STEP: Add a new visual filter to the filter bar
DESCRIPTION: Add a visual filter control to the smart filter bar by updating page XML and exposing values via CDS; configure visual filter metadata.
LANGUAGE: XML, CAP CDS
CODE:
```xml
<!-- No snippet provided. Add visualFilter element and link to CDS annotated property. -->
```

STEP: Add a progress indicator column to a table
DESCRIPTION: Introduce a progress indicator column: update table XML with progress control and add CDS annotations for numeric progress values.
LANGUAGE: XML, CAP CDS, ABAP CDS
CODE:
```xml
<!-- No snippet provided. Define new column with ProgressIndicator control in table view XML. -->
```

STEP: Add a rating indicator column to a table
DESCRIPTION: Add a rating indicator column to a table by adding corresponding XML column and binding to rating value in CDS; ensure correct format and annotations.
LANGUAGE: XML, CAP CDS, ABAP CDS
CODE:
```xml
<!-- No snippet provided. Add RatingIndicator control binding in table column XML. -->
```

STEP: Add a smart chart facet to an object page
DESCRIPTION: Add a Smart Chart facet to an object page by updating view XML and manifest, enabling Smart Chart and connecting it to the entity set via annotations/metadata.
LANGUAGE: XML, Manifest Change
CODE:
```xml
<!-- No snippet provided. Add smartChart aggregator facet in object page XML and necessary manifest settings. -->
```

STEP: Add a smart micro chart column to a table
DESCRIPTION: Add a micro chart as a table column: update table XML and annotate CDS models to expose the measure/dimension fields.
LANGUAGE: XML, CAP CDS, ABAP CDS
CODE:
```xml
<!-- No snippet provided. Insert MicroChart control inside table column template and map CDS fields. -->
```

STEP: Add a stack card to an overview page
DESCRIPTION: Add a stack card to the overview page by adding card configuration to the overview layout XML and implementing data provider when needed.
LANGUAGE: XML
CODE:
```xml
<!-- No snippet provided. Add stack card configuration in overview cards section. -->
```

STEP: Add a static link list card to an overview page
DESCRIPTION: Add a static link list card by editing the page's card configuration (page descriptor or page configuration change), using static entries instead of OData.
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Add static card definition to page configuration JSON descriptor.
```

STEP: Add a table card to an overview page
DESCRIPTION: Add a table card to the overview page by configuring a card with an entity set, columns and filters in the overview page XML and CDS.
LANGUAGE: XML, CAP CDS
CODE:
```xml
<!-- No snippet provided. Configure tableCard and link to CAP CDS entity set. -->
```

STEP: Add a table building block
DESCRIPTION: Add a reusable table building block by creating/updating XML fragments and CDS/OData metadata (CAP and OData V4) for data binding and operations.
LANGUAGE: CAP CDS, OData V4
CODE:
```text
// No snippet provided. Create table fragment XML and expose entity in CDS for OData V4 consumption.
```

STEP: Add an action button
DESCRIPTION: Add an action button to a page or table: update XML view to include Button control and wire action handler in controller or extension.
LANGUAGE: XML
CODE:
```xml
<!-- No snippet provided. Insert Button control into toolbar or header in view XML and implement handler. -->
```

STEP: Add a value help to a field in the filter bar
DESCRIPTION: Add value help (F4) for a filter field by updating XML and wiring to a value help dialog/annotation, with data from CDS or OData.
LANGUAGE: XML, CAP CDS
CODE:
```xml
<!-- No snippet provided. Add valueHelp configuration on filter field and provide value list source in CDS. -->
```

STEP: Add an analytical card to an overview page
DESCRIPTION: Add an analytical card by configuring chart/KPI card in the overview page XML and linking to OData/CAP service with annotations for measures and dimensions.
LANGUAGE: XML, CAP CDS
CODE:
```xml
<!-- No snippet provided. Add analytical card configuration referencing CAP CDS entity/annotations. -->
```

STEP: Add and edit filter fields
DESCRIPTION: Add or edit filter fields on the filter bar by modifying filter bar XML and CDS annotations to expose and configure fields and defaults.
LANGUAGE: XML, CAP CDS, ABAP CDS
CODE:
```xml
<!-- No snippet provided. Modify smartFilterBar or filterBar control configurations and CDS annotations. -->
```

STEP: Add and edit table columns
DESCRIPTION: Add or update table columns in view XML, adjust CDS/ABAP CDS annotations for labels, formatters, and binding paths.
LANGUAGE: XML, CAP CDS, ABAP CDS
CODE:
```xml
<!-- No snippet provided. Update lineItem annotations in CDS or modify table column elements in view XML. -->
```

STEP: Add custom columns to the table using extensions
DESCRIPTION: Use extension points to add custom columns to tables: create extension fragment and register insertion point.
LANGUAGE: Extension Point
CODE:
```text
// No snippet provided. Place custom column fragment and extend table via manifest extension points.
```

STEP: Add an interactive chart to a list page
DESCRIPTION: Add an interactive chart to a list page by inserting chart control in the list page XML and mapping to CDS-provided measures/dimensions.
LANGUAGE: XML, CAP CDS
CODE:
```xml
<!-- No snippet provided. Add Chart control and provide data binding to CAP CDS entities. -->
```

STEP: Add a key performance indicator (KPI) tag to a page
DESCRIPTION: Add KPI tag to a page header or card by inserting KPI control in XML and provisioning CDS annotations for KPI values and thresholds.
LANGUAGE: XML, CAP CDS
CODE:
```xml
<!-- No snippet provided. Add KPI tag control and map to annotated CDS KPI properties. -->
```

STEP: Add multiple fields to a column in responsive tables
DESCRIPTION: Combine multiple fields within a single responsive table column by adding composite controls or formatting within the column template in XML and mapping to CDS fields.
LANGUAGE: XML, CAP CDS
CODE:
```xml
<!-- No snippet provided. Use layout controls inside a single column to show multiple fields. -->
```

STEP: Add semantic colors to visual filters
DESCRIPTION: Apply semantic color mapping to visual filters by configuring filter metadata and CSS classes/annotated values in CDS for OData V2/V4.
LANGUAGE: XML OData V2, XML OData V4, CAP CDS
CODE:
```xml
<!-- No snippet provided. Define semantic coloring rules for visual filters via annotations/metadata. -->
```

STEP: Add semantic highlights to line items in a table
DESCRIPTION: Add semantic highlighting (color/importance) to table rows or cells by updating XML and CDS annotations to calculate status and style classes.
LANGUAGE: XML, CAP CDS
CODE:
```xml
<!-- No snippet provided. Use semantic object/formatter or annotation-driven style class binding in table. -->
```

STEP: Add status colors and icons to a column in a table
DESCRIPTION: Add status-dependent colors and icons to a table column via UI controls (ObjectStatus, Icon) and CDS annotations providing state values.
LANGUAGE: XML, CAP CDS, ABAP CDS
CODE:
```xml
<!-- No snippet provided. Insert ObjectStatus/Icon controls with binding to CDS status fields and formatter logic. -->
```

STEP: Configure flexible column layout
DESCRIPTION: Enable/configure Flexible Column Layout behavior through manifest changes and view layout settings to control navigation/responsive behavior.
LANGUAGE: Manifest Change
CODE:
```json
// No snippet provided. Update manifest.json routing and sap.ui5 configuration for FlexibleColumnLayout.
```

STEP: Configure inbound navigation
DESCRIPTION: Configure inbound navigation targets and parameters via page configuration changes or manifest routing configuration.
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Add navigation target in page configuration or manifest routing targets. 
```

STEP: Configure multiple selection for a table
DESCRIPTION: Enable multi-select mode in tables via XML changes and manifest settings; ensure OData V2/V4 handling for batch operations is configured.
LANGUAGE: OData V2, OData V4, Manifest Change
CODE:
```xml
<!-- No snippet provided. Set selectionMode="MultiToggle" in table XML and update manifest for selection behavior. -->
```

STEP: Configure multiple views for tables
DESCRIPTION: Configure multiple table views (view variants) in XML and CDS annotations to offer different column sets or filters.
LANGUAGE: XML OData V2, XML OData V4, CAP CDS
CODE:
```xml
<!-- No snippet provided. Define multiple view variants in view XML and link to CDS properties. -->
```

STEP: Configure mass edit via dialog
DESCRIPTION: Configure mass edit functionality through page configuration changes: add mass edit action, dialog definition, and backend endpoint or CDS action.
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Add massEdit action and dialog configuration to page descriptor.
```

STEP: Configure object page header
DESCRIPTION: Configure what appears in the object page header by editing header XML and CDS/ABAP annotations to include title, attributes, and actions.
LANGUAGE: XML, CAP CDS, ABAP CDS
CODE:
```xml
<!-- No snippet provided. Modify object page header facets and bindings in view XML and CDS annotations for attributes. -->
```

STEP: Configure outbound navigation
DESCRIPTION: Configure outbound navigation actions and target definitions via XML view updates (navigation controls) and manifest entries for external targets.
LANGUAGE: XML
CODE:
```xml
<!-- No snippet provided. Add navigation control configuration and destructure parameters in view XML. -->
```

STEP: Configure selection of all rows in a table
DESCRIPTION: Enable select-all behavior in tables by updating manifest or table configuration to support global selection actions.
LANGUAGE: Manifest Change
CODE:
```json
// No snippet provided. Toggle selection settings in manifest or table configuration to enable select-all.
```

STEP: Configure side effects
DESCRIPTION: Define side effects for properties and actions via XML and CDS annotations so that changes refresh dependent data or UI areas.
LANGUAGE: XML, CAP CDS
CODE:
```xml
<!-- No snippet provided. Update sideEffect annotations in CDS or view metadata to trigger UI updates. -->
```

STEP: Configure spreadsheet export
DESCRIPTION: Add spreadsheet export configuration by changing page configuration to enable export action, columns, and formatting rules.
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Add export configuration to page descriptor with selected columns and formats.
```

STEP: Configure variant management for controls and pages
DESCRIPTION: Enable variant management and save/load variants for controls/pages via OData-based configuration, UI variant persistence settings, and manifest routes.
LANGUAGE: OData V2, OData V4
CODE:
```text
// No snippet provided. Configure VariantManagement control; persist variants via personalization/manifest settings.
```

STEP: Configure default grouping in a table
DESCRIPTION: Set default grouping on table load via XML settings and/or page configuration; use OData grouping or client-side grouping logic.
LANGUAGE: XML, OData V2, Page Configuration Change
CODE:
```xml
<!-- No snippet provided. Configure defaultGroupBy property or equivalent grouping settings in table/view XML or page config. -->
```

STEP: Configure auto load for a table
DESCRIPTION: Configure whether a table auto-loads its data on initial navigation via OData settings or manifest properties for both V2 and V4.
LANGUAGE: OData V2, OData V4
CODE:
```text
// No snippet provided. Adjust list report/table auto-load flags in manifest or view metadata.
```

STEP: Configure table type
DESCRIPTION: Choose and configure the table type (ResponsiveTable, GridTable, AnalyticalTable) via view XML and dataset binding settings for OData V2/V4.
LANGUAGE: OData V2, OData V4
CODE:
```xml
<!-- No snippet provided. Replace table control tag in view XML with desired table control and update bindings. -->
```

STEP: Define a filter facet
DESCRIPTION: Define a filter facet by adding filter facet XML configuration to filter bar or facet container and mapping to properties.
LANGUAGE: XML
CODE:
```xml
<!-- No snippet provided. Add <FilterFacet> element to smartFilterBar or facet container with binding. -->
```

STEP: Enable a Show Related Apps button
DESCRIPTION: Add Show Related Apps button via page configuration change to provide related apps navigation; update page descriptor.
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Add relatedApps configuration entry to page descriptor or toolbar configuration.
```

STEP: Enable condensed table layout
DESCRIPTION: Enable condensed table UI density for tables globally or per-table via manifest density or table properties.
LANGUAGE: Manifest Change
CODE:
```json
// No snippet provided. Set sapUiSizeCompact or specific table compact mode in manifest.json settings.
```

STEP: Enable data label in analytical charts
DESCRIPTION: Enable data labels in analytical charts by updating page configuration to turn on labels and formatting; connect to chart metadata settings.
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Add chartDataLabel configuration to page/card descriptor enabling labels.
```

STEP: Enable data label in smart charts and KPI cards
DESCRIPTION: Turn on data labels in smart charts and KPI cards through page configuration change (card or chart descriptor).
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Configure card/chart properties to show data labels in page configuration.
```

STEP: Enable draft toggle buttons
DESCRIPTION: Add draft toggle buttons in page toolbar via page configuration changes to switch between draft and non-draft modes.
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Add draft toggle button entries to page toolbar configuration in page descriptor.
```

STEP: Enable inline creation of table entries
DESCRIPTION: Enable inline creation/editing in tables by configuring editable table mode via page configuration and OData annotations/actions.
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Set inlineCreate settings in page configuration and ensure OData service supports create.
```

STEP: Enable object creation in a table via dialog
DESCRIPTION: Enable creating objects using a creation dialog tied to a table by manifest or view-level configuration for dialog definition and backend create action handling.
LANGUAGE: Manifest Change
CODE:
```json
// No snippet provided. Add creationDialog definition to manifest or page descriptor and link to entity/create action.
```

STEP: Enable semantic date range on smart filter bar
DESCRIPTION: Enable semantic date range picker in smart filter bar via page configuration changes to present predefined ranges (Today, Last 7 days, etc.).
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Add semanticDateRange configuration to smart filter bar settings in descriptor.
```

STEP: Extend forms in sections
DESCRIPTION: Use extension points to extend section forms; add extension fragments or views and register them to be included in section layout at runtime.
LANGUAGE: Extension Point
CODE:
```text
// No snippet provided. Create extension fragments under webapp/extension and register via manifest extension points.
```

STEP: Extend object page headers using extensions
DESCRIPTION: Use extension points to add custom header controls/content to object page headers; implement extension controller or fragment and register.
LANGUAGE: Extension Point
CODE:
```text
// No snippet provided. Place header extension fragment and configure insertion point in manifest/descriptor.
```

STEP: Set default filter values for the filter bar
DESCRIPTION: Configure default filter values by updating filter bar XML or CDS annotations to define initial property values upon page load.
LANGUAGE: XML, CAP CDS
CODE:
```xml
<!-- No snippet provided. Set defaultValue in smartFilterBar field definitions or provide defaultValue annotation in CDS. -->
```

STEP: Set selection limit for tables
DESCRIPTION: Configure selection limit (max selectable rows) via page configuration changes so UI enforces selection constraints for batch operations.
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Add selectionLimit property in page descriptor or table configuration.
```

STEP: Specify layout for the card container
DESCRIPTION: Define the layout (grid, column) for the card container by modifying page configuration to set container layout and card sizes.
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Update cardContainer layout settings in page descriptor.
```

STEP: Specify refresh interval for cards
DESCRIPTION: Set automatic refresh interval for cards by changing page configuration to schedule periodic refreshes and data retrieval.
LANGUAGE: Page Configuration Change
CODE:
```json
// No snippet provided. Add refreshInterval property to card configuration in page descriptor.
```


--------------------------------

**TITLE**: Define Application Structure with SAP Fiori Tools Page Map

**INTRODUCTION**: Step-by-step developer-focused reference for launching and using the SAP Fiori Tools Page Map (Application Modeler) to modify application-wide settings and page structure for SAP Fiori elements (and experimental SAPUI5 freestyle support). Includes exact UI actions, file paths, and links to underlying templates.

**TAGS**: fiori-tools, application-modeler, page-map, sapui5, sap-fiori, odata-v4

**STEP**: 1 — Include SAP icon stylesheet (project files)
**DESCRIPTION**: Ensure your project references the SAP icon stylesheet used by the Page Map UI (example link used in documentation). Keep this file path if replicating the docs or UI samples.
**LANGUAGE**: HTML
**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**STEP**: 2 — Launch the Page Map
**DESCRIPTION**: Three ways to open the Page Map in VS Code. Select your SAP Fiori elements project from the workspace when prompted.
- From Application Info (see Project Functions > Application Information).
- From the Command Palette: open the palette, type the command, then select the project.
- From the folder context menu: right-click the project folder and choose Show Page Map.
**LANGUAGE**: text
**CODE**:
```
Command Palette: Fiori: Show Page Map
Keystroke (mac / win): Cmd/Ctrl + Shift + P
Context Menu: Right-click project folder → Show Page Map
Reference: ../Project-Functions/application-information-c3e0989.md
```

**STEP**: 3 — Application Settings (global)
**DESCRIPTION**: When Page Map opens, the default view shows Application Settings. Update values here to apply application-wide configuration immediately. These values are reflected in the project files (webapp/manifest.json and SAPUI5 flexibility records).
- Title: change application title.
- Description: change application description.
- Flex Enabled: controls UI Adaptation (UI flexibility).
  - true — Enables UI Adaptation.
  - false — Disables UI Adaptation.
  - default — undefined.
- Toggle Properties Panel Visibility: hide/show the properties panel in the Page Map UI.
- Images referenced in docs:
  - images/Flex_Enabled_48e56f4.png
  - images/Page_Map_bd3ac9b.png
**LANGUAGE**: text
**CODE**:
```
Affected file: webapp/manifest.json
Note: Changes are applied immediately and update SAPUI5 flexibility artifacts.
External docs: https://sapui5.hana.ondemand.com/#/topic/f1430c0337534d469da3a56307ff76af
```

**STEP**: 4 — Add a New Page (Fiori elements)
**DESCRIPTION**: Add a standard page (e.g., ObjectPage) via the Page Map UI.
- Click the Add New Page icon (SAP icon shown in UI header).
- From Select Page Type, choose "ObjectPage".
- Click Add.
- In Navigation, select the target entity the page will navigate to (list depends on current navigation context).
- For details on editable page elements and entity choices, open Configure Page Elements.
**LANGUAGE**: text
**CODE**:
```
UI actions:
1) Click Add New Page (header icon)
2) Select: ObjectPage
3) Click Add
4) Navigation: choose entity
Reference: configure-page-elements-047507c.md
```

**STEP**: 5 — Add a Custom Page (OData V4 only)
**DESCRIPTION**: For OData V4 projects you can add a CustomPage from templates provided by Page Map.
- Click Add New Page icon in the header of a page file.
- Select "CustomPage" from Select Page Type, then click Add.
- In Navigation, choose the entity the custom page targets.
- Under "Select your view", choose one:
  - Create a New View — Page Map will create a new view file.
  - Use Existing View — Page Map lists prepared sample custom views.
- Enter or select a View Name in the View Name field.
- Click Add. A success message appears (example: "Custom Page ProcessFlow added successfully").
- Note: The Page Map custom page templates for OData V4 are published in the open-source package @sap-ux/fe-fpm-writer (see link).
**LANGUAGE**: text
**CODE**:
```
UI actions:
1) Header → Add New Page
2) Select: CustomPage → Add
3) Navigation: select target entity
4) Select your view: [Create a New View | Use Existing View]
5) View Name: enter or choose
6) Click Add → success message
Reference (templates): https://github.com/SAP/open-ux-tools/blob/main/packages/fe-fpm-writer/README.md
```

**STEP**: 6 — Configure Page Elements (edit page properties)
**DESCRIPTION**: Open Configure Page Elements to edit page-level properties and outline. Access it from:
- the Configure Page (pencil) icon in the header of a page file, or
- the tree view of the Application Modeler.
Changes applied here update webapp/manifest.json and SAPUI5 flexibility artifacts automatically.
**LANGUAGE**: text
**CODE**:
```
Open: Configure Page (pencil icon) OR tree view → Configure Page Elements
Effect: Updates written to webapp/manifest.json and UX flexibility changes
Reference: configure-page-elements-047507c.md
Affected file path: webapp/manifest.json
```

**STEP**: 7 — Delete a Page
**DESCRIPTION**: Remove a page from the application via the Delete Page (wastebasket) icon in the page header. Note: SAPUI5 freestyle support in Page Map is experimental and has limitations (for example, adding/deleting pages in freestyle apps may not be supported).
**LANGUAGE**: text
**CODE**:
```
UI action: Click Delete Page (wastebasket icon) in page header
Warning: Freestyle projects — experimental support with limited operations (e.g., cannot add/delete pages)
```

**STEP**: 8 — References and External Links
**DESCRIPTION**: Useful links and artifact references used by Page Map and templates.
**LANGUAGE**: text
**CODE**:
```
Page Map templates (OData V4): https://github.com/SAP/open-ux-tools/blob/main/packages/fe-fpm-writer/README.md
Fiori layouts: https://experience.sap.com/fiori-design-web/list-report-floorplan-sap-fiori-element/
SAPUI5 Flexibility docs: https://sapui5.hana.ondemand.com/#/topic/f1430c0337534d469da3a56307ff76af
Project references in docs: ../Project-Functions/application-information-c3e0989.md
Configure Page Elements doc: configure-page-elements-047507c.md
```
--------------------------------

**TITLE**: Develop with a Guide — Fiori Tools Guided Development Reference

**INTRODUCTION**: Step-by-step, code-focused reference for using the Fiori Tools "Develop with a Guide" feature. Contains the exact CSS and inline icon markup used by the guide UI, UI behavior rules, parameter/table handling, keyboard interactions, and view-mode toggle instructions. Use this to script UI automation, implement the guide integration, or generate code snippets for developer guidance.

**TAGS**: fiori-tools, guide, sap-icons, annotations, UI, keyboard, parameters, split-view

**STEP**: 1 — Add SAP icon stylesheet

**DESCRIPTION**: Import the SAP icon CSS used by the guide UI. Place this link in the HTML head or the appropriate shared layout file so the guide, icons, and icon markup render correctly.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**STEP**: 2 — Icon markup used by the guide UI (expand, information)

**DESCRIPTION**: The guide UI uses inline <span> elements with specific classes to render SAP icon glyphs. Use the exact markup when replicating the guide UI or injecting icon markup into generated snippets. The "Expand view" icon and "Information" icon examples are shown below. Keep the class names intact.

**LANGUAGE**: HTML

**CODE**:
```html
<!-- Expand view icon (used in top-right of guide window) -->
<span class="SAP-icons-V5"></span>

<!-- Information icon (used to link to further documentation in Guide details) -->
<span class="SAP-icons-V5"></span>
```

**STEP**: 3 — Launch guide and split / expand behavior

**DESCRIPTION**: Start a selected guide by clicking Start Guide under the chosen guide description. Default presentation is side-by-side split view showing: (A) guides list, (B) selected guide window. Implement or automate the following behaviors:
- Allow resizing by dragging the vertical divider between the windows.
- Provide an Expand view control (see icon markup in Step 2) in the upper-right of the guide window to exit split view and expand the guide.
- Auto-hide the guides list when the application window is reduced below the responsive threshold.

**LANGUAGE**: text

**CODE**:
```text
Start Guide -> open side-by-side view
Resizable divider -> drag vertical line between windows
Expand view -> click <span class="SAP-icons-V5"></span> in guide top-right
Responsive behavior -> hide guides list when window width < responsiveThreshold
```

**STEP**: 4 — Guide content and step composition (what a step contains)

**DESCRIPTION**: Each guide step provided to developers contains these elements. When programmatically generating or validating guide steps, ensure all the elements below are present and correctly linked:
- Target file(s) to change (path + filename)
- Brief description of the required change
- Code snippet with a sample implementation
- Parameters that control placeholders in the snippet (drop-downs, free text, selections)
- Optional: list of Annotation Terms (when the guide involves annotations)
- Tooltip text for Annotation Terms (hover behavior)

This is the authoritative structure for each step; code generation should populate the snippet and parameters, validate parameter inputs, then apply or copy the resulting snippet.

**LANGUAGE**: text

**CODE**:
```text
GuideStep {
  targetFiles: [ "path/to/target.file" ],
  description: "Short description of the change",
  snippet: "Code sample with placeholders",
  parameters: [
    { name: "ParamA", type: "select/text", options: [...] },
    { name: "ParamB", type: "text" }
  ],
  annotations?: [ "AnnotationTerm1", "AnnotationTerm2" ],
  tooltips: { "AnnotationTerm1": "Description..." }
}
```

**STEP**: 5 — Parameter input behavior and error handling

**DESCRIPTION**: Parameter UI supports single and multiple selections, dynamic snippet updates, and inline validation. Implement the following behaviors in code generation flows:
- Allow selecting multiple values from dropdowns where indicated.
- After all parameters are provided, enable two actions per step: Insert/apply snippet or Copy snippet.
- On validation error, scroll focus to the invalid parameter and block the Insert Snippet action until corrected.
- Re-enable the Insert Snippet button when the user changes the parameter to a valid value.

**LANGUAGE**: text

**CODE**:
```text
ParameterFlow:
  - renderParameters(step.parameters)
  - onParameterChange -> validateParameter(param)
    - if invalid -> scrollTo(param); disableInsertSnippet()
    - if valid -> enableInsertSnippetIfAllValid()
  - InsertSnippet -> applySnippet(snippet, parameters)
  - CopySnippet -> copyToClipboard(resolvedSnippet)
```

**STEP**: 6 — Table of parameters for screen elements (Add / Reorder behavior)

**DESCRIPTION**: Several guides expose an editable table of parameters (columns, filters, selection fields). The UI and automation must support:
- Adding rows via Add buttons above the table (e.g., "Add column", "Add selection field").
- Dropdown on Add to choose variants (e.g., "Add Data Field" or "Add Data Field for Annotation") which changes available parameter inputs for the new row.
- If table has >5 rows, render an additional Add button below the table to reduce scrolling.
- Reordering rows by drag-and-drop and by keyboard navigation. The order affects generated code; show a loading indicator while the snippet updates.

Screenshots referenced (preserve file paths for UI integration or tests):
- images/FioriTools_DevelopwithGuide_141af07.png
- images/FT_Moving_Columns_fd5f702.png

**LANGUAGE**: text

**CODE**:
```text
TableButtons:
  topAddButton: "Add column" | "Add selection field" (with dropdown)
  bottomAddButton: render if rows > 5

OnAdd(newType):
  createRow(newType)
  renderRowParameters(for newType)

OnRowReorder:
  - dragAndDrop -> updateRowOrder()
  - keyboardNavigation -> updateRowOrder()
  showLoadingIndicatorUntil(snippetUpdateComplete)
```

**STEP**: 7 — Keyboard navigation to reorder rows

**DESCRIPTION**: Provide keyboard accessibility to rearrange table rows. Implement focus traversal and key handling exactly as described:
- Tab into the parameter collection until focus reaches the rearrangement controls.
- Use Left/Right arrow keys to toggle between Up and Down arrow controls.
- Press Enter to move the currently focused row in the chosen direction.
- While the reordering operation processes, display a loading indicator and update the code snippet in the background.

**LANGUAGE**: text

**CODE**:
```text
KeyboardReorder:
  onFocus(collection):
    while focus within parameters:
      if Tab -> moveFocusToRearrangementArrows()
  onLeftArrow -> selectUpArrow()
  onRightArrow -> selectDownArrow()
  onEnter -> performMove(selectedDirection)
  showLoadingIndicator()
  updateSnippetAsync()
```

**STEP**: 8 — Guide view modes and settings toggles

**DESCRIPTION**: The guide supports two main modes and two description visibility states. Provide a Settings UI (gear icon) to toggle modes. Implement the following toggles and behavior:
- Wizard mode (default): show one step per screen, navigation controls Next/Back. Also allow clicking numbered step tiles to jump.
- Full view mode: show all steps in a single scrollable view, maintain clickable step tiles for quick navigation.
- Show Descriptions (default): display step description and parameter descriptions.
- Hide Descriptions: hide step descriptions and parameter descriptions to compact the UI.

Settings UI reference image path:
- images/SettingsMenu_1bd394c.png

Settings behavior mapping for automation:

**LANGUAGE**: text

**CODE**:
```text
Settings:
  renderGearIcon() -> click opens settings menu (images/SettingsMenu_1bd394c.png)
  toggles:
    wizardMode: boolean (default true)
    showDescriptions: boolean (default true)

ModeBehavior:
  if wizardMode:
    renderSingleStepView()
    navButtons: ["Back", "Next"]
  else:
    renderFullScrollableView()

  if showDescriptions:
    show(step.description)
    show(parameter.description)
  else:
    hide(step.description)
    hide(parameter.description)
```

**STEP**: 9 — Annotation Terms (tooltips and use)

**DESCRIPTION**: When a guide step requires creating annotations, the guide lists Annotation Terms. Implement:
- Tooltip on hover over each Annotation Term that contains definition and usage notes.
- Option to select annotation-driven alternatives when adding parameters (e.g., "Add Data Field for Annotation").
- Ensure generated snippets reference the chosen annotation terms and include necessary imports/metadata in the target files.

**LANGUAGE**: text

**CODE**:
```text
AnnotationTerm {
  id: "com.example.Annotation",
  label: "Annotation Name",
  tooltip: "Purpose and usage of the annotation term",
  requiredImports: [ "namespace.for.annotation" ]
}

OnAnnotationSelection(term):
  injectAnnotationUsage(term) into targetFileSnippet
  addImportsIfMissing(term.requiredImports)
```


--------------------------------

**TITLE**: Developing an Application (SAP Fiori Tools — Application Modeler)

**INTRODUCTION**: Use SAP Fiori Tools — Application Modeler to preview and customize a generated SAP Fiori elements application. This guide lists actionable steps to integrate required assets, navigate the Application Modeler UI (Page Map, Page Editor, Property Panel), and generate mock data with AI. Keep referenced file paths and links for automation or tooling that needs to access these artifacts.

**TAGS**: fiori-tools, sap-fiori-elements, application-modeler, preview, page-map, page-editor, property-pane, mock-data, ai

STEP: 1 — Include required stylesheet asset

DESCRIPTION: Ensure the application includes the SAP icons stylesheet. Place the following snippet in your HTML head (or appropriate template/file) so the preview and editor render icons correctly. Keep the relative path exactly as in the project structure.

LANGUAGE: HTML

CODE:
```html
<!-- loioa9c004397af5461fbf765419fc1d606a -->
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: 2 — Open the Application Modeler (Page Map)

DESCRIPTION: Launch the Application Modeler extension to view the Page Map. The Page Map provides a visual representation of pages, navigations, and service entities used by the app. From the Page Map you can:
- Add or remove pages and navigations.
- Inspect global page settings that apply project-wide.
- Navigate to editing tools (Page Editor, Property Panel).

Preserve and reference this documentation link when automating or scripting flows: ../Generating-an-Application/SAP-Fiori-Elements/sap-fiori-elements-1488469.md and ../Previewing-an-Application/previewing-an-application-b962685.md

Include the Page Map image for UI mapping or visual tests:
- images/FIORI_TOOLS_PAGE_MAP_96cfbae.png

LANGUAGE: None

CODE:
```text
Page Map image path: images/FIORI_TOOLS_PAGE_MAP_96cfbae.png
Documentation links:
- Generated app: ../Generating-an-Application/SAP-Fiori-Elements/sap-fiori-elements-1488469.md
- Previewing: ../Previewing-an-Application/previewing-an-application-b962685.md
```

STEP: 3 — Open the Page Editor from Page Map

DESCRIPTION: In the Page Map click the :pencil2: (Configure Page) icon to open the Page Editor. Use the Page Editor to view the page outline and selectable configurable nodes. This is the entry point to modify page structure and to open the Property Panel for node-level configuration.

LANGUAGE: None

CODE:
```text
Action: Click the "Configure Page" (pencil) icon in Page Map to open the Page Editor.
```

STEP: 4 — Configure page elements via Page Editor and Property Panel

DESCRIPTION: Use the Page Editor to select any node (UI element or layout node). When a node is selected:
- The Property Panel opens showing configurable properties for that node.
- Update properties in the Property Panel.
- Saved changes are converted into corresponding artifact changes or UI flexibility changes within the project's folder structure.
- After save, the Application Modeler triggers a refresh of the preview.

Include UI image references for mapping automation and tests:
- Page Editor: images/FIORI_TOOLS_PAGE_EDITOR_f3232a4.png
- Property Panel: images/FIORI_TOOLS_PROPERTY_PANE_257df73.png

LANGUAGE: None

CODE:
```text
Workflow:
1. Open Page Editor (from Page Map).
2. Select node -> Property Panel opens.
3. Edit properties -> Save.
4. Changes persisted to project artifacts or UI flexibility.
5. Preview refreshed automatically.

Image paths:
- Page Editor: images/FIORI_TOOLS_PAGE_EDITOR_f3232a4.png
- Property Panel: images/FIORI_TOOLS_PROPERTY_PANE_257df73.png
```

STEP: 5 — Generate Mock Data with AI

DESCRIPTION: Use the Application Modeler feature "Generating Mock Data with AI" to create meaningful, contextually relevant mock data. The tool uses entity property names to infer and generate sample values. Use this when previewing pages that require realistic sample data.

Reference docs and image:
- Docs: ../Previewing-an-Application/generating-mock-data-with-ai-815c310.md
- Image: images/Generate_Mock_Data_with_AI_34759c0.png

LANGUAGE: None

CODE:
```text
Action: Run "Generate Mock Data with AI" from Application Modeler.
Inputs: Entity property names and metadata.
Output: Mock payloads saved into project mock data artifacts (used by preview).
Docs path: ../Previewing-an-Application/generating-mock-data-with-ai-815c310.md
Image path: images/Generate_Mock_Data_with_AI_34759c0.png
```
--------------------------------

**TITLE**: Diagnostics for the XML Annotation Language Server (fiori-tools)

**INTRODUCTION**: The XML Annotation Language Server validates annotation files against project metadata, annotation vocabularies, and the OData specification. Validation runs when you open an annotation file and retriggers on each change to annotation files, metadata, or project structure. Use these diagnostics to find errors, warnings, and info messages and to apply suggested Quick Fixes.

**TAGS**: fiori-tools, diagnostics, annotation, LSP, OData, metadata, quick-fix, problems-panel, code-completion

**STEP**: 1 — What diagnostics validate and when

**DESCRIPTION**: Diagnostics validate annotation files against:
- Project metadata
- Annotation vocabularies
- OData specification

Validation triggers:
- When you open an annotation file
- On every change to annotation files, metadata, or project structure

Limitations:
- Annotations embedded in the metadata and dynamic expressions are not supported by Diagnostics.

**LANGUAGE**: text

**CODE**:
```text
Validation triggers:
- on file open
- on file save / change
- on metadata or project structure change

Unsupported:
- Annotations embedded in metadata
- Dynamic expressions
```

**STEP**: 2 — Assets referenced in docs (preserve link)

**DESCRIPTION**: Keep the provided UI assets reference as-is if copying or rendering documentation. Preserve file paths when reusing project docs.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**STEP**: 3 — Viewing diagnostics in the editor

**DESCRIPTION**: View diagnostic messages by:
- Hovering the highlighted code in the annotation file to see the message tooltip
- Opening the Problems panel to see aggregated messages

Navigation:
- Click a message in the Problems panel to jump to the related location in the annotation file.

**LANGUAGE**: text

**CODE**:
```text
View diagnostics:
- Hover over highlighted code in the annotation file
- Open Problems panel (Editor > View > Problems)

Navigate:
- Click a Problems panel entry to open the corresponding file location
```

**STEP**: 4 — Fixing diagnostics with Code Completion

**DESCRIPTION**: When the diagnostic is related to an incorrect element or value, use editor code completion to pick a suggested correct value. Trigger completion with the editor's completion shortcut and select from suggestions.

**LANGUAGE**: text

**CODE**:
```text
Trigger code completion:
- Windows: Ctrl + Space
- macOS:  Cmd  + Space

Action:
- Start typing or open completion, then select a suggested value to apply it.
```

**STEP**: 5 — Fixing diagnostics with Quick Fixes (Light Bulb)

**DESCRIPTION**: If Quick Fix actions are provided, apply them:
- Click the light bulb icon shown with the diagnostic error/warning
- Choose one of the suggested Quick Fix actions to apply the change automatically

**LANGUAGE**: text

**CODE**:
```text
Quick Fix:
- Click the light bulb icon appearing beside the diagnostic
- Select a suggested fix (applies change automatically)
```

**STEP**: 6 — When to edit local copies vs. backend metadata

**DESCRIPTION**: Diagnostics for local copies of metadata and backend annotation files are informational only. Do not rely on editing local copies to fix service-side issues. Apply fixes to the original service metadata on the backend; changes to local copies do not affect the deployed app or preview with real service data.

**LANGUAGE**: text

**CODE**:
```text
Important:
- Diagnostics on local copies are informational only.
- Make fixes in the original service metadata (backend).
- Local edits do NOT affect deployed app or real-service preview.
```
--------------------------------

**TITLE**: XML Annotation Quick Info (Fiori Tools)

**INTRODUCTION**: Quick Info displays documentation for OData annotation terms, record types, and properties directly in annotation files and in code-completion suggestions. Use it to quickly learn type, purpose, targets, lifecycle (experimental/deprecated), and whether a property is mandatory or optional. Content is sourced from OData vocabularies.

**TAGS**: fiori-tools, XML, OData, annotations, quick-info, hover, code-completion, documentation, vocabularies

**STEP**: 1 — Include icon stylesheet for renderable icons

**DESCRIPTION**: Ensure the icon stylesheet is available to the documentation viewer so UI icons render correctly (used by Fiori tooling docs). Add the provided link element where your documentation HTML resources are assembled or served.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**STEP**: 2 — Hover to view Quick Info in annotation files

**DESCRIPTION**: Hover the mouse pointer over any annotation term, record type, or property in the annotation (.xml/.annot.xml) file to open the Quick Info hover window. The hover displays documentation extracted from the corresponding OData vocabularies, typically answering:
- Type and purpose of the term/record/property
- Valid targets for the annotation term
- Whether the term/record/property is experimental or deprecated
- Whether the property is mandatory or optional

Use this when reading or editing annotation files to validate meanings and constraints inline.

**LANGUAGE**: text

**CODE**:
```text
Action: Hover the mouse pointer over an annotation term/record/property inside your annotation file.
Result: A hover window appears showing documentation sourced from OData vocabularies.
```

**STEP**: 3 — Show Quick Info for completion suggestions

**DESCRIPTION**: While browsing the code completion list (IntelliSense), expand the Quick Info documentation for each suggestion so you can inspect definitions without accepting the suggestion. The expanded documentation updates as you navigate the list. Close it by repeating the keybinding or clicking the close icon.

Keyboard shortcuts:
- Windows / Linux: Ctrl + Space
- macOS: Command + Space

You can also click the Information icon in the completion popup to pin/expand the documentation. Close using the :x: (Close) icon or the same keyboard shortcut.

**LANGUAGE**: text

**CODE**:
```text
Open completion list: Ctrl+Space (Win/Linux) or Cmd+Space (macOS)
Pin/expand suggestion info: Click the Information icon in the completion popup
Close expanded info: Ctrl/Cmd + Space again or click the :x: (Close) icon
```

**STEP**: 4 — Note about source and availability

**DESCRIPTION**: Quick Info content is limited to what the OData vocabularies provide. If a vocabulary lacks documentation for a term/record/property, the Quick Info hover or completion pane may be sparse or empty. When automating or generating code, fallback logic should handle missing descriptions (e.g., use term name and target hints, or consult external docs).

**LANGUAGE**: text

**CODE**:
```text
Note: Exact Quick Info content depends on availability in OData vocabularies. If a term lacks vocabulary documentation, display fallback information (term name, targets, and source vocabulary) or reference external documentation.
```
--------------------------------

**TITLE**: Edit in Source Code (Fiori tools — Property Panel)

**INTRODUCTION**: This document describes how the "Edit in source code" affordance appears in the Fiori tools Property Panel and how to locate the annotation definition in source files. It includes the required SAP icon stylesheet reference and the exact icon markup used in the panel. Use this when generating UI code that exposes a link/icon for jumping to the annotation definition.

**TAGS**: fiori-tools, fiori, annotations, property-panel, edit-in-source, sap-icons, vscode, business-application-studio

STEP: 1 — Include SAP icons stylesheet

DESCRIPTION: The Property Panel uses SAP icon fonts. Add the SAP icons stylesheet reference so the "Edit in source code" icon renders correctly.

LANGUAGE: HTML

CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: 2 — Render the "Edit in source code" icon

DESCRIPTION: Use the SAP icon markup adjacent to the annotation/property field in the Property Panel. The icon shown below corresponds to the "Edit in source code" action. Place this span next to the text field or control where you want to offer the jump-to-source action.

LANGUAGE: HTML

CODE:
```html
<span class="SAP-icons-TNT-V3"></span> (*Edit in source code*)
```

STEP: 3 — Display an image reference for documentation or UI preview

DESCRIPTION: Use the referenced image for documentation pages or UI previews. The image file path as shipped in the documentation is provided here.

LANGUAGE: HTML

CODE:
```html
<img src="images/EditinSource_675234e.png" alt="Edit in source code screenshot"/>
```

STEP: 4 — Behavior and environment-specific notes (implementation guidance)

DESCRIPTION: When generating or testing code that surfaces the Edit-in-Source action, apply these behaviors:
- In the Property Panel, place the icon next to editable and non-editable properties where a corresponding annotation exists.
- If multiple annotation definitions exist for the same UI element, show a pop-up that lists the candidate files. The user picks one file to jump to its definition.
  - Note: The multiple-definitions pop-up is available only in Visual Studio Code.
  - In SAP Business Application Studio (BAS), only the first annotation is displayed — do not show the multiple-definition pop-up in BAS.
- If the Page Editor cannot interpret complex configuration for a UI feature, do not render the field-level control (dropdown/input) or the icon. Instead, render an "Edit in source code" link with the same jump-to-source behavior; the link should open the annotation file/definition directly.

LANGUAGE: Plaintext

CODE:
```text
- Multiple definitions pop-up: VS Code only.
- BAS: show only the first annotation (no pop-up).
- Complex/unsupported configurations: render "Edit in source code" link instead of icon or field control.
```
--------------------------------

**TITLE**: Filter Fields — Add, Configure, Move, Delete, and Maintain for Fiori List Report

**INTRODUCTION**: This guide provides concise, action-oriented instructions and minimal annotation examples for implementing filter fields (compact filters and visual filters) in SAP Fiori list reports. Use these steps to: add/remove filter fields, add visual filters (charts), update or generate local annotations, and maintain filter/visual-filter properties. Relevant files: local annotation file (annotations XML) and manifest.json.

**TAGS**: fiori-tools, annotations, UI.SelectionFields, UI.Chart, UI.PresentationVariant, Common.ValueList, manifest.json, CAP, analytics

STEP: Add a Filter Field
DESCRIPTION: Add a compact filter (filter field with value help) to the Filter Bar of a list report. This generates or updates the UI.SelectionFields annotation in your local annotation file. Note blocked properties: properties annotated with UI.Hidden, UI.HiddenFilter, or listed as NonFilterableProperties in Capabilities.FilterRestrictions are not available.
LANGUAGE: UI/Manual
CODE:
```html
<!-- Optional stylesheet reference used in docs -->
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: Add a Filter Field — Actions
DESCRIPTION: UI actions to perform in the Fiori Tools Page Map:
- Open Page Map for the list report page.
- Click Configure Page (pencil icon).
- Click Add (+) next to Filter Bar > Filter Fields.
- Search/select properties and click Add.
- Result: local annotation file is created/updated with UI.SelectionFields entries referencing the selected property paths.
LANGUAGE: None
CODE:
```text
Files touched:
- Local annotation file (e.g., annotations.xml or annotations.local.xml)
- manifest.json (control configuration updated if visual filter added)
```

STEP: UI.SelectionFields — Example Annotation
DESCRIPTION: Example XML fragment showing UI.SelectionFields with ordered PropertyPath elements. The sequence here controls filter sequence in runtime.
LANGUAGE: XML
CODE:
```xml
<Annotations Target="MyService.MyEntityType">
  <Annotation Term="UI.SelectionFields">
    <Collection>
      <PropertyPath>PropertyA</PropertyPath>
      <PropertyPath>PropertyB</PropertyPath>
      <PropertyPath>PropertyC</PropertyPath>
    </Collection>
  </Annotation>
</Annotations>
```

STEP: Add a Visual Filter (analytics-enabled service)
DESCRIPTION: Add a visual filter (bar or line chart) using an analytically enabled entity. Workflow:
- Open Page Map -> Configure Page -> Add -> Filter Bar > Filter Fields.
- If analytics enabled and no visuals present, choose Add Visual Filters.
- Select the time-based or other property; choose chart type (bar or line for time-based; only bar for others).
- Select analytically enabled entity (value source), groupable property (dimension), and choose/create measure (aggregated property or existing measure).
- Click Add. This generates UI.Chart, UI.PresentationVariant, Common.ValueList annotations and references UI.SelectionFields. manifest.json is updated with control configuration referencing the value list/presentation variant.
LANGUAGE: Manual/Annotations
CODE:
```xml
<!-- Example generated annotations (minimal) -->
<Annotations Target="MyService.AnalyticEntity">
  <!-- Chart based on chosen dimension and measure -->
  <Annotation Term="UI.Chart" Qualifier="MyVisualFilter">
    <Record>
      <PropertyValue Property="Dimensions">
        <Collection>
          <Record>
            <PropertyValue Property="Value" Path="DimensionProperty"/>
          </Record>
        </Collection>
      </PropertyValue>
      <PropertyValue Property="Measures">
        <Collection>
          <Record>
            <PropertyValue Property="Value" Path="MeasureProperty"/>
          </Record>
        </Collection>
      </PropertyValue>
    </Record>
  </Annotation>

  <!-- PresentationVariant referencing the chart -->
  <Annotation Term="UI.PresentationVariant" Qualifier="MyVisualFilter">
    <Record>
      <PropertyValue Property="Visualizations">
        <Collection>
          <AnnotationPath>@UI.Chart#MyVisualFilter</AnnotationPath>
        </Collection>
      </PropertyValue>
    </Record>
  </Annotation>
</Annotations>

<!-- Common.ValueList referencing presentation variant via qualifier (example reference) -->
<!-- UI.SelectionFields updated separately to include the compact filter property -->
```

STEP: Visual Filter — Measure Creation Rules
DESCRIPTION: When creating a new measure for visual filter charts:
- You may create a measure based on an aggregable property and supported aggregation (if no existing measure with same combo exists).
- Custom aggregation-based properties for measures are not supported for new measures.
- If using existing measures, select one defined with custom or transformation aggregations.
LANGUAGE: Manual
CODE:
```text
Notes:
- New measure allowed only if no existing measure uses same value source + aggregation.
- Transformation-aggregated measures update Common.Label on Analytics.AggregatedProperty.
```

STEP: Moving Filter Fields (change filter order)
DESCRIPTION: Change compact filter order to adjust runtime filter sequence and visual filter sequence (visual filters follow compact filter order when compact filter for same property exists).
Options:
- Drag & drop Filter Fields in Page Map.
- Use Move Up / Move Down icons.
- Keyboard: focus Move Up/Down and press Enter.
Effect: Reorder PropertyPath entries in UI.SelectionFields; update local annotation file with new sequence.
LANGUAGE: XML
CODE:
```xml
<!-- Example: reorder UI.SelectionFields collection to reflect new order -->
<Annotation Term="UI.SelectionFields">
  <Collection>
    <PropertyPath>PropertyB</PropertyPath> <!-- moved up -->
    <PropertyPath>PropertyA</PropertyPath>
    <PropertyPath>PropertyC</PropertyPath>
  </Collection>
</Annotation>
```

STEP: Deleting a Filter Field
DESCRIPTION: Delete a filter field from the Filter Fields list:
- Select filter field in Page Map outline.
- Click Delete (trash icon).
Effects:
- PropertyPath entry removed from UI.SelectionFields in local annotation file.
- Common.Label annotations are NOT removed automatically (may be reused elsewhere).
- For visual filters: deleting the visual filter removes manifest.json control configuration; local annotations remain until you run Remove Unused Local Annotations.
LANGUAGE: Manual / XML
CODE:
```text
Files to update:
- local annotation file: remove corresponding <PropertyPath> entry from UI.SelectionFields collection.
- manifest.json: control configuration entry for the visual filter removed.
```

STEP: Maintain Filter Field Properties
DESCRIPTION: Editable compact filter properties include Label, External ID, Text, Text Arrangement, Display Type. Visual filter-specific properties include Measure Label, Dimension Label, Dimension Text/Arrangement, Measures/Currencies, Scale Factor, Number of Fractional Digits, Sort Order, Fixed Values (filters).
Actions to change label globally:
- In Page Map outline click Filter Fields.
- Edit Label in Property Panel.
Notes:
- Removing label text does not delete existing @title or Common.Label annotations in upper/lower layers.
- Changing a label affects all occurrences unless overridden.
LANGUAGE: Manual/XML
CODE:
```xml
<!-- Example: Common.Label applied to a property -->
<Annotations Target="MyService.MyEntityType/PropertyA">
  <Annotation Term="Common.Label" String="New Label for PropertyA"/>
</Annotations>
```

STEP: Measure & Dimension Labels, Scale Factor, Fractional Digits, Sort Order
DESCRIPTION:
- Change Measure/Dimension labels in the Filter Property Panel (Measures/Dimensions table > Label column). If no label defined, property name is shown.
- Scale Factor: default automatic; explicit values selectable. Scale factor is defined in UI.DataPoint referenced from UI.Chart.
- Number of fractional digits: set 0/1/2; for currency measures decimals respected only when scale factor defined.
- Sort Order: Add Sort Property (defaults to ascending), change to Descending to invert. Sorting not supported for line charts or bar charts using other property sorting.
LANGUAGE: XML/Manual
CODE:
```xml
<!-- Example: UI.DataPoint referenced by UI.Chart to define scaling/format -->
<Annotation Term="UI.DataPoint" Qualifier="MyVisualFilter">
  <Record>
    <PropertyValue Property="Value" Path="MeasureProperty"/>
    <PropertyValue Property="Scaling">
      <Record>
        <PropertyValue Property="Factor" String="1000"/> <!-- example scale factor -->
      </Record>
    </PropertyValue>
    <PropertyValue Property="NumberOfFractionalDigits" Int="2"/>
  </Record>
</Annotation>
```

STEP: Fixed Values (limit visual filter data)
DESCRIPTION: Limit visual filter data by adding one or more fixed filters:
- Click Add Filters in Property Panel for the visual filter.
- Default suggested property is the dimension; you may change to any numeric, string, or Boolean property of the visual filter entity.
- For each filter define: Include/Exclude, Comparison Operator, Value (or Low/High for Between/Not Between).
Notes:
- Value defaults to empty string; update to matching values or chart shows no data.
- Filters are applied to the chart and restrict the bars shown.
- You can reorder filters (drag & drop or Move Up/Down) and delete individual filters (trash icon).
LANGUAGE: Manual
CODE:
```text
Filter definition elements:
- Include/Exclude: boolean flag
- Operator: EQ, NE, GT, LT, Between, NotBetween, etc.
- Value: single value or Low Value + High Value for range operators
```

STEP: CAP Node.js Note (analytics)
DESCRIPTION: If using CAP Node.js, some analytical features depend on the OData parser. Verify compatibility per CAP release notes.
LANGUAGE: Manual/Link
CODE:
```text
Reference:
https://cap.cloud.sap/docs/releases/oct22?q=odata_new_parser#alp-sflight
```
--------------------------------

**TITLE**: Footer Actions for Object Page (Fiori Tools)

**INTRODUCTION**: This doc explains how footer actions on an Object Page are determined, constrained, maintained, and moved. It is targeted at code-generation agents and developers implementing UI annotations for actions on the page footer. Use these steps to locate, add, update, or relocate footer actions in your CDS/annotation-based metadata.

**TAGS**: fiori-tools, annotations, UI.DataFieldForAction, UI.Identification, footer, object-page, actions, CDS

**STEP**: 1 — Identify Footer Actions

**DESCRIPTION**: Footer actions are created from UI.DataFieldForAction records that are referenced in the UI.Identification annotation applied to the main entity of the page. Only those actions that are part of the UI.Identification and have Determining set to true are shown in the Footer.

- Check the main entity's UI.Identification annotation for Data entries containing $Type: "UI.DataFieldForAction".
- Confirm the containing UI.Identification object has Determining: true.

**LANGUAGE**: CDS

**CODE**:
```CDS
// Example (pseudocode): UI.DataFieldForAction inside UI.Identification must be present
annotate MyService.MyEntity with {
  @UI.Identification: [
    {
      Determining: true,
      Data: [
        { $Type: "UI.DataFieldForAction", Action: "Approve" },
        { $Type: "UI.DataFieldForAction", Action: "Reject" }
      ]
    }
  ]
};
```

**STEP**: 2 — Restriction: External Navigation Actions

**DESCRIPTION**: External navigation actions are not allowed in the Footer regardless of the Determining value. Before adding an action to the footer, verify it is not an external navigation action.

**LANGUAGE**: Text

**CODE**:
```Text
// Rule: External navigation actions cannot be shown in the Footer.
// If Action is external navigation, remove or relocate it (header or other UI areas if allowed).
```

**STEP**: 3 — Add / Delete / Maintain Footer Actions

**DESCRIPTION**: Manage footer actions the same way you manage table actions based on UI.DataFieldForAction. Use the same annotation patterns and tooling described in the Table Actions documentation.

- Follow the procedures in: table-actions-da1931b.md
- When adding a new action, ensure it is referenced in UI.Identification (see Step 1) so it can appear in the Footer.

**LANGUAGE**: Text

**CODE**:
```Text
// Reference: Use the same patterns and tooling as described in
// table-actions-da1931b.md to add/delete/maintain actions.
```

**STEP**: 4 — Annotation Properties and Their Effects

**DESCRIPTION**:
- Importance and RequiresContext: These properties are not relevant for header actions (i.e., they do not affect whether an action appears in the Footer/header).
- Criticality: This property influences the ordering of actions in the Object Page footer. Changing Criticality from None to Positive/Negative (or vice versa) automatically updates the action sequence in the Page Editor outline view.

**LANGUAGE**: Text

**CODE**:
```Text
// Notes:
// - @UI.Importance and @UI.RequiresContext: irrelevant for header/footer determination.
// - @UI.Criticality: changing value will reorder actions in the Page Editor outline.
```

**STEP**: 5 — Moving Actions Between Footer, Header, and Form Sections

**DESCRIPTION**: Actions can be relocated between the Footer, page header, and Form sections that are bound to the main entity. Ensure the action is not semantically highlighted; semantically highlighted actions cannot be moved.

- You may move any non-semantic actions from Footer to header or to Form sections based on the main entity.
- Verify the UI annotations after moving (UI.Identification and target UI areas) so the action appears in the intended location.

**LANGUAGE**: Text

**CODE**:
```Text
// Move rules:
// - Allowed: Footer <-> Header, Footer <-> Form sections (if action is not semantically highlighted)
// - Not allowed: Moving semantically highlighted actions
// After moving, update annotations (e.g., UI.Identification, target area) accordingly.
```
--------------------------------

**TITLE**: Form and Object Page — Fiori Tools Reference and Implementation Skeleton

**INTRODUCTION**: This document summarizes the supported elements for a Fiori Form and Object Page and provides a concise, action-oriented implementation skeleton for code generation tools. Use the skeleton to scaffold an SAPUI5 Object Page view and replace placeholders with your actual fragments, form controls, and tables. Links to detailed element docs and SAP Design Guidelines are included for reference.

**TAGS**: fiori-tools, object-page, form, UI5, SAP Fiori, uxap, ObjectPageLayout

STEP: 1 — Purpose and Design Reference

DESCRIPTION: Use the SAP Design Guidelines to align layout and behavior of the Object Page with Fiori UX standards. Follow the linked guideline for general rules on header, sections, responsiveness, and behavior.

LANGUAGE: URL/Reference

CODE:
```text
SAP Design Guidelines (Object Page):
https://experience.sap.com/fiori-design-web/object-page/
```

STEP: 2 — Supported Elements (links to detailed docs)

DESCRIPTION: These are the supported elements you can include in the Form and Object Page. For each element, open the linked document to get element-specific properties, recommended patterns, and code examples. Use consistent IDs and binding paths across header, sections, and footer.

LANGUAGE: Markdown/Links

CODE:
```text
Supported elements of the Form and Object Page:
- Header:
  - link: header-a05d7fc.md#loioa05d7fc1bbbf42a0ade9fb50f6b58b56
- Form Section:
  - link: form-section-4102b3d.md
- Table Section:
  - link: table-section-fc59378.md
- Identification Section:
  - link: identification-section-b83f501.md
- Group Section:
  - link: group-section-1894c47.md
- Footer:
  - link: footer-1b391bd.md
```

STEP: 3 — Object Page XML View Skeleton (SAPUI5)

DESCRIPTION: Scaffold an Object Page view using sap.uxap.ObjectPageLayout. Replace placeholders (/* ... */) and fragment includes with your generated fragments / controls. Keep binding contexts consistent between header, sections, and footer.

LANGUAGE: XML

CODE:
```xml
<!-- File: view/ObjectPage.view.xml -->
<mvc:View
  controllerName="my.app.controller.ObjectPage"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  xmlns:uxap="sap.uxap">
  <uxap:ObjectPageLayout
    id="objectPage"
    showTitleInHeaderContent="true"
    headerContent="{/HeaderModel}">
    <!-- Header / Object Header -->
    <uxap:headerContent>
      <!-- Example ObjectHeader; replace with your objectHeader fragment or controls -->
      <ObjectHeader
        id="objectHeader"
        title="{HeaderModel>/title}"
        number="{HeaderModel>/number}"
        intro="{HeaderModel>/intro}">
        <!-- Add attributes/markers/actions as needed -->
      </ObjectHeader>
    </uxap:headerContent>

    <!-- Sections -->
    <uxap:sections>

      <!-- Identification Section -->
      <uxap:ObjectPageSection id="identificationSection" title="Identification">
        <uxap:ObjectPageSubSection id="identSubSection">
          <!-- Use a Form fragment or controls for identification fields -->
          <Form id="identForm">
            <layoutData>
              <ResponsiveGridLayout />
            </layoutData>
            <FormContainer>
              <FormElement>
                <Label text="ID" />
                <Input value="{/Entity/ID}" />
              </FormElement>
              <FormElement>
                <Label text="Name" />
                <Input value="{/Entity/Name}" />
              </FormElement>
            </FormContainer>
          </Form>
        </uxap:ObjectPageSubSection>
      </uxap:ObjectPageSection>

      <!-- Group/Form Section -->
      <uxap:ObjectPageSection id="formSection" title="Form Section">
        <uxap:ObjectPageSubSection id="formSubSection">
          <!-- Replace with generated Form Section fragment -->
          <Form id="mainForm">
            <FormContainer>
              <FormElement>
                <Label text="Field 1" />
                <Input value="{/Entity/Field1}" />
              </FormElement>
              <FormElement>
                <Label text="Field 2" />
                <Input value="{/Entity/Field2}" />
              </FormElement>
            </FormContainer>
          </Form>
        </uxap:ObjectPageSubSection>
      </uxap:ObjectPageSection>

      <!-- Table Section -->
      <uxap:ObjectPageSection id="tableSection" title="Related Items">
        <uxap:ObjectPageSubSection id="tableSubSection">
          <!-- Replace with your Table fragment or a sap.m.Table / sap.ui.table.Table -->
          <Table id="itemsTable" inset="false" items="{/Entity/Items}">
            <headerToolbar>
              <Toolbar>
                <Title text="Items" />
                <!-- Add actions, search, filters as needed -->
              </Toolbar>
            </headerToolbar>
            <columns>
              <Column>
                <Text text="Item ID" />
              </Column>
              <Column>
                <Text text="Description" />
              </Column>
            </columns>
            <items>
              <ColumnListItem>
                <cells>
                  <Text text="{ID}" />
                  <Text text="{Description}" />
                </cells>
              </ColumnListItem>
            </items>
          </Table>
        </uxap:ObjectPageSubSection>
      </uxap:ObjectPageSection>

    </uxap:sections>

    <!-- Footer -->
    <uxap:footer>
      <!-- Replace with footer fragment or controls (e.g., actions, Save/Cancel) -->
      <OverflowToolbar id="objectFooter">
        <ToolbarSpacer />
        <Button id="saveBtn" text="Save" press="onSave" />
        <Button id="cancelBtn" text="Cancel" press="onCancel" />
      </OverflowToolbar>
    </uxap:footer>
  </uxap:ObjectPageLayout>
</mvc:View>
```

STEP: 4 — Controller Hooks and Binding Tips

DESCRIPTION: Implement controller hooks for actions, navigation, and lifecycle. Bind models at component/route level and ensure the Object Page's context is set before opening (e.g., setBindingContext or bindElement). Use stable IDs and follow accessibility labels.

LANGUAGE: JavaScript

CODE:
```javascript
// File: controller/ObjectPage.controller.js
sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";
  return Controller.extend("my.app.controller.ObjectPage", {
    onInit: function () {
      // Example: set model or wait for route match to bind context
      // this.getView().setModel(this.getOwnerComponent().getModel("entityModel"));
    },
    onSave: function () {
      // Implement save logic, validations, and model submit
    },
    onCancel: function () {
      // Implement navigation back or reset changes
    }
  });
});
```

STEP: 5 — Implementation Checklist

DESCRIPTION: Use this checklist while generating code:
- Ensure header, sections, and footer anchors/IDs are unique.
- Keep model binding paths consistent across header and sections.
- Replace placeholder fragments with generated fragments for Form, Table, Group, and Identification sections.
- Use SAP Design Guidelines for responsive behavior and accessible labels.
- Add actions in header/footer as required (e.g., Edit, Save, Delete) and wire controller event handlers.

LANGUAGE: Checklist

CODE:
```text
Implementation Checklist:
- Unique IDs for ObjectPageLayout, sections, subsections, controls.
- Bind view to the entity model before rendering (bindElement or setBindingContext).
- Replace placeholder Form/Table fragments with generated sections from templates.
- Wire controller methods for onSave, onCancel, navigation, and routing.
- Validate fields and handle message/toast patterns for errors/success states.
```
--------------------------------

**TITLE**: Form Section — Add, Move, Delete, and Maintain UI.FieldGroup / UI.ReferenceFacet Annotations

**INTRODUCTION**: This doc specifies the exact UI actions and annotation side-effects when working with Form Sections in the Fiori Tools Page Editor. Use these steps to implement UI changes and to update or verify underlying annotation files (UI.FieldGroup, UI.ReferenceFacet, UI.Facet). It includes UI steps, expected annotation modifications, multi-select and drag/drop behavior, deletion cleanup, and property behavior (Label, Display On Demand, Hidden).

**TAGS**: fiori-tools, Fiori, annotations, UI.FieldGroup, UI.ReferenceFacet, UI.Facet, Object Page, Form Section, i18n, CAP, CDS

STEP: Include SAP icons CSS (document header)
DESCRIPTION: Add the SAP icons stylesheet reference used by the editor previews and documentation.
LANGUAGE: HTML
CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: Add Form Section (UI steps)
DESCRIPTION: Use the Page Editor to add a new Form Section tab to an Object/Form Entry Page. The UI steps below produce annotation changes described in the following STEP.
LANGUAGE: text
CODE:
```
1. Open the Object/Form Entry Page in the Page Editor.
2. In the outline, select the section node and click the + (Add) icon.
   - A dropdown shows supported section types.
3. Choose "Add Form Section".
   - A pop-up "Add Form Section" appears with a Label field.
4. Enter the section title in Label and click Add.
   - If translation is needed, see Internationalization (i18n): internationalization-i18n-eb427f2.md
   - A new section tab appears in the application preview and Object Page. Add fields to the new section afterwards.
   - For adding fields: see Adding Filter Fields: filter-fields-0b84286.md#loio0b8428645243486680ffa22c0b541039__addingfilterfields
```

STEP: Annotation changes applied when adding a Form Section
DESCRIPTION: After adding a form section via the editor, the tool updates annotations. Confirm or implement the following changes in your annotation files. If UI.Facet was absent, it will be added; if present on a lower layer, it will be overridden locally. In CAP/CDS scenarios, a using statement may be added to the overridden file.
LANGUAGE: text
CODE:
```
- A new UI.FieldGroup is added with an empty Data property.
- A UI.ReferenceFacet record is added to the UI.Facets annotation with properties:
  - Target: an annotation path pointing to the created UI.FieldGroup
  - Label: string value containing the user-entered label
  - ID: string value auto-generated from the label
- If UI.Facet annotation is not present on the entity, it is applied to the entity associated with the Object Page.
- If UI.Facet exists on an underlying layer, the annotation on this layer will be overridden in the local file.
- In CAP CDS, a using statement is added to the overridden file when applicable.
```

STEP: Move Form Section (reorder header sections)
DESCRIPTION: Reorder header sections in the Page Editor by drag & drop. Reordering updates UI.Facets records sequence; the runtime reads UI.HeaderFacets sequence to render sections.
LANGUAGE: text
CODE:
```
- Drag and drop a section to change its position within Header Sections.
  - When dropped, records in UI.Facets are reordered to match the new sequence.
  - The SAP Fiori app renders sections using the record order in UI.HeaderFacets.

Move multiple sections:
1. Ctrl + Click to select multiple sections in the outline.
2. Drag the selected group and drop at the new position.
  - Multiple selected items are moved together and UI.Facets is reordered accordingly.
```

STEP: Delete Form Section
DESCRIPTION: Delete a Form Section node in the Page Editor. The editor removes the UI.ReferenceFacet record; unreferenced UI.FieldGroup annotations must be removed with a cleanup procedure.
LANGUAGE: text
CODE:
```
1. In the outline, select the section node.
2. Click the delete (wastebasket) icon.
3. Confirm in the Delete Confirmation pop-up by clicking Delete.

Notes:
- This action deletes the UI.ReferenceFacet record from UI.Facets.
- To remove the unreferenced UI.FieldGroup annotation, run the cleanup procedure to delete unreferenced annotations.
```

STEP: Maintain Form Section Properties — Label
DESCRIPTION: Update the section label through the Properties panel. This updates the Page Editor and application preview immediately.
LANGUAGE: text
CODE:
```
1. Select the section in the Page Editor.
2. In the Properties pane, change the Label text.
   - The label change updates both the Page Editor and the application preview.
   - See Label reference: appendix-457f2e9.md#loiod44832d99bdf4f73ba14cdbb16dc9301
```

STEP: Maintain Form Section Properties — Display On Demand
DESCRIPTION: When a Form Section or Identification Section is used as a subsection inside a Group Section, the Property Panel shows a Display On Demand toggle. Enable to hide this subsection under "Show More" by default; disable to always display. The editor records this as an embedded annotation on the UI.ReferenceFacet.
LANGUAGE: text
CODE:
```
- Default: Display On Demand is deactivated.
- When activated: an embedded annotation @UI.PartOfPreview with boolean false is added to the respective UI.ReferenceFacet record.
  Example embedded annotation entry (conceptual):
    "@UI.PartOfPreview": false
- When deactivated: the embedded annotation is removed.
- If the section is moved and no longer contained in a Group Section, the embedded annotation is removed.
- Applicable pages: Form Section (form-section-4102b3d.md) and Identification Section (identification-section-b83f501.md) when used inside Group Section (group-section-1894c47.md).
```

STEP: Maintain Form Section Properties — Hidden
DESCRIPTION: Hidden behavior is available in the Properties pane. Refer to the Hidden appendix for exact semantics and annotation patterns.
LANGUAGE: text
CODE:
```
- For implementation and annotation details, see Hidden: appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0
```
--------------------------------

**TITLE**: Group Section — Add, Edit, Move, Delete (Fiori Tools, UI.Facets)

**INTRODUCTION**: This document summarizes actionable, code-oriented steps for working with Group Sections in Fiori Tools Page Editor. It describes the runtime annotation changes (UI.Facets / UI.CollectionFacet), UI actions (add, add subsection, move, delete), and how to edit resulting annotations in source code. Use these steps when generating code or automation that modifies page annotations or implements editor actions.

**TAGS**: fiori-tools, UI.Facets, UI.CollectionFacet, annotations, page-editor, group-section, i18n, edit-in-source

STEP: Include UI icon stylesheet (editor preview)
DESCRIPTION: Ensure the preview/editor includes the SAP icon stylesheet used by the Page Editor UI. This is the top-level static include used by the documentation preview.
LANGUAGE: HTML
CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: Add Group Section (UI: Page Editor action → annotation change)
DESCRIPTION: User action in Page Editor: open the Object or Form Entry Page, navigate to the section layer, click Add → Add Group Section, enter a Label and confirm. Programmatically, this inserts a new UI.CollectionFacet entry into the UI.Facets annotation. The new UI.CollectionFacet must include a Label and an empty Facets array. If UI.Facets does not exist, create it in the changeable annotation file.
LANGUAGE: UI Annotations (JSON example)
CODE:
```json
{
  "UI.Facets": [
    {
      "@type": "UI.CollectionFacet",
      "Label": { "String": "Group Title" },
      "Facets": []
    }
  ]
}
```

STEP: Add Group Section (UI Annotations XML example)
DESCRIPTION: Same as above but shown in XML annotation format — add a UI.CollectionFacet record with Label and an empty Facets collection.
LANGUAGE: XML
CODE:
```xml
<Annotations Target="YourService.YourEntityType">
  <Annotation Term="UI.Facets">
    <Collection>
      <Record Type="UI.CollectionFacet">
        <PropertyValue Property="Label">
          <String>Group Title</String>
        </PropertyValue>
        <PropertyValue Property="Facets">
          <Collection/>
        </PropertyValue>
      </Record>
    </Collection>
  </Annotation>
</Annotations>
```

STEP: Add Subsection inside a Group Section (editor action → annotation update)
DESCRIPTION: From the Page Editor, expand the Group Section, click Add under Subsections, choose a supported section type (e.g., Form Section), provide a Label, and confirm. Programmatically, append a facet entry to the parent UI.CollectionFacet.Facets array. The Facets array holds facet records (one per subsection). Use the editor’s "Edit in Source Code" for manual annotation edits or i18n keys for labels when required.
LANGUAGE: UI Annotations (JSON placeholder)
CODE:
```json
{
  "UI.Facets": [
    {
      "@type": "UI.CollectionFacet",
      "Label": { "String": "Group Title" },
      "Facets": [
        /* add facet objects here for each subsection, e.g. form section records */
      ]
    }
  ]
}
```

STEP: Subsection Form Section behavior (editor note)
DESCRIPTION: Once a Form Section is added as a subsection, you may perform all classic form-section operations (add/edit/move/delete fields). Use the Form Section documentation for field-level operations and the i18n workflow to prepare labels for translation.
LANGUAGE: None
CODE:
```text
Reference: See classic Form Section documentation for field operations and i18n label handling.
```

STEP: Move Sections (drag-and-drop behavior → annotation ordering)
DESCRIPTION: Sections inside a group can be reordered by drag-and-drop within the same group, between groups, or moved to the top level. The editor updates the Facets array ordering in UI.Facets to reflect the new structure. For automation, reorder entries in the Facets collection and persist the updated annotation file.
LANGUAGE: None
CODE:
```text
Action required: Reorder elements in UI.Facets[].Facets to match the new visual order.
```

STEP: Delete Group Section or Subsection (editor action → annotation removal)
DESCRIPTION: From the Page Editor, select the section and click Delete → confirm. This removes the corresponding UI.CollectionFacet record from UI.Facets (and its nested facet content). After deletion, run the annotation cleanup procedure to remove any unreferenced annotations left behind.
LANGUAGE: UI Annotations (JSON before / after example)
CODE:
```json
// Before deletion: UI.Facets contains the collection facet to be removed
{
  "UI.Facets": [
    {
      "@type": "UI.CollectionFacet",
      "Label": { "String": "Group Title" },
      "Facets": [ /* ... */ ]
    },
    { /* other facets */ }
  ]
}

// After deletion: remove the entire UI.CollectionFacet record for the deleted group
{
  "UI.Facets": [
    { /* other facets remain */ }
  ]
}
```

STEP: Cleanup unreferenced annotations (post-delete)
DESCRIPTION: After deleting a group section, ensure you invoke the project's annotation cleanup procedure/tool to remove any unreferenced annotations that belonged to the deleted section. This step prevents stale metadata from remaining in the changeable annotation file.
LANGUAGE: None
CODE:
```text
Action required: Run annotation cleanup to delete unreferenced annotation fragments after deletion.
```

STEP: Maintain Group Section Properties — Label
DESCRIPTION: To change the group section label via the editor: select the section, edit the Label field in the properties pane and confirm. Programmatically: update the Label property of the corresponding UI.CollectionFacet record. For translatable labels, replace the literal string with an i18n key and use the i18n file.
LANGUAGE: UI Annotations (JSON example)
CODE:
```json
{
  "UI.Facets": [
    {
      "@type": "UI.CollectionFacet",
      "Label": { "String": "New Group Title" }, // or use i18n key reference
      "Facets": []
    }
  ]
}
```

STEP: Maintain Group Section Properties — Hidden
DESCRIPTION: The editor supports a Hidden property for sections. To hide/show a group section, change the Hidden property in the properties pane. If editing annotations manually, set the appropriate annotation property (see platform-specific documentation for the exact annotation/term used to mark a section hidden).
LANGUAGE: None
CODE:
```text
Action required: Toggle the section's Hidden property in the editor or set the equivalent annotation flag in source.
```

STEP: Source edit & i18n references
DESCRIPTION: Use the Page Editor’s "Edit in Source Code" feature to jump to annotation fragments created/modified by these actions. Prepare label properties for translation following the project i18n workflow.
LANGUAGE: None
CODE:
```text
References:
- Defining and Adapting Sections: https://ui5.sap.com/#/topic/facfea09018d4376acaceddb7e3f03b6
- Internationalization (i18n): internationalization-i18n-eb427f2.md
- Edit in Source Code: edit-in-source-code-7d8e942.md
- Form Section reference: form-section-4102b3d.md
- Move Basic Fields: basic-fields-2953503.md#movebasicfields
```
--------------------------------

**TITLE**: Object Page Header — Fiori Tools: properties, actions, sections, and micro-chart sorting

**INTRODUCTION**: Practical, code-focused guidance for configuring the Object Page header in SAP Fiori tools using annotation-driven properties. Covers UI.HeaderInfo mapping, header actions (standard, annotation-based, custom), adding/moving/deleting header sections, micro chart types and requirements, and how to enable sorting via PresentationVariant. Use these actionable annotation/manifest examples and property names when generating or modifying annotation files or manifest.json.

**TAGS**: fiori-tools, annotations, UI.HeaderInfo, UI.Facets, UI.HeaderFacets, UI.PresentationVariant, object-page, micro-chart, manifest.json

STEP: Add SAP icons stylesheet to project
DESCRIPTION: Include the SAP icons stylesheet (path shown in documentation) so icon URLs like sap-icon://accept render correctly in the UI.
LANGUAGE: HTML
CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: Set header annotation properties (UI.HeaderInfo)
DESCRIPTION: When any header property is set, create or update the UI.HeaderInfo annotation. Use these keys to control header content: TypeName, TypeNamePlural, Title, ImageUrl, Initials, TypeImageUrl. If UI.HeaderInfo is defined in a lower layer (service), the values show with a (base layer) suffix until changed locally.
LANGUAGE: JSON
CODE:
```json
"UI.HeaderInfo": {
  "TypeName": "MyType",                    /* displayed on top of object page */
  "TypeNamePlural": "MyTypes",             /* used as plural label (table header on list page) */
  "Title": { "Path": "MainTitleProperty" },/* choose entity property or set to None */
  "ImageUrl": { "Path": "ImageProperty" }, /* path to string property or 1:1 nav property */
  "Initials": { "Path": "InitialsProperty" },/* path to string property or 1:1 nav property */
  "TypeImageUrl": "sap-icon://accept"      /* SAP icon URL, example value shown */
}
```

STEP: Use Icon URL (TypeImageUrl) values
DESCRIPTION: Use SAP icon URLs for TypeImageUrl. Example format below — keep exact string format (sap-icon://<iconName>).
LANGUAGE: TEXT
CODE:
```
sap-icon://accept
```

STEP: Hide standard header actions (Edit/Delete) via annotations
DESCRIPTION: Hiding standard actions applies entity-set level annotations: UI.UpdateHidden for Edit and UI.DeleteHidden for Delete. Use boolean annotations on the entity set (or modify generated annotations) to control static hiding; for dynamic hiding use Hide by Property mapped to a boolean property.
LANGUAGE: JSON
CODE:
```json
/* Example: apply to the entity set annotations to hide buttons */
"EntitySetName": {
  "UI": {
    "UpdateHidden": true,   /* hides Edit */
    "DeleteHidden": true    /* hides Delete */
  }
}
```

STEP: Add annotation-based header actions
DESCRIPTION: Add header actions using UI.Identification records on the main entity:
- UI.DataFieldForAction (Determining = false or omitted) — in-app actions
- UI.DataFieldForIntentBasedNavigation — intent-based external navigation
- UI.DataFieldForActionGroups — action menus (use only annotation editor)
Keep in mind: Importance and RequiresContext are not relevant for header actions; Criticality affects action order in header; action menus do not support Criticality.
LANGUAGE: JSON
CODE:
```json
"UI.Identification": {
  "RecordType": "Collection",
  "Records": [
    { "RecordType": "UI.DataFieldForAction", "Label": "MyAction", "Action": "MyActionFunction" },
    { "RecordType": "UI.DataFieldForIntentBasedNavigation", "Label": "OpenApp", "SemanticObject": "TargetApp" },
    { "RecordType": "UI.DataFieldForActionGroups", "Actions": [ /* UI.DataFieldForAction records */ ] }
  ]
}
```

STEP: Add a header section (Page Editor workflow)
DESCRIPTION: Programmatic/authoring steps to create header sections (Form, Data Point, Progress, Rating, Micro Chart). Key constraints:
- Form: add fields manually after creating the section.
- Data Point: numeric/text; can set criticality and tooltip; optionally specify measure/currency.
- Progress: default target 100; set target type (constant/property) and criticality.
- Rating: default target 5; modify target in properties.
- Micro Chart: chart type (Area, Bullet, Column, Line, Radial, Comparison, Harvey, Stacked Bar) — many types require a 1:n navigation entity as Value Source.
After generation, properties are editable in Property Panel.
LANGUAGE: TEXT
CODE:
```
Steps (Page Editor):
1. Open Page Editor for object page.
2. Click Add (+) next to Header Sections.
3. Select section type and provide required fields:
   - Form: Label
   - Data Point / Progress / Rating: Value Source Property
   - Micro Chart: Chart Type -> if chart requires 1:n, select Value Source entity and measures/dimensions.
4. Save. Then edit generated properties in Property Panel as needed.
```

STEP: Header section facts: creation, movement, deletion and underlying annotations
DESCRIPTION: Annotations and effects to consider when adding/moving/deleting header sections:
- Adding/reordering sections updates the UI.Facets collection.
- At runtime the UI.HeaderFacets annotation sequence determines section rendering order.
- Moving sections in the editor reorders UI.Facets records.
- Deleting a section removes the UI.ReferenceFacet record from UI.Facets.
- Run the cleanup procedure afterward to remove unreferenced annotations (e.g., UI.FieldGroup, UI.PresentationVariant).
LANGUAGE: TEXT
CODE:
```
Annotation implications:
- UI.Facets: collection order reflects editor order
- UI.ReferenceFacet: each header section is referenced here; deletion removes this record
- UI.HeaderFacets: used by runtime to read header facet sequence
- Cleanup required to remove unreferenced UI.FieldGroup / UI.PresentationVariant entries
```

STEP: Micro chart types and Value Source constraints
DESCRIPTION: Summary of micro chart types, required source entities, and common properties:
- Area, Column, Line, Comparison, Stacked Bar: require a 1:n navigation entity as Value Source (measures and dimension from that entity).
- Bullet, Radial, Harvey: values may come from same entity or 1:1.
- Each chart type includes Label, Description, Hidden and chart-specific properties (Target Value, Dimension, Measures, Maximum/Minimum, Criticality Source, PresentationVariant reference).
LANGUAGE: TEXT
CODE:
```
Common requirement: For area/line/column/comparison/stacked-bar charts:
- Choose Value Source = 1:n associated entity
- Map measures and dimensions to properties of that entity
```

STEP: Enable micro chart sorting via PresentationVariant and manifest minUI5Version
DESCRIPTION: To sort micro chart data in header sections:
- Set Presentation Variant: Annotation to a UI.PresentationVariant annotation (choose New).
- In that PresentationVariant, define Sort Order entries (Property + Direction). Multiple sort properties can be ordered.
- Required: minUI5Version in manifest.json must be at least "1.130" to enable micro chart sorting.
LANGUAGE: JSON
CODE:
```json
/* manifest.json: ensure minUI5Version >= 1.130 */
{
  "sap.ui5": {
    "minUI5Version": "1.130"
  }
}

/* PresentationVariant skeleton with SortOrder entries referenced from micro chart header section */
"UI.PresentationVariant": {
  "Qualifier": "MyMicroChartPV",
  "SortOrder": [
    { "Property": "Date", "Descending": true },
    { "Property": "Value", "Descending": false }
  ]
}
```

STEP: PresentationVariant usage in Page Editor
DESCRIPTION: How to wire PresentationVariant to micro chart header section:
- Set Presentation Variant: Annotation to New to create a UI.PresentationVariant.
- Under Presentation Variant: Sort Order -> Add Sort Property -> choose Property and Direction.
- To remove sorting, set Presentation Variant: Annotation to None; run cleanup to remove unreferenced UI.PresentationVariant annotations.
LANGUAGE: TEXT
CODE:
```
PresentationVariant workflow:
1. Presentation Variant: Annotation = New (creates UI.PresentationVariant#Qualifier)
2. Under Sort Order -> Add Sort Property -> select Property and Direction
3. Reorder sort properties as necessary
4. To remove: Presentation Variant: Annotation = None, then run cleanup to remove unreferenced annotations
```

STEP: Cleanup after deletion or annotation changes
DESCRIPTION: After deleting sections or removing annotation references, run the annotation cleanup utility to remove unreferenced annotations (UI.FieldGroup, UI.PresentationVariant, etc.) so the annotation file stays clean.
LANGUAGE: TEXT
CODE:
```
Cleanup actions:
- Remove unreferenced UI.FieldGroup annotations
- Remove unreferenced UI.PresentationVariant annotations and qualifiers
- Ensure UI.Facets only contains active UI.ReferenceFacet entries
```
--------------------------------

**TITLE**: Identification Section — Add / Move / Delete / Maintain (Fiori Tools)

**INTRODUCTION**: Short, actionable instructions for programmatic or UI-driven modifications of the Identification Section in a Fiori Elements Object/Form Entry Page. Explains how the editor operations map to annotation changes (UI.Identification, UI.Facets, UI.ReferenceFacet) and includes the relevant icon stylesheet reference.

**TAGS**: fiori-tools, UI.Identification, UI.Facets, UI.ReferenceFacet, i18n, drag-and-drop, page-editor, annotations

STEP: 1 — Add Identification Section

DESCRIPTION: Use the Page Editor to insert an Identification Section into an Object/Form Entry Page when UI.Identification is not yet defined or not referenced in UI.Facets. This action creates or references the UI.Identification annotation and updates UI.Facets accordingly. Identification sections cannot be subsections, cannot contain actions (use header/footer actions instead), and only one Identification Section may exist per page. You can provide a label prepared for translation (see i18n link).

- Editor actions:
  1. Open the Object/Form Entry Page in the Page Editor.
  2. In the outline, locate the section node and click the Add (+) icon.
  3. Select "Add Identification Section" from the dropdown.
  4. In the "Add Identification Section" popup, enter a Label and click Add.
- Resulting annotation behavior:
  - If UI.Identification does not exist: a UI.Identification annotation (no qualifier) is generated and referenced in UI.Facets.
  - If UI.Identification already exists: the existing UI.Identification is referenced in UI.Facets (no new UI.Identification generated).
- Translation: prepare the Label for translation (see internationalization-i18n-eb427f2.md).

LANGUAGE: HTML

CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: 2 — Move Identification Section

DESCRIPTION: Reorder sections in the Page Editor using drag-and-drop. The editor updates the UI.Facets collection to reflect the new order. The runtime Fiori application renders sections in the sequence defined by the records in UI.Facets.

- Single-section move:
  1. Drag the desired section node to the target position in the outline.
  2. Drop to update the UI.Facets order.
- Move multiple sections:
  1. Select multiple section nodes using Ctrl + Click.
  2. Drag the selected group and drop to the new position.
- Effect: When dropped, the editor reorders the records in UI.Facets; rendering follows the UI.Facets sequence.

LANGUAGE: Plaintext

CODE:
```text
Behavior mapping:
- Editor drag-and-drop -> updates UI.Facets record order
- Application rendering order = order of UI.Facets records
```

STEP: 3 — Delete Identification Section

DESCRIPTION: Remove the Identification Section from the page and update annotations.

- Editor actions:
  1. In the outline, select the Identification Section node.
  2. Click the Delete (wastebasket) icon to open the Delete Confirmation popup.
  3. Click Delete to confirm.
- Effect on annotations:
  - The Delete action removes the corresponding UI.ReferenceFacet record from the UI.Facets annotation.

LANGUAGE: Plaintext

CODE:
```text
Deletion result:
- Removed: corresponding UI.ReferenceFacet record in UI.Facets
- Note: This does not describe side effects to other annotations; verify UI.Identification usage if necessary.
```

STEP: 4 — Maintain Identification Section Properties — Label, Display on Demand, Hidden

DESCRIPTION: Modify properties of the Identification Section in the Page Editor properties pane.

- Change Label:
  1. Select the Identification Section.
  2. In the properties pane, update the Label text box.
  3. The new label is shown in the Page Editor outline and in the application preview.
  - Reference: appendix-457f2e9.md#loiod44832d99bdf4f73ba14cdbb16dc9301
- Display on Demand:
  - For behavior and configuration details see: form-section-4102b3d.md#loio4102b3d63d9047c881108e6f0caae15e__displayondemand
- Hidden:
  - For behavior and configuration details see: appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0

LANGUAGE: Plaintext

CODE:
```text
Property changes map:
- Label: updates visible section label and preview
- DisplayOnDemand: configure per form-section documentation
- Hidden: configure per appendix documentation
```
--------------------------------

**TITLE**: Internationalization (i18n) — Configuration and UI Text Internationalization (Fiori Tools)

**INTRODUCTION**: Practical, code-focused guide for configuring i18n resource bundles and handling UI text internationalization actions in Fiori Tools. Use this to: (1) locate and configure i18n folder settings for non-CAP and CAP projects, (2) understand automated UI editor behavior when generating or referencing i18n keys, and (3) use mass i18n generation.

**TAGS**: fiori-tools, i18n, localization, CAP, manifest.json, .cdsrc.json, package.json, ui5

STEP: 1 — Configure i18n resource bundle folder

DESCRIPTION: Edit your project configuration to declare the resource bundle (i18n) folder(s). For non-CAP projects, configure /webapp/manifest.json. For CAP projects, configure either .cdsrc.json or package.json. CAP default folder list is provided below — use or modify this list in your CAP configuration.

LANGUAGE: JSON

CODE:
```json
["_i18n", "i18n", "assets/i18n"]
```

- Action: For non-CAP projects open /webapp/manifest.json and ensure the "sap.app" or i18n resourceBundle path points to your i18n folder.
- Action: For CAP projects open .cdsrc.json or package.json and update the i18n folder configuration; the default value is the array above.

STEP: 2 — Trigger i18n for a single UI text (editor behavior)

DESCRIPTION: In the Page Editor UI (properties pane or Add dialog), the Internationalization (i18n) icon appears next to translation-relevant input fields. Clicking it will perform one of three actions depending on the current state of the label/text. The editor prompts *Apply* or *Cancel*. The exact messages (presented to the user) are shown below and are replicated literally by the editor flow.

LANGUAGE: text

CODE:
```text
Generate a text key <uniquekey> in the i18n file and substitute <actual text> by {i18n>uniquekey}.
```

- When label is plain text and not yet internationalized: Apply generates a new i18n key and writes it to the i18n file, then substitutes the label value with a reference: {i18n>uniquekey}.

LANGUAGE: text

CODE:
```text
Generate a text key <uniqueKey> with value <uniquekey> in i18n file.
```

- When label is a reference to a text key but the key is missing in i18n files: Apply writes a new i18n entry using the key and a default value equal to the key.

LANGUAGE: text

CODE:
```text
Text key <uniqueKey> for value <sample text> is available in i18n file. Substitute <sample text> by {@i18n>uniqueKey}.
```

- When label is plain text but the text already exists in i18n: Apply substitutes the plain text with the existing i18n key reference: {@i18n>uniqueKey}.

STEP: 3 — Notes on key generation, annotation handling, and recommended workflow

DESCRIPTION: Preserve behavior and avoid surprises when the editor generates i18n keys and modifications across layers.

LANGUAGE: text

CODE:
```text
- i18n key casing: generated in camelCase for non-CAP projects and PascalCase for CAP projects.
- Repeated edits: the i18n icon creates a new entry for each new text to preserve history; this can create redundant keys.
```

- Annotation handling rules:
  - If a Field or Column label is defined directly on the property with @title or @Common.Label in a lower layer, the editor generates a Label property in the corresponding UI.DataField record referencing the i18n text in the resource bundle. Existing @title or @Common.Label annotations are not modified or overridden.
  - If a UI.FieldGroup or UI.Facet annotation is located in the lower layer, the editor copies that annotation to the application layer before creating or updating the Label reference.

- Recommended workflow: perform bulk i18n or finalize label texts near the end of development to prevent many redundant keys and reduce translation overhead.

STEP: 4 — Mass i18n creation (bulk generation)

DESCRIPTION: Use the Internationalization (mass i18n generation) icon at the top of the Page Editor to prepare multiple UI texts for translation in one operation.

LANGUAGE: text

CODE:
```text
- Action: Click the globe icon (mass i18n generation) to scan the page and generate i18n keys for multiple texts at once.
- Result: Multiple i18n entries are written to the configured i18n file(s), and UI labels are updated to reference those keys.
```

- Action steps: Open the Page Editor → click the mass i18n (globe) icon → review generated keys and Apply to write them to your resource bundle(s).

STEP: 5 — Practical references and file locations

DESCRIPTION: Quick reference for files and locations mentioned in configuration and behavior.

LANGUAGE: text

CODE:
```text
- Non-CAP projects: /webapp/manifest.json
- CAP projects: .cdsrc.json or package.json
- Default i18n folders (CAP): ["_i18n","i18n","assets/i18n"]
- i18n label substitution formats seen in the editor:
  - {i18n>uniquekey}
  - {@i18n>uniqueKey}
```
--------------------------------

**TITLE**: Internationalization Support for XML Annotation Files (Annotation LSP)

**INTRODUCTION**: This guide explains how the XML Annotation Language Server (Annotation LSP) verifies and manages language-dependent strings in annotation files by using the i18n.properties file referenced from the @18n model in manifest.json. It covers verifying the project model, reusing existing text keys (Code Completion / Quick Fix), creating new keys (Quick Fix), and navigating to update translations (Go To / Peek Definition).

**TAGS**: fiori-tools, i18n, annotations, annotation-lsp, manifest.json, i18n.properties, Visual Studio Code, BAS, internationalization

STEP: Verify i18n model and properties file

DESCRIPTION: Ensure your app's manifest.json declares the @18n resource model and that the i18n properties file exists in the expected path. Annotation LSP will use the i18n bundle referenced by the @18n model in manifest.json. If the model or properties file is missing, Annotation LSP shows a warning in the annotation file.

LANGUAGE: JSON

CODE:
```json
{
  "sap.ui5": {
    "models": {
      "i18n": {
        "type": "sap.ui.model.resource.ResourceModel",
        "settings": {
          "bundleName": "i18n.i18n"
        }
      }
    }
  }
}
```

STEP: File path convention for properties

DESCRIPTION: Place the properties file in the project so it matches the bundleName above. Typical physical path (relative to webapp) is:
- webapp/i18n/i18n.properties

LANGUAGE: text

CODE:
```
/webapp/i18n/i18n.properties
```

STEP: Example UI (static) asset reference included in doc

DESCRIPTION: Preserve asset references required by project or tools. Example from documentation (CSS for icons):

LANGUAGE: HTML

CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: How Annotation LSP identifies language-dependent strings

DESCRIPTION: Annotation LSP checks annotation properties that are tagged as IsLanguageDependent in the vocabulary (for example, UI vocabulary: https://sap.github.io/odata-vocabularies/vocabularies/UI.html). Only properties with that tag are validated against the i18n.properties file. When you open an annotation file, every language-dependent string value is validated; missing or invalid references produce warnings and suggested Quick Fix actions.

LANGUAGE: text

CODE:
```
Reference: UI vocabulary (IsLanguageDependent)
https://sap.github.io/odata-vocabularies/vocabularies/UI.html
```

STEP: Reuse existing text keys — Code Completion

DESCRIPTION: While editing the string value of a language-dependent property in the annotation file, trigger Code Completion to list existing text keys and values from i18n.properties. Select a completion item to insert the referenced text key into the annotation string value.

LANGUAGE: text

CODE:
```
Trigger Code Completion:
- Windows: Ctrl + Space
- macOS: Cmd + Space

Behavior:
- Completion shows text-key references and text values from i18n.properties
- Selecting an item inserts the text key reference into the annotation file
```

STEP: Reuse or create text keys — Quick Fix actions

DESCRIPTION: When Annotation LSP detects a non-referenced or unmatched string value for a language-dependent property, it shows a warning and a Quick Fix (light bulb). Available Quick Fixes:
- Reuse an existing key: Insert a reference to an existing i18n key.
- Generate a new key: Create a new text key in i18n.properties with default attributes and substitute the annotation string with the new reference.

LANGUAGE: text

CODE:
```
Quick Fix:
- Click the light bulb icon next to the warning or use the editor Quick Fix command
- Choose either "Use existing text key" or "Create new text key"
Result:
- Existing key: annotation is updated to reference that key
- New key: i18n.properties receives a new entry and annotation is updated to reference it
```

STEP: Add a new language-dependent value manually

DESCRIPTION: Enter a string for the language-dependent property in the annotation file. If it's not present in i18n.properties, Annotation LSP issues a warning. Use Quick Fix to generate the i18n key and inject the reference automatically. After generation, you can edit the generated i18n.properties entry to add translations or comments.

LANGUAGE: text

CODE:
```
Workflow:
1. Edit annotation -> provide string for a language-dependent property
2. Annotation LSP warns if no matching i18n key exists
3. Invoke Quick Fix -> creates key in i18n.properties and replaces the annotation value with the reference
4. Open i18n.properties to update translations or add comments
```

STEP: Highlighting and fixing missing references at any time

DESCRIPTION: Open your annotation file. Annotation LSP highlights missing references with warnings. Apply Quick Fix to fix multiple occurrences as suggested (reuse or create keys). Use Code Completion to avoid warnings when inserting references.

LANGUAGE: text

CODE:
```
- Open annotation file -> warnings shown for missing i18n references
- Use Quick Fix (light bulb) to fix each missing reference or use Code Completion while editing
```

STEP: Navigate to or edit the i18n.properties entry from an annotation (Go To / Peek)

DESCRIPTION: Place the cursor inside the path referencing the translatable string value in the annotation file and use Go To Definition or Peek Definition to open or preview the i18n.properties entry. Use the appropriate editor keybindings or context menu.

LANGUAGE: text

CODE:
```
Go To Definition:
- VS Code: F12
- SAP Business Application Studio: Ctrl + F11
- Or: Ctrl + Click (Windows) / Cmd + Click (macOS)
Result: Opens the i18n.properties file at the referenced key

Peek Definition:
- VS Code: Alt + F12 (Windows) / Option + F12 (macOS)
- Or: Right-click -> Peek Definition
Result: Shows inline preview of the i18n.properties entry without leaving the annotation file
```

STEP: Tips for translators and additional attributes

DESCRIPTION: After Quick Fix generates a new i18n entry, open i18n.properties to:
- Add translation comments
- Add other attributes or metadata if required by your project tools
Use Go To / Peek Definition to jump from the annotation to the properties entry quickly.

LANGUAGE: text

CODE:
```
Post-generation actions:
- Open / edit / add translations in /webapp/i18n/i18n.properties
- Use Go To or Peek Definition from the annotation file to navigate
```
--------------------------------

**TITLE**: List Report Page

**INTRODUCTION**: Brief overview and implementation pointers for generating a Fiori Elements List Report page. Use this when generating or scaffolding List Report pages to ensure inclusion of supported building blocks and to link to detailed design and implementation references.

**TAGS**: fiori-tools, list-report, fiori-elements, sap-fiori, ui5, floorplan

STEP: 1 - Fiori Design Guidelines (Overview)

DESCRIPTION: Reference the official Fiori Design Guidelines for the List Report floorplan. Use this link as the primary UX/design source when generating UI and when deciding which controls/behaviors to implement.

LANGUAGE: text

CODE:
```text
Fiori Design Guidelines: https://experience.sap.com/fiori-design-web/list-report-floorplan-sap-fiori-element/
Use this guideline for layout, expected behaviors, and UX details of the List Report floorplan.
```

STEP: 2 - Supported Elements (What to include)

DESCRIPTION: The List Report page supports a specific set of elements. When generating code, ensure the generated page scaffolding or annotations include these elements as required by the use case. For implementation details, follow each referenced file.

LANGUAGE: text

CODE:
```text
Supported elements (refer to the respective documentation files for implementation details):
- Filter Fields: filter-fields-0b84286.md
- Report Table: table-aaff7b1.md
- Multiple Views: multiple-views-c62b82e.md
- Analytical Chart: analytical-chart-9c086ec.md

Actionable note:
- For each element, consult the corresponding file above for attributes, required annotations, and example usage.
- Combine elements according to the floorplan: e.g., Filter Fields drive the Report Table and Analytical Chart; Multiple Views toggle between predefined table/chart configurations.
```

STEP: 3 - Generation Guidance (Actionable steps for code generators)

DESCRIPTION: Guidance checklist for code generators scaffolding a List Report page. Follow this sequence to produce a valid starting point and link to deeper files for each element.

LANGUAGE: text

CODE:
```text
Checklist for generators:
1. Add page entry/route for the List Report in the app manifest (or the framework-specific routing config).
2. Include the List Report template/component (framework-dependent) and map it to the target entity set.
3. Wire Filter Fields: reference annotation or descriptor file that defines filterable properties.
4. Scaffold Report Table: include columns, selection mode, and behaviors; consult table-aaff7b1.md for options (responsive table, grid table, analytical table).
5. Support Multiple Views: create view definitions and default view; consult multiple-views-c62b82e.md for view-switching patterns.
6. Optional Analytical Chart: include chart configuration and annotation mapping when analytics are required; see analytical-chart-9c086ec.md.
7. Validate generated page with the Fiori Design Guidelines URL for UX conformance.

Implementation tip:
- Keep element configuration modular so the generator can include/exclude Filter Fields, Table, Multiple Views, and Analytical Chart independently based on feature flags or input metadata.
- Point developers to the detailed docs listed in STEP 2 for property-level and annotation-level specifics.
```
--------------------------------

**TITLE**: Maintaining Annotation-Based Elements in the Application Modeler

**INTRODUCTION**: This guide explains how the Application Modeler generates and maintains OData V4 annotation records when you add or modify UI elements (sections, fields) in the Page Editor. Use these steps when programmatically generating UI changes or writing tools that automate annotation updates for Fiori elements pages (list reports, object pages, form entry object pages).

**TAGS**: fiori-tools, annotations, UI.FieldGroup, UI.Facets, OData V4, Page Editor, Application Modeler

STEP: Preconditions and scope

DESCRIPTION: Confirm the Page Editor supports annotation generation. Annotation generation is available only for Page Editor pages that are:
- List reports
- Object pages
- Form entry object pages
All must be based on OData V4. If your page type or OData version is different, the automatic annotation generation features are not available.

LANGUAGE: Text

CODE:
```Text
Supported page types for annotation generation:
- List Reports (OData V4)
- Object Pages (OData V4)
- Form Entry Object Pages (OData V4)
```

STEP: Add a section (UI.FieldGroup) via the Application Modeler

DESCRIPTION: When you add a section in the Application Modeler (for Object Page or Form Entry Object Page) using the Sections node → Add (plus icon), the Page Editor will:
- Create a new UI.FieldGroup record representing the section.
- Ensure a UI.Facets annotation exists; if not, create UI.Facets.
- Add a reference to the new UI.FieldGroup inside the UI.Facets annotation.

Use this behavior when writing code to simulate or reproduce the add-section action: create a UI.FieldGroup entity and add its reference into UI.Facets.

LANGUAGE: Text

CODE:
```Text
Action performed by Application Modeler when adding a section:
1. Create UI.FieldGroup record (new section)
2. If UI.Facets does not exist -> create UI.Facets
3. Add reference to the UI.FieldGroup inside UI.Facets
```

STEP: Add fields to a section

DESCRIPTION: After a section (UI.FieldGroup) exists, adding fields via the Application Modeler will:
- Create field entries inside the UI.FieldGroup record.
- Update the local annotation file where UI.FieldGroup and UI.Facets are persisted.

When automating, ensure your code updates the UI.FieldGroup record to include the new fields and writes the updated annotations back to the local annotation file used by the project.

LANGUAGE: Text

CODE:
```Text
When adding fields to a section:
- Update the UI.FieldGroup record (add field entries)
- Persist updates to the project's local annotation file
```

STEP: Inspect and edit generated annotations in source

DESCRIPTION: Use the Page Editor's "Edit in Source Code" feature to view and manually edit the annotations that the Application Modeler generated. This is useful for fine-grained changes or for verifying the exact structure produced by the UI actions.

Refer to the built-in documentation page for details on the feature:
- edit-in-source-code-7d8e942.md

LANGUAGE: Text

CODE:
```Text
To view or edit annotations:
- Open "Edit in Source Code" in the Page Editor
- File containing generated annotations: local annotation file (project)
- See documentation: edit-in-source-code-7d8e942.md
```

STEP: Include UI icon stylesheet (project asset reference)

DESCRIPTION: Projects may reference the SAP icons stylesheet from the repository. Preserve this file path when generating or validating project assets.

LANGUAGE: HTML

CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: Related configuration reference

DESCRIPTION: For the structural outline of page elements and examples of the Application Modeler UI, consult the Configure Page Elements documentation.

LANGUAGE: Text

CODE:
```Text
See: configure-page-elements-047507c.md
```
--------------------------------

**TITLE**: Maintaining OData Annotations with Language Server (CAP CDS & XML)

**INTRODUCTION**: Action-oriented guide to enable and configure language-server support for maintaining OData annotations in CAP CDS (.cds) and XML annotation files. Covers required project files, manifest.json configuration, local metadata and annotation file structure, and supported vocabularies. Use these steps to get code completion, validation, navigation, and i18n support in your editor.

**TAGS**: fiori-tools, cds, odata, annotations, language-server, manifest.json, xml, metadata, i18n, sap

**STEP**: 1 — Enable CDS OData Language Server support

**DESCRIPTION**: Add or enable the SAP CDS OData language-server support used for .cds files. This support is provided by the npm package and included with the SAP CDS Language Support VS Code extension.

**LANGUAGE**: Shell / Metadata

**CODE**:
```shell
# VS Code extension identifier (SAP CDS Language Support)
# Install in VS Code (if using code CLI)
code --install-extension SAPSE.vscode-cds

# npm package (library used by the language server)
# You may reference or pin this package in dev tooling or CI if needed
npm install @sap/ux-cds-odata-language-server-extension --save-dev
```

**STEP**: 2 — Prepare service metadata (local copy)

**DESCRIPTION**: The XML language-server uses a local copy of the OData service metadata for completion and diagnostics. Ensure the metadata file contains edmx:DataServices with one or more edm:Schema elements and exactly one EntityContainer. Namespace must not contain slashes and must match annotation files.

**LANGUAGE**: XML

**CODE**:
```xml
<!-- Example: webapp/localService/metadata.xml -->
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="My.Service" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="MyEntity">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.String" Nullable="false"/>
        <Property Name="Name" Type="Edm.String"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="MyEntities" EntityType="My.Service.MyEntity"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>
```

**STEP**: 3 — Create or validate local annotation XML file(s)

**DESCRIPTION**: Add at least one annotation XML file under /webapp/annotations. The Schema Namespace in the annotation file must match the metadata Namespace. Files must include edmx:DataServices and Schema nodes.

**LANGUAGE**: XML

**CODE**:
```xml
<!-- Example: webapp/annotations/annotation.xml -->
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="My.Service" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <Annotations Target="My.Service.MyEntity">
        <Annotation Term="UI.HeaderInfo">
          <!-- Example annotation content -->
        </Annotation>
      </Annotations>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>
```

**STEP**: 4 — Configure manifest.json (Uri, localUri, annotations, i18n)

**DESCRIPTION**: Ensure manifest.json contains data source entries with Uri and localUri pointing to the local metadata copy, an annotations list referencing local annotation XML files, and an @i18n model with uri to i18n.properties. All paths are relative to manifest.json.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "sap.app": {
    "id": "my.app"
  },
  "sap.ui5": {
    "models": {
      "i18n": {
        "type": "sap.ui.model.resource.ResourceModel",
        "settings": {
          "bundleName": "i18n.i18n"
        }
      }
    },
    "resources": {},
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata/sap/MY_SERVICE_SRV/",
        "type": "OData",
        "settings": {
          "localUri": "localService/metadata.xml"
        }
      }
    },
    "annotations": [
      {
        "id": "annotations",
        "uri": "annotations/annotation.xml",
        "service": "mainService"
      }
    ]
  }
}
```

**STEP**: 5 — File locations & opening workflow for editor integration

**DESCRIPTION**: Place annotation files in /webapp/annotations and open them in the code editor (single/double-click or from Service Modeler). The XML annotation language server will activate for local annotation files and use the manifest.json localUri to find metadata. Keep local metadata synchronized with backend metadata.

**LANGUAGE**: Paths / Shell

**CODE**:
```text
# Typical project structure
/webapp/
  annotations/
    annotation.xml      <-- open in editor to enable XML annotation LS assistance
  localService/
    metadata.xml        <-- local metadata copy referenced by manifest.json
  i18n/
    i18n.properties     <-- referenced by manifest.json @i18n model
manifest.json
```

**STEP**: 6 — Supported vocabularies (useful for code completion)

**DESCRIPTION**: The XML annotation language server provides completions and validation based on OASIS and SAP OData vocabularies (OData v4.0). Use these standard vocabularies in annotations.

**LANGUAGE**: Text / Links

**CODE**:
```text
# OData (OASIS) vocabularies (examples)
Org.OData.Aggregation.V1
Org.OData.Authorization.V1
Org.OData.Capabilities.V1
Org.OData.Core.V1
Org.OData.JSON.V1
Org.OData.Measures.V1
Org.OData.Repeatability.V1
Org.OData.Temporal.V1
Org.OData.Validation.V1

# SAP vocabularies (examples)
Analytics, CodeList, Common, Communication, DataIntegration,
Direct-Edit, Graph, Hierarchy, HTML5, ODM, PDF, PersonalData, Session, UI
```

**STEP**: 7 — Important constraints and sync notes

**DESCRIPTION**: Follow these limitations and sync guidance to avoid inconsistent diagnostics or missing completions.

**LANGUAGE**: Text

**CODE**:
```text
- Annotations embedded directly inside service metadata are NOT supported by the XML annotation language server.
- Dynamic expressions in annotations are NOT supported.
- Local copies of metadata and back-end annotations are used for completion/diagnostics. They must be kept in sync with the back end; syncing is not automatic.
- Metadata namespace MUST NOT contain '/' characters; namespaces must be dot-separated SimpleIdentifiers.
```

--------------------------------

**TITLE**: Maintaining Building Blocks in Page Editor (Fiori Tools)

**INTRODUCTION**: Use the Page Editor in Fiori Tools to add and maintain SAP Fiori elements building blocks for OData V4-based applications. This guide lists supported building blocks, explains where to add them (custom page or custom section), and gives action-oriented steps to add, configure, and persist XML and annotation properties using the Page Editor UI.

**TAGS**: fiori-tools, page-editor, building-blocks, sap-fiori-elements, odata-v4, ui5

**STEP**: 1 — Supported building blocks and context

**DESCRIPTION**: The Page Editor supports adding these building block types to custom pages or custom sections in an object page for OData V4 applications. Use this step to confirm which block types you can add and where each is allowed.

**LANGUAGE**: text

**CODE**:
```text
Supported building blocks (Page Editor):
- Chart
- Filter Bar
- Table
- Page (Custom page only)
- Rich Text Editor (Custom section only)

Context:
- Add to: Custom Page OR Custom Section of an Object Page
- Data model: OData V4-based SAP Fiori elements applications
- Property editing: XML properties and Annotation properties (both editable in Property Panel)
```

**STEP**: 2 — Read building block documentation reference

**DESCRIPTION**: Open the official Building Block Overview for implementation details, patterns, and block capabilities. Keep this reference available when generating or validating code/annotations.

**LANGUAGE**: text

**CODE**:
```text
Reference:
Building Block Overview:
https://ui5.sap.com/test-resources/sap/fe/core/fpmExplorer/index.html
```

**STEP**: 3 — Add a custom page or custom section using Page Editor (UI steps)

**DESCRIPTION**: Use the Page Editor UI in Fiori Tools (e.g., VS Code extension) to add a custom page or section, then add a building block to it. These are the step-by-step UI operations to automate or reproduce programmatically if needed.

**LANGUAGE**: text

**CODE**:
```text
UI steps (manual or to automate with UI-driven tests):
1. Open your project in VS Code with Fiori Tools.
2. Open Page Editor for the target Object Page.
3. To add a custom page:
   - Click "Add Custom Page"
   - Provide a title/ID for the page
   - Confirm creation
4. To add a custom section in an object page:
   - Select target Object Page
   - Click "Add Custom Section"
   - Provide a title/ID for the section
5. To add a building block to the new page/section:
   - With the page/section selected, click "Add Building Block"
   - Choose one of: Chart, Filter Bar, Table, Page (page only), Rich Text Editor (section only)
6. Save changes in the Page Editor and in the project.
```

**STEP**: 4 — Edit properties in the Property Panel (XML properties and annotations)

**DESCRIPTION**: The Page Editor exposes a property panel with two categories: XML properties (view/control-level properties) and Annotation properties (OData metadata-driven settings). Use the panel to modify both types; saving persists changes into your project artifacts (annotations/XML fragments).

**LANGUAGE**: text

**CODE**:
```text
Property Panel usage:
- Open the Property Panel for the selected building block.
- XML properties: Edit control/view properties (binding paths, layout, control IDs).
- Annotation properties: Edit annotations that drive behavior (e.g., selection fields, lineItem definitions).
- Workflow:
   1. Change values in the panel
   2. Validate changes via preview or run the app
   3. Save to persist changes to annotation files or XML fragments
```

**STEP**: 5 — Visual references and assets (images used by documentation)

**DESCRIPTION**: Reference images used in the original documentation to aid visual understanding or include them in generated documentation. Keep the file paths unchanged when reusing these assets.

**LANGUAGE**: text

**CODE**:
```text
Documentation images (preserve file paths):
- Custom page example:
  images/Custom_Section_9fbfc17.png

- Custom section with Table building block and Property Panel:
  images/Custom_Section_Building_Block_8af206b.png
```
--------------------------------

**TITLE**: Maintaining Extension-Based Elements (Fiori Tools Page Editor — ext artifact patterns)

**INTRODUCTION**: This guide explains the actions to add and maintain extension-based UI elements (custom columns, fields, sections, views, actions, and controller extensions) using the Page Editor and Page Map in Fiori Tools. It focuses on what is generated (file paths, required metadata) and the minimal code artifacts created under the project's ext/ folder. Distinguishes OData V2 vs V4 behavior and version requirements.

**TAGS**: fiori-tools, sap, odata-v2, odata-v4, extension, fragments, controller, ext, ux-specification, fe-fpm-writer

**STEP**: Note — Templates and writer source

**DESCRIPTION**: For OData V4 applications, the Page Editor templates are published in the open-source writer package. Inspect or reuse templates and generation logic from the package linked below.

**LANGUAGE**: Plain

**CODE**:
```text
@SAP Open UX tools: @sap-ux/fe-fpm-writer
GitHub: https://github.com/SAP/open-ux-tools/tree/main/packages/fe-fpm-writer
```

**STEP**: Adding Custom Column (OData V2 only)

**DESCRIPTION**: In Page Editor outline, click + next to Columns. Provide Column Key, Header Text, ID (auto-generated/editable), choose Column Fragment (create or existing), Column Fragment Name, for responsive tables choose/select Cell Fragment and Cell Fragment Name, select Anchor Column and Placement (before/after). If your column binds to a property (e.g., {Price}), include a leadingProperty entry in the column definition. Generated files (fragment(s)) are written to the project's ext folder. You can reorder or delete the custom column in the outline.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "columns": [
    {
      "key": "CustomColumnKey",
      "label": "Price",
      "id": "ext::CustomColumn_1",
      "fragment": "ext/fragments/CustomColumn.fragment.xml",
      "cellFragment": "ext/fragments/CustomCell.fragment.xml",
      "anchor": "ExistingColumnKey",
      "placement": "after",
      "leadingProperty": "Price"
    }
  ]
}
```

**STEP**: Adding Custom Column (OData V4 only)

**DESCRIPTION**: In Page Editor outline, click + next to Columns. Provide Header Text, select/create Column Fragment and name, choose Anchor Column and Placement (before/after), optionally enable Generate Event Handler (True/False), and set Width. The custom fragment and optional default controller code are written to ext/. Reorder/delete via outline.

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Example generated controller handler (ext/controllers/CustomColumn.controller.js)
sap.ui.define([], function () {
  "use strict";
  return {
    onCustomAction: function (oEvent) {
      // demo handler created when "Generate Event Handler" = true
      // oEvent.getSource() gives the originating control
      // Add implementation here
    }
  };
});
```

**STEP**: Adding Custom Section (Object Page)

**DESCRIPTION**: In Object Page outline, click + on Sections (OData V4: "Add Custom Section" choice). Provide Title, View Type (View or Fragment — V2 only), select/create Fragment/View and name, select Anchor Section and Placement (before/after, V2 also supports replace), and for V4 decide Generate Event Handler to create demo controller. Generated fragment/view and optional controller are written to ext/. You can reorder/delete in outline.

**LANGUAGE**: XML

**CODE**:
```xml
<!-- ext/sections/CustomSection.fragment.xml -->
<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core">
  <Panel headerText="Custom Section - Title">
    <!-- Add controls and bindings here -->
  </Panel>
</core:FragmentDefinition>
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// ext/controllers/CustomSection.controller.js (optional demo controller)
sap.ui.define([], function () {
  "use strict";
  return {
    onInit: function () {
      // initialization logic for custom section
    }
  };
});
```

**STEP**: Adding Custom Field (Object Page)

**DESCRIPTION**: In Object Page outline, click + on Fields and choose Add Custom Field. Provide Label, choose/create Fragment/View and name, pick Anchor field and Placement (before/after), and optionally Generate Event Handler. The field fragment and optional controller code are written to ext/. Reorder/delete using outline.

**LANGUAGE**: XML

**CODE**:
```xml
<!-- ext/fields/CustomField.fragment.xml -->
<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core">
  <HBox>
    <Label text="Custom Field Label" />
    <Input value="{/SomeProperty}" />
  </HBox>
</core:FragmentDefinition>
```

**STEP**: Adding Custom Action (OData V4 only)

**DESCRIPTION**: In Page Editor, click + on Actions and choose Add Custom Action. Provide Action ID, Button Text, Anchor action key and Placement, choose to add to an existing Action Handler file or create new, select/create Handler Method, and toggle Required Selection. The action entry and handler are written to ext/. This feature requires @sap/ux-specification >= 1.96.

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Example action handler file: ext/actions/ActionHandler.js
sap.ui.define([], function () {
  "use strict";
  return {
    onCustomButtonPress: function (oEvent) {
      // Implement action logic here
      // For selection-dependent actions, use oEvent.getParameter("selectedContexts")
    }
  };
});
```

**STEP**: Adding Custom View (OData V4 only)

**DESCRIPTION**: In Page Editor, click + on View and choose Add Custom View (only for List Reports without a chart). Provide Key, Label, select/create Fragment and Fragment Name, and optionally Generate Event Handler. The view fragment and optional controller are written to ext/. Requires @sap/ux-specification versions noted below.

**LANGUAGE**: XML

**CODE**:
```xml
<!-- ext/views/CustomView.fragment.xml -->
<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core">
  <Page title="Custom View">
    <!-- Custom layout and controls -->
  </Page>
</core:FragmentDefinition>
```

**STEP**: Adding Controller Extension (OData V4 only, via Page Map)

**DESCRIPTION**: Launch Page Map, click Show Controller Extensions for the selected page, view existing extensions in the Properties Panel, and click Add Controller Extension to create a new extension. Provide required details in the pop-up. You can reorder execution order via drag-and-drop or Move Up / Move Down icons, and open the controller source via Edit in source code. Generated controller extension code is written to ext/ and registered so the runtime will load it for the page.

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// ext/controllerExtensions/CustomControllerExtension.controller.js
sap.ui.define([], function () {
  "use strict";
  return {
    onInit: function () {
      // extension init
    },
    onAfterRendering: function () {
      // post-render logic
    }
  };
});
```

**STEP**: Version and compatibility notes

**DESCRIPTION**: Keep UX-specification & tooling compatibility in mind:
- Custom Actions & Views: only available for OData V4 and require @sap/ux-specification >= 1.96 (specific minimums: 1.96.29, 1.102.14 or higher are noted for some features).  
- For OData V4 Page Editor templates, see the fe-fpm-writer package for the exact templates and generated code patterns.

**LANGUAGE**: Plain

**CODE**:
```text
@npm package: https://www.npmjs.com/package/@sap/ux-specification
Required: @sap/ux-specification >= 1.96 (check specific feature release notes)
```
--------------------------------

**TITLE**: Micro-snippets for XML Annotation LSP (fiori-tools)

**INTRODUCTION**: Micro-snippets are context-specific code-completion templates provided by the XML Annotation Language Server (LSP). Use them to insert common annotation constructs (targets, terms, records, property values) quickly and reliably instead of typing manually. Micro-snippets speed development, reduce typos, and ensure required properties are present.

**TAGS**: fiori-tools, micro-snippets, XML, annotations, code-completion, LSP

**STEP**: 1 — Insert an annotation target micro-snippet

**DESCRIPTION**: When editing inside a <Schema> element, trigger code completion to select the annotation-target micro-snippet. The micro-snippet inserts the full Annotations element and places the cursor inside the Target attribute quotes for immediate typing or selection.

**LANGUAGE**: XML

**CODE**:
```xml
<Annotations Target=""></Annotations>
```

**STEP**: 2 — Choose between record micro-snippet variants

**DESCRIPTION**: For annotation records, two micro-snippet variants are provided:
- Required-only variant: includes only properties defined as nullable=false in the vocabulary (minimal, safe starting point).
- Full-record variant: includes all properties defined for the record (complete template).

Use the required-only variant to start minimal records and add properties later, or use the full-record variant and delete unused properties as needed. Trigger these via code completion when inserting a record instance.

**LANGUAGE**: text

**CODE**:
```
(Use code completion to select "record (required-only)" or "record (full)"—no static code snippet here)
```

**STEP**: 3 — Insert terms and property-value micro-snippets

**DESCRIPTION**: Micro-snippets are also provided for:
- Annotation terms (insert common term templates)
- Property values (insert value templates for properties)
Trigger code completion in the appropriate context (inside Annotations, Records, or Properties) and select the matching micro-snippet to insert the prebuilt block.

**LANGUAGE**: text

**CODE**:
```
(Trigger code completion inside the property or term context and select the desired micro-snippet)
```

**STEP**: 4 — Preview micro-snippet content with Documentation (Quick Info)

**DESCRIPTION**: In the code-completion list, highlight any micro-snippet to see its code template in the Documentation (Quick Info) window. Use this preview before committing the snippet to confirm which variant to insert.

**LANGUAGE**: text

**CODE**:
```
(Highlight snippet in completion list → Documentation (Quick Info) shows the template)
```

**STEP**: 5 — Practical workflow recommendations

**DESCRIPTION**:
- Prefer micro-snippets for common constructs to reduce manual typing and errors.
- Start with required-only record snippets when you only need mandatory properties; add optional properties later.
- Use full-record snippets when you want a complete template to modify.
- Use the Documentation (Quick Info) preview to inspect snippet contents before insertion.

**LANGUAGE**: text

**CODE**:
```
(Workflow: trigger completion → preview snippet in Quick Info → insert → edit fields / attributes)
```
--------------------------------

**TITLE**: Multiple Views for List Report (Fiori tools)

**INTRODUCTION**: Configure a List Report to include additional table or chart views (displayed as icon-tab views). Steps cover adding/removing/moving views in the Page Editor, required annotation and manifest changes, measure creation rules, and presentation-variant considerations.

**TAGS**: fiori-tools, list-report, views, chart, table, manifest.json, annotations, analytics, aggregation, SAPUI5

**STEP**: 1 — Add a Table or Chart View (Page Editor)
**DESCRIPTION**: Use the Page Editor to add a table or chart view. For charts, select an Entity and specify the chart type, dimension and either an existing measure or create a new measure (requires transformation aggregations and SAPUI5 >= 1.106). The table view is added without columns; add columns via the Columns subnode in the Page Editor.
**LANGUAGE**: None
**CODE**:
```text
UI flow:
1. Open Page Editor for the List Report page.
2. Click + (Add) on the Views node.
3. Choose "Add Table View" or "Add Chart View".
   - If Chart: choose chart type, dimension, and measure:
       * Use existing measure  OR
       * Create new measure (transformation aggregation required; SAPUI5 >= 1.106)
4. Click Add. A new view subnode with generated label is appended under Views.
```

**STEP**: 2 — Measure creation rules for Chart View
**DESCRIPTION**: If selecting "Create new measure", Page Editor will apply a transformation aggregation to the selected aggregable property using your chosen aggregation method and generate a dynamic measure. This only works when the service defines aggregable/groupable properties (via @Aggregation.ApplySupported) and when transformation aggregation support is available (SAPUI5 >= 1.106). If all possible dynamic measures are already present, you must choose an existing measure.
**LANGUAGE**: Annotation/OData
**CODE**:
```xml
<!-- Example of a transformation aggregated property that may be generated/applied -->
<Property Name="Revenue" Type="Edm.Decimal">
  <Annotation Term="Analytics.AggregatedProperty">
    <Record>
      <PropertyValue Property="AggregatedBy" String="SUM"/>
      <!-- Other aggregation metadata as generated -->
    </Record>
  </Annotation>
</Property>
```

**STEP**: 3 — Annotations generated when adding a view
**DESCRIPTION**: Adding a table or chart view generates or updates annotations targeting the selected EntityType and creates a qualified UI annotation for the view. If you created a new measure, @Analytics.AggregatedProperty is applied. The Views/Paths entry in manifest.json is generated or appended; if you choose an EntitySet different from the List Report's main EntitySet, that EntitySet is added to the paths entry.
**LANGUAGE**: XML
**CODE**:
```xml
<!-- Example: generated UI annotation with qualifier for a view -->
<Annotations Target="MyService.MyEntityType" xmlns="http://docs.oasis-open.org/odata/ns/edm">
  <Annotation Term="UI.LineItem" Qualifier="MyView">
    <Collection>
      <!-- LineItem/columns definitions for the generated table -->
    </Collection>
  </Annotation>

  <!-- Or for chart views -->
  <Annotation Term="UI.Chart" Qualifier="MyChartView">
    <Record>
      <!-- Chart metadata: Dimensions, Measures, ChartType -->
    </Record>
  </Annotation>
</Annotations>
```

**STEP**: 4 — manifest.json updates (Views/Paths and defaultTemplateAnnotationPath)
**DESCRIPTION**: Page Editor updates manifest.json to register view annotation paths. If a Views/Paths section did not exist, it is created. When all additional views are removed and only the main-table remains, Views/Paths is removed and defaultTemplateAnnotationPath may be created to revert to a plain List Report.
**LANGUAGE**: JSON
**CODE**:
```json
// Example manifest.json "sap.ui.generic.app" fragment after adding multiple views
{
  "sap.ui.generic.app": {
    "routes": [ /* ... */ ],
    "pages": [
      {
        "entitySet": "MainEntitySet",
        "component": { /* ... */ },
        "settings": {
          "views": {
            "paths": [
              "com.example.v1::MainSelectionPresentationVariant",   // main table view
              "com.example.v1::OtherEntitySelectionPresentationVariant" // added table/chart view
            ]
          }
        },
        // If the app reverts to plain List Report, "views/paths" is removed and:
        // "defaultTemplateAnnotationPath": "com.example.v1::MainSelectionPresentationVariant"
      }
    ]
  }
}
```

**STEP**: 5 — Move or reorder views
**DESCRIPTION**: Reorder view sequence under the Views node using drag-and-drop or Move Up / Move Down icons in Page Editor. This changes the tab order shown in the app.
**LANGUAGE**: None
**CODE**:
```text
UI flow:
- In Page Editor: expand Views node, drag a view subnode to a new position OR
  use Move Up / Move Down icons on the view subnode to reorder.
```

**STEP**: 6 — Delete a Table or Chart View
**DESCRIPTION**: Remove a view by clicking the Delete (trash) icon on the view subnode. You cannot remove the last table view that is based on the main EntitySet. When all secondary views are removed the List Report converts back to a plain List Report and Page Editor updates manifest.json/annotation entries accordingly.
**LANGUAGE**: JSON
**CODE**:
```json
// Example manifest.json after deleting all extra views (views/paths removed):
{
  "sap.ui.generic.app": {
    "pages": [
      {
        "entitySet": "MainEntitySet",
        "settings": {
          "defaultTemplateAnnotationPath": "com.example.v1::MainSelectionPresentationVariant"
        }
      }
    ]
  }
}
```

**STEP**: 7 — View properties: View Label and Presentation Variant
**DESCRIPTION**: 
- View Label: editable text used as the icon-tab label; auto-generated when adding a view and can be prepared for translation (i18n).
- Presentation Variant: defines table/chart representation rules (sorting, select fields). Presentation Variant for each view must be distinct (cannot reuse the same Presentation Variant across views that might reference different entities). For charts, maintain presentation variant similar to Analytical Chart setup.
**LANGUAGE**: None
**CODE**:
```text
Notes:
- Change the auto-generated View Label in the Page Editor to a meaningful, translatable string.
- Create/maintain Presentation Variant annotations per view (SelectionPresentationVariant/PresentationVariant) to control sorting/selection for that specific view.
```

**STEP**: 8 — Requirements and constraints
**DESCRIPTION**: Key constraints to check before adding chart/table views:
- Service must expose groupable/aggregable properties via @Aggregation.ApplySupported to enable chart view generation.
- Custom aggregation measures require @Aggregation.CustomAggregate on the service if you want custom aggregation methods.
- For transformation aggregation support (created dynamic measures using transformation aggregations), run the app with SAPUI5 1.106 or higher.
- Multiple views are not allowed if an Analytical Chart is configured above or as alternative to the main table; remove the Analytical Chart to enable views.
**LANGUAGE**: None
**CODE**:
```text
Checklist:
- Ensure service has @Aggregation.ApplySupported for chart generation.
- If using custom aggregations, ensure @Aggregation.CustomAggregate exists.
- Use SAPUI5 >= 1.106 for transformation aggregation (@Analytics.AggregatedProperty support).
- Remove any configured Analytical Chart above/alternative to main table before adding multiple views.
```

**STEP**: 9 — Assets and file references
**DESCRIPTION**: Keep stylesheet and image references if your Page Editor examples or UI need SAP icon fonts or images.
**LANGUAGE**: HTML
**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>

<!-- Image used in docs / editor UI -->
<img src="images/Fiori_tools_List_Report_Multi_Views_Nodes_Example_f32ee78.png" alt="Nodes example for List Report" />
```
--------------------------------

**TITLE**: Navigation to References (XML annotation language server)

**INTRODUCTION**: Use the XML annotation language server to find where annotations and metadata elements (entity types, properties, actions, annotation terms/qualifiers) are referenced in the codebase. This helps assess impact before changing annotations or metadata.

**TAGS**: fiori-tools, annotations, metadata, references, xml, editor, navigation, vscode

**STEP**: Find All References

**DESCRIPTION**: Place the text cursor inside a metadata element name or an annotation term/qualifier to list every reference across the workspace. The results open in the References pane; select an item to navigate to the file for review or update. When run for metadata elements, the element definitions are also included in the results.

**LANGUAGE**: Editor Commands

**CODE**:
```text
Trigger Find All References:

- Keyboard (Windows): Alt + Shift + F12
- Keyboard (macOS): Option + F12
- Mouse: Right-click → Find All References

Behavior:
- Opens the References pane (side/bottom depending on editor layout)
- Shows all references for the selected annotation term/qualifier or metadata element
- Includes definitions when the target is a metadata element
- Click an entry to open and edit the file
```

**STEP**: Go to References

**DESCRIPTION**: Place the text cursor inside a metadata element name or an annotation term/qualifier to open a peeked list of references inline. This allows quick inspection and in-place edits without switching files.

**LANGUAGE**: Editor Commands

**CODE**:
```text
Trigger Go To References:

- Keyboard: Shift + F12
- Mouse: Right-click → Go To References

Behavior:
- Opens a peeked editor view showing the list of references
- Allows direct edits in the peeked view
- Use this for quick, in-context changes without fully opening target files
```
--------------------------------

**TITLE**: Overriding Back-End Annotations into Local Annotation Files (Fiori Tools)

**INTRODUCTION**: Procedures to copy back-end OData annotations into local annotation files within a Fiori Tools project and to create additional local annotation files using the Annotation File Manager. Use these steps to extend or customize annotation metadata for your UI application.

**TAGS**: fiori-tools, annotations, odata, local-annotations, manifest.json, annotation-file-manager

**STEP**: Overriding Back End Annotations

**DESCRIPTION**: 
- Open the back-end annotation details view for the target annotation.
- Click the Copy icon next to the back-end annotation to copy it into a local annotation file. The copy action provides a starting point for extending or customizing annotations.
- If the project has a single local annotation file associated with the service, the annotation is copied automatically to that file.
- If multiple local annotation files for the same service exist, select the desired target file from the dropdown before confirming the copy.
- Notes:
  - You can add multiple local annotation files to a project.
  - You can copy annotations between back-end and local annotation files only in the supported direction: copy backend -> local or copy local -> local. You cannot copy local -> backend.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>

<!-- Copy icon used in the UI view for back-end annotations -->
<span class="SAP-icons-V5"></span>

<!-- Screenshot reference shown in the documentation -->
<img src="images/Overriding_annotations_64a3f74.png" alt="Overriding annotations screenshot"/>
```

**STEP**: Creating Additional Local Annotation Files

**DESCRIPTION**:
- Use the Annotation File Manager to create new local annotation files for an OData service (not supported for CAP CDS).
- Procedure:
  1. Right-click the manifest.json file in the project and select "Open Annotation File Manager".
  2. Click "Create Local Annotation File".
  3. Enter the new file name, the XML namespace, and choose the folder location within the project.
  4. Click "Create" to generate the local annotation file and associate it with the service.
- File creation constraints:
  - Additional annotation files can only be created for OData services (not CAP CDS).
  - After creation, use the Annotation File Manager or the language server (see "Maintaining Annotations with Language Server") to edit and maintain annotations.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "manifest": "manifest.json",
  "annotationFileCreationSteps": [
    "Right-click manifest.json -> Open Annotation File Manager",
    "Click 'Create Local Annotation File'",
    "Enter: file name, namespace, folder",
    "Click 'Create'"
  ],
  "note": "Additional annotation files can only be created for an OData service, not CAP CDS."
}
```
--------------------------------

**TITLE**: Overview of features in generated Fiori projects

**INTRODUCTION**: This document lists and links the key features included in projects generated by the fiori-tools generator. Use the linked documentation files to implement, configure, or troubleshoot each feature in your generated project.

**TAGS**: fiori-tools, SAP Fiori, project-generation, annotation-support, taskbar-notification, edit-in-source, automatic-generation, i18n, project-cleanup

**STEP**: 1 — Annotation Support

**DESCRIPTION**: Read and apply the Annotation Support guidance to enable or customize OData annotation handling in generated projects. Use this when you need model-driven UI elements, metadata annotations, or to extend annotation processing.

**LANGUAGE**: Markdown

**CODE**:
```markdown
[Annotation Support](annotation-support-796f6a4.md)
```

**STEP**: 2 — Taskbar Notification

**DESCRIPTION**: Follow the Taskbar Notification documentation to enable desktop taskbar notifications or in-app notifications integrated with the generated app. Use this to notify users of background tasks, updates, or long-running operations.

**LANGUAGE**: Markdown

**CODE**:
```markdown
[Taskbar Notification](taskbar-notification-c66373a.md)
```

**STEP**: 3 — Edit in Source Code

**DESCRIPTION**: Use the Edit in Source Code guide to open, modify, and persist generated UI or controller code. This is required when customizing generated artifacts beyond declarative configuration.

**LANGUAGE**: Markdown

**CODE**:
```markdown
[Edit in Source Code](edit-in-source-code-7d8e942.md)
```

**STEP**: 4 — Automatic Generation

**DESCRIPTION**: Refer to Automatic Generation to understand the scaffolding process, templates used, and how to re-run or customize the generator for regeneration of project artifacts.

**LANGUAGE**: Markdown

**CODE**:
```markdown
[Automatic Generation](automatic-generation-576f9fe.md)
```

**STEP**: 5 — Internationalization (i18n)

**DESCRIPTION**: Follow the Internationalization (i18n) documentation to add or modify translations, resource bundles, and locale handling within the generated project. Use this for multi-language support and locale-specific formatting.

**LANGUAGE**: Markdown

**CODE**:
```markdown
[Internationalization (i18n)](internationalization-i18n-eb427f2.md)
```

**STEP**: 6 — Project Cleanup

**DESCRIPTION**: Use Project Cleanup instructions to remove unnecessary files, apply best-practice folder structure, and clean up generated placeholders before committing or deploying the project.

**LANGUAGE**: Markdown

**CODE**:
```markdown
[Project Cleanup](project-cleanup-2640899.md)
```
--------------------------------

**TITLE**: Peek and Go To Definition for Annotation References

**INTRODUCTION**: This document explains how to use Peek Definition and Go To Definition to preview, navigate to, and update annotation sources while editing annotation references or translatable string values. Use these actions when your cursor is inside a referenced annotation value or a path that references an annotation term segment.

**TAGS**: fiori-tools, annotations, peek-definition, go-to-definition, vscode, sap-business-application-studio, navigation, editor-shortcuts

**STEP**: Peek Definition — trigger and behavior

**DESCRIPTION**: Preview and edit the referenced annotation inline (without switching tabs). Place the text cursor inside the referenced annotation value or path segment and use one of the triggers below. If the annotation is defined in multiple sources, a list of sources is shown; select one to open the inline preview. Note: annotation layering is not considered.

**LANGUAGE**: XML

**CODE**:
```xml
<!-- Place the text cursor (|) inside the annotation reference value below -->
<PropertyValue Property="Value" Path="@UI.LineItem/0/Label|"/>
```

**LANGUAGE**: XML

**CODE**:
```xml
<!-- Place the cursor inside a translatable string value -->
<Annotation Term="UI.HeaderInfo">
  <Record>
    <PropertyValue Property="Title" String="Sales Order |"/>
  </Record>
</Annotation>
```

**STEP**: Peek Definition — triggers (actions to implement in code generators)

**DESCRIPTION**: Implement editor integrations that call the inline preview action when the caret is inside an annotation reference or translatable string. Provide these triggers:

- Windows: Alt + F12
- macOS: Option (Alt) + F12
- Mouse: right-click → "Peek Definition"

Ensure the inline pane allows editing and saving back to the selected source file.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "peekDefinitionTriggers": {
    "windows": "Alt+F12",
    "macos": "Option+F12",
    "contextMenu": "RightClick -> Peek Definition"
  },
  "behavior": "Show inline preview/editor. If multiple sources exist, list and allow selection. Annotation layering not considered."
}
```

**STEP**: Go To Definition — trigger and behavior

**DESCRIPTION**: Jump to the annotation source file and open it in a new editor tab scrolled to the exact annotation location. Place the text cursor inside the path referencing the annotation term segment or inside the translatable string value and use one of the triggers below. If the annotation is defined in multiple sources, show the Peek Definition listing instead.

**LANGUAGE**: XML

**CODE**:
```xml
<!-- Place the cursor (|) inside the reference to trigger Go To Definition -->
<PropertyValue Property="Value" Path="@com.example.vocabularies.UI.v1.LineItem/0/Label|"/>
```

**STEP**: Go To Definition — triggers (actions to implement in code generators)

**DESCRIPTION**: Implement editor integrations that navigate to the definition location when the caret is inside the annotation reference. Provide these triggers:

- Visual Studio Code: F12
- SAP Business Application Studio: Ctrl + F11
- Mouse context menu: right-click → "Go To Definition"
- Modifier + click:
  - Windows: Ctrl + click
  - macOS: Cmd + click

Open the source file in a new tab and scroll to the annotation location. If multiple sources exist, present the Peek Definition list instead of directly navigating.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "goToDefinitionTriggers": {
    "vscode": "F12",
    "sap_bas": "Ctrl+F11",
    "contextMenu": "RightClick -> Go To Definition",
    "modifierClick": {
      "windows": "Ctrl + Click",
      "macos": "Cmd + Click"
    }
  },
  "behavior": "Open source file in new tab at exact annotation location. If multiple sources exist, show Peek Definition list. Annotation layering not considered."
}
```
--------------------------------

**TITLE**: Progress Column — Add, Move, and Delete in Fiori Tools Page Editor

**INTRODUCTION**: This guide describes how to add a Progress Column (UI.DataPoint + UI.LineItem DataFieldForAnnotation) to a table/section in the Fiori Tools Page Editor, how the annotation is created and what default values are set, how to move the column within a table, and how to delete it. Use the examples to generate or modify annotation XML and to implement editor automation.

**TAGS**: fiori-tools, SAP Fiori, progress column, UI.DataPoint, UI.LineItem, annotations, micro charts

**STEP**: Add Progress Column

**DESCRIPTION**: Add a Progress Column to a table/section via the Page Editor. The editor creates a UI.DataPoint annotation and a UI.LineItem entry (UI.DataFieldForAnnotation) that references the DataPoint. Default property values set by the editor: Value = chosen numeric property, TargetValue = 100, Visualization = Progress. If the table/entity has no numeric properties or they are all already used in the table, the Add Progress Column option is disabled.

Action steps (user flow):
- Click the + (Add) icon in the Columns node in the Page Editor and choose Add Progress Column.
- Select the property to use as the Value.
- The editor creates the UI.DataPoint and updates UI.LineItem with a UI.DataFieldForAnnotation referencing the DataPoint and a generated Label.

Preserve these anchors/links for additional property references:
- Label: appendix-457f2e9.md#loiod44832d99bdf4f73ba14cdbb16dc9301
- Importance: appendix-457f2e9.md#loio7fe32a215209419da6d6c19da0f69ccb
- Hidden: appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0
- Target Type: appendix-457f2e9.md#loio678bf9265c664134a075b59fd193c64e
- Target: appendix-457f2e9.md#loio7fba03aba4214ceab2130f16186f4ff2
- Criticality for Micro Charts and Progress Indicators: appendix-457f2e9.md#loio19d82b5d8bc940738afcb49b51a48bed__section_xdw_kkj_kfc
- Tooltip Source: appendix-457f2e9.md#loiof0bc466aae5b42e697c89506026050af

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**LANGUAGE**: XML

**CODE**:
```xml
<!-- Example annotation created by Page Editor when adding a Progress Column -->
<Annotations Target="YourService.YourEntityType">
  <!-- DataPoint for progress -->
  <Annotation Term="UI.DataPoint" Qualifier="Progress1">
    <Record>
      <!-- Value: user-selected numeric property -->
      <PropertyValue Property="Value" Path="ProgressProperty"/>
      <!-- TargetValue: default 100 -->
      <PropertyValue Property="TargetValue" Int="100"/>
      <!-- Visualization: Progress -->
      <PropertyValue Property="Visualization" EnumMember="UI.VisualizationType/Progress"/>
    </Record>
  </Annotation>

  <!-- LineItem updated with DataFieldForAnnotation referencing the DataPoint -->
  <Annotation Term="UI.LineItem">
    <Collection>
      <Record Type="UI.DataFieldForAnnotation">
        <!-- Generated label based on selected property -->
        <PropertyValue Property="Label" String="ProgressProperty"/>
        <!-- Reference to the DataPoint annotation -->
        <PropertyValue Property="Target" AnnotationPath="@UI.DataPoint#Progress1"/>
      </Record>
      <!-- other line items... -->
    </Collection>
  </Annotation>
</Annotations>
```

**STEP**: Progress Column Properties (post-creation)

**DESCRIPTION**: After the Progress Column is added, the editor exposes these configurable properties. Use these anchors to programmatically read or set values in the annotation or UI metadata.

- Label — appendix-457f2e9.md#loiod44832d99bdf4f73ba14cdbb16dc9301
- Importance — appendix-457f2e9.md#loio7fe32a215209419da6d6c19da0f69ccb
- Hidden — appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0
- Target Type — appendix-457f2e9.md#loio678bf9265c664134a075b59fd193c64e
- Target — appendix-457f2e9.md#loio7fba03aba4214ceab2130f16186f4ff2
- Criticality (micro charts & progress indicators) — appendix-457f2e9.md#loio19d82b5d8bc940738afcb49b51a48bed__section_xdw_kkj_kfc
- Tooltip Source — appendix-457f2e9.md#loiof0bc466aae5b42e697c89506026050af

**LANGUAGE**: N/A

**CODE**:
```text
// No code block; use the annotation XML above to set/update these properties.
```

**STEP**: Move Progress Column within a Table

**DESCRIPTION**: Reorder the Progress Column inside a table using either Drag and Drop (multi-column support) or Arrow Icons (single-column, stepwise).

- Drag and Drop:
  - Hover over the table column outline, press and hold the mouse button, drag to the desired position (eligible drop positions are highlighted in green), and release.
  - To move multiple columns at once, use keyboard modifier: press Ctrl + + while performing the drag-and-drop operation.

- Arrow Icons:
  - Click the Move Up () or Move Down () icon next to the column name in the Page Editor to move the column one position up or down. This moves only one column at a time.

**LANGUAGE**: N/A

**CODE**:
```text
// UI interactions; no code to generate. Implement editor automation to call the table column reorder routine
// or update UI.LineItem Collection ordering in the annotations XML to reflect new column order.
```

**STEP**: Delete Progress Column

**DESCRIPTION**: Remove the Progress Column via the Page Editor. This deletes the UI.LineItem entry referencing the DataPoint and may optionally remove the UI.DataPoint annotation if unused.

Action steps:
1. Navigate to the column in the Columns tree.
2. Click the Delete (wastebasket) icon to open the Delete Confirmation dialog.
3. Click Delete to confirm removal.

Implementation note: When automating deletion, remove the UI.DataFieldForAnnotation record from UI.LineItem and consider removing the corresponding UI.DataPoint if it has no other references.

**LANGUAGE**: N/A

**CODE**:
```text
// Pseudocode for automation:
// 1. Locate UI.LineItem Collection in annotations for the entity.
// 2. Remove DataFieldForAnnotation element where Target references @UI.DataPoint#ProgressQualifier.
// 3. If no remaining references to @UI.DataPoint#ProgressQualifier, remove the UI.DataPoint annotation.
```
--------------------------------

**TITLE**: Project Cleanup — Remove Orphaned UI Annotations

**INTRODUCTION**: This document describes a deterministic cleanup procedure for Fiori Tools projects. The cleanup removes orphaned UI annotations (UI.FieldGroup, UI.LineItem) that are not referenced by UI.ReferenceFacet targets, and removes property-level annotations using specific terms when those properties are not referenced anywhere by remaining annotations. Use this procedure in build tools or RAG-based code generators to automatically prune unused annotations from OData annotation files (XML or JSON).

**TAGS**: fiori-tools, cleanup, annotations, UI.FieldGroup, UI.LineItem, UI.ReferenceFacet, OData, TypeScript

STEP: 1 — Gather annotation files and parse them

DESCRIPTION: Read all annotation files in the project (XML or JSON). Parse them into an in-memory representation that allows walking annotation elements and terms. Use a parser that supports OData annotation XML (EDMX/Annotations) and JSON annotation formats.

LANGUAGE: TypeScript

CODE:
```typescript
// Example: collect all annotation files and parse XML/JSON into an AST-like structure.
// Requires: npm install fast-xml-parser glob fs-extra
import { readFile } from 'fs/promises';
import { parse as parseXml } from 'fast-xml-parser';
import glob from 'glob';

async function loadAnnotationFiles(projectRoot: string) {
  const patterns = ['**/*.annotations.xml', '**/*.xml', '**/*.annotations.json', '**/*.json'];
  const files = patterns.flatMap(pattern => glob.sync(pattern, { cwd: projectRoot, absolute: true }));
  const contents = await Promise.all(files.map(async f => ({ path: f, text: await readFile(f, 'utf8') })));
  return contents.map(c => {
    const isJson = c.path.endsWith('.json');
    return {
      path: c.path,
      format: isJson ? 'json' : 'xml',
      ast: isJson ? JSON.parse(c.text) : parseXml(c.text, { ignoreAttributes: false, attributeNamePrefix: '@_' })
    };
  });
}
```

STEP: 2 — Collect referenced UI.ReferenceFacet targets

DESCRIPTION: Walk all parsed annotation ASTs and collect targets referenced by UI.ReferenceFacet. These targets define which facets/annotations are actually used by the UI. Normalize target strings to the canonical form used in your annotation files (e.g., "EntityType/AnnotationName" or "Namespace.Type/Annotations").

LANGUAGE: TypeScript

CODE:
```typescript
// Example: extract all targets referenced by UI.ReferenceFacet in parsed ASTs.
// This sample assumes the XML parse resulted in an object model where annotation elements
// include term names and attributes like Target or Path.
function collectReferenceFacetTargets(parsedFiles: { path: string; format: string; ast: any }[]) {
  const targets = new Set<string>();
  for (const file of parsedFiles) {
    const root = file.ast;
    // Walk AST to find UI.ReferenceFacet occurrences. Implementation depends on your parser output.
    // Example for xml->object where elements appear under "Annotations" -> "Annotation" etc.
    function walk(node: any) {
      if (!node || typeof node !== 'object') return;
      for (const [k, v] of Object.entries(node)) {
        if (k.includes('ReferenceFacet') || (Array.isArray(v) && v.some((e: any) => e?.['@_Term']?.endsWith('UI.ReferenceFacet')))) {
          if (Array.isArray(v)) {
            for (const item of v) {
              const t = item['@_Target'] || item['Target'] || item['@_Term'] || item.Target;
              if (t) targets.add(String(t));
            }
          }
        }
        if (typeof v === 'object') walk(v);
      }
    }
    walk(root);
  }
  return targets;
}
```

STEP: 3 — Detect orphaned UI.FieldGroup and UI.LineItem annotations

DESCRIPTION: Find all UI.FieldGroup and UI.LineItem annotation elements. For each element, check whether its annotation target is included in the ReferenceFacet targets set. If not referenced, mark the element for removal.

LANGUAGE: TypeScript

CODE:
```typescript
// Example detection: returns list of file paths and element locations to remove.
// This example assumes each annotation element has a Target attribute or can be identified by path.
function findOrphanedFieldGroupsAndLineItems(parsedFiles: { path: string; ast: any }[], referenceTargets: Set<string>) {
  const orphaned: { path: string; element: any; term: string; target: string }[] = [];
  for (const file of parsedFiles) {
    function walk(node: any, parent?: any) {
      if (!node || typeof node !== 'object') return;
      for (const [k, v] of Object.entries(node)) {
        // Check UI.FieldGroup or UI.LineItem terms in keys or attributes
        if (k.includes('FieldGroup') || k.includes('LineItem') || (Array.isArray(v) && v.some((e: any) => e?.['@_Term']?.includes('UI.FieldGroup') || e?.['@_Term']?.includes('UI.LineItem')))) {
          const items = Array.isArray(v) ? v : [v];
          for (const item of items) {
            const target = item['@_Target'] || item.Target || item['@_Path'] || item.Path || '';
            const term = item['@_Term'] || item['Term'] || k;
            if (!referenceTargets.has(target)) {
              orphaned.push({ path: file.path, element: item, term, target });
            }
          }
        }
        if (typeof v === 'object') walk(v, node);
      }
    }
    walk(file.ast);
  }
  return orphaned;
}
```

STEP: 4 — Identify property-level annotations to remove

DESCRIPTION: Identify annotations applied to entity properties using any of these terms:
- UI.MultiLineText
- Common.ValueListWithFixedValues
- Common.Text
- Common.ValueList
- Common.FieldControl

For each such property annotation, check whether the property is referenced in any referenced annotations (e.g., in UI.ReferenceFacet targets, UI.LineItem Field paths, UI.FieldGroup property references). If the property is not mentioned anywhere by referenced annotations, mark it for removal.

LANGUAGE: TypeScript

CODE:
```typescript
// Example: detect property-level annotations for the listed terms and mark if unreferenced.
const PROPERTY_TERMS = new Set([
  'UI.MultiLineText',
  'Common.ValueListWithFixedValues',
  'Common.Text',
  'Common.ValueList',
  'Common.FieldControl'
]);

function findUnreferencedPropertyAnnotations(parsedFiles: { path: string; ast: any }[], referencedProperties: Set<string>) {
  const toRemove: { path: string; propertyPath: string; term: string; node: any }[] = [];
  for (const file of parsedFiles) {
    function walk(node: any) {
      if (!node || typeof node !== 'object') return;
      for (const [k, v] of Object.entries(node)) {
        if (Array.isArray(v)) {
          for (const item of v) {
            const term = item?.['@_Term'] || item?.Term || '';
            if (PROPERTY_TERMS.has(term)) {
              const propertyPath = item['@_Path'] || item.Path || item['@_Property'] || '';
              if (propertyPath && !referencedProperties.has(propertyPath)) {
                toRemove.push({ path: file.path, propertyPath, term, node: item });
              }
            }
            if (typeof item === 'object') walk(item);
          }
        } else if (typeof v === 'object') {
          walk(v);
        }
      }
    }
    walk(file.ast);
  }
  return toRemove;
}
```

STEP: 5 — Remove marked elements and write back files

DESCRIPTION: For each marked annotation element (orphaned field groups/line items and unreferenced property annotations), remove it from the AST and serialize the AST back to the original file format (XML or JSON). Preserve file encoding and formatting where possible.

LANGUAGE: TypeScript

CODE:
```typescript
// Example: naive removal and write-back. For XML, convert AST back to XML (use fast-xml-parser j2x or a dedicated writer).
import { writeFile } from 'fs/promises';
import { j2xParser as J2xParser } from 'fast-xml-parser';

async function removeAndWrite(parsedFiles: { path: string; format: string; ast: any }[], removals: { path: string; predicate: (node: any) => boolean }[]) {
  for (const file of parsedFiles) {
    // Remove nodes matching any predicate for this file
    function walkAndFilter(node: any, parent?: any, key?: string) {
      if (!node || typeof node !== 'object') return;
      for (const [k, v] of Object.entries(node)) {
        if (Array.isArray(v)) {
          node[k] = v.filter(item => !removals.some(r => r.path === file.path && r.predicate(item)));
          for (const item of node[k]) walkAndFilter(item, node, k);
        } else if (typeof v === 'object') {
          walkAndFilter(v, node, k);
        }
      }
    }
    walkAndFilter(file.ast);

    // Serialize back
    if (file.format === 'json') {
      await writeFile(file.path, JSON.stringify(file.ast, null, 2), 'utf8');
    } else {
      const j2x = new J2xParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const xml = j2x.parse(file.ast);
      await writeFile(file.path, xml, 'utf8');
    }
  }
}
```

STEP: 6 — Validation and safety

DESCRIPTION: Before permanently deleting annotations:
- Produce a dry-run report listing all elements that would be removed (file paths, terms, targets, property paths).
- Optionally back up original annotation files.
- Validate resulting annotations (schema/EDMX validation or run UI runtime checks) to ensure nothing critical was removed.

LANGUAGE: TypeScript

CODE:
```typescript
// Example: produce a dry-run report
function dryRunReport(orphanedFieldGroups: any[], unreferencedProperties: any[]) {
  return {
    orphanedFieldGroups: orphanedFieldGroups.map(o => ({ file: o.path, term: o.term, target: o.target })),
    unreferencedProperties: unreferencedProperties.map(u => ({ file: u.path, propertyPath: u.propertyPath, term: u.term }))
  };
}
```

STEP: 7 — Summary of removal rules (explicit)

DESCRIPTION: Apply the following explicit rules in implementation:
- Remove UI.FieldGroup and UI.LineItem annotation nodes that are not referenced as targets by any UI.ReferenceFacet.
- Remove annotations that use any of these terms when applied to entity properties that are not referenced anywhere by the set of referenced annotations:
  - UI.MultiLineText
  - Common.ValueListWithFixedValues
  - Common.Text
  - Common.ValueList
  - Common.FieldControl

LANGUAGE: Plain text

CODE:
```text
Removal rules:
- Orphan UI nodes: UI.FieldGroup, UI.LineItem -> remove if not referenced by UI.ReferenceFacet targets.
- Property annotations to remove when unreferenced:
  * UI.MultiLineText
  * Common.ValueListWithFixedValues
  * Common.Text
  * Common.ValueList
  * Common.FieldControl
```

Step: Implementation notes

DESCRIPTION: Use the provided TypeScript snippets as templates. Adapt parsing and AST traversal logic to your project's annotation format. Ensure normalization of target/property paths so comparisons correctly detect references (qualifiers, namespace prefixes, and annotation path forms must match). Always run a dry-run and backup before final write-back.

LANGUAGE: Plain text

CODE:
```text
Notes:
- Annotation format differences (EDMX XML vs. JSON) require tailored parsing and serialization.
- Normalize targets and property paths (e.g., EntityType/Property or Namespace.Type/Annotations) before membership checks.
- Provide dry-run and backup options to avoid accidental data loss.
```
--------------------------------

**TITLE**: Rating Column — Add, Move, and Delete (Fiori Tools)

**INTRODUCTION**: Instructions and code examples for adding a rating column to a Fiori list report table or object page section, including the exact annotation created, how to move columns within the table, and how to delete a rating column. Use these steps when authoring pages in the Page Editor or when creating annotation XML manually.

**TAGS**: fiori-tools, rating, UI.DataPoint, annotation, table, list-report, object-page, sap-icons

**STEP**: 1 — Include SAP icons stylesheet (if icon classes are used)

**DESCRIPTION**: Ensure the SAP icons stylesheet is available in your editor or HTML page so icon classes (used in the Page Editor UI and examples) render correctly. Keep the relative path as in your project.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**STEP**: 2 — Add a Rating Column via Page Editor

**DESCRIPTION**: Use the Page Editor Columns node to add a rating column to a table or section. This creates a UI.DataPoint annotation with the required properties. Follow the UI steps:
- Click "Add Rating Columns" from the + (Add) icon in the Columns node.
- Select the target Columns node using the tree control.
- Click Add. The editor creates a UI.DataPoint annotation with:
  - Value: bound to the property you chose (replace PropertyName).
  - TargetValue: set to 5.
  - Visualization: set to enum value Rating.

Also available column properties you can set afterward:
- Label (see appendix-457f2e9.md#loiod44832d99bdf4f73ba14cdbb16dc9301)
- Importance (appendix-457f2e9.md#loio7fe32a215209419da6d6c19da0f69ccb)
- Hidden (appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0)
- Target Value (appendix-457f2e9.md#loioa9654b0fd63443d9b2727d1a497f84b6)
- Tooltip Source (appendix-457f2e9.md#loiof0bc466aae5b42e697c89506026050af)

If you author annotations manually, add a DataPoint annotation like the XML example below. Replace Target and Path values to match your entity/property names.

**LANGUAGE**: XML

**CODE**:
```xml
<!-- Example OData annotation (replace Target and PropertyName accordingly) -->
<Annotations Target="YourService.YourEntityType">
  <Annotation Term="com.sap.vocabularies.UI.v1.DataPoint">
    <Record>
      <!-- Value bound to the data property chosen by the user -->
      <PropertyValue Property="Value" Path="PropertyName"/>
      <!-- TargetValue default set to 5 -->
      <PropertyValue Property="TargetValue" Int="5"/>
      <!-- Visualization set to Rating -->
      <PropertyValue Property="Visualization" EnumMember="UI.VisualizationType/Rating"/>
    </Record>
  </Annotation>
</Annotations>
```

**STEP**: 3 — Move Rating Column within a Table

**DESCRIPTION**: Reorder columns in the table using either drag-and-drop or arrow controls in the Page Editor UI.

Options:
- Drag and Drop: Hover the column header, press and hold the mouse button, move the column to the desired highlighted position (eligible positions show in green), and release. To move multiple selected columns at once, hold Ctrl while selecting columns and drag.
- Arrow Icons: Use the Move Up (icon) or Move Down (icon) next to the column name in the Columns node to shift a single column one position at a time.

**LANGUAGE**: Text

**CODE**:
```text
Drag and Drop:
- Hover column outline -> mouse down -> move to highlighted position -> release
- To move multiple columns: select multiple (Ctrl+click) then drag

Arrow Icons:
- Click Move Up () or Move Down () next to the column name (moves one column at a time)
```

**STEP**: 4 — Delete a Rating Column

**DESCRIPTION**: Remove a rating column via the Page Editor Columns node.

Steps:
1. Navigate to the column in the Columns node.
2. Click the Delete (wastebasket) icon to open the Delete Confirmation popup.
3. Click Delete in the popup to confirm and remove the column (this removes the corresponding annotation).

**LANGUAGE**: Text

**CODE**:
```text
Delete steps:
1. Select column in Columns node
2. Click 🗑️ (Delete) icon -> Delete Confirmation dialog appears
3. Click Delete to confirm removal of the column and its annotation
```
--------------------------------

**TITLE**: Request a New Guide

**INTRODUCTION**: Instructions for requesting a new guided development guide in the Fiori tools extension. Includes all entry points to open the Request Guide form, the form fields and submission flow, and reference links and assets.

**TAGS**: fiori-tools, guided-development, guide-request, SAP-Fiori-elements, extension, documentation

**STEP**: 1 — Entry points to open the Request Guide form

**DESCRIPTION**: Use one of these entry points in the Fiori tools guided development extension to open the Request Guide form.

**LANGUAGE**: text

**CODE**:
```text
- Scroll to the bottom of the guides list and click "Request Guide" in the "Don't have what you are looking for?" section.
- Enter "request guide" into the Search guides field.
- Hover over the Help icon (SAP icon glyph) and select "Request New Guide" from the drop-down list.
- Use the Command Palette entry: Fiori: Request New Guide
```

**STEP**: 2 — Help icon and icons stylesheet

**DESCRIPTION**: The Help icon uses SAP icon styles. If you need the icon resources in local documentation or extension HTML, include the sap-icons stylesheet. The guided development UI includes a visual "HELP" icon; the same SAP icons stylesheet reference is used by the extension.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**STEP**: 3 — INFORMATION panel useful links visual reference

**DESCRIPTION**: From the INFORMATION panel, under the USEFUL LINKS section, choose "Guide Requests for Guided Development". The panel includes a screenshot asset used in docs; keep the image asset path for reference or inclusion.

**LANGUAGE**: HTML

**CODE**:
```html
<img src="images/Fiori_Tools_Guide_Requests_for_Guided_Development_4f9571c.png" alt="Guide Requests for Guided Development"/>
```

**STEP**: 4 — Fill and submit the Request Guide form

**DESCRIPTION**: Complete the Request Guide form fields, submit, and send the generated email. Follow these exact actions to ensure the request is delivered:

- Fill in these fields:
  - Name (your full name)
  - Email (your contact email)
  - Title (brief title for the new guide)
  - Description (detailed description of the feature or guide requested)
- Click Submit.
- An email client will open with a pre-populated message. Check the message content, adjust if required, then click Send in your email client.

**LANGUAGE**: text

**CODE**:
```text
Form fields:
- Name: [Your full name]
- Email: [Your email address]
- Title: [Short guide title]
- Description: [Detailed request / what you need]

Buttons:
- Submit -> opens default email client with composed message
- After email client opens: Review message -> Click Send
```

**STEP**: 5 — Reference documentation link

**DESCRIPTION**: For more information about available features in SAP Fiori elements applications, reference the official documentation.

**LANGUAGE**: text

**CODE**:
```text
Developing Apps with SAP Fiori elements:
https://ui5.sap.com/#/topic/03265b0408e2432c9571d6b3feb6b1fd
```
--------------------------------

**TITLE**: Search and Filter Guides in Guided Development (fiori-tools)

**INTRODUCTION**: This document explains how to find, group, filter, and search the list of guided development guides in fiori-tools. Use these steps to programmatically or interactively narrow the available guides by project relevance, page type, OData version, application artifact, annotation type, tags, and free-text search. Includes UI strings and the CSS reference used for icons.

**TAGS**: fiori-tools, guided-development, search, filters, annotations, OData, SAPUI5, UI5, manifest, flex, lines

STEP: 1 - Include icons stylesheet

DESCRIPTION: Ensure the SAP icons stylesheet is referenced so UI icon classes render correctly. Keep the relative path as shown in the guided-development UI.

LANGUAGE: HTML

CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: 2 - Group by options

DESCRIPTION: Group the guides list by one of three dimensions. Use the correct grouping to surface guides relevant to the current project context.

- Page Type: Group by page/template type. A guide can appear in multiple page type groups; when a multi-page-type guide is selected, the guide relevant to the current project page type is highlighted.
- OData Version: Group by OData service version (V2 vs V4). If a guide is not available for the current OData version, show a version warning.
  Tip: Some guides are available for both OData V2 and V4 but instructions can differ.
- Application Artifacts: Group by the artifact the guide changes: Manifest Change, Flex Change, or Annotations.

Annotations-specific grouping:
- XML Annotation
- CAP CDS Annotation
- ABAP CDS Annotation

Tip: Some guides span multiple annotation types; parameters and code snippets differ per annotation type.

LANGUAGE: TEXT

CODE:
```text
Group by options: Page Type, OData Version, Application Artifacts
Annotation categories: XML Annotation, CAP CDS Annotation, ABAP CDS Annotation
Tip: Guides available for multiple OData/annotation types may contain different instructions per type.
```

STEP: 3 - Default view and how to change it

DESCRIPTION: By default, only guides relevant to the current project are shown. Use the View dropdown to switch between "Project Guides" (default filtered view) and "All Guides" (full list). Follow these steps:

1. Select a project from the Project dropdown.
2. Set the View dropdown:
   - All Guides — shows all guides in guided development.
   - Project Guides — shows only guides applicable to the selected project.

When All Guides is selected, non-applicable guides are indicated and the UI displays an information icon and message. If a non-applicable guide is opened, display an explicit warning.

LANGUAGE: TEXT

CODE:
```text
Steps:
1. Select project from Project dropdown.
2. In View dropdown, choose:
   - "All Guides" to display all guides.
   - "Project Guides" to display only applicable guides.

Information message shown when "All Guides" selected:
[Information icon] Not all guides are applicable to [project name]. Click here to see all project guides.

Warning message when opening a non-compatible guide:
This guide isn’t compatible with the current project and will not work as intended.
```

STEP: 4 - Visual indicators and exact UI strings

DESCRIPTION: Use these exact UI strings and icon classes when rendering or checking the guided-development UI for compatibility or automation scripts.

LANGUAGE: HTML / TEXT

CODE:
```html
Span for information icon (example):
<span class="SAP-icons-V5"></span>  /* Information icon */

Span for filter icon (example):
<span class="SAP-icons-V5"></span>  /* Filter icon */
```

```text
UI strings:
- Information message (shown with icon when "All Guides" selected):
  "Not all guides are applicable to [project name]. Click here to see all project guides."

- Warning when a guide is not compatible:
  "This guide isn’t compatible with the current project and will not work as intended."
```

STEP: 5 - Filter by tags

DESCRIPTION: Use the Filter icon to select one or more predefined tags. The returned list must include only guides that contain all selected tags (logical AND). Implement multi-tag filtering accordingly.

LANGUAGE: TEXT

CODE:
```text
Filter behavior:
- Click filter icon: <span class="SAP-icons-V5"></span>
- Select one or more tags.
- Result: only guides that include ALL selected tags are displayed (logical AND).
```

STEP: 6 - Search guides text behavior

DESCRIPTION: The Search guides input filters guides by titles, descriptions, annotation terms, and information links. The search is incremental (type-ahead): each new character further narrows results. Use examples when implementing or testing search.

LANGUAGE: TEXT

CODE:
```text
Search behavior:
- Fields searched: title, description, annotation terms, information links.
- Increments on each keystroke (type-ahead).
- Example: To find guides relevant to the UI.LineItem annotation, enter "UI.LineItem" in the Search guides field.
```

STEP: 7 - Example end-to-end usage (interactive flow)

DESCRIPTION: Example sequence to find a specific annotation guide applicable to your project:

1. Select your project in Project dropdown.
2. Ensure View = "Project Guides" to show applicable guides (or "All Guides" to see all).
3. Set Group by = "Application Artifacts" and choose "Annotations" (or specific annotation grouping).
4. Click Filter icon and pick relevant tags.
5. Enter "UI.LineItem" (or any annotation term) in Search guides.
6. Open a guide; if it’s not compatible, detect and surface the warning:
   "This guide isn’t compatible with the current project and will not work as intended."

LANGUAGE: TEXT

CODE:
```text
Example flow:
1. Project = [your-project]
2. View = Project Guides
3. Group by = Application Artifacts -> Annotations
4. Filter by tags = [tag1, tag2]
5. Search = "UI.LineItem"
6. Open guide -> if incompatible, show warning string.
```
--------------------------------

**TITLE**: Sections

**INTRODUCTION**: This document enumerates the section types that can be created, modified, or deleted on Form and Object pages. Use the referenced section files for implementation details and examples. This is a quick index for code-generation and editor automation tasks that need to manipulate page sections.

**TAGS**: fiori-tools, sections, form, object-page, UI5, navigation

**STEP**: 1 — Overview of available sections

**DESCRIPTION**: Review the list of supported section types. Each entry points to a dedicated document containing implementation details. Use these documents when generating, updating, or removing sections in an automated tool or code generator.

**LANGUAGE**: Markdown

**CODE**:
```Markdown
- Form Section: form-section-4102b3d.md
- Table Section: table-section-fc59378.md
- Identification Section: identification-section-b83f501.md
- Group Section: group-section-1894c47.md
- Custom section
```

**STEP**: 2 — Form Section

**DESCRIPTION**: Create, modify, or delete a Form Section on a Form or Object page by following the patterns and examples in the Form Section document. Use this for grouped input fields presented as a form.

**LANGUAGE**: Markdown

**CODE**:
```Markdown
Refer to: form-section-4102b3d.md
```

**STEP**: 3 — Table Section

**DESCRIPTION**: Create, modify, or delete a Table Section on a Form or Object page by following the patterns and examples in the Table Section document. Use this for lists or tabular data embedded in a page.

**LANGUAGE**: Markdown

**CODE**:
```Markdown
Refer to: table-section-fc59378.md
```

**STEP**: 4 — Identification Section

**DESCRIPTION**: Create, modify, or delete an Identification Section on a Form or Object page by following the patterns and examples in the Identification Section document. Use this for key-identifying fields and summary information.

**LANGUAGE**: Markdown

**CODE**:
```Markdown
Refer to: identification-section-b83f501.md
```

**STEP**: 5 — Group Section

**DESCRIPTION**: Create, modify, or delete a Group Section on a Form or Object page by following the patterns and examples in the Group Section document. Use this for logically grouped elements that are not necessarily form fields.

**LANGUAGE**: Markdown

**CODE**:
```Markdown
Refer to: group-section-1894c47.md
```

**STEP**: 6 — Custom section

**DESCRIPTION**: Implement a Custom Section when none of the standard section types fit the requirement. Define the section structure and behavior in your page descriptor or manifest and link to component/template code. Consult the related section documents above for integration patterns and reuse their conventions (naming, placement, lifecycle) when applicable.

**LANGUAGE**: Markdown

**CODE**:
```Markdown
Custom section — implement by creating a new section descriptor and corresponding component/template.
No predefined file: create new documentation or code file alongside:
e.g. custom-section-<identifier>.md
```
--------------------------------

**TITLE**: Supported Elements in Page Editor (Configure Page Elements)

**INTRODUCTION**: This reference lists the annotation-based UI elements that the "Configure Page Elements" tool supports for Fiori tools. Use this when generating code or producing annotations to ensure only supported elements are edited via the Page Editor; all other elements must be edited directly in the annotation files.

**TAGS**: fiori-tools, page-editor, configure-page-elements, list-report, object-page, annotations

STEP: 1 — Purpose and scope
DESCRIPTION: Explain when to use the Page Editor vs. direct annotation editing. Use the Page Editor only for the listed, supported elements. For any element not listed here, modify the corresponding annotation file directly.
LANGUAGE: Markdown
CODE:
```markdown
Supported via Configure Page Elements: only the elements listed in this document.
All other UI/annotation elements must be edited directly in the annotation file.
```

STEP: 2 — List Report elements supported by Page Editor
DESCRIPTION: The List Report view supports a large list of items and filtering. Configure the following elements with Configure Page Elements. For full element documentation consult the UI5 topic linked below.
LANGUAGE: JSON
CODE:
```json
{
  "pageType": "ListReport",
  "anchor": "loio47f0424e5bab4efab1cdba3839e18546__section_fst_nyx_dsb",
  "ui5Docs": "https://ui5.sap.com/#/topic/1cf5c7f5b81c4cb3ba98fd14314d4504",
  "supportedElements": [
    {
      "name": "Filter Fields",
      "doc": "filter-fields-0b84286.md"
    },
    {
      "name": "Table",
      "doc": "table-aaff7b1.md"
    }
  ],
  "note": "Only the elements listed above are supported in Configure Page Elements. All other List Report elements must be modified directly in the annotation file."
}
```

STEP: 3 — Object Page and Form Entry elements supported by Page Editor
DESCRIPTION: The Object Page supports display/edit/create of objects, drafts, and complex page layouts. Configure the following elements with Configure Page Elements. Refer to the UI5 Object Page topic for full details.
LANGUAGE: JSON
CODE:
```json
{
  "pageType": "ObjectPage / FormEntry",
  "anchor": "loio47f0424e5bab4efab1cdba3839e18546__section_erd_lby_dsb",
  "ui5Docs": "https://ui5.sap.com/#/topic/645e27ae85d54c8cbc3f6722184a24a1",
  "supportedElements": [
    {
      "name": "Header",
      "doc": "header-a05d7fc.md#loioa05d7fc1bbbf42a0ade9fb50f6b58b56"
    },
    {
      "name": "Form Section",
      "doc": "form-section-4102b3d.md"
    },
    {
      "name": "Table Section",
      "doc": "table-section-fc59378.md"
    },
    {
      "name": "Identification Section",
      "doc": "identification-section-b83f501.md"
    },
    {
      "name": "Group Section",
      "doc": "group-section-1894c47.md"
    },
    {
      "name": "Adding Custom Section",
      "doc": "maintaining-extension-based-elements-02172d2.md#loiode514dafa2364693baeabbb40d564006"
    },
    {
      "name": "Footer",
      "doc": "footer-1b391bd.md"
    }
  ],
  "note": "Only the elements listed above are supported in Configure Page Elements. All other Object Page elements must be modified directly in the annotation file."
}
```

STEP: 4 — Related information and next steps
DESCRIPTION: References for maintaining annotations and additional editing workflows.
LANGUAGE: Markdown
CODE:
```markdown
Related documentation:
- Maintaining Annotations with Language Server: maintaining-annotations-with-language-server-6fc93f8.md
- Configure Page Elements (entry point): configure-page-elements-047507c.md
```
--------------------------------

**TITLE**: Configure List Report Table: Sorting and Default Filtering (PresentationVariant & SelectionVariant)

**INTRODUCTION**: This document explains how to configure the List Report table in the Page Editor for SAP Fiori Tools. It focuses on Table presentation (sorting / grouping) via PresentationVariant and default table filtering via SelectionVariant. Use the Page Editor UI to generate, attach, detach, and maintain the relevant annotations. All referenced annotation names, file paths, and UI actions are preserved for automation or code-generation guidance.

**TAGS**: fiori-tools, table, list-report, annotations, UI.LineItem, PresentationVariant, SelectionVariant, sorting, filtering

STEP: 1 — Include SAP icon stylesheet
DESCRIPTION: Add the SAP icons stylesheet reference used by the Page Editor / preview. Place this link where application HTML requires icon styles (e.g., shell or preview page).
LANGUAGE: HTML
CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: 2 — Table overview and annotation references
DESCRIPTION: The List Report table is based on the UI.LineItem annotation. When generating or editing the List Report, Page Editor exposes annotation-based properties to control table behavior:
- Presentation Variant: attaches UI.SelectionPresentationVariant or UI.PresentationVariant to define sorting/grouping.
- Sort Order: list of properties and directions that the table sorts by.
- Selection Variant: attaches UI.SelectionPresentationVariant or UI.SelectionVariant to define default filters (SelectOptions).
- Default Filter: list of properties and conditions applied by default to the table.

Preserve these annotations in your annotation file and manifest. Page Editor can generate these annotations when you choose the New option.
LANGUAGE: Plaintext
CODE:
```
Annotations referenced:
- UI.LineItem
- UI.SelectionPresentationVariant
- UI.PresentationVariant
- UI.SelectionVariant
- SelectOptions (inside SelectionVariant)
- Capabilities.FilterRestrictions.NonFilterableProperties
- UI.Hidden
- UI.HiddenFilter
```

STEP: 3 — Configure table sorting (Presentation Variant)
DESCRIPTION: Use the Page Editor table node to set sorting via the Presentation Variant property:
1. Open the table node in Page Editor layout tree.
2. Set Presentation Variant to an existing annotation or choose New to generate UI.SelectionPresentationVariant or UI.PresentationVariant.
3. Click Add Sort Property to add one or more direct entity properties to Sort Order.
4. For each sort row, set Property and Direction (ascending/descending).
5. Re-order multiple sort properties by moving rows up/down to set precedence.
6. To detach the Presentation Variant created by Page Editor, set the property to None (this removes the reference; note: deleting the reference does not immediately delete the annotation file entry — use cleanup).
Notes:
- If the List Report uses an Analytical Chart, you can reuse the chart's Presentation Variant; sort order will then apply to both chart and table.
- Setting Presentation Variant to None deletes the UI.SelectionPresentationVariant reference in the manifest.
LANGUAGE: Plaintext
CODE:
```
Presentation Variant options:
- UI.SelectionPresentationVariant
- UI.PresentationVariant
UI actions:
- New (generate annotation)
- Add Sort Property (adds row with Property + Direction)
- Move Up / Move Down (change sort precedence)
- None (detach generated annotation)
```

STEP: 4 — Configure default table filtering (Selection Variant: Annotation)
DESCRIPTION: Use the table node's Selection Variant: Annotation property to attach a SelectionVariant that defines default filters:
1. In Page Editor, set Selection Variant: Annotation to an existing UI.SelectionVariant / UI.SelectionPresentationVariant or choose New to generate it.
2. If the List Report is configured with an Analytical Chart, you cannot maintain the selection variant in Page Editor.
3. To detach, set Selection Variant: Annotation to None.
4. After detaching, run the annotation cleanup procedure to remove unreferenced UI.SelectionPresentationVariant entries from the annotation file.
LANGUAGE: Plaintext
CODE:
```
Selection Variant options:
- UI.SelectionVariant
- UI.SelectionPresentationVariant
UI actions:
- New (generate annotation)
- None (detach selection variant)
Note: When detached, run cleanup to delete unreferenced annotations.
```

STEP: 5 — Define default filters (Selection Variant: Default Filters)
DESCRIPTION: When a Selection Variant annotation is attached, add Default Filters to define default SelectOptions:
1. Click Add Default Filter in the table node.
2. Select an available direct entity property for filtering.
   - Properties annotated with UI.Hidden or UI.HiddenFilter, or listed in Capabilities.FilterRestrictions.NonFilterableProperties are excluded and cannot be selected.
3. Configure filter conditions per row (operators/values as provided by Page Editor UI).
4. Multiple filters can reference the same property (create multiple rows).
5. Remove a default filter by clicking the Delete (trash/wastebasket) icon on the row.
LANGUAGE: Plaintext
CODE:
```
Default Filter actions:
- Add Default Filter (prompts selection among allowed properties)
- Allowed properties exclude:
  - Properties with UI.Hidden
  - Properties with UI.HiddenFilter
  - Properties listed in Capabilities.FilterRestrictions.NonFilterableProperties
- Delete (trash icon) removes the default filter row
```

STEP: 6 — Cleanup unreferenced annotations
DESCRIPTION: After detaching PresentationVariant or SelectionVariant entries (setting to None), run the annotation cleanup procedure to remove unreferenced UI.SelectionPresentationVariant, UI.SelectionVariant, and other qualifier-based unreferenced annotations from the annotation file so the file remains clean.
LANGUAGE: Plaintext
CODE:
```
Cleanup procedure:
- Run "annotation cleanup" that deletes unreferenced annotations created by Page Editor.
- Targets:
  - UI.SelectionPresentationVariant (unreferenced)
  - UI.SelectionVariant (unreferenced)
  - Other unreferenced annotations with qualifier
Note: This is a structural cleanup step; the specific cleanup command/tool depends on your project tooling.
```

STEP: 7 — Reference images and Page Editor UI screenshots
DESCRIPTION: Reference the Page Editor UI screenshots included in the repository for visual guidance when scripting UI automation or building tools that integrate with the Page Editor.
LANGUAGE: Plaintext
CODE:
```
Image assets (relative paths in docs):
- images/Fiori_Tools_Presentation_Variant_Table_d2a0977.png
- images/Default_Filter_Table_4308a97.png
```
--------------------------------

**TITLE**: Table Actions (fiori-tools)

**INTRODUCTION**: Quick, code-focused reference for configuring table actions and action menus in SAP Fiori tools Page Editor. Covers adding inline (column) and toolbar actions, external navigation (intent-based) actions, action menus, property maintenance, moving and deleting actions. Use these steps to generate or modify annotation records (UI.DataFieldForAction / UI.DataFieldForIntentBasedNavigation) and to verify required launchpad/manifest configuration.

**TAGS**: fiori-tools, table-actions, UI.DataFieldForAction, UI.DataFieldForIntentBasedNavigation, annotations, semantic-object, manifest.json, cross-application-navigation

STEP: Required assets (CSS)
DESCRIPTION: Ensure UI icons/CSS are available in the editor preview or documentation pages. This is the exact stylesheet link referenced by the original docs.
LANGUAGE: HTML
CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: Preconditions and scope for adding actions
DESCRIPTION: Verify available service metadata and bound actions/functions before adding table actions. Only actions/functions bound to the same entity type as the UI.LineItem of the target table are available. For external navigation actions, you must know the target application semantic object and action (as configured in the Fiori launchpad).
LANGUAGE: Text
CODE:
```text
Preconditions:
- Bound actions/functions must be defined on the same entity type used by UI.LineItem for the table.
- For external navigation: know the Semantic Object Name and Semantic Object Action of the target app (configured in Fiori launchpad).
- Configure cross-application navigation in both the launchpad and the target app's manifest.json.
```

STEP: Add a table action (inline column or toolbar)
DESCRIPTION: Use the Page Editor node for the table (List Report: Columns or Tool Bar; Object Page: Table section Columns or Tool Bar). Click Add (+) and choose Action or Function for in-app actions, or choose External Navigation and supply Semantic Object/Action for intent-based navigation. The editor will create a UI.DataFieldForAction or UI.DataFieldForIntentBasedNavigation record and set Inline = true when added as a table column.
LANGUAGE: Text
CODE:
```text
Page Editor -> Select Table node -> Columns or Tool Bar -> Click + (Add)
Choose:
- "Action" or "Function" for in-app action (creates UI.DataFieldForAction)
- "External Navigation" for intent-based navigation (creates UI.DataFieldForIntentBasedNavigation)
Result: UI.DataFieldForAction or UI.DataFieldForIntentBasedNavigation added.
If added as a table column: Inline is set to true.
```

STEP: UI.DataFieldForAction property example (Inline)
DESCRIPTION: Inline property controls whether an action appears as an inline column (true) or in the toolbar (false). When moved between toolbar and columns the Inline value toggles accordingly. Use this property when generating or modifying annotation JSON/EDMX.
LANGUAGE: JSON
CODE:
```json
{
  "RecordType": "UI.DataFieldForAction",
  "Action": "YourBoundActionName",
  "Inline": true,
  "Label": "My Action"
}
```

STEP: Add an external navigation action (intent-based)
DESCRIPTION: Supply Semantic Object Name and Semantic Object Action exactly as configured in the target application. The generated label is "Action SemanticObject" (e.g., Semantic Object = Customer, Action = display -> "Display Customer"). Configure mapping if local property names differ from the target app. If added to toolbar, optionally set RequiresContext to require a selected row.
LANGUAGE: JSON
CODE:
```json
{
  "RecordType": "UI.DataFieldForIntentBasedNavigation",
  "SemanticObject": "Customer",
  "Action": "display",
  "Inline": true,
  "Label": "Display Customer",
  "RequiresContext": false
}
```

STEP: Add an action menu to a toolbar
DESCRIPTION: In the Table node Tool Bar, click the Add Actions icon, choose Add Action Menu, provide a Label, and select actions to include. Rules: an action cannot be in two action menus, and an action cannot be both inside and outside an action menu simultaneously. You cannot remove the last action from an action menu if that would leave zero actions.
LANGUAGE: Text
CODE:
```text
Page Editor -> Table node -> Tool Bar -> Add Actions icon -> Add Action Menu
- Enter Label for menu
- Select actions to include (each action can be in at most one menu)
- Click Add
```

STEP: Label handling for actions and menus
DESCRIPTION: Label sourcing and overrides:
- For in-app actions: Label uses Common.Label or @title (CAP CDS) when present; otherwise Label is generated in UI.DataFieldForAction and can be edited. Deleting a table action removes only the UI.DataFieldForAction record; Common.Label or @title annotations remain.
- For intent-based actions: Label is generated from Semantic Object and Semantic Object Action entered when creating the action.
- For action menus: Label is user-provided at creation.
LANGUAGE: Text
CODE:
```text
Label priority for in-app action:
1. Common.Label / @title annotation (if present)
2. UI.DataFieldForAction.Label (generated or edited)

Note: Deleting UI.DataFieldForAction removes the Label property stored on that record; annotation-based labels remain in annotation source.
```

STEP: Importance and Hidden properties
DESCRIPTION: Importance is set when an action is added as a table column (see table columns/importance). Use Hidden or annotation-based HideByProperty rules to hide actions or menus in UI. These are persisted on the annotation record.
LANGUAGE: Text
CODE:
```text
UI.DataFieldForAction properties to consider:
- Importance: defined for column actions (affects column visibility)
- Hidden: set to hide action (can also be controlled by annotation HideByProperty)
```

STEP: Criticality for inline actions
DESCRIPTION: For inline table actions (columns), set Criticality to Positive/Negative to apply semantic highlight colors. Toolbar buttons do not support semantic highlighting; criticality is not available for toolbar actions. To remove highlighting set Criticality = None.
LANGUAGE: JSON
CODE:
```json
{
  "RecordType": "UI.DataFieldForAction",
  "Action": "ApproveOrder",
  "Inline": true,
  "Criticality": "Positive"   // Possible values: Positive, Negative, None
}
```

STEP: Semantic mapping for external navigation
DESCRIPTION: If the semantic object property name differs between the current app and the target application, add a semantic mapping: map the target semantic object property name to a local property. Only one mapping per external navigation action is supported.
LANGUAGE: JSON
CODE:
```json
{
  "RecordType": "UI.DataFieldForIntentBasedNavigation",
  "SemanticObject": "TargetSemanticObject",
  "Action": "display",
  "SemanticObjectMappings": [
    {
      "TargetProperty": "CustomerID",
      "LocalProperty": "CustID"
    }
  ]
}
```

STEP: RequiresContext behavior for toolbar intent-based actions
DESCRIPTION: When adding an external navigation action to a toolbar, set RequiresContext = true to require a selected table row as navigation context. Default is false (context not required). This property is not available for inline/column actions because context is always the row.
LANGUAGE: JSON
CODE:
```json
{
  "RecordType": "UI.DataFieldForIntentBasedNavigation",
  "SemanticObject": "Customer",
  "Action": "display",
  "RequiresContext": true
}
```

STEP: Moving actions and action menus
DESCRIPTION: Move actions only within the same table. Moving between toolbar and columns toggles Inline accordingly. Action menus and contained actions can be moved, but you cannot move the last action out of a menu if it would empty the menu.
LANGUAGE: Text
CODE:
```text
Move rules:
- Same-table moves only
- Moving to Columns -> set Inline = true
- Moving to Toolbar -> set Inline = false
- Cannot leave an action menu empty by moving its last action out
```

STEP: Deleting actions and action menus
DESCRIPTION: Remove actions or action menus in the Page Editor by clicking the Delete (wastebasket) icon. Deleting a UI.DataFieldForAction or UI.DataFieldForIntentBasedNavigation removes that specific annotation record; shared annotation labels (Common.Label/@title) are not removed.
LANGUAGE: Text
CODE:
```text
Page Editor -> Select action or action menu -> Click Delete (wastebasket)
Note: Deleting removes the UI.DataFieldForAction or UI.DataFieldForIntentBasedNavigation record only.
```

STEP: Cross-application navigation configuration reminder
DESCRIPTION: To enable intent-based navigation at runtime, configure the Fiori launchpad and the target application's manifest.json correctly. Verify Semantic Object and Action names match the launchpad intent configuration.
LANGUAGE: Text
CODE:
```text
Required:
- Configure target app intent in SAP Fiori launchpad (semantic object & action)
- Ensure target app manifest.json and role/target mappings are correctly set in the launchpad configuration
- Use matching SemanticObject and Action values in UI.DataFieldForIntentBasedNavigation
```
--------------------------------

**TITLE**: Table Columns — Add, Configure, and Annotation Behavior

**INTRODUCTION**: How to add and configure table columns in a Fiori Object Page using the Page Editor. Explains supported column types, how labels are resolved and maintained (Common.Label / @title), how importance is applied and inherited from base layers, and how to configure column hiding via a boolean property.

**TAGS**: fiori-tools, table, object-page, annotations, UI.DataField, Common.Label, @title, UI.Importance, documentation

**STEP**: 1 — Add a Column in the Page Editor

**DESCRIPTION**: Use the Page Editor to add a column to a Table or Table Section. Select the column type, supply required values, then click Add. After adding, you can reorder, delete, or edit column-specific properties in the Property Panel.

**LANGUAGE**: UI (Page Editor instructions)

**CODE**:
```text
UI workflow:
- Expand the Table or Table Section node in the Page Editor.
- Click the + (Add) icon next to Columns.
- Select the desired column type.
- Enter the requested information and click Add.
- Use the Property Panel to edit: Label, Importance, Hidden, and type-specific properties.
- Reorder or delete columns directly in the Table node.
```

**STEP**: 2 — Supported Column Types (use these when adding)

**DESCRIPTION**: All supported column types you can add via the Page Editor. Use the specific Property Panel for each type to configure properties.

**LANGUAGE**: text/links

**CODE**:
```text
Supported column types:
- Basic Columns (basic-columns-5f8c75b.md)
- Rating Column (rating-column-b2ba7b4.md)
- Progress Column (progress-column-0039256.md)
- Chart Column (chart-column-b78b302.md)
- Table Actions (table-actions-da1931b.md)
- Contact Column (contact-column-dc5931d.md)
- External Navigation Column (table-actions-da1931b.md)
```

**STEP**: 3 — Label resolution and maintenance (Common.Label and @title)

**DESCRIPTION**: When a column is added, the Page Editor checks the property used as the column value for Common.Label (annotation) and @title (CAP/CDS). If either exists, the generated UI.DataField record will not include a Label property — the column title is taken from Common.Label or @title and displayed in the Property Panel. If no such annotation exists, a UI.DataField record is generated with an auto-generated label you can override in the Property Panel.

Editing the column Label in the Property Panel:
- Does NOT change Common.Label or @title in source annotations.
- Instead, the editor adds a Label property to the local UI.DataField record so the change is limited to this table column.

Deleting a column:
- Does NOT remove Common.Label or @title annotations.
- Removes only local Label properties that were added directly to the UI.DataField record (since the record is removed).

Include the following file reference in pages that use icon CSS:
- ../css/sap-icons.css

**LANGUAGE**: XML, CDS

**CODE**:
```xml
<!-- Example: generated UI.DataField without local Label if Common.Label exists -->
<Record Type="UI.DataField">
  <!-- No PropertyValue for Label if Common.Label/@title is present -->
  <PropertyValue Property="Value" Path="ProductName"/>
</Record>

<!-- Example: generated UI.DataField with local Label when no annotation exists -->
<Record Type="UI.DataField">
  <PropertyValue Property="Label" String="Product"/>
  <PropertyValue Property="Value" Path="ProductName"/>
</Record>
```

```cds
// Example CAP/CDS: @title used by Page Editor to set column label
entity Product {
  @title: 'Product'
  ProductName : String;
}
```

**STEP**: 4 — Importance behavior and layer inheritance

**DESCRIPTION**: When a column is created, Importance defaults to None (no importance specified). Use Importance to indicate which columns should be shown on small screens. If a UI.LineItem in a lower (base) layer defines importance for the same column, the Page Editor displays the base-layer value in the dropdown with the suffix "(base layer)" (e.g., "High (base layer)"). If you explicitly change Importance to None in your layer, the local UI.Importance annotation is removed from your local annotation file.

**LANGUAGE**: XML (annotation example)

**CODE**:
```xml
<!-- Example: UI.Importance set on a DataField within UI.LineItem -->
<Record Type="UI.DataField">
  <PropertyValue Property="Value" Path="ProductName"/>
  <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High"/>
</Record>

<!-- If base layer annotation exists, UI shows: "High (base layer)" in dropdown -->
```

**STEP**: 5 — Hidden property and "Hide by Property" condition

**DESCRIPTION**: Toggle the Hidden property in the Property Panel to mark the column as hidden in the application UI. When Hidden is activated, pick a boolean property from the entity as the hiding condition in the "Hide by Property" field. The editor uses that boolean property as the runtime condition to hide/show the column in the app.

- Choose an existing boolean property, e.g., IsArchived or IsHidden.
- The Page Editor stores the hide condition in the local annotation/config so it applies only to the column in this context.

**LANGUAGE**: UI (Page Editor instructions)

**CODE**:
```text
Hidden setup in Page Editor:
- Open the column's Property Panel.
- Toggle "Hidden" ON.
- In "Hide by Property" choose a boolean property from the entity (e.g., IsHidden).
- Save. The column will be hidden at runtime when the boolean is true.
```

**STEP**: 6 — Editing and cleanup rules

**DESCRIPTION**: Summary of what is changed in annotations when editing columns:
- Changing Label in Property Panel creates a local Label on UI.DataField; Common.Label/@title remain unchanged.
- Setting Importance to None removes UI.Importance from the local annotation file.
- Deleting a column removes its local UI.DataField record but does not remove Common.Label or @title annotations defined in shared/base layers.

**LANGUAGE**: text

**CODE**:
```text
Annotation change rules:
- Edit Label -> add local Label to UI.DataField (no change to Common.Label/@title).
- Importance = None -> remove local UI.Importance annotation.
- Delete column -> remove local UI.DataField record only; Common.Label/@title preserved.
```
--------------------------------

**TITLE**: Table Section — Add, Move, Delete, and Maintain Table Sections (Fiori Tools)

**INTRODUCTION**: This document describes the exact steps and side effects when working with Table Sections in the Fiori Tools Page Editor (Object/Form Entry Page). It is focused on actions that modify UI annotations (UI.Facets, UI.LineItem) and the CAP CDS cleanup behavior. Use this for automating UI annotation changes or implementing editor integrations.

**TAGS**: fiori-tools, object-page, table-section, UI.Facets, UI.LineItem, annotations, CAP, CDS, cleanup, editor

STEP: Add Table Section

DESCRIPTION:
- Use the Page Editor to add a Table Section to a page. The editor flow:
  1. Open the Object/Form Entry Page (Page Editor).
  2. In the outline, select the section node and click Add (plus icon).
  3. Choose "Add Table Section" from the dropdown.
  4. In the Add Table Section popup, enter Label and Value Source Entity and click Add.
- Side effects in annotation files and CAP CDS:
  - A new `UI.LineItem` (empty collection) is created.
  - A new reference facet is added to `UI.Facets` with an `annotationPath` pointing to the created `UI.LineItem`.
  - If `UI.Facets` does not exist for the entity, a `UI.Facets` annotation is created under the entity associated with the Object Page.
  - If `UI.Facets` exists on an underlying layer, the annotation in the underlying layer is overridden.
  - For CAP CDS projects, a using statement is added to the overridden file if it is missing.

LANGUAGE: HTML

CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

LANGUAGE: text

CODE:
```
Annotation changes performed:
- Create UI.LineItem (empty)
- Create referenceFacet in UI.Facets with annotationPath -> new UI.LineItem
- If missing, create UI.Facets under the entity for the Object Page
- Override underlying-layer UI.Facets if present
- CAP CDS: add using statement to overridden file if missing
```

STEP: Move Table Section

DESCRIPTION:
- Reorder sections using drag-and-drop in the Page Editor outline.
- Behavior:
  - Drag the required section to the new position and drop.
  - The records in the `UI.Facets` collection are reordered.
  - The runtime rendering of sections follows the record sequence in `UI.Facets`.
- Move multiple sections:
  1. Select multiple sections using Ctrl + Click.
  2. Drag the selected group to the new position.

LANGUAGE: text

CODE:
```
Behavior when reordering:
- Update sequence of records in UI.Facets to match new outline order
- Display order in rendered Fiori application follows UI.Facets sequence
Mass-move steps:
- Ctrl + Click to multi-select sections
- Drag selected sections and drop at target position
```

STEP: Delete Table Section

DESCRIPTION:
- Delete a section from the Page Editor:
  1. Navigate to the section layer in the outline.
  2. Click the Delete (wastebasket) icon to open Delete Confirmation.
  3. Click Delete to confirm.
- Effects:
  - The referenced facet record is removed from `UI.Facets` for the section in the Appendix.
  - Orphaned `UI.LineItem` annotations are not automatically removed — you must run the cleanup procedure separately to delete unreferenced annotations.

LANGUAGE: text

CODE:
```
Delete actions:
- Remove referenced facet record from UI.Facets
- Note: Orphaned UI.LineItem annotation persists until cleanup procedure is executed
```

STEP: Maintain Table Section Properties — Label

DESCRIPTION:
- Change the section label shown in the editor and preview:
  1. Select the section in the Page Editor.
  2. In the properties pane, edit the Label text box with the new display text.
- Effect:
  - The section label updates in the Page Editor and in the application preview.
- See Appendix for more details:
  - Label reference: appendix-457f2e9.md#loiod44832d99bdf4f73ba14cdbb16dc9301

LANGUAGE: text

CODE:
```
Property to edit: Label
- Update Label in properties pane -> reflected in Page Editor + preview
Reference: appendix-457f2e9.md#loiod44832d99bdf4f73ba14cdbb16dc9301
```

STEP: Maintain Table Section Properties — Hidden

DESCRIPTION:
- Hidden property is managed via the properties pane. See the Hidden appendix for full behavior and expression details.

LANGUAGE: text

CODE:
```
Hidden property:
- Refer to: appendix-457f2e9.md#loiof7ad71792a0044d6b6172f078827bdc0
```

STEP: Related Resources

DESCRIPTION:
- Quick links for related Table configuration pages.

LANGUAGE: text

CODE:
```
Related:
- Table Actions: table-actions-da1931b.md
- Table Columns: table-columns-a80d603.md
- Add/Move/Label/Delete Table Section anchors:
  - Add: table-section-fc59378.md#loiofc593789991c46348b31c1bc3b9d9182__section_g5r_hpb_zrb
  - Move: table-section-fc59378.md#loiofc593789991c46348b31c1bc3b9d9182__section_udp_pxx_xrb
  - Label: table-section-fc59378.md#loiofc593789991c46348b31c1bc3b9d9182__section_yn2_2qb_zrb
  - Delete: table-section-fc59378.md#loiofc593789991c46348b31c1bc3b9d9182__section_cwh_qxx_xrb
```
--------------------------------

**TITLE**: Taskbar Notification for Annotation File Updates in Page Editor

**INTRODUCTION**: Describe and implement the UX behavior where a taskbar notification appears when an annotation file is updated as a result of the user's actions in the Page Editor. The notification must not appear when the annotation file is modified directly (manual file edit). Use the patterns below to detect origin, build the notification payload, and display actionable notifications.

**TAGS**: fiori-tools, taskbar, notification, annotation, page-editor, ux, editor-events

**STEP**: 1 - Event payload contract (example)

**DESCRIPTION**: Define a minimal event payload contract that the Page Editor should emit when an annotation file is updated as a result of a user action. Include a field that identifies the origin so the notification logic can decide whether to show a taskbar notification.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "event": "annotationFileUpdated",
  "payload": {
    "filePath": "manifest/annotations/Annotations.xml",
    "timestamp": "2026-01-28T12:34:56Z",
    "origin": "page-editor",          // possible values: "page-editor", "direct-file-edit", "sync", "cli"
    "userId": "user@example.com",
    "summary": "Added metadata for control XYZ",
    "diffSummary": {
      "added": 3,
      "modified": 1,
      "removed": 0
    }
  }
}
```

**STEP**: 2 - Listener and origin check

**DESCRIPTION**: Register a listener for the annotation update event. Only show a taskbar notification if the event origin equals "page-editor" (or other allowed editor-origin values). Ignore events where origin indicates a direct file edit.

**LANGUAGE**: TypeScript

**CODE**:
```typescript
// Pseudocode TypeScript example: integrate into Page Editor extension/plugin
type AnnotationEvent = {
  event: string;
  payload: {
    filePath: string;
    timestamp: string;
    origin: string; // "page-editor" | "direct-file-edit" | ...
    summary?: string;
    diffSummary?: { added?: number; modified?: number; removed?: number };
  };
};

function registerAnnotationListener(eventBus: { on: (evt: string, cb: (e: AnnotationEvent) => void) => void }) {
  eventBus.on('annotationFileUpdated', (e: AnnotationEvent) => {
    const origin = e.payload.origin ?? 'unknown';
    if (origin === 'page-editor') {
      showTaskbarNotificationForAnnotation(e.payload);
    } else {
      // Do not show taskbar notification for direct file edits or non-editor origins
      console.debug(`annotationFileUpdated ignored for origin=${origin}`);
    }
  });
}
```

**STEP**: 3 - Build and display taskbar notification with actions

**DESCRIPTION**: Construct a concise notification message and provide helpful actions (e.g., "Open Annotation", "View Changes", "Dismiss"). The notification should include the file path and a short summary. Use the host platform / framework notification API; example below shows a generic notification builder with callbacks for actions.

**LANGUAGE**: TypeScript

**CODE**:
```typescript
// Generic taskbar notification builder (pseudocode)
type NotificationAction = { id: string; label: string; callback: () => void };
type TaskbarNotification = {
  title: string;
  message: string;
  actions?: NotificationAction[];
  timestamp?: string;
};

function showTaskbarNotificationForAnnotation(payload: AnnotationEvent['payload']) {
  const filePath = payload.filePath;
  const summary = payload.summary ?? 'Annotation file updated';
  const title = 'Annotation updated';
  const message = `${summary} — ${filePath}`;

  const notification: TaskbarNotification = {
    title,
    message,
    timestamp: payload.timestamp,
    actions: [
      { id: 'open', label: 'Open Annotation', callback: () => openFileInEditor(filePath) },
      { id: 'view', label: 'View Changes', callback: () => openDiffViewer(filePath) },
      { id: 'dismiss', label: 'Dismiss', callback: () => {/* no-op */} }
    ]
  };

  // Replace with host platform API, e.g., VS Code: window.showInformationMessage(...)
  displayTaskbarNotification(notification);
}

function openFileInEditor(path: string) {
  // host-specific implementation
  console.log(`Open file: ${path}`);
}

function openDiffViewer(path: string) {
  // host-specific implementation to show changes/diff for path
  console.log(`Open diff for: ${path}`);
}

function displayTaskbarNotification(n: TaskbarNotification) {
  // Example: map to platform-specific notification API
  console.info(`[NOTIFICATION] ${n.title}: ${n.message}`);
  // Show actions to user and hook callbacks
}
```

**STEP**: 4 - Do not show notification for direct annotation file edits

**DESCRIPTION**: Ensure file-system watchers or external file-change events that originate from manual file edits do not trigger the taskbar notification. Use the origin field from the event, or, if the origin is not provided, determine whether the change was caused by in-editor actions vs external edits (e.g., by comparing editor edit context, last known editor state, or a per-change flag).

**LANGUAGE**: TypeScript

**CODE**:
```typescript
// Example guard when origin is not explicit: compare last editor activity
async function handleFileChangeEvent(filePath: string, changeInfo: { modifiedBy?: string }) {
  const lastEditorAction = await getLastEditorActionForFile(filePath); // host-specific
  const isFromEditor = lastEditorAction && (Date.now() - lastEditorAction.timestamp) < 5000; // 5s heuristic

  if (isFromEditor) {
    // treat as page-editor origin
    showTaskbarNotificationForAnnotation({
      filePath,
      timestamp: new Date().toISOString(),
      origin: 'page-editor',
      summary: `Updated via editor by ${lastEditorAction.user}`
    });
  } else {
    // Likely direct file edit; do not show taskbar notification
    console.debug('File changed externally; taskbar notification suppressed', filePath);
  }
}
```

**STEP**: 5 - Notification content recommendations

**DESCRIPTION**: Use these concise content and action recommendations for consistent UX:
- Title: "Annotation updated"
- Message: one-line summary + file path
- Actions: "Open Annotation", "View Changes", "Dismiss"
- Avoid showing notifications for direct file edits
- If multiple annotation files update at once, aggregate into a single notification that lists changed files

**LANGUAGE**: JSON

**CODE**:
```json
{
  "notificationTemplate": {
    "title": "Annotation updated",
    "message": "<summary> — <filePath>",
    "actions": ["Open Annotation", "View Changes", "Dismiss"],
    "aggregateTitle": "Multiple annotation files updated",
    "aggregateMessage": "N annotation files were modified by your recent editor actions"
  }
}
```
--------------------------------

**TITLE**: Guided Development — Launch, Project Management, and Accessibility

**INTRODUCTION**: This guide explains how to open and use Guided Development for SAP Fiori elements projects inside the SAP Fiori tools environment. It covers launching methods (Command Palette and folder context menu), selecting/changing projects, when to refresh the view, required project data available to the guides, and keyboard accessibility instructions. Use the code snippets and paths provided to integrate assets or automate steps.

**TAGS**: fiori-tools, guided-development, sap-fiori, vscode, accessibility, project-management

**STEP**: 1 — Include SAP icon stylesheet in documentation or extension UI

**DESCRIPTION**: If your Guided Development UI or documentation requires SAP icon fonts, ensure the stylesheet is referenced. Preserve the relative path exactly as used in this doc structure.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**STEP**: 2 — Open Guided Development using the Command Palette

**DESCRIPTION**: Use the editor Command Palette to open Guided Development in the current editor or to the side. These exact command names must be available in the palette integration for automation or extension wiring.

- Keyboard shortcut to open Command Palette:
- Commands to display in the palette:
  - Fiori: Open Guided Development
  - Fiori: Open Guided Development to the Side
- Selecting a project from the workspace is required after opening.

**LANGUAGE**: Plain Text

**CODE**:
```
Shortcut: [CMD/CTRL] + [Shift] + [P]
Start typing: "guided development"
Commands:
  - Fiori: Open Guided Development
  - Fiori: Open Guided Development to the Side
Behavior:
  - "Open Guided Development" opens in current region/tab.
  - "Open Guided Development to the Side" opens in a new column beside the current file.
```

**STEP**: 3 — Open Guided Development using the folder context menu

**DESCRIPTION**: If a workspace folder contains an SAP Fiori elements project, the context menu should allow opening Guided Development directly for that project.

**LANGUAGE**: Plain Text

**CODE**:
```
Right-click project folder -> SAP Fiori tools - Open Guided Development
Behavior:
  - Opens Guided Development to the side of the current file in another column.
Note:
  - If no Fiori elements project exists in workspace, Command Palette still allows opening the UI, but interactive features are disabled (you can view guides and code samples only).
```

**STEP**: 4 — Select or change the active project in Guided Development

**DESCRIPTION**: Guided Development operates on one project at a time. Use the Select Project action in the toolbar to choose which workspace project provides project-specific data to the guides. The active project name appears in the tab header.

**LANGUAGE**: Plain Text

**CODE**:
```
Actions:
  1. Click "Select Project" on left side of the toolbar.
  2. Pick a project from the Project list.

UI assets:
  - Example screenshot path: images/SelectProject_9ea63e4.png

Active project provides:
  - Entity list (Entities available in the service)
  - Model list (Data sources)
  - Page list (Application pages)
  - Annotation terms defined in the service across guides

Note:
  - Annotations from services other than the 'mainService' can be added in Guided Development.
```

**STEP**: 5 — When and how to refresh Guided Development project data

**DESCRIPTION**: Refresh Guided Development when workspace project state changes or new projects are added. Provide a refresh icon in the Project list and toolbar to re-scan workspace/project resources.

**LANGUAGE**: Plain Text

**CODE**:
```
When to refresh:
  - When a new project is added to the workspace.
  - When something in the current project is changed outside Guided Development (e.g., a new page is added or service updates).

How to refresh:
  - Click the Refresh icon inside the Project list.
  - Click the Refresh icon on the toolbar next to the Project list.

Icon HTML snippet used in docs (representative):
  <span class="SAP-icons-V5"></span>  (Refresh)
```

**STEP**: 6 — Keyboard navigation and accessibility support

**DESCRIPTION**: Ensure Guided Development UI supports keyboard navigation and high contrast themes. Document the specific navigation keys for implementers and automated tests.

**LANGUAGE**: Plain Text

**CODE**:
```
Keyboard navigation:
  - Arrow keys: navigate within sections and lists
  - Tab: move focus forward to next section or control
  - Shift + Tab: move focus backward
  - Enter: activate the focused item or make selection

Accessibility support:
  - High contrast themes are supported; ensure all controls expose focus and state to assistive technologies.
```
--------------------------------

**TITLE**: Visualizing and Managing Annotations with SAP Fiori Tools - Service Modeler

**INTRODUCTION**: Action-oriented guide for developers to view, search, override, edit, and delete OData and CAP service annotations using SAP Fiori tools - Service Modeler and the XML Code Editor. Includes file locations, UI actions, and exact command names for automation/scripts or extension integration.

**TAGS**: fiori-tools, service-modeler, annotations, OData, CAP, xml, annotation-file, vscode

STEP: Supported Annotation Types and Identification

DESCRIPTION: Service Modeler supports OData service and CAP service annotations. Annotations are associated with entity types, entities, and properties. In the tree list they are identified by the Annotations icon; use this icon to locate annotated targets programmatically or when scripting UI actions.

LANGUAGE: HTML

CODE:
```html
<!-- Annotation icon markup used in UI tree -->
<span class="SAP-icons-V5"></span> <!-- "Annotations" icon -->
```

STEP: Include Service Modeler Icons/CSS (for UI previews or extension testing)

DESCRIPTION: If you render Service Modeler UI previews or develop extensions that reference SAP icons, include the SAP icons stylesheet used by the docs/UI to ensure icons render correctly.

LANGUAGE: HTML

CODE:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

STEP: Annotation File Location and Precedence

DESCRIPTION: Local annotation files override backend annotations when they define the same annotation term + qualifier on the same target. Local annotation files live in the project under /webapp/annotations. Use this path to locate files for automated editing, validation, or packaging.

LANGUAGE: text

CODE:
```
Local annotations folder (project):
/webapp/annotations/<filename>.xml
Notes:
- Local annotations override backend annotations with same term+qualifier on same target.
- Backend annotations are read-only in Service Modeler but can be overridden locally.
- To edit local files, open them in the XML Code Editor (see link below).
```

STEP: Open Service Modeler — Command Palette

DESCRIPTION: Launch Service Modeler via VS Code Command Palette. Use exact command text to automate invocation or to guide users/programmatic flows.

LANGUAGE: text

CODE:
```
Command Palette sequence:
1. Open Command Palette (Ctrl/Cmd+Shift+P)
2. Type: Fiori: Service Modeler: Open Service Modeler
3. Select your SAP Fiori elements project in the workspace
```

STEP: Open Service Modeler — Folder Context Menu

DESCRIPTION: When a Fiori elements project is in the workspace, right-click a folder to use the Override Annotations context action. Use this method in UI-driven workflows or extension context menu contributions.

LANGUAGE: text

CODE:
```
Context menu:
Right-click any folder in the target Fiori elements project -> Override Annotations
(Select project folder if multiple projects exist)
```

STEP: Open Service Modeler — From Metadata Editor

DESCRIPTION: When a metadata.xml file is open in the editor, click the Annotations icon to open Service Modeler focused on that service metadata. This is useful for linking editor state to Service Modeler.

LANGUAGE: HTML

CODE:
```html
<!-- Example: clicking the Annotations icon in the metadata editor -->
<span class="SAP-icons-V5"></span> <!-- Click to open Service Modeler for the metadata.xml -->
```

STEP: View Annotations for an Entity/Property

DESCRIPTION: Select the target entity type or property in the Service Modeler tree to highlight its annotations in the Annotation panel. Use the Show in Source action to open the source annotation file and highlight the annotation occurrence.

LANGUAGE: text

CODE:
```
View sequence:
1. In tree list, select an entity type or a property (expanding entity types if needed).
2. The Annotation panel highlights annotations for the selected target.
3. Click the "Show in Source" icon beside an annotation to open the source file with the annotation highlighted.
```

STEP: Show in Source Icon (UI element)

DESCRIPTION: The Show in Source icon opens the file where the selected annotation is defined (backend or local). Use this identifier when scripting or documenting UI steps.

LANGUAGE: HTML

CODE:
```html
<!-- Show in Source icon image reference -->
<img src="images/show_source_icon_dd4bbff.png" alt="Show in Source" />
```

STEP: Search Annotations

DESCRIPTION: Use the search input (upper-right of Service Modeler) to filter annotations. Matching annotations are listed in the Annotation panel and the tree list is filtered to show only associated entity types/properties. Useful for automated scanning or test scripts that validate annotation presence.

LANGUAGE: text

CODE:
```
Search behavior:
- Enter search criteria in the Annotation panel search box (top-right).
- Results: Annotation panel shows matching annotations; tree list filters to associated targets.
```

STEP: Edit Local Annotations (via XML Code Editor)

DESCRIPTION: Backend annotations are read-only. To change behavior, override annotations in a local annotation file under /webapp/annotations and edit that file with the XML Code Editor. Service Modeler lets you jump to the local source; then edit and save.

LANGUAGE: text

CODE:
```
Edit local annotations workflow:
1. Select target entity set in tree list to highlight annotations.
2. Click "Show in Source" next to a local annotation entry (opens /webapp/annotations/<filename>.xml).
3. Edit the annotation in the XML Code Editor (or any text editor).
4. Save file to apply overrides; local annotations take precedence over backend.
Reference: XML Code Editor docs:
maintaining-annotations-with-language-server-6fc93f8.md#loio6fc93f80827940809437365abdf85b75__XML_Code_Editor
```

STEP: Screenshot / Visual Reference for Editing

DESCRIPTION: Visual confirmation of editing flow—Service Modeler opens the local annotation file and the XML Code Editor shows the selected annotation highlighted.

LANGUAGE: HTML

CODE:
```html
<!-- Example image showing editing flow -->
<img src="images/Editing_annotations_c97d919.png" alt="Editing annotations in XML Code Editor" />
```

STEP: Delete Local Annotation

DESCRIPTION: Delete an annotation defined in a local annotation file using the Delete (wastebasket) icon in the Annotation panel. This removes the local override; backend annotation (if present) will become visible again unless the backend annotation is absent.

LANGUAGE: text

CODE:
```
Delete workflow:
1. Select the target entity type or property in the tree list.
2. In the Annotation panel, click the Delete (wastebasket) icon adjacent to the local annotation in /webapp/annotations/<filename>.xml.
3. Confirm deletion if prompted and save the local annotation file.
```

STEP: Notes and Constraints for Automation and Tooling

DESCRIPTION: Key constraints to account for in code generation, automation, or tests:
- Only OData and CAP annotations supported.
- Backend annotations are read-only in Service Modeler; always create/modify local overrides under /webapp/annotations.
- Local annotations override backend annotations that match by term and qualifier on the same target.
- Use exact command name "Fiori: Service Modeler: Open Service Modeler" for automation or extension activation.

LANGUAGE: text

CODE:
```
Constraints summary:
- Supported: OData service annotations, CAP service annotations.
- Local file path: /webapp/annotations/<filename>.xml
- Local overrides win over same-term backend annotations with same qualifier on same target.
- Backend annotations cannot be edited directly in Service Modeler.
```
--------------------------------

**TITLE**: Working with Local and Back End Annotations in SAP Fiori Tools

**INTRODUCTION**: Practical guide for developers to locate, register, override, and maintain OData annotation files generated or added in a SAP Fiori Tools project. Includes file locations, manifest registration patterns, and the recommended workflow for overriding back end annotations in local files.

**TAGS**: fiori-tools, annotations, OData, manifest.json, webapp/annotations, webapp/localService, override, Service Modeler

**STEP**: 1 — Locate local annotation files and copied back end artifacts

**DESCRIPTION**: Identify where annotation files and back end copies are stored after project generation. Use these paths when editing or registering annotations.

**LANGUAGE**: Text

**CODE**:
```text
- Local annotation files generated by Fiori Tools:
  webapp/annotations/

- Back end service metadata and back end annotation files are copied to:
  webapp/localService/

- The project manifest (manifest.json) contains references to these local copies.
  Use "localUri" to reference the local copy; use "uri" to reference the original back end path.
```

**STEP**: 2 — Example manifest.json registration (localUri vs uri)

**DESCRIPTION**: Register your OData service and annotation data sources in manifest.json so the app uses local copies during development. The example below shows:
- data source for the OData service with a local copy of metadata (localUri)
- annotation data source with both a back end uri and a local override (localUri)

Adjust paths and keys to match your project naming.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "sap.app": {
    "id": "my.app.id",
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata/sap/API_EXAMPLE_SRV/",
        "type": "OData",
        "settings": {
          "localUri": "webapp/localService/metadata.xml"
        }
      },
      "mainService_annotations": {
        "uri": "/sap/opu/odata/sap/API_EXAMPLE_SRV/$metadata/annotations",
        "type": "ODataAnnotation",
        "settings": {
          "localUri": "webapp/annotations/annotations_local.xml"
        }
      }
    }
  }
}
```

**STEP**: 3 — Overriding back end annotations: workflow and example

**DESCRIPTION**: To override an annotation defined in the back end:
1. Copy the back end annotation element(s) you want to change into a local annotation file in webapp/annotations/.
2. Keep the same Target and Qualifier (if present) and modify the annotation content locally.
3. The local annotation definition (same Target + same Qualifier + same Term) will override the back end one at runtime.
4. The order of multiple local annotation files and their overriding sequence is defined in manifest.json and can be viewed/changed in the annotation manager.

Use the XML snippet pattern below to create or modify annotation entries in webapp/annotations/*.xml.

**LANGUAGE**: XML

**CODE**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Annotations Target="Namespace.EntityType">
      <!-- Example: overriding UI.LineItem with a Qualifier -->
      <Annotation Term="UI.LineItem" Qualifier="MyQualifier">
        <!-- content: e.g. Collection of DataField elements -->
        <Collection>
          <Record Type="UI.DataField">
            <PropertyValue Property="Label" String="Overridden Field"/>
            <PropertyValue Property="Value" Path="OverriddenProperty"/>
          </Record>
        </Collection>
      </Annotation>
    </Annotations>
  </edmx:DataServices>
</edmx:Edmx>
```

**STEP**: 4 — Tools and editor choices for maintaining annotations

**DESCRIPTION**: Choose the editor that fits your workflow:
- For direct XML editing with language server support: use the XML annotation language server (XML editor).
- For a schematic, visual editing experience: use the Page Editor (Annotation-based elements editor) or Service Modeler.
- Note: Service Modeler maintenance is applicable to OData services only — not for CAP CDS.

**LANGUAGE**: Text

**CODE**:
```text
Recommended options:
- XML language server: edit webapp/annotations/*.xml directly. Good for precise control.
- Page Editor (Annotation-based elements): visual editing in Fiori Tools for common patterns.
- Service Modeler: visualize annotations and manage OData annotations (not applicable to CAP CDS).

Important:
- Changes in local copies do not affect the deployed back end. To change behavior in your app, modify the local annotation files (webapp/annotations) and ensure manifest.json references them.
```

**STEP**: 5 — Verify override order and registration

**DESCRIPTION**: Confirm the overriding order and annotation registration:
- Check manifest.json to see the annotation files and their listed sequence.
- Use the annotation manager in Fiori Tools to view and change the overriding sequence if multiple local annotation files exist.

**LANGUAGE**: Text

**CODE**:
```text
- Open manifest.json and inspect "sap.app" -> "dataSources" entries for annotation files.
- If multiple local annotation files are used, the annotation manager (Service Modeler / annotation manager UI) shows and lets you reorder them.
- The first matching annotation (Target+Qualifier+Term) according to the manifest/manager order will be applied.
```
--------------------------------

**TITLE**: Adding an SAP Fiori Application to an MTA Deployment File with the SAP Fiori Application Generator

**INTRODUCTION**: This document explains how the SAP Fiori Application Generator updates or creates an MTA deployment file when generating a Fiori application. Use these steps to ensure correct Cloud Foundry deployment configuration, confirm required services are present in the MTA, and know the generator behaviors for existing and new MTA files.

**TAGS**: fiori-tools, mta, cloud-foundry, sap-fiori, application-generator, managed-application-router, CAP, destination, deployment

**STEP**: 1 — Add deployment configuration to an existing MTA file

**DESCRIPTION**: When you select a project folder that already contains an MTA file and you run the SAP Fiori Application Generator:
- The generator automatically enables "Add deployment configuration" (sets it to Yes).
- The generator updates the existing mta.yaml (MTA deployment file) in that folder with the supplied deployment configuration for the generated Fiori app.
- Ensure the existing MTA file already defines the required services for the chosen deployment mode:
  - Managed Application Frontend service (for managed application router deployments), or
  - Standalone application router (for standalone router deployments).
- If the MTA file is missing required services, generate or update the MTA using:
  - the MTA generator provided by SAP Fiori tools, or
  - the Application Router generator in SAP Business Application Studio.
- For local CAP projects: you can choose to generate an instance-based destination as part of the Cloud Foundry (CF) deployment configuration, or reuse an existing instance-based destination already defined in the MTA file.

Action checklist for code generation tools:
- Detect existing mta.yaml in selected project folder.
- If found, set addDeploymentConfiguration = true and merge the generated app’s module and resources into mta.yaml.
- Validate presence of required service entries for the selected deployment mode; if missing, either fail with a clear error or prompt for using the MTA/Application Router generator.

**LANGUAGE**: Instructions

**CODE**:
```text
No code snippets in original documentation.
```

**STEP**: 2 — Create an MTA deployment file during application generation

**DESCRIPTION**: If no MTA deployment file exists in the selected project folder, the generator can create a new mta.yaml automatically:
- When adding deployment configuration, select "Cloud Foundry" as the target landscape.
- The generator creates an MTA file configured for a managed application router and places it in the same folder as the generated SAP Fiori application.
- Important constraints:
  - The generated MTA file in this scenario is tied to the application folder and is not suited for multi-application projects.
  - Recommended workflow for multi-application deployments: create a central MTA file at the project root (using the MTA generator first), then generate each SAP Fiori application into subfolders so they can be merged into the single central mta.yaml.

Action checklist for code generation tools:
- If no mta.yaml found and targetLandscape == "Cloud Foundry", generate a manifest/mta.yaml with the managed application router configuration and module definitions for the new app.
- Place the generated mta.yaml in the same folder as the new app when user chooses to create the MTA automatically.
- Warn users when generating mta.yaml inside the application folder that this MTA is not recommended for multi-app deployments and suggest creating a root-level MTA and regenerating the app into a subfolder.

**LANGUAGE**: Instructions

**CODE**:
```text
No code snippets in original documentation.
```
--------------------------------

**TITLE**: Adding JavaScript Code Assist to an SAP Fiori Project (SAPUI5 >= 1.76)

**INTRODUCTION**: Add JavaScript code completion and JSDoc-based assistance for SAPUI5 in an existing SAP Fiori project by adding TypeScript typings and ESLint plugin configuration. Applicable to projects generated with SAPUI5 version 1.76 and newer. Perform changes in the project's root folder.

**TAGS**: fiori-tools, SAPUI5, JavaScript, TypeScript, ESLint, code-assist, jsdoc

**STEP**: 1 — Update package.json devDependencies

**DESCRIPTION**: Merge or update the devDependencies block of your project's package.json to include eslint, the SAP UI5 JSDoc ESLint plugin, and the SAPUI5 TypeScript types. Add or replace the devDependencies entry in the package.json located at the project root.

**LANGUAGE**: JSON

**CODE**:
```json
"devDependencies": { "eslint": "5.16.x", "@sap/eslint-plugin-ui5-jsdocs": "2.0.x", "@sapui5/ts-types": "1.92.x" }
```

**STEP**: 2 — Add tsconfig.json to project root

**DESCRIPTION**: Create a tsconfig.json file at the project root to enable TypeScript-based checking of JavaScript files and include the SAPUI5 type definitions. This enables editor tooling to provide IntelliSense for SAPUI5 APIs in .js files.

**LANGUAGE**: JSON

**CODE**:
```json
{ "compilerOptions": { "module": "none", "noEmit": true, "checkJs": true, "allowJs": true, "types": [ "@sapui5/ts-types" ] } }
```

**STEP**: 3 — Add .eslintrc to project root

**DESCRIPTION**: Create a .eslintrc file at the project root to enable the SAP UI5 JSDoc ESLint rules and basic recommended ESLint rules. This helps surface JSDoc/style/warning diagnostics in editors that integrate ESLint.

**LANGUAGE**: JSON

**CODE**:
```json
{ "plugins": ["@sap/ui5-jsdocs"], "extends": ["plugin:@sap/ui5-jsdocs/recommended", "eslint:recommended"] }
```

**STEP**: 4 — Reinstall node modules

**DESCRIPTION**: Remove the existing node_modules folder and perform a fresh install so the added devDependencies and type packages are installed into the project.

**LANGUAGE**: Shell

**CODE**:
```sh
rm -rf node_modules
npm install
```

**STEP**: 5 — Verify JavaScript code completion

**DESCRIPTION**: Open any .js file in the project (e.g., a controller) in your editor/IDE. With the tsconfig.json and @sapui5/ts-types installed, you should see SAPUI5 code completion and JSDoc-driven assistance for APIs. No code changes required — just open the file to confirm completion.
--------------------------------

**TITLE**: Additional Configuration for SAP Fiori Tooling (Deployment, FLP, Advanced Options)

**INTRODUCTION**: Action-oriented reference for programmatically generating or validating project configuration options used by fiori-tools. Includes precise field names, allowed values, required flags, and JSON examples for Deployment (ABAP and Cloud Foundry), SAP Fiori Launchpad (FLP) registration, and Advanced Options (themes, linting, JS code assist, NPM workspaces, TypeScript).

**TAGS**: fiori-tools, deployment, abap, cloud-foundry, flp, sapui5, eslint, javascript, typescript, cap, npm-workspaces

**STEP**: 1 — Add Deployment Configuration

**DESCRIPTION**: Generate or validate deployment settings. First prompt: whether to enable deployment configuration (boolean). If enabled, require selection of deployTarget ("ABAP" | "CloudFoundry"). When deployTarget == "ABAP", required and optional fields below apply. When deployTarget == "CloudFoundry", only destinationName is required. Preserve behavior: if "Fetch Transport Request list from target system?" is true, the transport request list is retrieved from target system; otherwise manual transportRequestNumber entry is allowed.

- Common fields:
  - enableDeployment: boolean (controls whether to show deployment prompts)
  - deployTarget: "ABAP" | "CloudFoundry"
- ABAP-specific fields:
  - destinationName: string (required) — ABAP destination to backend
  - isCloudPlatformSystem: boolean — only applicable for Steampunk discovery (answer to "Is this an SAP Cloud Platform system?")
  - targetSystemUrl: string — prefilled from project (Not applicable in SAP Business Application Studio)
  - clientSelection: enum ["useProjectDefinedClient", "enterClient", "useDefaultSystemClient"] — Not applicable to Steampunk or BAS
  - client: string (used when clientSelection == "enterClient")
  - isS4HanaCloudSystem: boolean — not applicable if isCloudPlatformSystem == true
  - sapui5AbapRepository: string (required) — technical name of SAP Fiori app in ABAP repo
  - package: string — ABAP package or "$TMP" for local / no transport (not applicable for S/4HANA Cloud)
  - fetchTransportRequests: boolean — if true, populate dropdown of transport requests from target system; if retrieval fails fallback to manual text entry
  - transportRequestNumber: string — required only when fetchTransportRequests == false and package != "$TMP" (not applicable for S/4HANA Cloud)
- Cloud Foundry-specific fields:
  - destinationName: string (required) — Cloud Foundry destination to backend

**LANGUAGE**: JSON

**CODE**:
```json
{
  "enableDeployment": true,
  "deployTarget": "ABAP",
  "abap": {
    "destinationName": "MY_ABAP_DEST",
    "isCloudPlatformSystem": false,
    "targetSystemUrl": "https://example-abap.sap.com",
    "clientSelection": "useProjectDefinedClient",
    "client": "",
    "isS4HanaCloudSystem": false,
    "sapui5AbapRepository": "Z_MY_FIORI_APP",
    "package": "$TMP",
    "fetchTransportRequests": false,
    "transportRequestNumber": ""
  },
  "cloudFoundry": {
    "destinationName": ""
  }
}
```

**STEP**: 2 — Add FLP Configuration

**DESCRIPTION**: Add SAP Fiori launchpad (FLP) registration data for the app. If configuration already exists, display existing values and allow modification. Required and optional fields below map directly to launchpad tile/intent metadata used by routing and tile creation.

- Fields:
  - enableFlpConfig: boolean (controls whether to show FLP prompts)
  - flp:
    - semanticObject: string (represents a business entity)
    - action: string (operation on the semantic object)
    - title: string (tile title shown in launchpad) — required
    - subtitle: string (optional free-text description shown under title)

**LANGUAGE**: JSON

**CODE**:
```json
{
  "enableFlpConfig": true,
  "flp": {
    "semanticObject": "PurchaseOrder",
    "action": "display",
    "title": "Purchase Order Manager",
    "subtitle": "View and approve purchase orders"
  }
}
```

**STEP**: 3 — Configure Advanced Options

**DESCRIPTION**: Configure optional advanced project settings: SAPUI5 theme, ESLint integration, JavaScript code assist libraries, CAP NPM workspaces update, and experimental TypeScript support. Include version constraints and defaults:

- theme: string — allowed values and constraints:
  - "Morning Horizon" — default if minimum SAPUI5 version >= 1.102
  - "Evening Horizon" — available if minimum SAPUI5 version >= 1.102
  - "Quartz Light"
  - "Belize" — deprecated since SAPUI5 1.120 and removed in 1.136+
  - "Quartz Dark" — available only in SAPUI5 1.72+
- addEslint: boolean — when true include eslint-plugin-fiori-custom (npm package: "eslint-plugin-fiori-custom"); generated project should support npm run lint
- addJsCodeAssist: boolean — when true include libraries/config to provide ui5 code completion and recommended eslint/jsdoc rules; see Adding JavaScript Code Assist docs
- updateNpmWorkspacesForCap: boolean — CAP-only option to update project to use NPM workspaces (required for TypeScript support in CAP)
- enableTypeScriptExperimental: boolean — experimental; requires updateNpmWorkspacesForCap == true for CAP projects

Preserve links in code consumers or docs for theme references and eslint plugin:
- eslint plugin: https://www.npmjs.com/package/eslint-plugin-fiori-custom
- Morning/Evening theme docs and Quartz links referenced in descriptive docs

**LANGUAGE**: JSON

**CODE**:
```json
{
  "advancedOptions": {
    "theme": "Morning Horizon",
    "minimumSapUi5Version": "1.102.0",
    "addEslint": true,
    "eslintPackage": "eslint-plugin-fiori-custom",
    "addJsCodeAssist": true,
    "updateNpmWorkspacesForCap": false,
    "enableTypeScriptExperimental": false,
    "notes": {
      "Belize": "Deprecated since SAPUI5 1.120 and removed in 1.136+",
      "QuartzDark": "Available only on SAPUI5 1.72+",
      "MorningEvening": "Shown only if minimum SAPUI5 version >= 1.102"
    },
    "links": {
      "eslintPlugin": "https://www.npmjs.com/package/eslint-plugin-fiori-custom",
      "themeQuartzLight": "https://help.sap.com/viewer/0120a9e442b44ad9925841dde3bc521f/201909.002/en-US/bf53ad16229e4e438dc0ea5c42064cff.html",
      "themeBelize": "https://help.sap.com/viewer/8ec2dae34eb44cbbb560be3f9f1592fe/1709%20002/en-US/977672c6940f48578d08d770bee236f2.html",
      "themeQuartzDark": "https://help.sap.com/viewer/085edb30fb3d413da552832f3d5c01c0/2002.500/en-US/ed83b3029c724c9cb267cc4c6eff1068.html",
      "themeMorningEvening": "https://experience.sap.com/fiori-design-web/theming/"
    }
  }
}
```
--------------------------------

**TITLE**: Generate an MTA Deployment (app router) Project for Multiple SAP Fiori Apps

**INTRODUCTION**: Step-by-step actions to generate an app router configuration project (mta.yaml included) using the Fiori CF Application Router Generator, manage its repository layout, and add multiple SAP Fiori elements apps under a single root directory. Use these instructions in automation scripts or code generation tools.

**TAGS**: fiori-tools, mta, approuter, cloud-foundry, app-router, generator, sap-fiori

**STEP**: 1 — Open the CF Application Router Generator

**DESCRIPTION**: Launch the Fiori Cloud Foundry Application Router generator from the Command Palette in VS Code to create an app router configuration project skeleton (includes mta.yaml and router configuration). Use the command name exactly as shown.

**LANGUAGE**: Shell

**CODE**:
```bash
# Open VS Code Command Palette and run:
# Keybinding (use the correct modifier for your OS): [CMD/CTRL] + [Shift] + [P]
# Exact command to execute:
Fiori: Open CF Application Router Generator
```

**STEP**: 2 — Generated project root structure

**DESCRIPTION**: The generator creates a single root directory that contains router configuration plus supporting files. Keep this file structure intact to ensure proper mta packaging and npm management. Note: the router directory name can differ (for example, `configurable`).

**LANGUAGE**: text

**CODE**:
```text
<root-directory>/
├── router/                # folder that contains the app router configuration (name can vary, e.g., 'configurable')
├── .gitignore             # files excluded from source control
├── mta.yaml               # MTA configuration file for the multi-target application
├── package-lock.json      # generated automatically when npm modifies node_modules or package.json
└── package.json           # npm package descriptor for the app router configuration project
```

**STEP**: 3 — Minimal mta.yaml skeleton for an app router project

**DESCRIPTION**: Use this minimal MTA YAML as a starting point. The file declares an approuter module and provides the MTA metadata. Extend modules and resources as you add SAP Fiori apps and backend services.

**LANGUAGE**: YAML

**CODE**:
```yaml
_schema-version: "3.2"
ID: my-mta
version: 1.0.0

modules:
  - name: approuter
    type: approuter.nodejs
    path: router
    parameters:
      memory: 128M
    requires:
      - name: html5-apps-repo-rt
        properties:
          service: html5-apps-repo
resources:
  - name: html5-apps-repo-rt
    type: org.cloudfoundry.managed-service
    properties:
      service-plan: app-runtime
```

**STEP**: 4 — Example package.json for the router module (root-level)

**DESCRIPTION**: Typical package.json for an app router configuration project. Keep dependencies and scripts to enable local development and deployment. Adjust versions and dependencies as required.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "name": "my-approuter",
  "version": "1.0.0",
  "description": "SAP Cloud Foundry App Router for multiple Fiori apps",
  "scripts": {
    "start": "node router/node_modules/@sap/approuter/approuter.js",
    "build": "echo \"build step if needed\""
  },
  "dependencies": {
    "@sap/approuter": "^10.0.0"
  }
}
```

**STEP**: 5 — Add one or more SAP Fiori apps under the root directory

**DESCRIPTION**: After generating the app router project, generate SAP Fiori elements apps inside the same root directory (as sibling folders to `router`) so the router can serve them. Each app will be a separate folder under the root.

**LANGUAGE**: text

**CODE**:
```text
<root-directory>/
├── router/
├── app-fiori-sales/        # Fiori app generated with SAP Fiori generator
│   ├── webapp/
│   └── manifest.json
├── app-fiori-inventory/    # Another Fiori app
│   ├── webapp/
│   └── manifest.json
├── .gitignore
├── mta.yaml
├── package.json
└── package-lock.json
```

**STEP**: 6 — Router types and relevant references

**DESCRIPTION**: Choose the approuter type that fits your deployment: managed approuter (BTP managed), Application Frontend service, or standalone approuter. Consult these references for details and decisions between router types.

**LANGUAGE**: text

**CODE**:
```text
References:
- SAP Tech Bytes: FAQ Managed Approuter vs. Standalone Approuter
  https://blogs.sap.com/2021/05/17/sap-tech-bytes-faq-managed-approuter-vs.-standalone-approuter/

- Developing HTML5 Applications in the Cloud Foundry Environment
  https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/11d77aa154f64c2e83cc9652a78bb985.html
```
--------------------------------

**TITLE**: Data Source Connections for SAP Fiori Tools (VS Code & SAP Business Application Studio)

**INTRODUCTION**: This document explains actionable steps to configure and use data sources when generating SAP Fiori applications with SAP Fiori tools. It covers connecting to SAP systems (VS Code and SAP Business Application Studio), using OData endpoints (including customized destination URLs), uploading metadata XML files, using SAP Business Accelerator Hub (deprecated), and using local CAP projects (Node.js and Java). Use these steps directly in code-generation workflows and automation scripts.

**TAGS**: fiori-tools, SAP, OData, CAP, VSCode, BAS, ABAP, SAP-BTP, metadata, destination, generation

**STEP**: Connect to an SAP System (VS Code)

**DESCRIPTION**: Create or use a saved SAP system connection in VS Code. Save connection credentials to OS secure storage to avoid repeated authentication. For SAP BTP-hosted ABAP systems you can authenticate with Service Key (requires administrator-provided service key) or Reentrance Ticket (S/4HANA Cloud 2408+). For on-premise ABAP provide system URL and optional client ID and credentials.

- Save credentials to OS secure storage:
  - Windows: Credential Manager
  - macOS: Keychain

- Recommended: If connection details must be updated, delete the system in the SAP Systems view in VS Code and recreate via the project generator.

**LANGUAGE**: n/a

**CODE**:
```text
# Example on-premise system URL and client
https://someurl:12345, client: 010
```

**STEP**: Connect to an SAP System (SAP Business Application Studio)

**DESCRIPTION**: In SAP Business Application Studio (BAS), select a configured destination from the generator’s dropdown. The generator retrieves available destinations automatically. Destinations must expose a catalog service listing OData V2/V4 services. If access to a destination is missing, an error occurs. To reference a destination endpoint directly, use the "Connect to an OData Service with a customized URL" step below.

**LANGUAGE**: n/a

**CODE**:
```text
# BAS requires destinations to provide a catalog service for OData V2 and V4 discovery.
```

**STEP**: Connect to an OData Service with a Customized URL (BAS destinations)

**DESCRIPTION**: Use destination names in the data source URL when the endpoint is accessible only via BAS destinations. Format the URL as <DestinationName>.dest plus the service path. The generator routes requests via the BAS destination.

**LANGUAGE**: n/a

**CODE**:
```text
# If Destination name = MyDestination and original URL = https://someurl.com/someservice
https://MyDestination.dest/someservice
```

**STEP**: Connect to an OData Service (Direct URL)

**DESCRIPTION**: Provide the OData endpoint URL directly in the generator. Both authenticated and unauthenticated OData endpoints are supported. Ensure OData protocol version (V2 or V4) matches the chosen application template; the generator validates and warns on mismatches. If requested, provide username/password when prompted.

**LANGUAGE**: n/a

**CODE**:
```text
# Example direct OData service URL
https://example.com/odata/service.svc/
```

**STEP**: Upload a Metadata Document (metadata XML)

**DESCRIPTION**: Upload an EDMX-format metadata XML file to generate an application without a live backend. The generator validates the metadata.xml file (EDMX format only). Using metadata.xml restricts the generated app to mock data only.

**LANGUAGE**: n/a

**CODE**:
```text
# Supported file: metadata.xml (EDMX format)
# Use uploaded metadata.xml in the generator to select entities and generate the app.
```

**STEP**: Connect to SAP Business Accelerator Hub (Deprecated)

**DESCRIPTION**: SAP Business Accelerator Hub (api.sap.com) is deprecated as a data source in the Application Generator and will be removed in a future release. It can be used for local sandbox development only and must be replaced before production. Ensure you logged into https://api.sap.com/ at least once before using it. Authentication with Username and Password is required when selected in the generator.

**LANGUAGE**: n/a

**CODE**:
```text
# Warning: Deprecated for production use. Use Service Center in SAP Business Application Studio instead.
https://api.sap.com/
```

**STEP**: Use a Local CAP Project (Overview)

**DESCRIPTION**: Select a detected CAP project in your workspace or manually provide the CAP project folder path. The generator retrieves services defined in the CAP project. Local CAP projects are supported for List Report Object Page and Analytical List Page templates based on OData V4 only. Do not mix V2 and V4 service generation within the same CAP app folder—generate V2 apps outside the CAP project if required.

**LANGUAGE**: n/a

**CODE**:
```text
# CAP documentation and versioning reference
https://cap.cloud.sap/docs/about/
https://cap.cloud.sap/docs/advanced/odata#odata-v2-support
```

**STEP**: SAP CAP Node.js Project — Prerequisites and Steps

**DESCRIPTION**: Ensure Node.js and project dependencies are installed for CAP Node.js. If using sample projects, set workspace root to cloned repository and run npm install. Use the generator to select the CAP project and OData service, pick main entity, set project attributes, and generate the app.

- Example project attributes:
  - Module name: incidents
  - Application title: My Incidents
  - Application namespace: sap.fe.demo

**LANGUAGE**: Shell / n/a

**CODE**:
```bash
# If using a sample CAP Node.js project (after cloning)
npm install
# Follow generator wizard:
# - Data source: Use a Local CAP Project
# - OData service: select service from dropdown
# - Entity Selection: pick main entity
# - Project Attributes: set values (e.g., incidents, My Incidents, sap.fe.demo)
# - Finish to generate
```

**STEP**: SAP CAP Java Project — Prerequisites and Steps

**DESCRIPTION**: Verify cds, java, and maven are installed and accessible in the terminal. If using CAP Java sample projects, run mvn to start the project, then run the SAP Fiori generator to select the local CAP project and service. After generation, run the Spring Boot app and open the provided local URL from the generated README to access the app.

- Example project attributes:
  - Module name: books
  - Application title: Books

- After generation run spring boot and open app link (app/books/README.md).

**LANGUAGE**: Shell / n/a

**CODE**:
```bash
# Verify prerequisites
cds --version
java --version
mvn --version

# If using CAP Java sample project
cd cloud-cap-samples-java
mvn spring-boot:run
# After startup, open:
http://localhost:8080

# Generator steps:
# - Data source: Use a Local CAP Project
# - OData service: select (e.g., CatalogService)
# - Entity Selection: pick main entity
# - Project Attributes: set values (e.g., books, Books)
# - Finish to generate

# After generation, in terminal:
mvn spring-boot:run

# Open generated README to find local app URL:
app/books/README.md
# Follow the link, then authenticate when prompted (e.g., user/user or admin/admin)
```

**STEP**: Additional Notes & Recommendations

**DESCRIPTION**: Short checklist and recommendations to ensure smooth generation:

- When connecting first time in VS Code, only "New System" option is available.
- If saved credentials expire or are invalid, the generator prompts reauthentication.
- If generator cannot find a matching @sap/CDS major version in workspace for CAP, generation will be blocked.
- For BAS, required roles to create Fiori elements in BTP ABAP environment: OrgManager, SpaceManager, SpaceDeveloper.
- Use secure storage for saved connections and manage saved systems via SAP Systems view in VS Code.

**LANGUAGE**: n/a

**CODE**:
```text
# Example saved system storage locations:
# Windows: Credential Manager
# macOS: Keychain

# If CAP @sap/CDS version mismatch occurs, ensure matching @sap/CDS major version is installed in workspace or project.
```
--------------------------------

**TITLE**: Floorplan Properties (Fiori Tools) — Configuration and manifest.json settings

**INTRODUCTION**: This document summarizes actionable floorplan property settings used to customize generated Fiori Elements applications after selecting a data source. It lists the main floorplan-level properties, OData V2-specific and OData V4-specific properties, and provides manifest.json examples for variant management. Use these fragments when generating or editing code, scaffolding apps, or producing manifest.json content.

**TAGS**: fiori-tools, floorplan, manifest.json, OData V2, OData V4, list-report, worklist, analytical-list-page, table-type, variant-management

**STEP**: 1 — Main floorplan properties (common concepts)

**DESCRIPTION**: Define the core floorplan properties that drive the list/main area and navigation behavior. These values determine which entity set populates the main content, how navigation to other apps is performed, and what table type is generated for list-like floorplans.

- Main entity: The entity set used to populate the main content area of the list page. For a parametrized entity set, use the result entity set name.
- Navigation entity: The association from the main entity used to navigate to related applications.
- Table type: The type of table to be generated. Applicable to floorplans that display lists in table form (list report, worklist, analytical list). See Fiori design doc: https://experience.sap.com/fiori-design-web/table-types-sap-fiori-elements/

**LANGUAGE**: Text

**CODE**:
```text
// Conceptual properties to set in your floorplan configuration/UI or metadata:
Main entity: <entitySetName or resultEntitySetName>
Navigation entity: <associationName>
Table type: (e.g., Default, Analytical, Tree, Responsive)
```

**STEP**: 2 — Defaults and auto-populated values (Tip)

**DESCRIPTION**: Default behaviors based on OData service capabilities—useful to decide when to override defaults.

- If the OData V4 service supports the Analytical table type and the selected main entity supports an analytical table, the table type defaults to Analytical for list report and worklist floorplans.
- If the OData V4 service supports hierarchical usage and the selected main entity supports the tree table, the table type defaults to Tree for list report and worklist floorplans, and the Hierarchy Qualifier is populated.

**LANGUAGE**: Text

**CODE**:
```text
// Tip (informational):
If OData V4 service supports Analytical → default Table type = "Analytical" (list report, worklist)
If OData V4 supports hierarchical usage → default Table type = "Tree" and Hierarchy Qualifier auto-populated
```

**STEP**: 3 — OData V2: Worklist page — enable variant management (manifest.json)

**DESCRIPTION**: To enable variant management for Worklist pages in OData V2-based floorplans, set the following properties in your application manifest.json. Use the first fragment to enable variant management on the table level. Use the second fragment to enable variant management at the page level (smart variant management).

File: manifest.json

**LANGUAGE**: JSON

**CODE**:
```json
// To enable variant management at the table level (Worklist Page, OData V2):
{
  "variantManagementHidden": false
}
```

**LANGUAGE**: JSON

**CODE**:
```json
// To enable variant management at the page level (Worklist Page, OData V2):
{
  "smartVariantManagement": true,
  "variantManagementHidden": false
}
```

**STEP**: 4 — OData V2: Analytical List Page — supported properties and behaviors

**DESCRIPTION**: The following properties apply to Analytical List Pages using OData V2. Use them to control the table and chart interaction, multi-selection behavior, and variant management at the page level.

- Table type: Defines which table variants are supported for the analytical list page.
- Allow multi select: When enabled, a checkbox appears to select multiple items in the table. This is effective only when multi-selection actions are defined via annotations or the manifest.
- Auto hide: Controls chart↔table interaction.
  - true = the chart acts as a filter for the table (table rows filtered by chart selection).
  - false = matching table rows are highlighted but the table is not filtered.
- Enable smart variant management: Enables variant management at the page level (use smartVariantManagement = true in manifest.json).

**LANGUAGE**: Text

**CODE**:
```text
// Analytical List Page (OData V2) - conceptual property list:
Table type: <supported table types>
Allow multi select: true | false
Auto hide: true | false
Enable smart variant management: smartVariantManagement = true (manifest.json)
```

**STEP**: 5 — OData V4: Analytical List Page — selection mode

**DESCRIPTION**: For OData V4-based floorplans, the Analytical List Page exposes a Selection mode property to define row selection behavior for the generated table. Configure this selection mode to match action semantics (single, multi, none, etc.) supported by your UI and backend.

**LANGUAGE**: Text

**CODE**:
```text
// Analytical List Page (OData V4):
Selection mode: <selection mode values such as "None", "Single", "Multi"> (set in floorplan configuration)
```

**STEP**: 6 — Where to set these properties

**DESCRIPTION**: Most customizations are set in the generated application’s manifest.json or via the Fiori tools floorplan configuration UI. When programmatically editing manifest.json, add the discussed keys to the appropriate page/component settings block of your manifest. The only required file reference is:

- manifest.json

**LANGUAGE**: Text

**CODE**:
```text
// Example locations (conceptual):
manifest.json
  └─ sap.ui.generic.app or sap.ui5 component settings
      └─ pages → <pageId> → component/settings → { ...variantManagementHidden, smartVariantManagement, ... }
```
--------------------------------

**TITLE**: Generate a SAP Fiori Elements Application with SAP Fiori Tools

**INTRODUCTION**: Step-by-step, action-oriented instructions for generating a SAP Fiori Elements application using SAP Fiori tools. Includes floorplan selection, data source options, required project attributes, deployment and preview configuration settings, and finalization steps. Keep these values and constraints exact when automating generation or writing scripts that interact with the wizard or template generator.

**TAGS**: fiori-tools, sap-fiori-elements, sapui5, odata, CAP, mta, flp, project-generation

**STEP**: 1 — Select Floorplan

**DESCRIPTION**: Choose the floorplan for your Fiori Elements application. This determines the generated UI scaffolding and supported features. Use the exact floorplan identifiers/names when creating templates or mapping to generator flags.

**LANGUAGE**: plaintext

**CODE**:
```plaintext
Available Floorplans (select one):
- List Report Object Page
  Link: supported-floorplans-2b2b12e.md#loio2b2b12e708944d85a40d087194cc1edd__ul_emp_5pt_rlb
- Worklist
  Link: supported-floorplans-2b2b12e.md#loio2b2b12e708944d85a40d087194cc1edd__ul_v3k_15v_54b
- Analytical List Page
  Link: supported-floorplans-2b2b12e.md#loio2b2b12e708944d85a40d087194cc1edd__ul_jxj_25v_54b
- Overview Page
  Link: supported-floorplans-2b2b12e.md#loio2b2b12e708944d85a40d087194cc1edd__ul_dcr_h5v_54b
```

**STEP**: 2 — Select Data Source

**DESCRIPTION**: Choose and configure the data source for your application. If credentials are required, provide username/password and use the Login icon. When automating, map generator options to one of the supported data source types below.

**LANGUAGE**: plaintext

**CODE**:
```plaintext
Data Source options (select one):
- Connect to an SAP System
  Link: data-source-9906181.md#loio99061814ead548808d539861fb27bafb__section_tpk_mzx_v4b
- Connect to an OData Service with a customized URL
  Link: data-source-9906181.md#loio99061814ead548808d539861fb27bafb__section_i2d_yzx_v4b
- Connect to an OData service
  Link: data-source-9906181.md#loio99061814ead548808d539861fb27bafb__section_sx1_chy_v4b
- Upload a Metadata Document
  Link: data-source-9906181.md#loio99061814ead548808d539861fb27bafb__section_xk3_nhy_v4b
- Connect to SAP Business Accelerator Hub
  Link: data-source-9906181.md#loio99061814ead548808d539861fb27bafb__section_rgz_xhy_v4b
- Use a Local CAP Project
  Link: data-source-9906181.md#loio99061814ead548808d539861fb27bafb__section_fgh_m3y_v4b

Credentials note:
- If username and password are required, enter credentials and click the Login icon (person with an arrow).
- Login image reference: images/Login_button_App_Gen_fb8dd99.png
```

**STEP**: 3 — Configure Associated Floorplan Properties

**DESCRIPTION**: Select the main entity and any navigation entities for the chosen floorplan. These values define the generated OData bindings and navigation links. Ensure entity names match the data source metadata.

**LANGUAGE**: plaintext

**CODE**:
```plaintext
Associated floorplan properties:
- Main entity: [select main entity from metadata]
- Navigation entity: [select related navigation entities as needed]
Reference: floorplan-properties-745ae0c.md
```

**STEP**: 4 — Configure Project Attributes (Project Attributes wizard page)

**DESCRIPTION**: Provide required and optional project attributes precisely. These values control package names, folder structure, SAPUI5 minimum version, deployment integration, and preview behavior. Enforce constraints when validating input in automation scripts.

**LANGUAGE**: plaintext

**CODE**:
```plaintext
Project Attributes (provide values):

- Module name (required)
  - Must be alpha-numeric and cannot contain spaces.
  - Used as Node.js package name and generated application folder name.
  - Only URL-friendly characters allowed.
- Application title
  - Display title for launchpad tile and app header.
- Application namespace
  - SAPUI5 project namespace: must start with a letter; may contain letters, digits, and periods only.
- Description
  - Application description.
- Project folder path (required)
  - Parent folder where the new application folder (module name) is created.
  - Cannot select a folder that already contains an SAP Fiori application.
  - To generate as part of a CAP project, select "Local CAP Project" as the Data Source in Step 2.
- Minimum SAPUI5 version
  - Select from dropdown of available SAPUI5 versions (grouped by maintenance status).
  - Default version is preselected; if source is ABAP on Premise, default matches that ABAP system's SAPUI5 version where possible.
  - For OData V4 data source, supported SAPUI5 versions are limited to the most recent versions.
  - SAPUI5 version overview: https://ui5.sap.com/versionoverview.html

Deployment & Additional configuration options (defaults shown):
- Adding Deployment Configuration to an Existing MTA Deployment File
  - Reference: ../Additional-Configuration/adding-an-sap-fiori-application-to-an-mta-deployment-file-with-5a17ba6.md#loiod7525cef6f6c4aa4acf3ec09c5a8eacb
  - If generating inside an app router config project with an MTA file, deployment configuration is used by default; you may still select No to skip.
- Add deployment configuration
  - Default: No
  - Reference: ../Additional-Configuration/additional-configuration-9bea64e.md#loio9bea64e63b824261932d90037ce3c5ae__section_itv_dk5_t4b
- Add FLP configuration
  - Default: No
  - Reference: ../Additional-Configuration/additional-configuration-9bea64e.md#loio9bea64e63b824261932d90037ce3c5ae__section_hbd_gzy_t4b
- Configure virtual endpoints for local preview
  - Default: Yes
  - If Yes, generator will configure virtual endpoints and you do not need to create these files manually.
  - Reference: ../../Previewing-an-Application/convert-a-project-to-use-virtual-endpoints-630ddec.md
- Configure advanced options
  - Default: No
  - Reference: ../Additional-Configuration/additional-configuration-9bea64e.md#loio9bea64e63b824261932d90037ce3c5ae__section_uhj_l2z_t4b

After providing values to these prompts, click Finish to generate.
```

**STEP**: 5 — Finish Generation

**DESCRIPTION**: Finalize the wizard to generate the application. The generator will create a new folder named after the module name inside the specified Project folder path and scaffold the Node.js/SAPUI5 application artifacts. Validate generated files and configuration for deployment and preview.

**LANGUAGE**: plaintext

**CODE**:
```plaintext
Action: Click "Finish" to generate the application.

Result:
- New application folder: [ProjectFolderPath]/[ModuleName]
- Generated artifacts include Node.js application (package name = module name), SAPUI5 project files, OData bindings per selected floorplan, and optional deployment/FLP/virtual endpoint files per selections.
```
--------------------------------

**TITLE**: Supported Floorplans for SAP Fiori elements (fiori-tools)

**INTRODUCTION**: This reference lists the SAP Fiori elements floorplans provided by the SAP Fiori generator. Use it to choose the floorplan to scaffold an app, understand compatibility constraints (SAPUI5 and OData versions), and identify what must be configured (annotations, charts, cards, extension points) when generating or extending an application.

**TAGS**: fiori-tools, fiori-elements, floorplans, SAPUI5, ODataV4, ODataV2, list-report, worklist, analytical-list, overview-page, object-page, custom-page

**STEP**: 1 — List Report Page

**DESCRIPTION**: Choose the List Report Page when the app needs to display and act on large datasets with strong built-in filtering, searching, and navigation to a detail (object) page. Actionable items when generating/code-extending:
- Provide OData annotations for list presentation, selection fields, and navigation targets to Object Page.
- Confirm manifest and routing point to the List Report and configure the target Object Page for details.
- Use List Report when you need a scalable entry point to item details.

**LANGUAGE**: Markdown

**CODE**:
```markdown
-   *List Report Page*

    With the list report page, users can view and work with a large set of items. This floorplan offers powerful features for finding and acting on relevant items. It’s often used as an entry point for navigating to the item details, which are shown on the object page.

    For more information, see [List Report](https://experience.sap.com/fiori-design-web/list-report-floorplan-sap-fiori-element/) and [Object Page](https://experience.sap.com/fiori-design-web/object-page/).
```

**STEP**: 2 — Worklist Page

**DESCRIPTION**: Use the Worklist Page for processing tasks or items users must act on (approve, complete, delegate). Implementation details and actions:
- Configure the app using a List Report + Object Page combination (the Worklist can be configured from any List Report and Object Page).
- Ensure application logic centers on item processing (actions exposed in the list and object page).
- Compatibility: For OData V4 data sources, use SAPUI5 >= 1.99. For OData V2, consult the floorplan properties doc at floorplan-properties-745ae0c.md.
- Validate annotation-based intent-driven navigation and action availability for task processing.

**LANGUAGE**: Markdown

**CODE**:
```markdown
-   *Worklist Page*

    The worklist page displays a collection of items that the user needs to process. Working through the list usually involves reviewing details of the items and taking action. In most cases, the user has to either complete a work item or delegate it.

    The focus of the worklist floorplan is on processing items. This differs from the list report floorplan, which focuses on finding and acting on relevant items from a large dataset.

    You can use any*List Report* and *Object Page* to configure the *Worklist Page*.

    For more information, see [Worklist Floorplan](https://experience.sap.com/fiori-design-web/work-list/).

    > ### Note:  
    > For worklist floorplans using an OData V4 data source, only `SAPUI5` versions 1.99 and above are supported.

    For information on what the worklist page supports for OData V2, see [Floorplan Properties](floorplan-properties-745ae0c.md).
```

**STEP**: 3 — Analytical List Page

**DESCRIPTION**: Select the Analytical List Page for combined analytical and transactional scenarios where visualization, drill-down, and hybrid table/chart views are required. Actions for generator/configuration:
- Provide annotations for charts, KPIs, visual filters, and measures.
- Configure hybrid view (table + chart), chart-drill behaviors, and drill-in navigation to detail pages.
- Compatibility: For OData V4, use SAPUI5 >= 1.90.
- Include measures and aggregations in the OData model and enable direct actions on transactional content.

**LANGUAGE**: Markdown

**CODE**:
```markdown
-   *Analytical List Page*

    The analytical list page offers a unique way to analyze data step by step from different perspectives to investigate the root cause of any deviations, spikes, and abnormalities through drilldown, and to act on transactional content. All this can be done seamlessly within a single page. The purpose of the analytical list page is to identify problem areas within datasets or significant single instances using data visualization and business intelligence.

    Visualization helps users to recognize facts and situations, and to reduce the number of interaction steps needed to gain insights or to identify significant single instances. Chart visualization enables users to spot relevant data more quickly.

    The main target group are users who work on transactional content. They benefit from fully transparent business object data and direct access to business actions. In addition, they have access to analytical views and functions without having to switch between systems. These include KPIs, a visual filter where filter values are enriched by measures and visualizations, and a combined table or chart view with drill-in capabilities \(hybrid view\). Users can interact with the chart to look deep into the data. The visualization enables them to identify spikes, deviations, and abnormalities more quickly, and to take appropriate action right away.

    For more information, see [Analytical List Page](https://experience.sap.com/fiori-design-web/analytical-list-page/).

    > ### Note:  
    > For analytical list page floorplans using an OData V4 data source, only `SAPUI5` versions 1.90 and above are supported.
```

**STEP**: 4 — Overview Page

**DESCRIPTION**: Use the Overview Page to build role- or domain-centric dashboards composed of cards. Implementation actions:
- Create annotation-driven cards (KPIs, lists, charts) to display relevant role-specific content.
- Configure card navigation targets and data sources via annotations.
- Use the Overview Page as a container for multiple cards and content containers to allow users to filter and react to information on one page.

**LANGUAGE**: Markdown

**CODE**:
```markdown
-   *Overview Page*

    The overview page is a data-driven SAP Fiori floorplan that provides all the information the user needs on a single page, based on the user specific domain or role. It allows the user to focus on the most important tasks, and view, filter, and react to the information quickly.

    Each task or topic is represented by a card or a content container. The overview page acts as a UI framework for organizing multiple cards on a single page.

    The overview page uses annotated views of app data, meaning that the app content can be tailored to the domain or role. Different types of cards allow you to visualize information in an attractive and efficient way.

    For more information, see [Overview Page](https://experience.sap.com/fiori-design-web/overview-page/).
```

**STEP**: 5 — Form Entry Object Page

**DESCRIPTION**: Choose Form Entry Object Page when the app requires record creation with a generated form and an object page. Actions to implement:
- Provide create-level annotations and editable field annotations for the form.
- Ensure object page sections and subsections are defined via annotations to structure the generated form.
- Validate that the generated object page supports the required create and edit flows.

**LANGUAGE**: Markdown

**CODE**:
```markdown
-   *Form Entry Object Page*

    The form entry object page allows users to create an application with an object page and a generated form. The object page floorplan enables end-users to provide data entry in the generated application.

    For more information, see [Object Page](https://experience.sap.com/fiori-design-web/object-page/).
```

**STEP**: 6 — Custom Page

**DESCRIPTION**: Use the Custom Page for full control and to extend Fiori elements apps (OData V4 focused). Actionable guidance:
- Implement controller extensions and UI fragments using any SAPUI5 coding patterns in provided extension points.
- Use Custom Page when you need non-annotation-driven UI, custom controls, or bespoke logic.
- Reference live examples and extension patterns in the SAP Fiori development portal and the FE core fpmExplorer.
- Confirm compatibility with OData V4 scenarios and follow extension security and manifest conventions.

**LANGUAGE**: Markdown

**CODE**:
```markdown
-   *Custom Page*

    The custom page floorplan makes it easy for you to extend apps based on SAP Fiori elements for OData V4. You can use any `SAPUI5` coding or controls in extension points, and take advantage of the provided building blocks.

    For more information and live examples, see the SAP Fiori development portal at [Custom Page](https://ui5.sap.com/test-resources/sap/fe/core/fpmExplorer/index.html#/controllerExtensions/customPage).
```
--------------------------------

**TITLE**: Basic Template — SAPUI5 Starter App (webapp)

**INTRODUCTION**: Minimal, standalone SAPUI5 starter template providing a blank canvas and recommended file structure. Use this to start coding a UI5 app immediately. Note: this template is standalone and does not include Node.js or launchpad/tile features — add those manually if needed.

**TAGS**: fiori-tools, sapui5, ui5, template, basic-template, webapp, unit-tests

STEP: 1 — Location and purpose
DESCRIPTION: File layout and purpose. The main entry is webapp/index.html which loads SAPUI5, initializes the app, and instantiates an XML view (webapp/view/App.view.xml). Tests reside under webapp/test (unit/integration). Use this step to locate and modify the entry point and view.
LANGUAGE: text
CODE:
```text
Path: webapp/index.html
Path: webapp/view/App.view.xml
Path: webapp/controller/App.controller.js
Path: webapp/test/unit/...   (sample tests for formatters and controller)
```

STEP: 2 — webapp/index.html (entry point)
DESCRIPTION: Minimal index.html that boots SAPUI5, loads sap.m, and creates the XML view named view.App. Place this file at webapp/index.html. Modify bootstrap URL, theme, and libs as required.
LANGUAGE: HTML
CODE:
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Basic Template</title>
    <script
      id="sap-ui-bootstrap"
      src="https://sapui5.hana.ondemand.com/resources/sap-ui-core.js"
      data-sap-ui-theme="sap_belize"
      data-sap-ui-libs="sap.m"
      data-sap-ui-compatVersion="edge"
      data-sap-ui-async="true">
    </script>
    <script>
      sap.ui.getCore().attachInit(function () {
        sap.ui.xmlview({
          viewName: "view.App"
        }).placeAt("content");
      });
    </script>
  </head>
  <body id="content" class="sapUiBody"></body>
</html>
```

STEP: 3 — webapp/view/App.view.xml (XML view with header and title)
DESCRIPTION: Minimal XML view using sap.m controls. Place this file at webapp/view/App.view.xml. It provides a Page with a title coming from an i18n key (i18n resource bundle recommended).
LANGUAGE: XML
CODE:
```xml
<mvc:View
  controllerName="controller.App"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m">
  <App>
    <pages>
      <Page id="page" title="{i18n>appTitle}">
        <!-- Blank canvas: add content here -->
      </Page>
    </pages>
  </App>
</mvc:View>
```

STEP: 4 — webapp/controller/App.controller.js (basic controller)
DESCRIPTION: Minimal controller skeleton. Place at webapp/controller/App.controller.js. Expand with event handlers and lifecycle methods.
LANGUAGE: JavaScript
CODE:
```javascript
sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";

  return Controller.extend("controller.App", {
    onInit: function () {
      // initialization logic
    }
    // add event handlers and methods here
  });
});
```

STEP: 5 — i18n resource bundle (optional but recommended)
DESCRIPTION: Add an i18n.properties file under webapp/i18n/i18n.properties and include an appTitle key referenced in the view. This file stores UI strings.
LANGUAGE: text
CODE:
```text
Path: webapp/i18n/i18n.properties

# Example content
appTitle=Basic Template
```

STEP: 6 — Tests: location and example unit tests
DESCRIPTION: Tests for formatters and the app controller are included as best-practice samples. Place unit tests under webapp/test/unit/... Use QUnit for unit tests. Below are example test stubs for a formatter and the App controller. Update module paths to match your project structure.
LANGUAGE: JavaScript
CODE:
```javascript
// Path: webapp/test/unit/formatter/formatter.qunit.js
QUnit.module("Formatter tests");

QUnit.test("sample formatter behavior", function (assert) {
  // Replace with correct module path for your formatter
  var oFormatter = sap.ui.requireSync("my/app/formatter");
  assert.ok(oFormatter, "Formatter module loaded");
  // Example assertion (adapt to your formatter)
  if (oFormatter && typeof oFormatter.someFormat === "function") {
    assert.strictEqual(oFormatter.someFormat("a"), "A", "someFormat transforms as expected");
  }
});
```

```javascript
// Path: webapp/test/unit/controller/App.controller.qunit.js
QUnit.module("App Controller");

QUnit.test("controller initialization", function (assert) {
  // Replace with correct controller module path
  var AppController = sap.ui.requireSync("controller/App");
  assert.ok(AppController, "App controller module loaded");
  // If controller is a constructor or has onInit method, test accordingly
  var oControllerInstance = (AppController && AppController.prototype) ? new AppController() : AppController;
  assert.ok(oControllerInstance && (oControllerInstance.onInit || oControllerInstance.onInit === undefined), "Controller instance created");
});
```

STEP: 7 — Notes and conversion tips
DESCRIPTION: Notes for converting this standalone template into a launchpad app or adding Node.js tooling:
- This template intentionally omits Node.js features (no package.json, no dev server scripts).
- To convert to a launchpad app, add required manifest.json entries, tile/target configuration, and implement Save as Tile if needed.
- Ensure tests are wired into your CI pipeline and update module paths for test runner configuration (QUnit, Karma, etc.).
--------------------------------

**TITLE**: Data Source Configuration for SAP Fiori Application Generator

**INTRODUCTION**: Instructions for connecting the SAP Fiori application generator to data sources during project generation. Covers connection methods for VS Code and SAP Business Application Studio (BAS), OData endpoints, destination-based routing, uploading a metadata.xml file, using SAP Business Accelerator Hub (deprecated), and selecting a local CAP project. Use these steps to configure data sources so the generator can detect services, authenticate, and validate OData versions.

**TAGS**: fiori-tools, sap, odata, cap, metadata, BAS, VSCode, sap-btp, sap-abap, s4hana

**STEP**: Connect to an SAP System (VS Code)

**DESCRIPTION**: Create or select a saved SAP system to connect the generator to an on-premise SAP ABAP system or SAP Business Technology Platform ABAP system. You can save connection details in OS secure storage so you don't repeatedly re-enter credentials.

- Add a new system:
  1. Enter a system name to save connection details.
  2. Select the SAP ABAP system type.

- Authentication types for SAP BTP-hosted ABAP:
  - Service Key: Provide the service key (admin must supply). A browser tab will open for authentication after providing the key.
  - Reentrance Ticket: Provide the URL to your SAP S/4HANA Cloud system and log in via browser.

- Notes:
  - Reentrance tickets require SAP S/4HANA Cloud 2408 or higher.
  - After authentication, the generator shows available OData services for the user. See the Service dropdown titled:
    Service (for user [<USERNAME>])
  - On-premise ABAP requires system URL and optional client ID and authentication details.
  - Example on-premise URL and client:
  
**LANGUAGE**: text

**CODE**:
```text
https://someurl:12345, client: 010
```

- Secure storage targets (saved systems):
  - Microsoft Windows: Keychain.
  - macOS: Credential Manager.
- Deletion: Saved systems can be removed from OS secure storage.
- When connecting for the first time, only the New System option is available.
- Reference: Create Service Keys Using the Cockpit:
  https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/cdf4f200db3e4c248fa67401937b2f78.html

**STEP**: Connect to an SAP System (SAP Business Application Studio)

**DESCRIPTION**: When using BAS, the generator retrieves configured destinations for the BAS instance automatically. Select a destination from the list. If you lack access rights to a destination endpoint, an error will be shown.

**LANGUAGE**: text

**CODE**:
```text
(Automatically retrieved destination list in BAS)
```

**STEP**: Connect to an OData Service with a Customized URL (BAS destinations)

**DESCRIPTION**: If your OData endpoint is not directly accessible, set it up as a BAS destination and reference it using a .dest URL in the generator.

Steps:
1. In BAS, launch the SAP Fiori Generator and select a template.
2. Choose "Connect to an OData Service" from the data source dropdown.
3. For the data source URL, use the destination name + ".dest". BAS will route to the service via the destination name.

- Example: Destination defined URL and name:
  - Destination URL: https://someurl.com/someservice
  - Destination name: MyDestination
  - Generator URL to use:

**LANGUAGE**: text

**CODE**:
```text
https://MyDestination.dest/someservice
```

**STEP**: Connect to an OData Service (direct URL)

**DESCRIPTION**: Enter the OData endpoint URL directly. Supported endpoints: unauthenticated or basic authentication. The generator validates OData version compatibility with the selected template and prompts for username/password if required.

- Note: Provide the correct OData version for your template (e.g., OData V2 endpoints for OData V2 templates). The wizard notifies you on version mismatches.

**LANGUAGE**: text

**CODE**:
```text
(Enter OData endpoint URL; basic auth or no auth supported)
```

**STEP**: Upload a Metadata Document (metadata.xml)

**DESCRIPTION**: To generate an application without a live backend, upload a metadata.xml in EDMX format. The generator validates the metadata.xml and then allows entity selection. Generated applications using metadata.xml are limited to mock data only.

- Supported format: EDMX
- File name example: metadata.xml
- Note: Only EDMX format is supported.

**LANGUAGE**: text

**CODE**:
```text
metadata.xml
```

- EDMX reference:
  https://docs.microsoft.com/en-us/openspecs/windows_protocols/mc-edmx/5dff5e25-56a1-408b-9d44-bff6634c7d16

**STEP**: Connect to SAP Business Accelerator Hub (Deprecated)

**DESCRIPTION**: SAP Business Accelerator Hub is deprecated as a data source in the Application Generator and will be removed in a future release. It is intended only for local development and must be replaced with a real data source before going live. Use Service Center in BAS instead for production intent.

- Workflow when selected:
  - Choose a predefined industry-relevant service (e.g., Just-In-Time Calls, Transaction Classifications, Content, Request of Quotation).
  - Enter Username and Password when prompted.
  - Click Next to continue generation.

- Caution: Not intended for SAP Fiori UI development or deployment (local development only).
- Reference: https://api.sap.com/
- Alternative: Service Center in BAS:
  https://help.sap.com/products/SAP%20Business%20Application%20Studio/9d1db9835307451daa8c930fbd9ab264/1e8ec75c9c784b51a91c7370f269ff98.html

**LANGUAGE**: text

**CODE**:
```text
(SAP Business Accelerator Hub is deprecated — use BAS Service Center instead)
```

**STEP**: Use a Local CAP Project

**DESCRIPTION**: Select a local SAP Cloud Application Programming Model (CAP) Node.js project folder. The generator validates the folder to ensure it is a supported CAP Node.js project and retrieves the defined services for generation.

- Validation: Folder must be a CAP Node.js project supported by the generator.
- Reference: CAP overview and services:
  https://cap.cloud.sap/docs/about/

**LANGUAGE**: text

**CODE**:
```text
(Select local CAP project folder; generator validates and lists CAP services)
```
--------------------------------

**TITLE**: Generate a Freestyle SAPUI5 Application with the SAP Fiori Generator

**INTRODUCTION**: Step-by-step, action-oriented instructions to generate a freestyle SAPUI5 application using the SAP Fiori generator. Use this when creating a new SAPUI5 app from a supported template; includes required project attributes and optional deployment/FLP/MTA settings.

**TAGS**: fiori-tools, SAPUI5, freestyle, generator, SAP Fiori, ABAP, MTA, FLP

STEP 0: Pre-check — SAP Business Application Studio dev space
DESCRIPTION: If you are using SAP Business Application Studio, ensure you use an SAP Fiori dev space before generating applications.
LANGUAGE: Text
CODE:
```Text
Note: If you are using SAP Business Application Studio, ensure you use an SAP Fiori dev space.
```

STEP 1: Select template
DESCRIPTION: In the SAP Fiori generator UI, choose a template that supports freestyle SAPUI5 applications and proceed to the next screen. Reference the supported templates documentation when picking a template.
LANGUAGE: Text
CODE:
```Text
1. In the SAP Fiori generator, select a template that supports freestyle SAPUI5 applications and click Next.
For more information, see: supported-templates-20d1146.md
```

STEP 2: Select data source
DESCRIPTION: Choose the data source the generated application will use (OData, mock data, etc.) and proceed. Refer to the Data Source documentation for details on available options and configuration.
LANGUAGE: Text
CODE:
```Text
2. Select a Data source and click Next.
For more information, see: data-source-37a0fcf.md
```

STEP 3: Enter view name
DESCRIPTION: Provide a name for the initial view of the application (used by the template) and continue to project configuration. See Template Properties for field specifics.
LANGUAGE: Text
CODE:
```Text
3. Enter a name for your view and click Next.
For more information, see: template-properties-c2a3c82.md
```

STEP 4: Configure project attributes (required and optional)
DESCRIPTION: Configure all project attributes on the project setup screen. Mandatory fields are prefilled with defaults. Carefully set these attributes because they determine folder names, namespaces, deployment behavior, FLP integration, and preview options.

- Follow naming rules:
  - Module name: alphanumeric, no spaces (used as folder/package name).
  - Application namespace: starts with a letter; only letters, digits, and periods.
- Project folder: parent folder in which a new folder with the module name will be created. If a folder with the same name exists, choose a different module name.
- Minimum SAPUI5 version: choose from dropdown (grouped by maintenance status). If source system is ABAP on-premise, default equals the SAPUI5 version on the ABAP system. See SAPUI5 Versions Maintenance Status: https://ui5.sap.com/versionoverview.html

LANGUAGE: Text
CODE:
```Text
4. Configure the project attributes and click Finish. A list of project attributes is provided below:

Tip:
Mandatory fields are prefilled with default text.

- Module name (Required): The module name attribute is used as the folder and package name for the generated application. The module name must be alphanumeric and cannot contain spaces.
- Application title (Required): The application title attribute is used as the title in the header of the generated application.
- Application namespace (Required): The application namespace attribute is used as the SAPUI5 project namespace. It must start with a letter and only contain letters, digits, and periods.
- Description: The description attribute is used as the description of the application.
- Project folder (Required): The project folder attribute is used as the parent folder in which the new application is generated. The new application is generated in a new folder with the module name. If a folder with the same name already exists, you must choose a new module name.
- Minimum SAPUI5 version: The minimum SAPUI5 version attribute is used as the minimum SAPUI5 version required in the application.
    - The dropdown shows the list of available SAPUI5 versions grouped by maintenace status and the default version is preselected. For more information on the maintenace status of SAPUI5 versions, see SAPUI5 Versions Maintenance Status: https://ui5.sap.com/versionoverview.html
    - If the source system is an ABAP on-premise system, then the default version selected in the dropdown is equal to the SAPUI5 version on the ABAP system.

- Add deployment configuration to MTA project:
    The add deployment to MTA project attribute is used if an MTA file already exists in the project folder path. If a project is generated inside an app router configuration project that has an MTA file, then uses its deployment configuration by default.
    For more information, see: ../Additional-Configuration/adding-an-sap-fiori-application-to-an-mta-deployment-file-with-5a17ba6.md#loio5a17ba6b62b2462aa0e25ffae7b8d728

- Add deployment configuration: The add deployment configuration attribute is used to determine whether to configure deployment settings.
    For more information, see: ../Additional-Configuration/additional-configuration-9bea64e.md#loio9bea64e63b824261932d90037ce3c5ae__section_itv_dk5_t4b

- Add FLP configuration: The Add FLP configuration attribute is used to determine whether to add a SAP Fiori launchpad configuration.
    For more information, see: ../Additional-Configuration/additional-configuration-9bea64e.md#loio9bea64e63b824261932d90037ce3c5ae__section_hbd_gzy_t4b

- Configure virtual endpoints for local preview:
    The configure virtual endpoints for local preview attribute is used to determine whether to activate virtual endpoints for preview. When active, preview files are not created during generation and virtual endpoints are used instead.

- Configure advanced options: The configure advanced options attribute is used to determine whether to display advanced options.
    For more information, see: ../Additional-Configuration/additional-configuration-9bea64e.md#loio9bea64e63b824261932d90037ce3c5ae__section_uhj_l2z_t4b
```

STEP 5: Generate the application
DESCRIPTION: Finalize generation. Clicking Finish creates the new freestyle SAPUI5 application inside the chosen project folder (a subfolder named after Module name).
LANGUAGE: Text
CODE:
```Text
5. Click Finish to generate the application.
```
--------------------------------

**TITLE**: Supported Templates for SAP Fiori Tools

**INTRODUCTION**: This document lists templates supported by SAP Fiori tools for creating freestyle SAPUI5 applications and SAP Fiori elements applications with a custom page. Use these templates when scaffolding a new project or when programmatically selecting a template in a generator. Note the minimum SAPUI5 runtime requirement.

**TAGS**: fiori-tools, sapui5, templates, freestyle, fiori-elements, custom-page

**STEP**: 1 — Basic template

**DESCRIPTION**: Use the Basic template when you want a blank canvas to start coding a freestyle SAPUI5 application. The template configures a recommended project file structure so you can begin implementing UI and business logic immediately. Choose this template when you want minimal scaffolding and full control over app structure.

**LANGUAGE**: Markdown

**CODE**:
```markdown
Template name: Basic
Reference file: basic-template-14fdcc0.md
Purpose: Blank freestyle SAPUI5 application with recommended file structure
Usage: Select this template in your project generator or scaffold command to create a starter project.
```

**STEP**: 2 — Custom Page (SAP Fiori elements)

**DESCRIPTION**: Use the Custom Page template to create a SAP Fiori elements application that includes a custom page using the flexible programming model. This template adds the Page building block as the default layout so you can extend and implement controller logic for a custom page within the Fiori elements framework. Ideal when you need a mix of generated Fiori elements features and custom UI code.

**LANGUAGE**: Markdown

**CODE**:
```markdown
Template name: Custom Page
Purpose: SAP Fiori elements application with a custom page based on the flexible programming model
Default layout: Page building block
Live examples and documentation: https://ui5.sap.com/test-resources/sap/fe/core/fpmExplorer/index.html#/controllerExtensions/customPage
Usage: Select this template to scaffold a Fiori elements app and then extend the page with custom controller/view code.
```

**STEP**: 3 — Minimum SAPUI5 version requirement (Caution)

**DESCRIPTION**: All templates in SAP Fiori tools (freestyle and Fiori elements) require a minimum SAPUI5 runtime version. Ensure your project's SAPUI5 dependency meets the minimum version before scaffolding or running generated apps.

**LANGUAGE**: Text

**CODE**:
```
Caution:
SAP Fiori tools supports the development of SAP Fiori elements and freestyle SAPUI5 applications with a minimum SAPUI5 version of 1.65 or higher.
```
--------------------------------

**TITLE**: Template Properties — Set View Name for Generated SAPUI5 View

**INTRODUCTION**: Configure the Template Properties for a generated SAPUI5 application. After the data source is configured, provide a unique View name that the generator will use to create the SAPUI5 view file. This name becomes the SAPUI5 view identifier and is used in generated code and routing.

**TAGS**: fiori-tools, sapui5, template, view, generator, configuration

**STEP**: 1 — Ensure data source is supplied

**DESCRIPTION**: Confirm the application generator has access to the required data source (OData, local model, etc.). The View name setting applies once the data source is provided and the generator can determine which entities or screens to scaffold.

**LANGUAGE**: Text

**CODE**:
```text
(Ensure your data source is configured in your project/generator UI before setting the View name.)
```

**STEP**: 2 — Provide a unique View name

**DESCRIPTION**: Specify a unique View name to be used for the SAPUI5 view created by the generator. The View name must be unique within the application to avoid naming collisions. This value becomes the file/view identifier used in generated controller code, XML view filename, and routing references.

- Use PascalCase or camelCase per your project conventions (example: SalesOverview, CustomerList).
- Keep names descriptive and unique across views.
- The generator will create files and references using this view name.

Preserve the generator UI asset for reference:
- Image asset: images/ViewNamePropertyGenAppFreestyle_f78f30e.png

**LANGUAGE**: JSON

**CODE**:
```json
{
  "templateProperties": {
    "viewName": "SalesOverview"
  }
}
```

**STEP**: 3 — Verify generated artifacts

**DESCRIPTION**: After generation, confirm the following artifacts reference the provided view name:
- XML view file: [viewName].view.xml (e.g., SalesOverview.view.xml)
- Controller file: [viewName].controller.js (e.g., SalesOverview.controller.js)
- Any manifest.json routing or targets that point to the view

**LANGUAGE**: Text

**CODE**:
```text
Verify:
- src/view/SalesOverview.view.xml
- src/controller/SalesOverview.controller.js
- manifest.json routes/targets referencing "SalesOverview"
```
--------------------------------

**TITLE**: Generate an SAP Fiori Application (VS Code / SAP Business Application Studio)

**INTRODUCTION**: Step-by-step, action-oriented instructions to generate an SAP Fiori (SAPUI5) application using the Fiori application generator in VS Code or SAP Business Application Studio. Includes commands to open the generator, template selection guidance, where to relaunch application info, Service Center usage, resulting project structure, and notes for CAP-based projects and tooling references.

**TAGS**: sap, fiori, sapui5, vscode, business-application-studio, generator, project-structure, cap, npm, ui5

**STEP**: 1 — Open the Fiori Application Generator

**DESCRIPTION**: Open the VS Code Command Palette (or Studio equivalent) and start the Fiori application generator.

**LANGUAGE**: bash

**CODE**:
```bash
# Open VS Code Command Palette
# macOS: CMD + Shift + P
# Windows/Linux: CTRL + Shift + P

# Run this command from the Command Palette:
Fiori: Open Application Generator

# In SAP Business Application Studio, use "Start from template"
```

**STEP**: 2 — Select Template Type in the Template Wizard

**DESCRIPTION**: In the Template Wizard, choose the template type. Default is "SAP Fiori". Optionally choose "Deprecated templates" to access older SAPUI5 templates.

**LANGUAGE**: plaintext

**CODE**:
```text
Template Type options:
- SAP Fiori       (default)
- Deprecated templates (includes deprecated SAPUI5 templates)
```

**STEP**: 3 — Proceed to Application Information

**DESCRIPTION**: Click Next after selecting the template. The Application Information page opens for additional configuration of the generated project. You can relaunch this page any time.

**LANGUAGE**: bash

**CODE**:
```bash
# Relaunch Application Information page:
# Open the Command Palette (CMD/CTRL + Shift + P) and run:
Fiori: Open Application Info
```

**STEP**: 4 — Use SAP Business Application Studio Service Center (optional)

**DESCRIPTION**: In SAP Business Application Studio, use the Service Center to explore service providers and expose data sources (subaccount destinations, SAP Business Accelerator Hub) for your app.

**LANGUAGE**: plaintext

**CODE**:
```text
Service Center documentation:
https://help.sap.com/products/SAP%20Business%20Application%20Studio/9d1db9835307451daa8c930fbd9ab264/1e8ec75c9c784b51a91c7370f269ff98.html
```

**STEP**: 5 — Inspect Generated Project Structure

**DESCRIPTION**: After generation, verify the standard project layout and files (used for local development, preview, and deployment). The list below is the typical structure when NOT using "Use a Local CAP Node.js Project".

**LANGUAGE**: plaintext

**CODE**:
```text
Generated project structure (root):
- webapp               # Root folder for SAPUI5 based web applications
- .npmrc               # npm registry configuration updates required for the project
- .gitignore           # Files/folders excluded from source control (e.g. node_modules)
- package-lock.json    # Locks node dependency versions
- package.json         # Main node project configuration
- README.md            # Details about generation options chosen
- ui5-local.yaml       # Supports local dev in preview mode
- ui5.yaml             # Connects to supplied data source; supports dynamic SAPUI5 version
- node_modules         # Local node modules (created/updated by `npm install`), do not commit
```

**STEP**: 6 — Note: Local CAP Node.js Project Differences

**DESCRIPTION**: If you selected "Use a Local CAP Node.js Project", the generator produces a reduced set of files and delegates preview/deploy to CAP. Differences to expect:

- package.json is shorter
- ui5.yaml and .npmrc may NOT be generated
- annotation.cds is generated instead of local annotation.xml (annotations in CDS syntax)

**LANGUAGE**: plaintext

**CODE**:
```text
CAP-specific changes:
- package.json: reduced (CAP provides preview/deploy)
- ui5.yaml: typically NOT generated
- .npmrc: typically NOT generated
- annotation.cds: generated instead of annotation.xml (CDS-based annotations)
```

**STEP**: 7 — References: Tooling, Libraries, and Troubleshooting

**DESCRIPTION**: The Fiori application generator uses open-source writers and provides guided troubleshooting. Use the links below for library docs and troubleshooting extension.

**LANGUAGE**: plaintext

**CODE**:
```text
Fiori writers (open-source):
- Fiori elements writer:
  https://github.com/SAP/open-ux-tools/tree/main/packages/fiori-elements-writer
- Fiori freestyle writer:
  https://github.com/SAP/open-ux-tools/tree/main/packages/fiori-freestyle-writer

NPM packages:
- @sap/generator-fiori:
  https://www.npmjs.com/package/@sap/generator-fiori
- @sap/ux-ui5-tooling:
  https://www.npmjs.com/package/@sap/ux-ui5-tooling

Guided Answers Extension (troubleshooting option shown by generator):
- https://github.com/SAP/guided-answers-extension

MTA deployment:
- See "Generating an MTA Deployment File" (Additional-Configuration/generating-an-mta-deployment-file-9c41152.md)
```
--------------------------------

**TITLE**: Fix "Unknown Local Certificate Authority" Errors for SAP Fiori Generator

**INTRODUCTION**: This guide shows how to make a locally issued CA certificate trusted by your OS and Node.js tooling so the SAP Fiori application generator (Yeoman / VS Code) does not reject HTTPS connections. It covers (1) locating/exporting the CA cert, (2) importing it into the OS trust store for VS Code, (3) configuring Node.js/Yeoman to use the cert via NODE_EXTRA_CA_CERTS, and (4) a last-resort option to ignore TLS verification (not recommended).

**TAGS**: fiori-tools, certificate, ssl, nodejs, vscode, yeoman, macos, windows, security

**STEP**: 1 — Save the local CA certificate file locally

**DESCRIPTION**: Export or download the Certificate Authority (CA) certificate used by your development host and save it to a local folder. Browser export steps vary by browser — choose an export method that produces a PEM/CRT file (e.g., ca.crt, ca.pem). Keep note of the saved path for later steps.

**LANGUAGE**: Text

**CODE**:
```text
Example certificate file paths:
Linux / macOS:
/home/<user>/Downloads/ca.crt
/Users/<user>/Downloads/ca.crt

Windows:
C:\Users\<user>\Downloads\ca.crt
```

**STEP**: 2 — Import the CA into the OS trust store (so VS Code trusts it)

**DESCRIPTION**: Import the downloaded CA certificate into the OS trust store so GUI apps (like VS Code) accept the certificate. Use GUI methods or the command-line examples below.

- Windows (GUI): Right-click the CA certificate file -> Install Certificate -> choose Current User or Local Machine -> place in Trusted Root Certification Authorities -> Finish.

- macOS (GUI): Right-click the CA certificate file -> Open With -> Keychain Access -> select System keychain -> import and mark as trusted.

Command-line alternatives (require admin privileges):

**LANGUAGE**: PowerShell

**CODE**:
```powershell
# Windows: import certificate into Local Machine Trusted Root (run PowerShell as Administrator)
Import-Certificate -FilePath "C:\path\to\ca.crt" -CertStoreLocation "Cert:\LocalMachine\Root"
```

**LANGUAGE**: bash

**CODE**:
```bash
# macOS: add certificate as a trusted root to the System keychain (requires sudo)
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /path/to/ca.crt
```

**STEP**: 3 — Configure Node/Yeoman to use the CA cert (NODE_EXTRA_CA_CERTS)

**DESCRIPTION**: For command-line usage (Yeoman generators, npm, Node.js CLI) set NODE_EXTRA_CA_CERTS to the certificate file path so Node will trust the CA. You can set it temporarily for a session or persistently.

- macOS / Linux (temporary for session):
  - Run the export command before starting generators.

**LANGUAGE**: bash

**CODE**:
```bash
export NODE_EXTRA_CA_CERTS=path/to/certificate/file
```

- macOS / Linux (persistent): add the export line to ~/.bashrc, ~/.zshrc, or your shell profile.

- Windows (temporary for current PowerShell session):
  - Use the environment variable in the session.

**LANGUAGE**: PowerShell

**CODE**:
```powershell
# Temporary (PowerShell session)
$env:NODE_EXTRA_CA_CERTS = "C:\path\to\ca.crt"
```

- Windows (persist for current user):
  - Use setx (no admin required for user-level).

**LANGUAGE**: Windows CMD / setx

**CODE**:
```cmd
# Persist for current user
setx NODE_EXTRA_CA_CERTS "C:\path\to\ca.crt"
```

- Windows (persist system-wide):
  - Run elevated (Administrator) and use /M to set system environment variable.

**LANGUAGE**: Windows CMD / setx

**CODE**:
```cmd
# Persist system-wide (requires Administrator)
setx NODE_EXTRA_CA_CERTS "C:\path\to\ca.crt" /M
```

Notes:
- After creating persistent environment variables you may need to restart your terminal / sign out and sign in for changes to take effect.
- Verify in Node: console.log(process.env.NODE_EXTRA_CA_CERTS) or run your Yeoman generator after setting the variable.

**STEP**: 4 — (Not recommended) Temporarily ignore TLS verification

**DESCRIPTION**: If the certificate is invalid (expired, wrong host, or other issues) and you need to bypass TLS checks temporarily (dangerous), you can disable Node TLS verification for the process. This is not recommended except as a last resort for local development troubleshooting.

**LANGUAGE**: bash

**CODE**:
```bash
# Linux / macOS temporary (use only for debugging)
NODE_TLS_REJECT_UNAUTHORIZED=0 yeoman-command-or-node-script
```

**LANGUAGE**: PowerShell

**CODE**:
```powershell
# PowerShell session temporary
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
# run your generator or node script in same session
```

**STEP**: 5 — Verification and troubleshooting

**DESCRIPTION**: After importing the CA and/or setting NODE_EXTRA_CA_CERTS:
- Restart VS Code (if you imported to OS trust store) so it picks up the new trust settings.
- In a terminal, check that NODE_EXTRA_CA_CERTS points to your file:
  - bash: echo $NODE_EXTRA_CA_CERTS
  - PowerShell: echo $env:NODE_EXTRA_CA_CERTS
- Run the Yeoman generator / Fiori generator again. If errors persist, confirm:
  - The certificate file is a valid PEM/CRT containing the CA certificate.
  - You imported into the correct store (System/LocalMachine Root for system-wide trust).
  - You set NODE_EXTRA_CA_CERTS to the exact file path and restarted the shell/VS Code if necessary.

**LANGUAGE**: Text

**CODE**:
```text
Troubleshooting checklist:
- Confirm file format: PEM/CRT (base64 encoded "BEGIN CERTIFICATE")
- Ensure the path used in NODE_EXTRA_CA_CERTS is exact and accessible
- For Windows system-wide changes, restart or log out/in after setx / set environment change
- For macOS, ensure you used the System keychain for "trusted root" if you want system-wide trust
```
--------------------------------

**TITLE**: ABAP Development Tools (ADT) Integration with SAP Fiori Tools

**INTRODUCTION**: Configure and use the ADT integration to launch the SAP Fiori Generator from ADT (Eclipse) and to open or download SAP Fiori applications in your IDE (VS Code or SAP Business Application Studio). This guide details the one-time ADT setup per system, launching behavior, and the direct-download command for deployed ADT applications.

**TAGS**: ABAP, ADT, SAP Fiori, SAP Fiori tools, VS Code, Business Application Studio, SAPUI5, generator, integration

STEP: 1 — Configure ADT to launch target IDE

DESCRIPTION:
- Perform a one-time configuration in ADT for each ABAP system you want to integrate.
- This enables the "Create Fiori Project" button on service details and pre-populates the SAP Fiori Generator with the selected system and main entity.

LANGUAGE: UI steps

CODE:
```text
1. In Eclipse ADT, choose the target ABAP system in the Project/Systems view.
2. Right-click the system and select: Properties.
3. Navigate to: ABAP Development > IDE Configuration.
4. Check: Configure the target IDE
5. Choose target IDE:
   - SAP Business Application Studio OR
   - Visual Studio Code (VS Code)
6. Save the configuration.
```

STEP: 2 — Launch SAP Fiori Generator from ADT

DESCRIPTION:
- Use the new Create Fiori Project button shown alongside service details after configuration.
- When launched from ADT:
  - Data source selection in the SAP Fiori Generator is skipped (ADT already provided it).
  - The main entity for templates is pre-selected based on your ADT selection.
- If the service was previously deployed using Quick Fiori Application in ADT, Create Fiori Project downloads that deployed application into your workspace and upgrades it to support SAP Fiori tools capabilities.

LANGUAGE: UI steps

CODE:
```text
- In ADT, open the service details for your chosen OData/service.
- Click: Create Fiori Project (button displayed after IDE configuration).
- The IDE (VS Code or Business Application Studio) will open and start the SAP Fiori Generator:
  - Data source is already set.
  - Main entity is pre-selected for templates.
- If the service was deployed via ADT Quick Fiori Application, the deployed app is downloaded and updated for SAP Fiori tools.
```

STEP: 3 — Download ADT-deployed application directly from IDE

DESCRIPTION:
- Run the built-in command in your IDE to list and download SAP Fiori applications that were deployed from ADT without launching ADT.
- Select the system from a dropdown and choose the application to download.

LANGUAGE: Plain text command

CODE:
```text
Command to run in IDE command palette:
Fiori: Download ADT Deployed App from SAPUI5 ABAP Repository
```

STEP: 4 — VS Code system URL and matching rules (Important Note)

DESCRIPTION:
- Ensure the ABAP system saved in VS Code uses the same system URL as the ADT configuration to enable automatic matching when launching from ADT.
- To verify or select the saved system:
  - Open the SAP Fiori view in VS Code from the left activity toolbar.
  - Click the SAP Fiori icon (Wrench/Pencil icon) on the activity toolbar.
  - Click: SAP Systems
- If the saved system cannot be matched after launching from ADT:
  - You may choose any of the existing systems you have already saved.
- If there are existing SAP Fiori projects in your workspace that match the system and main entity:
  - You will be prompted to either choose an existing matching project or create a new one with the SAP Fiori Generator.

LANGUAGE: UI steps + image path

CODE:
```text
Verify saved system in VS Code:
1. Click SAP Fiori (Wrench/Pencil icon) on the left activity toolbar.
   (Image asset reference: images/SAP_Fiori_tools_Wrench_Pencil_9d6b0f8.png)
2. Click: SAP Systems
3. Confirm the system URL matches the ADT system URL used in Eclipse.

Behavior if no match:
- You can manually pick one of your saved systems.
- If matching SAP Fiori projects exist in workspace (same system + main entity), choose:
  - Reuse existing project OR
  - Create a new project via SAP Fiori Generator
```
--------------------------------

**TITLE**: SAP Fiori Tools — Project Capabilities & Command Reference

**INTRODUCTION**: Quick reference of VS Code command IDs, terminal commands, file paths, and development actions provided by SAP Fiori tools. Use this when automating tasks, creating scripts, or invoking extension commands programmatically during development of SAP Fiori / SAPUI5 apps (including adaptations and CAP backends).

**TAGS**: sap, fiori-tools, ui5, sapui5, commands, npm, mockserver, annotations, adaptation, deploy, lint, validate, typescript, javascript

**STEP**: Open Application Info

**DESCRIPTION**: Open the Application Information page (shows project-relevant commands and features). Use VS Code Command Palette (CMD/CTRL + Shift + P) and execute the "Fiori: Open Application Info" command.

**LANGUAGE**: Text

**CODE**:
```text
Open Command Palette: [CMD/CTRL] + [Shift] + [P]
Execute command: Fiori: Open Application Info
```

**STEP**: Build, Dist, and Deploy (core commands)

**DESCRIPTION**: Build the app to the dist folder, deploy using the UI5 deploy config (ui5-deploy.yaml), run test deploy, and undeploy. Use npm scripts or extension command IDs for automated workflows.

**LANGUAGE**: bash

**CODE**:
```bash
# Build the application -> output stored in the 'dist' folder
npm run build

# Deploy according to ui5-deploy.yaml (UI/extension command)
sap.ux.appGenerator.launchDeploy

# Add deploy configuration (VS Code command ID)
sap.ux.appGenerator.launchDeployConfig

# Start deployment in test mode
npm run deploy-test

# Remove a deployed artifact
npm run undeploy
```

**STEP**: Preview & Virtual Endpoints

**DESCRIPTION**: Convert configuration for preview with virtual endpoints, preview the application, and add mockserver configuration for local virtual OData endpoints.

**LANGUAGE**: bash / text

**CODE**:
```bash
# Convert config to preview the application with virtual endpoints (VS Code command ID)
sap.ux.applicationModeler.convertPreview

# Choose start scripts to run the application preview (VS Code command ID)
sap.ux.pageEditor.previewExternal

# Add configuration for mockserver middleware (use npx to add files)
npx --yes @sap-ux/create@latest add mockserver-config
```

**STEP**: Mock Data & Data Editor

**DESCRIPTION**: Open the Data Editor in the toolset to create and maintain mockdata used by the mockserver or local testing.

**LANGUAGE**: text

**CODE**:
```text
# Open Data Editor (start editor for maintaining mock data)
sap.ux.dataEditor.open
```

**STEP**: Service & Annotation Management

**DESCRIPTION**: Inspect and manage OData service metadata and XML annotations. Sync metadata.xml with backend, open annotation file manager to choose or create local XML annotation files, and open service files to review annotations for copying to local annotation files.

**LANGUAGE**: text

**CODE**:
```text
# Check service with annotation (open file)
sap.ux.serviceModeler.openFile

# Open Service Manager (sync metadata.xml with backend)
sap.ux.serviceModeler.openServiceMgr

# Open Annotation File Manager (choose/create local XML annotation files)
sap.ux.serviceModeler.openAnnotationFileMgr

# Important file: metadata.xml (sync with back end)
# Local annotation files: XML files used by the application or adaptation project
```

**STEP**: Adaptation Projects (ADP) — annotation, inbound changes, components, deployment

**DESCRIPTION**: Commands for working with adaptation projects: add local annotation files, add SAPUI5 component usages, add inbound changes, open adaptation editor and deployment wizard, replace OData service in an adaptation project.

**LANGUAGE**: text

**CODE**:
```text
# Add a local annotation file to the adaptation project
sap.ux.adp.addAnnotationFile

# Add SAPUI5 component usages to the adaptation project
sap.ux.adp.addSAPUI5ComponentUsages

# Add an inbound change to the adaptation project
sap.ux.adp.changeInbound

# Open the Adaptation Editor (create adaptations)
sap.ux.adp.openAdaptationEditor

# Open the Deployment Wizard to deploy the adaptation project
sap.ux.adp.openDeploymentWizard

# Replace the OData service of the adaptation project
sap.ux.adp.replaceODataService
```

**STEP**: Variants & Configuration Management

**DESCRIPTION**: Add and run configurations for variants creation and manage variants preview workflows.

**LANGUAGE**: text / bash

**CODE**:
```text
# Add Configuration for Variants Creation
sap.ux.applicationModeler.addVariantsConfig

# Run the configuration for variants creation (npm script)
npm run start-variants-management

# Add Configuration for Variants Creation (UI extension)
sap.ux.applicationModeler.addVariantsConfig
```

**STEP**: Linting, Validation, Documentation, and Guided Development

**DESCRIPTION**: Run static code analysis using the UI5 linter, validate the project and generate report, show documentation for manifest/UI5 flexibility properties, open guided development helpers.

**LANGUAGE**: text / bash

**CODE**:
```bash
# Check node module dependencies for newer versions
npm outdated

# Run UI5 linter (VS Code command ID)
sap.ux.applicationModeler.runUI5Linter

# Validate the project and generate a report (VS Code command ID)
sap.ux.applicationModeler.validate

# Show documentation of available manifest and UI5 flexibility properties (VS Code command ID)
sap.ux.applicationModeler.showDocu

# Open Guided Development to help solve common tasks (VS Code command ID)
sap.ux.help.openGuidedDevelopmentFromExplorer
```

**STEP**: Project Archiving & Environment Checks

**DESCRIPTION**: Create a zip archive of the project excluding node_modules for sharing (useful for support/troubleshooting).

**LANGUAGE**: text

**CODE**:
```text
# Zip the project excluding the node_modules folder for sharing
sap.ux.environmentcheck.archiveProject

# Note: node_modules (folder to exclude)
```

**STEP**: Page Map & Navigation Tools

**DESCRIPTION**: Open the page map to inspect application pages and navigation paths; useful for programmatic analysis of routing/targets.

**LANGUAGE**: text

**CODE**:
```text
# Open the page map that shows application pages and navigation paths
sap.ux.pageMap.showMap
```

**STEP**: Project Preview & External Integration

**DESCRIPTION**: Preview the app externally and use commands to convert preview settings (already referenced above). Also useful to automate preview selection in CI or local scripts.

**LANGUAGE**: text

**CODE**:
```text
# Preview application (choose from start scripts)
sap.ux.pageEditor.previewExternal
```

**STEP**: Scripting Languages & TypeScript Support

**DESCRIPTION**: SAP Fiori apps are based on SAPUI5. SAP Fiori tools supports JavaScript and TypeScript development. For TypeScript support and UI5 types, reference the UI5 TypeScript project.

**LANGUAGE**: text / url

**CODE**:
```text
# UI5 and TypeScript reference
https://sap.github.io/ui5-typescript
```

**STEP**: Usability — Keyboard Navigation and High Contrast

**DESCRIPTION**: Supported tooling features are keyboard navigable and support high contrast themes. Use arrow keys to navigate within sections, Tab/Shift+Tab to move focus, and Enter to select. For high contrast, change editor theme in Preferences > Color Themes (VS Code / Business Application Studio).

**LANGUAGE**: text

**CODE**:
```text
# Keyboard navigation keys:
# - Arrow keys: navigate within sections
# - Tab: navigate to next section/control
# - Shift+Tab: navigate back
# - Enter: make selection

# Switch to high contrast:
# Preferences > Color Themes (VS Code or SAP Business Application Studio)
```
--------------------------------

**TITLE**: Fiori Tools — Command Palette Reference (VS Code)

**INTRODUCTION**: This reference lists all Fiori Tools commands available in the VS Code Command Palette. Each entry is action-oriented for automation or code-generation tools: how to invoke the command, what it does, and any important file paths or documentation links to consult.

**TAGS**: fiori-tools, vscode, command-palette, sap-fiori, sapui5, deployment, preview, annotation, generator, telemetry

STEP: 1 — Add Configuration for Variants Creation
DESCRIPTION: Open the Command Palette and run the command to add configuration enabling variants creation for the application.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Add Configuration for Variants Creation
```

STEP: 2 — Add Deployment Configuration
DESCRIPTION: Add or update the deployment configuration for the application (used by deployment commands and CI workflows).
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Add Deployment Configuration
```

STEP: 3 — Add Reference to SAP Fiori Apps Reusable Libraries
DESCRIPTION: Insert a reference to another project/library so the current app can reuse components. See Reuse Library Support for additional context.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Add Reference to SAP Fiori Apps Reusable Libraries
```
Note: See documentation: ../Project-Functions/reuse-library-support-6e99fbb.md

STEP: 4 — Add SAP System
DESCRIPTION: Create and save a new SAP system connection in VS Code (ABAP On-Premises or ABAP Environment with a service key). The connection is stored in your workspace/user system list.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Add SAP System
```
Note: See Managing SAP System Connections: ../Project-Functions/managing-sap-system-connections-78a82b6.md

STEP: 5 — Add SAP Fiori Launchpad Configuration
DESCRIPTION: Add the configuration files necessary for the app to run on SAP Fiori launchpad after deployment (manifest/site/FLP configuration).
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Add SAP Fiori Launchpad Configuration
```

STEP: 6 — Add SAP Fiori Launchpad Embedded Configuration
DESCRIPTION: Create and save configuration that allows previewing an app in the target environment without redeploying. Useful for FLP embedded preview and local testing.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Add SAP Fiori Launchpad Embedded Configuration
```
Note: See Preview an Application on External SAP Fiori Launchpad: ../Previewing-an-Application/preview-an-application-on-external-sap-fiori-launchpad-c789692.md

STEP: 7 — Archive Project
DESCRIPTION: Archive the current project (packaging/archive workflow).
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Archive Project
```

STEP: 8 — Change Telemetry Settings
DESCRIPTION: Toggle whether telemetry data for SAP Fiori tools is sent to SAP. Use this to enable/disable usage reporting.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Change Telemetry Settings
```
Note: See Telemetry: telemetry-837c231.md

STEP: 9 — Change the Minimum SAPUI5 Version
DESCRIPTION: Update the application's required minimum SAPUI5 version (modifies manifest and configuration where applicable).
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Change the Minimum SAPUI5 Version
```

STEP: 10 — Delete Application from CAP Project
DESCRIPTION: Remove an application from a multi-application CAP project. This deletes app-specific artifacts and updates project configuration.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Delete Application from CAP Project
```
Note: See Deleting an Application in CAP Project: ../Project-Functions/deleting-an-application-in-cap-project-709f838.md

STEP: 11 — Deploy Application
DESCRIPTION: Deploy the application using the deployment configuration (default stored in ui5-deploy.yaml). Run this after configuring deployment settings or during CI/CD.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Deploy Application
```
Note: Deployment configuration file: ui5-deploy.yaml

STEP: 12 — Enable App-to-App Navigation Preview
DESCRIPTION: Create and save configuration required to preview navigation between apps in the same workspace (app-to-app navigation testing).
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Enable App-to-App Navigation Preview
```
Note: See App-to-App Navigation Preview: ../Previewing-an-Application/app-to-app-navigation-preview-543675f.md

STEP: 13 — Import SAP System
DESCRIPTION: Import and save a new ABAP On-Premise SAP system connection into VS Code.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Import SAP System
```
Note: See Managing SAP System Connections: ../Project-Functions/managing-sap-system-connections-78a82b6.md

STEP: 14 — Migrate Project for use in SAP Fiori Tools
DESCRIPTION: Migrate SAP Fiori projects from other tooling (e.g., SAP Web IDE) into VS Code or Business Application Studio. This updates project structure and metadata required by Fiori Tools.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Migrate Project for use in SAP Fiori Tools
```
Note: See Migration: migration-70d41f3.md

STEP: 15 — Open Annotation File Manager
DESCRIPTION: Launch the Annotation File Manager to create, edit, and manage OData annotation files for your services.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open Annotation File Manager
```

STEP: 16 — Open Application Generator
DESCRIPTION: Start the SAP Fiori application generator to scaffold a new Fiori application using guided prompts and templates.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open Application Generator
```
Note: See Generating an Application: ../Generating-an-Application/generating-an-application-db44d45.md

STEP: 17 — Open Application Info
DESCRIPTION: Open the Application Information page to view and edit app metadata (IDs, titles, descriptions, tags).
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open Application Info
```
Note: See Application Information: ../Project-Functions/application-information-c3e0989.md

STEP: 18 — Open CF Application Router Generator
DESCRIPTION: Generate Cloud Foundry app router configuration for MTA deployment scenarios. Adds app router artifacts used by CF deployment.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open CF Application Router Generator
```
Note: See Generating an MTA Deployment File: ../Generating-an-Application/Additional-Configuration/generating-an-mta-deployment-file-9c41152.md

STEP: 19 — Open Data Editor
DESCRIPTION: Launch the Data Editor to manage mock or local test data bound to your Fiori app.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open Data Editor
```

STEP: 20 — Open Environment Check
DESCRIPTION: Run checks on the development environment and generate reports to identify missing dependencies or setup problems.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open Environment Check
```

STEP: 21 — Open Guided Development
DESCRIPTION: Launch Guided Development to apply feature guides that generate and insert code snippets based on selected parameters to implement or update features.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open Guided Development
```
Note: See Use Feature Guides: ../Developing-an-Application/use-feature-guides-0c9e518.md

STEP: 22 — Open Guided Development to the Side
DESCRIPTION: Launch Guided Development in a side editor pane to continue working in the main editor while applying feature guides.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open Guided Development to the Side
```

STEP: 23 — Open Reusable Library Generator
DESCRIPTION: Launch the generator to create or update a reusable library for SAP Fiori apps (components, controls, modules).
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open Reusable Library Generator
```

STEP: 24 — Open Run Configurations
DESCRIPTION: Open the Run Configuration editor to define preview/run scripts and options for the project (local preview, target environments).
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open Run Configurations
```
Note: See Use Run Control: ../Previewing-an-Application/use-run-control-09171c8.md

STEP: 25 — Open Service Manager
DESCRIPTION: Launch the Service Manager to view and manage OData services, destinations, and bindings used by your app.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open Service Manager
```

STEP: 26 — Open Service Modeler
DESCRIPTION: Launch the Service Modeler to visualize OData service metadata and annotations for model-driven development.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open Service Modeler
```
Note: See Viewing Service Metadata: ../Project-Functions/viewing-service-metadata-e369c2c.md

STEP: 27 — Open Service Modeler to the Side
DESCRIPTION: Open the Service Modeler in a side editor pane to inspect service models while editing application files.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Open Service Modeler to the Side
```

STEP: 28 — Preview Application
DESCRIPTION: Launch the application preview flow and select a start script (from package.json or configured run profiles) to run the app locally or in an emulated environment.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Preview Application
```

STEP: 29 — Refresh Application Modeler View
DESCRIPTION: Refresh the Application Modeler to reflect recent changes in project structure, pages, and configuration.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Refresh Application Modeler View
```

STEP: 30 — Restart XML Annotation Language Server
DESCRIPTION: Restart the XML annotation language server if it has failed or becomes unresponsive (helps recover validation and editing features for XML-based annotations).
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Restart XML Annotation Language Server
```

STEP: 31 — Run UI5 Linter
DESCRIPTION: Run static code analysis using the UI5 linter to validate SAPUI5 best practices and detect common issues. Use in pre-commit, CI, or local validation workflows.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Run UI5 Linter
```
Note: UI5 linter project: https://github.com/UI5/linter

STEP: 32 — Show Output Channel
DESCRIPTION: Open the Output channel specific to the Application Modeler and Fiori Tools to inspect logs, errors, and diagnostic messages produced by extensions.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Show Output Channel
```

STEP: 33 — Show Page Editor
DESCRIPTION: Open the Page Editor to view an outline of configurable elements on the selected page and edit page-level configuration.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Show Page Editor
```
Note: See Configure Page Elements: ../Developing-an-Application/configure-page-elements-047507c.md

STEP: 34 — Show Page Map
DESCRIPTION: Open the Page Map to visualize application pages and navigation paths; useful for defining and verifying app routing and structure.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Show Page Map
```
Note: See Define Application Structure: ../Developing-an-Application/define-application-structure-bae38e6.md

STEP: 35 — Show Release Notes
DESCRIPTION: Display the SAP Fiori Tools release notes to review changes and updates in the extension.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Show Release Notes
```

STEP: 36 — Show SAP System Details
DESCRIPTION: Open the detailed view for a saved SAP system connection to inspect credentials, destinations, and metadata.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Show SAP System Details
```

STEP: 37 — Fiori tools AI: Show Fiori Tools Joule
DESCRIPTION: Launch Joule, the SAP Fiori Tools AI assistant in SAP Business Application Studio. Requires a subscription to SAP Build Code to use the assistant.
LANGUAGE: Command (VS Code / BAS)
CODE:
```text
Fiori tools AI: Show Fiori Tools Joule
```
Note: Requires SAP Build Code subscription.

STEP: 38 — Validate Project
DESCRIPTION: Run project validation checks to ensure the project meets Fiori Tools requirements and detect configuration or consistency problems.
LANGUAGE: Command (VS Code)
CODE:
```text
Fiori: Validate Project
```


--------------------------------

**TITLE**: Getting Started with SAP Fiori Tools

**INTRODUCTION**: Quick reference for developers to install, configure, and use SAP Fiori tools extensions in SAP Business Application Studio or Visual Studio Code. Action-oriented checklist of available extensions, features, supported targets, and where to find deeper documentation and troubleshooting.

**TAGS**: fiori-tools, SAPUI5, SAP Fiori, SAP BTP, S/4HANA, VSCode, Business Application Studio, annotations, OData

**STEP**: 1 — Install SAP Fiori tools in your IDE

**DESCRIPTION**: Install or enable SAP Fiori tools in the IDE you use. Choose either SAP Business Application Studio (recommended for cloud dev) or Visual Studio Code. Follow the linked IDE pages for step-by-step installation and workspace setup.

**LANGUAGE**: Markdown

**CODE**:
```markdown
SAP Business Application Studio install doc:
- sap-business-application-studio-b011040.md

Visual Studio Code install doc:
- visual-studio-code-17efa21.md#loio17efa217f7f34a9eba53d7b209ca4280
```

**STEP**: 2 — Understand the SAP Fiori tools extension set

**DESCRIPTION**: Review the extensions that compose SAP Fiori tools. Use the listed docs for each extension to perform tasks such as generating applications, visualizing navigation, and maintaining annotations.

**LANGUAGE**: Markdown

**CODE**:
```markdown
SAP Fiori tools includes these extensions and features:

- Application Wizard
  - Doc: ../Generating-an-Application/SAP-Fiori-Elements/sap-fiori-elements-1488469.md
  - Purpose: Wizard-style generator for SAP Fiori elements and freestyle SAPUI5 templates.

- SAP Fiori Tools – Application Modeler
  - Doc: ../Developing-an-Application/developing-an-application-a9c0043.md
  - Purpose: Visualize application pages, navigation, and service entities; add/delete pages and navigation; jump to editing tools.
  - Subfeatures:
    - Page Editor: ../Developing-an-Application/configure-page-elements-047507c.md
    - Page Map: ../Developing-an-Application/define-application-structure-bae38e6.md

- Guided Development
  - Doc: ../Developing-an-Application/use-feature-guides-0c9e518.md
  - Purpose: Step-by-step How-To guides and tutorials integrated into the project.

- Service Modeler
  - Doc: ../Project-Functions/viewing-service-metadata-e369c2c.md
  - Purpose: Browse and visualize OData service metadata: entities, properties, associations.

- Maintaining Annotations with Language Server
  - Doc: ../Developing-an-Application/maintaining-annotations-with-language-server-6fc93f8.md
  - Features: Code completion, micro-snippets, diagnostics, internationalization support.

- SAP Fiori tools Environment Check
  - Doc: ../Project-Functions/environment-check-75390cf.md
  - Purpose: Run checks against local/cloud environment and configured SAP BTP destinations.
```

**STEP**: 3 — Visual references and artifacts

**DESCRIPTION**: Keep reference images and assets packaged with your documentation or project for visual guidance. The product doc includes a flow diagram image to reference user flows.

**LANGUAGE**: plaintext

**CODE**:
```text
Image referenced in documentation:
- images/FIORI_TOOL_USER_FLOW_WFREESTYLE_3ad8363.png
```

**STEP**: 4 — Supported deployment landscapes and data sources

**DESCRIPTION**: Target these deployment landscapes when planning or generating applications. For supported data sources consult the Data Source doc.

**LANGUAGE**: Markdown

**CODE**:
```markdown
Supported Deployment Landscapes:
- SAP S/4HANA
- SAP S/4HANA Cloud
- SAP BTP (ABAP and Cloud Foundry Environments)

Data sources documentation:
- ../Generating-an-Application/SAP-Fiori-Elements/data-source-9906181.md
```

**STEP**: 5 — Language Server capabilities (annotations)

**DESCRIPTION**: Use the Language Server to author and maintain annotation files with IDE support. It provides editor features to speed up annotation maintenance and maintain consistency.

**LANGUAGE**: Markdown

**CODE**:
```markdown
Maintaining Annotations with Language Server:
- Doc: ../Developing-an-Application/maintaining-annotations-with-language-server-6fc93f8.md
- Key features to use:
  - Code completion (annotations and vocabulary)
  - Micro-snippets for common annotation patterns
  - Diagnostics (validation and error messages)
  - Internationalization support for annotation texts
```

**STEP**: 6 — Use the Application Modeler (Page Editor & Page Map)

**DESCRIPTION**: Use the Application Modeler to visualize and edit the application's page structure and navigation. Jump between visual editing and source files using the provided editor links.

**LANGUAGE**: Markdown

**CODE**:
```markdown
Application Modeler:
- Doc: ../Developing-an-Application/developing-an-application-a9c0043.md
- Page Editor: ../Developing-an-Application/configure-page-elements-047507c.md
- Page Map: ../Developing-an-Application/define-application-structure-bae38e6.md
```

**STEP**: 7 — Run environment checks

**DESCRIPTION**: Validate your development environment and SAP BTP destinations before generating or deploying applications. Use the Environment Check extension to surface missing configuration or incompatible settings.

**LANGUAGE**: Markdown

**CODE**:
```markdown
Environment Check:
- Doc: ../Project-Functions/environment-check-75390cf.md
- Purpose: Run checks against local environment and configured SAP BTP destinations
```

**STEP**: 8 — Troubleshooting and support process

**DESCRIPTION**: If you encounter issues that require SAP support, create an incident in the SAP Support Portal and reference the component CA-UX-IDE.

**LANGUAGE**: plaintext

**CODE**:
```text
Support escalation:
- Create an SAP Support Portal incident for component: CA-UX-IDE
- Reference page: Report Issues and Security (report-issues-and-security-7c755a5.md)
```

**STEP**: 9 — Compatibility caution

**DESCRIPTION**: Ensure SAPUI5 runtime version in your project and target systems is supported. Minimum SAPUI5 version required is 1.65.

**LANGUAGE**: plaintext

**CODE**:
```text
Caution:
- SAP Fiori tools supports SAPUI5 applications with a minimum SAPUI5 version of 1.65 or higher.
```
--------------------------------

**TITLE**: Importing an SAP Fiori Application from the SAPUI5 ABAP Repository

**INTRODUCTION**: This guide explains how to import an existing SAP Fiori application from an SAPUI5 ABAP repository into SAP Business Application Studio (BAS) or Visual Studio Code (VS Code). It covers preparing workspace folders, exporting the BSP application from the ABAP back-end, extracting files, creating required metadata, migrating the project to Fiori tools, and post-import cleanup tips for UI5 CLI builds.

**TAGS**: fiori-tools, sapui5, abap, migrate, restore, BAS, VSCode, UI5

**STEP**: 1 — Prepare workspace folders

**DESCRIPTION**: Create the required folder structure in your BAS or VS Code workspace. The top-level folder is a container for the restored app; the webapp subfolder will contain the extracted application files (unzipped download).

- Folder names (exact):
  - restore-from-exported
  - restore-from-exported/webapp

Create them using your environment UI or a terminal.

**LANGUAGE**: text

**CODE**:
```text
# create folders (example for Unix-like shells)
mkdir -p restore-from-exported/webapp

# verify
ls -la restore-from-exported
ls -la restore-from-exported/webapp
```

**STEP**: 2 — Export the application from the SAPUI5 ABAP repository

**DESCRIPTION**: In the ABAP system, run the repository export report to download the application as a zip. Follow the ABAP UI steps precisely.

- Log into your SAPUI5 ABAP back-end system.
- Open transaction SE80.
- Run report /UI5/UI5_REPOSITORY_LOAD.
- Enter the SAPUI5 application name and click Download.
- Choose an empty folder as the download target.
- From the resulting view click "Click here to Download" to obtain a .zip file.

**LANGUAGE**: text

**CODE**:
```text
# ABAP/UI steps (no CLI):
# 1. Go to transaction SE80
# 2. Run report: /UI5/UI5_REPOSITORY_LOAD
# 3. Provide application name -> Click Download
# 4. Choose an empty folder on the ABAP server -> Download .zip via "Click here to Download"
```

**STEP**: 3 — Extract the downloaded zip into the workspace and verify manifest

**DESCRIPTION**: Unzip the downloaded archive into restore-from-exported/webapp. Confirm the manifest.json is at restore-from-exported/webapp/manifest.json (root of webapp).

**LANGUAGE**: text

**CODE**:
```text
# example unzip into workspace (adjust path to your downloaded zip)
unzip path/to/downloaded-app.zip -d restore-from-exported/webapp

# verify manifest is present
ls -la restore-from-exported/webapp/manifest.json
```

**STEP**: 4 — Create package.json matching application id in manifest

**DESCRIPTION**: Create a package.json file inside restore-from-exported. The name value must match the application id (sap.app/id) found in manifest.json.

- Open restore-from-exported/manifest.json and locate sap.app.id to get the correct application name/namespace.
- Create restore-from-exported/package.json with the "name" field set to that id.

Preserve the exact JSON structure shown below.

**LANGUAGE**: JSON

**CODE**:
```json
{
   "name": "sap.fe.demo.awesomeapp",
}
```

**STEP**: 5 — Verify application id in manifest.json (example)

**DESCRIPTION**: Example snippet showing where to find the app id inside manifest.json. Use this value for package.json "name".

**LANGUAGE**: JSON

**CODE**:
```json
{
   "sap.app": {
      "id": "sap.fe.demo.awesomeapp",
      ..
```

**STEP**: 6 — Run Fiori Tools migration in BAS or VS Code

**DESCRIPTION**: Start the Fiori tools migration command to convert the restored app to be compatible with SAP Fiori tools.

- Open SAP Business Application Studio or VS Code workspace (the folder containing restore-from-exported must be part of the workspace).
- Run the command: "Fiori: Migrate Project for use in Fiori tools" (via Command Palette).
- The migration command should detect the project under restore-from-exported and list it.
- Choose the appropriate migration options when prompted and complete the migration.

**LANGUAGE**: text

**CODE**:
```text
# In VS Code or BAS:
# 1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
# 2. Run: Fiori: Migrate Project for use in Fiori tools
# 3. Select the project at: restore-from-exported
# 4. Follow prompts to complete migration
```

**STEP**: 7 — Post-import cleanup and developer tips

**DESCRIPTION**: Notes and required cleanup before running UI5 CLI build and for readability of code:

- The BSP application you downloaded is typically minified. Use this import only if the app is not available in source control.
- The -dbg.js files (for example Component-dbg.js) contain original un-minified code. To make code human-readable, copy Component-dbg.js -> Component.js (or corresponding files).
- Before running UI5 CLI build, remove these files to avoid duplicates in dist: *-dbg.js, *-preload.js, and *.js.map. If not removed they are recreated in the dist folder.

Examples for copying and removing files:

**LANGUAGE**: text

**CODE**:
```text
# Example: copy dbg to non-dbg for readability
cp restore-from-exported/webapp/Component-dbg.js restore-from-exported/webapp/Component.js

# Remove debug/preload/map files before UI5 CLI build
find restore-from-exported/webapp -type f \( -name '*-dbg.js' -o -name '*-preload.js' -o -name '*.js.map' \) -delete

# Then run UI5 CLI build (example)
# cd restore-from-exported
# ui5 build --include-task=generateManifestBundle
```

**STEP**: 8 — Confirmation

**DESCRIPTION**: After migration and cleanup, the project under restore-from-exported should be compatible with SAP Fiori tools and ready for development or further refactoring into source control.

**LANGUAGE**: text

**CODE**:
```text
# Verify:
# - manifest.json exists at restore-from-exported/webapp/manifest.json
# - package.json exists at restore-from-exported/package.json with matching name
# - project migrated successfully via Fiori tools
# - debug/preload/map files removed before ui5 build
```
--------------------------------

**TITLE**: Installation for fiori-tools

**INTRODUCTION**: This page points to IDE-specific installation instructions for fiori-tools. Use the appropriate step below for your development environment (SAP Business Application Studio or Visual Studio Code) to complete installation and setup.

**TAGS**: fiori-tools, installation, SAP, Business Application Studio, Visual Studio Code, IDE

**STEP**: 1 — SAP Business Application Studio

**DESCRIPTION**: Open and follow the installation instructions for SAP Business Application Studio in the referenced document. This contains all steps required to install and configure fiori-tools in the SAP Business Application Studio environment.

**LANGUAGE**: Markdown

**CODE**:
```markdown
[SAP Business Application Studio](sap-business-application-studio-b011040.md)
```

**STEP**: 2 — Visual Studio Code

**DESCRIPTION**: Open and follow the installation instructions for Visual Studio Code in the referenced document and anchor. This contains the VS Code-specific steps (extensions, configuration, and commands) required to install and configure fiori-tools.

**LANGUAGE**: Markdown

**CODE**:
```markdown
[Visual Studio Code](visual-studio-code-17efa21.md#loio17efa217f7f34a9eba53d7b209ca4280)
```
--------------------------------

**TITLE**: Migrate SAP Fiori projects to SAP Fiori tools (VS Code / Business Application Studio)

**INTRODUCTION**: Practical, action-oriented instructions to migrate SAP Fiori projects (from SAP Web IDE or file export) to Visual Studio Code or SAP Business Application Studio using the SAP Fiori tools migration utility. Covers prerequisites, exact migration steps, fields to fill, files changed by migration, verification steps, and post-migration actions.

**TAGS**: fiori-tools, migration, sapui5, vscode, business-application-studio, web-ide, ui5-tooling, adaptation

STEP: Prerequisites
DESCRIPTION: Verify environment and project readiness before running migration.
- Install the latest SAP Fiori tools extensions in your IDE (VS Code / SAP Business Application Studio).
- Ensure your project runs correctly in SAP Web IDE and is one of the supported types: SAP Fiori elements V2, SAP Fiori elements V4, freestyle SAPUI5, or Extension project.
- Ensure the project contains a main data source defined in:
LANGUAGE: Text
CODE:
```text
manifest.appdescr_variant
# The project must have the main data source specified in this file.
```

STEP: Recommendations (IDE-specific)
DESCRIPTION: Prepare IDE-specific connectivity and version info used during migration.
- SAP Business Application Studio: define a destination that reflects the original target system. If not defined, live-data preview will fail.
- VS Code: know the target system hostname and/or client to enter into the migration dialog.
- Use a destination for the front-end server hosting SAPUI5 libraries (do not point migration directly to back-end OData server).
- Keep the migrated project under version control.
LANGUAGE: Text
CODE:
```text
# SAP Business Application Studio:
# - Ensure a destination exists in your subaccount matching the target system.
# - Migration will preselect a destination if neo-app.json destination name matches an available destination.

# VS Code:
# - Have the target system hostname and SAP client (optional numeric) available.
```

STEP: Import or clone the project into the workspace
DESCRIPTION: Bring the source project files into your active workspace (either by git clone or file import/export).
- Option A: Clone from git using CLI.
- Option B: Export project from SAP Web IDE to local disk, unzip, then open/move into workspace.
- In VS Code: File > Open Workspace (create a workspace in the projects folder) or drag the unzipped project into the workspace.
LANGUAGE: Shell / Text
CODE:
```bash
# Example: clone from git (replace with your repo)
git clone <repository-url> /path/to/workspace/project-name

# Or:
# 1. Export project from SAP Web IDE -> unzip locally
# 2. Drag project folder into your VS Code or Business Application Studio workspace
```

STEP: Open the Migration view and start migration flow
DESCRIPTION: Launch the Migration UI and select projects to migrate.
- Start migration from the popup when opening a cloned/imported project, or:
- Open Command Palette and execute the migration command:
LANGUAGE: Text
CODE:
```text
# Open Migration view via Command Palette
# Keystroke:
#   macOS: CMD + Shift + P
#   Windows/Linux: CTRL + Shift + P
# Command:
Fiori: Migrate Project for use in Fiori tools
```

STEP: Select projects and provide migration metadata
DESCRIPTION: Select checkboxes for projects to migrate. Optionally click "Add Project" to add a folder manually. Provide or confirm the following fields for each project in the Migration view:
- Application Identifier: value from manifest.json or pom.xml
- Project Path: file system path to the project
- SAP System: choose saved VS Code systems or BAS destinations (selecting sets hostname/client)
- Destination: (BAS only) default from neo-app.json — should point to front-end server with SAPUI5 libraries
- Hostname: (VS Code only) back-end hostname (valid URL or blank)
- SAP Client: optional numeric client
- SAPUI5 Version: select preview runtime version (defaults to neo-app.json or manifest minUI5Version). Note: Extensibility projects require at least 1.71.0
LANGUAGE: Text
CODE:
```text
# Fields to fill in Migration view:
Application Identifier: <value from manifest.json or pom.xml>
Project Path: /absolute/or/relative/path/to/project
SAP System: <dropdown of saved systems/destinations>
Destination: <destination name>  # BAS only
Hostname: https://host.example.com  # VS Code only
SAP Client: 001  # optional
SAPUI5 Version: 1.71.0 or higher (Extensibility projects require >= 1.71.0)
```

STEP: Run the migration
DESCRIPTION: Click Start Migration in the Migration view. Migration will:
- Modify project files as listed below
- Install required npm packages
- Produce a migration results view with actions (View Info / Back)
- Note: migration does NOT update deployment configuration; run deployment config after migration
LANGUAGE: Shell
CODE:
```bash
# After migration, configure deployment:
npm run deploy-config
```

STEP: Files updated or added by migration
DESCRIPTION: The migration modifies/creates files to adopt ui5-tooling and SAP Fiori tools standards. Review these changed files and commit to version control as appropriate.
LANGUAGE: Text
CODE:
```text
Files created/updated by migration:

.gitignore
  - New file added. Contains build artifacts and libraries to ignore.

package-lock.json
  - Deleted and re-created to reflect updated libraries.

package.json
  - Removes SAP Web IDE specific libraries.
  - Updates npm scripts with SAP Fiori tooling targets and dependencies.
  - Presence of "sapux": true and ui5-tooling identifies SAP Fiori tools support.

ui5-local.yaml
  - New. Supports offline development, local ui5 libraries, and mock data.

ui5.yaml
  - Removes SAP Web IDE builder tasks. Adds proxy middleware and live reload config.
  - Deployment tasks are added later when you run deploy-config.

index.html
  - New. Supports stand-alone preview without SAP Fiori launchpad.

manifest.json
  - Populated/updated by SAP Fiori tools.

changes_loader.js
  - New. Supports live reload of the application.

changes_preview.js
  - New. Supports .changes files produced by adaptation updates.

flpSandbox.html
  - Updated. Paths changed so UI5 libraries are proxied; runtime UI5 version selectable; updated recommended config.

locate-reuse-libs.js
  - New. Detects custom reuse libraries referenced in manifest and registers them at runtime if installed.

flpSandboxMockServer.html
  - Updated similarly to flpSandbox.html but includes mock server support.

# Note: If no webapp folder existed in source, migration creates webapp and moves relevant HTML/JS there.
```

STEP: Post-migration verification and follow-up actions
DESCRIPTION: Verify changes and enable optional features:
- Review source control diffs for overwritten project-specific changes; reapply custom changes if needed.
- Sync OData service metadata if missing files (e.g., metadata.xml) using Service Manager.
- Launch SAP Fiori tools commands to validate functionality (Page Map, Generators, Guided Development).
LANGUAGE: Text
CODE:
```text
# Useful SAP Fiori tools commands after migration (via Command Palette):
Fiori: Open Application Generator
Fiori: Open Guided Development
# Other checks:
# - Open Page Map
# - Use Service Manager to sync OData/annotation files if metadata.xml is missing
```

STEP: Adaptation Projects / Adaptation Editor note
DESCRIPTION: If migrating SAPUI5 adaptation projects: adaptation projects migrated previously can be migrated again to enable the Adaptation Editor in BAS (available in Adaptation Project tooling 1.1.60+). After re-migration, the new Adaptation Editor becomes available.
LANGUAGE: Text
CODE:
```text
# Adaptation project requirement:
# - Adaptation Project tooling >= 1.1.60 in BAS provides Adaptation Editor.
# - Re-migrate previously migrated adaptation projects to enable the new editor.
```

STEP: Related resources
DESCRIPTION: External references for further reading and walkthroughs.
LANGUAGE: Text
CODE:
```text
# Related resources:
# - Extending an SAP Fiori Application:
#   https://help.sap.com/docs/bas/developing-sap-fiori-app-in-sap-business-application-studio/extending-sap-fiori-application
# - Blog: Migrate SAP Fiori projects from SAP Web IDE to SAP Business Application Studio:
#   https://blogs.sap.com/2022/01/06/migrate-sap-fiori-projects-from-sap-web-ide-to-sap-business-application-studio/
# - For Application Information after migration, see Project Functions > Application Information.
```
--------------------------------

**TITLE**: Report Issues and Security for SAP Fiori tools

**INTRODUCTION**: Quick reference for where to report issues with SAP Fiori tools and concrete security actions to follow when developing Fiori applications. Use this to find community/official support and to run basic checks that reduce security risk in development environments.

**TAGS**: fiori-tools, sap, support, security, odata, npm, path, source-control, devops

**STEP**: 1 — Check official FAQs and community first

**DESCRIPTION**: Before creating a support incident, verify up-to-date guidance and community answers. Use the official SAP Fiori tools FAQ and the SAP Fiori tools Community to find known issues and solutions.

**LANGUAGE**: Text

**CODE**:
```text
SAP Fiori tools FAQ:
https://help.sap.com/viewer/42532dbd1ebb434a80506113970f96e9/Latest/en-US

SAP Fiori tools Community:
https://answers.sap.com/tags/73555000100800002345
```

**STEP**: 2 — Create an SAP Support incident

**DESCRIPTION**: If community/FAQ do not resolve your issue, create an incident in SAP Support Portal. Provide the product component and concise reproduction steps, logs, and environment details.

**LANGUAGE**: Text

**CODE**:
```text
Open an incident in SAP Support Portal under component: CA-UX-IDE
Contact SAP Support page:
https://help.sap.com/viewer/1bb01966b27a429ebf62fa2e45354fea/Latest/en-US
```

**STEP**: 3 — Follow organizational software development security guidance

**DESCRIPTION**: Apply your organization's SDLC security policies (code review, secret management, vulnerability scanning, approved dependencies). This is the foundation; follow it before proceeding with local checks below.

**LANGUAGE**: Text

**CODE**:
```text
Action: Follow your organization's documented security guidance for software development,
including secret scanning, vulnerability scanning, code review, and dependency policy.
```

**STEP**: 4 — Avoid using production OData services for development

**DESCRIPTION**: Use a dedicated development or sandbox backend for building and testing Fiori apps. Do not use production OData services or production credentials during development.

**LANGUAGE**: Text

**CODE**:
```text
Best practice:
- Do NOT use OData services hosted on production systems for development.
- Use separate developer or sandbox instances for OData endpoints and testing.
- Do NOT reuse production user credentials for development.
```

**STEP**: 5 — Use a trusted NPM registry and verify packages

**DESCRIPTION**: Ensure npm registry is trusted, lock dependencies where possible, and audit packages for vulnerabilities.

**LANGUAGE**: Shell

**CODE**:
```bash
# Check current npm registry
npm config get registry

# Set registry to official npm registry (example)
npm config set registry https://registry.npmjs.org/

# Audit dependencies
npm audit

# Use lockfiles to pin dependencies
# npm creates package-lock.json automatically, or use yarn.lock for yarn
```

**STEP**: 6 — Use source control and commit regularly

**DESCRIPTION**: Keep all code in a source control system and make regular commits. Include build artifacts in .gitignore as appropriate.

**LANGUAGE**: Shell

**CODE**:
```bash
# Initialize a repository and do first commit
git init
git add .
git commit -m "Initial commit"

# Typical .gitignore entries for Node/Fiori projects
# node_modules/
# dist/
# .env
```

**STEP**: 7 — Verify your PATH and tool origins

**DESCRIPTION**: Confirm that tools executed from your terminal (e.g., node, cds) come from trusted installations. Inspect PATH to ensure no unexpected directories precede trusted tool locations.

**LANGUAGE**: Shell

**CODE**:
```bash
# Show PATH
echo $PATH

# Find which 'node' and 'cds' are executed
which node
node -v

which cds
cds --version

# If on Windows (PowerShell)
$env:PATH
Get-Command node
node --version
```

**STEP**: 8 — Additional security documentation reference

**DESCRIPTION**: For more comprehensive guidance, consult the security guidance referenced in the Fiori tools documentation.

**LANGUAGE**: Text

**CODE**:
```text
See: Security guidance in Deploying an Application
Relative link: ../Deploying-an-Application/security-8a147c6.md
SAP Fiori tools FAQ: https://help.sap.com/viewer/42532dbd1ebb434a80506113970f96e9/Latest/en-US
SAP Fiori tools Community: https://answers.sap.com/tags/73555000100800002345
Contact SAP Support: https://help.sap.com/viewer/1bb01966b27a429ebf62fa2e45354fea/Latest/en-US
```
--------------------------------

**TITLE**: SAP Business Application Studio — Dev Space and Extensions for SAP Fiori Tools

**INTRODUCTION**: Use this guide to set up a SAP Business Application Studio (BAS) workspace optimized for SAP Fiori development. It lists which dev space types include SAP Fiori tools by default, points out extensions that are not included and must be installed manually, and links to next recommended tutorials.

**TAGS**: fiori-tools, SAP, BAS, Business Application Studio, devspace, UI5, CDS, extensions

**STEP**: 1 — Create a BAS Workspace (Prerequisite)

**DESCRIPTION**: Create a new workspace in SAP Business Application Studio. Follow the official onboarding tutorial to set up your BAS environment and create a dev space.

**LANGUAGE**: text

**CODE**:
```text
Follow: https://developers.sap.com/tutorials/appstudio-onboarding.html
```

**STEP**: 2 — Select Dev Space Type (Preinstalled SAP Fiori Tools)

**DESCRIPTION**: When creating the dev space, select one of the dev space types that include SAP Fiori tools preinstalled:
- SAP Fiori Dev Space
- Full Stack Cloud Application Dev Space (recommended for CAP-based projects)

These dev spaces come with SAP Fiori tools preinstalled and loaded automatically, so you can start Fiori/UI5 development immediately.

**LANGUAGE**: text

**CODE**:
```text
Recommended dev space types:
- SAP Fiori Dev Space
- Full Stack Cloud Application Dev Space
```

**STEP**: 3 — Confirm UI5 Language Assistant (Included)

**DESCRIPTION**: The UI5 Language Assistant is a mandatory extension and is installed automatically in SAP Fiori dev spaces. No manual action required. If you need to review the extension details or update it, use the Visual Studio Code Marketplace link.

**LANGUAGE**: text

**CODE**:
```text
UI5 Language Assistant:
https://marketplace.visualstudio.com/items?itemName=SAPOSS.vscode-ui5-language-assistant&ssr=false#overview
```

**STEP**: 4 — Install CDS OData Language Server (Not Included)

**DESCRIPTION**: The CDS OData Language Server extension is NOT included by default in the SAP Fiori dev space. If your project uses CDS/OData language support, manually install the appropriate extension. See the SAP CDS Language Support section in the Visual Studio Code documentation for details and installation instructions.

**LANGUAGE**: text

**CODE**:
```text
See: visual-studio-code-17efa21.md#loio17efa217f7f34a9eba53d7b209ca4280
(Contains "SAP CDS Language Support" details)
```

**STEP**: 5 — Next Recommended Tutorial (Generate a Fiori App)

**DESCRIPTION**: After finishing BAS onboarding, generate a new SAP Fiori application using the Fiori tools generator. This is the recommended next step to scaffold a new Fiori project.

**LANGUAGE**: text

**CODE**:
```text
Generate a new Fiori app:
https://developers.sap.com/tutorials/fiori-tools-generate-project.html
```

**STEP**: 6 — Additional Getting Started Documentation

**DESCRIPTION**: Reference official BAS help and related tutorials for additional guidance on BAS usage and Fiori tooling.

**LANGUAGE**: text

**CODE**:
```text
Set Up SAP Business Application Studio - Getting Started:
https://help.sap.com/docs/bas/sap-business-application-studio/getting-started?version=Cloud

Related tutorial:
https://developers.sap.com/tutorials/appstudio-onboarding.html
```
--------------------------------

**TITLE**: Telemetry — Enable or Disable SAP Fiori tools Analytics

**INTRODUCTION**: Toggle the collection of non-personally-identifiable analytics for SAP Fiori tools. Use this to enable or disable telemetry that helps improve the product without collecting personal data.

**TAGS**: fiori-tools, telemetry, analytics, vscode, sap, fiori

**STEP**: 1 — Open Command Palette

**DESCRIPTION**: Open the editor command palette using the keyboard shortcut, then run the Fiori command to change telemetry settings.

**LANGUAGE**: Command

**CODE**:
```Command
// Open Command Palette
// macOS:
CMD + SHIFT + P
// Windows/Linux:
CTRL + SHIFT + P
```

**STEP**: 2 — Execute telemetry command

**DESCRIPTION**: Type and run the exact Fiori command to change telemetry. Select the prompt option to enable or disable telemetry when shown.

**LANGUAGE**: Command

**CODE**:
```Command
Fiori: Change Telemetry Settings
```
--------------------------------

**TITLE**: Visual Studio Code — Setup and SAP Fiori Tools Prerequisites for VS Code

**INTRODUCTION**: Action-oriented guide for preparing a development environment in Visual Studio Code (VS Code) for SAP Fiori tools and SAP CAP/UI5 projects. Includes system requirements, Node.js and MTA installation, Cloud Foundry CLI reference, npm scope checks, VS Code setup, extension installation commands, optional language support extensions, and supported authentication/OData service endpoints.

**TAGS**: VS Code, SAP Fiori, Node.js, MTA, Cloud Foundry, npm, extensions, CDS, UI5, authentication, OData

STEP: 1 — Verify Node.js and npm (minimums & checks)

DESCRIPTION: Confirm a Long Term Supported (LTS) Node.js version and compatible npm are installed. Use the terminal to check versions. If Node or npm are missing or outdated, install an LTS release. These commands help verify installed versions.

LANGUAGE: Bash

CODE:
```bash
# Check installed Node.js and npm versions
node -v
npm -v
```

STEP: 2 — Install Node.js (Windows: standalone binary method when installer not available)

DESCRIPTION: Recommended: use the official installer on Windows. If you cannot use the installer (no admin rights), download the standalone binary ZIP, extract to your user Programs folder, and set NODE_PATH and PATH for your account. Steps include exact environment variable names and target paths to use.

LANGUAGE: Text

CODE:
```text
Windows standalone binary installation steps:
1. Download the standalone binary from https://nodejs.org/en/download/.
2. Extract contents to: C:\Users\<your_user>\AppData\Local\Programs\<your_node_folder>
3. Open "Edit environment variables for your user account".
4. Add a new USER variable:
   Variable name: NODE_PATH
   Variable value: C:\Users\<your_user>\AppData\Local\Programs\<your_node_folder>
5. Add %NODE_PATH% to the Path variable in System variables (or add full path to your user Path).
6. Restart your computer to apply environment variable changes.

Note: If you can use installers, prefer the Windows installer from https://nodejs.org/en/download/.
For macOS, prefer Homebrew or nvm (Node Version Manager): https://brew.sh/ or https://github.com/nvm-sh/nvm
```

STEP: 3 — Install MTA (required by SAP Fiori application generator)

DESCRIPTION: Install the MTA Node.js package globally (version 1.0+ required) so SAP Fiori application generator can build/deploy multi-target applications.

LANGUAGE: Bash

CODE:
```bash
npm install -g mta
```

STEP: 4 — Install Cloud Foundry CLI (CF CLI) for SAP BTP Cloud Foundry

DESCRIPTION: To access Cloud Foundry services on SAP Business Technology Platform, install the latest Cloud Foundry CLI following official CF CLI installation instructions.

LANGUAGE: Text

CODE:
```text
CF CLI installation reference:
https://docs.cloudfoundry.org/cf-cli/install-go-cli.html

Follow the platform-specific installer or package manager instructions on the page above.
```

STEP: 5 — Verify npm scope for @sap registry and fix .npmrc if needed

DESCRIPTION: Ensure your npm configuration does not force the @sap scope registry incorrectly. Run the get command and verify the returned value. If the registry is set to '@sap' incorrectly, remove the entry from the ~/.npmrc file.

LANGUAGE: Bash

CODE:
```bash
# Check the @sap registry setting in npm config
npm config get @sap:registry

# Expected outputs:
# - https://registry.npmjs.org
# - undefined

# If the result is '@sap' (incorrect), open and edit the .npmrc in your home directory and remove the '@sap' registry entry:
#   ~/.npmrc
```

STEP: 6 — Download and set up Visual Studio Code

DESCRIPTION: Download VS Code and choose user or system installer for Windows (choose user install if no admin rights). Learn VS Code basics via official docs and videos. Open VS Code; if blocked by IT, request exception for VS Code and node.

LANGUAGE: Text

CODE:
```text
Download:
https://code.visualstudio.com/download

If you lack admin rights on Windows, select the User Installer.

Learning resources:
- Basic layout: https://code.visualstudio.com/docs/getstarted/userinterface#_basic-layout
- Introductory videos: https://code.visualstudio.com/docs/getstarted/introvideos

Note: VS Code and node may be blocked in restricted environments — request IT exception if necessary.
```

STEP: 7 — Install SAP Fiori tools extensions (Extension Pack recommended)

DESCRIPTION: Install the SAP Fiori tools - Extension Pack to add core extensions used by the SAP Fiori tooling. You can install via the VS Code UI or CLI. The pack installs Application Wizard, Application Modeler, Guided Development, Service Modeler, XML Annotation LSP, and XML Toolkit. SAP CDS Language Support (CDS Editor) is optional for CAP projects.

LANGUAGE: Bash

CODE:
```bash
# Install SAP Fiori tools - Extension Pack via VS Code CLI
code --install-extension SAPSE.sap-ux-fiori-tools-extension-pack

# Marketplace (GUI) link:
https://marketplace.visualstudio.com/items?itemName=SAPSE.sap-ux-fiori-tools-extension-pack

# Optional: SAP CDS Language Support (CDS Editor) marketplace ID and link:
# Install via CLI:
code --install-extension SAPSE.vscode-cds
# Marketplace link:
https://marketplace.visualstudio.com/items?itemName=SAPSE.vscode-cds#overview

# Extensions included by the extension pack (installed automatically):
# - Application Wizard
# - SAP Fiori Tools – Application Modeler
# - SAP Fiori tools - Guided Development
# - SAP Fiori tools - Service Modeler
# - SAP Fiori tools - XML Annotation Language Server
# - XML Toolkit
```

STEP: 8 — Install SAP CDS Language Support (CAP projects)

DESCRIPTION: For CAP projects using CDS annotations, install SAP CDS Language Support from the Visual Studio Marketplace and enable it in VS Code.

LANGUAGE: Text

CODE:
```text
Marketplace page:
https://marketplace.visualstudio.com/items?itemName=SAPSE.vscode-cds#overview

Steps:
1. Open the marketplace link in a browser.
2. Click "Install" to open VS Code.
3. In VS Code, click "Install" to enable the extension.

Additional CAP docs:
https://cap.cloud.sap/docs/get-started/tools/#add-cds-editor
https://cap.cloud.sap/docs/get-started/tools/#cds-editor
```

STEP: 9 — Install UI5 Language Assistant (optional)

DESCRIPTION: Install UI5 Language Assistant to enable control ID checks when flexEnabled=true in manifest.json and to improve suggestions/filters for UI5 development.

LANGUAGE: Bash

CODE:
```bash
# Install via VS Code CLI
code --install-extension SAPOSS.vscode-ui5-language-assistant

# Marketplace link:
https://marketplace.visualstudio.com/items?itemName=SAPOSS.vscode-ui5-language-assistant&ssr=false#overview

# Steps:
# 1. Open marketplace link.
# 2. Click "Install" to open VS Code.
# 3. In VS Code, click "Install" to finalize.
```

STEP: 10 — Supported authentication types and recommended approach

DESCRIPTION: Use this reference for which authentication types SAP Fiori tools support in VS Code across environments. Prefer SAP Business Application Studio for broader authentication support. If applicable, disable SAML for the listed OData services.

LANGUAGE: Text

CODE:
```text
Supported authentication types matrix (summary):

Authentication Type                  | SAP On Premise | SAP BTP, ABAP Env | SAP BTP, Cloud Foundry | SAP S/4HANA Cloud
-----------------------------------------------------------------------------------------------
OAuth 2.0 (Client Credentials)       | No             | No (uses Reentrance Ticket)   | No                    | No
Basic Authentication                 | Yes            | No            | Yes                     | No
Reentrance Ticket                    | No             | Yes           | Yes                     | Yes

Notes:
- Existing saved system connections using OAuth 2.0 are still supported for deployment but use reentrance tickets automatically for local development.
- Recommendation: Use SAP Business Application Studio for broader authentication type support.
- Reference note: https://me.sap.com/notes/0002577263
```

STEP: 11 — OData services (disable SAML if required)

DESCRIPTION: If selected OData services require SAML to be disabled for development scenarios, ensure SAML is disabled for these specific service endpoints. Use the listed paths when configuring backend or firewall/IT rules.

LANGUAGE: Text

CODE:
```text
OData service endpoints (paths):

- OData V2 catalog:
  /sap/opu/odata/IWFND/CATALOGSERVICE;v=2

- OData V4 catalog (dev):
  /sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0001

- OData V4 catalog (prod):
  /sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002

- ATO Catalog:
  /sap/bc/adt/ato/settings

- SAPUI5 repository service (for deploy & undeploy):
  /sap/opu/odata/UI5/ABAP_REPOSITORY_SRV
```
--------------------------------

**TITLE**: App-to-App Navigation Preview (Fiori Tools)

**INTRODUCTION**: Enable and preview external App-to-App navigation between two SAP Fiori elements applications located in the same workspace. The command generates the sandbox configuration required to route from a source app to a target app during local preview.

**TAGS**: fiori-tools, fiori, app-to-app, navigation, ui5, preview, vscode

**STEP**: 1 — Run the enable command

**DESCRIPTION**: Open the Command Palette and execute the Fiori Tools command to enable App-to-App Navigation Preview for a source application in the workspace.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Open Command Palette: [CMD/CTRL] + [Shift] + [P]
Command: Fiori: Enable App-to-App Navigation Preview
```

**STEP**: 2 — Select the source application

**DESCRIPTION**: From the list presented by the command, select the source application folder (the app where the external navigation originates). The source app must be in the same workspace as the target app(s).

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Select source application (choose the application folder in workspace that should start the external navigation)
```

**STEP**: 3 — Select the target application(s)

**DESCRIPTION**: From the next list, select one or more target application(s) (the apps to which navigation should lead). You can add multiple target navigations for the same source application.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Select target application (choose the application folder in workspace to receive the external navigation)
```

**STEP**: 4 — Confirmation message

**DESCRIPTION**: After selecting source and target app(s), the extension confirms the enablement. Expect the following confirmation message.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
App-to-App Navigation enabled.
```

**STEP**: 5 — Files generated and updated

**DESCRIPTION**: The command generates or updates configuration files required for local preview:
- Creates a sandbox configuration file in the source application:
  - appconfig/fioriSandboxConfig.json
- Updates the UI5 project descriptor to include the sandbox config:
  - ui5.yaml (in the source application)

Keep these file paths exactly as shown; they are created/modified in the source application folder.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Generated/updated files (located in the source application folder):
- appconfig/fioriSandboxConfig.json
- ui5.yaml
```

**STEP**: 6 — Start preview and follow navigation

**DESCRIPTION**: Start the local preview for the source application (using your normal Fiori tools/preview workflow). During runtime, follow the configured external navigation — the preview will route to the selected target application(s) based on the sandbox configuration.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Start the preview of the source application and follow the configured external navigation.
```

**STEP**: 7 — Reference for configuring external navigation

**DESCRIPTION**: For details on how external navigation should be configured in the applications (parameters, semantic objects, intents), consult the SAP Fiori elements documentation linked below.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
More info: Configuring External Navigation
https://ui5.sap.com/sdk/#/topic/1d4a0f94bfee48d1b50ca8084a76beec
```
--------------------------------

**TITLE**: Convert a Project to Use Virtual Endpoints (sap-ux converter)

**INTRODUCTION**: Instructions to convert an SAP Fiori project’s preview configuration to use virtual endpoints. The conversion renames local HTML preview files, removes legacy preview JavaScript/TypeScript/test files, and configures virtual endpoints (preview middleware). Use these steps in a development environment (VS Code or Application Info UI) to migrate safely and keep preview setup aligned with current package best-practices.

**TAGS**: fiori-tools, sap-ux, virtual-endpoints, ui5, migration, preview-middleware

**STEP**: Prerequisites — Verify required tools and packages

**DESCRIPTION**: Confirm required tools and package versions are installed. If not installed or outdated, install or upgrade. Preserve these exact package names and minimum versions:
- SAPUI5 CLI version 3.0.0 or higher
- @sap/ux-ui5-tooling version 1.15.4 or higher (if present)
- @sap-ux/ui5-middleware-fe-mockserver OR cds-plugin-ui5 must be installed
- Migrate from sap/ui/core/util/MockServer or @sap/ux-ui5-fe-mockserver-middleware to @sap-ux/ui5-middleware-fe-mockserver
- Migrate from @sap/grunt-sapui5-bestpractice-build to @ui5/cli

**LANGUAGE**: Shell

**CODE**:
```shell
# Check installed versions (examples)
ui5 --version
npm ls @sap/ux-ui5-tooling
npm ls @sap-ux/ui5-middleware-fe-mockserver
npm ls cds-plugin-ui5

# Example install/upgrades (choose one middleware)
npm install --save-dev @ui5/cli
npm install --save-dev @sap-ux/ui5-middleware-fe-mockserver
# or if you prefer:
npm install --save-dev cds-plugin-ui5

# If you have legacy middleware, remove/migrate
# (example uninstall)
npm uninstall --save-dev @sap/ux-ui5-fe-mockserver-middleware
npm uninstall --save-dev @sap/grunt-sapui5-bestpractice-build
```

**STEP**: Context — What the sap-ux converter does

**DESCRIPTION**: Summary of converter behavior and where to find more info:
- The sap-ux converter (convert preview-config) renames local HTML preview files, deletes JavaScript/TypeScript/test files used by the legacy preview, and configures virtual endpoints (preview middleware).
- Refer to the sap-ux convert preview-config documentation for deeper details and migration guidance.

**LANGUAGE**: Text

**CODE**:
```text
Converter behavior:
- Rename local HTML preview files (e.g., flpSandbox.html)
- Delete legacy preview .js/.ts and test files
- Configure virtual endpoints via preview middleware

Reference: sap-ux convert preview-config (open-ux-tools create README)
```

**STEP**: Launch the converter from VS Code (Command Palette)

**DESCRIPTION**: Run the sap-ux converter using VS Code Command Palette. Follow prompts exactly to simulate or apply conversion and choose whether to convert test runners.

**LANGUAGE**: Text

**CODE**:
```text
1. Open the Command Palette: CMD/CTRL + Shift + P
2. Execute command: "Fiori: Convert Preview Config"
3. Respond to prompts:
   - Press Y to SIMULATE the conversion (dry-run)
   - Press N to APPLY the conversion to the project
   - Next prompt: Press Y to convert test runners, or N to decline
4. Review terminal output for details of changes
```

**STEP**: Launch the converter from Application Info (UI)

**DESCRIPTION**: Alternative to Command Palette: run the converter from your app's Application Info UI.

**LANGUAGE**: Text

**CODE**:
```text
1. Open Application Info for the project (UI within your dev environment)
2. Click "Convert Preview Config"
3. Respond to prompts as with the Command Palette:
   - Y = simulate, N = convert
   - Then Y/N to convert test runners
4. Review terminal/output panel for conversion summary
```

**STEP**: Post-conversion actions and results

**DESCRIPTION**: After conversion, verify changes and migrate any custom local HTML content into middleware initialization. If you edited local HTML files (for example flpSandbox.html), move those edits into a custom init script for the preview middleware. If you did not modify HTML files, they can be deleted.

**LANGUAGE**: Text

**CODE**:
```text
Post-conversion checklist:
- Inspect terminal output for the conversion summary and file changes
- If you modified local HTML preview files (e.g., flpSandbox.html):
    - Move customized content into a custom init script for the preview middleware
    - Reference: preview-middleware - Migration (open-ux-tools create README)
- If local HTML files were NOT modified, they may be deleted safely
- Run your app with ui5 serve / your dev server and verify preview via virtual endpoints
```
--------------------------------

**TITLE**: Create a New Run Configuration in SAP Business Application Studio

**INTRODUCTION**: Create and manage run configurations in SAP Business Application Studio (BAS) to define how a Fiori/UI5 project is started and previewed. Use run configurations to set the startup HTML endpoint, enable mock servers, remote access, support assistant, URL parameters, and bind specific SAPUI5 versions or destinations. Note version requirements before creating configurations.

**TAGS**: fiori-tools, sap-business-application-studio, ui5, run-configuration, sapui5, mock-server, remote-access

**STEP**: Prerequisites / Required Package Versions

**DESCRIPTION**: Verify that your project uses compatible @sap/ux-ui5-tooling versions before using the Run Configuration Wizard and remote access features. The Run Configuration Wizard requires @sap/ux-ui5-tooling >= 1.5.3. Enabling remote access requires @sap/ux-ui5-tooling >= 1.19.1.

**LANGUAGE**: plaintext

**CODE**:
```plaintext
Required versions:
- Run Configuration Wizard: @sap/ux-ui5-tooling >= 1.5.3
- Enable Remote Access: @sap/ux-ui5-tooling >= 1.19.1
```

**STEP**: (Optional) Include project styling / icons

**DESCRIPTION**: The documentation includes a reference to SAP icon CSS. Keep the reference in your project or documentation if you use SAP icons.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**STEP**: Open the Run Configurations pane

**DESCRIPTION**: In BAS, open the Run Configurations pane to view or create run configurations.

- From the left-side toolbar, click "Run Configurations".
- The run configuration pane opens (left side).

**LANGUAGE**: plaintext

**CODE**:
```plaintext
UI actions:
1. Click the left-side toolbar icon: "Run Configurations"
2. The Run Configuration pane opens
```

**STEP**: Create a new run configuration

**DESCRIPTION**: Create a new run configuration using the Add icon; provide mandatory fields and optional runtime features. Save to add the configuration to the Run and Debug pane and the Run Configurations table.

- Click the Add (+) icon in the left pane to create a new configuration.
- In the dialog, select the project for which you want the configuration.
- Fill in the fields (see next step for field details).
- Click Save.

**LANGUAGE**: plaintext

**CODE**:
```plaintext
UI actions:
1. In Run Configuration pane -> Click Add (+)
2. Select project in "What would you like to run?"
3. Provide config values -> Click Save
Result:
- New config appears in Run and Debug pane and in Run Configurations table
```

**STEP**: Run configuration fields and options (required and optional)

**DESCRIPTION**: Provide the following information when creating/editing a run configuration. Fields marked mandatory must be set.

- Name (mandatory): Change the default name as needed.
- Endpoint (mandatory): Select the HTML file used when the application starts (e.g., index.html).
- Mock Data: Run the application with a mock server that simulates OData requests.
- Support Assistant: Enable best-practice checks for SAPUI5 applications.
- Enable Remote Access: Allow access from other devices (development use only). When enabled, terminal output includes a URL or QR code for connecting. Requires @sap/ux-ui5-tooling >= 1.19.1.
- URL Components: Define additional URL query parameters and a hash fragment for Fiori launchpad intent-based navigation.
- Advanced Settings:
  - Choose which SAPUI5 version to use at runtime.
  - Change destinations used by the application.
  - Option: Use local SAPUI5 sources — downloads the SAPUI5 libraries for the selected version and uses them for preview. Note: Selecting "Use local SAPUI5 sources" automatically selects "Run with mock data".

**LANGUAGE**: plaintext

**CODE**:
```plaintext
Run configuration properties:
- Name (mandatory)
- Endpoint (mandatory) -> select HTML startup file
- Mock Data -> enable mock server for OData
- Support Assistant -> enable best-practice checks
- Enable Remote Access -> allows external device connections (dev only)
  * Requires @sap/ux-ui5-tooling >= 1.19.1
- URL Components -> add URL params and hash fragment
- Advanced Settings:
  * SAPUI5 runtime version selection
  * Destination bindings (change destinations)
  * Use local SAPUI5 sources -> downloads and uses local SAPUI5 libraries
    -> automatically enables "Run with mock data"
```

**STEP**: Run the project using a run configuration

**DESCRIPTION**: Start the application using the Actions column or the Run and Debug pane.

- In the Run Configurations table: click the [>] icon under Actions to launch the configuration.
- Or in the Run and Debug pane: select the run configuration from the dropdown and click Start Debugging (debug icon).

**LANGUAGE**: plaintext

**CODE**:
```plaintext
Run actions:
- Run Configurations table -> Click [>] under Actions
- OR Run and Debug pane -> Select config -> Click Start Debugging (debug icon)
```

**STEP**: Manage run configurations (quick actions)

**DESCRIPTION**: Use quick actions in the Run Configuration pane or context menu to modify or inspect saved configurations.

Available quick actions:
- Bind/Unbind SAPUI5 Version: Change the SAPUI5 version used by the configuration.
- Bind/Unbind Data Source: Change the destination used by the configuration.
- Rename: Right-click a run configuration -> Rename.
- Show File: Right-click a run configuration -> Show File. Opens the JSON file containing the configuration properties with the configuration name highlighted.
- Delete: Right-click a run configuration -> Delete.

**LANGUAGE**: plaintext

**CODE**:
```plaintext
Quick actions:
- Bind/Unbind SAPUI5 Version
- Bind/Unbind Data Source
- Rename -> Right-click -> Rename
- Show File -> Right-click -> Show File -> opens JSON file with properties
- Delete -> Right-click -> Delete
```
--------------------------------

**TITLE**: Create a New Run Configuration in Visual Studio Code (Fiori Tools)

**INTRODUCTION**: Create additional run configurations in VS Code to control how a SAP Fiori project is started (endpoint HTML, mock data, support assistant, remote access, URL parameters, SAPUI5 version and local sources). The Run Configuration Wizard requires @sap/ux-ui5-tooling >= 1.5.3. Remote access requires @sap/ux-ui5-tooling >= 1.19.1. Preserve SAP icon stylesheet reference if used in extensions or custom docs.

**TAGS**: fiori-tools, vscode, ui5, run-configuration, ux-ui5-tooling, mock-server, support-assistant, remote-access, sapui5

STEP: 1 — Open the Run Configuration Wizard

DESCRIPTION: Open the Fiori Run Configuration wizard from the VS Code Command Palette to start creating or editing run configurations for a selected project.

LANGUAGE: text

CODE:
```text
Keyboard shortcut (macOS/Windows): [CMD/CTRL] + [Shift] + [P]
Command to execute: Fiori: Open Run Configurations
```

STEP: 2 — Select the Project

DESCRIPTION: Choose the workspace folder/project that will receive the new run configuration. Press Enter to confirm.

LANGUAGE: text

CODE:
```text
Action: Select the project in the picker and press [Enter]
```

STEP: 3 — Create a New Configuration

DESCRIPTION: The wizard displays existing run configurations for the selected project. Click Create to begin a new configuration.

LANGUAGE: text

CODE:
```text
UI: Click "Create" in the Run Configurations list
```

STEP: 4 — Provide Configuration Fields (required and optional)

DESCRIPTION: Fill out the fields in the wizard. The fields below are mandatory or optional and control runtime behavior. Preserve the combinations and automatic behavior:
- Name (mandatory): change the default name if desired.
- Endpoint (mandatory): select the HTML file used to start the application.
- Mock Data: enable a mock OData server for preview (runs the application with mocked OData requests).
- Support Assistant: enable static checks against SAPUI5 best-practice rules.
- Enable Remote Access: allow connections from other devices on the network (development only). Warning: server accepts connections from all hosts — do not use in production. Requires @sap/ux-ui5-tooling >= 1.19.1. When enabled, the terminal shows a URL and a QR code for connecting.
- URL Components: add query parameters and a hash fragment for SAP Fiori launchpad intent navigation.
- Advanced Setting: specify the SAPUI5 runtime version and change destinations used by the application.
  - Use local SAPUI5 sources: download SAPUI5 libraries for a specific version and use them for preview. When selected for preview, "Run with mock data" is automatically enabled.

LANGUAGE: text

CODE:
```text
Configuration fields:
- Name (mandatory)
- Endpoint (mandatory) -> select index.html or other start page
- Mock Data (optional) -> enable mock server for OData
- Support Assistant (optional) -> run best-practice checks
- Enable Remote Access (optional, requires @sap/ux-ui5-tooling >= 1.19.1)
    * Warning: accepts connections from all hosts — development only
    * Terminal shows connection URL and QR code when enabled
- URL Components (optional) -> additional URL parameters + hash fragment
- Advanced Setting (optional)
    * Set SAPUI5 runtime version
    * Change destinations
    * Use local SAPUI5 sources -> downloads libraries and forces Run with mock data
```

STEP: 5 — Save and Locate the New Configuration

DESCRIPTION: Save the configuration. The new entry appears in both the Run and Debug pane and the Run Configurations table.

LANGUAGE: text

CODE:
```text
Action: Click "Save"
Result: New launch configuration appears in:
- Run and Debug pane (left)
- Run Configurations table
```

STEP: 6 — Start the Application using the Run Configuration

DESCRIPTION: Start the configured launch from the Run Configurations table or the Run and Debug pane using the provided run or start debugging controls.

LANGUAGE: text

CODE:
```text
Options to start:
- In Run Configurations table: click the ">" icon under the Actions column
- In Run and Debug pane: select the desired Run Configuration from dropdown and click the Start Debugging icon (Start Debugging icon shown as SAP icon in UI)
```

STEP: Reference — Preserve UI Icon Stylesheet and Source Comment

DESCRIPTION: If your documentation pages or extension UI reference SAP icons, keep the stylesheet link and original comment for consistency.

LANGUAGE: html

CODE:
```html
<!-- loio3b1f37edf22c4d3dbc14472d6dcb6e2a -->
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```
--------------------------------

**TITLE**: Developer Variant Creation (SAP Fiori tools)

**INTRODUCTION**: Create and persist developer variants (views) for SAP Fiori applications using the SAP Fiori tools preview. Variants are stored as SAPUI5 flexibility change files in webapp/changes and packaged with the app. Supported for ABAP service-based projects with SAPUI5 >= 1.90 (OData V2) and >= 1.84 (OData V4). Uses the @sap/ux-ui5-tooling preview feature.

**TAGS**: fiori-tools, SAPUI5, variants, ui5, flexibility, ux-ui5-tooling, i18n, preview

STEP: Prerequisites
DESCRIPTION: Verify project type and installed tooling, and note supported SAPUI5 versions.
LANGUAGE: Text
CODE:
```text
- Project type: ABAP service-based projects only
- Required module: @sap/ux-ui5-tooling (preview feature)
- Supported SAPUI5 versions:
  - 1.90 for OData V2 applications
  - 1.84 for OData V4 applications
```

STEP: Start variant creation (Preview)
DESCRIPTION: From the Fiori Tools Preview Application context menu, execute the preview script that opens the application in UI adaptation mode to create developer variants. If the script is present, run it directly.
LANGUAGE: Shell
CODE:
```bash
start-variants-management
```

STEP: Add configuration for variants creation (if script missing)
DESCRIPTION: If the preview script is not available, add the configuration using the VS Code Command Palette.
LANGUAGE: Text
CODE:
```text
Open Command Palette: [CMD/CTRL] + [Shift] + [P]
Execute command: Fiori: Add Configuration for Variants Creation
```

STEP: Use the UI adaptation mode
DESCRIPTION: After starting the script or adding the configuration, a new browser tab opens showing the preview in UI adaptation mode. Create or adapt views/variants using the on-screen adaptation tools. When finished, click Save & Exit to persist changes.
LANGUAGE: Text
CODE:
```text
Action: Save & Exit (to persist created/modified variants)
```

STEP: Location and format of saved variants
DESCRIPTION: Each new variant generates one or more SAPUI5 change files. Locate the generated change files in the project and prepare any translatable text replacements.
LANGUAGE: Path
CODE:
```text
webapp/changes
```

STEP: Make UI texts translatable
DESCRIPTION: Open each generated change file and replace static UI text values with translatable placeholders. Add or update the keys in your i18n resource files accordingly.
LANGUAGE: Text
CODE:
```text
Replace static text with i18n placeholder syntax, for example:
{i18n>textKey}
```

STEP: Notes, limitations, and references
DESCRIPTION: Keep these technical notes and links for deeper reference.
LANGUAGE: Text
CODE:
```text
- Visibility and role assignment are NOT supported for developer variants.
- Technical details and preview implementation: https://www.npmjs.com/package/@sap/ux-ui5-tooling#4-preview
- User guidance on creating/adapting views: https://help.sap.com/viewer/DRAFT/6583b46f6c164aad818a3891bc91d8d8/dev_internal/en-US/91ae3492323b42a79ca66fbfaf5af3f9.html
```
--------------------------------

**TITLE**: Generating Mock Data with AI

**INTRODUCTION**: Generate meaningful, contextually relevant mock data for Fiori apps by using AI that leverages entity property names. Use this when you need realistic test data quickly for UI prototyping or automated tests. Requires an EDMX-based service that provides a metadata.xml file.

**TAGS**: fiori-tools, SAP Build Code, mock-data, EDMX, metadata.xml, AI

**STEP**: Prerequisites — SAP Build Code subscription and EDMX metadata
**DESCRIPTION**: Confirm you have a valid SAP Build Code subscription (or the SAP Build Code Test Drive) and that your EDMX project includes the service metadata file named metadata.xml. The metadata.xml must be accessible in your project so the AI can inspect entity property names to generate context-aware mock data.
**LANGUAGE**: Text/HTML
**CODE**:
```html
<!-- Include SAP icons CSS if your editor UI requires it -->
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```
**CODE**:
```text
# Required file in your EDMX project:
metadata.xml
```
**STEP**: Start mock data generation in the Page Editor
**DESCRIPTION**: Open the Page Editor for the UI view you want to populate. Use the "Generate Mock Data with AI" control (icon shown below) to trigger AI generation. The tool analyzes entity property names from metadata.xml and produces mock records automatically.
**LANGUAGE**: HTML
**CODE**:
```html
<!-- Click this icon in the Page Editor to open the Generate Mock Data with AI dialog -->
<span class="SAP-icons-TNT-V3"></span>  <!-- Generate Mock Data with AI -->
```
**STEP**: Execute generation
**DESCRIPTION**: In the Generate Mock Data with AI dialog, click the Generate button. The AI will create three mock records for the selected entity. Note: depending on your model size and network, generation may take several seconds.
**LANGUAGE**: Text
**CODE**:
```text
Action:
1. In Page Editor -> Click the Generate Mock Data with AI icon.
2. In the dialog -> Click "Generate".
Result:
- Three mock records are generated and inserted into the local mock dataset.
- Generation time varies with service size; please wait until completion.
```
**STEP**: Troubleshooting and verification
**DESCRIPTION**: Verify generated records in your mock data store/UI. If generation fails, ensure:
- metadata.xml is present and readable by the project tooling
- You have an active SAP Build Code subscription or are using the Test Drive
- Network access to SAP Build Code services is available
**LANGUAGE**: Text
**CODE**:
```text
If generation fails:
- Check project logs for errors referencing metadata.xml
- Confirm the EDMX service metadata includes entity property names
- Retry after ensuring subscription/authentication and network connectivity
```
--------------------------------

**TITLE**: Installing Mock Server for SAP Fiori Tools Projects

**INTRODUCTION**: Steps and commands to install, remove, update, and verify the Mock Server configuration for SAP Fiori Tools projects. Use these instructions in your project root (terminal) or via the Fiori extension UI. New projects created with the SAP Fiori application generator include this configuration automatically.

**TAGS**: fiori-tools, mockserver, sap-ux, ui5, devtools

STEP: 1 — Confirm generator auto-adds mock server for new projects

DESCRIPTION: The SAP Fiori application generator adds mock server configuration automatically for new projects. If you need to confirm the configuration was added, check package.json and the presence of ui5-mock.yaml in the project root.

LANGUAGE: Bash

CODE:
```bash
# Check package.json for the start-mock script
grep -n '"start-mock"' package.json || echo "start-mock not found in package.json"

# Check package.json for @sap-ux/ui5-middleware-fe-mockserver dependency
grep -n '@sap-ux/ui5-middleware-fe-mockserver' package.json || echo "@sap-ux/ui5-middleware-fe-mockserver not found in package.json"

# Check that ui5-mock.yaml exists in the project root
test -f ui5-mock.yaml && echo "ui5-mock.yaml found" || echo "ui5-mock.yaml missing"
```

STEP: 2 — Install mock server via CLI (project root terminal)

DESCRIPTION: Run the create utility from @sap-ux to add the mock server configuration to an existing project. Execute this in the project root terminal. For guidance on opening the terminal, see Use Mock Data documentation.

LANGUAGE: Bash

CODE:
```bash
npx @sap-ux/create add mockserver-config
```

STEP: 3 — Install or update mock server via Fiori extension UI

DESCRIPTION: Use the Fiori extension in VS Code to add or update mock server configuration from the Application Info UI.

LANGUAGE: Text

CODE:
```
Command: Fiori: Open Application Info
Action: Under "What you can do", click "Add Mock server Config"
```

STEP: 4 — Remove mock server configuration

DESCRIPTION: Remove the mock server configuration if no longer needed. Run this in the project root terminal.

LANGUAGE: Bash

CODE:
```bash
npx @sap-ux/create remove mockserver-config
```

STEP: 5 — List available @sap-ux/create commands (help)

DESCRIPTION: Show available commands from the create utility; helpful to learn other options or confirm command syntax.

LANGUAGE: Bash

CODE:
```bash
npx @sap-ux/create help
```

STEP: 6 — What the installation adds and how to verify

DESCRIPTION: After installing the mock server, verify these items are present in your project:
- package.json includes a start-mock script.
- package.json includes @sap-ux/ui5-middleware-fe-mockserver as a devDependency and UI5 dependency.
- ui5-mock.yaml file exists in the project root.
Use the commands below to verify programmatically.

LANGUAGE: Bash

CODE:
```bash
# Verify start-mock script exists
jq -r '.scripts["start-mock"] // empty' package.json && echo "start-mock script present" || echo "start-mock script missing"

# Verify dependency presence (devDependency or dependencies)
jq -r '.devDependencies["@sap-ux/ui5-middleware-fe-mockserver"] // .dependencies["@sap-ux/ui5-middleware-fe-mockserver"] // empty' package.json \
  && echo "@sap-ux/ui5-middleware-fe-mockserver present in package.json" \
  || echo "@sap-ux/ui5-middleware-fe-mockserver missing in package.json"

# Verify ui5-mock.yaml file exists
[ -f ui5-mock.yaml ] && echo "ui5-mock.yaml present" || echo "ui5-mock.yaml missing"
```

Additional notes:
- For new projects created with the SAP Fiori application generator, mock server configuration is automatically added. See Capabilities Overview: ../Getting-Started-with-SAP-Fiori-Tools/capabilities-overview-f540ae1.md
- To learn more about opening the terminal or using mock data, see: Use Mock Data (use-mock-data-bda83a4.md)
--------------------------------

**TITLE**: Preview an Application on External SAP Fiori Launchpad

**INTRODUCTION**: This guide explains how to preview a UI5/Fiori application on an external SAP Fiori Launchpad (FLP) without redeploying the app. Use this to test the app running on an existing SAP Fiori launchpad instance. Prerequisite: the application must be deployed at least once and configured on the target launchpad. Note: the SAP Launchpad service on SAP BTP does not support this feature.

**TAGS**: fiori-tools, sap, sap-fiori, ui5, flp, launchpad, preview, bsp

**STEP**: 1 — Open the Command Palette

**DESCRIPTION**: Open the editor's command palette to run Fiori Tools commands.

**LANGUAGE**: UI/Action

**CODE**:
```text
Open Command Palette: [CMD/CTRL] + [Shift] + [P]
```

**STEP**: 2 — Run the Add FLP Embedded Configuration command

**DESCRIPTION**: Start the flow that collects the FLP embedding configuration (BSP, YAML for backend config, and FLP relative link).

**LANGUAGE**: Plain Text

**CODE**:
```text
Command: Fiori: Add FLP Embedded Configuration
```

**STEP**: 3 — Enter the BSP name (lowercase required)

**DESCRIPTION**: Provide the BSP (Business Server Page) name for the deployed application. The BSP must be entered in lowercase.

**LANGUAGE**: Plain Text

**CODE**:
```text
Enter the BSP of the deployed application (must be lowercase)
Example placeholder: myapp_bsp
```

**STEP**: 4 — Provide the backend configuration YAML (usually ui5.yaml)

**DESCRIPTION**: Point to the YAML file that contains backend configuration for the app. Usually this is the project's ui5.yaml. Enter the relative path to that YAML from the project root.

**LANGUAGE**: Plain Text

**CODE**:
```text
Enter YAML file containing backend configuration (usually ui5.yaml)
Example: ./ui5.yaml
```

**STEP**: 5 — Enter the relative link to the SAP Fiori launchpad

**DESCRIPTION**: Provide the relative URL path to the external launchpad shell you will preview on. This should be relative to the launchpad host.

**LANGUAGE**: Plain Text

**CODE**:
```text
Enter relative link to SAP Fiori launchpad
Example: sap/bc/ui5_ui5/ui2/ushell/shells/abap/Fiorilaunchpad.html
```

**STEP**: 6 — Build the application

**DESCRIPTION**: Build the app before starting the embedded preview. The preview uses the built artifacts.

**LANGUAGE**: Shell

**CODE**:
```bash
npm run build
```

**STEP**: 7 — Start the preview on the existing launchpad

**DESCRIPTION**: Start the embedded preview on the external launchpad. Right-click the project folder (or any subfolder), select Preview Application, then choose start-embedded.

**LANGUAGE**: UI/Action

**CODE**:
```text
Right-click project folder (or subfolder) -> Preview Application -> start-embedded
```

**STEP**: 8 — Notes on loading, caching, and refresh behavior

**DESCRIPTION**: Operational details to manage expectations and workflow:

- Initial load on the external launchpad is slower than local previews; subsequent loads are faster due to UI5 resource caching.
- Changes in source files are not reflected immediately. Rebuild the app to see changes:
  - Run npm run build — once the build completes, the application running on the external launchpad will be automatically refreshed.
- Requirement reminder: the application must be deployed and configured on the target launchpad to be visible and runnable via this preview.

**LANGUAGE**: Plain Text

**CODE**:
```text
Notes:
- Initial load is slower due to external FLP and caching.
- To apply code changes: run `npm run build`. After build completion the external FLP preview auto-refreshes.
- The app must be deployed and configured on the target FLP before previewing.
- SAP Launchpad service on SAP BTP does NOT support this feature.
```
--------------------------------

**TITLE**: Preview an Application with the SAP Horizon Theme

**INTRODUCTION**: Ensure your SAPUI5 application uses a SAPUI5 version that includes the SAP Horizon theme, then enable or preview the Horizon theme. This document gives actionable steps to verify and set the SAPUI5 version (ui5.yaml) and guidance for new projects and custom controls.

**TAGS**: SAPUI5, SAP Fiori, Horizon theme, ui5.yaml, theme, preview, generator

STEP: 1 — Verify SAPUI5 version compatibility

DESCRIPTION: Confirm your application uses an SAPUI5 version that includes the SAP Horizon theme. Horizon is available starting from SAPUI5 versions 1.93.3 and 1.96.0 (and higher). If your project does not specify a version in ui5.yaml, the latest SAPUI5 version is used by default (which is compatible).

LANGUAGE: YAML

CODE:
```yaml
# Example ui5.yaml specifying a compatible SAPUI5 version
specVersion: "2.2"
metadata:
  name: my.app
type: application

framework:
  name: SAPUI5
  version: "1.96.0"    # ensure this is 1.93.3, 1.96.0 or higher
  libraries:
    - name: sap.m
```

STEP: 2 — Update SAPUI5 version for existing applications

DESCRIPTION: For an existing SAP Fiori application, edit the project's ui5.yaml file to set the framework.version to a compatible SAPUI5 release (see Step 1). Save and rebuild/serve the app to use the updated SAPUI5 runtime.

LANGUAGE: YAML

CODE:
```yaml
# Edit ui5.yaml: change the version value to a Horizon-compatible SAPUI5 release
framework:
  name: SAPUI5
  version: "1.96.0"
```

STEP: 3 — Choose SAPUI5 version when creating a new project

DESCRIPTION: When generating a new SAP Fiori application with the SAP Fiori application generator, select a minimum SAPUI5 version that supports the Horizon theme on the Project Attributes step of the generator UI. This ensures the generated project already references a Horizon-compatible SAPUI5 version.

LANGUAGE: text

CODE:
```text
Action: In the SAP Fiori application generator (project attributes), set the SAPUI5 version to >= 1.93.3 (or >= 1.96.0) before generating the project.
```

STEP: 4 — Validate custom controls and design consistency

DESCRIPTION: Applications built with SAP Fiori elements and standard SAPUI5 controls will generally render correctly with the Horizon theme without technical changes. If your app uses custom controls, verify visuals and behavior under the Horizon theme. Inspect style/layout regressions and adjust custom CSS or control rendering as needed.

LANGUAGE: text

CODE:
```text
Action: Manually test views and custom controls using the Horizon theme. Adjust CSS/custom control rendering if design inconsistencies appear.
Reference: https://blogs.sap.com/2021/11/17/saps-ui-technologies-supporting-the-new-Horizon-visual-theme-of-SAP-Fiori/
```

STEP: 5 — Start previewing with the Horizon theme

DESCRIPTION: Once your project uses a Horizon-compatible SAPUI5 version, preview the application normally (e.g., ui5 serve, Fiori tools preview). The Horizon theme will be available in the runtime. For detailed usage and theme variants, consult the linked SAP blog.

LANGUAGE: text

CODE:
```text
Action: Serve or run the app (for example, using UI5 Tooling or Fiori tools preview). The Horizon visual theme is included in compatible SAPUI5 releases.
Tip: If you need to explicitly apply or test a theme variant, use runtime options or URL parameters supported by your environment (see SAP documentation/blog).
Reference: https://blogs.sap.com/2021/11/17/saps-ui-technologies-supporting-the-new-Horizon-visual-theme-of-SAP-Fiori/
```

--------------------------------

**TITLE**: Previewing a Fiori Application (fiori-tools)

**INTRODUCTION**: Quick reference for starting and troubleshooting application previews created with fiori-tools. Covers terminal commands, Run Control (VS Code / SAP Business Application Studio), context-menu preview options, and the HSTS/localhost HTTPS issue.

**TAGS**: fiori-tools, preview, npm, vs-code, sap-business-application-studio, mock-data, launchpad, HSTS, localhost

**STEP**: 1 — Handle localhost / HTTPS redirect (HSTS) issues

**DESCRIPTION**: If an SSL protocol error appears after URL redirection when previewing via localhost, check browser security/HSTS settings. For Chrome, use the HSTS configuration page to inspect and delete any problematic localhost HSTS entries.

**LANGUAGE**: URL

**CODE**:
```text
chrome://net-internals/#hsts
```

**STEP**: 2 — Start a preview from the terminal

**DESCRIPTION**: Run the npm start scripts from your project root to launch the preview server. Use the specific npm script names to select the desired preview mode (live data, mock data, local UI5, or no FLP sandbox). Use `npm start` or `npm run <script>`.

**LANGUAGE**: Shell

**CODE**:
```bash
# Default preview (as configured in package.json)
npm start

# Explicitly run named preview scripts
npm run start
npm run start-local     # mock data + local SAPUI5 resources (offline)
npm run start-noflp     # preview without SAP Fiori launchpad sandbox
npm run start-mock      # preview with mock data
```

**STEP**: 3 — Start a preview with Run Control (VS Code / SAP Business Application Studio)

**DESCRIPTION**: Use VS Code Launch Configurations or SAP Business Application Studio Run Configurations to start previews via the editor UI. Create a launch configuration that invokes the appropriate npm script (example below runs the "start" npm script). Use this to bind debugging, environment variables, or custom runtime args.

**LANGUAGE**: JSON

**CODE**:
```json
// .vscode/launch.json - example to run "npm run start"
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch npm start",
      "type": "pwa-node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start"],
      "console": "integratedTerminal"
    }
  ]
}
```

**STEP**: 4 — Start a preview from the context menu (VS Code / SAP Business Application Studio)

**DESCRIPTION**: Right-click the project folder or an application-related subfolder in the Explorer and choose "Preview Application". The context menu exposes the following default preview options — choose one to launch that preview mode.

**LANGUAGE**: Text

**CODE**:
```text
Preview Application options (default):
  start        - starts the application with real service data
  start-local  - starts with mock data and a local copy of SAPUI5 resources (offline)
  start-noflp  - starts without the SAP Fiori launchpad sandbox
  start-mock   - starts the application with mock data

Note: Automatic SAPUI5 download is supported for SAPUI5 versions 1.76 and higher.
```

**STEP**: 5 — Use Run Configurations and Run Control pages

**DESCRIPTION**: For detailed options and UI steps, refer to the Run Control and "create a new run configuration" guides in your environment:
- Use Run Control: use-run-control-09171c8.md
- Create a new run configuration in VS Code: create-a-new-run-configuration-in-visual-studio-code-3b1f37e.md
- Create a new run configuration in SAP Business Application Studio: create-a-new-run-configuration-in-sap-business-application-studio-05f2a9e.md

**LANGUAGE**: Text

**CODE**:
```text
Documentation references:
  Use Run Control: use-run-control-09171c8.md
  Create a new run configuration (VS Code): create-a-new-run-configuration-in-visual-studio-code-3b1f37e.md
  Create a new run configuration (SAP BAS): create-a-new-run-configuration-in-sap-business-application-studio-05f2a9e.md
```

**STEP**: 6 — App-to-App Navigation preview

**DESCRIPTION**: To enable and preview app-to-app navigation behavior, follow the dedicated guide.

**LANGUAGE**: Text

**CODE**:
```text
App-to-App Navigation Preview: app-to-app-navigation-preview-543675f.md
```
--------------------------------

**TITLE**: Previewing an SAP Fiori Elements CAP Project (VS Code & SAP Business Application Studio)

**INTRODUCTION**: Quick, action-oriented instructions to run and preview a generated SAP Fiori Elements CAP project locally using Visual Studio Code or SAP Business Application Studio. Includes terminal commands, expected output, troubleshooting, and how to open the app launchpad link.

**TAGS**: fiori-tools, CAP, cds, @sap/cds, launchpad, Visual Studio Code, Business Application Studio, preview

**STEP**: 1 — Open the terminal (Visual Studio Code)

**DESCRIPTION**: Open an integrated terminal in VS Code using any of the supported methods so you can run project commands.

**LANGUAGE**: Shell

**CODE**:
```text
Methods to open the terminal in VS Code:
- Press Ctrl+`
- From the menu: View > Terminal
- Command Palette (Ctrl/Command + Shift + P) -> execute "View: Toggle Integrated Terminal"
```

**STEP**: 2 — Open the terminal (SAP Business Application Studio)

**DESCRIPTION**: Open a terminal in SAP Business Application Studio to run project commands.

**LANGUAGE**: Shell

**CODE**:
```text
In SAP Business Application Studio:
- From the menu: Terminal > New Terminal
```

**STEP**: 3 — Ensure you are in the project root

**DESCRIPTION**: Set the terminal's working directory to the root of your CAP project before running the app server.

**LANGUAGE**: Shell

**CODE**:
```bash
# Example: change directory to your CAP project root
cd /path/to/your/cap-project
# verify files (optional)
ls
```

**STEP**: 4 — Start the local CAP server

**DESCRIPTION**: Run the CAP development server. This serves the OData/REST backend and the Fiori webapp for preview.

**LANGUAGE**: Shell

**CODE**:
```bash
cds run
```

**STEP**: 5 — Confirm server is listening and locate the HTML link

**DESCRIPTION**: After cds run starts, verify the server URL printed to the terminal and open the provided links. Use Ctrl + Click on the URL shown in the terminal to open the list of available app links in a browser.

**LANGUAGE**: text

**CODE**:
```text
Example terminal output:
server listening on { url: 'http://localhost:4004' }

Open the URL (Ctrl + Click in the terminal). In the browser, click the HTML link for your webapp, for example:
  /incidents/webapp/index.html
or the upper HTML link shown in SAP Business Application Studio output.
```

**STEP**: 6 — Troubleshoot missing cds or cds-dk

**DESCRIPTION**: If cds run fails due to missing global packages, install the required tools globally and retry. Use --force for cds-dk if necessary.

**LANGUAGE**: Shell

**CODE**:
```bash
npm i -g @sap/cds
npm i -g @sap/cds-dk --force
# Then retry:
cds run
```

**STEP**: 7 — View the application on the launchpad

**DESCRIPTION**: After opening the HTML link (e.g., /incidents/webapp/index.html), the Fiori Elements application is displayed on the launchpad in the browser. Interact with it to validate UI and navigation.

**LANGUAGE**: text

**CODE**:
```text
In the browser:
- Click the HTML link shown after cds run (e.g., /incidents/webapp/index.html)
- The application opens on the Fiori launchpad for preview
```

**STEP**: 8 — Stop the local CAP server

**DESCRIPTION**: When finished previewing, stop the running server from the terminal.

**LANGUAGE**: Shell

**CODE**:
```text
# In the terminal running cds run:
Press Ctrl-C
```
--------------------------------

**TITLE**: Run Configuration (launch.json) Lookup and Workspace Merge Rules

**INTRODUCTION**: This document explains how the Run and Debug view locates launch.json files, how configurations are discovered per workspace root, and how to merge configurations by using multi-root workspaces. Use the examples and JSON snippets to reproduce typical development setups and to programmatically generate or validate workspace and launch configuration files.

**TAGS**: vscode, launch.json, workspace, run-configuration, debug, multi-root

STEP: Behavior of Run and Debug lookup

DESCRIPTION: The Run and Debug view only reads a single launch.json located at <workspace_root>/.vscode/launch.json for each workspace root. It does not traverse into nested folders beneath a workspace root. To include configurations from multiple folders, add those folders as separate workspace roots in a workspace.

LANGUAGE: Plain text

CODE:
```text
Key rules:
- For each workspace root R, VS Code uses: R/.vscode/launch.json
- Nested launch.json files inside subfolders of R are NOT discovered.
- To include configurations from multiple folders, add each folder as a workspace root.
- A subfolder can be added as its own workspace root (even if it's a subfolder of an existing root).
```

STEP: Example file system layout

DESCRIPTION: Use this example layout to test and observe which configurations appear depending on the opened folder or workspace roots.

LANGUAGE: Plain text

CODE:
```text
Example filesystem:
- Folder_One/
  - .vscode/
    - launch.json      <-- contains "Config One"
- Folder_Two/
  - .vscode/
    - launch.json      <-- contains "Config Two"
- Folder_One/Subfolder/
  - .vscode/
    - launch.json      <-- contains "Config Subfolder"
```

STEP: Sample launch.json — Config One (Folder_One/.vscode/launch.json)

DESCRIPTION: Example launch configuration file for Folder_One. When opening Folder_One as the workspace root, only this configuration is shown.

LANGUAGE: JSON

CODE:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Config One",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/folder_one_app.js",
      "console": "integratedTerminal"
    }
  ]
}
```

STEP: Sample launch.json — Config Two (Folder_Two/.vscode/launch.json)

DESCRIPTION: Example launch configuration file for Folder_Two. When opening Folder_Two as the workspace root, only this configuration is shown.

LANGUAGE: JSON

CODE:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Config Two",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/folder_two_app.js",
      "console": "integratedTerminal"
    }
  ]
}
```

STEP: Sample launch.json — Config Subfolder (Folder_One/Subfolder/.vscode/launch.json)

DESCRIPTION: Example launch configuration stored in a subfolder. This configuration is NOT visible when Folder_One is the workspace root because the runner does not traverse into subfolders. It becomes visible only if Subfolder is opened or added as a separate workspace root.

LANGUAGE: JSON

CODE:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Config Subfolder",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/subfolder_app.js",
      "console": "integratedTerminal"
    }
  ]
}
```

STEP: Open single folder scenarios

DESCRIPTION: Behavior when opening folders individually in the editor:
- Open Folder_One => Run and Debug shows only "Config One".
- Open Folder_Two => Run and Debug shows only "Config Two".
- Open Folder_One/Subfolder => Run and Debug shows only "Config Subfolder".

LANGUAGE: Plain text

CODE:
```text
Examples:
- Open Folder_One as workspace root:
  Visible configs => Folder_One/.vscode/launch.json ("Config One")

- Open Folder_Two as workspace root:
  Visible configs => Folder_Two/.vscode/launch.json ("Config Two")

- Open Folder_One/Subfolder as workspace root:
  Visible configs => Folder_One/Subfolder/.vscode/launch.json ("Config Subfolder")
```

STEP: Multi-root workspace — two roots (Folder_One + Folder_Two)

DESCRIPTION: Create a workspace that contains Folder_One and Folder_Two as roots. Both launch.json configurations are merged in the Run and Debug view because each root contains its own .vscode/launch.json.

LANGUAGE: JSON

CODE:
```json
// Example workspace file: example.code-workspace
{
  "folders": [
    { "path": "Folder_One" },
    { "path": "Folder_Two" }
  ],
  "settings": {}
}
```

STEP: Multi-root workspace — three roots (Folder_One + Folder_Two + Subfolder)

DESCRIPTION: Add Folder_One, Folder_Two, and Folder_One/Subfolder as separate workspace roots. All three launch.json files are discovered and displayed because each is at the top of a workspace root's .vscode/launch.json path.

LANGUAGE: JSON

CODE:
```json
// Example workspace file: example-with-subfolder.code-workspace
{
  "folders": [
    { "path": "Folder_One" },
    { "path": "Folder_Two" },
    { "path": "Folder_One/Subfolder" }
  ],
  "settings": {}
}
```

STEP: Notes and actionable checklist

DESCRIPTION: Checklist and actionable rules to implement or validate tooling that manipulates launch configurations or workspaces.

LANGUAGE: Plain text

CODE:
```text
- Ensure any tool that needs to list debug configurations reads ${workspaceRoot}/.vscode/launch.json for each workspace root supplied.
- Do NOT recursively search subfolders of a given workspace root for launch.json.
- To include configurations from multiple folders, add each folder as a root in the .code-workspace file ("folders" array).
- It is valid to add a subfolder as an independent root; its .vscode/launch.json will then be considered.
- Use distinct "name" fields in each launch.json to avoid collisions in the Run and Debug list.
```

STEP: Reference

DESCRIPTION: Official documentation for launch configurations for more details and schema.

LANGUAGE: Plain text

CODE:
```text
Reference: https://code.visualstudio.com/docs/editor/debugging#_launch-configurations
```
--------------------------------

**TITLE**: Use Custom Middlewares with SAP Fiori Tools (ui5.yaml)

**INTRODUCTION**: Configure custom middlewares for the internal Express server used by SAPUI5 Server via ui5.yaml. Common use cases: auto-reload during development, proxying requests to backend systems or different SAPUI5 CDN versions, and serving local static resources. Apply settings and run the project preview with: npx fiori run

**TAGS**: fiori-tools, middleware, SAPUI5, ui5.yaml, proxy, servestatic, appreload, express

STEP: 1 — Application Reload Middleware (Quick start)
DESCRIPTION: Use the application reload middleware to auto-refresh SAP Fiori elements application previews when watched files change. Add this minimal configuration to ui5.yaml and run npx fiori run.
LANGUAGE: YAML
CODE:
```yaml
server:
  customMiddleware:
  - name: fiori-tools-appreload
    afterMiddleware: compression
```

STEP: 2 — Application Reload Middleware Configuration Options
DESCRIPTION: Optional parameters to customize file watching and debug behavior. Default folder is webapp. Use these to adapt to non-standard project layouts.
LANGUAGE: JSON
CODE:
```json
{
  "parameters": [
    {
      "name": "path",
      "type": "string",
      "default": "webapp",
      "description": "Path to be watched. By default, the standard SAPUI5 `webapp` folder is used."
    },
    {
      "name": "ext",
      "type": "string",
      "default": "html, js, json, xml, properties, change",
      "description": "Custom set of file extensions to be watched."
    },
    {
      "name": "port",
      "type": "int",
      "default": 35729,
      "description": "Port used to communicate file system changes."
    },
    {
      "name": "debug",
      "type": "boolean",
      "default": false,
      "description": "Set to true for more log information."
    }
  ]
}
```

STEP: 3 — Proxy Middleware: Connect to a back-end system
DESCRIPTION: Forward requests starting with the configured path to a backend URL. Add to ui5.yaml and run npx fiori run.
LANGUAGE: YAML
CODE:
```yaml
- name: fiori-tools-proxy
  afterMiddleware: compression
  configuration:
    backend:
    - path: /sap
      url: https://my.backend.com:1234
```

STEP: 4 — Proxy Middleware: Connect using a Destination
DESCRIPTION: Provide a destination name to route requests through a named destination configuration.
LANGUAGE: YAML
CODE:
```yaml
- name: fiori-tools-proxy
  afterMiddleware: compression
  configuration:
    backend:
    - path: /sap
      url: https://my.backend.com:1234
      destination: my_backend
```

STEP: 5 — Proxy Middleware: Multiple Back-end Systems
DESCRIPTION: Configure multiple back-end entries to route different path prefixes to different targets.
LANGUAGE: YAML
CODE:
```yaml
- name: fiori-tools-proxy
  afterMiddleware: compression
  configuration:
    backend:
    - path: /northwind
      url: https://my.backend_2.com:1234
    - path: /sap
      url: https://my.backend.com:1234
```

STEP: 6 — Proxy Middleware: ABAP Environment on SAP BTP (scp)
DESCRIPTION: Set scp: true to indicate the target is an ABAP Environment on SAP Business Technology Platform.
LANGUAGE: YAML
CODE:
```yaml
- name: fiori-tools-proxy
  afterMiddleware: compression
  configuration:
    backend:
    - path: /sap
      url: https://my.steampunk.com:1234
      scp: true
```

STEP: 7 — Proxy Middleware: SAP Business Accelerator Hub (apiHub)
DESCRIPTION: Set apiHub: true and provide path/url to connect to SAP Business Accelerator Hub endpoints.
LANGUAGE: YAML
CODE:
```yaml
- name: fiori-tools-proxy
  afterMiddleware: compression
  configuration:
    backend:
    - path: /s4hanacloud
      url: https://api.sap.com
      apiHub: true
```

STEP: 8 — Proxy Middleware: WebSocket Support
DESCRIPTION: Enable ws: true for backend entries that require WebSocket proxying.
LANGUAGE: YAML
CODE:
```yaml
- name: fiori-tools-proxy
  afterMiddleware: compression
  configuration:
    backend:
    - path: /sap
      url: https://my.backend.com:1234
      ws: true
```

STEP: 9 — Proxy Middleware: Change Proxied Path Prefix
DESCRIPTION: Use pathPrefix to rewrite the proxied request path when forwarding to the backend destination.
LANGUAGE: YAML
CODE:
```yaml
- name: fiori-tools-proxy
  afterMiddleware: compression
  configuration:
    backend:
    - path: /services/odata
      pathPrefix: /my/entry/path
      url: https://my.backend.com:1234
      destination: my_backend
```

STEP: 10 — Proxy Middleware: Override SAPUI5 Version (Serve remote SAPUI5)
DESCRIPTION: Configure ui5 settings inside the proxy to change the SAPUI5 CDN and version used when previewing the application.
LANGUAGE: YAML
CODE:
```yaml
- name: fiori-tools-proxy
  afterMiddleware: compression
  configuration:
    ui5:
      path:
      - /resources
      - /test-resources
      url: https://sapui5.hana.ondemand.com
      version: 1.78.0
```

STEP: 11 — Serve Static Middleware: Serve SAPUI5 Locally (Prerequisite)
DESCRIPTION: Download and extract SAPUI5 SDK locally (from https://tools.hana.ondemand.com/#sapui5). Configure serve static to forward requests matching path to a local src folder and run npx fiori run.
LANGUAGE: YAML
CODE:
```yaml
server:
  customMiddleware:
  - name: fiori-tools-servestatic
    afterMiddleware: compression
    configuration:
      paths:
        - path: /resources
          src: "Path/To/SAPUI5-SDK"
        - path: /test-resources
          src: "Path/To/SAPUI5-SDK"
```

STEP: 12 — Serve Static Middleware: Serve Any Local Resources
DESCRIPTION: Serve arbitrary local directories (images, libs, etc.). Requests starting with path are forwarded to the configured src paths.
LANGUAGE: YAML
CODE:
```yaml
server:
  customMiddleware:
  - name: fiori-tools-servestatic
    afterMiddleware: compression
    configuration:
      paths:
        - path: /images
          src: "Path/To/images"
        - path: /libs
          src: "Path/To/libs"
```
--------------------------------

**TITLE**: Use Live Data (Start app and connect to OData service)

**INTRODUCTION**: Start the Fiori application locally to connect to a live OData service. The app launches a preview in the browser (default http://localhost:8080). If the OData endpoint requires authentication, the browser prompts for credentials. If port 8080 is occupied, the next available port is used.

**TAGS**: fiori-tools, OData, npm, live-data, VSCode, SAP-BAS, preview, localhost, port

**STEP**: 1 — Start the application (generic)
**DESCRIPTION**: From the project root, open a terminal and run the start script. This launches the app preview in a browser and connects to the configured OData service endpoint.
**LANGUAGE**: Bash
**CODE**:
```bash
npm start
# Opens preview at http://localhost:8080 (or the next available port if 8080 is in use)
```

**STEP**: 2 — Visual Studio Code: open terminal and start
**DESCRIPTION**: In VS Code open the integrated terminal (via shortcut, menu, or Command Palette), ensure you are in the project's root directory, then run the start command to launch the preview.
**LANGUAGE**: Text
**CODE**:
```text
Open integrated terminal in VS Code:
- Shortcut: Use the [CTRL] + [`] keyboard shortcut (backtick)
- Menu: View > Terminal
- Command Palette: [CMD/CTRL] + [Shift] + [P] -> execute "View: Toggle Integrate Terminal"

In the terminal (project root):
npm start
# The preview of the application starts automatically and connects to the configured OData endpoint.
```

**STEP**: 3 — SAP Business Application Studio: open terminal and start
**DESCRIPTION**: In SAP Business Application Studio open a new terminal from the menu, ensure you are in the project root, then run the start command to launch the preview.
**LANGUAGE**: Text
**CODE**:
```text
Open terminal in SAP Business Application Studio:
- Menu: Terminal > New Terminal

In the terminal (project root):
npm start
# The preview of the application starts automatically and connects to the configured OData endpoint.
```

**STEP**: 4 — Port and preview behavior
**DESCRIPTION**: The app uses port 8080 by default. If port 8080 is already in use, the runtime selects the next available port. The preview opens automatically in a new browser tab.
**LANGUAGE**: Text
**CODE**:
```text
Default preview URL: http://localhost:8080
If 8080 is in use -> example fallback: http://localhost:8081
(The system selects the next available port automatically.)
```

**STEP**: 5 — OData endpoint authentication
**DESCRIPTION**: If the connected OData service requires authentication, the browser will prompt for credentials when the preview attempts to access the endpoint. Provide valid credentials to enable live data requests.
**LANGUAGE**: Text
**CODE**:
```text
If OData endpoint requires authentication:
- Browser will prompt for username/password when accessing the endpoint
- Enter credentials to allow the app to load live data from the OData service
```
--------------------------------

**TITLE**: Start Fiori App Using Local Sources (npm start-local)

**INTRODUCTION**: Instructions to run a Fiori/SAPUI5 application locally using the built-in mock server and a local SAPUI5 library downloaded from npm. Use this to develop and test without a backend. The app preview runs on http://localhost:8080. Modify the SAPUI5 version via ui5-local.yaml in the project root.

**TAGS**: fiori-tools, sapui5, local, npm, mock-server, ui5-local, development, start-local

**STEP**: 1 — Local run overview

**DESCRIPTION**: The app will run on localhost:8080 and use a mock server to emulate the OData endpoint. If needed, a local copy of the SAPUI5 library is downloaded from npmjs. Automatic download is supported only for SAPUI5 versions 1.76 and higher.

**LANGUAGE**: Text

**CODE**:
```text
App preview URL: http://localhost:8080
Mock server: enabled (reflects OData endpoint)
SAPUI5 library: downloaded from npmjs if required
Note: automatic download supported with SAPUI5 >= 1.76
```

**STEP**: 2 — Start locally in Visual Studio Code

**DESCRIPTION**: Open an integrated terminal in VS Code, ensure you are in the project root, and run the start-local script. This launches the app preview and mock server.

- Open terminal in VS Code:
  - Shortcut: Ctrl+` (Windows/Linux) or Cmd+` (macOS)
  - Or use menu: View > Terminal
  - Or open the Command Palette (Ctrl/Cmd+Shift+P) and run: View: Toggle Integrated Terminal
- Confirm you are in the project root (cd to it if needed).
- Run the start-local command.

**LANGUAGE**: Shell

**CODE**:
```bash
# from the project root in VS Code
npm run start-local
```

**STEP**: 3 — Start locally in SAP Business Application Studio

**DESCRIPTION**: In SAP Business Application Studio, open a new terminal, ensure you are in the project root, and run the start-local script. This launches the app preview and mock server.

- Open terminal in Business Application Studio:
  - Menu: Terminal > New Terminal
- Confirm you are in the project root (cd to it if needed).
- Run the start-local command (note different command form in this environment).

**LANGUAGE**: Shell

**CODE**:
```bash
# from the project root in SAP Business Application Studio
npm start-local
```

**STEP**: 4 — Change the SAPUI5 version (ui5-local.yaml)

**DESCRIPTION**: To use a different SAPUI5 library version for the local download, edit the ui5-local.yaml file located in the project root and set the desired version. Save and re-run the local start command to apply changes.

**LANGUAGE**: Text

**CODE**:
```text
File path: ./ui5-local.yaml
Edit the version field in this file to the desired SAPUI5 version.
Example (YAML):
ui5:
  version: "1.96.0"
```
--------------------------------

**TITLE**: Use Mock Data

**INTRODUCTION**: Start your Fiori application locally using a mock OData server so you can develop and preview without a live OData backend. This guide shows prerequisites and exact terminal commands for VS Code and SAP Business Application Studio (BAS). Use the Data Editor to persist generated mock JSON files.

**TAGS**: fiori-tools, mockserver, mock-data, vscode, sap-business-application-studio, npm, odata

**STEP**: Prerequisite — Install MockServer

**DESCRIPTION**: Install MockServer before starting the mock-run command. Follow the installation instructions provided in the repository docs.

**LANGUAGE**: Markdown

**CODE**:
```markdown
See installation instructions: installing-mockserver-2538055.md
```

**STEP**: Optional — Generate persistent .json mock data

**DESCRIPTION**: If you want to export or edit generated mock data as JSON files, use the Data Editor documentation.

**LANGUAGE**: Markdown

**CODE**:
```markdown
See Data Editor: ../Project-Functions/data-editor-18e43b5.md
```

**STEP**: Start mock server and preview (VS Code)

**DESCRIPTION**: Open an integrated terminal in VS Code, ensure you are in the project root, then run the mock start command. The app runs on localhost:8080 (or the next available port if 8080 is in use) and uses a mock server to emulate the OData endpoint. The browser preview opens automatically.

- Open the terminal in VS Code:
  - Use the [CTRL] + [\`] keyboard shortcut (backtick).
  - Or select View > Terminal in the menu.
  - Or execute the `View: Toggle Integrate Terminal` command from the Command Palette ([CMD/CTRL] + [Shift] + [P]).
- Ensure you are in the project root directory.
- Run the start command.

**LANGUAGE**: Shell

**CODE**:
```bash
npm run start-mock
```

**STEP**: Start mock server and preview (SAP Business Application Studio)

**DESCRIPTION**: In SAP Business Application Studio, open a terminal, ensure you are in the project root, and run the same start command. The application uses a mock server to emulate the OData endpoint and runs on localhost:8080 (or the next available port if 8080 is occupied).

- Open the terminal in SAP Business Application Studio:
  - Select Terminal > New Terminal from the menu.
- Ensure you are in the project root directory.
- Run the start command.

**LANGUAGE**: Shell

**CODE**:
```bash
npm run start-mock
```

**STEP**: Runtime notes

**DESCRIPTION**: Key runtime behaviors to expect:
- The app will attempt to run on localhost:8080; if 8080 is already in use, the next available port is selected automatically.
- The mock server reflects the OData endpoint so you can interact with the UI without a live backend.
- If you need persistent mock files, use the Data Editor referenced above.
--------------------------------

**TITLE**: Use Run Control (VS Code & SAP Business Application Studio)

**INTRODUCTION**: Instructions to run a generated SAPUI5 application using the Run Control in Visual Studio Code and SAP Business Application Studio. Covers available run options, required commands, and where to create additional run/launch configurations.

**TAGS**: fiori-tools, sapui5, vscode, business-application-studio, run, npm, run-configuration

**STEP**: 1. Visual Studio Code — Open Run Control

**DESCRIPTION**: Open the Run view in VS Code to see run options and start the application. Use the Run Control for workspace-scoped launch configurations.

- Open Run Control:
  - Shortcut: use the Run view keybinding.
- Note: Run options are specific to the currently open workspace/folder. If you change the open workspace, run options are not available.

**LANGUAGE**: Text

**CODE**:
```text
[CTRL] + [Shift] + [D]
```

**STEP**: 2. Visual Studio Code — Available Run Options and Actions

**DESCRIPTION**: Select one of the Run Control options shown in VS Code. Each option starts the generated project with a specific configuration:

- Start <project name> — Runs the application using the SAPUI5 version selected during project generation.
- Start <project name> with SAPUI5 Version — Prompts to select an SAPUI5 version from a list; after selection the application starts automatically.
- Start <project name> Mock — Runs the application using mock data by executing the npm script `start-mock`. Only available in ODataOData V2 service.
- Start <project name> Mock with SAPUI5 Version — Runs using mock data and prompts for an SAPUI5 version selection (then starts automatically). Only available in ODataOData V2 service.
- Start <project name> Local — Runs the application using mock data against a local copy of the SAPUI5 library selected during generation.

To add or customize launch configurations, see the VS Code run configuration guide at:
create-a-new-run-configuration-in-visual-studio-code-3b1f37e.md

**LANGUAGE**: Shell

**CODE**:
```shell
npm run start-mock
```

**STEP**: 3. SAP Business Application Studio — Open Run Configuration Pane

**DESCRIPTION**: Open the Run Configuration pane in SAP Business Application Studio to view and run available configurations.

- Open Run Configuration:
  - Click the left-side Run Configuration icon: <span class="SAP-icons-V5"></span> (*Run Configuration*).
  - Or use main menu: View > Run Configuration.

**LANGUAGE**: Text

**CODE**:
```text
Click the Run Configuration icon: <span class="SAP-icons-V5"></span>
Or use View > Run Configuration
```

**STEP**: 4. SAP Business Application Studio — Available Run Options and Actions

**DESCRIPTION**: Select one of the run configurations in the Run Configuration pane and click the Run Module icon (<span class="SAP-icons-V5"></span>) to start the application.

Available run options in SAP Business Application Studio:

- Start <project name> — Runs the application using the SAPUI5 version selected during generation.
- Start <project name> Mock — Runs the application using mock data by executing the npm script `start-mock`. Only available in ODataOData V2 service.
- Start <project name> Local — Runs the application using mock data against a local copy of the SAPUI5 library selected during generation.

To create or customize run configurations in Business Application Studio, see:
create-a-new-run-configuration-in-sap-business-application-studio-05f2a9e.md

**LANGUAGE**: Shell

**CODE**:
```shell
npm run start-mock
```
--------------------------------

**TITLE**: Application Information — SAP Fiori elements project overview and quick actions

**INTRODUCTION**: The Application Information page launches automatically after generating a SAP Fiori elements project. Use this page to inspect project metadata, resolve dependency issues, access common Fiori Tools commands, and open learning resources. You can re-open this page any time via the Fiori command and run project validation at any time.

**TAGS**: fiori-tools, sap-fiori, sapui5, application-info, project-validation

**STEP**: 1 — Page assets (HTML include)

**DESCRIPTION**: Ensure the SAP icon stylesheet is available to render icons used on the Application Information page (icon reference used for the Page icon). This is the HTML include used by the page.

**LANGUAGE**: HTML

**CODE**:
```html
<!-- loioc3e0989caf6743a88a52df603f62a52a -->

<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>
```

**STEP**: 2 — Understand the page sections and actions

**DESCRIPTION**: The Application Information page contains four actionable sections. Use these to navigate and perform common project tasks:
- Project Detail: Displays project type, SAPUI5 version, backend, and pages. Click the Page icon to open the Configure Page Elements documentation.
  - Page icon used: <span class="SAP-icons-V5"></span> (Page)
  - Documentation path: ../Developing-an-Application/configure-page-elements-047507c.md
- Status: Summarizes dependencies with direct links to fix issues.
- What you can do: Quick links to relevant SAP Fiori Tools commands.
- What you can learn: Links to help topics and support contacts.

Use the Configure Page Elements document to edit page elements after inspecting Project Detail.

**LANGUAGE**: Markdown / Path

**CODE**:
```
Configure Page Elements doc:
../Developing-an-Application/configure-page-elements-047507c.md
```

**STEP**: 3 — Reopen the Application Information page

**DESCRIPTION**: Run the VS Code command to relaunch the Application Information page at any time. Open the Command Palette (Ctrl/Cmd+Shift+P) and execute the following command.

**LANGUAGE**: Plaintext / Command

**CODE**:
```
Fiori: Open Application Info
```

**STEP**: 4 — Run Project Validation

**DESCRIPTION**: Perform project validation at any time to verify project consistency and surface dependency issues. Use the Project Validation documentation for details on running and interpreting validation results.

**LANGUAGE**: Markdown / Path

**CODE**:
```
Project Validation doc:
project-validation-6f3c737.md
```
--------------------------------

**TITLE**: Configure SAPUI5 Version for an Application (manifest.json, Preview, and Deployment)

**INTRODUCTION**: Short, actionable instructions for setting and controlling the SAPUI5 version used by an application during development (manifest.json), preview, and deployment (ABAP and Cloud Foundry). Includes exact file paths, command names, and code snippets to modify behavior.

**TAGS**: sapui5, manifest.json, minUI5Version, preview, deployment, index.html, xs-app.json, mta.yaml, cloud-foundry, abap, fiori-tools, @sap/ux-specification, @sap/ux-ui5-tooling

STEP: 1 — Set Minimum SAPUI5 Version in manifest.json
DESCRIPTION: Edit the application descriptor to declare the minimum SAPUI5 version required at runtime. This enforces the runtime feature set, triggers deployment warnings if the target system lacks the required version, and is used by tooling to select the matching @sap/ux-specification module.
LANGUAGE: JSON
CODE:
```JSON
{
  "sap.ui5": {
    "dependencies": {
      "minUI5Version": "1.120.4"
    }
  }
}
```

STEP: 2 — Change Minimum SAPUI5 Version via Fiori Tools
DESCRIPTION: Use the VS Code command "Fiori: Change Minimum SAPUI5 Version" to update minUI5Version. This command will update manifest.json and will adjust the installed @sap/ux-specification module if a different version is needed to match the selected minimum SAPUI5 version. The generator initially sets minUI5Version when creating the project.
LANGUAGE: Text
CODE:
```text
Command: Fiori: Change Minimum SAPUI5 Version
Effect: Updates sap.ui5.dependencies.minUI5Version in manifest.json and updates @sap/ux-specification if required.
```

STEP: 3 — Control SAPUI5 Version for Local Preview
DESCRIPTION: By default, the preview uses the manifest.json minUI5Version. To use a different SAPUI5 version for preview, create or edit a run configuration. The default preview source is https://ui5.sap.com; if the requested version is not available there, the next higher available version is used. To change preview sources or default preview versions, configure @sap/ux-ui5-tooling in the project.
LANGUAGE: Text
CODE:
```text
Default preview source: https://ui5.sap.com
Behavior: If requested version not found, next higher available version is used.
Tooling to configure: @sap/ux-ui5-tooling
```

STEP: 4 — Deployed Version: ABAP Environment (Embedded in SAP Fiori launchpad)
DESCRIPTION: Applications embedded in the SAP Fiori launchpad on ABAP use the SAPUI5 version deployed in the backend. Ensure your project uses the same SAPUI5 version as the backend to avoid runtime compatibility issues.
LANGUAGE: Text
CODE:
```text
Behavior: Embedded in launchpad -> uses SAPUI5 version from backend (ABAP).
Recommendation: Use same minUI5Version in project as backend SAPUI5 version.
```

STEP: 5 — Deployed Version: ABAP Environment (Standalone index.html)
DESCRIPTION: If running standalone (deployed index.html), the SAPUI5 loader path in index.html controls which SAPUI5 resources are loaded. Projects generated by the SAP Fiori Generator include an index.html with a relative path (loads backend resources). To load a specific version from ui5.sap.com, change the src to an absolute URL containing the version.
LANGUAGE: HTML
CODE:
```HTML
<!-- Relative path: loads SAPUI5 resources from backend -->
<script id="sap-ui-bootstrap" src="resources/sap-ui-core.js">

<!-- Absolute path: loads SAPUI5 version 1.114.12 from ui5.sap.com -->
<script id="sap-ui-bootstrap" src="https://ui5.sap.com/1.114.12/resources/sap-ui-core.js">
```

STEP: 6 — Deployed Version: Cloud Foundry — SAP Build Work Zone
DESCRIPTION: Applications deployed to Cloud Foundry and running in SAP Build Work Zone run in an iframe and use the SAPUI5 version provided by the backend. No local change needed; follow platform guidance for configuring backend SAPUI5.
LANGUAGE: Text
CODE:
```text
Behavior: SAP Build Work Zone -> application runs in iframe -> uses backend SAPUI5 version.
```

STEP: 7 — Deployed Version: Cloud Foundry — Standalone (xs-app.json route)
DESCRIPTION: For standalone Cloud Foundry deployments, the "Fiori: Add Deployment Configuration" command adds a route to xs-app.json that proxies /resources/* to a ui5 destination. Keep or modify this route to control how SAPUI5 resources are served.
LANGUAGE: JSON
CODE:
```JSON
{
  "routes": [
    {
      "source": "^/resources/(.*)$",
      "target": "/resources/$1",
      "authenticationType": "none",
      "destination": "ui5"
    }
  ]
}
```

STEP: 8 — Deployed Version: Cloud Foundry — Standalone (mta.yaml destination)
DESCRIPTION: The deployment configuration commonly adds an instance-based destination in mta.yaml that points to https://ui5.sap.com. By default this lets the app use the latest SAPUI5 version. Change the URL in the destination or replace the instance-level destination with an account-level destination to pin or alter the SAPUI5 version.
LANGUAGE: YAML
CODE:
```YAML
instance:
  destinations:
    - Authentication: NoAuthentication
      Name: ui5
      ProxyType: Internet
      Type: HTTP
      URL: https://ui5.sap.com
```

STEP: 9 — How to Pin or Change Deployed SAPUI5 Version (Actions to take)
DESCRIPTION: Actions to control the SAPUI5 version used at runtime:
- ABAP embedded: align project minUI5Version with backend SAPUI5.
- ABAP standalone: edit index.html sap-ui-bootstrap src to point to a specific ui5.sap.com version or relative backend path.
- Cloud Foundry standalone: edit xs-app.json route and change the destination in mta.yaml (URL) or create an account-level destination in SAP BTP that points to a specific ui5.sap.com version or hosted SAPUI5.
- Preview: create run configuration or configure @sap/ux-ui5-tooling to set preview server and default version.
LANGUAGE: Text
CODE:
```text
ABAP embedded -> use backend SAPUI5 version.
ABAP standalone -> edit index.html -> set src to https://ui5.sap.com/<version>/resources/sap-ui-core.js
Cloud Foundry standalone -> update xs-app.json and mta.yaml destination to point to desired SAPUI5 URL or configure account-level destination in SAP BTP.
Preview -> use run configuration or @sap/ux-ui5-tooling to change preview source/version.
```
--------------------------------

**TITLE**: Fiori Tools — Data Editor: Generate, Edit, and Persist Mock Data

**INTRODUCTION**: Quick reference for using the Fiori Tools Data Editor to generate mock data from metadata, persist mock data to JSON under /webapp/localService/mockdata, edit data, enable live updates via ui5-mock.yaml, and how manifest.json dataSource metadata maps to the generated mock files. Use this for automating or scripting workflows around mock-data generation and local testing.

**TAGS**: fiori-tools, mock-server, ui5, mockdata, manifest.json, ui5-mock.yaml, Data Editor

**STEP**: 1 — Start mock server (interactive preview)
**DESCRIPTION**: Start the Fiori Tools mock server for previewing the app using the provided npm script. Ensure the mock server is configured before running this command.
**LANGUAGE**: Shell
**CODE**:
```bash
npm run start-mock
```

**STEP**: 2 — Stop running mock server
**DESCRIPTION**: Stop the running mock server from the terminal.
**LANGUAGE**: Keyboard
**CODE**:
```text
Press Ctrl + C
```

**STEP**: 3 — Open Data Editor and persist generated mock data
**DESCRIPTION**: Right-click your project in the IDE and select "Open Data Editor". The Data Editor reads the metadata.xml referenced in manifest.json (under dataSources) and generates mock data based on property types. When you persist data from the Data Editor, JSON files are written under /webapp/localService/mockdata as Entity.json files.
**LANGUAGE**: —
**CODE**:
```text
Generated mock data path:
  /webapp/localService/mockdata/*.json
```

**STEP**: 4 — manifest.json mapping to metadata
**DESCRIPTION**: Ensure manifest.json declares the metadata file location for the service under dataSources. The Data Editor uses that metadata reference to generate mock entities and properties.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "sap.app": {
    "id": "your.app.id",
    "applicationVersion": { "version": "1.0.0" }
  },
  "sap.ui5": {
    "models": {},
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata/sap/YOUR_SERVICE_SRV/",
        "type": "OData",
        "settings": {
          "localUri": "localService/metadata.xml"
        }
      }
    }
  }
}
```

**STEP**: 5 — Add ui5-mock.yaml watch parameter for live updates
**DESCRIPTION**: When the mock server is running and you edit persisted JSON files, the canvas can be updated live by enabling watch in ui5-mock.yaml. Add the watch: true parameter to the file. The minimal example below shows where to place it.
**LANGUAGE**: YAML
**CODE**:
```yaml
# ui5-mock.yaml (add or update)
server:
  # When set true, UI5 tools watch for changes and refresh the mock server/canvas
  watch: true
```

**STEP**: 6 — Edit mock data using the Data Editor UI
**DESCRIPTION**: Use the Data Editor table UI to edit mock data directly. Double-click an editable cell to change the value. Primary keys and foreign keys are not editable. Changes made in the Data Editor are persisted automatically to the corresponding JSON files under /webapp/localService/mockdata.
**LANGUAGE**: —
**CODE**:
```text
Editing rules:
- Double-click a cell to edit (except PKs and FKs)
- Add Row: Click "Add Row" -> related FK entities get rows automatically
- Delete Row: Select row and click "Delete Row" -> related FK entities are deleted automatically
```

**STEP**: 7 — Edit mock JSON files directly and refresh
**DESCRIPTION**: You can edit the generated Entity.json files directly in /webapp/localService/mockdata. If the mock server is not running, changes in the Data Editor are reflected in JSON automatically. If the mock server is running and you edit JSON files manually, either enable server watch (see Step 5) or click Refresh in the Data Editor UI to update the canvas.
**LANGUAGE**: —
**CODE**:
```text
File path example:
  /webapp/localService/mockdata/EntityName.json
Actions:
- Edit JSON -> Data Editor "Refresh" (if mock server not watching)
- Or enable server watch: ui5-mock.yaml server.watch: true
```

**STEP**: 8 — Search mock data in Data Editor
**DESCRIPTION**: Use the search control in the Data Editor header to find mock rows. Type search criteria, then select the matching row from the drop-down table; the selected row is highlighted in the Data Editor table.
**LANGUAGE**: —
**CODE**:
```text
Search steps:
1. Click Search input in Data Editor header
2. Enter search criteria
3. Select the matching row from the drop-down; it will be highlighted
```

**STEP**: 9 — Show / Hide properties in the Data Editor table
**DESCRIPTION**: Control which entity properties appear in the Data Editor table via "Show Properties" in the header. Use the popup to toggle property visibility and save the selection. Some property groups are hidden by default and must be enabled here. Use the popup search box to quickly find properties to show/hide.
**LANGUAGE**: —
**CODE**:
```text
Show Properties steps:
1. Click "Show Properties" in Data Editor header
2. Check properties to display or uncheck to hide
3. Click "Save"
Notes:
- Some groups are hidden by default; use the popup search to find specific properties
```
--------------------------------

**TITLE**: Delete a SAP Fiori Application from a CAP Project (VS Code)

**INTRODUCTION**: Delete a SAP Fiori application scaffolded inside an SAP CAP project (generated with SAP Fiori elements or freestyle SAPUI5). The VS Code command removes the application's folder and reverts global-file changes (for example, removes invalid annotation references). Use this procedure to safely remove an application and its global references.

**TAGS**: fiori-tools, CAP, SAPFiori, SAPUI5, VSCode, delete-application

**STEP**: 1 — Open Command Palette and run delete command

**DESCRIPTION**: Open the VS Code Command Palette and execute the Fiori delete command for CAP projects.

**LANGUAGE**: Bash

**CODE**:
```bash
# Open the VS Code Command Palette (keyboard):
# macOS:
CMD + Shift + P
# Windows/Linux:
Ctrl + Shift + P

# In the Command Palette type and run:
Fiori: Delete Application from CAP project
```

**STEP**: 2 — Choose the application to delete

**DESCRIPTION**: From the dropdown list that appears after running the command, select the application you want to remove. The command targets applications detected in the current CAP project workspace.

**LANGUAGE**: Plain Text

**CODE**:
```text
# Dropdown selector shows available applications in the CAP project.
# Select the target application name (example):
my-fiori-app
```

**STEP**: 3 — Confirm deletion in dialog

**DESCRIPTION**: A confirmation dialog appears with the exact application name. Confirm to delete the application folder and revert global file changes. The dialog text and options are as follows:

- Dialog message: Do you really want to delete application <application_name>?
- Options: Yes, No, Cancel

Click "Yes" to proceed. "No" or "Cancel" aborts the operation.

**LANGUAGE**: Plain Text

**CODE**:
```text
# Confirmation dialog:
Do you really want to delete application <application_name>?

# Buttons:
[ Yes ]   [ No ]   [ Cancel ]

# Behavior:
# - Yes: deletes the application's folder and reverts changes in global files (e.g., removes invalid annotation references).
# - No / Cancel: aborts deletion; no changes are made.
```

**STEP**: 4 — Post-deletion considerations

**DESCRIPTION**: After deletion, verify repository state and project files:
- Ensure the application folder is removed.
- Check global files (manifest, annotations, project configuration) for reverted or removed references.
- Commit changes if using version control.

**LANGUAGE**: Plain Text

**CODE**:
```text
# Post-deletion checklist:
- Confirm folder <project_root>/<application_folder> is deleted.
- Validate global files (e.g., manifest.json, annotations) no longer reference the deleted app.
- Run project build or tests if needed.
- Commit changes to version control.
```

**STEP**: Tip / Reference

**DESCRIPTION**: Additional information about CAP projects.

**LANGUAGE**: Plain Text

**CODE**:
```text
# CAP documentation:
https://cap.cloud.sap/docs/about/
```
--------------------------------

**TITLE**: SAP Fiori tools — Environment Check (BAS and VS Code)

**INTRODUCTION**: Use the SAP Fiori tools Environment Check to generate diagnostics reports for destination issues (SAP Business Application Studio) and to gather development environment details (Business Application Studio and Visual Studio Code). Reports can be viewed, copied to clipboard, or saved as a .zip file for SAP Product Support.

**TAGS**: fiori-tools, environment-check, diagnostics, destinations, BAS, VSCode, troubleshooting, npm, generator

STEP: 1 — Open Environment Check command

DESCRIPTION: Open the Environment Check UI from the editor command palette. This single command is the entry point for both Destination Checks and Gather Environment Information workflows.

LANGUAGE: Text

CODE:
```text
Command Palette:
- macOS: ⌘ + ⇧ + P
- Windows/Linux: Ctrl + Shift + P

Type and run:
Fiori: Open Environment Check
```

STEP: 2 — Destination Checks (SAP Business Application Studio)

DESCRIPTION: Generate a destination-specific diagnostic report in SAP Business Application Studio. The report includes environment metadata and destination diagnostics useful for troubleshooting connectivity and destination configuration issues. Use this workflow when you need destination parameters, raw destination logs, or a consolidated .zip report to send to SAP Product Support.

LANGUAGE: Text

CODE:
```text
1. Open Command Palette and run:
   Fiori: Open Environment Check

2. In the Environment Check UI:
   - Click "Create destination"
   - Select a destination from the dropdown
   - If prompted, enter your credentials
   - Click "View the results" to open the report in the UI
   - OR click "View and Save results" to both open and download a .zip file containing the report (suitable for sending to SAP Product Support)

Report sections included:
- Environment: Dev Space type, Node version, and other environment metadata
- Destination Details: chosen destination parameters and diagnostics
- All Destination Details: list of all destinations and their properties available to the user in the current subaccount
- Messages: raw log messages for the chosen destination (useful for SAP Product Support)
```

STEP: 3 — Gather Environment Information (BAS and Visual Studio Code)

DESCRIPTION: Create an environment report that lists installed SAP Fiori application generator version, installed npm packages, and other development environment details. Use this when troubleshooting local dev setup or when asked by Product Support for environment metadata.

LANGUAGE: Text

CODE:
```text
1. Open Command Palette and run:
   Fiori: Open Environment Check

2. In the Environment Check UI:
   - Click "Gather environment information"
   - Click "View and Copy results" to copy the report output to your clipboard
   - OR click "View and Save results" to both view and download a .zip file containing the environment report (suitable for sending to SAP Product Support)

Report content typically includes:
- SAP Fiori application generator version
- List of installed npm packages and versions
- Node version and environment metadata
- Any additional diagnostic messages relevant to the dev environment
```
--------------------------------

**TITLE**: Access the SAP Fiori Tools Information Panel (v1.11.4)

**INTRODUCTION**: This document explains how to open the Information Panel introduced in SAP Fiori tools v1.11.4. The panel provides release notes, learning resources for SAP Fiori elements, tutorials, and customer support links. Use these concise steps to automate UI-guided instructions or include them as UI test/check steps.

**TAGS**: fiori-tools, SAP Fiori, information-panel, release-notes, tutorials, support

**STEP**: 1 — Open SAP Fiori Activity

**DESCRIPTION**: From the left-side activity toolbar, select the SAP Fiori activity. This reveals the SAP Fiori activity view where the Information Panel can be found. The activity icon is a wrench/pencil. Preserve the icon reference for UI matching or automated element identification.

**LANGUAGE**: Markdown

**CODE**:
```markdown
1. On the activity toolbar from the left side, click *SAP Fiori* (![Wrench/Pencil icon](../Getting-Started-with-SAP-Fiori-Tools/images/SAP_Fiori_tools_Wrench_Pencil_9d6b0f8.png)).
```

**STEP**: 2 — Expand the Information Panel

**DESCRIPTION**: After opening the SAP Fiori activity view, expand the Information Panel to access release notes, links to learn about SAP Fiori elements developments, tutorials, and customer support information. Use this step in UI automation scripts or documentation-driven workflows to validate presence of the information panel and its contents.

**LANGUAGE**: Markdown

**CODE**:
```markdown
2. Expand the information panel.
```

**STEP**: Panel Contents Summary

**DESCRIPTION**: Use this summary to verify or programmatically check the expected content within the Information Panel in v1.11.4.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "version": "1.11.4",
  "panel_contents": [
    "Release notes",
    "Useful links to learn about SAP Fiori elements developments",
    "Links to tutorials",
    "Information about how to get support as a customer"
  ],
  "icon_reference": "../Getting-Started-with-SAP-Fiori-Tools/images/SAP_Fiori_tools_Wrench_Pencil_9d6b0f8.png"
}
```
--------------------------------

**TITLE**: Managing SAP System Connections in VS Code (Connection Manager)

**INTRODUCTION**: Save and reuse remote SAP system connection information inside Visual Studio Code to speed up authentication when using SAP/Fiori development tools. This guide covers installing the Connection Manager extension, adding connections, an example connection JSON schema, and a secure-secret pattern for storing credentials programmatically.

**TAGS**: fiori-tools, sap, vscode, sap-systems, connections, extension

**STEP**: 1 — Install the SAP Systems Connection Manager extension

**DESCRIPTION**: Install the official Connection Manager extension from the VS Code Marketplace to enable storing and reusing SAP system connection details. Use VS Code GUI or install from the command line.

**LANGUAGE**: Shell

**CODE**:
```bash
# Install via VS Code CLI (Marketplace extension id matches the link)
code --install-extension SAPOSS.sap-ux-sap-systems-ext

# Marketplace URL (open in browser or copy/paste)
https://marketplace.visualstudio.com/items?itemName=SAPOSS.sap-ux-sap-systems-ext
```

**STEP**: 2 — Open the Connection Manager UI

**DESCRIPTION**: Open the extension UI to manage connections. Use the Extensions view (Activity Bar) to find "SAP Systems", or use the Command Palette (Ctrl/Cmd+Shift+P) and type "SAP Systems" to reveal available commands provided by the extension. From the extension UI you can add, edit, remove, and select saved SAP systems for use by other tools.

**LANGUAGE**: Plain text

**CODE**:
```text
# Example interaction (use VS Code UI):
# 1. Ctrl/Cmd+Shift+P
# 2. Type "SAP Systems" and select the Connection Manager command shown by the extension
# 3. Use the UI to Add New Connection -> fill host, port/system number, client, user, and auth method
```

**STEP**: 3 — Example connection JSON schema (for programmatic seeding or reference)

**DESCRIPTION**: Example JSON structure showing typical fields used to represent a saved SAP system connection. Use this as a template if you programmatically generate connection entries or document expected fields. Do NOT store plaintext secrets in public files.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "id": "DEV01",
  "name": "SAP DEV System",
  "host": "sapdev.example.com",
  "port": 3300,
  "systemNumber": "00",
  "client": "100",
  "user": "DEVELOPER",
  "auth": {
    "type": "password",
    "passwordPlaceholder": "<DO NOT STORE PLAINTEXT>"
  },
  "description": "Development system used for Fiori app preview and deployment"
}
```

**STEP**: 4 — Securely store and retrieve secrets (VS Code extension pattern)

**DESCRIPTION**: When writing automation or extensions that register SAP connections, store credentials in VS Code SecretStorage instead of plaintext files. Example TypeScript snippets show how to save and retrieve a password securely in a VS Code extension activation context.

**LANGUAGE**: TypeScript

**CODE**:
```ts
// Save a password securely (inside your extension's activate(context) scope)
await context.secrets.store('sapPassword:DEV01', 'super-secret-password');

// Retrieve a password
const password = await context.secrets.get('sapPassword:DEV01');

// Remove a password
await context.secrets.delete('sapPassword:DEV01');
```

**STEP**: 5 — Use saved connections with Fiori / development tools

**DESCRIPTION**: After adding connections to the Connection Manager, select the desired saved system in your Fiori tools workflows (preview, deploy, transport operations). The extension integration allows other SAP extensions and tools to enumerate and reuse these saved connections.

**LANGUAGE**: Plain text

**CODE**:
```text
# Typical workflow after saving a connection:
# 1. Open your Fiori project in VS Code
# 2. Invoke Fiori tooling commands (preview, deploy) that prompt for a target system
# 3. Choose the saved connection from the Connection Manager list to authenticate quickly
```
--------------------------------

**TITLE**: Managing Service and Annotation Files for SAP Fiori tools

**INTRODUCTION**: Practical, action-oriented guidance for adding, refreshing, deleting OData services and managing local OData annotation files in SAP Fiori tools projects. Use these steps to keep the project's local metadata and annotations synchronized with back-end changes and to control annotation file precedence and activation.

**TAGS**: fiori-tools, OData, annotations, manifest.json, metadata.xml, ui5.yaml, service-manager, annotation-file-manager, SAP Fiori

**STEP**: Prerequisites and important notes

**DESCRIPTION**: Before performing service or annotation operations, confirm project type and scope. Key constraints and recommendations:
- Service add/refresh/delete operations are supported only for SAP Fiori elements overview page floorplan and freestyle SAPUI5 projects.
- Annotation management applies to OData services only (not CAP CDS).
- After any back-end metadata or annotation changes, always refresh the local copy to avoid runtime or Application Modeler errors.

**LANGUAGE**: text

**CODE**:
```text
Files referenced by the tooling:
- manifest.json
- <project-root>/localService/<ServiceName>/metadata.xml
- <project-root>/localService/<ServiceName>/annotations/*.xml
- ui5*.yaml
```

**STEP**: Add a service to the project

**DESCRIPTION**: Add a local copy of an OData service (metadata + back-end annotations) to the project. This creates a service folder under the project and adds metadata and annotation files for local editing and preview.

Action:
1. Right-click the manifest.json file for your application.
2. Select "Service Manager".
3. Click "Add Service".
4. Choose Connection Type:
   - Destination (SAP Business Application Studio): select server destination; provide credentials if required.
   - SAP System (Visual Studio Code): select SAP System; provide credentials if required.
   - Hostname: provide server hostname, SAP Client, username, password if required.
5. Specify the OData service URL:
   - Enter the Service URL manually, or
   - Fetch services from the server catalog and pick from the dropdown.
6. Click "Add". The tooling creates a local service folder with metadata.xml and any back-end annotation XML files.

**LANGUAGE**: text

**CODE**:
```text
Example added assets (created by tooling):
<project-root>/
  localService/
    <ServiceName>/
      metadata.xml
      annotations/
        <BackEndAnnotation1>.xml
        <BackEndAnnotation2>.xml
  manifest.json
  ui5*.yaml   # updated with routing/mockserver entries for the service (if applicable)
```

**STEP**: Refresh a service from the server

**DESCRIPTION**: Pull updated metadata and annotations from the back end into the project's local copy. Use "Refresh" to update only the local files. Use "Refresh & Save" to update local files and persist changes to UI5 YAML files.

Action:
1. Right-click manifest.json.
2. Select "Service Manager".
3. Click the pencil (edit) icon next to the service to refresh.
4. Choose Connection Type (Destination, SAP System, or Hostname) and provide credentials if required.
5. Click:
   - "Refresh" — updates local metadata.xml and annotation files.
   - "Refresh & Save" — updates local metadata/annotations and saves changes into ui5*.yaml (UI5 project files).

Recommendation: Refresh the service whenever the back-end metadata or annotations change (new properties, annotations, entity set changes) to avoid errors in Application Modeler and Annotation LSP.

**LANGUAGE**: text

**CODE**:
```text
Refreshed assets (example result):
<project-root>/localService/<ServiceName>/metadata.xml      # updated
<project-root>/localService/<ServiceName>/annotations/*.xml # updated
ui5*.yaml                                                  # optionally updated with Refresh & Save
```

**STEP**: Delete a service from the project

**DESCRIPTION**: Remove the local copy of the service and related files and remove any generated back-end routing and mockserver configuration in ui5*.yaml.

Action:
1. Right-click manifest.json.
2. Select "Service Manager".
3. Click the trash (delete) icon for the service.

Result:
- Deletes metadata.xml, related annotation XML files, and mockdata from the project.
- Removes back-end routing and mockserver entries specific to the deleted service from ui5*.yaml.

**LANGUAGE**: text

**CODE**:
```text
Deleted assets (example):
Removed:
  <project-root>/localService/<ServiceName>/metadata.xml
  <project-root>/localService/<ServiceName>/annotations/*.xml
  <project-root>/localService/<ServiceName>/mockdata/
Updated:
  ui5*.yaml  # back-end routing and mockserver entries for <ServiceName> removed
```

**STEP**: Open the Annotation File Manager

**DESCRIPTION**: Launch the Annotation File Manager to view and manage local annotation files associated with a specific OData service.

Action:
1. Right-click manifest.json.
2. Select "Annotation File Manager".
3. Select the target service from the dropdown.

Alternative: From the Annotation List View, click "Annotation Hierarchy" for a specific projection or property to open the manager for that context.

**LANGUAGE**: text

**CODE**:
```text
Open:
Right-click -> Annotation File Manager -> select <ServiceName>
```

**STEP**: Create a local annotation file

**DESCRIPTION**: Create a new local annotation XML file for the selected service. The new file appears in the Annotation File Manager and Annotation List View.

Action:
1. Right-click manifest.json -> Annotation File Manager.
2. Select the target service.
3. Click "Create Local Annotation File".
4. Provide required criteria (file name, target entity/projection, etc.).
5. Click "Create".

**LANGUAGE**: text

**CODE**:
```text
New file example:
<project-root>/localService/<ServiceName>/annotations/<NewLocalAnnotation>.xml
```

**STEP**: Change the hierarchy (precedence) of local annotation files

**DESCRIPTION**: Reorder local annotation files to control precedence. The Annotation File Manager uses the order that mirrors manifest.json precedence rules: the highest-ranked file in the manager table is listed at the bottom (matching manifest.json precedence).

Action:
1. In the Annotation File Hierarchy view, use the Move Up and Move Down icons to reorder files.

**LANGUAGE**: text

**CODE**:
```text
Annotation precedence (visualized in manager):
Top (applied last / highest precedence)  <-- represented at bottom of table
...
Bottom (applied first / lowest precedence)
```

**STEP**: Activate or deactivate a local annotation file

**DESCRIPTION**: Enable or disable a local annotation file so it is included or excluded from the annotation hierarchy.

Action:
1. Right-click manifest.json -> Open Annotation File Manager.
2. In the manager table, check or clear the checkbox in the "active" column for the target file.

Note: Deactivated files are not considered part of the annotation hierarchy and will not affect UI behavior.

**LANGUAGE**: text

**CODE**:
```text
Activation state example (manager UI):
[ ] <project-root>/localService/<ServiceName>/annotations/<Deactivated>.xml
[x] <project-root>/localService/<ServiceName>/annotations/<Active>.xml
```

**STEP**: Delete an annotation file

**DESCRIPTION**: Remove a local annotation XML file from the project and the Annotation File Manager.

Action:
1. In the Annotation File Manager select (activate) the checkbox for the target annotation file.
2. Click the trash (delete) icon next to the annotation file.

**LANGUAGE**: text

**CODE**:
```text
Removed file example:
<project-root>/localService/<ServiceName>/annotations/<DeletedAnnotation>.xml  # removed
```
--------------------------------

**TITLE**: Project Functions (SAP Fiori tools)

**INTRODUCTION**: This document lists available project functions provided by SAP Fiori tools. Each entry points to its detailed documentation file. Use these references to implement, automate, or generate code around Fiori project functionality (UI service generation, data editing, validation, system connection management, etc.). Open the linked markdown files to read full instructions and examples for each function.

**TAGS**: fiori-tools, sap, project, functions, documentation, ui, validation, services

**STEP**: 1 — Information Panel

**DESCRIPTION**: Open and review the Information Panel documentation to learn how to display project metadata or extension-specific panels in Fiori tools. Use the file as the canonical source when generating UI or editor extensions that surface project information.

**LANGUAGE**: Markdown

**CODE**:
```bash
# Open the documentation file (relative path)
./information-panel-a9a6c4b.md

# Example: open in VS Code
code ./information-panel-a9a6c4b.md
```

**STEP**: 2 — Application Information

**DESCRIPTION**: Read the Application Information doc to obtain details about application metadata, manifest properties, and recommendations for exposing application-level information programmatically. Use it to generate code that reads/writes manifest and metadata.

**LANGUAGE**: Markdown

**CODE**:
```bash
./application-information-c3e0989.md
code ./application-information-c3e0989.md
```

**STEP**: 3 — Reuse Library Support

**DESCRIPTION**: Use this file to implement or automate reuse library integration. It details how to reference and embed reusable components, annotations, and resources. Consult it when generating import/registration logic for shared libraries.

**LANGUAGE**: Markdown

**CODE**:
```bash
./reuse-library-support-6e99fbb.md
code ./reuse-library-support-6e99fbb.md
```

**STEP**: 4 — Data Editor

**DESCRIPTION**: The Data Editor documentation explains editing project data artifacts (mock data, local files). Reference it when producing tooling or scripts that read/write application data files or provide editor functionality.

**LANGUAGE**: Markdown

**CODE**:
```bash
./data-editor-18e43b5.md
code ./data-editor-18e43b5.md
```

**STEP**: 5 — Deleting an Application in CAP Project

**DESCRIPTION**: Follow this doc for safe removal of application modules in CAP projects. Use the documented steps to generate cleanup scripts that remove artifacts, update cds files, and maintain project integrity.

**LANGUAGE**: Markdown

**CODE**:
```bash
./deleting-an-application-in-cap-project-709f838.md
code ./deleting-an-application-in-cap-project-709f838.md
```

**STEP**: 6 — Environment Check

**DESCRIPTION**: Review environment prerequisites and checks. Integrate these checks into CI/CD or local dev setup scripts to validate prerequisites before running Fiori tooling operations.

**LANGUAGE**: Markdown

**CODE**:
```bash
./environment-check-75390cf.md
code ./environment-check-75390cf.md
```

**STEP**: 7 — Managing SAP System Connections

**DESCRIPTION**: This doc explains how to configure and manage SAP backend connections. Use it to generate connection configuration files, secure storage logic, or connection validators that your tooling will use.

**LANGUAGE**: Markdown

**CODE**:
```bash
./managing-sap-system-connections-78a82b6.md
code ./managing-sap-system-connections-78a82b6.md
```

**STEP**: 8 — Managing Service and Annotation Files

**DESCRIPTION**: Consult this file for guidelines on handling OData services and annotation files. Use it to generate service registration, annotation merging, or deployment scripts.

**LANGUAGE**: Markdown

**CODE**:
```bash
./managing-service-and-annotation-files-8182ff3.md
code ./managing-service-and-annotation-files-8182ff3.md
```

**STEP**: 9 — Project Validation

**DESCRIPTION**: Use the Project Validation documentation to implement validation rules and checks for Fiori projects. Incorporate these rules into linting, CI pipelines, or automated pre-deploy checks.

**LANGUAGE**: Markdown

**CODE**:
```bash
./project-validation-6f3c737.md
code ./project-validation-6f3c737.md
```

**STEP**: 10 — Viewing Service Metadata

**DESCRIPTION**: Read how to retrieve and inspect service metadata (OData metadata). Use the described techniques to generate metadata-fetching code, UI previews, or validators that depend on metadata structure.

**LANGUAGE**: Markdown

**CODE**:
```bash
./viewing-service-metadata-e369c2c.md
code ./viewing-service-metadata-e369c2c.md
```

**STEP**: 11 — UI Service Generation

**DESCRIPTION**: This document details generation of UI services (proxies, models, annotations). Use it as the primary source when scaffolding UI service layers or generating service-related artifacts for Fiori apps.

**LANGUAGE**: Markdown

**CODE**:
```bash
./ui-service-generation-1a7aad3.md
code ./ui-service-generation-1a7aad3.md
```
--------------------------------

**TITLE**: Project Validation for SAP Fiori Tools

**INTRODUCTION**: Validate a generated SAP Fiori project in VS Code or SAP Business Application Studio using the Fiori Tools validation pipeline. The validation runs multiple checks (project metadata, annotations, UI5 specification, optional ESLint) and produces a Markdown report and Problems view entries.

**TAGS**: fiori-tools, validation, eslint, manifest.json, package.json, ui5.yaml, annotations, @sap/ux-specification, vscode, business-application-studio

**STEP**: 1 — Run Project Validation

**DESCRIPTION**: Open the VS Code Command Palette and run the Fiori Tools project validation. If multiple projects exist in the workspace, select the target project from the quick pick list.

**LANGUAGE**: Plain Text

**CODE**:
```text
Open Command Palette: [CMD/CTRL] + [Shift] + [P]
Command to run: Fiori: Validate Project
```

**STEP**: 2 — Project step: check required project files and metadata

**DESCRIPTION**: Validate presence and mandatory fields of core project files. Failures here indicate missing or incomplete project metadata required for runtime or tooling.

- Files checked: package.json, manifest.json, ui5.yaml
- Also checks other mandatory fields inside those files.

**LANGUAGE**: Plain Text

**CODE**:
```text
Files and paths validated:
- package.json
- manifest.json
- ui5.yaml
```

**STEP**: 3 — Annotation step: validate OData/UI5 annotation XML files

**DESCRIPTION**: Validate project annotation files using the same modules as the XML annotation language server extension. Use the annotation validation results to detect malformed/invalid XML annotations or incorrect vocabulary usage.

**LANGUAGE**: Plain Text

**CODE**:
```text
Annotation validation uses the XML annotation language server modules (same modules as the extension)
```

**STEP**: 4 — Specification step: validate manifest and change files against @sap/ux-specification

**DESCRIPTION**: Validate manifest.json and files in the changes folder against the SAP UX specification. The @sap/ux-specification module is used to import the project configuration and generate detailed invalid-configuration errors.

**LANGUAGE**: Plain Text

**CODE**:
```text
Validator module used: @sap/ux-specification
Targets:
- manifest.json
- files in the changes folder
```

**STEP**: 5 — eslint step: optional code-style and static checks

**DESCRIPTION**: If eslint is installed as a project dependency, the validation runs eslint according to the project's configuration and the rules defined by the eslint-plugin-fiori-custom package. To enable eslint support for new projects, select the appropriate ESLint option in the SAP Fiori application generator's Advanced Options (see Additional Configuration).

**LANGUAGE**: Plain Text

**CODE**:
```text
eslint integration:
- Checks if eslint is installed as a dependency in the project
- Runs eslint using the project configuration and rules from eslint-plugin-fiori-custom
Package reference: eslint-plugin-fiori-custom
```

**STEP**: 6 — Output: validation report and VS Code Problems

**DESCRIPTION**: After all validation steps complete, a report is generated and displayed as a Markdown (.md) file. Validation messages are also surfaced in the Problems tab of VS Code or SAP Business Application Studio for quick navigation to issues.

**LANGUAGE**: Plain Text

**CODE**:
```text
Outputs:
- Markdown (.md) report file (validation report)
- Problems tab in Visual Studio Code / SAP Business Application Studio
```
--------------------------------

**TITLE**: Reuse Library Support — Create, Reference, and Deploy Reusable SAP Fiori Libraries

**INTRODUCTION**: Step-by-step, actionable instructions to create a reusable SAPUI5/Fiori library in your workspace, add a reference to reuse that library in an SAP Fiori application, and deploy a reuse library project using SAP Fiori tools. Use these steps inside Visual Studio Code or SAP Business Application Studio with the SAP Fiori tools extension.

**TAGS**: sapui5, fiori-tools, reuse-library, ui5, manifest.json, ui5.yaml, deployment, abap

STEP: 1 — Create a Reusable Library

DESCRIPTION: Use the Fiori Reusable Library Generator to create a new reusable library project in your workspace. Choose module name, namespace, minimum SAPUI5 version, output folder, and optionally generate OData artifacts.

LANGUAGE: Shell

CODE:
```shell
# Open Command Palette (VS Code / Business Application Studio)
# Shortcut: CMD/CTRL + SHIFT + P
# Execute this command:
Fiori: Open Reusable Library Generator

# Follow the interactive prompts:
# - Provide library module name and namespace
# - Choose minimum SAPUI5 version
# - Select Library Folder Path (output directory; generated folder = <namespace>/<module name>)
# - Optionally enable generation with OData service
```

STEP: 2 — Prerequisites for Adding a Reference

DESCRIPTION: Ensure both the reuse library project and the target SAP Fiori project are present in your workspace before adding a reference.

LANGUAGE: text

CODE:
```text
Prerequisites:
1. Reuse library project cloned or imported into workspace.
2. SAP Fiori project already present in workspace.
```

STEP: 3 — Add Reference to Reuse a Library (Update Project Files)

DESCRIPTION: Use the Fiori command to add a workspace reference from your SAP Fiori app to the reusable library. This updates the consuming project's configuration and manifest files so the library is available at build/runtime.

LANGUAGE: Shell

CODE:
```shell
# Open Command Palette
# Shortcut: CMD/CTRL + SHIFT + P
# Execute this command:
Fiori: Add Reference to SAP Fiori Reusable Libraries

# Interactive selections:
# 1) Project Folder Path -> select the target SAP Fiori project in the workspace
# 2) Reusable Library Source -> select "workspace"
# 3) Choose one or more reusable libraries or components from the presented list
# 4) Click "Finish"

# After finish, the following files in the target project are updated to reference the selected reuse library:
# - ui5.yaml
# - ui5-local.yaml
# - manifest.json
```

STEP: 4 — Files to Inspect/Verify After Adding Reference

DESCRIPTION: Verify the generated/updated configuration and manifest for correct library references and ensure local workspace mounts (if any) are configured.

LANGUAGE: text

CODE:
```text
Files to check in the target SAP Fiori project:
- ui5.yaml          # UI5 build/deploy configuration (library entries, resources, dependencies)
- ui5-local.yaml    # Local workspace mount configuration for ui5-server or tooling
- manifest.json     # Application manifest with library/component references and dependencies
```

STEP: 5 — Deploying a Reuse Library Project Using SAP Fiori Tools

DESCRIPTION: Migrate and deploy the reuse library to an ABAP environment using SAP Fiori tools. Follow the migration flow, install dependencies, generate deployment config, and run the deployment steps.

LANGUAGE: Shell

CODE:
```shell
# Workflow:
# 1) Add the Reuse Library project into your workspace (clone/import).
# 2) When prompted, in the migration pop-up click "Start Migration".
# 3) Select the project you want to migrate from the list and click "Start Migration".
# 4) Wait for dependency installation to complete.
# 5) Generate the ABAP deployment configuration:
#    See: ../Deploying-an-Application/generate-deployment-configuration-abap-c06b9cb.md
# 6) Deploy the project to the ABAP environment:
#    See: ../Deploying-an-Application/deployment-of-application-607014e.md#loio607014e278d941fda4440f92f4a324a6__abap
```
--------------------------------

**TITLE**: Generate a UI Service for an SAP Fiori Project

**INTRODUCTION**: Use the UI Service Generator (fiori-tools) to create a UI service from an ABAP Business Object Interface or Core Data Service (CDS) and optionally scaffold a new SAP Fiori application that consumes the generated service. This doc describes the exact interactive steps inside your IDE (VS Code or SAP Business Application Studio).

**TAGS**: fiori-tools, SAP Fiori, UI service, ABAP, CDS, Business Object Interface, generator, VSCode, BAS

**STEP**: 1 — Open the UI Service Generator command

**DESCRIPTION**: Open the Command Palette and run the Fiori UI Service generator command.

**LANGUAGE**: Text

**CODE**:
```Text
Open Command Palette: (CMD/CTRL + Shift + P)
Command: Fiori: Generate UI Service
```

**STEP**: 2 — Select target SAP system / destination

**DESCRIPTION**: Choose the target system source depending on your IDE:
- Visual Studio Code: pick a saved SAP system from your configured connections.
- SAP Business Application Studio: pick a destination from the workspace/BAS destinations.

**LANGUAGE**: Text

**CODE**:
```Text
If VS Code: select a saved SAP system
If BAS: select a destination
```

**STEP**: 3 — Choose service type

**DESCRIPTION**: Select whether the service is provided by a Business Object Interface or an ABAP Core Data Service (CDS). This determines available objects in subsequent selection.

**LANGUAGE**: Text

**CODE**:
```Text
Options:
- Business Object Interface
- ABAP Core Data Service (CDS)
```

**STEP**: 4 — Select the business object / CDS object

**DESCRIPTION**: From the dropdown list populated by the chosen system/destination and type, select the specific Business Object or CDS object you want to generate a UI service for.

**LANGUAGE**: Text

**CODE**:
```Text
Select object: <choose from dropdown list>
```

**STEP**: 5 — Proceed to configuration

**DESCRIPTION**: Click Next to continue to transport and packaging options.

**LANGUAGE**: Text

**CODE**:
```Text
Action: Click Next
```

**STEP**: 6 — Select SAP package

**DESCRIPTION**: Choose the ABAP package where the generated service artifacts will be stored.

**LANGUAGE**: Text

**CODE**:
```Text
Select package: <ABAP package>
```

**STEP**: 7 — Select transport request

**DESCRIPTION**: Choose the transport request to use when generating and saving the service artifacts into the ABAP repository.

**LANGUAGE**: Text

**CODE**:
```Text
Select transport request: <transport number>
```

**STEP**: 8 — (Optional) Enable Drafts

**DESCRIPTION**: If the selected business object supports drafts, you will be prompted: "Draft Enabled". Select Yes to generate a draft-enabled service; otherwise leave No. Note: the prompt only appears when the object supports drafts.

**LANGUAGE**: Text

**CODE**:
```Text
Draft Enabled? (only if supported)
- Yes (enable draft-enabled service)
- No  (default)
```

**STEP**: 9 — (Optional) Create SAP Fiori application with the service

**DESCRIPTION**: Optionally choose to create a new SAP Fiori application that consumes the newly generated service. If you select Yes, the SAP Fiori Generator will automatically launch after service generation.

**LANGUAGE**: Text

**CODE**:
```Text
Do you want to create an SAP Fiori application with the newly generated service?
- Yes -> triggers SAP Fiori Generator automatically after service generation
- No  -> only generate UI service
```

**STEP**: 10 — Finish generation

**DESCRIPTION**: Click Finish to start generation. The UI service generation will run; this can take some time depending on system response and object complexity.

**LANGUAGE**: Text

**CODE**:
```Text
Action: Click Finish
Status: Wait for generation to complete (may take time)
```

**STEP**: Results — Generated UI service and automatic app scaffolding

**DESCRIPTION**: After completion:
- The UI service has been generated and saved in the selected package/transport.
- If you opted to create a Fiori application, the SAP Fiori Generator launches and uses the generated service to scaffold the application automatically.

**LANGUAGE**: Text

**CODE**:
```Text
Result:
- UI service generated in ABAP package and transport
- (If selected) SAP Fiori Generator launched to create application using the new service
```
--------------------------------

**TITLE**: Viewing Service Metadata with SAP Fiori Tools - Service Modeler

**INTRODUCTION**: Quick, action-focused guide for launching and using the SAP Fiori Tools - Service Modeler to visualize OData V2/V4 service models (.xml/.edmx) and CAP CDS services. Includes exact commands, UI controls, icon/stylesheet references, and file/image paths needed for automation or extension development.

**TAGS**: fiori-tools, service-modeler, OData, metadata, annotations, CAP, CDS, edmx, xml, vscode

**STEP**: 1 — Launch Service Modeler via Command Palette

**DESCRIPTION**: Open VS Code Command Palette and run the exact Service Modeler command. After the command runs, select the SAP Fiori elements project in the workspace. If the project contains multiple services, explicitly choose the service to visualize.

**LANGUAGE**: Text

**CODE**:
```Text
Command Palette (macOS): ⌘ + ⇧ + P
Command Palette (Windows/Linux): Ctrl + Shift + P

Exact command to run:
SAP Fiori tools: Service Modeler: Open Service Modeler
```

**STEP**: 2 — Launch Service Modeler from Folder Context Menu

**DESCRIPTION**: When a SAP Fiori elements project is in the current workspace, right-click any folder in the project and choose the "Override Annotations" context menu entry to open the Service Modeler for that service/project.

**LANGUAGE**: Text

**CODE**:
```Text
Context menu action:
Right-click <project-folder> -> Override Annotations
```

**STEP**: 3 — Launch Service Modeler from Text Editor (metadata.xml)

**DESCRIPTION**: If you have a service metadata file open (metadata.xml / .edmx) in the editor, click the Annotations icon in the editor UI to open the Service Modeler focused on that metadata file.

Preserve icon font reference when rendering icons in custom UIs.

**LANGUAGE**: HTML

**CODE**:
```HTML
<link rel="stylesheet" type="text/css" href="../css/sap-icons.css"/>

<!-- Example editor icon markup for "Annotations" -->
<span class="SAP-icons-V5"></span> <!-- Annotations icon -->
```

**STEP**: 4 — Supported Service Types and Files

**DESCRIPTION**: The Service Modeler supports OData V2 and V4 services based on .xml/.edmx service metadata files and CAP CDS services. Use these file types as sources when launching or synchronizing services.

**LANGUAGE**: Text

**CODE**:
```Text
Supported sources:
- Service metadata files: *.xml, *.edmx
- CAP CDS services: source CDS models in project
Example file: metadata.xml
```

**STEP**: 5 — Visualize Service: Entities, Complex Types, Entity Containers

**DESCRIPTION**: The Service Modeler displays entities, properties, Complex Types, and Entity Containers in an expandable list/tree. Use the Settings (gear) control to toggle namespace visibility. Primary key properties are marked with a Key icon. Items that have annotations are marked with the Annotations icon and can be filtered.

- Expand an entity node to see all associated properties.
- Expand Complex Types and Entity Containers to view contained elements.
- Click the Settings (gear) icon to show/hide namespaces.
- Select any node to display related annotations in the side panel (annotation files and specific annotations for the selected target).

**LANGUAGE**: Text

**CODE**:
```Text
UI controls and behaviors:
- Toggle namespace: Settings (gear) icon
- Primary key indicator: Key icon (Key)
- Annotation indicator: Annotations icon ()
- Selecting a node -> shows annotation side panel with:
  - annotation file list
  - annotations specific to the selected metadata target
```

**STEP**: 6 — Filter/Find Entities, Properties, and Annotations

**DESCRIPTION**: Use the Service Modeler toolbar search input to filter displayed nodes and annotation panel contents.

Search behaviors:
- If the search matches an entity name, all its child properties are displayed and the annotation side panel data is filtered accordingly.
- If the search matches annotation text, all metadata targets with matching annotations are filtered and shown.

**LANGUAGE**: Text

**CODE**:
```Text
Search input behaviors:
- Search term -> filters list of entities/properties
- Entity match -> show entity + child properties + filtered annotations
- Annotation match -> show all metadata targets holding matching annotation text
```

**STEP**: 7 — UI Resources and Example Images

**DESCRIPTION**: Preserve the referenced images and icon stylesheet paths when documenting or automating UI tests/scripts.

**LANGUAGE**: Text

**CODE**:
```Text
Icon stylesheet:
../css/sap-icons.css

Referenced images:
images/Fiori_Tools_Service_Modeler_-_Toggle_Namespace_2864d9a.png
images/Screenshot_Service_Modeler_Country_search_2b1e728.png
```
--------------------------------

**TITLE**: Adapt the UI (SAPUI5 Adaptation Editor)

**INTRODUCTION**: Practical, code-focused guidance to open and use the SAPUI5 Adaptation Editor to change UI elements in an adaptation project. Includes the exact file locations, the ui5.yaml change needed to switch SAPUI5 versions for preview, and step-by-step editing actions (add/remove/rename/move/combine/split fields, groups, and sections). Use this as a recipe for automation or to instruct an AI agent to generate tooling or scripts around adaptation workflows.

**TAGS**: fiori-tools, sapui5, adaptation-editor, ui5, adaptation, manifest, ui5.yaml, developer

**STEP**: 1 — Overview & SAPUI5 version for the Adaptation Editor

**DESCRIPTION**: The Adaptation Editor previews your project using the SAPUI5 version defined at project generation. To preview with a different SAPUI5 version in the Adaptation Editor, edit the ui5.yaml in your project root and update the version under the ui5 node. Do not modify other ui5.yaml settings unless you fully understand the consequences.

**LANGUAGE**: YAML

**CODE**:
```yaml
# Path: <project-root>/ui5.yaml
# Example: change the SAPUI5 version used by the Adaptation Editor
ui5:
  # set this to the desired SAPUI5 version (example)
  version: "1.111.0"
# NOTE: Only modify the `version` property under `ui5`. Changing other settings may cause undesired behavior.
```

**STEP**: 2 — Open the Adaptation Editor from the project workspace

**DESCRIPTION**: Open the Adaptation Editor from the project explorer by opening the manifest variant file located under webapp. This launches the editor and loads the application for preview and editing.

**LANGUAGE**: Text

**CODE**:
```
# Path to open from your IDE/project explorer:
webapp/manifest.appdescr_variant

# Action:
Right-click manifest.appdescr_variant -> Open Adaptation Editor
# Editor opens in Navigation mode. Switch to Edit mode (Edit button) to make changes.
```

**STEP**: 3 — Adaptation Editor UI and modes

**DESCRIPTION**: The Adaptation Editor contains:
- Outline pane (structure)
- Canvas (application preview)
- Properties pane (control properties)
Toolbar actions:
- Navigation mode: navigate & preview application
- Adaptation (Edit) mode: select controls in Canvas to edit properties; selection syncs with Outline pane
- Device format toggle: smartphone / tablet / desktop (switching formats saves changes)
- Expand/collapse left/right panes

**LANGUAGE**: Text

**CODE**:
```
# Common toolbar workflow:
1. Launch Editor -> initial mode = Navigation
2. Click "Edit" to enter Adaptation mode
3. Select control in Canvas -> Outline highlights the control -> Properties pane shows configurable properties
4. Device toggle: smartphone / tablet / desktop (changes are saved to workspace)
```

**STEP**: 4 — Change control properties

**DESCRIPTION**: Select a UI element in Canvas or Outline and update its configurable properties in the Properties pane. Not all properties are editable in adaptation mode.

**LANGUAGE**: Text

**CODE**:
```
# Action:
1. Select control in Canvas or Outline
2. Edit properties in the Properties pane
# Note: Some properties are read-only in Adaptation Editor.
```

**STEP**: 5 — Add new fields to a group or form

**DESCRIPTION**: Use Add Field from the context menu (available in Canvas and Outline for supported versions) to pick and add fields from the available fields list. You can search and sort the list. Confirm with OK to apply changes.

**LANGUAGE**: Text

**CODE**:
```
# Actions:
1. Hover/select target group or field -> Context menu -> Add Field
   (Context menu available in Canvas and Outline for SAPUI5 >= 1.84)
2. In "Available fields" dialog: search, sort, select fields
3. Click OK to apply
```

**STEP**: 6 — Add a new group to a form

**DESCRIPTION**: From a form or an existing group, use Add Group from the context menu. Default title is "New Group" — rename it as desired. Confirm by pressing Enter or selecting another element.

**LANGUAGE**: Text

**CODE**:
```
# Actions:
1. Hover/select parent form or group -> Context menu -> Add Group
2. Rename the group title (default "New Group")
3. Press [Enter] or select another element to apply
```

**STEP**: 7 — Add sections to an object page

**DESCRIPTION**: Use Add Section on a section context menu. If all available sections are already used, this option is disabled. Select sections from the list, search/sort, and confirm with OK.

**LANGUAGE**: Text

**CODE**:
```
# Actions:
1. Hover/select a section -> Context menu -> Add Section
   (If disabled, no available sections remain)
2. In dialog: select section(s), search or sort as needed
3. Click OK to apply
```

**STEP**: 8 — Rename fields and groups

**DESCRIPTION**: Double-click a field or group to rename, or use the Rename Field / Rename Group context menu option. Confirm with Enter, or cancel with ESC.

**LANGUAGE**: Text

**CODE**:
```
# Actions:
1. Double-click the field or group OR
   Hover/select -> Context menu -> Rename Field / Rename Group
2. Edit label/title
3. Press [Enter] to apply; press [ESC] to cancel
```

**STEP**: 9 — Drag and drop fields, groups, and sections

**DESCRIPTION**: Rearrange UI elements by dragging. Drop locations are highlighted; you can drop above/below fields or into any group/section marked by dashed boxes.

**LANGUAGE**: Text

**CODE**:
```
# Actions:
1. Click and drag a field, group, or section
2. Drop onto highlighted drop target (space appears)
# Behaviour:
- Fields can be dropped above/below highlighted fields or inside dashed-box groups
- Groups/Sections can be dropped on highlighted groups/sections
```

**STEP**: 10 — Cut and paste fields/groups

**DESCRIPTION**: Use Cut from the context menu to stage a field/group; target paste locations are highlighted. Use Paste from the context menu at a highlighted location to move. Press ESC to cancel highlighting.

**LANGUAGE**: Text

**CODE**:
```
# Actions:
1. Hover/select field/group -> Context menu -> Cut
   (Cut element is highlighted; possible paste targets are shown with dashed boxes)
2. Hover/select target group (highlighted) -> Context menu -> Paste
# Note: Press [ESC] to cancel pasting and remove highlighting.
```

**STEP**: 11 — Combine and split fields (inline grouping)

**DESCRIPTION**: Combine up to 3 fields into a single inline display. Select a primary field, hold CTRL and select other fields, then use Combine from the context menu. To revert, select the combined fields and use Split.

**LANGUAGE**: Text

**CODE**:
```
# Combine:
1. Select first field
2. Hold [CTRL] and select up to 2 additional fields
3. Context menu -> Combine

# Split:
1. Hover/select combined field -> Context menu -> Split
```

**STEP**: 12 — Remove fields, groups, or object page sections

**DESCRIPTION**: Remove elements from the UI using Remove Field / Remove Group / Remove Section from the context menu or press DEL. Removal is non-destructive: elements remain available in the "available fields/sections" list and can be re-added. Mandatory fields will prompt confirmation or cannot be removed directly.

**LANGUAGE**: Text

**CODE**:
```
# Actions:
1. Hover/select element -> Context menu -> Remove Field / Remove Group / Remove Section
OR
2. Select element -> Press [DEL]

# Note:
- Removal only hides elements in UI; they remain available for re-adding.
- Mandatory fields: system prompts to confirm or prevents accidental removal.
```

**STEP**: 13 — Context menu availability

**DESCRIPTION**: The Adaptation Editor's Outline pane context menu is available for projects based on maintained SAPUI5 versions >= 1.84. If your project targets an older SAPUI5 version, some context-menu-based actions may not be available in the Outline.

**LANGUAGE**: Text

**CODE**:
```
# Requirement:
SAPUI5 >= 1.84 -> Outline pane context menu enabled
# If SAPUI5 < 1.84 -> use Canvas context menu for actions
```

**STEP**: 14 — Embedding content (external guidance link)

**DESCRIPTION**: Embedding content into an adaptation project follows the same procedure as the key user scenario. Use the SAP Help article below for the embedding steps.

**LANGUAGE**: Text

**CODE**:
```
# Reference:
Embedding content procedure (SAP Help)
https://help.sap.com/viewer/0f8b49c4dfc94bc0bda25a19aa93d5b2/latest/en-US/bfdf15154f16419fb60ce598b21fe515.html
```

**STEP**: 15 — Preview the adaptation in a separate browser tab

**DESCRIPTION**: The Adaptation Editor supports previewing the project in a separate browser tab. For the preview workflow and options, consult the "Previewing an Adaptation Project" documentation.

**LANGUAGE**: Text

**CODE**:
```
# Reference:
Previewing an Adaptation Project (documentation)
previewing-an-adaptation-project-64cc15b.md
# Action:
Use the Adaptation Editor preview action to open the current adaptation in a new browser tab.
```
--------------------------------

**TITLE**: Adapting the UI with the Adaptation Editor

**INTRODUCTION**: How to open and use the SAPUI5 Adaptation Editor to modify adaptation projects: change the SAPUI5 preview version, launch the editor from VS Code, use Navigation and Adaptation modes, and perform UI edits (add/remove/rename/drag/combine fields, groups, sections). Includes precise file paths and keyboard actions to automate or script workflows.

**TAGS**: fiori-tools, sapui5, adaptation-editor, ui5, vs-code, manifest, ui5.yaml

**STEP**: 1 — Overview & Editor Modes

**DESCRIPTION**: Summary of Adaptation Editor UI, available modes, and device previews. Use this to prepare automation or tests that interact with the editor UI and modes.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Adaptation Editor UI elements:
- Outline pane
- Canvas (application preview)
- Properties pane
- Quick Actions (when applicable, depends on floorplan and SAPUI5 version)

Modes:
- Navigation mode: preview and navigate the app.
- Adaptation mode: click UI element in Canvas => selects it and highlights it in Outline and vice versa.

Device formats:
- smartphone, tablet, desktop (switching device formats saves changes to workspace)

Runtime requirement:
- Keep Visual Studio Code (VS Code) running for the Adaptation Editor to work.
```

**STEP**: 2 — Change SAPUI5 version used by the Adaptation Editor

**DESCRIPTION**: To preview your project with a different SAPUI5 version in the Adaptation Editor, edit the project's ui5.yaml in the project root. Only change the version property under the ui5 node. Do not modify other ui5.yaml settings unless you understand the impact.

**LANGUAGE**: YAML

**CODE**:
```yaml
# File: <project-root>/ui5.yaml
ui5:
  version: "1.96.0"   # change this value to the desired SAPUI5 version
```

**STEP**: 3 — Launch the Adaptation Editor from VS Code

**DESCRIPTION**: Open the Adaptation Editor for the current adaptation project by targeting the manifest variant file inside the webapp folder.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
1. In VS Code explorer, expand the webapp folder.
2. Right-click the file: webapp/manifest.appdescr_variant
3. Choose: "Open Adaptation Editor"

Result:
- The Adaptation Editor launches in a browser window and loads the application preview.
Note: Keep VS Code running while using the Adaptation Editor.
```

**STEP**: 4 — Switch views while editing

**DESCRIPTION**: Use Navigation mode to change pages/views and then return to Adaptation mode to apply changes to the target view.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
1. Switch to Navigation mode.
2. Navigate to the desired view/page in the Canvas.
3. Switch back to Adaptation mode to perform UI edits on that view.
```

**STEP**: 5 — UI Editing Options (actions and exact steps)

**DESCRIPTION**: Action-by-action procedures to modify controls, fields, groups, and sections in Adaptation mode. These are the exact UI interactions and keyboard actions to automate or simulate.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Change properties:
1. Select the UI element.
2. Modify properties in the Properties pane.
Note: Not all properties are configurable.

Add new fields:
1. Hover over or select a group or a field.
2. Click "Add Field" from the context menu (available in Canvas and Outline pane).
3. Select fields to add (search by label/tooltip or sort alphabetically).
4. Click "OK" to apply.

Add a new group:
1. Hover over or select a group (or its form).
2. Click "Add Group" from the context menu. Default title: "New Group".
3. Rename as needed.
4. Apply: press [Enter] or select another element.

Add sections to an object page:
1. Hover over or select a section.
2. Click "Add Section" from the context menu.
   Note: option is disabled (grayed out) if all available sections are already present.
3. Select sections to add (search or sort alphabetically).
4. Click "OK" to apply.

Rename fields and groups:
1. Double-click the field or group OR hover/select and choose "Rename Field" / "Rename Group".
2. Edit the label/title.
3. Apply: press [Enter]. Cancel: press [Esc].

Drag and drop fields/groups/sections:
1. Drag the element.
2. Drop on target location; a space appears where you can drop.
   - Fields can be dropped above/below highlighted fields or in dashed-box groups.
   - Groups/sections can be dropped on highlighted groups/sections.

Cut and paste fields/groups:
1. Hover/select a field or group and choose "Cut" from context menu. The cut element is highlighted.
2. Valid paste targets are highlighted with dashed boxes.
3. To paste:
   - For a cut field: hover/select highlighted group or field and click "Paste".
   - For a cut group: hover/select target group in the highlighted forms and click "Paste".
Note: Press [Esc] to remove highlighting and exit paste mode.

Combine up to three fields (single-line display):
1. Select a field.
2. Hold [CTRL] and select up to two additional fields to combine.
3. On one selected field, click "Combine" from the context menu where you want the combined display.

Split combined fields:
1. Hover/select the combined fields.
2. Click "Split" from the context menu.

Remove fields/groups/sections:
1. Hover/select the element to remove.
2. Click "Remove Field" / "Remove Group" / "Remove Section" from the context menu OR press [DEL].
Note:
- Removed items are removed from the UI only; they remain available in the list of available fields/sections and can be re-added.
- Mandatory fields (including those within groups) cannot be removed without confirmation.
```

**STEP**: 6 — Quick actions, context menu availability & table-type modification warning

**DESCRIPTION**: Reference for quick actions and limitations. Useful for conditional automation depending on SAPUI5 version and floorplan.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Quick Actions:
- A quick actions list (above Properties pane) is shown for Fiori elements list report/object page floorplans.
- Available quick actions depend on the floorplan and SAPUI5 version.
Reference: Quick Actions Availability Matrix (see product docs)

Context menu in Outline pane:
- Available for projects based on maintained SAPUI5 versions >= 1.84.

Table type modifications (warning):
- SAP Fiori elements supports table type modifications via adaptation projects.
- Compatibility cannot be guaranteed across all apps/scenarios; behavior depends on application specifics, OData version, and configuration.
- Recommendation: Thoroughly test table type modifications before production use.
```

**STEP**: 7 — Save changes and embed content

**DESCRIPTION**: Save adaptations and embed content the same way as key user scenarios. Preserve link to embedding docs for automation of embedding tasks.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
1. After making changes in the Adaptation Editor, click "Save" on the toolbar above the Canvas.
2. Embedding content: performed the same way as the key user scenario.
Reference: Embedding Content documentation:
https://help.sap.com/viewer/0f8b49c4dfc94bc0bda25a19aa93d5b2/latest/en-US/bfdf15154f16419fb60ce598b21fe515.html
```

**STEP**: 8 — File references for automation or scripting

**DESCRIPTION**: Important project file paths to target programmatically when building tooling that opens or modifies the adaptation project.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Key paths:
- Project root: <project-root>/
- ui5 configuration: <project-root>/ui5.yaml
- Adaptation variant file: <project-root>/webapp/manifest.appdescr_variant
```
--------------------------------

**TITLE**: Add SAPUI5 Fragments to an Aggregation or Extension Point (Adaptation Editor)

**INTRODUCTION**: This guide explains how to add or create SAPUI5 XML fragments inside the Adaptation Editor of a Fiori Tools project. It covers adding fragments to a control aggregation and adding fragments at an extension point, file locations created by the editor, required XML fragment structure (namespaces and stable IDs), and deletion rules.

**TAGS**: fiori-tools, sapui5, fragments, adaptation-editor, extension-point, aggregation, webapp/changes

**STEP**: 1 — Open Adaptation Editor and enable Edit mode

**DESCRIPTION**: In the project workspace, open the Adaptation Editor and switch to Edit mode so you can add fragments to controls or extension points.

- From the project context menu, click Adaptation Editor.
- From the editor header, click Edit.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext

```

**STEP**: 2 — Add a fragment to an aggregation (interactive)

**DESCRIPTION**: Select a UI control in the canvas (for example, Smart Filter Bar or Overflow Toolbar). Use the control's context menu and choose Add Fragment. The dialog shows the default target aggregation and index; choose a fragment from the list or create a new one.

Notes and constraints:
- The dialog lists available fragments for the selected target aggregation and allows choosing target aggregation and insert index.
- You cannot reuse the same fragment multiple times.
- For the Smart Filter Bar, the controlConfiguration aggregation has the index disabled — it does not support positioning at a specific index.
- Quick actions (top-right) provide common fragment creations: Add Custom Page Action, Add Custom Table Action, Add Custom Table Column, Add Header Field, Add Custom Section.
- After adding a fragment, you will be prompted to reload the Adaptation Editor to see the changes.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext

```

**STEP**: 3 — Create a new fragment file (when choosing Create New)

**DESCRIPTION**: When you click Create New in the Add Fragment dialog:

- Enter a name and click Create.
- A fragment.xml file is created at: <Your project>/webapp/changes/fragments/<yourFragmentName>.fragment.xml (editor opens).
- Define the fragment XML and save/close the .xml file.
- An associated change file addXML.change is created in: <Your project>/webapp/changes/. This change file references the fragment.xml file, target aggregation/extension point, and chosen index.

Required fragment rules:
- Add namespace definitions for controls you use in the fragment.
- Use stable, unique IDs for controls inside the fragment.
- Follow each control’s specific definition rules in SAPUI5 documentation.

Example minimal fragment structure (keep exactly this form for namespaces and IDs):
```xml
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns:uxap='sap.uxap'>
  <uxap:ObjectPageSection id="sample.Id" title="Title"></uxap:ObjectPageSection>
</core:FragmentDefinition>
```

**LANGUAGE**: XML

**CODE**:
```xml
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns:uxap='sap.uxap'>
  <uxap:ObjectPageSection id="sample.Id" title="Title"></uxap:ObjectPageSection>
</core:FragmentDefinition>
```

**STEP**: 4 — Add an existing fragment to an aggregation (choose from list)

**DESCRIPTION**: To use an existing fragment:

- Select it in the Add Fragment dialog list and click Add.
- Open <Your project>/webapp/changes/fragments/<yourFragmentName>.fragment.xml in the editor to modify properties.
- Save and close the .xml file.
- Reload the Adaptation Editor canvas to view changes.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext

```

**STEP**: 5 — Add a fragment at an extension point

**DESCRIPTION**: Prerequisite: Adaptation project must be based on a freestyle SAPUI5 app that exposes extension points.

- Expand the outline tree to locate elements that are extension point targets.
- Select the element in the tree to highlight its parent in the visual editor.
- Right-click the highlighted element and choose Add fragment at extension point.
- In the dialog, select or create a fragment. The default extension point is preselected and the dialog shows available fragments for that extension point.
- Follow the same Create New workflow as for aggregations. A fragment.xml is created under webapp/changes/fragments and a corresponding addXML.change file is created under webapp/changes referencing the fragment and extension point/index.
- You cannot reuse the same fragment multiple times in the same target.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext

```

**STEP**: 6 — Delete fragments you created (cleanup to allow future additions)

**DESCRIPTION**: If you need to delete fragments you created:

- First delete the change files associated with the fragment from <Your project>/webapp/changes/.
- Then delete the fragment XML file from <Your project>/webapp/changes/fragments/.
- If you leave associated change files, you cannot add further fragments to the adaptation project that conflict with those change records.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext

```
--------------------------------

**TITLE**: Add Fragments to an Aggregation or Extension Point (UI Adaptation Mode)

**INTRODUCTION**: Step-by-step actions to add XML fragments to a control aggregation or to an extension point using the UI Adaptation editor (Preview Application → start-editor). Includes exact file paths for generated files, UI behavior, quick actions, and required version prerequisites for extension-point usage.

**TAGS**: fiori-tools, SAPUI5, fragments, UI Adaptation, extension point, aggregation, webapp, manifest.appdescr_variant, changes

**STEP**: 1 — Start UI Adaptation Mode

**DESCRIPTION**: Open the adaptation editor by previewing the application. Right-click the project root folder, the webapp folder, or the manifest.appdescr_variant file and choose "Preview Application", then click "start-editor". The app opens in the canvas in UI Adaptation mode.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Right-click -> Preview Application -> start-editor
```

**STEP**: 2 — Add a Fragment to an Aggregation (select control and Add Fragment)

**DESCRIPTION**: In the visual canvas, select the control (for example: SmartFilterBar, OverflowToolbar). Use the control's context menu and choose "Add Fragment". The dialog shows the default target aggregation and last index. Choose the target aggregation and the insertion index. Note that the same fragment cannot be reused multiple times. For SmartFilterBar's controlConfiguration aggregation, the index is disabled (positioning by index is not supported).

Quick actions (top-right panel) for common fragment additions:
- Add Custom Page Action
- Add Custom Table Action
- Add Custom Table Column
- Add Header Field
- Add Custom Section

Quick action flow: click action → enter fragment file name → Create. The generated fragment contains dummy data; press Save and Reload in the toolbar to preview immediately.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Context menu -> Add Fragment
Select target aggregation and index (if enabled)
Quick actions: Create fragment file directly
```

**STEP**: 3 — Create and Define the Fragment File

**DESCRIPTION**: When you create a fragment, a fragment.xml file and an associated change file are generated.

- Enter a name and click Create.
- Generated files and locations:
  - fragment.xml created at: <YourProject>/webapp/changes/fragments/<YourFragmentName>.fragment.xml
  - associated change file created at: <YourProject>/webapp/changes/<your-change-file>.addXML.change
    - The addXML.change contains the reference to the fragment.xml file, the target aggregation or extension point, and the index.
- Edit and define the fragment content in the opened fragment.xml editor. Save and close the XML file.
- To see the change applied in the canvas, reload the adaptation editor and/or the application preview tab.

Delete workflow reminder: to delete a fragment previously added, first delete the associated change file(s) under <YourProject>/webapp/changes, then delete the fragment file under <YourProject>/webapp/changes/fragments. If you delete the fragment file first, you may not be able to add further fragments to the adaptation project.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Files created:
- <YourProject>/webapp/changes/fragments/<YourFragmentName>.fragment.xml
- <YourProject>/webapp/changes/<your-change-file>.addXML.change
```

**STEP**: 4 — Fragment XML: Namespace and Stable IDs (example)

**DESCRIPTION**: Add namespace definitions for the controls you use in the fragment and use stable, unique IDs. Follow control-specific definition rules for properties and aggregations.

**LANGUAGE**: XML

**CODE**:
```xml
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns:uxap='sap.uxap'>
  <uxap:ObjectPageSection id="sample.Id" title="Title"></uxap:ObjectPageSection>
</core:FragmentDefinition>
```

**STEP**: 5 — Add a Fragment to an Extension Point (Prerequisites)

**DESCRIPTION**: Extension points are supported only when your environment meets these prerequisites:
- SAPUI5 version >= 1.78
- SAP_UI version >= 7.55
- The application is a freestyle app containing extension points (the adaptation project must be based on such an app)

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Prerequisites:
- SAPUI5 >= 1.78
- SAP_UI >= 7.55
- Freestyle app with extension points
```

**STEP**: 6 — Add Fragment at an Extension Point (outline tree)

**DESCRIPTION**: In the adaptation editor, expand the outline tree to identify extension points. Select an element in the tree to highlight its parent in the visual canvas. Right-click the highlighted parent and choose "Add fragment at extension point". The dialog defaults to the detected extension point; select the desired extension point and index for insertion. The same fragment cannot be reused multiple times.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Outline tree -> select element -> parent highlighted -> right-click -> Add fragment at extension point
Select extension point and index in dialog -> Create fragment
```

**STEP**: 7 — Create Fragment for Extension Point (file generation and edit)

**DESCRIPTION**: Same file generation workflow as aggregation fragments:
- Enter a fragment name and click Create.
- A fragment.xml is created at <YourProject>/webapp/changes/fragments and opened in the editor.
- Save and close the fragment.xml after editing.
- An associated addXML.change file is created under <YourProject>/webapp/changes describing the fragment reference, extension point, and index.
- Reload the adaptation editor and/or app preview to apply and view the change.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Files created:
- <YourProject>/webapp/changes/fragments/<YourFragmentName>.fragment.xml
- <YourProject>/webapp/changes/<your-change-file>.addXML.change
```
--------------------------------

**TITLE**: Adding App Descriptor Changes (SAP Fiori Tools — manifest.json)

**INTRODUCTION**: This guide shows concrete, code-focused steps to modify the Fiori app descriptor (webapp/manifest.json) used by SAP Fiori Tools. It covers editing application metadata, registering models (OData / JSON), configuring routing, enabling cross-app navigation (inbounds), and common UI5 settings. Use these snippets directly when writing code or automating repository edits.

**TAGS**: fiori-tools, manifest.json, app-descriptor, sap.ui5, routing, model, sap.app, cross-navigation, SAPUI5

STEP: 1 — Open the app descriptor file

DESCRIPTION: Locate and open the app descriptor file at webapp/manifest.json. All changes below are applied in this file.

LANGUAGE: JSON

CODE:
```json
// File path: webapp/manifest.json
// Open this file to apply the following changes.
{}
```

STEP: 2 — Set basic application metadata (sap.app)

DESCRIPTION: Add or update application ID, title, description, and application type under the "sap.app" section.

LANGUAGE: JSON

CODE:
```json
{
  "sap.app": {
    "id": "com.example.myfioriapp",
    "type": "application",
    "i18n": "i18n/i18n.properties",
    "title": "{{appTitle}}",
    "description": "{{appDescription}}",
    "applicationVersion": {
      "version": "1.0.0"
    },
    "dataSources": {}
  }
}
```

STEP: 3 — Configure UI5 dependencies and content densities (sap.ui)

DESCRIPTION: Declare the UI5 technologies and preferred content densities to ensure consistent rendering.

LANGUAGE: JSON

CODE:
```json
{
  "sap.ui": {
    "technology": "UI5",
    "icons": {
      "icon": "sap-icon://Fiori2/F0001"
    },
    "deviceTypes": {
      "desktop": true,
      "tablet": true,
      "phone": true
    },
    "contentDensities": {
      "compact": true,
      "cozy": true
    }
  }
}
```

STEP: 4 — Register OData and JSON models (sap.ui5/models + dataSources)

DESCRIPTION: Add dataSources under "sap.app" and corresponding model configuration under "sap.ui5/models". Use a relative URL or system alias for OData. For JSON model, use "uri" or "settings".

LANGUAGE: JSON

CODE:
```json
{
  "sap.app": {
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata/sap/ZMY_SERVICE_SRV/",
        "type": "OData",
        "settings": {
          "odataVersion": "2.0"
        }
      },
      "localData": {
        "uri": "model/localData.json",
        "type": "JSON"
      }
    }
  },
  "sap.ui5": {
    "models": {
      "": {
        "dataSource": "mainService",
        "settings": {
          "defaultOperationMode": "Server",
          "preload": true
        }
      },
      "local": {
        "dataSource": "localData",
        "settings": {}
      }
    }
  }
}
```

STEP: 5 — Configure routing (sap.ui5/routing)

DESCRIPTION: Define routes, targets, and a router configuration. Ensure the route pattern and target specify viewName and viewLevel.

LANGUAGE: JSON

CODE:
```json
{
  "sap.ui5": {
    "rootView": {
      "viewName": "com.example.myfioriapp.view.App",
      "type": "XML",
      "id": "app"
    },
    "routing": {
      "config": {
        "routerClass": "sap.m.routing.Router",
        "viewType": "XML",
        "viewPath": "com.example.myfioriapp.view",
        "controlId": "app",
        "controlAggregation": "pages",
        "bypassed": {
          "target": "notFound"
        }
      },
      "routes": [
        {
          "pattern": "",
          "name": "home",
          "target": "home"
        },
        {
          "pattern": "detail/{ID}",
          "name": "detail",
          "target": "detail"
        }
      ],
      "targets": {
        "home": {
          "viewName": "Home",
          "viewLevel": 1
        },
        "detail": {
          "viewName": "Detail",
          "viewLevel": 2
        },
        "notFound": {
          "viewName": "NotFound",
          "viewLevel": 0
        }
      }
    }
  }
}
```

STEP: 6 — Add cross-application navigation (sap.app/crossNavigation/inbounds)

DESCRIPTION: Declare inbound intents to enable shell navigation to this app. Define semanticObject, action, signature parameters and parameters mapping.

LANGUAGE: JSON

CODE:
```json
{
  "sap.app": {
    "crossNavigation": {
      "inbounds": {
        "DisplayMyApp": {
          "semanticObject": "MyObject",
          "action": "display",
          "title": "Open My Fiori App",
          "signature": {
            "parameters": {
              "ID": {
                "required": false
              }
            },
            "additionalParameters": "allowed"
          },
          "resolutionResult": {
            "applicationType": "URL",
            "url": "#com.example.myfioriapp-display"
          }
        }
      }
    }
  }
}
```

STEP: 7 — Example full manifest.json skeleton

DESCRIPTION: Combine the previous pieces into a minimal working manifest.json skeleton showing where each section belongs. Use this as a template when programmatically generating or updating the manifest.

LANGUAGE: JSON

CODE:
```json
{
  "sap.app": {
    "id": "com.example.myfioriapp",
    "type": "application",
    "i18n": "i18n/i18n.properties",
    "title": "{{appTitle}}",
    "description": "{{appDescription}}",
    "applicationVersion": { "version": "1.0.0" },
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata/sap/ZMY_SERVICE_SRV/",
        "type": "OData",
        "settings": { "odataVersion": "2.0" }
      }
    },
    "crossNavigation": {
      "inbounds": {
        "DisplayMyApp": {
          "semanticObject": "MyObject",
          "action": "display",
          "title": "Open My Fiori App",
          "signature": { "additionalParameters": "allowed" },
          "resolutionResult": {
            "applicationType": "URL",
            "url": "#com.example.myfioriapp-display"
          }
        }
      }
    }
  },
  "sap.ui": {
    "technology": "UI5",
    "contentDensities": { "compact": true, "cozy": true }
  },
  "sap.ui5": {
    "rootView": {
      "viewName": "com.example.myfioriapp.view.App",
      "type": "XML",
      "id": "app"
    },
    "models": {
      "": { "dataSource": "mainService" }
    },
    "routing": {
      "config": {
        "routerClass": "sap.m.routing.Router",
        "viewType": "XML",
        "viewPath": "com.example.myfioriapp.view",
        "controlId": "app",
        "controlAggregation": "pages"
      },
      "routes": [
        { "pattern": "", "name": "home", "target": "home" }
      ],
      "targets": {
        "home": { "viewName": "Home", "viewLevel": 1 }
      }
    }
  }
}
```

STEP: 8 — Validate and deploy

DESCRIPTION: After editing manifest.json, validate JSON syntax, run local Fiori Tools (e.g., Fiori preview or UI5 tooling serve), and test routes and navigation. Commit changes to the repository and include manifest.json path (webapp/manifest.json) in deployment pipelines.

LANGUAGE: JSON

CODE:
```json
// No code changes required here; run these commands locally in your project directory:
// 1) Validate JSON (example using jq):
//    jq empty webapp/manifest.json
// 2) Run local preview with UI5 tooling (if configured):
//    npm start
// 3) Test inbound navigation in SAP Launchpad or shell mock
```
--------------------------------

**TITLE**: Adding App Descriptor Changes for Adaptation Projects

**INTRODUCTION**: This document lists common app-descriptor (manifest.json) changes you add in an adaptation project for SAP Fiori elements applications. Each step is action-oriented and includes minimal JSON snippets you can adapt and inject into your application's manifest.json. Use these snippets as templates to programmatically generate or patch manifest changes in RAG/code-generation workflows.

**TAGS**: fiori-tools, adaptation, manifest.json, app-descriptor, sapui5, odata, annotations, componentUsages, inbound

**STEP**: 1 — Replace OData Service (dataSources + model)
**DESCRIPTION**: Replace or add an OData service declaration in sap.app/dataSources and wire it to the app model in sap.ui5/models. Use this when you need to point the app to a different backend OData endpoint.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "sap.app": {
    "dataSources": {
      "MainService": {
        "uri": "/sap/opu/odata/sap/Z_NEW_SERVICE_SRV/",
        "type": "OData",
        "settings": {
          "odataVersion": "2.0"
        }
      }
    }
  },
  "sap.ui5": {
    "models": {
      "": {
        "dataSource": "MainService",
        "preload": true
      }
    }
  }
}
```

**STEP**: 2 — Add Local Annotation Files
**DESCRIPTION**: Add local annotation files as data sources and expose them via a model entry. Place the XML annotation files under a folder in your project (example: webapp/annotations/LocalAnnotations.xml) and reference them in sap.app/dataSources and sap.ui5/models.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "sap.app": {
    "dataSources": {
      "LocalAnnotations": {
        "uri": "annotations/LocalAnnotations.xml",
        "type": "ODataAnnotation",
        "settings": {
          "localUri": "annotations/LocalAnnotations.xml"
        }
      }
    }
  },
  "sap.ui5": {
    "models": {
      "annotations": {
        "type": "sap.ui.model.odata.v2.ODataModel",
        "dataSource": "LocalAnnotations"
      }
    }
  }
}
```

**STEP**: 3 — Add OData Service and New SAPUI5 Model
**DESCRIPTION**: Add a new OData dataSource and create an additional SAPUI5 model entry (named model) to be consumed by the app. Useful for adding read-only or auxiliary data sources without replacing the main model.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "sap.app": {
    "dataSources": {
      "AdditionalService": {
        "uri": "/sap/opu/odata/sap/Z_ADDITIONAL_SRV/",
        "type": "OData",
        "settings": {
          "odataVersion": "2.0"
        }
      }
    }
  },
  "sap.ui5": {
    "models": {
      "additionalModel": {
        "dataSource": "AdditionalService",
        "settings": {
          "defaultBindingMode": "OneWay"
        }
      }
    }
  }
}
```

**STEP**: 4 — Add SAPUI5 Component Usages
**DESCRIPTION**: Register third-party or custom UI5 components for usage inside the app via sap.ui5/componentUsages. Use this to declaratively reference components that will be instantiated by the app.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "sap.ui5": {
    "componentUsages": {
      "CustomComponentAlias": {
        "name": "my.custom.Component",
        "manifest": false,
        "settings": {
          "someSetting": "value"
        }
      }
    }
  }
}
```

**STEP**: 5 — Add or Change Inbound (FLP navigation)
**DESCRIPTION**: Add or modify inbound navigation entries for SAP Fiori Launchpad (semantic objects/actions) under sap.app/crossNavigation/inbounds. Use this when you want the adapted app to be launched via a new FLP intent.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "sap.app": {
    "crossNavigation": {
      "inbounds": {
        "ManageProduct": {
          "semanticObject": "Product",
          "action": "manage",
          "title": "Manage Product",
          "signature": {
            "parameters": {}
          },
          "deviceTypes": {
            "desktop": true,
            "tablet": true,
            "phone": true
          }
        }
      }
    }
  }
}
```

**STEP**: 6 — Reference: Extending Delivered App Manifest
**DESCRIPTION**: For advanced scenarios and a complete list of supported manifest extension points in adaptation projects, consult the official UI5 documentation.
**LANGUAGE**: General
**CODE**:
```text
Reference: Extending the Delivered Apps Manifest Using an Adaptation Project
URL: https://ui5.sap.com/#/topic/a2b24a69baef4b91af2293ccc6b5871f
```

--------------------------------

**TITLE**: Adding Local Annotation Files for Fiori Tools

**INTRODUCTION**: Steps to add a local annotation file in a Fiori Tools adaptation project. Use these UI actions to create or link annotation XML files that target an OData service declared in the base application's manifest. Includes on-premise prerequisite.

**TAGS**: fiori-tools, annotations, odata, SAP, adaptation, local-files, manifest

**STEP**: Prerequisite

**DESCRIPTION**: For adaptation projects targeting an On-Premise system, ensure the ABAP platform version requirement is met before adding local annotation files.

**LANGUAGE**: N/A

**CODE**:
```text
ABAP Platform 2020 SP00 (minimum) — required for On-Premise adaptation projects
```

**STEP**: Start "Add Local Annotation File" Action

**DESCRIPTION**: In the project explorer, right-click one of these items to start adding a local annotation file: the project root (main folder), the webapp folder, or the manifest variant file. This opens the Add Local Annotation File dialog.

**LANGUAGE**: UI

**CODE**:
```text
Right-click → Add Local Annotation File
Valid targets to right-click:
- <project-root>
- webapp
- manifest.appdescr_variant
```

**STEP**: Select Target OData Service

**DESCRIPTION**: In the Add Local Annotation File dialog, select the Target OData Service from the dropdown. The dropdown lists OData services defined in the base application's manifest. Choose the service you want the annotation file to target.

**LANGUAGE**: UI

**CODE**:
```text
Dialog field: Target OData Service
Source: manifest of the base application (services defined in the manifest)
Action: select the service that this annotation file will target
```

**STEP**: Create or Link Annotation File

**DESCRIPTION**: Choose whether to create a new empty local annotation file (which you will edit later) or to link an existing annotation file from the workspace. Creating a new file generates a local annotation XML file placeholder; linking uses an existing file in your workspace.

**LANGUAGE**: UI

**CODE**:
```text
Options:
- Create empty annotation file (new local .xml file)
- Select existing annotation file from workspace
```

**STEP**: Finish and Save

**DESCRIPTION**: Click Finish to confirm the selection and save the local annotation file into your project. Verify the file is added under the project (typically under webapp or a designated annotations folder) and that the manifest/variant references are updated as needed.

**LANGUAGE**: UI

**CODE**:
```text
Dialog action: Finish
Result:
- New or linked annotation file added to project
- Manifest/variant entries updated to reference the local annotation file
```
--------------------------------

**TITLE**: Adding Local Annotation Files to an Adaptation Project (SAP Fiori Tools)

**INTRODUCTION**: Step-by-step actions to add local annotation files into an adaptation project. Two methods are supported: using the Adaptation Project wizard (from the manifest) and using the Adaptation Editor (UI Adaptation mode). Includes where generated files are stored and how to enable LSP-assisted editing.

**TAGS**: fiori-tools, adaptation, annotations, annotation-files, sap, manifest, lsp, xml-annotations

**STEP**: 1 — Add Local Annotation File using the Adaptation Project Wizard

**DESCRIPTION**: Use the Adaptation Project context menu on the adaptation project's manifest to create or link a local annotation file. The wizard will guide you to select the target OData service, authenticate if required, and choose between creating an empty annotation or selecting an existing workspace file.

**LANGUAGE**: text

**CODE**:
```text
1. In your workspace, right-click the adaptation project's manifest file:
   manifest.appdescr_variant

2. From the context menu choose:
   Adaptation Project > Add Local Annotation File

3. Wizard flow:
   - If prompted, enter credentials for the system used to create the adaptation project.
   - From the "Target OData Service" dropdown, select the OData service (from the base app manifest) to which the annotation file will be added.
   - Choose to either:
     * Create an empty annotation file (editable later), or
     * Select an existing annotation file from the workspace.
   - Click "Finish" to persist changes.
```

**STEP**: 2 — Add Local Annotation File from the Adaptation Editor (UI Adaptation)

**DESCRIPTION**: Create a local annotation file directly from the Adaptation Editor while in UI Adaptation mode and ensure the change is saved and applied by saving and reloading.

**LANGUAGE**: text

**CODE**:
```text
1. Open Adaptation Editor and switch to mode: UI Adaptation
2. In the Object Page Quick Actions select:
   Add Local Annotation File
3. Use the Adaptation Editor header button:
   Save and reload
4. The new local annotation file will be generated and saved into your adaptation project.
```

**STEP**: 3 — Location and file path details for generated annotation files

**DESCRIPTION**: The wizard or editor creates the local annotation file inside the adaptation project workspace. Use these file paths to locate or reference the files in automated scripts or code generators.

**LANGUAGE**: text

**CODE**:
```text
Typical generated file path inside the adaptation project:
<adaptation-project-root>/changes/annotations/<your-local-annotation-file>.xml

Primary manifest file for the adaptation project:
manifest.appdescr_variant
```

**STEP**: 4 — Annotation LSP support and recommended extension

**DESCRIPTION**: Enable Language Server features for annotation files using the SAP Fiori Tools XML Annotation LSP extension. This adds code assistance, validation, and completions when editing local annotation XML files in the adaptation project.

**LANGUAGE**: text

**CODE**:
```text
Recommended extension:
SAP Fiori Tools – XML Annotation LSP

Usage:
- Install the extension in your development environment (for example, SAP Business Application Studio or VS Code).
- Open local annotation files in <adaptation-project>/changes/annotations/ to get LSP-assisted editing.

Reference:
Maintaining Annotations with Language Server:
Developing-an-Application/maintaining-annotations-with-language-server-6fc93f8.md
```
--------------------------------

**TITLE**: Adding OData Service and New SAPUI5 Model

**INTRODUCTION**: Step-by-step instructions to add an OData service and a corresponding SAPUI5 model to a Fiori project using the Add OData Service → Model wizard. Includes how to supply model settings and optional annotation data sources. Use this when you need to register an OData V2 service (with annotations) or other OData versions and persist the configuration into your project manifest (manifest.appdescr_variant / webapp).

**TAGS**: fiori-tools, SAPUI5, OData, annotations, manifest.appdescr_variant, webapp

**STEP**: 1 — Open the Add OData Service Wizard

**DESCRIPTION**: Open the wizard that creates the OData model entry. Right-click the project main folder, the webapp folder, or the manifest.appdescr_variant file and choose Add OData Service > Model.

**LANGUAGE**: text

**CODE**:
```text
# Right-click location options:
- Project main folder
- webapp
- manifest.appdescr_variant

# Menu:
Add OData Service > Model
```

**STEP**: 2 — Enter OData Service name

**DESCRIPTION**: Provide a descriptive name for the OData service you are adding. This name identifies the service in the manifest and model registry.

**LANGUAGE**: text

**CODE**:
```text
# Example:
MySalesOrderService
```

**STEP**: 3 — Enter OData Service URI

**DESCRIPTION**: Provide the base URI/endpoint for the OData service (e.g., the service root URL). This will be used as the model's serviceUrl.

**LANGUAGE**: text

**CODE**:
```text
# Example:
https://example.com/odata/service/
```

**STEP**: 4 — Choose OData version

**DESCRIPTION**: Select the OData protocol version for the service (e.g., V2 or V4). If you plan to use annotations with OData V2, note that an annotation data source must be added.

**LANGUAGE**: text

**CODE**:
```text
# Typical options:
- OData V2
- OData V4
```

**STEP**: 5 — Enter SAPUI5 Model name

**DESCRIPTION**: Provide the SAPUI5 model name (the key under models in the manifest) to register the OData model for consumption in controllers and views.

**LANGUAGE**: text

**CODE**:
```text
# Example:
salesOrderModel
```

**STEP**: 6 — (Optional) Enter OData Model settings

**DESCRIPTION**: Optionally supply model settings as key/value pairs. The wizard expects a comma-separated list of key/value pairs in the format shown below. These settings will be applied to the SAPUI5 OData model instance (e.g., defaultBindingMode, useBatch, etc.).

**LANGUAGE**: text

**CODE**:
```text
"key1":"value1","key2":"value2",
```

**STEP**: 7 — (Optional) Add annotation data source

**DESCRIPTION**: If you choose to add annotations, the wizard will prompt for annotation datasource details. For OData V2 with annotations, the annotation data source must be added. Provide the annotation data source name and URI and optionally annotation-specific settings in the same key/value format.

**LANGUAGE**: text

**CODE**:
```text
# Required:
- OData Annotation Data Source name
  Example: MyAnnotations

- OData Annotation Data Source URI
  Example: https://example.com/annotation/metadata.xml

# Optional annotation settings (same format as model settings):
"key1":"value1","key2":"value2",
```

**STEP**: 8 — Finish and persist changes

**DESCRIPTION**: Click Finish to save the new OData model and any annotation data source entries. The wizard writes the model and annotation configuration into the project manifest (manifest.appdescr_variant or webapp manifest as applicable).

**LANGUAGE**: text

**CODE**:
```text
# Result:
- entries added/updated in manifest.appdescr_variant (or webapp manifest)
- model key (e.g., salesOrderModel) configured with serviceUrl, settings
- annotation data source added if selected
```
--------------------------------

**TITLE**: Add OData Service and SAPUI5 Model to an Adaptation Project

**INTRODUCTION**: This guide explains the exact inputs and steps to add an OData service and an SAPUI5 model to an adaptation project by using the Adaptation Project > Add OData Service And SAPUI5 Model wizard. It includes required fields, optional settings format examples, and a reminder that OData V2 services using annotations require an annotation data source.

**TAGS**: fiori-tools, odata, sapui5, manifest, adaptation-project, annotations

**STEP**: 1 — Open adaptation manifest

**DESCRIPTION**: Locate the adaptation project's descriptor file to launch the wizard from its context menu. This is the file you will right-click to start the Add OData Service And SAPUI5 Model wizard.

**LANGUAGE**: text

**CODE**:
```text
File to right-click: manifest.appdescr_variant
```

**STEP**: 2 — Launch the wizard

**DESCRIPTION**: Right click the manifest.appdescr_variant file, select Adaptation Project > Add OData Service And SAPUI5 Model to open the wizard UI. The wizard will prompt for the OData service and model details described in the following steps.

**LANGUAGE**: text

**CODE**:
```text
UI action: Right click manifest.appdescr_variant -> Adaptation Project > Add OData Service And SAPUI5 Model
```

**STEP**: 3 — Enter OData service identity

**DESCRIPTION**: Provide the OData service name and its base URI exactly as reachable by the application. Select the OData protocol version (V2 or V4) from the wizard. Note: Only OData V2 with annotations requires adding a separate annotation data source (see Step 6).

**LANGUAGE**: text

**CODE**:
```text
Inputs:
- OData Service name: <serviceName>
- OData Service URI: https://.../<serviceEndpoint>
- OData version: V2 | V4
```

**STEP**: 4 — Provide SAPUI5 model name and optional settings

**DESCRIPTION**: Enter the SAPUI5 model name to be added to the manifest and optionally supply model initialization settings using a JSON-like key:value format. The wizard expects settings in a compact key/value list format (see CODE block). Ensure commas and quotes match the example.

**LANGUAGE**: JSON

**CODE**:
```json
// Example settings format (enter as single line in wizard field)
"key1":"value1","key2":"value2",
```

**STEP**: 5 — Decide whether to add annotations (optional)

**DESCRIPTION**: Choose whether to add an annotation data source. If you choose Yes, provide the annotation data source name and URI. For OData V2 services that use annotations, adding this annotation data source is required. You may also provide optional annotation-specific settings in the same key:value format.

**LANGUAGE**: text

**CODE**:
```text
If Add Annotation = Yes:
- OData Annotation Data Source name: <annotationDataSourceName>
- OData Annotation Data Source URI: https://.../<annotationFile>.xml
Optional annotation settings (same format):
"key1":"value1","key2":"value2",
```

**STEP**: 6 — Finish and save

**DESCRIPTION**: Click Finish in the wizard to apply changes. The wizard will update the adaptation manifest (manifest.appdescr_variant) to include the new data source(s) and SAPUI5 model entries based on the inputs you provided.

**LANGUAGE**: text

**CODE**:
```text
Action: Click Finish -> manifest.appdescr_variant is updated with:
- new OData service data source entry
- new SAPUI5 model entry
- (if chosen) new annotation data source entry
```
--------------------------------

**TITLE**: Add SAPUI5 Component Usages to Adaptation Project (manual)

**INTRODUCTION**: This guide shows the exact manual steps to add SAPUI5 Component Usages in an adaptation project when tooling automation is not available. Use it to configure component usage entries in the adaptation project's manifest (manifest.appdescr_variant), define lazy loading, add component settings and extra component data, and reference required libraries.

**TAGS**: fiori-tools, SAPUI5, component-usage, adaptation, manifest, manifest.appdescr_variant

STEP: 1 — Open adaptation project manifest and start wizard

DESCRIPTION: Locate the adaptation project's manifest file and start the Add SAPUI5 Component Usages wizard from the Adaptation Project menu.

LANGUAGE: Text

CODE:
```text
Right-click the file: manifest.appdescr_variant
Context menu: Adaptation Project > Add SAPUI5 Component Usages
```

STEP: 2 — Enter Component Usage ID

DESCRIPTION: In the wizard, enter the unique Component Usage ID. This ID identifies the usage entry in the manifest and will be the key under "componentUsages".

LANGUAGE: Text

CODE:
```text
Component Usage ID: <your_component_usage_id>
```

STEP: 3 — Enter Component name

DESCRIPTION: Provide the fully qualified component name (UI5 component name) to reference. This is the value that will be used for the "name" property of the component usage.

LANGUAGE: Text

CODE:
```text
Component name: <namespace.ComponentName>
```

STEP: 4 — Set lazy loading option

DESCRIPTION: Choose whether the component usage should be loaded lazily. Set the "lazy" property accordingly (true = lazy load, false = immediate).

LANGUAGE: Text

CODE:
```text
Lazy: true | false
```

STEP: 5 — (Optional) Enter Component settings (raw format)

DESCRIPTION: Optionally add settings for the Component. The wizard accepts key/value pairs in a simple quoted format. Keep the exact snippet format if entering raw pairs.

LANGUAGE: Text

CODE:
```text
"key1":"value1","key2":"value2",
```

STEP: 6 — (Optional) Enter additional Component Data (raw format)

DESCRIPTION: Optionally enter additional componentData entries in the wizard. Use the raw key/value format as shown (preserve the exact snippet format when copying into the wizard).

LANGUAGE: Text

CODE:
```text
key1":"value1","key2":"value2",
```

STEP: 6a — (Recommended) Valid JSON examples for settings and componentData

DESCRIPTION: If you prefer to construct valid JSON payloads before pasting into the wizard or editing manifest manually, use these examples. Wrap settings in an object and componentData as needed.

LANGUAGE: JSON

CODE:
```json
// Component settings example (valid JSON object)
{
  "key1": "value1",
  "key2": "value2"
}

// componentData example (valid JSON object)
{
  "key1": "value1",
  "key2": "value2"
}
```

STEP: 7 — Add library reference (optional)

DESCRIPTION: If the component needs a library reference, choose to add it. Provide the library identifier and optionally set that library reference to lazy.

LANGUAGE: Text

CODE:
```text
Add library reference: Yes | No
Library: <library.name>
Library lazy: true | false
```

STEP: 8 — Finish and save changes

DESCRIPTION: Click Finish in the wizard to persist the new component usage entry into manifest.appdescr_variant. After finishing, verify the manifest structure under "sap.ui5" -> "componentUsages" and confirm properties: name, lazy, settings, componentData, and any library references.

LANGUAGE: Text

CODE:
```text
Verify manifest.appdescr_variant:
sap.ui5:
  componentUsages:
    <your_component_usage_id>:
      name: <namespace.ComponentName>
      lazy: true|false
      settings: { ... }
      componentData: { ... }
      // optional library references as configured
```
--------------------------------

**TITLE**: Add SAPUI5 Component Usages Manually (Wizard or Manifest)

**INTRODUCTION**: Step-by-step instructions to add SAPUI5 component usages either via the Fiori Tools wizard (right-click context menu) or by editing the manifest file directly. Includes the exact JSON template to insert under "sap.ui5.componentUsages" in webapp/manifest.json or manifest.appdescr_variant.

**TAGS**: SAPUI5, Fiori Tools, manifest, componentUsages, manifest.appdescr_variant, webapp

**STEP**: 1 — Launch Add SAPUI5 Component Usages Wizard

**DESCRIPTION**: In your project explorer, right-click one of these targets and choose "Add SAPUI5 Component Usages": project main folder, webapp folder, or the manifest.appdescr_variant file. This opens the wizard that prompts for component usage fields.

**LANGUAGE**: UI Action

**CODE**:
```text
Right-click -> Add SAPUI5 Component Usages
Targets: project root, webapp folder, or manifest.appdescr_variant
```

**STEP**: 2 — Provide Component Usage ID and Name

**DESCRIPTION**: In the wizard enter:
- Component Usage ID (unique identifier used as the key inside sap.ui5/componentUsages)
- Component name (fully qualified component namespace, e.g., my.namespace.Component)

**LANGUAGE**: UI Action

**CODE**:
```text
Component Usage ID: MyComponentUsageId
Component name: my.namespace.Component
```

**STEP**: 3 — Configure Lazy Loading Option

**DESCRIPTION**: Choose whether the component usage should be lazy-loaded. If lazy is true, the component is instantiated only when used.

**LANGUAGE**: UI Action

**CODE**:
```text
Set lazy: true | false
```

**STEP**: 4 — Enter Component Settings (Optional)

**DESCRIPTION**: (Optional) Enter component settings as JSON key/value pairs. Example formats shown below (wizard accepts compact key:value entry). Preserve key/value string structure.

**LANGUAGE**: Text / Example input

**CODE**:
```text
"key1":"value1","key2":"value2",
```

**STEP**: 5 — Enter Component Data (Optional)

**DESCRIPTION**: (Optional) Enter additional componentData as JSON key/value pairs (passed to component upon instantiation). Provide compact key:value entry when using the wizard.

**LANGUAGE**: Text / Example input

**CODE**:
```text
key1":"value1","key2":"value2",
```

**STEP**: 6 — Add Library Reference (Optional)

**DESCRIPTION**: Optionally add a library reference for the component. If enabled, provide the library name and whether the library reference is lazy.

**LANGUAGE**: UI Action

**CODE**:
```text
Library reference name: my.library.name
Library lazy: true | false
```

**STEP**: 7 — Finish Wizard

**DESCRIPTION**: Click Finish to save the new component usage into the manifest (webapp/manifest.json or manifest.appdescr_variant). The wizard will update the manifest under sap.ui5.componentUsages.

**LANGUAGE**: UI Action

**CODE**:
```text
Click Finish -> manifest updated
File targets updated: webapp/manifest.json or manifest.appdescr_variant
```

**STEP**: 8 — Manual manifest.json Template (Direct Edit)

**DESCRIPTION**: If you prefer to edit the manifest manually, insert a component usage entry under "sap.ui5" -> "componentUsages". Use this JSON template and adapt IDs, names, settings, componentData, lazy flags, and library reference as required.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "sap.ui5": {
    "componentUsages": {
      "MyComponentUsageId": {
        "name": "my.namespace.Component",
        "lazy": true,
        "settings": {
          "key1": "value1",
          "key2": "value2"
        },
        "componentData": {
          "key1": "value1",
          "key2": "value2"
        },
        "library": {
          "name": "my.library",
          "lazy": true
        }
      }
    }
  }
}
```

**STEP**: 9 — Save and Validate

**DESCRIPTION**: Save manifest file and validate the change:
- Run UI5 app or build to ensure the component is resolved.
- Check console/network for component module load and instantiation.
- If the wizard was used, confirm the manifest entry appears at webapp/manifest.json or manifest.appdescr_variant.

**LANGUAGE**: Commands / Verification

**CODE**:
```text
1. Save manifest.json
2. Run application (npm start | ui5 serve | Fiori launch)
3. Verify component load and no manifest JSON errors in console
```
--------------------------------

**TITLE**: Change Inbound (Adaptation Project)

**INTRODUCTION**: Update the title, subtitle and icon of an existing inbound (intent) in an adaptation project by editing the adaptation manifest (manifest.appdescr_variant) using the Adaptation Project - Change Inbound action. Use this when you need to rename or rebrand a navigation intent without manually editing the manifest JSON.

**TAGS**: fiori-tools, adaptation, inbound, manifest.appdescr_variant, SAPUI5, guide

**STEP**: 1 — Open the adaptation manifest

**DESCRIPTION**: In your adaptation project, locate the manifest file named manifest.appdescr_variant. Right-click that file and select the menu entry "Adaptation Project - Change Inbound" to start the inbound change wizard.

**LANGUAGE**: text

**CODE**:
```text
ProjectRoot/
  └─ manifest.appdescr_variant
Right-click manifest.appdescr_variant -> Adaptation Project - Change Inbound
```

**STEP**: 2 — Select the inbound (intent) to change

**DESCRIPTION**: From the wizard UI, choose the Inbound ID (the intent identifier) you want to modify. The wizard lists all available inbounds defined for the application variant. Note the exact Inbound ID you select — this is used to update that intent's metadata.

**LANGUAGE**: text

**CODE**:
```text
Example inbound IDs shown in the wizard:
- DisplayObjectDetails
- ManageOrders
- SalesOrder-Display
(Select the appropriate inbound ID from the list)
```

**STEP**: 3 — Enter the new title, subtitle and icon path

**DESCRIPTION**: Enter the new Title and Subtitle values and, if required, the icon path. The wizard will update the selected inbound in manifest.appdescr_variant so the intent displays the provided metadata in launchers and navigation UIs.

**LANGUAGE**: JSON

**CODE**:
```json
// Example: illustrative snippet of how an inbound entry may look inside manifest.appdescr_variant
{
  "sap.app": {
    "crossNavigation": {
      "inbounds": {
        "DisplayObjectDetails": {
          "semanticObject": "Object",
          "action": "display",
          "title": "New Title for Object Details",       // updated by the wizard
          "subTitle": "New Subtitle describing the intent", // updated by the wizard
          "icon": "sap-icon://inspect"                   // optional: icon path updated by the wizard
        }
      }
    }
  }
}
```

**STEP**: 4 — Finish and generate project changes

**DESCRIPTION**: Click Finish in the wizard. The adaptation project will be generated/updated with the modified manifest.appdescr_variant reflecting the new title, subtitle and icon for the selected inbound. Verify the changes by opening manifest.appdescr_variant and testing the launcher/navigation behavior in your app.

**LANGUAGE**: text

**CODE**:
```text
After Finish:
- manifest.appdescr_variant is updated with the new inbound metadata
- Verify by opening manifest.appdescr_variant and confirming:
  - The selected inbound ID contains the new "title" and "subTitle"
  - Optional "icon" path updated as provided
```
--------------------------------

**TITLE**: Check Consistency of Release State (SAPUI5 Component Consistency ATC - CI_UI5_COMP)

**INTRODUCTION**: Verify that a UI5 application's declared release state in its manifest.json matches the release state in the SAPUI5 ABAP (BSP) repository and that the app's release contract is consistent with the OData services it consumes. Use the ATC check CI_UI5_COMP to detect mismatches and contract inconsistencies (C0 for Extend, C1 for Use System Internally).

**TAGS**: fiori-tools, SAPUI5, ATC, CI_UI5_COMP, manifest.json, release-state, C0, C1, BSP

STEP: 1 — Locate manifest.json and read release state

DESCRIPTION: Open the UI5 app descriptor (manifest.json). The release state is declared under sap.fiori/cloudDevAdaptationStatus. Typical values:
- "C0" = Extend (apps that can be extended by adaptation projects)
- "C1" = Use System Internally (services that must remain stable)

LANGUAGE: JSON

CODE:
```json
{
  "sap.fiori": {
    "cloudDevAdaptationStatus": "C0"
  },
  "sap.app": {
    "id": "my.ui5.app",
    "applicationVersion": {
      "version": "1.0.0"
    }
  }
}
```

STEP: 2 — Locate manifest.json in target repository (local, BSP or deployed)

DESCRIPTION: Confirm which manifest.json is authoritative for runtime:
- Local/dev project: webapp/manifest.json (or src/manifest.json depending on project layout).
- Deployed in ABAP: UI5/manifest.json stored in BSP repository (SAPUI5 ABAP repo / BSP application). Confirm the BSP's descriptor matches the app project.

LANGUAGE: Text

CODE:
```text
Common paths:
- Local/Dev: <project-root>/webapp/manifest.json
- Deployed (BSP): <BSP application resource>/manifest.json (SAPUI5 ABAP repository)
```

STEP: 3 — Use ATC check CI_UI5_COMP to verify consistency

DESCRIPTION: Run the SAPUI5 Component Consistency ATC check (ID: CI_UI5_COMP). This check validates:
- sap.fiori/cloudDevAdaptationStatus in the UI5 BSP repository equals the back-end system value (prevents deployment or manual-edit mismatches).
- Release-state consistency between the UI5 app (C0) and its consumed OData services (C1 where required).

LANGUAGE: Text

CODE:
```text
ATC check:
- Name/ID: SAPUI5 Component Consistency (CI_UI5_COMP)
- Purpose: Verify manifest.json release state consistency and contract compatibility between UI5 app and backend services
- Run context: ABAP ATC / CI pipeline that triggers ATC checks against BSP and backend metadata
```

STEP: 4 — Resolve mismatches and ensure correct contracts

DESCRIPTION: If CI_UI5_COMP reports mismatches:
1. Inspect both manifest.json files (local/project and BSP) and back-end service contracts.
2. Decide authoritative value:
   - Set UI5 app to "C0" only if app is intended to be extended.
   - Ensure OData/services used by the app are "C1" (stable) if required.
3. Update manifest.json in source project, then redeploy to BSP to align repository manifest with backend expectations.
4. Re-run CI_UI5_COMP until no inconsistencies remain.

LANGUAGE: Text

CODE:
```text
Fix workflow:
1. Edit <project-root>/webapp/manifest.json -> "sap.fiori"/"cloudDevAdaptationStatus": "C0" or "C1"
2. Rebuild/package UI5 app if required (e.g., sap.ui5 tooling or build tasks)
3. Redeploy to BSP repository so BSP manifest.json matches source
4. Re-run CI_UI5_COMP ATC check
```

STEP: 5 — References and documentation links

DESCRIPTION: Use these official references for contract meanings, manifest descriptor details, and CI_UI5_COMP behavior.

LANGUAGE: Text

CODE:
```text
References:
- ATC Check SAPUI5 Component Consistency: https://ui5.sap.com/#/topic/a71400bc82284449bb6c680a4516cc63
- Extend (C0) contract: https://help.sap.com/docs/SAP_S4HANA_CLOUD/25cf71e63940453397a32dc2b7676947/2ce344a782d74d8aab073fa188af5116.html
- Use System-Internally (C1) contract: https://help.sap.com/docs/SAP_S4HANA_CLOUD/25cf71e63940453397a32dc2b7676947/3ccb57a1a4d04ee192fdc2a849a89158.html
- manifest.json descriptor details: https://ui5.sap.com/#/topic/be0cf40f61184b358b5faedaec98b2da
- Develop and Deploy UI5 app to SAP S/4HANA Cloud: https://help.sap.com/docs/SAP_S4HANA_CLOUD/6aa39f1ac05441e5a23f484f31e477e7/2a4ae231df8843379df7a36fa3462d4c.html
```
--------------------------------

**TITLE**: Check Whether an Adaptation Project Is Up-To-Date with Base App Upgrades (ATC check: UI5_BASE_APP_VERS)

**INTRODUCTION**: Use the ABAP Test Cockpit (ATC) check "Compare Used and Current Version of Base App" (UI5_BASE_APP_VERS) to detect adaptation projects that reference an older version of a SAP Fiori base app. Run this check for your packages in ADT/ATC, inspect the messages, and follow the remediation steps (test in Business Application Studio Visual Editor, re-deploy, or create a new adaptation project) when a newer base app version or a successor app is available.

**TAGS**: fiori-tools, atc, abap, sap-s4hana-cloud, adaptation-project, ui5, base-app, upgrades

STEP: 1 — Create ATC check variant and add the UI5_BASE_APP_VERS check

DESCRIPTION: Create an ATC check variant in your ATC configuration and add the ATC check named UI5_BASE_APP_VERS ("Compare Used and Current Version of Base App"). Use this variant to run checks against your packages. See ATC documentation for variant creation if needed.

LANGUAGE: Text

CODE:
```Text
ATC check ID: UI5_BASE_APP_VERS
Title: Compare Used and Current Version of Base App
Purpose: Detect adaptation projects where the base app has a higher (newer) version than used in the adaptation project.
```

STEP: 2 — Run the ATC check for your packages

DESCRIPTION: Execute the ATC variant (containing UI5_BASE_APP_VERS) for the relevant packages in ABAP Development Tools (ADT) / ABAP Test Cockpit. Run the check across all adaptation-project packages to identify mismatches between used and current base app versions. See "ATC Quality Checking" and "Checking Quality of ABAP Code with ATC" for ATC usage in ADT.

LANGUAGE: Text

CODE:
```Text
Resources:
- ATC Quality Checking: https://help.sap.com/docs/SAP_S4HANA_CLOUD/25cf71e63940453397a32dc2b7676947/4ec1a1126e391014adc9fffe4e204223.html
- Checking Quality of ABAP Code with ATC: https://help.sap.com/docs/SAP_S4HANA_CLOUD/25cf71e63940453397a32dc2b7676947/4ec5711c6e391014adc9fffe4e204223.html
```

STEP: 3 — Recognize the ATC messages and their meanings

DESCRIPTION: The ATC check can produce errors/warnings. Match the exact message text to the required action.

LANGUAGE: Text

CODE:
```Text
Possible ATC messages:

1) For the used base app <base app ID> a new version is available, please update

Meaning: The base app has a newer version than the one referenced by the adaptation project. Update the adaptation project to match the current base app version and re-deploy.

2) The base app <base app ID> was deleted, please check the successor app

Meaning: The base app has been removed by SAP and has a successor app. Create a new adaptation project based on the successor app (recommended). If you do not re-deploy the adaptation project immediately, this error does not cause immediate runtime issues, but remediation is advised.
```

STEP: 4 — Fix: Base app has a new version — validate and update adaptation project

DESCRIPTION: Follow these action steps to update your adaptation project to the latest base app version:

1. Inspect what changed in the base app:
   - Use "What's New in SAP S/4HANA Cloud" and filter/search by the base app technical ID (example: F3331) to find release notes and functional/technical changes.
   - In the What's New Viewer, filter Category = App and search Technical Objects Name for the Fiori app ID.

2. Test adaptation project against the new base version:
   - Open the adaptation project in SAP Business Application Studio (BAS).
   - Launch the Visual Editor. The Visual Editor automatically fetches the latest version of the base app.
   - Test all relevant screens and extensions in the Visual Editor to identify incompatibilities.

3. Re-deploy the adaptation project:
   - After testing and applying necessary changes, re-deploy the adaptation project to the target environment.
   - If required, refresh your IAM app (Identity and Access Management) after deployment.

4. Review Upgrade Compatibility guidance:
   - Follow Upgrade Safe Compatibility Rules to avoid conflicts when upgrading.
   - SAP only provides fixes for the latest version of the base application — upgrading adaptation projects is necessary when the base app is updated.

LANGUAGE: Text

CODE:
```Text
Helpful links:
- What's New in SAP S/4HANA Cloud: https://help.sap.com/whats-new/7d3d11840a6543329e72391cf4d48e2d
- Upgrade Safe Compatibility Rules: upgrade-safe-compatibility-rules-53706e2.md (internal doc/reference)
Notes:
- Example app ID to search: F3331
- Visual Editor (BAS) behavior: automatically fetches the latest base app version for testing
```

STEP: 5 — Fix: Base app was deleted — migrate to successor app

DESCRIPTION: If ATC reports the base app was deleted, identify the successor app and create a new adaptation project based on that successor. If you cannot re-deploy immediately, the existing adaptation project remains functional for now, but migration is recommended.

LANGUAGE: Text

CODE:
```Text
Action:
1. Identify successor app (check SAP release notes / What's New Viewer)
2. Create a new adaptation project for the successor app (in BAS or the relevant tooling)
3. Re-implement or migrate customizations from the old adaptation project to the new one
4. Test in Visual Editor and re-deploy
```

STEP: 6 — Additional references and notes

DESCRIPTION: Keep these references and operational notes handy when running UI5_BASE_APP_VERS check or remediating findings.

LANGUAGE: Text

CODE:
```Text
Notes:
- ATC check ID: UI5_BASE_APP_VERS
- SAP provides fixes only for the latest base app version; ensure adaptation projects are upgraded when base apps are updated.
- For ATC variant creation and management, see Working with ATC Checks:
  https://help.sap.com/docs/SAP_S4HANA_CLOUD/25cf71e63940453397a32dc2b7676947/438842e71bfa4ff09443562f5ce2282d.html
```
--------------------------------

**TITLE**: Controller Extensions (SAP Fiori Tools)

**INTRODUCTION**: How to add and use controller extensions in SAP Fiori / SAPUI5 projects (adaptation projects). Includes where files are created, required project structure, how to override lifecycle methods, add new methods, and how to wire fragment/XML event handlers to the controller extension.

**TAGS**: fiori-tools, sapui5, controller-extension, adaptation, webapp, changes, coding, xml, javascript

**STEP**: Context / Requirements

**DESCRIPTION**: When to use controller extensions and project prerequisites. Controller extensions can augment or override controller behavior for a specific view, can be delivered with an adaptation project, and are added to the controller's .extension namespace to avoid name clashes. Only available when using SAP Fiori elements-based or freestyle SAPUI5 applications with asynchronous views.

**LANGUAGE**: text

**CODE**:
```text
- Controller extension namespace: .extension.<controller extension namespace>
- Valid only for:
  * SAP Fiori elements-based applications OR freestyle SAPUI5 applications
  * Applications with asynchronous views
```

**STEP**: Create controller extension (via UI Adaptation mode)

**DESCRIPTION**: Open Preview Application / start-editor from project root (right-click project folder, webapp, or manifest.appdescr_variant → Preview Application → start-editor). In UI Adaptation mode select a view or element and choose "Extend with Controller". Provide a name in the dialog. This creates the .js controller extension and a controllerExtension.change reference.

Files are created in these locations:
- Controller extension JS: <project>/webapp/changes/coding/<YourControllerExtension>.js
- Change reference file: <project>/webapp/changes/<YourControllerExtension>.controllerExtension.change

Do not move custom logic outside changes/coding — custom business logic files must reside in changes/coding only.

**LANGUAGE**: text

**CODE**:
```text
Created files:
- webapp/changes/coding/<YourControllerExtension>.js
- webapp/changes/<YourControllerExtension>.controllerExtension.change
```

**STEP**: Define override lifecycle methods and add new methods

**DESCRIPTION**: Edit the generated .js file. Lifecycle overrides must be inside the override section. New custom methods must be defined outside the override section. Use the override member to implement optional callbacks that run before/after or replace base controller behavior.

Example minimal controller extension template (JS module exporting an extension object with override and custom methods):

**LANGUAGE**: JavaScript

**CODE**:
```javascript
sap.ui.define([], function () {
  "use strict";

  return {
    // Methods inside override are used to override or extend base lifecycle methods
    override: {
      onInit: function (oEvent) {
        // optional override logic for onInit lifecycle
        // Note: don't call base controller methods here; this is the extension override
      },
      onBeforeRendering: function () {
        // optional before rendering logic
      }
    },

    // Custom methods must be defined outside the override block
    onCustomAction: function (oEvent) {
      // custom event handler or logic for fragments/views
      // Implement business logic here
    }
  };
});
```

**STEP**: Assign XML fragment event handlers to the controller extension

**DESCRIPTION**: In XML fragments or view XML, prefix event handler names with .extension.<controller extension namespace> to bind events to the extension's methods. Save the XML after editing. You must manually change the fragment event handler names to reference the controller extension.

Concrete examples:

- Using the generic placeholder form shown in docs:
  .extension.<controller extension namespace>

- Example binding in an XML fragment, assuming controller extension namespace is "MyControllerExtension" and method is onCustomAction:

**LANGUAGE**: XML

**CODE**:
```xml
<!-- Example: fragment / view XML -->
<Button text="Action" press=".extension.MyControllerExtension.onCustomAction" />
```

**STEP**: Reload editor / preview to load the change

**DESCRIPTION**: After saving the .js extension and any edited XML fragments, reload the browser tab where the adaptation project editor or application preview is open to load the newly added change.

**LANGUAGE**: text

**CODE**:
```text
- Reload the adaptation editor tab and application preview tab (if separate) to pick up the new controller extension change.
```

**STEP**: Important notes and best practices

**DESCRIPTION**: Key constraints and tips:
- Keep custom JS files within webapp/changes/coding.
- Lifecycle override methods must live inside the override section; new methods must be outside.
- Use the Add Controller to Page quick action for page-level controller extensions in list report or object page apps.
- For list report / object page / overview templates, the generated .js includes template-provided methods you can reuse/override. Analytical list page apps include only lifecycle methods in the generated file.

**LANGUAGE**: text

**CODE**:
```text
Do NOT:
- Create extra folders above webapp/changes/coding (this invalidates project structure and blocks deployment).

Tips:
- Use "Add Controller to Page" quick action to add a page-level extension quickly.
- For fragment handlers, always prefix method with: .extension.<controller extension namespace>
```
--------------------------------

**TITLE**: Controller Extensions for SAPUI5 (Adaptation Editor)

**INTRODUCTION**: Controller extensions let you add new methods or override lifecycle/base methods of a controller in SAP Fiori elements or freestyle SAPUI5 applications using the Adaptation Editor. Use them to attach fragment event handlers, provide custom business logic, or override onInit/onBeforeRendering/onAfterRendering/onExit behaviors. These extensions are delivered in the adaptation project's reserved .extension namespace to avoid name clashes.

**TAGS**: sapui5, fiori, controller-extension, adaptation-editor, manifest, fragments, xml, javascript, adaptation

**STEP**: 1 — Preconditions

**DESCRIPTION**: Verify your project and view types. Controller extensions can be added only for:
- SAP Fiori elements based applications or freestyle SAPUI5 applications.
- Applications that use asynchronous views.

Also ensure you are working in the project workspace that contains the webapp folder.

**LANGUAGE**: Plain

**CODE**:
```text
Prerequisites:
- Project type: SAP Fiori elements OR freestyle SAPUI5
- Views: asynchronous (async)
- Project folder: <your-project>/webapp
```

**STEP**: 2 — Open the Adaptation Editor

**DESCRIPTION**: In your workspace open the manifest descriptor variant in the Adaptation Editor to make UI-level changes and add controller extensions.

**LANGUAGE**: Plain

**CODE**:
```text
File to open: <your-project>/webapp/manifest.appdescr_variant
Action: Right-click -> Open Adaptation Editor
Then: Click "Edit" in the Editor Header to enable canvas editing
```

**STEP**: 3 — Create a Controller Extension via the Canvas

**DESCRIPTION**: On the canvas, select the view or element you want to extend. From the project/context menu choose "Extend with Controller". Alternatively use the "Add Controller to Page" quick action for page-level extensions (list report / object page).

When you confirm the dialog and provide a name, two files are created:
- The controller extension JavaScript: webapp/changes/coding/<YourControllerExtension>.js
- A corresponding change reference: webapp/changes/...codeExt.change (references the .js file)

Do not create additional folders above changes/coding — custom logic files must also reside in changes/coding to maintain deployability.

**LANGUAGE**: Plain

**CODE**:
```text
Created files:
- <your-project>/webapp/changes/coding/MyControllerExtension.js
- <your-project>/webapp/changes/MyControllerExtension.codeExt.change
```

**STEP**: 4 — Structure your controller extension (override vs new methods)

**DESCRIPTION**: Define lifecycle method overrides inside the special override section. Define any new methods outside the override section. Lifecycle methods you can override include onInit, onBeforeRendering, onAfterRendering, onExit. For list report, object page, and overview page templates the generated .js may include additional template-specific methods to override; for analytical list page templates only lifecycle methods are included.

Recommended object-return structure for an extension file (controller extension files typically return an object literal). Place overrides in override: { ... } and new/public methods at the top level of the returned object.

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// <your-project>/webapp/changes/coding/MyControllerExtension.js
({
  // Lifecycle overrides go inside override
  override: {
    onInit: function () {
      // override base onInit
    },
    onExit: function () {
      // override base onExit
    }
  },

  // New methods (must be defined outside override)
  publicMethod: function () {
    // custom logic available to fragments (see STEP 6)
  },

  anotherHelper: function () {
    // helper method
  }
})
```

**STEP**: 5 — Assign fragment event handlers to the controller extension

**DESCRIPTION**: When attaching event handlers from XML fragments, manually reference the controller extension method using the .extension namespace prefix followed by your controller extension namespace and public method name. The fragment XML must reference the extension method path exactly.

Example: bind a Button press to publicMethod of the controller extension named my.sample.ControllerExtension.

**LANGUAGE**: XML

**CODE**:
```xml
<Button press=".extension.my.sample.ControllerExtension.publicMethod" text="Execute"></Button>
```

**STEP**: 6 — Save and reload the Adaptation Editor

**DESCRIPTION**: After saving the .js and fragment .xml changes, navigate back to the Adaptation Editor canvas. The editor prompts you to reload to apply the controller extension changes. A loading indicator displays:

"Loading Adaptation Editor with Controller Extension changes"

Confirm reload to see the extension active in preview.

**LANGUAGE**: Plain

**CODE**:
```text
Save files:
- webapp/changes/coding/MyControllerExtension.js
- modified fragments: webapp/.../<fragment>.xml

Reload prompt message:
"Loading Adaptation Editor with Controller Extension changes"
```

**STEP**: 7 — Important notes and deployment constraints

**DESCRIPTION**: Keep these technical constraints and best practices:
- Adaptation project controller extensions are added under the reserved .extension namespace.
- Do not create custom business logic files outside webapp/changes/coding; placing files at upper levels invalidates the project structure and prevents deployment.
- Use the override section for lifecycle overrides; always define additional public methods outside override.
- For template-specific override candidates (list report, object page, overview), inspect the generated .js for available methods to override.

**LANGUAGE**: Plain

**CODE**:
```text
Reserved namespace: .extension.<controller extension namespace>.<MethodName>
Allowed file location for custom logic: <your-project>/webapp/changes/coding/*
Do NOT create folders above changes/coding for custom files.
```
--------------------------------

**TITLE**: Create Control Variants (Views) — Add VariantManagement and Enable UI Adaptation

**INTRODUCTION**: Short, actionable guide to enable UI adaptation for SAPUI5 apps, add VariantManagement or SmartVariantManagement to an XML view, and use the Adaptation Editor to create, load, change, and save control variants (views). Includes minimum version requirements and manifest/XML examples required by code-generation tools.

**TAGS**: SAPUI5, UI Adaptation, VariantManagement, SmartVariantManagement, Adaptation Editor, flexEnabled, XML, manifest.json

STEP: 1 — Prerequisites and minimum SAPUI5 versions

DESCRIPTION: Ensure your project meets the minimum SAPUI5 versions and that the application is enabled for UI adaptation (flexibility). Use the Adaptation Editor only when the app is prepared for UI adaptation. Reference URLs:
- SAPUI5 Flexibility: Enable Your App for UI Adaptation: https://ui5.sap.com/#/topic/f1430c0337534d469da3a56307ff76af
- sap.ui.fl.variants.VariantManagement API Reference: https://ui5.sap.com/#/api/sap.ui.fl.variants.VariantManagement
- sap.ui.comp.smartvariants.SmartVariantManagement API Reference: https://sapui5.hana.ondemand.com/#/api/sap.ui.comp.smartvariants.SmartVariantManagement

Technical minimums:
- sap.ui.fl.variants.VariantManagement: SAPUI5 >= 1.73
- sap.ui.comp.smartvariants.SmartVariantManagement: SAPUI5 >= 1.90

LANGUAGE: JSON

CODE:
```json
{
  "sap.ui5": {
    "flexEnabled": true
  }
}
```

STEP: 2 — Add sap.ui.fl.variants.VariantManagement to an XML view (simple VariantManagement example)

DESCRIPTION: Insert the VariantManagement control into the XML view where you want users to select/create variants (called "views" in the UI). Use the sap.ui.fl.variants.VariantManagement control when SAPUI5 >= 1.73.

LANGUAGE: XML

CODE:
```xml
<mvc:View xmlns:mvc="sap.ui.core.mvc"
          xmlns:core="sap.ui.core"
          xmlns:vm="sap.ui.fl.variants"
          controllerName="my.app.controller.Main">
  <!-- VariantManagement control (sap.ui.fl.variants.VariantManagement) -->
  <vm:VariantManagement id="variantMgmt"
                        persistencyKey="my.view.variants"
                        showSetAsDefault="true" />
  <!-- other controls -->
</mvc:View>
```

STEP: 3 — Add sap.ui.comp.smartvariants.SmartVariantManagement to an XML view (smart variant example)

DESCRIPTION: If you prefer Smart Variant Management (additional features provided by sap.ui.comp.smartvariants), use this control and ensure SAPUI5 >= 1.90. Include the smartvariants namespace and the control in the XML view.

LANGUAGE: XML

CODE:
```xml
<mvc:View xmlns:mvc="sap.ui.core.mvc"
          xmlns:svc="sap.ui.comp.smartvariants"
          controllerName="my.app.controller.Main">
  <!-- SmartVariantManagement control (sap.ui.comp.smartvariants.SmartVariantManagement) -->
  <svc:SmartVariantManagement id="smartVariantMgmt" />
  <!-- Controls that integrate with the smart variant mechanism -->
</mvc:View>
```

STEP: 4 — Use the Adaptation Editor to create/load/change/save variants (workflow summary)

DESCRIPTION: Once the control is present and the app is enabled for flexibility:
- Open the Adaptation Editor for the application (key-user/adaptation mode).
- Create a new variant (view) for the control to capture a particular UI configuration.
- Load or switch between existing variants as needed.
- Make changes to the UI for a given variant and save the variant.

No special publish step is required for these adaptation-project changes: they are saved as ordinary changes inside the adaptation project (same handling as other UI adaptation changes). For the step-by-step user flow, refer to: Creating and Adapting Views — https://help.sap.com/viewer/4fc8d03390c342da8a60f8ee387bca1a/latest/en-US/91ae3492323b42a79ca66fbfaf5af3f9.html

LANGUAGE: None

CODE:
```text
Workflow (Adaptation Editor):
1. Launch Adaptation Editor (key-user/adapt mode).
2. Select the VariantManagement / SmartVariantManagement control.
3. Create new variant -> give name and optional default flag.
4. Switch to variant -> make UI changes.
5. Save changes (saved as ordinary adaptation change; no publish required).
```

STEP: 5 — Notes and behavior

DESCRIPTION: Important behavior and reminders for code generation and runtime:
- Variants are exposed to end users as "views" in the UI.
- Changes created by the Adaptation Editor for variants are saved within the adaptation project and do not require a separate publish step (unlike certain key-user scenarios).
- Ensure the correct SAPUI5 control is used based on your target SAPUI5 version:
  - Use sap.ui.fl.variants.VariantManagement for SAPUI5 >= 1.73.
  - Use sap.ui.comp.smartvariants.SmartVariantManagement for SAPUI5 >= 1.90.

LANGUAGE: None

CODE:
```text
References:
- Enable adaptation: https://ui5.sap.com/#/topic/f1430c0337534d469da3a56307ff76af
- VariantManagement API: https://ui5.sap.com/#/api/sap.ui.fl.variants.VariantManagement
- SmartVariantManagement API: https://sapui5.hana.ondemand.com/#/api/sap.ui.comp.smartvariants.SmartVariantManagement
```
--------------------------------

**TITLE**: Create Control Variants (Views) — Enable and Use VariantManagement in XML Views

**INTRODUCTION**: This guide explains how to enable UI adaptation for a SAPUI5 app and add control variant support (VariantManagement / SmartVariantManagement) in XML views. Includes manifest changes and sample XML snippets so an agent can generate or modify code to support Adaptation Editor use cases (create, load, change, save control variants).

**TAGS**: fiori-tools, sapui5, adaptation, variantmanagement, smartvariants, manifest, xml, flexEnabled

**STEP**: 1 — Enable UI adaptation in manifest.json

**DESCRIPTION**: Set the application to allow UI adaptation by enabling flexibility in the app manifest. Add or update the sap.ui5.flexEnabled property. This file is typically located at webapp/manifest.json.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "sap.ui5": {
    "flexEnabled": true
  }
}
```

**STEP**: 2 — Add VariantManagement control to an XML view

**DESCRIPTION**: Include the sap.ui.fl.variants.VariantManagement control in the XML view where you want to expose variants (views). Map the XML namespace for the control and add the VariantManagement element. This snippet shows a minimal sample view with a VariantManagement control. Adjust IDs and placement according to your UI layout.

**LANGUAGE**: XML

**CODE**:
```xml
<mvc:View
  xmlns:mvc="sap.ui.core.mvc"
  xmlns:variants="sap.ui.fl.variants"
  xmlns="sap.m"
  controllerName="your.namespace.Controller">
  <Page id="page">
    <content>
      <!-- VariantManagement control used to manage control variants (views) -->
      <variants:VariantManagement id="variantMgmt" />
      <!-- Your other controls go here -->
    </content>
  </Page>
</mvc:View>
```

**STEP**: 3 — (Optional) Use SmartVariantManagement for SmartControls

**DESCRIPTION**: If your app uses sap.ui.comp smart controls and the Smart Variant framework, include sap.ui.comp.smartvariants.SmartVariantManagement in the XML view. Map its XML namespace and add the control. This is useful when integrating with SmartTable/SmartFilterBar and centralizing variant storage.

**LANGUAGE**: XML

**CODE**:
```xml
<mvc:View
  xmlns:mvc="sap.ui.core.mvc"
  xmlns:smart="sap.ui.comp.smartvariants"
  xmlns="sap.m"
  controllerName="your.namespace.Controller">
  <Page id="page">
    <content>
      <!-- SmartVariantManagement for sap.ui.comp smart controls -->
      <smart:SmartVariantManagement id="smartVarMgmt" />
      <!-- SmartTable / SmartFilterBar references should point to this smartVarMgmt as needed -->
    </content>
  </Page>
</mvc:View>
```

**STEP**: 4 — Adaptation Editor workflow (create, change, save variants)

**DESCRIPTION**: Use the Adaptation Editor to create, load, change, and save control variants for controls that expose variant management. The process is identical to the key user scenario; the difference in the developer/adaptation project context is that changes are saved as ordinary changes in your adaptation project and do not require publishing. Follow these actions:
- Open the Adaptation Editor for the page that contains VariantManagement.
- Create a new variant (view) or edit an existing one.
- Save changes — changes are persisted in the adaptation project as regular changes (no publish step required).

**LANGUAGE**: text

**CODE**:
```text
Actions for Adaptation Editor:
1. Open Adaptation Editor for the target page (where VariantManagement is present).
2. Use VariantManagement UI to create/load/rename/delete variants.
3. Save changes — saved as ordinary changes within the adaptation project (no publish).
```

**STEP**: 5 — References and further integration notes

**DESCRIPTION**: Relevant API references and documentation for implementation and behavior. Use these for deeper integration or advanced scenarios (transport, backend persistence, or SmartVariant specifics).

**LANGUAGE**: text

**CODE**:
```text
References:
- SAPUI5 Flexibility: Enable Your App for UI Adaptation:
  https://sapui5.hana.ondemand.com/#/topic/f1430c0337534d469da3a56307ff76af
- VariantManagement API Reference:
  https://sapui5.hana.ondemand.com/#/api/sap.ui.fl.variants.VariantManagement
- SmartVariantManagement API Reference:
  https://sapui5.hana.ondemand.com/#/api/sap.ui.comp.smartvariants.SmartVariantManagement
```
--------------------------------

**TITLE**: Create the Adaptation Project (SAPUI5 Adaptation Project for SAP S/4HANA Cloud)

**INTRODUCTION**: Step-by-step instructions to create an SAPUI5 Adaptation Project from an existing SAP Fiori elements or freestyle SAPUI5 application in SAP S/4HANA Cloud Public Edition using VS Code and the Yeoman Template Wizard. Use this when you need to generate an adaptation project for in-app adaptations (ABAP target environment).

**TAGS**: fiori-tools, sapui5, adaptation, s4hana, vs-code, yeoman, abap, cloudready

**STEP**: 1 — Prepare Dev Space and Open Workspace Folder

**DESCRIPTION**: Start and open the dev space in VS Code that contains (or was created with) the SAPUI5 Adaptation Project extension. If the dev space was created without the predefined extension, ensure the SAPUI5 Adaptation Project extension is added. Open the folder where projects are stored before running the generator.

**LANGUAGE**: text

**CODE**:
```text
VS Code: File > Open Folder...
Select the "projects" folder and click OK
```

**STEP**: 2 — Start the Yeoman Template Wizard

**DESCRIPTION**: Launch the Yeoman Template Wizard from VS Code Command Palette and start the Adaptation Project generator.

**LANGUAGE**: Shell

**CODE**:
```bash
# Open the Command Palette and run:
Open Template Wizard
# Then: Click the "Adaptation Project" tile and select "Start"
```

**STEP**: 3 — Select Target Environment

**DESCRIPTION**: In the wizard, choose the target environment. For adaptation projects on SAP S/4HANA Cloud Public Edition choose ABAP.

**LANGUAGE**: text

**CODE**:
```text
Select Environment -> Target Environment: ABAP
```

**STEP**: 4 — Enter Project Name and Title

**DESCRIPTION**: Enter a unique project name (must be unique in the system) and a user-friendly application title.

**LANGUAGE**: text

**CODE**:
```text
Project name: <unique_project_name>
Application title: <Title shown to users>
```

**STEP**: 5 — Set Namespace (customer.*)

**DESCRIPTION**: The Namespace field must start with "customer.". Append your project name after that prefix. Ensure the final namespace is unique.

**LANGUAGE**: text

**CODE**:
```text
Namespace pattern: customer.<your_project_name>
# Example:
Namespace: customer.myAdaptationProject
```

**STEP**: 6 — Select System and (Optional) Login

**DESCRIPTION**: Select the target system from the list. If required, provide username and password inside the wizard. Basic authentication is supported. Click "Login" from inside the password field after entering credentials.

**LANGUAGE**: text

**CODE**:
```text
System: <select from list>
Authentication: Basic (optional)
# Enter username and password, then click "Login" inside the password field
```

**STEP**: 7 — Verify System Type Auto-Detection

**DESCRIPTION**: The wizard automatically detects the system type. For SAP S/4HANA Cloud Public Edition the detected type should be "CloudReady".

**LANGUAGE**: text

**CODE**:
```text
System type (auto-detected): CloudReady
```

**STEP**: 8 — Choose the Application to Adapt

**DESCRIPTION**: From the list of applications shown, select the application you want to adapt. Only applications that are extensible in adaptation projects are listed.

**LANGUAGE**: text

**CODE**:
```text
Choose application: <select from extensible applications list>
```

**STEP**: 9 — Finish and Generate Project

**DESCRIPTION**: Click Finish. Wait for the generator to create the adaptation project. The wizard will notify you when generation is complete and the project will be saved for future use.

**LANGUAGE**: text

**CODE**:
```text
Action: Click "Finish"
Status: Wait until the notification confirms the project has been generated
```

**STEP**: 10 — Preview and Continue Development

**DESCRIPTION**: After generation, preview the adaptation project or continue developing adaptations. Use the preview guide and making-adaptations guide for more details.

**LANGUAGE**: text

**CODE**:
```text
Previewing: see previewing-an-adaptation-project-64cc15b.md
Further development: see making-adaptations-6d2cfea.md
```
--------------------------------

**TITLE**: Create an Adaptation Project in an On-Premise System (VS Code)

**INTRODUCTION**: Step-by-step, action-oriented instructions to create an Adaptation Project for SAP Fiori in an on-premise ABAP system using Visual Studio Code and the Fiori Tools Template Wizard. This describes the exact commands to run, required inputs, and the optional deployment configuration.

**TAGS**: fiori-tools, sapui5, adaptation, ABAP, VSCode, template-wizard, deployment

**STEP**: 1 — Open Visual Studio Code

**DESCRIPTION**: Launch the VS Code application where Fiori Tools extensions are installed.

**LANGUAGE**: VSCode

**CODE**:
```VSCode
# No code to run — open the VS Code application UI.
```

**STEP**: 2 — (First-time only) Open the Adaptation Project Generator

**DESCRIPTION**: If this is the first time creating an adaptation project in this workspace, open the Command Palette and run the Adaptation Project Generator command provided by Fiori Tools.

**LANGUAGE**: Command

**CODE**:
```Command
Fiori: Open Adaptation Project Generator
```

**STEP**: 3 — Open the Template Wizard

**DESCRIPTION**: Use the Fiori Tools Template Wizard to start the project creation flow.

**LANGUAGE**: Command

**CODE**:
```Command
Fiori: Open Template Wizard
```

**STEP**: 4 — Select the Adaptation Project Tile

**DESCRIPTION**: In the Template Wizard UI, click the "Adaptation Project" tile to begin configuring your adaptation project.

**LANGUAGE**: VSCode

**CODE**:
```VSCode
# In the Template Wizard UI: click "Adaptation Project"
```

**STEP**: 5 — Configure Project Basic Info (Name, Title, Namespace)

**DESCRIPTION**: Enter the project name, application title, and namespace. Enter the namespace value after the fixed prefix "customer." (for example, if your project namespace is "mynamespace", set Namespace to "customer.mynamespace").

**LANGUAGE**: VSCode

**CODE**:
```VSCode
# Fields to complete in the wizard:
Project name: <your-project-name>
Application title: <your-application-title>
Namespace: customer.<your-project-namespace>
```

**STEP**: 6 — Select SAPUI5 Version

**DESCRIPTION**: From the SAPUI5 version dropdown in the wizard, choose the target SAPUI5 runtime version for the adaptation project.

**LANGUAGE**: VSCode

**CODE**:
```VSCode
# Choose SAPUI5 version from the dropdown (e.g., 1.96.0)
```

**STEP**: 7 — Select System and Application to Adapt

**DESCRIPTION**: In the wizard, select the target on-premise ABAP system to connect to, then choose the specific SAP Fiori application that you will adapt.

**LANGUAGE**: VSCode

**CODE**:
```VSCode
# Wizard prompts:
System: <select your on-premise ABAP system>
Application: <select the application to adapt>
```

**STEP**: 8 — Finish and Generate Project

**DESCRIPTION**: Click "Finish" in the wizard to generate the adaptation project in your workspace.

**LANGUAGE**: VSCode

**CODE**:
```VSCode
# Click "Finish" to generate the project files in your workspace
```

**STEP**: 9 — Optional: Add Deployment Configuration

**DESCRIPTION**: The wizard offers an optional "Add Deployment Configuration" choice (default = No). If you select Yes, you will be prompted to configure deployment settings to deploy the project to the ABAP repository. See the deployment documentation for details.

**LANGUAGE**: VSCode

**CODE**:
```VSCode
# Optional wizard prompt:
Add Deployment Configuration: Yes | No  # default: No

# If Yes, follow the prompts to configure deployment settings.
# Reference: Add Deployment Configuration in Deploying an Adaptation Project to the ABAP Repository
# Documentation link:
# deploying-an-adaptation-project-to-the-abap-repository-febf0d9.md
```

**STEP**: 10 — Result: Project Generated and Next Steps

**DESCRIPTION**: After finishing the wizard, the adaptation project is created in your workspace. Preview and continue development using the linked documentation.

**LANGUAGE**: VSCode / Documentation

**CODE**:
```VSCode
# Next actions:
- Preview your adaptation project:
  previewing-an-adaptation-project-8701335.md

- Continue development and make adaptations:
  making-adaptations-2a076dd.md

- Create new SAPUI5 extensions (SAP Docs):
  https://help.sap.com/docs/bas/developing-sap-fiori-app-in-sap-business-application-studio/create-new-sapui5-extensions?locale=en-US
```
--------------------------------

**TITLE**: Deleting an Adaptation Project via CLI

**INTRODUCTION**: This document shows how to delete an adaptation project (an app variant) from the back-end system using the Command Line Interface (CLI) within SAP Business Application Studio. Use this when you no longer need the app variant created by an adaptation project.

**TAGS**: fiori-tools, adaptation, undeploy, CLI, SAP Business Application Studio, deletion

**STEP**: 1 — Open terminal in SAP Business Application Studio

**DESCRIPTION**: Launch a terminal in SAP Business Application Studio to run CLI commands.

**LANGUAGE**: Instructions

**CODE**:
```text
Open SAP Business Application Studio main menu and choose Terminal > New terminal
```

**STEP**: 2 — Run the undeploy command

**DESCRIPTION**: Execute the undeploy script to remove the adaptation project from the back-end. This runs the npm script named "undeploy".

**LANGUAGE**: Shell

**CODE**:
```bash
npm run undeploy
```
--------------------------------

**TITLE**: Deleting an Adaptation Project (Fiori Tools)

**INTRODUCTION**: Step-by-step, action-oriented instructions to undeploy / delete an adaptation project (app variant) from an ABAP system. Covers: using the Fiori Tools Deployment Wizard (IDE), and using the ABAP report /UI5/DEL_ADAPTATION_PROJECT. Includes prerequisites, exact UI/actions, and back-end steps. Caution: deleting an adaptation project also deletes any app variants created from it.

**TAGS**: fiori-tools, SAPUI5, ABAP, deployment, undeploy, adaptation-project, app-variant, SAP_UI

**STEP**: Prerequisites
**DESCRIPTION**: Verify prerequisites before deleting an adaptation project.
- You have deployed an app variant that was created using an adaptation project to your ABAP system.
- You have the SAP role: SAP_UI_FLEX_DEVELOPER.
- For ABAP report deletion, minimum required software component: SAP_UI 7.55.

**LANGUAGE**: text
**CODE**:
```text
Prerequisites checklist:
- App variant deployed from adaptation project -> YES
- Role assigned: SAP_UI_FLEX_DEVELOPER -> YES
- (For ABAP report) SAP_UI version >= 7.55 -> YES
```

**STEP**: Using the Deployment Tool (Fiori Tools Deployment Wizard)
**DESCRIPTION**: Undeploy the adaptation project using the Fiori Tools Deployment Wizard in your IDE. Use this method when you deployed the app variant via the deployment wizard originally.
- Right-click the project main folder, or the webapp folder, or the manifest.appdescr_variant file in your project explorer.
- Choose "Open Deployment Wizard".
- Select the target ABAP system (the system used to create the project is selected by default).
- Click Next.
- Click Undeploy.
- Click Finish to start the undeployment process.

**LANGUAGE**: text
**CODE**:
```text
UI actions:
1. Right-click: <project root> | webapp | manifest.appdescr_variant
2. Select: Open Deployment Wizard
3. Select ABAP system -> Next
4. Click: Undeploy
5. Click: Finish
```

**STEP**: Using ABAP Report /UI5/DEL_ADAPTATION_PROJECT
**DESCRIPTION**: Delete the adaptation project from the ABAP back-end using the standard UI5 deletion report. Use this when you prefer back-end execution (requires SAP_UI >= 7.55).
- Open your adaptation project folder in the IDE.
- Open manifest.appdescr_variant and copy the value of the id element (this is the app variant ID to delete).
- In the ABAP back-end, run transaction SE38.
- Execute report: /UI5/DEL_ADAPTATION_PROJECT.
- Paste the copied ID or use F4 help to find it.
- Execute (F8).
- If prompted, select or create a transport request.
- Review the list of files that will be deleted, then Execute again (Shift + F1) to confirm deletion.
- The app variant files are removed; the deletion is committed when you release the transport request.

**LANGUAGE**: ABAP / text
**CODE**:
```text
Project file:
- File: manifest.appdescr_variant
- Action: Open and copy the <id> element value (app variant ID)

ABAP back-end steps:
1. SE38 -> execute report: /UI5/DEL_ADAPTATION_PROJECT
2. Paste app variant ID (from manifest.appdescr_variant) or use F4 help
3. Execute (F8)
4. Confirm/select transport request if prompted
5. Review files to delete -> Execute again (Shift + F1)

Result: Files will be deleted upon transport request release.
```

**STEP**: Result / Caution
**DESCRIPTION**: Outcome and important caution.
- Result: The app variant and associated adaptation project files are deleted from target systems when the transport request is released.
- Caution: If key users created app variants based on the app variant you delete, those derived app variants will also be deleted.

**LANGUAGE**: text
**CODE**:
```text
Outcome:
- Deletion finalized when transport request is released.

Caution:
- Deleting an adaptation project will delete any app variants derived from it.
```
--------------------------------

**TITLE**: Deploying an Adaptation Project to the ABAP Repository (SAP NW AS ABAP)

**INTRODUCTION**: Step-by-step, action-focused instructions to deploy an adaptation project (app variant) from a local project to an SAP NetWeaver Application Server ABAP repository using the Deployment Wizard. Includes prerequisites, how to create or re-create a Deployment Configuration, UI interactions to start deployment, post-deployment actions (target mappings), and troubleshooting references.

**TAGS**: fiori-tools, adaptation-project, deployment, ABAP, SAP_UI, cloud-connector, lrep, launchpad, manifest.appdescr_variant

**STEP**: Prerequisites and required permissions

**DESCRIPTION**: Verify user roles and cloud connector permissions before deploying. Choose the correct developer role based on SAP_UI version and ensure cloud connector allows POST and PUT for the LREP DTA path if using a Cloud Connector.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
- SAP_UI version >= 7.55 -> user must have role: SAP_UI_FLEX_DEVELOPER
- SAP_UI version < 7.55  -> user must have role: S_DEVELOP

- If using Cloud Connector, allow HTTP methods:
  - POST and PUT allowed for path: /sap/bc/lrep/dta_folder/
```

**STEP**: Open Deployment Wizard

**DESCRIPTION**: Start the Deployment Wizard from your project. You can open it from three project locations; any selection will start the same wizard.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Right-click one of:
- Project main folder
- webapp folder
- manifest.appdescr_variant

Then select: Open Deployment Wizard
```

**STEP**: Select target system and start deployment

**DESCRIPTION**: Choose the ABAP system destination to deploy to. The destination used to create the project is preselected. Continue to next step to either create a Deployment Configuration (first-time) or update an existing deployment.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
1. Choose Destination/system (pre-selected if same as project creation)
2. Click Next

If project NOT previously deployed to this system:
  - Proceed to "Add Deployment Configuration" (wizard will guide)
If project already deployed:
  - Choose operation: Update
  - Click Finish to start deployment
```

**STEP**: Create or re-create Deployment Configuration (Add Deployment Configuration)

**DESCRIPTION**: Create (or re-create) the Deployment Configuration either during initial project creation or later. Re-creating overwrites previous configuration. You can start this from Open Application Info if needed.

Access methods:
- During project creation: deployment step includes this wizard.
- Later: Right-click project -> Open Application Info -> Configuration -> Add.

Follow the UI fields exactly as described.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Deployment Configuration fields / flow:
1. Destination: select from drop-down (pre-selected if project was created from a destination)
2. Select How You Want to Enter the Package: choose one:
   - Enter Manually
   - Choose from Existing  (if chosen, a second drop-down appears listing packages)
3. Transport Request (if package requires transport): choose from drop-down or enter manually
4. Click Finish or Next to save configuration

Notes:
- You may re-create this configuration at any time; each new configuration overwrites the previous one.
- To open deployment config later: Right-click project -> Open Application Info -> Configuration -> Add
```

**STEP**: Post-deployment actions and launchpad integration

**DESCRIPTION**: After successful deployment the UI changes are applied to the layered repository (LREP). Because an app variant is a new semantic app with a new ID, you must configure Target Mapping to create a tile on the SAP Fiori launchpad. Review outcome notifications and error messages after deployment.

**LANGUAGE**: Plaintext

**CODE**:
```plaintext
Post-deployment:
- UI changes applied to LREP in the selected SAP NW AS ABAP
- App variant has a new semantic ID -> create Target Mapping in SAP Fiori launchpad designer

Useful links & troubleshooting:
- Configuring Target Mappings: https://help.sap.com/docs/ABAP_PLATFORM_NEW/a7b390faab1140c087b8926571e942b7/33daedef95454af68903ef1238aa0373.html?version=latest
- If error "ZIP archive contains disallowed files or has an incorrect structure" -> See SAP Note 3073188
  https://me.sap.com/notes/3073188
- If error "500 Internal server error" or "Transport check could not be performed" -> See SAP Note 3243791
  https://me.sap.com/notes/3243791
```

**STEP**: Validate Cloud Connector permissions (HTTP method check)

**DESCRIPTION**: If deploying via a Cloud Connector, validate that POST and PUT are allowed for /sap/bc/lrep/dta_folder/ using a simple HTTP test. Replace <host> and credentials accordingly.

**LANGUAGE**: Shell

**CODE**:
```shell
# Check allowed methods (OPTIONS request). Replace <host>, <user>, <pass>.
curl -i -X OPTIONS "https://<host>/sap/bc/lrep/dta_folder/" -u "<user>:<pass>" -k

# Example expected output includes an Allow: header listing permitted methods (should include POST and PUT)
# If POST/PUT are missing, configure Cloud Connector to allow them for the path /sap/bc/lrep/dta_folder/
```
--------------------------------

**TITLE**: Deploying or Updating an Adaptation Project to the ABAP Repository

**INTRODUCTION**: Steps to deploy or update an SAP Fiori adaptation project (app variant) to the SAPUI5 ABAP repository in SAP S/4HANA Cloud or SAP BTP. Includes GUI (Deployment Wizard) and CLI methods, required fields for SAP Fiori Launchpad configuration, and the exact commands to run.

**TAGS**: fiori-tools, SAPUI5, ABAP, deployment, adaptation-project, SAP BTP, S/4HANA Cloud, CLI, npm

**STEP**: 1 — Open Deployment Wizard (GUI)

**DESCRIPTION**: Open the Adaptation Project Deployment Wizard from Visual Studio Code / SAP Business Application Studio. Right-click the app variant descriptor file inside the project's webapp folder to launch the wizard which guides you through SAP Fiori Launchpad configuration and ABAP repository settings.

- File to open: right-click the manifest descriptor in the webapp folder.
- The wizard requires SAP Fiori Launchpad configuration:
  - If the base app has a navigation intent in its manifest, select it.
  - Otherwise provide Semantic Object, Action, and (optional) Parameters manually.
- Provide tile metadata: Title (required), Subtitle (optional).
- Provide deployment settings: SAPUI5 ABAP repository (target system), Package, (optional) Description.
- If required by the ABAP system, provide a Transport Request number.
- Finish the wizard and wait for the deployment to complete; a notification appears on success.

**LANGUAGE**: text

**CODE**:
```text
Right-click: <your-project>/webapp/manifest.appdescr_variant
```

**STEP**: 2 — Deploy or Update Using the Command Line (CLI)

**DESCRIPTION**: Use the project CLI to deploy or update the adaptation project. Ensure you run commands from the project's main folder in the terminal. Keep the builder up-to-date before deploying to avoid issues after upgrades.

- Open terminal in project root: Terminal > New terminal (in SAP Business Application Studio or VS Code).
- Optional maintenance step: update builder and dependencies.
- Deploy/Update step: run the deploy npm script provided by the adaptation project.

**LANGUAGE**: bash

**CODE**:
```bash
# (Optional) keep the builder up-to-date
npm update

# Deploy or update the adaptation project
npm run deploy
```

**STEP**: 3 — Notes and Optional Fields

**DESCRIPTION**: Additional technical details to keep in mind while automating or scripting deployment processes.

- Ensure you are in the main project folder when running CLI commands.
- The deployment wizard or CLI may prompt for:
  - SAPUI5 ABAP repository destination (target system)
  - Package name
  - Transport Request number (when required by ABAP system)
  - Optional description for the deployment
- When automating GUI steps, replicate the following required inputs in your automation:
  - SAP Fiori Launchpad Intent: Semantic Object, Action [, Parameters]
  - Tile Title (required), Tile Subtitle (optional)

**LANGUAGE**: text

**CODE**:
```text
Required GUI inputs to replicate in automation:
- Semantic Object (if base app has no intent)
- Action
- Parameters (optional)
- Tile Title (required)
- Tile Subtitle (optional)
- ABAP repository (target)
- Package
- Transport Request (optional, if requested by system)
```
--------------------------------

**TITLE**: Developing SAP Fiori Elements Applications with SAP Fiori Tools — Actionable Guide for Code Generation

**INTRODUCTION**: Practical, code-focused guidance for generating, previewing, and developing SAP Fiori elements applications using SAP Fiori tools. This guide covers recommended floorplans, OData choices, AI-assisted generation (Project Accelerator / Joule), previewing, annotation maintenance, and CAP project structure to help AI agents produce correct project scaffolding and development steps.

**TAGS**: fiori-tools, sap-fiori-elements, odata-v4, odata-v2, cap, joule, project-accelerator, annotations, preview, service-modeler, language-server

**STEP**: 1 — Generate an SAP Fiori Elements Application (starter)
**DESCRIPTION**: Use SAP Fiori tools to generate a new SAP Fiori elements application either as a standalone project or inside a CAP project. Choose one of the standard floorplans (List Report, Worklist, Analytical List, Object, Overview) or a Custom Page (recommended for flexibility). Prefer OData V4 for building-block support and custom pages; OData V2 is supported but V4 is recommended.
**LANGUAGE**: Text
**CODE**:
```Text
Actions (VS Code / Business Application Studio):
- Command Palette: "SAP Fiori Tools: Application Generator" (or use the Project Wizard)
- Choose:
  - Project type: Standalone / CAP
  - Template: SAP Fiori elements (OData V4 recommended) or Custom Page (if custom UI needed)
  - Floorplan: List Report | Worklist | Analytical List Page | Object Page | Overview Page | Custom Page
Reference docs:
- Generating an Application: Generating-an-Application/generating-an-application-db44d45.md
Recommendations:
- Prefer OData V4 for building blocks and custom pages.
- Freestyle SAPUI5 templates are deprecated; prefer Custom Page floorplan if UI coding required.
```

**STEP**: 2 — Choose Floorplan and Building Blocks
**DESCRIPTION**: Select the appropriate floorplan or custom page based on UI and interaction needs. Use building blocks for reusable UI/interaction patterns. For custom layouts use Custom Page plus building blocks to keep FE framework qualities while allowing SAPUI5 coding.
**LANGUAGE**: Text
**CODE**:
```Text
Standard floorplans (OData V4 & V2):
- List Report Page
- Worklist Page
- Analytical List Page
- Object Page
- Overview Page

Building blocks:
- Reusable artifacts for layout and behavior; use them to ensure enterprise-readiness and UI consistency.

Live examples and references:
- Building Blocks: https://ui5.sap.com/test-resources/sap/fe/core/fpmExplorer/index.html#/buildingBlocks/buildingBlocks
- Standard Floorplans: https://ui5.sap.com/test-resources/sap/fe/core/fpmExplorer/index.html#/topic/floorplans
- Custom Page: https://ui5.sap.com/test-resources/sap/fe/core/fpmExplorer/index.html#/controllerExtensions/customPage
```

**STEP**: 3 — Generate Project with Project Accelerator or Joule (AI-assisted)
**DESCRIPTION**: Use the Project Accelerator (SAP Fiori tools AI) or Joule to convert business requirements (text, images, or both) into a CAP project scaffold that includes data models, services, sample data, and one SAP Fiori elements application (list report, list+object pages, or form entry). Provide the business requirements as structured input where possible to get deterministic artifacts.
**LANGUAGE**: JSON
**CODE**:
```JSON
{
  "businessRequirements": {
    "title": "Sales Orders Management",
    "description": "Manage sales orders with header and item details. Include status, customer, order date, total amount.",
    "entities": [
      {
        "name": "SalesOrder",
        "fields": [
          {"name":"ID","type":"UUID","key":true},
          {"name":"CustomerID","type":"String"},
          {"name":"OrderDate","type":"Date"},
          {"name":"Status","type":"String"},
          {"name":"TotalAmount","type":"Decimal"}
        ]
      },
      {
        "name": "SalesOrderItem",
        "fields": [
          {"name":"ID","type":"UUID","key":true},
          {"name":"OrderID","type":"UUID"},
          {"name":"ProductID","type":"String"},
          {"name":"Quantity","type":"Integer"},
          {"name":"Price","type":"Decimal"}
        ]
      }
    ],
    "ui": {
      "applicationType": "SAP Fiori elements",
      "floorplan": "List Report + Object Page",
      "odataVersion": "V4"
    }
  },
  "expectedOutputs": {
    "cap": ["db/data-model.cds", "srv/service.cds", "app/fiori-app/*", "package.json"],
    "fiori": ["webapp/manifest.json", "webapp/annotations.xml", "webapp/Component.js"]
  }
}
```
Reference and docs:
- Generating with AI: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/6845fedbb38c4da7a54a2c76081f3abb.html

**STEP**: 4 — CAP Project Typical File Structure (expected scaffold)
**DESCRIPTION**: When generating into a CAP project, expect the following conventional file layout. Use this structure to guide further code generation and to place UI, service, and data artifacts correctly.
**LANGUAGE**: FileTree
**CODE**:
```Text
cap-project/
├─ app/                   # Fiori UI application (generated)
│  ├─ webapp/
│  │  ├─ manifest.json
│  │  ├─ Component.js
│  │  └─ annotations/     # OData annotations (XML or JSON)
├─ db/
│  ├─ data-model.cds      # CDS entities and types
│  └─ sample-data.csv     # optional sample data
├─ srv/
│  ├─ service.cds         # service definitions (expose entities)
│  └─ srv.js              # service handlers (Node.js)
├─ package.json
└─ README.md
```

**STEP**: 5 — Preview Application with Live or Mock Data
**DESCRIPTION**: During development preview the Fiori application using SAP Fiori tools. Choose mock data for UI layout and early development or live OData service for integration testing. Use the editor or IDE commands to launch the preview and switch between mock/live as needed.
**LANGUAGE**: Text
**CODE**:
```Text
Preview methods:
- VS Code / Business Application Studio:
  - Command Palette: "Fiori: Preview Application" or "SAP Fiori Tools: Preview Application"
  - Select data option: mock data | live OData service
- Configure mock server:
  - Provide annotations file (.xml/.json) and mock data mappings
Reference:
- Previewing an Application: Previewing-an-Application/previewing-an-application-b962685.md
```

**STEP**: 6 — Maintain Annotations and Use Service Modeler
**DESCRIPTION**: Modify manifest.json and annotation files via Service Modeler schematic overview. Use the annotation Language Server Protocol (LSP) for intelligent code assistance when editing annotations. Keep annotation-based settings consistent with the OData service and manifest.
**LANGUAGE**: Text
**CODE**:
```Text
Actions:
- Open Service Modeler from SAP Fiori Tools to visualize and edit annotations and consumed services.
- Use Annotation LSP (Language Server) to get completion, validation, and quick fixes for annotation files (.xml, .json).
- Sync manifest.json pages/targets with annotation definitions.
References:
- Visualizing Annotations with Service Modeler: Developing-an-Application/visualizing-annotations-with-service-modeler-58784b5.md
- Maintaining Annotations with Language Server: Developing-an-Application/maintaining-annotations-with-language-server-6fc93f8.md
```

**STEP**: 7 — Add Features with Guided Feature Guides
**DESCRIPTION**: Use guided Feature Guides from SAP Fiori tools to add common features (navigation, actions, cards, facets) to your application. Feature Guides provide step-by-step changes and update manifest/annotation artifacts automatically when possible.
**LANGUAGE**: Text
**CODE**:
```Text
Actions:
- In SAP Fiori Tools extension, open "Use Feature Guides" to add or configure features.
- Apply guided changes and review diffs for manifest.json and annotation updates.
Reference:
- Use Feature Guides: Developing-an-Application/use-feature-guides-0c9e518.md
```

**STEP**: 8 — Use AI Assistants for Code Generation and Modification
**DESCRIPTION**: Use Joule or Project Accelerator (SAP Fiori tools AI) not only for initial scaffolding but also to generate or modify data models, service definitions, sample data, and UI artifacts. Provide clear input describing entities, relationships, UI pages, and desired interactions to get accurate outputs.
**LANGUAGE**: Text
**CODE**:
```Text
AI-assisted workflow:
- Provide structured business requirements (see STEP 3 JSON example).
- Validate generated artifacts: cds models, service definitions, annotations, manifest.json.
- Integrate generated UI into CAP project structure (see STEP 4).
Reference:
- Generating an Application with the Project Accelerator or Joule Using SAP Fiori Tools AI:
  https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/6845fedbb38c4da7a54a2c76081f3abb.html
```

**STEP**: 9 — OData V2 vs V4 — Compatibility and Recommendation
**DESCRIPTION**: Both OData V2 and V4 are supported for SAP Fiori elements. Use V4 when you need building blocks, custom pages, and the latest features. Use V2 only when constrained by legacy service requirements.
**LANGUAGE**: Text
**CODE**:
```Text
Recommendation:
- Prefer OData V4 for new applications:
  - Full building block support
  - Custom Page floorplan with extension points
- Use OData V2 only for legacy compatibility.
References:
- Using SAP Fiori Elements Floorplans (V2 & V4): https://ui5.sap.com/#/topic/797c3239b2a9491fa137e4998fd76aa7
- General FE docs: https://ui5.sap.com/#/topic/03265b0408e2432c9571d6b3feb6b1fd
```
--------------------------------

**TITLE**: Manage Contracts and Customer Information — SAP Fiori Implementation Guide

**INTRODUCTION**: This document provides an action-oriented, code-focused guide to implement a SAP Fiori application for creating and managing Contracts and Customers. It includes the original user story and acceptance criteria, a CDS data model, service exposure, UI5 master/detail XML views, and controller code to load lists automatically, apply filters (Contract Type, Status, Start Date), and display contract details.

**TAGS**: fiori-tools, sap-fiori, ui5, cds, odata, contracts, customers, master-detail

**STEP**: 1 — User story and acceptance criteria (source)

**DESCRIPTION**: Keep the original user story and acceptance criteria intact. Use this as the authoritative functional requirements and acceptance test cases.

**LANGUAGE**: text

**CODE**:
```text
I want to create an SAP Fiori application that satisfies the requirements from the following user story:

Description

As a contract manager or administrator, I want to create and manage contracts and customer information in the system, 
so that I can effectively track and handle legal agreements and customer interactions.

Customer Description
Contract: A Contract involves defining a structured representation of a legal agreement or arrangement between two or more parties. 
Contracts can cover a wide range of agreements, such as sales contracts, service agreements, employment contracts, and more. 
Common attributes of a contract might include:
Contract ID: A unique identifier for the contract.
1. Contract ID: A unique identifier for the contract.
2. Customer: Information about the customer involved
3. Contract Type: The type of contract (e.g. sales, service, employment).
4. Start Date: The date on which the contract becomes valid.
5. End Date: The date on which the contract expires (if applicable).
6. Status: The current status of the contract (draft, active, expired, terminated, etc.)

Customer: A customer is an individual, organization, or entity that purchases goods, products, or services from another party, 
typically a business or seller. A typical customer has the following attributes:
1. Name
2. Identification Number
3. Address
4. Contact Information

Identification Number: A unique identification number for a customer is a distinct and non-repeating numerical value 
assigned to each customer record within a database or information system. This number serves as a primary key or identifier 
that uniquely distinguishes one customer from another.
Name: A "name" typically refers to the given name of a person or entity, or a label by which they are addressed or identified.
Address: An "address" typically refers to a physical location where an individual, business, or entity is situated 
or can be reached.

Acceptance Criteria

Scenario 1: List All Contracts
Given I am logged into the contract management system, when I launch the SAP Fiori application to maintain contracts, 
then I should be able to view the list of all the contracts in a list without pressing the GO button.
The list of all the contracts should have : Contract ID, Customer, Contract Type and Start Date
Next to this list, I would like to see the list of all customers.
The list of filters should include Contract Type, Contract Status and Start Date.

Scenario 2: View Contract Details
Given I am logged into the contract management system, when I select a specific contract from the list of SAP Fiori application, 
then I should be able to view the contract details.
The contract details will be:

Field Name       Tab in App       Section or Field Group
----------       ----------       ----------------------
ContractID       Contract Data    Contract Details
Customer Name    Contract Data    Contract Details
Contract Type    Contract Data    Contract Details
Status           Contract Data    Contract Details
Start Date       Contract Data    Contract Details
End Date         Contract Data    Contract Details
```

**STEP**: 2 — Data model: CDS definitions for Contracts and Customers

**DESCRIPTION**: Define the domain model with clear keys and associations. Use CDS to create two entities: Customer and Contract. These are the fields referenced in the acceptance criteria and used by the OData service.

**LANGUAGE**: CDS

**CODE**:
```cds
namespace my.contracts;

entity Customer {
  key IdentificationNumber : String(36);
  Name                    : String(200);
  Address                 : String(500);
  ContactInfo             : String(200);
}

entity Contract {
  key ContractID          : String(36);
  Customer                : Association to Customer;
  ContractType            : String(50);
  StartDate               : Date;
  EndDate                 : Date;
  Status                  : String(20);
}
```

**STEP**: 3 — Service exposure: publish Contracts and Customers as OData

**DESCRIPTION**: Expose the CDS entities via an OData service so UI5 can bind to /Contracts and /Customers endpoints. Use a service definition file in srv/ or api/ depending on your project layout.

**LANGUAGE**: CDS

**CODE**:
```cds
using my.contracts as db from '../path/to/model';

service ContractService @(path:'/contract') {
  entity Contracts  as projection on db.Contract;
  entity Customers  as projection on db.Customer;
}
```

**STEP**: 4 — Master view: show Contracts list and Customers list side-by-side, with filters

**DESCRIPTION**: Implement a master layout that presents:
- Left pane: Contracts list (columns: ContractID, Customer Name, ContractType, StartDate). Auto-loads on app start (no GO button).
- Right pane (in the same master area): Customers list.
- Top toolbar: filter controls for Contract Type (Select), Contract Status (Select), Start Date (DatePicker). Filters auto-apply on change.

Use a HorizontalLayout to place both lists side-by-side. Bind each list to the OData model endpoints.

**LANGUAGE**: XML

**CODE**:
```xml
<mvc:View controllerName="my.app.controller.Master" xmlns:mvc="sap.ui.core.mvc"
          xmlns="sap.m" xmlns:core="sap.ui.core" displayBlock="true">
  <Page title="Contracts">
    <content>
      <VBox>
        <!-- Filter toolbar -->
        <Toolbar>
          <Select id="filterContractType" change="onFilterChange">
            <items>
              <core:Item key="" text="All Contract Types" />
              <core:Item key="Sales" text="Sales" />
              <core:Item key="Service" text="Service" />
              <core:Item key="Employment" text="Employment" />
            </items>
          </Select>

          <Select id="filterStatus" change="onFilterChange">
            <items>
              <core:Item key="" text="All Statuses" />
              <core:Item key="Draft" text="Draft" />
              <core:Item key="Active" text="Active" />
              <core:Item key="Expired" text="Expired" />
              <core:Item key="Terminated" text="Terminated" />
            </items>
          </Select>

          <DatePicker id="filterStartDate" change="onFilterChange" displayFormat="yyyy-MM-dd" />
        </Toolbar>

        <!-- Side-by-side lists -->
        <HorizontalLayout width="100%">
          <!-- Contracts list -->
          <List id="contractList" width="60%" mode="SingleSelectMaster" items="{/Contracts}">
            <headerToolbar>
              <Toolbar><Title text="Contracts" /></Toolbar>
            </headerToolbar>
            <items>
              <StandardListItem type="Active"
                                title="{ContractID}"
                                description="{ContractType} - {StartDate}"
                                info="{Status}"
                                infoState="{= ${Status} === 'Active' ? 'Success' : 'None' }"
                                press="onContractSelect">
                <attributes>
                  <ObjectAttribute text="{Customer/Name}" />
                </attributes>
              </StandardListItem>
            </items>
          </List>

          <!-- Customers list -->
          <List id="customerList" width="40%" items="{/Customers}">
            <headerToolbar>
              <Toolbar><Title text="Customers" /></Toolbar>
            </headerToolbar>
            <items>
              <StandardListItem title="{Name}" description="{IdentificationNumber}" />
            </items>
          </List>
        </HorizontalLayout>
      </VBox>
    </content>
  </Page>
</mvc:View>
```

**STEP**: 5 — Master controller: bind lists, implement auto-loading and filters, handle selection

**DESCRIPTION**: Controller initializes OData model (v2 or v4), binds lists, applies filters automatically when filter controls change, and navigates or binds detail area when a contract is selected. Apply filters directly to the contract list binding so data is returned filtered from the OData service.

**LANGUAGE**: JavaScript

**CODE**:
```javascript
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/json/JSONModel"
], function (Controller, Filter, FilterOperator, JSONModel) {
  "use strict";

  return Controller.extend("my.app.controller.Master", {
    onInit: function () {
      // ODataModel should be configured in manifest or here
      // Ensure model is available as default model on the view
      this._oView = this.getView();
      this._oContractList = this._oView.byId("contractList");
      this._oCustomerList = this._oView.byId("customerList");

      // Lists will auto-load from their bindings as soon as view is rendered
      // No GO button required — initial load is automatic via binding in XML
    },

    onFilterChange: function () {
      var aFilters = [];

      var sContractType = this._oView.byId("filterContractType").getSelectedKey();
      if (sContractType) {
        aFilters.push(new Filter("ContractType", FilterOperator.EQ, sContractType));
      }

      var sStatus = this._oView.byId("filterStatus").getSelectedKey();
      if (sStatus) {
        aFilters.push(new Filter("Status", FilterOperator.EQ, sStatus));
      }

      var oStartDate = this._oView.byId("filterStartDate").getDateValue();
      if (oStartDate) {
        // filter for StartDate >= selected date
        var sIsoDate = oStartDate.toISOString().split('T')[0]; // "yyyy-mm-dd"
        aFilters.push(new Filter("StartDate", FilterOperator.GE, sIsoDate));
      }

      // Apply combined filter to the contract list binding
      var oBinding = this._oContractList.getBinding("items");
      if (oBinding) {
        oBinding.filter(aFilters);
      }
    },

    onContractSelect: function (oEvent) {
      var oItem = oEvent.getSource();
      var oContext = oItem.getBindingContext();
      // Option A: navigate with router to detail route and pass ContractID
      // Option B: bind detail view to the context's path
      // Example: publish to EventBus or set SelectedContract in local model
      var sPath = oContext.getPath(); // /Contracts('...')
      var oAppView = this.getView(); // parent view containing detail area
      // For example, set a JSONModel with selected contract data for the detail view:
      var oModel = oContext.getModel();
      oModel.read(sPath, {
        success: function (oData) {
          var oSelected = new JSONModel(oData);
          this.getView().setModel(oSelected, "selectedContract");
        }.bind(this)
      });
    }
  });
});
```

**STEP**: 6 — Detail view: display selected contract fields

**DESCRIPTION**: Create a detail view bound to the selected contract. Show ContractID, Customer Name, ContractType, Status, StartDate, EndDate. Bind to a model named "selectedContract" (set by controller on selection) or use route navigation and bind element path.

**LANGUAGE**: XML

**CODE**:
```xml
<mvc:View controllerName="my.app.controller.Detail" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">
  <Page title="Contract Details">
    <content>
      <Form>
        <FormContainer title="Contract Details">
          <FormElement label="Contract ID">
            <Text text="{selectedContract>/ContractID}" />
          </FormElement>
          <FormElement label="Customer">
            <Text text="{selectedContract>/Customer/Name}" />
          </FormElement>
          <FormElement label="Contract Type">
            <Text text="{selectedContract>/ContractType}" />
          </FormElement>
          <FormElement label="Status">
            <Text text="{selectedContract>/Status}" />
          </FormElement>
          <FormElement label="Start Date">
            <Text text="{selectedContract>/StartDate}" />
          </FormElement>
          <FormElement label="End Date">
            <Text text="{selectedContract>/EndDate}" />
          </FormElement>
        </FormContainer>
      </Form>
    </content>
  </Page>
</mvc:View>
```

**STEP**: 7 — Manifest (snippet): configure model and routing

**DESCRIPTION**: Ensure manifest.json includes the ODataModel configuration and routes for master/detail (if using routing). Example shows a minimal model config and a route for the master view.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "sap.app": {
    "id": "my.app",
    "title": "Contract Manager"
  },
  "sap.ui5": {
    "models": {
      "": {
        "dataSource": "mainService",
        "settings": {
          "useBatch": true
        }
      }
    },
    "routing": {
      "routes": [
        {
          "name": "master",
          "pattern": "",
          "target": "master"
        },
        {
          "name": "detail",
          "pattern": "detail/{ContractID}",
          "target": "detail"
        }
      ],
      "targets": {
        "master": {
          "viewName": "Master",
          "viewLevel": 1
        },
        "detail": {
          "viewName": "Detail",
          "viewLevel": 2
        }
      }
    }
  },
  "sap.app/dataSources": {
    "mainService": {
      "uri": "/contract/",
      "type": "OData",
      "settings": {
        "odataVersion": "2.0"
      }
    }
  }
}
```

Use these steps as a compact implementation checklist and code starting point. Adjust namespaces, OData path, and UI5 component wiring to your project structure.
--------------------------------

**TITLE**: Display Customers with Related Contracts — CAP + Fiori Elements (List Report + Object Page)

**INTRODUCTION**: This guide provides a concise, code-focused recipe to implement an SAP CAP backend (CDS) and a Fiori Elements UI that shows a list of customers, a customer object page (Customer Info + Contracts list), and a contract object page (Contract Info + Validity). It includes domain model CDS, service exposure, sample data, and CDS UI annotations to drive the List Report and Object Page pages.

**TAGS**: CAP, CDS, Fiori, Fiori Elements, OData, UI5, annotations, ListReport, ObjectPage, Node.js

STEP: 1 — Scenario / Requirements (preserve original sample text)
DESCRIPTION: Exact requirements and desired UI flows. Keep this snippet as the authoritative specification the code implements.
LANGUAGE: text
CODE:
```text
I want to create an SAP Fiori application that shows my customers with their contracts. 
Each customer has the following attributes:

1. Name
2. Identification Number
3. Address
4. Contract Information
A contract is referencing a customer. One customer can have multiple contracts. Attributes of a contract include:
5. Contract ID: A unique identifier for the contract
6. Customer: Information about the customer involved
7. Contract Type: The type of contract (sales, service, employment)
8. Start Date: The date on which the contract becomes valid
9. End Date: The date on which the contract expires (if applicable)
10. Status: The current status of the contract (draft, active, expired, terminated, etc.)

When starting the CAP application I first want to see a list of customers.

When selecting a specific row in that list, I want to see to a page with details of that customer.

It should show the following sections:
- section "Customer Info" displaying the attributes of the selected customer
- section "Contracts" showing a list of all contracts for this customer

When selecting a specific row in the contracts list, I want to see a page with details of that contract. This page should show two sections:
- section "Contract Info" containing:
  - contract ID
  - Customer Name
  - Contract Type
  - Status
- section "Validity" containing
  - Start Date
  - End Date
```

STEP: 2 — Domain model: CDS entities (db/schema.cds)
DESCRIPTION: Create Customer and Contract entities. Contract references Customer as an association. Use UUID keys; include meaningful types for dates and strings. Place file at db/schema.cds.
LANGUAGE: CDS
CODE:
```cds
namespace my.company;

entity Customer {
  key ID                : UUID;
  Name                  : String(111);
  IdentificationNumber  : String(50);
  Address               : String(500);
}

entity Contract {
  key ContractID        : UUID;
  Customer              : Association to Customer;
  ContractType          : String(50);
  StartDate             : Date;
  EndDate               : Date;
  Status                : String(30);
}
```

STEP: 3 — Expose service and annotate UI (srv/service.cds)
DESCRIPTION: Expose Customers and Contracts as OData entities and add CDS @UI annotations to drive Fiori Elements List Report + Object Page. Place file at srv/service.cds. The annotations below provide:
- List display of Customers (line items)
- Customer Object Page with "Customer Info" and a facet containing a table of related Contracts
- Contract Object Page showing Contract Info and Validity facets
LANGUAGE: CDS
CODE:
```cds
using my.company as my from '../db/schema';

service CatalogService @(path:'/catalog') {
  entity Customers as projection on my.Customer;
  entity Contracts  as projection on my.Contract;
}

/* UI annotations for Fiori Elements (ListReport + ObjectPage) */
annotate my.Customer with
{
  @UI.lineItem : [
    { Value : Name },
    { Value : IdentificationNumber },
    { Value : Address }
  ],
  @UI.identification : [
    { Value : Name },
    { Value : IdentificationNumber }
  ],
  /* Object Page: Customer Info section */
  @UI.facet : [
    {
      Label : 'Customer Info',
      Target : @UI.selectionFields : [ Name, IdentificationNumber, Address ]
    },
    {
      Label : 'Contracts',
      /* facet showing related Contracts as a table; this facet expects a navigation property from Customer to Contract */
      Data : [
        {
          /* Use the association path: Contracts where Contract.Customer = $self */
          Value : { Navigation : 'Contracts' }
        }
      ]
    }
  ]
};

annotate my.Contract with
{
  @UI.lineItem : [
    { Value : ContractID },
    { Value : ContractType },
    { Value : StartDate },
    { Value : EndDate },
    { Value : Status }
  ],
  @UI.identification : [
    { Value : ContractID },
    { Value : ContractType }
  ],
  @UI.facet : [
    {
      Label : 'Contract Info',
      Target : @UI.selectionFields : [ ContractID, { Value: Customer, Label: 'Customer' }, ContractType, Status ]
    },
    {
      Label : 'Validity',
      Target : @UI.selectionFields : [ StartDate, EndDate ]
    }
  ]
};
```

STEP: 4 — Provide sample data (db/data)
DESCRIPTION: Add minimal sample CSV files so the CAP SQLite (or configured DB) contains example Customers and Contracts. Place customer CSV at db/data/my.company-Customer.csv and contract CSV at db/data/my.company-Contract.csv. Ensure the association references Customer IDs.
LANGUAGE: CSV
CODE:
```csv
# db/data/my.company-Customer.csv
ID,Name,IdentificationNumber,Address
a1111111-1111-1111-1111-111111111111,Acme Inc,AC-12345,"1 Main Street, City"
b2222222-2222-2222-2222-222222222222,Contoso Ltd,CT-98765,"42 Second Ave, Town"
```

```csv
# db/data/my.company-Contract.csv
ContractID,Customer,ContractType,StartDate,EndDate,Status
c3333333-3333-3333-3333-333333333333,$ref:a1111111-1111-1111-1111-111111111111,Sales,2024-01-01,2025-01-01,Active
d4444444-4444-4444-4444-444444444444,$ref:b2222222-2222-2222-2222-222222222222,Service,2023-06-01,2024-06-01,Expired
```

STEP: 5 — Fiori Elements app configuration (app/webapp/manifest.json snippet)
DESCRIPTION: Configure a Fiori Elements app using Generic ListReport/ObjectPage (sap.ui.generic.app). Point annotations to the CDS-backed OData service (CatalogService) and to the service metadata (annotations are embedded in CDS so Fiori Elements will consume them). Add two pages: ListReport for Customers and ObjectPage for Contracts (navigation from Customers to Contracts via the related navigation property).
LANGUAGE: JSON
CODE:
```json
{
  "sap.app": {
    "id": "my.company.customers",
    "title": "Customers & Contracts"
  },
  "sap.ui5": {
    "models": {
      "": {
        "dataSource": "mainService",
        "preload": true,
        "settings": { "synchronizationMode": "TwoWay" }
      }
    },
    "dataSources": {
      "mainService": {
        "uri": "/catalog/",
        "type": "OData",
        "settings": { "odataVersion": "v4" }
      }
    },
    "routing": {
      "config": {
        "routerClass": "sap.ui.core.routing.Router",
        "viewType": "XML",
        "controlAggregation": "pages",
        "viewPath": "sap.suite.ui.generic.template",
        "controlId": "app",
        "bypassed": { "target": "notFound" }
      },
      "routes": [
        {
          "pattern": "",
          "name": "CustomersList",
          "target": "CustomersList"
        }
      ],
      "targets": {
        "CustomersList": {
          "type": "Component",
          "id": "listReport",
          "name": "sap.suite.ui.generic.template.ListReport",
          "options": {
            "settings": {
              "entitySet": "Customers"
            }
          }
        }
      }
    }
  },
  "sap.ui.generic.app": {
    "pages": [
      {
        "entitySet": "Customers",
        "component": {
          "name": "sap.suite.ui.generic.template.ListReport"
        }
      },
      {
        "entitySet": "Contracts",
        "component": {
          "name": "sap.suite.ui.generic.template.ObjectPage"
        }
      }
    ]
  }
}
```

STEP: 6 — Implementation checklist and runtime notes
DESCRIPTION: Implement these steps in order and run the CAP app:
- Files & locations:
  - db/schema.cds (CDS entities)
  - srv/service.cds (service + annotations)
  - db/data/*.csv (sample data)
  - app/webapp/manifest.json (Fiori app descriptor)
- Start backend: cds run (or use npm start per project).
- Start Fiori app: serve app/webapp via UI5 tooling or deploy app to SAP BTP.
- Verify:
  - Open List Report -> see Customers list (Name, IdentificationNumber, Address).
  - Select a Customer -> opens Object Page showing "Customer Info" and a Contracts facet with the related Contracts table.
  - Select a Contract -> opens Contract Object Page showing "Contract Info" and "Validity".

LANGUAGE: text
CODE:
```text
Checklist:
- cds watch (or cds run) to serve OData /catalog/
- Ensure manifest.json mainService uri points to /catalog/
- UI5 tooling or deployment to run the Fiori Elements app
- Use the provided CSV sample data to seed the DB for testing
```

Step complete — the provided CDS model, service exposure, UI annotations, sample data, and manifest configuration produce the required flows: Customers list -> Customer details (Customer Info + Contracts list) -> Contract details (Contract Info + Validity).
--------------------------------

**TITLE**: Example: Manage Travel App List Report Object Page

**INTRODUCTION**: This example shows how to prepare a markdown specification and assets for a Fiori "Manage Travel" application (List Report + Object Page) in SAP Business Application Studio. Use the markdown file and images in your workspace to seed code generation, UI prototyping, or RAG-based codegen agents. The instructions include required image filenames, folder layout, and business rules to implement.

**TAGS**: fiori-tools, SAP, Business Application Studio, UI5, List Report, Object Page, travel, markdown, assets, validation

**STEP**: 1 — Create the markdown specification file

**DESCRIPTION**: Create a markdown (.md) file in your workspace folder (SAP Business Application Studio). Paste the sample markdown content below exactly as-is into that file. This content is the human-readable specification that RAG/codegen agents will use to produce UI5/List Report + Object Page code.

**LANGUAGE**: Markdown

**CODE**:
```markdown
I want to create a travel application that shows a list of trips taken by employees.

The list of trips should include the following details:

![Alt Text](Travel_List.jpeg)

Each trip can have many bookings and multiple notes. On the travel details page, the app should show:

![Alt Text](Travel_Details.jpeg)

The total trip price should equal the price of all the bookings for that trip. If there are no bookings for a trip, the total trip price should be zero.

If there are any bookings associated with a trip, then each booking must cost more than zero.

Clicking on a booking should allow the user to see more details.
```

**STEP**: 2 — Save required image assets (filenames and paths)

**DESCRIPTION**: Save the image files referenced in the markdown to the correct paths relative to the markdown file. The two images referenced directly in the markdown must be in the same directory as the .md file. Two additional sketch images shown in the original example should be saved under an "images" subfolder. Use the exact filenames below so codegen agents and previews find them correctly.

- Place these two images in the same directory as your markdown file:
  - Travel_List.jpeg
  - Travel_Details.jpeg

- Place these two sketch images in an images/ subfolder (relative path: images/):
  - images/Manage_Travel_App_List_Report_Page_Sketch_4633751.jpg
  - images/Manage_Travel_App_Object_Page_Sketch_999bcc3.jpg

**LANGUAGE**: Plaintext

**CODE**:
```
workspace/
├─ Manage_Travel_App.md        <- your markdown file (name can vary)
├─ Travel_List.jpeg            <- required by markdown
├─ Travel_Details.jpeg         <- required by markdown
└─ images/
   ├─ Manage_Travel_App_List_Report_Page_Sketch_4633751.jpg
   └─ Manage_Travel_App_Object_Page_Sketch_999bcc3.jpg
```

**STEP**: 3 — Implement business rules (for code generation / validation)

**DESCRIPTION**: These are the exact business rules to encode in your backend/model or UI logic. Provide explicit instructions for codegen agents to implement these behaviors (computations and validations):

- Total trip price computation:
  - Compute totalTripPrice = sum(booking.price) for all bookings associated with a trip.
  - If there are no bookings, totalTripPrice must be 0.
  - Persist or expose totalTripPrice as a computed/read-only property on the Trip entity or compute server-side in OData/CDS/service layer.

- Booking price validation:
  - If a trip has one or more bookings, each booking.price must be > 0.
  - Enforce validation on create/update of Booking entities. Return a validation error if any booking.price <= 0.

- Navigation and detail view:
  - On List Report: show trip rows with a column or link to navigate to the Trip Object Page (details).
  - On Object Page (Trip details): show bookings as a table/list; clicking a booking entry navigates to a Booking detail view or opens a booking object page/modal with full booking information.

- Data model recommendations for code generation:
  - Trip entity: id, traveler (employee), startDate, endDate, totalTripPrice (computed), notes (0..n)
  - Booking entity: id, tripId (FK), type, supplier, price (>0), currency, details
  - Relations: Trip 1..n Booking; Trip 0..n Notes

**LANGUAGE**: Plaintext

**CODE**:
```
Business rules to implement:

1) totalTripPrice = SUM(booking.price for booking in Trip.bookings)
   - If Trip.bookings is empty -> totalTripPrice = 0
   - Implement as computed property in service/model layer (preferred) or UI binding

2) Validation on Booking:
   - On create/update: if Trip has >=1 Booking then for each Booking:
       require booking.price > 0
   - Return validation error with field context if violated

3) UI navigation:
   - List Report: row -> open Trip Object Page
   - Trip Object Page: show bookings list; clicking booking -> Booking detail

4) Suggested entities:
   - Trip { id, employeeId, startDate, endDate, totalTripPrice (computed), notes[] }
   - Booking { id, tripId, type, supplier, price (numeric >0), currency, details }
```

**STEP**: 4 — Apply in Fiori tools / code generation workflows

**DESCRIPTION**: Use the markdown file and image assets as input to your RAG or code generation pipeline. Agents should parse the markdown text, use the provided images for UI mockups, and implement the business rules and data model above when scaffolding UI5 List Report + Object Page and backend (CDS/OData/REST) artifacts. Ensure validations are enforced server-side and reflected in the UI.

**LANGUAGE**: Plaintext

**CODE**:
```
Suggested workflow for agents:
1) Parse Manage_Travel_App.md for UI requirements and image references
2) Create Trip and Booking entities in data model (CDS or REST)
3) Implement computed property totalTripPrice in service layer
4) Add booking.price validation on create/update
5) Scaffold List Report for Trip and Object Page for Trip details with bookings table
6) Wire navigation: list row -> object page; booking row -> booking detail
7) Include Travel_List.jpeg and Travel_Details.jpeg for prototyping UI mockups
```
--------------------------------

**TITLE**: Manage Travel List Report Page — Add Example Images to Workspace

**INTRODUCTION**: This document explains how to add the example application model and page UI images for the "Manage Travel List Report Page" sample into your SAP Business Application Studio workspace. These images are required by the example and must be placed in the project's images folder with the exact filenames shown below.

**TAGS**: fiori-tools, sap, business-application-studio, ui5, mdc, images, app-model, report-page

**STEP**: 1 — Create images folder in workspace

**DESCRIPTION**: Create (if it doesn't exist) an images folder at the project root to store the example images. Use the terminal in SAP Business Application Studio or your local shell.

**LANGUAGE**: Bash

**CODE**:
```bash
# from your project root in SAP Business Application Studio terminal
mkdir -p images
ls -la images
```

**STEP**: 2 — Save and upload the example images into the images folder

**DESCRIPTION**: Save the two example image files from the documentation to your local machine, then upload or copy them into the workspace images folder. Use the exact filenames and relative paths shown so sample references work correctly.

Required filenames and relative paths:
- images/Fiori_App_for_Managing_Travel_Application_Model_7ba4a29.png
- images/Manage_Travel_Fiori_App_Page_UI_6d7f22d.jpg

Options:
- If you downloaded the files to a local folder, copy them into the workspace:
- If using the BAS file upload UI, right-click the project folder -> Upload -> select each file and ensure they appear under the images folder.

**LANGUAGE**: Bash

**CODE**:
```bash
# Example: copy from a local download directory into the workspace images folder
# Replace /path/to/downloads with your actual download path
cp /path/to/downloads/Fiori_App_for_Managing_Travel_Application_Model_7ba4a29.png images/
cp /path/to/downloads/Manage_Travel_Fiori_App_Page_UI_6d7f22d.jpg images/

# Or move files:
# mv /path/to/downloads/*.png images/
# mv /path/to/downloads/*.jpg images/
```

**STEP**: 3 — Verify files are present and reference-ready

**DESCRIPTION**: Confirm the files exist with correct names and relative paths. Verify from the terminal or BAS Project Explorer. Use these paths in your sample app, documentation, or templates.

**LANGUAGE**: Bash

**CODE**:
```bash
# list the files and show file sizes
ls -lh images/Fiori_App_for_Managing_Travel_Application_Model_7ba4a29.png
ls -lh images/Manage_Travel_Fiori_App_Page_UI_6d7f22d.jpg

# quick file-type check
file images/Fiori_App_for_Managing_Travel_Application_Model_7ba4a29.png
file images/Manage_Travel_Fiori_App_Page_UI_6d7f22d.jpg
```

**STEP**: 4 — Use the images in the project

**DESCRIPTION**: Reference the images from UI or documentation using the relative paths. Example usage in README or view templates should point to images/Fiori_App_for_Managing_Travel_Application_Model_7ba4a29.png and images/Manage_Travel_Fiori_App_Page_UI_6d7f22d.jpg.

**LANGUAGE**: Plain text / Example HTML reference

**CODE**:
```html
<!-- Example: reference image in an HTML or markdown file -->
<img src="images/Fiori_App_for_Managing_Travel_Application_Model_7ba4a29.png" alt="Fiori App for Managing Travel - Application Model">
<img src="images/Manage_Travel_Fiori_App_Page_UI_6d7f22d.jpg" alt="Manage Travel Fiori App - Page UI">
```
--------------------------------

**TITLE**: Experimental: Developing a CAP Application Using Application Modeler Advanced Features

**INTRODUCTION**: 
Action-oriented guide for using Application Modeler advanced (experimental) features in a CAP project generated by the Project Accelerator. Covers how to auto-generate entity properties, 1:n and 1:1 entities, annotations for charts, and re-generate mock data with AI. Includes exact file locations that are modified by these actions.

**TAGS**: fiori-tools, CAP, application-modeler, advanced-features, cds, srv, test-data, mock-data, value-help, annotations

**STEP**: Caution and environment notes

**DESCRIPTION**: 
Experimental features are unstable and not supported for production. Do not use on production/live data. When service or database schema files are updated outside Application Modeler (except formatting-only changes), advanced features are turned off. Ensure you have backups before experimenting.

**LANGUAGE**: Text

**CODE**:
```text
Caution: Experimental features may be changed without notice. Do not use in production.
Files that can be updated by these features:
- db/schema.cds
- srv/service.cds
- test/data/*.csv
- manifest.json
- (UI) page configuration files edited by Application Modeler
```

**STEP**: Add UI Features and Auto-Generate New Entity Properties

**DESCRIPTION**: 
Use the Page Editor to add a column or UI property that does not yet exist in the CDS model. Enter a new property name in the editor; Application Modeler will:

- Append the new property to db/schema.cds.
- Update or create the matching .csv in test/data with generic mock data for the chosen type.
- Update annotations/manifest entries required for the UI.

Action steps (exact UI flow):
1. Open the Page Editor and add a new column (see Maintaining Annotation-Based Elements).
2. In the Columns dropdown, choose Enter new property and type the property name.
3. Optionally change the type (e.g., click String).
4. Click Add.

After these steps, refine the generated mock data in test/data/*.csv to match your domain.

**LANGUAGE**: Text

**CODE**:
```text
Files modified:
- db/schema.cds         <-- new property added to the relevant entity
- test/data/<entity>.csv <-- generic mock data added/updated for the property
Related UI action: Page Editor -> Columns -> Enter new property -> Add
```

**STEP**: Add Tables/Charts and Auto-Generate New Entities (1:n)

**DESCRIPTION**: 
When adding analytical chart views, table/chart views in list reports, or table/chart sections in object pages, you can create a new 1:n entity directly from the Page Editor. Application Modeler will:

- Generate a new entity in db/schema.cds containing a UUID key and the properties you created (dimension and measure).
- Add a reference to that entity in srv/service.cds.
- Annotate the entity for aggregation when a chart is created (adds @Aggregation.ApplySupported with GroupableProperties and AggregatableProperties).
- Auto-generate a new CSV in test/data with generic mock data for UUID, measures, and dimensions.

Action steps (exact UI flow):
1. In Page Editor add a chart view.
2. In Entity dropdown choose Enter new entity and type a name.
3. Select Chart Type.
4. In Dimension dropdown choose Enter new property and type dimension name.
5. Optionally change type (e.g., String).
6. Select Create new measure.
7. In Property dropdown choose Enter new property and type measure name.
8. Optionally change type (e.g., Integer).
9. Select Aggregation Method.
10. Click Add.

Resulting artifacts are ready for further refinement.

**LANGUAGE**: Text

**CODE**:
```text
Files created/updated:
- db/schema.cds
  - New entity with:
    - UUID key property
    - Dimension property (as entered)
    - Measure property (as entered)
    - @Aggregation.ApplySupported annotation with:
      - GroupableProperties: [<dimension>]
      - AggregatableProperties: [<measure>]
- srv/service.cds   <-- reference to new entity and relevant annotations
- test/data/<newEntity>.csv  <-- generic mock data generated
UI action: Page Editor -> Chart View -> Enter new entity -> Add
```

**STEP**: Add Value Help and Auto-Generate New Entities (1:1)

**DESCRIPTION**: 
Add Value Help for fields/filters in the Page Editor when the backing entity or properties do not exist. Application Modeler will generate the 1:1 associated entity and wiring automatically. The generated value-help entity will NOT include a UUID key. The main entity will receive a 1:1 association to the new value-help entity and annotations will be created.

Action steps (exact UI flow):
1. In Page Editor for an object page, search for display type.
2. Set Display Type to Value Help.
3. In Value Source Entity choose Enter new entity and type a name.
4. In Value Source Property choose Enter new property and type a name (key).
5. Optionally set Value Description Property by choosing Enter new property and typing a name.
6. Optionally set Text Arrangement if you provided a description property.
7. Optionally toggle Display as Dropdown.
8. Optionally Add Column under Results List; choose Enter new property to add columns to results.
   - Restriction: you cannot choose UUID for properties in value help entities.
9. Optionally Add Sort Property under Sort Order.
10. Click Apply.

What is updated/generated:
- New 1:1 value help entity in db/schema.cds (no UUID).
- The main entity gains a 1:1 association referencing the new entity (added to db/schema.cds).
- Annotations for value help are generated and added to the UI configuration and manifest.json.
- The initial primitive property is replaced in annotations/manifest.json by navigation to the key of the associated entity.
- test/data/<valueHelpEntity>.csv is created with mock data for the key (matching main entity values) and generic mock data for other properties.

**LANGUAGE**: Text

**CODE**:
```text
Files created/updated:
- db/schema.cds
  - New value-help entity (no UUID)
  - 1:1 association added on the main entity
- manifest.json
  - UI annotations updated to use navigation to the key of the value-help entity
- test/data/<valueHelpEntity>.csv  <-- mock data added (key matches main entity where applicable)
Restriction: Do not use UUID type when defining properties for value help.
UI action: Page Editor -> Field -> Display Type: Value Help -> Enter new entity -> Apply
```

**STEP**: Generate Mock Data with AI

**DESCRIPTION**: 
Refine generic mock data generated by Application Modeler using the built-in AI mock data generator to produce meaningful, domain-relevant test data.

Action steps:
1. Open the Page Editor.
2. Click the Generate Mock Data with AI icon (SAP icon TNT-V3).
3. Click Generate.

The system will re-generate/refine entries in test/data/*.csv to provide context-relevant values.

**LANGUAGE**: Text

**CODE**:
```text
UI action:
- Page Editor -> Click "Generate Mock Data with AI" icon -> Click Generate

Files updated:
- test/data/*.csv  <-- mock data refined with AI
```

**STEP**: UI and Resource References

**DESCRIPTION**: 
Include required static resources and images used by Application Modeler pages.

**LANGUAGE**: HTML

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="css/sap-icons.css"/>
```

**LANGUAGE**: Text

**CODE**:
```text
Image reference used in docs:
- images/Add_Basic_Columns_-_Advanced_Features_f782c35.png
```
--------------------------------

**TITLE**: Extending an Existing SAP Fiori/UI5 Application

**INTRODUCTION**: Practical, code-focused guide for creating and wiring a UI5/Fiori extension inside an existing application. Includes minimal required file additions and manifest changes to add a new route/view, controller logic, and i18n text. Use this when you need to add a custom page or feature to an already deployed Fiori app without changing core application logic.

**TAGS**: fiori-tools, sap-ui5, ui5, fiori-elements, extension, manifest, routing, controller, i18n

STEP: 1 — Inspect the existing app and choose extension location

DESCRIPTION: Confirm the app structure (usually webapp/ with manifest.json, Component.js, i18n folder). Decide a folder namespace for extension files (e.g., webapp/ext). You will add a new view, controller, and manifest routing/target entry.

LANGUAGE: Notes

CODE:
```text
Expected project layout (typical):
/webapp/manifest.json
/webapp/Component.js
/webapp/index.html
/webapp/i18n/i18n.properties
/webapp/ext/     <-- create this folder for extension files
```

STEP: 2 — Add an XML view for the extension

DESCRIPTION: Create a new XML view in webapp/ext to host the UI5 controls for the extension. Keep viewName consistent with manifest targets (e.g., ext.MyExtension).

LANGUAGE: XML

CODE:
```xml
<!-- File: webapp/ext/MyExtension.view.xml -->
<mvc:View
  controllerName="ext.MyExtension"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m">
  <Page id="extensionPage" title="{i18n>extensionTitle}">
    <content>
      <Button id="extButton" text="Press Me" press=".onPress"/>
    </content>
  </Page>
</mvc:View>
```

STEP: 3 — Implement the controller for the view

DESCRIPTION: Add an MVC controller to handle events and logic for the extension view. Keep controller name matching controllerName in the XML view.

LANGUAGE: JavaScript

CODE:
```javascript
// File: webapp/ext/MyExtension.controller.js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";
  return Controller.extend("ext.MyExtension", {
    onInit: function() {
      // initialization logic if needed
    },

    onPress: function(oEvent) {
      MessageToast.show("Button pressed from extension");
      // add extension-specific logic here (navigation, OData calls, UI update, etc.)
    }
  });
});
```

STEP: 4 — Register a new route and target in manifest.json

DESCRIPTION: Edit webapp/manifest.json to add a route and target for your extension view. Ensure controlId and controlAggregation match the app shell (commonly "app" and "pages" for SplitApp / App controls). Add the target pointing to the view created in step 2.

LANGUAGE: JSON

CODE:
```json
// File: webapp/manifest.json
{
  "sap.ui5": {
    "routing": {
      "config": {
        "routerClass": "sap.m.routing.Router",
        "viewType": "XML",
        "controlId": "app",
        "controlAggregation": "pages",
        "async": true
      },
      "routes": [
        {
          "pattern": "myExtension",
          "name": "MyExtension",
          "target": "MyExtension"
        }
      ],
      "targets": {
        "MyExtension": {
          "viewName": "ext.MyExtension",
          "viewLevel": 1,
          "viewType": "XML",
          "controlAggregation": "pages",
          "controlId": "app"
        }
      }
    }
  }
}
```

STEP: 5 — Add i18n entry for UI text

DESCRIPTION: Update webapp/i18n/i18n.properties so the view title and any other UI strings are localized.

LANGUAGE: Properties

CODE:
```properties
# File: webapp/i18n/i18n.properties
extensionTitle=Extension Page
```

STEP: 6 — (Optional) Add a lightweight Component for the extension

DESCRIPTION: If you prefer the extension to have its own Component metadata or be bootstrapped separately, add Component.js referencing the manifest json. Otherwise the main app component will load the extension view via routing.

LANGUAGE: JavaScript

CODE:
```javascript
// File: webapp/ext/Component.js
sap.ui.define(["sap/ui/core/UIComponent"], function(UIComponent) {
  "use strict";
  return UIComponent.extend("ext.Component", {
    metadata: {
      manifest: "json"
    },
    init: function() {
      UIComponent.prototype.init.apply(this, arguments);
      // extension-specific initialization
    }
  });
});
```

STEP: 7 — Navigate to the extension programmatically or via URL

DESCRIPTION: Use the router of the main app to navigate to the extension route, or open the hash URL directly (e.g., #/myExtension). Example code to navigate from any controller.

LANGUAGE: JavaScript

CODE:
```javascript
// Example: navigate from an existing controller to the extension route
var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
oRouter.navTo("MyExtension"); // navigates to #/myExtension
```

STEP: 8 — Testing and validation

DESCRIPTION: Run the app locally (e.g., with UI5 tooling or your existing dev server). Validate:
- The new route (#/myExtension) loads the extension view
- The button press triggers the controller onPress handler
- i18n title resolves to extensionTitle

LANGUAGE: Notes

CODE:
```text
Typical test checklist:
- Start UI5 dev server / run app
- Open URL: http://localhost:<port>/index.html#/myExtension
- Confirm page title equals value from i18n
- Press button and observe MessageToast
```

STEP: 9 — Integrate with existing extension points (Fiori Elements) — guidance

DESCRIPTION: If the app is Fiori Elements and exposes extension points, implement extension fragments or controllers in the ext/ folder and reference them according to Fiori Elements extension documentation. Typical steps:
- Locate the extension point key in the generated view XML or annotations.
- Create fragment or controller in webapp/ext and reference it by name in the extension configuration.
- Do not change framework-generated files; use the ext/ folder pattern and manifest additions.

LANGUAGE: Notes

CODE:
```text
Guidance:
- Use fragments (.fragment.xml) for small UI insertions.
- Use controllers (.controller.js) for event handling.
- Register fragments/controllers in the manifest or annotation-based extension declarations as required by the Fiori Elements app.
```

Step 10 — Keep the extension modular and reversible

DESCRIPTION: Put all extension files under a single folder (e.g., webapp/ext) and avoid editing core business logic. This makes it easy to remove or port the extension later.

LANGUAGE: Notes

CODE:
```text
Recommended folder:
webapp/ext/
  MyExtension.view.xml
  MyExtension.controller.js
  Component.js     (optional)
  fragments/       (optional)
  i18n-ext.properties (optional, if separate localization is needed)
```


--------------------------------

**TITLE**: Extending an SAP Fiori Application for an On-Premise System (Adaptation Projects)

**INTRODUCTION**: Practical checklist and actionable steps to prepare, verify, and work with SAP Fiori adaptation (extension) projects for on-premise ABAP systems using Visual Studio Code. Use this as a developer-oriented runbook to validate system requirements, application readiness, and the typical workflow for creating, previewing, and deploying adaptation projects.

**TAGS**: fiori-tools, sap, abap, sapui5, adaptation, extensions, VSCode, on-premise

**STEP**: 1 — Experimental integration warning
**DESCRIPTION**: This integration is experimental. Run these steps in a non-production environment first.
**LANGUAGE**: text
**CODE**:
```text
Caution: Experimental integration. Use only in non-productive environments for initial testing.
```

**STEP**: 2 — General prerequisites: connect ABAP system and activate services
**DESCRIPTION**: Ensure your on-premise ABAP system connection is configured in VS Code as described in "Managing SAP System Connections". Activate required services and grant access permissions used by ADT and the Adaptation Editor.
- Confirm you have a configured ABAP system connection (see "Managing SAP System Connections").
- Activate these services on the ABAP system.
- Ensure the connection has access to the discovery endpoint used when creating adaptation projects.
- Optionally control finer-grained access using authorization object S_ADT_RES and its URI field.
**LANGUAGE**: text
**CODE**:
```text
Required service endpoints (activate on ABAP system):
/sap/bc/adt
/sap/bc/ui2/app_index/
/sap/bc/adt/discovery

Authorization object:
S_ADT_RES  (use the URI field to restrict access to adaptation resources)
```

**STEP**: 3 — Adaptation project server and app version prerequisites
**DESCRIPTION**: Verify ABAP system and SAPUI5 version constraints before creating an adaptation project. These are hard requirements for support and deployment.
**LANGUAGE**: text
**CODE**:
```text
Server / base app version requirements for adaptation projects:
- ABAP system software component SAP_UI >= 7.54
- Base application minimum SAPUI5 version >= 1.30
- Selected application system SAPUI5 version >= 1.72 (to be eligible for adaptation projects)
```

**STEP**: 4 — Adaptation project limitations and special cases for using an adaptation project as a basis
**DESCRIPTION**: Conditions when adaptation projects can be used as bases and required remediation steps for older SAPUI5 versions.
- If the selected system has SAPUI5 < 1.96, implement SAP Note 3223667 on the system.
- If SAPUI5 < 1.90, the system does not support using an adaptation project as a base for a new adaptation project — update SAPUI5 to proceed.
- Adaptation projects cannot be used as a basis if the base application requires a mandatory start parameter or is an application variant already deployed with an adaptation project.
**LANGUAGE**: text
**CODE**:
```text
Notes:
- If SAPUI5 < 1.96  => implement SAP Note 3223667
- If SAPUI5 < 1.90  => NOT supported as a base; update SAPUI5

Not supported as a basis:
- Applications requiring a mandatory parameter to start
- Application variants already deployed with an adaptation project
```

**STEP**: 5 — Application file checks (manifest and scaffolding)
**DESCRIPTION**: Confirm the target application meets structural requirements for adaptation projects:
- The application must contain a manifest.json file.
- The application must not be a scaffolding app that uses sap.ca.scfld.md in manifest.json.
- The system SAPUI5 version used by the application must meet the constraints in Step 3.
Use these quick pattern checks against the manifest.json to detect disallowed scaffolding.
**LANGUAGE**: JSON
**CODE**:
```json
// Example checks in manifest.json (inspect these keys)
{
  "sap.ui5": { /* ... */ },
  "sap.ui": { /* ... */ },
  "sap.ca": {
    "scfld": "md" // presence indicates a scaffolding application (not supported)
  }
}
```

**STEP**: 6 — Typical developer workflow (create → source control → adapt → preview → deploy)
**DESCRIPTION**: Follow this recommended workflow:
1. Create an Adaptation Project in VS Code (use the Adaptation Project wizard/extension).
2. (Optional but recommended) Put the project in source control (Git) to maintain source and enable local previews and modifications.
3. Make adaptations using the Adaptation Editor (in VS Code) or by editing project files directly.
4. Preview changes in the Adaptation Editor preview and in a separate browser tab (sandbox-like preview; not Fiori Launchpad).
5. Deploy the adaptation project to the ABAP repository when ready.
**LANGUAGE**: text
**CODE**:
```text
Workflow:
1. Create adaptation project (VS Code)
2. Add project to Git (recommended)
3. Edit/extend using Adaptation Editor or source files
4. Preview changes (Adaptation Editor preview + browser tab)
5. Deploy to ABAP repository
```

**STEP**: 7 — Deployment and sandbox limitations
**DESCRIPTION**: Be aware of deployment constraints and preview limitations:
- You cannot deploy an adaptation project to a package enabled for "ABAP for Cloud Development". You may create and use the Adaptation Editor locally but deployment will fail.
- Preview environments (Adaptation Editor preview and browser tab) are sandbox-like and operate outside SAP Fiori launchpad; features that rely on Fiori launchpad (for example cross-app navigation) may not behave as in production. Those features typically function correctly after deployment to the real launchpad.
**LANGUAGE**: text
**CODE**:
```text
Deployment constraints:
- Packages enabled for "ABAP for Cloud Development" => adaptation project deployment NOT supported

Preview limitations:
- Adaptation Editor and browser preview are sandbox-like (not Fiori Launchpad)
- Launchpad-dependent features (e.g., cross-app navigation) may not function in preview
```

**STEP**: 8 — Quick verification checklist for automation or pre-flight scripts
**DESCRIPTION**: Use this compact checklist in scripts or CI checks before creating or deploying adaptation projects.
**LANGUAGE**: text
**CODE**:
```text
Pre-flight checklist:
- Confirm ABAP connection configured in VS Code
- Confirm services active: /sap/bc/adt, /sap/bc/ui2/app_index/, /sap/bc/adt/discovery
- Confirm S_ADT_RES access for the connection (URI field)
- Confirm SAP_UI >= 7.54 on server
- Confirm application contains manifest.json
- Confirm application system SAPUI5 version >= 1.72
- Confirm application is NOT scaffolding (no sap.ca.scfld.md entry)
- Confirm package is NOT enabled for ABAP for Cloud Development (if planning to deploy)
- If SAPUI5 < 1.96 => ensure SAP Note 3223667 implemented
- If SAPUI5 < 1.90 => do NOT use adaptation project as a base; update SAPUI5
```
--------------------------------

**TITLE**: Extending an SAP Fiori Application with an SAPUI5 Adaptation Project (SAP S/4HANA Cloud & SAP BTP, ABAP Environment)

**INTRODUCTION**: This guide lists the exact checks, prerequisites, and resources required to create an SAPUI5 Adaptation Project to extend SAP Fiori elements or freestyle SAPUI5 applications by producing an application variant. Use this as a concise checklist to prepare environments, verify extensibility, assign required roles/catalogs, and connect development tooling (for example, SAP Business Application Studio).

**TAGS**: fiori-tools, sapui5, sap-s-4hana-cloud, sap-btp, abap, adaptation-project, extensibility, developer-tenant, destination, git

**STEP**: 1 — Overview

**DESCRIPTION**: Purpose and high-level behavior. Use an SAPUI5 Adaptation Project to extend SAP Fiori elements or freestyle SAPUI5 applications with an application variant without modifying the original application. The application variant is maintained separately (source code can be stored in Git). Use the adaptation project to preview and modify the project source code.

**LANGUAGE**: Text

**CODE**:
```Text
Use an SAPUI5 Adaptation Project to extend SAP Fiori elements or freestyle SAPUI5 applications with an application variant without changing the original application.
```

**STEP**: 2 — Verify Application Extensibility

**DESCRIPTION**: Before creating an adaptation project, verify that the SAP-delivered application is released for extensibility. Check the application’s implementation information under "Extensibility (extensibility of the SAPUI5 application in the front-end server)" in the SAP Fiori Apps Reference Library.

**LANGUAGE**: Text

**CODE**:
```Text
SAP Fiori Apps Reference Library:
https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/homePage

Check: Implementation information -> Extensibility (extensibility of the SAPUI5 application in the front-end server)
```

**STEP**: 3 — If Not Supported: Submit Influence Request

**DESCRIPTION**: If the SAP-delivered application is not supported for adaptation projects in SAP S/4HANA Cloud, submit a request via the Customer Influence portal.

**LANGUAGE**: Text

**CODE**:
```Text
Influence Opportunity Homepage - Customer Influence:
https://influence.sap.com/sap/ino/#/campaign/1177
```

**STEP**: 4 — Ensure Proper System Landscape and Developer Tenant

**DESCRIPTION**: The adaptation-project feature requires a developer tenant and is available only in a 3-system landscape for SAP S/4HANA Cloud. Confirm your landscape setup and access rights before proceeding.

**LANGUAGE**: Text

**CODE**:
```Text
System Landscapes in SAP S/4HANA Cloud:
https://help.sap.com/docs/SAP_S4HANA_CLOUD/a630d57fc5004c6383e7a81efee7a8bb/aa60b129af7b4ce8ae052618c8315d29.html
```

**STEP**: 5 — Release Reference for Extensibility

**DESCRIPTION**: Review the official documentation about releasing an SAP Fiori application for extensibility in adaptation projects (S/4HANA Cloud and SAP BTP ABAP Environment) to confirm app-specific requirements and notes.

**LANGUAGE**: Text

**CODE**:
```Text
Releasing an SAP Fiori Application to Be Extensible in Adaptation Projects on SAP S/4HANA Cloud and SAP BTP, ABAP Environment:
releasing-an-sap-fiori-application-to-be-extensible-in-adaptation-projects-on-sap-s-4hana-1046206.md
```

**STEP**: 6 — Create Destination for Development Tenant

**DESCRIPTION**: Ensure a destination exists to connect your development environment (for example, SAP Business Application Studio) to the SAP S/4HANA Cloud development tenant. Create or validate the destination configuration before starting the adaptation project.

**LANGUAGE**: Text

**CODE**:
```Text
Create a Destination to Connect to SAP Business Application Studio:
https://help.sap.com/docs/SAP_S4HANA_CLOUD/6aa39f1ac05441e5a23f484f31e477e7/0af2819bbe064a3da455753c8518dd81.html
```

**STEP**: 7 — Assign Required Business Catalogs to Developer

**DESCRIPTION**: The developer user must have the required business catalogs assigned so the adaptation project can be created and maintained. Ensure the following catalogs (examples provided) are assigned:

**LANGUAGE**: Text

**CODE**:
```Text
Required business catalogs (examples):
- Development - UI Deployment (SAP_A4C_BC_DEV_UID_PC)
- Business catalog to retrieve the list of extensible apps (for example SAP_A4C_BC_DEV_OBJ_DIS_PC)
```

**STEP**: 8 — Use Source Control (Git) and Project Source Code

**DESCRIPTION**: Use Git or another source-control system to maintain the adaptation-project source code. You must use the project source code to preview and modify the adaptation. Confirm access to your repository and clone the project into your development workspace to continue.

**LANGUAGE**: Text

**CODE**:
```Text
Git Source Control:
https://help.sap.com/docs/bas/sap-business-application-studio/git-source-control

Note: Use the project source code to preview and modify adaptation projects.
```

**STEP**: 9 — Architecture Diagram & Project Files

**DESCRIPTION**: Reference the architecture diagram that illustrates the relationship between the source application and the application variant created by the adaptation project. Keep image and project assets with the project for documentation and onboarding.

**LANGUAGE**: Text

**CODE**:
```Text
Architecture diagram path (relative to documentation):
images/AdaptationProjectS4HCarchitecture_f84e21c.png

Note: Source application = light blue, Application variant (adaptation project) = dark blue.
```
--------------------------------

**TITLE**: Generate an SAP Fiori Elements Application Using an Image (Project Accelerator)

**INTRODUCTION**: Step-by-step instructions to generate an SAP Fiori elements application with the Project Accelerator (SAP Fiori tools AI) using a single image uploaded to your workspace. Use this when your business requirement is represented by a single-list report or object page UI image. For multiple images + text use: generating-an-application-using-text-and-images-5dd43dc.md.

**TAGS**: fiori-tools, sap-fiori, project-accelerator, sap-fiori-tools-ai, workspace, image

STEP: 1 — Prepare the Image

DESCRIPTION: Create or edit a single image that represents the application model or UI of one list report or object page. Label elements in English for best results. Reference example: example-manage-travel-list-report-page-480d33c.md.

LANGUAGE: Text

CODE:
```text
- Image must represent a single list report or object page UI
- Label UI elements in English for best results
- Reference example file: example-manage-travel-list-report-page-480d33c.md
```

STEP: 2 — Upload the Image to Your Workspace Folder

DESCRIPTION: Upload the prepared image file into your workspace folder in SAP Business Application Studio. The image must be accessible from the workspace path where Project Accelerator will generate the project.

LANGUAGE: Text

CODE:
```text
- Upload image to workspace directory in SAP Business Application Studio
- Ensure the file name and path are correct and accessible
```

STEP: 3 — Launch the Project Accelerator (Two Options)

DESCRIPTION: Open Project Accelerator in SAP Fiori tools AI using either the Command Palette or the SAP Fiori activity icon.

LANGUAGE: Text

CODE:
```text
Option A: Command Palette
- Open Command Palette: [CMD/CTRL] + [Shift] + [P]
- Run the command:
  Fiori tools AI: Launch the Project Accelerator

Option B: SAP Fiori Activity
- Click the SAP Fiori icon on the activity bar (icon class: SAP-icons-TNT-V3)
```

STEP: 4 — Important Constraint for Queries

DESCRIPTION: Once Project Accelerator is open, your query must be specifically about generating an SAP Fiori elements application. General AI assistant requests are not supported in this context. Also: the Project Accelerator cannot generate a second application in the same project — ensure the request targets a single application.

LANGUAGE: Text

CODE:
```text
- Query must be related to generating an SAP Fiori elements application only.
- The Project Accelerator cannot generate a second application in the same project.
```

STEP: 5 — Choose the Image File in Project Accelerator

DESCRIPTION: In the Project Accelerator UI, click "Choose File (.docx, .md, .txt, .jpg)" and select the uploaded image. Supported upload types include .docx, .md, .txt, .jpg. Ensure you only reference a single application in your request.

LANGUAGE: Text

CODE:
```text
- Click: Choose File (.docx, .md, .txt, .jpg)
- Supported file types: .docx, .md, .txt, .jpg
- Select the workspace image you uploaded
```

STEP: 6 — Provide Project Folder Path and Generate

DESCRIPTION: Enter the Project Folder Path (workspace destination) where the generated project will be created. Click "Generate" to start generation. Generation time varies based on requirements.

LANGUAGE: Text

CODE:
```text
- Provide Project Folder Path (where the project should be generated)
- Click: Generate
- Generation may take some time depending on the business requirement
```

STEP: 7 — Stop Generation (Optional)

DESCRIPTION: If you need to cancel generation to edit the business requirement, click the Stop icon (white large square). Confirm by clicking "Yes" at the "Are you sure you want to stop generation?" prompt. After stopping, modify the image or request and generate again.

LANGUAGE: Text

CODE:
```text
- To cancel: click the Stop icon (white_large_square)
- Confirm: "Are you sure you want to stop generation?" -> Click Yes
- After stopping, edit your business requirement and re-run Generate
```

STEP: 8 — Result: Project Created and Application Information Launched

DESCRIPTION: The generated project is added to your filesystem at the Project Folder Path you provided. Project Accelerator automatically opens "Application Information" for the new SAP Fiori application. Continue editing using SAP Fiori tools.

LANGUAGE: Text

CODE:
```text
- Generated project location: <your provided Project Folder Path> in workspace filesystem
- The Project Accelerator opens Application Information for the generated app
- Continue development with SAP Fiori tools
```

STEP: Reference — HTML/CSS Asset (optional)

DESCRIPTION: Example link tag for including SAP icons CSS in documentation or local preview (preserve original usage if required in examples).

LANGUAGE: HTML

CODE:
```html
<link rel="stylesheet" type="text/css" href="css/sap-icons.css"/>
```
--------------------------------

**TITLE**: Generate an SAP Fiori Elements Application from Text and Images using Project Accelerator

**INTRODUCTION**: Generate an SAP Fiori Elements application in SAP Business Application Studio using the Project Accelerator (Fiori tools AI) by providing business requirements as a single .docx or .md file that includes images and accompanying explanatory text. This guide describes required file format rules, workspace placement, launching the accelerator, selecting the input file, generating the project, and stopping generation if needed.

**TAGS**: fiori-tools, project-accelerator, sap-fiori, sap-business-application-studio, docx, markdown, images, sap-fiori-elements

**STEP**: 1 — Prepare the business requirements file

**DESCRIPTION**: Create a single file containing your business requirements. Choose either a Microsoft Word (.docx) file or a Markdown (.md) file that references images. If using Markdown, ensure images are uploaded to your workspace folder in SAP Business Application Studio and referenced with standard Markdown image syntax. Each image must represent a single list report or object page and be accompanied by text explaining the relation between pages and any additional details (code list values, hidden sections/tabs, etc.). If a page has multiple hidden views, include multiple images showing the different states and text mapping images to sections. For .docx files, include only text and images — avoid advanced formatting (no headers/footers/tables).

**LANGUAGE**: HTML (example stylesheet link)

**CODE**:
```html
<link rel="stylesheet" type="text/css" href="css/sap-icons.css"/>
```

**STEP**: 2 — Naming and example file

**DESCRIPTION**: Label images in English and follow the example naming and structure conventions. Use the provided example as a template for organizing list reports and object pages.

**LANGUAGE**: Markdown / Filename

**CODE**:
```text
Example: example-manage-travel-app-list-report-object-page-d17b256.md
```

**STEP**: 3 — Upload files to your workspace

**DESCRIPTION**: Upload your .docx or .md file and any referenced images to your workspace folder in SAP Business Application Studio before launching the Project Accelerator. For Markdown, confirm image paths are relative to the workspace folder.

**LANGUAGE**: Text

**CODE**:
```text
Accepted file types: .docx, .md, .txt, .jpg
Place: workspace folder in SAP Business Application Studio (project root or subfolder)
```

**STEP**: 4 — Launch the Project Accelerator

**DESCRIPTION**: Open the Project Accelerator in SAP Fiori tools AI. Use either the Command Palette keyboard shortcut or the SAP Fiori icon on the activity bar.

**LANGUAGE**: Command / Keystroke

**CODE**:
```text
Command Palette: [CMD/CTRL] + [Shift] + [P]
Command: `Fiori tools AI: Launch the Project Accelerator`
SAP Fiori icon: click the SAP Fiori icon in the activity bar
```

**STEP**: 5 — Choose the input file in Project Accelerator

**DESCRIPTION**: In Project Accelerator, click "Choose File (.docx, .md, .txt, .jpg)" and select the file you uploaded. Ensure the request refers to a single application (the accelerator cannot generate a second application for the same project).

**LANGUAGE**: Text

**CODE**:
```text
UI action: Project Accelerator -> Choose File (.docx, .md, .txt, .jpg) -> Select your file
Note: Project Accelerator supports one application generation per project folder.
```

**STEP**: 6 — Provide project folder path and generate

**DESCRIPTION**: Enter the Project Folder Path where the generated project should be created. Click "Generate". Generation time varies depending on the complexity of your business requirements.

**LANGUAGE**: Text

**CODE**:
```text
Input: Project Folder Path (e.g., /home/user/projects/my-fiori-app)
Action: Click Generate
```

**STEP**: 7 — Stop generation (optional)

**DESCRIPTION**: To cancel generation and edit requirements, click the Stop icon and confirm "Yes" when prompted. This stops generation so you can update your input file and re-run generation.

**LANGUAGE**: Text / UI action

**CODE**:
```text
UI action: Click Stop (white_large_square icon) -> Confirm "Are you sure you want to stop generation?" -> Click Yes
```

**STEP**: 8 — Locate generated project and next steps

**DESCRIPTION**: After successful generation, the project is created at the Project Folder Path you provided. Application Information is launched for the generated SAP Fiori application. Use SAP Fiori tools to refine app structure, UI, and data binding as needed.

**LANGUAGE**: Text

**CODE**:
```text
Output: Generated project located at the specified Project Folder Path
Next steps: Open Application Information in SAP Fiori tools -> Edit pages/views -> Connect to backend / OData services
```
--------------------------------

**TITLE**: Generate an SAP Fiori elements Application Using Text with Project Accelerator (SAP Fiori tools AI)

**INTRODUCTION**: Step-by-step, code-focused instructions for launching the Project Accelerator (SAP Fiori tools AI), providing business requirements via text or file input, generating a single SAP Fiori elements application into a chosen project folder, and stopping generation if needed. Use these commands and UI labels directly when scripting or automating interactions or when instructing an AI agent to generate code or configuration.

**TAGS**: fiori-tools, sap-fiori, project-accelerator, joule, sap-business-application-studio, ai, automation

**STEP**: Assets / required styles
**DESCRIPTION**: Include the provided SAP icons stylesheet if your documentation or UI automation needs the icon CSS reference (preserve exact file path).
**LANGUAGE**: HTML
**CODE**:
```html
<link rel="stylesheet" type="text/css" href="css/sap-icons.css"/>
```

**STEP**: 1 — Launch the Project Accelerator (three options)
**DESCRIPTION**: Launch Project Accelerator using one of these methods. Use the exact command text or key chord when automating or instructing an agent.
**LANGUAGE**: Text
**CODE**:
```
Command Palette:
- Open Command Palette: [CMD/CTRL] + [Shift] + [P]
- Execute command: Fiori tools AI: Launch the Project Accelerator

SAP Fiori UI:
- Click the SAP Fiori icon on the activity bar (label: SAP Fiori)

Joule:
- Click the Joule icon on the activity bar (label: Joule)
```

**STEP**: 2 — Provide business requirements (Text input vs File input)
**DESCRIPTION**: Supply a single-application business requirement. Choose text inline or upload a file. For Joule use command prefixes. For best results use English. The Project Accelerator can only generate one application per project — ensure the request targets a single app.
**LANGUAGE**: Text
**CODE**:
```
Text input (Command Palette and SAP Fiori UI):
- Under "Project Accelerator" enter your requirements in the "Business Requirements" textbox.

Text input (Joule):
- Send this chat command:
  /fiori-gen-spec-app <your business requirements text>

File input (prepare file in workspace):
- Upload your file (docx, .md, .txt, .jpg) to a workspace folder in SAP Business Application Studio.

File input (Command Palette and SAP Fiori UI):
- Under "Project Accelerator" click "Choose File (docx, .md, .txt, .jpg)" and select your file.

File input (Joule):
- Send this chat command to reference a file in the workspace:
  /fiori-gen-spec-app #(path to your docx, markdown, or text file)

Examples (use these example files as templates):
- example-1-manage-contracts-and-customer-information-in-the-system-c1bccf2.md
- example-2-display-customers-with-related-contracts-a6c978f.md
```

**STEP**: 3 — Specify Project Folder Path
**DESCRIPTION**: Provide the exact filesystem path where the new project should be created. Ensure the path does not already contain an application generated by the Project Accelerator (only one generated app per project is allowed).
**LANGUAGE**: Text
**CODE**:
```
Project Folder Path:
- Enter the full path to the folder where you want the generated project, e.g.:
  /home/user/workspace/my-fiori-project
- Validation: ensure no existing generated Fiori elements app is in that project folder.
```

**STEP**: 4 — Generate and cancel generation
**DESCRIPTION**: Start generation by clicking Generate. Generation time varies by complexity. To cancel mid-process, click the Stop icon and confirm. If launched from Joule, the UI will transfer you to the Project Accelerator to complete generation.
**LANGUAGE**: Text
**CODE**:
```
Start generation:
- Click: Generate

Cancel generation:
- Click: ⬜ (Stop) icon
- Confirm prompt: "Are you sure you want to stop generation?" → Click "Yes"
- After stopping you may edit the Business Requirements and re-run generation.

Note:
- If started from Joule, you will be transferred to the Project Accelerator UI to continue.
```

**STEP**: 5 — Result and next steps
**DESCRIPTION**: After successful generation, the project files are created at the specified project folder path. The Project Accelerator opens "Application Information" for the generated SAP Fiori application. You can then modify the app with SAP Fiori tools.
**LANGUAGE**: Text
**CODE**:
```
Post-generation:
- Generated project location: <the Project Folder Path you provided>
- UI action: "Application Information" is launched for the generated SAP Fiori application
- Next steps: open the generated project in your workspace and use SAP Fiori tools to edit or extend the application
```
--------------------------------

**TITLE**: Generate a CAP + SAP Fiori Application with Project Accelerator (SAP Fiori tools AI / Joule)

**INTRODUCTION**: Use the Project Accelerator (SAP Fiori tools AI or Joule) to generate a CAP project with a single SAP Fiori elements application from business-requirements input (text, images, or both). The tool generates data models, services, sample data, and a Fiori UI (list report, list report + object pages, or form entry object page). This doc is focused and action-oriented for programmatic or scripted generation, and for code-generation agents that produce or validate generated projects.

**TAGS**: fiori-tools, project-accelerator, joule, CAP, sap-fiori, code-generation, templates, test-data

STEP: Prerequisites
DESCRIPTION: Verify environment, subscriptions, and extensions required before invoking Project Accelerator/Joule. These are mandatory prerequisites.
LANGUAGE: Plain text
CODE:
```text
- Subscription:
  - SAP Build Code subscription OR sign up for SAP Build Code Test Drive:
    https://developers.sap.com/mission.sap-build-code-test-drive.html?sap-outbound-id=4E44C2A19D38B160BF5539329FA7ECC83942C1AD
  - Background: What is SAP Build Code:
    https://help.sap.com/docs/build_code/d0d8f5bfc3d640478854e6f4e7c7584a/504854f457cc4fbf9f79136dbc773618.html

- Dev space:
  - Create a dev space containing both:
    - SAP Fiori tools extension
    - CAP tools extension

- IDE:
  - Use SAP Business Application Studio (recommended)
```

STEP: Prepare business requirements (input formats)
DESCRIPTION: Prepare and choose input format(s) for generation. Project Accelerator accepts text, images, or text + images. Prefer text for field-level restrictions; prefer images for column layout.
LANGUAGE: Plain text
CODE:
```text
- Input types:
  - Text: describe entities, fields, types, restrictions (e.g., "orderId: alphanumeric(10), required")
  - Image: provide screenshots of table/column layouts for easier column extraction
  - Text + Image: mix of both to capture labels, field constraints, and layout

- Tips:
  - Field values and restrictions (like alphanumeric or max length) are easier to describe using text.
  - Columns and layout are easier to describe using images.
```

STEP: Launch generation and available guides
DESCRIPTION: Select the appropriate guide for your chosen input format. Project Accelerator will generate a project directly in the folder you select (no staging area).
LANGUAGE: Plain text
CODE:
```text
- Generation guides:
  - Text-based generation:
    https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/e7f9f8c26ebb4ab181372d09bb054cac.html?state=DRAFT
  - Image-based generation:
    https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/39193dfef3654ded850d39e7008e77d3.html?state=DRAFT
  - Text + Image generation:
    https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/5dd43dc5dcab4c36b8a654ce20bac71e.html?state=DRAFT

- Important:
  - The Project Accelerator automatically creates the project in the project folder you choose.
  - Do NOT include personal or sensitive data in inputs (no filtering provided).
```

STEP: Supported features — General (what you can request)
DESCRIPTION: Use these as supported spec elements in your business requirements. If you omit a supported feature, the generator may exclude or auto-implement it.
LANGUAGE: Plain text
CODE:
```text
Supported general features you can request explicitly:
- Entities and entity labels
- Entity properties and property labels
- Entity associations: 1:1 and 1:n
- Entities with code lists (explicit values in your input -> enums)
- Value help based on 1:1 associations and code lists
- Criticality highlighting for eligible properties in code lists
- Single list report application (floorplan)
- Single application with list report + one or more object pages
- Form Entry Object Page floorplan
```

STEP: Supported features — List Report
DESCRIPTION: Declare desired list-report features in input; unsupported features will be ignored or auto-decided.
LANGUAGE: Plain text
CODE:
```text
List report capabilities:
- Filter fields (declare explicitly if needed)
- Basic table columns (no charts/icons)
- Multiple views for a table (multiple table mode):
  - Reference: Defining Multiple Views - Multiple Table Mode:
    https://ui5.sap.com/sdk/#/topic/37aeed74e17a42caa2cba3123f0c15fc
- Initial data load behavior:
  - Reference: Loading Behavior of Data on Initial Launch:
    https://ui5.sap.com/#/topic/9f4e1192f1384b85bc160288e17f69c4
```

STEP: Supported features — Object Page
DESCRIPTION: Declare object-page layout expectations; generator supports basic sections and navigation patterns.
LANGUAGE: Plain text
CODE:
```text
Object page capabilities:
- Section tabs
- Form sections with basic fields
- Table sections with basic columns
- Navigation from table section to a second object page
```

STEP: Behavior when features are missing or unsupported
DESCRIPTION: Understand how Project Accelerator handles absent or unsupported instructions and test data generation/storage.
LANGUAGE: Plain text
CODE:
```text
- If your request omits instructions for a supported feature:
  - The generated app may exclude it, or implement a default at SAP Fiori tools AI's discretion.
  - Example: No explicit filters -> generator may add its own filter fields.

- If your request includes unsupported features:
  - They may be ignored or implemented at SAP Fiori tools AI's discretion.

- Object page header features:
  - If input is only text, header features are not guaranteed to reflect your specifics; generator may add basic headers using general description.

- Test data generation:
  - SAP Fiori tools AI populates UI features with random test values and uses image-derived data when available.
  - Test data is intended for preview/testing only and is stored in a test folder within the generated project.
  - Code lists and enum values based on explicit input values are treated as entity properties and stored in a data folder.

- Default behavior:
  - All generated apps are draft-enabled and include standard actions only.
```

STEP: Observe generation process & logs
DESCRIPTION: Monitor generation logs to debug, validate model/service creation and generated artifacts.
LANGUAGE: Plain text
CODE:
```text
- View generation logs:
  https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/4ecc286176b1429b98f6f0a243e49ee2.html?state=DRAFT

- Use logs to:
  - Verify created CDS models, services, and manifest/UI components
  - Inspect test-data and code-list generation
  - Detect missing/auto-implemented features
```

STEP: Helpful reference media and notes
DESCRIPTION: Reference the overview video and final cautions for input content and expectations.
LANGUAGE: Plain text
CODE:
```text
- Overview video: Project Accelerator: Elevate Development with AI in SAP Fiori tools
  https://dam.sap.com/mac/u/a/b4EL9s7?rc=10&doi=SAP1185906

- Notes:
  - Project Accelerator no longer presents a staging area for approval; it creates the project directly in the chosen folder.
  - Do NOT include personal or sensitive data in your business requirements (no filtering).
```
--------------------------------

**TITLE**: SAP Fiori Tools — Documentation Index for Code Generation Agents

**INTRODUCTION**: This optimized reference maps the SAP Fiori Tools User Guide structure and key topic files for AI agents that generate or modify SAP Fiori applications. Use the file paths to locate exact documentation pages for implementation details (generation, preview, development, deployment, extension, and project functions). Each step groups related topics and provides the exact markdown file paths to fetch detailed instructions, examples, and configuration references.

**TAGS**: fiori-tools, sap, sapui5, cap, mta, abap, preview, mockserver, annotations, generator, deployment, extensions

**STEP**: 1 — Top-level Manual and Index
**DESCRIPTION**: Entry point and master index that links to all major sections. Use this to route the agent to the appropriate subtopic file.
**LANGUAGE**: TEXT
**CODE**:
```text
# Master index file
SAP Fiori Tools User Guide (Last Updated: May 2023)

Top-level file list:
- developing-sap-fiori-elements-applications-with-sap-fiori-tools-f09752e.md
- Getting-Started-with-SAP-Fiori-Tools/getting-started-with-sap-fiori-tools-2d8b1cb.md
- Project-Functions/project-functions-0d8fa32.md
- Generating-an-Application/generating-an-application-db44d45.md
- generating-an-application-with-the-project-accelerator-or-joule-using-sap-fiori-tools-ai-6845fed.md
- Previewing-an-Application/previewing-an-application-b962685.md
- Developing-an-Application/developing-an-application-a9c0043.md
- Deploying-an-Application/deploying-an-application-1b7a3be.md
- extending-an-existing-application-6e25aca.md
```

**STEP**: 2 — Getting Started (Installation & Environment)
**DESCRIPTION**: Use this group to set up development environment (Visual Studio Code or SAP Business Application Studio), verify prerequisites, install extensions, and configure authentication. For automation, fetch system requirements, CLI tooling info, and extension installation steps.
**LANGUAGE**: TEXT
**CODE**:
```text
Getting Started main:
- Getting-Started-with-SAP-Fiori-Tools/getting-started-with-sap-fiori-tools-2d8b1cb.md

Installation:
- Getting-Started-with-SAP-Fiori-Tools/installation-e870fcf.md
  - Getting-Started-with-SAP-Fiori-Tools/sap-business-application-studio-b011040.md
  - Getting-Started-with-SAP-Fiori-Tools/visual-studio-code-17efa21.md
    - #loio17efa217f7f34a9eba53d7b209ca4280 (Visual Studio Code section)
    - #loio002ae80eac034e6588af81827ab97332 (System Requirements)
    - #loiobdd272ac4d964fbfa59e956460e0e686 (Cloud Foundry CLI Tools)
    - #loio5701672c35354d5b91759a911eaf1171 (Prerequisites)
    - #loio4ce76a049bab42b0843111af4c7dcb4c (Set up Visual Studio Code)
    - #loiof533419b114f476e98b55622eabaf0f7 (Install Extensions)
    - #loio7b329a74721047808368fca5c28702c3 (Supported Authentication Types)
```

**STEP**: 3 — Project Functions (Project-level operations)
**DESCRIPTION**: Use these pages for inspecting and manipulating project metadata: SAPUI5 version, data editor, project validation, service/annotation file management, UI service generation, and environment checks.
**LANGUAGE**: TEXT
**CODE**:
```text
Project Functions:
- Project-Functions/project-functions-0d8fa32.md
  - Project-Functions/application-information-c3e0989.md
  - Project-Functions/application-sapui5-version-009f43e.md
  - Project-Functions/data-editor-18e43b5.md
  - Project-Functions/deleting-an-application-in-cap-project-709f838.md
  - Project-Functions/environment-check-75390cf.md
  - Project-Functions/information-panel-a9a6c4b.md
  - Project-Functions/managing-sap-system-connections-78a82b6.md
  - Project-Functions/managing-service-and-annotation-files-8182ff3.md
  - Project-Functions/project-validation-6f3c737.md
  - Project-Functions/reuse-library-support-6e99fbb.md
  - Project-Functions/viewing-service-metadata-e369c2c.md
  - Project-Functions/ui-service-generation-1a7aad3.md
```

**STEP**: 4 — Generating an Application (Fiori Elements & Freestyle)
**DESCRIPTION**: Use these topics to programmatically create applications. Follow specific pages for floorplans, supported templates, data sources, floorplan/template properties, and additional configuration like MTA generation and JS code assist.
**LANGUAGE**: TEXT
**CODE**:
```text
Generating an Application:
- Generating-an-Application/generating-an-application-db44d45.md

SAP Fiori Elements:
- Generating-an-Application/SAP-Fiori-Elements/sap-fiori-elements-1488469.md
  - supported-floorplans-2b2b12e.md
  - data-source-9906181.md
  - floorplan-properties-745ae0c.md

Freestyle SAPUI5:
- Generating-an-Application/SAPUI5-Freestyle/freestyle-sapui5-616b1a4.md
  - supported-templates-20d1146.md
    - basic-template-14fdcc0.md
  - data-source-37a0fcf.md
  - template-properties-c2a3c82.md

Additional Configuration:
- Generating-an-Application/Additional-Configuration/additional-configuration-9bea64e.md
  - generating-an-mta-deployment-file-9c41152.md
  - adding-an-sap-fiori-application-to-an-mta-deployment-file-with-5a17ba6.md
    - #loio5a17ba6b62b2462aa0e25ffae7b8d728 (Adding an SAP Fiori Application to MTA)
    - #loiod7525cef6f6c4aa4acf3ec09c5a8eacb (Adding deployment config to existing MTA)
    - #loioe03f08cfec9e44e59da828542cbaf906 (Creating MTA during generation)
  - adding-javascript-code-assist-5c561ed.md

Security Certificate:
- Generating-an-Application/security-certificate-4b318be.md
```

**STEP**: 5 — Generating with AI (Project Accelerator / Joule)
**DESCRIPTION**: Use these resources to generate entire applications using text prompts, images, or both. Includes examples and experimental advanced features and generation logs.
**LANGUAGE**: TEXT
**CODE**:
```text
AI-assisted generation:
- generating-an-application-with-the-project-accelerator-or-joule-using-sap-fiori-tools-ai-6845fed.md
  - generating-an-application-using-text-e7f9f8c.md
    - example-1-manage-contracts-and-customer-information-in-the-system-c1bccf2.md
    - example-2-display-customers-with-related-contracts-a6c978f.md
  - generating-an-application-using-an-image-39193df.md
    - example-manage-travel-list-report-page-480d33c.md
  - generating-an-application-using-text-and-images-5dd43dc.md
    - example-manage-travel-app-list-report-object-page-d17b256.md
  - viewing-generation-logs-4ecc286.md
  - experimental-developing-an-application-using-advanced-features-418d583.md
```

**STEP**: 6 — Previewing an Application (Mock, Live, Local)
**DESCRIPTION**: For local testing and preview flows: convert to virtual endpoints, use live data or mock data, install and configure MockServer, generate mock data with AI, use custom middlewares, run control, app-to-app navigation and external launchpad preview.
**LANGUAGE**: TEXT
**CODE**:
```text
Previewing an Application:
- Previewing-an-Application/previewing-an-application-b962685.md
  - convert-a-project-to-use-virtual-endpoints-630ddec.md
  - previewing-an-sap-fiori-elements-cap-project-1dc179a.md
  - use-live-data-497aee2.md
  - use-mock-data-bda83a4.md
    - installing-mockserver-2538055.md
    - generating-mock-data-with-ai-815c310.md
  - use-local-sources-6d3a210.md
  - use-custom-middlewares-dce5315.md
  - use-run-control-09171c8.md
    - run-control-overview-d7f20f3.md
    - create-a-new-run-configuration-in-visual-studio-code-3b1f37e.md
    - create-a-new-run-configuration-in-sap-business-application-studio-05f2a9e.md
  - app-to-app-navigation-preview-543675f.md
  - preview-an-application-on-external-sap-fiori-launchpad-c789692.md
  - developer-variant-creation-ceb845a.md
  - preview-an-application-with-the-sap-horizon-theme-2a42256.md
```

**STEP**: 7 — Developing an Application (Page Editor, Annotations, Extensions)
**DESCRIPTION**: Guides for project structure, page element configuration, annotation-based and extension-based elements, building blocks, feature guides (search/use), and the annotation language server (completion, snippets, diagnostics, i18n, navigation).
Use these pages when generating or modifying UI annotations and code extensions.
**LANGUAGE**: TEXT
**CODE**:
```text
Developing an Application:
- Developing-an-Application/developing-an-application-a9c0043.md
  - define-application-structure-bae38e6.md
  - configure-page-elements-047507c.md
    - maintaining-annotation-based-elements-a524d8a.md
      - overview-66c5b6f.md
        - annotation-support-796f6a4.md
        - taskbar-notification-c66373a.md
        - edit-in-source-code-7d8e942.md
        - automatic-generation-576f9fe.md
        - internationalization-i18n-eb427f2.md
        - project-cleanup-2640899.md
      - supported-elements-in-page-editor-47f0424.md
        - list-report-page-493f2aa.md
          - filter-fields-0b84286.md
          - table-aaff7b1.md
            - table-actions-da1931b.md
            - table-columns-a80d603.md
              - basic-columns-5f8c75b.md
              - rating-column-b2ba7b4.md
              - progress-column-0039256.md
              - chart-column-b78b302.md
              - contact-column-dc5931d.md
        - multiple-views-c62b82e.md
        - analytical-chart-9c086ec.md
      - form-and-object-page-1eb11a6.md
        - header-a05d7fc.md
          - #loioa05d7fc1bbbf42a0ade9fb50f6b58b56 (Header)
          - #loioe26d602fe170401abb23d963bda7dd92 (Header Properties)
          - #loioed6ebe654f8d4aacb472c691eb11e5e3 (Header Actions)
          - #loio8a127fc36f5640abaab0056e632fe630 (Header Section)
        - sections-a7b4e17.md
          - table-section-fc59378.md
          - form-section-4102b3d.md
            - basic-fields-2953503.md
            - contact-field-b78c767.md
            - connected-fields-5d85951.md
            - actions-07012f9.md
        - footer-1b391bd.md
      - appendix-457f2e9.md (field/annotation reference)
    - maintaining-extension-based-elements-02172d2.md
      - adding-custom-column-... (add column/section/field/action/view/controller extension)
    - maintaining-building-blocks-6d3ad83.md
  - use-feature-guides-0c9e518.md
    - search-for-a-guide-a50bc4a.md
      - currently-available-guides-7bda292.md
    - develop-with-a-guide-ef157a5.md
      - change-the-code-5781b28.md
    - request-a-new-guide-b672261.md
  - working-with-annotations-55bfb91.md
    - maintaining-annotations-with-language-server-6fc93f8.md
      - code-completion-dd4fc3b.md
      - micro-snippets-addf811.md
      - diagnostics-1fd8f54.md
      - internationalization-support-db02ebf.md
      - peek-and-go-to-definition-1ccb911.md
      - navigation-to-references-2bf104d.md
      - documentation-quick-info-8728bd7.md
    - visualizing-annotations-with-service-modeler-58784b5.md
      - overriding-annotations-2f1bb9c.md
```

**STEP**: 8 — Deploying an Application (Cloud Foundry, ABAP, Launchpad)
**DESCRIPTION**: Deployment configuration and steps for Cloud Foundry and ABAP, SAP Fiori Launchpad configuration, exposing to central router, security, and undeploy instructions. Use the deployment generator pages to automate pipeline steps.
**LANGUAGE**: TEXT
**CODE**:
```text
Deploying an Application:
- Deploying-an-Application/deploying-an-application-1b7a3be.md
  - deployment-configuration-1c85927.md
  - generate-deployment-configuration-abap-c06b9cb.md
  - generate-deployment-configuration-cloud-foundry-41e63bd.md
  - sap-fiori-launchpad-configuration-bc3cb89.md
  - deployment-of-application-607014e.md
  - undeploy-an-application-70872c4.md
  - expose-application-to-central-application-router-85ad10d.md
  - security-8a147c6.md
```

**STEP**: 9 — Extending an Existing Application (Adaptation Projects)
**DESCRIPTION**: Guides for creating adaptation projects for on-premise and cloud ABAP environments, making UI adaptations (control variants, fragments, controller extensions), adding app descriptor changes, previewing and deploying adaptation projects, and checking compatibility with base app upgrades.
**LANGUAGE**: TEXT
**CODE**:
```text
Extending an Existing Application:
- extending-an-existing-application-6e25aca.md

On-Premise Adaptation:
- extending-an-sap-fiori-application-for-an-on-premise-system-802f01c.md
  - creating-an-adaptation-project-072f566.md
  - working-with-an-adaptation-project-36e4b64.md
    - making-adaptations-2a076dd.md
      - adapting-the-ui-9c1e7b4.md
        - create-control-variants-views-3dbd97f.md
        - add-fragments-to-an-aggregation-or-extension-point-bdb6561.md
        - controller-extensions-ad7b4ae.md
        - internationalization-a789703.md
        - quick-actions-availability-matrix-5d3d94b.md
      - adding-app-descriptor-changes-02085cb.md
        - replacing-odata-service-6b51df2.md
        - adding-local-annotation-files-392a056.md
        - adding-odata-service-and-new-sapui5-model-71eaa3f.md
        - adding-sapui5-component-usages-manually-12be091.md
    - previewing-an-adaptation-project-8701335.md
    - deploying-an-adaptation-project-to-the-abap-repository-febf0d9.md
    - updating-the-adaptation-project-5808877.md
    - deleting-an-adaptation-project-458f1f3.md

Cloud / S/4HANA Cloud & BTP ABAP:
- extending-an-sap-fiori-application-for-sap-s-4hana-cloud-public-edition-and-sap-btp-abap-f4881a9.md
  - create-the-adaptation-project-d6ab261.md
  - making-adaptations-6d2cfea.md
    - adapt-the-ui-af9747f.md
      - create-control-variants-views-b4026b7.md
      - add-fragments-to-an-aggregation-or-extension-point-6033d56.md
      - controller-extensions-f43630d.md
      - upgrade-safe-compatibility-rules-53706e2.md
      - internationalization-f6d1972.md
      - quick-actions-availability-matrix-59408f9.md
    - adding-app-descriptor-changes-115ad56.md
      - replacing-odata-service-e913fbf.md
      - adding-local-annotation-files-c5d62ca.md
      - adding-odata-service-and-new-sapui5-model-886e83b.md
      - adding-sapui5-component-usages-dd4b6e4.md
      - change-inbound-4ce1920.md
  - previewing-an-adaptation-project-64cc15b.md
  - deploying-or-updating-an-adaptation-project-to-the-abap-repository-32c901d.md
  - check-whether-your-adaptation-project-is-up-to-date-with-base-app-upgrades-c6ef105.md
  - deleting-an-adaptation-project-3db6190.md

Release checks:
- releasing-an-sap-fiori-application-to-be-extensible-in-adaptation-projects-on-sap-s-4hana-1046206.md
  - check-consistency-of-release-state-1f91cd4.md
```

**STEP**: 10 — Quick Reference: Useful Files and IDs (Appendix & Links)
**DESCRIPTION**: Quick lookup for annotation appendix, header/footer/sections references, and field/annotation properties. Use these when generating UI annotations, i18n keys, or validating annotation-based editors.
**LANGUAGE**: TEXT
**CODE**:
```text
Annotation Appendix and references:
- Developing-an-Application/appendix-457f2e9.md
  - contact, criticality, description, dimension, display-as-image, display-type,
    external-id, forecast-value, hidden, hide-by-property, importance,
    improvement-direction, label, maximum-value, measures, minimum-value,
    restrictions, target, text, text-arrangement, tooltip, semantic-object-name,
    semantic-object-property-mapping, value-help

Header/Footer/Sections reference IDs (use when deep-linking):
- Developing-an-Application/header-a05d7fc.md
  - #loioa05d7fc1bbbf42a0ade9fb50f6b58b56
  - #loioe26d602fe170401abb23d963bda7dd92
  - #loioed6ebe654f8d4aacb472c691eb11e5e3
  - #loio8a127fc36f5640abaab0056e632fe630

Visual Studio Code link anchors:
- Getting-Started-with-SAP-Fiori-Tools/visual-studio-code-17efa21.md
  - #loio002ae80eac034e6588af81827ab97332
  - #loio4ce76a049bab42b0843111af4c7dcb4c
```

Use the file paths above as exact document keys to fetch detailed examples, code snippets, command sequences, and configuration templates when generating or modifying SAP Fiori applications.
--------------------------------

**TITLE**: Internationalization (i18n) for Adaptation Projects

**INTRODUCTION**: This document explains how adaptation projects provide internationalization (i18n) support. It shows where i18n files are created, how to add or override key-value pairs, and how to reference those keys from SAPUI5 controls (via the Adaptation Editor or view code). Use this when you need translatable UI text for pages in an adaptation project.

**TAGS**: fiori-tools, i18n, internationalization, SAPUI5, adaptation, i18n.properties

**STEP**: 1 — Project i18n file locations

**DESCRIPTION**: Locate the per-page i18n.properties files created when you create an adaptation project. Use these files to define keys for text shown on that page. The typical workspace folder structure under the adaptation project is:

**LANGUAGE**: text

**CODE**:
```text
<Project name>
└── webapp
    └── i18n
        ├── page1
        │   └── collection
        │       └── i18n.properties
        └── page2
            └── collection
                └── i18n.properties
```

Keep the folder hierarchy and file names exactly as above so the Adaptation Editor can find and present the keys for each page.

**STEP**: 2 — Add or override i18n key-value pairs

**DESCRIPTION**: Edit the page-specific i18n.properties file to add new keys or override existing keys from the source application. Each line is a key=value pair. Use unique keys per page/collection to avoid collisions unless you intentionally want to override the source application's key.

- Save the file in the adaptation project path shown above.
- To override an existing key from the source application, declare the same key with a new value in the adaptation project's i18n.properties file for the relevant page/collection.

**LANGUAGE**: Properties

**CODE**:
```properties
# webapp/i18n/page1/collection/i18n.properties

title=Customer Overview
button.save=Save
button.cancel=Cancel
message.empty=No items found
```

Example of overriding a source key (same key name, new value):
```properties
# override example: adaptation webapp/i18n/page1/collection/i18n.properties
button.save=Save Changes
```

**STEP**: 3 — Reference i18n keys from UI controls (Adaptation Editor or view code)

**DESCRIPTION**: In the Adaptation Editor use the Properties pane to set a control’s text via the i18n key rather than hard-coded text. The editor shows available keys from the page's i18n.properties. Alternatively, in view code (XML/JS) bind the control text to the i18n model using the i18n key.

Examples:

- XML view binding
- JavaScript usage (getText from resource bundle)

**LANGUAGE**: XML

**CODE**:
```xml
<!-- Example XML view usage -->
<core:View xmlns:core="sap.ui.core" xmlns="sap.m">
  <Text text="{i18n>title}" />
  <Button text="{i18n>button.save}" />
</core:View>
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Example JS usage inside a controller
const oBundle = this.getView().getModel("i18n").getResourceBundle();
const sSaveText = oBundle.getText("button.save"); // "Save" or overridden value
this.byId("saveButton").setText(sSaveText);
```

**STEP**: 4 — Run and verify

**DESCRIPTION**: Run the adaptation project as a web application. Verify that UI controls display the text from your i18n key-value pairs. If you overrode a source key, confirm the adapted value appears instead of the original.

Checklist:
- Confirm i18n.properties file saved under the correct page/collection path.
- Confirm keys match the keys used in the Adaptation Editor or view bindings.
- Clear cache / do a hard reload if the old text still appears in the browser.

**LANGUAGE**: text

**CODE**:
```text
Run the app (e.g., via Fiori tools preview or served webapp)
Open the page and check:
- Controls using {i18n>key} show the expected values.
- Overridden keys reflect adaptation project values.
```
--------------------------------

**TITLE**: Internationalization (i18n) for Adaptation Projects

**INTRODUCTION**: This guide explains how to provide and override translatable UI text in an adaptation project using i18n key-value pairs. It shows where i18n files live, how to define keys, and how to reference them from SAPUI5 views or controllers. Use these steps to add new translations or override existing source application text.

**TAGS**: fiori-tools, i18n, internationalization, SAPUI5, adaptation-project, i18n.properties, adaptation-editor

STEP: 1 — Locate i18n files in the adaptation project

DESCRIPTION: Find the per-page i18n.properties files that the adaptation project creates. Use these paths to add or edit i18n key-value pairs for specific pages or collections.

LANGUAGE: text

CODE:
```text
<ProjectRoot>/webapp/i18n/<page-name>/<collection>/i18n.properties
```

Example workspace tree:
```text
<Project name>
└─ webapp
   └─ i18n
      ├─ page1
      │  └─ collection
      │     └─ i18n.properties
      └─ page2
         └─ collection
            └─ i18n.properties
```

STEP: 2 — Define key-value pairs in i18n.properties

DESCRIPTION: Add i18n key-value pairs to the appropriate i18n.properties file. Use simple keys (no spaces) and assign the localized string values. Save the file in the adaptation project; the Adaptation Editor and runtime will use these values.

LANGUAGE: properties

CODE:
```properties
# webapp/i18n/page1/collection/i18n.properties
button.save = Save
button.cancel = Cancel
label.username = User Name
message.welcome = Welcome, {0}!
```

STEP: 3 — Reference i18n keys in XML-based SAPUI5 views

DESCRIPTION: Bind UI control text to i18n keys in XML views. Use the view's i18n model (commonly named "i18n") with the syntax {i18n>key}. This ensures the control renders the localized string defined in i18n.properties.

LANGUAGE: xml

CODE:
```xml
<!-- Example XML view snippet -->
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">
  <Page id="page">
    <content>
      <Button text="{i18n>button.save}" />
      <Button text="{i18n>button.cancel}" />
      <Label text="{i18n>label.username}" />
    </content>
  </Page>
</mvc:View>
```

STEP: 4 — Reference i18n keys in JavaScript controllers

DESCRIPTION: Retrieve i18n values at runtime in controllers. Use the view's resource model (commonly named "i18n") and call getProperty to access keys. Pass parameters for placeholder replacement.

LANGUAGE: javascript

CODE:
```javascript
// Example controller snippet
onInit: function () {
  var oBundle = this.getView().getModel("i18n").getResourceBundle();
  var sSaveText = oBundle.getText("button.save");
  var sWelcome = oBundle.getText("message.welcome", ["Alice"]); // "Welcome, Alice!"
  this.byId("saveButton").setText(sSaveText);
}
```

STEP: 5 — Override existing i18n keys from the source application

DESCRIPTION: To change text of existing UI controls, override the key-value pair in the adaptation project's i18n.properties using the same key as in the source application. The adaptation project's value takes precedence for the adapted page.

LANGUAGE: properties

CODE:
```properties
# Override example
# Original app had: button.save=Save
button.save = Commit
```

STEP: 6 — Use Adaptation Editor to assign i18n keys to controls

DESCRIPTION: In the Adaptation Editor, prefer assigning an i18n key to a control's property (instead of entering literal text). Set the property to the i18n key so the runtime looks up the value from the i18n model.

LANGUAGE: text

CODE:
```text
Steps in Adaptation Editor:
1. Select a control in the UI editor.
2. In the Properties pane, for the text/title property choose the i18n key reference (e.g., i18n>button.save).
3. Save the adaptation; the control displays the value from webapp/i18n/<page>/<collection>/i18n.properties.
```

STEP: 7 — Run and verify in the web application

DESCRIPTION: Run the adaptation project as a web application. Verify each control displays the value from the corresponding i18n.properties file. If values are not shown, confirm:
- The i18n.properties file is in webapp/i18n/<page>/<collection>/i18n.properties
- The i18n model is registered and named correctly (commonly "i18n")
- Keys in views/controllers match keys in the properties file

LANGUAGE: text

CODE:
```text
Verification checklist:
- File path exists: <ProjectRoot>/webapp/i18n/<page>/<collection>/i18n.properties
- Keys used in views/controllers exactly match properties keys
- Adaptation Editor assigned i18n keys (not literal text)
- Browser cache cleared or app reloaded to pick up changes
```
--------------------------------

**TITLE**: Making Adaptations (fiori-tools)

**INTRODUCTION**: This guide provides an action-oriented template for creating and testing UI adaptations for SAP Fiori applications using a local UI5 development workspace. It outlines the minimal project layout and commands to scaffold, run, and validate adaptation artifacts locally. Use these steps to prepare a reproducible workspace for generating adaptation changes (flexibility/variants) and to integrate those artifacts into your CI/CD pipeline.

**TAGS**: fiori-tools, ui5, adaptation, flexibility, manifest, workspace, local-dev

**STEP**: 1 — Create a local UI5 adaptation workspace

**DESCRIPTION**: Create a workspace folder, initialize npm, install the UI5 CLI, and initialize a UI5 project structure. This sets up a predictable environment for producing adaptation artifacts (change files / variant descriptors).

**LANGUAGE**: Shell

**CODE**:
```bash
# create workspace
mkdir fiori-adaptations
cd fiori-adaptations

# initialize npm and install UI5 CLI locally
npm init -y
npm install --save-dev @ui5/cli

# initialize a basic UI5 project structure
mkdir -p webapp
```

**STEP**: 2 — Add a minimal manifest.json for the app under webapp

**DESCRIPTION**: Create or update webapp/manifest.json with the minimal keys required by UI5 and by adaptation tools (sap.app and sap.ui5). Keep this manifest as the primary descriptor that adaptations will reference.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "sap.app": {
    "id": "com.example.adaptation",
    "type": "application",
    "i18n": "i18n/i18n.properties",
    "title": "{{appTitle}}"
  },
  "sap.ui5": {
    "rootView": {
      "viewName": "com.example.adaptation.view.Main",
      "type": "XML",
      "async": true
    },
    "dependencies": {
      "minUI5Version": "1.60.0",
      "libs": {
        "sap.m": {}
      }
    }
  }
}
```

**STEP**: 3 — Add sample webapp index.html and a placeholder view

**DESCRIPTION**: Provide a minimal index.html and a view to let the UI5 server serve the application for testing adaptations in the browser.

**LANGUAGE**: HTML

**CODE**:
```html
<!-- webapp/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Fiori Adaptation Test</title>
    <script id="sap-ui-bootstrap"
            src="https://sapui5.hana.ondemand.com/resources/sap-ui-core.js"
            data-sap-ui-theme="sap_fiori_3"
            data-sap-ui-resourceroots='{"com.example.adaptation": "./"}'
            data-sap-ui-async="true">
    </script>
    <script>
      sap.ui.getCore().attachInit(function () {
        new sap.ui.xmlview({ viewName: "com.example.adaptation.view.Main" }).placeAt("content");
      });
    </script>
  </head>
  <body class="sapUiBody" id="content"></body>
</html>
```

```xml
<!-- webapp/view/Main.view.xml -->
<mvc:View controllerName="com.example.adaptation.controller.Main"
          xmlns:mvc="sap.ui.core.mvc"
          xmlns="sap.m">
  <App>
    <Page title="Adaptation Test">
      <content>
        <VBox>
          <Text text="Adaptation test page" />
        </VBox>
      </content>
    </Page>
  </App>
</mvc:View>
```

**STEP**: 4 — Configure ui5.yaml (UI5 tooling) for local serving

**DESCRIPTION**: Add ui5.yaml so the UI5 CLI knows how to serve the project. This file enables "npx ui5 serve" to host webapp/ at the root path.

**LANGUAGE**: YAML

**CODE**:
```yaml
# ui5.yaml
specVersion: '2.2'
metadata:
  name: fiori-adaptations
type: application
server:
  customMiddleware:
    - name: ui5-middleware-simpleproxy
      afterMiddleware: compression
      mountPath: /api
      configuration:
        baseUri: http://backend.example.local
```

**STEP**: 5 — Start the local UI5 dev server and open the app

**DESCRIPTION**: Serve the application locally and open it in a browser to validate baseline behavior before applying or generating adaptation artifacts.

**LANGUAGE**: Shell

**CODE**:
```bash
# run UI5 server (from project root)
npx ui5 serve --config=ui5.yaml --open index.html
# or explicitly open:
# npx ui5 serve -o /index.html
```

**STEP**: 6 — Create a placeholder folder for adaptation artifacts (flexibility/change files)

**DESCRIPTION**: Use a predictable folder structure for generated adaptation artifacts. Adaptation tools typically generate change files (flexibility) that reference app id and control selectors. Keep these under webapp/changes or a workspace-specific folder to version and review.

**LANGUAGE**: Shell / JSON

**CODE**:
```bash
# create changes folder
mkdir -p webapp/changes
```

```json
// Example change file (webapp/changes/change_someAction.json)
// Follow UI5 flexibility change schema for real change files.
{
  "fileName": "change_someAction.json",
  "changeType": "appdescr_variant",
  "reference": "com.example.adaptation",
  "selector": {
    "id": "com.example.adaptation--someControl",
    "idIsLocal": true
  },
  "content": {
    "variantName": "Example variant"
  }
}
```

**STEP**: 7 — Build artifacts and prepare for deployment

**DESCRIPTION**: Use the UI5 build to produce a deployable bundle. Include any steps your pipeline requires to incorporate generated adaptation artifacts into the final app archive.

**LANGUAGE**: Shell

**CODE**:
```bash
# perform a build to the dist/ folder
npx ui5 build --include-task=generateCachebusterInfo --dest dist
# final bundle is in dist/webapp
```

**STEP**: 8 — Integrate adaptations into CI/CD and runtime

**DESCRIPTION**: Ensure that adaptation artifacts (webapp/changes/*) are included in your build outputs and deployed to the target hosting (SAP BTP, ABAP repository, or static web server). When deploying to SAP systems that use LREP or variant management, follow your platform's deployment steps to register/activate change files.

**LANGUAGE**: Shell (example placeholder)

**CODE**:
```bash
# copy changes into deployment package (example)
cp -r webapp/changes dist/webapp/

# deploy dist/webapp to your environment (placeholder)
# scp -r dist/webapp/* user@host:/srv/www/your-app/
```

**STEP**: 9 — Validate adaptations in target runtime

**DESCRIPTION**: After deployment, open the application in the target environment and validate that adaptations (variants/changes) take effect. Use browser developer tools to inspect loaded change files or platform-specific tools (e.g., UI Adaptation tools in SAP Business Application Studio or Fiori Launchpad personalization tools).

**LANGUAGE**: None

**CODE**:
```text
# Validation checklist (manual steps)
# - Open app in target environment
# - Verify change files are served (network tab)
# - Confirm expected UI differences appear
# - Run automated UI tests if available
```


--------------------------------

**TITLE**: Making Adaptations (SAPUI5 / Fiori Tools)

**INTRODUCTION**: Define and implement changes to a generated application variant in an SAPUI5 adaptation project. Use these steps to adapt the UI (views, fragments, controller extensions, compatibility rules, i18n) and to apply app descriptor changes (OData services, local annotations, models, component usages, inbound navigation). File references point to the detailed guides for each task.

**TAGS**: fiori-tools, sapui5, adaptation, app-descriptor, control-variants, fragments, controller-extensions, annotations, i18n, odata, manifest

**STEP**: 1 — Adapt the UI (overview)

**DESCRIPTION**: Overview of UI adaptation activities. Use the linked subguides to implement each adaptation. Start in your adaptation project workspace and locate the UI artifacts to change (views, fragments, controllers, variants, i18n resources). Reference: adapt-the-ui-af9747f.md

**LANGUAGE**: Text

**CODE**:
```text
See detailed guides:
- adapt-the-ui-af9747f.md
- create-control-variants-views-b4026b7.md
- add-fragments-to-an-aggregation-or-extension-point-6033d56.md
- controller-extensions-f43630d.md
- upgrade-safe-compatibility-rules-53706e2.md
- internationalization-f6d1972.md
```

**STEP**: 2 — Create Control Variants (Views)

**DESCRIPTION**: Implement view-level control variants to provide alternative UI layouts/behaviors. Create variant view definitions and register them where Variant Management is used. Follow the linked guide to place variant fragments or variant XML views in your adaptation project and reference them from the variant configuration. Reference: create-control-variants-views-b4026b7.md

**LANGUAGE**: Text

**CODE**:
```text
Actions:
- Create variant views or fragments in your webapp/adaptations or changes folder.
- Ensure variant registration is present where VariantManagement is used.
- Test switching variants at runtime.
```

**STEP**: 3 — Add Fragments to an Aggregation or Extension Point

**DESCRIPTION**: Add or replace UI fragments at aggregation points or extension points in generated views. Place fragment XML files in your adaptation project and reference them via the extension point or aggregation ID in the view or manifest. Reference: add-fragments-to-an-aggregation-or-extension-point-6033d56.md

**LANGUAGE**: Text

**CODE**:
```text
Actions:
- Create fragment XML files in webapp/fragments/ or webapp/adaptations/fragments/.
- Update the parent view or use an extensionPoint definition to insert the fragment.
- Verify ID and aggregation path match the target control.
```

**STEP**: 4 — Controller Extensions

**DESCRIPTION**: Add or override controller logic by creating controller extension files and wiring them into the adaptation. Use extension hooks exposed by the base app or UI5 component to add custom behavior without modifying the generated app core. Reference: controller-extensions-f43630d.md

**LANGUAGE**: Text

**CODE**:
```text
Actions:
- Create controller extension JS files in webapp/controllerExtensions/ or a similar folder.
- Register/declare the extension according to the base app's extension mechanism.
- Use lifecycle hooks and call base methods where needed to remain upgrade-safe.
```

**STEP**: 5 — Upgrade Safe Compatibility Rules

**DESCRIPTION**: Add compatibility rules to ensure customizations remain safe across upgrades. Implement rules that constrain or adapt changes to avoid breaking core app updates. Reference: upgrade-safe-compatibility-rules-53706e2.md

**LANGUAGE**: Text

**CODE**:
```text
Actions:
- Add compatibility metadata and rules in your adaptation metadata.
- Validate rules during build/test to ensure they do not conflict with framework upgrades.
```

**STEP**: 6 — Internationalization (i18n)

**DESCRIPTION**: Add or override i18n resources for translations and locale-specific strings. Place resource bundles in the adaptation project and reference them so the app loads adapted text. Reference: internationalization-f6d1972.md

**LANGUAGE**: Text

**CODE**:
```text
Actions:
- Create i18n.properties and locale variants under webapp/i18n/ or webapp/adaptations/i18n/.
- Register new bundles in the manifest or ensure the UI5 loader resolves them at runtime.
```

**STEP**: 7 — Adding App Descriptor Changes (overview)

**DESCRIPTION**: Make manifest.json (app descriptor) changes in the adaptation project to add/replace OData services, local annotations, new models, component usages, and inbound navigation. Work in webapp/manifest.json or use an adaptation manifest overlay. Reference: adding-app-descriptor-changes-115ad56.md

**LANGUAGE**: Text

**CODE**:
```text
Primary files:
- webapp/manifest.json
- webapp/localService/annotations/   (for local annotation files)
- webapp/adaptations/manifest-overrides.json   (if using overlay)
```

**STEP**: 8 — Replacing OData Service

**DESCRIPTION**: Replace the OData service declared in the manifest by updating dataSources and model bindings. Ensure URI, type, and settings match the target service and that the model points to the updated data source.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "sap.app": {
    "id": "your.app.id",
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata/sap/MY_SERVICE_SRV/",
        "type": "OData",
        "settings": { "odataVersion": "2.0" }
      }
    }
  },
  "sap.ui5": {
    "models": {
      "": {
        "dataSource": "mainService"
      }
    }
  }
}
```

**STEP**: 9 — Adding Local Annotation Files

**DESCRIPTION**: Add local OData annotation XML files to the adaptation project and register them as dataSources in the manifest. Reference these annotation files from the OData dataSource settings.

**LANGUAGE**: Text

**CODE**:
```text
Actions:
- Place annotation XML files under webapp/localService/annotations/
- In manifest.json add entries under "sap.app" > "dataSources" with "type": "ODataAnnotation" and "settings": { "localUri": "localService/annotations/<file>.xml" }
- Reference the annotation dataSource from the model's "settings": { "annotations": ["<annotationDatasourceKey>"] }
```

**STEP**: 10 — Adding OData Service and New SAPUI5 Model

**DESCRIPTION**: Add a new OData service and register a new model in sap.ui5/models. Declare the service in sap.app/dataSources and declare the model in sap.ui5/models with the dataSource key.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "sap.app": {
    "dataSources": {
      "NewService": {
        "uri": "/sap/opu/odata/sap/NEW_SERVICE_SRV/",
        "type": "OData",
        "settings": { "odataVersion": "2.0" }
      }
    }
  },
  "sap.ui5": {
    "models": {
      "NewModel": {
        "dataSource": "NewService",
        "preload": true
      }
    }
  }
}
```

**STEP**: 11 — Adding SAPUI5 Component Usages

**DESCRIPTION**: Add external SAPUI5 components or libraries via the componentUsages section in the manifest so the app can reference and instantiate those components.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "sap.ui5": {
    "componentUsages": {
      "MyExternalComponent": {
        "name": "my.external.Component",
        "settings": {}
      }
    }
  }
}
```

**STEP**: 12 — Change Inbound (Cross-Application Navigation)

**DESCRIPTION**: Add or modify inbound intents (crossNavigation/inbounds) to change how the app is launched from other apps. Update the "sap.app" > "crossNavigation" > "inbounds" section in the manifest.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "sap.app": {
    "crossNavigation": {
      "inbounds": {
        "MyApp-display": {
          "semanticObject": "MyApp",
          "action": "display",
          "title": "Open My App",
          "signature": {
            "parameters": {}
          }
        }
      }
    }
  }
}
```

**STEP**: 13 — Use the Detailed Topic for Adaptation Extensions (optional)

**DESCRIPTION**: For Fiori elements-based apps, consider adaptation extensions to extend delivered apps. Read the official UI5 topic for patterns and examples.

**LANGUAGE**: Text

**CODE**:
```text
Reference:
- Extending Delivered Apps Using Adaptation Extensions:
  https://ui5.sap.com/#/topic/52fc48b479314d0688be24f699778c47
```
--------------------------------

**TITLE**: Previewing an Adaptation Project

**INTRODUCTION**: Quick, code-focused instructions to open and use the runtime preview for a Fiori adaptation project (RTA / adaptation project). Use this to validate UI adaptations, navigate the app, load test data, and verify behavior in a separate browser tab.

**TAGS**: fiori-tools, adaptation-project, preview, manifest.appdescr_variant, webapp, popup, authentication

**STEP**: 1 — Locate the manifest file in the workspace

**DESCRIPTION**: In your project workspace, find the adaptation project's descriptor file under the webapp folder. The file to open is manifest.appdescr_variant.

**LANGUAGE**: Instructions

**CODE**:
```text
workspace/
└─ webapp/
   └─ manifest.appdescr_variant
```

**STEP**: 2 — Open the preview

**DESCRIPTION**: Right-click the file manifest.appdescr_variant and select "Open Preview" from the context menu. The preview launches in a new browser tab (separate from your IDE).

**LANGUAGE**: Instructions

**CODE**:
```text
Context menu -> Open Preview
```

**STEP**: 3 — Allow popups (required)

**DESCRIPTION**: The preview opens in a new tab; your browser will prompt to allow popups. Click "Allow" for the IDE site (or enable popups temporarily). If popups are blocked, enable popups for the IDE URL in your browser settings and re-trigger "Open Preview".

**LANGUAGE**: Instructions

**CODE**:
```text
If blocked:
- Chrome: Settings -> Privacy and security -> Site Settings -> Pop-ups and redirects -> Allow [IDE_URL]
- Firefox: Options -> Privacy & Security -> Permissions -> Block pop-up windows (uncheck or add Exception)
```

**STEP**: 4 — Authenticate if prompted (optional)

**DESCRIPTION**: Depending on your authentication model and the target system, the preview might require credentials. When prompted, enter the credentials for the backend/system the adaptation targets. This is required to load real data and test interactions.

**LANGUAGE**: Instructions

**CODE**:
```text
Possible prompts:
- Basic auth dialog
- SAML/OAuth redirect to identity provider
- Single Sign-On (SSO) flow
Provide valid credentials or complete SSO to continue.
```

**STEP**: 5 — Use the preview to validate changes

**DESCRIPTION**: After the preview opens in a new tab and authentication (if applicable) completes, navigate the app, load test data, and exercise scenarios to verify adaptations. Use this tab to confirm UI changes, event behavior, and data bindings.

**LANGUAGE**: Instructions

**CODE**:
```text
Validate:
- Navigation between views
- Data loading and bindings
- Modified controls and annotations
- Custom actions or scripts
Close the preview tab when finished.
```

**STEP**: 6 — Troubleshooting common issues

**DESCRIPTION**: Quick checks if the preview does not behave as expected: ensure the correct manifest.appdescr_variant is selected, confirm popup permission, verify connectivity to backend system, and check the browser console for errors.

**LANGUAGE**: Instructions

**CODE**:
```text
Troubleshoot:
- Confirm file: webapp/manifest.appdescr_variant
- Ensure popups allowed for IDE URL
- Check network connectivity and credentials
- Open browser DevTools Console for runtime errors
- Restart preview after making changes in the adaptation project
```
--------------------------------

**TITLE**: Previewing an Adaptation Project (SAP Fiori Tools)

**INTRODUCTION**: Quick, action-oriented guide to open and preview an adaptation project created with SAP Fiori Tools. Use this to launch the project in a browser tab for interactive testing of UI adaptations and newly added functionality.

**TAGS**: fiori-tools, preview, adaptation, manifest, webapp, sap, preview-application

**STEP**: 1 — Open preview command from project explorer

**DESCRIPTION**: Locate the project entry you want to preview in your workspace. Right-click one of the valid targets (project main folder, the webapp folder, or the manifest variant file) and choose the "Preview Application" context menu command.

**LANGUAGE**: text

**CODE**:
```text
Valid right-click targets:
- <project-root>            (project main folder)
- <project-root>/webapp     (webapp folder)
- <project-root>/webapp/manifest.appdescr_variant

Context menu action:
- Right-click -> Preview Application
```

**STEP**: 2 — Start the preview and test in browser

**DESCRIPTION**: After invoking "Preview Application", click the Start button in the preview dialog. The adaptation project will launch in a separate browser tab where you can navigate the app, load data, and interactively test any adaptations or new functionality.

**LANGUAGE**: text

**CODE**:
```text
Action:
- Click "Start" in the preview dialog

Outcome:
- A new browser tab opens with the adapted application
- Use the app to navigate, load data, and verify behavior
```
--------------------------------

**TITLE**: Quick Actions Availability Matrix (Machine-Readable & Utility)

**INTRODUCTION**: This document provides a machine-readable availability matrix and utility code to determine whether a given quick action is supported for a specific combination of OData version, SAPUI5 version, and page type in adaptation projects based on SAP Fiori elements. Use the JSON matrix programmatically or the TypeScript helper to validate availability before attempting to apply quick actions or manifest changes.

**TAGS**: fiori-tools, sapui5, odata, adaptation, manifest.json, quick-actions, compatibility

**STEP**: 1

**DESCRIPTION**: Programmatic availability matrix (JSON). Each entry lists the quick action, supported OData versions, page types, and the minimum SAPUI5 version required for that action to be available for each OData version. Use this JSON as authoritative input for code that decides whether to present or enable a quick action in automation/adaptation tools.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "matrixVersion": "1.0",
  "sapui5Columns": ["1.71","1.84","1.96","1.108","1.120","1.130","1.133","1.134",">=1.135"],
  "actions": [
    {
      "id": "addControllerToPage",
      "title": "Add Controller to Page",
      "pageTypes": ["List Report/Analytical List Page","Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.71" },
        "ODataV4": { "minSapUi5Version": "1.71" }
      }
    },
    {
      "id": "addHeaderField",
      "title": "Add Header Field",
      "pageTypes": ["Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.71" },
        "ODataV4": { "minSapUi5Version": "1.71" }
      }
    },
    {
      "id": "addCustomSection",
      "title": "Add Custom Section",
      "pageTypes": ["Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.71" },
        "ODataV4": { "minSapUi5Version": "1.71" }
      }
    },
    {
      "id": "addCustomPageAction",
      "title": "Add Custom Page Action",
      "pageTypes": ["List Report/Analytical List Page","Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.130" },
        "ODataV4": { "minSapUi5Version": "1.130" }
      }
    },
    {
      "id": "addCustomTableAction",
      "title": "Add Custom Table Action",
      "pageTypes": ["List Report/Analytical List Page","Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.96" },
        "ODataV4": { "minSapUi5Version": "1.96" }
      }
    },
    {
      "id": "addCustomTableColumn",
      "title": "Add Custom Table Column",
      "pageTypes": ["List Report/Analytical List Page","Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.96" },
        "ODataV4": { "minSapUi5Version": "1.96" }
      }
    },
    {
      "id": "addLocalAnnotationFile",
      "title": "Add Local Annotation File",
      "pageTypes": ["List Report/Analytical List Page","Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.133" },
        "ODataV4": { "minSapUi5Version": "1.133" }
      }
    },
    {
      "id": "addSubpage",
      "title": "Add Subpage",
      "pageTypes": ["List Report/Analytical List Page","Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.96" },
        "ODataV4": { "minSapUi5Version": "1.135" }
      }
    },
    {
      "id": "changeTableActions",
      "title": "Change Table Actions",
      "pageTypes": ["List Report/Analytical List Page","Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.108" },
        "ODataV4": { "minSapUi5Version": "1.130" }
      }
    },
    {
      "id": "changeTableColumns",
      "title": "Change Table Columns",
      "pageTypes": ["List Report/Analytical List Page","Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.96" },
        "ODataV4": { "minSapUi5Version": "1.96" }
      }
    },
    {
      "id": "enableDisableClearButton",
      "title": "Enable/Disable Clear Button",
      "pageTypes": ["List Report/Analytical List Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.71" },
        "ODataV4": { "minSapUi5Version": "1.71" }
      }
    },
    {
      "id": "enableEmptyRowModeForTables",
      "title": "Enable Empty Row Mode for Tables",
      "pageTypes": ["Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.130" },
        "ODataV4": { "minSapUi5Version": "1.133" }
      }
    },
    {
      "id": "enableSemanticDateRange",
      "title": "Enable Semantic Date Range",
      "pageTypes": ["List Report/Analytical List Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.96" },
        "ODataV4": { "minSapUi5Version": "1.130" }
      }
    },
    {
      "id": "enableTableFilteringForPageVariants",
      "title": "Enable Table Filtering for Page Variants",
      "pageTypes": ["List Report/Analytical List Page","Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.96" },
        "ODataV4": { "minSapUi5Version": "1.133" }
      }
    },
    {
      "id": "enableVariantManagementInTables",
      "title": "Enable Variant Management in Tables",
      "pageTypes": ["Object Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.96" }
      }
    },
    {
      "id": "enableVariantManagementInTablesAndCharts",
      "title": "Enable Variant Management in Tables and Charts",
      "pageTypes": ["List Report/Analytical List Page"],
      "support": {
        "ODataV2": { "minSapUi5Version": "1.96" },
        "ODataV4": { "minSapUi5Version": "1.133" }
      }
    }
  ],
  "notes": [
    "Actions marked with an asterisk (*) can change the app manifest (manifest.json).",
    "Actions that result in manifest.json changes are not available for adaptation projects built on OData V2 applications that use SAPUI5 < 1.134 and have an outdated array page structure in manifest.json.",
    "See: Extending the Delivered Apps Manifest Using an Adaptation Project — https://ui5.sap.com/#/topic/a2b24a69baef4b91af2293ccc6b5871f"
  ]
}
```

**STEP**: 2

**DESCRIPTION**: TypeScript utility to check quick-action availability using the JSON matrix above. Use this to gate UI presentation or automation steps. It compares SAPUI5 versions (simple semantic comparison) and validates page type and OData version availability.

**LANGUAGE**: TypeScript

**CODE**:
```typescript
// Usage:
// 1) Load the JSON matrix (embed or import).
// 2) Call isActionAvailable(actionId, "ODataV2"|"ODataV4", "List Report/Analytical List Page", "1.130")

type ODataType = "ODataV2" | "ODataV4";
type Matrix = {
  matrixVersion: string;
  actions: Array<{
    id: string;
    title: string;
    pageTypes: string[];
    support: Record<ODataType | string, { minSapUi5Version: string }>;
  }>;
  notes: string[];
};

function parseVersion(v: string): number[] {
  // Normalize formats like ">=1.135" to "1.135"
  const clean = v.replace(/^>=/, "");
  return clean.split(".").map((n) => parseInt(n, 10) || 0);
}

function compareVersion(a: string, b: string): number {
  // returns -1 if a < b, 0 if equal, 1 if a > b
  const A = parseVersion(a);
  const B = parseVersion(b);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const ai = A[i] || 0;
    const bi = B[i] || 0;
    if (ai < bi) return -1;
    if (ai > bi) return 1;
  }
  return 0;
}

/**
 * Determines if an action is available for the provided combination.
 * - matrix: the parsed JSON matrix
 * - actionId: id of the action (see matrix.actions[].id)
 * - odata: "ODataV2" | "ODataV4"
 * - pageType: page type string (must match one of action.pageTypes)
 * - sapUi5Version: actual SAPUI5 version string, e.g. "1.130"
 */
function isActionAvailable(
  matrix: Matrix,
  actionId: string,
  odata: ODataType,
  pageType: string,
  sapUi5Version: string
): boolean {
  const action = matrix.actions.find((a) => a.id === actionId);
  if (!action) return false;
  if (!action.pageTypes.includes(pageType)) return false;
  const support = action.support[odata];
  if (!support) return false;
  const minVersion = support.minSapUi5Version;
  // If matrix contains >= prefix originally, minVersion was normalized to numeric string in JSON.
  return compareVersion(sapUi5Version, minVersion) >= 0;
}

// Example:
// const matrix: Matrix = /* load JSON from STEP 1 */;
// console.log(isActionAvailable(matrix, "addCustomPageAction", "ODataV2", "Object Page", "1.120")); // false
// console.log(isActionAvailable(matrix, "addCustomPageAction", "ODataV2", "Object Page", "1.130")); // true
```

**STEP**: 3

**DESCRIPTION**: Manifest-related prerequisite check and guidance. Actions that modify manifest.json may be blocked by outdated manifest structures. Use this step to flag such scenarios before performing actions that mutate the manifest.

**LANGUAGE**: JSON (example file path and check hint)

**CODE**:
```json
{
  "filePath": "manifest.json",
  "check": "If your project is OData V2 and uses SAPUI5 < 1.134, verify the array page structure in manifest.json. If it is the 'outdated array page structure', block actions that modify the manifest (see matrix notes).",
  "reference": "https://ui5.sap.com/#/topic/a2b24a69baef4b91af2293ccc6b5871f"
}
```

**STEP**: 4

**DESCRIPTION**: Practical integration notes for code generators or RAG agents:
- Load the JSON matrix at startup and cache it.
- When presenting quick actions in a UI or automation pipeline, call isActionAvailable() for each candidate action.
- For actions that result in manifest.json changes, perform the manifest checks described in STEP 3 and refuse/notify if constraints apply.
- Keep the JSON matrix synchronized with official documentation when SAPUI5 or Fiori elements support changes.

**LANGUAGE**: None

**CODE**:
```text
(Integration checklist)
- Load matrix JSON at tool initialization.
- Validate project OData version and SAPUI5 version.
- For each quick action candidate:
  - Check pageType match.
  - Call isActionAvailable(matrix, actionId, odata, pageType, sapUi5Version).
  - If available and action modifies manifest.json, ensure manifest.json structure is compatible (see STEP 3).
- Use the reference link for resolving manifest structure questions:
  https://ui5.sap.com/#/topic/a2b24a69baef4b91af2293ccc6b5871f
```
--------------------------------

**TITLE**: Quick Actions Availability Matrix (SAP Fiori tools) — Machine-readable reference

**INTRODUCTION**: This document provides a concise, machine-friendly reference of which quick actions are supported in adaptation projects of SAP Fiori elements apps, by OData version, page type, and SAPUI5 version. Use these JSON objects to programmatically validate or enable quick-action tooling and code generation flows.

**TAGS**: sapui5, fiori-tools, quick-actions, adaptation-projects, odata-v2, odata-v4, manifest.json

STEP: Add Controller to Page
DESCRIPTION: Supported for both OData V2 and V4 on List Report/Analytical List Page and Object Page across all listed SAPUI5 versions.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Add Controller to Page",
  "pageTypes": ["List Report/Analytical List Page", "Object Page"],
  "manifestChange": false,
  "support": {
    "ODataV2": {
      "1.71": true,
      "1.84": true,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": true,
      "1.84": true,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Add Header Field
DESCRIPTION: Supported on Object Page for both OData V2 and V4 across all listed SAPUI5 versions.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Add Header Field",
  "pageTypes": ["Object Page"],
  "manifestChange": false,
  "support": {
    "ODataV2": {
      "1.71": true,
      "1.84": true,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": true,
      "1.84": true,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Add Custom Section
DESCRIPTION: Supported on Object Page for both OData V2 and V4 across all listed SAPUI5 versions.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Add Custom Section",
  "pageTypes": ["Object Page"],
  "manifestChange": false,
  "support": {
    "ODataV2": {
      "1.71": true,
      "1.84": true,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": true,
      "1.84": true,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Add Custom Page Action
DESCRIPTION: Supported for List Report/Analytical List Page and Object Page. Availability starts at SAPUI5 1.130 and above for both OData V2 and V4.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Add Custom Page Action",
  "pageTypes": ["List Report/Analytical List Page", "Object Page"],
  "manifestChange": true,
  "support": {
    "ODataV2": {
      "1.71": false,
      "1.84": false,
      "1.96": false,
      "1.108": false,
      "1.120": false,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": false,
      "1.84": false,
      "1.96": false,
      "1.108": false,
      "1.120": false,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Add Custom Table Action
DESCRIPTION: Supported for List Report/Analytical List Page and Object Page. Availability starts at SAPUI5 1.96 and above for both OData V2 and V4.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Add Custom Table Action",
  "pageTypes": ["List Report/Analytical List Page", "Object Page"],
  "manifestChange": true,
  "support": {
    "ODataV2": {
      "1.71": false,
      "1.84": false,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": false,
      "1.84": false,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Add Custom Table Column
DESCRIPTION: Supported for List Report/Analytical List Page and Object Page. Availability starts at SAPUI5 1.96 and above for both OData V2 and V4.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Add Custom Table Column",
  "pageTypes": ["List Report/Analytical List Page", "Object Page"],
  "manifestChange": true,
  "support": {
    "ODataV2": {
      "1.71": false,
      "1.84": false,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": false,
      "1.84": false,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Add Local Annotation File*
DESCRIPTION: Supported for List Report/Analytical List Page and Object Page. Availability starts at SAPUI5 1.133 and above for both OData V2 and V4. Note: Marked with * means this action results in manifest changes (see prerequisites).
LANGUAGE: JSON
CODE:
```json
{
  "action": "Add Local Annotation File",
  "pageTypes": ["List Report/Analytical List Page", "Object Page"],
  "manifestChange": true,
  "support": {
    "ODataV2": {
      "1.71": false,
      "1.84": false,
      "1.96": false,
      "1.108": false,
      "1.120": false,
      "1.130": false,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": false,
      "1.84": false,
      "1.96": false,
      "1.108": false,
      "1.120": false,
      "1.130": false,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Add Subpage*
DESCRIPTION: Supported for List Report/Analytical List Page and Object Page. OData V2 support starts at SAPUI5 1.96 and above. OData V4 support is available only for SAPUI5 >=1.135. This action results in manifest changes.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Add Subpage",
  "pageTypes": ["List Report/Analytical List Page", "Object Page"],
  "manifestChange": true,
  "support": {
    "ODataV2": {
      "1.71": false,
      "1.84": false,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": false,
      "1.84": false,
      "1.96": false,
      "1.108": false,
      "1.120": false,
      "1.130": false,
      "1.133": false,
      "1.134": false,
      ">=1.135": true
    }
  }
}
```

STEP: Change Table Actions
DESCRIPTION: Supported for List Report/Analytical List Page and Object Page. OData V2 support starts at SAPUI5 1.108 and above. OData V4 support starts at SAPUI5 1.130 and above.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Change Table Actions",
  "pageTypes": ["List Report/Analytical List Page", "Object Page"],
  "manifestChange": true,
  "support": {
    "ODataV2": {
      "1.71": false,
      "1.84": false,
      "1.96": false,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": false,
      "1.84": false,
      "1.96": false,
      "1.108": false,
      "1.120": false,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Change Table Columns
DESCRIPTION: Supported for List Report/Analytical List Page and Object Page. Availability starts at SAPUI5 1.96 and above for both OData V2 and V4.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Change Table Columns",
  "pageTypes": ["List Report/Analytical List Page", "Object Page"],
  "manifestChange": true,
  "support": {
    "ODataV2": {
      "1.71": false,
      "1.84": false,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": false,
      "1.84": false,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Enable/Disable Clear Button
DESCRIPTION: Supported for List Report/Analytical List Page for both OData V2 and V4 across all listed SAPUI5 versions.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Enable/Disable Clear Button",
  "pageTypes": ["List Report/Analytical List Page"],
  "manifestChange": false,
  "support": {
    "ODataV2": {
      "1.71": true,
      "1.84": true,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": true,
      "1.84": true,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Enable Empty Row Mode for Tables*
DESCRIPTION: Supported on Object Page. OData V2 support starts at SAPUI5 1.130 and above. OData V4 support starts at SAPUI5 1.133 and above. This action results in manifest changes.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Enable Empty Row Mode for Tables",
  "pageTypes": ["Object Page"],
  "manifestChange": true,
  "support": {
    "ODataV2": {
      "1.71": false,
      "1.84": false,
      "1.96": false,
      "1.108": false,
      "1.120": false,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": false,
      "1.84": false,
      "1.96": false,
      "1.108": false,
      "1.120": false,
      "1.130": false,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Enable Semantic Date Range*
DESCRIPTION: Supported on List Report/Analytical List Page. OData V2 support starts at SAPUI5 1.96 and above. OData V4 support starts at SAPUI5 1.130 and above. This action results in manifest changes.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Enable Semantic Date Range",
  "pageTypes": ["List Report/Analytical List Page"],
  "manifestChange": true,
  "support": {
    "ODataV2": {
      "1.71": false,
      "1.84": false,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": false,
      "1.84": false,
      "1.96": false,
      "1.108": false,
      "1.120": false,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Enable Table Filtering for Page Variants*
DESCRIPTION: Supported for List Report/Analytical List Page and Object Page. OData V2 support starts at SAPUI5 1.96 and above. OData V4 support starts at SAPUI5 1.133 and above. This action results in manifest changes.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Enable Table Filtering for Page Variants",
  "pageTypes": ["List Report/Analytical List Page", "Object Page"],
  "manifestChange": true,
  "support": {
    "ODataV2": {
      "1.71": false,
      "1.84": false,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": false,
      "1.84": false,
      "1.96": false,
      "1.108": false,
      "1.120": false,
      "1.130": false,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Enable Variant Management in Tables*
DESCRIPTION: Supported on Object Page. Availability starts at SAPUI5 1.96 and above for OData V2. (No V4 support listed in the matrix.) This action results in manifest changes.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Enable Variant Management in Tables",
  "pageTypes": ["Object Page"],
  "manifestChange": true,
  "support": {
    "ODataV2": {
      "1.71": false,
      "1.84": false,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {}
  }
}
```

STEP: Enable Variant Management in Tables and Charts*
DESCRIPTION: Supported on List Report/Analytical List Page (OData V2) starting at SAPUI5 1.96 and above. For OData V4, support starts at SAPUI5 1.133 and above. This action results in manifest changes.
LANGUAGE: JSON
CODE:
```json
{
  "action": "Enable Variant Management in Tables and Charts",
  "pageTypes": ["List Report/Analytical List Page", "Object Page"],
  "manifestChange": true,
  "support": {
    "ODataV2": {
      "1.71": false,
      "1.84": false,
      "1.96": true,
      "1.108": true,
      "1.120": true,
      "1.130": true,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    },
    "ODataV4": {
      "1.71": false,
      "1.84": false,
      "1.96": false,
      "1.108": false,
      "1.120": false,
      "1.130": false,
      "1.133": true,
      "1.134": true,
      ">=1.135": true
    }
  }
}
```

STEP: Prerequisites and manifest.json note
DESCRIPTION: Actions marked with * modify the app manifest. They are not available for adaptation projects that are:
- based on OData V2 applications,
- using SAPUI5 < 1.134,
- and that have an outdated array page structure in the manifest.json file.
Follow the linked guidance to update the manifest before applying these actions.
LANGUAGE: JSON
CODE:
```json
{
  "note": "Prerequisites for actions resulting in manifest changes",
  "file": "manifest.json",
  "condition": {
    "notAvailableIf": [
      "OData V2",
      "SAPUI5 < 1.134",
      "outdated array page structure in manifest.json"
    ]
  },
  "reference": "See the Prerequisites section in Extending the Delivered Apps Manifest Using an Adaptation Project: https://ui5.sap.com/#/topic/a2b24a69baef4b91af2293ccc6b5871f"
}
```
--------------------------------

**TITLE**: Releasing an SAP Fiori Application to Be Extensible in Adaptation Projects on SAP S/4HANA Cloud and SAP BTP, ABAP Environment

**INTRODUCTION**: Step-by-step actions to prepare and release an SAP Fiori application so it is safely extensible in adaptation projects (SAP S/4HANA Cloud and SAP BTP, ABAP environment). Covers required manifest.json changes, OData/BSP release states (C1/C0), authorization object release settings, and creating an API snapshot. Follow these steps to ensure ATC checks and adaptation tooling recognize your release and prevent breaking changes for customers.

**TAGS**: fiori-tools, sapui5, sap-s4hana-cloud, sap-btp, abap, adaptation, manifest.json, odata, bsp, wapa, atc, api-snapshot

STEP: 1 — Prerequisites and manifest.json requirements

DESCRIPTION: Verify development best practices and enable UI adaptation. Before releasing, increment the application version in manifest.json and ensure sap.app/id contains at least two segments. These manifest settings are required for consumers to receive ATC notifications when the base app is updated. The manifest key sap.fiori/cloudDevAdaptationStatus can be set to "released" only after the OData service C1 contract is Released.

LANGUAGE: JSON

CODE:
```json
{
  "sap.app": {
    "id": "com.example.myapp",          /* must have at least two segments */
    "applicationVersion": {
      "version": "1.2.0"               /* increment this before releasing */
    }
  },
  "sap.fiori": {
    "cloudDevAdaptationStatus": "released" /* allowed values: (null), "released", "deprecated", "obsolete" */
  }
}
```

STEP: 2 — Release the OData service with a C1 contract

DESCRIPTION: In the backend/API management, set the OData service API Release State to C1 = Released. C1 contract: forbids incompatible changes to the service structure but allows annotation changes. This step is required (prerequisite) before setting sap.fiori/cloudDevAdaptationStatus to "released" in manifest.json. ATC checks will enforce this contract.

LANGUAGE: Text

CODE:
```
Action: Set OData service API Release State = C1 (Use System-Internally) -> Released
Notes:
- C1 prevents incompatible structural changes to the OData service.
- Annotations can still be changed.
- Must be set to Released before manifest.json cloudDevAdaptationStatus="released".
```

STEP: 3 — Release the BSP (WAPA object) with a C0 contract and deploy

DESCRIPTION: Release the BSP/WAPA object with a C0 contract. Update the manifest.json as shown (sap.fiori/cloudDevAdaptationStatus="released"). Deployment of the application (BSP/WAPA) will only succeed if the OData service C1 contract is already Released. Ensure sap.app/id has at least two segments (see STEP 1).

LANGUAGE: Text

CODE:
```
Action: Set BSP (WAPA object) API Release State = C0 (Extend) -> Released
Prerequisite: OData service must be C1 = Released
Manifest file to include (manifest.json) as shown in STEP 1
Deployment: Allowed only if above prerequisite is met
```

STEP: 4 — Release authorization objects and restriction types used by the OData service

DESCRIPTION: In the authorization management area, set the relevant authorization objects and restriction types to C1 = Released and select the "Use in Cloud Development" checkbox. This is optional for enabling app variants, but if not released, app variant authorizations will be identical to the original app and original business catalogs must be assigned to the user's role.

LANGUAGE: Text

CODE:
```
Action: For each authorization object / restriction type used by the OData service:
- Set API Release State = C1 -> Released
- Check "Use in Cloud Development"
Note:
- Not strictly required for creating app variants.
- If not released, variant authorizations mirror the original app.
- Original app and original business catalogs must be assigned to user role.
```

STEP: 5 — Create an API snapshot before shipment

DESCRIPTION: Create an API snapshot that includes all released APIs right before shipping the application. Use the Manage API Snapshots application in SAP S/4HANA Cloud. This snapshot ensures a consistent reference for consumers and is used by ATC checks to verify adaptation project compatibility.

LANGUAGE: Text

CODE:
```
Action: Open "Manage API Snapshots" application
- Create a new snapshot including all APIs with Release State = Released (C0/C1 as applicable)
- Save the snapshot and include it in your release documentation
Note: Snapshots are used to check consistency of release state and to support ATC checks.
```

STEP: 6 — Verify ATC checks and consumer notification behavior

DESCRIPTION: Ensure ATC checks are configured and run to enforce release contracts. Confirm consumers receive ATC notifications when base app version is incremented. If you incremented sap.app/applicationVersion/version in manifest.json, ATC and adaptation tools will detect base app updates and notify adaptation projects.

LANGUAGE: Text

CODE:
```
Checks to perform:
- Run ATC or relevant release consistency checks to validate C1/C0 states
- Confirm adaptation projects receive notifications after manifest.json applicationVersion/version increment
- Use "Check Consistency of Release State" and "Check Whether Your Adaptation Project Is Up-To-Date with Base App Upgrades" procedures
```
--------------------------------

**TITLE**: Replacing OData Service (fiori-tools)

**INTRODUCTION**: Step-by-step instructions for replacing an OData service referenced by a Fiori app project (via fiori-tools). Use this to change the service URI, optional caching (`maxAge`), and optional annotation datasource while preserving manifest configuration.

**TAGS**: fiori-tools, OData, manifest, webapp, annotation, replace, maxAge

**STEP**: 1 — Open Replace OData Service action

**DESCRIPTION**: Initiate the "Replace OData Service" action from the project context menu. You can run this action on the project main folder, the `webapp` folder, or directly on the `manifest.appdescr_variant` file.

**LANGUAGE**: Text

**CODE**:
```text
Right-click on:
- project main folder
- webapp
- manifest.appdescr_variant
Then choose: Replace OData Service
```

**STEP**: 2 — Select the target service to replace

**DESCRIPTION**: From the "Target OData Service" dropdown, select the service entry from the base application's manifest that you want to replace. This chooses which service configuration in the manifest will be updated.

**LANGUAGE**: Text

**CODE**:
```text
Target OData Service (dropdown)
Select the service from the base application's manifest to be replaced.
```

**STEP**: 3 — Enter new OData service URI

**DESCRIPTION**: Provide the URI of the new OData service that will replace the selected target. This updates the service root in the manifest entry.

**LANGUAGE**: Text

**CODE**:
```text
Enter the URI of the OData service you want to use instead.
```

**STEP**: 4 — (Optional) Set maxAge

**DESCRIPTION**: Optionally enter the `maxAge` value for the new OData service. This controls caching TTL used by the application for the service.

**LANGUAGE**: Text

**CODE**:
```text
maxAge
(Optional) Enter the maxAge of the new OData service.
```

**STEP**: 5 — (Optional) Replace OData Annotation Data Source

**DESCRIPTION**: If the new OData service supports annotations, optionally enter the URI for the OData Annotation Data Source to use instead. The field will be visible only when annotations are supported by the selected service.

**LANGUAGE**: Text

**CODE**:
```text
OData Annotation Data Source
(Optional) Enter the URI of the OData Annotation Data Source you want to use instead.
(Visible only if the new service supports annotations.)
```

**STEP**: 6 — Save changes

**DESCRIPTION**: Finalize the replacement. Click "Finish" to apply and save the updated manifest and related configuration.

**LANGUAGE**: Text

**CODE**:
```text
Click Finish to save your changes.
```

**STEP**: Compatibility requirements (important)

**DESCRIPTION**: Ensure the new OData service is compatible with the original application service. The following must be preserved in the new service:
- The same entity set names used by the app
- The same properties within those entity sets
- Any function imports the app uses

For OData V2 services that use annotations:
- You must update the annotation data source to point to a compatible annotation file
- The new annotation file must be compatible with the original application's annotations

**LANGUAGE**: Text

**CODE**:
```text
Note:
The new OData service must be compatible with the OData service of the original app. 
The entity set names, properties in the entity set, and function imports used from the original service must also exist in the new service. 
For OData V2 services using annotations, the annotation data source must be changed and the new annotation must also be compatible with the annotation of the original application.
```
--------------------------------

**TITLE**: Replacing OData Service in an Adaptation Project

**INTRODUCTION**: This guide instructs how to replace the OData service referenced by an adaptation project by updating the adaptation project's manifest entry (manifest.appdescr_variant). Follow the wizard steps to point the adaptation to a compatible alternative OData service and, optionally, a different annotation data source and cache maxAge.

**TAGS**: fiori-tools, odata, adaptation, manifest, annotations, SAPUI5

**STEP**: Compatibility check (required)
**DESCRIPTION**: Verify the new OData service and, if used, the new annotation service are compatible with the original app. Ensure the following items exist and match the original service:
- Entity set names used by the app
- Properties within those entity sets
- Function imports used by the app
- For OData V2 with annotations: the new annotation data source must be compatible with the original annotation

**LANGUAGE**: PlainText
**CODE**:
```text
Compatibility checklist:
- Entity set names: must match originals
- Entity set properties: must include required properties
- Function imports: must be present and compatible
- OData V2 annotations (if used): new annotation DS must be compatible
```

**STEP**: Open adaptation project manifest
**DESCRIPTION**: Locate and open the adaptation project's manifest file named manifest.appdescr_variant. Right-click this file to start the Replace OData Service wizard.
- File to open: manifest.appdescr_variant

**LANGUAGE**: PlainText
**CODE**:
```text
File: manifest.appdescr_variant
Action: Right-click -> Adaptation Project -> Replace OData Service
```

**STEP**: Authenticate to system (if prompted)
**DESCRIPTION**: If the wizard prompts, enter the credentials for the backend/system where the adaptation project was created. This is required to access the base application's manifest and available services.

**LANGUAGE**: PlainText
**CODE**:
```text
Prompt: Enter credentials for the system where the adaptation project was created
Purpose: To access base application manifest and available OData services
```

**STEP**: Select target OData service
**DESCRIPTION**: In the wizard, choose which service in the base application's manifest you want to replace from the Target OData Service dropdown. This selection picks the existing service reference that will be replaced.

**LANGUAGE**: PlainText
**CODE**:
```text
Field: Target OData Service (dropdown)
Action: Select the service entry from the base app's manifest that you intend to replace
```

**STEP**: Enter new OData service URI
**DESCRIPTION**: Provide the URI of the replacement OData service that the adaptation should use instead of the original.

**LANGUAGE**: PlainText
**CODE**:
```text
Field: OData service URI
Example input: https://my.backend.example.com/odata/service/
```

**STEP**: (Optional) Set maxAge
**DESCRIPTION**: Optionally set the cache maxAge for the new OData service. This value controls client-side caching behavior for the service.

**LANGUAGE**: PlainText
**CODE**:
```text
Field: maxAge (optional)
Action: Enter numeric cache duration (e.g., 0 for no cache)
```

**STEP**: (Optional) Replace OData Annotation Data Source
**DESCRIPTION**: If the selected service supports annotations, the wizard shows a field to provide the URI for a replacement OData Annotation Data Source. Only provide this if the new annotation DS is compatible with the original annotations used by the app.

**LANGUAGE**: PlainText
**CODE**:
```text
Field: Annotation Data Source URI (visible if service supports annotations)
Action: Enter the annotation data source URI compatible with the original annotations
```

**STEP**: Finish and save changes
**DESCRIPTION**: Click Finish in the wizard to apply and save the changes to manifest.appdescr_variant. Confirm the adaptation project now references the new OData service (and annotation DS if provided).

**LANGUAGE**: PlainText
**CODE**:
```text
Action: Click Finish
Result: manifest.appdescr_variant updated to reference new OData service (and annotation DS if provided)
```
--------------------------------

**TITLE**: Updating the Adaptation Project (Fiori Tools)

**INTRODUCTION**: Instructions to update (redeploy) an existing adaptation project to an on-premise ABAP system using the Adaptation Project deployment flow. Use these steps to automate or script the UI actions or to implement a deployment flow in tooling.

**TAGS**: fiori-tools, adaptation-project, deployment, ABAP, on-premise, manifest.appdescr_variant

**STEP**: Prerequisites

**DESCRIPTION**: Ensure the adaptation project was previously deployed to the ABAP repository. Follow the prior deployment procedure before attempting an update:
- Reference: Deploy the Adaptation Project to the ABAP Repository — https://help.sap.com/docs/bas/developing-sap-fiori-app-in-sap-business-application-studio/deploy-adaptation-project?locale=en-US

**LANGUAGE**: Plain Text

**CODE**:
```text
Prerequisite:
- Project already deployed to on-premise ABAP system (see link above)
- Target project files present:
  - <projectRoot>/webapp/
  - <projectRoot>/webapp/manifest.appdescr_variant
```

**STEP**: Step 1 — Open Deployment Wizard

**DESCRIPTION**: Open the Deployment Wizard on the project item you want to deploy. You may open it on:
- the project root (main folder),
- the webapp folder,
- or the file webapp/manifest.appdescr_variant.

This locates the adaptation project and starts the deployment flow.

**LANGUAGE**: Plain Text

**CODE**:
```text
UI action:
- Right-click on one of:
  - <projectRoot>                   (main folder)
  - <projectRoot>/webapp            (webapp folder)
  - <projectRoot>/webapp/manifest.appdescr_variant
- Select: "Open Deployment Wizard"
```

**STEP**: Step 1 — Automation pseudocode (optional)

**DESCRIPTION**: Example pseudocode for locating the target and invoking the wizard in an automated tool or extension.

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Pseudocode: find target and open deployment wizard
const projectRoot = findProjectRoot(); // implement resolver
const targets = [
  projectRoot,
  path.join(projectRoot, 'webapp'),
  path.join(projectRoot, 'webapp', 'manifest.appdescr_variant')
];
const target = chooseFirstExisting(targets);
openDeploymentWizard(target); // hook into IDE/extension API
```

**STEP**: Step 2 — Select Target System

**DESCRIPTION**: In the Deployment Wizard, pick the on-premise ABAP system to deploy to. The system used when the project was created is selected by default. Verify or change the target system as needed.

**LANGUAGE**: Plain Text

**CODE**:
```text
UI action:
- In Deployment Wizard: select target system
  - Default: the system used to create the project
  - Option: choose another configured ABAP on-premise system
```

**STEP**: Step 2 — Automation pseudocode (optional)

**DESCRIPTION**: Example pseudocode to programmatically select a deployment system.

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Pseudocode: select or confirm deployment system
const availableSystems = listConfiguredABAPSystems();
const systemToUse = availableSystems.find(s => s.id === defaultSystemId) || availableSystems[0];
deploymentWizard.selectSystem(systemToUse);
```

**STEP**: Step 3 — Choose Update

**DESCRIPTION**: If the selected project has already been deployed to the chosen system, the wizard prompts for action. Choose "Update" to redeploy changes (alternatively "Undeploy" to remove).

**LANGUAGE**: Plain Text

**CODE**:
```text
UI prompt (when project already deployed):
- Prompt: "What action would you like to perform?"
- Options: [Update] [Undeploy]
- Action: Click "Update"
```

**STEP**: Step 3 — Automation pseudocode (optional)

**DESCRIPTION**: Pseudocode to handle the update prompt programmatically.

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Pseudocode: if project is already deployed, choose update
if (deploymentWizard.isAlreadyDeployed(target, systemToUse)) {
  deploymentWizard.chooseAction('Update');
}
```

**STEP**: Step 4 — Start Deployment

**DESCRIPTION**: After selecting Update, click "Next" to begin the deployment process. Monitor the wizard for progress and completion messages.

**LANGUAGE**: Plain Text

**CODE**:
```text
UI action:
- Click: "Next"
- The deployment process starts; observe progress and logs in the Deployment Wizard
```

**STEP**: Step 4 — Automation pseudocode (optional)

**DESCRIPTION**: Pseudocode to trigger the final deployment step and wait for completion.

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Pseudocode: start deployment and wait for completion
deploymentWizard.clickNext();
const result = deploymentWizard.waitForCompletion({ timeoutMs: 5 * 60 * 1000 });
if (result.success) {
  console.log('Deployment update completed successfully.');
} else {
  console.error('Deployment update failed:', result.error);
}
```
--------------------------------

**TITLE**: Upgrade-Safe Controller Extension Rules for SAPUI5 / SAP Fiori Adaptation Projects

**INTRODUCTION**: Practical, actionable rules and code patterns to make controller extensions resilient to base application upgrades. Use these guidelines when writing controller code, fragments, or adaptation-project changes to avoid breakage after upgrades and minimize maintenance.

**TAGS**: sapui5, fiori-tools, adaptation-project, controller-extensions, upgrades, best-practices, odata, resilience

**STEP**: 1 — Follow UI5 Best Practices

**DESCRIPTION**: Start every extension by following the official UI5 best practices. This reduces risk from framework and app changes. Use stable public APIs; avoid internal/private APIs and deprecated artifacts.

**LANGUAGE**: General

**CODE**:
```text
Reference: https://ui5.sap.com/#/topic/28fcd55b04654977b63dacbee0552712
Action: Follow the documented UI5 best practices before implementing extensions.
```

**STEP**: 2 — Use Stable IDs Only

**DESCRIPTION**: Always access controls by stable IDs. Never rely on DOM order, aggregation index, or parent-child traversal that depends on UI structure which can change on upgrade.

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Good: access by stable ID defined in XML view or fragment
const oButton = this.byId("stableIdMyButton");

// Bad: relying on aggregation order (avoid)
const aItems = this.getView().byId("myList").getItems();
const oFirstItem = aItems[0]; // fragile across upgrades
```

**STEP**: 3 — Check Existence and Control Type Before Use

**DESCRIPTION**: Always verify a control exists and is the expected control type before invoking methods or properties. This prevents runtime errors when the base app changes.

**LANGUAGE**: JavaScript / TypeScript

**CODE**:
```javascript
// JavaScript example in a controller
const oControl = this.byId("stableIdMyButton");
if (oControl && oControl.isA && oControl.isA("sap.m.Button")) {
  oControl.setEnabled(true);
} else {
  // fallback or safe handling
  // log, ignore, or use alternative logic
  console.warn("Expected sap.m.Button not found for 'stableIdMyButton'");
}
```

**STEP**: 4 — Handle Controls Added by Adaptation Projects

**DESCRIPTION**: Controls added via adaptation changes or fragments may not be present in all snapshots. Apply the same existence and type checks and avoid assuming presence.

**LANGUAGE**: XML / JavaScript

**CODE**:
```xml
<!-- fragment.xml: provide stable IDs when adding controls -->
<Button id="stableIdAddedButton" text="Do" />
```

```javascript
// Controller: safely access fragment-added control
const oAdded = this.byId("stableIdAddedButton");
if (oAdded && oAdded.isA && oAdded.isA("sap.m.Button")) {
  oAdded.attachPress(this._onAddedPress.bind(this));
}
```

**STEP**: 5 — Don’t Call or Override Private/Protected Methods

**DESCRIPTION**: Never call or override framework or base-app private/protected methods. Use public extension points, documented APIs, or official extension mechanisms (e.g., extension hooks, delegates).

**LANGUAGE**: General

**CODE**:
```text
Do:
- Use documented hooks, public APIs, or controller extension mechanisms.

Don't:
- Call methods named with leading underscore "_" or marked as @private/@protected in docs.
```

**STEP**: 6 — Avoid Deprecated Artifacts

**DESCRIPTION**: Do not use deprecated controls, properties, or methods. Use current recommended equivalents and consult UI5 documentation for replacement APIs.

**LANGUAGE**: General

**CODE**:
```text
Check UI5 API docs for deprecation notes and migrate to supported controls/APIs.
```

**STEP**: 7 — Avoid Value Help Entity Sets in Controller/Fragments

**DESCRIPTION**: Value helps are not part of the internal stability contract and may change during upgrades. Do not use value-help-specific entity sets for controller logic or for data binding inside XML fragments.

**LANGUAGE**: XML / JavaScript

**CODE**:
```xml
<!-- Avoid binding critical UI logic to value-help entity sets -->
<!-- Instead bind to stable entity sets exposed by the backend contract. -->
```

**STEP**: 8 — Write Resilient Reuse-Component Access

**DESCRIPTION**: Reuse components (e.g., smart controls, reuse libraries) may change implementation or behavior. Wrap calls in defensive code and handle errors gracefully.

**LANGUAGE**: JavaScript / TypeScript

**CODE**:
```javascript
try {
  // call into reuse component API
  const result = oReuseComponent.somePublicApi();
  // validate result before use
  if (result && typeof result === "object") {
    // proceed safely
  }
} catch (err) {
  // log and provide fallback behavior
  console.error("Reuse component call failed", err);
}
```

**STEP**: 9 — Don’t Hard-Code OData Metadata Values

**DESCRIPTION**: OData metadata can change after upgrades. Do not hard-code property values, entity names, or annotations. Read metadata dynamically and validate before use.

**LANGUAGE**: JavaScript

**CODE**:
```javascript
const oModel = this.getView().getModel();
const oMetaModel = oModel.getMetaModel();
const sPropertyPath = "/EntityType('MyEntity')/Property('MyProp')"; // example: avoid hardcoding
// Better: discover service metadata via metaModel API and validate presence
if (oMetaModel && oMetaModel.getODataEntityType) {
  const oEntityType = oMetaModel.getODataEntityType("MyService.MyEntity");
  if (oEntityType && oEntityType.hasOwnProperty("MyProp")) {
    // safe to use MyProp
  }
}
```

**STEP**: 10 — For Fiori Elements Apps, Use Official Extension Guide

**DESCRIPTION**: For SAP Fiori elements-based apps, extend using the documented adaptation extension mechanisms to ensure compatibility with upgrades.

**LANGUAGE**: General

**CODE**:
```text
Reference: https://ui5.sap.com/#/topic/52fc48b479314d0688be24f699778c47
Action: Follow "Extending Delivered Apps Using Adaptation Extension" for Fiori elements.
```

**STEP**: 11 — Understand Snapshot Behavior in Adaptation Projects (S/4HANA Cloud)

**DESCRIPTION**: An adaptation project deployed to S/4HANA Cloud contains a runnable snapshot of the base application and local UI annotations. The snapshot keeps extended apps runnable after a base-app upgrade, but you must resolve conflicts and redeploy the adaptation project to benefit from the upgraded base app and to receive support.

**LANGUAGE**: General

**CODE**:
```text
Note: Snapshot ensures runtime stability after base-app upgrades.
Action: After base-app upgrade:
1. Test the adaptation using the snapshot.
2. Resolve conflicts between extension code and new base-app implementation.
3. Deploy a new version of the adaptation project to align with the upgraded base app.
Reference: Check Whether Your Adaptation Project Is Up-To-Date with Base App Upgrades (adaptation project documentation)
```
--------------------------------

**TITLE**: Viewing Generation Logs for SAP Fiori tools AI

**INTRODUCTION**: Steps to view the logs produced by the Project Accelerator using SAP Fiori tools AI in VS Code. Use these logs to troubleshoot generation failures or to attach when opening a support ticket. For produced applications, the generated project's logs are stored in its .fiori-ai folder — attach a .zip of the generated project when reporting issues with the app.

**TAGS**: fiori-tools, sap, sap-fiori, ai, logs, troubleshooting, vscode, project-accelerator

**STEP**: 1 — Open Command Palette and set log level

**DESCRIPTION**: Open the VS Code Command Palette and run the Developer: Set Log Level command. Set the log level to Info. Important: set the log level before generating your application and again whenever the dev space is restarted.

**LANGUAGE**: VS Code / Instructions

**CODE**:
```text
Keyboard: [CMD/CTRL] + [Shift] + [P]
Command: Developer: Set Log Level
Set value: Info
```

**STEP**: 2 — Open Terminal and switch to Output channel

**DESCRIPTION**: Open the Terminal view and switch to the Output tab. From the Output dropdown, select the SAP Fiori tools - AI channel to view generation logs in real time.

**LANGUAGE**: VS Code / Instructions

**CODE**:
```text
Menu: View > Terminal
Tab: Output
Output channel dropdown: select "SAP Fiori tools - AI"
```

**STEP**: 3 — What to include when filing a ticket

**DESCRIPTION**: If generation fails, include the SAP Fiori tools - AI logs when opening a ticket. If the generated app has issues, create and attach a .zip archive of the generated project. The generated app’s logs are located in the project's .fiori-ai folder — include those files in your archive.

**LANGUAGE**: Instructions / File paths

**CODE**:
```text
If generation fails:
  - Attach SAP Fiori tools - AI logs from the Output channel.

If the generated app has issues:
  - Create a .zip of the generated project.
  - Include files from the project's .fiori-ai folder in the .zip.
```
--------------------------------

**TITLE**: Working with an Adaptation Project (SAP Fiori Tools)

**INTRODUCTION**: This guide gives concise, action-oriented steps for opening, preparing, editing, and running a Fiori adaptation project so code-generation agents can automate common tasks (setup, launch, edit, test). Use the commands and file examples below as executable building blocks in automation scripts or generation templates.

**TAGS**: fiori-tools, sap, ui5, adaptation, dev-setup, manifest

**STEP**: 1 — Verify prerequisites

**DESCRIPTION**: Ensure the environment has Node.js, npm, and an editor/IDE (e.g., VS Code). These checks are the first automated steps before performing any project operations.

**LANGUAGE**: Shell

**CODE**:
```bash
# Check Node.js and npm versions
node -v
npm -v

# (Optional) Check VS Code CLI availability if using VS Code for automation
code --version
```

**STEP**: 2 — Open the adaptation project in your workspace

**DESCRIPTION**: Open the local adaptation project directory in your editor/IDE so subsequent automation tasks can read and modify files. Use an absolute or repository-relative path when scripting.

**LANGUAGE**: Shell

**CODE**:
```bash
# Open project in VS Code (replace with your path)
code /path/to/adaptation-project
```

**STEP**: 3 — Install project dependencies

**DESCRIPTION**: Install npm dependencies declared by the adaptation project. Run this in the project root so the environment is prepared for local development, building, or running preview servers.

**LANGUAGE**: Shell

**CODE**:
```bash
cd /path/to/adaptation-project
npm install
```

**STEP**: 4 — Start the local dev/preview server

**DESCRIPTION**: Launch the project’s local server or preview command. This commonly runs UI5 or Fiori tooling preview/watch tasks. Use the project’s package.json scripts; fall back to a standard "start" script in automation.

**LANGUAGE**: Shell

**CODE**:
```bash
# Common start command (use the project's defined script)
npm run start

# If the project defines a specific preview script:
npm run preview
```

**STEP**: 5 — Locate and edit key UI5/Fiori files for adaptation

**DESCRIPTION**: Typical adaptation edits are made in webapp/ (source), manifest.json (component and routing configuration), and UI controller/view files. Automation tools should target these canonical paths when generating or patching code.

**LANGUAGE**: Plain Text

**CODE**:
```text
Common file locations to read or update (relative to project root):
- webapp/manifest.json
- webapp/index.html
- webapp/Component.js
- webapp/controller/*.controller.js
- webapp/view/*.view.xml
```

**STEP**: 6 — Minimal manifest.json example for automation templates

**DESCRIPTION**: Use this minimal manifest skeleton when generating or validating a manifest.json during code generation. Include required sap.app and sap.ui5 sections and expand as needed.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "sap.app": {
    "id": "my.adaptation.app",
    "type": "application",
    "i18n": "i18n/i18n.properties"
  },
  "sap.ui5": {
    "dependencies": {
      "minUI5Version": "1.60.0",
      "libs": {
        "sap.m": {}
      }
    },
    "models": {},
    "rootView": {
      "viewName": "my.adaptation.app.view.App",
      "type": "XML",
      "async": true
    }
  }
}
```

**STEP**: 7 — Persist and validate changes

**DESCRIPTION**: After edits, commit changes, and run validation or lint tasks. Use npm scripts or CLI tools to validate project integrity before building or deploying.

**LANGUAGE**: Shell

**CODE**:
```bash
# Run linter/validator if available
npm run lint

# Run tests if defined
npm test

# Commit changes (example)
git add .
git commit -m "Adaptation edits: <brief description>"
```
--------------------------------
