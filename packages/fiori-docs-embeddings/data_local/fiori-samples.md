
--------------------------------

**TITLE**: Samples for SAP Fiori tools — Quick dev runbook

**INTRODUCTION**: Short, action-oriented instructions to clone, install, run, and access sample SAP Fiori elements projects from the fiori-tools-samples repository. Includes exact file paths, commands, and example OData endpoint usage (mock service).

**TAGS**: fiori, SAP, "Fiori tools", "Fiori elements", samples, "mock OData", tutorials, "SAP Fiori tools"

**STEP**: 1 — Prerequisites and documentation
**DESCRIPTION**: Review required tools and platform setup before running samples. Use the official SAP Fiori tools documentation for platform-specific installation and prerequisites.
**LANGUAGE**: text
**CODE**:
```text
Documentation: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html
```

**STEP**: 2 — Clone the repository
**DESCRIPTION**: Download the sample repository to your local filesystem. Use the HTTPS URL below or your preferred git configuration.
**LANGUAGE**: bash
**CODE**:
```bash
git clone https://github.com/SAP-samples/fiori-tools-samples.git
# Example repo path after clone:
# <your-workspace>/fiori-tools-samples
```

**STEP**: 3 — Open a sample project folder and install dependencies
**DESCRIPTION**: Change directory to the sample app you want to run (example path provided). Install Node dependencies with npm.
**LANGUAGE**: bash
**CODE**:
```bash
# Example: open the V2 sample apps folder and a specific app
cd fiori-tools-samples/V2/apps/myfioriapp

# Install dependencies
npm install
```

**STEP**: 4 — Start the sample app locally
**DESCRIPTION**: Host the SAP Fiori elements sample locally using the project's start script. Note the CLI will print the app URL and Service Path (used for the mock OData endpoint).
**LANGUAGE**: bash
**CODE**:
```bash
# Start the dev server (default: localhost, port typically shown in console, e.g., 8083)
npm start

# After npm start, the console shows:
# URL: http://localhost:8083
# Service Path: /sap/opu/odata/sap/SEPMRA_PROD_MAN
# To open the app, browse to the printed URL in your browser.
```

**STEP**: 5 — Build the mock OData endpoint URL (example)
**DESCRIPTION**: Combine the printed URL and Service Path to form the OData service root. Use this URL to access OData metadata, entity sets, or to point the Fiori app to the mock service.
**LANGUAGE**: bash
**CODE**:
```bash
# Example combination (from the sample console output)
BASE_URL="http://localhost:8083"
SERVICE_PATH="/sap/opu/odata/sap/SEPMRA_PROD_MAN"
SERVICE_URL="${BASE_URL}${SERVICE_PATH}"

echo "Mock OData service root: ${SERVICE_URL}"
# Output:
# Mock OData service root: http://localhost:8083/sap/opu/odata/sap/SEPMRA_PROD_MAN
```

**STEP**: 6 — Query the mock OData service (examples)
**DESCRIPTION**: Use curl or a browser to fetch service metadata and entity set data from the mock OData endpoint.
**LANGUAGE**: bash
**CODE**:
```bash
# Get OData $metadata
curl "${SERVICE_URL}/$metadata"

# Query an entity set (example: Products)
curl "${SERVICE_URL}/Products?$top=5"

# Example: open in browser:
# http://localhost:8083/sap/opu/odata/sap/SEPMRA_PROD_MAN/$metadata
# http://localhost:8083/sap/opu/odata/sap/SEPMRA_PROD_MAN/Products
```

**STEP**: 7 — Reference image and paths
**DESCRIPTION**: Sample UI screenshot path and repository license location. Keep these paths for documentation or embedding in tutorials.
**LANGUAGE**: text
**CODE**:
```text
Screenshot (example): V2/apps/images/products-review-run.png
License file: /LICENSES/Apache-2.0.txt
```

**STEP**: 8 — Known issues, support channels and reporting
**DESCRIPTION**: No known issues in this repo. Use the SAP Community for questions or report tutorial integration issues to the Tutorials tracker.
**LANGUAGE**: text
**CODE**:
```text
Support options:
1) SAP Community Q&A: https://answers.sap.com/questions/ask.html
   - When posting, add the tag: "SAP Fiori tools"

2) If issue relates to SAP Developer tutorials integration:
   Report here: https://github.com/SAPDocuments/Tutorials/issues/new
```

**STEP**: 9 — License
**DESCRIPTION**: Project is licensed under Apache License 2.0. Verify the repository license file.
**LANGUAGE**: text
**CODE**:
```text
License: Apache Software License, version 2.0
File: /LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: SAP Fiori elements application - Products Review (List Report Object Page, V2)

**INTRODUCTION**: Quick, code-focused instructions to set up, run, and use the "Products Review" SAP Fiori elements sample (List Report Object Page V2). Includes exact terminal commands, project path, and how to obtain the OData service URL exposed by the local mock server for use with SAP Fiori tools.

**TAGS**: fiori-samples, SAP, Fiori, OData, mock-server, list-report, object-page, LROP V2, npm

**STEP**: 1 — Prepare workspace and clone repository

**DESCRIPTION**: Create a local folder, clone the sample repository, and change into the sample project directory fiori-tools-samples/V2/products-review. Replace <repository-url> with the repo you use (example repo URL shown).

**LANGUAGE**: Shell

**CODE**:
```bash
# Create workspace folder and enter it
mkdir -p ~/fiori-samples
cd ~/fiori-samples

# Clone the repository (replace <repository-url> if you have a fork)
# Example repository URL (use only if valid for you):
# git clone https://github.com/SAP-samples/fiori-tools-samples.git
git clone <repository-url>

# Change to the specific sample project
cd fiori-tools-samples/V2/products-review
```

**STEP**: 2 — Install project dependencies

**DESCRIPTION**: Install all Node.js dependencies declared in package.json before starting the mock server / application.

**LANGUAGE**: Shell

**CODE**:
```bash
# Install dependencies from package.json
npm install
```

**STEP**: 3 — Start the application / local mock server

**DESCRIPTION**: Start the sample application. The mock server will host the OData service locally. Watch the terminal output for two values printed by the mock server: "URL" and "Service Path". Combine them to form the full OData service endpoint: <URL><Service Path> (no extra slash if already included).

**LANGUAGE**: Shell

**CODE**:
```bash
# Start the application + local mock server
npm start

# Example console output you should look for:
# Service Path: /sap/opu/odata/sap/Z_PRODUCTS_SRV
# URL: http://localhost:3000
# Full OData service URL = http://localhost:3000/sap/opu/odata/sap/Z_PRODUCTS_SRV
```

**STEP**: 4 — Use the mock OData service (for Application Generator or external tooling)

**DESCRIPTION**: Copy the combined OData service URL (URL + Service Path) and paste it into SAP Fiori tools Application Generator or any tool that requires an OData endpoint. This is the endpoint that serves the mock data for the List Report Object Page V2 app.

**LANGUAGE**: Plain text

**CODE**:
```text
# Combine values from the console:
# Full OData URL = <URL from console> + <Service Path from console>
# Example:
# http://localhost:3000/sap/opu/odata/sap/Z_PRODUCTS_SRV
```

**STEP**: 5 — Open and view the running application in a browser

**DESCRIPTION**: Open the mock-server base URL printed as "URL" in your console in a browser. From the directory listing served by the mock server, open index.html, then click "Manage Products" to load the Fiori elements sample application.

**LANGUAGE**: Plain text

**CODE**:
```text
# Steps in browser:
1. Open the "URL" value printed in the terminal (e.g., http://localhost:3000)
2. Click index.html in the listing
3. Click "Manage Products" to open the Fiori elements List Report / Object Page application
```
--------------------------------

**TITLE**: Sales Order (salesorder) — Generated SAP Fiori Elements App Details and Run Instructions

**INTRODUCTION**: This document summarizes the generated Fiori Elements app (List Report + Object Page V4) and provides concise, action-oriented steps to run the app (normal and mock modes), verify prerequisites, and refer to generation and linting metadata. Use these steps inside the generated project root (module name: salesorder).

**TAGS**: fiori, fiori-elements, sapui5, ui5, odata, list-report, object-page, sap_fiori_3, eslint, generator-fiori-elements

STEP: Project metadata summary
DESCRIPTION: Key metadata produced by the SAP Fiori Tools App Generator for this project. Keep these values for debugging, service integration and matching mock data to the real OData service.
LANGUAGE: JSON
CODE:
```json
{
  "Generation Date and Time": "Wed Aug 10 2022 13:46:39 GMT+0200 (Central European Summer Time)",
  "App Generator": "@sap/generator-fiori-elements",
  "App Generator Version": "1.6.7",
  "Generation Platform": "Visual Studio Code",
  "Floorplan Used": "List Report Object Page V4",
  "Service Type": "OData Url",
  "Service URL": "https://sapes5.sapdevcenter.com/sap/opu/odata4/sap/ze2e001/default/sap/ze2e001_salesorder/0001/",
  "Module Name": "salesorder",
  "Application Title": "Sales Order",
  "Namespace": "",
  "UI5 Theme": "sap_fiori_3",
  "UI5 Version": "1.84.14",
  "Enable Code Assist Libraries": true,
  "Add Eslint configuration": true,
  "Eslint rules reference": "https://www.npmjs.com/package/eslint-plugin-fiori-custom",
  "Main Entity": "SalesOrder"
}
```

STEP: Preconditions (Node and NPM)
DESCRIPTION: Confirm Node.js (LTS) and npm are installed and available. The generator expects an active Node LTS and its supported npm version.
LANGUAGE: Shell
CODE:
```bash
# Verify Node and npm versions (use an active LTS release)
node -v
npm -v
# If not installed, get Node LTS from: https://nodejs.org
```

STEP: Open project root
DESCRIPTION: Switch to the generated app root folder. The generator module name is "salesorder" — run subsequent commands from this folder.
LANGUAGE: Shell
CODE:
```bash
# From the folder containing the generated project, change to the project root:
cd salesorder
# Confirm files exist:
ls -la
```

STEP: Start the generated app (development mode)
DESCRIPTION: Launch the development server for the generated Fiori Elements app. Run this from the project root (salesorder). This command starts the local dev server and opens the app in a browser.
LANGUAGE: Shell
CODE:
```bash
npm start
```

STEP: Start the app with Mock Data
DESCRIPTION: Run the application using mock data that reflects the OData Service URL supplied during generation. Use this when the backend is unavailable or for offline UI development and testing. Execute from the project root.
LANGUAGE: Shell
CODE:
```bash
npm run start-mock
```

STEP: OData service reference
DESCRIPTION: The app was generated against this OData service URL. Use it to validate runtime connectivity, create/refresh mock metadata, or compare mock data to the real service.
LANGUAGE: Text
CODE:
```
OData Service URL:
https://sapes5.sapdevcenter.com/sap/opu/odata4/sap/ze2e001/default/sap/ze2e001_salesorder/0001/
(Service Type: OData v4; Main Entity: SalesOrder)
```

STEP: ESLint configuration and rules
DESCRIPTION: ESLint configuration was added during generation. For the Fiori-specific ESLint rules referenced by this project, consult the plugin package linked below; integrate or customize rules as needed in your .eslintrc.*
LANGUAGE: Text
CODE:
```
Eslint rules reference:
https://www.npmjs.com/package/eslint-plugin-fiori-custom

Check for project .eslintrc.* files in the project root and update per your CI/dev requirements.
```

STEP: Development tips
DESCRIPTION: Quick actionable tips when working on the generated app:
- Ensure you are in the salesorder project root before running commands.
- Use "npm run start-mock" to develop UI without backend connectivity.
- If you need to regenerate mock metadata, capture the $metadata from the Service URL above and update mock files under the project's mock folder (if present).
LANGUAGE: Shell
CODE:
```bash
# Example: Confirm you are in project root, then start with mock:
pwd
ls -la
npm run start-mock
```
--------------------------------

**TITLE**: Fiori Elements Incidents Management — Setup and Preview

**INTRODUCTION**: This sample SAP Fiori app manages incidents and uses Fiori elements List Report for OData V4. Use this guide to clone the repository, install dependencies, and preview the application using SAP Fiori tools in SAP Business Application Studio or Visual Studio Code.

**TAGS**: fiori, sap, fiori-elements, odata-v4, incidents, sample-app, sap-business-application-studio, vscode, setup

**STEP**: 1 — Prerequisites

**DESCRIPTION**: Confirm environment and tooling required to preview the app. If you need onboarding, follow the linked tutorials and documentation.

- Required tooling: SAP Business Application Studio or Visual Studio Code with the SAP Fiori tools extension.
- Read the app tutorial and tooling documentation if you need step-by-step build guidance.

Documentation and tutorial:
- Tutorial: https://developers.sap.com/group.fiori-tools-odata-v4-incident.html
- SAP Fiori tools docs: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html

**LANGUAGE**: Plain

**CODE**:
```plain
Confirm you have one of:
- SAP Business Application Studio
- Visual Studio Code with SAP Fiori tools extension
```

**STEP**: 2 — Clone repository

**DESCRIPTION**: Clone the repository and change into the project folder. Replace <repository-url> with the actual Git repository URL.

**LANGUAGE**: Shell

**CODE**:
```bash
# Clone the repository (replace <repository-url> with the actual URL)
git clone <repository-url>

# Change into the project root folder expected by the workspace
cd fiori-elements-incidents-management
```

**STEP**: 3 — Open project as workspace root

**DESCRIPTION**: Open the fiori-elements-incidents-management folder as the workspace root in your editor. This is required for SAP Fiori tooling to detect and preview the app.

**LANGUAGE**: Shell / Plain

**CODE**:
```bash
# From a terminal you can open VS Code at the project root:
code fiori-elements-incidents-management
```

Or open the folder manually in Business Application Studio or Visual Studio Code (File → Open Folder... → select fiori-elements-incidents-management).

**STEP**: 4 — Install dependencies

**DESCRIPTION**: Install npm dependencies at the workspace root. Run this in the terminal with the current working directory set to the project root (fiori-elements-incidents-management).

**LANGUAGE**: Shell

**CODE**:
```bash
# At project root
npm install
```

**STEP**: 5 — Preview the application (SAP Fiori tools)

**DESCRIPTION**: Use the SAP Fiori tools preview capability in the IDE to run the app. The preview option is provided by the SAP Fiori extension. This workflow works in both SAP Business Application Studio and Visual Studio Code with the extension installed.

UI steps:
- Click the "SAP Fiori" icon in the left activity bar of the IDE.
- In the SAP Fiori view, right-click the project fiori-elements-incidents-management.
- Select "Preview Application".

**LANGUAGE**: Plain

**CODE**:
```plain
# UI actions (no shell commands)
1. Click "SAP Fiori" in the left activity bar.
2. Right-click the project: fiori-elements-incidents-management.
3. Choose "Preview Application".
```

**STEP**: 6 — Additional resources

**DESCRIPTION**: If you need step-by-step development or customization guidance, follow the tutorial and SAP Fiori tools documentation linked below.

**LANGUAGE**: Plain

**CODE**:
```plain
Tutorial: https://developers.sap.com/group.fiori-tools-odata-v4-incident.html
SAP Fiori tools docs: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html
```
--------------------------------

**TITLE**: Incidents Management — Application Details and Run Instructions

**INTRODUCTION**: This document provides actionable, code-focused instructions to launch and test the generated SAP Fiori Elements (List Report V4) application "Incidents Management" (module: incidents). It includes prerequisites, local run instructions, mock-data run command, service URL and relevant generator metadata for reproducible automation.

**TAGS**: fiori-samples, sap-fiori, cap, local-cap, ui5, sap_horizon, generator-fiori-elements, list-report-v4

**STEP**: 1 — Generator & app metadata (for automation and provenance)

**DESCRIPTION**: Keep these metadata values available for CI, deployment scripts, or automated README generation. They describe the generator, UI5 configuration and main entity exposed by the app.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "generationDateTime": "Fri Dec 09 2024 13:43:41 GMT+0000 (Coordinated Universal Time)",
  "appGenerator": "@sap/generator-fiori-elements",
  "appGeneratorVersion": "1.8.3",
  "generationPlatform": "SAP Business Application Studio",
  "templateUsed": "List Report Page V4",
  "serviceType": "Local Cap",
  "serviceUrl": "http://localhost:4004/incident/",
  "moduleName": "incidents",
  "applicationTitle": "Incidents Management",
  "namespace": "sap.fe.demo",
  "ui5Theme": "sap_horizon",
  "ui5Version": "1.108.0",
  "enableCodeAssistLibraries": false,
  "enableTypeScript": false,
  "addEslintConfiguration": false,
  "mainEntity": "Incidents",
  "navigationEntity": "None"
}
```

**STEP**: 2 — Prerequisites

**DESCRIPTION**: Ensure the host environment has required runtime tools. Install Node.js LTS and matching npm.

**LANGUAGE**: Shell

**CODE**:
```sh
# Install Node.js LTS (example link)
# https://nodejs.org

# Verify Node and npm versions
node -v
npm -v
```

**STEP**: 3 — Start the CAP backend (local service) — required to serve the Fiori app

**DESCRIPTION**: Start your CAP project to expose the local OData service at the configured service URL (http://localhost:4004/incident/). From the CAP project root, run the command you use to start the service. Common commands (depending on your CAP setup) are shown below. After the backend is running, the Fiori app will be available at the webapp URL in the next step.

**LANGUAGE**: Shell

**CODE**:
```sh
# From the CAP project root (project that contains the 'incidents' module)
# Option A: If package.json exposes a start script
npm start

# Option B: If using cds directly (requires @sap/cds installed)
# Start CDS server and watch for changes
cds watch
```

**STEP**: 4 — Launch the generated UI5 application in a browser

**DESCRIPTION**: Once the CAP service is running, open the generated Fiori application in your browser. The app's index.html is under the incidents module webapp folder.

**LANGUAGE**: Shell / URL

**CODE**:
```sh
# Open in browser (example URL)
http://localhost:4004/incidents/webapp/index.html

# From shell (Linux/macOS) you can open the default browser:
open "http://localhost:4004/incidents/webapp/index.html"
# or
xdg-open "http://localhost:4004/incidents/webapp/index.html"
```

**STEP**: 5 — Run the application with mock data

**DESCRIPTION**: To run the generated app using mock data (reflecting the OData Service URL supplied during generation), execute the provided npm script from the generated app root folder. This is useful when the CAP backend is not available.

**LANGUAGE**: Shell

**CODE**:
```sh
# From the generated app root folder (project containing the incidents module)
npm run start-mock
```

**STEP**: 6 — Verify the service endpoint (quick smoke test)

**DESCRIPTION**: Confirm the OData service endpoint responds. Curl a simple GET against the service root URL or metadata endpoint.

**LANGUAGE**: Shell

**CODE**:
```sh
# Check service root
curl -i http://localhost:4004/incident/

# Check OData $metadata (replace 'incident' with actual service path if different)
curl -i http://localhost:4004/incident/$metadata
```

**STEP**: 7 — Useful file locations (for automation or edits)

**DESCRIPTION**: Quick reference of important file paths to automate tasks or to configure the UI app.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "module": "incidents",
  "ui_apppath": "incidents/webapp/index.html",
  "local_service_url": "http://localhost:4004/incident/",
  "main_entity": "Incidents",
  "template": "List Report Page V4"
}
```
--------------------------------

**TITLE**: SAP Fiori Elements List Report Sample — Product Management (OData V2)

**INTRODUCTION**: Sample SAP Fiori Elements list report app for managing products. Use this project to preview and test a Fiori Elements List Report (OData V2) locally with SAP Fiori tools in Visual Studio Code or SAP Business Application Studio. Use live data from the SAP Gateway Demo system (ES5) or mock data.

**TAGS**: fiori, sap, odata-v2, fiori-elements, tutorial, sample-app, sap-fiori-tools, es5

**STEP**: 1 — App purpose and learning resources

**DESCRIPTION**: Summary of the app and links to tutorials/documentation for building and working with Fiori tools and the demo backend.

**LANGUAGE**: Text

**CODE**:
```text
This is a sample app to manage products. The app is based on SAP Fiori elements List Report (OData V2).

Learn how to build this app:
- Fiori elements List Report tutorial: https://help.sap.com/docs/link-disclaimer?site=https%3A%2F%2Fdevelopers.sap.com%2Fgroup.fiori-tools-lrop.html
- SAP Fiori tools getting started: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html

Backend (required):
- SAP Gateway Demo system (ES5) signup: https://developers.sap.com/tutorials/gateway-demo-signup.html
```

**STEP**: 2 — Prerequisites

**DESCRIPTION**: Required accounts and tools before running the sample locally.

**LANGUAGE**: Text

**CODE**:
```text
Prerequisites:
- VS Code or SAP Business Application Studio with SAP Fiori tools extension installed.
- Access to SAP Gateway Demo system (ES5) for live OData backend.
- Node.js and npm installed (compatible version for the project).
```

**STEP**: 3 — Clone the repository

**DESCRIPTION**: Clone the project repository and open the project folder. Replace <REPO_URL> with the repository URL you cloned from.

**LANGUAGE**: bash

**CODE**:
```bash
# clone repository (replace <REPO_URL> with actual URL)
git clone <REPO_URL>

# go to the app folder (example folder name used by this project)
cd myfioriapp

# open a terminal in the project folder (if using VS Code)
# - Right-click the app folder (myfioriapp) in the Explorer and choose "Open in Integrated Terminal"
```

**STEP**: 4 — Install dependencies

**DESCRIPTION**: Install npm dependencies required by the Fiori Elements app.

**LANGUAGE**: bash

**CODE**:
```bash
# from the project root (myfioriapp)
npm install
```

**STEP**: 5 — Use SAP Fiori tools: Application Modeler and Application Info

**DESCRIPTION**: Use the SAP Fiori tools view to inspect application metadata and status. This is required to validate the project and set up data source connections for live backend previews.

**LANGUAGE**: Text

**CODE**:
```text
In Visual Studio Code or SAP Business Application Studio:
1. Switch to the "SAP Fiori" view in the left activity bar.
2. In the "Application Modeler" view, right-click the app name (myfioriapp) and select "Application Info".
3. Review the Application Status section and perform any required actions (validate metadata, configure data sources).
```

**STEP**: 6 — Preview the application (live backend or mock)

**DESCRIPTION**: Start a preview using SAP Fiori tools. Use "start" to preview with live data (connects to configured ES5 backend) or "start-mock" to preview with local mock data. You can launch these from the Application Modeler context menu or via npm scripts.

**LANGUAGE**: Text

**CODE**:
```text
Option A — Using SAP Fiori tools UI:
1. In "Application Modeler" view, right-click the app name (myfioriapp).
2. Choose "Preview Application".
3. Select "start" to preview with live backend (requires ES5 configured) OR select "start-mock" to preview with mock data.

Option B — Using npm scripts (if configured in package.json):
# preview with live backend (if package.json defines "start")
npm start

# preview with mock data (if package.json defines "start-mock")
npm run start-mock
```

**STEP**: 7 — Notes and troubleshooting

**DESCRIPTION**: Quick reminders to ensure preview works and where to find further help.

**LANGUAGE**: Text

**CODE**:
```text
- Ensure your data source and destination configuration point to the ES5 system if you choose the 'start' preview.
- If preview fails, check Application Status in Application Info for missing metadata or incorrect destination configuration.
- Refer to the Fiori tools getting started documentation for environment setup and troubleshooting:
  https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html
```
--------------------------------

**TITLE**: SAPUI5 Freestyle Product Management Sample — Setup and Preview

**INTRODUCTION**: This guide describes how to install, run, and preview the SAPUI5 freestyle "product management" sample app (folder: myfioriapp). It covers CLI commands and the SAP Fiori tools (Visual Studio Code / SAP Business Application Studio) Application Modeler steps for preview and basic troubleshooting. Use this when preparing the sample for development or demonstration.

**TAGS**: fiori-samples, sapui5, sap-fiori-tools, npm, ui5, vscode, business-application-studio

**STEP**: 1 — Clone repository (if not already cloned)

**DESCRIPTION**: Clone the repository to a local folder named myfioriapp. Replace <REPO_URL> with the repository URL.

**LANGUAGE**: Bash

**CODE**:
```bash
# clone into folder named "myfioriapp"
git clone <REPO_URL> myfioriapp

# change to the app folder
cd myfioriapp
```

**STEP**: 2 — Install Node dependencies

**DESCRIPTION**: Install npm dependencies from the project package.json. Run this in the myfioriapp folder.

**LANGUAGE**: Bash

**CODE**:
```bash
cd myfioriapp
npm install
```

**STEP**: 3 — Confirm or add preview/start script in package.json

**DESCRIPTION**: Ensure package.json contains a start script to preview the app. Two common approaches:
- Use SAP Fiori tools CLI (fiori) if available.
- Use the ui5-tooling serve command (ui5) to host and open index.html.

Add or verify a scripts section in package.json. Replace or adjust according to available tooling in your environment.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "name": "myfioriapp",
  "version": "1.0.0",
  "scripts": {
    "start": "fiori run",                       // if SAP Fiori tools CLI is installed
    "start:ui5": "ui5 serve --open \"index.html\"" // alternate: ui5-tooling
  },
  "devDependencies": {
    "@sap/ui5-builder-webide-extension": "^1.0.0",
    "@ui5/cli": "^3.0.0"
  }
}
```

**STEP**: 4 — Start preview from the CLI

**DESCRIPTION**: Start the preview server from terminal. Use the start script you validated above. If you used the ui5 script, run the start:ui5 command.

**LANGUAGE**: Bash

**CODE**:
```bash
# Using the start script (fiori or custom)
npm start

# Or using ui5 directly if you added start:ui5
npm run start:ui5

# Or using npx to run ui5 locally without a global install
npx ui5 serve --open "index.html"
```

**STEP**: 5 — Preview using Visual Studio Code (SAP Fiori tools)

**DESCRIPTION**: Use SAP Fiori tools Application Modeler in VS Code to inspect Application Info, check Application Status, and preview the app.

**LANGUAGE**: Instructions

**CODE**:
```text
1. Open the project folder (myfioriapp) in VS Code.
2. Switch to the SAP Fiori view on the left activity bar (SAP Fiori Tools).
3. In "Application Modeler", right-click the app name (myfioriapp) -> "Application Info".
4. In Application Info, review and perform any actions under "Application Status".
5. In "Application Modeler", right-click the app name -> "Preview Application" -> choose "Start" to preview.
```

**STEP**: 6 — Preview using SAP Business Application Studio

**DESCRIPTION**: If working in SAP Business Application Studio, use the embedded SAP Fiori tools Application Modeler to preview.

**LANGUAGE**: Instructions

**CODE**:
```text
1. Open the workspace containing myfioriapp in SAP Business Application Studio.
2. Open the left activity bar and select "SAP Fiori" (Application Modeler).
3. Right-click the project/myfioriapp -> "Application Info" to view status.
4. From Application Modeler, right-click the app -> "Preview Application" -> choose "Start".
```

**STEP**: 7 — Troubleshooting common issues

**DESCRIPTION**: Basic checks if preview fails: verify Node version, ensure dependencies installed, check scripts, and confirm ui5/fiori CLI tools availability.

**LANGUAGE**: Bash

**CODE**:
```bash
# Check Node and npm versions (recommended Node 14+ or per project README)
node --version
npm --version

# Verify dependencies installed
ls node_modules

# Check ui5 and fiori CLIs (if you rely on them)
npx ui5 --version
npx @sap/cli --version

# If preview fails, try running ui5 directly:
npx ui5 serve --open "index.html"
```

**STEP**: 8 — References and learning resources

**DESCRIPTION**: Links and resources used to build and learn from this sample. Open these in a browser to follow the tutorial or SAP Fiori tools docs.

**LANGUAGE**: Instructions

**CODE**:
```text
Tutorial: https://developers.sap.com/group.cp-frontend-ui5-1.html
SAP Fiori tools docs: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html
```
--------------------------------

**TITLE**: Get Started with SAP Cloud Application Programming Model (CAP) using Fiori tools

**INTRODUCTION**: Quick, code-focused guide to scaffold a Node.js CAP project, add a Fiori Elements UI, configure approuter variants (managed, standalone, hybrid), build an MTA and deploy to Cloud Foundry, and create a BTP Destination to expose CAP services. Includes sample files and CLI commands used in the fiori-samples CAP examples (see paths in repo).

**TAGS**: CAP, SAP, Fiori, Cloud Foundry, hana, xsuaa, approuter, mta, CDS, Node.js, destination, fiori-samples

**STEP**: 1 — Scaffold a Node.js CAP project
**DESCRIPTION**: Create a new CAP project scaffolded for Node.js, add a CDS data model and a service. Use the SAP CAP initializer. Files created here are the minimal starting point for the sample projects referenced in the repository (see ../cap/*).
**LANGUAGE**: Shell
**CODE**:
```bash
# Create project folder and scaffold CAP app
mkdir my-cap-project
cd my-cap-project

# Use the official SAP CAP initializer (interactive). Use npm or npx as preferred:
npm init @sap/cds@latest
# or
npx @sap/cds init

# Install runtime dependencies
npm install @sap/cds

# Optional: add other CAP helpers if needed
npm install --save-dev @sap/cds-dk
```

**STEP**: 2 — Add a CDS data model and service definition
**DESCRIPTION**: Add a minimal data model (db/schema.cds) and a service (srv/catalog-service.cds). These files are the canonical CAP artifacts used by the samples.
**LANGUAGE**: CDS
**CODE**:
```cds
# file: db/schema.cds
namespace my.cap;

entity Books {
  key ID   : Integer;
      title: String(111);
      author: String;
      stock : Integer;
}
```

```cds
# file: srv/catalog-service.cds
using my.cap as db from '../db/schema';

service CatalogService {
  entity Books as projection on db.Books;
}
```

**STEP**: 3 — Add a minimal handler (optional)
**DESCRIPTION**: Add server-side Node.js handlers when you need custom logic. The following shows an example handler to augment service behavior.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
// file: srv/handlers.js
const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
  const { Books } = this.entities;

  this.on('READ', Books, async () => {
    // Custom read logic (example: filter or augment data)
    return cds.tx(this).run(SELECT.from(Books));
  });
});
```

**STEP**: 4 — Local development and test the service
**DESCRIPTION**: Run the CAP server locally and test the OData endpoint exposed by the service.
**LANGUAGE**: Shell
**CODE**:
```bash
# From project root
# Start local CDS server in watch mode (auto rebuild)
npx cds watch

# Access OData service (default base path /catalog/)
# In another terminal:
curl http://localhost:4004/catalog/Books
```

**STEP**: 5 — Generate a Fiori Elements UI using Fiori tools (VS Code or generator)
**DESCRIPTION**: Create a Fiori Elements UI application that consumes the CAP OData service. You can use Visual Studio Code Fiori tools (recommended) or the Yeoman generator. The generated UI will live in app/<your-app> and should proxy to the CAP backend (for local dev use a relative path like /catalog).
**LANGUAGE**: Shell / JSON
**CODE**:
```bash
# Option A: Use Fiori tools in Visual Studio Code (recommended)
# - Open VS Code
# - Install "SAP Fiori tools - Application Generator" extension
# - Run "Fiori: Open Application Generator" and follow prompts
#   - Select "Fiori elements" > "List Report/Object Page" > Service from the local CAP service (e.g. http://localhost:4004/catalog/$metadata)

# Option B: Yeoman generator (legacy)
npm i -g yo @sap/generator-fiori
yo @sap/fiori
# Follow interactive prompts to point the generated app to /catalog

# Example UI manifest.json binding portion (generated)
# file: app/manifest.json (snippet)
{
  "sap.app": { "id": "my.cap.ui", "applicationVersion": {"version":"1.0.0"} },
  "sap.ui5": {
    "models": {
      "": {
        "dataSource": "mainService",
        "preload": true,
        "settings": {}
      }
    }
  },
  "sap.app/dataSources": {
    "mainService": {
      "uri": "/catalog/",
      "type": "OData",
      "settings": { "odataVersion": "4.0" }
    }
  }
}
```

**STEP**: 6 — Configure a Standalone approuter (xs-app.json) for local/UI routing
**DESCRIPTION**: Use an approuter that proxies UI requests to the backend services. Standalone approuter runs as a separate Node.js app and proxies /catalog to the CAP service.
**LANGUAGE**: JSON
**CODE**:
```json
// file: approuter/xs-app.json
{
  "welcomeFile": "/index.html",
  "authenticationMethod": "none",
  "routes": [
    {
      "source": "^/catalog/(.*)$",
      "target": "$1",
      "destination": "cap-backend",
      "authenticationType": "none",
      "csrfProtection": false,
      "localDir": "app"
    }
  ]
}
```

**STEP**: 7 — Configure a Managed Approuter inside an MTA with XSUAA and HANA (mta.yaml snippet)
**DESCRIPTION**: For Cloud Foundry deployment use an MTA descriptor (mta.yaml) that binds the CAP Node.js backend, a Fiori HTML5 UI module (HTML5 runtime), an approuter module, and managed services (xsuaa, hana). The samples in this repository demonstrate variations: managed approuter with HANA, standalone approuter with in-memory DB, and hybrid CDS profile with HANA and XSUAA.
**LANGUAGE**: YAML
**CODE**:
```yaml
# file: mta.yaml (minimal snippet)
ID: my.cap.app
_schema-version: '3.2'
version: 0.0.1

modules:
  - name: cap-srv
    type: nodejs
    path: srv
    parameters:
      memory: 256M
    provides:
      - name: cap-api
    requires:
      - name: my-hd-service
      - name: my-xsuaa

  - name: fiori-ui
    type: html5
    path: app
    requires:
      - name: app-host
      - name: my-xsuaa

  - name: approuter
    type: nodejs
    path: approuter
    requires:
      - name: cap-api
      - name: my-xsuaa

resources:
  - name: my-hd-service
    type: com.sap.xs.hana
    parameters:
      service-plan: hdi-shared

  - name: my-xsuaa
    type: org.cloudfoundry.managed-service
    parameters:
      service: xsuaa
      service-plan: application
```

**STEP**: 8 — XSUAA configuration (xs-security.json)
**DESCRIPTION**: Provide a minimal xs-security.json for the XSUAA instance to enable authentication and scopes for your CAP services and UI.
**LANGUAGE**: JSON
**CODE**:
```json
// file: xs-security.json
{
  "xsappname": "my-cap-app",
  "tenant-mode": "dedicated",
  "scopes": [
    { "name": "Read", "description": "Read access" }
  ],
  "authorities": [],
  "role-templates": [
    {
      "name": "Viewer",
      "description": "Read only access",
      "scope-references": ["Read"]
    }
  ]
}
```

**STEP**: 9 — Example approuter configuration for Cloud Foundry (xs-app.json for managed approuter)
**DESCRIPTION**: The approuter deployed on CF uses xs-app.json for routes and uses XSUAA for authentication. Ensure the approuter module is bound to the xsuaa instance defined in mta.yaml.
**LANGUAGE**: JSON
**CODE**:
```json
// file: approuter/xs-app.json
{
  "welcomeFile": "/index.html",
  "authenticationMethod": "route",
  "routes": [
    {
      "source": "^/catalog/(.*)$",
      "target": "$1",
      "service": "cap-srv",
      "authenticationType": "xsuaa"
    },
    {
      "source": "^/(.*)$",
      "localDir": "../app/"
    }
  ]
}
```

**STEP**: 10 — Build MTA archive and deploy to Cloud Foundry
**DESCRIPTION**: Build the MTA archive using the MBT tool and deploy to Cloud Foundry. The resulting MTAR contains modules and bound resources (xsuaa, HANA, HTML5).
**LANGUAGE**: Shell
**CODE**:
```bash
# Install MBT if needed
npm i -g @sap/mbt

# Build MTA (produces mta_archives/<app>-<version>.mtar)
mbt build -p=cf

# Deploy MTAR to Cloud Foundry (you can also deploy via SAP BTP cockpit)
# Requires: cf CLI with Multiapps plugin (cf deploy) or use the Cockpit -> Deploy
cf deploy mta_archives/my.cap.app_0.0.1.mtar
```

**STEP**: 11 — Alternative: Deploy a single module to Cloud Foundry
**DESCRIPTION**: If you prefer not to use MTA, push individual apps (approuter, srv, UI) and bind services manually using manifests and cf push.
**LANGUAGE**: Shell
**CODE**:
```bash
# Example: push the CAP service alone (manifest.yml must contain service bindings for HANA and xsuaa)
cf push cap-srv -f srv/manifest.yml
# Push UI (HTML5) to approuter runtime (html5-apps-repo-buildpack) or use HTML5 runtime
cf push fiori-ui -f app/manifest.yml
# Push approuter separately
cf push approuter -f approuter/manifest.yml
```

**STEP**: 12 — Create a BTP Destination to expose CAP services across subaccounts/regions
**DESCRIPTION**: Create a destination artifact so other subaccounts or applications can call your CAP service. You can create via the BTP Cockpit UI or via the BTP CLI. Below is a JSON template for a destination entry.
**LANGUAGE**: JSON / Shell
**CODE**:
```json
// destination-example.json
{
  "Name": "CAP_Service_Destination",
  "Type": "HTTP",
  "Description": "Destination to CAP service",
  "URL": "https://<your-cap-host>/catalog/",
  "ProxyType": "Internet",
  "Authentication": "NoAuthentication",
  "TrustAll": "true"
}
```

```bash
# Create destination using BTP CLI (example syntax; ensure btp CLI and plugin are installed & logged in)
# Note: Plugin/command may vary by CLI version. UI alternative: create destination in BTP Cockpit.
btp login --subdomain <subdomain> --tenant <tenant>
# Use the Cockpit UI to import destination-example.json or use CLI commands provided by your BTP CLI version.
```

**STEP**: 13 — Useful repo references and tutorials
**DESCRIPTION**: Links and sample paths for the repository examples and further reading. Use these when matching router configurations or following specific sample implementations.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "Samples": {
    "Managed Approuter (HANA)": "../cap/cap-fiori-mta/README.md",
    "Standalone Approuter (in-memory DB)": "../cap/cap-fiori-mta-standalone/README.md",
    "Managed Approuter with CDS Hybrid Profile": "../cap/cap-fiori-hybrid/README.md",
    "Create Destination for CAP": "../cap/destination/README.md"
  },
  "Docs": {
    "CAP Docs": "https://cap.cloud.sap/docs/",
    "Blog (generate & deploy CAP + Fiori)": "https://blogs.sap.com/2022/02/10/build-and-deploy-a-cap-project-node.js-api-with-a-sap-fiori-elements-ui-and-a-managed-approuter-configuration/",
    "CI/CD Video": "https://www.youtube.com/watch?v=gvWSHSZFPok"
  },
  "LicenseFile": "/LICENSES/Apache-2.0.txt"
}
```

**STEP**: 14 — Notes on profiles and producing variants
**DESCRIPTION**: The repository contains multiple router variants—managed approuter, standalone approuter and hybrid profiles. When generating or modifying projects:
- Use mta.yaml when you need managed services and a single deployable MTAR (managed approuter pattern).
- Use standalone approuter for independent UI hosting or to test local proxies.
- Use CDS hybrid profile for flexible runtime selection (HANA vs SQLite) and to support different service bindings in CF.
**LANGUAGE**: Plain
**CODE**:
```text
# Repository sample locations (preserve for reference)
../cap/cap-fiori-mta/
../cap/cap-fiori-mta-standalone/
../cap/cap-fiori-hybrid/
../cap/destination/
```

**STEP**: 15 — License and support
**DESCRIPTION**: Licensing and support references for the sample repository.
**LANGUAGE**: Plain
**CODE**:
```text
# License
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0
See: /LICENSES/Apache-2.0.txt

# Support & Docs
CAP documentation: https://cap.cloud.sap/docs/
```
--------------------------------

**TITLE**: Get Started with SAP CAP + Fiori Elements using Managed Approuter and Hybrid Profile

**INTRODUCTION**: Build, deploy, and develop a SAP Cloud Application Programming Model (CAP) project with a Fiori Elements UI on Cloud Foundry (CF) using a managed approuter configuration. Use the CAP hybrid profile to test against real SAP BTP XSUAA and HANA services locally (production-near development). Switch between mock and cloud services by enabling/disabling the hybrid profile.

**TAGS**: fiori, CAP, SAP BTP, Cloud Foundry, HANA, XSUAA, hybrid, approuter, fiori-elements, localrouter

**STEP**: Prerequisites (account and services)
**DESCRIPTION**: Confirm you have required SAP BTP resources and a dev workspace.
**LANGUAGE**: Plain
**CODE**:
```text
- SAP Cloud Platform trial account: https://account.hana.ondemand.com/
- Subscribe to Launchpad Service: https://developers.sap.com/tutorials/cp-portal-cloud-foundry-getting-started.html
- Create SAP HANA Cloud Service instance: https://developers.sap.com/tutorials/btp-app-hana-cloud-setup.html
- Create a dev workspace (Full Stack Cloud Application): see VS Code/Business Application Studio docs
```

**STEP**: Clone repository and open project
**DESCRIPTION**: Clone repo and change into the CAP hybrid sample project folder.
**LANGUAGE**: Bash
**CODE**:
```bash
git clone https://github.com/SAP-samples/fiori-tools-samples.git
cd fiori-tools-samples/cap/cap-fiori-hybrid
```

**STEP**: Login to Cloud Foundry (CLI or VS Code)
**DESCRIPTION**: Authenticate to your Cloud Foundry org/space. Use CLI or VS Code CF extension.
**LANGUAGE**: Bash
**CODE**:
```bash
# CLI
cf login -a https://api.<region>.cf.cloud.sap --sso
# Or use VS Code: View -> Command Palette -> CF: Login to Cloud Foundry
```

**STEP**: Install dependencies
**DESCRIPTION**: Install app dependencies for CAP and Fiori UI using the provided npm script.
**LANGUAGE**: Bash
**CODE**:
```bash
# Open integrated terminal in project root (or right-click project -> Open in integrated terminal)
npm run install:app
```

**STEP**: Build applications
**DESCRIPTION**: Compile CAP model and Fiori UI artifacts before deploy.
**LANGUAGE**: Bash
**CODE**:
```bash
npm run build
```

**STEP**: Deploy CAP and Fiori UI to Cloud Foundry
**DESCRIPTION**: Deploy both backend and frontend to CF (creates apps and binds services defined in manifest).
**LANGUAGE**: Bash
**CODE**:
```bash
npm run deploy
```

**STEP**: Update XSUAA security descriptor on CF
**DESCRIPTION**: Push xs-security.json roles/scopes to your XSUAA service instance. Ensure role assignment after update.
**LANGUAGE**: Bash
**CODE**:
```bash
# Update XSUAA configuration on Cloud Foundry
npm run cf:uaa:update

# After update: assign roles to your user in SAP BTP cockpit under Security -> Role Collections / Application Roles
# See: https://cap.cloud.sap/docs/node.js/authentication#auth-in-cockpit
```

**STEP**: Ensure security roles assignment
**DESCRIPTION**: Ensure roles defined in xs-security.json (e.g., capuser) are assigned to your user in SAP BTP cockpit to avoid Forbidden errors.
**LANGUAGE**: Plain
**CODE**:
```text
- Open SAP BTP cockpit -> Instances and Subscriptions -> Your Application -> Security -> Assign the role (e.g., capuser) to your user
- See guide: https://cap.cloud.sap/docs/node.js/authentication#auth-in-cockpit
```

**STEP**: Push sample data to HANA
**DESCRIPTION**: Edit CSV data files in the project's data folder, then deploy the sample content to your HANA instance using the provided script.
**LANGUAGE**: Bash
**CODE**:
```bash
# Edit CSV files in ./data folder as required
npm run deploy:hana
```

**STEP**: Bind local project to deployed services (use local bindings)
**DESCRIPTION**: Create local bindings so when running locally in hybrid mode CDS will use deployed XSUAA and HANA services.
**LANGUAGE**: Bash
**CODE**:
```bash
# Bind to XSUAA (alias shown as example)
cds bind -2 managedAppCAPProject-xsuaa-service --kind xsuaa

# Bind to HANA HDI service
cds bind -2 managedAppCAPProject-db
```

**STEP**: Run CAP in hybrid mode locally
**DESCRIPTION**: Start the CAP project in hybrid mode so it uses the bound cloud services (HANA/XSUAA). Do not click browser pop-up that doesn't authenticate with XSUAA.
**LANGUAGE**: Bash
**CODE**:
```bash
npm run watch:hybrid
# Console should show HANA connectivity like:
# [cds] - connect using bindings from: { registry: '~/.cds-services.json' }
# [cds] - connect to db > hana {
```

**STEP**: Install and run the local approuter (localrouter)
**DESCRIPTION**: The localrouter acts as a proxy: it fetches a valid token from XSUAA and attaches it to outgoing requests, enabling production-near testing of authenticated flows.
**LANGUAGE**: Bash
**CODE**:
```bash
# Install local approuter dependencies
npm run install:localrouter

# Start local approuter (uses cds bind to ensure bindings are available when started)
cds bind --exec -- npm start --prefix localrouter

# localrouter default endpoint:
# http://localhost:5001  (Open port 5001 to preview)
# In VS Code: View -> Ports: Preview -> select port 5001
# Then open the Fiori UI application via the approuter route
```

**STEP**: Open and test the Fiori UI via localrouter
**DESCRIPTION**: Use the localrouter port to open the Fiori UI so XSUAA tokens are attached and HANA-backed data is used.
**LANGUAGE**: Plain
**CODE**:
```text
- Preview http://localhost:5001 (or use VS Code Ports: Preview)
- Select the Fiori UI app route registered with the approuter
```

**STEP**: Common gotcha — Forbidden on port 5001
**DESCRIPTION**: If the Fiori UI fails to start with "Forbidden" ensure your user has the necessary role assignment in the BTP cockpit.
**LANGUAGE**: Plain
**CODE**:
```text
Error:
Application could not be started due to technical issues.
Forbidden

Remedy:
- Assign your email/user to the role (e.g., capuser) defined in xs-security.json in BTP cockpit (Security -> Role Collections / Application Roles)
- Follow: https://cap.cloud.sap/docs/node.js/authentication#auth-in-cockpit
```

**STEP**: Notes and references
**DESCRIPTION**: Helpful links, file locations, and licensing.
**LANGUAGE**: Plain
**CODE**:
```text
- Repo sample origin and blog: https://blogs.sap.com/2022/02/10/build-and-deploy-a-cap-project-node.js-api-with-a-sap-fiori-elements-ui-and-a-managed-approuter-configuration/
- CAP hybrid profile docs: https://cap.cloud.sap/docs/advanced/hybrid-testing
- Local changes for hybrid testing: changes.md
- Important files:
  - xs-security.json           (defines application roles/scopes)
  - ./data/*                   (sample CSVs for HANA)
  - ./localrouter              (local approuter sources and package.json)
- Support: SAP Community Q&A: https://answers.sap.com/tags/9f13aee1-834c-4105-8e43-ee442775e5ce
- License: Apache-2.0 (see ../../LICENSES/Apache-2.0.txt)
```
--------------------------------

**TITLE**: Enable CDS Hybrid Mode in a CAP Project with a Fiori UI Frontend

**INTRODUCTION**: Short actionable guide to prepare a CAP + SAP Fiori Elements project for CDS Hybrid mode: update mta.yaml bindings, add a local approuter for XSUAA during local development, update xs-security.json for local/Cloud Foundry OAuth endpoints and scopes, and apply XSUAA scope to the Catalog service.

**TAGS**: cap, fiori, cds, xsuaa, approuter, mta, hdi, hana-cloud, cloud-foundry

STEP: Prerequisites
DESCRIPTION: Ensure runtime prerequisites before applying changes.
LANGUAGE: text
CODE:
```
- HANA Cloud database provisioned in your Cloud Foundry space.
  See: https://developers.sap.com/tutorials/hana-cloud-create-db-project.html

- CAP project and Fiori UI deployed to Cloud Foundry (Managed Approuter configuration).
  Base project reference: ../cap-fiori-mta/README.md
```

STEP: 1 — mta.yaml: share HDI instance and align service-key names
DESCRIPTION: Modify mta.yaml resource entries so local and deployed CAP projects share the same HDI instance and service key names align when binding HANA and XSUAA services. Append/replace the shown resource sections under the resources/services area of mta.yaml.

LANGUAGE: yaml
CODE:
```yaml
# Append this properties node to the managedAppCAPProject-db-deployer resource:
- name: managedAppCAPProject-db-deployer
  type: hdb
  path: db
  requires:
    - name: managedAppCAPProject-db
      properties:
        TARGET_CONTAINER: ~{hdi-service-name}
```

LANGUAGE: yaml
CODE:
```yaml
# Update uaa binding to use aligned service-key name
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

LANGUAGE: yaml
CODE:
```yaml
# Update/append service-key parameter for the HANA HDI container resource:
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

STEP: 2 — Add and configure a local Approuter for XSUAA
DESCRIPTION: Add a local approuter to handle XSUAA during local development, move generated files into a controlled localrouter folder, and set the approuter to run on port 5001 forwarding to the local CAP srv API on port 4004.

LANGUAGE: bash
CODE:
```bash
# Add approuter to the project
cds add approuter

# Move generated files into a controlled local folder
mkdir -p localrouter
mv app/default-env.json app/package.json app/xs-app.json localrouter/
```

LANGUAGE: json
CODE:
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

STEP: 3 — Update xs-security.json for local and Cloud Foundry OAuth endpoints and add scopes
DESCRIPTION: Modify xs-security.json to allow OAuth redirect URIs for Cloud Foundry, BAS, and localhost, and add the capuser scope and role-template to secure the Catalog service.

LANGUAGE: json
CODE:
```json
// Append or update the oauth2-configuration block in xs-security.json
"oauth2-configuration": {
  "redirect-uris": [
    "https://**.hana.ondemand.com/**",
    "https://**.applicationstudio.cloud.sap/**",
    "http://localhost:*/**"
  ]
},
```

LANGUAGE: json
CODE:
```json
// Add these scopes and role-templates to xs-security.json
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

STEP: 4 — Apply XSUAA security to the Catalog service (srv/cat-service.cds)
DESCRIPTION: Replace the generic authenticated-user requirement with the new capuser role scope in the Catalog service CDS file so only users with capuser scope can access it.

LANGUAGE: cds
CODE:
```cds
// srv/cat-service.cds — replace this:
@requires: 'authenticated-user'
service CatalogService {
  // ...
}

// With this:
@(requires: 'capuser')
service CatalogService {
  // ...
}
```

STEP: Notes and verification
DESCRIPTION: Quick checks to validate changes.
LANGUAGE: text
CODE:
```
- Ensure mta.yaml resource entries are in the resources/services section and validated before deploy.
- Start the CAP srv locally: npm start (or cds run) -> default port 4004.
- Start the local approuter from localrouter folder:
  cd localrouter
  npm install
  node .
  (or use the approuter start script if present)
- Verify login via approuter on http://localhost:5001 and that forwarded auth token reaches http://localhost:4004.
- Deploy and test on Cloud Foundry: ensure service-key names in mta.yaml match existing bound services and redeploy.
```
--------------------------------

**TITLE**: Get Started with SAP Cloud Application Programming Model (CAP) using Fiori tools and Managed Approuter

**INTRODUCTION**: Quick, code-focused guide to run, build, deploy, verify, and undeploy a CAP (Node.js) project with a Fiori Elements UI and Managed Approuter on SAP Business Technology Platform (BTP) Cloud Foundry. Includes local development steps, MTA and CLI deployment options, and verification commands.

**TAGS**: cap, fiori, fiori-elements, sap-btp, cloud-foundry, approuter, hana-cloud, nodejs, mta, mbt, cds, html5

STEP: 1 — Prerequisites (Cloud Foundry deployment)
DESCRIPTION: Create required BTP resources and accounts before deploying to Cloud Foundry. These are only required if you plan to deploy to CF.
LANGUAGE: Shell
CODE:
```shell
# Ensure you have:
# - SAP Cloud Platform trial account: https://account.hana.ondemand.com/
# - Subscription to Launchpad Service (Cloud Foundry)
# - An SAP HANA Cloud Service instance (create or reuse)
#   Tutorial link: https://developers.sap.com/tutorials/btp-app-hana-cloud-setup.html

# Local dev on SAP Business Application Studio (SBAS):
# Create a dev workspace using "Full Stack Cloud Application"
# SBAS docs: https://help.sap.com/viewer/c2b99f19e9264c4d9ae9221b22f6f589/2021_3_QRC/en-US/f728966223894cc28be3ca2ee60ee784.html
```

STEP: 2 — Install dependencies
DESCRIPTION: Install project dependencies using a reproducible install (CI-style install).
LANGUAGE: Shell
CODE:
```shell
# From the project root:
npm ci
```

STEP: 3 — Bind and publish to HANA Cloud Service (prepare DB)
DESCRIPTION: Bind the CAP project to your SAP HANA Cloud instance and publish CDS artifacts to the database. (Follow your HANA Cloud setup instructions or CDS-specific commands for your project). This step ensures the CDS models are deployed to your HANA Cloud instance.
LANGUAGE: Shell
CODE:
```shell
# Example commands you may need to run (adjust according to your project and environment):
# - Bind service credentials / create bindings as required by your project/service configuration
# - Publish CDS models to HANA (if using cds-dbm or similar):
# cds deploy --to hana   # if configured for HANA deployment
# Or follow the project-specific bind/publish steps in your repository README
```

STEP: 4 — Run locally with live reload
DESCRIPTION: Start the CAP service and run the Fiori UI locally with live reload using cds watch. Open the UI or the Books service endpoint from the prompt.
LANGUAGE: Shell
CODE:
```shell
# Start the CAP application with live reload:
cds watch

# When prompted by the terminal, select "Open in New Tab"
# Then choose either:
# - the Fiori web application entry (UI) OR
# - the "Books" service endpoint for raw service access
```

STEP: 5 — Build MTA archive using Cloud MTA Build Tool (GUI or CLI)
DESCRIPTION: Build an MTA archive (.mtar) to deploy the multi-target application via the Cloud Foundry MTA mechanism. You can use the SAP tooling (IDE context menu) or the MBT CLI. Preserve the mta.yaml and resulting mta_archives path.
LANGUAGE: Shell
CODE:
```shell
# Option A: Using SAP IDE tooling (context menu)
# - Right-click mta.yaml -> "Build MTA Project"
# - The produced archive will be located under: mta_archives/managedAppCAPProject_1.0.0.mtar
# - Right-click mta_archives/managedAppCAPProject_1.0.0.mtar -> "Deploy MTA Archive"

# Option B: Using Cloud MTA Build Tool (mbt CLI)
# Install mbt if needed:
npm install -g @sap/mbt
# Build the MTA:
mbt build
# Output: mta_archives/managedAppCAPProject_1.0.0.mtar
# Deploy the MTAR using the deploy command appropriate for your environment (cf, xs, or CI pipeline)
```

STEP: 6 — Build & Deploy via project CLI scripts
DESCRIPTION: Use the provided npm scripts to build and deploy the project to Cloud Foundry. This prompts for CF credentials if not logged in.
LANGUAGE: Shell
CODE:
```shell
# Build and deploy in one command (project-provided scripts)
npm run build && npm run deploy
```

STEP: 7 — Verify deployment (CLI)
DESCRIPTION: List HTML5 applications and get the generated URL for the deployed Fiori app (as shown in the project docs). Use the CF plugin command shown by the project.
LANGUAGE: Shell
CODE:
```shell
# Example command from the project to list HTML5 apps and get URL:
cf html5-list -u -di managedAppCAPProject-destination-service -u --runtime launchpad
# Note: This command will display the deployed HTML5 application URL to open in a browser.
```

STEP: 8 — Verify deployment (BTP Cockpit)
DESCRIPTION: Alternative verification via the SAP BTP Cockpit UI.
LANGUAGE: Shell
CODE:
```shell
# Manual steps (no shell commands):
# 1. Log in to SAP BTP Cockpit (subaccount).
# 2. Navigate to "HTML5 Applications" in the left navigation.
# 3. Select your deployed Fiori application and open the application URL.
```

STEP: 9 — Undeploy the CAP project from BTP
DESCRIPTION: Remove the deployed CAP project from BTP using the project-provided undeploy script.
LANGUAGE: Shell
CODE:
```shell
# Run the undeploy script provided in the project
npm run undeploy
```

STEP: 10 — Get support and license
DESCRIPTION: Where to ask questions and license details for the project.
LANGUAGE: Shell
CODE:
```shell
# Support:
# Ask questions or report issues on SAP Community:
# https://answers.sap.com/tags/9f13aee1-834c-4105-8e43-ee442775e5ce

# License:
# This project is licensed under Apache License, Version 2.0.
# See: ../../LICENSES/Apache-2.0.txt
```

--------------------------------

**TITLE**: Switch from SQLite to HANA (CAP / Fiori sample)

**INTRODUCTION**: Step-by-step developer instructions to switch a CAP-based Fiori sample from the default SQLite datasource to SAP HANA Cloud (HDI). Includes exact package.json changes, mta.yaml adjustment, binding/publishing guidance, runtime verification output, and a quick troubleshooting tip.

**TAGS**: fiori-samples, SAP CAP, HANA, HANA Cloud, HDI, package.json, mta.yaml, migration, SQLite, db

STEP: 1 — Prerequisite: HANA Cloud setup
DESCRIPTION: Ensure you have an SAP HANA Cloud database provisioned and running in your cloud space before switching the project datasource. Follow the official HANA Cloud DB tutorial linked below to create the DB and HDI service instance used by the project.
LANGUAGE: text
CODE:
https://developers.sap.com/tutorials/hana-cloud-create-db-project.html

STEP: 2 — Update cds configuration in package.json
DESCRIPTION: Replace the existing "cds" node in your project's package.json with the configuration below. This tells CDS to build HANA artifacts, use hdbtable deploy format, and require HANA and XSUAA bindings.
LANGUAGE: JSON
CODE:
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

STEP: 3 — Adjust mta.yaml path for db deployer module
DESCRIPTION: In your project's mta.yaml, locate the module named managedAppCAPProject-db-deployer and update its path from gen/db to db so the mta builder picks up the HANA build output folder.
LANGUAGE: YAML
CODE:
```yaml
modules:
  - name: managedAppCAPProject-db-deployer
    type: hdb-deployer
    path: db          # change from: gen/db
    parameters:
      some-params: ...
```

STEP: 4 — Bind the HDI-shared instance and publish sample data
DESCRIPTION: Using the SAP HANA Projects view in SAP Business Application Studio or BAS, bind the managedAppCAPProject-db to your existing deployed HDI-shared instance and publish the sample data generated for you. Follow the linked blog post for step-by-step local CAP binding and publish instructions.
LANGUAGE: text
CODE:
https://blogs.sap.com/2021/01/21/building-hana-opensap-cloud-2020-part-2-project-setup-and-first-db-build/

STEP: 5 — Restart CDS and verify HANA connection with cds watch
DESCRIPTION: Stop any running cds processes/watchers in your development environment, then run cds watch to start the service using HANA as the datasource. The output should show a HANA connection block with driver, host, user, schema, and service key name. Use this output to confirm the DB binding is correct.
LANGUAGE: bash
CODE:
```bash
# Stop existing watchers/processes (method depends on your environment)
# Then run:
cds watch
```

LANGUAGE: bash
CODE:
```bash
# Expected cds watch excerpt after a successful HANA connection:
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

STEP: 6 — Open and validate the application in browser
DESCRIPTION: From the running cds watch output or the Fiori dev server, select "Open in New Tab" (or navigate to the shown service path, e.g., /catalog) to validate the application works against HANA. Test data and operations to ensure DB interactions succeed.

LANGUAGE: text
CODE:
Open the application URL shown by cds watch (e.g., http://localhost:4004/catalog) or use "Open in New Tab" in your IDE.

STEP: 7 — Build and deploy changes to Cloud Foundry
DESCRIPTION: After local verification, re-run your project's build and deploy sequence to push the HANA-configured application artifacts to Cloud Foundry. This will pick up the updated package.json, db build artifacts, and the mta changes.
LANGUAGE: text
CODE:
# Re-run your standard project build & deploy steps, for example:
# npm run build && npm run deploy
# or your MTA/CF pipeline commands

STEP: 8 — Troubleshooting: copy generated .env if connection errors occur
DESCRIPTION: If the app fails to connect to HANA locally, copy the generated .env from the db folder to the project root. This ensures local environment variables for the HANA binding are available to the runtime.
LANGUAGE: bash
CODE:
```bash
cp db/.env .
```
--------------------------------

**TITLE**: Add XSUAA Authentication to Catalog API (CAP/Fiori sample)

**INTRODUCTION**: Apply XSUAA authentication to the Catalog API used by a Fiori UI. Changes touch the UI router configuration (xs-app.json), root package.json dependencies, the CAP service (CDS), and the MTA descriptor (mta.yaml). Follow the steps to switch authentication from none to xsuaa, enable authenticated access on the service, and update MTA modules/resources to use a static hostname and UAA binding.

**TAGS**: fiori-samples, xsuaa, authentication, mta, cap, cds, xs-app.json, package.json, destination

STEP: 1 — Enable xsuaa in UI router (xs-app.json)

DESCRIPTION: Update the UI app router config to require XSUAA authentication for calls to /catalog/. Edit app/feproject-ui/xs-app.json and change authenticationType from "none" to "xsuaa", and keep csrfProtection as appropriate.

LANGUAGE: JSON

CODE:
```json
// File: app/feproject-ui/xs-app.json
[
  {
    "authenticationType": "xsuaa",
    "csrfProtection": false,
    "source": "^/catalog/",
    "destination": "cap-catalog-api"
  }
]
```

STEP: 2 — Add XSUAA-related dependencies to root package.json

DESCRIPTION: Add the required npm dependencies for XSUAA support and Passport integration to the root package.json "dependencies" object.

LANGUAGE: JSON

CODE:
```json
// File: package.json (root) — add these entries inside "dependencies"
{
  "@sap/xsenv": "^4.2.0",
  "@sap/xssec": "^3.6.0",
  "passport": "^0.6.0"
}
```

STEP: 3 — Require authenticated user in CAP service (CDS)

DESCRIPTION: Protect the CatalogService by requiring an authenticated user in the service definition. Edit srv/cat-service.cds and add @requires: 'authenticated-user' at the service level.

LANGUAGE: CDS

CODE:
```cds
// File: srv/cat-service.cds
@requires: 'authenticated-user'
service CatalogService {
    @readonly entity Books as projection on my.Books;
}
```

STEP: 4.1 — Add appname parameter to mta.yaml parameters

DESCRIPTION: Add a unique static application hostname via the appname parameter in mta.yaml. This is used to form the static URL for destination and for the module host parameter.

LANGUAGE: YAML

CODE:
```yaml
# File: mta.yaml
parameters:
  deploy_mode: html5-repo
  enable-parallel-deployments: true
  appname: mycapproject-unique
```

STEP: 4.2 — Update managedAppCAPProject-srv module to bind UAA and use static host

DESCRIPTION: Modify the managedAppCAPProject-srv module to remove the srv-api reference, add the UAA dependency (uaa_managedAppCAPProject), and set host to ${appname}. Keep other build parameters as shown.

LANGUAGE: YAML

CODE:
```yaml
# File: mta.yaml (module update)
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

STEP: 4.3 — Update destination resource URL to use the static hostname

DESCRIPTION: Update the managedAppCAPProject-destination-service resource so the catalog API destination points to the static hostname built from appname and the subaccount domain. Enable dynamic destination forwarding of auth token.

LANGUAGE: YAML

CODE:
```yaml
# File: mta.yaml (resource update)
  - Authentication: NoAuthentication
    Name: cap-catalog-api
    ProxyType: Internet
    Type: HTTP
    URL: https://${appname}.${default-domain}
    HTML5.DynamicDestination: true
    HTML5.ForwardAuthToken: true
```

STEP: 4.4 — Remove srv-api references (module and resource cleanup)

DESCRIPTION: Remove any references to srv-api in mta.yaml (requires or resources) because the Catalog API is now referenced by static hostname and the new UAA binding. Ensure only uaa_managedAppCAPProject is listed where UAA was added and srv-api entries are deleted.

LANGUAGE: YAML

CODE:
```yaml
# Example: ensure there are no entries like:
# - name: srv-api
# in module "requires" or resource references.
# After removal, the "requires" list should look like the snippet in Step 4.2.
```

STEP: 5 — Rebuild and redeploy

DESCRIPTION: Validate edits, then re-run your project's build and deploy steps to push the changes to Cloud Foundry (or your CI/CD). After successful deployment, the Catalog API will be secured via XSUAA.

LANGUAGE: text

CODE:
```text
// Action: re-run your existing build & deploy steps (e.g., npm build, cf deploy, or your pipeline)
// No additional code provided here; use your project's standard build/deploy commands.
```
--------------------------------

**TITLE**: Configure SAP Launchpad (FLP) Support for a Fiori Elements App in a CAP Project

**INTRODUCTION**: Steps to add SAP Launchpad (FLP) configuration to a Fiori Elements application inside a CAP project using the @sap/ux-ui5-tooling command. This adds crossNavigation in manifest.json and FLP i18n entries so the app can be consumed by a Launchpad Site on SAP BTP.

**TAGS**: fiori, sap, launchpad, flp, ui5, fiori-elements, cap, cloud-foundry, sap-btp

**STEP**: 1 — Change into the Fiori Elements application directory
**DESCRIPTION**: Move to the Fiori Elements UI application directory inside your CAP project root before running tooling commands.
**LANGUAGE**: bash
**CODE**:
```bash
# From the root of your CAP project
cd managedAppCAPProject/app/feproject-ui
```

**STEP**: 2 — Run the UX UI5 tooling command to add FLP config
**DESCRIPTION**: Run the fiori add flp-config generator provided by @sap/ux-ui5-tooling. This scaffolds FLP-related configuration in the Fiori app.
**LANGUAGE**: bash
**CODE**:
```bash
npx -p @sap/ux-ui5-tooling fiori add flp-config
```

**STEP**: 3 — Provide answers to the interactive prompts
**DESCRIPTION**: When prompted, provide values that represent your application. The semantic object is a business entity (customer, sales order, product, etc.). Use consistent values for semanticObject and action.
**LANGUAGE**: text
**CODE**:
```
Semantic Object -> MyFEApplication
Action -> display
Title -> List Report Object Page
Subtitle -> Fiori Application
```

**STEP**: 4 — Verify manifest.json crossNavigation entry (added)
**DESCRIPTION**: The generator will add a crossNavigation node to webapp/manifest.json (or your app's manifest). Verify the inbound entry and templates are correct for your app. Replace the keys/labels if you used different prompt answers.
**LANGUAGE**: json
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

**STEP**: 5 — Verify i18n properties appended for FLP titles
**DESCRIPTION**: The generator appends i18n entries used by the Launchpad. Confirm that the app's i18n.properties (usually under webapp/i18n/i18n.properties) contains these keys and adjust translations if needed.
**LANGUAGE**: properties
**CODE**:
```
flpTitle=List Report Object Page
flpSubtitle=
```

**STEP**: 6 — Rebuild and redeploy the application to Cloud Foundry
**DESCRIPTION**: Rebuild your Fiori Elements app (and your CAP backend if required) and redeploy to Cloud Foundry so the updated manifest/i18n are available to the Launchpad. Use your project's usual build and cf push commands.
**LANGUAGE**: bash
**CODE**:
```bash
# Example placeholders — run the build/deploy commands your project uses
# Build frontend and backend as applicable
# e.g. npm run build (or cds build / maven build for your stack)
# Then push to Cloud Foundry:
# cf push <your-app-name>
```

**STEP**: 7 — Ensure Launchpad Service is subscribed and configured on your BTP subaccount
**DESCRIPTION**: Confirm you have subscribed to and configured the SAP Launchpad Service on your SAP BTP subaccount. Follow SAP-provided setup documentation for subscriptions and entitlements.
**LANGUAGE**: text
**CODE**:
```
Documentation: https://developers.sap.com/tutorials/cp-portal-cloud-foundry-getting-started.html
```

**STEP**: 8 — Create a Launchpad Site and add your app
**DESCRIPTION**: Create a Launchpad Site in the Launchpad Service and add the Fiori Elements app as a tile or target mapping. Use the semantic object/action you configured to create target mappings or navigation targets.
**LANGUAGE**: text
**CODE**:
```
Create Launchpad Site: https://developers.sap.com/tutorials/cp-portal-cloud-foundry-create-sitelaunchpad.html
```
--------------------------------

**TITLE**: Get Started with SAP Cloud Application Programming Model (CAP) — Fiori Elements UI + Standalone Approuter on SAP BTP

**INTRODUCTION**: Quick, code-focused guide to run, build, and deploy a CAP Node.js project (Fiori Elements UI + standalone approuter) to SAP BTP Cloud Foundry using an in-memory database. Includes local run steps, required CF configuration edits (xs-security.json), two deployment options (MTA Build Tool and CLI), verification, and undeploy commands.

**TAGS**: CAP, Fiori, Approuter, SAP BTP, Cloud Foundry, Node.js, cds, mta, deploy, xs-security.json

STEP: 1 — Prerequisites (Cloud Foundry only)

DESCRIPTION: Ensure you have the required SAP BTP/Cloud Foundry resources and account details before deploying. These prerequisites are only required for CF deployment.

LANGUAGE: text

CODE:
```text
- SAP Cloud Platform account: https://account.hana.ondemand.com/
- Subscribed to Launchpad Service (if using launchpad features)
- API Endpoint for your CF region (example):
  https://api.cf.us10-001.hana.ondemand.com
  This API endpoint must be referenced in your xs-security.json oauth2-configuration.
- (Optional for dev) Use SAP Business Application Studio: create a dev workspace with "SAP Fiori" or "Full Stack Cloud Application".
```

STEP: 2 — Run the project locally

DESCRIPTION: Install dependencies, start the CAP service in watch mode, and open the Fiori UI. Use this to validate the app locally with the in-memory database.

LANGUAGE: shell

CODE:
```shell
# Install dependencies
npm i

# Start CAP in watch mode (builds and serves)
cds watch

# When prompted by the terminal, choose "Open in New Tab" to open the Fiori UI
# Or open the Books service endpoint manually (example path)
# http://localhost:4004/browser/Books or the Fiori app URL shown in the terminal
```

STEP: 3 — Update xs-security.json for Cloud Foundry

DESCRIPTION: Edit xs-security.json to include the correct oauth2-configuration for your Cloud Foundry API region. Replace the example values with your subaccount/API region values. This is necessary for token validation and approuter security.

LANGUAGE: JSON

CODE:
```json
// File: xs-security.json
{
  "xsappname": "your-xs-app-name",
  "description": "security descriptor",
  "oauth2-configuration": {
    // Replace with your CF API endpoint and correct token path if required by region
    "tokenEndpoint": "https://api.cf.us10-001.hana.ondemand.com/oauth/token"
    // OR provide a full configuration expected by your environment/provider
  },
  "scopes": [
    {
      "name": "$XSAPPNAME.View",
      "description": "Read access"
    }
  ]
}
```

STEP: 4 — Build and deploy (Option A: Cloud MTA Build Tool - UI)

DESCRIPTION: Build the MTA project using the Cloud MTA Build Tool provided in SAP tools (IDE context) and deploy the generated MTAR via the IDE UI. Ensure xs-security.json is updated before building.

LANGUAGE: text

CODE:
```text
# In SAP Business Application Studio or supported IDE:
1. Ensure xs-security.json contains correct oauth2-configuration (see Step 3).
2. Right-click mta.yaml -> "Build MTA Project".
3. Locate the generated archive under mta_archives, e.g. standaloneCAPProject_1.0.0.mtar.
4. Right-click that mtar -> "Deploy MTA Archive".
# The IDE will prompt for Cloud Foundry credentials if not already logged in.
```

STEP: 5 — Build and deploy (Option B: CLI)

DESCRIPTION: Use the provided npm scripts to build and deploy from the terminal. Ensure xs-security.json is updated before running this. This is the non-IDE CLI path.

LANGUAGE: shell

CODE:
```shell
# Build and deploy with provided npm scripts
npm run build && npm run deploy

# After deploy, note the generated app URLs (approuter). The recommended URL example:
# <subdomain>-<space>-standalonecapproject-approuter.cfapps.<api-region>.hana.ondemand.com
```

STEP: 6 — Verify deployment via CF CLI

DESCRIPTION: Use the Cloud Foundry CLI to inspect the MTA and view generated application routes. Select the second URL in the output which corresponds to the approuter route for the Fiori UI.

LANGUAGE: shell

CODE:
```shell
# Inspect deployed MTA and URLs (select the approuter URL from the 'urls' column)
cf mta standaloneCAPProject
```

STEP: 7 — Verify deployment via SAP BTP Cockpit

DESCRIPTION: Alternative verification using the SAP BTP Cockpit UI to view the deployed approuter application and its routes.

LANGUAGE: text

CODE:
```text
1. Log in to SAP BTP Cockpit.
2. Go to your Subaccount -> Overview -> Spaces.
3. Select the Space where you deployed the app.
4. Select the deployed approuter app (e.g., standalonecapproject-approuter).
5. Check the "Routes" or "Application Routes" section to find your Fiori UI URL.
```

STEP: 8 — Undeploy / Remove the application

DESCRIPTION: Use the provided npm script to undeploy the MTA from Cloud Foundry.

LANGUAGE: shell

CODE:
```shell
# Undeploy the CAP project from Cloud Foundry
npm run undeploy
```

STEP: 9 — Known issues and connectivity service

DESCRIPTION: If you need on-premise connectivity, enable the Connectivity resource in the MTA by uncommenting the connectivity service in mta.yaml and enabling the service instance named standaloneCAPProject-connectivity. This enables access to on-premise systems via SAP Connectivity.

LANGUAGE: text

CODE:
```text
# File: mta.yaml
# - Uncomment/enable the 'standaloneCAPProject-connectivity' resource and related module bindings.
# - Create or bind the Connectivity service instance in your subaccount/space as required.
# Note: The Connectivity service allows cloud apps to connect to on-premise systems.
```

STEP: 10 — Support and License

DESCRIPTION: Where to get help and license information for this sample project.

LANGUAGE: text

CODE:
```text
Support:
- Use SAP Community Answers for visibility: https://answers.sap.com/tags/9f13aee1-834c-4105-8e43-ee442775e5ce

License:
- Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
- Project licensed under Apache Software License, version 2.0.
- See LICENSE file: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Application Details — mystandalonecapproject (Fiori Elements, Local CAP)

**INTRODUCTION**: Quick reference and actionable steps to run the generated Fiori Elements application "mystandalonecapproject". Use this to start the local CAP backend, launch the UI5 app in a browser, or run the app with mock data. Includes generator metadata, service endpoints, and required prerequisites.

**TAGS**: fiori-samples, CAP, local, UI5, ListReport, ObjectPage, start, mock, sap-fiori

**STEP**: 1 — Generated app metadata (preserve for troubleshooting)
**DESCRIPTION**: Key metadata captured at generation time. Keep this for audits, debugging, or recreating the app.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "generationDateTime": "Wed Sep 21 2022 13:54:29 GMT+0000 (Coordinated Universal Time)",
  "appGenerator": "@sap/generator-fiori-elements",
  "appGeneratorVersion": "1.7.5-pre-20220921092729-6383964dd.0",
  "generationPlatform": "SAP Business Application Studio",
  "floorplan": "List Report Object Page V4",
  "serviceType": "Local Cap",
  "serviceURL": "http://localhost:4004/catalog/",
  "moduleName": "mystandalonecapproject",
  "applicationTitle": "App Title",
  "namespace": "",
  "ui5Theme": "sap_horizon",
  "ui5Version": "1.102.1",
  "enableCodeAssistLibraries": false,
  "enableTypeScript": false,
  "addEslintConfiguration": false,
  "mainEntity": "Books"
}
```

**STEP**: 2 — Start the CAP backend that serves the OData service
**DESCRIPTION**: Start your local CAP project so the generated Fiori app can consume the service at the configured serviceURL (http://localhost:4004/). Run commands from your CAP project root.
**LANGUAGE**: Bash
**CODE**:
```bash
# From your CAP project root (example commands)
# Option A: Use CDS watch (common in CAP projects)
cds watch

# Option B: If your project uses npm scripts to start the backend
npm start
```

**STEP**: 3 — Launch the generated UI5 app in a browser
**DESCRIPTION**: Once the CAP backend is running, open the generated app entrypoint in your browser. Replace host/port if you have different configuration.
**LANGUAGE**: TEXT
**CODE**:
```
Open in browser:
http://localhost:4004/mystandalonecapproject/webapp/index.html

Service metadata URL:
http://localhost:4004/catalog/$metadata
```

**STEP**: 4 — Run the app with mock data (no backend required)
**DESCRIPTION**: The project includes an npm script for running the UI app against mock OData data that mirrors the service used during generation. Run this from the generated app module folder.
**LANGUAGE**: Bash
**CODE**:
```bash
# Change to the generated module directory (if you are at repository root)
cd mystandalonecapproject

# Start the app using mock data (uses the project's npm script)
npm run start-mock
```

**STEP**: 5 — Preconditions and environment
**DESCRIPTION**: Ensure your local environment meets the minimum requirements before attempting to run the backend or UI.
**LANGUAGE**: TEXT
**CODE**:
```
Prerequisite:
- Active NodeJS LTS (Long Term Support) version and associated supported NPM version.
  See: https://nodejs.org
```
--------------------------------

**TITLE**: Deploy CAP Project with Fiori UI, In-memory SQLite and FLP (Cloud Foundry / Local)

**INTRODUCTION**: Step-by-step, code-focused instructions to create a CAP project, wire it to an in-memory SQLite DB, add a Fiori UI with FLP (launchpad) support and approuter, update MTA configuration and destination resources, validate locally, and prepare/build for Cloud Foundry deployment. Use in BAS or VSCode.

**TAGS**: fiori-samples, CAP, cloudfoundry, fiori, FLP, sqlite, in-memory-db, approuter, mta, xs-app, destination

**STEP**: 1 — Prerequisites
**DESCRIPTION**: Ensure you have a Fiori or Full Stack dev space and CDS tooling installed globally. Choose a valid MTA id (example: standaloneCAPProject).
**LANGUAGE**: bash
**CODE**:
```bash
# Ensure CDS tools installed globally
npm i -g @sap/cds-dk

# Example MTA id to use in commands below:
# MTA_ID=standaloneCAPProject
```

**STEP**: 2 — Initialize CAP project and add samples + MTA
**DESCRIPTION**: Create a new CAP project, move into it and add sample content and MTA descriptors.
**LANGUAGE**: bash
**CODE**:
```bash
cds init standaloneCAPProject
cd standaloneCAPProject/
cds add samples
cds add mta
```

**STEP**: 3 — Update package.json: dependencies and runtime CDS config
**DESCRIPTION**: Edit package.json in the project root:
- Move "sqlite3": "^5.0.4" from devDependencies to dependencies.
- Add @sap/xsenv, @sap/xssec, passport to dependencies.
- Add a top-level "cds" node that configures an in-memory SQLite DB and enables the in-memory feature.
**LANGUAGE**: JSON
**CODE**:
```json
// package.json -> dependencies (merge or add)
{
  "dependencies": {
    "sqlite3": "^5.0.4",
    "@sap/xsenv": "^4.2.0",
    "@sap/xssec": "^3.6.0",
    "passport": "^0.6.0"
    // ...other dependencies
  }
}
```

```json
// package.json -> add this "cds" node at top-level
{
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
}
```

**STEP**: 4 — Update mta.yaml build-parameters (pre-build actions)
**DESCRIPTION**: Ensure mta pre-build does production install, build the CAP project and copy DB seed data into generated srv module path.
**LANGUAGE**: YAML
**CODE**:
```yaml
build-parameters:
  before-all:
    - builder: custom
      commands:
        - npm install --production
        - npx -p @sap/cds-dk cds build --production
        - cp -r db/data gen/srv/srv/data
```

**STEP**: 5 — Add UI annotations to srv/cat-service.cds
**DESCRIPTION**: Append UI annotations for CatalogService.Books to enable SelectionFields and LineItem entries (exposed to Fiori elements).
**LANGUAGE**: CDS
**CODE**:
```cds
annotate CatalogService.Books with @(
  UI : {
    SelectionFields : [
      title
    ],
    LineItem : [
      { Value : ID },
      { Value : title },
      { Value : stock }
    ]
  }
){
  ID @( title: 'ID' );
  title @( title: 'Title' );
  stock @( title: 'Stock' );
};
```

**STEP**: 6 — Install node modules and validate locally
**DESCRIPTION**: Install dependencies and run cds watch to validate the CAP service starts and the catalog service is available in the provided URL.
**LANGUAGE**: bash
**CODE**:
```bash
npm install
cds watch
# Follow the opened tab or console URL to validate CatalogService and OData endpoints
```

**STEP**: 7 — Create Approuter module (IDE wizard)
**DESCRIPTION**: Use your IDE wizard ("Create MTA Module from Template") to add an Approuter module. Choose Standalone Approuter, enable authentication and UI.
**LANGUAGE**: shell (wizard choices)
**CODE**:
```text
# Wizard choices (select in IDE):
# Template: Approuter Configuration
# HTML5 runtime: Standalone Approuter
# Add authentication? Yes
# Do you plan to add a UI? Yes
```

**STEP**: 8 — Create SAP Fiori Application module (IDE wizard)
**DESCRIPTION**: Use "Create MTA Module from Template" to add a Fiori app bound to your local CAP project. Choose OData service, main entity, add MTA deployment config and FLP configuration, set semantic object/action/title.
**LANGUAGE**: shell (wizard choices)
**CODE**:
```text
# Wizard choices (select in IDE):
# Template: SAP Fiori Application
# Application type/floorplan: (pick required)
# Use a Local CAP Project: Yes -> point to project
# Service: OData Service -> select main entity
# Project name example: mystandalonecapproject
# Add deployment configuration to MTA project: Yes
# Add FLP configuration: Yes
# Target: Cloud Foundry
# Destination: None
# Semantic Object: MyStandaloneCapProject
# Action: display
# Title: The Title of my Standalone App
```

**STEP**: 9 — Add route to xs-app.json for UI -> CAP destination
**DESCRIPTION**: Edit app/<your-app>/xs-app.json and add a first route to forward /catalog/ (or chosen UI path) to the destination "cap-launchpad". This enables the FLP UI to call the CAP backend via the destination.
**LANGUAGE**: JSON
**CODE**:
```json
// app/mystandalonecapproject/xs-app.json -> add as the first route in "routes" array
{
  "authenticationType": "none",
  "csrfProtection": false,
  "source": "^/catalog/",
  "destination": "cap-launchpad"
}
```

**STEP**: 10 — Update mta.yaml: srv module attributes
**DESCRIPTION**: Replace or update the auto-generated srv module (standaloneCAPProject-srv) to use the built gen/srv path, expose srv-api, and set runtime parameters and builder.
**LANGUAGE**: YAML
**CODE**:
```yaml
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

**STEP**: 11 — Add destination resource and require srv-api
**DESCRIPTION**: Add a destination service resource to provision a destination instance and configure initial destinations including cap-launchpad (pointing to srv-api/srv-url). Also add a 'requires' on modules that need srv-api.
**LANGUAGE**: YAML
**CODE**:
```yaml
# Add this resource to mta.yaml resources:
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

**STEP**: 12 — Add a destination resource entry (short form example)
**DESCRIPTION**: If your mta resources include a destinations config block elsewhere, ensure the cap-launchpad destination is present and references ~{srv-api/srv-url}.
**LANGUAGE**: YAML
**CODE**:
```yaml
# Example destination entry (part of a destinations array)
- Authentication: NoAuthentication
  Name: cap-launchpad
  ProxyType: Internet
  Type: HTTP
  URL: ~{srv-api/srv-url}
  HTML5.DynamicDestination: true
  HTML5.ForwardAuthToken: true
```

**STEP**: 13 — Local validation finished
**DESCRIPTION**: After edits, run npm install and cds watch (if not already), use the UI module URL to validate the Fiori elements app and check it calls the CAP backend through the approuter/destination locally.
**LANGUAGE**: bash
**CODE**:
```bash
npm install
cds watch
# Open the Fiori app URL or the launchpad route to validate behavior locally
```

**STEP**: 14 — Prepare approuter for Cloud Foundry (package.json edits)
**DESCRIPTION**: In the <mta-id>-approuter folder, update package.json to support Node 14+ and approuter v11.5.0 for CF runtime compatibility.
**LANGUAGE**: JSON
**CODE**:
```json
// <mta-id>-approuter/package.json -> update these fields:
{
  "dependencies": {
    "@sap/approuter": "11.5.0"
  },
  "engines": {
    "node": ">= 14.0.0"
  }
}
```

**STEP**: 15 — Build and deploy MTA in Business Application Studio (BAS)
**DESCRIPTION**: In BAS: Build an MTA archive and deploy it to Cloud Foundry via the right-click context menu.
**LANGUAGE**: shell (IDE actions)
**CODE**:
```text
# BAS actions:
# 1. Right click mta.yaml -> Build MTA Project  (generates mtar in mta_archives/)
# 2. Right click the mtar file in mta_archives -> Deploy MTA Archive
# Note: Ensure you are logged into Cloud Foundry before deploying.
```

**STEP**: 16 — Build and deploy using VSCode / CLI
**DESCRIPTION**: Use npm scripts to build and deploy (ensure your project has npm scripts for build/deploy configured by the MTA wizard).
**LANGUAGE**: bash
**CODE**:
```bash
npm run build && npm run deploy
```
--------------------------------

**TITLE**: Get Started with SAP Cloud Application Programming Model (CAP) using Fiori tools and Application Frontend Service

**INTRODUCTION**: Quick, actionable guide to create a minimal SAP CAP project, add a Fiori (SAPUI5) frontend created with Fiori tools, run locally, and prepare the frontend for deployment to SAP Application Frontend Service (AFS). Includes essential file examples, commands, and file paths so AI-assisted code generators can scaffold files and scripts directly.

**TAGS**: sap, cap, fiori, application-frontend-service, afs, cds, sapui5, nodejs, cloud-foundry, html5

**STEP**: 1 — Prerequisites

**DESCRIPTION**: Install required CLIs and VS Code extensions. Ensure Node.js and npm are available.

**LANGUAGE**: Bash

**CODE**:
```bash
# Install Node.js (LTS recommended) and npm (outside of npm)
# Install CAP CLI and optional UI tooling/CLI (global installs are optional)
npm install -g @sap/cds            # Cloud Application Programming Model CLI
npm install -g @ui5/cli           # UI5 tooling (optional for building UI)
# For interactive UI generation in VS Code, install SAP Fiori tools extensions:
# - SAP Fiori tools - Application Modeler
# - SAP Fiori tools - UI5 templates
# See VS Code marketplace or SAP documentation
```

**STEP**: 2 — Create a new CAP project

**DESCRIPTION**: Use the CAP initializer to scaffold a new project. Install dependencies.

**LANGUAGE**: Bash

**CODE**:
```bash
# Scaffold a new CAP project (recommended initializer)
npm init @sap/cds@latest my-cap-project
cd my-cap-project
npm install
```

**STEP**: 3 — Add a domain model (CDS) and a service

**DESCRIPTION**: Create a simple domain model file in db/ and a service that exposes the entity in srv/. These files are created at these paths: db/schema.cds and srv/catalog-service.cds.

**LANGUAGE**: CDS

**CODE**:
```cds
# File: db/schema.cds
namespace my.bookshop;

entity Books {
  key ID    : UUID;
      title : String(111);
      author: String(111);
      stock : Integer;
}
```

```cds
# File: srv/catalog-service.cds
using my.bookshop as my from '../db/schema';

service CatalogService {
  entity Books as projection on my.Books;
}
```

**STEP**: 4 — Add a minimal SAPUI5/Fiori frontend (Fiori tools compatible)

**DESCRIPTION**: Create a UI application under app/webapp. Provide a basic manifest.json and index.html. CAP will serve static files under the app/ folder when running locally (cds run / cds watch).

**LANGUAGE**: JSON

**CODE**:
```json
// File: app/webapp/manifest.json (minimal)
{
  "sap.app": {
    "id": "my.bookshop.ui",
    "type": "application",
    "i18n": "i18n/i18n.properties",
    "applicationVersion": { "version": "1.0.0" },
    "title": "Bookshop UI"
  },
  "sap.ui5": {
    "rootView": {
      "viewName": "my.bookshop.ui.view.App",
      "type": "JS",
      "id": "app"
    },
    "models": {
      "": {
        "dataSource": "mainService"
      }
    },
    "resources": {}
  },
  "sap.ui": {}
}
```

```html
<!-- File: app/webapp/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Bookshop UI</title>
    <script id="sap-ui-bootstrap"
            src="https://sapui5.hana.ondemand.com/resources/sap-ui-core.js"
            data-sap-ui-libs="sap.m"
            data-sap-ui-theme="sap_belize"
            data-sap-ui-compatVersion="edge"
            data-sap-ui-resourceroots='{"my.bookshop.ui": "./"}'>
    </script>
    <script>
      sap.ui.getCore().attachInit(function () {
        new sap.m.App({ id: "app" }).placeAt("content");
      });
    </script>
  </head>
  <body class="sapUiBody" id="content"></body>
</html>
```

**STEP**: 5 — Add package scripts to run locally with CAP

**DESCRIPTION**: Add convenient npm scripts to start the CAP backend and serve the UI. Use cds watch for live reload during development.

**LANGUAGE**: JSON

**CODE**:
```json
// File: package.json (scripts section)
{
  "scripts": {
    "start": "cds run",
    "watch": "cds watch"
  }
}
```

**STEP**: 6 — Run locally (develop and test)

**DESCRIPTION**: Start the CAP application and access the UI. When the UI is in app/webapp CAP serves these static files automatically.

**LANGUAGE**: Bash

**CODE**:
```bash
# Run with live reload (recommended during development)
npm run watch

# Or run once
npm start

# Open in browser the endpoint shown by cds, e.g.:
# http://localhost:4004/webapp/index.html  (or root depending on CDS version/config)
```

**STEP**: 7 — Prepare frontend for deployment to Application Frontend Service (AFS)

**DESCRIPTION**: Create a Cloud Foundry manifest for the UI application pointing to the app/ folder, and bind an instance of the Application Frontend Service by its service instance name. Use the SAP Help Portal links below for AFS-specific configuration and deployment steps (authentication, routes, service plan). Replace placeholders such as <cf-domain> and <application-frontend-service-instance-name>.

**LANGUAGE**: YAML

**CODE**:
```yaml
# File: app/manifest.yml
applications:
  - name: my-cap-ui
    path: app
    buildpacks:
      - nodejs_buildpack
    memory: 256M
    instances: 1
    routes:
      - route: my-cap-ui-app.<cf-domain>
    services:
      - application-frontend-service-instance-name
```

**STEP**: 8 — Useful links and licensing

**DESCRIPTION**: Reference documentation for Application Frontend Service and example blog posts. License file path in repository.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "docs": {
    "AFS_Help": "https://help.sap.com/docs/application-frontend-service/application-frontend-service/what-is-application-frontend-service?version=Cloud",
    "AFS_Intro_Blog": "https://community.sap.com/t5/technology-blog-posts-by-sap/introducing-application-frontend-service/ba-p/14091408",
    "AFS_Simple_UI_Blog": "https://community.sap.com/t5/technology-blog-posts-by-sap/simple-ui-applications-with-application-frontend-service/ba-p/14096009"
  },
  "license": "../../LICENSES/Apache-2.0.txt"
}
```

Notes:
- For production AFS deployments follow the SAP Help Portal links above: bind required services, configure routes, and supply any xs-security.json or role configuration required by your landscape.
- If you prefer generator-based UI scaffolding, use SAP Fiori tools templates in VS Code (Application Generator / templates) to create more advanced SAPUI5/Fiori elements apps and then place the generated UI under app/.
- This guide preserves required file paths: db/schema.cds, srv/catalog-service.cds, app/webapp/*, app/manifest.yml, and reference to ../../LICENSES/Apache-2.0.txt.
--------------------------------

**TITLE**: Expose a deployed CAP project as an SAP BTP destination

**INTRODUCTION**: This guide shows how to expose a deployed CAP (Cloud Application Programming) project on SAP BTP as a managed destination so other tools and apps (e.g., SAP Fiori tools, Business Application Studio, curl) can securely call its OData endpoints. It covers: locating the CAP service endpoint, obtaining XSUAA service key credentials, creating an OAuth2ClientCredentials destination, and testing the destination.

**TAGS**: fiori-samples, CAP, SAP BTP, destination, XSUAA, OAuth2ClientCredentials, OAuth2UserTokenExchange, Business Application Studio, OData, SAPUI5

**STEP**: 0 — Prerequisites

**DESCRIPTION**: Ensure you have the following before starting.

**LANGUAGE**: Text

**CODE**:
```
- An SAP BTP account (trial account is acceptable)
- SAP Build Work Zone subscribed for the subaccount (see cp-portal tutorial)
- A deployed CAP project with SAPUI5 Fiori UI (deployed to the same subaccount where you will create the destination)
- You will create the destination in the same subaccount where the CAP app is deployed
```

**STEP**: 1 — Locate the CAP nodejs service endpoint

**DESCRIPTION**: In your BTP subaccount, open the dev space (or service manager) where your CAP project runs and find the nodejs service instance exposing the CAP endpoints. Copy the base URL of the service. Example UI screenshots referenced: Step1.png, Step2.png, Step2b.png.

**LANGUAGE**: Text

**CODE**:
```
Example service base URL (replace with your service URL):
https://28bdb0fbtrial-dev-managedappcapproject-srv.cfapps.us10-001.hana.ondemand.com

Example exposed OData endpoint (service path appended):
https://28bdb0fbtrial-dev-managedappcapproject-srv.cfapps.us10-001.hana.ondemand.com/odata/v4/catalog
```

**STEP**: 2 — Expect unauthorized response without auth headers (verification)

**DESCRIPTION**: Directly calling the OData endpoint in a browser or via curl without proper authentication will return HTTP 401. This confirms the service is secured by XSUAA.

**LANGUAGE**: Text

**CODE**:
```
HTTP 401 Unauthorized expected when calling:
https://<your-service>/odata/v4/catalog
```

**STEP**: 3 — Retrieve XSUAA service key credentials

**DESCRIPTION**: From the subaccount root, go to Instances and Subscriptions, select the XSUAA service instance deployed with the CAP project (e.g., managedAppCAPProject-xsuaa-service), then open the Service Keys tab. Create a service key if none exists. Extract clientid, clientsecret, and url from the service key JSON. These map to destination fields.

**LANGUAGE**: JSON

**CODE**:
```json
// Example XSUAA service key properties (values are examples)
{
  "clientid": "sb-managedappcapproject!t299668",
  "clientsecret": "xGRgYPoAXbMv2gqRIDontThinkSooZ7uY=",
  "url": "https://28bdb0fbtrial.authentication.us10.hana.ondemand.com"
}
```

**STEP**: 4 — Create the SAP BTP destination (OAuth2ClientCredentials)

**DESCRIPTION**: In the subaccount, navigate to Connectivity → Destinations → Create destination. Use Authentication = OAuth2ClientCredentials (client credentials grant). Set the destination URL to your service base URL. Map XSUAA service key values to destination fields. Append /oauth/token to the Token Service URL.

Note: To use Token Exchange (user token exchange between systems), set Authentication = OAuth2UserTokenExchange (no Token Service user/password required).

**LANGUAGE**: JSON

**CODE**:
```json
// Destination properties (replace example values with your actual values)
{
  "Name": "capdestination",
  "Description": "CAP Project Destination",
  "URL": "https://28bdb0fbtrial-dev-managedappcapproject-srv.cfapps.us10-001.hana.ondemand.com",
  "Authentication": "OAuth2ClientCredentials",
  "ClientID": "sb-managedappcapproject!t299668",            // from XSUAA clientid
  "ClientSecret": "xGRgYPoAXbMv2gqRIDontThinkSooZ7uY=",     // from XSUAA clientsecret
  "TokenServiceURL": "https://28bdb0fbtrial.authentication.us10.hana.ondemand.com/oauth/token", // url + /oauth/token
  "TokenServiceUser": "sb-managedappcapproject!t299668",   // same as ClientID
  "TokenServicePassword": "xGRgYPoAXbMv2gqRIDontThinkSooZ7uY=",
  "HTML5.Timeout": "60000",
  "WebIDEEnabled": "true",
  "WebIDEUsage": "odata_gen",
  "HTML5.DynamicDestination": "true"
}
```

**STEP**: 5 — Confirm the destination in Service Centre (Business Application Studio)

**DESCRIPTION**: In Business Application Studio (or SAP BTP cockpit's Service Centre), open the Destinations view, select the new destination. Provide the service path you want to access (for example /odata/v4/catalog) and click Connect. The Service Centre will validate and show service availability. Screenshots referenced: Step6.png, Step7.png, Step7b.png.

**LANGUAGE**: Text

**CODE**:
```
Service path to append when testing in Service Centre:
/odata/v4/catalog
```

**STEP**: 6 — Test destination via curl

**DESCRIPTION**: Use curl with the destination DNS alias (BTP-managed destination domain) to validate the OData response. The destination hostname format depends on your subaccount region and BTP setup — examples use capdestination.dest alias if DNS is configured by environment.

**LANGUAGE**: bash

**CODE**:
```bash
# Replace URL with your actual destination hostname + path if your environment exposes it as <destination>.dest
curl -L "https://capdestination.dest/odata/v4/catalog" -vs > curl-cap-output.txt 2>&1
# Inspect the output file
cat curl-cap-output.txt
```

**LANGUAGE**: JSON

**CODE**:
```json
// Example expected OData response body (truncated)
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

**STEP**: 7 — Use the destination in Fiori tools or HTML5 generator

**DESCRIPTION**: With the destination validated, you can use SAP Fiori tools (e.g., the HTML5 app generator) to generate apps that consume the OData services from your CAP project by referencing the created destination (capdestination) and the service path (/odata/v4/catalog).

**LANGUAGE**: Text

**CODE**:
```
- In Fiori tools, select "Use destination" and choose "capdestination"
- Provide the service path: /odata/v4/catalog
```

**STEP**: 8 — Optional: Token exchange and cross-subaccount/region info

**DESCRIPTION**: If you need token-exchange (user token propagation) instead of client credentials, change the destination Authentication type to OAuth2UserTokenExchange. For cross-subaccount or cross-region calls, consult SAP blog: "SAP BTP: How to call protected app across regions with SAML and OAuth".

**LANGUAGE**: Text

**CODE**:
```
- To use Token Exchange, set Authentication = OAuth2UserTokenExchange on the destination (removes Token Service user/password requirement)
- Cross-region guide: https://community.sap.com/t5/technology-blogs-by-sap/sap-btp-how-to-call-protected-app-across-regions-with-saml-and-oauth-2/ba-p/13546145
```

**STEP**: 9 — License and repository reference

**DESCRIPTION**: License information for this sample/project.

**LANGUAGE**: Text

**CODE**:
```
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the LICENSE file:
../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Referenced Guides Index for fiori-samples

**INTRODUCTION**: This document indexes the referenced guide READMEs inside the fiori-samples repository and provides action-oriented examples for programmatically locating, reading, and extracting content. Use these steps when building tooling, RAG pipelines, or code generators that must surface or consume these guides.

**TAGS**: fiori, sap, btp, destinations, headless, onpremise, s4hana, proxy, ssl, cicd, abap, steampunk, README, automation

**STEP**: 1 — Consuming and validating SAP BTP destinations to support OData XML Service

**DESCRIPTION**: Open and extract the content of destinations/README.md. Use this guide to validate destination definitions used by your generator or runtime. Programmatically load the file, extract top-level headings and the first paragraph for RAG context or summarization.

**LANGUAGE**: Shell

**CODE**:
```bash
# Show the README file
cat destinations/README.md

# Print first heading and first paragraph
awk 'BEGIN {RS=""; FS="\n"} /^#/{print $1; print "" ; print $2; exit}' destinations/README.md
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Read and extract the first heading and paragraph for RAG input
const fs = require('fs');
const raw = fs.readFileSync('destinations/README.md', 'utf8');
const lines = raw.split('\n');
const heading = lines.find(l => l.startsWith('#')) || '';
const firstPara = raw.split('\n\n').slice(0,1).join('\n').trim();
console.log({ heading, firstPara });
```

**STEP**: 2 — Running SAP Fiori Generator headless

**DESCRIPTION**: Inspect headless/README.md for CLI flags, environment variables, and examples. Use the file to produce automated generator CLI calls or to embed help text in tool UIs.

**LANGUAGE**: Shell

**CODE**:
```bash
# Open the headless README and show lines around "Usage" or "Examples"
sed -n '1,200p' headless/README.md | sed -n '/Usage/,/Options/p'
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Extract code blocks (```bash or ```sh) to auto-generate sample CLI snippets
const fs = require('fs');
const md = fs.readFileSync('headless/README.md','utf8');
const codeBlocks = [...md.matchAll(/```(?:bash|sh|shell)?\n([\s\S]*?)```/g)].map(m=>m[1]);
console.log(codeBlocks.slice(0,3)); // preview first three CLI examples
```

**STEP**: 3 — Consuming SAP Cloud Connector via SAP BTP destination

**DESCRIPTION**: Open onpremise/README.md to find configuration steps for Cloud Connector + destination. Extract configuration sections (e.g., trusted proxies, principal propagation) for templating destination JSON or environment setups.

**LANGUAGE**: Shell

**CODE**:
```bash
# Show section headings to identify configuration subsections
grep -nE '^#{1,6} ' onpremise/README.md
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Extract configuration subsection by heading name (example: "Configuration")
const fs = require('fs');
const md = fs.readFileSync('onpremise/README.md','utf8');
const configStart = md.indexOf('\n## Configuration');
const config = md.slice(configStart, configStart + 4000); // adjust length as needed
console.log(config);
```

**STEP**: 4 — Consuming SAP S/4Hana public cloud via SAP BTP destination

**DESCRIPTION**: Read s4hana/README.md to obtain API endpoints, required destination properties, and recommended auth methods. Use to assemble destination metadata for testing or sample code.

**LANGUAGE**: Shell

**CODE**:
```bash
# Show README and search for "destination" occurrences
grep -n 'destination' s4hana/README.md || true
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Build a small summary with lines mentioning "destination" and "S/4HANA"
const fs = require('fs');
const md = fs.readFileSync('s4hana/README.md','utf8');
const lines = md.split('\n').filter(l => /destination|S\/4HANA/i.test(l));
console.log(lines.join('\n'));
```

**STEP**: 5 — Proxy Configuration

**DESCRIPTION**: Use proxy/README.md to configure HTTP(S) proxies for tooling and runtimes. Extract sample proxy environment variables or config snippets and template them into CI or local developer settings.

**LANGUAGE**: Shell

**CODE**:
```bash
# Print the proxy README and extract code fences for configuration samples
awk '/```/{f=!f; if(f) print "CODEBLOCK_START"} f{print}' proxy/README.md
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Extract env var examples like HTTP_PROXY/HTTPS_PROXY from README
const fs = require('fs');
const md = fs.readFileSync('proxy/README.md','utf8');
const envLines = md.split('\n').filter(l => /HTTP_PROXY|HTTPS_PROXY|no_proxy/i.test(l));
console.log(envLines.join('\n'));
```

**STEP**: 6 — Self-Signed SSL Certificate

**DESCRIPTION**: Open sslcerts/README.md to get steps for generating and trusting self-signed certs. Use the content to produce automated cert generation scripts or CI steps.

**LANGUAGE**: Shell

**CODE**:
```bash
# Show the certificate generation steps (common in README)
sed -n '1,200p' sslcerts/README.md
# Example: list openssl commands if present
grep -nE 'openssl' sslcerts/README.md || true
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Extract openssl command blocks for inclusion in automation scripts
const fs = require('fs');
const md = fs.readFileSync('sslcerts/README.md','utf8');
const opensslCmds = [...md.matchAll(/```(?:bash|sh)\n([\s\S]*?openssl[\s\S]*?)```/g)].map(m=>m[1]);
console.log(opensslCmds);
```

**STEP**: 7 — ABAP CI/CD Pipeline Support with Environment Credentials

**DESCRIPTION**: Use cicd/README.md to capture CI pipeline examples and environment credential usage. Programmatically extract YAML snippets to embed into your pipeline templates.

**LANGUAGE**: Shell

**CODE**:
```bash
# Show README and extract YAML blocks
sed -n '/```yaml/,/```/p' cicd/README.md
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Extract YAML code blocks for pipeline templates
const fs = require('fs');
const md = fs.readFileSync('cicd/README.md','utf8');
const yamlBlocks = [...md.matchAll(/```yaml\n([\s\S]*?)```/g)].map(m=>m[1]);
console.log(yamlBlocks);
```

**STEP**: 8 — SAP BTP ABAP Environment (Steampunk) - Cross Subaccount and Regions

**DESCRIPTION**: Inspect abapcloud/README.md for cross-subaccount and regional setup. Use this for automation that provisions resources and sets region-aware endpoints.

**LANGUAGE**: Shell

**CODE**:
```bash
# Print README and search for "region" or "subaccount"
grep -nE 'region|subaccount' abapcloud/README.md || true
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Summarize lines mentioning cross-account or region constraints
const fs = require('fs');
const md = fs.readFileSync('abapcloud/README.md','utf8');
const relevant = md.split('\n').filter(l => /region|subaccount|cross/i.test(l));
console.log(relevant.join('\n'));
```

**STEP**: 9 — License

**DESCRIPTION**: License metadata and full text are under /LICENSES/Apache-2.0.txt. Programmatically include license text in generated artifacts or verify compliance.

**LANGUAGE**: Shell

**CODE**:
```bash
# Show license header and confirm license file exists
sed -n '1,40p' LICENSES/Apache-2.0.txt
test -f LICENSES/Apache-2.0.txt && echo "License file present"
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Read license for embedding or verification
const fs = require('fs');
const license = fs.readFileSync('LICENSES/Apache-2.0.txt','utf8');
console.log(license.slice(0,1000)); // preview first 1000 chars
```


--------------------------------

**TITLE**: Configure SAP BTP Destination and Access for ABAP Environment (Steampunk)

**INTRODUCTION**: Practical, code-focused instructions and example destination payloads for exposing an SAP BTP ABAP Environment (Steampunk) system to the internet and enabling cross-account/region use. Includes recommended destination properties, Authentication options, troubleshooting pointers, and links to deployment and deep-dive resources.

**TAGS**: sap, btp, steampunk, abap, destination, fiori, saml, oauth2, WebIDEUsage, troubleshooting

**STEP**: 1 — Prerequisites: Authentication types and required WebIDEUsage values

**DESCRIPTION**: Confirm and configure the destination Authentication type and required WebIDEUsage values. Supported Authentication values commonly used for ABAP Cloud access:
- OAuth2UserTokenExchange
- SAMLAssertion

When exposing an ABAP Cloud (Steampunk) system via a BTP destination, ensure the destination has the WebIDEUsage property set so UI tooling and the ABAP Cloud type are recognized. Required value (comma-separated):
- odata_abap,dev_abap,abap_cloud

Use the example JSON snippet below as the minimal required properties for a destination definition object.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "Name": "My-Steampunk-Destination",
  "Type": "HTTP",
  "URL": "https://<abap-cloud-host>/sap/opu/odata/sap/<SERVICE>",
  "Authentication": "OAuth2UserTokenExchange", 
  "WebIDEUsage": "odata_abap,dev_abap,abap_cloud",
  "ProxyType": "Internet",
  "TrustAll": true
}
```

---

**STEP**: 2 — Example destination payload for SAMLAssertion (cross-account / cross-region use)

**DESCRIPTION**: Example destination JSON to create a BTP destination that uses SAMLAssertion for cross-account or cross-region access. When using SAMLAssertion you must configure trust/certificates between BTP and the ABAP Cloud instance (upload certificates in the destination or subaccount trust). Adapt fields (URL, Name, Certificate references) to your environment.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "Name": "Steampunk-SAML-Destination",
  "Type": "HTTP",
  "URL": "https://<abap-cloud-host>/sap/opu/odata/sap/<SERVICE>",
  "Authentication": "SAMLAssertion",
  "Audience": "https://<btx-service>",
  "WebIDEUsage": "odata_abap,dev_abap,abap_cloud",
  "ProxyType": "Internet",
  "TrustAll": false,
  "TokenServiceURL": "https://<trust-service>/token", 
  "AdditionalProperties": {
    "KeyStore": "<keystore-id-or-file>",
    "CertificateAlias": "<cert-alias>"
  }
}
```

Notes:
- Upload the required SAML trust certificate(s) to the subaccount or destination trust configuration before using SAMLAssertion.
- The exact property names for keystore/cert references vary by tooling; use your BTP cockpit/API fields.

---

**STEP**: 3 — Create and deploy an SAP Fiori app to ABAP Cloud (Steampunk)

**DESCRIPTION**: Follow the guided tutorial to generate a Fiori Elements app and deploy it to ABAP Cloud. Use SAP Business Application Studio or Visual Studio Code with SAP Fiori tools. After generating UI artifacts, deploy using the ABAP Cloud deployment flow (the tutorial below walks through the steps and required destination).

**LANGUAGE**: text

**CODE**:
```text
Tutorial: Create an SAP Fiori App and Deploy it to SAP BTP, ABAP Environment
https://developers.sap.com/tutorials/abap-environment-deploy-fiori-elements-ui.html

- Use SAP BAS or VS Code with SAP Fiori tools to generate Fiori Elements app.
- Configure the BTP destination (see Steps 1–2).
- Follow the tutorial's deploy steps (abap-deploy / transport / update backend service as required).
```

---

**STEP**: 4 — Enable cross-account / cross-region destination usage (SAMLAssertion)

**DESCRIPTION**: To enable a destination for usage across global accounts or between regions, configure SAML-based trust and set the destination Authentication to SAMLAssertion. Use either the video walkthrough or the official help article for step-by-step instructions. Note: some legacy content in the video is outdated (trust cert locations), but the cross-account/region concepts remain valid.

**LANGUAGE**: text

**CODE**:
```text
Watch: Configuring BTP Cross-Account and Cross-Region Destinations For Use in UI Tooling
https://www.youtube.com/watch?v=8ePyQJsmWYA

Read: Creating a Destination for Cross-Subaccount Communication
https://help.sap.com/docs/btp/sap-business-technology-platform/creating-destination-for-cross-subaccount-communication
```

---

**STEP**: 5 — Troubleshooting: Communication system and connectivity traces

**DESCRIPTION**: If external tools (e.g., Business Application Studio) cannot access the ABAP Cloud instance, verify the Communication System is configured correctly and enable a connectivity trace in the ABAP Cloud system to analyze errors.

Actions:
- Confirm communication system configuration between ABAP Cloud and BTP (endpoints, authentication, certificates).
- Enable and capture a connectivity trace in the ABAP Cloud system and analyze logs.

**LANGUAGE**: text

**CODE**:
```text
Check: Creating a Communication System for SAP Business Application Studio
https://help.sap.com/docs/sap-btp-abap-environment/abap-environment/creating-communication-system-for-sap-business-application-studio

Enable connectivity trace and analyze:
https://help.sap.com/docs/sap-btp-abap-environment/abap-environment/display-connectivity-trace
```

---

**STEP**: 6 — References and license

**DESCRIPTION**: Useful deep-dive article and license information for repository usage.

**LANGUAGE**: text

**CODE**:
```text
Demystifying ABAP Cloud (Steampunk) article:
https://community.sap.com/t5/technology-blog-posts-by-members/demystifying-sap-btp-abap-environment-steampunk-abap-on-cloud-embedded/ba-p/13567772

License:
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0
See file: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Improved ABAP Deployment Configurations for SAPUI5 Projects

**INTRODUCTION**: Practical, code-focused examples and configuration snippets to:
- securely provide credentials via environment variables or CI secrets,
- automate transport request creation,
- generate ZIP archives for deployment,
- integrate deployment commands into CI/CD pipelines,
- follow SAP recommendation to use CTMS for ABAP deployments.

Use these snippets directly in your project files: .env, ui5-deploy.yaml, ui5.yaml, build.yaml, and package.json. Replace placeholders (XYZ, SAMPLE_APP, MY_PACKAGE, URLs, credentials) with your actual values.

**TAGS**: ABAP, SAPUI5, ui5-tooling, deployment, CI/CD, CTMS, ui5-deploy.yaml, .env, archive

**STEP**: 1 — Recommended deployment approach (CTMS)
**DESCRIPTION**: Use SAP Cloud Transport Management (CTMS) for deploying to ABAP landscapes. Integrate external CI/CD (Azure DevOps, CircleCI, GitHub Actions) to CTMS via APIs or marketplace actions to preserve transport management and audit logs.
**LANGUAGE**: Markdown
**CODE**:
```markdown
- Prefer CTMS for SAP BTP ABAP deployments.
- You can integrate:
  - Azure DevOps, CircleCI -> CTMS via API
  - GitHub Actions -> "Deploy to SAP BTP with CTMS" marketplace action
- Resources:
  - https://github.com/marketplace/actions/deploy-to-sap-btp-with-ctms
  - https://www.npmjs.com/package/@sap/ux-ui5-tooling
  - https://community.sap.com/t5/technology-blog-posts-by-sap/...
```

**STEP**: 2 — Provide credentials via .env and ui5-deploy.yaml (local / CI usage)
**DESCRIPTION**: Create a .env for local development, reference env vars in ui5-deploy.yaml using env:KEY, or set CI secrets and pass credentials via CLI or environment variables. Use failFast and yes flags in ui5-deploy.yaml to avoid interactive prompts in CI.
**LANGUAGE**: Bash/YAML
**CODE**:
```bash
# File: .env (root of SAPUI5 project)
XYZ_USER=myusername
XYZ_PASSWORD=mypassword
```

```yaml
# File: ui5-deploy.yaml (snippet)
configuration:
  yes: true           # bypass interactive confirmations
  failFast: true      # exit immediately on errors (exit code 1)
  target:
    url: https://XYZ.sap-system.corp:44311
    client: 200
  credentials:
    username: env:XYZ_USER   # use env:KEY if loading .env into process
    password: env:XYZ_PASSWORD
```

Alternative: export environment variables in shell (no env: prefix in ui5-deploy.yaml):
```bash
export XYZ_USER='~username'
export XYZ_PASSWORD='~password'
```

And ui5-deploy.yaml uses plain keys:
```yaml
credentials:
  username: XYZ_USER
  password: XYZ_PASSWORD
```

Or pass credentials via CLI (use CI secrets; do not hardcode secrets in pipelines):
```bash
npx fiori deploy --username 'env:XYZ_USER' --password 'env:XYZ_PASSWORD' ...
# or with direct substitution from CI variables:
npx fiori deploy --username "$XYZ_USER" --password "$XYZ_PASSWORD" ...
```

**STEP**: 3 — Create Transport Request (TR) dynamically
**DESCRIPTION**: Use the special transport bookmark REPLACE_WITH_TRANSPORT to force creation of a new TR for each deploy or undeploy run.
**LANGUAGE**: YAML
**CODE**:
```yaml
# File: ui5-deploy.yaml (snippet)
app:
  name: /TEST/SAMPLE_APP
  package: /TEST/UPLOAD
  transport: REPLACE_WITH_TRANSPORT
```

This works for both deploy and undeploy — a TR will be created automatically.

**STEP**: 4 — CI/CD CLI command template
**DESCRIPTION**: Single-line CLI template to use from CI pipelines. Use --noConfig to avoid loading local config, --failFast and --yes to run non-interactively.
**LANGUAGE**: Bash
**CODE**:
```bash
npx fiori deploy \
  --url https://your-env.hana.ondemand.com \
  --name 'SAMPLE_APP' \
  --package 'MY_PACKAGE' \
  --transport 'REPLACE_WITH_TRANSPORT' \
  --archive-path 'archive.zip' \
  --username 'env:XYZ_USER' \
  --password 'env:XYZ_PASSWORD' \
  --noConfig \
  --failFast \
  --yes
```

Notes:
- Replace env:XYZ_USER and env:XYZ_PASSWORD with secrets in your CI pipeline or use direct variable interpolation (e.g., "$XYZ_USER").
- Use --noConfig to avoid using project ui5-deploy.yaml if you prefer fully explicit CLI options.

**STEP**: 5 — Generate ZIP archive (Option 1: auto-archive)
**DESCRIPTION**: Let the deploy command archive the dist folder on the fly by not using --archive-path. The tooling will package ./dist for upload.
**LANGUAGE**: Bash
**CODE**:
```bash
# Do NOT pass --archive-path; the deploy command will archive ./dist automatically
npx fiori deploy --name 'SAMPLE_APP' --package 'MY_PACKAGE' --transport 'REPLACE_WITH_TRANSPORT' --username 'env:XYZ_USER' --password 'env:XYZ_PASSWORD' --noConfig --failFast --yes
```

**STEP**: 6 — Generate ZIP archive (Option 2: build archive manually with ui5-task-zipper)
**DESCRIPTION**: Add ui5-task-zipper devDependency, update ui5.yaml or create build.yaml to produce ./dist/archive.zip when running ui5 build. Add npm scripts to call the build.
**LANGUAGE**: JSON/YAML/Bash
**CODE**:
```json
// File: package.json (snippet)
"devDependencies": {
  "ui5-task-zipper": "latest"
},
"scripts": {
  "archive": "ui5 build --config build.yaml",
  "build": "ui5 build"         // keep your existing build if needed
}
```

```yaml
# Option A: Add to existing ui5.yaml under builder
builder:
  customTasks:
    - name: ui5-task-zipper
      afterTask: generateVersionInfo
      configuration:
        archiveName: "archive"    # produces archive.zip
        keepResources: true
```

```yaml
# Option B: Separate build.yaml (recommended when only archiving)
# File: build.yaml
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

Build the archive:
```bash
# Using dedicated build.yaml
npx ui5 build --config build.yaml
# or package.json script
npm run archive
```

Output:
- ./dist/archive.zip (use this in --archive-path for deploy)

Example build log shows ui5-task-zipper running:
```text
info project1 › Running task ui5-task-zipper...
info ProjectBuilder Build succeeded
```

Update deployment scripts in CI to reference ./dist/archive.zip:
```bash
npx fiori deploy --archive-path './dist/archive.zip' --username 'env:XYZ_USER' --password 'env:XYZ_PASSWORD' --noConfig --failFast --yes
```

**STEP**: 7 — npm scripts for deploy/undeploy
**DESCRIPTION**: Add convenience npm scripts that reference environment variables or CI secrets and call the CLI with non-interactive flags.
**LANGUAGE**: JSON/Bash
**CODE**:
```json
// File: package.json (scripts snippet)
"scripts": {
  "deploy": "npx fiori deploy --noConfig --failFast --yes --archive-path './dist/archive.zip' --username 'env:XYZ_USER' --password 'env:XYZ_PASSWORD'",
  "undeploy": "npx fiori undeploy --noConfig --failFast --yes --username 'env:XYZ_USER' --password 'env:XYZ_PASSWORD'"
}
```

Call locally:
```bash
npm run build && npm run deploy
# or for undeploy
npm run undeploy
```

**STEP**: 8 — Debugging and additional notes
**DESCRIPTION**: How to enable verbose/debug output and known limitations.
**LANGUAGE**: Bash/Markdown
**CODE**:
```bash
# Enable debug logs for npm scripts
DEBUG=* npm run deploy

# Or if running CLI directly
DEBUG=* npx fiori deploy ...
```

Additional notes:
- Appending custom HTTP headers to deployments is NOT supported via CLI or ui5-deploy.yaml.
- Use ui5-deploy.yaml keys:
  - yes: true (bypass prompts)
  - failFast: true (exit immediately on first error)
- Prefer CTMS for deployment to SAP BTP ABAP landscapes for transport control and auditing.
--------------------------------

**TITLE**: Consuming and Validating SAP BTP Destinations for OData XML Services (northwind example)

**INTRODUCTION**: Practical, code-focused instructions to configure, validate, and consume OData XML services via SAP BTP Destinations. Includes sample destination configuration (northwind), explanations of key destination properties, curl test commands for odata_gen and odata_abap usage, environment check steps, and solutions for common misconfigurations.

**TAGS**: SAP BTP, destination, OData, OData XML, northwind, Fiori tools, Service Center, curl, debug

**STEP**: Flow diagram (interaction sequence)
**DESCRIPTION**: Sequence diagram showing typical flow: user -> browser -> BTP app -> Destination Service -> external API -> back to user.
**LANGUAGE**: mermaid
**CODE**:
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

**STEP**: Prerequisites
**DESCRIPTION**: Checklist (must-have items) before you configure/consume destinations.
**LANGUAGE**: text
**CODE**:
```
- SAP Cloud Foundry Runtime configured in your SAP BTP subaccount.
- Admin rights to SAP BTP cockpit to create/modify destinations.
- Knowledge of SAP BTP destinations and ABAP vs non-ABAP back ends.
- SAP Business Application Studio (or Fiori tools) for generation and Service Center usage.
- Sample public OData endpoint used here: https://services.odata.org
```

**STEP**: Import / Create sample northwind destination
**DESCRIPTION**: Import or create a destination named `northwind` that points to the Microsoft OData sample host. This example uses NoAuthentication and ProxyType Internet. Save as a destination properties file if you prefer import.
**LANGUAGE**: ini
**CODE**:
```
# File: northwind (importable destination properties)
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
Image reference: northwind_destination.png?raw=true  
Import reference file: northwind?raw=true

**STEP**: Key destination property explanations (action-oriented)
**DESCRIPTION**: Use these properties to control how SAP tooling treats the destination. Apply them to destination Additional Properties as needed.
**LANGUAGE**: text
**CODE**:
```
Properties and actions:
- WebIDEUsage=odata_gen | odata_abap
  - odata_gen: destination points to a specific OData service (use when you know full service)
  - odata_abap: destination is used to query ABAP OData catalogs (use for ABAP backend discovery)
  - Note: use only one of these values. Remove the other.

- WebIDEEnabled=true
  - Enables use of the destination in SAP Business Application Studio / Fiori tooling.

- HTML5.DynamicDestination=true
  - Allows runtime dynamic resolution for HTML5/Fiori apps, enabling consumption even if not present in subaccount.

- HTML5.Timeout=60000
  - Timeout in milliseconds for backend responses (60000 ms = 60s).

- Authentication=NoAuthentication | BasicAuthentication | OAuth2ClientCredentials | ...
  - Select appropriate authentication type if the endpoint requires credentials.
```

**STEP**: WebIDEAdditionalData=full_url (when destination already contains full service path)
**DESCRIPTION**: If your destination URL is a full service URL (includes service root and path) and you do NOT want tooling to append paths, set WebIDEAdditionalData=full_url. Example and curl tests follow.
**LANGUAGE**: ini
**CODE**:
```
# File: northwind_fullurl (destination configured as full URL)
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
**LANGUAGE**: bash
**CODE**:
```bash
# Retrieve the OData service root via SAP Business Application Studio proxy
curl -L "https://northwind_fullurl.dest/" -vs > curl-fullurl-output.txt 2>&1

# Retrieve the $metadata (escape $ with backslash when using bash)
curl -L "https://northwind_fullurl.dest/\$metadata" -vs > curl-fullurl-meta-output.txt 2>&1
```

**STEP**: curl commands for odata_gen (calling a specific OData service)
**DESCRIPTION**: Use these curl examples when WebIDEUsage=odata_gen (destination treats URL as host or full URL depending on WebIDEAdditionalData). Escape $ in shell commands.
**LANGUAGE**: bash
**CODE**:
```bash
# Example: call known OData V2 service path appended to destination host
curl -L "https://northwind.dest/v2/northwind/northwind.svc/" -vs > curl-datasrv-output.txt 2>&1

# Retrieve metadata for that service (escape $)
curl -L "https://northwind.dest/v2/northwind/northwind.svc/\$metadata" -vs > curl-datasrv-meta-output.txt 2>&1
```
Notes:
- "https://<destination-name>.dest/" routes through SAP Business Application Studio proxy to your destination.
- For local shell testing, you can open the full URL directly: https://services.odata.org/v2/northwind/northwind.svc/

**STEP**: curl commands for odata_abap (catalog queries against ABAP systems)
**DESCRIPTION**: Use these curl examples when WebIDEUsage=odata_abap to test OData V2/V4 catalogs on ABAP systems. These endpoints are NOT available for non-ABAP systems like northwind.
**LANGUAGE**: bash
**CODE**:
```bash
# OData V2 Catalog (ABAP)
curl -L "https://<destination-name>.dest/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection" -vs > curl-v2catalog-output.txt 2>&1

# OData V4 Catalog (ABAP)
curl -L "https://<destination-name>.dest/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?\$expand=DefaultSystem(\$expand=Services)" -vs > curl-v4catalog-output.txt 2>&1
```
Important: The northwind destination is NOT an ABAP system → these catalog endpoints will return HTTP 404.

**STEP**: Environment Check in SAP Business Application Studio
**DESCRIPTION**: Validate destination configuration and connectivity using the Environment Check tool (generates a Preview results.md and zip debug trace).
**LANGUAGE**: text
**CODE**:
```
1. Open SAP Business Application Studio.
2. Open Command Palette (View -> Find Command).
3. Run: Fiori: Open Environment Check
4. Click "Check Destination", choose destination, enter credentials if prompted.
5. Click "Save and view results".
6. Review `Preview results.md` -> Destination Details for missing parameters.
7. Attach generated zip (contains logs and traces) to a support ticket if needed.
```

**STEP**: Dynamic Destinations (bypass Business Application Studio)
**DESCRIPTION**: Validate destinations directly via SAP Fiori launchpad dynamic_dest path. Ensure your subaccount exposes dynamic_dest and destination uses HTML5.DynamicDestination=true & WebIDEEnabled=true.
**LANGUAGE**: text
**CODE**:
```
Template:
https://<your-subaccount-subdomain>.launchpad.cfapps.<region-api-endpoint>.hana.ondemand.com/dynamic_dest/<your-destination-name>/<path-to-OData-metadata-or-service>

Example base URL:
https://mytrial-account.launchpad.cfapps.us10.hana.ondemand.com/dynamic_dest/mys4hc-destination/

Append OData V2 catalog (ABAP):
https://mytrial-account.launchpad.cfapps.us10.hana.ondemand.com/dynamic_dest/mys4hc-destination/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection

Append OData V4 catalog (ABAP):
https://mytrial-account.launchpad.cfapps.us10.hana.ondemand.com/dynamic_dest/mys4hc-destination/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)
```
Precondition: Subscribe to SAP Build Work Zone or ensure dynamic_dest path is exposed for your region/subaccount.

**STEP**: Common Error — Incorrect destination URL (HTTP 4xx)
**DESCRIPTION**: Fix destinations that include hardcoded extra path segments, query parameters, or format options. These cause improper concatenation by tooling and result in HTTP 404 / 401 / 403.
**LANGUAGE**: text
**CODE**:
```
Incorrect destination example (DO NOT use):
URL=https\://services.odata.org/odata/$format=JSON

Problem: tooling will append service paths leading to invalid combined URL:
https://services.odata.org/odata/$format=JSON/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection

Fix options:
1) Set URL to base host only and let tooling append paths:
   URL=https\://services.odata.org

2) If URL must point to a specific full resource, set:
   WebIDEAdditionalData=full_url
   and use the full URL in URL property (see northwind_fullurl example).
```

**STEP**: Common Error — Validating outside BAS using Dynamic Destinations
**DESCRIPTION**: Steps to validate your destination from SAP Fiori launchpad (bypass BAS). Ensure Additional Properties include:
- HTML5.DynamicDestination=true
- WebIDEEnabled=true
**LANGUAGE**: text
**CODE**:
```
1. Ensure destination Additional Properties:
   HTML5.DynamicDestination=true
   WebIDEEnabled=true

2. Build dynamic_dest URL:
   https://<subdomain>.launchpad.cfapps.<region>.hana.ondemand.com/dynamic_dest/<destination-name>/<service-path>

3. Test in browser or via curl to confirm connectivity.
```

**STEP**: Sample public OData XML endpoints (northwind)
**DESCRIPTION**: Public sample endpoints used in examples.
**LANGUAGE**: text
**CODE**:
```
#1 https://services.odata.org/v2/northwind/northwind.svc/
#2 https://services.odata.org/V3/Northwind/Northwind.svc/
```

**STEP**: Notes on curl usage (escape $)
**DESCRIPTION**: When using curl in bash, escape $ with backslash to pass literal $ in the query string.
**LANGUAGE**: bash
**CODE**:
```bash
# Example showing escaping of $ for $metadata
curl -L "https://northwind.dest/v2/northwind/northwind.svc/\$metadata" -vs > curl-datasrv-meta-output.txt 2>&1
```

**STEP**: License
**DESCRIPTION**: Project license reference.
**LANGUAGE**: text
**CODE**:
```
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
License: Apache Software License, version 2.0
See: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Running SAP Fiori Tools Headless Generator (CAP and Fiori UI)

**INTRODUCTION**: This document shows how to run the SAP Fiori Tools headless generators by supplying a complete JSON configuration payload. It covers two common options: appending a Fiori UI app with managed approuter to an existing CAP project (CAP headless) and generating a standalone Fiori UI application with a managed approuter (Fiori UI headless). Use these JSON templates and examples to run generators from the CLI or programmatically.

**TAGS**: sap, fiori, headless, generator, cap, fioriui, json, yeoman, approuter

**STEP**: 1 — Create headless JSON payload (CAP)
**DESCRIPTION**: Create a JSON configuration file with all mandatory values for the CAP headless generator. Save as cap-headless.json in your workspace root or a dedicated config folder. Modify values to match your project and naming conventions.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "$schema": "./schema/cap-headless.schema.json",
  "generator": "cap-fiori",
  "schemaVersion": "1.0.0",
  "project": {
    "projectFolder": "./",                     // path to existing CAP project root
    "namespace": "com.example",                // project namespace
    "capModule": "srv"                         // CAP srv module or folder
  },
  "application": {
    "appId": "com.example.fioriapp",
    "appTitle": "Fiori App (Headless CAP)",
    "appDescription": "Generated Fiori UI added to CAP project",
    "template": "fiori-elements",              // example: fiori-elements, freestyle
    "framework": "SAPUI5",
    "platform": "SAPUI5",
    "viewType": "XML"
  },
  "managedApprouter": {
    "enable": true,
    "approuterName": "approuter",
    "routePath": "/fioriapp"
  },
  "auth": {
    "xsuaa": true,
    "useBasicAuth": false
  },
  "additionalOptions": {
    "overwrite": false,
    "skipInstall": true
  }
}
```

**STEP**: 2 — Create headless JSON payload (Fiori UI)
**DESCRIPTION**: Create a JSON configuration file for standalone Fiori UI application generation. Save as fioriui-headless.json. Adjust fields for the app template and managed approuter settings.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "$schema": "./schema/fioriui-headless.schema.json",
  "generator": "fiori-ui",
  "schemaVersion": "1.0.0",
  "application": {
    "appId": "com.example.fioriui",
    "appTitle": "Fiori UI Headless App",
    "appDescription": "Generated Fiori UI application with managed approuter",
    "template": "fiori-elements",
    "framework": "SAPUI5",
    "platform": "SAPUI5",
    "viewType": "XML",
    "dataSource": {
      "name": "mainService",
      "uri": "/odata/v4/",
      "useLocalMock": false
    }
  },
  "managedApprouter": {
    "enable": true,
    "approuterName": "managed-approuter",
    "routePath": "/my-fiori"
  },
  "deployment": {
    "destinations": [
      {
        "name": "myBTPDest",
        "url": "https://my-btp-destination.example"
      }
    ]
  },
  "additionalOptions": {
    "overwrite": false,
    "skipInstall": false
  }
}
```

**STEP**: 3 — Run generator from CLI (examples)
**DESCRIPTION**: Example CLI commands to run a generator using the saved JSON payload. Replace generator name and config path as required by your environment. Many SAP Fiori headless generator packages accept a --config option (check the generator README). If your generator is published as an NPM CLI, use its binary; otherwise run via Yeoman or node wrapper.
**LANGUAGE**: Shell
**CODE**:
```sh
# Example 1: If the generator exposes a CLI that accepts --config
# Adjust the binary name to the actual package (e.g., @sap/generator-cap, @sap/generator-fiori)
npx @sap/generator-cap --config ./cap-headless.json

npx @sap/generator-fiori --config ./fioriui-headless.json

# Example 2: If using Yeoman with registered generator name
# 'yo' + generator-name + --config may be supported by the specific generator
yo @sap/generator-cap --config ./cap-headless.json
yo @sap/generator-fiori --config ./fioriui-headless.json
```

**STEP**: 4 — Run generator programmatically (Node.js / Yeoman env)
**DESCRIPTION**: Programmatic invocation using yeoman-environment. Read the JSON config and pass it as options to the generator run. Replace the require.resolve path with the actual generator path in your repository or node_modules.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
// run-headless-generator.js
const fs = require('fs');
const path = require('path');
const env = require('yeoman-environment').createEnv();

// Load JSON payload
const configPath = path.resolve(process.cwd(), process.argv[2] || './cap-headless.json');
const payload = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Register the local or installed generator implementation
// Adjust the require.resolve target to the generator's main module in your workspace
const generatorPath = require.resolve('../generators/cap'); // placeholder path
env.register(generatorPath, 'sap:cap');

// Run the generator and pass the payload as options (generators often expect an 'options' object)
env.run('sap:cap', payload, (err) => {
  if (err) {
    console.error('Generator failed:', err);
    process.exit(1);
  }
  console.log('Headless generation completed successfully.');
});
```

**STEP**: 5 — Reference READMEs and license
**DESCRIPTION**: Detailed, generator-specific options, schemas, and presets are in the per-generator README files. Use them to confirm exact option names, supported schema versions, and CLI flags.
**LANGUAGE**: plain text
**CODE**:
- CAP headless README: cap/README.md
- Fiori UI headless README: fioriui/README.md

License:
- Project license file: ../../LICENSES/Apache-2.0.txt
- Copyright (c) 2009-2026 SAP SE or an SAP affiliate company. This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the LICENSE file above.
--------------------------------

**TITLE**: Running CAP Headless — Append SAP Fiori UI (managed approuter) to a CAP project

**INTRODUCTION**: This guide shows how to append a SAP Fiori Elements UI application and managed approuter deployment configuration to an existing CAP project using the headless Yeoman generator. It includes prerequisites, optional CAP project bootstrap, the required cap_app_config.json, generator commands and common gotchas. Use these steps in automation scripts or CI to generate UI and deployment artifacts.

**TAGS**: fiori, cap, headless, approuter, sap, ui5, generator, cloud-foundry, mta, hana

STEP: Prerequisites
DESCRIPTION: Install the CAP development kit globally. Run this from a new terminal session so the PATH is updated.
LANGUAGE: Bash
CODE:
```bash
npm i -g @sap/cds-dk
```

STEP: (Optional) Create a sample CAP project with HANA, MTA and sample data
DESCRIPTION: One-liner to scaffold a CAP project, add the tiny sample, HANA and MTA support, build for HANA and install DB dependencies. Run from the folder where you want the project created.
LANGUAGE: Bash
CODE:
```bash
cds init managedAppCAPProject && \
cd managedAppCAPProject && \
cds add tiny-sample && \
cds add hana && \
cds add mta && \
npm install && \
cds build --for hana && \
cp gen/db/package.json db && \
npm i
```

STEP: Create config file placeholder
DESCRIPTION: Create the headless generator input file cap_app_config.json in the CAP project root.
LANGUAGE: Bash
CODE:
```bash
touch cap_app_config.json
```

STEP: cap_app_config.json — canonical JSON file to drive the headless generator
DESCRIPTION: Copy this JSON to cap_app_config.json and update the values to match your project paths, CAP service name/path and target UI project settings. Keep "service.capService.projectPath" pointing to the CAP project root (often "./") and "project.targetFolder" pointing to the directory that will contain the new UI project (the path should be the CAP root + "/app/" if using default CAP apps folder). Remove "deployConfig" entirely if you do not want any Cloud Foundry deployment configuration generated.
LANGUAGE: JSON
CODE:
```json
{
  "version": "0.1",
  "floorplan": "FE_LROP",
  "project": {
    "title": "Project's \"Title\"",
    "description": "Test 'Project' \"Description\"",
    "namespace": "cap.namespace",
    "ui5Version": "1.90.0",
    "localUI5Version": "1.82.2",
    "name": "mylropproject",
    "sapux": true,
    "targetFolder": "/Users/MyUser/Documents/managedAppCAPProject/app/"
  },
  "service": {
    "servicePath": "/odata/v4/catalog/",
    "capService": {
      "projectPath": "./",
      "serviceName": "CatalogService",
      "serviceCdsPath": "srv/cat-service.cds",
      "appPath": "app"
    }
  },
  "entityConfig": {
    "mainEntity": {
      "entityName": "Books"
    }
  },
  "deployConfig": {
    "deployTarget": "CF",
    "destinationName": "fiori-default-srv-api",
    "addToManagedAppRouter": true,
    "addMTADestination": true
  }
}
```

STEP: cap_app_config.json — field reference (quick)
DESCRIPTION: Key fields you must update:
- project.title / project.description: UI app metadata.
- project.name: SAP Fiori UI project folder/name (e.g., "mylropproject").
- project.targetFolder: absolute or relative path where UI project will be created (append project.name to this path).
- project.namespace: optional namespace for UI app.
- service.servicePath: root path for the generated OData service (e.g., "/odata/v4/catalog/").
- service.capService.projectPath: path to CAP project (usually "./" when running in CAP root).
- service.capService.serviceName: service name defined in your CAP srv.
- service.capService.serviceCdsPath: path to the .cds that exposes the service.
- entityConfig.mainEntity.entityName: main entity for FE_LROP.
- deployConfig.*: controls CF deployment and managed approuter integration. Remove deployConfig to skip deployment config.

LANGUAGE: text
CODE:
```text
Update the JSON values above to match your CAP project layout and desired UI app settings.
```

STEP: Run the headless generator (command syntax and options)
DESCRIPTION: From the CAP project root, run the Yeoman headless generator with the path to your cap_app_config.json. Generator package names:
- Recommended: @sap/fiori-elements:headless
- Older CLI alias may be @sap/fiori:headless
Options:
--force          Overwrite output files
--skipInstall    Skip install phase (do not run npm install for generated UI)
--deleteFile     Delete the input app configuration file after generation
--logLevel debug|info
LANGUAGE: Bash
CODE:
```bash
# Basic usage (recommended package name)
yo @sap/fiori-elements:headless ./cap_app_config.json <optional-output-path-or-cwd> [--force] [--skipInstall] [--deleteFile] [--logLevel debug|info]

# Example: generate into current working directory
yo @sap/fiori-elements:headless ./cap_app_config.json ./

# Example: verbose logging and skip npm install
yo @sap/fiori-elements:headless ./cap_app_config.json --logLevel debug --skipInstall
```

STEP: Common gotchas and tips
DESCRIPTION: Short list of common pitfalls to check before running the generator.
LANGUAGE: Bash
CODE:
```bash
# 1) To generate UI only (no CF deployment), remove "deployConfig" from cap_app_config.json.
# 2) If your CAP project already has a managed or standalone approuter, set "addToManagedAppRouter": false or remove it.
# 3) Ensure serviceCdsPath points to the CDS file that exposes the service (relative to projectPath).
# 4) Use absolute paths for project.targetFolder to avoid confusion in different editors (BAS vs VSCode).
# 5) Generator package: if "yo @sap/fiori-elements:headless" fails, try "yo @sap/fiori:headless" (older alias).
```

STEP: License
DESCRIPTION: Project license reference to preserve attribution.
LANGUAGE: text
CODE:
```text
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0.
See: /LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Running SAP Fiori UI Headless (Generate UI + Managed Approuter)

**INTRODUCTION**: Step-by-step instructions and ready-to-use configuration examples to generate a SAP Fiori UI application headlessly (yo @sap/fiori:headless). Includes a minimal template, a full example with embedded OData EDMX metadata, command usage, and gotchas for FLP and deployment configuration.

**TAGS**: fiori, sap, headless, yo, ui5, cap, odata, flp, cloudfoundry, managed-approuter

**STEP**: Prerequisites
**DESCRIPTION**: Verify requirements before running the headless generator.
- OData XML metadata is required. Example metadata used below: https://services.odata.org/V2/Northwind/Northwind.svc/$metadata
- If embedding raw XML into JSON, escape double quotes as \" so the XML can be a JSON string.
**LANGUAGE**: text
**CODE**:
```text
Required:
- Node.js + Yeoman installed
- Generator: @sap/fiori
- OData metadata (XML). Example: https://services.odata.org/V2/Northwind/Northwind.svc/$metadata

Note:
Replace any " inside raw XML with \" before adding to the JSON "edmx" property.
```

**STEP**: Create the app configuration file
**DESCRIPTION**: Create a new configuration file (app_config.json) in your working directory and populate it with your project/service values. This file is passed to the headless generator.
- Recommended path/name: ./app_config.json
**LANGUAGE**: bash
**CODE**:
```bash
# Create the config file (empty) in the current directory
touch ./app_config.json
```

**STEP**: Minimal app_config.json template (quick editable)
**DESCRIPTION**: Minimal, valid JSON template — replace placeholder values with your project-specific settings. Do not include comments in the JSON file.
- Update: project.name, project.title, project.targetFolder, service.host, service.servicePath, entityConfig, flpConfig (if using FLP), deployConfig (if deploying).
**LANGUAGE**: JSON
**CODE**:
```JSON
{
  "version": "0.2",
  "floorplan": "FE_LROP",
  "project": {
    "title": "Project Title",
    "description": "Project Description",
    "namespace": "ns.test",
    "ui5Version": "1.84.0",
    "localUI5Version": "1.82.2",
    "enableTelemetry": true,
    "name": "northwind",
    "sapux": true,
    "targetFolder": "/Users/MyUser/Documents/"
  },
  "service": {
    "servicePath": "/V2/Northwind/Northwind.svc/",
    "host": "https://services.odata.org",
    "edmx": "REPLACE_WITH_ESCAPED_EDMX_XML_STRING"
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
    "destinationName": "MySubAccountDestination",
    "addToManagedAppRouter": true
  }
}
```

**STEP**: Full example app_config.json (Northwind EDMX embedded)
**DESCRIPTION**: Use this full example if you want the generator to create the UI from the Northwind EDMX embedded directly in the config. The "edmx" value already contains escaped quotes. Save this content as ./app_config.json before running the generator.
**LANGUAGE**: JSON
**CODE**:
```JSON
{
  "version": "0.2",
  "floorplan": "FE_LROP",
  "project": {
    "title": "Project's \"Title\"",
    "description": "Test 'Project' \"Description\"",
    "namespace": "ns.test",
    "ui5Version": "1.84.0",
    "localUI5Version": "1.82.2",
    "enableTelemetry": true,
    "name": "northwind",
    "sapux": true,
    "targetFolder": "/Users/MyUser/Documents/"
  },
  "service": {
    "servicePath": "/V2/Northwind/Northwind.svc/",
    "host": "https://services.odata.org",
    "edmx": "<?xml version=\"1.0\" encoding=\"utf-8\"?><edmx:Edmx Version=\"1.0\" xmlns:edmx=\"http://schemas.microsoft.com/ado/2007/06/edmx\"><edmx:DataServices m:DataServiceVersion=\"1.0\" m:MaxDataServiceVersion=\"2.0\" xmlns:m=\"http://schemas.microsoft.com/ado/2007/08/dataservices/metadata\"><Schema Namespace=\"NorthwindModel\" xmlns=\"http://schemas.microsoft.com/ado/2009/11/edm\"><EntityType Name=\"Category\"><Key><PropertyRef Name=\"CategoryID\" /></Key><Property Name=\"CategoryID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"CategoryName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Description\" Type=\"Edm.String\" MaxLength=\"Max\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Picture\" Type=\"Edm.Binary\" MaxLength=\"Max\" FixedLength=\"false\" /><NavigationProperty Name=\"Products\" Relationship=\"NorthwindModel.FK_Products_Categories\" ToRole=\"Products\" FromRole=\"Categories\" /></EntityType><EntityType Name=\"CustomerDemographic\"><Key><PropertyRef Name=\"CustomerTypeID\" /></Key><Property Name=\"CustomerTypeID\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"10\" FixedLength=\"true\" Unicode=\"true\" /><Property Name=\"CustomerDesc\" Type=\"Edm.String\" MaxLength=\"Max\" FixedLength=\"false\" Unicode=\"true\" /><NavigationProperty Name=\"Customers\" Relationship=\"NorthwindModel.CustomerCustomerDemo\" ToRole=\"Customers\" FromRole=\"CustomerDemographics\" /></EntityType><EntityType Name=\"Customer\"><Key><PropertyRef Name=\"CustomerID\" /></Key><Property Name=\"CustomerID\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"5\" FixedLength=\"true\" Unicode=\"true\" /><Property Name=\"CompanyName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ContactName\" Type=\"Edm.String\" MaxLength=\"30\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ContactTitle\" Type=\"Edm.String\" MaxLength=\"30\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Address\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"City\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Region\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"PostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Country\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Phone\" Type=\"Edm.String\" MaxLength=\"24\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Fax\" Type=\"Edm.String\" MaxLength=\"24\" FixedLength=\"false\" Unicode=\"true\" /><NavigationProperty Name=\"Orders\" Relationship=\"NorthwindModel.FK_Orders_Customers\" ToRole=\"Orders\" FromRole=\"Customers\" /><NavigationProperty Name=\"CustomerDemographics\" Relationship=\"NorthwindModel.CustomerCustomerDemo\" ToRole=\"CustomerDemographics\" FromRole=\"Customers\" /></EntityType><EntityType Name=\"Employee\"><Key><PropertyRef Name=\"EmployeeID\" /></Key><Property Name=\"EmployeeID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"LastName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"20\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"FirstName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Title\" Type=\"Edm.String\" MaxLength=\"30\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"TitleOfCourtesy\" Type=\"Edm.String\" MaxLength=\"25\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"BirthDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"HireDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"Address\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"City\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Region\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"PostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Country\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"HomePhone\" Type=\"Edm.String\" MaxLength=\"24\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Extension\" Type=\"Edm.String\" MaxLength=\"4\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Photo\" Type=\"Edm.Binary\" MaxLength=\"Max\" FixedLength=\"false\" /><Property Name=\"Notes\" Type=\"Edm.String\" MaxLength=\"Max\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ReportsTo\" Type=\"Edm.Int32\" /><Property Name=\"PhotoPath\" Type=\"Edm.String\" MaxLength=\"255\" FixedLength=\"false\" Unicode=\"true\" /><NavigationProperty Name=\"Employees1\" Relationship=\"NorthwindModel.FK_Employees_Employees\" ToRole=\"Employees1\" FromRole=\"Employees\" /><NavigationProperty Name=\"Employee1\" Relationship=\"NorthwindModel.FK_Employees_Employees\" ToRole=\"Employees\" FromRole=\"Employees1\" /><NavigationProperty Name=\"Orders\" Relationship=\"NorthwindModel.FK_Orders_Employees\" ToRole=\"Orders\" FromRole=\"Employees\" /><NavigationProperty Name=\"Territories\" Relationship=\"NorthwindModel.EmployeeTerritories\" ToRole=\"Territories\" FromRole=\"Employees\" /></EntityType><EntityType Name=\"Order_Detail\"><Key><PropertyRef Name=\"OrderID\" /><PropertyRef Name=\"ProductID\" /></Key><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"ProductID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"UnitPrice\" Type=\"Edm.Decimal\" Nullable=\"false\" Precision=\"19\" Scale=\"4\" /><Property Name=\"Quantity\" Type=\"Edm.Int16\" Nullable=\"false\" /><Property Name=\"Discount\" Type=\"Edm.Single\" Nullable=\"false\" /><NavigationProperty Name=\"Order\" Relationship=\"NorthwindModel.FK_Order_Details_Orders\" ToRole=\"Orders\" FromRole=\"Order_Details\" /><NavigationProperty Name=\"Product\" Relationship=\"NorthwindModel.FK_Order_Details_Products\" ToRole=\"Products\" FromRole=\"Order_Details\" /></EntityType><EntityType Name=\"Order\"><Key><PropertyRef Name=\"OrderID\" /></Key><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"CustomerID\" Type=\"Edm.String\" MaxLength=\"5\" FixedLength=\"true\" Unicode=\"true\" /><Property Name=\"EmployeeID\" Type=\"Edm.Int32\" /><Property Name=\"OrderDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"RequiredDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"ShippedDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"ShipVia\" Type=\"Edm.Int32\" /><Property Name=\"Freight\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /><Property Name=\"ShipName\" Type=\"Edm.String\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipAddress\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipCity\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipRegion\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipPostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipCountry\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><NavigationProperty Name=\"Customer\" Relationship=\"NorthwindModel.FK_Orders_Customers\" ToRole=\"Customers\" FromRole=\"Orders\" /><NavigationProperty Name=\"Employee\" Relationship=\"NorthwindModel.FK_Orders_Employees\" ToRole=\"Employees\" FromRole=\"Orders\" /><NavigationProperty Name=\"Order_Details\" Relationship=\"NorthwindModel.FK_Order_Details_Orders\" ToRole=\"Order_Details\" FromRole=\"Orders\" /><NavigationProperty Name=\"Shipper\" Relationship=\"NorthwindModel.FK_Orders_Shippers\" ToRole=\"Shippers\" FromRole=\"Orders\" /></EntityType><EntityType Name=\"Product\"><Key><PropertyRef Name=\"ProductID\" /></Key><Property Name=\"ProductID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"SupplierID\" Type=\"Edm.Int32\" /><Property Name=\"CategoryID\" Type=\"Edm.Int32\" /><Property Name=\"QuantityPerUnit\" Type=\"Edm.String\" MaxLength=\"20\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"UnitPrice\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /><Property Name=\"UnitsInStock\" Type=\"Edm.Int16\" /><Property Name=\"UnitsOnOrder\" Type=\"Edm.Int16\" /><Property Name=\"ReorderLevel\" Type=\"Edm.Int16\" /><Property Name=\"Discontinued\" Type=\"Edm.Boolean\" Nullable=\"false\" /><NavigationProperty Name=\"Category\" Relationship=\"NorthwindModel.FK_Products_Categories\" ToRole=\"Categories\" FromRole=\"Products\" /><NavigationProperty Name=\"Order_Details\" Relationship=\"NorthwindModel.FK_Order_Details_Products\" ToRole=\"Order_Details\" FromRole=\"Products\" /><NavigationProperty Name=\"Supplier\" Relationship=\"NorthwindModel.FK_Products_Suppliers\" ToRole=\"Suppliers\" FromRole=\"Products\" /></EntityType><EntityType Name=\"Region\"><Key><PropertyRef Name=\"RegionID\" /></Key><Property Name=\"RegionID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"RegionDescription\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"50\" FixedLength=\"true\" Unicode=\"true\" /><NavigationProperty Name=\"Territories\" Relationship=\"NorthwindModel.FK_Territories_Region\" ToRole=\"Territories\" FromRole=\"Region\" /></EntityType><EntityType Name=\"Shipper\"><Key><PropertyRef Name=\"ShipperID\" /></Key><Property Name=\"ShipperID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"CompanyName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Phone\" Type=\"Edm.String\" MaxLength=\"24\" FixedLength=\"false\" Unicode=\"true\" /><NavigationProperty Name=\"Orders\" Relationship=\"NorthwindModel.FK_Orders_Shippers\" ToRole=\"Orders\" FromRole=\"Shippers\" /></EntityType><EntityType Name=\"Supplier\"><Key><PropertyRef Name=\"SupplierID\" /></Key><Property Name=\"SupplierID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"CompanyName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ContactName\" Type=\"Edm.String\" MaxLength=\"30\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ContactTitle\" Type=\"Edm.String\" MaxLength=\"30\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Address\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"City\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Region\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"PostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Country\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Phone\" Type=\"Edm.String\" MaxLength=\"24\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Fax\" Type=\"Edm.String\" MaxLength=\"24\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"HomePage\" Type=\"Edm.String\" MaxLength=\"Max\" FixedLength=\"false\" Unicode=\"true\" /><NavigationProperty Name=\"Products\" Relationship=\"NorthwindModel.FK_Products_Suppliers\" ToRole=\"Products\" FromRole=\"Suppliers\" /></EntityType><EntityType Name=\"Territory\"><Key><PropertyRef Name=\"TerritoryID\" /></Key><Property Name=\"TerritoryID\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"20\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"TerritoryDescription\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"50\" FixedLength=\"true\" Unicode=\"true\" /><Property Name=\"RegionID\" Type=\"Edm.Int32\" Nullable=\"false\" /><NavigationProperty Name=\"Region\" Relationship=\"NorthwindModel.FK_Territories_Region\" ToRole=\"Region\" FromRole=\"Territories\" /><NavigationProperty Name=\"Employees\" Relationship=\"NorthwindModel.EmployeeTerritories\" ToRole=\"Employees\" FromRole=\"Territories\" /></EntityType><EntityType Name=\"Alphabetical_list_of_product\"><Key><PropertyRef Name=\"CategoryName\" /><PropertyRef Name=\"Discontinued\" /><PropertyRef Name=\"ProductID\" /><PropertyRef Name=\"ProductName\" /></Key><Property Name=\"ProductID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"SupplierID\" Type=\"Edm.Int32\" /><Property Name=\"CategoryID\" Type=\"Edm.Int32\" /><Property Name=\"QuantityPerUnit\" Type=\"Edm.String\" MaxLength=\"20\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"UnitPrice\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /><Property Name=\"UnitsInStock\" Type=\"Edm.Int16\" /><Property Name=\"UnitsOnOrder\" Type=\"Edm.Int16\" /><Property Name=\"ReorderLevel\" Type=\"Edm.Int16\" /><Property Name=\"Discontinued\" Type=\"Edm.Boolean\" Nullable=\"false\" /><Property Name=\"CategoryName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /></EntityType><EntityType Name=\"Category_Sales_for_1997\"><Key><PropertyRef Name=\"CategoryName\" /></Key><Property Name=\"CategoryName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"CategorySales\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Current_Product_List\"><Key><PropertyRef Name=\"ProductID\" /><PropertyRef Name=\"ProductName\" /></Key><Property Name=\"ProductID\" Type=\"Edm.Int32\" Nullable=\"false\" p6:StoreGeneratedPattern=\"Identity\" xmlns:p6=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /></EntityType><EntityType Name=\"Customer_and_Suppliers_by_City\"><Key><PropertyRef Name=\"CompanyName\" /><PropertyRef Name=\"Relationship\" /></Key><Property Name=\"City\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"CompanyName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ContactName\" Type=\"Edm.String\" MaxLength=\"30\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Relationship\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"9\" FixedLength=\"false\" Unicode=\"false\" /></EntityType><EntityType Name=\"Invoice\"><Key><PropertyRef Name=\"CustomerName\" /><PropertyRef Name=\"Discount\" /><PropertyRef Name=\"OrderID\" /><PropertyRef Name=\"ProductID\" /><PropertyRef Name=\"ProductName\" /><PropertyRef Name=\"Quantity\" /><PropertyRef Name=\"Salesperson\" /><PropertyRef Name=\"ShipperName\" /><PropertyRef Name=\"UnitPrice\" /></Key><Property Name=\"ShipName\" Type=\"Edm.String\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipAddress\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipCity\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipRegion\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipPostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipCountry\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"CustomerID\" Type=\"Edm.String\" MaxLength=\"5\" FixedLength=\"true\" Unicode=\"true\" /><Property Name=\"CustomerName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Address\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"City\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Region\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"PostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Country\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Salesperson\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"31\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"OrderDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"RequiredDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"ShippedDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"ShipperName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ProductID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"UnitPrice\" Type=\"Edm.Decimal\" Nullable=\"false\" Precision=\"19\" Scale=\"4\" /><Property Name=\"Quantity\" Type=\"Edm.Int16\" Nullable=\"false\" /><Property Name=\"Discount\" Type=\"Edm.Single\" Nullable=\"false\" /><Property Name=\"ExtendedPrice\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /><Property Name=\"Freight\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Order_Details_Extended\"><Key><PropertyRef Name=\"Discount\" /><PropertyRef Name=\"OrderID\" /><PropertyRef Name=\"ProductID\" /><PropertyRef Name=\"ProductName\" /><PropertyRef Name=\"Quantity\" /><PropertyRef Name=\"UnitPrice\" /></Key><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"ProductID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"UnitPrice\" Type=\"Edm.Decimal\" Nullable=\"false\" Precision=\"19\" Scale=\"4\" /><Property Name=\"Quantity\" Type=\"Edm.Int16\" Nullable=\"false\" /><Property Name=\"Discount\" Type=\"Edm.Single\" Nullable=\"false\" /><Property Name=\"ExtendedPrice\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Order_Subtotal\"><Key><PropertyRef Name=\"OrderID\" /></Key><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"Subtotal\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Orders_Qry\"><Key><PropertyRef Name=\"CompanyName\" /><PropertyRef Name=\"OrderID\" /></Key><Property Name=\"OrderID\" Type=\"Edm.Int32\" Nullable=\"false\" /><Property Name=\"CustomerID\" Type=\"Edm.String\" MaxLength=\"5\" FixedLength=\"true\" Unicode=\"true\" /><Property Name=\"EmployeeID\" Type=\"Edm.Int32\" /><Property Name=\"OrderDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"RequiredDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"ShippedDate\" Type=\"Edm.DateTime\" Precision=\"3\" /><Property Name=\"ShipVia\" Type=\"Edm.Int32\" /><Property Name=\"Freight\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /><Property Name=\"ShipName\" Type=\"Edm.String\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipAddress\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipCity\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipRegion\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipPostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ShipCountry\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"CompanyName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Address\" Type=\"Edm.String\" MaxLength=\"60\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"City\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Region\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"PostalCode\" Type=\"Edm.String\" MaxLength=\"10\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"Country\" Type=\"Edm.String\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /></EntityType><EntityType Name=\"Product_Sales_for_1997\"><Key><PropertyRef Name=\"CategoryName\" /><PropertyRef Name=\"ProductName\" /></Key><Property Name=\"CategoryName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ProductSales\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Products_Above_Average_Price\"><Key><PropertyRef Name=\"ProductName\" /></Key><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"UnitPrice\" Type=\"Edm.Decimal\" Precision=\"19\" Scale=\"4\" /></EntityType><EntityType Name=\"Products_by_Category\"><Key><PropertyRef Name=\"CategoryName\" /><PropertyRef Name=\"Discontinued\" /><PropertyRef Name=\"ProductName\" /></Key><Property Name=\"CategoryName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"15\" FixedLength=\"false\" Unicode=\"true\" /><Property Name=\"ProductName\" Type=\"Edm.String\" Nullable=\"false\" MaxLength=\"40\" FixedLength=\"false``
}
```

**STEP**: Run the headless generator
**DESCRIPTION**: Run the generator from the directory where you want the UI project created. Provide the path to your config file first. Optionally pass an output path (or leave blank for current directory). Common options: --force, --skipInstall, --deleteFile, --logLevel debug|info.
**LANGUAGE**: bash
**CODE**:
```bash
# Basic (uses current working directory as output)
yo @sap/fiori:headless ./app_config.json

# With options
yo @sap/fiori:headless ./app_config.json --logLevel debug --skipInstall

# Provide explicit output directory (optional)
yo @sap/fiori:headless ./app_config.json ./output-folder --force
```

**STEP**: Important fields to update before running
**DESCRIPTION**: Quick checklist — modify these fields in app_config.json:
- project.name: SAP Fiori UI project folder name (e.g., "northwind")
- project.title / description / namespace / targetFolder
- service.host: base URL of OData service
- service.servicePath: service root path
- service.edmx: embedded EDMX string (escape quotes) OR omit and set service.host + servicePath to fetch remotely if generator supports it
- entityConfig.mainEntity.entityName: main entity (EntitySet name)
- entityConfig.navigationEntity.EntitySet: related navigation entity (optional)
- flpConfig: remove the node if you do NOT want FLP (Build Work Zone) configuration
- deployConfig: remove the node if you do NOT want Cloud Foundry deployment configuration
**LANGUAGE**: text
**CODE**:
```text
Checklist to edit in app_config.json:
- project.name, project.title, project.targetFolder
- service.host, service.servicePath, service.edmx (ensure escaped quotes)
- entityConfig.mainEntity.entityName
- Remove flpConfig if no FLP required
- Remove deployConfig if you do not want CF/mta generation
```

**STEP**: Gotchas
**DESCRIPTION**: Common pitfalls and notes:
- To generate a UI without FLP, remove flpConfig from the config file.
- To avoid generating CF/mta deployment and managed approuter, remove deployConfig or set addToManagedAppRouter to false.
- app_config.json must be valid JSON (no inline // comments) when passed to the generator.
**LANGUAGE**: text
**CODE**:
```text
- Remove flpConfig node to skip Build Workzone (FLP) configuration.
- Remove deployConfig node or set addToManagedAppRouter=false to skip managed approuter/mta generation.
- Ensure the config file is valid JSON before running the generator (no // comments).
```

**STEP**: License
**DESCRIPTION**: Project license reference.
**LANGUAGE**: text
**CODE**:
```text
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
Licensed under Apache License, Version 2.0 (see /LICENSES/Apache-2.0.txt).
```
--------------------------------

**TITLE**: Configure SAP BTP Destination with ProxyType=OnPremise (Cloud Connector)

**INTRODUCTION**: Step-by-step, code-focused instructions to configure a SAP BTP destination that uses Cloud Connector (ProxyType=OnPremise) so cloud apps securely access on‑premise systems. Includes Cloud Connector UI mapping, destination properties (ini), validation commands, trace-log capture, deployment debug commands, and support-ticket artifact checklist.

**TAGS**: sap-btp, cloud-connector, onpremise, destination, principal-propagation, fiori, connectivity, troubleshooting, debug

STEP: 1 — Cloud Connector: basic setup and mapping
DESCRIPTION: Install and connect Cloud Connector to your SAP BTP subaccount, then create a Cloud-to-OnPremise mapping (virtual host:port -> internal host:port) and ensure Access Control policy allows the required path(s).
LANGUAGE: XML
CODE:
```text
Cloud Connector UI actions (perform these in the Cloud Connector web UI):
1. Log in as admin.
2. Subaccount connection:
   - Navigate: Cloud Connector -> Subaccount -> Add Subaccount -> Enter Subaccount ID, Region, and Account details.
   - Verify status: Subaccount Overview shows 'Connected'.

3. Create Virtual Host Mapping:
   - Navigate: Cloud Connector -> Cloud to On-Premise -> Add Mapping (Virtual Host Mapping)
   - Virtual Host: <virtual-host>  (example: my-internal-host)
   - Virtual Port: <virtual-port>  (example: 44330)
   - Internal Host: <backend-host> (example: 10.0.0.5 or s4hana-host.local)
   - Internal Port: <backend-port> (example: 44330)
   - Save mapping and ensure it's Active.

4. Configure Access Control for mapping:
   - Navigate: Cloud to On-Premise -> Access Control -> Select Mapping -> Actions -> Edit
   - Access Policy: Path (recommended)
   - URL Path: "/"  (or restrict to specific paths as needed)
   - All Sub-Paths: checked (if using "/")
   - Actions -> Check Availability (run to validate mapping)
```

STEP: 2 — Create SAP BTP Destination (OnPremise) - properties example
DESCRIPTION: In the SAP BTP cockpit create or import a destination with ProxyType=OnPremise. Use the INI example below and update CloudConnectorLocationId and URL to match your Cloud Connector mapping.
LANGUAGE: INI
CODE:
```ini
# SAP BTP Cloud Connector Destination Example (import into SAP BTP cockpit)
Type=HTTP
HTML5.DynamicDestination=true
Description=SAP Cloud Connector
Authentication=PrincipalPropagation
CloudConnectorLocationId=scloud                 # Replace with your Cloud Connector location id
WebIDEEnabled=true
ProxyType=OnPremise
URL=http://my-internal-host:44330/             # Replace with your virtual host and virtual port
Name=MyOnPremiseDestination
WebIDEUsage=odata_abap
HTML5.Timeout=60000
```

STEP: 3 — Validate connectivity: Environment Check & OData catalogs
DESCRIPTION: Run the Environment Check from SAP Business Application Studio to validate OData V2/V4 catalogs and produce envcheck-results.md. Fix any reported failures before deployment.
LANGUAGE: JSON
CODE:
```text
Actions:
1. In SAP Business Application Studio run: Environment Check (see ../destinations/README.md#environment-check)
2. Review output file: envcheck-results.md
3. Resolve reported issues (auth, URL, catalog access) and re-run the check.
```

STEP: 4 — Quick connectivity checks (troubleshooting checklist)
DESCRIPTION: Execute these checks to rapidly identify common connectivity root causes.
LANGUAGE: Text
CODE:
```text
Quick checks:
- Verify Cloud Connector is "Connected" to the correct subaccount.
- Confirm virtual host/port mapping matches the destination URL.
- Check CloudConnectorLocationId in destination matches Cloud Connector location.
- Confirm Access Control path and policy in Cloud Connector allow the requested URL.
- Validate backend authentication (Principal Propagation vs Basic vs OAuth2) alignment.
- From Cloud Connector host: curl http://<backend-host>:<port>/ to confirm network access.
- Check firewall/proxy rules that might block Cloud Connector <-> backend.
```

STEP: 5 — Enable and capture Cloud Connector trace logs
DESCRIPTION: Turn on trace logging in Cloud Connector UI, reproduce the failure, collect the specified log files, then revert logging levels.
LANGUAGE: Text
CODE:
```text
Cloud Connector UI actions:
1. Log in -> Log and Trace Files -> Edit
2. Set "Cloud Connector Loggers" = ALL
3. Set "Other Loggers" = Information
4. Enable "Payload Trace" and select the correct subaccount
5. Reproduce the failure
6. Collect these files (from Cloud Connector host / admin UI):
   - ljs_trace.log
   - scc_core.log (if present)
   - traffic_trace_<subaccount>_on_<region>.trc  (required)
   - tunnel_traffic_trace_<subaccount>_on_<region>.trc (if applicable)
7. Revert logging: set previous logger levels to avoid high-volume logging
Notes:
- If no entries appear in traffic_trace_*, Cloud Connector likely cannot open a secure tunnel to the target (check firewall/proxy).
```

STEP: 6 — Example connection test (curl) and capture output
DESCRIPTION: Use curl from SAP Business Application Studio or any reachable terminal to invoke the OData catalog through the destination service and save full verbose output to a file for diagnostics.
LANGUAGE: Bash
CODE:
```bash
# Catalog test (OData V2)
# Replace <destination-name> with the destination DNS alias in BTP (often "<name>.dest")
curl -L -vs -i -H "X-CSRF-Token: Fetch" \
  "https://<destination-name>.dest/sap/opu/odata/IWFND/CATALOGSERVICE;v=2?saml2=disabled" \
  > curl-catalog-output.txt 2>&1

# ABAP repository test (deployment)
# Replace <destination-name> and <bsp-name>
curl -L -vs -i -H "X-CSRF-Token: Fetch" \
  "https://<destination-name>.dest/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV/Repositories('%3Cbsp-name%3E')?saml2=disabled" \
  > curl-abap-srv-output.txt 2>&1
```

STEP: 7 — Deployment debug: capture npm deploy debug output
DESCRIPTION: Enable debug logs for deployment commands (useful for npm-based deploy scripts).
LANGUAGE: Bash
CODE:
```bash
# Mac / Linux
DEBUG=* npm run deploy

# Windows (PowerShell)
set DEBUG=* && npm run deploy
```

STEP: 8 — Support ticket artifact checklist (compile into a single zip)
DESCRIPTION: Collect and attach the following artifacts to a support ticket for BC-MID-SCC or CA-UX-IDE. Ensure clear reproduction steps and expected vs actual behavior are included.
LANGUAGE: Text
CODE:
```text
Required artifacts (combine into zip):
1. Screenshot of Destination in SAP BTP cockpit (show all properties)
2. envcheck-results.md (Environment Check report)
3. Cloud Connector captures:
   - Subaccount Overview screenshot (Cloud Connector -> Subaccount Overview -> Click Subaccount)
   - Virtual Host Mapping screenshot (Cloud Connector -> Cloud to On-Premise -> mapping)
   - Access Control screenshot for the mapping (Cloud to On-Premise -> Access Control -> Select Mapping -> Edit)
   - Check Availability result for the mapping
4. Collected Cloud Connector trace logs:
   - ljs_trace.log
   - scc_core.log (if available)
   - traffic_trace_<subaccount>_on_<region>.trc
   - tunnel_traffic_trace_<subaccount>_on_<region>.trc (if applicable)
5. ABAP logs (if backend is SAP ABAP):
   - /IWFND/ERROR_LOG
   - /IWFND/GW_CLIENT
6. curl output files:
   - curl-catalog-output.txt
   - curl-abap-srv-output.txt
7. Reproduction steps and expected vs actual behavior
```

STEP: 9 — Principal propagation: recommended setup and references
DESCRIPTION: Use Principal Propagation to forward end-user identities. Configure destination Authentication=PrincipalPropagation and follow Cloud Connector + backend setup guides. Collect client certificate and trace info when troubleshooting.
LANGUAGE: Text
CODE:
```text
Key actions:
- Destination: set Authentication=PrincipalPropagation
- Cloud Connector: ensure mapping and Access Control allow the proxied principal authentication flow (HTTPS)
- Backend (ABAP/S4): configure trust and mapping for forwarded principal (SAML/X.509)
References:
- Setting up Principal Propagation: https://community.sap.com/t5/technology-blog-posts-by-sap/setting-up-principal-propagation/ba-p/13510251
- Configuring Principal Propagation: https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/configuring-principal-propagation
- Troubleshooting principal propagation over HTTPS: https://help.sap.com/docs/SUPPORT_CONTENT/appservices/3361376259.html
```

STEP: 10 — Known issues, resources, and links
DESCRIPTION: Quick pointers and links for common errors (401/403/404 on catalogs, ICF nodes, response headers).
LANGUAGE: Text
CODE:
```text
Common problems and references:
- OData V4 catalog not available -> check /IWFND/CONFIG published, ICF nodes, authorizations.
- Useful SAP notes and docs:
  - OData V4 Service Catalog tutorial and docs (community & help.sap.com)
  - 2954378, 2928752, 2489898, 3378435 (SAP notes referenced for specific errors)
- Additional resources:
  - Whitelisting SAP BTP IP ranges: help.sap.com (Business Application Studio availability)
  - Understanding SAP BTP Destinations: learning.sap.com
  - Create SAP BTP Destinations tutorial: developers.sap.com
  - Cloud Connector installation/configuration blog: https://blogs.sap.com/2021/09/05/installation-and-configuration-of-sap-cloud-connector
  - Consuming SAPUI5 libraries from On‑Premise: ./ui5-onpremise.md
```

STEP: 11 — Flow diagram (sequence of components)
DESCRIPTION: Visual sequence of developer -> BTP App -> Destination Service -> Connectivity Service (Cloud Connector) -> Backend. Use Mermaid if supported by renderer.
LANGUAGE: mermaid
CODE:
```mermaid
sequenceDiagram
   participant Developer as Developer (SAP Business Application Studio)
   participant BTPApp as SAP BTP Application (Runtime)
   participant DestinationService as SAP BTP Destination Service
   participant ConnectivityService as SAP BTP Connectivity Service (Cloud Connector)
   participant BackendSystem as Back-End System (SAP S/4HANA or External API)

   Developer->>BTPApp: 1. Develops & Deploys App
   BTPApp->>DestinationService: 2. Requests Destination 'MyBackend'
   DestinationService->>BTPApp: 3. Provides Destination Config

   alt On-Premise (Cloud Connector)
      BTPApp->>ConnectivityService: 4. Uses secure tunnel
      ConnectivityService-->>BackendSystem: 5. Routes request to On-Premise System
   else Cloud/External
      BTPApp->>BackendSystem: 4b. Direct HTTP/API Call
   end

   BackendSystem-->>BTPApp: 6. Responds with Data
```

STEP: 12 — License and repository references
DESCRIPTION: Licensing and repo pointer for the sample project.
LANGUAGE: Text
CODE:
```text
License: Apache License 2.0
See: ../../LICENSES/Apache-2.0.txt
Repository paths referenced in docs:
- ../destinations/README.md
- ./cloudconnector (destination example folder)
- ./README.md#enable-cloud-connector-trace-logging
- ./ui5-onpremise.md
```
--------------------------------

**TITLE**: Expose SAPUI5 Library from an On-Premise System via ui5.yaml and BTP Destination

**INTRODUCTION**: Configure your UI5 toolchain to consume an SAPUI5 library hosted on an On-Premise system reachable via SAP Cloud Connector. This is required when the desired SAPUI5 version is not available on the public SAPUI5 CDN. Steps show duplicating a BTP destination, validating access, and updating ui5.yaml so /resources uses the On-Premise UI5 while /test-resources uses the CDN.

**TAGS**: fiori-samples, SAPUI5, ui5-tooling, ui5.yaml, OnPremise, CloudConnector, SAP BTP, destination

**STEP**: 1 — Prerequisites and checks

**DESCRIPTION**: Verify prerequisites before changing configuration:
- On-Premise SAPUI5 library is accessible.
- Cloud Connector maps the On-Premise system to your dev environment (e.g., Business Application Studio).
- The desired SAPUI5 version is not available on https://ui5.sap.com (404 example: https://ui5.sap.com/1.71.53).
- Confirm valid SAPUI5 versions at: https://ui5.sap.com/versionoverview.html

**LANGUAGE**: text

**CODE**:
```text
Prerequisites:
- On-Premise SAPUI5 library reachable via Cloud Connector.
- SAP BTP destination configured and reachable from development environment.
- Confirm CDN doesn't host desired UI5 version (use versionoverview).
```

**STEP**: 2 — Existing BTP destination (On-Premise) — example JSON

**DESCRIPTION**: Example of the original SAP BTP destination that points to your On-Premise system via Cloud Connector. Keep this destination for backend/OData usage (name: MyDestination).

**LANGUAGE**: JSON

**CODE**:
```json
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

**STEP**: 3 — Example ui5.yaml (current setup using UI5 CDN + destination)

**DESCRIPTION**: Current ui5.yaml for a UI5 HTML5 application that uses the UI5 CDN and proxies backend calls to MyDestination. This is the file you will modify to point /resources to the On-Premise UI5 endpoint.

**LANGUAGE**: YAML

**CODE**:
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

**STEP**: 4 — Duplicate the BTP destination to expose UI5 (create MyDestination_ui5)

**DESCRIPTION**: Duplicate your BTP destination and change the URL to the On-Premise UI5 public path. This destination will solely serve static UI5 resources (no WebIDEUsage required).

- Required path on On-Premise: /sap/public/bc/ui5_ui5/1/ (confirm with system admin; may differ).

**LANGUAGE**: JSON

**CODE**:
```json
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

**STEP**: 5 — Validate the duplicated destination (curl)

**DESCRIPTION**: From Business Application Studio (or environment that can reach the destination host), validate the duplicated destination resolves to the SAPUI5 library by fetching sap-ui-core.js via the BTP destination host.

- Replace mydestination_ui5.dest with the destination host name created by BTP (e.g., mydestination_ui5.dest).

**LANGUAGE**: bash

**CODE**:
```bash
curl -L 'https://mydestination_ui5.dest/resources/sap-ui-core.js' -X GET -i -H 'X-Csrf-Token: fetch' > output-tsk1.txt
# Inspect output-tsk1.txt to ensure the response contains the SAPUI5 library content.
```

**STEP**: 6 — Update ui5.yaml: map /resources to On-Premise destination and /test-resources to CDN

**DESCRIPTION**: Modify ui5.yaml ui5.paths so that:
- /resources is served from the On-Premise destination host (MyDestination_ui5).
- /test-resources continues to be served from the SAPUI5 CDN (use the closest valid UI5 version).

Set ui5.version to an empty string to avoid rewriting UI5 paths with a version prefix.

Minimal snippet to add/change in ui5.yaml:

**LANGUAGE**: YAML

**CODE**:
```yaml
ui5:
  version: ''
  paths:
    - path: /resources
      url: https://mydestination_ui5.dest
    - path: /test-resources
      url: https://ui5.sap.com/<valid-UI5-version>
```

**STEP**: 7 — Full example ui5.yaml (integrated)

**DESCRIPTION**: Example full ui5.yaml file showing the combined configuration: backend destination remains for OData (/sap) while ui5 paths are split between the On-Premise UI5 host and the CDN.

**LANGUAGE**: YAML

**CODE**:
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

**STEP**: 8 — Notes and troubleshooting

**DESCRIPTION**: Important operational notes:
- ui5.version: set to '' so ui5-tooling will not rewrite resource paths to include a version.
- The duplicated BTP destination enables precise control of the UI5 path; it can point to any URI exposing the UI5 library.
- Confirm the On-Premise UI5 path (/sap/public/bc/ui5_ui5/1/) with your system administrator if the content is not found.
- Use ignoreCertError: true only for controlled dev scenarios with self-signed certs.

**LANGUAGE**: text

**CODE**:
```text
Troubleshooting checklist:
- Validate destination connectivity via curl.
- Confirm the destination host (mydestination_ui5.dest) maps correctly in BTP.
- Ensure /resources points to the destination host; /test-resources points to a valid CDN UI5 version.
- Avoid using empty or incorrect ui5.version values unless intended.
```

**STEP**: 9 — License

**DESCRIPTION**: License reference for the document and project.

**LANGUAGE**: text

**CODE**:
```text
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0.
See: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Defining Proxy Settings for SAP Fiori Tools

**INTRODUCTION**: Configure proxy settings for SAP Fiori tools to allow local development and deployment to reach external backends through corporate proxies. Includes ui5.yaml proxy config, environment variable setup for macOS/Linux and Windows PowerShell, TLS/credential handling, and verification commands.

**TAGS**: fiori, proxy, ui5, sap, environment-variables, bash, powershell, deployment, axios-extension

**STEP**: 1 — Prerequisites
**DESCRIPTION**: Confirm permissions and proxy requirements with your IT admin. Use HTTP format for proxy URLs unless instructed otherwise. Ensure you can modify environment variables on the machine or CI environment used for development/deployment.
**LANGUAGE**: PlainText
**CODE**:
```text
- Ensure permission to modify environment variables.
- Confirm if proxy is required for your network.
- Default proxy URL scheme: http:// (use https:// only if explicitly required).
```

**STEP**: 2 — Configure proxy in ui5.yaml (local dev server)
**DESCRIPTION**: Add a proxy middleware entry to your project ui5.yaml to route specific paths to backend services through a proxy. Place ui5.yaml in the project root.
**LANGUAGE**: YAML
**CODE**:
```yaml
specVersion: '2.1'
type: application
# add or modify middleware section in ui5.yaml
middleware:
  - name: fiori-tools-proxy
    afterMiddleware: compression
    configuration:
      proxy: http://myproxy.com:8443
      backend:
        - path: /sap
          url: https://my.backend.com:1234
# If proxy requires credentials, use: http://user:password@proxyserver:port
```
Reference: @sap/ux-ui5-tooling proxy configuration

**STEP**: 3 — Set environment variables (macOS / Linux) — session-only
**DESCRIPTION**: Export proxy variables for the current shell session. Use URL-encoded credentials if password has special characters.
**LANGUAGE**: Bash
**CODE**:
```bash
# Session-only (current terminal)
export HTTP_PROXY=http://user:password@proxyserver:port
export HTTPS_PROXY=http://user:password@proxyserver:port
export NO_PROXY=localhost,127.0.0.1,internal.domain,.local

# Example with URL-encoded password (p@s#w0rd -> p%40s%23w0rd)
export HTTPS_PROXY=http://myusername:p%40s%23w0rd@proxy.domain.com:3128
```

**STEP**: 4 — Persist environment variables (macOS / Linux)
**DESCRIPTION**: Append exports to your shell profile so variables persist across sessions. Reload the profile after editing.
**LANGUAGE**: Bash
**CODE**:
```bash
# Append to ~/.bashrc (use ~/.zshrc for zsh, etc.)
echo 'export HTTP_PROXY=http://user:password@proxyserver:port' >> ~/.bashrc
echo 'export HTTPS_PROXY=http://user:password@proxyserver:port' >> ~/.bashrc
echo 'export NO_PROXY=localhost,127.0.0.1,internal.domain,.local' >> ~/.bashrc

# Reload profile
source ~/.bashrc
```

**STEP**: 5 — Set environment variables (Windows PowerShell) — session-only
**DESCRIPTION**: Set proxy variables for the current PowerShell session.
**LANGUAGE**: PowerShell
**CODE**:
```powershell
# Session-only
$env:HTTP_PROXY  = "http://user:password@proxyserver:port"
$env:HTTPS_PROXY = "http://user:password@proxyserver:port"
$env:NO_PROXY    = "localhost,127.0.0.1,internal.domain,.local"
```

**STEP**: 6 — Persist environment variables (Windows PowerShell) — user or machine
**DESCRIPTION**: Persist environment variables for the current user or system-wide (requires admin privileges for Machine scope).
**LANGUAGE**: PowerShell
**CODE**:
```powershell
# Persist for current user
[Environment]::SetEnvironmentVariable("HTTP_PROXY",  "http://user:password@proxyserver:port", "User")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", "http://user:password@proxyserver:port", "User")
[Environment]::SetEnvironmentVariable("NO_PROXY",   "localhost,127.0.0.1,internal.domain,.local", "User")

# Persist machine-wide (requires admin)
[Environment]::SetEnvironmentVariable("HTTP_PROXY",  "http://user:password@proxyserver:port", "Machine")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", "http://user:password@proxyserver:port", "Machine")
[Environment]::SetEnvironmentVariable("NO_PROXY",   "localhost,127.0.0.1,internal.domain,.local", "Machine")
```

**STEP**: 7 — Lowercase/uppercase variations and client support
**DESCRIPTION**: Many tools accept either uppercase or lowercase names. Set both if unsure. Some clients accept HTTPS_PROXY with http:// or https:// scheme — follow your IT guidance.
**LANGUAGE**: Bash / PowerShell
**CODE**:
```bash
# Alternative lowercase examples (bash)
export http_proxy=http://user:password@proxyserver:port
export https_proxy=http://user:password@proxyserver:port
export no_proxy=localhost,127.0.0.1,internal.domain,.local
```

**STEP**: 8 — TLS support / deployment notes (Axios extension)
**DESCRIPTION**: For TLS-enabled proxying and deployment, set HTTPS_PROXY. Include credentials in URL if needed and URL-encode special characters. If using an older @sap/ux-ui5-tooling release (< latest), enable the patch proxy feature with TOOLSUITE_FEATURES.
**LANGUAGE**: Bash
**CODE**:
```bash
# Enable TLS proxy
export HTTPS_PROXY=http://user:password@proxy.domain.com:3128

# URL-encode special characters in password (example)
# plaintext: p@s#w0rd -> p%40s%23w0rd
export HTTPS_PROXY=http://myusername:p%40s%23w0rd@proxy.domain.com:3128

# Older tooling versions may require:
export TOOLSUITE_FEATURES=sap.ux.enablePatchProxy
```
Reference: SAP Axios Extension proxy support, @sap/ux-ui5-tooling release notes

**STEP**: 9 — Verify environment variables
**DESCRIPTION**: Confirm variables are set in your shell or PowerShell session before running tooling or deployment pipelines.
**LANGUAGE**: Bash / PowerShell
**CODE**:
```bash
# macOS / Linux
echo $HTTP_PROXY
echo $HTTPS_PROXY
echo $NO_PROXY
```
```powershell
# Windows PowerShell
$env:HTTP_PROXY
$env:HTTPS_PROXY
$env:NO_PROXY
```

**STEP**: 10 — Additional references and license
**DESCRIPTION**: Useful links and license file path in the repository.
**LANGUAGE**: PlainText
**CODE**:
```text
References:
- @sap/ux-ui5-tooling proxy config: https://www.npmjs.com/package/@sap/ux-ui5-tooling#providing-proxy-configuration
- SAP Axios Extension (proxy support): https://github.com/SAP/open-ux-tools/tree/main/packages/axios-extension#proxy-support
- URL Encode/Decode tool: https://www.url-encode-decode.com/

Repository license file:
- ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Create and Validate SAMLAssertion Destination for SAP S/4HANA Cloud Public Tenant

**INTRODUCTION**: This guide shows how to create a SAP BTP destination using SAMLAssertion to connect to an SAP S/4HANA Cloud Public tenant (V2 and V4 OData catalogs), validate the connection from SAP Business Application Studio, configure NameID mapping, enforce required roles, and troubleshoot common connectivity and deployment errors.

**TAGS**: SAP S/4HANA Cloud, SAP BTP, SAMLAssertion, destination, OData, SAP Business Application Studio, troubleshooting, authorization

**STEP**: 1 — Prerequisites
**DESCRIPTION**: Verify environment and access before creating the destination.
**LANGUAGE**: text
**CODE**:
```text
Prerequisites:
1. Complete steps 1-3 from: https://developers.sap.com/tutorials/abap-custom-ui-bas-connect-s4hc.html
2. Administrative access to your SAP S/4HANA Cloud (S4HC) tenant for configuring/checking Communication Systems and Traces.
3. Subscribed to SAP Business Application Studio (BAS).
4. Reviewed SAP S/4HANA Cloud, Public Edition FAQ and integration docs:
   - https://me.sap.com/notes/3445942
   - https://me.sap.com/notes/3297481
5. Ensure IdP (IAS/other) is configured if using email NameID mapping.
```

**STEP**: 2 — Create/Prepare s4hana-cloud_saml destination file
**DESCRIPTION**: Edit the s4hana-cloud_saml destination file: replace hostname placeholder with your tenant host, set authentication to SAMLAssertion, and configure NameID format and other properties. Import the destination into your SAP BTP subaccount > Connectivity > Destinations > Import Destination.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "Name": "S4HC_SAMLAssertion",
  "Type": "HTTP",
  "Description": "SAMLAssertion destination to S/4HANA Cloud (replace <HOSTNAME>)",
  "URL": "https://<HOSTNAME>.s4hana.ondemand.com",
  "ProxyType": "Internet",
  "Authentication": "SAMLAssertion",
  "TokenServiceURL": "",
  "TokenServiceURLType": "None",
  "ForwardAuthToken": "true",
  "TrustAll": "false",
  "Properties": {
    "nameIdFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    "subjectConfirmationMethod": "urn:oasis:names:tc:SAML:2.0:cm:bearer"
  }
}
```
**DESCRIPTION**: Replace <HOSTNAME> (e.g., my1111111) across the file: do NOT change the NameID version (1.1) unless required by provider. Import via SAP BTP UI: Destinations > Import Destination.

**STEP**: 3 — Example partial-URL destination (for support or specific service calls)
**DESCRIPTION**: For support users or to restrict a destination to a catalog path, clone existing destination and use "Partial URL" type; set Service URL to the catalog base path.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "Name": "S4HC_SAML_Compact_Catalog",
  "Type": "HTTP",
  "Description": "Partial URL destination for V2 catalog",
  "URL": "https://<HOSTNAME>.s4hana.ondemand.com",
  "ServiceURL": "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection",
  "ProxyType": "Internet",
  "Authentication": "SAMLAssertion"
}
```

**STEP**: 4 — Validate destination from SAP Business Application Studio
**DESCRIPTION**: In BAS, consume the destination to confirm connectivity. You can test by calling the V2 or V4 catalog endpoints (replace <HOSTNAME> and include required Auth/headers according to your setup).
**LANGUAGE**: Bash
**CODE**:
```bash
# Example direct check (replace placeholders)
# V2 Catalog (ServiceCollection)
curl -i "https://<HOSTNAME>.s4hana.ondemand.com/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection"

# V4 Catalog (ServiceGroups expanded to include Services)
curl -i "https://<HOSTNAME>.s4hana.ondemand.com/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)"
```
**DESCRIPTION**: If using BAS and BTP destination proxy, use BAS tooling to reference the imported destination. If requests fail, continue to debugging steps.

**STEP**: 5 — NameID mapping and best practices
**DESCRIPTION**: Configure nameIdFormat in your destination to control how the SAML Assertion NameID is interpreted by S4HC. Recommended default is emailAddress. Ensure IdP email exactly matches S4HC user email (case-sensitive recommended).
**LANGUAGE**: JSON
**CODE**:
```json
"nameIdFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
# Alternative to map usernames:
# "nameIdFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified"
```
**DESCRIPTION**: Notes:
- Keep version 1.1 unless service providers require 2.0.
- NameID values are treated as opaque by SAML spec; service providers determine matching behavior — prefer exact match.

**STEP**: 6 — Required authorizations and business roles
**DESCRIPTION**: Assign roles to user accounts so they can browse OData, preview, and deploy SAPUI5 apps. Use "Maintain Business Users" app in S4HC UI to assign roles and ensure business catalogs are present.
**LANGUAGE**: text
**CODE**:
```text
Required catalogs and example roles:
- To access OData Services:
  * Business Catalog: SAP_CORE_BC_EXT_TST
  * Business Role Template: SAP_BR_EXTENSIBILITY_SPEC

- To deploy applications:
  * Business Catalog: SAP_CORE_BC_EXT_UI (for Key User tenant)
  * Developer Catalog: SAP_A4C_BC_DEV_UID_PC (for Developer tenant)
  * Business Role Template: SAP_BR_DEVELOPER

Notes:
- Business roles may be custom named (e.g., Z_BR_DEVELOPER) but must include the catalogs shown above.
- Add roles via "Maintain Business Users" > Select User > Assigned Business Roles > Add.
```

**STEP**: 7 — Tenant types and destination host difference
**DESCRIPTION**: Use the correct destination host for your tenant type:
- Developer Extensibility (client 080): used for ABAP development tools and ABAP for Cloud Development.
- Key User Extensibility/Customizing (client 100): used for configuration/customizing and low-code key-user apps.
Follow SAP docs to generate the appropriate BTP destination for each tenant type (links preserved below).
**LANGUAGE**: text
**CODE**:
```text
Reference steps:
- Developer Extensibility destination guide:
  https://help.sap.com/docs/SAP_S4HANA_CLOUD/.../0af2819bbe064a3da455753c8518dd81.html
- Key User Extensibility destination guide:
  https://help.sap.com/docs/SAP_S4HANA_CLOUD/.../31876c06f99645f289d802f9c95fb62b.html
```

**STEP**: 8 — Debugging: Authorization trace (Display Authorization Trace)
**DESCRIPTION**: If requests are rejected due to authorization, run the authorization trace in S4HC as Administrator and filter for failed requests and the target user.
**LANGUAGE**: text
**CODE**:
```text
Steps:
1. Open "Display Authorization Trace" in S4HC.
2. Filter: Status = Failed
3. Filter: Users = <target_user> (select from list)
4. Inspect trace lines to identify missing permissions or role-related failures.

Help: https://help.sap.com/docs/SAP_S4HANA_CLOUD/.../ebb91d3758c441b18bf9ebd0798d424e.html
```

**STEP**: 9 — Debugging: Connectivity trace (Display Connectivity Trace) for V2 and V4 catalog calls
**DESCRIPTION**: Use "Display Connectivity Trace" in S4HC to inspect failed requests. Create traces filtered by Request Method and Path Prefix to capture V2/V4 catalog calls.
**LANGUAGE**: text
**CODE**:
```text
Trace configuration examples:
- V2 Catalog:
  Request Method: GET
  Path Prefix: /sap/opu/odata/IWFND/CATALOGSERVICE

- V4 Catalog:
  Request Method: GET
  Path Prefix: /sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/

After saving the trace, reproduce the failing request and inspect results in the trace table.
Reference: https://help.sap.com/docs/SAP_S4HANA_CLOUD/.../a4f6ccd072f147f299b1d856062c8dc8.html
```

**STEP**: 10 — Common deployment and connectivity errors (examples and resolutions)
**DESCRIPTION**: Keep these exact logs for automated detection and remediation suggestions.
**LANGUAGE**: Bash
**CODE**:
```bash
# Issue 1: Not permitted Gateway OData V2 service (ABAP language mismatch)
error abap-deploy-task YY1_Some_Service The use of Gateway OData V2 Service Z_MY_SERVICE 0001 is not permitted.

# Resolution: Confirm ABAP Language Version:
# - App built with "ABAP for Cloud Development" cannot deploy to "ABAP for Key Users" tenant.
# - Use correct tenant type or adjust ABAP language version.

# Issue 2: Deployment fails with HTTP 403 (forbidden)
info abap-deploy-task YY1_Some_App Creating archive with UI5 build result.
info abap-deploy-task YY1_Some_App Archive created.
info abap-deploy-task YY1_Some_App Starting to deploy.
info abap-deploy-task YY1_Some_App YY1_Some_Service found on target system: false
error abap-deploy-task YY1_Some_App Request failed with status code 403

# Typical causes:
# 1) SAP BTP destination not configured with Authentication = SAMLAssertion
# 2) User missing deployment roles (SAP_CORE_BC_EXT_UI or SAP_A4C_BC_DEV_UID_PC)

# Issue 3: Deployment fails with HTTP 400 (not permitted services)
error The app uses not permitted services for ABAP for Cloud Development
error abap-deploy-task ZF_TEST_API Request failed with status code 400
error abap-deploy-task ZF_TEST_API The use of Gateway OData V2 Service API_PROC_ORDER_CONFIRMATION_2_SRV 0001 is not permitted

# Resolution: Check tenant type allowed services and OData service whitelist per tenant. Review Tenant Types documentation.

# Issue 4: Catalog responses missing specific OData services
# V2 Catalog endpoint
/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection
# V4 Catalog endpoint
/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)

# Possible causes:
# - User lacks required authorizations (see Authorization Requirements)
# - Service not available/activated for this tenant type

# Issue 8: All HTTP API requests from BAS to S4HC fail
# Two scenarios:

# A) Requests reach S4HC (traces active) but fail:
# - Ensure Communication System for SAP Business Application Studio is active.
# - Ensure user has SAP_BR_DEVELOPER role to consume OData services.

# B) Requests do NOT reach S4HC:
# - Check nameIdFormat mapping and ensure IdP email matches S4HC email.
# - If clone of destination resolves issue, original BTP destination may be corrupted.
```

**STEP**: 11 — Support communication user and partial URL strategy
**DESCRIPTION**: When opening access for SAP Support, create/clone a destination and make it a partial URL destination pointing to the specific catalog path. Ensure the support communication user has required roles if they need to view OData catalogs.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "Name": "S4HC_Support_Partial",
  "Type": "HTTP",
  "URL": "https://<HOSTNAME>.s4hana.ondemand.com",
  "ServiceURL": "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection",
  "Authentication": "SAMLAssertion",
  "ProxyType": "Internet"
}
```

**STEP**: 12 — Useful OData catalog endpoints (quick reference)
**DESCRIPTION**: Use these endpoints when testing or building calls to S4HC OData catalogs.
**LANGUAGE**: text
**CODE**:
```text
V2 Catalog (list of services):
/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection

V4 Catalog (service groups expanded with services):
/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)
```

**STEP**: 13 — Related links and references (for integration and trust)
**DESCRIPTION**: Primary reference links to follow for destination creation, trust configuration, and development guides.
**LANGUAGE**: text
**CODE**:
```text
- Create a Destination to Connect to SAP Business Application Studio:
  https://help.sap.com/docs/SAP_S4HANA_CLOUD/.../31876c06f99645f289d802f9c95fb62b.html

- Integrating SAP Business Application Studio:
  https://help.sap.com/docs/SAP_S4HANA_CLOUD/.../22bc724fd51a4aa4a4d1c5854db7e026.html

- Develop a Custom UI for an SAP S/4HANA Cloud System:
  https://developers.sap.com/tutorials/abap-custom-ui-bas-develop-s4hc.html

- Set Up Trust Between SAP Cloud Identity Services and SAP BTP:
  https://developers.sap.com/tutorials/abap-custom-ui-trust-cf.html

- Exposing an OData Service from SAP S/4HANA Cloud Public Edition:
  https://community.sap.com/t5/technology-blog-posts-by-sap/exposing-an-odata-service-from-sap-s-4hana-cloud-public-edition-to-the-sap/ba-p/13628248
```

**STEP**: 14 — License
**DESCRIPTION**: Project license note.
**LANGUAGE**: text
**CODE**:
```text
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
Licensed under the Apache License, Version 2.0 (see ../../LICENSES/Apache-2.0.txt)
```
--------------------------------

**TITLE**: Handling Self-Signed SSL Certificates for SAP Fiori Tools (Node.js / UI5 / VSCode / ABAP)

**INTRODUCTION**: Step-by-step, code-focused instructions to export, install, and configure self-signed or private CA certificates so SAP Fiori Tools, Node.js, UI5 Tooling, VSCode and ABAP deployment accept TLS connections. Includes safe configuration using NODE_EXTRA_CA_CERTS, ui5.yaml/ui5-deploy.yaml overrides, and temporary bypass options (strongly discouraged for production).

**TAGS**: fiori, sap, ssl, certificates, nodejs, ui5, vscode, abap, security

**STEP**: 1 - Problem summary and prechecks

**DESCRIPTION**: Understand when certificate errors occur and verify certificate SAN. If you connect by IP, the certificate must list the IP in the Subject Alternative Name (SAN). If certs are expired/invalid (wrong host, expired, broken chain), contact your admin — these cannot be fixed by local trust changes. Avoid bypassing validation in production.

**LANGUAGE**: text

**CODE**:
```text
- Certificate must include DNS or IP in SAN for hostname/IP to match.
- Valid cases to fix locally: private CA or self-signed CA not trusted by OS/Node.
- Invalid cert cases (do NOT bypass): expired, wrong host, broken signature verification.
- Recommended fix: import CA into OS trust store and set NODE_EXTRA_CA_CERTS for Node.js.
```

**STEP**: 2 - Export CA certificate from browser

**DESCRIPTION**: Export the server/CA certificate as .pem/.crt/.cer using Edge/Chrome/Firefox. Use this file when importing into OS trust store and NODE_EXTRA_CA_CERTS.

**LANGUAGE**: text

**CODE**:
```text
Chrome/Edge:
1. Open site https://your-host
2. Click padlock -> Certificate (Invalid) -> Details -> Copy to File -> Export as PEM (.pem)

Firefox:
1. Open site -> padlock -> Connection Not Secure -> More Information -> View Certificate
2. Details -> Export -> Save as .crt or .cer
```

**STEP**: 3 - Install certificate into OS trust store (required for VSCode & browsers)

**DESCRIPTION**: Import the exported CA certificate into the OS trust store so VSCode and browsers accept the certificate. This is preferred over disabling validation.

**LANGUAGE**: text

**CODE**:
```text
Windows:
- Right-click the exported CA file -> Install Certificate -> Choose Local Machine or Current User -> Place in Trusted Root Certification Authorities -> Complete wizard.

macOS:
- Right-click the certificate file -> Open With -> Keychain Access
- Select "System" keychain -> Import -> Find certificate -> Add
- Open Keychain Access -> Locate cert -> double-click -> Trust -> Always Trust (if needed)
```

**STEP**: 4 - Configure Node.js to trust the CA (NODE_EXTRA_CA_CERTS)

**DESCRIPTION**: Point Node.js to the CA file using NODE_EXTRA_CA_CERTS. This allows Node-based tooling (UI5 tooling, Fiori generator, npm scripts) to validate TLS using your CA without disabling verification.

**LANGUAGE**: powershell

**CODE**:
```powershell
# Windows PowerShell - set for current session
$env:NODE_EXTRA_CA_CERTS = "C:\path\to\your\certificate.crt"

# Verify
$env:NODE_EXTRA_CA_CERTS

# Example - run a Node script with env var set for just this execution
$env:NODE_EXTRA_CA_CERTS = "C:\path\to\your\certificate.crt"; node .\index.js
```

**LANGUAGE**: bash

**CODE**:
```bash
# macOS / Linux - set for current session
export NODE_EXTRA_CA_CERTS=/path/to/your/certificate.crt

# Verify
echo $NODE_EXTRA_CA_CERTS

# Example - run Node with env var set for single command
NODE_EXTRA_CA_CERTS=/path/to/your/certificate.crt node index.js
```

**STEP**: 5 - Temporary global bypass (NOT RECOMMENDED) - NODE_TLS_REJECT_UNAUTHORIZED

**DESCRIPTION**: For short-lived development debugging only. Setting NODE_TLS_REJECT_UNAUTHORIZED=0 disables TLS validation for Node.js globally — high security risk. Prefer NODE_EXTRA_CA_CERTS or OS trust store.

**LANGUAGE**: bash

**CODE**:
```bash
# Temporary for current session (macOS/Linux)
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Run a Node command with it set only for that execution
NODE_TLS_REJECT_UNAUTHORIZED=0 node index.js

# WARNING: This disables certificate validation for all Node.js HTTPS requests.
```

**LANGUAGE**: powershell

**CODE**:
```powershell
# Temporary for current session (Windows PowerShell)
$env:NODE_TLS_REJECT_UNAUTHORIZED = '0'
# Run Node
node .\index.js
# Reset (close session or set to '1')
$env:NODE_TLS_REJECT_UNAUTHORIZED = '1'
```

**STEP**: 6 - Persist NODE_TLS_REJECT_UNAUTHORIZED (if you must) - Windows

**DESCRIPTION**: Set environment variable permanently (not recommended). Requires admin for Machine scope. Logout/login or reboot required.

**LANGUAGE**: powershell

**CODE**:
```powershell
# System-wide (requires admin)
[Environment]::SetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED", "0", "Machine")

# Current user permanently
[Environment]::SetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED", "0", "User")
```

**STEP**: 7 - Persist NODE_TLS_REJECT_UNAUTHORIZED (if you must) - macOS / Linux

**DESCRIPTION**: Append to shell startup or /etc/environment for persistence. Requires root for system-wide changes.

**LANGUAGE**: bash

**CODE**:
```bash
# System-wide (requires sudo)
sudo sh -c 'echo "NODE_TLS_REJECT_UNAUTHORIZED=0" >> /etc/environment'

# Per-user (Bash)
echo 'export NODE_TLS_REJECT_UNAUTHORIZED=0' >> ~/.bashrc
source ~/.bashrc

# Per-user (Zsh)
echo 'export NODE_TLS_REJECT_UNAUTHORIZED=0' >> ~/.zshrc
source ~/.zshrc
```

**STEP**: 8 - Add ignoreCertError in ui5.yaml for local preview (development only)

**DESCRIPTION**: Configure the fiori-tools proxy middleware to ignore backend certificate errors during local preview. Keep ignoreCertError: false when possible.

**LANGUAGE**: yaml

**CODE**:
```yaml
# ui5.yaml
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
        ignoreCertError: false # set true only for local dev when absolutely necessary
        ui5:
          path:
            - /resources
            - /test-resources
          url: https://ui5.sap.com
        backend:
          - path: /here
            url: https://your-backend-host:443
```

**STEP**: 9 - Add ignoreCertError in ui5-deploy.yaml for ABAP deploy (development only)

**DESCRIPTION**: For SAP ABAP deployments via UI5 tooling, this sets ignoreCertError for the deploy-to-abap task. Use with caution.

**LANGUAGE**: yaml

**CODE**:
```yaml
# ui5-deploy.yaml
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
        ignoreCertError: true # only for development/testing
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

**STEP**: 10 - Quick troubleshooting checks

**DESCRIPTION**: Commands and checks to validate your environment variables and access.

**LANGUAGE**: powershell

**CODE**:
```powershell
# Windows - check NODE_EXTRA_CA_CERTS and TLS var
$env:NODE_EXTRA_CA_CERTS
$env:NODE_TLS_REJECT_UNAUTHORIZED

# Run UI5 tooling (PowerShell) with NODE_EXTRA_CA_CERTS in same session
$env:NODE_EXTRA_CA_CERTS = "C:\path\to\cert.crt"; ui5 serve
```

**LANGUAGE**: bash

**CODE**:
```bash
# macOS/Linux - check env vars
echo $NODE_EXTRA_CA_CERTS
echo $NODE_TLS_REJECT_UNAUTHORIZED

# Example run
NODE_EXTRA_CA_CERTS=/path/to/cert.crt ui5 serve
```

**STEP**: 11 - References and license

**DESCRIPTION**: Links and license details.

**LANGUAGE**: text

**CODE**:
```text
References:
- SAP Fiori Tools docs: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/4b318bede7eb4021a8be385c46c74045.html
- SAP Community: https://community.sap.com/topics/fiori-tools
- Node.js NODE_EXTRA_CA_CERTS docs: https://nodejs.org/api/cli.html#node_extra_ca_certsfile

License:
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company. Licensed under Apache-2.0. See ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Migrate Neo UI Application to Cloud Foundry using a Managed Approuter

**INTRODUCTION**: Step-by-step, code-focused instructions to migrate a Neo-exported UI application (mtar/zip) into a Fiori UI project, transform neo-app.json to xs-app.json, configure security (xs-security.json), build an MTA, and deploy to Cloud Foundry using a managed approuter. Suitable for use in Business Application Studio / VS Code with Fiori tools.

**TAGS**: fiori, neo, cloud-foundry, migration, approuter, xs-app, xs-security, ui5, BAS, MTA

STEP: 1 — Unpack exported Neo archive
DESCRIPTION: Unzip your exported Neo mtar (or zip). If the mtar contains nested zips (e.g., HTML5 app zip), unzip them into a working Fiori UI folder.
LANGUAGE: Bash
CODE:
```bash
# Unzip exported mtar into a workspace
unzip /home/user/projects/neo/solution.mtar -d /home/user/projects/neo/

# Create target Fiori UI folder
mkdir -p /home/user/projects/fioriapp

# Unzip the Neo UI application into the Fiori UI folder (example filename)
unzip /home/user/projects/neo/manageproductsneo.zip -d /home/user/projects/fioriapp/
```

STEP: 2 — Run Fiori tools migration (BAS/VS Code)
DESCRIPTION: Use Fiori tools to migrate the project for Fiori tooling compatibility. This updates project metadata and surfaces any migration issues.
LANGUAGE: CLI / UI
CODE:
```text
# In BAS or VS Code:
# View -> Command Palette -> "Fiori: Migrate Project for use in Fiori tools"
# - Select the project (/home/user/projects/fioriapp)
# - Ensure SAPUI5 preview version is appropriate
# - Start migration
# Review the Migration Results and Application Information pages for issues and commands
```

STEP: 3 — Transform neo-app.json to xs-app.json
DESCRIPTION: Generate xs-app.json from neo-app.json. If xs-app.json is overwritten or deleted later, re-run this step using neo-app.json as the source.
LANGUAGE: CLI / UI
CODE:
```text
# In BAS/VS Code:
# View -> Command Palette -> "Neo Migration: HTML 5 Application descriptor transformation"
# - Select 'neo-app.json' in /home/user/projects/fioriapp
# Result: a new xs-app.json is created with routes populated from neo-app.json
```

STEP: 4 — Change to the UI application root
DESCRIPTION: Move into the prepared Fiori UI application folder before running deployment/config commands.
LANGUAGE: Bash
CODE:
```bash
cd /home/user/projects/fioriapp
```

STEP: 5 — Run deploy-config for Cloud Foundry and add to managed approuter
DESCRIPTION: Create or update deployment configuration for CF. When prompted, do not select a destination (select "none") because xs-app.json was already created. Choose to add the app to the managed approuter and do NOT overwrite xs-app.json in the prompt if presented.
LANGUAGE: CLI / UI
CODE:
```text
# In BAS/VS Code:
# View -> Command Palette -> "npm run deploy-config cf"
# Prompts:
# - Destination: select 'none'
# - Add application to managed application router: Yes
# - Overwrite xs-app.json: No
# After completion, review generated/updated files: ui5.yaml, ui5-deploy.yaml
```

STEP: 6 — Start local preview and verify
DESCRIPTION: Start the local preview to verify UI runs locally (BAS preview).
LANGUAGE: Bash
CODE:
```bash
# Start local preview
npm run start
# Open the local preview URL shown by the task to verify UI renders correctly
```

STEP: 7 — Build MTA archive for Cloud Foundry
DESCRIPTION: Build the MTA (Multi-Target Application) archive that will be deployed to CF.
LANGUAGE: Bash
CODE:
```bash
# Build the MTA archive
npm run build:mta
# The build will produce an MTA archive (e.g., mta_archives/*.mtar) in the project root
```

STEP: 8 — Update xs-security.json (add scopes, role-templates, role-collections)
DESCRIPTION: The generated xs-security.json will typically be empty for scopes/roles. Append the provided scopes, role-templates, and role-collections to enable subaccount-managed security. Replace $XSAPPNAME as appropriate.
LANGUAGE: JSON
CODE:
```json
{
  "scopes": [
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
}
```

STEP: 9 — Protect routes in xs-app.json with scopes
DESCRIPTION: For routes that require role-based access, add or update the "scope" attribute to point to the scope defined in xs-security.json.
LANGUAGE: JSON
CODE:
```json
{
  "source": "^/northwind/(.*)$",
  "target": "$1",
  "destination": "northwind",
  "csrfProtection": false,
  "scope": "$XSAPPNAME.migratedroleapp"
}
```

STEP: 10 — Deploy MTA to Cloud Foundry
DESCRIPTION: Deploy the generated MTA archive to CF using the provided npm task. After deployment, verify HTML5 application registration and route.
LANGUAGE: Bash
CODE:
```bash
# Deploy the generated MTA archive to CF
npm run deploy

# To retrieve the URL of the deployed app (run from project root terminal):
cf html5-list -u -di ns-manageproductsneo-destination-service -u --runtime launchpad

# Alternatively, check SAP BTP cockpit -> Subaccount -> HTML5 Applications for the app URL
```

STEP: 11 — Post-deploy: map user profile to role collections
DESCRIPTION: In the SAP BTP cockpit or via identity provider configuration, ensure your user(s) are assigned the role-collections (e.g., ViewerPUBLIC) created in xs-security.json. Missing mappings will result in HTTP 403 on scoped routes.
LANGUAGE: CLI / UI
CODE:
```text
# Post-deploy actions (in BTP cockpit):
# - Open Subaccount -> Security -> Role Collections
# - Assign 'ViewerPUBLIC' or other created role collections to target users or groups
# - Verify access by opening the deployed app URL
```

STEP: 12 — Undeploy if needed
DESCRIPTION: Run the undeploy npm task to remove the deployed MTA from Cloud Foundry.
LANGUAGE: Bash
CODE:
```bash
# Undeploy the application from Cloud Foundry
npm run undeploy
```

STEP: 13 — Additional notes & troubleshooting
DESCRIPTION: Quick troubleshooting and file review pointers.
LANGUAGE: Text
CODE:
```text
# Review these files if something looks off:
# - ui5.yaml and ui5-deploy.yaml (deployment parameters)
# - xs-app.json (routes and scopes)
# - xs-security.json (scopes/role-templates/role-collections)
# - package.json (available npm scripts: start, build:mta, deploy-config, deploy, undeploy)

# If xs-app.json is accidentally overwritten or deleted:
# - Re-run: View -> Command Palette -> "Neo Migration: HTML 5 Application descriptor transformation"
#   and select neo-app.json to regenerate xs-app.json from the original neo-app.json source.
```
--------------------------------

**TITLE**: Configure MTA with multiple migrated Neo UI applications (Managed Approuter)

**INTRODUCTION**: This guide shows step-by-step commands and actions to create a managed approuter-based MTA project that hosts multiple migrated Neo HTML5 (SAPUI5/Fiori) applications, migrate/descript-transform those apps, configure security, build and deploy the MTA to Cloud Foundry, and retrieve the deployed HTML5 app URL.

**TAGS**: fiori, mta, cf, approuter, migration, neo, sapui5, xs-app.json, xs-security.json, html5

**STEP**: 1 — Generate Managed Approuter (create root managedapp project)
**DESCRIPTION**: From Business Application Studio (View -> Command Palette) run "Open CF Application Router Generator". When prompted:
- Set the router project path to your workspace (example: /home/user/projects)
- Select "Managed Approuter"
- Enter a unique MTA ID (example: managedapp)
This creates a new folder that will be the root of your project.
**LANGUAGE**: none
**CODE**:
```text
(Interactive) Open CF Application Router Generator -> set path /home/user/projects -> select Managed Approuter -> MTA ID: managedapp
```

**STEP**: 2 — Change into the managedapp root folder
**DESCRIPTION**: Switch to the generated managedapp folder (root of your MTA workspace).
**LANGUAGE**: BASH
**CODE**:
```bash
cd /home/user/projects/managedapp/
```

**STEP**: 3 — Unzip exported Neo mtar (if applicable)
**DESCRIPTION**: Extract your exported Neo mtar (or zip) into a workspace folder. Some mtar files contain nested archives that need extraction.
**LANGUAGE**: BASH
**CODE**:
```bash
unzip /home/user/projects/neo/solution.mtar -d /home/user/projects/neo/
```

**STEP**: 4 — Extract individual Neo UI application into managedapp subfolder
**DESCRIPTION**: Unzip the migrated Neo application archive into a subfolder (one migrated app per subfolder under managedapp). Example places the app in managedapp/fioriapp.
**LANGUAGE**: BASH
**CODE**:
```bash
unzip /home/user/projects/neo/manageproductsneo.zip -d /home/user/projects/managedapp/fioriapp
```

**STEP**: 5 — Run Fiori migration to prepare project for Fiori tools
**DESCRIPTION**: Use "Fiori: Migrate Project for use in Fiori tools". Select the extracted project and the appropriate SAPUI5 preview version. Start migration, review the migration results screen and the application information page (it lists commands and details).
**LANGUAGE**: none
**CODE**:
```text
(Interactive) Fiori: Migrate Project for use in Fiori tools -> select project -> choose SAPUI5 preview -> Start migration
```

**STEP**: 6 — Transform neo-app.json -> xs-app.json for Cloud Foundry routing
**DESCRIPTION**: Run "Neo Migration: HTML 5 Application descriptor transformation" and select the neo-app.json from the migrated UI project. This generates an xs-app.json with routes populated from neo-app.json. If xs-app.json is accidentally deleted/overwritten, re-run this step (xs-app.json must be generated from neo-app.json).
**LANGUAGE**: none
**CODE**:
```text
(Interactive) Neo Migration: HTML 5 Application descriptor transformation -> select neo-app.json -> verify xs-app.json created
```

**STEP**: 7 — Prepare the UI application deployment config
**DESCRIPTION**: Change into the Fiori UI app folder, run the deployment config command to produce CF deployment artifacts (ui5.yaml, ui5-deploy.yaml). When prompted: choose destination "none" (if xs-app.json already exists), choose NOT to overwrite xs-app.json. Review ui5.yaml and ui5-deploy.yaml.
**LANGUAGE**: BASH
**CODE**:
```bash
cd /home/user/projects/managedapp/fioriapp
npm run deploy-config cf
# When prompted:
# - destination: none
# - Overwrite xs-app.json: No
# After: review ui5.yaml and ui5-deploy.yaml
```

**STEP**: 8 — Preview and build the UI application locally
**DESCRIPTION**: Start local preview to validate the application(s), then build the project to include the app(s) in the MTA archive.
**LANGUAGE**: BASH
**CODE**:
```bash
npm run start   # preview locally in BAS
npm run build   # build MTA archive with all Fiori UI applications
```

**STEP**: 9 — Update xs-security.json: add scopes, role-templates, and role-collections
**DESCRIPTION**: The generated xs-security.json is empty by default. Append scopes and role templates that are manageable at subaccount level. Replace $XSAPPNAME with your application name in the deployed environment (or keep placeholder for template usage).
**LANGUAGE**: JSON
**CODE**:
```json
{
  "scopes": [
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
}
```

**STEP**: 10 — Apply scope to xs-app.json routes that require auth
**DESCRIPTION**: For routes that must be secured, add the scope property to the route entry in xs-app.json. Update the source/target/destination as required per app route.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "source": "^/northwind/(.*)$",
  "target": "$1",
  "destination": "northwind",
  "csrfProtection": false,
  "scope": "$XSAPPNAME.migratedroleapp"
}
```

**STEP**: 11 — Deploy the MTA archive to Cloud Foundry
**DESCRIPTION**: Deploy the built MTA archive to Cloud Foundry using the provided npm script. After deployment, confirm user role assignments in the subaccount so scoped routes do not return HTTP 403.
**LANGUAGE**: BASH
**CODE**:
```bash
npm run deploy
# Ensure your user is mapped to the correct role-collections in SAP BTP subaccount to avoid HTTP 403 on scoped routes.
```

**STEP**: 12 — Retrieve deployed HTML5 application URL
**DESCRIPTION**: Use the cf html5-list command to retrieve the URL of the deployed app, or find it via SAP BTP cockpit > Subaccount > HTML5 Applications.
**LANGUAGE**: BASH
**CODE**:
```bash
cf html5-list -u -di managedapp-destination-service -u --runtime launchpad
# OR: Login to SAP BTP cockpit -> Subaccount -> HTML5 Applications to view the deployed app URL
```

**STEP**: 13 — Undeploy (optional)
**DESCRIPTION**: If you need to remove the deployment, run the undeploy script.
**LANGUAGE**: BASH
**CODE**:
```bash
npm run undeploy
```

**STEP**: 14 — Add additional migrated UI apps to the managed MTA
**DESCRIPTION**: To support additional migrated UIs, repeat steps 3–8 for each migrated Neo app, placing each app in its own subfolder under the managedapp folder and adding the corresponding module entries/routes to mta.yaml and xs-app.json. Ensure each migrated app has a unique folder and its routes and security configured as needed.
**LANGUAGE**: none
**CODE**:
```text
# For each additional migrated app:
# - unzip app into /home/user/projects/managedapp/<app-folder>
# - run Fiori migration and descriptor transformation (neo-app.json -> xs-app.json)
# - update managedapp/mta.yaml to include new module
# - update managedapp/xs-app.json to include new routes
# - build and deploy the MTA
```
--------------------------------

**TITLE**: Migrate HTML5 (SAP Fiori) Applications from SAP BTP Neo to Cloud Foundry

**INTRODUCTION**: Step-by-step, code-focused guide to migrate custom HTML5/Fiori applications from SAP BTP Neo to Cloud Foundry. Covers prerequisites, creating migration artifacts, configuring subaccount-level destinations and security, Cloud Foundry deployment commands, two migration folder structures, and common runtime / local preview troubleshooting with actionable fixes and code examples.

**TAGS**: sap-btp, neo, cloud-foundry, html5, fiori, ui5, migration, bas, destinations, xs-security, mtad, xs-app.json, ui5.yaml, i18n, pom.xml

STEP: 1 — Prerequisites
DESCRIPTION: Ensure required SAP BTP subscriptions and entitlements before migration. Subscribe to SAP Business Application Studio and SAP Launchpad Service. If services are missing in Service Marketplace, add them via Entitlements -> Configure Entitlements -> add service -> Save -> Service Marketplace.
LANGUAGE: Text
CODE:
```text
Required:
- SAP BTP account
- SAP Business Application Studio subscription (see tutorial)
  https://help.sap.com/products/SAP%20Business%20Application%20Studio/9d1db9835307451daa8c930fbd9ab264/6331319fd9ea4f0ea5331e21df329539.html
- SAP Launchpad Service subscription (getting started)
  https://developers.sap.com/tutorials/cp-portal-cloud-foundry-getting-started.html
If services missing: BTP cockpit -> Entitlements -> Configure Entitlements -> add required service -> Save -> Service Marketplace -> add service to subaccount.
```

STEP: 2 — Create SAP Fiori Dev Space (BAS)
DESCRIPTION: In SAP BTP cockpit, open Instances and Subscriptions -> SAP Business Application Studio -> Dev Space Manager. Create a "Full Stack Cloud Application" dev space with SAP HANA Tools enabled.
LANGUAGE: Text
CODE:
```text
BTP cockpit -> Instances and Subscriptions -> SAP Business Application Studio -> Open Dev Space Manager
Create dev space: Full Stack Cloud Application
Enable: SAP HANA Tools
```

STEP: 3 — Create migration folder and add artifacts
DESCRIPTION: Create a folder to collect exported Neo artifacts (.mtar, .zip, mta.yaml, etc.) and create base migration config files (xs-security.json, mtad.yaml, config.json).
LANGUAGE: Bash
CODE:
```bash
# Create migration folder
mkdir -p /home/user/projects/neo/

# Copy/upload your exported artifacts into the folder (.mtar, .zip, mta.yaml etc.)
# Create required base files
cd /home/user/projects/neo/
touch xs-security.json mtad.yaml config.json
```

STEP: 4 — mtad.yaml (subaccount-level destination & connectivity services)
DESCRIPTION: Example mtad.yaml that provisions subaccount-level Destination and Connectivity managed services and references config.json for initial destination population.
LANGUAGE: YAML
CODE:
```yaml
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

STEP: 5 — config.json (populate subaccount destinations)
DESCRIPTION: Example config.json to create/update a subaccount-level destination named "northwind". Note: subaccount-level destinations are available to all apps in the subaccount. For instance-scoped destinations, follow referenced sample blog.
LANGUAGE: JSON
CODE:
```json
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

STEP: 6 — xs-security.json (global role collections)
DESCRIPTION: Example xs-security.json that creates an xsuaa app with tenant-mode dedicated and a global role template and a role-collection. Apps consume this as migrationcf.globalrole. Production apps should maintain their own xs-security.json per project.
LANGUAGE: JSON
CODE:
```json
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

STEP: 7 — Login to Cloud Foundry target and deploy services
DESCRIPTION: Authenticate to target Cloud Foundry API endpoint, org, and space. Deploy the migration mtad/mtar (cf deploy used in this doc context). Alternative: BAS -> View -> Command Palette -> Login to Cloud Foundry.
LANGUAGE: Bash
CODE:
```bash
# Login
cf login -a <api-endpoint> -o <organization> -s <space>

# From the migration folder (if using cf deploy flow provided)
cf deploy

# Alternative: use BAS Command Palette -> "Login to Cloud Foundry"
```

STEP: 8 — Migration folder structures & deployment model
DESCRIPTION: Two migration approaches exist and result in different folders. Both deploy to CF using a managed approuter.
- Option 1: single Fiori UI application migration (updated to @ui5/cli v3) -> see Option1.md
- Option 2: multiple Fiori UI applications in one project (references @ui5/cli v2) -> see Option2.md
LANGUAGE: Text
CODE:
```text
Option1.md -> Migrate Neo application for a single Fiori UI application (uses @ui5/cli v3)
Option2.md -> Migrate Neo application supporting multiple Fiori UI apps (uses @ui5/cli v2)
Deployment: apps use managed approuter configuration for CF hosting
```

STEP: 9 — Gotchas: Issue 1 — Missing webapp or manifest.json
DESCRIPTION: SAP Fiori Migration tool requires a webapp folder with manifest.json. Create webapp in project root, move UI code into it, exclude Neo-specific files (neo-app.json, pom.xml, .che).
LANGUAGE: Bash
CODE:
```bash
# Create webapp and move UI files (example)
mkdir -p /path/to/project/webapp
# Move your UI5 web resources into webapp, do NOT move neo-app.json, pom.xml, .che
# Verify manifest.json exists at webapp/manifest.json
```
LANGUAGE: Text
CODE:
```text
If manifest.json missing: follow UI5 guide:
https://sapui5.hana.ondemand.com/sdk/#/topic/3a9babace121497abea8f0ea66e156d9.html
```

STEP: 10 — Gotchas: Issue 2 — Component ID mismatch (getResourceBundle undefined)
DESCRIPTION: Component.js component name must match manifest "sap.app.id" and test/flpSandbox.html resource roots. Sync IDs: Component.js, manifest.json, and test/flpSandbox.html additionalInformation and resourceRoots.
LANGUAGE: JavaScript
CODE:
```javascript
// Component.js snippet - ensure this ID is the package + component name you use
t.extend("ns.manageproductsneo.Component", { metadata: { manifest: "json" } });
```
LANGUAGE: JSON
CODE:
```json
// manifest.json -> ensure sap.app.id matches Component.js namespace
{
  "_version": "1.12.0",
  "sap.app": {
    "id": "manageproductsneo",
    ...
  }
}
```
LANGUAGE: Text
CODE:
```html
<!-- test/flpSandbox.html: update these lines to match the Component.js ID -->
Line 49: additionalInformation: "SAPUI5.Component=ns.manageproductsneo",
Line 69: data-sap-ui-resourceroots='{"ns.manageproductsneo": "../"}'
```

STEP: 11 — Gotchas: Issue 3 — manifest i18n invalid input / UI5 i18n errors
DESCRIPTION: Use string shorthand for i18n path in manifest to avoid invalid input error. If still failing, bump minUI5Version in manifest or set UI5 version in ui5.yaml for local preview.
LANGUAGE: JSON
CODE:
```json
// Change manifest i18n from this (problematic)
"i18n": {
    "bundleUrl": "i18n/i18n.properties",
    "supportedLocales": [
        ""
    ],
    "fallbackLocale": ""
},

// To this (recommended)
"i18n": "i18n/i18n.properties",
```
LANGUAGE: YAML
CODE:
```yaml
# Example ui5.yaml override to force UI5 version for local preview
specVersion: "3.1"
metadata:
  name: my.fiori.app
type: application
server:
  ... 
  # specify version to use for local preview
  ui5:
    path:
      - /resources
      - /test-resources
    url: https://ui5.sap.com
    version: 1.109.0
```
LANGUAGE: Text
CODE:
```text
Also consider bumping manifest.json "minUI5Version": "1.108.2" to a later supported UI5 version:
https://sapui5.hana.ondemand.com/versionoverview.html
```

STEP: 12 — Gotchas: Issue 4 & 6 — HTTP 403 after deploy (xs-app.json scope / roles)
DESCRIPTION: 403 indicates missing permissions or wrong scope in xs-app.json. Check xs-app.json route authentication and ensure the logged-in user is a member of the role collection referenced by security definitions. Clear cookies or test in incognito to refresh sessions after role changes.
LANGUAGE: JSON
CODE:
```json
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
  ]
}
```
LANGUAGE: Text
CODE:
```text
Resolution:
- Ensure roles referenced in xs-app.json/xs-security are assigned to the user
- Add user to role collection in XSUAA
- After changes: clear session cookies or use incognito to verify
- Check HTML5 application logs in BTP cockpit -> HTML5 Applications -> logs icon
```

STEP: 13 — Gotchas: Issue 5 — CI static analysis JS_PARSING_ERROR on locate-reuse-libs.js
DESCRIPTION: Update SAP static analysis plugin version in pom.xml from 1.x to 2.x to fix parsing issues in the CI pipeline.
LANGUAGE: XML
CODE:
```xml
<!-- Current configuration that may fail -->
<sap.analysis.version>1.54.8</sap.analysis.version>
<groupId>com.sap.ca</groupId>
<artifactId>analysis-plugin</artifactId>
<version>${sap.analysis.version}</version>

<!-- Proposed configuration -->
<sap.analysis.version>2.0.4</sap.analysis.version>
```
LANGUAGE: Text
CODE:
```text
Rationale:
- Major version bump (1.x -> 2.x)
- Enhanced parsing and error detection
- Check for breaking rule changes in the new analysis version
```

STEP: 14 — Gotchas: Issue 7 — HTTP 404 after deploy due to absolute AJAX paths
DESCRIPTION: Cloud Foundry apps receive a unique GUID path prefix; absolute API paths will not resolve the GUID and return 404. Use relative or proxied paths so the GUID is preserved or removed as appropriate.
LANGUAGE: Text
CODE:
```text
Resolution:
- Replace absolute API URLs with relative paths (e.g., /api/endpoint -> relative)
- Or proxy via xs-app.json route so the GUID prefix is handled by the approuter
- Reference GA troubleshooting: https://ga.support.sap.com/dtp/viewer/index.html#/tree/3046/actions/45995:45996:50742:51205:51192:51196:52513
```

STEP: 15 — Gotchas: Issue 8 — Local preview proxy mismatch for /scim path (fiori-tools-proxy)
DESCRIPTION: When running npm run start with fiori-tools-proxy, ensure ui5.yaml backend path and pathReplace align with xs-app.json route behavior so local proxy strips/retains path segments consistently with CF runtime.
LANGUAGE: JSON
CODE:
```json
// xs-app.json example: source regex strips or retains path segments
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
  ]
}
```
LANGUAGE: YAML
CODE:
```yaml
# ui5.yaml: Add pathReplace to remove /scim when proxying locally
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
LANGUAGE: Text
CODE:
```text
Explanation:
- xs-app.json route '^/scim/(.*)$' removes the /scim on CF runtime (target $1)
- Local proxy must use pathReplace: / to strip '/scim' so backend receives expected path
- After change: request to https://localhost:8080/scim/v2 -> proxied as https://API_ENDPOINT.dest/v2
```

STEP: 16 — Troubleshooting & Support
DESCRIPTION: When unresolved issues persist, capture a full network trace (.har) and open SAP support incident with the trace. See instructions to capture trace.
LANGUAGE: Text
CODE:
```text
How to capture:
- Use Chrome or Edge Developer Tools -> Network -> Save all as HAR with content
- SAP doc: How to capture an HTTP trace using Google Chrome or MS Edge (Chromium)
  https://launchpad.support.sap.com/#/notes/1990706

Provide:
- .har file
- Steps to reproduce
- Application logs from BTP cockpit -> HTML5 Applications -> logs icon
```

STEP: 17 — License
DESCRIPTION: Project license and copyright.
LANGUAGE: Text
CODE:
```text
Copyright (c) 2009-2026 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the LICENSE file:
../LICENSES/Apache-2.0.txt
```


--------------------------------

**TITLE**: Deploy Fiori generator extensions to Business Application Studio (BAS) using WEX

**INTRODUCTION**: Step-by-step actionable instructions to package, publish, and configure a Fiori generator extension so Business Application Studio (BAS) installs it automatically via the BAS Extension Management (WEX) tool. Includes commands, GitHub release/PAT guidance, required JSON config, deployment command and verification steps.

**TAGS**: BAS, Business Application Studio, WEX, fiori-generator, fiori-tools, extension, npm, GitHub, PAT, deployment

**STEP**: 1 — Build, package and test the extension locally

**DESCRIPTION**: Compile (if TypeScript), create a distributable tarball with npm pack, and verify the extension installs globally for local testing.

**LANGUAGE**: Shell

**CODE**:
```bash
# In the root of your extension package
# 1. Ensure compiled output is included in the package (TypeScript projects):
npm run build      # or your build step that emits compiled JS into dist/ or lib/

# 2. Create tarball:
npm pack           # produces something like my-ext-0.0.1.tgz

# 3. Install locally (global) to test the generator is available:
npm install -g ./my-ext-0.0.1.tgz

# 4. Run/verify generator behavior (example Yeoman generator invocation):
yo @sample/fiori-gen-ext   # or the generator name you implemented
```

**STEP**: 2 — Publish the package to a GitHub repository (release artifact)

**DESCRIPTION**: Push the package sources and the compiled distributable into a non-public GitHub repo. Create a release and upload the tarball as a release asset or rely on the automatic tarball URL for tags. Generate a GitHub Personal Access Token (PAT) with minimal scopes and note the PAT usage in the download URL.

- Ensure compiled output is committed to the repository (TypeScript projects need compiled JS included).
- Create a release via GitHub UI: Repository -> Releases -> Draft a new release.

**LANGUAGE**: Text (commands optional)

**CODE**:
```text
GitHub PAT requirements (minimum):
- read:packages
- repo

Release creation:
- Use "Draft a new release" in GitHub web (or GitHub Releases API)
- Tag the release (e.g., v0.0.1) so a tarball URL is available:
  https://github.com/<User Name>/<Repository Name>/archive/refs/tags/v0.0.1.tar.gz

If repository is private, the tar URL must include credentials (see next step).
```

**STEP**: 3 — Create the WEX Simple Extension config JSON (sample-extension.json)

**DESCRIPTION**: Prepare the JSON config used by the WEX tool to tell BAS where to download and auto-install the Yeoman package. Replace placeholders: <User Name>, <Github PAT>, <Repository Name>, <sub-account_name>, <base 64 encoded image>, and the version/tag path as appropriate.

Important:
- Use the authenticated tarball URL format for private repos:
  https://<User Name>:<Github PAT>@github.com/<User Name>/<Repository Name>/archive/refs/tags/vX.Y.Z.tar.gz
- To auto-select for all new dev spaces set autoSelectExtensions as shown in the note below.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "apiVersion": "1",
  "name": "testing-sample-gen-ext",
  "namespace": "ext-<sub-account_name>",
  "autoSelectExtensions": [],
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

**NOTE**: To auto-select this extension for all new dev spaces, set:
```json
"autoSelectExtensions": ["ext-sap-ux-stage/testing-sample-gen-ext"]
```

**STEP**: 4 — Deploy the WEX configuration to BAS

**DESCRIPTION**: Use the WEX (Business Application Studio Extension Management) CLI package to deploy the JSON file so it appears as an extension option on the BAS Create Dev Space page.

Preconditions and docs: https://help.sap.com/docs/bas/sap-business-application-studio/create-and-deploy-sap-business-application-studio-extension
WEX package: https://www.npmjs.com/package/@sapse/business-application-studio-extension-management

**LANGUAGE**: Shell

**CODE**:
```bash
# Install WEX CLI globally if not installed
npm install -g @sapse/business-application-studio-extension-management

# Deploy the config file
wex deploy --verbose -f sample-extension.json
```

**STEP**: 5 — Create a dev space and verify extension installation

**DESCRIPTION**: After successful WEX deployment, the new extension option appears on the BAS Create Dev Space page. Select it (or rely on autoSelect) and create the dev space. Verify successful installation or diagnose errors by checking the installation log inside the dev space.

**LANGUAGE**: Text

**CODE**:
```text
# After dev space creation, open the dev space and inspect this file for the installation log:
 /extbin/generators/simple-extension-yo-install-output.txt
```

**REFERENCES / LINKS**:
- WEX npm: https://www.npmjs.com/package/@sapse/business-application-studio-extension-management
- BAS extension preconditions: https://help.sap.com/docs/bas/sap-business-application-studio/create-and-deploy-sap-business-application-studio-extension
- Sample extension README: https://github.com/SAP-samples/fiori-tools-samples/sample-fiori-gen-ext/README.md
--------------------------------

**TITLE**: Sample Fiori generator extension sub-generator — setup, API, prompts, steps, and file updates

**INTRODUCTION**: Practical, code-focused guide showing how to build/install a sample Fiori generator extension, implement the FioriGeneratorExtensionAPI, customize existing prompts, add navigation steps and prompts, and update files during the Yeoman run loop. Includes full TypeScript examples ready to drop into a generator project.

**TAGS**: fiori, generator, yeoman, extension, ui5, fiori-gen-ext, typescript, vscode, business-application-studio

STEP: 1 — Build and install the sample locally

DESCRIPTION: Commands to build, package and install the sample extension locally for testing. Run these from the sample-fiori-gen-ext directory.

LANGUAGE: bash

CODE:
```bash
# from sample-fiori-gen-ext directory
yarn install            # install dev dependencies (requires yarn globally)
yarn bundle             # bundle the extension (includes esbuild script in package)
npm pack                # create installable tgz
npm i -g ./<name>-<ver>.tgz   # install the generated tgz globally for local testing
```

STEP: 2 — Bundle for Business Application Studio (recommended)

DESCRIPTION: Bundle and prepare artifacts to deploy to BAS devspaces. Use yarn bundle to produce a checked-in bundle, create a tgz for local tests, or use GitHub "Draft a new release" action and WEX tool for deployment.

LANGUAGE: bash

CODE:
```bash
# Bundle for BAS (esbuild used in sample bundle)
yarn bundle

# Create tgz for local testing (optional)
npm pack
npm i -g ./<name>-<ver>.tgz

# Notes:
# - shelljs may be included as dependency to workaround esbuild issues.
# - Check the generated bundle into the repo for WEX deployment.
# - Alternatively, create a GitHub release (Draft a new release) and let WEX publish to BAS.
```

STEP: 3 — Install locations & package.json requirements for discovery

DESCRIPTION: Where to install an extension so the Fiori generator finds it, and the package.json properties required.

LANGUAGE: text

CODE:
```text
Valid install locations:
1) Global npm root: npm -g root  # install using npm install -g <tgz>
2) BAS dev space pre-install locations (configured per dev space)
3) Custom VSCode setting: "Application Wizard: Installation Location"

Package requirements (package.json):
- package name must include the string: "fiori-gen-ext"
- keywords must include: "fiori-generator-extension"
- also include "yeoman-generator" in keywords

Example package.json:
{
  "name": "@acme/acme-fiori-gen-ext",
  "keywords": [
    "fiori-generator-extension",
    "yeoman-generator"
  ]
}
```

STEP: 4 — FioriGeneratorExtensionAPI signature and imports

DESCRIPTION: Import types and implement the FioriGeneratorExtensionAPI interface. Use these hooks to provide settings, prompt extensions, and navigation steps.

LANGUAGE: TypeScript

CODE:
```typescript
// generator/index.ts
import Generator from 'yeoman-generator';
import {
  FioriGeneratorExtensionAPI,
  FioriGeneratorSettings,
  FioriGeneratorPromptExtension,
  Step
} from '@sap/generator-fiori';

// The API interface (imported from @sap/generator-fiori) provides these optional hooks:
export interface FioriGeneratorExtensionAPI {
  _getSettings?: () => FioriGeneratorSettings;
  _getExtensions?: () => FioriGeneratorPromptExtension;
  _getSteps?: () => Step[];
}
```

STEP: 5 — Example: customize existing prompts via _getExtensions

DESCRIPTION: Extend existing Project Attributes prompts (name, title, namespace, description, targetFolder, ui5Version) by returning validation and default overrides for specific question names. Use FioriGeneratorPromptNames to reference canonical question keys.

LANGUAGE: TypeScript

CODE:
```typescript
// generator/extensions.ts
import Generator from 'yeoman-generator';
import {
  FioriGeneratorExtensionAPI,
  FioriGeneratorPromptExtension,
  FioriGeneratorPromptNames
} from '@sap/generator-fiori';

class MyExtensionGenerator extends Generator implements FioriGeneratorExtensionAPI {
  // Provide custom validation and default for the app 'name' prompt
  _getExtensions(): FioriGeneratorPromptExtension {
    const { projectAttributes: { mainQuestions: questionNames } } = FioriGeneratorPromptNames;

    return {
      "@sap/generator-fiori": {
        [questionNames.name]: {
          validate: (input: string): boolean | string => {
            if (!input || input.length < 3) {
              return "Name length must be > 3";
            }
            return true;
          },
          default: "superapp1"
        }
      }
    };
  }
}
export = MyExtensionGenerator;
```

STEP: 6 — Example: add new LHS navigation steps and prompts (prompting + _getSteps)

DESCRIPTION: Add two new navigation steps in the Application Wizard and provide prompts for each step in the prompting() lifecycle method. Ensure one prompt per declared step (the generator UI expects matching prompt calls and step entries).

LANGUAGE: TypeScript

CODE:
```typescript
// generator/steps.ts
import Generator from 'yeoman-generator';
import { FioriGeneratorExtensionAPI } from '@sap/generator-fiori';
import { IPrompt as YUIStep } from '@sap-devx/yeoman-ui-types';

class StepsExtensionGenerator extends Generator implements FioriGeneratorExtensionAPI {
  // persisted local answers across phases
  localAnswers: Record<string, any> = {};

  async prompting(): Promise<void> {
    this.log('Sample Fiori generator extension: prompting()');

    // Prompts for Extension step 1
    const answersPrompt1 = await this.prompt([
      {
        type: "input",
        guiOptions: { breadcrumb: true },
        name: "prompt1",
        message: "Sample prompt1",
        default: 'Default value prompt1',
        validate: (val: string) => val ? true : "Validation message from prompt1, enter a value"
      },
      {
        type: "input",
        guiOptions: { breadcrumb: true },
        name: "prompt2",
        message: "Sample prompt2",
        validate: (val: string) => val ? true : "Validation message from prompt2, enter a value"
      }
    ]);

    this.log(`Answers from Extension step 1: ${JSON.stringify(answersPrompt1)}`);

    // Prompts for Extension step 2
    const answersPrompt2 = await this.prompt([
      {
        type: "input",
        guiOptions: { breadcrumb: true },
        name: "prompt3",
        message: "Sample prompt3",
        default: () => this.fioriGeneratorState?.project?.namespace || ""
      },
      {
        type: "input",
        guiOptions: { breadcrumb: true },
        name: "prompt4",
        message: "Sample prompt4"
      }
    ]);

    this.log(`Answers from Extension step 2: ${JSON.stringify(answersPrompt2)}`);

    // Store answers for later lifecycle phases (config/writing)
    this.localAnswers = Object.assign({}, answersPrompt1, answersPrompt2);
  }

  // Return navigation steps displayed in the Application Wizard LHS
  _getSteps(): YUIStep[] {
    return [
      { name: "Extension step 1", description: "Extension step 1 description" },
      { name: "Extension step 2", description: "Extension step 2 description" }
    ];
  }
}

export = StepsExtensionGenerator;
```

STEP: 7 — Write/extend files in the writing phase (use in-memory fs)

DESCRIPTION: Use this.fs (Yeoman mem-fs) to write new files or extend existing JSON files after the base generator has created files. The Fiori generator composes extensions after prompting and ensures they run late in the run loop so generated files are present in memory.

LANGUAGE: TypeScript

CODE:
```typescript
// generator/writing.ts
import Generator from 'yeoman-generator';
import { FioriGeneratorExtensionAPI } from '@sap/generator-fiori';

class WritingExtensionGenerator extends Generator implements FioriGeneratorExtensionAPI {
  localAnswers: Record<string, any> = {};

  async writing(): Promise<void> {
    // Path to manifest in generated app
    const manifestPath = this.destinationPath('webapp', 'manifest.json');

    // Write a new JSON file using answers and fioriGeneratorState
    this.fs.writeJSON(this.destinationPath('sample.json'), {
      moduleName: this.fioriGeneratorState?.project?.name,
      moduleNamespace: this.fioriGeneratorState?.project?.namespace,
      ...this.localAnswers
    });

    // Extend the manifest.json with additional app tags
    this.fs.extendJSON(manifestPath, {
      'sap.app': {
        tags: {
          keywords: ["fiori", "custom extension", "acme"]
        }
      }
    });

    // Update package.json (add dev dependency) if exists
    const packageJsonPath = this.destinationPath('package.json');
    if (this.fs.exists(packageJsonPath)) {
      this.fs.extendJSON(packageJsonPath, { devDependencies: { 'fast-glob': '3.2.12' }});
    }
  }
}

export = WritingExtensionGenerator;
```

STEP: 8 — How to run and validate the extension in BAS/VSCode or CLI

DESCRIPTION: After installing the extension globally, open the Application Wizard (VSCode extension) in BAS or local VSCode and run the "SAP Fiori application" generator (package: @sap/generator-fiori v1.9.7+). The new navigation steps and custom prompts will appear in the LHS. CLI execution is also supported if using Yeoman directly.

LANGUAGE: text

CODE:
```text
# After global install (npm i -g <tgz>):
# - Open Business Application Studio or VSCode
# - Launch Application Wizard extension
# - Choose 'SAP Fiori application' (ensure @sap/generator-fiori >= 1.9.7)
# - Verify the additional "Extension step 1" & "Extension step 2" appear in the left navigation
#
# CLI:
# If required, run the Fiori generator via CLI (yo or npm scripts) as appropriate for your setup.
```

STEP: 9 — Useful links & references

DESCRIPTION: Repository, deployment doc, API and help links.

LANGUAGE: text

CODE:
```text
Sample extension repo:
https://github.com/SAP-samples/fiori-tools-samples/sample-fiori-gen-ext

Deployment to BAS (deployment doc in repo):
https://github.com/SAP-samples/fiori-tools-samples/sample-fiori-gen-ext/deploy_extension.md

Yeoman composeWith & run loop:
https://yeoman.io/authoring/composability.html
https://yeoman.io/authoring/running-context.html

Inquirer question format:
https://github.com/SBoudrias/Inquirer.js/tree/master/packages/inquirer#questions

Fiori generator package/type exports:
@sap/generator-fiori
@sap-ux/ui5-application-inquirer

Community & support:
https://answers.sap.com/tags/73555000100800002345
SAPFioriElements@sap.com
```
--------------------------------

**TITLE**: Add the xml-js External Library to a SAP Fiori (freestyle SAPUI5) App

**INTRODUCTION**: Step-by-step, code-focused instructions to add the third-party xml-js library to a freestyle SAPUI5 (SAP Fiori) application built in SAP Business Application Studio. Covers npm installation, copying the browser bundle into your webapp, registering a loader path, and using xml-js inside a controller.

**TAGS**: SAPUI5, Fiori, xml-js, external-library, npm, Business Application Studio, BAS, freestyle, webapp

**STEP**: Prerequisites & sample project
**DESCRIPTION**: Verify environment and sample project location.
**LANGUAGE**: Text
**CODE**:
```
- SAP BTP account and SAP Business Application Studio subscription (see BAS tutorial).
- Sub-account destination named: northwind
- Attached destination configuration file reference: northind (keep as provided)
- Sample project path in repository: ./ztravelapp/README.md
```

**STEP**: Install xml-js via npm
**DESCRIPTION**: Install xml-js into the project root (where package.json lives). This makes the package available in node_modules so you can copy the browser bundle into the UI5 webapp.
**LANGUAGE**: Bash
**CODE**:
```bash
# From the project root
npm install xml-js --save
```

**STEP**: Copy the browser bundle to the webapp/libs folder
**DESCRIPTION**: Copy the pre-built browser file from node_modules to webapp/libs so it is served with your app. Create the target directory and copy the bundle. The xml-js package provides a browser bundle under dist/xml-js.min.js.
**LANGUAGE**: Bash
**CODE**:
```bash
# Create destination dir (adjust path if your webapp folder is different)
mkdir -p webapp/libs/xml-js

# Copy the browser build from node_modules to your webapp
cp node_modules/xml-js/dist/xml-js.min.js webapp/libs/xml-js/xml-js.min.js
```

**STEP**: Register the loader path for the library (index.html)
**DESCRIPTION**: Configure the UI5 loader so the library file can be required as a module. Add a sap.ui.loader.config call before UI5 bootstrapping in webapp/index.html.
**LANGUAGE**: HTML
**CODE**:
```html
<!-- webapp/index.html: add this BEFORE the sap-ui-core.js bootstrap -->
<script>
  // Map a module name (xmljs) to the copied file path (without .js)
  sap.ui.loader.config({
    paths: {
      "xmljs": "libs/xml-js/xml-js.min"
    }
  });
</script>

<!-- existing bootstrap - ensure the above script runs first -->
<script id="sap-ui-bootstrap"
        src="https://sapui5.hana.ondemand.com/resources/sap-ui-core.js"
        data-sap-ui-libs="sap.m"
        data-sap-ui-theme="sap_fiori_3"
        data-sap-ui-resourceroots='{"your.app.namespace": "./"}'>
</script>
```

**STEP**: Use xml-js in a controller via sap.ui.define
**DESCRIPTION**: Require the mapped module name in a controller and use xml-js functions such as xml2js/xml2json. Example demonstrates converting a sample XML string to a JS object.
**LANGUAGE**: JavaScript
**CODE**:
```javascript
// webapp/controller/Main.controller.js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "xmljs"                // matches the path key from sap.ui.loader.config
], function (Controller, xmljs) {
  "use strict";

  return Controller.extend("your.app.namespace.controller.Main", {
    onInit: function () {
      var xml = '<note><to>Alice</to><from>Bob</from><heading>Reminder</heading><body>Call me</body></note>';

      // xmljs is the xml-js module exported object. Use xml2js for converting XML->JS
      var result = xmljs.xml2js(xml, { compact: true, spaces: 4 });
      console.log("XML -> JS result:", result);

      // Convert JS -> XML
      var xmlBack = xmljs.js2xml(result, { compact: true, spaces: 4 });
      console.log("JS -> XML result:", xmlBack);
    }
  });
});
```

**STEP**: Alternative — include as a global script
**DESCRIPTION**: If loader mapping is not desired, include the copied bundle directly with a script tag in index.html and access the library from the global object (UMD builds may expose a global). Use this when you prefer a global variable instead of sap.ui.define.
**LANGUAGE**: HTML / JavaScript
**CODE**:
```html
<!-- webapp/index.html: direct script include (place before your app code runs) -->
<script src="libs/xml-js/xml-js.min.js"></script>
```
```javascript
// webapp/controller/Main.controller.js (if library exposes a global)
// Example global name depends on the bundle; check the bundle's UMD global.
//
// If bundle attaches `xmljs` or another global, access it via window.xmljs:
var result = window.xmljs.xml2js(xml, { compact: true });
```

**STEP**: Notes and troubleshooting
**DESCRIPTION**: Keep these practical tips for integration and deployment.
**LANGUAGE**: Text
**CODE**:
```
- Ensure the copied xml-js.min.js file path matches the loader config path and URL served by the app.
- If xml-js UMD build uses a different global/module name, inspect the file in node_modules/xml-js/dist to confirm the exported name.
- When deploying to SAP BTP, include webapp/libs/xml-js/xml-js.min.js in your deployment artifacts (it is inside your webapp folder).
- Sample project reference: ./ztravelapp/README.md (use this as a template for a freestyle SAPUI5 app with external libs).
- Destinations: confirm your sub-account destination 'northwind' and the provided 'northind' configuration are available if your app depends on backend calls.
```
--------------------------------

**TITLE**: Add xml-js External Library to an SAP Fiori (UI5) Freestyle Application

**INTRODUCTION**: This guide shows the exact code and configuration changes to add the npm package xml-js to a SAPUI5 freestyle application, enable UI5 tooling middleware to load third‑party npm modules by name, and consume xml-js inside a controller. Use these steps inside a SAP Business Application Studio Fiori dev space.

**TAGS**: fiori-samples, sapui5, ui5-tooling, npm, xml-js, middleware, ui5.yaml, controller

STEP: 1 — Prerequisites
DESCRIPTION: Ensure you have access to SAP BTP and a Fiori dev space where you can edit the project files and run npm. Confirm the following:
- SAP BTP account
- SAP Business Application Studio subscription (Fiori dev space)
- Optional: sub-account destination named northwind (if your app uses it)

LANGUAGE: text
CODE:
```text
Prerequisites:
- SAP BTP account
- SAP Business Application Studio (Fiori dev space)
- Optional: destination "northwind"
```

STEP: 2 — Create a SAP Fiori dev space (high level)
DESCRIPTION: From SAP BTP cockpit > Instances and Subscriptions > SAP Business Application Studio > Open dev space manager and generate a SAP Fiori dev space. Use the dev space to create or open your freestyle UI5 project.

LANGUAGE: text
CODE:
```text
Open SAP BTP Cockpit -> Instances and Subscriptions -> SAP Business Application Studio -> Open dev space manager -> Create Fiori dev space.
Reference: https://help.sap.com/products/SAP%20Business%20Application%20Studio
```

STEP: 3 — (Optional) Review how to create a freestyle SAPUI5 app
DESCRIPTION: If you need to generate a new freestyle app, follow the SAP Fiori Tools tutorial for creating apps.

LANGUAGE: text
CODE:
```text
Reference: https://sapui5.hana.ondemand.com/sdk/#/topic/a460a7348a6c431a8bd967ab9fb8d918
```

STEP: 4 — Install required npm packages
DESCRIPTION: Install xml-js (the external library) and the UI5 tooling helper that enables npm module names to be imported by UI5 (ui5-tooling-modules). Run these commands in your project root (where package.json resides).

LANGUAGE: bash
CODE:
```bash
# Install xml-js (third-party library)
npm install xml-js --save-prod

# Install UI5 tooling extension for third-party modules (middleware/task)
npm install ui5-tooling-modules --save-prod
```

STEP: 5 — Update ui5.yaml to enable the middleware
DESCRIPTION: Add the ui5-tooling-modules middleware to ui5.yaml so the UI5 server can resolve npm package names (keep YAML alignment). Place this under the top-level server -> customMiddleware array in your project's ui5.yaml (project root).

LANGUAGE: YAML
CODE:
```YAML
# ui5.yaml (excerpt - add under the top-level 'server' section)
specVersion: '2.1'
type: application
metadata:
  name: your.app.namespace

server:
  customMiddleware:
    - name: ui5-tooling-modules-middleware
      afterMiddleware: compression
      configuration:
        addToNamespace: true
```

STEP: 6 — Import xml-js in your controller (webapp/controller/View1.controller.js)
DESCRIPTION: Modify the sap.ui.define call to include the npm module name "xml-js" and add a corresponding parameter in the factory function (here named xmljs). The example shows a complete controller module that consumes xml-js and converts a sample XML string to JSON. Replace your controller namespace and method names as needed.

LANGUAGE: JavaScript
CODE:
```javascript
// File: webapp/controller/View1.controller.js
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "xml-js" // third-party npm module, made available by ui5-tooling-modules
  ],
  function (Controller, xmljs) {
    "use strict";

    return Controller.extend("your.app.namespace.controller.View1", {
      onInit: function () {
        // Initialization code
      },

      onConvertXml: function () {
        // Example XML string to convert
        var xml = '<root><item id="1">Value</item></root>';

        // Use xml-js to convert XML -> JSON (xml2json returns a JSON string)
        var xmlToJson = JSON.parse(
          xmljs.xml2json(xml, {
            compact: true,
            spaces: 4
          })
        );

        console.log(">>>> xmlToJson " + JSON.stringify(xmlToJson));
        // xmlToJson now contains the parsed JSON object
      }
    });
  }
);
```

STEP: 7 — Notes on sap.ui.define and third‑party modules
DESCRIPTION: Use the Third Party Modules section of sap.ui.define documentation to understand how third-party modules are resolved and referenced. The ui5-tooling-modules middleware allows the string "xml-js" in the dependency array to map to node_modules/xml-js at runtime in the UI5 dev server.

LANGUAGE: text
CODE:
```text
sap.ui.define third-party modules reference:
https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui%23methods/sap.ui.define (see "Third Party Modules")

Ensure:
- ui5.yaml includes the ui5-tooling-modules-middleware entry
- npm packages are installed in project root node_modules
```

STEP: 8 — Additional references
DESCRIPTION: Extra resources related to using external libraries in UI5, CAP, and SAP Build Work Zone plus tips for smart templates.

LANGUAGE: text
CODE:
```text
Additional links:
- External libraries in UI5 + CAP + SAP Build Work Zone, Standard Edition:
  https://blogs.sap.com/2023/11/08/external-libraries-in-ui5-cap-sap-build-work-zone-standard-edition/

- Smart templates and SAP Fiori Apps – 57 Tips and Tricks:
  https://blogs.sap.com/2019/09/20/smart-templates-tips-and-tricks/
```
--------------------------------
