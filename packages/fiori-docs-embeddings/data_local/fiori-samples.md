
--------------------------------

**TITLE**: Samples for SAP Fiori tools

**INTRODUCTION**: This repository contains sample SAP Fiori elements projects built with SAP Fiori tools. Use these samples to learn, follow tutorials, or run local mock data and OData services. Steps below show how to download, install, run, and access the mock OData service for any sample app folder (e.g., V2/apps/myfioriapp).

**TAGS**: fiori-samples, sap-fiori, sap-fiori-tools, sapui5, odata, mock-server, tutorials, samples

**STEP**: 1 — Retrieve repository

**DESCRIPTION**: Clone the repository to your local file system or download it as a ZIP from GitHub. The canonical repo URL is provided below.

**LANGUAGE**: Shell

**CODE**:
```shell
# Clone repository (preferred)
git clone https://github.com/SAP-samples/fiori-tools-samples.git

# OR download as ZIP via browser from:
# https://github.com/SAP-samples/fiori-tools-samples
```

**STEP**: 2 — Choose a sample app directory

**DESCRIPTION**: Change into the sample app you want to run. Tutorials and blog posts reference specific sample folders (e.g., V2/apps/myfioriapp). The folder containing runtime screenshots is V2/apps/images/products-review-run.png.

**LANGUAGE**: Shell

**CODE**:
```shell
# Example: navigate to a specific sample app before installing dependencies
cd fiori-tools-samples/V2/apps/myfioriapp

# Screenshot path demonstrating "URL" and "Service Path"
# V2/apps/images/products-review-run.png
```

**STEP**: 3 — Install dependencies

**DESCRIPTION**: Install Node.js dependencies for the selected sample. Refer to the SAP Fiori tools documentation for Node.js and tool version requirements before running (link provided).

**LANGUAGE**: Shell

**CODE**:
```shell
# Install dependencies in the sample app folder
npm install

# SAP Fiori tools documentation / requirements:
# https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html
```

**STEP**: 4 — Start the sample app locally

**DESCRIPTION**: Start the local host for the sample app. The dev server prints a "URL" to open the UI and a "Service Path" to the mock OData service. Use the "URL" to view the app; to access the OData service combine the "URL" and the "Service Path". The run screenshot shows where these values appear.

**LANGUAGE**: Shell / Plain text

**CODE**:
```shell
# Start the app (runs the local dev server)
npm start
```

Example terminal output (illustrative):
```text
URL: http://localhost:8083
Service Path: /sap/opu/odata/sap/SEPMRA_PROD_MAN
```

Combine the two values to call the mock OData service:
```text
http://localhost:8083/sap/opu/odata/sap/SEPMRA_PROD_MAN
```

**STEP**: 5 — View app with mock data

**DESCRIPTION**: Use the printed URL in a browser to view the Fiori elements UI with mock data. To query the mock OData endpoints, use the combined URL (URL + Service Path) as shown above.

**LANGUAGE**: Plain text

**CODE**:
```text
# Example:
# Open in browser:
http://localhost:8083

# OData mock service endpoint:
http://localhost:8083/sap/opu/odata/sap/SEPMRA_PROD_MAN
```

**STEP**: 6 — Known issues

**DESCRIPTION**: There are no known issues with the sample resources in this repository. If you encounter problems, follow the support options below.

**LANGUAGE**: Plain text

**CODE**:
```text
# No known issues for repository samples.
```

**STEP**: 7 — How to obtain support

**DESCRIPTION**: Two support channels:
- Use SAP Community when asking general questions related to SAP Fiori tools (select tag "SAP Fiori tools").
- If the sample fails specifically in SAP Developer tutorials, report via the Tutorials GitHub issues link.

**LANGUAGE**: Plain text

**CODE**:
```text
# Option 1: SAP Community (general questions about Fiori tools)
https://answers.sap.com/questions/ask.html
# Tag your question with: "SAP Fiori tools"

# Option 2: Report tutorial/sample-specific issues (only for tutorial integration issues)
https://github.com/SAPDocuments/Tutorials/issues/new
```

**STEP**: 8 — License

**DESCRIPTION**: The project is licensed under Apache License 2.0. License file path is included in the repository.

**LANGUAGE**: Plain text

**CODE**:
```text
# License:
# Copyright (c) 2009-2020 SAP SE or an SAP affiliate company.
# Licensed under the Apache Software License, version 2.0
# See file: /LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: SAP Fiori elements application - Products Review (List Report / Object Page V2)

**INTRODUCTION**: Quick, actionable guide to clone, install, run and view the "Products Review" SAP Fiori elements sample. Includes how to start the local mock OData server and how to derive the OData service URL from console output.

**TAGS**: fiori-samples, fiori, sap-fiori, mock-server, odata, list-report, object-page, npm

**STEP**: 1 — Create workspace and clone repository

**DESCRIPTION**: Create a local folder for the sample and clone the repository. Replace <repository-url> with the actual GitHub repository URL you want to clone.

**LANGUAGE**: Shell

**CODE**:
```shell
# create a folder (optional)
mkdir ~/projects
cd ~/projects

# clone the repository (replace with actual repo URL)
git clone <repository-url>

# navigate into the sample path used by this documentation
cd fiori-tools-samples/V2/products-review
```

**STEP**: 2 — Install dependencies

**DESCRIPTION**: Install Node.js dependencies defined in package.json. Run this inside fiori-tools-samples/V2/products-review.

**LANGUAGE**: Shell

**CODE**:
```shell
# from fiori-tools-samples/V2/products-review
npm install
```

**STEP**: 3 — Start the application and/or mock server

**DESCRIPTION**: Start the project. This will run the local mock server that exposes the OData service and launches the app (or provide a local index.html). Watch the terminal console for "Service Path" and "URL" values.

**LANGUAGE**: Shell

**CODE**:
```shell
npm start
```

**STEP**: 4 — Construct the OData service URL (when using mock server)

**DESCRIPTION**: In the terminal output you will see two pieces of information: URL and Service Path. Combine them to form the OData service URL used by SAP Fiori tools or the application: ODataServiceURL = URL + ServicePath. Example format: http://localhost:XXXX + /mockservice/path

**LANGUAGE**: None

**CODE**:
```text
# Example terminal output (illustrative)
# URL: http://localhost:3000
# Service Path: /sap/opu/odata/sap/Z_PRODUCTS_SRV
# Combined OData service URL:
# http://localhost:3000/sap/opu/odata/sap/Z_PRODUCTS_SRV
```

**STEP**: 5 — View the application in a browser

**DESCRIPTION**: Open the application using the URL shown in the console. Navigate to the project's index.html and then open the sample screen "Manage Products" to see the List Report / Object Page.

**LANGUAGE**: None

**CODE**:
```text
# Steps:
# 1. Copy the 'URL' value from the terminal (e.g., http://localhost:3000)
# 2. Paste it into your browser address bar and press Enter
# 3. Click on index.html (served by the dev server)
# 4. Click on "Manage Products" in the app to open the Fiori sample
```

**STEP**: 6 — Notes for using this project with SAP Fiori tools Application Generator

**DESCRIPTION**: Use the OData service URL (constructed in STEP 4) as the data source when creating an LROP V2 application with the SAP Fiori tools Application Generator. The mock server provides a local OData endpoint compatible with the generator.

**LANGUAGE**: None

**CODE**:
```text
# Use this OData service URL in Fiori tools Application Generator:
# http://localhost:3000/sap/opu/odata/sap/Z_PRODUCTS_SRV  (example)
```
--------------------------------

**TITLE**: Application Details — Sales Order (salesorder)

**INTRODUCTION**: Metadata and run instructions for the generated SAP Fiori Elements application "Sales Order" (module: salesorder). Use this for automated code generation, CI scripts, or local development tasks such as starting the app or running it with mock data.

**TAGS**: fiori, sap, ui5, odata, fiori-elements, list-report, object-page, nodejs, eslint, mock-data, sap_fiori_3

STEP: 1 — Generated application metadata (machine-friendly)
DESCRIPTION: Core metadata collected at generation time. Keep this JSON snippet for tooling, validation, or automated scaffolding.
LANGUAGE: JSON
CODE:
```json
{
  "generationDateTime": "Wed Aug 10 2022 13:46:39 GMT+0200 (Central European Summer Time)",
  "appGenerator": "@sap/generator-fiori-elements",
  "appGeneratorVersion": "1.6.7",
  "generationPlatform": "Visual Studio Code",
  "floorplanUsed": "List Report Object Page V4",
  "serviceType": "OData Url",
  "serviceUrl": "https://sapes5.sapdevcenter.com/sap/opu/odata4/sap/ze2e001/default/sap/ze2e001_salesorder/0001/",
  "moduleName": "salesorder",
  "applicationTitle": "Sales Order",
  "namespace": "",
  "ui5Theme": "sap_fiori_3",
  "ui5Version": "1.84.14",
  "enableCodeAssistLibraries": true,
  "eslintConfig": "https://www.npmjs.com/package/eslint-plugin-fiori-custom",
  "mainEntity": "SalesOrder"
}
```

STEP: 2 — Start the generated app (development)
DESCRIPTION: Run the app from the generated app root folder. This launches the UI5 development server and serves the Fiori Elements app.
LANGUAGE: bash
CODE:
```bash
npm start
```

STEP: 3 — Start the generated app with mock data
DESCRIPTION: Run the app using mock data that mirrors the OData service supplied at generation time. Use this for offline development and UI testing without a live backend.
LANGUAGE: bash
CODE:
```bash
npm run start-mock
```

STEP: 4 — Pre-requisites (verify environment)
DESCRIPTION: Ensure a supported Node.js LTS and matching npm are installed. Use the commands below to verify installed versions before running the app.
LANGUAGE: bash
CODE:
```bash
# Verify Node.js and npm versions (Node.js LTS recommended)
node -v
npm -v
```

STEP: 5 — ESLint configuration reference
DESCRIPTION: The project includes ESLint configuration. Use the referenced plugin for Fiori-specific linting rules. Include or reference this package when setting up CI or local dev linting.
LANGUAGE: text
CODE:
```
ESLint plugin for Fiori custom rules:
https://www.npmjs.com/package/eslint-plugin-fiori-custom
```

STEP: 6 — Notes for automation/CI
DESCRIPTION: Use the metadata JSON (STEP 1) in automation scripts to:
- Validate serviceUrl values before running integration tests.
- Confirm UI5 version (1.84.14) and theme (sap_fiori_3) for compatibility checks.
- Use mainEntity ("SalesOrder") and floorplan ("List Report Object Page V4") to generate test scenarios or mock payloads. 
LANGUAGE: JSON
CODE:
```json
{
  "ciHints": {
    "validateServiceUrl": true,
    "ui5Version": "1.84.14",
    "theme": "sap_fiori_3",
    "mainEntity": "SalesOrder",
    "floorplan": "List Report Object Page V4"
  }
}
```
--------------------------------

**TITLE**: Fiori Elements Incidents Management — Sample App (OData V4 List Report)

**INTRODUCTION**: This repository contains a SAP Fiori sample app to manage incidents. The app is implemented as a Fiori elements List Report using OData V4. Use this guide to clone, install, and preview the app locally in SAP Business Application Studio or Visual Studio Code with the SAP Fiori tools extension.

**TAGS**: fiori, sap, odata-v4, sap-fiori-tools, samples, list-report, incidents-management, business-application-studio, vscode, npm

STEP: Overview and learning resources

DESCRIPTION: The app demonstrates a Fiori elements List Report pattern for OData V4. Reference tutorial and setup docs to learn how it was built and how to run it.

- Tutorial: https://developers.sap.com/group.fiori-tools-odata-v4-incident.html
- SAP Fiori tools documentation: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html

LANGUAGE: Markdown

CODE:
```markdown
Tutorial: https://developers.sap.com/group.fiori-tools-odata-v4-incident.html
SAP Fiori tools docs: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html
```

STEP: Requirements

DESCRIPTION: Preview and run this sample using either:
- SAP Business Application Studio (BAS)
- Visual Studio Code with the SAP Fiori tools extension

Ensure Node.js and npm are installed. Use the SAP Fiori tools extension in VS Code or the SAP Fiori perspective in BAS to preview the application.

LANGUAGE: Plain Text

CODE:
```text
Supported environments:
- SAP Business Application Studio
- Visual Studio Code + SAP Fiori tools extension
Prerequisites:
- Node.js (LTS recommended)
- npm
```

STEP: Clone repository and open workspace

DESCRIPTION: Clone the repository to your local machine (or create the project workspace in BAS). Open the project root folder named fiori-elements-incidents-management as the workspace root before installing dependencies.

LANGUAGE: Shell

CODE:
```bash
# Example: clone the repository (replace <repository-url> with the actual URL)
git clone <repository-url>

# Open the project folder as the workspace root:
cd fiori-elements-incidents-management
```

STEP: Install dependencies

DESCRIPTION: Install npm dependencies from the project root. Run this in a terminal opened at the workspace root folder fiori-elements-incidents-management.

LANGUAGE: Shell

CODE:
```bash
npm install
```

STEP: Preview the application using SAP Fiori tools

DESCRIPTION: Use the SAP Fiori Tools preview feature to run the app locally.

- In Visual Studio Code: Open the SAP Fiori extension view (left activity bar), locate the project, right-click the project entry and select "Preview Application".
- In SAP Business Application Studio: Use the SAP Fiori tools or the preview/run options provided by BAS to start the app preview.

LANGUAGE: Plain Text

CODE:
```text
In VS Code:
1. Click on "SAP Fiori" in the left activity bar.
2. Right-click the project 'fiori-elements-incidents-management' and select "Preview Application".

In BAS:
Use the SAP Fiori tools preview/run action for the opened project workspace.
```

STEP: Notes and troubleshooting

DESCRIPTION: If preview fails, verify:
- You opened the folder fiori-elements-incidents-management as the workspace root
- npm install completed without errors
- SAP Fiori tools extension is installed and enabled
- Node.js version is compatible (use LTS)

LANGUAGE: Plain Text

CODE:
```text
Troubleshooting checklist:
- Confirm workspace root: fiori-elements-incidents-management
- Re-run: npm install
- Ensure SAP Fiori Tools extension is installed (VS Code) or SAP Fiori perspective is used (BAS)
- Check Node.js and npm versions
```
--------------------------------

**TITLE**: Incidents Management — Generated Fiori Elements App Details

**INTRODUCTION**: Metadata and run instructions for the generated SAP Fiori Elements List Report (V4) application "Incidents Management". Use this to inspect generation settings, start the app locally, or run it with mock data.

**TAGS**: fiori-samples, sap, fiori-elements, cap, ui5, list-report, mock, generator-fiori-elements

STEP: 1 — App generation metadata

DESCRIPTION: Full generation metadata extracted from the application report. Use these values when configuring local runtime, service connections, or regenerating the app.

LANGUAGE: JSON

CODE:
```json
{
  "Generation Date and Time": "Fri Dec 09 2024 13:43:41 GMT+0000 (Coordinated Universal Time)",
  "App Generator": "@sap/generator-fiori-elements",
  "App Generator Version": "1.8.3",
  "Generation Platform": "SAP Business Application Studio",
  "Template Used": "List Report Page V4",
  "Service Type": "Local Cap",
  "Service URL": "http://localhost:4004/incident/",
  "Module Name": "incidents",
  "Application Title": "Incidents Management",
  "Namespace": "sap.fe.demo",
  "UI5 Theme": "sap_horizon",
  "UI5 Version": "1.108.0",
  "Enable Code Assist Libraries": false,
  "Enable TypeScript": false,
  "Add Eslint configuration": false,
  "Main Entity": "Incidents",
  "Navigation Entity": "None",
  "App Start URL": "http://localhost:4004/incidents/webapp/index.html"
}
```

STEP: 2 — Start the generated app locally

DESCRIPTION: Start your CAP project (backend OData service) and open the generated Fiori Elements UI in your browser at the app start URL below. Ensure the CAP service is running on the same host/port as the Service URL.

LANGUAGE: text

CODE:
```
http://localhost:4004/incidents/webapp/index.html
```

STEP: 3 — Run the app with mock data

DESCRIPTION: To run the application using mock data (reflecting the OData Service URL provided during generation), execute this command from the generated app root folder.

LANGUAGE: Shell

CODE:
```bash
npm run start-mock
```

STEP: 4 — Pre-requisites / verify environment

DESCRIPTION: The app requires an active Node.js LTS runtime and a supported npm version. Verify Node.js and npm are installed and accessible before starting the CAP project or running the mock server.

LANGUAGE: Shell

CODE:
```bash
node -v
npm -v
```
--------------------------------

**TITLE**: SAP Fiori Elements List Report Sample — Product Manager (OData V2)

**INTRODUCTION**: Sample SAP Fiori elements app (list report) to manage products using OData V2. Use this repository to preview and develop the app with SAP Fiori tools in SAP Business Application Studio or Visual Studio Code. Requires an SAP Gateway Demo system (ES5) for live data.

**TAGS**: fiori-samples, sap-fiori, odata-v2, sap-fiori-tools, sap-business-application-studio, visual-studio-code, sample-app

**STEP**: Prerequisites and resources

**DESCRIPTION**: Confirm required tools and backend access before starting. Required: SAP Fiori tools in BAS or VS Code, and access to SAP Gateway Demo system (ES5). Reference tutorials and documentation for setup.

**LANGUAGE**: text

**CODE**:
```text
Tutorial to build app (overview): 
https://help.sap.com/docs/link-disclaimer?site=https%3A%2F%2Fdevelopers.sap.com%2Fgroup.fiori-tools-lrop.html

Fiori tools getting started:
https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html

Signup for ES5 (SAP Gateway Demo system) if needed:
https://developers.sap.com/tutorials/gateway-demo-signup.html
```

**STEP**: Open project and install dependencies

**DESCRIPTION**: Open a terminal in the application folder (example folder name is myfioriapp). Install Node dependencies required by the project.

**LANGUAGE**: Bash

**CODE**:
```bash
# Open a terminal in the project/app folder (e.g., right-click the app folder and open terminal)
cd myfioriapp

# Install dependencies
npm install
```

**STEP**: Prepare SAP Fiori tools environment

**DESCRIPTION**: In Visual Studio Code or SAP Business Application Studio, switch to the SAP Fiori activity, open Application Modeler, and view Application Info and Application Status. Use these UI screens to validate manifest, data source, and app settings required for preview.

**LANGUAGE**: text

**CODE**:
```text
1. In the left activity bar, switch to "SAP Fiori".
2. In Application Modeler view, right-click the app name to open "Application Info".
3. On the "Application Info" page, inspect and perform actions under "Application Status".
```

**STEP**: Preview the application (live backend or mock data)

**DESCRIPTION**: Use the Application Modeler UI to preview the app. Choose "start" to preview with live data from the backend (requires ES5 access), or choose "start-mock" to preview using mock data provided in the project.

**LANGUAGE**: text

**CODE**:
```text
1. In Application Modeler view, right-click the app name.
2. Select "Preview Application".
3. Choose one of the options:
   - start       -> preview with live backend data (requires ES5)
   - start-mock  -> preview with mock data
```
--------------------------------

**TITLE**: SAPUI5 Sample App — Product Management (Freestyle)

**INTRODUCTION**: Quick reference for setting up, installing dependencies, and previewing the SAPUI5 Product Management sample app (freestyle). Use this when generating automation or CLI scripts to prepare the app for local preview using SAP Fiori tools in SAP Business Application or VS Code.

**TAGS**: fiori-samples, sapui5, ui5, sap-fiori, sample-app, preview, installation

**STEP**: 1 — Prepare project folder and install dependencies

**DESCRIPTION**: From the cloned repository, open a terminal in the application folder (example folder name: myfioriapp). Install Node dependencies with npm. This prepares the project for preview and local tooling.

**LANGUAGE**: Shell

**CODE**:
```bash
# open terminal in the app folder (example folder name: myfioriapp)
cd myfioriapp

# install dependencies
npm install
```

**STEP**: 2 — Verify environment and prerequisites

**DESCRIPTION**: Ensure SAP Fiori tools are available in your environment (SAP Business Application or Visual Studio Code). Follow the SAP Fiori tools setup documentation if tools are not installed. This step is required before using the Application Modeler and preview features.

**LANGUAGE**: Markdown

**CODE**:
```markdown
Prerequisite documentation:
- SAP Fiori tools setup: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html
Tutorial to learn app development: https://developers.sap.com/group.cp-frontend-ui5-1.html
```

**STEP**: 3 — Use SAP Fiori tools: open Application Modeler and check Application Info

**DESCRIPTION**: In SAP Business Application or VS Code with SAP Fiori tools, open the "SAP Fiori" view, then use Application Modeler to inspect the app. Right-click the app name to open Application Info and review Application Status. Perform any required actions (e.g., bind services, configure destinations) shown in Application Status before preview.

**LANGUAGE**: Shell

**CODE**:
```bash
# GUI actions (execute in SAP Business Application or VS Code with SAP Fiori tools):
# 1. Open the "SAP Fiori" view (left activity bar).
# 2. In "Application Modeler" view, right-click the app name -> Application Info.
# 3. Review and perform actions under "Application Status".
# (No CLI commands for these GUI steps.)
```

**STEP**: 4 — Preview the application

**DESCRIPTION**: Start a local preview of the application from the Application Modeler. Right-click the app name in Application Modeler, choose "Preview Application", and select the "start" option. Use the preview to validate UI and OData/service connectivity.

**LANGUAGE**: Shell

**CODE**:
```bash
# GUI actions to preview:
# 1. In "Application Modeler", right-click the app name -> "Preview Application".
# 2. Choose the "start" option to launch the preview.
# 3. Inspect the running app in the preview browser window that opens.
```

**STEP**: 5 — Reference learning resources

**DESCRIPTION**: Use the official tutorial and documentation to understand the app structure and build process. These links are the canonical resources for implementing or extending the sample.

**LANGUAGE**: Markdown

**CODE**:
```markdown
Tutorial (how to build this app):
https://developers.sap.com/group.cp-frontend-ui5-1.html

SAP Fiori tools documentation (setup & usage):
https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html
```
--------------------------------

**TITLE**: Get Started with SAP Cloud Application Programming Model (CAP) using Fiori tools

**INTRODUCTION**: This repository contains sample CAP projects demonstrating different approuter configurations and deployment steps for Cloud Foundry. Use these samples to generate CAP services and Fiori frontends, test router configurations (managed/standalone/hybrid), create BTP destinations, and deploy to SAP BTP / Cloud Foundry. Follow the included sample README files and the referenced blog post for step-by-step generation and deployment guidance.

**TAGS**: cap, sap, fiori, cloud-foundry, approuter, hana, xsuaa, destination, cds, mta, ci-cd

**STEP**: Repository sample overview
**DESCRIPTION**: The repository provides four CAP sample projects. Use the README files in each folder for project-specific instructions, configuration, and deployment details.
**LANGUAGE**: text
**CODE**:
```text
Sample projects (relative paths in this repository):

1. Managed Approuter with SAP HANA Cloud service
   Path: cap/cap-fiori-mta/README.md

2. Standalone Approuter with an in-memory database
   Path: cap/cap-fiori-mta-standalone/README.md

3. Managed Approuter with CDS Hybrid Profile (HANA + XSUAA on SAP BTP)
   Path: cap/cap-fiori-hybrid/README.md

4. Create a SAP BTP Destination exposing CAP services (supports cross subaccount & regions)
   Path: cap/destination/README.md
```

**STEP**: Open a sample README and inspect project files
**DESCRIPTION**: Navigate to a sample folder and open its README for step-by-step instructions, configuration snippets, and deployment commands specific to that sample. Use local file inspection or display the file contents in your environment to extract actionable steps for automation.
**LANGUAGE**: bash
**CODE**:
```bash
# Example commands (run from repository root)
ls -la cap/cap-fiori-mta
cat cap/cap-fiori-mta/README.md

ls -la cap/cap-fiori-mta-standalone
cat cap/cap-fiori-mta-standalone/README.md

ls -la cap/cap-fiori-hybrid
cat cap/cap-fiori-hybrid/README.md

ls -la cap/destination
cat cap/destination/README.md
```

**STEP**: Follow the official CAP generation guide (blog post)
**DESCRIPTION**: The sample projects were generated following the blog post linked below. Use it to reproduce CAP project scaffolding and to select the HTML5 application runtime approuter configuration when generating the Fiori frontend.
**LANGUAGE**: text
**CODE**:
```text
Blog post used to generate samples:
https://blogs.sap.com/2022/02/10/build-and-deploy-a-cap-project-node.js-api-with-a-sap-fiori-elements-ui-and-a-managed-approuter-configuration/

Action:
- Follow the blog steps to scaffold the CAP service and Fiori UI.
- When prompted, select the appropriate router configuration (Managed Approuter, Standalone Approuter, or Hybrid).
```

**STEP**: Common CAP CLI and local dev commands (examples)
**DESCRIPTION**: Use the CAP CLI for local development, service generation, and testing. These are common commands used in CAP development — adapt per sample README and project structure.
**LANGUAGE**: bash
**CODE**:
```bash
# Initialize a CAP project (example)
cds init <project-name>

# Add a service and model files
cds add srv

# Install dependencies and run the service locally
npm install
npm start        # or cds watch

# Build and run Fiori frontend locally (if present)
cds build --production
# then serve static files with a webserver or use the approuter locally
```

**STEP**: Deploy samples to Cloud Foundry (high-level sequence)
**DESCRIPTION**: Each sample README contains exact Cloud Foundry deployment instructions. Typical sequence: authenticate to CF, target org/space, create required BTP services (HANA, XSUAA, destination), bind services, and push app(s). Use the sample manifest(s) in each project or MTA for multi-module deployments.
**LANGUAGE**: bash
**CODE**:
```bash
# Example deployment workflow (adapt using README/manifest files in each sample)
cf login --sso                        # or cf login -a <api> -u <user>
cf target -o <ORG> -s <SPACE>
# Create or ensure BTP services (HANA, XSUAA, destination) exist per sample README
# Deploy using manifest or MTA
cf push                               # for single apps
# Or for MTA builds:
mbt build -p=cf
cf deploy <generated-mtar-file>
```

**STEP**: Destination sample (cross subaccount & regions)
**DESCRIPTION**: The destination sample shows how to expose CAP services through a SAP BTP Destination and includes cross-subaccount/region support. Inspect the destination README for configuration artifacts and example JSON/manifest snippets.
**LANGUAGE**: text
**CODE**:
```text
Destination sample:
Path: cap/destination/README.md
Check this file for:
- Destination service instance creation
- Destination configuration JSON examples
- Cross-subaccount and region configuration notes
```

**STEP**: CI/CD integration resource
**DESCRIPTION**: For guidance on integrating CI/CD into CAP deployment, review the referenced YouTube tutorial. Use it to create pipelines that build, test, and deploy your CAP projects.
**LANGUAGE**: text
**CODE**:
```text
Continuous Integration and Delivery tutorial:
https://www.youtube.com/watch?v=gvWSHSZFPok
```

**STEP**: Support and official CAP docs
**DESCRIPTION**: Use the official CAP documentation site for APIs, library references, and deeper framework guidance.
**LANGUAGE**: text
**CODE**:
```text
CAP documentation and community:
https://cap.cloud.sap/docs/
```

**STEP**: License
**DESCRIPTION**: License for this repository and link to license file.
**LANGUAGE**: text
**CODE**:
```text
License: Apache Software License, version 2.0 (except as noted)
License file: /LICENSES/Apache-2.0.txt
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
```
--------------------------------

**TITLE**: Get Started with SAP Cloud Application Programming Model (CAP) using Fiori tools and Managed Approuter with Hybrid Profile

**INTRODUCTION**: Build, run, and test a CAP project with a Fiori Elements UI on Cloud Foundry (CF) using a managed approuter and the SAP CAP hybrid profile. This guide shows the commands and steps to: clone the sample, deploy services (HANA HDI and XSUAA), bind services for hybrid testing, run the app locally while routing requests to deployed BTP services (production-near), and use the local approuter to obtain XSUAA tokens for authenticated requests.

**TAGS**: sap-cap, fiori, cloud-foundry, btp, hybrid-profile, hana, xsuaa, localrouter, approuter, fiori-elements

**STEP**: 1 — Prerequisites

**DESCRIPTION**: Verify required accounts, services, and tooling before starting. Ensure you have access to SAP BTP trial, Launchpad Service subscription, a running SAP HANA Cloud instance, and a development workspace configured for Full Stack Cloud Application.

**LANGUAGE**: Plaintext

**CODE**:
```
Prerequisites:
- SAP Cloud Platform trial account
- Launchpad Service subscription
- SAP HANA Cloud Service instance (running)
- Dev workspace: Full Stack Cloud Application
- Optional: VS Code with SAP Fiori tools & Cloud Foundry (CF) extensions
References:
- CAP hybrid profile docs: https://cap.cloud.sap/docs/advanced/hybrid-testing
- Blog used to generate project: https://blogs.sap.com/2022/02/10/build-and-deploy-a-cap-project-node.js-api-with-a-sap-fiori-elements-ui-and-a-managed-approuter-configuration/
```

**STEP**: 2 — Clone repository and open project

**DESCRIPTION**: Clone the sample repository and change into the CAP hybrid project directory. Run commands from the project root where package scripts are defined.

**LANGUAGE**: Shell

**CODE**:
```bash
git clone https://github.com/SAP-samples/fiori-tools-samples.git
cd fiori-tools-samples/cap/cap-fiori-hybrid
```

**STEP**: 3 — Login to Cloud Foundry

**DESCRIPTION**: Authenticate with your Cloud Foundry org/space. Use the VS Code Command Palette for integrated login or the CF CLI if preferred.

**LANGUAGE**: Shell

**CODE**:
```bash
# From VS Code:
# View -> Command Palette -> "CF: Login to Cloud Foundry"

# Or use the CF CLI:
cf login
```

**STEP**: 4 — Install dependencies, build and deploy apps

**DESCRIPTION**: Install required npm dependencies for the CAP and Fiori UI apps, build both apps, then deploy them to Cloud Foundry. Run these commands from the project root.

**LANGUAGE**: Shell

**CODE**:
```bash
# install application dependencies
npm run install:app

# build CAP and Fiori UI applications
npm run build

# deploy CAP and Fiori UI to Cloud Foundry
npm run deploy
```

**STEP**: 5 — Update XSUAA (xs-security) and assign roles

**DESCRIPTION**: Update the deployed XSUAA security service so roles defined in xs-security.json are created/updated on BTP. Ensure your user has the required role (e.g., capuser) assigned in the BTP cockpit under Security -> Role Collections or via the IAM UI.

**LANGUAGE**: Shell

**CODE**:
```bash
# update the XSUAA security service on CF
npm run cf:uaa:update

# File to check and edit (project root)
# xs-security.json
```

**STEP**: 6 — Populate HANA with sample data

**DESCRIPTION**: Edit CSV files in the data folder if needed, then push sample data to the deployed HANA HDI instance.

**LANGUAGE**: Shell

**CODE**:
```bash
# edit CSV files in the data folder as needed, then deploy data to HANA
npm run deploy:hana
```

**STEP**: 7 — Bind deployed services to local CDS runtime for hybrid mode

**DESCRIPTION**: Create local CDS bindings so your local CAP runtime uses the deployed XSUAA and HANA services. These commands write binding entries to your local CDS registry (~/.cds-services.json) and prepare the runtime to route requests to the deployed services.

**LANGUAGE**: Shell

**CODE**:
```bash
# bind to the XSUAA service (name from deployment: managedAppCAPProject-xsuaa-service)
cds bind -2 managedAppCAPProject-xsuaa-service --kind xsuaa

# bind to the HANA HDI service (name from deployment: managedAppCAPProject-db)
cds bind -2 managedAppCAPProject-db
```

**STEP**: 8 — Run CAP in hybrid watch mode (do not open UI tab yet)

**DESCRIPTION**: Start the CAP application locally in hybrid mode. The local runtime will use the bindings created above to connect to the deployed HANA/UAA. Do NOT click any automatic "Open in a New Tab" prompts because that may skip authentication through XSUAA.

**LANGUAGE**: Shell

**CODE**:
```bash
# start local CAP runtime in hybrid mode (uses service bindings)
npm run watch:hybrid
```

**STEP**: 9 — Verify hybrid startup console output

**DESCRIPTION**: Confirm the CAP runtime connects to the HANA service by checking the console output. Expect to see the bindings registry and a HANA connect log.

**LANGUAGE**: Plaintext

**CODE**:
```
[cds] - connect using bindings from: { registry: '~/.cds-services.json' }
[cds] - connect to db > hana {
```

**STEP**: 10 — Install and run the local approuter (localrouter)

**DESCRIPTION**: The localrouter fetches a valid token from the deployed XSUAA instance and attaches it to subsequent requests, simulating a production-near environment. Install the local approuter and start it via CDS so the router uses the existing bindings.

**LANGUAGE**: Shell

**CODE**:
```bash
# install the local approuter package
npm run install:localrouter

# start the local approuter using cds bind execution so it inherits service bindings
cds bind --exec -- npm start --prefix localrouter
```

**STEP**: 11 — Open app via localrouter (port 5001)

**DESCRIPTION**: Open the localrouter endpoint to access the Fiori UI routed through the local approuter. Use VS Code Ports preview or a browser pointed to the localrouter port. Then select your Fiori UI application from the router landing page.

**LANGUAGE**: Plaintext

**CODE**:
```
# In VS Code:
# View -> Ports: Preview -> select port 5001
# Then open the new browser tab and select the Fiori UI application served at:
http://localhost:5001/
```

**STEP**: 12 — Gotchas: "Forbidden" error when loading UI

**DESCRIPTION**: If the UI shows a Forbidden error, your BTP user likely lacks the assigned role. Assign your email/user to the role defined in xs-security.json (e.g., capuser) in the BTP cockpit. See CAP docs for "Auth in cockpit" guidance.

**LANGUAGE**: Plaintext

**CODE**:
```
Error example shown in browser:
Application could not be started due to technical issues.
Forbidden

Resolution:
- Ensure your user is assigned to the role (e.g., "capuser") defined in xs-security.json.
- Steps: BTP Cockpit -> Security -> Role Collections / Users -> assign role to your user.
- CAP docs: https://cap.cloud.sap/docs/node.js/authentication#auth-in-cockpit
```

**STEP**: 13 — Useful references, support, and license

**DESCRIPTION**: Links for further reading, reviewing local repository changes for hybrid testing, and how to get help. License location in the repository.

**LANGUAGE**: Plaintext

**CODE**:
```
Review local changes supporting CDS hybrid testing: changes.md

Get support:
- SAP Community: https://answers.sap.com/tags/9f13aee1-834c-4105-8e43-ee442775e5ce

License:
- This project is licensed under Apache-2.0 (see file):
  ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Enabling CDS Hybrid Mode in a CAP project with a Fiori UI frontend

**INTRODUCTION**: Apply configuration changes to a SAP CAP + Fiori project (Managed Approuter) so the local development environment and Cloud Foundry deployment share the same HDI container, run a local approuter for XSUAA-based auth, update xs-security for multi-environment OAuth, and restrict the Catalog service to a custom role. Use this to enable CDS hybrid mode for local dev and CF runtime parity.

**TAGS**: fiori-samples, CAP, CDS, hybrid-mode, approuter, xsuaa, hdi, mta, cloud-foundry

**STEP**: Step 1 — Update mta.yaml: share HDI and align service-keys
**DESCRIPTION**: Edit the project root mta.yaml to (A) append the properties node to the DB deployer so local and deployed CAP projects share the same HDI instance, (B) update the UAA binding to use a consistent service-key name, and (C) add service-key mapping and hdi-service-name property to the HDI container entry. Apply each snippet into the respective section of mta.yaml (preserve indentation).
**LANGUAGE**: YAML
**CODE**
```yaml
# A: Append the properties node to managedAppCAPProject-db-deployer
- name: managedAppCAPProject-db-deployer
  type: hdb
  path: db
  requires:
    - name: managedAppCAPProject-db
      properties:
        TARGET_CONTAINER: ~{hdi-service-name}
```

```yaml
# B: Update uaa_managedAppCAPProject service-key parameter alignment
- name: managedAppCAPProject-destination-content
  type: com.sap.application.content
  requires:
    - name: managedAppCAPProject-destination-service
      parameters:
        content-target: true
    - name: managedAppCAPProject_html_repo_host
      parameters:
        service-key:
          name: managedAppCAPProject_html_repo_host-key
    - name: uaa_managedAppCAPProject
      parameters:
        service-key:
          name: managedAppCAPProject-xsuaa-service-key
```

```yaml
# C: Update managedAppCAPProject-db to add service-keys and hdi-service-name property
- name: managedAppCAPProject-db
  type: com.sap.xs.hdi-container
  parameters:
    service: hana
    service-keys:
      - name: managedAppCAPProject-db-key
    service-plan: hdi-shared
  properties:
    hdi-service-name: ${service-name}
```

**STEP**: Step 2 — Add and localize Approuter for local XSUAA handling
**DESCRIPTION**: Add a local approuter, move generated files into a controlled local router folder, and configure the approuter environment to forward auth tokens to the local srv API on port 4004 while the approuter listens on port 5001.
- Run the cds command to add an approuter.
- Move the generated files into localrouter to manually control the router configuration.
- Edit the default-env.json to set PORT 5001 and a destination for the local srv-api at http://localhost:4004.
**LANGUAGE**: Bash
**CODE**
```bash
# Add approuter to the project
cds add approuter

# Move generated approuter files into a controlled folder
mkdir -p localrouter
mv app/default-env.json app/package.json app/xs-app.json localrouter/
```

**LANGUAGE**: JSON
**CODE**
```json
// localrouter/default-env.json
{
  "destinations": [
    {
      "name": "srv-api",
      "url": "http://localhost:4004",
      "forwardAuthToken": true
    }
  ],
  "PORT": 5001
}
```

**STEP**: Step 3 — Update xs-security.json for multi-environment OAuth and add scopes/role-templates
**DESCRIPTION**: Edit xs-security.json (project root) to:
- Allow OAuth redirect URIs for Cloud Foundry, Business Application Studio, and localhost.
- Add a custom scope $XSAPPNAME.capuser and role-template capuser that references the scope.
Insert the provided oauth2-configuration, scopes, and role-templates sections into xs-security.json (merge with existing JSON structure).
**LANGUAGE**: JSON
**CODE**
```json
// Add or update oauth2-configuration in xs-security.json
"oauth2-configuration": {
  "redirect-uris": [
      "https://**.hana.ondemand.com/**",
      "https://**.applicationstudio.cloud.sap/**",
      "http://localhost:*/**"
  ]
},
```

```json
// Add scopes and role-templates to xs-security.json
"scopes": [
  {
    "name": "$XSAPPNAME.capuser",
    "description": "CAP Project Generated role scope"
  }
],
"role-templates": [
  {
    "name": "capuser",
    "description": "CAP Project Generated role template",
    "scope-references": ["$XSAPPNAME.capuser"],
    "attribute-references": []
  }
],
```

**STEP**: Step 4 — Apply security annotation to Catalog service (srv/cat-service.cds)
**DESCRIPTION**: Restrict the Catalog service to the new custom role. Open srv/cat-service.cds and replace the existing annotation @requires: 'authenticated-user' with the role reference annotation @(requires: 'capuser'). Save and redeploy the service.
**LANGUAGE**: CDS
**CODE**
```cds
// In srv/cat-service.cds - replace this:
@requires: 'authenticated-user'

// With this:
@(requires: 'capuser')
```
--------------------------------

**TITLE**: Build and Deploy a CAP Project with Fiori Elements UI and Managed Approuter on SAP BTP

**INTRODUCTION**: Step-by-step actions to build, run locally, and deploy a SAP Cloud Application Programming Model (CAP) project with a Fiori Elements UI and a Managed Approuter runtime on SAP Business Technology Platform (BTP). Includes Cloud Foundry (CF) deployment options, verification, and undeploy commands. The project follows the Managed Approuter configuration from the referenced blog post.

**TAGS**: sap, cap, fiori, btp, cloud-foundry, managed-approuter, hana-cloud, nodejs, mta

**STEP**: 1 — Prerequisites (for Cloud Foundry deployment)

**DESCRIPTION**: Ensure your SAP BTP/Cloud Foundry environment and services are available before deploying. Required only if deploying to CF.

- Create or use an SAP Cloud Platform trial account: https://account.hana.ondemand.com/
- Subscribe to the Launchpad Service: https://developers.sap.com/tutorials/cp-portal-cloud-foundry-getting-started.html
- Create an SAP HANA Cloud Service instance or use an existing one: https://developers.sap.com/tutorials/btp-app-hana-cloud-setup.html#08480ec0-ac70-4d47-a759-dc5cb0eb1d58
- (Optional) If using SAP Business Application Studio (SBAS), create a dev workspace using a "Full Stack Cloud Application": https://help.sap.com/viewer/c2b99f19e9264c4d9ae9221b22f6f589/2021_3_QRC/en-US/f728966223894cc28be3ca2ee60ee784.html

**LANGUAGE**: N/A

**CODE**:
```text
No code required for prerequisites (service and account setup).
```

**STEP**: 2 — Install dependencies and bind database

**DESCRIPTION**: Install Node dependencies and bind the project to your SAP HANA Cloud instance before running locally.

- From your project root, install exact dependencies using npm ci.
- Bind and publish your database artifacts to your HANA Cloud Service instance as applicable for your CAP project (follow your DB project instructions).

**LANGUAGE**: Shell

**CODE**:
```shell
npm ci
# Bind/publish to HANA Cloud Service instance (follow your DB project steps)
```

**STEP**: 3 — Run the CAP application locally

**DESCRIPTION**: Build, watch, and run CAP locally. Use cds watch to run the local server and auto-reload on changes. Open the Fiori web app or the Books service endpoint from the generated URL.

**LANGUAGE**: Shell

**CODE**:
```shell
cds watch
# When prompted, select "Open in New Tab" then choose your Fiori web application or the "Books" service endpoint.
```

**STEP**: 4 — Build and deploy to Cloud Foundry — Option 1: Cloud MTA Build Tool (GUI in IDE)

**DESCRIPTION**: If you use the Cloud MTA Build Tool integration in your IDE (e.g., Business Application Studio), build and deploy the MTA archive via the context menu. Use this flow after making changes.

- Right-click mta.yaml -> Build MTA Project
- Right-click mta_archives -> managedAppCAPProject_1.0.0.mtar -> Deploy MTA Archive
- The deploy action will prompt for CF credentials if not logged in.

**LANGUAGE**: N/A

**CODE**:
```text
mta.yaml
mta_archives -> managedAppCAPProject_1.0.0.mtar
# Use IDE context menu: Build MTA Project -> Deploy MTA Archive
```

**STEP**: 5 — Build and deploy to Cloud Foundry — Option 2: CLI (npm scripts)

**DESCRIPTION**: Build and deploy using the provided npm scripts. This will build the project and deploy to Cloud Foundry, prompting for credentials if needed.

**LANGUAGE**: Shell

**CODE**:
```shell
npm run build && npm run deploy
```

**STEP**: 6 — Verify deployment — Option 1: CLI (html5-list)

**DESCRIPTION**: List HTML5 applications and retrieve the generated URL for the deployed Fiori application using the cf html5-list command. Select the URL to open your application.

**LANGUAGE**: Shell

**CODE**:
```shell
cf html5-list -u -di managedAppCAPProject-destination-service -u --runtime launchpad
```

**STEP**: 7 — Verify deployment — Option 2: SAP BTP Cockpit

**DESCRIPTION**: Confirm the deployed Fiori application via the SAP BTP Cockpit UI.

- Login to your SAP BTP subaccount.
- Navigate to HTML5 Applications (left navigation).
- Select your deployed Fiori application and open it.

**LANGUAGE**: N/A

**CODE**:
```text
Use SAP BTP Cockpit -> HTML5 Applications -> select your Fiori application
```

**STEP**: 8 — Undeploy the CAP project

**DESCRIPTION**: Remove the deployed application from SAP BTP using the provided npm script.

**LANGUAGE**: Shell

**CODE**:
```shell
npm run undeploy
```

**STEP**: 9 — References, support, and license

**DESCRIPTION**: Useful links for how the project was generated, support channels, and license information.

- Blog source for project generation (Managed Approuter): https://blogs.sap.com/2022/02/10/build-and-deploy-a-cap-project-node.js-api-with-a-sap-fiori-elements-ui-and-a-managed-approuter-configuration/
- Get community support: https://answers.sap.com/tags/9f13aee1-834c-4105-8e43-ee442775e5ce
- License: Apache Software License, version 2.0 — see file ../../LICENSES/Apache-2.0.txt

**LANGUAGE**: N/A

**CODE**:
```text
Blog: https://blogs.sap.com/2022/02/10/build-and-deploy-a-cap-project-node.js-api-with-a-sap-fiori-elements-ui-and-a-managed-approuter-configuration/
Support: https://answers.sap.com/tags/9f13aee1-834c-4105-8e43-ee442775e5ce
License file: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Switch CAP project database from SQLite to SAP HANA (HANA Cloud)

**INTRODUCTION**: Step-by-step actions to convert a CAP sample project from the default SQLite to SAP HANA (HANA Cloud). Includes package.json changes, mta.yaml module path update, HDI binding/publishing, running cds watch to verify the HANA datasource, and a troubleshooting copy of the generated .env.

**TAGS**: fiori-samples, CAP, cds, sap-hana, hana-cloud, hdishared, mta, cloud-foundry, sqlite

**STEP**: 1 — Prepare HANA Cloud
**DESCRIPTION**: Ensure a HANA Cloud database is created and running in your cloud space before switching the project datasource. Follow the SAP tutorial to create a HANA Cloud DB project.
**LANGUAGE**: Text
**CODE**:
```text
https://developers.sap.com/tutorials/hana-cloud-create-db-project.html
```

**STEP**: 2 — Update cds configuration in package.json
**DESCRIPTION**: Replace or update the "cds" node in your project's package.json so CAP builds for hana and uses hana as the required db kind and xsuaa for uaa. This config directs cds build output for hana to ../db and sets deploy-format and requires entries for hana and uaa.
**LANGUAGE**: JSON
**CODE**:
```json
    "cds": {
        "build": {
            "tasks": [
                {
                    "for": "hana",
                    "dest": "../db"
                },
                {
                  "for": "node-cf"
                }
              ]
            },
        "hana": {
            "deploy-format": "hdbtable"
            },
        "requires": {
            "db": {
              "kind": "hana"
            },
            "uaa": {
              "kind": "xsuaa"
            }
        }
  }
```

**STEP**: 3 — Update mta.yaml module path for DB deployer
**DESCRIPTION**: In mta.yaml locate the managedAppCAPProject-db-deployer module and change its path from gen/db to db so the deployer uses the new db output location produced by cds build/watch.
**LANGUAGE**: YAML
**CODE**:
```yaml
# locate and update the module entry in mta.yaml
- name: managedAppCAPProject-db-deployer
  path: db
  # (other module properties remain unchanged)
```

**STEP**: 4 — Bind HDI-shared instance and publish sample data
**DESCRIPTION**: In SAP HANA Projects (or using your preferred tooling) bind the generated managedAppCAPProject-db to your existing deployed HDI-shared instance, then publish the sample data that was generated for the project. For detailed steps on binding and publishing from a local CAP project, refer to the blog post below.
**LANGUAGE**: Text
**CODE**:
```text
https://blogs.sap.com/2021/01/21/building-hana-opensap-cloud-2020-part-2-project-setup-and-first-db-build/
```

**STEP**: 5 — Stop existing cds instances and run cds watch to verify HANA datasource
**DESCRIPTION**: Stop any currently running cds instances for the project, then start cds watch. Confirm the log shows a connection to hana with the expected connection properties and that the CatalogService is served.
**LANGUAGE**: bash
**CODE**:
```bash
# stop existing cds instances (example)
# pkill -f "cds"  # OR stop via terminal/process manager you used

# start watch
cds watch
```

**STEP**: 6 — Expected cds watch output (verify)
**DESCRIPTION**: Example output you should see showing cds connected to HANA using bindings and serving the CatalogService at /catalog. Confirm certificate, driver, HDI user, host, port, schema, service_key_name, url, and user are present.
**LANGUAGE**: bash
**CODE**:
```bash
[cds] - connect using bindings from: { registry: '~/.cds-services.json' }
[cds] - connect to db > hana {
  certificate: '...',
  driver: 'com.sap.db.jdbc.Driver',
  hdi_password: '...',
  hdi_user: '5ZSJY7DA7WSR5I8ID2437IM15_DT',
  host: 'hostname',
  password: '...',
  port: '443',
  schema: '349D449AD914434',
  service_key_name: 'SharedDevKey',
  url: 'jdbc:sap://hostname',
  user: '349D449AD914434396E2631757'
}
[cds] - serving CatalogService { at: '/catalog' }
```

**STEP**: 7 — Open app and validate, then rebuild & deploy to CF
**DESCRIPTION**: Select "Open in New Tab" to open your application and validate functionality against HANA. Once validated, re-run your build and deploy steps (e.g., cds build, cf deploy commands or your existing CI/CD) to push changes to Cloud Foundry.

**STEP**: 8 — Troubleshooting: copy generated .env if DB connection fails
**DESCRIPTION**: If the local project cannot connect to HANA, copy the generated .env file from the db folder to the project root so cds and other tools find the service bindings.
**LANGUAGE**: bash
**CODE**:
```bash
cp db/.env .
```
--------------------------------

**TITLE**: Add XSUAA Authentication to Catalog API (Fiori Samples)

**INTRODUCTION**: Step-by-step code changes to secure the Catalog API with XSUAA. Includes edits to xs-app.json, root package.json, service CDS, and mta.yaml. Apply these changes, then rebuild and deploy to Cloud Foundry.

**TAGS**: xsuaa, authentication, mta.yaml, xs-app.json, cds, package.json, destination, CloudFoundry, CAP

**STEP**: 1 — Update frontend route to use XSUAA
**DESCRIPTION**: In the frontend project manifest (app->feproject-ui->xs-app.json), change authenticationType from "none" to "xsuaa" and keep the existing routing properties. This ensures requests to /catalog/ are routed with XSUAA authentication and CSRF protection is explicitly set.
**LANGUAGE**: JSON
**CODE**:
```json
    {
      "authenticationType": "xsuaa",
      "csrfProtection": false,
      "source": "^/catalog/",
      "destination": "cap-catalog-api"
    },
```

**STEP**: 2 — Add XSUAA-related dependencies to root package.json
**DESCRIPTION**: In the project root package.json, add the required dependencies for XSUAA integration and passport. Add these under the "dependencies" section.
**LANGUAGE**: JSON
**CODE**:
```json
        "@sap/xsenv": "^4.2.0",
        "@sap/xssec": "^3.6.0",
        "passport": "^0.6.0"
```

**STEP**: 3 — Require authenticated user on the Catalog service
**DESCRIPTION**: Enable authentication on the Catalog service by adding the @requires annotation in srv->cat-service.cds. This enforces that only authenticated users can access the CatalogService entity projections.
**LANGUAGE**: CDS
**CODE**:
```cds
@requires: 'authenticated-user'
service CatalogService {
    @readonly entity Books as projection on my.Books;
}
```

**STEP**: 4 — Modify mta.yaml: set appname parameter
**DESCRIPTION**: In mta.yaml, add an appname parameter (unique per subaccount). This appname is used to construct a static hostname for the deployed service and referenced in other resources below.
**LANGUAGE**: YAML
**CODE**:
```yaml
parameters:
  deploy_mode: html5-repo
  enable-parallel-deployments: true
  appname: mycapproject-unique
```

**STEP**: 5 — Modify mta.yaml: update service module to use UAA and static host
**DESCRIPTION**: Update the managedAppCAPProject-srv module to require the UAA instance and remove srv-api reference. Set host to use the ${appname} parameter so the service is exposed at a static hostname.
**LANGUAGE**: YAML
**CODE**:
```yaml
- name: managedAppCAPProject-srv
  type: nodejs
  path: gen/srv
  requires:
  - name: managedAppCAPProject-db
  - name: uaa_managedAppCAPProject
  parameters:
    buildpack: nodejs_buildpack
    host: ${appname}
  build-parameters:
    builder: npm-ci
    ignore: [".env", "node_modules/"]
```

**STEP**: 6 — Modify mta.yaml: update destination resource to point to static host
**DESCRIPTION**: In the managedAppCAPProject-destination-service resource, change the destination URL to the static hostname generated from ${appname} and ${default-domain}. Enable HTML5.DynamicDestination and ForwardAuthToken so the frontend forwards the token.
**LANGUAGE**: YAML
**CODE**:
```yaml
  - Authentication: NoAuthentication
    Name: cap-catalog-api
    ProxyType: Internet
    Type: HTTP
    URL: https://${appname}.${default-domain}
    HTML5.DynamicDestination: true
    HTML5.ForwardAuthToken: true    
```

**STEP**: 7 — Modify mta.yaml: remove srv-api reference from destination-service
**DESCRIPTION**: Remove any remaining reference to the srv-api service in managedAppCAPProject-destination-service. The destination should reference the static host URL instead of a service API.
**LANGUAGE**: YAML
**CODE**:
```yaml
# Remove the srv-api entry from the managedAppCAPProject-destination-service resources.
# (No code snippet provided; perform removal of srv-api references so the destination uses the static URL above.)
```

**STEP**: 8 — Rebuild and deploy
**DESCRIPTION**: Validate changes locally if possible, then re-run your build and deploy steps to push changes to Cloud Foundry. After deployment, the Catalog API will be secured with XSUAA authentication.
**LANGUAGE**: CLI
**CODE**:
```bash
# Example commands (adjust per project tooling)
npm run build
mbt build
cf deploy mta_archives/<your-mta>.mtar
```
--------------------------------

**TITLE**: Configure Fiori Elements App for SAP Launchpad (FLP) in a CAP Project

**INTRODUCTION**: Step-by-step instructions to add SAP Launchpad (FLP) configuration to a Fiori Elements application inside a CAP project, including commands to run, expected prompt answers, JSON changes to manifest.json, and i18n additions. Use this to prepare the app for publication on SAP BTP Launchpad Service.

**TAGS**: sap, fiori, cap, launchpad, flp, cloud-foundry, ui5, fiori-elements, manifest, i18n

**STEP**: 1 — Change into the Fiori Elements application directory

**DESCRIPTION**: From the root of your CAP project, change into the Fiori Elements app folder to run tooling commands there.

**LANGUAGE**: Bash

**CODE**:
```bash
cd managedAppCAPProject/app/feproject-ui
```

**STEP**: 2 — Run the UI5 tooling command to add FLP config

**DESCRIPTION**: Use npx to invoke the @sap/ux-ui5-tooling generator that adds the FLP crossNavigation config to your manifest.json and app i18n. Run this from the Fiori app directory (step 1).

**LANGUAGE**: Bash

**CODE**:
```bash
npx -p @sap/ux-ui5-tooling fiori add flp-config
```

**STEP**: 3 — Provide answers to generator prompts

**DESCRIPTION**: When prompted by the generator, provide values that describe your application. The semantic object represents a business entity (e.g., customer, sales order, product).

**LANGUAGE**: Bash

**CODE**:
```bash
Semantic Object -> MyFEApplication
Action -> display
Title -> List Report Object Page
Subtitle - Fiori Application
```

**STEP**: 4 — Confirm manifest.json changes (crossNavigation node)

**DESCRIPTION**: The generator will add a crossNavigation -> inbounds entry in your manifest.json. Verify that the entry matches your semantic object, action and uses the i18n keys for title/subTitle.

**LANGUAGE**: JSON

**CODE**:
```json
"crossNavigation": {
            "inbounds": {
                "cap-tutorial-feprojectui-inbound": {
                    "signature": {
                        "parameters": {},
                        "additionalParameters": "allowed"
                    },
                    "semanticObject": "MyFEApplication",
                    "action": "display",
                    "title": "{{flpTitle}}",
                    "subTitle": "{{flpSubtitle}}",
                    "icon": ""
                }
            }
        }
```

**STEP**: 5 — Confirm i18n.properties entries added

**DESCRIPTION**: The generator appends i18n entries used by the FLP tile/target configuration. Verify or edit values in your app's i18n.properties file.

**LANGUAGE**: JSON

**CODE**:
```json
flpTitle=List Report Object Page

flpSubtitle=
```

**STEP**: 6 — Rebuild and redeploy the application to Cloud Foundry

**DESCRIPTION**: After the FLP configuration changes, rebuild and push your app to Cloud Foundry so the updated manifest and i18n are deployed. Replace build steps with your project's actual build commands if needed.

**LANGUAGE**: Bash

**CODE**:
```bash
# Example generic steps (adjust to your project)
# Build (Java/Maven or Node-based CAP)
# mvn clean package
# or
# npm install && npm run build

# Deploy to Cloud Foundry
cf push
```

**STEP**: 7 — Ensure Launchpad Service is subscribed and configured

**DESCRIPTION**: Confirm the SAP Launchpad Service is available and configured on your SAP BTP subaccount. Follow the official onboarding guide if not already done.

**LANGUAGE**: PlainText

**CODE**:
```text
https://developers.sap.com/tutorials/cp-portal-cloud-foundry-getting-started.html
```

**STEP**: 8 — Create a Launchpad Site to consume the Fiori Elements app

**DESCRIPTION**: Create a Launchpad Site in your BTP subaccount and add a tile/target mapping that references the semantic object/action you configured (MyFEApplication / display). Follow the official site creation tutorial.

**LANGUAGE**: PlainText

**CODE**:
```text
https://developers.sap.com/tutorials/cp-portal-cloud-foundry-create-sitelaunchpad.html
```
--------------------------------

**TITLE**: Get Started with SAP Cloud Application Programming Model (CAP) using Fiori tools and Standalone Approuter

**INTRODUCTION**: Build and deploy a CAP-based Node.js API with a Fiori Elements UI and a standalone approuter on SAP Business Technology Platform (BTP). This guide covers running locally with an in-memory database, building and deploying to Cloud Foundry (CF) using either the Cloud MTA Build Tool or CLI, verifying deployment, and undeploying. The project was generated following the blog post: https://blogs.sap.com/2022/02/10/build-and-deploy-a-cap-project-node.js-api-with-a-sap-fiori-elements-ui-and-a-managed-approuter-configuration/ (using the Standalone Approuter configuration).

**TAGS**: fiori, sap-cap, cloud-foundry, approuter, btp, fiori-tools, cds, nodejs

**STEP**: 1 — Prerequisites (for Cloud Foundry deployment)
**DESCRIPTION**: Ensure you have the required SAP BTP/CF resources and configuration before deploying. Update xs-security.json with the correct oauth2-configuration API region (the API Endpoint can be found on your subaccount overview and must be appended to oauth2-configuration). Subscribe to the Launchpad Service if you plan to use the SAP Launchpad. These prerequisites are required only if deploying to Cloud Foundry.
**LANGUAGE**: text
**CODE**:
```text
- SAP Cloud Platform account: https://account.hana.ondemand.com/
- Launchpad Service subscription: https://developers.sap.com/tutorials/cp-portal-cloud-foundry-getting-started.html
- Locate your API Endpoint (example): https://api.cf.<region>.hana.ondemand.com
- Update xs-security.json -> oauth2-configuration with the API endpoint for your CF region
```

**STEP**: 2 — Create a Development Workspace (SAP Business Application Studio)
**DESCRIPTION**: If using SAP Business Application Studio (SBAS), create a dev workspace using either the "SAP Fiori" or "Full Stack Cloud Application" dev space templates to get required tooling and environment.
**LANGUAGE**: text
**CODE**:
```text
Create dev workspace in SBAS using:
- Dev Space: "SAP Fiori" or "Full Stack Cloud Application"
See: https://help.sap.com/viewer/... (SBAS dev workspace docs)
```

**STEP**: 3 — Setup and Run Locally
**DESCRIPTION**: Install dependencies, start the CAP application with live-reload, open the provided browser UI, and navigate to the Books service or the Fiori web application.
**LANGUAGE**: shell
**CODE**:
```shell
npm i
cds watch
```
Description: After running `cds watch`, select "Open in New Tab" when prompted. In the opened browser tab, select the Fiori web application or the "Books" service endpoint.

**STEP**: 4 — Build and Deploy to Cloud Foundry (Option 1: Cloud MTA Build Tool)
**DESCRIPTION**: Use the Cloud MTA Build Tool (GUI in BAS or similar IDE) to build and deploy the MTA archive. Ensure xs-security.json contains the correct oauth2-configuration settings before building.
- Update xs-security.json oauth2-configuration for your CF API region.
- Build the MTA project.
- Deploy the generated MTAR to Cloud Foundry.
**LANGUAGE**: text
**CODE**:
```text
1. Ensure xs-security.json is updated with correct oauth2-configuration for your API region.
2. Right-click mta.yaml -> "Build MTA Project"
3. Right-click mta_archives/standaloneCAPProject_1.0.0.mtar -> "Deploy MTA Archive"
This will prompt for CF credentials if not logged in.
```

**STEP**: 5 — Build and Deploy to Cloud Foundry (Option 2: CLI)
**DESCRIPTION**: Build and deploy using local npm scripts. Ensure xs-security.json is updated with oauth2-configuration for your CF API region. Run the build + deploy script which will prompt for CF credentials if required. After deployment, use the second generated application URL (approuter) to access the Fiori UI.
**LANGUAGE**: shell
**CODE**:
```shell
npm run build && npm run deploy
```
Example approuter URL pattern (select the second generated URL after deployment):
```text
<subdomain>-<space>-standalonecapproject-approuter.cfapps.<api-region>.hana.ondemand.com
```

**STEP**: 6 — Verify Deployment (Option 1: CF CLI)
**DESCRIPTION**: Use the Cloud Foundry CLI to show MTA deployment details and copy the approuter URL (the second URL under the `urls` column). Replace command argument with your MTA name if different.
**LANGUAGE**: shell
**CODE**:
```shell
cf mta standaloneCAPProject
```
Action: From the output, select the second URL listed under the `urls` column to open the deployed approuter and Fiori UI.

**STEP**: 7 — Verify Deployment (Option 2: SAP BTP Cockpit)
**DESCRIPTION**: Verify routes and application instances via the SAP BTP Cockpit.
**LANGUAGE**: text
**CODE**:
```text
1. Login to SAP BTP Cockpit -> Subaccount -> Overview -> Spaces
2. Select the space where you deployed the app
3. Select the approuter app (example name: standalonecapproject-approuter)
4. View application routes to access the Fiori UI
```

**STEP**: 8 — Undeploy
**DESCRIPTION**: Remove the deployed CAP project from Cloud Foundry using the provided npm script.
**LANGUAGE**: shell
**CODE**:
```shell
npm run undeploy
```

**STEP**: 9 — Known Issues / Connectivity to On-Premise Systems
**DESCRIPTION**: To enable on-premise connectivity, uncomment and enable the connectivity service in mta.yaml (service name: standaloneCAPProject-connectivity). The SAP Connectivity service lets cloud applications connect to on-premise systems. Ensure mta.yaml changes are saved before building/deploying.
**LANGUAGE**: text
**CODE**:
```text
- Open mta.yaml
- Uncomment the connectivity resource and corresponding module/service bindings
- Enable standaloneCAPProject-connectivity service
- Rebuild and redeploy the MTA
```

**STEP**: 10 — Get Support
**DESCRIPTION**: For questions or issues, post to the SAP Community tag for visibility and support.
**LANGUAGE**: text
**CODE**:
```text
SAP Community: https://answers.sap.com/tags/9f13aee1-834c-4105-8e43-ee442775e5ce
```

**STEP**: 11 — License
**DESCRIPTION**: Project license details and copyright.
**LANGUAGE**: text
**CODE**:
```text
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
Licensed under the Apache Software License, version 2.0.
See LICENSE: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Application Details for mystandalonecapproject (Fiori Elements - List Report Object Page V4)

**INTRODUCTION**: This document provides actionable metadata and launch instructions for the generated Fiori Elements application "mystandalonecapproject". Use the metadata for automation (scaffolding, CI, or code generation) and follow the steps to run the app against a local CAP service or with mock data.

**TAGS**: fiori, ui5, cap, sap, fiori-elements, list-report, object-page, mock, launch

**STEP**: 1 — Application metadata (machine-readable)
**DESCRIPTION**: Exact generation and app configuration metadata. Use this JSON for automation, validation, or injecting into scripts.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "generationDateTime": "Wed Sep 21 2022 13:54:29 GMT+0000 (Coordinated Universal Time)",
  "appGenerator": "@sap/generator-fiori-elements",
  "appGeneratorVersion": "1.7.5-pre-20220921092729-6383964dd.0",
  "generationPlatform": "SAP Business Application Studio",
  "floorplanUsed": "List Report Object Page V4",
  "serviceType": "Local Cap",
  "serviceUrl": "http://localhost:4004/catalog/",
  "moduleName": "mystandalonecapproject",
  "applicationTitle": "App Title",
  "namespace": "",
  "ui5Theme": "sap_horizon",
  "ui5Version": "1.102.1",
  "enableCodeAssistLibraries": false,
  "enableTypeScript": false,
  "addEslintConfiguration": false,
  "mainEntity": "Books",
  "appEntry": "/mystandalonecapproject/webapp/index.html"
}
```

**STEP**: 2 — Prerequisites
**DESCRIPTION**: Ensure runtime prerequisites are installed before running the app. Confirm Node.js LTS and a supported npm version are installed.
**LANGUAGE**: PlainText
**CODE**:
```
Pre-requisite:
1. Active NodeJS LTS (Long Term Support) version and associated supported NPM version. See https://nodejs.org
```

**STEP**: 3 — Start the CAP backend (local service)
**DESCRIPTION**: Start your CAP project so the local OData service is available at the service URL defined in metadata (http://localhost:4004/catalog/). The generator expects the Fiori app to be served with the CAP backend running on port 4004. If your project uses typical CAP scripts, use one of these example commands from the CAP project root to start the service. If your project uses different start scripts, run the equivalent command defined in your repository.
**LANGUAGE**: Bash
**CODE**:
```bash
# Example CAP start commands (choose appropriate for your project)
# Option A: cds watch (typical CAP development)
cds watch

# Option B: npm start (if defined in package.json to start CAP)
npm start
```

**STEP**: 4 — Launch the generated Fiori app in a browser (real backend)
**DESCRIPTION**: Once the CAP backend is running and serving the OData catalog, open the Fiori app index in a browser. The app entry path is relative to the project root.
**LANGUAGE**: PlainText
**CODE**:
```
Open in browser:
http://localhost:4004/mystandalonecapproject/webapp/index.html
```

**STEP**: 5 — Run the application with Mock Data
**DESCRIPTION**: If you want to run the Fiori app without a running CAP backend, start the provided mock server using the npm script generated with the app. This will run the UI and mock OData responses that reflect the service URL supplied during generation.
**LANGUAGE**: Bash
**CODE**:
```bash
# From the generated app root folder:
npm run start-mock
```

**STEP**: 6 — Service endpoint reference
**DESCRIPTION**: Reference for the service endpoint that the app expects when running against the local CAP service.
**LANGUAGE**: PlainText
**CODE**:
```
Service URL (OData catalog):
http://localhost:4004/catalog/
```
--------------------------------

**TITLE**: Deploy CAP Project with Fiori UI, In-Memory SQLite and FLP Support (Standalone MTA)

**INTRODUCTION**: Step-by-step, action-oriented instructions to initialize a standalone CAP project, connect it to an in-memory SQLite database, add an approuter and a Fiori UI using MTA templates, configure FLP/destination integration, and prepare for local development or Cloud Foundry deployment.

**TAGS**: fiori, CAP, Cloud Foundry, mta, approuter, FLP, SQLite, in-memory, cds, sap

**STEP**: Prerequisites & project initialization

**DESCRIPTION**: Ensure development environment and CDS tooling are available. Choose a unique MTA id (example: standaloneCAPProject). Initialize a CAP project and add sample content and MTA support.

**LANGUAGE**: Bash

**CODE**:
```bash
# Ensure CDS CLI is installed globally
npm i -g @sap/cds-dk

# Example MTA id
# use: standaloneCAPProject

# Initialize CAP project and add samples + mta
cds init standaloneCAPProject
cd  standaloneCAPProject/
cds add samples
cds add mta
```

**STEP**: package.json — dependencies and CDS in-memory DB configuration

**DESCRIPTION**: Edit package.json in the project root to:
- Move "sqlite3" from devDependencies to dependencies.
- Add xsenv/xssec and passport dependencies.
- Configure CDS to use an in-memory SQLite DB and enable the in_memory_db feature.

Apply the three changes below to package.json.

**LANGUAGE**: JSON

**CODE**:
```JSON
# a) Move sqlite3 to dependencies (ensure this appears under "dependencies")
"sqlite3": "^5.0.4"

# b) Add these dependencies under "dependencies"
"@sap/xsenv": "^4.2.0",
"@sap/xssec": "^3.6.0", 
"passport": "^0.6.0"

# c) Add the cds node to package.json to connect CDS to in-memory sqlite
"cds": {
    "requires": {
        "db": {
        "kind": "sqlite",
        "credentials": {
          "database": ":memory:"
        }
     }
    },
    "features": {
      "in_memory_db": true
    }
}    
```

**STEP**: mta.yaml — build-parameters pre-build commands

**DESCRIPTION**: Update mta.yaml to run production npm install, build cds and copy db data into the generated srv folder as part of build-parameters before-all.

**LANGUAGE**: YAML

**CODE**:
```YAML
build-parameters:
  before-all:
   - builder: custom
     commands:
      - npm install --production
      - npx -p @sap/cds-dk cds build --production
      - cp -r db/data gen/srv/srv/data
```

**STEP**: srv/cat-service.cds — add UI annotations for CatalogService.Books

**DESCRIPTION**: Append UI annotations to srv/cat-service.cds to expose SelectionFields and LineItem annotations for Books entity and to label fields.

**LANGUAGE**: JSON

**CODE**:
```JSON
	annotate CatalogService.Books with @(
    UI : { 
        SelectionFields  : [
            title
        ],
        LineItem  : [
            { Value : ID },
            { Value : title }, 
            { Value : stock }                                   
        ],
     }
  ){
      ID @( title: 'ID' );    
      title @( title: 'Title' );
      stock @( title: 'Stock' );
  };
```

**STEP**: Install packages and validate locally

**DESCRIPTION**: Install npm packages and run the CAP service locally to validate the catalog service.

**LANGUAGE**: Bash

**CODE**:
```bash
npm install
cds watch
# Follow the opened tab in the browser to validate CatalogService is running
```

**STEP**: Add Approuter module via MTA template (UI & auth choices)

**DESCRIPTION**: From your MTA project (right-click mta.yaml -> Create MTA Module from Template). Choose Approuter Configuration. Use Standalone Approuter runtime. Answer prompts:
- Add authentication? — Yes
- Add a UI? — Yes

(Use the wizard options; no additional code required here.)

**LANGUAGE**: JSON

**CODE**:
```JSON
# Use MTA "Create MTA Module from Template" wizard:
# - Template: Approuter Configuration
# - HTML5 runtime: Standalone Approuter
# - Add authentication: Yes
# - Add UI: Yes
```

**STEP**: Add SAP Fiori Application module via MTA template (connect to CAP OData)

**DESCRIPTION**: Create an SAP Fiori Application module:
- Template: SAP Fiori Application
- Choose application type and floorplan
- Use a Local CAP Project (point to project)
- Select OData service and main entity
- Provide unique project name (e.g. mystandalonecapproject)
- Add deployment configuration to MTA project: Yes
- Add FLP configuration: Yes
- Target: Cloud Foundry
- Destination: None
- Semantic Object: MyStandaloneCapProject
- Action: display
- Title: The Title of my Standalone App
- Finish the wizard

**LANGUAGE**: JSON

**CODE**:
```JSON
# Use MTA "Create MTA Module from Template" wizard for:
# - Template: SAP Fiori Application
# - Use a Local CAP Project -> point to your CAP project
# - Select OData Service, Main entity
# - Project name: mystandalonecapproject
# - Add deployment configuration to MTA: Yes
# - Add FLP configuration: Yes
# - Target: Cloud Foundry
# - Destination: None
# - Semantic Object: MyStandaloneCapProject
# - Action: display
# - Title: The Title of my Standalone App
```

**STEP**: app/mystandalonecapproject/xs-app.json — add route for catalog to destination

**DESCRIPTION**: Add a route to forward requests with path prefix /catalog/ to the destination named cap-launchpad. Insert this object as the first route in xs-app.json's routes array.

**LANGUAGE**: JSON

**CODE**:
```JSON
    {
      "authenticationType": "none",
      "csrfProtection": false,
      "source": "^/catalog/",
      "destination": "cap-launchpad"
    },	
```

**STEP**: mta.yaml — update service module attributes and add destination resource

**DESCRIPTION**: Update the generated service module standaloneCAPProject-srv to use the generated gen/srv path, provide srv-api, and use npm-ci builder. Add a destination service resource (standaloneCAPProject-destination-service) that references srv-api and configures HTML5 runtime destinations including cap-launchpad. Also ensure modules requiring srv-api include a requires node.

Apply the snippets below.

**LANGUAGE**: YAML

**CODE**:
```YAML
# Update existing module standaloneCAPProject-srv
- name: standaloneCAPProject-srv
  type: nodejs
  path: gen/srv
  provides:
  - name: srv-api
    properties:
      srv-url: ${default-url}
  parameters:
    memory: 256M
    disk-quota: 1024M
    buildpack: nodejs_buildpack
  build-parameters:
    builder: npm-ci
```

**LANGUAGE**: YAML

**CODE**:
```YAML
# Add destination resource (summary fragment)
- Authentication: NoAuthentication
  Name: cap-launchpad
  ProxyType: Internet
  Type: HTTP
  URL: ~{srv-api/srv-url}
  HTML5.DynamicDestination: true
  HTML5.ForwardAuthToken: true
```

**LANGUAGE**: YAML

**CODE**:
```YAML
# Example full destination service resource and requires linkage
- name: standaloneCAPProject-destination-service
  type: org.cloudfoundry.managed-service
  requires:
    - name: srv-api
  parameters:
    config:
      HTML5Runtime_enabled: false
      init_data:
        instance:
          destinations:
          - Authentication: NoAuthentication
            Name: ui5
            ProxyType: Internet
            Type: HTTP
            URL: https://ui5.sap.com
          - Authentication: NoAuthentication
            Name: cap-launchpad
            ProxyType: Internet
            Type: HTTP
            URL: ~{srv-api/srv-url}
            HTML5.DynamicDestination: true
            HTML5.ForwardAuthToken: true  
          existing_destinations_policy: update
      version: 1.0.0
    service: destination
    service-name: standaloneCAPProject-destination-service
    service-plan: lite
```

**STEP**: Local validation complete / Ready for deployment

**DESCRIPTION**: At this point your MTA project includes a CAP backend module (gen/srv), destination configuration for FLP, and a Fiori UI with approuter route. The project is ready for local development or Cloud Foundry deployment. Proceed to adjust approuter package.json for CF and build/deploy steps below.

**LANGUAGE**: text

**CODE**:
```text
# Project is ready for local development or Cloud Foundry deployment.
```

**STEP**: approuter package.json — Cloud Foundry compatibility adjustments

**DESCRIPTION**: In the <mta-id>-approuter folder package.json, bump @sap/approuter to 11.5.0 and require node >=14.0.0 to support Node.js 16 on Cloud Foundry. Update these fields in the approuter package.json.

**LANGUAGE**: JSON

**CODE**:
```JSON
# Example changes in <mta-id>-approuter/package.json
"@sap/approuter": "11.5.0",
"engines": {
  "node": ">= 14.0.0"
}
```

**STEP**: Build & deploy (Business Application Studio)

**DESCRIPTION**: Use the IDE MTA tooling to build and deploy the MTA archive. Right-click the mta.yaml to Build MTA Project (generates .mtar), then right-click the mtar in mta_archives and Deploy MTA Archive (ensure Cloud Foundry login before deploying).

**LANGUAGE**: Bash

**CODE**:
```bash
# In Business Application Studio:
# 1) Right-click mta.yaml -> Build MTA Project (generates mtar)
# 2) Right-click the mtar in mta_archives -> Deploy MTA Archive
#    (ensure you're logged into Cloud Foundry)
```

**STEP**: Build & deploy (VSCode / CLI script)

**DESCRIPTION**: Use the repository-provided npm script to build and deploy (if configured). Run the combined script that builds and deploys the MTA.

**LANGUAGE**: Bash

**CODE**:
```BASH
npm run build && npm run deploy
```
--------------------------------

**TITLE**: Get Started with SAP Cloud Application Programming Model (CAP) using Fiori tools and Application Frontend Service

**INTRODUCTION**: Quick reference for code-generation agents and developers to locate authoritative resources and initial actions when building CAP-based UIs with Fiori tools and the Application Frontend Service. Use the links and commands below to fetch documentation, blog guidance, and license details. This page collects the essential starting points so an automation or developer can programmatically retrieve guidance and incorporate it into a generation workflow.

**TAGS**: fiori-samples, CAP, Application Frontend Service, fiori-tools, SAP, documentation, getting-started

**STEP**: 1 — Read the official service overview

**DESCRIPTION**: Open the SAP Help Portal page that explains the Application Frontend Service. Use this page to understand service capabilities, supported patterns, and provisioning details that inform scaffolding and deployment choices.

**LANGUAGE**: text

**CODE**:
```text
URL:
https://help.sap.com/docs/application-frontend-service/application-frontend-service/what-is-application-frontend-service?version=Cloud

Suggested quick fetch (curl):
curl -L "https://help.sap.com/docs/application-frontend-service/application-frontend-service/what-is-application-frontend-service?version=Cloud"
```

**STEP**: 2 — Read the product introduction blog

**DESCRIPTION**: Read the official announcement and high-level guidance from the SAP Community blog to capture use cases, recommended approaches, and examples that influence template selection and UI patterns.

**LANGUAGE**: text

**CODE**:
```text
URL:
https://community.sap.com/t5/technology-blog-posts-by-sap/introducing-application-frontend-service/ba-p/14091408

Suggested quick fetch (curl):
curl -L "https://community.sap.com/t5/technology-blog-posts-by-sap/introducing-application-frontend-service/ba-p/14091408"
```

**STEP**: 3 — Read the step-by-step blog about simple UI applications

**DESCRIPTION**: Review the "Simple UI Applications with Application Frontend Service" blog post for concrete examples and step sequences that are useful to reproduce in automation or scaffolding scripts (how-to guidance, constraints, and sample flows).

**LANGUAGE**: text

**CODE**:
```text
URL:
https://community.sap.com/t5/technology-blog-posts-by-sap/simple-ui-applications-with-application-frontend-service/ba-p/14096009

Suggested quick fetch (curl):
curl -L "https://community.sap.com/t5/technology-blog-posts-by-sap/simple-ui-applications-with-application-frontend-service/ba-p/14096009"
```

**STEP**: 4 — Sample applications status and next actions

**DESCRIPTION**: Sample application implementations are listed as "Coming soon..." in this repository. For now, programmatically poll the repository or CI location where sample apps will be added and prepare scaffolding tasks to populate once samples appear.

**LANGUAGE**: bash

**CODE**:
```bash
# Example: poll the repository README or samples folder for changes (adjust repo URL)
REPO_RAW_URL="https://raw.githubusercontent.com/<org>/<repo>/main/path/to/samples/README.md"
while true; do
  curl -s -o /tmp/samples-readme.md "$REPO_RAW_URL"
  if grep -q -i "coming soon" /tmp/samples-readme.md; then
    echo "Samples not yet available. Sleeping and retrying..."
    sleep 3600
  else
    echo "Samples available. Downloading..."
    curl -L -O "https://github.com/<org>/<repo>/archive/refs/heads/main.zip"
    break
  fi
done
```

**STEP**: 5 — Review license and copyright details

**DESCRIPTION**: The project is licensed under the Apache Software License 2.0. Use the provided repository path to retrieve the license file and include it with generated code or compliance checks.

**LANGUAGE**: bash

**CODE**:
```bash
# View the license file located in the repository
LICENSE_PATH="../../LICENSES/Apache-2.0.txt"

# If running in the repository root or appropriate context:
if [ -f "$LICENSE_PATH" ]; then
  cat "$LICENSE_PATH"
else
  echo "License file not found at $LICENSE_PATH. Adjust path to repository layout."
fi
```

**STEP**: 6 — Actionable next steps for code generation agents

**DESCRIPTION**: Use the collected resources to:
- Determine required service APIs and provisioning actions from the Help Portal.
- Extract example steps from the blog posts to form scripted walkthroughs for Fiori tools (scaffolding, building, deployment).
- Watch the samples folder and integrate sample app templates into the code generator when available.
- Ensure Apache-2.0 licensing is included in generated artifacts (use LICENSE_PATH above).

**LANGUAGE**: text

**CODE**:
```text
Next actions checklist:
- Fetch and parse the Help Portal page to extract service capabilities and API endpoints.
- Parse blog posts for step-by-step commands and convert them into automation tasks.
- Monitor repository for sample applications and import templates when published.
- Include ../../LICENSES/Apache-2.0.txt contents with generated projects for compliance.
```
--------------------------------

**TITLE**: Expose a deployed CAP project as an SAP BTP destination

**INTRODUCTION**: Step-by-step instructions to expose a deployed CAP (Cloud Application Programming) Node.js service with a SAPUI5 Fiori UI as an SAP BTP destination. This enables secure consumption of OData endpoints from other BTP services and tools (e.g., SAP Fiori tools, Business Application Studio). Includes retrieving XSUAA credentials, creating an OAuth2 Client Credentials destination, and testing via Business Application Studio Service Centre and curl.

**TAGS**: fiori-samples, CAP, SAP BTP, destination, OAuth2ClientCredentials, XSUAA, SAPUI5, Business Application Studio, Cloud Foundry

STEP: Prerequisites

DESCRIPTION: Verify required accounts, subscriptions, and that your CAP project with SAPUI5 Fiori UI is deployed in the same subaccount where you'll create the destination.

LANGUAGE: text

CODE:
```text
- You have an SAP BTP account, e.g. a trial account: https://account.hana.ondemand.com/
- You are subscribed to SAP Build Work Zone (see tutorial: https://developers.sap.com/tutorials/cp-portal-cloud-foundry-getting-started.html)
- You have deployed a CAP project with a SAPUI5 Fiori UI (example deployment flow: https://community.sap.com/t5/technology-blogs-by-sap/build-and-deploy-a-cap-project-node-js-api-with-a-sap-fiori-elements-ui-and/ba-p/13537906)
- You will create the destination in the same subaccount where the CAP project is deployed
```

STEP: 1 — Locate the running CAP Node.js service

DESCRIPTION: In your SAP BTP dev space (e.g., Business Application Studio), open the nodejs service list to find the running CAP service. Note the base URL of the service. Example shown in screenshots: Step1.png and Step2.png.

LANGUAGE: text

CODE:
```text
Example CAP service URL (base endpoint):
https://28bdb0fbtrial-dev-managedappcapproject-srv.cfapps.us10-001.hana.ondemand.com
Example exposed OData service path:
https://28bdb0fbtrial-dev-managedappcapproject-srv.cfapps.us10-001.hana.ondemand.com/odata/v4/catalog
```

STEP: 2 — Confirm endpoint returns 401 without auth

DESCRIPTION: When requesting the endpoint without appropriate authorization headers, you should receive HTTP 401 — this indicates the service is protected by XSUAA and must be accessed via a configured destination with OAuth credentials. Screenshot reference: Step2c.png.

LANGUAGE: text

CODE:
```text
Expected unauthenticated response: HTTP 401 Unauthorized
```

STEP: 3 — Retrieve XSUAA service key (clientid, clientsecret, url)

DESCRIPTION: From the subaccount root, open "Instances and Subscriptions", locate the Authorization and Trust Management (XSUAA) service instance created for your CAP app (e.g., managedAppCAPProject-xsuaa-service). Open the "Service Keys" tab and create a service key if none exist. Extract the following properties from the service key JSON:

LANGUAGE: text

CODE:
```text
Required properties from the XSUAA service key:
- clientid
- clientsecret
- url

Example values (from service key JSON):
sb-managedappcapproject!t299668
xGRgYPoAXbMv2gqRIDontThinkSooZ7uY=
https://28bdb0fbtrial.authentication.us10.hana.ondemand.com
```

STEP: 4 — Create a new SAP BTP destination (OAuth2ClientCredentials)

DESCRIPTION: In the subaccount, open Connectivity → Destinations → Create Destination. Configure the destination to use OAuth2ClientCredentials using the XSUAA service key values. Important: append /oauth/token to the Token Service URL property. Include additional HTML5 properties required for Fiori tools.

LANGUAGE: JSON

CODE:
```json
Name: capdestination
Description: CAP Project Destination
URL: from step 2 i.e. https://28bdb0fbtrial-dev-managedappcapproject-srv.cfapps.us10-001.hana.ondemand.com
Client ID: from step 5 i.e. sb-managedappcapproject!t299668
Client Secret: from step 5 i.e. xGRgYPoAXbMv2gqRIDontThinkSooZ7uY=
Token Service URL: from step 5 i.e. https://28bdb0fbtrial.authentication.us10.hana.ondemand.com appended with /oauth/token
Token Service user: same as client ID
Token Service password: same as client secret
HTML5.Timeout: 60000
WebIDEEnabled: true
WebIDEUsage: odata_gen
HTML5.DynamicDestination: true
HTML5.Timeout: 60000
Authentication: OAuth2ClientCredentials
```

STEP: 5 — Note about Token Exchange vs Client Credentials

DESCRIPTION: Use OAuth2ClientCredentials to authenticate services (machine-to-machine). To use Token Exchange (authenticate a user across systems) set Authentication to OAuth2UserTokenExchange — this removes the need for Token Service user/password in the destination and is used for user token propagation scenarios.

LANGUAGE: text

CODE:
```text
- OAuth2ClientCredentials: Client Credentials Grant (service/application authentication)
- OAuth2UserTokenExchange: Token Exchange Grant (user authentication propagation)
```

STEP: 6 — Test the destination in Business Application Studio Service Centre

DESCRIPTION: In Business Application Studio, open Service Centre (left navigation). Select the destination (capdestination). If status shows "Not Available", append the service path (e.g., /odata/v4/catalog) and click Connect to verify the service is reachable through the destination. Screenshot references: Step7.png, Step7b.png.

LANGUAGE: text

CODE:
```text
Service path to enter: /odata/v4/catalog
Complete URL resolved by Service Centre: https://capdestination.dest/odata/v4/catalog
```

STEP: 7 — Test the destination via curl

DESCRIPTION: Use curl to test the destination from a terminal. The following command performs the request and saves verbose output to a file. Replace the URL with the destination hostname returned by your BTP cockpit if needed.

LANGUAGE: Bash

CODE:
```bash
curl -L "https://capdestination.dest/odata/v4/catalog" -vs > curl-cap-output.txt 2>&1
```

STEP: 8 — Example successful OData response

DESCRIPTION: After a successful call through the destination, you should receive OData JSON. Example response for /odata/v4/catalog:

LANGUAGE: JSON

CODE:
```JSON
{
  "@odata.context": "$metadata",
  "@odata.metadataEtag": "W/\"kpKGEWiUkdl2tvln8+lIbb+WgNsbQRujr+H11i5pAUg=\"",
  "value": [
    {
      "name": "Books",
      "url": "Books"
    }
  ]
}
```

STEP: 9 — Next steps

DESCRIPTION: With the destination configured and tested, you can generate HTML5/Fiori applications that consume the CAP OData services using SAP Fiori tools and the HTML5 generator. For cross-subaccount or cross-region secure calls, see guidance on SAML and OAuth token exchange.

LANGUAGE: text

CODE:
```text
Further reading:
- Destinations & OAuth: https://community.sap.com/t5/technology-blogs-by-members/sap-btp-destinations-in-a-nutshell-part-3-oauth-2-0-client-credentials/ba-p/13577101
- Cross-subaccount / regions: https://community.sap.com/t5/technology-blogs-by-sap/sap-btp-how-to-call-protected-app-across-regions-with-saml-and-oauth-2/ba-p/13546145

License:
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0 except as noted in the LICENSE file:
../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Referenced Guides for fiori-samples

**INTRODUCTION**: This index links focused technical guides used by fiori-samples. Each entry states the purpose, typical use-case, and the README file path to open for implementation details. Use these when generating code or automation to integrate SAP BTP destinations, Cloud Connector, S/4HANA, headless generation, proxy/SSL setup, CI/CD with environment credentials, and ABAP cloud cross-account scenarios.

**TAGS**: fiori-samples, sap-btp, destinations, odata, s4hana, cloud-connector, headless-generator, proxy, ssl, cicd, abap, abapcloud

**STEP**: 1

**DESCRIPTION**: Consuming and validating SAP BTP destinations to support OData XML Service. Use this guide when configuring BTP destinations for OData/XML services, validating connectivity, and testing metadata and service endpoints.

**LANGUAGE**: text

**CODE**:
```text
destinations/README.md
[Consuming and validating SAP BTP destinations to support OData XML Service](destinations/README.md)
```

**STEP**: 2

**DESCRIPTION**: Running SAP Fiori Generator headless. Use this guide to automate Fiori project generation without interactive prompts (CI/CD or scripted setups), and incorporate generator options to produce reusable artifacts.

**LANGUAGE**: text

**CODE**:
```text
headless/README.md
[Running SAP Fiori Generator headless](headless/README.md)
```

**STEP**: 3

**DESCRIPTION**: Consuming SAP Cloud Connector via SAP BTP destination. Follow this to configure on-premise connectivity through Cloud Connector and set up corresponding BTP destinations (Cloud Connector -> On-Premise systems).

**LANGUAGE**: text

**CODE**:
```text
onpremise/README.md
[Consuming SAP Cloud Connector via SAP BTP destination](onpremise/README.md)
```

**STEP**: 4

**DESCRIPTION**: Consuming SAP S/4Hana public cloud via SAP BTP destination. Use this guide for setting up secure connections from BTP to SAP S/4HANA Cloud systems and handling required destination settings for OData/REST integration.

**LANGUAGE**: text

**CODE**:
```text
s4hana/README.md
[Consuming SAP S/4Hana public cloud via SAP BTP destination](s4hana/README.md)
```

**STEP**: 5

**DESCRIPTION**: Proxy Configuration. Reference this when code or infrastructure must route traffic through HTTP/HTTPS proxies, configure environment variables, or adapt client libraries to corporate proxy settings.

**LANGUAGE**: text

**CODE**:
```text
proxy/README.md
[Proxy Configuration](proxy/README.md)
```

**STEP**: 6

**DESCRIPTION**: Self-Signed SSL Certificate. Use this guide to create, install, and trust self-signed certificates for development and testing, and to configure local runtimes or BTP trust stores accordingly.

**LANGUAGE**: text

**CODE**:
```text
sslcerts/README.md
[Self-Signed SSL Certificate](sslcerts/README.md)
```

**STEP**: 7

**DESCRIPTION**: ABAP CI/CD Pipeline Support with Environment Credentials. Follow these instructions to integrate ABAP CI/CD pipelines using environment-provided credentials for non-interactive, secure deployments and automated testing.

**LANGUAGE**: text

**CODE**:
```text
cicd/README.md
[ABAP CI/CD Pipeline Support with Environment Credentials](cicd/README.md)
```

**STEP**: 8

**DESCRIPTION**: SAP BTP ABAP Environment (Steampunk) - Cross Subaccount and Regions. Use this guide when deploying or integrating ABAP Steampunk projects across multiple subaccounts or geographic regions; covers cross-account credentials and connectivity considerations.

**LANGUAGE**: text

**CODE**:
```text
abapcloud/README.md
[SAP BTP ABAP Environment (Steampunk) - Cross Subaccount and Regions](abapcloud/README.md)
```

**STEP**: 9

**DESCRIPTION**: License and copyright details. The project uses Apache-2.0 licensing—refer to the license file for redistribution and contribution rules.

**LANGUAGE**: text

**CODE**:
```text
LICENSES/Apache-2.0.txt
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the LICENSE file.
```
--------------------------------

**TITLE**: Configure SAP BTP ABAP Environment (Steampunk) for External Fiori App Access and Cross-Account Destinations

**INTRODUCTION**: Action-oriented reference for configuring SAP BTP ABAP Environment (Steampunk) connections used by Fiori apps and UI tooling. Includes prerequisites, required destination settings, deployment reference, cross-account/cross-region destination configuration using SAMLAssertion, and troubleshooting steps to resolve common connectivity issues.

**TAGS**: sap, abap, steampunk, btp, fiori, destination, saml, oauth2, oauth2usertokenexchange, communication-system, troubleshooting

**STEP**: Prerequisites — Authentication and destination usage flags

**DESCRIPTION**: 
- Choose an Authentication type for the destination: supported options include OAuth2UserTokenExchange and SAMLAssertion. Decide which suits your scenario (OAuth2UserTokenExchange for token exchange flows; SAMLAssertion for cross-account/region trust scenarios).
- When exposing a Steampunk system to the internet via an SAP BTP destination, ensure the destination property WebIDEUsage contains the required values so SAP tooling recognizes the destination as an ABAP Cloud system.
- The presence of the value abap_cloud in WebIDEUsage is used to determine that the target system is an ABAP Cloud (Steampunk) system.

**LANGUAGE**: text

**CODE**:
```text
WebIDEUsage: odata_abap,dev_abap,abap_cloud
```

**STEP**: Understanding ABAP Cloud Environment (Steampunk)

**DESCRIPTION**: Read this technical blog to understand terminology and deployment models (Steampunk vs embedded vs ABAP on Cloud). Use it to confirm your system architecture and requirements before configuring destinations or deploying Fiori apps.

**LANGUAGE**: url

**CODE**:
```text
https://community.sap.com/t5/technology-blog-posts-by-members/demystifying-sap-btp-abap-environment-steampunk-abap-on-cloud-embedded/ba-p/13567772
```

**STEP**: Create and deploy an SAP Fiori App to ABAP Cloud (Steampunk)

**DESCRIPTION**: Follow the step-by-step SAP tutorial to generate a Fiori Elements app and deploy it into your ABAP Cloud environment. Use the tutorial to prepare the app, configure the destination, and push code to the ABAP cloud repository.

**LANGUAGE**: url

**CODE**:
```text
https://developers.sap.com/tutorials/abap-environment-deploy-fiori-elements-ui.html
```

**STEP**: Enable a BTP Destination for Cross-Account or Cross-Region Use (SAMLAssertion)

**DESCRIPTION**: 
- For cross-account or cross-region destination usage by UI tooling, use SAMLAssertion-based trust between subaccounts/regions.
- Two recommended approaches:
  1. Watch the walkthrough video for cross-account/cross-region destination configuration to understand the end-to-end steps. Note: some UI details in the video may be outdated (legacy flows, certificate locations), but the cross-account concepts are valid.
  2. Follow the official SAP help article for creating a destination for cross-subaccount communication which contains current instructions and required trust configuration.
- Ensure the destination's WebIDEUsage includes abap_cloud (see prerequisites). Confirm SAML trust is established and that certificates/metadata are correctly exchanged between accounts or regions.

**LANGUAGE**: url

**CODE**:
```text
# Option 1 (video)
https://www.youtube.com/watch?v=8ePyQJsmWYA

# Option 2 (official docs)
https://help.sap.com/docs/btp/sap-business-technology-platform/creating-destination-for-cross-subaccount-communication
```

**STEP**: Troubleshooting connectivity and communication system setup

**DESCRIPTION**: 
- The most common failure when external tools (e.g., Business Application Studio) try to access ABAP Cloud is a misconfigured Communication System or missing trust/credentials in the destination.
- Verify the Communication System is created and configured for SAP Business Application Studio access. Ensure the communication user, OAuth/SAML settings, and URLs are correct.
- If access is still blocked, enable a connectivity trace in the ABAP Cloud system and analyze the trace to identify certificate, authentication, or routing errors. Follow the help topics linked below for step-by-step instructions.

**LANGUAGE**: url

**CODE**:
```text
# Create a Communication System for BAS
https://help.sap.com/docs/sap-btp-abap-environment/abap-environment/creating-communication-system-for-sap-business-application-studio

# Enable and inspect Connectivity Trace
https://help.sap.com/docs/sap-btp-abap-environment/abap-environment/display-connectivity-trace
```

**STEP**: License and project attribution

**DESCRIPTION**: Project licensing information and path to the Apache-2.0 license file in the repository.

**LANGUAGE**: text

**CODE**:
```text
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0
See: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Sample Configurations to Improve ABAP Deployment Task (SAPUI5 / ui5-tooling)

**INTRODUCTION**: Practical, code-focused recipes to configure SAPUI5 deployment to ABAP systems. Includes environment-variable credential handling, dynamic transport-request creation, CI/CD CLI commands, and options to generate a deployable archive.zip. Use these steps to integrate deployments into CI/CD pipelines (Azure DevOps, CircleCI, GitHub Actions) and to run deployments via SAP Cloud Transport Management (CTMS).

**TAGS**: ABAP, SAPUI5, ui5-tooling, deployment, CTMS, CI/CD, environment-variables, ui5-deploy.yaml, archive, zip

**STEP**: 1 — Recommended Deployment Flow (CTMS)
**DESCRIPTION**: Prefer SAP Cloud Transport Management (CTMS) to perform deployments into SAP landscapes. CTMS provides change control, audit logs, and is the recommended path for SAP BTP/ABAP deployments. You can integrate external CI/CD platforms via CTMS APIs or use GitHub Actions (marketplace action available).
**LANGUAGE**: text
**CODE**:
```text
References:
- ui5-tooling package: https://www.npmjs.com/package/@sap/ux-ui5-tooling
- CTMS GitHub Action: https://github.com/marketplace/actions/deploy-to-sap-btp-with-ctms
- CTMS blog/resource example: https://community.sap.com/t5/technology-blog-posts-by-sap/sap-btp-runtimes-my-personal-considerations-and-preferences-on-cloud/ba-p/14129510
```

**STEP**: 2 — Use .env for credentials and update ui5-deploy.yaml
**DESCRIPTION**: Create a .env file (root of SAPUI5 project) and reference env vars in ui5-deploy.yaml using the env: prefix. Add configuration flags to bypass prompts and fail fast in CI.
**LANGUAGE**: bash
**CODE**:
```bash
# .env (root of project)
XYZ_USER=myusername
XYZ_PASSWORD=mypassword
```
**LANGUAGE**: YAML
**CODE**:
```YAML
# ui5-deploy.yaml (snippet aligned with existing root nodes such as target)
configuration:
  yes: true
  failFast: true
  target:
    url: https://XYZ.sap-system.corp:44311
    client: 200        
  credentials:
    username: env:XYZ_USER
    password: env:XYZ_PASSWORD
```
**DESCRIPTION**: Flags:
- yes: true — bypass "Yes" confirmation prompts during deploy/undeploy.
- failFast: true — exit immediately on exceptions (useful to stop CI on auth failures).

**STEP**: 3 — Export environment variables instead of .env (alternative)
**DESCRIPTION**: If not using a .env file, export credentials in your CI agent or shell and reference them in ui5-deploy.yaml without the env: prefix (or pass via CLI).
**LANGUAGE**: bash
**CODE**:
```bash
# Export in shell / CI agent environment
export XYZ_USER='~username'
export XYZ_PASSWORD='~password'
```
**LANGUAGE**: YAML
**CODE**:
```YAML
# ui5-deploy.yaml when credentials come from environment variables (names referenced directly)
credentials:
  username: XYZ_USER
  password: XYZ_PASSWORD
```
**LANGUAGE**: bash
**CODE**:
```bash
# Or pass credentials via CLI params (example)
--username XYZ_USER --pasword XYZ_PASSWORD
```

**STEP**: 4 — Create Transport Request (TR) dynamically on deploy/undeploy
**DESCRIPTION**: Use the REPLACE_WITH_TRANSPORT placeholder in ui5-deploy.yaml to create a transport request dynamically each run. This works for both deploy and undeploy operations.
**LANGUAGE**: YAML
**CODE**:
```YAML
# ui5-deploy.yaml snippet
app:
  name: /TEST/SAMPLE_APP
  package: /TEST/UPLOAD
  transport: REPLACE_WITH_TRANSPORT
```

**STEP**: 5 — CI/CD: Example deploy CLI command for pipelines
**DESCRIPTION**: Single-line command you can use in CI/CD to deploy with environment-based credentials, create a dynamic TR, archive content, and apply fail-fast/yes flags.
**LANGUAGE**: bash
**CODE**:
```bash
npx fiori deploy --url https://your-env.hana.ondemand.com --name 'SAMPLE_APP' --package 'MY_PACKAGE' --transport 'REPLACE_WITH_TRANSPORT' --archive-path 'archive.zip' --username 'env:XYZ_USER' --password 'env:XYZ_PASSWORD' --noConfig --failFast --yes
```

**STEP**: 6 — Generate ZIP archive (Option 1: auto-archive dist)
**DESCRIPTION**: Omit --archive-path from CLI to let the deploy process archive the ./dist folder on-the-fly. No additional project updates required.
**LANGUAGE**: text
**CODE**:
```text
Option 1: Remove --archive-path 'archive.zip' from CLI params and allow the dist folder to be archived during deployment.
```

**STEP**: 7 — Generate ZIP archive (Option 2: build archive via ui5-task-zipper)
**DESCRIPTION**: Add ui5-task-zipper to produce ./dist/archive.zip during npm run build. Update package.json devDependencies, add builder custom task in ui5.yaml or use a dedicated build.yaml, then run the ui5 build command or npm script.
**LANGUAGE**: JSON
**CODE**:
```json
// package.json (add to devDependencies)
"ui5-task-zipper": "latest"
```
**LANGUAGE**: YAML
**CODE**:
```YAML
# ui5.yaml (builder section example)
builder:
  customTasks:
    - name: ui5-task-zipper
      afterTask: generateVersionInfo
      configuration:
        archiveName: "archive"          
        keepResources: true
```
**LANGUAGE**: YAML
**CODE**:
```yaml
# build.yaml (alternative dedicated build configuration)
# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json

specVersion: "3.1"
metadata:
  name: <your-project-name>
type: application  
builder:
  customTasks:
    - name: ui5-task-zipper
      afterTask: generateVersionInfo
      configuration:
        archiveName: "archive"          
        keepResources: true
```
**LANGUAGE**: bash
**CODE**:
```bash
# Build with the dedicated configuration to produce ./dist/archive.zip
npx ui5 build --config build.yaml

# Optional: add script to package.json
"archive": "ui5 build --config build.yaml"
```
**LANGUAGE**: text
**CODE**:
```text
When npm run build or npx ui5 build is executed, ui5-task-zipper will generate ./dist/archive.zip.
Update your deployment scripts to point to ./dist/archive.zip as the archive-path.
```
**LANGUAGE**: text
**CODE**:
```text
Example build log lines showing the custom task execution:
info project1 › Running task ui5-task-zipper...
info ProjectBuilder Build succeeded in 199 ms
```

**STEP**: 8 — Additional operational notes
**DESCRIPTION**: Extra actionable notes for CI and debugging.
**LANGUAGE**: text
**CODE**:
```text
1. Appending additional HTTP headers for deployment is not supported via the CLI or ui5-deploy.yaml.
2. Enable debug logging when running deploy tasks:
   # Using npm scripts
   DEBUG=* npm run deploy
   # Or when using the CLI directly
   DEBUG=* npx fiori deploy ...
```
--------------------------------

**TITLE**: Consuming and Validating SAP BTP Destinations for OData XML Services (Northwind example)

**INTRODUCTION**: This document shows step-by-step, actionable configuration and validation examples to consume OData XML services using SAP BTP destinations. It includes destination property examples, verification commands (curl), environment checks, and common misconfiguration fixes. Use these snippets directly when creating or validating destinations in SAP BTP, SAP Business Application Studio, Service Centre, or when testing via terminal/browser.

**TAGS**: SAP BTP, destination, OData, OData V2, OData V4, Fiori tools, northwind, curl, dynamic_dest

STEP: 1 — Prerequisites
DESCRIPTION: Ensure the environment and permissions are ready before creating or testing destinations.
LANGUAGE: text
CODE:
```text
- SAP Cloud Foundry Runtime configured in your SAP BTP subaccount.
- Admin rights to SAP BTP cockpit to modify destinations.
- Knowledge of SAP BTP destinations and SAP Business Application Studio.
- Use case restricted to OData XML services for SAP Fiori tools generator.
```

STEP: 2 — Flow Diagram (request flow using a destination with basic auth)
DESCRIPTION: Sequence diagram describing how a browser -> BTP app -> Destination -> External API flow works (basic auth example).
LANGUAGE: mermaid
CODE:
```mermaid
sequenceDiagram
    participant User
    participant Browser as Web Browser
    participant BTPApp as SAP BTP Application
    participant DestinationService as SAP BTP Destination Service
    participant ExternalAPI as External Basic Auth API Endpoint

    User->>Browser: 1. Accesses a BTP app URL such as an SAP Fiori launchpad tile.
    Browser->>BTPApp: 2. Requests data or an action requiring an external API call.
    BTPApp->>DestinationService: 3. Looks up the destination "MyBasicAuthEndpoint".
    DestinationService->>BTPApp: 4. Provides the destination configuration which includes the URL and basic auth username and password.
    BTPApp->>ExternalAPI: 5. Makes an API call: a HTTP request with the "Authorization: Basic ..." header.
    ExternalAPI->>BTPApp: 6. Validates credentials and responds with data.
    BTPApp->>Browser: 7. Sends the processed data and the response.
    Browser->>User: 8. Displays the data and confirms the action.
```

STEP: 3 — Sample Microsoft OData XML Service Endpoints
DESCRIPTION: Public service examples used for testing (Northwind).
LANGUAGE: text
CODE:
```text
#1
https://services.odata.org/v2/northwind/northwind.svc/
#2
https://services.odata.org/V3/Northwind/Northwind.svc/
```

STEP: 4 — Sample SAP BTP Destination (northwind, NoAuthentication, Internet proxy)
DESCRIPTION: Importable destination snippet. Use in SAP BTP Cockpit -> Destinations -> Import. Preserve property names exactly.
LANGUAGE: properties
CODE:
```
#
Type=HTTP
HTML5.DynamicDestination=true
Authentication=NoAuthentication
HTML5.Timeout=60000
WebIDEEnabled=true
ProxyType=Internet
URL=https\://services.odata.org
Name=northwind
WebIDEUsage=odata_gen
```
DESCRIPTION (additional): Screenshot file referenced: northwind_destination.png?raw=true. Import file reference: [northwind?raw=true].

STEP: 5 — Properties Summary (action-oriented)
DESCRIPTION: Key properties to set and their actionable meaning. Apply when creating or troubleshooting destinations.
LANGUAGE: text
CODE:
```text
- WebIDEUsage:
  - Use 'odata_gen' to target a specific OData service endpoint.
  - Use 'odata_abap' to allow tooling to query ABAP OData catalogs (V2/V4). Do NOT set both.

- WebIDEEnabled=true: Allows use with SAP Business Application Studio.

- HTML5.Timeout=60000: Timeout in ms for destination responses.

- HTML5.DynamicDestination=true: Enables runtime dynamic destinations for HTML5/Fiori apps.

- Authentication:
  - Set to NoAuthentication, BasicAuthentication, or OAuth2ClientCredentials depending on the endpoint.
```

STEP: 6 — Understanding WebIDEUsage (values and when to use)
DESCRIPTION: Use these values depending on generator/tooling needs. Keep only the one that applies.
LANGUAGE: text
CODE:
```text
Common values:
- odata_gen  => Use when you know the exact service endpoint to call (individual service).
- odata_abap => Use to consume OData V2/V4 ABAP catalogs (searchable list of services).
Note: odata_gen and odata_abap are mutually exclusive for a given destination.
```

STEP: 7 — WebIDEAdditionalData behavior and examples
DESCRIPTION: Use WebIDEAdditionalData=full_url when the destination URL is already the complete final service URL (prevents tooling from appending service paths).
LANGUAGE: text
CODE:
```text
- Without WebIDEAdditionalData:
  - Destination is treated as a base host; tooling appends service paths (e.g., /sap/opu/odata/...).

- With WebIDEAdditionalData=full_url:
  - Destination is treated as a full URL; tooling does NOT append extra paths.
```

STEP: 8 — Example where destination must be full URL (use WebIDEAdditionalData=full_url)
DESCRIPTION: Destination configured with a hardcoded full service URL. Import this when the URL already includes the service root/path.
LANGUAGE: properties
CODE:
```
#
Type=HTTP
HTML5.DynamicDestination=true
Authentication=NoAuthentication
HTML5.Timeout=60000
WebIDEEnabled=true
ProxyType=Internet
WebIDEAdditionalData=full_url
URL=https\://services.odata.org/v2/northwind/northwind.svc/
Name=northwind_fullurl
WebIDEUsage=odata_gen
```

STEP: 9 — Test individual OData service via curl (odata_gen)
DESCRIPTION: Use these curl commands to validate that the destination plus service path resolves correctly via SAP Business Application Studio proxy. Escape $ with backslash in shell.
LANGUAGE: bash
CODE:
```bash
curl -L "https://northwind.dest/v2/northwind/northwind.svc/" -vs > curl-datasrv-output.txt 2>&1

curl -L "https://northwind.dest/v2/northwind/northwind.svc/\$metadata" -vs > curl-datasrv-meta-output.txt 2>&1
```
DESCRIPTION (action): Replace northwind.dest with <destination-name>.dest. These commands save verbose output (headers + body) to files for debugging.

STEP: 10 — Test OData catalogs via curl (odata_abap)
DESCRIPTION: Use these curl commands when your destination uses WebIDEUsage=odata_abap (ABAP catalogs). Escape $ with backslash in shell.
LANGUAGE: bash
CODE:
```bash
# OData V2 Catalog
curl -L "https://<destination-name>.dest/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection" -vs > curl-v2catalog-output.txt 2>&1

# OData V4 Catalog
curl -L "https://<destination_name>.dest/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?\$expand=DefaultSystem(\$expand=Services)" -vs > curl-v4catalog-output.txt 2>&1
```
DESCRIPTION (note): These catalog endpoints only exist on ABAP systems; non-ABAP destinations (e.g., northwind) return 404.

STEP: 11 — Environment Check using SAP Business Application Studio
DESCRIPTION: Run the Environment Check to validate destination configuration and connectivity, and generate a diagnostics zip for support.
LANGUAGE: text
CODE:
```text
1. Open SAP Business Application Studio.
2. Open Command Palette (View -> Find Command).
3. Run: Fiori: Open Environment Check
4. Click 'Check Destination', choose your destination.
5. Enter credentials if prompted.
6. Click 'Save and view results'.
7. Review 'Preview results.md' -> 'Destination Details' for missing params.
8. Attach generated zip to support tickets (includes trace logs and service list).
```

STEP: 12 — Common Error: Incorrect destination URL that includes query/path fragments
DESCRIPTION: If the destination URL contains extra paths or query params, tooling appends service paths producing invalid final URLs (404 or 401/403). Example of incorrect URL and the invalid final URL produced.
LANGUAGE: text
CODE:
```
# Incorrect destination URL configured:
https://services.odata.org/odata/$format=JSON
```
LANGUAGE: text
CODE:
```
# Resulting constructed (invalid) URL:
https://services.odata.org/odata/$format=JSON/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection
```
DESCRIPTION (action): Fix by setting URL to base host: https://services.odata.org and optionally use WebIDEAdditionalData=full_url when targeting a specific pre-built service URL.

STEP: 13 — Fix: Destination configured as full URL with WebIDEAdditionalData=full_url and testing via curl
DESCRIPTION: When the destination is a full/pre-built service URL, use WebIDEAdditionalData=full_url and test via the .dest proxy.
LANGUAGE: properties
CODE:
```
#
Type=HTTP
HTML5.DynamicDestination=true
Authentication=NoAuthentication
HTML5.Timeout=60000
WebIDEEnabled=true
ProxyType=Internet
WebIDEAdditionalData=full_url
URL=https\://services.odata.org/v2/northwind/northwind.svc/
Name=northwind_fullurl
WebIDEUsage=odata_gen
```
LANGUAGE: bash
CODE:
```bash
curl -L "https://northwind_fullurl.dest/" -vs > curl-fullurl-output.txt 2>&1

curl -L "https://northwind_fullurl.dest/\$metadata" -vs > curl-fullurl-meta-output.txt 2>&1
```

STEP: 14 — Dynamic Destinations: validate outside Business Application Studio via launchpad endpoint
DESCRIPTION: Use the dynamic_dest path on your SAP BTP launchpad to validate a destination directly from SAP Fiori launchpad. Ensure your subaccount is configured to expose dynamic_dest (e.g., via SAP Build Work Zone).
LANGUAGE: text
CODE:
```text
Prerequisites:
- Destination uses HTML5.DynamicDestination=true and WebIDEEnabled=true.
- You know your subaccount Subdomain and API endpoint (e.g., mytrial-account, https://api.cf.eu10.hana.ondemand.com).

Template:
https://<your-subaccount-subdomain>.launchpad.cfapps.<your-region-api-endpoint>.hana.ondemand.com/dynamic_dest/<your-destination-name>/<path-to-your-OData-metadata-or-service-path>

Example base:
https://mytrial-account.launchpad.cfapps.us10.hana.ondemand.com/dynamic_dest/mys4hc-destination/

Examples:
- OData V2 catalog:
  https://mytrial-account.launchpad.cfapps.us10.hana.ondemand.com/dynamic_dest/mys4hc-destination/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection

- OData V4 catalog:
  https://mytrial-account.launchpad.cfapps.us10.hana.ondemand.com/dynamic_dest/mys4hc-destination/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)
```

STEP: 15 — License
DESCRIPTION: Project license reference.
LANGUAGE: text
CODE:
```text
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the LICENSE file: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Running SAP Fiori Tools Headless Generator

**INTRODUCTION**: Use a JSON configuration containing all required properties to run the SAP Fiori Tools generators in headless mode. This enables automated, repeatable creation or augmentation of applications (either appending a UI to a CAP project or generating a standalone SAP Fiori UI app) with a managed approuter configuration.

**TAGS**: fiori-samples, headless, fiori-tools, CAP, fiori-ui, approuter, json, automation

**STEP**: 1 — CAP headless generator

**DESCRIPTION**: Append a SAP Fiori UI application with a managed approuter configuration to an existing CAP project by providing a complete JSON payload to the CAP headless generator. The payload must include every mandatory property defined by the generator. Consult the CAP headless README for the configuration schema, example payloads, and exact invocation instructions. Typical workflow:
- Create a JSON configuration file (e.g., headless-config.json) in the project root.
- Ensure all mandatory properties are present in the JSON payload.
- Execute the headless generator as described in cap/README.md (follow the exact CLI/command documented there).

Preserved reference files:
- cap/README.md — contains schema, examples, and invocation instructions.

**LANGUAGE**: text

**CODE**:
```text
File reference: cap/README.md
Location: cap/README.md
```

**STEP**: 2 — Fiori UI headless generator

**DESCRIPTION**: Generate a standalone SAP Fiori UI application with a managed approuter configuration using the headless UI generator. Provide a JSON payload that contains all required fields. Consult the Fiori UI headless README for the exact configuration schema, mandatory properties, sample payloads, options, and the precise command to run the generator. Typical workflow:
- Create a JSON configuration file (e.g., headless-ui-config.json).
- Populate all mandatory values as specified by the fioriui/README.md schema.
- Run the headless generator following the instructions in fioriui/README.md.

Preserved reference files:
- fioriui/README.md — contains schema, examples, and invocation instructions.

**LANGUAGE**: text

**CODE**:
```text
File reference: fioriui/README.md
Location: fioriui/README.md
```

**STEP**: 3 — License

**DESCRIPTION**: Project licensing information and exceptions are provided. Preserve or reference this when redistributing or modifying generated code.

**LANGUAGE**: text

**CODE**:
```text
License: Apache Software License, version 2.0 (with exceptions noted)
File reference: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Running CAP Headless (append SAP Fiori UI + managed approuter to CAP)

**INTRODUCTION**: Use the SAP Fiori headless generator to append a UI application and managed approuter configuration to an existing CAP project. This doc shows prerequisites, an optional CAP project creation command, the required cap_app_config.json example, and exact generator commands with options.

**TAGS**: fiori, CAP, headless, SAP, UI5, approuter, Cloud Foundry, yo, generator, CDS

**STEP**: 1 — Prerequisites

**DESCRIPTION**: Ensure the CAP development kit is installed globally. Run this from a new terminal window if needed.

**LANGUAGE**: Bash

**CODE**:
```bash
npm i -g @sap/cds-dk
```

**STEP**: 2 — (Optional) Create a CAP project with sample data and HANA

**DESCRIPTION**: One-line command to scaffold a CAP project named managedAppCAPProject, add a tiny sample, HANA and MTA support, install dependencies, build for HANA, and prepare generated db package.json for local install.

**LANGUAGE**: Bash

**CODE**:
```bash
cds init managedAppCAPProject && cd managedAppCAPProject && cds add tiny-sample && cds add hana && cds add mta && npm install && cds build --for hana && cp gen/db/package.json db && npm i
```

**STEP**: 3 — Create cap_app_config.json and edit project/service/deploy properties

**DESCRIPTION**: Create the headless input file then update the properties to reflect your CAP project root, CAP service details, UI project name, target folder, and deploy settings. The sample contains fields you must review and update (project.targetFolder, service.capService.serviceName/serviceCdsPath, entityConfig, and deployConfig).

**LANGUAGE**: Bash

**CODE**:
```bash
touch cap_app_config.json
```

**STEP**: 4 — cap_app_config.json example (update fields to match your project)

**DESCRIPTION**: Copy this JSON into cap_app_config.json and edit values (paths, names, and booleans) as required. Note: comments (// ...) are explanatory — retain or remove when saving in strict JSON parsers.

**LANGUAGE**: JSON

**CODE**:
```JSON
{
    "version": "0.1",
    "floorplan": "FE_LROP", // Fiori Elements List Report Object Page
    "project":
    {
        "title": "Project's \"Title\"",
        "description": "Test 'Project' \"Description\"",
        "namespace": "cap.namespace", // Update or remove if not required
        "ui5Version": "1.90.0",
        "localUI5Version": "1.82.2",
        "name": "mylropproject", // SAP Fiori UI project name
        "sapux": true,
        "targetFolder": "/Users/MyUser/Documents/managedAppCAPProject/app/" // Target location of new project appended with project name i.e. /Users/MyUser/Documents/managedAppCAPProject/app/mylropproject
    },
    "service":
    {
        "servicePath": "/odata/v4/catalog/",
        "capService":
        {
            "projectPath": "./",
            "serviceName": "CatalogService",
            "serviceCdsPath": "srv/cat-service.cds",
            "appPath": "app" // The CAP default apps folder, only update if not using default CAP settings
        }
    },
    "entityConfig":
    {
        "mainEntity":
        {
            "entityName": "Books"
        }
    },
    "deployConfig":
    {
        "deployTarget": "CF", // Cloud Foundry
        "destinationName": "fiori-default-srv-api", // Should be not be changed, reflects the destination instance exposing the CAP project
        "addToManagedAppRouter": true, // Toggle this value if a mananaged approuter already exists or if the using a standalone appprouter
        "addMTADestination": true // Toggle this value if the existing mta.yaml already contains a destination service that you want to use
    }
}
```

**STEP**: 5 — Run the headless generator (command template)

**DESCRIPTION**: From the root of the CAP project, run the yeoman headless generator pointing to your cap_app_config.json. Optionally specify an output path / working directory. Use --force to overwrite, --skipInstall to skip install phase, --deleteFile to remove input config, and --logLevel to control logging.

- Command template:
  yo @sap/fiori-elements:headless <path-to-config-file> <optional-path-to-output-or-cwd> <options>

**LANGUAGE**: Bash

**CODE**:
```bash
yo @sap/fiori-elements:headless <path-to-config-file> <optional-path-to-output-or-cwd> <options>
```

**STEP**: 6 — Examples: run generator with common flags

**DESCRIPTION**: Example invocations — run from CAP project root. First example uses current directory as output, second enables debug logging and skipInstall.

**LANGUAGE**: Bash

**CODE**:
```bash
yo @sap/fiori:headless ./cap_app_config.json ./
```

```bash
yo @sap/fiori:headless ./cap_app_config.json --logLevel debug --skipInstall
```

**STEP**: 7 — Generator options reference

**DESCRIPTION**: Quick reference for available command-line options.

**LANGUAGE**: PlainText

**CODE**:
```
--force        : Overwrite existing output files
--skipInstall  : Skip the install phase after generation
--deleteFile   : Delete the input app configuration file after generation
--logLevel     : debug | info
```

**STEP**: 8 — Gotchas / Notes

**DESCRIPTION**: Important configuration gotchas to avoid common errors. Update your config accordingly.

**LANGUAGE**: PlainText

**CODE**:
```
1. To generate a SAP Fiori UI without Cloud Foundry deploy config, remove "deployConfig" from cap_app_config.json.
2. If your CAP project already uses an existing "managed" or "standalone" approuter configuration, set "addToManagedAppRouter" to false or remove it.
3. Ensure paths in cap_app_config.json (project.targetFolder, service.capService.serviceCdsPath, service.capService.projectPath) point to actual locations in your repository.
4. JSON comments (// ...) are explanatory; remove them if your tooling requires strict JSON.
```

**STEP**: 9 — License

**DESCRIPTION**: Project license information.

**LANGUAGE**: PlainText

**CODE**:
```
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the LICENSE file at /LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Running SAP UI Headless — Generate SAP Fiori UI with managed approuter configuration

**INTRODUCTION**: Step-by-step instructions to generate a SAP Fiori UI application using the SAP Yeoman headless generator. Use a JSON configuration file that contains OData EDMX metadata (as raw XML string) and deployment options to produce a UI5 project and optional Cloud Foundry / managed approuter artifacts.

**TAGS**: fiori-samples, sap, ui5, cap, headless, generator, odata, sap-fiori, cf

**STEP**: 1 — Prerequisites

**DESCRIPTION**: Ensure you have the OData service metadata and prepare the XML for embedding into the JSON config. When embedding raw XML into JSON, escape each double quote with a backslash (\").

**LANGUAGE**: Markdown

**CODE**:
```text
Prerequisites:
- OData XML metadata is required. Example metadata URL:
  https://services.odata.org/V2/Northwind/Northwind.svc/$metadata

- When appending raw XML into the JSON configuration, replace each " with \"
  so the XML is valid as a JSON string.
```

**STEP**: 2 — Create the SAP Fiori app configuration file

**DESCRIPTION**: Create a new configuration file (example name: app_config.json). Edit this file to reflect your CAP project values, CAP Service properties (servicePath, host, edmx), UI settings, entity selection, FLP configuration and deployment choices. Update project.targetFolder to the target location where the new project directory (project.name) will be created.

**LANGUAGE**: Bash

**CODE**:
```bash
# Create an app configuration file in the current directory
touch app_config.json
```

**STEP**: 3 — Example app_config.json — full configuration (edit to your project)

**DESCRIPTION**: Use the JSON below as a template. Update values for project.title, project.namespace, project.ui5Version, project.localUI5Version, project.name, project.targetFolder, service.servicePath, service.host, and deployConfig.destinationName. The edmx value contains the raw OData XML metadata as a string — ensure quotes are escaped. Remove flpConfig to skip FLP/Build Work Zone configuration. Remove deployConfig to skip Cloud Foundry deployment and managed approuter generation.

**LANGUAGE**: JSON

**CODE**:
```JSON
{
  "version": "0.2",
  "floorplan": "FE_LROP",
  "project": {
    "title": "Project's \"Title\"",
    "description": "Test 'Project' \"Description\"",
    "namespace": "ns.test", // Update or remove if not required
    "ui5Version": "1.84.0",
    "localUI5Version": "1.82.2",
    "enableTelemetry": true,
    "name": "northwind", // SAP Fiori UI project name
    "sapux": true,
    "targetFolder": "/Users/MyUser/Documents/" // Target location of new project appended with project name i.e. /Users/MyUser/Documents/northwind
  },
  "service": {
    "servicePath": "/V2/Northwind/Northwind.svc/",
    "host": "https://services.odata.org",
    "edmx": "<?xml version=\"1.0\" encoding=\"utf-8\"?><edmx:Edmx Version=\"1.0\" xmlns:edmx=\"http://schemas.microsoft.com/ado/2007/06/edmx\"><edmx:DataServices m:DataServiceVersion=\"1.0\" m:MaxDataServiceVersion=\"2.0\" xmlns:m=\"http://schemas.microsoft.com/ado/2007/08/dataservices/metadata\"><Schema Namespace=\"NorthwindModel\" xmlns=\"http://schemas.microsoft.com/ado/2009/11/edm\"><EntityType Name=\"Category\"><Key><PropertyRef Name=\"CategoryID\" /></Key><Property Name=\"CategoryID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"CategoryName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Description\" Type=\"Edm.String\" MaxLength=\"Max\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Picture\" Type=\"Edm.Binary\" MaxLength=\"Max\" FixedLength=\"false\" /><NavigationProperty Name=\"Products\" Relationship=\"NorthwindModel.FK_Products_Categories\" ToRole=\"Products\" FromRole=\"Categories\" /></EntityType><EntityType Name=\"CustomerDemographic\"><Key><PropertyRef Name=\"CustomerTypeID\" /></Key><Property Name=\"CustomerTypeID\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"10\" FixedLength=\"true\" Unicode=\"true\" /><Property Name=\"CustomerDesc\" Type=\"Edm.String\" MaxLength=\"Max\" FixedLength=\"false\" Unicode=\"true\" /><NavigationProperty Name=\"Customers\" Relationship=\"NorthwindModel.CustomerCustomerDemo\" ToRole=\"Customers\" FromRole=\"CustomerDemographics\" /></EntityType><EntityType Name=\"Customer\"><Key><PropertyRef Name=\"CustomerID\" /></Key><Property Name=\"CustomerID\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"5\" FixedLength=\"true\" Unicode=\"true\" /><Property Name=\"CompanyName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ContactName\" Type=\"Edm.String\" MaxLength=\"30\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ContactTitle\" Type=\"Edm.String\" MaxLength=\"30\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Address\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"City\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Region\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"PostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Country\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Phone\" Type=\"Edm.String\" MaxLength=\"24\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Fax\" Type=\"Edm.String\" MaxLength=\"24\" FixedLength=\"false\" Unicode=\"true\" /><NavigationProperty Name=\"Orders\" Relationship=\"NorthwindModel.FK_Orders_Customers\" ToRole=\"Orders\" FromRole=\"Customers\" /><NavigationProperty Name=\"CustomerDemographics\" Relationship=\"NorthwindModel.CustomerCustomerDemo\" ToRole=\"CustomerDemographics\" FromRole=\"Customers\" /></EntityType><EntityType Name=\"Employee\"><Key><PropertyRef Name=\"EmployeeID\" /></Key><Property Name=\"EmployeeID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"LastName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"20\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"FirstName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Title\" Type=\"Edm.String\" MaxLength=\"30\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"TitleOfCourtesy\" Type=\"Edm.String\" MaxLength=\"25\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"BirthDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"HireDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"Address\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"City\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Region\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"PostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Country\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"HomePhone\" Type=\"Edm.String\" MaxLength=\"24\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Extension\" Type=\"Edm.String\" MaxLength=\"4\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Photo\" Type=\"Edm.Binary\" MaxLength=\"Max\" FixedLength=\"false\" /><Property Name=\"Notes\" Type=\"Edm.String\" MaxLength=\"Max\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ReportsTo\" Type=\"Edm.Int32\" /><Property Name=\"PhotoPath\" Type=\"Edm.String\" MaxLength=\"255\" FixedLength=\"false\" Unicode=\"true\" /><NavigationProperty Name=\"Employees1\" Relationship=\"NorthwindModel.FK_Employees_Employees\" ToRole=\"Employees1\" FromRole=\"Employees\" /><NavigationProperty Name=\"Employee1\" Relationship=\"NorthwindModel.FK_Employees_Employees\" ToRole=\"Employees\" FromRole=\"Employees1\" /><NavigationProperty Name=\"Orders\" Relationship=\"NorthwindModel.FK_Orders_Employees\" ToRole=\"Orders\" FromRole=\"Employees\" /><NavigationProperty Name=\"Territories\" Relationship=\"NorthwindModel.EmployeeTerritories\" ToRole=\"Territories\" FromRole=\"Employees\" /></EntityType><EntityType Name=\"Order_Detail\"><Key><PropertyRef Name=\"OrderID\" /><PropertyRef Name=\"ProductID\" /></Key><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"ProductID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"UnitPrice\" Type=\"Edm.Decimal\" Nullable=\"false\" Precision=\"19\" Scale=\"4\" /><Property Name=\"Quantity\" Type=\"Edm.Int16\" Nullable=\"false\" /><Property Name=\"Discount\" Type=\"Edm.Single\" Nullable=\"false\" /><NavigationProperty Name=\"Order\" Relationship=\"NorthwindModel.FK_Order_Details_Orders\" ToRole=\"Orders\" FromRole=\"Order_Details\" /><NavigationProperty Name=\"Product\" Relationship=\"NorthwindModel.FK_Order_Details_Products\" ToRole=\"Products\" FromRole=\"Order_Details\" /></EntityType><EntityType Name=\"Order\"><Key><PropertyRef Name=\"OrderID\" /></Key><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"CustomerID\" Type=\"Edm.String\" MaxLength=\"5\" FixedLength=\"true\" Unicode=\"true\" /><Property Name=\"EmployeeID\" Type=\"Edm.Int32\" /><Property Name=\"OrderDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"RequiredDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"ShippedDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"ShipVia\" Type=\"Edm.Int32\" /><Property Name=\"Freight\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /><Property Name=\"ShipName\" Type=\"Edm.String\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipAddress\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipCity\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipRegion\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipPostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipCountry\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><NavigationProperty Name=\"Customer\" Relationship=\"NorthwindModel.FK_Orders_Customers\" ToRole=\"Customers\" FromRole=\"Orders\" /><NavigationProperty Name=\"Employee\" Relationship=\"NorthwindModel.FK_Orders_Employees\" ToRole=\"Employees\" FromRole=\"Orders\" /><NavigationProperty Name=\"Order_Details\" Relationship=\"NorthwindModel.FK_Order_Details_Orders\" ToRole=\"Order_Details\" FromRole=\"Orders\" /><NavigationProperty Name=\"Shipper\" Relationship=\"NorthwindModel.FK_Orders_Shippers\" ToRole=\"Shippers\" FromRole=\"Orders\" /></EntityType><EntityType Name=\"Product\"><Key><PropertyRef Name=\"ProductID\" /></Key><Property Name=\"ProductID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"SupplierID\" Type=\"Edm.Int32\" /><Property Name=\"CategoryID\" Type=\"Edm.Int32\" /><Property Name=\"QuantityPerUnit\" Type=\"Edm.String\" MaxLength=\"20\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"UnitPrice\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /><Property Name=\"UnitsInStock\" Type=\"Edm.Int16\" /><Property Name=\"UnitsOnOrder\" Type=\"Edm.Int16\" /><Property Name=\"ReorderLevel\" Type=\"Edm.Int16\" /><Property Name=\"Discontinued\" Type=\"Edm.Boolean\" Nullable=\"false\" /><NavigationProperty Name=\"Category\" Relationship=\"NorthwindModel.FK_Products_Categories\" ToRole=\"Categories\" FromRole=\"Products\" /><NavigationProperty Name=\"Order_Details\" Relationship=\"NorthwindModel.FK_Order_Details_Products\" ToRole=\"Order_Details\" FromRole=\"Products\" /><NavigationProperty Name=\"Supplier\" Relationship=\"NorthwindModel.FK_Products_Suppliers\" ToRole=\"Suppliers\" FromRole=\"Products\" /></EntityType><EntityType Name=\"Region\"><Key><PropertyRef Name=\"RegionID\" /></Key><Property Name=\"RegionID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"RegionDescription\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"50\" FixedLength=\"true\" Unicode=\"true\" /><NavigationProperty Name=\"Territories\" Relationship=\"NorthwindModel.FK_Territories_Region\" ToRole=\"Territories\" FromRole=\"Region\" /></EntityType><EntityType Name=\"Shipper\"><Key><PropertyRef Name=\"ShipperID\" /></Key><Property Name=\"ShipperID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"CompanyName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Phone\" Type=\"Edm.String\" MaxLength=\"24\" FixedLength=\"false\" Unicode=\"true\" /><NavigationProperty Name=\"Orders\" Relationship=\"NorthwindModel.FK_Orders_Shippers\" ToRole=\"Orders\" FromRole=\"Shippers\" /></EntityType><EntityType Name=\"Supplier\"><Key><PropertyRef Name=\"SupplierID\" /></Key><Property Name=\"SupplierID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"CompanyName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ContactName\" Type=\"Edm.String\" MaxLength=\"30\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ContactTitle\" Type=\"Edm.String\" MaxLength=\"30\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Address\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"City\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Region\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"PostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Country\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Phone\" Type=\"Edm.String\" MaxLength=\"24\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Fax\" Type=\"Edm.String\" MaxLength=\"24\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"HomePage\" Type=\"Edm.String\" MaxLength=\"Max\" FixedLength=\"false\" Unicode=\"true\" /><NavigationProperty Name=\"Products\" Relationship=\"NorthwindModel.FK_Products_Suppliers\" ToRole=\"Products\" FromRole=\"Suppliers\" /></EntityType><EntityType Name=\"Territory\"><Key><PropertyRef Name=\"TerritoryID\" /></Key><Property Name=\"TerritoryID\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"20\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"TerritoryDescription\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"50\" FixedLength=\"true\" Unicode=\"true\" /><Property Name=\"RegionID\" Type=\"Edm.Int32\" Nullable=\"false\" /><NavigationProperty Name=\"Region\" Relationship=\"NorthwindModel.FK_Territories_Region\" ToRole=\"Region\" FromRole=\"Territories\" /><NavigationProperty Name=\"Employees\" Relationship=\"NorthwindModel.EmployeeTerritories\" ToRole=\"Employees\" FromRole=\"Territories\" /></EntityType><EntityType Name=\"Alphabetical_list_of_product\"><Key><PropertyRef Name=\"CategoryName\" /><PropertyRef Name=\"Discontinued\" /><PropertyRef Name=\"ProductID\" /><PropertyRef Name=\"ProductName\" /></Key><Property Name=\"ProductID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"SupplierID\" Type=\"Edm.Int32\" /><Property Name=\"CategoryID\" Type=\"Edm.Int32\" /><Property Name=\"QuantityPerUnit\" Type=\"Edm.String\" MaxLength=\"20\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"UnitPrice\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /><Property Name=\"UnitsInStock\" Type=\"Edm.Int16\" /><Property Name=\"UnitsOnOrder\" Type=\"Edm.Int16\" /><Property Name=\"ReorderLevel\" Type=\"Edm.Int16\" /><Property Name=\"Discontinued\" Type=\"Edm.Boolean\" Nullable=\"false\" /><Property Name=\"CategoryName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /></EntityType><EntityType Name=\"Category_Sales_for_1997\"><Key><PropertyRef Name=\"CategoryName\" /></Key><Property Name=\"CategoryName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"CategorySales\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Current_Product_List\"><Key><PropertyRef Name=\"ProductID\" /><PropertyRef Name=\"ProductName\" /></Key><Property Name=\"ProductID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /></EntityType><EntityType Name=\"Customer_and_Suppliers_by_City\"><Key><PropertyRef Name=\"CompanyName\" /><PropertyRef Name=\"Relationship\" /></Key><Property Name=\"City\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"CompanyName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ContactName\" Type=\"Edm.String\" MaxLength=\"30\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Relationship\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"9\" FixedLength=\"false\" Unicode=\"false\" /></EntityType><EntityType Name=\"Invoice\"><Key><PropertyRef Name=\"CustomerName\" /><PropertyRef Name=\"Discount\" /><PropertyRef Name=\"OrderID\" /><PropertyRef Name=\"ProductID\" /><PropertyRef Name=\"ProductName\" /><PropertyRef Name=\"Quantity\" /><PropertyRef Name=\"Salesperson\" /><PropertyRef Name=\"ShipperName\" /><PropertyRef Name=\"UnitPrice\" /></Key><Property Name=\"ShipName\" Type=\"Edm.String\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipAddress\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipCity\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipRegion\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipPostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipCountry\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"CustomerID\" Type=\"Edm.String\" MaxLength=\"5\" FixedLength=\"true\" Unicode=\"true\" /><Property Name=\"CustomerName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Address\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"City\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Region\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"PostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Country\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Salesperson\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"31\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"OrderDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"RequiredDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"ShippedDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"ShipperName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ProductID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"UnitPrice\" Type=\"Edm.Decimal\" Nullable=\"false\" Precision=\"19\" Scale=\"4\" /><Property Name=\"Quantity\" Type=\"Edm.Int16\" Nullable=\"false\" /><Property Name=\"Discount\" Type=\"Edm.Single\" Nullable=\"false\" /><Property Name=\"ExtendedPrice\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /><Property Name=\"Freight\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Order_Details_Extended\"><Key><PropertyRef Name=\"Discount\" /><PropertyRef Name=\"OrderID\" /><PropertyRef Name=\"ProductID\" /><PropertyRef Name=\"ProductName\" /><PropertyRef Name=\"Quantity\" /><PropertyRef Name=\"UnitPrice\" /></Key><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"ProductID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"UnitPrice\" Type=\"Edm.Decimal\" Nullable=\"false\" Precision=\"19\" Scale=\"4\" /><Property Name=\"Quantity\" Type=\"Edm.Int16\" Nullable=\"false\" /><Property Name=\"Discount\" Type=\"Edm.Single\" Nullable=\"false\" /><Property Name=\"ExtendedPrice\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Order_Subtotal\"><Key><PropertyRef Name=\"OrderID\" /></Key><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"Subtotal\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Orders_Qry\"><Key><PropertyRef Name=\"CompanyName\" /><PropertyRef Name=\"OrderID\" /></Key><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"CustomerID\" Type=\"Edm.String\" MaxLength=\"5\" FixedLength=\"true\" Unicode=\"true\" /><Property Name=\"EmployeeID\" Type=\"Edm.Int32\" /><Property Name=\"OrderDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"RequiredDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"ShippedDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"ShipVia\" Type=\"Edm.Int32\" /><Property Name=\"Freight\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /><Property Name=\"ShipName\" Type=\"Edm.String\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipAddress\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipCity\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipRegion\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipPostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipCountry\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"CompanyName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Address\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"City\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Region\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"PostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Country\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /></EntityType><EntityType Name=\"Product_Sales_for_1997\"><Key><PropertyRef Name=\"CategoryName\" /><PropertyRef Name=\"ProductName\" /></Key><Property Name=\"CategoryName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ProductSales\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Products_Above_Average_Price\"><Key><PropertyRef Name=\"ProductName\" /></Key><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"UnitPrice\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Products_by_Category\"><Key><PropertyRef Name=\"CategoryName\" /><PropertyRef Name=\"Discontinued\" /><PropertyRef Name=\"ProductName\" /></Key><Property Name=\"CategoryName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"QuantityPerUnit\" Type=\"Edm.String\" MaxLength=\"20\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"UnitsInStock\" Type=\"Edm.Int16\" /><Property Name=\"Discontinued\" Type=\"Edm.Boolean\" Nullable=\"false\" /></EntityType><EntityType Name=\"Sales_by_Category\"><Key><PropertyRef Name=\"CategoryID\" /><PropertyRef Name=\"CategoryName\" /><PropertyRef Name=\"ProductName\" /></Key><Property Name=\"CategoryID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"CategoryName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ProductSales\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Sales_Totals_by_Amount\"><Key><PropertyRef Name=\"CompanyName\" /><PropertyRef Name=\"OrderID\" /></Key><Property Name=\"SaleAmount\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"CompanyName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShippedDate\" Type=\"Edm.DateTime\" Precision=\"3\" /></EntityType><EntityType Name=\"Summary_of_Sales_by_Quarter\"><Key><PropertyRef Name=\"OrderID\" /></Key><Property Name=\"ShippedDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"Subtotal\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Summary_of_Sales_by_Year\"><Key><PropertyRef Name=\"OrderID\" /></Key><Property Name=\"ShippedDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"Subtotal\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><Association Name=\"FK_Products_Categories\"><End Type=\"NorthwindModel.Category\" Role=\"Categories\" Multiplicity=\"0..1\" /><End Type=\"NorthwindModel.Product\" Role=\"Products\" Multiplicity=\"*\" /><ReferentialConstraint><Principal Role=\"Categories\"><PropertyRef Name=\"CategoryID\" /></Principal><Dependent Role=\"Products\"><PropertyRef Name=\"CategoryID\" /></Dependent></ReferentialConstraint></Association><Association Name=\"CustomerCustomerDemo\"><End Type=\"NorthwindModel.Customer\" Role=\"Customers\" Multiplicity=\"*\" /><End Type=\"NorthwindModel.CustomerDemographic\" Role=\"CustomerDemographics\" Multiplicity=\"*\" /></Association><Association Name=\"FK_Orders_Customers\"><End Type=\"NorthwindModel.Customer\" Role=\"Customers\" Multiplicity=\"0..1\" /><End Type=\"NorthwindModel.Order\" Role=\"Orders\" Multiplicity=\"*\" /><ReferentialConstraint><Principal Role=\"Customers\"><PropertyRef Name=\"CustomerID\" /></Principal><Dependent Role=\"Orders\"><PropertyRef Name=\"CustomerID\" /></Dependent></ReferentialConstraint></Association><Association Name=\"FK_Employees_Employees\"><End Type=\"NorthwindModel.Employee\" Role=\"Employees\" Multiplicity=\"0..1\" /><End Type=\"NorthwindModel.Employee\" Role=\"Employees1\" Multiplicity=\"*\" /><ReferentialConstraint><Principal Role=\"Employees\"><PropertyRef Name=\"EmployeeID\" /></Principal><Dependent Role=\"Employees1\"><PropertyRef Name=\"ReportsTo\" /></Dependent></ReferentialConstraint></Association><Association Name=\"FK_Orders_Employees\"><End Type=\"NorthwindModel.Employee\" Role=\"Employees\" Multiplicity=\"0..1\" /><End Type=\"NorthwindModel.Order\" Role=\"Orders\" Multiplicity=\"*\" /><ReferentialConstraint><Principal Role=\"Employees\"><PropertyRef Name=\"EmployeeID\" /></Principal><Dependent Role=\"Orders\"><PropertyRef Name=\"EmployeeID\" /></Dependent></ReferentialConstraint></Association><Association Name=\"EmployeeTerritories\"><End Type=\"NorthwindModel.Territory\" Role=\"Territories\" Multiplicity=\"*\" /><End Type=\"NorthwindModel.Employee\" Role=\"Employees\" Multiplicity=\"*\" /></Association><Association Name=\"FK_Order_Details_Orders\"><End Type=\"NorthwindModel.Order\" Role=\"Orders\" Multiplicity=\"1\" /><End Type=\"NorthwindModel.Order_Detail\" Role=\"Order_Details\" Multiplicity=\"*\" /><ReferentialConstraint><Principal Role=\"Orders\"><PropertyRef Name=\"OrderID\" /></Principal><Dependent Role=\"Order_Details\"><PropertyRef Name=\"OrderID\" /></Dependent></ReferentialConstraint></Association><Association Name=\"FK_Order_Details_Products\"><End Type=\"NorthwindModel.Product\" Role=\"Products\" Multiplicity=\"1\" /><End Type=\"NorthwindModel.Order_Detail\" Role=\"Order_Details\" Multiplicity=\"*\" /><ReferentialConstraint><Principal Role=\"Products\"><PropertyRef Name=\"ProductID\" /></Principal><Dependent Role=\"Order_Details\"><PropertyRef Name=\"ProductID\" /></Dependent></ReferentialConstraint></Association><Association Name=\"FK_Orders_Shippers\"><End Type=\"NorthwindModel.Shipper\" Role=\"Shippers\" Multiplicity=\"0..1\" /><End Type=\"NorthwindModel.Order\" Role=\"Orders\" Multiplicity=\"*\" /><ReferentialConstraint><Principal Role=\"Shippers\"><PropertyRef Name=\"ShipperID\" /></Principal><Dependent Role=\"Orders\"><PropertyRef Name=\"ShipVia\" /></Dependent></ReferentialConstraint></Association><Association Name=\"FK_Products_Suppliers\"><End Type=\"NorthwindModel.Supplier\" Role=\"Suppliers\" Multiplicity=\"0..1\" /><End Type=\"NorthwindModel.Product\" Role=\"Products\" Multiplicity=\"*\" /><ReferentialConstraint><Principal Role=\"Suppliers\"><PropertyRef Name=\"SupplierID\" /></Principal><Dependent Role=\"Products\"><PropertyRef Name=\"SupplierID\" /></Dependent></ReferentialConstraint></Association><Association Name=\"FK_Territories_Region\"><End Type=\"NorthwindModel.Region\" Role=\"Region\" Multiplicity=\"1\" /><End Type=\"NorthwindModel.Territory\" Role=\"Territories\" Multiplicity=\"*\" /><ReferentialConstraint><Principal Role=\"Region\"><PropertyRef Name=\"RegionID\" /></Principal><Dependent Role=\"Territories\"><PropertyRef Name=\"RegionID\" /></Dependent></ReferentialConstraint></Association></Schema><Schema Namespace=\"ODataWeb.Northwind.Model\" xmlns=\"http://schemas.microsoft.com/ado/2009/11/edm\"><EntityContainer Name=\"NorthwindEntities\" m:IsDefaultEntityContainer=\"true\"><EntitySet Name=\"Categories\" EntityType=\"NorthwindModel.Category\" /><EntitySet Name=\"CustomerDemographics\" EntityType=\"NorthwindModel.CustomerDemographic\" /><EntitySet Name=\"Customers\" EntityType=\"NorthwindModel.Customer\" /><EntitySet Name=\"Employees\" EntityType=\"NorthwindModel.Employee\" /><EntitySet Name=\"Order_Details\" EntityType=\"NorthwindModel.Order_Detail\" /><EntitySet Name=\"Orders\" EntityType=\"NorthwindModel.Order\" /><EntitySet Name=\"Products\" EntityType=\"NorthwindModel.Product\" /><EntitySet Name=\"Regions\" EntityType=\"NorthwindModel.Region\" /><EntitySet Name=\"Shippers\" EntityType=\"NorthwindModel.Shipper\" /><EntitySet Name=\"Suppliers\" EntityType=\"NorthwindModel.Supplier\" /><EntitySet Name=\"Territories\" EntityType=\"NorthwindModel.Territory\" /><EntitySet Name=\"Alphabetical_list_of_products\" EntityType=\"NorthwindModel.Alphabetical_list_of_product\" /><EntitySet Name=\"Category_Sales_for_1997\" EntityType=\"NorthwindModel.Category_Sales_for_1997\" /><EntitySet Name=\"Current_Product_Lists\" EntityType=\"NorthwindModel.Current_Product_List\" /><EntitySet Name=\"Customer_and_Suppliers_by_Cities\" EntityType=\"NorthwindModel.Customer_and_Suppliers_by_City\" /><EntitySet Name=\"Invoices\" EntityType=\"NorthwindModel.Invoice\" /><EntitySet Name=\"Order_Details_Extendeds\" EntityType=\"NorthwindModel.Order_Details_Extended\" /><EntitySet Name=\"Order_Subtotals\" EntityType=\"NorthwindModel.Order_Subtotal\" /><EntitySet Name=\"Orders_Qries\" EntityType=\"NorthwindModel.Orders_Qry\" /><EntitySet Name=\"Product_Sales_for_1997\" EntityType=\"NorthwindModel.Product_Sales_for_1997\" /><EntitySet Name=\"Products_Above_Average_Prices\" EntityType=\"NorthwindModel.Products_Above_Average_Price\" /><EntitySet Name=\"Products_by_Categories\" EntityType=\"NorthwindModel.Products_by_Category\" /><EntitySet Name=\"Sales_by_Categories\" EntityType=\"NorthwindModel.Sales_by_Category\" /><EntitySet Name=\"Sales_Totals_by_Amounts\" EntityType=\"NorthwindModel.Sales_Totals_by_Amount\" /><EntitySet Name=\"Summary_of_Sales_by_Quarters\" EntityType=\"NorthwindModel.Summary_of_Sales_by_Quarter\" /><EntitySet Name=\"Summary_of_Sales_by_Years\" EntityType=\"NorthwindModel.Summary_of_Sales_by_Year\" /><AssociationSet Name=\"FK_Products_Categories\" Association=\"NorthwindModel.FK_Products_Categories\"><End Role=\"Categories\" EntitySet=\"Categories\" /><End Role=\"Products\" EntitySet=\"Products\" /></AssociationSet><AssociationSet Name=\"CustomerCustomerDemo\" Association=\"NorthwindModel.CustomerCustomerDemo\"><End Role=\"CustomerDemographics\" EntitySet=\"CustomerDemographics\" /><End Role=\"Customers\" EntitySet=\"Customers\" /></AssociationSet><AssociationSet Name=\"FK_Orders_Customers\" Association=\"NorthwindModel.FK_Orders_Customers\"><End Role=\"Customers\" EntitySet=\"Customers\" /><End Role=\"Orders\" EntitySet=\"Orders\" /></AssociationSet><AssociationSet Name=\"FK_Employees_Employees\" Association=\"NorthwindModel.FK_Employees_Employees\"><End Role=\"Employees\" EntitySet=\"Employees\" /><End Role=\"Employees1\" EntitySet=\"Employees\" /></AssociationSet><AssociationSet Name=\"FK_Orders_Employees\" Association=\"NorthwindModel.FK_Orders_Employees\"><End Role=\"Employees\" EntitySet=\"Employees\" /><End Role=\"Orders\" EntitySet=\"Orders\" /></AssociationSet><AssociationSet Name=\"EmployeeTerritories\" Association=\"NorthwindModel.EmployeeTerritories\"><End Role=\"Employees\" EntitySet=\"Employees\" /><End Role=\"Territories\" EntitySet=\"Territories\" /></AssociationSet><AssociationSet Name=\"FK_Order_Details_Orders\" Association=\"NorthwindModel.FK_Order_Details_Orders\"><End Role=\"Order_Details\" EntitySet=\"Order_Details\" /><End Role=\"Orders\" EntitySet=\"Orders\" /></AssociationSet><AssociationSet Name=\"FK_Order_Details_Products\" Association=\"NorthwindModel.FK_Order_Details_Products\"><End Role=\"Order_Details\" EntitySet=\"Order_Details\" /><End Role=\"Products\" EntitySet=\"Products\" /></AssociationSet><AssociationSet Name=\"FK_Orders_Shippers\" Association=\"NorthwindModel.FK_Orders_Shippers\"><End Role=\"Orders\" EntitySet=\"Orders\" /><End Role=\"Shippers\" EntitySet=\"Shippers\" /></AssociationSet><AssociationSet Name=\"FK_Products_Suppliers\" Association=\"NorthwindModel.FK_Products_Suppliers\"><End Role=\"Products\" EntitySet=\"Products\" /><End Role=\"Suppliers\" EntitySet=\"Suppliers\" /></AssociationSet><AssociationSet Name=\"FK_Territories_Region\" Association=\"NorthwindModel.FK_Territories_Region\"><End Role=\"Region\" EntitySet=\"Regions\" /><End Role=\"Territories\" EntitySet=\"Territories\" /></AssociationSet></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>"
  },
  "entityConfig": {
    "mainEntity": { "entityName": "Categories" },
    "navigationEntity": { "EntitySet": "Products" }
  },
  "flpConfig": {
    "semanticObject": "mynorthwindproject",
    "action": "display",
    "title": "flpTitle"
  },
  "deployConfig": {
    "deployTarget": "CF",
    "destinationName": "MySubAccountDestination", // Refer to your SAP BTP subaccount destinations, update xs-app.json if not already generated
    "addToManagedAppRouter": true // Generate an mta.yaml with a managed approuter configuration
  }
}
```

**STEP**: 4 — Run the headless generator

**DESCRIPTION**: Change into the directory where you want the project created (the generator will create a directory named project.name under project.targetFolder if configured). Run the Yeoman SAP Fiori headless generator with your configuration file. Pass optional flags to control overwrite, install phase, deletion of the config file, and logging.

Syntax:
yo @sap/fiori:headless <path-to-config-file> <optional-path-to-output-or-cwd> <options>

Available options:
- --force : Overwrite existing output files
- --skipInstall : Skip the install phase to avoid running npm/yarn install
- --deleteFile : Delete the input app configuration file after generation
- --logLevel debug | info : Set logging verbosity

**LANGUAGE**: Bash

**CODE**:
```bash
# Example: basic run using config in current directory
yo @sap/fiori:headless ./app_config.json

# Example: run with debug logging and skip install
yo @sap/fiori:headless ./app_config.json --logLevel debug --skipInstall
```

**STEP**: 5 — Post-generation notes and gotchas

**DESCRIPTION**: Short actionable items to avoid common mistakes and to control optional outputs.

- To generate the SAP Fiori UI without Build Work Zone (FLP) remove the flpConfig node from app_config.json.
- To skip Cloud Foundry deployment and managed approuter artifacts remove the deployConfig node.
- If deployConfig.addToManagedAppRouter is true, generator will create mta.yaml and managed approuter setup; ensure deployConfig.destinationName matches a CF destination in your SAP BTP subaccount and update xs-app.json if needed.
- Ensure project.targetFolder exists and you have write permissions; the generator appends project.name to targetFolder to create the final path.

**LANGUAGE**: Markdown

**CODE**:
```text
Gotchas:
1. Remove flpConfig to skip FLP/Build Workzone configuration.
2. Remove deployConfig to skip Cloud Foundry / managed approuter configuration.
3. Verify destinationName in deployConfig matches your SAP BTP subaccount destinations.
4. Ensure quotes in edmx are escaped (replace " with \") before embedding XML as a JSON string.
```

**STEP**: 6 — License

**DESCRIPTION**: Project license reference.

**LANGUAGE**: Markdown

**CODE**:
```text
License:
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0, except as noted otherwise in the LICENSE file:
/LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Configure SAP BTP Destination with ProxyType=OnPremise (Cloud Connector)

**INTRODUCTION**: Configure an SAP BTP destination that uses ProxyType=OnPremise so cloud apps can securely reach on‑premise systems via the Cloud Connector. This guide provides actionable steps, configuration snippets, validation commands, trace logging steps, troubleshooting checks, and the support-ticket artifact checklist.

**TAGS**: SAP BTP, Cloud Connector, OnPremise, Destination, PrincipalPropagation, OData, Connectivity, troubleshooting

STEP: Flow Diagram

DESCRIPTION: Sequence diagram illustrating the runtime flow from developer/app to back end via Destination and Cloud Connector. Use a Mermaid-capable renderer to visualize.

LANGUAGE: mermaid

CODE:
```mermaid
sequenceDiagram
   participant Developer as Developer (SAP Business Application Studio)
   participant BTPApp as SAP BTP Application (Runtime)
   participant DestinationService as SAP BTP Destination Service
   participant ConnectivityService as SAP BTP Connectivity Service (Cloud Connector)
   participant BackendSystem as Back-End System such as SAP S/4HANA or External API

   Developer->>BTPApp: 1. Develops & Deploys App in SAP Business Application Studio
   BTPApp->>DestinationService: 2. App requests Destination 'MyBackend'
   DestinationService->>BTPApp: 3. Provides Destination Configuration (URL, Auth, and Proxy)

   alt On-Premise Backend (using Cloud Connector)
      BTPApp->>ConnectivityService: 4a. Connects using Secure Tunnel
      ConnectivityService-->>BackendSystem: 5a. Routes request to On-Premise System
   else Cloud/External Back End
      BTPApp->>BackendSystem: 4b. Direct HTTP/API Call
   end

   BackendSystem-->>BTPApp: 6. Responds with Data
   BTPApp-->>Developer: 7. Application processes and displays data
```

STEP: Cloud Connector Configuration

DESCRIPTION: Install and configure Cloud Connector and establish a subaccount mapping. Ensure Cloud Connector is running, connected to the target SAP BTP subaccount, and virtual host/port -> backend host/port mappings are created and active. Use the Cloud Connector UI to create mappings and access control entries (Access Policy: Path, URL Path may be "/").

LANGUAGE: text

CODE:
```text
Action checklist (Cloud Connector UI):
1. Login -> Subaccount Overview -> Verify subaccount connection.
2. Cloud to On-Premise -> Add Virtual Host Mapping:
   - Virtual Host: <virtual-host>
   - Virtual Port: <virtual-port>
   - Backend Host: <backend-host>
   - Backend Port: <backend-port>
3. Cloud to On-Premise -> Access Control -> Add mapping:
   - Access Policy: Path
   - URL Path: "/" (or as required)
   - Check Availability -> Verify mapping is reachable
4. For trace troubleshooting: Log and Trace Files -> Edit (see trace logging step)
```

STEP: SAP BTP Destination Properties (Example)

DESCRIPTION: Use these destination properties to create/update an OnPremise destination in the SAP BTP cockpit. Update CloudConnectorLocationId and URL to match your Cloud Connector virtual host mapping. PrincipalPropagation is recommended for end-user identity forwarding.

LANGUAGE: ini

CODE:
```ini
# SAP BTP Cloud Connector Destination Example
Type=HTTP
HTML5.DynamicDestination=true
Description=SAP Cloud Connector
Authentication=PrincipalPropagation
CloudConnectorLocationId=scloud
WebIDEEnabled=true
ProxyType=OnPremise
URL=http://my-internal-host:44330/
Name=MyOnPremiseDestination
WebIDEUsage=odata_abap
HTML5.Timeout=60000
```

STEP: Destination Properties — Notes

DESCRIPTION: Action-oriented property meanings to copy into cockpit when creating the destination.

LANGUAGE: text

CODE:
```text
- WebIDEUsage=odata_abap: Expose OData catalogs to SAP Business Application Studio.
- WebIDEEnabled=true: Allow use in Business Application Studio.
- HTML5.Timeout=60000: Timeout in milliseconds.
- HTML5.DynamicDestination=true: Allow dynamic runtime creation.
- Authentication=PrincipalPropagation: Forward end-user identity to back end (recommended).
- CloudConnectorLocationId: Must match Cloud Connector entry in subaccount.
- URL: Use virtual host:port mapped in Cloud Connector (internal address).
```

STEP: Validate Connectivity (Environment Check)

DESCRIPTION: Run the Environment Check in SAP Business Application Studio to validate OData V2/V4 catalog endpoints. Fix issues reported in envcheck-results.md before proceeding.

LANGUAGE: text

CODE:
```text
1. Run Environment Check (SAP Business Application Studio):
   - See ../destinations/README.md#environment-check
2. Review generated file: envcheck-results.md
3. Resolve any failures reported (authentication, unreachable URL, metadata issues).
```

STEP: Quick Connectivity Checks

DESCRIPTION: Run these checks to quickly identify common failures before collecting logs.

LANGUAGE: text

CODE:
```text
Quick checks:
- Is Cloud Connector running and connected to SAP BTP subaccount?
- Is virtual host/port mapping active and correct?
- Does destination.CloudConnectorLocationId match the Cloud Connector?
- Are destination and back-end authentication methods aligned (PrincipalPropagation/SSL/certs)?
- Are firewalls/proxies blocking traffic between Cloud Connector and back end?
- Can you curl the back end from the Cloud Connector host locally?
```

STEP: Enable Cloud Connector Trace Logging (Capture Logs)

DESCRIPTION: Enable trace logging temporarily to capture the specified log files for troubleshooting. Revert logging to normal levels after capture.

LANGUAGE: text

CODE:
```text
1. Cloud Connector UI -> Log and Trace Files -> Edit
2. Set:
   - Cloud Connector Loggers = ALL
   - Other Loggers = Information
3. Enable Payload Trace and select correct subaccount.
4. Reproduce the failing scenario.
5. Collect logs:
   - ljs_trace.log
   - scc_core.log (if present)
   - traffic_trace_<subaccount>_on_<region>.trc (required)
   - tunnel_traffic_trace_<subaccount>_on_<region>.trc (if applicable)
6. Revert log levels to avoid excessive logging.
Notes:
- If no network traffic appears in traffic_trace_ logs, likely Cloud Connector cannot establish tunnel (firewall/proxy).
- See: Monitoring, Logging, and Troubleshooting docs.
```

STEP: Checklist for Support Tickets (Artifacts to Attach)

DESCRIPTION: Compile a zip with the required artifacts before opening a ticket for BC-MID-SCC or CA-UX-IDE. Include optional debugging outputs too.

LANGUAGE: text

CODE:
```text
Required artifacts (zip into a single file):
- Screenshot of destination in SAP BTP cockpit (all properties).
- Environment Check report (envcheck-results.md).
- From Cloud Connector:
  - Subaccount Overview (Cloud Connector -> Subaccount Overview -> Click Subaccount).
  - Virtual Host Mapping screenshot (Cloud to On-Premise -> Virtual Host Mapping).
  - Access Control mapping and Edit view (Cloud to On-Premise -> Access Control -> Mapping -> Edit).
  - Confirm Access Policy and URL Path (Path, "/") and Check Availability output.
  - Collected trace logs (see trace logging step).
- ABAP logs (if backend is ABAP):
  - /IWFND/ERROR_LOG
  - /IWFND/GW_CLIENT
Optional:
- curl output from Business Application Studio terminal.
- Clear reproduction steps and expected vs actual behavior.
```

STEP: Example Connection Test (curl)

DESCRIPTION: Run curl from SAP Business Application Studio (or any terminal) to test catalog connectivity. Replace <destination-name> and <bsp-name> as required. Save output to a file and attach to support ticket if needed.

LANGUAGE: bash

CODE:
```bash
# Replace <destination-name> before executing
curl -L -vs -i -H "X-CSRF-Token: Fetch" "https://<destination-name>.dest/sap/opu/odata/IWFND/CATALOGSERVICE;v=2?saml2=disabled" > curl-catalog-output.txt 2>&1
```

STEP: Deployment Prerequisites (ABAP Repo) & Debugging

DESCRIPTION: Ensure repository service activation and required authorizations. Capture deployment debug logs and run curl against ABAP repository service to validate deployment connectivity.

LANGUAGE: text

CODE:
```text
Prerequisites:
- Activate /UI5/ABAP_REPOSITORY_SRV in the backend.
- Ensure S_DEVELOP authorizations are present.

Capture debug output when deploying:
# Mac / Linux
DEBUG=* npm run deploy
# Windows (powershell)
set DEBUG=* && npm run deploy
```

LANGUAGE: bash

CODE:
```bash
# Replace <destination-name> and <bsp-name> before executing
curl -L -vs -i -H "X-CSRF-Token: Fetch" "https://<destination-name>.dest/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV/Repositories(%27<bsp-name>%27)?saml2=disabled" > curl-abap-srv-output.txt 2>&1
```

STEP: Known Issues (Common Causes & References)

DESCRIPTION: Common issues and SAP notes/KB links to consult when facing 401/403/404 or service catalog problems.

LANGUAGE: text

CODE:
```text
Known issues:
- OData V4 catalog service not available -> HTTP 401/403/404; may indicate /IWFND/CONFIG not published.
  - See OData V4 Service Catalog tutorial and docs.
- SAP Notes:
  - 2954378 - Gateway Error Log: No authorization to access service group '/IWNGW/NOTIFICATION'
  - 2928752 - How to activate ICF nodes in SAP Gateway?
  - 2489898 - HTTP 404 Not Found for /IWFND/CATALOGSERVICE
  - 3378435 - Response headers too big in /UI5/UI5_REPOSITORY_LOAD
Action:
- Check /IWFND/ERROR_LOG and /IWFND/GW_CLIENT.
- Ensure necessary ICF nodes are activated and published.
```

STEP: Principal Propagation (Recommended)

DESCRIPTION: Use Principal Propagation to forward end-user identity end-to-end. Follow setup and configuration guides; use it for productive landscapes to maintain per-user access control in on-premise back ends.

LANGUAGE: text

CODE:
```text
- Principal Propagation forwards user identity from SAP BTP to on-premise backend.
- Recommended for production to avoid using a generic technical user.
- Setup references:
  - Setting up Principal Propagation (community guide)
  - Configuring Principal Propagation (official help)
- Troubleshooting:
  - How to Troubleshoot Cloud Connector Principal Propagation over HTTPS (trace client certificate).
```

STEP: Additional Resources & Support Links

DESCRIPTION: Quick links and resources to follow for installation, destination creation, and Cloud Connector concepts.

LANGUAGE: text

CODE:
```text
Useful links:
- Installation and Configuration of SAP Cloud Connector (blog)
- Whitelisting SAP BTP IP ranges (SAP docs)
- Understanding SAP BTP Destinations (learning)
- Create SAP BTP Destinations (tutorial)
- Cloud Connector Explained (community blog)
- Consuming SAPUI5 libraries from On‑Premise (./ui5-onpremise.md)
- Monitoring, Logging, and Troubleshooting (Cloud Connector docs)
```

STEP: License

DESCRIPTION: Project license reference.

LANGUAGE: text

CODE:
```text
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache License 2.0. See LICENSE at ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Expose SAPUI5 Library from an On-Premise System via ui5.yaml and SAP BTP Destination

**INTRODUCTION**: Steps to configure ui5-tooling (ui5.yaml) and SAP BTP destinations so an SAPUI5 application can consume a SAPUI5 library served from an On-Premise system through the Cloud Connector. Use this when the specific SAPUI5 version is not available on the SAPUI5 CDN.

**TAGS**: fiori, sapui5, ui5-tooling, ui5.yaml, sap-btp, cloud-connector, on-premise

STEP: Prerequisites
DESCRIPTION: Ensure your environment meets these requirements before proceeding.
- The SAPUI5 library is accessible from the On-Premise system.
- The On-Premise system is reachable from your development environment (e.g., SAP Business Application Studio) via Cloud Connector.
- The SAPUI5 version you require is unavailable on the SAPUI5 CDN (e.g., https://ui5.sap.com/1.71.53 returns HTTP 404). Check available versions at https://ui5.sap.com/versionoverview.html.
LANGUAGE: Text
CODE:
```Text
Prerequisites:
- SAPUI5 library accessible on On-Premise system.
- On-Premise reachable via Cloud Connector from the development environment.
- Desired SAPUI5 version not available on SAPUI5 CDN.
```

STEP: Existing SAP BTP destination (example)
DESCRIPTION: The project already references an SAP BTP destination (MyDestination) configured for OnPremise access via Cloud Connector. Preserve this destination for backend OData/HTTP access.
LANGUAGE: JSON
CODE:
```JSON
{
    "destination": {
        "Authentication": "NoAuthentication",
        "CloudConnectorLocationId": "MyCloudConnectorLocationId",
        "HTML5.DynamicDestination": "true",
        "HTML5.Timeout": "60000",
        "Name": "MyDestination",
        "ProxyType": "OnPremise",
        "Type": "HTTP",
        "URL": "http://my-internal-system.abc.internal:443",
        "WebIDEEnabled": "true",
        "WebIDEUsage": "odata_abap",
        "sap-client": "100"
    }
}
```

STEP: Existing ui5.yaml that points to CDN and destination
DESCRIPTION: Example ui5.yaml before exposing SAPUI5 library from On-Premise. This file configures fiori-tools-proxy with ui5.url pointing to the CDN and backend destination MyDestination.
LANGUAGE: YAML
CODE:
```yaml
# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json

specVersion: "3.1"
metadata:
  name: testproject
type: application
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        ignoreCertError: false # If set to true, certificate errors will be ignored and self-signed certificates will be accepted.
        ui5:
          path:
            - /resources
            - /test-resources
          url: https://ui5.sap.com           
        backend:
          - path: /sap
            url: http://my-internal-system.abc.internal:443
            destination: MyDestination
    - name: fiori-tools-appreload
      afterMiddleware: compression
      configuration:
        port: 35729
        path: webapp
        delay: 300
    - name: fiori-tools-preview
      afterMiddleware: fiori-tools-appreload
      configuration:
        flp:
          theme: sap_fiori_3
```

STEP: Duplicate the SAP BTP destination for UI5 library exposure
DESCRIPTION: Duplicate your existing BTP destination and modify the URL to point to the SAPUI5 library path on the On-Premise system. Use a new destination name (example: MyDestination_ui5). This destination only needs to serve static UI5 assets; WebIDEUsage is not required.
LANGUAGE: JSON
CODE:
```JSON
{
    "destination": {
        "Authentication": "NoAuthentication",
        "CloudConnectorLocationId": "MyCloudConnectorLocationId",
        "HTML5.DynamicDestination": "true",
        "HTML5.Timeout": "60000",
        "Name": "MyDestination_ui5",
        "ProxyType": "OnPremise",
        "Type": "HTTP",
        "URL": "http://my-internal-system.abc.internal:443/sap/public/bc/ui5_ui5/1/",       
        "sap-client": "100"
    }
}
```
DESCRIPTION (continued): Note the path /sap/public/bc/ui5_ui5/1/ — this is where SAPUI5 libraries are commonly exposed. Confirm the correct path with your system administrator if different.

STEP: Validate the duplicated destination from SAP Business Application Studio
DESCRIPTION: Use curl (or similar HTTP tool) to fetch a UI5 file via the new destination to confirm accessibility. Execute this command in BAS or your dev environment. Inspect the generated file for SAPUI5 content.
LANGUAGE: Bash
CODE:
```bash
 curl -L 'https://mydestination_ui5.dest/resources/sap-ui-core.js' -X GET -i -H 'X-Csrf-Token: fetch' > output-tsk1.txt
```

STEP: Modify ui5.yaml to consume UI5 library from On-Premise destination
DESCRIPTION: Update fiori-tools-proxy.ui5 configuration so:
- /resources points to the new On-Premise UI5 destination (https://mydestination_ui5.dest).
- /test-resources remains pointed to the SAPUI5 CDN version closest to your project (https://ui5.sap.com/<valid-UI5-version>).
- Set ui5.version to an empty string to prevent rewriting UI5 paths with a version number.
LANGUAGE: YAML
CODE:
```yaml
        ui5:
          version: ''
          paths:
            - path: /resources
              url: https://mydestination_ui5.dest
            - path: /test-resources
              url: https://ui5.sap.com/<valid-UI5-version>
```

STEP: Full example ui5.yaml after changes
DESCRIPTION: Example of the complete ui5.yaml that exposes /resources from the On-Premise UI5 destination while keeping /test-resources on the CDN. Note: in this sample the backend destination reference name is shown as mydestination (preserve your actual destination name).
LANGUAGE: YAML
CODE:
```yaml
# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json

specVersion: "3.1"
metadata:
  name: testproject
type: application
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        ignoreCertError: false # If set to true, certificate errors will be ignored and self-signed certificates will be accepted.
        ui5:
          version: ''
          paths:
            - path: /resources          
              url: https://mydestination_ui5.dest                    
            - path: /test-resources
              url: https://ui5.sap.com/1.71.76                
        backend:
          - path: /sap
            url: http://my-internal-system.abc.internal:443
            destination: mydestination
    - name: fiori-tools-appreload
      afterMiddleware: compression
      configuration:
        port: 35729
        path: webapp
        delay: 300
    - name: fiori-tools-preview
      afterMiddleware: fiori-tools-appreload
      configuration:
        flp:
          theme: sap_fiori_3
```
DESCRIPTION (continued): Key points:
- ui5.version: '' prevents UI5 path rewriting.
- /resources -> https://mydestination_ui5.dest (On-Premise UI5 library).
- /test-resources -> https://ui5.sap.com/<valid-UI5-version> (CDN test resources).

STEP: Notes and rationale
DESCRIPTION: Duplicate the SAP BTP destination so you can control the public path used to expose UI5 library assets. The duplicate destination should point specifically to the UI5 assets path (e.g., /sap/public/bc/ui5_ui5/1/). The duplicated destination is only needed to serve UI5 static files; it does not need WebIDEUsage or OData settings.

STEP: License
DESCRIPTION: Project license information.
LANGUAGE: Text
CODE:
```Text
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company. This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the LICENSE file at ../../LICENSES/Apache-2.0.txt.
```
--------------------------------

**TITLE**: Defining Proxy Settings for SAP Fiori Tools

**INTRODUCTION**: Practical, code-focused reference for configuring proxy settings for SAP Fiori Tools. Includes ui5.yaml proxy configuration, environment variable examples for Linux/macOS and Windows PowerShell, deployment-specific TLS/credential handling, URL-encoding guidance, and compatibility flags for older @sap/ux-ui5-tooling versions.

**TAGS**: sap, fiori, proxy, ui5, environment-variables, windows, powershell, macos, linux, axios, deployment

**STEP**: 1 — Prerequisites and Best Practices

**DESCRIPTION**: Confirm permissions and network requirements before setting proxy configuration. Default proxy URL should use http:// unless IT explicitly requires https://. When adding credentials to URLs, URL-encode special characters (e.g., @ -> %40). Preserve file path references and license info for compliance.

- Ensure you can modify environment variables on your system.
- Ask IT if proxy settings are required.
- Default proxy URL format: http://proxyserver:port (use https:// only if instructed).
- If adding credentials, URL-encode special characters (see STEP 4).
- License file: ../../LICENSES/Apache-2.0.txt

**LANGUAGE**: Text

**CODE**:
```text
Prerequisites:
- Ensure you have the necessary permissions to modify environment variables.
- Confirm with your IT Admin if proxy settings are required.
- Default proxy URL should be http://proxyserver:port unless IT specifies https://.
- If the proxy requires credentials, include them in the URL (user:password) and URL-encode special characters.
License path: ../../LICENSES/Apache-2.0.txt
```

**STEP**: 2 — Configure proxy in ui5.yaml (ui5 tooling)

**DESCRIPTION**: Add a proxy middleware configuration to ui5.yaml to route /sap (or other backend paths) through the proxy. Place this block in your project ui5.yaml file (project root).

- File: ui5.yaml

**LANGUAGE**: YAML

**CODE**:
```yaml
- name: fiori-tools-proxy
  afterMiddleware: compression
  configuration:
    proxy: http://myproxy.com:8443
    backend:
    - path: /sap
      url: https://my.backend.com:1234
```

**STEP**: 3 — Set proxy environment variables (Linux/macOS / general examples)

**DESCRIPTION**: Export standard proxy environment variables recognized by most CLI tools and libraries. Use lowercase variants (http_proxy, https_proxy, no_proxy) where required by specific tools. NO_PROXY is a comma-separated list of hosts that should bypass the proxy.

**LANGUAGE**: Bash

**CODE**:
```bash
export HTTP_PROXY=http://user:password@proxyserver:port
export HTTPS_PROXY=http://user:password@proxyserver:port
export NO_PROXY=localhost,127.0.0.1,internal.domain,.local
```

**STEP**: 4 — Deployment / TLS / Credentials / URL-encoding / ux-ui5-tooling compatibility

**DESCRIPTION**: For TLS-enabled connections, set HTTPS_PROXY. Include credentials in the URL if required. If credentials contain special characters, URL-encode them (e.g., p@s#w0rd -> p%40s%23w0rd). For older @sap/ux-ui5-tooling versions (e.g., v1.17.6) enable the patch proxy feature via TOOLSUITE_FEATURES. See Axios extension for deployment proxy support.

References:
- @sap/ux-ui5-tooling proxy docs: https://www.npmjs.com/package/@sap/ux-ui5-tooling#providing-proxy-configuration
- Axios extension proxy support: https://github.com/SAP/open-ux-tools/tree/main/packages/axios-extension#proxy-support
- URL encode/decode: https://www.url-encode-decode.com/

**LANGUAGE**: Bash

**CODE**:
```bash
# Enable TLS proxy
export HTTPS_PROXY=<YOUR-PROXY:PORT>

# Example with credentials
export HTTPS_PROXY=http://user:password@proxy.domain.com:3128

# Example with URL-encoded special characters (p@s#w0rd -> p%40s%23w0rd)
export HTTPS_PROXY=http://myusername:p%40s%23w0rd@proxy.domain.com:3128

# For older @sap/ux-ui5-tooling versions (e.g., v1.17.6) enable patch proxy:
export TOOLSUITE_FEATURES=sap.ux.enablePatchProxy
```

**STEP**: 5 — Windows PowerShell: set proxy env vars (session, user, machine) and GUI instructions

**DESCRIPTION**: Use PowerShell to set proxy environment variables for the current session or persist them for the user or machine. For persistent machine-level variables you need Administrator privileges. Alternative: set variables through Windows GUI via System Properties → Environment Variables.

GUI steps (summary):
1. Right-click "This PC" or "Computer" → Properties → Advanced system settings.
2. Click "Environment Variables".
3. Add/Edit HTTP_PROXY, HTTPS_PROXY, NO_PROXY under User or System variables.
4. Click OK and restart affected apps/sessions.

**LANGUAGE**: PowerShell

**CODE**:
```powershell
# Set for current PowerShell session
$env:HTTP_PROXY = "http://user:password@proxyserver:port"
$env:HTTPS_PROXY = "http://user:password@proxyserver:port"
$env:NO_PROXY = "localhost,127.0.0.1,internal.domain,.local"

# Set permanently for current user
[Environment]::SetEnvironmentVariable("HTTP_PROXY", "http://user:password@proxyserver:port", "User")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", "http://user:password@proxyserver:port", "User")
[Environment]::SetEnvironmentVariable("NO_PROXY", "localhost,127.0.0.1,internal.domain,.local", "User")

# Set system-wide (Machine) - requires Administrator
[Environment]::SetEnvironmentVariable("HTTP_PROXY", "http://user:password@proxyserver:port", "Machine")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", "http://user:password@proxyserver:port", "Machine")
[Environment]::SetEnvironmentVariable("NO_PROXY", "localhost,127.0.0.1,internal.domain,.local", "Machine")
```

**STEP**: 6 — macOS / Linux: persistent shell profile setup

**DESCRIPTION**: Export variables for the current session and append exports to your shell profile (~/.bashrc shown) for persistence. Replace ~/.bashrc with ~/.zshrc or other profile file if using a different shell. Reload the profile with source.

**LANGUAGE**: Bash

**CODE**:
```bash
# Set for current session only
export HTTP_PROXY=http://user:password@proxyserver:port
export HTTPS_PROXY=http://user:password@proxyserver:port
export NO_PROXY=localhost,127.0.0.1,internal.domain,.local

# Persist across sessions (append to ~/.bashrc)
echo 'export HTTP_PROXY=http://user:password@proxyserver:port' >> ~/.bashrc
echo 'export HTTPS_PROXY=http://user:password@proxyserver:port' >> ~/.bashrc
echo 'export NO_PROXY=localhost,127.0.0.1,internal.domain,.local' >> ~/.bashrc

# Reload profile
source ~/.bashrc
```

**STEP**: 7 — Variations and compatibility notes

**DESCRIPTION**: Most tools recognize both uppercase and lowercase environment variable names (HTTP_PROXY/http_proxy). Some tools expect protocol-specific formats for secure proxies (https://...). Confirm with the consuming tool or IT Admin. Keep these variations in mind during scripting and CI/CD pipelines.

**LANGUAGE**: Text

**CODE**:
```text
Variations to consider:
- Lowercase environment variables: http_proxy, https_proxy, no_proxy
- Protocol-specific HTTPS proxy URL: https://proxyserver:port (use only if required)
- Confirm tool-specific expectations (some tools prefer lowercase)
- When scripting, export both uppercase and lowercase variants to maximize compatibility.
```
--------------------------------

**TITLE**: SAMLAssertion Destination for SAP S/4HANA Cloud Public Tenant (V2/V4 OData)

**INTRODUCTION**: Configure a SAP BTP SAMLAssertion destination that points to an SAP S/4HANA Cloud (Public) tenant to consume V2 and V4 OData catalogs from SAP Business Application Studio (BAS). Includes required preparatory steps, destination JSON template, validation commands, nameIdFormat recommendations, authorization requirements, tenant-type notes, and connectivity/debugging commands and error samples.

**TAGS**: fiori-samples, sap-btp, s4hc, saml, destination, odata, sap-business-application-studio, debug

STEP: 1 — Prerequisites
DESCRIPTION: Verify required setup before creating the SAMLAssertion destination and consuming OData catalogs.
LANGUAGE: TEXT
CODE:
```
Prerequisites:
1. Complete Steps 1, 2, and 3 from:
   https://developers.sap.com/tutorials/abap-custom-ui-bas-connect-s4hc.html
2. Have administrative access to your SAP S/4HANA Cloud system.
3. Be subscribed to SAP Business Application Studio (BAS).
   https://help.sap.com/docs/SAP%20Business%20Application%20Studio/6331319fd9ea4f0ea5331e21df329539.html
4. Review:
   - SAP S/4HANA Cloud, Public Edition FAQ: https://me.sap.com/notes/3445942
   - BAS Integration with S/4HANA Cloud: https://me.sap.com/notes/3297481
```

STEP: 2 — Edit s4hana-cloud_saml and replace placeholder host
DESCRIPTION: Replace all instances of the placeholder hostname `my1111111` in the s4hana-cloud_saml file with your S/4HANA Cloud tenant hostname. Use a command-line replace for automation or edit in a text editor.
LANGUAGE: Bash
CODE:
```bash
# Replace placeholder hostname in the s4hana-cloud_saml file (Linux / macOS)
sed -i 's/my1111111/your-s4hc-hostname/g' s4hana-cloud_saml

# macOS (BSD sed) alternative:
sed -i '' 's/my1111111/your-s4hc-hostname/g' s4hana-cloud_saml
```

STEP: 3 — Destination JSON template (SAMLAssertion)
DESCRIPTION: Use the JSON template to import a destination into your SAP BTP subaccount. Replace placeholders: <DEST_NAME>, <BASE_URL>, <TENANT_HOST>, and set nameIdFormat appropriately. Authentication must be SAMLAssertion for deployment/consumption from BAS.
LANGUAGE: JSON
CODE:
```json
{
  "Name": "<DEST_NAME>",
  "Type": "HTTP",
  "URL": "https://<TENANT_HOST>",
  "ProxyType": "Internet",
  "Authentication": "SAMLAssertion",
  "TrustAll": "true",
  "NameIdFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "Description": "SAMLAssertion destination to SAP S/4HANA Cloud Public tenant"
}
```

STEP: 4 — Import destination into SAP BTP
DESCRIPTION: Import the prepared destination JSON into your SAP BTP subaccount using the Destinations UI or REST API. Validate in BAS.
LANGUAGE: TEXT
CODE:
```
1. Log in to SAP BTP subaccount -> Connectivity -> Destinations -> Import Destination.
2. Upload the JSON file (use the template in STEP 3).
3. In BAS: open the Destination list and confirm the destination is visible.
4. Use the new destination in your BAS project to validate connectivity.
```

STEP: 5 — Validate OData Catalogs (V2 and V4)
DESCRIPTION: Use curl or a browser to validate that V2 and V4 OData catalogs are reachable through the destination. Replace <BASE_URL> or use your destination URL.
LANGUAGE: Bash
CODE:
```bash
# V2 Catalog (returns service collection)
curl -I "https://<TENANT_HOST>/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection"

# V4 Catalog (returns service groups with expanded services)
curl -I "https://<TENANT_HOST>/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?\$expand=DefaultSystem(\$expand=Services)"
```

STEP: 6 — nameIdFormat values and recommendations
DESCRIPTION: Configure nameIdFormat in the destination to map IdP NameID to S/4HANA Cloud user identifier. Default recommended setting is the email address format. Keep version 1.1 unless a service provider requires otherwise.
LANGUAGE: TEXT
CODE:
```
Valid nameIdFormat values:
- urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
  -> Maps NameID to email address (recommended by default).
- urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified
  -> Maps NameID to username.

Notes:
1. Use version 1.1 (do not change to 2.0 unless required by the SP).
2. Ensure IdP email case and value exactly match the S4HC configured email (case-sensitive best practice).
3. If using IAS or OIDC as IdP, ensure the IdP assertion/email matches the S4HC user email configured with roles.
```

STEP: 7 — Authorization requirements (roles and catalogs)
DESCRIPTION: Required business roles and business catalogs to browse OData services and deploy SAPUI5 apps. Assign these business roles to the user in S/4HANA Cloud (Maintain Business Users app).
LANGUAGE: TEXT
CODE:
```
Business catalogs and roles mapping:

- To access OData Services:
  Business Catalog: SAP_CORE_BC_EXT_TST
  Business Role Template: SAP_BR_EXTENSIBILITY_SPEC

- To deploy applications:
  Business Catalogs: SAP_CORE_BC_EXT_UI
  Developer Extensibility Catalog: SAP_A4C_BC_DEV_UID_PC
  Business Role Template: SAP_BR_DEVELOPER

Notes:
- Recommended templates: SAP_BR_DEVELOPER, SAP_BR_EXTENSIBILITY_SPEC
- Examples of alternative custom role names: BR_DEVELOPER, Z_BR_DEVELOPER
- Ensure required business catalogs are added to the business role assigned to the user.
```

STEP: 8 — Tenant types summary (Developer / Key User)
DESCRIPTION: Behavior and endpoint differences per tenant type. Use the correct destination host for each tenant type and generate the destination via SAP help links.
LANGUAGE: TEXT
CODE:
```
Tenant types:

1) Developer Extensibility (SAP Client 080)
   - Purpose: ABAP developer extensibility, full ABAP development tool access.
   - Note: Requires destination for Developer Extensibility host.
   - Steps: https://help.sap.com/.../0af2819bbe064a3da455753c8518dd81.html?version=2502.500

2) Key User Extensibility / Customizing (SAP Client 100)
   - Purpose: Configuration, low-code, customizing tenant.
   - Note: Requires a different host endpoint and destination.
   - Steps: https://help.sap.com/.../31876c06f99645f289d802f9c95fb62b.html?version=2502.500

Developer Note: Each tenant type exposes a separate communication system and SSL certificate per host.
```

STEP: 9 — Debugging connectivity: traces and filters
DESCRIPTION: Use S/4HANA Cloud admin apps "Display Authorization Trace" and "Display Connectivity Trace" to inspect failed requests. Create traces with specific request methods and path prefixes to capture catalog calls.
LANGUAGE: TEXT
CODE:
```
Authorization Trace:
- App: Display Authorization Trace
- Typical filters: Status = Failed; filter Users by required user.

Connectivity Trace:
- App: Display Connectivity Trace
- To capture V2 catalog calls:
  Request Method: GET
  Path Prefix: /sap/opu/odata/IWFND/CATALOGSERVICE
- To capture V4 catalog calls:
  Request Method: GET
  Path Prefix: /sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/
```

STEP: 10 — Common deployment/connectivity error examples (preserve logs)
DESCRIPTION: Preserve and use the exact error outputs when troubleshooting. These examples map to recommended fixes in the descriptions above.
LANGUAGE: Bash
CODE:
```bash
# Issue 1: Use of Gateway OData V2 Service not permitted
error abap-deploy-task YY1_Some_Service The use of Gateway OData V2 Service Z_MY_SERVICE 0001 is not permitted.

# Issue 2: Deployment fails with HTTP 403
info abap-deploy-task YY1_Some_App Creating archive with UI5 build result.
info abap-deploy-task YY1_Some_App Archive created.
info abap-deploy-task YY1_Some_App Starting to deploy.
info abap-deploy-task YY1_Some_App YY1_Some_Service found on target system: false
error abap-deploy-task YY1_Some_App Request failed with status code 403

# Issue 3: Deployment fails with HTTP 400
error The app uses not permitted services for ABAP for Cloud Development
error abap-deploy-task ZF_TEST_API Request failed with status code 400
error abap-deploy-task ZF_TEST_API The use of Gateway OData V2 Service API_PROC_ORDER_CONFIRMATION_2_SRV 0001 is not permitted

# Issue 4: Examples of calling OData catalogs
#V2 Catalog
/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection
#V4 Catalog
/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)
```

STEP: 11 — Support communication users and partial-URL destination recommendation
DESCRIPTION: When granting SAP Support access for troubleshooting or exposing specific OData endpoints, clone an existing destination and convert to a Partial URL destination; set Service URL to the OData base path to permit targeted requests.
LANGUAGE: TEXT
CODE:
```
Recommendation:
1. Clone existing SAMLAssertion destination in SAP BTP.
2. Change Type to Partial URL destination.
3. Set Service URL to the OData base path you want to expose (e.g., https://<TENANT_HOST>/sap/opu/odata/IWFND/CATALOGSERVICE).
4. Assign appropriate authorizations to the support communication user if they need access to OData catalogs.
```

STEP: 12 — Full connectivity failure checks
DESCRIPTION: If BAS requests are not reaching S/4HANA Cloud, validate traces and verify SAMLAssertion settings and destination integrity.
LANGUAGE: TEXT
CODE:
```
Checks when no requests reach S4HC:
1. Confirm authorization or connectivity trace logging on S4HC shows no incoming requests.
2. If nameIdFormat = urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress:
   - Ensure the IdP email matches the S4HC user email exactly.
3. If curl/Environment Check requests fail with HTTP 500 and do not reach S4HC:
   - Clone the existing destination in BTP and use the new destination in BAS (possible destination corruption).
4. Ensure the communication system for BAS is active:
   https://help.sap.com/docs/SAP_S4HANA_CLOUD/.../79ed4173a0e44a5085c2d236d14b5ab8.html
```

STEP: 13 — Related links and further reading
DESCRIPTION: Useful references to follow for creation, trust setup, and developing custom UIs.
LANGUAGE: TEXT
CODE:
```
- Create a Destination to Connect to SAP Business Application Studio:
  https://help.sap.com/docs/SAP_S4HANA_CLOUD/.../31876c06f99645f289d802f9c95fb62b.html

- Integrating SAP Business Application Studio:
  https://help.sap.com/docs/SAP_S4HANA_CLOUD/.../22bc724fd51a4aa4a4d1c5854db7e026.html

- Develop a Custom UI for an SAP S/4HANA Cloud System:
  https://developers.sap.com/tutorials/abap-custom-ui-bas-develop-s4hc.html

- Set Up Trust Between SAP Cloud Identity Services and SAP BTP (Cloud Foundry):
  https://developers.sap.com/tutorials/abap-custom-ui-trust-cf.html

- Exposing an OData Service from SAP S/4HANA Cloud Public Edition to SAP BTP:
  https://community.sap.com/t5/technology-blog-posts-by-sap/exposing-an-odata-service-from-sap-s-4hana-cloud-public-edition-to-the-sap/ba-p/13628248

- Support and Q&A references:
  https://userapps.support.sap.com/sap/support/knowledge/en/3373955
  https://userapps.support.sap.com/sap/support/knowledge/en/3445942
```

License: Copyright (c) 2009-2026 SAP SE or an SAP affiliate company. Project licensed under Apache-2.0; see file path ../../LICENSES/Apache-2.0.txt.
--------------------------------

**TITLE**: Handling Self-Signed SSL Certificates in SAP Fiori Tools

**INTRODUCTION**: Guidance and actionable steps to handle self-signed or private-CA SSL certificates when developing and deploying SAP Fiori apps with SAP Fiori Tools. Covers exporting certificates from browsers, installing them into OS trust stores, configuring Node.js to trust additional CAs, temporary bypass options (not recommended), and sample ui5.yaml / ui5-deploy.yaml configurations.

**TAGS**: fiori, sap, ssl, certificates, self-signed, Node.js, NODE_EXTRA_CA_CERTS, NODE_TLS_REJECT_UNAUTHORIZED, ui5, ui5-tooling, vscode, ABAP, environment-variables, security

STEP: 1 — Prerequisites and SAN requirement
DESCRIPTION: Ensure the certificate includes the DNS hostname or IP in the Subject Alternative Name (SAN) field. Connections by IP require the IP to be present in the SAN. Public CAs normally do not issue certs for IPs; self-signed or private CA is typically required for IP-based access.
LANGUAGE: Text
CODE:
```
Prerequisite:
- Certificates are normally validated against a DNS hostname.
- If connecting via an IP address, the certificate must explicitly list that IP in the Subject Alternative Name (SAN) field.
- If SAN does not include the IP, clients (browsers, Node.js, Java, etc.) will reject connections with a hostname mismatch error.
```

STEP: 2 — Security Risk: do not ignore certificate validation (action-oriented)
DESCRIPTION: Do not use ignoreCertError: true or NODE_TLS_REJECT_UNAUTHORIZED=0 in production. These bypass TLS/SSL validation and introduce Man-in-the-Middle, broken chain-of-trust, malicious site access, and policy violation risks. Use only as temporary development workaround.
LANGUAGE: Text
CODE:
```
Security risk summary:
- ignoreCertError: true and NODE_TLS_REJECT_UNAUTHORIZED=0 disable certificate validation.
- Risks: MITM vulnerability, malicious site access, broken chain of trust, security policy violations.
- Recommendation: Install the CA certificate in the OS/trust store or set NODE_EXTRA_CA_CERTS for Node.js instead of bypassing validation.
```

STEP: 3 — Export the CA certificate from browser
DESCRIPTION: Export the server/CA certificate from Edge, Chrome, or Firefox in PEM/CRT/ CER format ready for installation or to be used with NODE_EXTRA_CA_CERTS. See Node.js docs for NODE_EXTRA_CA_CERTS: https://nodejs.org/api/cli.html#node_extra_ca_certsfile
LANGUAGE: Text
CODE:
```
Steps to export certificate:
1. Navigate to the website using Edge, Chrome, or Firefox.
2. Click the padlock icon in the address bar.
3. View certificate details:
   - Chrome: Click "Connection is Not Secure" → "Certificate (Invalid)"
   - Edge: Click "Certificate (Invalid)"
   - Firefox: Click "Connection Not Secure" → "More Information" → "View Certificate"
4. Export/Save the certificate:
   - Chrome/Edge: Details tab → "Copy to File" → follow Certificate Export Wizard → save as .pem
   - Firefox: Details → "Export" → save as .crt or .cer
```

STEP: 4 — Install CA certificate to support VSCode (Windows)
DESCRIPTION: Install the CA certificate into Windows trust store to allow VSCode and system tools to trust certificates signed by your private CA.
LANGUAGE: Text
CODE:
```
Microsoft Windows:
1. Right-click the CA certificate file and select "Install Certificate".
2. Follow prompts to add the certificate to the trust store for current user or for all users.
```

STEP: 5 — Install CA certificate to support VSCode (macOS)
DESCRIPTION: Import the CA certificate into macOS Keychain (System keychain) so VSCode and system tools trust the certificate.
LANGUAGE: Text
CODE:
```
MacOS:
1. Right-click the CA certificate file.
2. Select "Open With" → Keychain Access.
3. Select "System" as the keychain to import into.
```

STEP: 6 — Configure Node.js to trust additional CA: NODE_EXTRA_CA_CERTS (Windows PowerShell)
DESCRIPTION: Set NODE_EXTRA_CA_CERTS environment variable for the current session to point Node.js to the exported CA certificate file. File extensions allowed: .pem, .crt, .cer, .cert.
LANGUAGE: PowerShell
CODE:
```powershell
# Set for current session only
$env:NODE_EXTRA_CA_CERTS = "C:\path\to\your\certificate.crt"

# Verify it's set correctly
$env:NODE_EXTRA_CA_CERTS
```

STEP: 7 — Configure Node.js to trust additional CA: NODE_EXTRA_CA_CERTS (macOS/Linux)
DESCRIPTION: Use export to set NODE_EXTRA_CA_CERTS for the current shell session. Persist by adding to shell profile if needed.
LANGUAGE: Bash
CODE:
```bash
# Set for current session only
export NODE_EXTRA_CA_CERTS=path/to/your/certificate.crt
```

STEP: 8 — Globally bypass SSL validation (NOT RECOMMENDED) — Node.js
DESCRIPTION: Temporary development-only method: disable Node.js certificate validation using NODE_TLS_REJECT_UNAUTHORIZED=0. This is equivalent to ignoreCertError: true and should only be used with full awareness of security risk.
LANGUAGE: Bash
CODE:
```bash
# WARNING: Only for development environments
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

STEP: 9 — Disable SSL validation in local preview (ui5.yaml) — sample configuration
DESCRIPTION: Example ui5.yaml snippet showing fiori-tools-proxy ignoreCertError option. Default is typically false. Set to true only if you must bypass cert validation for local preview (development only).
LANGUAGE: YAML
CODE:
```yaml
# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json

specVersion: "3.1"
metadata:
  name: myproject
type: application
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        ignoreCertError: false # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
        ui5:
          path:
            - /resources
            - /test-resources
          url: https://ui5.sap.com
        backend:
          - path: /here
            url: http://localhost
```

STEP: 10 — Disable SSL validation when deploying to ABAP (ui5-deploy.yaml) — sample configuration
DESCRIPTION: Example ui5-deploy.yaml snippet showing deploy-to-abap custom task configuration with ignoreCertError. Use only for development scenarios; prefer installing CA certificate or configuring NODE_EXTRA_CA_CERTS for production pipelines.
LANGUAGE: YAML
CODE:
```yaml
# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json

specVersion: "3.1"
metadata:
  name: myproject
type: application
builder:
  customTasks:
    - name: deploy-to-abap
      afterTask: generateCachebusterInfo
      configuration:
        ignoreCertError: true # If set to true, certificate errors will be ignored. E.g. self-signed certificates will be accepted
        target:
          url: https://myhost:44380
          client: '110'
        app:
          name: Z_Sample_App
          description: Sample App
          package: Z_SAMPLE_PACKAGE
          transport: TR123456
        exclude:
          - /test/
  resources:
    excludes:
      - /test/**
      - /localService/**
```

STEP: 11 — Configure NODE_TLS_REJECT_UNAUTHORIZED: Windows (manual UI)
DESCRIPTION: Manually create/set NODE_TLS_REJECT_UNAUTHORIZED environment variable in Windows Environment Variables UI. Only use for development; understand risks.
LANGUAGE: Text
CODE:
```
Windows (Manual):
1. Right-click Start or This PC → Select Properties.
2. Click "Advanced system settings".
3. Click "Environment Variables".
4. Under "User variables for [username]", click New.
5. Variable name: NODE_TLS_REJECT_UNAUTHORIZED
6. Variable value: 0
7. Click OK.
```

STEP: 12 — Configure NODE_TLS_REJECT_UNAUTHORIZED: Windows PowerShell (system or user persistence)
DESCRIPTION: PowerShell commands to persist NODE_TLS_REJECT_UNAUTHORIZED for Machine or User scope, or set for current session only.
LANGUAGE: PowerShell
CODE:
```powershell
# Set permanently system-wide, set for all users (requires admin privileges)
[Environment]::SetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED", "0", "Machine")

# Set permanently for current user
[Environment]::SetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED", "0", "User")

# Set for current session only
$env:NODE_TLS_REJECT_UNAUTHORIZED = '0'

# Verify it's set correctly
$env:NODE_TLS_REJECT_UNAUTHORIZED

# Run a Node.js script with the variable set just for this execution
$env:NODE_TLS_REJECT_UNAUTHORIZED = '0'; node your-script.js
```

STEP: 13 — Configure NODE_TLS_REJECT_UNAUTHORIZED: macOS/Linux (persistence and session)
DESCRIPTION: Commands to persist NODE_TLS_REJECT_UNAUTHORIZED system-wide or per-user, and to set for current session only. Use only for development.
LANGUAGE: Bash
CODE:
```bash
# For all users (requires sudo/root)
sudo sh -c 'echo "NODE_TLS_REJECT_UNAUTHORIZED=0" >> /etc/environment'

# For Bash (add to ~/.bashrc or ~/.bash_profile)
echo 'export NODE_TLS_REJECT_UNAUTHORIZED=0' >> ~/.bashrc

# For Zsh (add to ~/.zshrc)
echo 'export NODE_TLS_REJECT_UNAUTHORIZED=0' >> ~/.zshrc

# Apply changes immediately
source ~/.bashrc  # or source ~/.zshrc for Zsh

# Set for current session only
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Verify it's set correctly
echo $NODE_TLS_REJECT_UNAUTHORIZED

# Run a Node.js script with the variable set just for this execution
NODE_TLS_REJECT_UNAUTHORIZED=0 node your-script.js

# Or for any other command that uses Node.js
NODE_TLS_REJECT_UNAUTHORIZED=0 npm start
```

STEP: 14 — References and license
DESCRIPTION: Useful references and licensing information.
LANGUAGE: Text
CODE:
```
References:
- SAP Help: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/4b318bede7eb4021a8be385c46c74045.html
- SAP Community: https://community.sap.com/topics/fiori-tools
- Node.js NODE_EXTRA_CA_CERTS: https://nodejs.org/api/cli.html#node_extra_ca_certsfile

License:
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the LICENSE file: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Migrate Neo UI Application to Cloud Foundry with a Managed Approuter

**INTRODUCTION**: Step-by-step actions to extract a Neo mtar/zip, prepare a Fiori UI project, run Fiori Tools migration and descriptor transformation, configure managed approuter deployment, add security scopes/roles, build an MTA archive, deploy to Cloud Foundry, and retrieve the deployed URL. Use these commands in BAS/VS Code terminals and follow the UI prompts where indicated.

**TAGS**: Neo, Cloud Foundry, Fiori, migration, managed-approuter, xs-app.json, xs-security.json, MTA, BAS, ui5

**STEP**: 1. Unzip exported Neo mtar or zip
**DESCRIPTION**: Extract the contents of your exported Neo mtar/zip into a workspace folder. Some nested archives may need additional extraction.
**LANGUAGE**: BASH
**CODE**:
```BASH
unzip /home/user/projects/neo/solution.mtar -d /home/user/projects/neo/
```

**STEP**: 2. Create new Fiori UI project folder
**DESCRIPTION**: Create the target folder that will contain your migrated UI application.
**LANGUAGE**: BASH
**CODE**:
```BASH
mkdir -p /home/user/projects/fioriapp
```

**STEP**: 3. Unzip the Neo UI application into the Fiori folder
**DESCRIPTION**: Extract the exported Neo UI application contents (zip) into the new Fiori project folder.
**LANGUAGE**: BASH
**CODE**:
```BASH
unzip /home/user/projects/neo/manageproductsneo.zip -d /home/user/projects/fioriapp/
```

**STEP**: 4. Run Fiori Tools migration (VS Code / BAS)
**DESCRIPTION**: In VS Code or BAS use Command Palette -> "Fiori: Migrate Project for use in Fiori tools". Select the project. Choose an appropriate SAPUI5 preview version (latest or matching your app). Start migration and review the migration results and application information pages for issues and runnable commands.
**LANGUAGE**: — 
**CODE**:
```text
Command Palette -> Fiori: Migrate Project for use in Fiori tools
- select project and SAPUI5 preview version
- Start migration
- Review Migration Results and Application Information pages
```

**STEP**: 5. Transform neo-app.json to xs-app.json
**DESCRIPTION**: Use the Neo Migration helper to generate xs-app.json routes from neo-app.json. If xs-app.json is overwritten or deleted, re-run this step using neo-app.json as the source.
**LANGUAGE**: — 
**CODE**:
```text
Command Palette -> Neo Migration: HTML 5 Application descriptor transformation
- Select neo-app.json
- A new xs-app.json is created with routes populated from neo-app.json
```

**STEP**: 6. Change to the new UI application folder
**DESCRIPTION**: Move into your Fiori application root before running deployment/config commands.
**LANGUAGE**: BASH
**CODE**:
```BASH
cd /home/user/projects/fioriapp
```

**STEP**: 7. Run deploy-config for Cloud Foundry and configure managed approuter
**DESCRIPTION**: Execute the configured npm script to prepare deployment configuration for CF. When prompted:
- Select destination: "none" (xs-app.json already exists)
- Add application to managed application router: Yes
- Overwrite xs-app.json: No (unless you plan to re-run descriptor transformation)
- Review generated ui5.yaml and ui5-deploy.yaml for correct parameters
**LANGUAGE**: — 
**CODE**:
```text
Command Palette -> npm run deploy-config cf
- destination: none
- Add application to managed application router: Yes
- Overwrite xs-app.json: No
- Review ui5.yaml and ui5-deploy.yaml
```

**STEP**: 8. Start the Fiori UI locally (preview)
**DESCRIPTION**: Start local preview in BAS to validate UI before building/deploying.
**LANGUAGE**: BASH
**CODE**:
```BASH
npm run start
```

**STEP**: 9. Build the application MTA archive for Cloud Foundry
**DESCRIPTION**: Build the MTA (multi-target archive) containing the UI module and managed approuter for CF deployment.
**LANGUAGE**: BASH
**CODE**:
```BASH
npm run build:mta
```

**STEP**: 10. SECURITY ALERT — Add scopes and roles to xs-security.json
**DESCRIPTION**: The generated xs-security.json usually lacks scopes/roles. Append the following security objects to xs-security.json to create manageable scopes, role-templates, and role-collections at subaccount level. Replace $XSAPPNAME with your application name as required.
**LANGUAGE**: JSON
**CODE**:
```JSON
  "scopes":[
    {
      "name": "$XSAPPNAME.migratedroleapp",
      "description": "Migrated scope from managed app"
    }
  ],
  "role-templates": [
    {
      "name": "migratedroleapp",
      "description": "Migrated Role Template from managed app",
      "scope-references": [
      "$XSAPPNAME.migratedroleapp"
      ]
    }
  ],
  "role-collections": [
    {
      "name": "ViewerPUBLIC",
      "description": "Viewer (public) from migrated app",
      "role-template-references": [
        "$XSAPPNAME.migratedroleapp"
      ]
    }
  ]
```

**STEP**: 11. Apply scope to xs-app.json routes
**DESCRIPTION**: Update routes in xs-app.json for endpoints that require authentication/authorization by adding the scope property to the route entry. Example:
**LANGUAGE**: JSON
**CODE**:
```JSON
    {
      "source": "^/northwind/(.*)$",
      "target": "$1",
      "destination": "northwind",
      "csrfProtection": false,
      "scope": "$XSAPPNAME.migratedroleapp"
    },
```

**STEP**: 12. Deploy the generated MTA archive to Cloud Foundry
**DESCRIPTION**: Use the npm script to deploy the previously built MTA archive to your Cloud Foundry environment.
**LANGUAGE**: BASH
**CODE**:
```BASH
npm run deploy
```

**STEP**: 13. Retrieve deployed app URL (HTML5 module)
**DESCRIPTION**: From the project root, run cf html5-list to get the deployed app URL. You can alternatively look up the app URL in SAP BTP cockpit under Subaccount -> HTML5 Applications.
**LANGUAGE**: BASH
**CODE**:
```BASH
cf html5-list -u -di ns-manageproductsneo-destination-service -u --runtime launchpad
```

**STEP**: 14. Ensure role collection mapping for users
**DESCRIPTION**: Map your user profile to the correct role collections in the subaccount (e.g., ViewerPUBLIC) to avoid HTTP 403 when accessing scoped routes. Verify role assignments in SAP BTP cockpit.

**STEP**: 15. Undeploy (if required)
**DESCRIPTION**: Use the provided npm script to undeploy the application from Cloud Foundry.
**LANGUAGE**: BASH
**CODE**:
```BASH
npm run undeploy
```

**STEP**: 16. Additional references
**DESCRIPTION**: Check package.json in your project root for available scripts and additional commands to manage build, deploy, and local preview. If xs-app.json is accidentally deleted/overwritten, rerun the Neo Migration descriptor transformation step using neo-app.json as the source. The migration results page will summarize issues to address post-migration.
**LANGUAGE**: — 
**CODE**:
```text
- Inspect package.json for script commands
- Re-run "Neo Migration: HTML 5 Application descriptor transformation" if xs-app.json is lost
```
--------------------------------

**TITLE**: Configure MTA for Multiple Migrated Neo UI Applications (Managed Approuter)

**INTRODUCTION**: Step-by-step, code-focused instructions to create a managed approuter project, migrate one or more Neo HTML5/SAPUI5 applications into it, generate required descriptor transformations, add security scopes, and build/deploy the multi-app MTA to Cloud Foundry (SAP BTP). Use these steps in Business Application Studio (BAS) or local development when migrating Neo UI apps to Cloud Foundry with an approuter.

**TAGS**: fiori, mta, migration, neo, approuter, xs-app.json, xs-security.json, cloud-foundry, html5, sap-btp, bas, ui5

STEP: 1 — Generate Managed Approuter
DESCRIPTION: Open the CF Application Router Generator in BAS and create a managed approuter project. Set a unique MTA ID and the `router path` to your workspace root. This creates the root project folder (example: managedapp).
LANGUAGE: text
CODE:
```text
From View -> Command Palette: Open CF Application Router Generator
- Change "router path" to your workspace root (e.g. /home/user/projects)
- Select "Managed Approuter"
- Enter a unique MTA ID (e.g. managedapp)
```

STEP: 2 — Change into new managedapp folder
DESCRIPTION: Move into the created managedapp folder. This will be the root of your MTA project where you will add migrated UI subfolders.
LANGUAGE: bash
CODE:
```bash
cd /home/user/projects/managedapp/
```

STEP: 3 — Unzip exported Neo mtar (if applicable)
DESCRIPTION: If you exported a Neo mtar/zip, unzip it to inspect the contents. Some mtar files contain nested archives that must be extracted separately.
LANGUAGE: bash
CODE:
```bash
unzip /home/user/projects/neo/solution.mtar -d /home/user/projects/neo/
```

STEP: 4 — Unzip individual Neo application into managedapp subfolder
DESCRIPTION: Unzip your Neo application archive into a dedicated subfolder under the managedapp root (example: fioriapp). Repeat this step for each Neo UI application you want to append to the MTA.
LANGUAGE: bash
CODE:
```bash
unzip /home/user/projects/neo/manageproductsneo.zip -d /home/user/projects/managedapp/fioriapp
```

STEP: 5 — Run "Fiori: Migrate Project for use in Fiori tools"
DESCRIPTION: Use the Fiori migration command to convert the app for use with Fiori tools and generate supporting artifacts. Select the UI project, confirm the SAPUI5 preview version, and start the migration. Review the migration results and the generated application information page.
LANGUAGE: text
CODE:
```text
Run: Fiori: Migrate Project for use in Fiori tools
- Select your project
- Ensure SAPUI5 preview version is correct
- Select "Start migration"
- Review the migration results and application information page
```

STEP: 6 — Run "Neo Migration: HTML5 Application descriptor transformation"
DESCRIPTION: Transform neo-app.json to xs-app.json for Cloud Foundry routing. Always select the original neo-app.json so the new xs-app.json routes are populated automatically. If xs-app.json is overwritten or deleted, re-run this step.
LANGUAGE: text
CODE:
```text
Run: Neo Migration: HTML5 Application descriptor transformation
- Select neo-app.json in your UI project
- Confirm new xs-app.json is created with routes populated from neo-app.json
```

STEP: 7 — Change into the migrated Fiori UI application folder
DESCRIPTION: Work inside the UI subfolder to finalize configuration and run deployment/build commands.
LANGUAGE: bash
CODE:
```bash
cd /home/user/projects/managedapp/fioriapp
```

STEP: 8 — Create deploy config for Cloud Foundry
DESCRIPTION: Run the deploy-config task to create or validate deploy config files. When prompted:
- Select destination "none" (not required because xs-app.json was created).
- Choose "No" if asked to overwrite xs-app.json (if overwritten, re-run the HTML5 descriptor transformation).
- Inspect and adjust ui5.yaml and ui5-deploy.yaml to match your project parameters.
LANGUAGE: bash
CODE:
```bash
npm run deploy-config cf
# Follow prompts:
# - destination: none
# - Overwrite xs-app.json: No (unless you want to regenerate)
# Review ui5.yaml and ui5-deploy.yaml
```

STEP: 9 — Preview the UI locally
DESCRIPTION: Start a local preview to ensure the migrated UI runs correctly in BAS.
LANGUAGE: bash
CODE:
```bash
npm run start
```

STEP: 10 — Build the MTA archive (includes all Fiori UI apps)
DESCRIPTION: Build the MTA archive which packages the managed approuter plus all appended Fiori UI sub-apps.
LANGUAGE: bash
CODE:
```bash
npm run build
```

STEP: 11 — Add security scopes and role templates to xs-security.json
DESCRIPTION: The generated xs-security.json may be empty. Append scopes, role-templates, and role-collections to enable role collection management at subaccount level. Use $XSAPPNAME where applicable. Add the following block into your xs-security.json (preserve JSON structure when inserting into existing file).
LANGUAGE: json
CODE:
```json
  "scopes":[
    {
      "name": "$XSAPPNAME.migratedroleapp",
      "description": "Migrated scope from managed app"
    }
  ],
  "role-templates": [
    {
      "name": "migratedroleapp",
      "description": "Migrated Role Template from managed app",
      "scope-references": [
      "$XSAPPNAME.migratedroleapp"
      ]
    }
  ],
  "role-collections": [
    {
      "name": "ViewerPUBLIC",
      "description": "Viewer (public) from migrated app",
      "role-template-references": [
        "$XSAPPNAME.migratedroleapp"
      ]
    }
  ]
```

STEP: 12 — Apply scopes to specific xs-app.json routes
DESCRIPTION: For routes that should be protected, update the corresponding xs-app.json route entries with the "scope" property referencing the scope you added to xs-security.json.
LANGUAGE: json
CODE:
```json
{
  "source": "^/northwind/(.*)$",
  "target": "$1",
  "destination": "northwind",
  "csrfProtection": false,
  "scope": "$XSAPPNAME.migratedroleapp"
},
```

STEP: 13 — Deploy the MTA archive to Cloud Foundry
DESCRIPTION: Deploy the built MTA to your Cloud Foundry environment using the provided npm script.
LANGUAGE: bash
CODE:
```bash
npm run deploy
```

STEP: 14 — Retrieve the deployed HTML5 application URL
DESCRIPTION: Use the cf CLI to list HTML5 apps and get the runtime/launchpad URL, or check SAP BTP cockpit > subaccount > HTML5 Applications.
LANGUAGE: bash
CODE:
```bash
cf html5-list -u -di managedapp-destination-service -u --runtime launchpad
# Or: Login to SAP BTP cockpit > Subaccount > HTML5 Applications and view the application URL
```

STEP: 15 — Verify access and role mapping
DESCRIPTION: Ensure your user is assigned the appropriate role collection (e.g., ViewerPUBLIC) at the subaccount to avoid HTTP 403 on scoped routes. Map user profiles to role collections in the BTP cockpit or via the SAP Identity Provider.

STEP: 16 — Undeploy (if required)
DESCRIPTION: Remove the deployed MTA from Cloud Foundry.
LANGUAGE: bash
CODE:
```bash
npm run undeploy
```

STEP: 17 — Append additional migrated UIs to the root mta.yaml
DESCRIPTION: To add more migrated UI applications to the same managedapp MTA, repeat Steps 3–12 for each app. Add each migrated app as a subfolder under the managedapp folder and update root mta.yaml to include the new UI module entries and routes. Ensure unique module names and correct destination references for each added UI.
LANGUAGE: text
CODE:
```text
- For each additional Neo app:
  1. Unzip app into /home/user/projects/managedapp/<new-subfolder>
  2. Run Fiori migration and HTML5 descriptor transformation for that subfolder
  3. Ensure xs-app.json routes, xs-security.json scopes, and mta.yaml module entries are added/updated
  4. Rebuild (npm run build) and redeploy (npm run deploy)
```
--------------------------------

**TITLE**: Migrate HTML5 Applications from SAP BTP Neo to Cloud Foundry

**INTRODUCTION**: Step-by-step technical reference to migrate custom HTML5 (SAPUI5/Fiori) applications from SAP BTP Neo to Cloud Foundry. Includes prerequisites, Dev Space setup, creating migration artifacts (destinations/security), deploy commands, migration options, and actionable troubleshooting (gotchas) with exact file snippets and fixes.

**TAGS**: fiori-samples, sap-btp, cloud-foundry, migration, html5, ui5, destinations, xsuaa, xs-app.json, ui5-tooling

**STEP**: 1 — Prerequisites
**DESCRIPTION**: Ensure required accounts, subscriptions and access are in place before migration.
**LANGUAGE**: Text
**CODE**:
```Text
- SAP BTP account
- Subscribed to SAP Business Application Studio (BAS)
  Tutorial: https://help.sap.com/products/SAP%20Business%20Application%20Studio/9d1db9835307451daa8c930fbd9ab264/6331319fd9ea4f0ea5331e21df329539.html
- Subscribed to SAP Launchpad Service
  Tutorial: https://developers.sap.com/tutorials/cp-portal-cloud-foundry-getting-started.html
- If services missing in Service Marketplace:
  Subaccount -> Entitlements -> Configure Entitlements -> locate and add required service -> Save -> Return to Service Marketplace to add the service
```

**STEP**: 2 — Create SAP Fiori Dev Space
**DESCRIPTION**: Create a Full Stack Cloud Application dev space in BAS with SAP HANA Tools enabled.
**LANGUAGE**: Text
**CODE**:
```Text
SAP BTP cockpit -> Instances and Subscriptions -> SAP Business Application Studio -> open Dev Space Manager
Create: Full Stack Cloud Application dev space (enable SAP HANA Tools)
```

**STEP**: 3 — Prepare Migration Folder and Upload Artifacts
**DESCRIPTION**: Create migration folder, upload exported Neo artifacts (*.mtar, *.zip, mta.yaml) and create base config files used to migrate destinations/security.
**LANGUAGE**: BASH
**CODE**:
```BASH
mkdir -p /home/user/projects/neo/

# Upload your exported artifacts (*.mtar, *.zip, mta.yaml) to /home/user/projects/neo/

# Create baseline config files required for destination/security migration
touch xs-security.json mtad.yaml config.json
```

**STEP**: 4 — mtad.yaml (Cloud Foundry managed services)
**DESCRIPTION**: Define managed service resources for destination and connectivity in mtad.yaml. This deploys services at subaccount level using config.json for initial data.
**LANGUAGE**: YAML
**CODE**:
```YAML
_schema-version: "3.1"
ID: migrationcf
description: Migrate services
version: 1.0.0
resources:
- name: my_destination_service
  type: org.cloudfoundry.managed-service
  parameters:
    service-plan: lite
    service: destination
    path: config.json
- name: my_connectivity_service
  type: org.cloudfoundry.managed-service
  parameters:
    service-plan: lite
    service: connectivity
```

**STEP**: 5 — config.json (subaccount destination initialization)
**DESCRIPTION**: Example init_data for creating subaccount-level destinations. Note: subaccount-level destinations are available to all apps in the subaccount. For instance-level destinations (encapsulated with an app instance), use alternative configuration (see referenced sample link).
**LANGUAGE**: JSON
**CODE**:
```JSON
{
    "init_data": {
      "subaccount": {
        "existing_destinations_policy": "update",
        "destinations": [
        {
          "Name": "northwind",
          "WebIDEEnabled": "true",
          "WebIDEUsage": "odata_gen",
          "HTML5.DynamicDestination": "true",
          "Authentication": "NoAuthentication",
          "Description": "Destination to internet facing host",
          "ProxyType": "Internet",
          "Type": "HTTP",
          "URL": "https://services.odata.org"
        }
      ]
    }
  }
}
```

**STEP**: 6 — xs-security.json (XSUAA security profile)
**DESCRIPTION**: Example xs-security.json with xsappname, tenant-mode and role-templates/collections. Applications can consume the global role collection using the MTA ID and scoped name (e.g., migrationcf.globalrole).
**LANGUAGE**: JSON
**CODE**:
```JSON
{
    "xsappname": "migrationcf",
    "tenant-mode": "dedicated",
    "description": "Security profile of called application",
    "scopes":[
      {
        "name": "$XSAPPNAME.globalrole",
        "description": "Migrated role"
      }
    ],
    "role-templates": [
      {
        "name": "globalrole",
        "description": "Migrated Role Template",
        "scope-references": [
        "$XSAPPNAME.globalrole"
        ]
      }
    ],
    "role-collections": [
      {
        "name": "GobalRole",
        "description": "Global from migrated neo",
        "role-template-references": [
          "$XSAPPNAME.globalrole"
        ]
      }
    ]
}
```

**STEP**: 7 — Login to Cloud Foundry target and deploy services
**DESCRIPTION**: Login to the CF API endpoint targeting the organization and space where migration resources must be created. Then deploy the MTA to provision the managed services described in mtad.yaml.
**LANGUAGE**: BASH
**CODE**:
```BASH
cf login -a <api-endpoint> -o <organisation> -s <space>

# From BAS you can also use: View -> Command Palette -> Login to Cloud Foundry

cf deploy
```

**STEP**: 8 — Migration options for UI apps
**DESCRIPTION**: Two migration patterns produce different folder structures. Choose based on single vs multiple Fiori UI apps in the Neo project.
**LANGUAGE**: Text
**CODE**:
```Text
Options:
- Option 1: Migrate Neo application for a single Fiori UI application (updated for @ui5/cli v3)
  Link: Option1.md
- Option 2: Migrate Neo application supporting multiple Fiori UI applications (references @ui5/cli v2)
  Link: Option2.md

Both options deploy to Cloud Foundry using a managed approuter configuration.
```

**STEP**: 9 — Gotcha: Missing webapp folder or manifest.json
**DESCRIPTION**: SAP Fiori Migration tool requires a webapp folder. If missing, create it, move UI resources (exclude Neo-specific files like neo-app.json, pom.xml, .che). If manifest.json is missing, follow UI5 guide to generate one.
**LANGUAGE**: Text
**CODE**:
```Text
- Ensure project root contains a 'webapp' folder with UI code.
- Exclude Neo-specific files: neo-app.json, pom.xml, .che
- UI5 manifest guide: https://sapui5.hana.ondemand.com/sdk/#/topic/3a9babace121497abea8f0ea66e156d9.html
```

**STEP**: 10 — Gotcha: Component ID mismatch (start/local preview error)
**DESCRIPTION**: Sync Component.js extend ID and manifest.json sap.app.id. Update test/flpSandbox.html to use the Component.js ID for additionalInformation and data-sap-ui-resourceroots.
**LANGUAGE**: JavaScript
**CODE**:
```JavaScript
// Component.js snippet (example)
t.extend("ns.manageproductsneo.Component",{metadata:{manifest:"json"}
```

**STEP**: 11 — Gotcha: manifest.json app id (related snippets)
**DESCRIPTION**: Example manifest.sap.app.id causing mismatch. Update manifest or Component.js so IDs match, and update test/flpSandbox.html lines shown below.
**LANGUAGE**: JSON
**CODE**:
```JSON
    "_version": "1.12.0",
    "sap.app": {
        "id": "manageproductsneo",
```

**STEP**: 12 — Gotcha: Update test/flpSandbox.html entries
**DESCRIPTION**: When running start, update lines in test/flpSandbox.html to reflect the Component.js ID.
**LANGUAGE**: Text
**CODE**:
```Text
Line 49: additionalInformation: "SAPUI5.Component=ns.manageproductsneo",
Line 69: data-sap-ui-resourceroots='{"ns.manageproductsneo": "../"}'
```

**STEP**: 13 — Gotcha: manifest i18n invalid input error
**DESCRIPTION**: Replace complex i18n object in manifest.json with a string path. If errors persist, bump minUI5Version or set UI5 version in ui5.yaml for local validation.
**LANGUAGE**: JSON
**CODE**:
```JSON
// Incorrect i18n block
"i18n": {
            "bundleUrl": "i18n/i18n.properties",
            "supportedLocales": [
                ""
            ],
            "fallbackLocale": ""
        },
```

**STEP**: 14 — Gotcha: Correct i18n entry
**DESCRIPTION**: Use simple string path for i18n in manifest.json.
**LANGUAGE**: JSON
**CODE**:
```JSON
"i18n": "i18n/i18n.properties",
```

**STEP**: 15 — Gotcha: Specify UI5 version in ui5.yaml (optional local validation)
**DESCRIPTION**: Example ui5.yaml snippet to set UI5 runtime version for local preview and tooling.
**LANGUAGE**: YAML
**CODE**:
```YAML
        ui5:
          path:
            - /resources
            - /test-resources
          url: https://ui5.sap.com
          version: 1.109.0
```

**STEP**: 16 — Gotcha: HTTP 403 after deploy — xs-app.json scope issues
**DESCRIPTION**: If deployed app returns HTTP 403, inspect logs in SAP BTP cockpit (HTML5 Applications -> logs). Root cause is typically insufficient roles/scopes in xs-app.json or role collection mapping. Add the user to the role collection or update xs-app.json role mappings. Clear cookies or use incognito to validate changes.
**LANGUAGE**: Text
**CODE**:
```Text
- Check logs: SAP BTP cockpit -> HTML5 Applications -> select app -> Logs
- Validate xs-app.json scope and role collection mappings
- Add user's ID to the role collection if missing
- Clear session cookies or use incognito to force re-authentication
```

**STEP**: 17 — Gotcha: CI/CD linting JS_PARSING_ERROR on locate-reuse-libs.js
**DESCRIPTION**: Update static analysis plugin version in pom.xml to resolve parsing errors from legacy analysis plugin.
**LANGUAGE**: XML
**CODE**:
```XML
<!-- Current configuration -->
<sap.analysis.version>1.54.8</sap.analysis.version>

<!-- Proposed configuration -->
<sap.analysis.version>2.0.4</sap.analysis.version>
```

**STEP**: 18 — Gotcha: HTTP 404 due to absolute AJAX paths
**DESCRIPTION**: Avoid absolute API paths in client-side code. Use relative paths so platform-assigned GUIDs are preserved in the runtime URL. Absolute paths bypass the GUID and cause 404s in Cloud Foundry.
**LANGUAGE**: Text
**CODE**:
```Text
- Replace absolute API calls with relative paths.
- Example: use "/api/myService" instead of "https://<app-guid>.<subdomain>/api/myService"
```

**STEP**: 19 — Gotcha: Local preview proxy mapping mismatch (fiori-tools-proxy)
**DESCRIPTION**: When using fiori-tools-proxy with npm run start, align xs-app.json routes and ui5.yaml backend definitions. Use pathReplace in ui5.yaml to strip prefixes that xs-app.json removes on Cloud Foundry.
**LANGUAGE**: JSON
**CODE**:
```JSON
{
  "welcomeFile": "/index.html",
  "authenticationMethod": "route",
  "routes": [
    {
      "source": "^/scim/(.*)$",
      "target": "$1",
      "destination": "API_ENDPOINT",
      "authenticationType": "none",
      "csrfProtection": false
    },
    {
      "source": "^/sap/(.*)$",
      "target": "/sap/$1",
      "destination": "s4hc_onpremise",
      "authenticationType": "xsuaa",
      "csrfProtection": false
    }
    ...
  ]
}
```

**STEP**: 20 — Gotcha: ui5.yaml proxy configuration (example)
**DESCRIPTION**: ui5.yaml sample showing fiori-tools-proxy backend entries. Add pathReplace for endpoints that need prefixes removed in proxied requests.
**LANGUAGE**: YAML
**CODE**:
```yaml
# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json

specVersion: "3.1"
metadata:
  name: my.fiori.app
type: application
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        ignoreCertErrors: false
        ui5:
          path:
            - /resources
            - /test-resources
          url: https://ui5.sap.com
        backend:
          - path: /scim
            pathReplace: /
            url: https://some.external.resource/scim/v2
            destination: API_ENDPOINT
          - path: /sap
            url: http://s4hconpremise:44320
            destination: s4hc_onpremise
    - name: fiori-tools-appreload
      afterMiddleware: compression
      configuration:
        port: 35729
        path: webapp
        delay: 300
    - name: fiori-tools-preview
      afterMiddleware: fiori-tools-appreload
      configuration:
        flp:
          theme: sap_horizon
```

**STEP**: 21 — Reporting issues and traces
**DESCRIPTION**: If unresolved, open an SAP support incident and attach a full network trace (.har) captured after reproducing the issue.
**LANGUAGE**: Text
**CODE**:
```Text
- Capture full network trace (.har) including all requests.
- Guidance: How to capture an HTTP trace using Chrome or Edge:
  https://launchpad.support.sap.com/#/notes/1990706
- Attach the .har and reproduction steps to the SAP support incident.
```

**STEP**: 22 — References and License
**DESCRIPTION**: Keep referenced migration guide and licensing information.
**LANGUAGE**: Text
**CODE**:
```Text
- Referenced migration guide:
  https://help.sap.com/docs/HTML5_APPLICATIONS/b98f42a4d2cd40a9a3095e9f0492b465/b1763fd06421457b9970a3555020e750.html

- License:
  Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
  Licensed under Apache Software License, version 2.0
  See: ../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Deploy Fiori generator extensions to Business Application Studio (BAS) using WEX

**INTRODUCTION**: Step-by-step, action-oriented instructions to make a Fiori generator extension available in BAS by (1) testing locally, (2) publishing a release artifact on GitHub (private repo with PAT), (3) preparing a WEX simple-extension configuration, and (4) deploying the configuration with the SAP Business Application Studio Extension Management (WEX) tool so the extension is auto-installed in new dev spaces.

**TAGS**: fiori, business-application-studio, bas, wex, fiori-generator, generator-extension, npm, github, PAT

**STEP**: Preconditions — WEX tool and repo requirements

**DESCRIPTION**: Ensure WEX preconditions are met and that the extension artifact will be publicly accessible to BAS (or accessible via a GitHub URL including a PAT). If the extension is TypeScript, include the compiled output in the repo (dist or compiled files). Relevant docs:
- WEX package: https://www.npmjs.com/package/@sapse/business-application-studio-extension-management
- BAS extension preconditions: https://help.sap.com/docs/bas/sap-business-application-studio/create-and-deploy-sap-business-application-studio-extension

**LANGUAGE**: Text

**CODE**:
```text
- Ensure the compiled output (for TypeScript extensions) is included in the repository (e.g., "dist/" or compiled files).
- Create a GitHub repo (can be private) to host the release artefact.
- Use a GitHub Personal Access Token (PAT) with minimum scopes: read:packages and repo.
- Preferred: create a versioned release artifact via "Draft a new release" on GitHub.
```

**STEP**: Local packaging and testing

**DESCRIPTION**: Generate a tarball of the extension package and install it globally to test locally in BAS-like environments. Run npm pack in the package root to create the tarball, then install globally with npm install -g <tarfile>. Verify the extension behavior locally.

**LANGUAGE**: Shell

**CODE**:
```shell
# In the extension package root:
npm pack

# Install the generated tarball globally for local testing:
npm install -g <extension_tarfile>
```

**STEP**: Publish release on GitHub and generate PAT

**DESCRIPTION**: Push package source and compiled output to the repo. On GitHub, create a release (Draft a new release) and use the release tarball URL as the yeomanPackages versionRange in the WEX config. Generate a GitHub PAT (Profile -> Settings -> Developer Settings -> Tokens (classic)) with scopes: read:packages and repo. Use the PAT in the release artifact URL to allow BAS to download the tarball.

**LANGUAGE**: Text

**CODE**:
```text
- Push package and compiled output to your GitHub repository.
- Create a release using "Draft a new release" (https://github.com/<User Name>/<Repository Name>/releases/new).
- Create a GitHub PAT (classic) with scopes: read:packages and repo.
- Use the release archive URL format:
  https://<User Name>:<Github PAT>@github.com/<User Name>/<Repository Name>/archive/refs/tags/<tag>.tar.gz
```

**STEP**: Prepare WEX simple-extension config file

**DESCRIPTION**: Create the simple-extension JSON config file to tell BAS which yeoman package (extension) to fetch and install. Replace placeholders (<User Name>, <Github PAT>, <sub-account_name>, base64 image, versions, tag) with real values. To auto-select the extension for all new dev spaces, set autoSelectExtensions to ["ext-sap-ux-stage/testing-sample-gen-ext"] (or appropriate namespace/name).

File: sample-extension.json

**LANGUAGE**: JSON

**CODE**:
```json
{
    "apiVersion": "1",
    "name": "testing-sample-gen-ext",
    "namespace": "ext-<sub-account_name>",
    "autoSelectExtensions": [
    ],
    "about": {
        "tagline": "Sample Gen Ext - SAP Fiori Tools",
        "description": "Test extensions config - Sample Gen Ext",
        "thumbnail": "<base 64 encoded image>"
    },
    "hidden": false,
    "version": "0.0.2",
    "vscodeExtensions": [],
        "yeomanPackages": [
            {
                "name": "@sample/fiori-gen-ext",
                "versionRange": "https://<User Name>:<Github PAT>@github.com/<User Name>/sample-fiori-gen-ext/archive/refs/tags/v0.0.1.tar.gz"
            }
        ]
}
```

**STEP**: Deploy WEX configuration

**DESCRIPTION**: Use the WEX CLI to deploy the simple-extension config to BAS so the Create Dev Space page shows the new extension option. Run wex deploy with the config file. See the WEX npm page for full CLI docs.

**LANGUAGE**: Shell

**CODE**:
```shell
# Install WEX CLI (if not installed):
npm install -g @sapse/business-application-studio-extension-management

# Deploy your config:
wex deploy --verbose -f sample-extension.json
```

**STEP**: Verify installation and logs in BAS

**DESCRIPTION**: After successful deployment, the new extension option appears on the BAS Create Dev Spaces page. If you configured autoSelectExtensions, it will be selected by default. Create a dev space (or select the extension) and verify the extension installation. Check the install log inside the opened dev space for errors or success messages at the specified path.

**LANGUAGE**: Text

**CODE**:
```text
- Create a dev space in BAS using the configured extension option.
- Verify logs inside the dev space at:
/extbin/generators/simple-extension-yo-install-output.txt
```
--------------------------------

**TITLE**: Sample Fiori generator extension sub-generator (sample-fiori-gen-ext)

**INTRODUCTION**: This document describes how to build, install, test, and develop a Fiori generator extension that integrates with @sap/generator-fiori. It includes installation steps, package.json requirements, API surface to implement (FioriGeneratorExtensionAPI), examples to customize existing prompts, add new navigation steps and prompts, and update/write generated files using Yeoman's in-memory file system.

**TAGS**: fiori, generator, extension, yeoman, sap, vscode, business-application-studio, sample, @sap/generator-fiori

STEP: Build and install the sample extension (local development)
DESCRIPTION: Clone the sample repo, install node dependencies, build the extension bundle, create an installable tgz, and install it globally for local testing.
LANGUAGE: Shell
CODE:
```bash
# Clone repo (example)
git clone https://github.com/SAP-samples/fiori-tools-samples.git
cd sample-fiori-gen-ext

# Install dependencies (requires yarn)
yarn install

# Bundle the extension
yarn bundle

# Create installable artefact
npm pack

# Install the generated tgz globally for testing (replace with actual path)
npm i -g <path-to-generated-tgz>
```

STEP: Bundling for deployment to Business Application Studio (BAS)
DESCRIPTION: Recommended workflow to prepare a deployable bundle that avoids runtime installs in BAS dev spaces. Use esbuild-based bundling provided in the sample. Check the bundle into the repo for WEX deployments.
LANGUAGE: Shell
CODE:
```bash
# Bundle the extension (esbuild script usage)
yarn bundle

# Create the tgz for local testing
npm pack

# Install locally to test
npm i -g <path-to-generated-tgz>
```

STEP: Extension installation locations and package.json requirements
DESCRIPTION: Where to install extension modules so the Fiori generator discovers them, and the required package.json keywords and naming conventions.
LANGUAGE: JSON
CODE:
```json
{
    "notes": [
        "Install locations that will be scanned for extension generators:",
        "1. Global npm module location (Run `npm -g root` to view path). Install using `npm install -g <extension-module-tgz>`",
        "2. Any standard install locations in a BAS dev space (pre-install configuration for dev spaces)",
        "3. Custom location defined by the VSCode setting: `Application Wizard: Installation Location`"
    ],
    "requirements": [
        "Module folder name must include the string `fiori-gen-ext` (package name typically includes this).",
        "package.json must include the keyword: `\"fiori-generator-extension\"`.",
        "Include the `yeoman-generator` keyword to indicate this is a Yeoman generator."
    ],
    "example": {
        "name": "@acme/acme-fiori-gen-ext",
        "keywords": [
            "fiori-generator-extension"
        ]
    }
}
```

STEP: Implement the FioriGeneratorExtensionAPI interface
DESCRIPTION: Implement this interface in your generator to provide settings, prompt extensions, and navigation steps to the host @sap/generator-fiori. Import types from @sap/generator-fiori.
LANGUAGE: TypeScript
CODE:
```typescript
export interface FioriGeneratorExtensionAPI {
    /**
     * Returns the settings to control some prompt and generation options
     */
    _getSettings?: () => FioriGeneratorSettings;
    /**
     * Returns the extensions which extend existing Fiori generator prompts
     */
    _getExtensions?: () => FioriGeneratorPromptExtension;
    /**
     * Returns the navigation steps which group new prompts provided by the `prompting` phase
     */
    _getSteps?: () => Step[];
}
```

STEP: Customize existing Fiori generator prompts (extend validators/defaults)
DESCRIPTION: Provide _getExtensions implementation to extend/promote modifications for existing Project Attributes prompts (name, title, namespace, description, targetFolder, ui5Version). Extensions can override default and validate fields. Example below shows customizing the module name prompt to require length > 3 and set a default.
LANGUAGE: TypeScript
CODE:
```typescript
...
import { FioriGeneratorExtensionAPI, FioriGeneratorPromptNames } from "@sap/generator-fiori";

...
class extends Generator implements FioriGeneratorExtensionAPI
...
// Get the Fiori generator "Project Attributes" step main question names
const { projectAttributes: { mainQuestions: questionNames } } = FioriGeneratorPromptNames;
...
...
    // Provide the extension prompts
    _getExtensions(): FioriGeneratorPromptExtension {
        this.log(`Getting extension defintions`);
        const extensions = {
            "@sap/generator-fiori": {
                [questionNames.name]: {
                    validate: (input: string): boolean | string => {
                        if (input.length < 3) {
                           return "Name length > 3";
                        }
                        return true;
                    },
                    default: "superapp1",
                }
            }
        }
        return extensions;
    }
...
```

STEP: Add new navigation steps and prompts to the Application Wizard UI
DESCRIPTION: Provide _getSteps to expose navigation entries on the left-hand side. For each step you must call prompt() once in the generator's prompting lifecycle. The example below adds two steps and runs corresponding prompt groups. Store combined answers to a local object for use in later phases.
LANGUAGE: TypeScript
CODE:
```typescript
...
import { FioriGeneratorExtensionAPI } from "@sap/generator-fiori";
import { IPrompt as YUIStep } from "@sap-devx/yeoman-ui-types";
...
class extends Generator implements FioriGeneratorExtensionAPI {
...
    async prompting(): Promise<void> {
        this.log('Sample Fiori generator extension: prompting()');
        // These are the prompts for the first step
        const answersPrompt1 = await this.prompt([
            {
                type: "input",
                guiOptions: {
                breadcrumb: true,
                },
                name: "prompt1",
                message: "Sample prompt1",
                default: 'Default value prompt1',
                validate: (val, answers): boolean | string =>
                    val ? true : "Validation message from prompt1, enter a value"
            },
            {
                type: "input",
                guiOptions: {
                breadcrumb: true,
                },
                name: "prompt2",
                message: "Sample prompt2",
                validate: (val, answers): boolean | string =>
                val ? true : "Validation message from prompt2, enter a value"
            }
        ]);
        this.log(`Answers from sample sub-generator "Extension step 1" prompts:  ${JSON.stringify(answersPrompt1)}`);
        // These are the prompts for the second step
        const answersPrompt2 = await this.prompt([
            {
                type: "input",
                guiOptions: {
                breadcrumb: true,
                },
                name: "prompt3",
                message: "Sample prompt3",
                default: () => this.fioriGeneratorState.project.namespace || ""
            },
            {
                type: "input",
                guiOptions: {
                breadcrumb: true,
                },
                name: "prompt4",
                message: "Sample prompt4"
            }
        ]);
        this.log(`Answers from sample sub-generator "Extension step 2" prompts:  ${JSON.stringify(answersPrompt2)}`);
        // Assign local answers for access in following phases
        this.localAnswers = Object.assign({}, answersPrompt1, answersPrompt2);
    }
    // Return the nav steps that will be added to the LHS navigation panel
    // Note: for each step there must be one call to prompt()
    _getSteps(): YUIStep[] {
        return [
            {
                name: "Extension step 1",
                description: "Extension step 1 description",
            },
            {
                name: "Extension step 2",
                description: "Extension step 2 description",
            }
        ];
    }
...
}
```

STEP: Conditionally add steps (reference)
DESCRIPTION: To show/hide steps conditionally (e.g., based on previous answers), follow patterns similar to the generator-foodq example in yeoman-ui. Use conditional logic in _getSteps or prompt flows as needed.
LANGUAGE: Shell
CODE:
```bash
# Reference example repository for conditional steps:
# https://github.com/SAP/yeoman-ui/tree/master/packages/generator-foodq
```

STEP: Update or write files during the writing phase (use Yeoman in-memory fs)
DESCRIPTION: The Fiori generator composes extensions after prompting and places them at the end of the run loop so your extension's writing() can extend generated files already present in memory. Use this.fs to writeJSON, extendJSON, check existence, and update package.json or manifest.json.
LANGUAGE: TypeScript
CODE:
```typescript
...
    async writing(): Promise<void> {
        const manifestPath = this.destinationPath('webapp', 'manifest.json');
        // Write a new file with some prompt answers
        this.fs.writeJSON(this.destinationPath('sample.json'), {
        moduleName: this.fioriGeneratorState.project.name,
        moduleNamespace: this.fioriGeneratorState.project.namespace,
        ...this.localAnswers
        });

        // Extend the application manifest.json
        this.fs.extendJSON(manifestPath, {
        'sap.app': {
            tags: {
                keywords: ["fiori", "custom extension", "acme"]
            }
        }});

        // Update the package.json, for example, by adding a dependency
        const packageJsonPath = this.destinationPath('package.json');
        if (this.fs.exists(packageJsonPath)) {
        this.fs.extendJSON(packageJsonPath, { devDependencies: { 'fast-glob': '3.2.12' }})
        };
    }
...
```

STEP: Deployment to Business Application Studio (BAS)
DESCRIPTION: For instructions to deploy the extension bundle to BAS using WEX, see the sample repo deploy instructions. Check the bundle into your repo for WEX tool deployment and replace local npm pack/install steps with your CI release workflow if desired.
LANGUAGE: Plaintext
CODE:
```text
Deployment reference:
https://github.com/SAP-samples/fiori-tools-samples/sample-fiori-gen-ext/deploy_extension.md

Notes:
- For repo-based releases you can create a GitHub release (Draft a new release) and let WEX deploy the bundle to BAS dev spaces.
- When using WEX, step of installing tgz locally is replaced by WEX tool configuration for BAS dev spaces.
```

STEP: References and support
DESCRIPTION: Links for the sample repository, inquirer prompt spec reference, Yeoman compose/run-loop, and community support channels.
LANGUAGE: Plaintext
CODE:
```text
Sample extension repo:
https://github.com/SAP-samples/fiori-tools-samples/sample-fiori-gen-ext

Inquirer question format:
https://github.com/SBoudrias/Inquirer.js/tree/master/packages/inquirer#questions

Yeoman composeWith / run loop:
https://yeoman.io/authoring/composability.html
https://yeoman.io/authoring/running-context.html

Conditional steps example:
https://github.com/SAP/yeoman-ui/tree/master/packages/generator-foodq

Community & support:
https://answers.sap.com/tags/73555000100800002345
Email: SAPFioriElements@sap.com
```
--------------------------------

**TITLE**: Add the xml-js External Library to a SAP Fiori (SAPUI5) Freestyle Application

**INTRODUCTION**: This guide shows two safe, code-focused ways to add the third‑party xml-js library to a SAPUI5 freestyle application (sample project: ./ztravelapp). Use Case: parse/convert XML ↔ JSON in client-side controllers. Choose the approach that matches your project toolchain (npm + bundler or static browser script).

**TAGS**: sapui5, sap-fiori, sap-btp, xml-js, third-party-library, freestyle, BAS, northwind

**STEP**: Prerequisites
**DESCRIPTION**: Ensure you have the following before adding the library.
- SAP BTP account
- SAP Business Application Studio subscription (follow the tutorial linked in your environment)
- Sub-account destination named `northwind` is available (a `northind` configuration is attached)
- Sample project path: ./ztravelapp/README.md
**LANGUAGE**: text
**CODE**:
```text
Prerequisites summary:
- SAP BTP account
- SAP Business Application Studio subscription
- Destination: northwind (see attached 'northind' configuration)
- Sample project: ./ztravelapp/README.md
Library to add: xml-js (npm package)
```

**STEP**: Option A — Add xml-js via npm (recommended if you use UI5 Tooling / bundler)
**DESCRIPTION**: Install xml-js into your project, let your bundler or UI5 Tooling resolve it, then import/require it in controllers. This integrates cleanly with modern build flows.
**LANGUAGE**: Shell
**CODE**:
```bash
# From your project root
npm install xml-js --save
```

**STEP**: Option A — Controller usage with CommonJS require (UI5 with bundler/require support)
**DESCRIPTION**: Use require() to load xml-js in controllers when bundling or running with a CommonJS-compatible loader.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
// webapp/controller/Main.controller.js
sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";

  // If your build resolves npm modules via require()
  var convert = (typeof require !== "undefined") ? require("xml-js") : null;

  return Controller.extend("your.namespace.controller.Main", {
    onInit: function () {
      var xml = "<root><item>value</item></root>";
      if (convert) {
        // xml2json is provided by xml-js
        var jsonString = convert.xml2json(xml, { compact: true, spaces: 2 });
        console.log("xml-js output (string):", jsonString);
        // If you prefer a JS object:
        var jsonObj = JSON.parse(jsonString);
        console.log("xml-js output (object):", jsonObj);
      } else {
        console.warn("xml-js not available via require()");
      }
    }
  });
});
```

**STEP**: Option A — Controller usage with ES module import (if your toolchain supports ES imports)
**DESCRIPTION**: Import xml-js as an ES module when your bundler supports it. Use the exported functions directly.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
// webapp/controller/Main.controller.js (with ES module support)
import Controller from "sap/ui/core/mvc/Controller";
import * as convert from "xml-js"; // bundler resolves this import

export default Controller.extend("your.namespace.controller.Main", {
  onInit() {
    const xml = "<root><item>value</item></root>";
    const jsonString = convert.xml2json(xml, { compact: true, spaces: 2 });
    const jsonObj = JSON.parse(jsonString);
    console.log(jsonObj);
  }
});
```

**STEP**: Option B — Add xml-js as a static browser script (no bundler)
**DESCRIPTION**: Use the xml-js browser/UMD distribution: copy the distribution file into your app (webapp/resources/lib/) and register it so UI5 loads it. Then access the exposed global object in controllers. Confirm the global name exposed by the specific UMD file you copied (common names: window.convert, window.xmljs, or check the file header).
**LANGUAGE**: File operations / JSON
**CODE**:
```text
# Place the browser distribution file in:
webapp/resources/lib/xml-js.min.js
```

**STEP**: Option B — Reference the static script in index.html (after UI5 bootstrap)
**DESCRIPTION**: Include the library script after the UI5 bootstrap script tag so the global is available to controllers.
**LANGUAGE**: HTML
**CODE**:
```html
<!-- webapp/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Your App</title>
    <script id="sap-ui-bootstrap"
      src="resources/sap-ui-core.js"
      data-sap-ui-libs="sap.m"
      data-sap-ui-theme="sap_belize">
    </script>

    <!-- Add the xml-js browser distribution file -->
    <script src="resources/lib/xml-js.min.js"></script>
  </head>
  <body class="sapUiBody" id="content">
    <!-- App content -->
  </body>
</html>
```

**STEP**: Option B — Register the static script in manifest.json (alternative to index.html)
**DESCRIPTION**: Use manifest.json to register the JS resource so UI5 loads it with the app.
**LANGUAGE**: JSON
**CODE**:
```json
// webapp/manifest.json (snippet)
{
  "sap.ui5": {
    "resources": {
      "js": [
        {
          "uri": "resources/lib/xml-js.min.js"
        }
      ]
    }
  }
}
```

**STEP**: Option B — Controller usage when loaded as a global
**DESCRIPTION**: Access the global object exposed by the UMD build. Check the library file to determine the exact global variable name; the example below tries common fallbacks.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
// webapp/controller/Main.controller.js
sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";

  return Controller.extend("your.namespace.controller.Main", {
    onInit: function () {
      var xml = "<root><item>value</item></root>";

      // Try common global names (confirm with the UMD file you added)
      var convert = window.convert || window.xmljs || window["xml-js"] || null;

      if (convert && typeof convert.xml2json === "function") {
        var jsonString = convert.xml2json(xml, { compact: true, spaces: 2 });
        var jsonObj = JSON.parse(jsonString);
        console.log(jsonObj);
      } else {
        console.warn("xml-js global not found. Confirm the UMD file exposes a global and its name.");
      }
    }
  });
});
```

**STEP**: Verify and test
**DESCRIPTION**: Run the app in SAP Business Application Studio or on your deployed environment. Open browser console and ensure xml-js functions are callable and output matches expectations. For the sample project, check ./ztravelapp/README.md for project-specific instructions and adapt the file paths accordingly.
**LANGUAGE**: text
**CODE**:
```text
Verification checklist:
- If using npm/bundler: confirm xml-js is in package.json and the bundler has included it.
- If using static script: confirm webapp/resources/lib/xml-js.min.js exists and loads (check Network tab).
- In browser console, invoke a conversion to confirm output:
  - convert.xml2json('<root><a>1</a></root>', {compact: true, spaces: 2})
```
--------------------------------

**TITLE**: Add xml-js External Library to SAP Fiori UI5 Application

**INTRODUCTION**: Step-by-step instructions to add the third-party library xml-js to a freestyle SAPUI5 application, enable ui5-tooling middleware to support NPM package imports, and consume xml-js inside a controller.

**TAGS**: fiori, sapui5, ui5, xml-js, npm, ui5-tooling, middleware

**STEP**: Prerequisites

**DESCRIPTION**: Ensure you have the required environment and subscriptions before starting.

**LANGUAGE**: text

**CODE**:
```text
- SAP Business Technology Platform (SAP BTP) account
- Subscribed to SAP Business Application Studio (follow: https://help.sap.com/products/SAP%20Business%20Application%20Studio/9d1db9835307451daa8c930fbd9ab264/6331319fd9ea4f0ea5331e21df329539.html)
- Sub-account destination named `northwind` available
```

**STEP**: Create SAP Fiori Dev Space

**DESCRIPTION**: From SAP BTP cockpit open Instances and Subscriptions → SAP Business Application Studio → launch dev space manager and create a SAP Fiori dev space.

**LANGUAGE**: text

**CODE**:
```text
Open SAP BTP cockpit → Instances and Subscriptions → Select SAP Business Application Studio → open dev space manager → Create "SAP Fiori" dev space
```

**STEP**: Generate Freestyle SAPUI5 Application

**DESCRIPTION**: Scaffold a freestyle SAPUI5 app using SAP Fiori Tools. Refer to the official guide for details and options.

**LANGUAGE**: text

**CODE**:
```text
Reference: Developing Apps with SAP Fiori Tools
https://sapui5.hana.ondemand.com/sdk/#/topic/a460a7348a6c431a8bd967ab9fb8d918
```

**STEP**: Install Third-Party Library (xml-js)

**DESCRIPTION**: Add xml-js as a runtime dependency in your project package.json.

**LANGUAGE**: Bash

**CODE**:
```bash
npm install xml-js --save-prod
```

**STEP**: Install UI5 Tooling Extension (ui5-tooling-modules)

**DESCRIPTION**: Add the ui5-tooling extension that provides a custom middleware/task enabling NPM package names to be used inside UI5 modules.

**LANGUAGE**: Bash

**CODE**:
```bash
npm install ui5-tooling-modules --save-prod
```

**STEP**: Enable ui5-tooling-middleware in ui5.yaml

**DESCRIPTION**: Open ui5.yaml and append the provided task configuration. Maintain YAML alignment/indentation according to your existing file structure (this snippet is the block to insert under tasks).

**LANGUAGE**: YAML

**CODE**:
```YAML
    - name: ui5-tooling-modules-middleware
      afterMiddleware: compression
      configuration:
        addToNamespace: true
```

**STEP**: Import xml-js into View1.controller.js (sap.ui.define)

**DESCRIPTION**: Open webapp/controller/View1.controller.js and add xml-js as a dependency in sap.ui.define. Update the controller function signature to accept the library reference. Use the exact module name "xml-js" and a matching parameter name (e.g., xmljs).

**LANGUAGE**: JavaScript

**CODE**:
```JS
sap.ui.define(
  ["sap/ui/core/mvc/Controller", "xml-js"],
```

**STEP**: Update controller function parameters to include xml-js

**DESCRIPTION**: Change the function parameter list to receive the imported xml-js module (parameter name here is xmljs). This must align positionally with the sap.ui.define dependency array.

**LANGUAGE**: JavaScript

**CODE**:
```JS
function (Controller, xmljs) {
```

**STEP**: Consume xml-js inside your controller

**DESCRIPTION**: Use xml-js API to convert XML to JSON. Example uses xmljs.xml2json then parses the returned JSON string to a JavaScript object. Place this code where you handle the XML input (e.g., in an event handler or onInit).

**LANGUAGE**: JavaScript

**CODE**:
```JS
 var xmlToJson = JSON.parse(
      xmljs.xml2json(xml, {
        compact: true,
        spaces: 4,
      })
    );
    console.log(`>>>> xmlToJson ${JSON.stringify(xmlToJson)}`);
```

**STEP**: Reference for sap.ui.define Third-Party Modules

**DESCRIPTION**: Review the official SAPUI5 documentation for details on importing third-party modules using sap.ui.define (Third Party Modules section).

**LANGUAGE**: text

**CODE**:
```text
https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui%23methods/sap.ui.define
```

**STEP**: Additional resources

**DESCRIPTION**: Further reading and examples for using external libraries in UI5/CAP and Smart Templates tips.

**LANGUAGE**: text

**CODE**:
```text
- External libraries in UI5 + CAP + SAP Build Work Zone, Standard Edition
  https://blogs.sap.com/2023/11/08/external-libraries-in-ui5-cap-sap-build-work-zone-standard-edition/
- Smart templates and SAP Fiori Apps – 57 Tips and Tricks
  https://blogs.sap.com/2019/09/20/smart-templates-tips-and-tricks/
```
--------------------------------
