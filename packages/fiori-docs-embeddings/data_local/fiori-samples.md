
--------------------------------

**TITLE**: SAP Fiori tools - Sample Projects: Setup, Run, and Access Mock OData

**INTRODUCTION**: This document provides concise, actionable steps to clone the "Samples for SAP Fiori tools" repo, install dependencies, run a sample Fiori elements project locally, and access its mock OData service. Use these steps when automating setup in scripts or generating project-specific boilerplate.

**TAGS**: fiori-samples, sap-fiori, sap-fiori-tools, samples, npm, mock-odata, tutorial

**STEP**: 1. Clone repository

**DESCRIPTION**: Clone the samples repository to your local filesystem. Replace <destination-folder> with your preferred path or omit it to clone into the current directory.

**LANGUAGE**: Shell

**CODE**:
```shell
# Clone the repository (public GitHub)
git clone https://github.com/SAP-samples/fiori-tools-samples.git <destination-folder>

# Example: clone into current directory
git clone https://github.com/SAP-samples/fiori-tools-samples.git
```

**STEP**: 2. Inspect samples and choose a sample app

**DESCRIPTION**: The repository contains multiple sample projects grouped by scenario. Change into the chosen sample app folder before installing dependencies. Common path pattern: V2/apps/<sample-app-name>.

**LANGUAGE**: Shell

**CODE**:
```shell
# List recommended sample folders
ls -la fiori-tools-samples/V2/apps

# Example: change to the "myfioriapp" sample app
cd fiori-tools-samples/V2/apps/myfioriapp
```

**STEP**: 3. Install npm dependencies

**DESCRIPTION**: Install all project dependencies for the selected sample. Run from the sample app root (where package.json lives).

**LANGUAGE**: Shell

**CODE**:
```shell
# From sample app folder (contains package.json)
npm install
```

**STEP**: 4. Start the sample app locally (dev server)

**DESCRIPTION**: Start the local development server. The start script will host the Fiori elements app and expose a dev server URL and a Service Path for the mock OData service. Note terminal output for "URL" and "Service Path".

**LANGUAGE**: Shell

**CODE**:
```shell
# Start the local dev server (serves app + mock OData)
npm start
```

**STEP**: 5. Construct and open the mock OData endpoint

**DESCRIPTION**: Combine the "URL" value (host + port) and the "Service Path" value (OData path) displayed by the dev server to form the full mock OData endpoint. Open the app URL in a browser to view the running app, or open the combined OData URL to inspect mock service metadata or OData responses.

**LANGUAGE**: Plain text / URL

**CODE**:
```text
# Example values displayed by the dev server:
URL: http://localhost:8083
Service Path: /sap/opu/odata/sap/SEPMRA_PROD_MAN

# Combined full mock OData endpoint:
http://localhost:8083/sap/opu/odata/sap/SEPMRA_PROD_MAN

# Open the app in a browser (app URL is provided by the dev server)
# Open the OData metadata in a browser:
http://localhost:8083/sap/opu/odata/sap/SEPMRA_PROD_MAN/$metadata
```

**STEP**: 6. View the example run screenshot (local file)

**DESCRIPTION**: Example screenshot showing the running sample app and dev server values is stored in the repo. Open it for quick visual reference.

**LANGUAGE**: Shell / File path

**CODE**:
```shell
# Screenshot file path relative to repo root
V2/apps/images/products-review-run.png

# On macOS:
open V2/apps/images/products-review-run.png

# On Linux:
xdg-open V2/apps/images/products-review-run.png

# On Windows (PowerShell):
ii .\V2\apps\images\products-review-run.png
```

**STEP**: 7. Requirements and troubleshooting references

**DESCRIPTION**: For environment, prerequisites, and detailed getting-started instructions, consult the SAP Fiori tools documentation. Use the SAP Community for general questions and the specified GitHub issues link only for tutorial-related problems.

**LANGUAGE**: Plain text / URL

**CODE**:
```text
# Official SAP Fiori tools documentation (prereqs & setup)
https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html

# Support options:
# 1) SAP Community (general support) - tag "SAP Fiori tools"
https://answers.sap.com/questions/ask.html

# 2) Report issues related to SAP Developer tutorials only:
https://github.com/SAPDocuments/Tutorials/issues/new
```

**STEP**: 8. License

**DESCRIPTION**: Project is licensed under Apache License 2.0. Refer to the license file in the repo for full terms.

**LANGUAGE**: Plain text / File path

**CODE**:
```text
# License file path in repository
LICENSES/Apache-2.0.txt
# Copyright (c) 2009-2020 SAP SE or an SAP affiliate company.
```
--------------------------------

**TITLE**: SAP Fiori elements application - Products Review (List Report Object Page, V2)

**INTRODUCTION**: Step-by-step developer guide to clone, install, run the Products Review sample Fiori Elements application, start the local mock OData server, obtain the combined OData service URL, and open the application in a browser. Use the combined URL as the service endpoint when generating or testing other Fiori apps with SAP Fiori tools.

**TAGS**: fiori-samples, sap-fiori, fiori-elements, lrop-v2, mock-server, odata

STEP: 1 — Create workspace folder and clone repository
DESCRIPTION: Create a local folder, clone the repository (replace <GIT_REPO_URL> with the repository URL), then change into the project folder path fiori-tools-samples/V2/products-review.
LANGUAGE: Bash
CODE:
```bash
# create a workspace folder (optional)
mkdir ~/projects
cd ~/projects

# clone the repository (replace with actual GitHub URL)
git clone <GIT_REPO_URL>

# navigate to the sample app subfolder
cd fiori-tools-samples/V2/products-review
```

STEP: 2 — Install npm dependencies
DESCRIPTION: Install all dependencies declared in package.json inside fiori-tools-samples/V2/products-review.
LANGUAGE: Bash
CODE:
```bash
# from project root
npm install
```

STEP: 3 — Start the application and local mock server
DESCRIPTION: Start the application. The project starts a local mock OData server and a small web server. Watch the console for two values: "URL" (base address) and "Service Path" (OData service path). Example log lines will show how to build the full OData service URL.
LANGUAGE: Bash
CODE:
```bash
# start the local server(s)
npm start

# Example console output (format)
# URL: http://localhost:8080
# Service Path: /mockserver/ProductsReviewService/
# Combine to form OData service endpoint: http://localhost:8080/mockserver/ProductsReviewService/
```

STEP: 4 — Form the full OData service URL to use with SAP Fiori tools
DESCRIPTION: Combine the "URL" and "Service Path" values exactly as printed to form the OData endpoint. Use this combined URL when generating new apps with SAP Fiori tools or when configuring an external client.
LANGUAGE: Plain text
CODE:
```text
# Example combination
# URL                = http://localhost:8080
# Service Path       = /mockserver/ProductsReviewService/
# Combined OData URL = http://localhost:8080/mockserver/ProductsReviewService/
```

STEP: 5 — Open the running application in a browser
DESCRIPTION: Open the printed "URL" in a browser, click index.html in the server file listing (or directly open the app path), then click "Manage Products" to view the List Report / Object Page application.
LANGUAGE: Plain text
CODE:
```text
# 1. Open the base URL printed by npm start (e.g., http://localhost:8080)
# 2. Click index.html in the directory listing (or browse to the app path shown in console)
# 3. In the app, click "Manage Products" to load the List Report -> Object Page UI
```

STEP: 6 — Use the mock OData endpoint with SAP Fiori tools Application Generator
DESCRIPTION: In SAP Fiori tools (Application Generator), when prompted for an OData service, paste the Combined OData URL (from STEP 4). Proceed through generator inputs to create or test an LROP V2 application against the local mock data.
LANGUAGE: Plain text
CODE:
```text
# In the SAP Fiori tools Application Generator:
# - Service URL: <Combined OData URL from STEP 4>
# - Follow generator prompts to scaffold an LROP V2 application
```

STEP: 7 — Project file paths and quick references
DESCRIPTION: Important repository path and files for quick inspection and modification.
LANGUAGE: Plain text
CODE:
```text
# Key project folder (relative to repository root)
fiori-tools-samples/V2/products-review

# Files to inspect or customize
- package.json              # npm scripts and dependencies
- src/                      # application source (UI5/Fiori elements artifacts)
- mockserver/               # mock data and server configuration (if present)
- index.html                # entry page shown when accessing the base URL
```

STEP: 8 — Notes and troubleshooting
DESCRIPTION: Basic troubleshooting tips: ensure you ran npm install, confirm npm start logs URL & Service Path, and use the exact concatenation of those values as the OData endpoint.
LANGUAGE: Plain text
CODE:
```text
# Troubleshooting checklist:
# - Confirm you are in fiori-tools-samples/V2/products-review when running npm install/npm start
# - If no URL/Service Path appears, look for server or mockserver logs in the console
# - Use the exact printed URL + Service Path (watch for trailing slashes)
# - If ports conflict, stop other local servers or change the port via environment/config if supported
```
--------------------------------

**TITLE**: Sales Order (Generated SAP Fiori Elements App) — Start & Metadata

**INTRODUCTION**: Quick reference for starting the generated SAP Fiori Elements app and for programmatic access to the generation metadata. Use these steps to run the app locally (regular or mock), verify prerequisites, and install the ESLint plugin used by the project.

**TAGS**: fiori-samples, sap-fiori-elements, UI5, OData, npm, eslint, mock-data

**STEP**: 1 — Generated application metadata (machine-readable)
**DESCRIPTION**: Copy this JSON object into your automation, test harness, or generator-lookup table to preserve all generation metadata (generator, platform, floorplan, service URL, UI5 details, and more).
**LANGUAGE**: JSON
**CODE**:
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
  "eslintConfigurationAdded": true,
  "eslintPlugin": "https://www.npmjs.com/package/eslint-plugin-fiori-custom",
  "mainEntity": "SalesOrder"
}
```

**STEP**: 2 — Start the generated app (development)
**DESCRIPTION**: From the project's root folder run the start script that the generator created. This launches the app in development mode using the configured backend/service URL.
**LANGUAGE**: Bash
**CODE**:
```bash
# Change to the generated app root folder (if not already there)
cd /path/to/your/generated/salesorder

# Start the app (development)
npm start
```

**STEP**: 3 — Start the generated app using mock data
**DESCRIPTION**: Run the project's mock server script to run the app against generated mock data that reflects the OData Service URL used during generation. Useful for offline development and UI testing.
**LANGUAGE**: Bash
**CODE**:
```bash
# From the project root
npm run start-mock

# The mock server uses the OData metadata and annotations generated during scaffolding.
# Mock data is meant to mirror:
# https://sapes5.sapdevcenter.com/sap/opu/odata4/sap/ze2e001/default/sap/ze2e001_salesorder/0001/
```

**STEP**: 4 — Verify Node / NPM prerequisites
**DESCRIPTION**: Ensure an active Node.js LTS version and its supported npm are installed. Use these commands to check installed versions. If needed, install/switch Node versions (nvm example shown).
**LANGUAGE**: Bash
**CODE**:
```bash
# Check Node and npm versions
node -v
npm -v

# Optional: use nvm to switch to Node LTS
# nvm install --lts
# nvm use --lts
```

**STEP**: 5 — ESLint configuration (install plugin used by the project)
**DESCRIPTION**: The project includes ESLint configuration using the eslint-plugin-fiori-custom ruleset. Install the plugin as a dev dependency if you need to reproduce the linting environment or CI checks.
**LANGUAGE**: Bash
**CODE**:
```bash
# Install the ESLint plugin referenced by the generated project
npm install --save-dev eslint-plugin-fiori-custom

# Reference / documentation:
# https://www.npmjs.com/package/eslint-plugin-fiori-custom
```
--------------------------------

**TITLE**: SAP Fiori Elements Incidents Management — Preview & Setup

**INTRODUCTION**: Sample SAP Fiori Elements (OData V4) app for managing incidents. This guide provides concise, action-oriented steps to prepare the workspace, install dependencies, and preview the application using SAP Fiori tools in SAP Business Application Studio or Visual Studio Code.

**TAGS**: fiori-samples, sap-fiori, odata-v4, list-report, incidents, fiori-tools, vscode, business-application-studio

**STEP**: 1 — Prerequisites

**DESCRIPTION**: Ensure your environment has the required tools and extensions installed before opening the project:
- Node.js and npm installed.
- Visual Studio Code or SAP Business Application Studio.
- SAP Fiori tools extension (for VS Code: "SAP Fiori tools" / "Fiori tools - Application Preview").
- Familiarize with the tutorial and tool documentation linked below.

Documentation links:
- Tutorial: https://developers.sap.com/group.fiori-tools-odata-v4-incident.html
- SAP Fiori tools docs: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html

**LANGUAGE**: Plain text

**CODE**:
```text
Prerequisites:
- Node.js (https://nodejs.org/)
- Visual Studio Code or SAP Business Application Studio
- Install "SAP Fiori tools" extension in VS Code (for local preview)
```

**STEP**: 2 — Clone repository (if not already cloned)

**DESCRIPTION**: Clone the project repository and change into the project folder. Replace <REPO_URL> with the repository URL.

**LANGUAGE**: Shell

**CODE**:
```bash
# clone repository (replace with actual repo URL)
git clone <REPO_URL>

# change into the project workspace root
cd fiori-elements-incidents-management
```

**STEP**: 3 — Open workspace in your IDE

**DESCRIPTION**: Open the fiori-elements-incidents-management folder as the workspace root in your IDE.

**LANGUAGE**: Shell / UI

**CODE**:
```bash
# open the current folder in VS Code (if using VS Code)
code .
```
UI action (SAP Business Application Studio or VS Code):
- Open the IDE → File → Open Folder → select the fiori-elements-incidents-management folder.

**STEP**: 4 — Install dependencies

**DESCRIPTION**: Install npm dependencies at the project root. Run this once after cloning or when dependencies change.

**LANGUAGE**: Shell

**CODE**:
```bash
# install project dependencies
npm install
```

**STEP**: 5 — Preview the application using SAP Fiori tools

**DESCRIPTION**: Use the SAP Fiori tools extension to run the application preview. In VS Code use the Fiori tools view; in Business Application Studio use the SAP Fiori launchpad preview.

Actions:
- In VS Code: click the "SAP Fiori" icon on the left activity bar → right-click the project → select "Preview Application".
- In Business Application Studio: use the "Preview Application" command from the SAP Fiori tools panel.

**LANGUAGE**: Plain text

**CODE**:
```text
VS Code UI steps:
1. Click "SAP Fiori" in the left activity bar.
2. Right-click the "fiori-elements-incidents-management" project.
3. Select "Preview Application".

Business Application Studio:
- Use the SAP Fiori tools panel and select "Preview Application" for the project.
```

**STEP**: 6 — Troubleshooting & further learning

**DESCRIPTION**: If preview fails, verify node/npm versions, ensure SAP Fiori tools extension is installed and active, and confirm the current folder is the project root. For a step-by-step build guide and learning material, follow the tutorial link.

**LANGUAGE**: Plain text

**CODE**:
```text
If preview fails:
- Confirm Node.js and npm are installed and on PATH.
- Run `npm install` again to ensure dependencies are present.
- Ensure the opened folder is: fiori-elements-incidents-management
- Confirm SAP Fiori tools extension is installed and enabled.

Learn more:
- Tutorial: https://developers.sap.com/group.fiori-tools-odata-v4-incident.html
- Fiori tools docs: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html
```
--------------------------------

**TITLE**: Incidents Management — Run & Metadata (SAP Fiori Elements / CAP)

**INTRODUCTION**: Quick-reference for launching the generated "Incidents Management" Fiori Elements app (List Report Page V4) backed by a local CAP service. Contains project metadata, service endpoints, example commands to start the CAP backend or run the app with mock data, and quick prerequisite checks.

**TAGS**: fiori-samples, sap-fiori, fiori-elements, cap, ui5, odata, incidents, sap-fe

STEP: 1 — Project Metadata (machine-friendly)
DESCRIPTION: Project and generation metadata extracted from the generated application. Use this JSON object in automation scripts or to populate environment/config files.
LANGUAGE: JSON
CODE:
```json
{
  "generationDate": "Fri Dec 09 2024 13:43:41 GMT+0000 (Coordinated Universal Time)",
  "appGenerator": "@sap/generator-fiori-elements",
  "appGeneratorVersion": "1.8.3",
  "generationPlatform": "SAP Business Application Studio",
  "templateUsed": "List Report Page V4",
  "serviceType": "Local Cap",
  "serviceURL": "http://localhost:4004/incident/",
  "moduleName": "incidents",
  "applicationTitle": "Incidents Management",
  "namespace": "sap.fe.demo",
  "ui5Theme": "sap_horizon",
  "ui5Version": "1.108.0",
  "enableCodeAssistLibraries": false,
  "enableTypeScript": false,
  "addEslintConfiguration": false,
  "mainEntity": "Incidents",
  "navigationEntity": "None",
  "appStartUrl": "http://localhost:4004/incidents/webapp/index.html"
}
```

STEP: 2 — Start CAP backend (examples)
DESCRIPTION: Start the local CAP service that serves the OData endpoint. Use the command that matches your project setup. Run from the project root (where package.json and srv/ exist).
LANGUAGE: Shell
CODE:
```bash
# Option A: If project uses SAP Cloud Application Programming model CLI
# (recommended when @sap/cds is available)
cd /path/to/project/root
# start/logging with live-reload
cds watch

# Option B: If npm start script is available (common for generated projects)
npm start

# After backend is running, open the application in your browser:
# (Application index generated by the template)
http://localhost:4004/incidents/webapp/index.html
```

STEP: 3 — Run the application with mock data
DESCRIPTION: Launch the app in mock mode using the shipped script. This simulates the OData service used during generation.
LANGUAGE: Shell
CODE:
```bash
# Run from the generated app root folder
npm run start-mock
```

STEP: 4 — Service endpoint and app paths
DESCRIPTION: Key endpoints and file paths for integration and automation.
LANGUAGE: JSON
CODE:
```json
{
  "odataServiceUrl": "http://localhost:4004/incident/",
  "appIndexHtml": "/incidents/webapp/index.html",
  "fullAppUrl": "http://localhost:4004/incidents/webapp/index.html",
  "moduleFolder": "incidents"
}
```

STEP: 5 — Prerequisites and quick checks
DESCRIPTION: Verify Node and npm prerequisites before starting the app.
LANGUAGE: Shell
CODE:
```bash
# Verify Node (LTS) and npm versions
node --version
npm --version

# If using @sap/cds commands (optional)
# Install/verify cds globally or as dev dependency
npm install --save-dev @sap/cds
# then use
npx cds --version
```

STEP: 6 — Quick troubleshooting notes
DESCRIPTION: Common issues and quick remediation steps when the app or service fails to start.
LANGUAGE: Shell
CODE:
```bash
# If port 4004 is in use, find and stop the process (example for Linux/macOS)
lsof -i :4004
kill <pid>

# If OData endpoint returns 404:
curl -i http://localhost:4004/incident/

# If mock script fails, inspect package.json for 'start-mock' script
cat package.json | jq '.scripts["start-mock"]'
```
--------------------------------

**TITLE**: SAP Fiori Elements List Report (Products) — Sample App Setup and Preview

**INTRODUCTION**: Quick, action-oriented guide to prepare, install dependencies, and preview the SAP Fiori Elements list report sample app (Products) that uses OData V2. Use this to get the sample running in SAP Business Application Studio (BAS) or Visual Studio Code with SAP Fiori tools and to preview live data from the SAP Gateway Demo ES5 system or using mock data.

**TAGS**: fiori-samples, sap-fiori, fiori-elements, odata-v2, sap-business-application-studio, visual-studio-code, application-modeler

**STEP**: 1 — Prerequisites: SAP Gateway Demo (ES5) access and Fiori tools
**DESCRIPTION**: Ensure you have access to the SAP Gateway Demo system (ES5) to preview live backend data. Also confirm you have SAP Fiori tools installed in your IDE (BAS or VS Code). If you need ES5 access, follow the signup tutorial.
**LANGUAGE**: text
**CODE**:
```text
SAP Gateway Demo (ES5) signup tutorial:
https://developers.sap.com/tutorials/gateway-demo-signup.html

SAP Fiori tools documentation:
https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html

Developer tutorial for building this app:
https://help.sap.com/docs/link-disclaimer?site=https%3A%2F%2Fdevelopers.sap.com%2Fgroup.fiori-tools-lrop.html
```

**STEP**: 2 — Clone repository and open the app folder
**DESCRIPTION**: Clone the repository (replace <repo-url>) and open the sample app folder (example folder name: myfioriapp). Use BAS or VS Code. In VS Code, use `code .` to open the folder in the current window.
**LANGUAGE**: shell
**CODE**:
```bash
# clone repo (replace <repo-url> with actual repository URL)
git clone <repo-url>

# change into the sample app folder (example folder name: myfioriapp)
cd myfioriapp

# (optional) open the folder in VS Code
code .
```

**STEP**: 3 — Install npm dependencies
**DESCRIPTION**: From the app folder (myfioriapp) open a terminal and run npm install to install project dependencies required by the Fiori app.
**LANGUAGE**: shell
**CODE**:
```bash
# from within the app folder (myfioriapp)
npm install
```

**STEP**: 4 — Open SAP Fiori tools Application Modeler
**DESCRIPTION**: In BAS or VS Code, switch to the SAP Fiori view. Open the Application Modeler (left activity bar: "SAP Fiori"). Right-click the app name in the Application Modeler view to open the Application Info page and review Application Status actions (e.g., check connection, required roles, routing).
**LANGUAGE**: text
**CODE**:
```text
1. In the left Activity Bar, click "SAP Fiori"
2. In "Application Modeler" view, locate your app (myfioriapp)
3. Right-click app name -> "Application Info"
4. Under "Application Status", review and perform any suggested actions
```

**STEP**: 5 — Preview the application (live backend or mock data)
**DESCRIPTION**: Use the Application Modeler to preview the app. Right-click the app name and select "Preview Application". Choose "start" to preview using live data from the backend (requires ES5 credentials), or choose "start-mock" to preview with mock data.
**LANGUAGE**: text
**CODE**:
```text
1. In "Application Modeler", right-click your app -> "Preview Application"
2. Choose:
   - "start"       -> Launch preview with live OData V2 backend (ES5). Ensure backend destination/credentials are configured.
   - "start-mock"  -> Launch preview using generated mock data (no backend required)
3. Follow prompts to open the preview in a new browser tab or in the IDE preview window
```

**STEP**: 6 — Troubleshooting and next steps
**DESCRIPTION**: If preview fails, verify:
- ES5 account credentials and destination configuration (if using live data)
- Network/proxy settings in the IDE
- Required SAP Fiori tools extensions are installed
Refer to the SAP Fiori tools docs and the tutorial linked above for build and debug steps.
**LANGUAGE**: text
**CODE**:
```text
Common checks:
- Confirm ES5 demo user and password
- Confirm destination configuration points to ES5
- Re-run `npm install` if dependencies are missing
- Check browser console and terminal logs for errors
```
--------------------------------

**TITLE**: SAPUI5 Freestyle Product Manager — Setup and Preview with SAP Fiori Tools

**INTRODUCTION**: Quick, code-focused instructions to clone, install, and preview the SAPUI5 freestyle sample "Product Manager" app using SAP Fiori tools (VS Code or SAP Business Application). Includes required prerequisites, file paths, and terminal commands.

**TAGS**: fiori-samples, sapui5, sap-fiori-tools, vscode, sample-app, product-management, freestyle

**STEP**: 1 — Prerequisites

**DESCRIPTION**: Ensure your environment has the required software and extensions before opening the app in SAP Fiori tools.

**LANGUAGE**: Text

**CODE**:
```text
Required:
- Node.js (LTS recommended)
- npm (comes with Node.js)
- Visual Studio Code OR SAP Business Application Studio
- SAP Fiori tools extension(s) installed in VS Code (Application Modeler / Fiori tools)
- Network access to the cloned repository or SAP system (if applicable)

Documentation links:
- App tutorial: https://developers.sap.com/group.cp-frontend-ui5-1.html
- SAP Fiori tools getting started: https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/2d8b1cb11f6541e5ab16f05461c64201.html
```

**STEP**: 2 — Clone repository (adjust URL)

**DESCRIPTION**: Clone the repository containing the sample app. Replace <repo-url> with the actual repository URL. This creates a local folder (example folder name: myfioriapp).

**LANGUAGE**: Bash

**CODE**:
```bash
# clone the repository (replace <repo-url> with actual URL)
git clone <repo-url>

# change into the application folder (example folder name)
cd myfioriapp
```

**STEP**: 3 — Install npm dependencies

**DESCRIPTION**: From the application's root folder (e.g., myfioriapp) open a terminal and run npm install to install dependencies required by the SAPUI5 app.

**LANGUAGE**: Bash

**CODE**:
```bash
# from the app root (myfioriapp)
npm install
```

**STEP**: 4 — Verify package.json (optional)

**DESCRIPTION**: Inspect package.json to see available npm scripts. The Application Modeler preview uses a "start" option; if a "start" script exists you can run it directly as an alternative to using the UI preview.

**LANGUAGE**: Bash/JSON

**CODE**:
```bash
# print scripts section of package.json
cat package.json | sed -n '1,120p'  # or open package.json in editor

# Example: run start script if present
npm run start
```

**STEP**: 5 — Open app in VS Code / SAP Business Application Studio

**DESCRIPTION**: Open the cloned folder in VS Code or SAP Business Application Studio. Use the SAP Fiori tools activity view to access Application Modeler.

**LANGUAGE**: Text

**CODE**:
```text
# In VS Code:
1. File -> Open Folder -> select <path>/myfioriapp
2. Open the SAP Fiori tools activity view (left activity bar -> "SAP Fiori")
3. In Application Modeler, locate the app name entry for this project
```

**STEP**: 6 — Check Application Info and Application Status

**DESCRIPTION**: Right-click the app entry in Application Modeler -> "Application Info" to open the Application Info page. Review and perform actions under "Application Status" if required (e.g., resolve missing configuration or service connections).

**LANGUAGE**: Text

**CODE**:
```text
# UI steps:
- Right click on the app name in Application Modeler
- Select "Application Info"
- Inspect fields in "Application Status" and perform suggested actions (if any)
```

**STEP**: 7 — Preview the application (SAP Fiori tools)

**DESCRIPTION**: Use Application Modeler to preview the app. Right-click app name -> "Preview Application" -> choose "start" to launch the preview. This uses the Fiori tools local preview server to serve the UI5 application.

**LANGUAGE**: Text

**CODE**:
```text
# UI steps to preview:
- In Application Modeler, right click on the app name
- Select "Preview Application"
- Choose the "start" preview option
# Optional alternative (if package.json has "start"):
npm run start
# Then open the provided URL (usually http://localhost:8080 or as shown in terminal)
```

**STEP**: 8 — Troubleshooting tips

**DESCRIPTION**: Common checks if preview fails: ensure Node/npm versions, verify dependency install, check Application Status in Application Modeler, and confirm no port conflicts. Consult Fiori tools documentation linked above.

**LANGUAGE**: Text

**CODE**:
```text
Troubleshooting checklist:
- Node and npm installed and in PATH
- npm install completed without errors
- No port conflicts (if preview server fails to start)
- Application Status shows no missing configs or broken targets
- Check developer console and terminal logs for detailed error messages
```
--------------------------------

**TITLE**: Get Started with SAP Cloud Application Programming Model (CAP) using Fiori tools

**INTRODUCTION**: Practical, code-focused steps to run, build and deploy the CAP sample projects (with different approuter configurations) included in this repository. Includes local development, MTA build & Cloud Foundry deployment, running standalone approuter, hybrid CDS profile handling, and creating a SAP BTP Destination to expose CAP services. Use these commands and file paths to reproduce or adapt the samples.

**TAGS**: sap, cap, fiori, cloud-foundry, hana, xsuaa, approuter, mta, destination, sap-btp, cds, nodejs

**STEP**: 1 — Clone repository and locate CAP sample projects

**DESCRIPTION**: Clone the repository containing the CAP + Fiori sample projects and list the sample directories referenced in this documentation.

**LANGUAGE**: Bash

**CODE**:
```bash
# Clone the repository that contains these samples (replace <REPO_URL> with the repo URL)
git clone <REPO_URL> cap-fiori-samples
cd cap-fiori-samples

# Confirm the CAP sample folders referenced below exist
ls -d cap/cap-fiori-mta cap/cap-fiori-mta-standalone cap/cap-fiori-hybrid cap/destination
```

**STEP**: 2 — Run a CAP project locally (generic instructions)

**DESCRIPTION**: Install npm dependencies and run a CAP service locally using the CDS CLI. This uses the default SQLite persistence for local testing. Use cds watch to auto-reload while developing.

**LANGUAGE**: Bash

**CODE**:
```bash
# Change into a sample CAP project (example: managed approuter sample)
cd cap/cap-fiori-mta

# Install dependencies
npm install

# Run locally with live-reload and default SQLite DB
npx cds watch

# Alternative: build and run the Node.js service directly (without watch)
npx cds build
node srv/server.js   # if package.json provides this entry
```

**STEP**: 3 — Build MTA archive for Cloud Foundry (Managed Approuter)

**DESCRIPTION**: For projects that use a managed approuter and are packaged as an MTA, use the mbt tool to build an .mtar and then deploy to Cloud Foundry. Ensure your mta.yaml contains required modules and resource/service definitions (HANA, XSUAA, HTML5 runtime).

**LANGUAGE**: Bash

**CODE**:
```bash
# Install MBT (Multi-Target Application Build Tool)
npm install -g @sap/mbt

# From the root of the managed-approuter project
cd cap/cap-fiori-mta

# Build MTA archive (creates mta_archives/<app>.mtar)
mbt build

# Login to Cloud Foundry and target org/space
cf login -a https://api.<CF_API_ENDPOINT> -u <USER> -p <PASSWORD> -o <ORG> -s <SPACE>

# Deploy the generated .mtar (force overwrite with -f if needed)
cf deploy mta_archives/<your-app-name>.mtar -f
```

**STEP**: 4 — Deploy a standalone approuter project (in-memory/database-less or SQLite)

**DESCRIPTION**: The standalone approuter sample runs without the MTA packaging; it can be pushed directly to Cloud Foundry (cf push) or run locally. Use an in-memory/SQLite DB for simple testing; update package.json or manifest.yml as needed for CF deployment.

**LANGUAGE**: Bash

**CODE**:
```bash
# Change to standalone project
cd cap/cap-fiori-mta-standalone

# Install dependencies
npm install

# Run locally
npx cds watch

# To deploy to Cloud Foundry without MTA packaging:
# Ensure a manifest.yml exists in the project root (app name, memory, buildpack, env)
cf push

# Example minimal manifest.yml fragment inside this project (create if absent):
# ---
# applications:
# - name: cap-fiori-standalone
#   memory: 512M
#   buildpacks:
#     - nodejs_buildpack
#   command: npm start
```

**STEP**: 5 — Managed Approuter with CDS Hybrid Profile (HANA + XSUAA on SAP BTP)

**DESCRIPTION**: Use the hybrid profile to support both local development and cloud-bound HANA + XSUAA services. The project typically contains a cds configuration (package.json/cds-config.json or @sap/cds settings) and an mta.yaml that binds to HANA and XSUAA. Build and deploy via mbt as in Step 3. Locally, override service bindings by using environment variables or default-env.json.

**LANGUAGE**: Bash / JSON

**CODE**:
```bash
# Example: run hybrid profile locally using environment defaults (project: cap/cap-fiori-hybrid)
cd cap/cap-fiori-hybrid
npm install

# Use local SQLite for testing, or set environment variables to connect to a remote HANA
# Example: set CDS to use hana when running in cloud, else sqlite for local runs
export CDS_ENV_PATH=default-env.json   # if your project uses this pattern

# Start locally
npx cds watch

# Build and deploy to BTP Cloud Foundry (same mbt and cf flow)
mbt build
cf deploy mta_archives/<your-hybrid-app>.mtar -f
```

**STEP**: 6 — Create a SAP BTP Destination to expose CAP services

**DESCRIPTION**: Configure a Destination in SAP BTP that points to a deployed CAP app route so other BTP apps or subaccounts can consume the CAP OData endpoints. You can create destinations in the BTP Cockpit or via the BTP CLI. This example shows a destination JSON and a CLI-style creation (conceptual). Check ../cap/destination/README.md for cross-subaccount/region details.

**LANGUAGE**: JSON / Bash

**CODE**:
```json
// Example destination JSON (use BTP Cockpit or API to create)
{
  "Name": "my-cap-service-destination",
  "Type": "HTTP",
  "URL": "https://<your-cap-app-route>",
  "ProxyType": "Internet",
  "Description": "Destination exposing CAP OData services",
  "Authentication": "NoAuthentication"     // or OAuth2SAMLBearerAssertion / OAuth2UserTokenExchange depending on your security
}
```

```bash
# Conceptual CLI flow using BTP/CF tooling (replace placeholders accordingly)

# 1) Create a destination service instance in the subaccount (Cloud Foundry destination service plan)
cf create-service destination lite destination-instance

# 2) Bind the destination service to a Cloud Foundry space or app (if required)
cf bind-service <app-name> destination-instance

# 3) Alternatively, create destination in the BTP Cockpit:
#    - Navigate to Subaccount -> Connectivity -> Destinations -> New Destination
#    - Paste the JSON fields (Name, URL, Authentication, etc.)
```

**STEP**: 7 — References, diagnostics and continuous delivery notes

**DESCRIPTION**: Preserve links to documentation, blog post and CI/CD resources for deeper guidance and deployment automation.

**LANGUAGE**: Plain text / URLs

**CODE**:
```text
# Official CAP docs and examples
https://cap.cloud.sap/docs/

# Blog post used to generate these projects (select approuter/HTML5 runtime)
https://blogs.sap.com/2022/02/10/build-and-deploy-a-cap-project-node.js-api-with-a-sap-fiori-elements-ui-and-a-managed-approuter-configuration/

# Continuous Integration / Delivery tutorial (video)
https://www.youtube.com/watch?v=gvWSHSZFPok

# Sample project folders referenced in this repo:
cap/cap-fiori-mta/           # Managed Approuter + HANA Cloud service
cap/cap-fiori-mta-standalone/ # Standalone Approuter + in-memory/SQLite DB
cap/cap-fiori-hybrid/       # Managed Approuter with CDS hybrid profile (HANA + XSUAA)
cap/destination/            # Create SAP BTP Destination exposing CAP services

# License
/LICENSES/Apache-2.0.txt  # Apache Software License, version 2.0
```

--------------------------------

**TITLE**: Get Started with SAP CAP + Fiori Elements using Managed Approuter and Hybrid Profile (Cloud Foundry)

**INTRODUCTION**: Quick, action-oriented guide to develop, test, and run a SAP Cloud Application Programming Model (CAP) project with a Fiori Elements UI on Cloud Foundry using a managed approuter and CAP hybrid profile. Enables “production-near” testing: use real HANA HDI and XSUAA services locally via bindings and a local approuter that fetches valid tokens.

**TAGS**: fiori, cap, hybrid, cloud-foundry, approuter, hana, xsuaa, sap-btp, fiori-elements

**STEP**: Prerequisites
**DESCRIPTION**: Ensure cloud services, trial account and dev workspace exist before proceeding.
**LANGUAGE**: text
**CODE**:
```
Required:
- SAP Cloud Platform trial account: https://account.hana.ondemand.com/
- Subscribe to Launchpad Service: https://developers.sap.com/tutorials/cp-portal-cloud-foundry-getting-started.html
- Create SAP HANA Cloud Service instance and ensure it is running:
  https://developers.sap.com/tutorials/btp-app-hana-cloud-setup.html
- Create a dev workspace using "Full Stack Cloud Application" (SAP Business Application Studio or VS Code dev space)
```

**STEP**: Clone repository and open project
**DESCRIPTION**: Clone the sample repo and change into the CAP hybrid project folder.
**LANGUAGE**: bash
**CODE**:
```bash
git clone https://github.com/SAP-samples/fiori-tools-samples.git
cd fiori-tools-samples/cap/cap-fiori-hybrid
```

**STEP**: Login to Cloud Foundry (CF)
**DESCRIPTION**: Authenticate to Cloud Foundry; you can use the IDE Command Palette (CF: Login to Cloud Foundry) or CLI.
**LANGUAGE**: bash
**CODE**:
```bash
# CLI example
cf login -a https://api.<region>.cf.cloud.sap -u <EMAIL> -o <ORG> -s <SPACE>
```

**STEP**: Install dependencies
**DESCRIPTION**: Install app dependencies used by npm scripts in the project.
**LANGUAGE**: bash
**CODE**:
```bash
# From project root
npm run install:app
```

**STEP**: Build and deploy CAP and Fiori UI
**DESCRIPTION**: Build local artifacts and push to Cloud Foundry. This creates HANA/XS UAA bindings used later by hybrid mode.
**LANGUAGE**: bash
**CODE**:
```bash
# Build apps
npm run build

# Deploy CAP and Fiori apps to Cloud Foundry
npm run deploy
```

**STEP**: Update XSUAA (xs-security) service on CF
**DESCRIPTION**: Deploy or update the XSUAA service instance configuration defined in xs-security.json. Ensure the roles in xs-security.json are assigned to your BTP user.
**LANGUAGE**: bash
**CODE**:
```bash
# Update UAA configuration
npm run cf:uaa:update

# Manual step: assign roles to your user in SAP BTP Cockpit under Security -> Role Collections
# Follow: https://cap.cloud.sap/docs/node.js/authentication#auth-in-cockpit
```

**STEP**: Push initial data to HANA
**DESCRIPTION**: Edit sample CSV file(s) in the data/ folder if needed, then deploy data to the HANA HDI container created during deploy.
**LANGUAGE**: bash
**CODE**:
```bash
# Edit CSV files in ./data/ before running
# Push data to HANA HDI
npm run deploy:hana
```

**STEP**: Create local service bindings for hybrid mode
**DESCRIPTION**: Generate local binding file (~/.cds-services.json) that references the deployed managed services (XSUAA and HDI). The cds bind commands create local bindings pointing to the CF service instances.
**LANGUAGE**: bash
**CODE**:
```bash
# Bind to XSUAA service instance (name used in deploy)
cds bind -2 managedAppCAPProject-xsuaa-service --kind xsuaa

# Bind to HANA HDI service instance
cds bind -2 managedAppCAPProject-db
```

**STEP**: Run CAP in hybrid mode (connects to deployed HANA and XSUAA)
**DESCRIPTION**: Start the CAP app in hybrid mode. At this stage it will use the created ~/.cds-services.json bindings to connect to cloud services.
Do NOT accept any non-authenticating "Open in a New Tab" prompt from the IDE browser preview.
**LANGUAGE**: bash
**CODE**:
```bash
# Start CAP in hybrid watch mode
npm run watch:hybrid
```
**CODE**:
```text
# Expected console output indicating HANA connectivity
[cds] - connect using bindings from: { registry: '~/.cds-services.json' }
[cds] - connect to db > hana {
  ... (connection details)
}
```

**STEP**: Install and start local approuter (localrouter)
**DESCRIPTION**: The local approuter (localrouter) fetches valid tokens from the deployed XSUAA and attaches them to outgoing requests, routing HTTP traffic to deployed HANA/XSUAA—this simulates production behavior locally.
**LANGUAGE**: bash
**CODE**:
```bash
# Install local approuter dependencies
npm run install:localrouter

# Start the local approuter using cds bind exec (ensures bindings are available)
cds bind --exec -- npm start --prefix localrouter
# The local approuter will start on port 5001 by default
```

**STEP**: Open the application through the localrouter
**DESCRIPTION**: Use your IDE port preview or a browser to open the localrouter endpoint and navigate to the Fiori UI app path. Use port 5001.
**LANGUAGE**: text
**CODE**:
```
# In VS Code: View -> Ports: Preview -> select port 5001
# Or open in browser: http://localhost:5001/<fiori-app-path>
# Then select the Fiori UI application from the approuter landing page
```

**STEP**: Edit sample data (optional)
**DESCRIPTION**: Modify CSV sample data files stored in the data folder and redeploy to HANA when needed.
**LANGUAGE**: text
**CODE**:
```
Path: ./data/*.csv
# After editing:
npm run deploy:hana
```

**STEP**: Troubleshooting — Forbidden error on Fiori UI
**DESCRIPTION**: If the Fiori UI shows "Application could not be started due to technical issues. Forbidden", ensure your BTP user is assigned to the role used by the app (e.g., capuser) in the XSUAA role collection.
**LANGUAGE**: text
**CODE**:
```
Symptom:
Application could not be started due to technical issues.
Forbidden

Fix:
1. In SAP BTP Cockpit -> Subaccount -> Security -> Role Collections (or Application Security)
2. Assign your email/user to the role defined in xs-security.json (e.g., capuser)
3. Re-login to obtain a fresh token (restart local approuter or browser session)
See: https://cap.cloud.sap/docs/node.js/authentication#auth-in-cockpit
```

**STEP**: Useful file paths and scripts
**DESCRIPTION**: Reference the important project paths and npm scripts used throughout the workflow.
**LANGUAGE**: text
**CODE**:
```
Project root: fiori-tools-samples/cap/cap-fiori-hybrid

Key files:
- xs-security.json                     # XSUAA role definitions
- package.json                         # npm scripts: install:app, build, deploy, deploy:hana, cf:uaa:update, watch:hybrid, install:localrouter
- data/                                # CSV sample data files to push to HANA
- localrouter/                          # local approuter project folder

Important commands (summary):
npm run install:app
npm run build
npm run deploy
npm run cf:uaa:update
npm run deploy:hana
cds bind -2 <xsuaa-service-name> --kind xsuaa
cds bind -2 <hdi-service-name>
npm run watch:hybrid
npm run install:localrouter
cds bind --exec -- npm start --prefix localrouter
```

**STEP**: Support and License
**DESCRIPTION**: Where to get help and license information.
**LANGUAGE**: text
**CODE**:
```
Support: Use the SAP Community for questions and bug reports:
https://answers.sap.com/tags/9f13aee1-834c-4105-8e43-ee442775e5ce

License:
Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
Apache Software License, version 2.0
See: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Enable CDS Hybrid Mode in a CAP Project with a Fiori UI Frontend (Managed Approuter)

**INTRODUCTION**: This guide shows the exact code and file edits to enable CDS hybrid mode for a CAP project with a SAP Fiori frontend using the Managed Approuter runtime. It adds a local approuter for XSUAA during local development, aligns HDI and XSUAA service keys in mta.yaml, updates xs-security.json for local/cloud OAuth endpoints and scopes, and secures a Catalog service in srv/cat-service.cds.

**TAGS**: fiori, CAP, CDS, hybrid, approuter, xsuaa, hdi, mta, cloud-foundry, hana

**STEP**: 0 — Prerequisites
**DESCRIPTION**: Ensure HANA Cloud DB is provisioned and the CAP + Fiori UI apps are deployed to Cloud Foundry. References: HANA Cloud DB tutorial and blog post used to generate the projects.
**LANGUAGE**: text
**CODE**:
```text
Prerequisites:
- HANA Cloud database is setup and running in your cloud space.
  (See: https://developers.sap.com/tutorials/hana-cloud-create-db-project.html)
- CAP project and SAP Fiori UI application have been generated and deployed to Cloud Foundry
  (Source generation approach reference: blog post used to build these steps).
```

**STEP**: 1 — Edit mta.yaml to align HDI and XSUAA service keys
**DESCRIPTION**: Modify mta.yaml so local and deployed CAP projects share the same HDI instance and so service-keys names align for destination and XSUAA bindings. Apply the three edits below in the appropriate module/resource definitions in your mta.yaml (replace placeholders like managedAppCAPProject and ${service-name} with your project-specific names if necessary).
**LANGUAGE**: YAML
**CODE**:
```yaml
# 1) Append properties -> TARGET_CONTAINER under the db-deployer module
# File: mta.yaml (module: managedAppCAPProject-db-deployer)
- name: managedAppCAPProject-db-deployer
  type: hdb
  path: db
  requires:
    - name: managedAppCAPProject-db
      properties:
        TARGET_CONTAINER: ~{hdi-service-name}

# 2) Update the destination-content module to reference the aligned xsuaa service-key
# File: mta.yaml (module: managedAppCAPProject-destination-content)
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

# 3) Update the db resource to include service-keys and expose hdi-service-name property
# File: mta.yaml (resource: managedAppCAPProject-db)
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

**STEP**: 2 — Add and isolate a local approuter for XSUAA during local development
**DESCRIPTION**: Use the CDS helper to add an approuter, then move the generated router files to a dedicated local router folder. Set the approuter default-env.json to forward requests to your local CAP service (default port 4004) and to run on port 5001.
**LANGUAGE**: Bash / JSON
**CODE**:
```bash
# From your CAP project root:
cds add approuter

# Move generated files into a controlled folder
mkdir -p localrouter
mv app/default-env.json app/package.json app/xs-app.json localrouter/
```

```json
// File: localrouter/default-env.json
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

**STEP**: 3 — Update xs-security.json for local and cloud OAuth endpoints and define scopes/role-templates
**DESCRIPTION**: Add OAuth redirect URIs that support Cloud Foundry, Business Application Studio, and localhost. Add a CAP-specific scope and role-template (capuser) and reference the scope in the role-template. Place these blocks in your xs-security.json (project root or app/srv location as used in your CAP project).
**LANGUAGE**: JSON
**CODE**:
```json
// File: xs-security.json (insert or merge into existing JSON)
{
  "oauth2-configuration": {
    "redirect-uris": [
      "https://**.hana.ondemand.com/**",
      "https://**.applicationstudio.cloud.sap/**",
      "http://localhost:*/**"
    ]
  },
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
  ]
}
```

**STEP**: 4 — Secure the Catalog service with the new capuser role
**DESCRIPTION**: Update your service CDS annotations to require the capuser role instead of the generic authenticated-user. Edit srv/cat-service.cds and replace any @requires: 'authenticated-user' with @(requires: 'capuser').
**LANGUAGE**: CDS
**CODE**:
```cds
// File: srv/cat-service.cds
// Before:
@requires: 'authenticated-user'
service CatalogService {
  // ... entities and actions
}

// After:
@(requires: 'capuser')
service CatalogService {
  // ... entities and actions
}
```
--------------------------------

**TITLE**: Get Started with SAP Cloud Application Programming Model (CAP) using Fiori tools and Managed Approuter

**INTRODUCTION**: Build, run, and deploy a CAP (Cloud Application Programming Model) Node.js API with a Fiori Elements UI and a Managed Approuter configuration hosted on SAP Business Technology Platform (BTP). This project was generated following the blog post: https://blogs.sap.com/2022/02/10/build-and-deploy-a-cap-project-node.js-api-with-a-sap-fiori-elements-ui-and-a-managed-approuter-configuration/ using the "Managed Approuter" HTML5 application runtime.

**TAGS**: CAP, Fiori, Fiori Elements, approuter, managed-approuter, SAP BTP, Cloud Foundry, Cloud MTA, HANA Cloud, cds, npm

**STEP**: 1 - Prerequisites

**DESCRIPTION**: Prepare accounts, services, and development environment required for deploying to Cloud Foundry (CF) and for running locally or in SAP Business Application Studio (SBAS).

**LANGUAGE**: Text

**CODE**:
```text
Required if deploying to Cloud Foundry (CF):
- SAP Cloud Platform trial account: https://account.hana.ondemand.com/
- Subscribe to Launchpad Service: https://developers.sap.com/tutorials/cp-portal-cloud-foundry-getting-started.html
- SAP HANA Cloud Service instance (create or reuse): https://developers.sap.com/tutorials/btp-app-hana-cloud-setup.html#08480ec0-ac70-4d47-a759-dc5cb0eb1d58

SAP Business Application Studio (SBAS) dev workspace:
- Create a "Full Stack Cloud Application" dev workspace:
  https://help.sap.com/viewer/c2b99f19e9264c4d9ae9221b22f6f589/2021_3_QRC/en-US/f728966223894cc28be3ca2ee60ee784.html
```

**STEP**: 2 - Install dependencies and run locally

**DESCRIPTION**: Install npm dependencies, bind/publish your HANA Cloud service (if used), and run the CAP app locally with live-reload. When cds watch starts, open the served Fiori app or the Books service endpoint in the browser.

**LANGUAGE**: Shell

**CODE**:
```shell
# From the project root:
npm ci

# Bind and publish your HANA Cloud Service instance as required (follow HANA Cloud DB tutorials/steps)
# Example references:
# https://developers.sap.com/tutorials/hana-cloud-create-db-project.html

# Start the CAP app in watch mode (builds and serves backend and app)
cds watch

# When prompted by cds watch, choose "Open in New Tab" and select:
# - the Fiori web application, or
# - the "Books" service endpoint
```

**STEP**: 3 - Build and deploy to Cloud Foundry (Option 1: Cloud MTA Build Tool - UI)

**DESCRIPTION**: Build an MTA archive and deploy via the Cloud MTA Build Tool (IDE integration). This is the GUI approach from SAP Business Application Studio or supported IDEs.

**LANGUAGE**: Text

**CODE**:
```text
- If you have changed project files:
  1. Right-click mta.yaml -> "Build MTA Project"
  2. After build completes, locate the archive in:
     mta_archives/managedAppCAPProject_1.0.0.mtar
  3. Right-click that .mtar -> "Deploy MTA Archive"
  4. You will be prompted for Cloud Foundry login details if not already authenticated.
```

**STEP**: 4 - Build and deploy to Cloud Foundry (Option 2: CLI)

**DESCRIPTION**: Use the provided npm scripts to build and deploy the project from the command line. This prompts for CF credentials if not logged in.

**LANGUAGE**: Shell

**CODE**:
```shell
# From the project root:
npm run build && npm run deploy

# This sequence will:
# - build the project artifacts
# - deploy to Cloud Foundry (prompts for CF login if needed)
```

**STEP**: 5 - Verify deployment

**DESCRIPTION**: Confirm the HTML5/Fiori application is deployed either via the CF CLI helper command or via the SAP BTP Cockpit UI.

**LANGUAGE**: Shell

**CODE**:
```shell
# Option 1: Use cf html5-list to get the generated URL
cf html5-list -u -di managedAppCAPProject-destination-service -u --runtime launchpad

# Option 2: In SAP BTP Cockpit:
# - Login to your BTP subaccount
# - Navigate to "HTML5 Applications"
# - Select your deployed Fiori application and open the URL
```

**STEP**: 6 - Undeploy

**DESCRIPTION**: Remove the deployed CAP project from SAP BTP using the provided npm script.

**LANGUAGE**: Shell

**CODE**:
```shell
# From the project root:
npm run undeploy
```

**STEP**: 7 - Support and licensing

**DESCRIPTION**: Where to get help and license details.

**LANGUAGE**: Text

**CODE**:
```text
Get support:
- Ask questions or report issues on the SAP Community: https://answers.sap.com/tags/9f13aee1-834c-4105-8e43-ee442775e5ce

License:
- Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
- Licensed under the Apache Software License, version 2.0 except as noted otherwise in the LICENSE file:
  ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Switch CAP Project from SQLite to SAP HANA (HANA Cloud)

**INTRODUCTION**: Step-by-step changes to switch a CAP-based Fiori sample project from the default SQLite datasource to SAP HANA (HANA Cloud). Includes package.json edits, mta.yaml path update, binding the HDI-shared instance, running local CDS with HANA, deployment notes, and a troubleshooting tip.

**TAGS**: fiori-samples, CAP, cds, HANA, HANA-Cloud, HDI, sqlite, package.json, mta.yaml, deployment

**STEP**: 1 — Prerequisites

**DESCRIPTION**: Ensure you have a running SAP HANA Cloud instance in your cloud space and an HDI-shared instance available. Use the HANA Cloud tutorial to create the DB project and service instance if needed.

**LANGUAGE**: text

**CODE**:
```text
Tutorial: https://developers.sap.com/tutorials/hana-cloud-create-db-project.html
(Ensure HDI-shared instance is provisioned and accessible from your cloud space)
```

**STEP**: 2 — Update package.json "cds" configuration to use HANA

**DESCRIPTION**: Replace or update the "cds" node in your project's package.json to set build tasks for hana, configure hana deploy format, and set required services (db -> hana, uaa -> xsuaa). Save package.json at the project root.

**LANGUAGE**: JSON

**CODE**:
```json
{
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
}
```

**STEP**: 3 — Update mta.yaml module path for DB deployer

**DESCRIPTION**: In mta.yaml locate the module named managedAppCAPProject-db-deployer and update its path from gen/db to db so the HANA build output is used. Save mta.yaml at project root.

**LANGUAGE**: YAML

**CODE**:
```yaml
# Example snippet in mta.yaml: ensure path points to 'db'
modules:
  - name: managedAppCAPProject-db-deployer
    type: hdb
    path: db          # <-- changed from gen/db to db
    requires:
      - name: managedAppCAPProject-db
```

**STEP**: 4 — Bind managedAppCAPProject-db to HDI-shared and publish sample data

**DESCRIPTION**: Using the SAP HANA PROJECTS view (SAP Web IDE / HANA tooling), bind the generated module managedAppCAPProject-db to your deployed HDI-shared instance. Then publish sample data that the CAP build generated. For manual/local CAP binding & publish guidance, refer to the blog post.

**LANGUAGE**: text

**CODE**:
```text
Blog reference: https://blogs.sap.com/2021/01/21/building-hana-opensap-cloud-2020-part-2-project-setup-and-first-db-build/

Steps (summary):
- Open HANA PROJECTS view
- Select your CAP project's DB module (managedAppCAPProject-db)
- Bind it to your existing HDI-shared instance (SharedDevKey or similar)
- Publish (deploy) the content to the HDI container to create tables and sample data
```

**STEP**: 5 — Run local CDS with HANA as datasource

**DESCRIPTION**: Stop any running cds instances and run cds watch from project root. Confirm the console shows connection details for HANA. Open the app in a browser tab (Open in New Tab) and validate services (e.g., CatalogService).

**LANGUAGE**: Bash

**CODE**:
```bash
# Stop existing cds instances (if any)
# Then start watch
cds watch
```

**LANGUAGE**: Bash (console output)

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

**STEP**: 6 — Build and deploy to Cloud Foundry

**DESCRIPTION**: After local validation, re-run your build and deploy steps to push changes to Cloud Foundry. Typical steps include cds build (to regenerate db artifacts) and cf deploy/push as per your CI/CD or mta deploy process.

**LANGUAGE**: Bash

**CODE**:
```bash
# Example local build & mta deploy (adapt to your project scripts)
cds build
# then follow your mta/cf deployment sequence, e.g.:
cf deploy mta_archives/your-mta-file.mtar
# or use your project's deployment scripts
```

**STEP**: 7 — Troubleshooting: .env binding fix

**DESCRIPTION**: If the app fails to connect to HANA (missing bindings locally), copy the generated .env from the db folder to your project root so cds can pick up local environment bindings.

**LANGUAGE**: Bash

**CODE**:
```bash
cp db/.env .
```
--------------------------------

**TITLE**: Add XSUAA Authentication to Catalog API (CAP + Fiori)

**INTRODUCTION**: Step-by-step code-focused changes to secure the Catalog API with XSUAA. Applies to a CAP backend deployed via MTA with a Fiori frontend. Modify routes, package dependencies, CDS service authorization, and mta.yaml module/resource settings to use a static host and bind XSUAA.

**TAGS**: sap, xsuaa, cap, fiori, mta, cds, xs-app.json, destination, authentication, nodejs, cf

**STEP**: Update route to require XSUAA in frontend xs-app.json

**DESCRIPTION**: In the Fiori app router route definition (app/feproject-ui/xs-app.json) change authenticationType from "none" to "xsuaa" for the catalog route so the app router forwards tokens and enforces authentication.

**LANGUAGE**: JSON

**CODE**:
```json
// File: app/feproject-ui/xs-app.json
{
  "authenticationType": "xsuaa",
  "csrfProtection": false,
  "source": "^/catalog/",
  "destination": "cap-catalog-api"
}
```

**STEP**: Add XSUAA and Passport dependencies to root package.json

**DESCRIPTION**: In the project root package.json, add the required libraries so the CAP service can use xsuaa/xssec and passport for authentication.

**LANGUAGE**: JSON

**CODE**:
```json
// File: package.json (root)
{
  "dependencies": {
    "@sap/xsenv": "^4.2.0",
    "@sap/xssec": "^3.6.0",
    "passport": "^0.6.0"
    // ...other existing dependencies
  }
}
```

**STEP**: Require authenticated user in CDS service

**DESCRIPTION**: Protect the Catalog service on the CAP side by requiring an authenticated user. Edit srv/cat-service.cds and add the @requires annotation on the service definition.

**LANGUAGE**: CDS

**CODE**:
```cds
// File: srv/cat-service.cds
@requires: 'authenticated-user'
service CatalogService {
    @readonly entity Books as projection on my.Books;
}
```

**STEP**: Add appname parameter to mta.yaml (Change 1)

**DESCRIPTION**: Add a unique appname in the top-level parameters node to generate a stable static hostname for the service. Pick a unique value per subaccount.

**LANGUAGE**: YAML

**CODE**:
```yaml
# File: mta.yaml
parameters:
  deploy_mode: html5-repo
  enable-parallel-deployments: true
  appname: mycapproject-unique
```

**STEP**: Update managedAppCAPProject-srv module for UAA binding and static host (Change 2)

**DESCRIPTION**: Modify the server module (gen/srv) to require the UAA resource and remove usage of srv-api; set host to ${appname} so the app gets the static hostname.

**LANGUAGE**: YAML

**CODE**:
```yaml
# File: mta.yaml (module section)
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

**STEP**: Update destination resource to use static hostname (Change 3)

**DESCRIPTION**: Change the Catalog API destination URL to point to the static host generated by appname and default-domain. Ensure HTML5.DynamicDestination and HTML5.ForwardAuthToken are enabled so the frontend forwards auth tokens.

**LANGUAGE**: YAML

**CODE**:
```yaml
# File: mta.yaml (resource: managedAppCAPProject-destination-service)
  - Authentication: NoAuthentication
    Name: cap-catalog-api
    ProxyType: Internet
    Type: HTTP
    URL: https://${appname}.${default-domain}
    HTML5.DynamicDestination: true
    HTML5.ForwardAuthToken: true
```

**STEP**: Remove srv-api reference from destination resource (Change 4)

**DESCRIPTION**: The destination resource should no longer reference the previous srv-api; remove that reference so the destination uses the static host URL. (Make sure any references to srv-api under this resource are deleted.)

**LANGUAGE**: YAML

**CODE**:
```yaml
# File: mta.yaml (ensure no 'srv-api' reference remains in this resource)
# Example: remove any entries like:
# - name: srv-api
# that were previously listed under this resource
```

**STEP**: Rebuild and redeploy

**DESCRIPTION**: Validate changes locally if possible, then re-run your build and deploy steps (MBT / cf push / CI pipeline you normally use) to push updates to Cloud Foundry so the Catalog API is secured with XSUAA.

**LANGUAGE**: text

**CODE**:
```text
# Actions to run (example, depending on your project):
# 1. Rebuild MTA and archives: mbt build
# 2. Deploy the MTA to CF / your CI/CD pipeline
# 3. Verify that the Catalog API endpoint is reachable at:
#    https://{appname}.{default-domain}/catalog/
# 4. Confirm authentication is enforced and tokens are forwarded
```
--------------------------------

**TITLE**: Configure a Fiori Elements App to Support SAP Launchpad Service (FLP)

**INTRODUCTION**: Step-by-step actions to add FLP configuration to a Fiori Elements application inside a CAP project, update manifest and i18n, and redeploy to Cloud Foundry so the app can be consumed from an SAP Launchpad Site.

**TAGS**: sap, fiori, launchpad, flp, cap, fiori-elements, manifest, i18n, cloud-foundry

**STEP**: 1 — Change into the Fiori Elements application directory

**DESCRIPTION**: Move into the Fiori Elements app folder inside your CAP project to run the FLP configuration tool.

**LANGUAGE**: bash

**CODE**:
```bash
# From the CAP project root:
cd managedAppCAPProject/app/feproject-ui
```

**STEP**: 2 — Run the FLP configuration generator

**DESCRIPTION**: Execute the @sap/ux-ui5-tooling fiori add flp-config generator via npx. Answer the interactive prompts with values that represent your application. Use the semantic object to represent a business entity (e.g., customer, sales order, product).

**LANGUAGE**: bash

**CODE**:
```bash
# Run the generator from the Fiori app folder:
npx -p @sap/ux-ui5-tooling fiori add flp-config
```

Sample prompt answers to enter when asked (use values for your app):
```text
Semantic Object -> MyFEApplication
Action           -> display
Title            -> List Report Object Page
Subtitle         -> Fiori Application
```

**STEP**: 3 — Verify/merge crossNavigation into manifest.json

**DESCRIPTION**: The generator adds a crossNavigation -> inbounds node to your app manifest so the Launchpad can identify and navigate to the app. Confirm the following JSON snippet is present in your manifest (typically located in managedAppCAPProject/app/feproject-ui/webapp/manifest.json). Merge into your manifest if needed.

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

**STEP**: 4 — Add FLP titles to i18n.properties

**DESCRIPTION**: The generator appends keys to your i18n resource bundle. Confirm these keys (or add them) in your app i18n file, typically at managedAppCAPProject/app/feproject-ui/webapp/i18n/i18n.properties.

**LANGUAGE**: properties

**CODE**:
```properties
flpTitle=List Report Object Page

flpSubtitle=
```

**STEP**: 5 — Rebuild and redeploy to Cloud Foundry

**DESCRIPTION**: Rebuild your CAP project and redeploy the updated Fiori app to Cloud Foundry so the FLP configuration is available in the deployed app. Replace the example commands below with your project’s build/deploy commands if different.

**LANGUAGE**: bash

**CODE**:
```bash
# From CAP project root (example using mbt + cf)
cd managedAppCAPProject

# Build multi-target archive (example)
mbt build

# Deploy the resulting MTAR to Cloud Foundry (example)
cf deploy mta_archives/*.mtar
```

**STEP**: 6 — Subscribe and configure Launchpad Service on SAP BTP

**DESCRIPTION**: Ensure the Launchpad Service is available and configured on your SAP BTP subaccount. Then create a Launchpad Site and add your app tile/target pointing to the semantic object/action you configured.

**LANGUAGE**: text

**CODE**:
```text
- Ensure Launchpad Service is subscribed and configured on your SAP BTP subaccount:
  https://developers.sap.com/tutorials/cp-portal-cloud-foundry-getting-started.html

- Create a Launchpad Site to consume your Fiori Elements app:
  https://developers.sap.com/tutorials/cp-portal-cloud-foundry-create-sitelaunchpad.html

- In the Launchpad Site, add a target mapping or tile that points to:
  Semantic Object = MyFEApplication
  Action          = display
```
--------------------------------

**TITLE**: Get Started with SAP Cloud Application Programming Model (CAP) using Fiori tools and Standalone Approuter

**INTRODUCTION**: Step-by-step, code-focused guide to run, build, deploy, verify, and undeploy a CAP Node.js project with a SAP Fiori Elements UI and a standalone approuter on SAP BTP (Cloud Foundry). Includes local development commands, Cloud Foundry deployment options, xs-security.json notes, and connectivity-service toggle in mta.yaml.

**TAGS**: fiori, CAP, CAPM, BTP, Cloud Foundry, approuter, "Fiori tools", Node.js, cds, deploy, SBAS

**STEP**: 1 - Prerequisites (Cloud Foundry only)

**DESCRIPTION**: Confirm Cloud Foundry prerequisites before deploying: SAP account, Launchpad Service subscription, and the API endpoint for your CF region. You must insert your CF API endpoint into xs-security.json under oauth2-configuration.

**LANGUAGE**: JSON

**CODE**:
```json
{
  "xsappname": "standaloneCAPProject",
  "tenant-mode": "shared",
  "oauth2-configuration": {
    "url": "<CF_API_ENDPOINT>"
  },
  "scopes": [],
  "authorization": {}
}
```
Replace <CF_API_ENDPOINT> with your API endpoint found in the BTP Subaccount overview, e.g.:
https://api.cf.us10-001.hana.ondemand.com

Files referenced:
- xs-security.json (project root)

---

**STEP**: 2 - Create Dev Workspace in SAP Business Application Studio (optional)

**DESCRIPTION**: If using SAP Business Application Studio (SBAS), create a dev workspace using either the "SAP Fiori" or "Full Stack Cloud Application" dev space before opening the project.

**LANGUAGE**: text

**CODE**:
```text
Follow SBAS docs to create a dev workspace:
https://help.sap.com/viewer/c2b99f19e9264c4d9ae9221b22f6f589/2021_3_QRC/en-US/f728966223894cc28be3ca2ee60ee784.html
```

---

**STEP**: 3 - Setup and Run Locally

**DESCRIPTION**: Install dependencies and run the CAP app locally. Use cds watch for live reload and open the Fiori UI or the Books service endpoint.

**LANGUAGE**: Shell

**CODE**:
```shell
# Install dependencies
npm install

# Start CAP in watch mode (build + launch)
cds watch
```
When prompted by the terminal/browser, select "Open in New Tab" then choose the Fiori web application (UI) or the Books service endpoint.

---

**STEP**: 4 - Build & Deploy to Cloud Foundry — Option 1 (Cloud MTA Build Tool - GUI)

**DESCRIPTION**: Use the Cloud MTA Build Tool integrated UI (Business Application Studio or VS Code extension) to build and deploy the MTA. Ensure xs-security.json oauth2-configuration contains the correct CF API endpoint before building.

**LANGUAGE**: text

**CODE**:
```text
1. Ensure xs-security.json.oauth2-configuration.url is set to your CF API endpoint.
2. In the IDE: Right-click mta.yaml -> Build MTA Project.
3. In the IDE: Right-click mta_archives/standaloneCAPProject_1.0.0.mtar -> Deploy MTA Archive.
4. Follow prompts to log in to Cloud Foundry (if required).
```
Files referenced:
- mta.yaml
- mta_archives/standaloneCAPProject_1.0.0.mtar

---

**STEP**: 5 - Build & Deploy to Cloud Foundry — Option 2 (CLI)

**DESCRIPTION**: Use provided npm scripts to build and deploy via CLI. Ensure xs-security.json oauth2-configuration has the CF API endpoint.

**LANGUAGE**: Shell

**CODE**:
```shell
# Build and deploy using project npm scripts
npm run build && npm run deploy
```
After successful deploy, open the second generated application URL, e.g.:
<subdomain>-<space>-standalonecapproject-approuter.cfapps.<api-region>.hana.ondemand.com

---

**STEP**: 6 - Verify Deployment

**DESCRIPTION**: Verify CF deployment either via CLI or BTP Cockpit. Use the CLI command shown to list MTA deployed apps (select the second URL in the output), or inspect the approuter routes in BTP Cockpit.

**LANGUAGE**: Shell

**CODE**:
```shell
# Use CF CLI command provided by the sample to inspect the MTA and URLs
cf mta standaloneCAPProject
```
Alternative: In BTP Cockpit go to Subaccount -> Spaces -> select space -> open deployed approuter app (e.g., standalonecapproject-approuter) and inspect application routes.

---

**STEP**: 7 - Undeploy

**DESCRIPTION**: Remove the deployed CAP project from Cloud Foundry using the project npm script.

**LANGUAGE**: Shell

**CODE**:
```shell
npm run undeploy
```

---

**STEP**: 8 - Known Issues / Enable Connectivity Service

**DESCRIPTION**: To support on-premise connectivity, enable the connectivity resource in mta.yaml by uncommenting the connectivity service configuration named standaloneCAPProject-connectivity. This enables the SAP Connectivity service to connect cloud apps to on-premise systems.

**LANGUAGE**: YAML

**CODE**:
```yaml
# Example mta.yaml resource - uncomment if you require on-prem connectivity
resources:
  - name: standaloneCAPProject-connectivity
    type: org.cloudfoundry.managed-service
    parameters:
      service: connectivity
      service-plan: lite
```
File referenced:
- mta.yaml

---

**STEP**: 9 - Get Support & License

**DESCRIPTION**: Where to get help and project license details.

**LANGUAGE**: text

**CODE**:
```text
Support:
- SAP Community: https://answers.sap.com/tags/9f13aee1-834c-4105-8e43-ee442775e5ce

License:
- Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
- Licensed under Apache Software License, version 2.0
- See LICENSE file: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Application Details — mystandalonecapproject (Fiori Elements List Report Object Page V4)

**INTRODUCTION**: Quick reference and actionable steps to start and run the generated SAP Fiori Elements application "mystandalonecapproject". Includes project metadata, start commands (CAP backend and mock), index.html path, and prerequisites for local development.

**TAGS**: fiori, sap-fiori-elements, cap, ui5, start, mock, npm, cds

**STEP**: 1 — Project metadata (machine-readable)
**DESCRIPTION**: All generation and app configuration details exported as JSON for use in automation or generator tooling.
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
  "mainEntity": "Books"
}
```

**STEP**: 2 — Start CAP backend (open the Fiori app)
**DESCRIPTION**: Start your local CAP backend so the OData service is available at the configured Service URL, then open the Fiori application's index.html. Use the CAP start command appropriate for your project; examples below show common commands.
**LANGUAGE**: Shell
**CODE**:
```bash
# from the CAP project root (example)
# Option A: using npx to run @sap/cds (recommended if @sap/cds is installed locally)
npx cds watch

# Option B: using npm script if your project defines one (check package.json)
npm start

# After backend is running, open the app in your browser:
# App URL:
# http://localhost:4004/mystandalonecapproject/webapp/index.html
```

**STEP**: 3 — Run the generated app with mock data
**DESCRIPTION**: Launch the frontend using the supplied mock data that mirrors the OData service used during generation. Run this command from the generated app folder (mystandalonecapproject) root.
**LANGUAGE**: Shell
**CODE**:
```bash
# change into the generated app folder (if not already there)
cd mystandalonecapproject

# Start the app using mock data (as generated)
npm run start-mock

# Then open:
# http://localhost:4004/mystandalonecapproject/webapp/index.html
```

**STEP**: 4 — Direct file entry (open static index)
**DESCRIPTION**: Location of the built index.html used by the Fiori app; useful for debugging or serving static files.
**LANGUAGE**: Plaintext
**CODE**:
```
Path: mystandalonecapproject/webapp/index.html
Open in browser (when backend or static server running):
http://localhost:4004/mystandalonecapproject/webapp/index.html
```

**STEP**: 5 — Service endpoint used by the app
**DESCRIPTION**: OData service endpoint the app expects when connected to a local CAP backend.
**LANGUAGE**: URL
**CODE**:
```
Service URL: http://localhost:4004/catalog/
Main Entity: Books
```

**STEP**: 6 — Development prerequisites
**DESCRIPTION**: Minimal environment requirements to run and develop the generated application locally.
**LANGUAGE**: Plaintext
**CODE**:
```
1. Active Node.js LTS (Long Term Support) and corresponding supported npm version.
   See: https://nodejs.org

2. For CAP backend: @sap/cds available (global or project-local). Starting examples use `npx cds watch` or project npm scripts.
```

**STEP**: 7 — App generation and development flags (quick reference)
**DESCRIPTION**: Summary of the generation options and flags that affect code and tooling in the generated project.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "ui5Theme": "sap_horizon",
  "ui5Version": "1.102.1",
  "enableCodeAssistLibraries": false,
  "enableTypeScript": false,
  "addEslintConfiguration": false,
  "floorplan": "List Report Object Page V4"
}
```
--------------------------------

**TITLE**: Deploy CAP Project with Fiori UI, In-Memory SQLite, and FLP (Cloud Foundry / Local)

**INTRODUCTION**: Step-by-step, code-focused guide to create a standalone CAP project with an in-memory SQLite DB, add a Fiori UI shell (FLP) and approuter, prepare mta.yaml for deployment, and run locally or deploy to Cloud Foundry. Suitable for SAP Business Application Studio or VSCode.

**TAGS**: CAP, SAP, Fiori, FLP, CloudFoundry, approuter, mta, SQLite, in-memory, cds, UI5

**STEP**: 1 — Prerequisites and environment
**DESCRIPTION**: Ensure you have a Fiori or Full-Stack dev space and install the CDS tools. Decide an MTA id (example: standaloneCAPProject).
**LANGUAGE**: Bash
**CODE**:
```bash
# Ensure CDS Toolkit is installed globally
npm i -g @sap/cds-dk

# Choose an MTA id for the project:
# Example:
MTA_ID=standaloneCAPProject
```

**STEP**: 2 — Initialize CAP project and add samples + MTA
**DESCRIPTION**: Create a new CAP project, change into its folder, add sample data and an MTA descriptor.
**LANGUAGE**: Bash
**CODE**:
```bash
cds init standaloneCAPProject
cd standaloneCAPProject/
cds add samples
cds add mta
```

**STEP**: 3 — Edit package.json: move sqlite3, add libs, and configure in-memory DB
**DESCRIPTION**: Move sqlite3 from devDependencies → dependencies, add @sap/xsenv, @sap/xssec, passport, and add a cds node that configures an in-memory SQLite database and enables the in_memory_db feature.
**LANGUAGE**: JSON
**CODE**:
```json
// package.json -> dependencies (example fragment)
{
  "dependencies": {
    "sqlite3": "^5.0.4",
    "@sap/xsenv": "^4.2.0",
    "@sap/xssec": "^3.6.0",
    "passport": "^0.6.0"
    // ... other dependencies
  },

  // add this "cds" node to package.json root
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

**STEP**: 4 — Adjust mta.yaml build-parameters for production build (copy init data)
**DESCRIPTION**: In the generated mta.yaml, update or add build-parameters to run npm install --production, build CDS for production, and copy db sample data into generated srv folder.
**LANGUAGE**: YAML
**CODE**:
```yaml
# mta.yaml (fragment under the root or module build-parameters scope)
build-parameters:
  before-all:
   - builder: custom
     commands:
      - npm install --production
      - npx -p @sap/cds-dk cds build --production
      - cp -r db/data gen/srv/srv/data
```

**STEP**: 5 — Add UI annotations to srv/cat-service.cds
**DESCRIPTION**: Append UI annotations to the CatalogService Books entity to expose SelectionFields and LineItem metadata for Fiori elements.
**LANGUAGE**: CDS
**CODE**:
```cds
// srv/cat-service.cds - append this annotation block
annotate CatalogService.Books with @(
  UI : {
    SelectionFields: [ title ],
    LineItem: [
      { Value: ID },
      { Value: title },
      { Value: stock }
    ]
  }
){
  ID    @( title: 'ID' );
  title @( title: 'Title' );
  stock @( title: 'Stock' );
};
```

**STEP**: 6 — Install dependencies and validate locally
**DESCRIPTION**: Install node modules and run cds watch to validate the service and UI metadata.
**LANGUAGE**: Bash
**CODE**:
```bash
# from project root
npm install

# run local dev server and watch for changes
cds watch
# Open the service URL printed by cds watch in a browser to validate CatalogService
```

**STEP**: 7 — Create Approuter module (MTA template)
**DESCRIPTION**: In your IDE (Business Application Studio or similar) create an Approuter module from the MTA template. Use Standalone Approuter, enable authentication, and indicate you will add a UI.
**LANGUAGE**: Bash (instructions as commands/comments)
**CODE**:
```bash
# Right-click mta.yaml -> Create MTA Module from Template
# Template choices:
# - Select: Approuter Configuration
# - HTML5 application runtime: Standalone Approuter
# - Add authentication? Yes
# - Do you plan to add a UI? Yes
```

**STEP**: 8 — Create SAP Fiori Application module (MTA template) linked to local CAP
**DESCRIPTION**: Use the MTA template to add a Fiori application module, choose OData service, point to your local CAP project, enable MTA deployment config and FLP config, and configure semantic object/action/title.
**LANGUAGE**: Bash (instructions as commands/comments)
**CODE**:
```bash
# Right-click mta.yaml -> Create MTA Module from Template
# Template choices:
# - Select: SAP Fiori Application
# - Application type & floorplan: (choose Fiori elements List Report/Object Page or your preferred)
# - Use a Local CAP Project: Yes -> point to this CAP project
# - Select: OData Service -> choose Main entity
# - Project name example: mystandalonecapproject
# - Add deployment config to MTA? Yes
# - Add FLP configuration? Yes
# - Choose target: Cloud Foundry
# - Destination: None
# - Semantic Object: MyStandaloneCapProject
# - Action: display
# - Title: The Title of my Standalone App
```

**STEP**: 9 — Add xs-app.json route for the catalog UI
**DESCRIPTION**: In the generated Fiori app approuter folder, add a route at the top of the routes list to forward /catalog/ to the CAP destination (cap-launchpad) without authentication.
**LANGUAGE**: JSON
**CODE**:
```json
// app/mystandalonecapproject/xs-app.json - add as the first route
{
  "authenticationType": "none",
  "csrfProtection": false,
  "source": "^/catalog/",
  "destination": "cap-launchpad"
}
```

**STEP**: 10 — Update mta.yaml: adjust srv module, add destination resource and requires
**DESCRIPTION**: Update the generated srv module attributes (name, type, path, provides, parameters, build-parameters). Add a destination service resource (cap-launchpad) and a service instance resource that configures HTML5Runtime destinations including cap-launchpad. Ensure srv module provides srv-api and other modules require it.
**LANGUAGE**: YAML
**CODE**:
```yaml
# mta.yaml - update existing srv module (replace existing standaloneCAPProject-srv)
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

```yaml
# mta.yaml - destination resource (service instance) example
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

```yaml
# mta.yaml - where a module requires srv-api
requires:
  - name: srv-api
```

**STEP**: 11 — Local development / final checks
**DESCRIPTION**: After edits, re-run npm install if you modified package.json, verify with cds watch, and open the application endpoints in the browser.
**LANGUAGE**: Bash
**CODE**:
```bash
npm install
cds watch
# Verify CatalogService and UI routes are accessible
```

**STEP**: 12 — Prepare approuter for Cloud Foundry: update package.json
**DESCRIPTION**: For Cloud Foundry Node.js runtime compatibility (Node >=14 / approuter v11), update the approuter package.json in the <mta-id>-approuter folder.
**LANGUAGE**: JSON
**CODE**:
```json
// <mta-id>-approuter/package.json (patch example)
{
  "dependencies": {
    "@sap/approuter": "11.5.0"
  },
  "engines": {
    "node": ">= 14.0.0"
  }
}
```

**STEP**: 13 — Build and deploy MTA (Business Application Studio)
**DESCRIPTION**: Build the MTA to produce an .mtar archive, then deploy it to Cloud Foundry (must be logged in).
**LANGUAGE**: Bash
**CODE**:
```bash
# In Business Application Studio:
# - Right-click mta.yaml -> Build MTA Project (creates mtar in mta_archives/)
# - Right-click the .mtar -> Deploy MTA Archive (requires CF login)
```

**STEP**: 14 — Build and deploy (VSCode / CLI)
**DESCRIPTION**: Alternative CLI commands to build and deploy (depends on scripts in your project package.json).
**LANGUAGE**: Bash
**CODE**:
npm run build && npm run deploy
--------------------------------

**TITLE**: Get Started with SAP Cloud Application Programming Model (CAP) using Fiori tools and Application Frontend Service

**INTRODUCTION**: Quick, code-focused starter that shows how to scaffold a CAP service, add a simple CDS model and OData service, create a UI5 frontend (Fiori tools compatible), run locally with cds watch and prepare artifacts to deploy to SAP BTP (Application Frontend Service). Includes concrete files and commands for automation and code-generation workflows.

**TAGS**: CAP, Cloud Application Programming Model, Fiori, UI5, Application Frontend Service, AFS, OData, CDS, Node.js, BTP, Fiori-tools

STEP: 1 — Initialize CAP project
DESCRIPTION: Create a new CAP project with Node.js runtime and default folder layout. This initializes package.json and basic structure.
LANGUAGE: bash
CODE:
```bash
# create project folder and initialize CAP
mkdir cap-afs-sample
cd cap-afs-sample

# initialize npm + CAP
npm init -y
npm install --save @sap/cds
npx cds init

# optionally install sqlite for local persistence
npm install --save sqlite3
```

STEP: 2 — Add CDS data model (db/schema.cds)
DESCRIPTION: Define a simple domain model and persistence entity. Save as db/schema.cds.
LANGUAGE: CDS
CODE:
```cds
namespace my.bookshop;

using { cuid } from '@sap/cds/common';

entity Books : cuid {
  title    : String(111);
  author   : String(111);
  stock    : Integer;
  price    : Decimal(9,2);
  createdAt: Timestamp;
}
```

STEP: 3 — Define an OData service (srv/cat-service.cds)
DESCRIPTION: Expose the entity through a service for OData consumption by UI5.
LANGUAGE: CDS
CODE:
```cds
using my.bookshop as db from '../db/schema';

service CatalogService @(requires: 'authenticated-user') {
  entity Books as projection on db.Books;
}
```

STEP: 4 — Add optional service implementation hooks (srv/server.js)
DESCRIPTION: Add Node.js service bootstrap for custom logic and to enable local testing. Use this file for handlers, custom endpoints, or middleware.
LANGUAGE: JavaScript
CODE:
```javascript
// srv/server.js
const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
  const { Books } = this.entities;

  // Example: set createdAt on CREATE
  this.before('CREATE', 'Books', (req) => {
    req.data.createdAt = new Date().toISOString();
  });

  // Example: simple custom action (uncomment and extend as needed)
  // this.on('markOutOfStock', async (req) => { ... });
});
```

STEP: 5 — package.json scripts for local development
DESCRIPTION: Minimal package.json snippets to run CAP locally and serve UI modules via cds watch.
LANGUAGE: JSON
CODE:
```json
{
  "name": "cap-afs-sample",
  "version": "1.0.0",
  "scripts": {
    "start": "cds run",
    "watch": "cds watch"
  },
  "dependencies": {
    "@sap/cds": "^7",
    "sqlite3": "^5"
  }
}
```

STEP: 6 — Place UI5 app under app/webapp to be served by CAP
DESCRIPTION: CAP can serve a UI module placed under app/ by default. Create a minimal UI5 app manifest and index that consumes the CatalogService OData endpoint.
LANGUAGE: JSON
CODE:
```json
// app/webapp/manifest.json
{
  "sap.app": {
    "id": "my.bookshop.ui",
    "type": "application",
    "applicationVersion": { "version": "1.0.0" },
    "title": "Bookshop UI"
  },
  "sap.ui5": {
    "rootView": "my.bookshop.ui.view.App",
    "dependencies": {
      "minUI5Version": "1.84.0",
      "libs": { "sap.m": {}, "sap.ui.core": {} }
    },
    "models": {
      "": {
        "dataSource": "CatalogService",
        "settings": { "odataVersion": "2.0" }
      }
    }
  },
  "sap.app.technology": "UI5",
  "sap.ui": {
    "technology": "UI5"
  },
  "sap.platform.hcp": {
    "uri": "/"
  },
  "dataSources": {
    "CatalogService": {
      "uri": "/catalog/",
      "type": "OData",
      "settings": { "odataVersion": "2.0" }
    }
  }
}
```

LANGUAGE: XML
CODE:
```xml
<!-- app/webapp/view/App.view.xml -->
<mvc:View controllerName="my.bookshop.ui.controller.App"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m">
  <App>
    <pages>
      <Page title="Bookshop">
        <List id="bookList" items="{/Books}">
          <items>
            <StandardListItem title="{title}" description="{author}" info="{price}"/>
          </items>
        </List>
      </Page>
    </pages>
  </App>
</mvc:View>
```

LANGUAGE: JavaScript
CODE:
```javascript
// app/webapp/controller/App.controller.js
sap.ui.define(["sap/ui/core/mvc/Controller"], function(Controller) {
  return Controller.extend("my.bookshop.ui.controller.App", {
    onInit: function() {
      // default OData model is configured via manifest.json
    }
  });
});
```

LANGUAGE: HTML
CODE:
```html
<!-- app/webapp/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Bookshop</title>
    <script id="sap-ui-bootstrap"
            src="https://ui5.sap.com/resources/sap-ui-core.js"
            data-sap-ui-theme="sap_fiori_3"
            data-sap-ui-libs="sap.m"
            data-sap-ui-resourceroots='{"my.bookshop.ui": "./"}'>
    </script>
    <script>
      sap.ui.getCore().attachInit(function () {
        sap.ui.require(["sap/ui/core/ComponentContainer"], function (ComponentContainer) {
          new ComponentContainer({ name: "my.bookshop.ui", settings: { id: "bookshop" } }).placeAt("content");
        });
      });
    </script>
  </head>
  <body class="sapUiBody" id="content"></body>
</html>
```

STEP: 7 — Run locally (cds watch serves backend + UI)
DESCRIPTION: Use cds watch to run the OData service and serve the UI module concurrently. Test the UI against the local backend.
LANGUAGE: bash
CODE:
```bash
# Start CAP service and UI (watch mode auto-updates)
npm run watch

# Open web UI at:
# http://localhost:4004/index.html  (or the root path served by CDS)
# OData service available at:
# http://localhost:4004/catalog/Books
```

STEP: 8 — Prepare for deployment to SAP BTP / Application Frontend Service (high-level)
DESCRIPTION: For deployment to Application Frontend Service on SAP BTP (CF), package the UI and backend per your org's pipeline. Common approaches:
- Deploy backend CAP app to Cloud Foundry (cf push or MTA)
- Deploy static UI assets to Application Frontend Service (AFS) or use the Application Router that integrates with AFS
- Bind required services (xsuaa, destination, app-frontend-service) in your manifest or MTA
Refer to official docs (links below) for AFS-specific manifest and service binding patterns.
LANGUAGE: bash
CODE:
```bash
# Example high-level steps (adjust to your org and toolchain):
# 1. Build UI
cd app/webapp
# if using ui5 build tooling
npx @ui5/cli build --all

# 2. Package artifacts into an MTA or CF app and push
# Example: push CAP backend
cf push cap-backend -f manifest-backend.yml

# 3. Deploy UI to Application Frontend Service (AFS) following SAP Help Portal guidance
# See official docs linked below for exact manifest/service configuration and bindings.
```

STEP: 9 — Useful links and resources
DESCRIPTION: Preserve official docs and blog posts for Application Frontend Service (AFS) and deeper examples.
LANGUAGE: text
CODE:
```text
SAP Help Portal - What Is Application Frontend Service:
https://help.sap.com/docs/application-frontend-service/application-frontend-service/what-is-application-frontend-service?version=Cloud

Blog - Introducing Application Frontend Service:
https://community.sap.com/t5/technology-blog-posts-by-sap/introducing-application-frontend-service/ba-p/14091408

Blog - Simple UI Applications with Application Frontend Service:
https://community.sap.com/t5/technology-blog-posts-by-sap/simple-ui-applications-with-application-frontend-service/ba-p/14096009
```

STEP: 10 — Licensing and repository paths
DESCRIPTION: Preserve license reference and repository path for legal and repo structure.
LANGUAGE: text
CODE:
```text
License: Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the LICENSE file:

../../LICENSES/Apache-2.0.txt
```


--------------------------------

**TITLE**: Expose a deployed CAP project as an SAP BTP destination

**INTRODUCTION**: Step-by-step actions to expose a deployed SAP Cloud Application Programming (CAP) Node.js service as an SAP BTP Destination using XSUAA credentials and OAuth2ClientCredentials. Includes how to retrieve the service URL, obtain XSUAA service key values, create the destination (with required fields), and verify via Business Application Studio and curl.

**TAGS**: fiori-samples, CAP, SAP BTP, destination, XSUAA, OAuth2ClientCredentials, OAuth2UserTokenExchange, Business Application Studio, OData, SAPUI5

STEP: Prerequisites
DESCRIPTION: Confirm required accounts, subscriptions, and that the CAP project has been deployed to the same subaccount where you will create the destination.
LANGUAGE: text
CODE:
```text
- SAP BTP account (e.g., trial): https://account.hana.ondemand.com/
- Subscribed to SAP Build Work Zone (follow tutorial): https://developers.sap.com/tutorials/cp-portal-cloud-foundry-getting-started.html
- CAP project with SAPUI5 Fiori UI deployed (example blog): https://community.sap.com/t5/technology-blogs-by-sap/build-and-deploy-a-cap-project-node-js-api-with-a-sap-fiori-elements-ui-and/ba-p/13537906
- Destination must be created in the same subaccount where the CAP app is deployed.
```

STEP: Get the CAP service endpoint (Dev Space / Service Center)
DESCRIPTION: Open your BTP subaccount dev space or Service Center and locate the running Node.js/CAP service. Copy the app root URL (base URL).
LANGUAGE: text
CODE:
```text
Example endpoint (replace with your instance):
https://28bdb0fbtrial-dev-managedappcapproject-srv.cfapps.us10-001.hana.ondemand.com

Image references (optional): Step1.png, Step2.png, Step2b.png
```

STEP: Verify endpoint requires authentication (expected 401 without headers)
DESCRIPTION: Test an OData route to confirm it returns HTTP 401 when unauthenticated (indicates XSUAA protection is active).
LANGUAGE: text
CODE:
```text
Example service route:
https://28bdb0fbtrial-dev-managedappcapproject-srv.cfapps.us10-001.hana.ondemand.com/odata/v4/catalog

Expected response (unauthenticated):
HTTP 401 Unauthorized

Image reference: Step2c.png
```

STEP: Retrieve XSUAA service keys (clientid, clientsecret, url)
DESCRIPTION: From your subaccount root, choose Instances and Subscriptions → select the XSUAA service instance deployed with your CAP app → Service Keys tab. Create a new service key if none exist. Extract clientid, clientsecret, and url.
LANGUAGE: JSON
CODE:
```json
{
  "clientid": "sb-managedappcapproject!t299668",
  "clientsecret": "xGRgYPoAXbMv2gqRIDontThinkSooZ7uY=",
  "url": "https://28bdb0fbtrial.authentication.us10.hana.ondemand.com"
}
```
DESCRIPTION: Save these values; you'll use them to configure the destination. Image references: Step3.png, Step4.png, Step5.png

STEP: Create the destination in SAP BTP Cockpit (Connectivity → Destinations)
DESCRIPTION: In your subaccount cockpit, open Connectivity → Destinations → Create Destination. Set Authentication = OAuth2ClientCredentials and fill the properties below. IMPORTANT: append "/oauth/token" to the Token Service URL.
LANGUAGE: JSON
CODE:
```json
{
  "Name": "capdestination",
  "Description": "CAP Project Destination",
  "URL": "https://28bdb0fbtrial-dev-managedappcapproject-srv.cfapps.us10-001.hana.ondemand.com",
  "Authentication": "OAuth2ClientCredentials",
  "Client ID": "sb-managedappcapproject!t299668",
  "Client Secret": "xGRgYPoAXbMv2gqRIDontThinkSooZ7uY=",
  "Token Service URL": "https://28bdb0fbtrial.authentication.us10.hana.ondemand.com/oauth/token",
  "Token Service user": "sb-managedappcapproject!t299668",
  "Token Service password": "xGRgYPoAXbMv2gqRIDontThinkSooZ7uY=",
  "HTML5.Timeout": "60000",
  "WebIDEEnabled": "true",
  "WebIDEUsage": "odata_gen",
  "HTML5.DynamicDestination": "true"
}
```
DESCRIPTION: Save the destination. Image reference: Step6.png
NOTE: To use Token Exchange (authenticate a user across systems) instead, set Authentication = OAuth2UserTokenExchange. This removes the requirement for Token Service user and password in the destination config.

STEP: Test the destination via Business Application Studio Service Centre
DESCRIPTION: In Business Application Studio open Service Centre (left nav), select the destination (capdestination). Add the service path (e.g., /odata/v4/catalog) in the path field and click Connect. The status will show availability and return OData if successful.
LANGUAGE: text
CODE:
```text
Service path to append: /odata/v4/catalog
Example final URL used by Service Centre: https://capdestination.dest/odata/v4/catalog
Image references: Step7.png, Step7b.png
```

STEP: Test the destination via curl (terminal)
DESCRIPTION: Use curl to confirm the destination returns the OData payload. The destination host alias (capdestination.dest) is resolved by BTP tools/service centre or proxy — use the destination alias provided by your environment.
LANGUAGE: bash
CODE:
```bash
curl -L "https://capdestination.dest/odata/v4/catalog" -vs > curl-cap-output.txt 2>&1
# Inspect output:
cat curl-cap-output.txt
```
LANGUAGE: JSON
CODE:
```json
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

STEP: Next steps / usage
DESCRIPTION: Use the SAP Fiori tools generator or Web IDE to generate HTML5 applications that consume the OData services via this destination. For cross-subaccount/region scenarios see the linked guidance.
LANGUAGE: text
CODE:
```text
Reference: SAP BTP: How to call protected app across regions with SAML and OAuth
https://community.sap.com/t5/technology-blogs-by-sap/sap-btp-how-to-call-protected-app-across-regions-with-saml-and-oauth-2/ba-p/13546145
```

STEP: License
DESCRIPTION: Licensing information for this documentation repository.
LANGUAGE: text
CODE:
```text
Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
Licensed under the Apache Software License, version 2.0.
See LICENSE file: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Referenced Guides Index for fiori-samples (paths and quick code hooks)

**INTRODUCTION**: This document indexes the referenced guides in the fiori-samples repository, giving direct file paths and concise, actionable code snippets for programmatic access, quick inspection, and common runtime configuration patterns (proxy, SSL, CI/CD, environment credentials). Use these steps to locate and integrate each guide into automation, tests, or developer scripts.

**TAGS**: fiori-samples, SAP, BTP, OData, Cloud-Connector, S4HANA, proxy, ssl, cicd, abap, headless, generator

**STEP**: 1 — Consuming and validating SAP BTP destinations to support OData XML Service

**DESCRIPTION**: Open and consume the guide at destinations/README.md. Use programmatic reading to extract usage and sample configuration fragments for automation or documentation generation.

**LANGUAGE**: Shell

**CODE**:
```bash
# Print the file to console
cat destinations/README.md
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Read the README file programmatically (Node.js)
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'destinations', 'README.md');
const content = fs.readFileSync(file, 'utf8');
console.log(content);
```

**STEP**: 2 — Running SAP Fiori Generator headless

**DESCRIPTION**: Inspect headless/README.md for instructions to run the SAP Fiori Generator in headless (non-interactive) mode. Use the file to derive CLI invocation patterns for automation.

**LANGUAGE**: Shell

**CODE**:
```bash
# Open guide for headless generator
less headless/README.md
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Example: programmatically parse headless README to extract CLI examples
const fs = require('fs');
const file = 'headless/README.md';
const readme = fs.readFileSync(file, 'utf8');
// Implement parser to extract fenced code blocks or CLI examples
console.log(readme.slice(0, 200));
```

**STEP**: 3 — Consuming SAP Cloud Connector via SAP BTP destination (on-premise)

**DESCRIPTION**: Refer to onpremise/README.md for steps to configure and consume on-premise services via SAP Cloud Connector and BTP destinations. Use the README to pull required destination JSON or env var names into deployment scripts.

**LANGUAGE**: Shell

**CODE**:
```bash
# View onpremise guide
cat onpremise/README.md
```

**LANGUAGE**: JSON

**CODE**:
```json
// Example destination JSON snippet you might extract or create from the README
{
  "Name": "OnPremServiceDest",
  "Type": "HTTP",
  "URL": "https://my-onprem-host.example.com",
  "ProxyType": "OnPremise",
  "Authentication": "NoAuthentication"
}
```

**STEP**: 4 — Consuming SAP S/4HANA public cloud via SAP BTP destination

**DESCRIPTION**: Use s4hana/README.md to configure consumption of S/4HANA public cloud services via BTP destinations. Automate destination creation or validation using the provided path.

**LANGUAGE**: Shell

**CODE**:
```bash
# Open S/4HANA consumption guide
sed -n '1,200p' s4hana/README.md
```

**LANGUAGE**: JSON

**CODE**:
```json
// Example: Minimal destination template for S/4HANA public cloud
{
  "Name": "S4HanaPublicCloud",
  "Type": "HTTP",
  "URL": "https://api.s4hana.example.com",
  "Authentication": "OAuth2SAMLBearerAssertion"
}
```

**STEP**: 5 — Proxy Configuration

**DESCRIPTION**: Use proxy/README.md for instructions on configuring system and application-level proxies. Examples here show how to set environment variables and use them from Node.js or shell scripts.

**LANGUAGE**: Shell

**CODE**:
```bash
# Set proxy environment variables for CLI and build tools
export HTTP_PROXY="http://proxy.example.com:8080"
export HTTPS_PROXY="http://proxy.example.com:8080"
# Verify
env | grep -i proxy
```

**LANGUAGE**: JavaScript

**CODE**:
```javascript
// Example: configure axios to use environment proxy variables
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');

const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

axios.get('https://example.api', { httpsAgent: agent })
  .then(res => console.log(res.status))
  .catch(err => console.error(err));
```

**STEP**: 6 — Self-Signed SSL Certificate

**DESCRIPTION**: Refer to sslcerts/README.md for guidance on trusting self-signed certificates. The examples include adding certificates to runtime trust stores and setting NODE_EXTRA_CA_CERTS for Node.js processes.

**LANGUAGE**: Shell

**CODE**:
```bash
# Example: set Node.js to trust extra CA cert (assumes cert.pem exists)
export NODE_EXTRA_CA_CERTS="$(pwd)/sslcerts/cert.pem"
node your-app.js
```

**LANGUAGE**: Shell

**CODE**:
```bash
# View the self-signed cert README
cat sslcerts/README.md
```

**STEP**: 7 — ABAP CI/CD Pipeline Support with Environment Credentials

**DESCRIPTION**: Open cicd/README.md for instructions to integrate ABAP CI/CD using environment-stored credentials. Use this to add secrets to CI platforms and to reference them in pipeline YAML.

**LANGUAGE**: YAML

**CODE**:
```yaml
# Example GitHub Actions snippet: reference secrets for ABAP pipeline
name: ABAP CI/CD
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      ABAP_USER: ${{ secrets.ABAP_USER }}
      ABAP_PASSWORD: ${{ secrets.ABAP_PASSWORD }}
    steps:
      - uses: actions/checkout@v3
      - name: Run ABAP CI job
        run: ./ci-scripts/run-abap-ci.sh
```

**LANGUAGE**: Shell

**CODE**:
```bash
# Inspect the cicd guide
less cicd/README.md
```

**STEP**: 8 — SAP BTP ABAP Environment (Steampunk) - Cross Subaccount and Regions

**DESCRIPTION**: See abapcloud/README.md for cross-subaccount and multi-region patterns. Use the README to source configuration keys (subaccount, region, destination names) for automation.

**LANGUAGE**: JSON

**CODE**:
```json
// Example configuration fragment for multi-region ABAP deployments
{
  "subaccount": "0000000-abc-123",
  "region": "eu10",
  "destination": "ABAPBackend"
}
```

**LANGUAGE**: Shell

**CODE**:
```bash
# View the ABAP cloud guide
cat abapcloud/README.md
```

**STEP**: 9 — License

**DESCRIPTION**: The project is licensed under the Apache Software License, version 2.0. See LICENSES/Apache-2.0.txt for the full license text. Ensure any generated code or redistributed content includes this license where required.

**LANGUAGE**: Shell

**CODE**:
```bash
# Print license file
cat LICENSES/Apache-2.0.txt
```

**LANGUAGE**: Markdown

**CODE**:
```markdown
# License note (reference)
Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0.
Refer to /LICENSES/Apache-2.0.txt for full details.
```
--------------------------------

**TITLE**: Configure SAP BTP Destination for ABAP Cloud (Steampunk) and Troubleshooting

**INTRODUCTION**: Action-oriented reference for configuring SAP BTP destinations to connect to SAP BTP ABAP Environment (Steampunk). Includes ready-to-use destination JSON examples for SAMLAssertion and OAuth2UserTokenExchange authentication, required WebIDEUsage values, guidance for cross-account/cross-region use via SAMLAssertion, and concise troubleshooting pointers (communication system and connectivity trace).

**TAGS**: SAP BTP, ABAP, Steampunk, destination, WebIDEUsage, SAMLAssertion, OAuth2UserTokenExchange, troubleshooting, connectivity-trace

**STEP**: 1 — Destination JSON examples for ABAP Cloud (Steampunk)

**DESCRIPTION**: Create a destination in the BTP cockpit or via an API that points to your ABAP Cloud system. Ensure you include the required WebIDEUsage value string: "odata_abap,dev_abap,abap_cloud". Below are two concrete examples you can paste into the BTP Destination creation UI (or use as payload when creating destinations via API).

**LANGUAGE**: JSON

**CODE**:
```json
{
  "Name": "MySteampunk_ABAP_SAML",
  "Type": "HTTP",
  "Description": "Destination to SAP BTP ABAP Environment (Steampunk) using SAMLAssertion for cross-account/region usage",
  "URL": "https://<your-abap-cloud-host>.hana.ondemand.com",
  "ProxyType": "Internet",
  "Authentication": "SAMLAssertion",
  "WebIDEUsage": "odata_abap,dev_abap,abap_cloud",
  "TrustAll": "false"
}
```

```json
{
  "Name": "MySteampunk_ABAP_OAuth2",
  "Type": "HTTP",
  "Description": "Destination to SAP BTP ABAP Environment (Steampunk) using OAuth2UserTokenExchange",
  "URL": "https://<your-abap-cloud-host>.hana.ondemand.com",
  "ProxyType": "Internet",
  "Authentication": "OAuth2UserTokenExchange",
  "TokenServiceURL": "https://<xsuaa-domain>/oauth/token",
  "WebIDEUsage": "odata_abap,dev_abap,abap_cloud",
  "TrustAll": "false"
}
```

**STEP**: 2 — Required WebIDEUsage value

**DESCRIPTION**: Always set the WebIDEUsage field on ABAP Cloud destinations to indicate the destination type to tooling (UI tooling, Business Application Studio, etc.). Use the exact comma-separated string below.

**LANGUAGE**: text

**CODE**:
```text
WebIDEUsage: odata_abap,dev_abap,abap_cloud
```

**STEP**: 3 — Cross-account / cross-region destinations (use SAMLAssertion)

**DESCRIPTION**: For sharing destinations across global accounts, regions, or subaccounts, prefer Authentication = SAMLAssertion. Follow the official cross-subaccount documentation and the referenced tutorial/video for setup of trust and destination propagation. Note: some older instructional content references legacy flows (certificate locations, legacy cockpit steps); use the current help pages for the exact UI locations.

**LANGUAGE**: text

**CODE**:
```text
Recommended:
- Authentication: SAMLAssertion
- Ensure WebIDEUsage includes "abap_cloud"
- Follow official guides:
  - Video (may contain legacy UI references): https://www.youtube.com/watch?v=8ePyQJsmWYA
  - Help topic: https://help.sap.com/docs/btp/sap-business-technology-platform/creating-destination-for-cross-subaccount-communication
```

**STEP**: 4 — Troubleshooting: Communication System & Connectivity Trace

**DESCRIPTION**: If external tooling (Business Application Studio, Fiori tooling) cannot access your ABAP Cloud instance, check that the communication system is configured correctly in your ABAP Cloud tenant. If still blocked, enable and collect a connectivity trace in the ABAP Cloud system and analyze it per the SAP help documentation. Use the links below for step-by-step instructions.

**LANGUAGE**: text

**CODE**:
```text
Troubleshooting checklist:
1) Verify Destination configuration in BTP cockpit:
   - URL is reachable from the Internet (if using ProxyType: Internet)
   - Authentication is set correctly (SAMLAssertion or OAuth2UserTokenExchange)
   - WebIDEUsage contains: odata_abap,dev_abap,abap_cloud

2) Verify Communication System configuration in ABAP Cloud:
   - Follow: https://help.sap.com/docs/sap-btp-abap-environment/abap-environment/creating-communication-system-for-sap-business-application-studio

3) Enable and collect connectivity trace in ABAP Cloud and analyze:
   - Follow: https://help.sap.com/docs/sap-btp-abap-environment/abap-environment/display-connectivity-trace

4) If cross-account/region: verify trust configuration and SAML settings per:
   - https://help.sap.com/docs/btp/sap-business-technology-platform/creating-destination-for-cross-subaccount-communication

License:
Copyright (c) 2009-2025 SAP SE or an SAP affiliate company. See LICENSE file at: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: SAPUI5 / ABAP Deployment: Sample Configurations and CI/CD Best Practices

**INTRODUCTION**: Practical, code-focused guidance for configuring ABAP deployment of SAPUI5 apps using ui5-tooling and the fiori CLI. Covers environment variable handling (.env), dynamic transport request creation, CI/CD CLI commands, building archives (ui5-task-zipper), and recommended CLI flags (yes, failFast, debug). Recommended integration point: SAP Cloud Transport Management Service (CTMS).

**TAGS**: ABAP, SAPUI5, ui5-tooling, fiori-cli, deployment, CI/CD, CTMS, dotenv, ui5-deploy, ui5-task-zipper

**STEP**: 1 - Recommendation: Use CTMS for ABAP deployments

**DESCRIPTION**: Use SAP Cloud Transport Management Service (CTMS) as the recommended end-to-end deployment target for ABAP. Integrate external CI/CD systems (Azure DevOps, CircleCI, GitHub Actions) to CTMS via APIs or marketplace Actions so deployments into SAP BTP/ABAP landscapes follow transport governance and auditing.

**LANGUAGE**: text

**CODE**:
```text
Recommended resources:
- @sap/ux-ui5-tooling: https://www.npmjs.com/package/@sap/ux-ui5-tooling
- CTMS / background reading: https://community.sap.com/t5/technology-blog-posts-by-sap/sap-btp-runtimes-my-personal-considerations-and-preferences-on-cloud/ba-p/14129510
- Deploy to SAP BTP with CTMS (GitHub Action): https://github.com/marketplace/actions/deploy-to-sap-btp-with-ctms
```

**STEP**: 2 - Use environment variables via .env for credentials

**DESCRIPTION**: Create a .env at project root for local development and CI secrets. Configure ui5-deploy.yaml to reference environment variables when using .env or to use exported environment variables. Use flags yes and failFast to automate non-interactive CI flows.

**LANGUAGE**: text

**CODE**:
```text
File: .env (root of SAPUI5 project)
XYZ_USER=myusername
XYZ_PASSWORD=mypassword
```

**LANGUAGE**: YAML

**CODE**:
```yaml
# ui5-deploy.yaml (credential example when referencing env vars)
configuration:
  yes: true        # bypass Yes confirmation prompt (CI)
  failFast: true   # exit immediately on errors (recommended for CI)
  target:
    url: https://XYZ.sap-system.corp:44311
    client: 200
  credentials:
    username: env:XYZ_USER
    password: env:XYZ_PASSWORD
```

**LANGUAGE**: Bash

**CODE**:
```bash
# Option A: Export environment variables (CI or shell)
export XYZ_USER='~username'
export XYZ_PASSWORD='~password'

# If you exported env vars, ui5-deploy.yaml can reference plain names:
# credentials:
#   username: XYZ_USER
#   password: XYZ_PASSWORD

# Option B: pass credentials via CLI (explicit environment reference)
npx fiori deploy --username 'env:XYZ_USER' --password 'env:XYZ_PASSWORD' ...
```

**STEP**: 3 - Enable non-interactive CI behavior (yes, failFast)

**DESCRIPTION**: Add yes: true and failFast: true in ui5-deploy.yaml or pass flags in CLI (--yes --failFast) to avoid prompts and fail early on errors (useful for authentication failures in CI).

**LANGUAGE**: YAML

**CODE**:
```yaml
# ui5-deploy.yaml snippet
configuration:
  yes: true
  failFast: true
```

**STEP**: 4 - Create Transport Request (TR) dynamically during deploy/undeploy

**DESCRIPTION**: Use the transport bookmark REPLACE_WITH_TRANSPORT in ui5-deploy.yaml or CLI to instruct the tooling to create a transport automatically per run (applies to deploy and undeploy).

**LANGUAGE**: YAML

**CODE**:
```yaml
# ui5-deploy.yaml (app config)
app:
  name: /TEST/SAMPLE_APP
  package: /TEST/UPLOAD
  transport: REPLACE_WITH_TRANSPORT
```

**STEP**: 5 - CI/CD: full deploy CLI example

**DESCRIPTION**: Generate a single CLI command for CI/CD pipelines. Use --noConfig to skip loading project config and pass required flags and env references. Replace placeholders as needed.

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

**STEP**: 6 - Generate a ZIP archive: Option 1 (auto) and Option 2 (ui5-task-zipper)

**DESCRIPTION**: Option 1: omit --archive-path to let the CLI archive ./dist on the fly. Option 2: create archive.zip during build with ui5-task-zipper and reference it via --archive-path in CI.

Option 2 requires adding ui5-task-zipper to package.json, registering the custom task in ui5.yaml or a dedicated build.yaml, then running npx ui5 build --config build.yaml to produce ./dist/archive.zip.

Keep package.json scripts updated to use the archive target.

**LANGUAGE**: JSON

**CODE**:
```json
// package.json (devDependency)
"devDependencies": {
  "ui5-task-zipper": "latest"
}
```

**LANGUAGE**: YAML

**CODE**:
```yaml
# ui5.yaml (builder custom task registration)
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
# Optional: build.yaml to handle build-only/archive creation
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

**LANGUAGE**: Bash

**CODE**:
```bash
# Build with custom build.yaml to produce ./dist/archive.zip
npx ui5 build --config build.yaml

# Optional package.json script
# "scripts": { "archive": "ui5 build --config build.yaml" }
```

**LANGUAGE**: text

**CODE**:
```text
Expected builder output shows the ui5-task-zipper task execution:
info project1 › Running task ui5-task-zipper...
info ProjectBuilder Build succeeded
Resulting file: ./dist/archive.zip
```

**STEP**: 7 - Debugging and logging

**DESCRIPTION**: Enable verbose debug logging for npm scripts or direct npx commands by setting DEBUG=*. Use this to troubleshoot authentication or deployment errors in CI/local runs.

**LANGUAGE**: Bash

**CODE**:
```bash
# Using npm script:
DEBUG=* npm run deploy

# Direct CLI:
DEBUG=* npx fiori deploy --url ... --username 'env:XYZ_USER' ...
```

**STEP**: 8 - Additional important notes & CLI parameter reference

**DESCRIPTION**: Quick facts to use while scripting pipelines and configuring ui5-deploy.yaml.

**LANGUAGE**: text

**CODE**:
```text
- Header customization for deployment is NOT supported via CLI or ui5-deploy.yaml.
- To reference environment variables from a .env loader, use 'env:VAR_NAME' form in ui5-deploy.yaml and CLI (e.g., --username 'env:XYZ_USER').
- If you export environment variables in the shell/CI runner, you can also reference them directly in runtime or set ui5-deploy.yaml values to the environment variable names.
- Use REPLACE_WITH_TRANSPORT to dynamically create a Transport Request (TR) on deploy and undeploy.
- Use --noConfig when you want a pure CLI-only invocation without reading project ui5.yaml defaults.
```
--------------------------------

**TITLE**: Consume and validate SAP BTP destinations for OData XML services (Northwind example)

**INTRODUCTION**: Step-by-step, code-focused guide to create/import an SAP BTP destination for an OData XML service, verify connectivity from Business Application Studio (BAS) and externally, validate OData metadata and catalogs, and troubleshoot common misconfigurations. Uses the public Northwind OData service (services.odata.org) as an example.

**TAGS**: sap btp, destination, odata, odata-xml, fiori-tools, business-application-studio, curl, northwind, environment-check

**STEP**: 1 — Sample destination properties (base configuration / import)
**DESCRIPTION**: Create or import a destination named "northwind" that points to the OData service base URL. Use this as the baseline destination (NoAuthentication, Internet proxy). Copy/paste the INI-style destination file into the SAP BTP Destinations import or create it manually in the Cockpit -> Connectivity -> Destinations.
**LANGUAGE**: ini
**CODE**:
```ini
# northwind destination (base)
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

**STEP**: 2 — Alternative destination when base URL contains hardcoded service path (full_url)
**DESCRIPTION**: If the destination's URL already includes a full service path (hardcoded), add WebIDEAdditionalData=full_url so appended paths are not concatenated incorrectly. Import or create the destination with the properties below.
**LANGUAGE**: ini
**CODE**:
```ini
# northwind_fullurl destination (URL points directly at a service/resource)
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

**STEP**: 3 — WebIDEUsage guidance (choose one)
**DESCRIPTION**: Set WebIDEUsage according to the consumption scenario:
- Use odata_gen when you know the specific service endpoint (single service).
- Use odata_abap when you want to browse ABAP OData catalogs (V2 or V4).
Do not set both values simultaneously on the same destination.

**LANGUAGE**: text
**CODE**:
```text
WebIDEUsage options:
- odata_gen  -> specific OData XML service (use when you know the service path)
- odata_abap -> ABAP OData catalogs (V2/V4) to discover services
```

**STEP**: 4 — Test destination from BAS using proxy-style placeholder (odata_gen examples)
**DESCRIPTION**: Use curl against the BAS destination proxy placeholder: https://dest.<destination-name>/ appended with service path. Escape $ in shell for $metadata. These commands run from a BAS terminal or any environment that resolves the dest.<name> proxy.
**LANGUAGE**: bash
**CODE**:
```bash
# call base service (example for /v2/northwind/northwind.svc/)
curl "https://dest.northwind/v2/northwind/northwind.svc/" -vs > curl-datasrv-output.txt 2>&1

# retrieve $metadata (note escaping of $)
curl "https://dest.northwind/v2/northwind/northwind.svc/\$metadata" -vs > curl-datasrv-meta-output.txt 2>&1
```

**STEP**: 5 — Test ABAP catalogs (odata_abap) — catalog endpoints and explanation
**DESCRIPTION**: If WebIDEUsage=odata_abap, call the ABAP catalog endpoints to list services. These endpoints are only available when target system is an ABAP system. For a non-ABAP destination like the public Northwind service, these calls return 404.
**LANGUAGE**: bash
**CODE**:
```bash
# OData V2 Catalog
curl "https://dest.<destination-name>/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection" -vs > curl-v2catalog-output.txt 2>&1

# OData V4 Catalog (expand Services)
curl "https://dest.<destination-name>/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?\$expand=DefaultSystem(\$expand=Services)" -vs > curl-v4catalog-output.txt 2>&1
```
Note: The northwind destination is not an ABAP system → these catalog endpoints will 404.

**STEP**: 6 — Run Environment Check in SAP Business Application Studio (Service Centre / Fiori tools)
**DESCRIPTION**: Use the Fiori Environment Check to validate the destination configuration and gather debug trace logs and a ZIP report for support.
Steps:
1. Open BAS.
2. Open Command Palette -> "Fiori: Open Environment Check".
3. Select "Check Destination", choose your destination.
4. Enter credentials if prompted.
5. Select "Save and view results".
6. A "Preview results.md" opens — review Destination Details for missing parameters.
Attach the generated ZIP to support tickets; it contains debug traces and service lists.

**LANGUAGE**: text
**CODE**:
```text
Environment Check output includes:
- Destination Details (properties & values)
- Connectivity test results (reachable/unreachable)
- Catalog checks (V2/V4) when applicable
- Debug trace logs (zip for support)
```

**STEP**: 7 — Access destination from outside BAS (dynamic_dest path) — construct URL
**DESCRIPTION**: If your subaccount exposes SAP Build Work Zone (or BAS dynamic_dest) you can call destinations from outside BAS. Replace placeholders with your values: <subdomain>, <region>, <your-destination-name>, <service-path>.
**LANGUAGE**: text
**CODE**:
```text
# URL pattern (replace tokens)
https://<subdomain>.launchpad.cfapps.<region>.hana.ondemand.com/dynamic_dest/<your-destination-name>/<service-path>/<service-name>

# Example: metadata of an OData service
https://my-subdomain.launchpad.cfapps.eu10.hana.ondemand.com/dynamic_dest/MyDestination/sap/opu/odata/sap/MyBusinessService/$metadata

# Example: V2 Catalog via dynamic_dest
https://my-subdomain.launchpad.cfapps.eu10.hana.ondemand.com/dynamic_dest/MyDestination/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection
```

**STEP**: 8 — Common error: destination URL contains hardcoded path (404 or 401/403)
**DESCRIPTION**: If the destination URL contains additional path segments or query params (e.g., URL=https://services.odata.org/odata/$format=JSON), appended service paths will produce invalid URLs and HTTP errors. Solution: set destination URL to the base URL only; if you must use a hardcoded full URL, use WebIDEAdditionalData=full_url (see Step 2).
**LANGUAGE**: text
**CODE**:
```text
Bad destination URL:
URL=https\://services.odata.org/odata/$format=JSON
# When appended, results in:
https://services.odata.org/odata/$format=JSON/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection

Fix options:
- Remove hardcoded path/query from URL and use WebIDEUsage + appended service path
OR
- Use WebIDEAdditionalData=full_url so appended paths are not concatenated (see northwind_fullurl example)
```

**STEP**: 9 — Troubleshooting verification commands (curl) for full_url destination
**DESCRIPTION**: Validate a destination configured with WebIDEAdditionalData=full_url using dest.<name> proxy endpoints.
**LANGUAGE**: bash
**CODE**:
```bash
# call the full_url destination base
curl "https://dest.northwind_fullurl/" -vs > curl-fullurl-output.txt 2>&1

# call the full_url destination $metadata
curl "https://dest.northwind_fullurl/\$metadata" -vs > curl-fullurl-meta-output.txt 2>&1
```

**STEP**: 10 — Reference assets and notes
**DESCRIPTION**: Useful links, image and additional resources to consult while implementing and debugging.
**LANGUAGE**: text
**CODE**:
```text
Image: northwind_destination.png?raw=true
Importable destination: northwind?raw=true

References:
- SAP Fiori tools generator: https://help.sap.com/docs/SAP_FIORI_tools
- Service Centre (BAS): https://help.sap.com/docs/bas/sap-business-application-studio/explore-services-using-service-center
- Destination authentication types: https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/http-destinations
- Create destinations tutorial: https://developers.sap.com/tutorials/cp-cf-create-destination..html

License:
Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
Licensed under Apache-2.0 (see LICENSE file)
```
--------------------------------

**TITLE**: Running SAP Fiori Tools Headless Generator (CAP & Fiori UI)

**INTRODUCTION**: Instructions and ready-to-use examples to run the SAP Fiori Tools generators in headless mode using a JSON configuration. Includes sample payloads for appending a Fiori UI to an existing CAP project (CAP headless) and for generating a standalone Fiori UI app (Fiori UI headless). Use these payloads and commands as templates for automation (CI/CD) or scripting.

**TAGS**: fiori, headless, generator, CAP, SAPUI5, approuter, automation, CI

STEP: 1 — Prepare a headless JSON payload (CAP headless)
DESCRIPTION: Create a JSON file containing all mandatory properties for appending a SAP Fiori UI application to an existing CAP project (managed approuter enabled). Save file at cap/headless-config.json (path is an example; adjust to your repo layout).
LANGUAGE: JSON
CODE:
```json
{
  "generator": "cap",
  "metadata": {
    "name": "my-fiori-cap-app",
    "id": "com.example.myfioriapp",
    "title": "My Fiori CAP App",
    "description": "Fiori UI appended to existing CAP project"
  },
  "ui": {
    "framework": "SAPUI5",
    "template": "ListReportObjectPage",
    "ui5Version": "1.102.0",
    "managedApprouter": true
  },
  "cap": {
    "existingProject": true,
    "projectPath": "../",        /* Root path of the CAP project */
    "srvModule": "srv",
    "appModule": "app"
  },
  "approuter": {
    "applicationRoute": "/myfiori",
    "port": 8080,
    "routeDestination": "html5-apps-repo"
  }
}
```

STEP: 2 — Prepare a headless JSON payload (Fiori UI headless)
DESCRIPTION: Create a JSON file for generating a standalone SAP Fiori UI application (managed approuter enabled). Save file at fioriui/headless-config.json. Use this payload when you want a new UI project rather than attaching to an existing CAP project.
LANGUAGE: JSON
CODE:
```json
{
  "generator": "fiori-ui",
  "metadata": {
    "name": "my-fiori-ui-app",
    "id": "com.example.myfioriui",
    "title": "My Fiori UI App",
    "description": "Standalone Fiori UI application generated headlessly"
  },
  "ui": {
    "framework": "SAPUI5",
    "template": "ListReportObjectPage",
    "ui5Version": "1.102.0",
    "managedApprouter": true
  },
  "approuter": {
    "applicationRoute": "/myfioriui",
    "port": 8081,
    "routeDestination": "html5-apps-repo"
  },
  "output": {
    "projectPath": "./my-fiori-ui-app"
  }
}
```

STEP: 3 — Run the headless generator (examples)
DESCRIPTION: Execute the generator with the prepared JSON payload. Replace the CLI invocation with the actual generator package or local binary used in your environment. Examples below show common patterns: using npx, the local node_modules binary, or a Yeoman invocation. Provide the path to the config file created in Steps 1–2.
LANGUAGE: Bash
CODE:
```bash
# Example A: using npx (replace with actual generator package name used in your repo)
npx @sap/generator-fiori -- --headless --config ./cap/headless-config.json

# Example B: using local node_modules binary
./node_modules/.bin/@sap/generator-fiori --headless --config ./fioriui/headless-config.json

# Example C: if generator is a Yeoman generator (replace 'generator-fiori' with actual name)
yo generator-fiori --headless --config ./cap/headless-config.json
```

STEP: 4 — Verify generated output and files
DESCRIPTION: After running the generator, inspect the generated/updated project folder(s) and verify managed approuter configuration and UI artifacts (webapp, manifest.json, xs-app.json or approuter files). Example commands to list and inspect files.
LANGUAGE: Bash
CODE:
```bash
# List generated project files for a standalone UI app
ls -la ./my-fiori-ui-app
ls -la ./my-fiori-ui-app/webapp
cat ./my-fiori-ui-app/webapp/manifest.json

# For CAP-applied app, check the app module and approuter entry
ls -la ../app
cat ../app/xs-app.json || cat ../app/approuter/.xs-app.json
```

STEP: 5 — Use and adapt payload keys
DESCRIPTION: Typical keys you will want to include and adapt in your payloads:
- metadata: name, id, title, description
- ui: framework (SAPUI5), template, ui5Version, managedApprouter (boolean)
- cap: existingProject (boolean), projectPath, srvModule, appModule (for CAP headless)
- approuter: applicationRoute, port, routeDestination
- output/projectPath: where to generate files (for standalone UI)
LANGUAGE: JSON
CODE:
```json
{
  "metadata": { "name": "...", "id": "...", "title": "..." },
  "ui": { "framework": "SAPUI5", "template": "...", "managedApprouter": true },
  "cap": { "existingProject": true, "projectPath": "../", "srvModule": "srv", "appModule": "app" },
  "approuter": { "applicationRoute": "/app", "port": 8080, "routeDestination": "html5-apps-repo" },
  "output": { "projectPath": "./generated-app" }
}
```

STEP: 6 — References & README locations
DESCRIPTION: See the generator-specific README files in this repository for detailed, generator-specific configuration keys and additional options.
LANGUAGE: Plain
CODE:
```
Files:
- cap/README.md     # CAP headless generator details and specific keys
- fioriui/README.md # Fiori UI headless generator details and specific keys
```

STEP: 7 — License
DESCRIPTION: Project license reference.
LANGUAGE: Plain
CODE:
```
Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0.
License file: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Running CAP Headless — Generate and append an SAP Fiori UI app (managed approuter) to a CAP project

**INTRODUCTION**: Step-by-step, code-focused instructions to append a SAP Fiori UI application with managed approuter configuration to an existing CAP project using the @sap/fiori headless Yeoman generator. Includes prerequisites, optional CAP project creation, config file structure, generator invocation examples, and gotchas.

**TAGS**: fiori, CAP, headless, yo, generator, approuter, sap-fiori, CloudFoundry, BAS, VSCode, hana

**STEP**: 1 — Prerequisites

**DESCRIPTION**: Ensure the CAP development toolkit is available globally. If not installed, install @sap/cds-dk globally.

**LANGUAGE**: bash

**CODE**:
```bash
# Install CAP development kit globally (run from a new terminal)
npm i -g @sap/cds-dk
```

**STEP**: 2 — (Optional) Create a CAP project with sample data and HANA configuration

**DESCRIPTION**: Quick single-line command that initializes a CAP project named managedAppCAPProject, adds tiny-sample, HANA and MTA support, installs dependencies, builds for HANA, and prepares gen/db for npm install.

- This step is optional if you already have a CAP project.
- Run from the folder where you want the project to be created.

**LANGUAGE**: bash

**CODE**:
```bash
cds init managedAppCAPProject && cd managedAppCAPProject \
  && cds add tiny-sample && cds add hana && cds add mta \
  && npm install && cds build --for hana \
  && cp gen/db/package.json db && npm i
```

**STEP**: 3 — Create the headless configuration file (cap_app_config.json)

**DESCRIPTION**: Create a JSON configuration file used by the headless generator. Update properties to match your CAP project root, CAP service details, and Fiori UI attributes. The targetFolder should point to the parent folder where the generated UI project (name property) will be created. For Business Application Studio (BAS) or VS Code, update targetFolder accordingly.

**LANGUAGE**: bash

**CODE**:
```bash
# Create an empty config file in the CAP project root
touch cap_app_config.json
```

**STEP**: 4 — Example cap_app_config.json (update values to match your project)

**DESCRIPTION**: Example configuration file. Update title, description, namespace, ui5Version, localUI5Version, name, targetFolder, servicePath, capService.projectPath, capService.serviceName, serviceCdsPath, appPath, entityConfig.mainEntity.entityName, and deployConfig as required. Note: this JSON contains inline comments for documentation — remove comments or convert to valid JSON for strict parsers.

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

**STEP**: 5 — Run the headless generator (basic)

**DESCRIPTION**: From the CAP project root, run the Yeoman headless generator with the path to the config file. The second argument can be an optional path-to-output-or-cwd. Use --force to overwrite, --skipInstall to skip dependency installs, --deleteFile to remove the input config after generation, and --logLevel to control logging.

**LANGUAGE**: bash

**CODE**:
```bash
# Basic usage: current directory as output
yo @sap/fiori-elements:headless ./cap_app_config.json ./

# Example with logLevel and skipInstall
yo @sap/fiori:headless ./cap_app_config.json --logLevel debug --skipInstall

# Force overwrite existing files
yo @sap/fiori:headless ./cap_app_config.json --force

# Delete input config file after generation
yo @sap/fiori:headless ./cap_app_config.json --deleteFile

# Full pattern
yo @sap/fiori-elements:headless <path-to-config-file> <optional-path-to-output-or-cwd> <options>
```

**STEP**: 6 — Generator options reference

**DESCRIPTION**: Short, actionable list of supported CLI options you will likely use during automated generation or CI.

**LANGUAGE**: text

**CODE**:
```text
--force          Overwrite existing output files
--skipInstall    Skip install phase (no npm/yarn install)
--deleteFile     Delete the input app configuration file after generation
--logLevel       Set logging level: debug | info
```

**STEP**: 7 — Gotchas and recommended edits

**DESCRIPTION**: Common pitfalls and required edits depending on target deployment or existing approuter configuration.

**LANGUAGE**: text

**CODE**:
```text
1) If you want to generate a SAP Fiori UI application WITHOUT Cloud Foundry deployment configuration, remove the "deployConfig" section from cap_app_config.json.

2) If the CAP project already contains a managed or standalone approuter, set "deployConfig.addToManagedAppRouter" to false or remove it to avoid app router conflicts.

3) The example JSON contains // comments for readability. Remove comments if your tooling requires strict JSON (no comments).

4) Ensure "targetFolder" points to the folder that will contain the generated UI subfolder named by "project.name". Example:
   targetFolder: "/Users/MyUser/Documents/managedAppCAPProject/app/"
   Resulting UI app path: "/Users/MyUser/Documents/managedAppCAPProject/app/mylropproject"

5) Keep "deployConfig.destinationName" as "fiori-default-srv-api" unless you have a specific destination you want to reference in mta.yaml.
```

**STEP**: 8 — License

**DESCRIPTION**: Project license reference.

**LANGUAGE**: text

**CODE**:
```text
Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the LICENSE file at /LICENSES/Apache-2.0.txt.
```
--------------------------------

**TITLE**: Generate SAP Fiori UI Headless with Managed Approuter (CAP + OData)

**INTRODUCTION**: Use the SAP Fiori headless Yeoman generator to create a SAP Fiori UI application from OData metadata and a JSON configuration. This document shows how to prepare the OData metadata, create the headless configuration file (app_config.json), run the generator, and enable Cloud Foundry + managed approuter deployment configuration.

**TAGS**: sap, fiori, headless, generator, yo, ui5, cap, odata, cloud-foundry, approuter, northwind

**STEP**: 1 — Prerequisites: fetch OData metadata & escape quotes
**DESCRIPTION**: Fetch the OData XML metadata (required input) and escape all double quotes so it can be embedded as a JSON string value in app_config.json.
- Example public metadata URL: https://services.odata.org/V2/Northwind/Northwind.svc/$metadata
- Escape double quotes in the XML before embedding into JSON: replace " with \"
**LANGUAGE**: Bash
**CODE**:
```bash
# Download metadata (example)
curl -sS "https://services.odata.org/V2/Northwind/Northwind.svc/$metadata" -o metadata.xml

# Escape double quotes so metadata can be inserted as a single-line JSON string
# Produces metadata-escaped.txt that you can paste into the "edmx" property of the config
sed 's/"/\\"/g' metadata.xml > metadata-escaped.txt
```

**STEP**: 2 — Create headless configuration file
**DESCRIPTION**: Create the JSON configuration file (app_config.json). Update properties to reflect your CAP project, UI project attributes, service endpoint, and the escaped OData XML (edmx). Replace values below as needed: project.title, project.description, project.namespace, project.ui5Version, project.localUI5Version, project.name, project.targetFolder, service.servicePath, service.host, and deployConfig.destinationName.
- Filename used by generator examples: ./app_config.json
**LANGUAGE**: Bash
**CODE**:
```bash
# Create the config file in your current directory (or use your preferred filename)
touch app_config.json
```

**STEP**: 3 — app_config.json (full JSON configuration template)
**DESCRIPTION**: Paste or save the following JSON into app_config.json. Replace the edmx value with the escaped metadata from metadata-escaped.txt (single-line string with quotes escaped). This JSON is valid and ready for the headless generator.
**LANGUAGE**: JSON
**CODE**:
```json
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
    "destinationName": "MySubAccountDestination",
    "addToManagedAppRouter": true
  }
}
```

**STEP**: 4 — Run the headless generator
**DESCRIPTION**: Run the Yeoman SAP Fiori headless generator from the directory where you want to create the UI project (the generator will create the project under project.targetFolder + project.name if targetFolder is absolute). Command syntax:
yo @sap/fiori:headless <path-to-config-file> <optional-output-path-or-cwd> <options>
Available options:
- --force : overwrite existing output files
- --skipInstall : skip install phase (npm / yarn)
- --deleteFile : delete the input app configuration file after generation
- --logLevel debug|info
**LANGUAGE**: Bash
**CODE**:
```bash
# Basic run (assumes app_config.json in current directory)
yo @sap/fiori:headless ./app_config.json

# With debug logging and skip install
yo @sap/fiori:headless ./app_config.json --logLevel debug --skipInstall

# Force overwrite existing files
yo @sap/fiori:headless ./app_config.json --force

# Provide an explicit output directory (optional 2nd arg)
yo @sap/fiori:headless ./app_config.json ./output-directory --skipInstall
```

**STEP**: 5 — Deployment & managed approuter notes
**DESCRIPTION**: The deployConfig node controls Cloud Foundry deployment and managed approuter generation:
- To generate an mta.yaml and managed approuter, set deployConfig.addToManagedAppRouter = true and deployConfig.deployTarget = "CF".
- deployConfig.destinationName must match an existing destination in your SAP BTP subaccount; update xs-app.json if required.

If you do not want FLP (Build Workzone) configuration or Cloud Foundry deployment:
- Remove the flpConfig node to skip FLP generation.
- Remove the deployConfig node to skip CF deployment and approuter generation.

Example: remove flpConfig and deployConfig by producing a stripped configuration (only minimal nodes required):
**LANGUAGE**: JSON
**CODE**:
```json
{
  "version": "0.2",
  "floorplan": "FE_LROP",
  "project": {
    "title": "Project's \"Title\"",
    "name": "northwind",
    "targetFolder": "/Users/MyUser/Documents/"
  },
  "service": {
    "servicePath": "/V2/Northwind/Northwind.svc/",
    "host": "https://services.odata.org",
    "edmx": "<escaped-xml-string-here>"
  },
  "entityConfig": {
    "mainEntity": { "entityName": "Categories" },
    "navigationEntity": { "EntitySet": "Products" }
  }
}
```

**STEP**: 6 — Post-generation checklist
**DESCRIPTION**: After generation:
- Inspect generated files: UI5 project under targetFolder + project.name.
- If deployConfig.addToManagedAppRouter = true, inspect generated mta.yaml and xs-app.json for correct destinationName.
- Run local build and tests per generated README (generator generates additional instructions inside the project).

**LICENSE**: Copyright (c) 2009-2025 SAP SE or an SAP affiliate company. This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the LICENSE file.
--------------------------------

**TITLE**: SAP Cloud Connector (On-Premise) Destination

**INTRODUCTION**: Quick actionable reference to define, import, validate, debug, and collect logs for an SAP BTP destination that uses ProxyType=OnPremise (Cloud Connector). Use this when connecting SAP BTP applications (including Fiori apps) to on-premise systems (S/4HANA, ABAP, internal APIs). Includes destination file example, validation curl, debug/deploy tracing, and required log file names for support.

**TAGS**: fiori-samples, sap-btp, cloud-connector, destination, onpremise, principal-propagation, connectivity, odata, bas

STEP: 1 — Prerequisites
DESCRIPTION: Verify platform and permission requirements before creating or importing an OnPremise destination. Note Fiori Elements generator supports only OData XML services.
LANGUAGE: text
CODE:
```text
Prerequisites checklist:
- SAP BTP subaccount with Cloud Foundry runtime configured.
- Admin rights in SAP BTP cockpit (to create/modify Destinations).
- Admin rights to SAP Cloud Connector (SCC) UI.
- For SAP Fiori Elements: only OData XML services supported.
- Familiarity: SAP BTP destinations and creating destinations in the BTP cockpit:
  - https://learning.sap.com/learning-journeys/administrating-sap-business-technology-platform/using-destinations
  - https://developers.sap.com/tutorials/cp-cf-create-destination..html
```

STEP: 2 — Destination file example (importable)
DESCRIPTION: Copy/paste this destination file content and import into SAP BTP Destinations. Adjust URL, CloudConnectorLocationId, Name, and Authentication to your landscape. This example uses PrincipalPropagation and enables WebIDE/OData catalog exposure.
LANGUAGE: properties
CODE:
```properties
# File: cloudconnector.destination (import in SAP BTP cockpit)
Type=HTTP
HTML5.DynamicDestination=true
HTML5.Timeout=60000
Description=SAP Cloud Connector
Authentication=PrincipalPropagation
CloudConnectorLocationId=scloud
WebIDEEnabled=true
ProxyType=OnPremise
URL=http://my-internal-host:44330/
Name=cloudconnector
WebIDEUsage=odata_abap
```
Notes:
- WebIDEUsage=odata_abap => exposes OData service catalogs to BAS/Web IDE.
- HTML5.DynamicDestination=true => destination created dynamically at runtime.
- Authentication options: Basic, OAuth2 Client Credentials, OAuth2 User Credentials, PrincipalPropagation.
- CloudConnectorLocationId must match the SCC Location ID configured in the subaccount.

STEP: 3 — System flow (visual)
DESCRIPTION: Use this sequence to understand runtime lookup and request flow (BTP app -> Destination Service -> Connectivity Service/Cloud Connector -> On-Premise system).
LANGUAGE: mermaid
CODE:
```mermaid
sequenceDiagram
   participant Developer as Developer (BAS)
   participant BTPApp as SAP BTP Application (Runtime)
   participant DestinationService as SAP BTP Destination Service
   participant ConnectivityService as SAP BTP Connectivity Service (Cloud Connector)
   participant BackendSystem as Backend System (e.g., S/4HANA, External API)

   Developer->>BTPApp: 1. Develops & Deploys App in BAS
   BTPApp->>DestinationService: 2. App requests Destination 'MyBackend'
   DestinationService->>BTPApp: 3. Provides Destination Configuration (URL, Auth, Proxy)

   alt On-Premise Backend (via Cloud Connector)
      BTPApp->>ConnectivityService: 4a. Connects via Secure Tunnel
      ConnectivityService-->>BackendSystem: 5a. Routes request to On-Premise System
   else Cloud/External Backend
      BTPApp->>BackendSystem: 4b. Direct HTTP/API Call
   end

   BackendSystem-->>BTPApp: 6. Responds with Data
   BTPApp-->>Developer: 7. Application processes and displays data
```

STEP: 4 — Validate connectivity (Environment Check + quick test)
DESCRIPTION: Run the Environment Check (see ../destinations/README.md#environment-check) and perform a direct connection test with curl from BAS or any environment that can reach the destination endpoint.
LANGUAGE: bash
CODE:
```bash
# Example: BAS terminal connection test (replace placeholders)
# Replace <destination-name> and <bsp-name>
curl -vs -i -H "X-CSRF-Token: Fetch" \
 "https://dest.<destination-name>/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV/Repositories(%27<bsp-name>%27)?saml2=disabled" \
  > curl-abap-srv-output.txt 2>&1
# Inspect curl-abap-srv-output.txt for response headers and body to determine connectivity vs deployment issues.
# Note: HTTP 404 can indicate BSP not deployed (connectivity may still be OK).
```

STEP: 5 — Enable and collect SAP Cloud Connector trace logs
DESCRIPTION: Enable detailed SCC logging only for troubleshooting. Collect these trace files and timestamps when reproducing the issue.
LANGUAGE: text
CODE:
```text
SCC trace settings (UI actions):
1. Confirm SCC version.
2. Set Cloud Connector Loggers = ALL.
3. Set Other Loggers = Information.
4. Enable Payload Trace (select correct subaccount).
5. Reproduce the failing scenario.
6. Download these logs:
   - ljs_trace.log          (Cloud Connector)
   - scc_core.log           (if applicable / newer versions)
   - traffic_trace_<subaccount>_on_<region>.trc
   - tunnel_traffic_trace_<subaccount>_on_<region>.trc (if generated)
7. After capture, disable trace logging.
Important: Do not enable in production unless troubleshooting a specific issue.
```

STEP: 6 — What to check when connectivity fails
DESCRIPTION: Common troubleshooting checklist to isolate SCC, network, SSL, destination configuration, or ABAP-level issues.
LANGUAGE: text
CODE:
```text
Common checks:
- Is SCC running and connected to the BTP subaccount? (SCC -> Subaccount Overview)
- Verify Virtual Host Mapping in SCC matches Destination host/path.
- Access Control mapping path: ensure Access Policy = Path and URL Path = / (or specific path as required).
- Firewalls / IP whitelisting: ensure BTP data center IPs allowed if needed.
- SSL certs: check SCC core or ljs logs for certificate errors.
- If no traffic recorded in traffic_trace_ logs, SCC cannot reach target ABAP system.
ABAP checks (if ABAP backend):
- /IWFND/ERROR_LOG  -> view OData errors.
- /IWFND/GW_CLIENT  -> test service calls directly in ABAP.
```

STEP: 7 — Deployment debug logging (frontend / HTML5 apps)
DESCRIPTION: Run deployments with DEBUG/verbose logging to surface HTTP request/response issues during fiori deploy or npm script deployments.
LANGUAGE: bash
CODE:
```bash
# Mac / Linux
DEBUG=* npm run deploy

# Windows (cmd)
set DEBUG=* && npm run deploy
```
LANGUAGE: json
CODE:
```json
// package.json snippet: add --verbose to fiori deploy
{
  "scripts": {
    "deploy": "npm run build && fiori deploy --config ui5-deploy.yaml --verbose && rimraf archive.zip"
  }
}
```

STEP: 8 — Support ticket package: what to collect and submit
DESCRIPTION: When opening a BC-MID-SCC support ticket, collect screenshots, SCC logs, environment check zip, and timestamped traces. Compress into a single zip file.
LANGUAGE: text
CODE:
```text
Support package checklist:
1) Screenshots from SAP BTP -> Subaccount -> Connectivity -> Destinations (show all properties).
2) SCC screenshots:
   - SCC -> Subaccount Overview -> select Subaccount
   - SCC -> Cloud to On-Premise -> Virtual Host Mapping (match destination host/port)
   - SCC -> Cloud to On-Premise -> Access Control -> select Mapping -> Edit (verify path)
   - SCC -> Cloud to On-Premise -> Access Control -> Check Availability
3) Trace logs (from Step 5).
4) Environment Check report (zip) from ../destinations/README.md#environment-check
5) Date/time of failing requests (to locate traces).
6) Compress all files into a single zip and attach to support ticket (component: BC-MID-SCC).
```

STEP: 9 — Useful links & references
DESCRIPTION: Quick links for Cloud Connector setup, principal propagation, troubleshooting and consuming UI5 from on-premise.
LANGUAGE: text
CODE:
```text
Reference links:
- Cloud Connector explained: https://community.sap.com/t5/technology-blog-posts-by-sap/cloud-connector-explained-in-simple-terms/ba-p/13547036
- Install & configure SCC: https://blogs.sap.com/2021/09/05/installation-and-configuration-of-sap-cloud-connector
- Principal Propagation:
  - Blog: https://blogs.sap.com/2021/09/06/setting-up-principal-propagation
  - SAP Help: https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/configuring-principal-propagation
  - Troubleshoot: https://help.sap.com/docs/SUPPORT_CONTENT/appservices/3361376259.html
- SCC troubleshooting guide: https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/cloud-connector-troubleshooting
- Consuming & validating BTP destinations (Environment Check): ../destinations/README.md
- Consuming SAPUI5 Libraries from On-Premise: ./ui5-onpremise.md
```
--------------------------------

**TITLE**: Expose an SAPUI5 Library from an On-Premise System via ui5.yaml and SAP BTP Destination

**INTRODUCTION**: Configure your project ui5.yaml and SAP BTP destinations so the UI5 runtime (resources) is served from an On‑Premise system through the Cloud Connector. Use this when a needed SAPUI5 version is not available on the public CDN. The steps show how to duplicate and adjust a destination, validate access, and update ui5.yaml to route /resources to the On‑Premise UI5 library while keeping /test-resources on the CDN.

**TAGS**: SAPUI5, ui5.yaml, SAP BTP, Cloud Connector, OnPremise, destination, fiori-tools-proxy

**STEP**: Prerequisites

**DESCRIPTION**: Ensure basic prerequisites are met before changing destinations and ui5.yaml.

**LANGUAGE**: Text

**CODE**:
```
- SAPUI5 library is exposed and accessible from the On‑Premise system.
- The On‑Premise system is reachable from your development environment via Cloud Connector (e.g., Business Application Studio).
- The required SAPUI5 version is unavailable on https://ui5.sap.com (CDN). Check available versions: https://ui5.sap.com/versionoverview.html.
- You have an existing SAP BTP destination (e.g., MyDestination) that connects to the On‑Premise system.
- Your project contains a ui5.yaml used by fiori-tools-proxy middleware.
```

**STEP**: Existing Setup — current SAP BTP destination (On‑Premise)

**DESCRIPTION**: Example of an existing SAP BTP destination that routes requests to your On‑Premise system via Cloud Connector. Note Name: MyDestination and ProxyType: OnPremise.

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

**STEP**: Existing Setup — example ui5.yaml using UI5 CDN and destination

**DESCRIPTION**: Example project ui5.yaml that currently points UI5 runtime to the CDN and uses fiori-tools-proxy with a backend destination. We'll update this to source /resources from the On‑Premise UI5 endpoint.

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
        ignoreCertError: false
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

**STEP**: Duplicate SAP BTP Destination for UI5 resources

**DESCRIPTION**: Create a second destination in the SAP BTP subaccount that points specifically to the UI5 resources path on the On‑Premise system. Change the destination Name (e.g., append _ui5) and set URL to include the UI5 expose path: /sap/public/bc/ui5_ui5/1/. WebIDEUsage is not required for this destination because it only serves static UI5 files.

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

**STEP**: Validate the duplicated destination from your dev environment

**DESCRIPTION**: Use curl (or equivalent HTTP client) to confirm the duplicated destination resolves through the BTP destination service and Cloud Connector, and returns UI5 resource content (e.g., sap-ui-core.js).

**LANGUAGE**: Bash

**CODE**:
```bash
# Replace mydestination_ui5.dest with the actual BTP destination host your environment exposes
curl 'https://mydestination_ui5.dest/resources/sap-ui-core.js' -X GET -i -H 'X-Csrf-Token: fetch' > output-ui5.txt

# Inspect output-ui5.txt to verify it contains the sap-ui-core.js content (HTTP 200)
less output-ui5.txt
```

**STEP**: Update ui5.yaml to consume UI5 resources from On‑Premise destination and keep test resources on CDN

**DESCRIPTION**: Modify the fiori-tools-proxy ui5 configuration inside ui5.yaml:
- Set ui5.version to '' (empty) to avoid rewriting UI5 paths with a version.
- Route /resources to the new destination host (e.g., https://mydestination_ui5.dest).
- Route /test-resources to the CDN version closest to your runtime (choose a valid UI5 version, e.g., 1.71.76).

This configuration uses the On‑Premise UI5 runtime for application resources but retains test resources from the public CDN.

**LANGUAGE**: YAML

**CODE**:
```yaml
# ui5 section inside server.customMiddleware.fiori-tools-proxy.configuration
ui5:
  version: ''            # keep empty to avoid automatic version rewriting
  paths:
    - path: /resources
      url: https://mydestination_ui5.dest
    - path: /test-resources
      url: https://ui5.sap.com/1.71.76
```

**STEP**: Example full ui5.yaml with the UI5 destination mapping

**DESCRIPTION**: Complete example ui5.yaml integrating the duplicated UI5 destination mapping and existing backend destination. Update backend.destination to your original destination name if needed.

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
        ignoreCertError: false
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

**STEP**: Notes and troubleshooting

**DESCRIPTION**: Key tips and common checks when exposing UI5 from On‑Premise.

**LANGUAGE**: Text

**CODE**:
```
- Ensure Cloud Connector mapping includes the destination host and path (/sap/public/bc/ui5_ui5/1/).
- If curl returns 404, verify the URL path on the On‑Premise system (the UI5 expose path can differ by system).
- If SSL certificate issues occur during validation, you may set ignoreCertError: true in fiori-tools-proxy (development only).
- Use the SAPUI5 version overview to pick a valid /test-resources URL: https://ui5.sap.com/versionoverview.html
- The duplicated destination name (MyDestination_ui5) is arbitrary but must match the host your dev environment exposes (e.g., mydestination_ui5.dest).
```

**STEP**: License

**DESCRIPTION**: Project license details.

**LANGUAGE**: Text

**CODE**:
```
Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
Licensed under the Apache Software License, version 2.0. See LICENSE file: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Defining Proxy Settings for SAP Fiori Tools (ui5 + Environment Variables)

**INTRODUCTION**: Quick, actionable guide to configure proxy settings for SAP Fiori tools: configure per-project proxy via ui5.yaml, set runtime environment variables on macOS/Linux and Windows (PowerShell and GUI), handle credentials and special characters, and enable legacy patch proxy support for older @sap/ux-ui5-tooling releases.

**TAGS**: sap, fiori, ui5, proxy, environment-variables, powershell, bash, axios, deployment

**STEP**: 1 — Prerequisites and rules

**DESCRIPTION**: Verify permissions and IT policy. Default proxy URL should use http:// unless your IT Admin requires https://. When adding credentials embed them as user:password in the URL and URL-encode special characters in passwords.

**LANGUAGE**: bash

**CODE**:
```bash
# Example proxy URL formats (use http:// by default unless IT requires https://)
# No credentials:
PROXY_URL="http://myproxy.com:8443"

# With credentials:
PROXY_URL="http://user:password@proxyserver:3128"
# If password contains special characters, URL-encode them (example: p@s#w0rd -> p%40s%23w0rd):
PROXY_URL="http://myusername:p%40s%23w0rd@proxy.domain.com:3128"
```

**STEP**: 2 — Configure project-level proxy in ui5.yaml (SAP Fiori Tools)

**DESCRIPTION**: Add a fiori-tools proxy middleware section to ui5.yaml to route /sap (or other backend paths) through a proxy. Use the proxy key to specify the proxy URL. If backend requires TLS, use backend.url with https://.

**LANGUAGE**: YAML

**CODE**:
```yaml
# ui5.yaml (project root)
specVersion: "2.2"
metadata:
  name: my-fiori-app
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        # Proxy server used by the middleware (use http:// by default)
        proxy: http://myproxy.com:8443
        # Backend mapping: local path '/sap' -> remote backend URL
        backend:
          - path: /sap
            url: https://my.backend.com:1234
# If credentials are required, use: proxy: http://user:password@proxyserver:port
```

**STEP**: 3 — Set environment variables for macOS / Linux (temporary session)

**DESCRIPTION**: Export proxy vars for the current shell session. Most tools respect HTTP_PROXY/HTTPS_PROXY/NO_PROXY (case-insensitive). Use HTTPS_PROXY for TLS connections and to include credentials.

**LANGUAGE**: bash

**CODE**:
```bash
# Set for current session only
export HTTP_PROXY="http://user:password@proxyserver:port"
export HTTPS_PROXY="http://user:password@proxyserver:port"
export NO_PROXY="localhost,127.0.0.1,internal.domain,.local"

# Tools generally accept lowercase variants too:
# export http_proxy="..." https_proxy="..." no_proxy="..."
```

**STEP**: 4 — Set environment variables for macOS / Linux (persist across sessions)

**DESCRIPTION**: Append exports to your shell profile (example uses ~/.bashrc). Reload the profile after editing.

**LANGUAGE**: bash

**CODE**:
```bash
# Append to ~/.bashrc (or ~/.zshrc, ~/.profile depending on shell)
echo 'export HTTP_PROXY="http://user:password@proxyserver:port"' >> ~/.bashrc
echo 'export HTTPS_PROXY="http://user:password@proxyserver:port"' >> ~/.bashrc
echo 'export NO_PROXY="localhost,127.0.0.1,internal.domain,.local"' >> ~/.bashrc

# Reload profile
source ~/.bashrc
```

**STEP**: 5 — Set HTTPS_PROXY for deployment and Axios-based tools (TLS + credentials)

**DESCRIPTION**: For deployment tools (including SAP Axios Extension), set HTTPS_PROXY to enable TLS proxying. Include credentials in the URL if required. URL-encode special characters in username/password.

**LANGUAGE**: bash

**CODE**:
```bash
# Example enabling HTTPS proxy for deployment tools
export HTTPS_PROXY="http://user:password@proxy.domain.com:3128"

# Example encoding a password with special characters (p@s#w0rd -> p%40s%23w0rd)
export HTTPS_PROXY="http://myusername:p%40s%23w0rd@proxy.domain.com:3128"

# Reference: SAP Axios Extension proxy support
# https://github.com/SAP/open-ux-tools/tree/main/packages/axios-extension#proxy-support
```

**STEP**: 6 — Enable legacy patch proxy support for older @sap/ux-ui5-tooling

**DESCRIPTION**: If using an older @sap/ux-ui5-tooling release (e.g., v1.17.6), enable the patch proxy feature by setting TOOLSUITE_FEATURES to sap.ux.enablePatchProxy. Newer SAP Fiori Tools enable this by default.

**LANGUAGE**: bash

**CODE**:
```bash
# Enable legacy patch proxy behavior (only needed for older tool versions)
export TOOLSUITE_FEATURES="sap.ux.enablePatchProxy"
```

**STEP**: 7 — Windows PowerShell: set variables for current session

**DESCRIPTION**: Set HTTP_PROXY, HTTPS_PROXY, NO_PROXY in the active PowerShell session. Use quoted strings and include credentials if required.

**LANGUAGE**: PowerShell

**CODE**:
```powershell
# Set for current PowerShell session only
$env:HTTP_PROXY  = "http://user:password@proxyserver:port"
$env:HTTPS_PROXY = "http://user:password@proxyserver:port"
$env:NO_PROXY    = "localhost,127.0.0.1,internal.domain,.local"
```

**STEP**: 8 — Windows PowerShell: persist variables for user or machine

**DESCRIPTION**: Persist environment variables across sessions using [Environment]::SetEnvironmentVariable. Use "User" for current user or "Machine" to set system-wide (requires admin).

**LANGUAGE**: PowerShell

**CODE**:
```powershell
# Persist for current user
[Environment]::SetEnvironmentVariable("HTTP_PROXY",  "http://user:password@proxyserver:port", "User")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", "http://user:password@proxyserver:port", "User")
[Environment]::SetEnvironmentVariable("NO_PROXY",    "localhost,127.0.0.1,internal.domain,.local", "User")

# Persist system-wide (requires Administrator)
[Environment]::SetEnvironmentVariable("HTTP_PROXY",  "http://user:password@proxyserver:port", "Machine")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", "http://user:password@proxyserver:port", "Machine")
[Environment]::SetEnvironmentVariable("NO_PROXY",    "localhost,127.0.0.1,internal.domain,.local", "Machine")
```

**STEP**: 9 — Windows GUI: set environment variables via System Properties

**DESCRIPTION**: If you prefer the Windows GUI, edit environment variables from System Properties → Environment Variables. Changes require restarting shells/applications to take effect.

**LANGUAGE**: PowerShell

**CODE**:
```powershell
# GUI steps (no code): 
# 1. Right-click "This PC" or "Computer" -> Properties
# 2. Click "Advanced system settings"
# 3. Click "Environment Variables..."
# 4. Add/Edit HTTP_PROXY, HTTPS_PROXY, NO_PROXY under User or System variables
# 5. Click OK and restart shells/apps
```

**STEP**: 10 — NO_PROXY and variations (compatibility notes)

**DESCRIPTION**: NO_PROXY should be a comma-separated list of hosts/domains to bypass the proxy. Most tools accept uppercase or lowercase variable names. Confirm tool-specific behavior in documentation.

**LANGUAGE**: bash

**CODE**:
```bash
# Typical NO_PROXY entries
NO_PROXY="localhost,127.0.0.1,internal.domain,.local"

# Tools may accept lowercase variants:
# http_proxy, https_proxy, no_proxy
```

**STEP**: 11 — References and license

**DESCRIPTION**: Useful links and license reference included for further reading.

**LANGUAGE**: text

**CODE**:
```text
References:
- @sap/ux-ui5-tooling proxy config: https://www.npmjs.com/package/@sap/ux-ui5-tooling#providing-proxy-configuration
- SAP Axios Extension (proxy support): https://github.com/SAP/open-ux-tools/tree/main/packages/axios-extension#proxy-support
- URL Encode/Decode: https://www.url-encode-decode.com/

License:
Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
Licensed under the Apache Software License, version 2.0
See LICENSE: ../../LICENSES/Apache-2.0.txt
```
--------------------------------

**TITLE**: Configure SAP BTP SAMLAssertion Destination for SAP S/4HANA Cloud (Public) and Debug Connectivity

**INTRODUCTION**: This guide shows how to create a SAMLAssertion destination in SAP BTP that points to an SAP S/4HANA Cloud Public tenant, validate OData V2/V4 catalog access from SAP Business Application Studio (BAS), configure nameIdFormat, assign required roles, and troubleshoot common connectivity and deployment errors.

**TAGS**: sap, s4hana-cloud, saml, destination, sap-btp, business-application-studio, odata, ui5, debugging

**STEP**: Prerequisites
**DESCRIPTION**: Verify required preconditions before creating and importing the destination.
**LANGUAGE**: Text
**CODE**:
```text
Prerequisites:
1. Complete Steps 1-3 from:
   https://developers.sap.com/tutorials/abap-custom-ui-bas-connect-s4hc.html
2. Administrative access to your SAP S/4HANA Cloud system.
3. Subscribed to SAP Business Application Studio:
   https://help.sap.com/docs/SAP%20Business%20Application%20Studio/9d1db9835307451daa8c930fbd9ab264/6331319fd9ea4f0ea5331e21df329539.html
4. Review SAP S/4HANA Cloud, Public Edition FAQ:
   https://me.sap.com/notes/3445942
5. Review SAP Business Application Studio integration notes:
   https://me.sap.com/notes/3297481
```

**STEP**: Create SAP BTP SAMLAssertion Destination (file template)
**DESCRIPTION**: Create or open the s4hana-cloud_saml destination file and replace hostname placeholders (my1111111) with your tenant-specific hostname. Import this destination in SAP BTP subaccount -> Destinations -> Import Destination.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "Name": "s4hc-saml-destination",
  "Type": "HTTP",
  "URL": "https://my1111111.s4hana.ondemand.com",
  "ProxyType": "Internet",
  "Authentication": "SAMLAssertion",
  "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "AdditionalProperties": {
    "HTML5.DynamicDestination": "true",
    "WebIDEEnabled": "true"
  }
}
```
Note: Replace "my1111111.s4hana.ondemand.com" with your specific hostname. Import via SAP BTP cockpit -> Destinations -> Import Destination.

**STEP**: nameIdFormat mapping (configure in destination)
**DESCRIPTION**: Set nameIdFormat to control how user identity is mapped in S4HC. Default recommended: emailAddress.
**LANGUAGE**: JSON
**CODE**:
```json
{
  "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
}
```
Behavior:
- urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress -> Maps SAML subject to email address in S4HC.
- urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified -> Maps SAML subject to username.
Ensure the IdP-provided email/username matches the user record and roles in S4HC.

**STEP**: Import destination and validate from BAS
**DESCRIPTION**: Import destination into SAP BTP subaccount and validate connectivity from SAP Business Application Studio.
**LANGUAGE**: Text
**CODE**:
```text
1. SAP BTP cockpit -> Subaccount -> Connectivity -> Destinations -> Import Destination (choose s4hana-cloud_saml JSON)
2. In SAP Business Application Studio: open Dev Space, open destinations service and confirm the imported destination is listed.
3. Test connectivity by calling OData catalogs (examples below) using dynamic_dest or direct call from BAS.
```

**STEP**: Dynamic destination URL template (bypass BAS when needed)
**DESCRIPTION**: Use dynamic_dest endpoints to call OData services via Launchpad (requires HTML5.DynamicDestination = true and WebIDEEnabled = true in destination Additional Properties).
**LANGUAGE**: Text
**CODE**:
```text
Template:
https://<your-subaccount-subdomain>.launchpad.cfapps.<your-region-api-endpoint>.hana.ondemand.com/dynamic_dest/<your-destination-name>/<path-to-your-OData-service>

Example base:
https://mytrial-account.launchpad.cfapps.us10.hana.ondemand.com/dynamic_dest/mys4hc-destination/

V2 Catalog example:
https://mytrial-account.launchpad.cfapps.us10.hana.ondemand.com/dynamic_dest/mys4hc-destination/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection

V4 Catalog example:
https://mytrial-account.launchpad.cfapps.us10.hana.ondemand.com/dynamic_dest/mys4hc-destination/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)
```
To get your subdomain and API endpoint: SAP BTP subaccount -> Overview.

**STEP**: Test OData Catalogs (curl examples)
**DESCRIPTION**: Verify V2/V4 catalogs using curl (replace host and destination as appropriate).
**LANGUAGE**: Bash
**CODE**:
```bash
# V2 Catalog (replace HOST/DYNAMIC URL as needed)
curl -i "https://mytrial-account.launchpad.cfapps.us10.hana.ondemand.com/dynamic_dest/mys4hc-destination/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection"

# V4 Catalog
curl -i "https://mytrial-account.launchpad.cfapps.us10.hana.ondemand.com/dynamic_dest/mys4hc-destination/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)"
```

**STEP**: Authorization requirements and required catalogs/roles
**DESCRIPTION**: Ensure the user has correct Business Roles and Business Catalogs to access and deploy OData/UI5 apps.
**LANGUAGE**: Text
**CODE**:
```text
Minimum relevant business catalogs/roles:
- Access OData Services:
  - Business Catalog: SAP_CORE_BC_EXT_TST
  - Business Role template: SAP_BR_EXTENSIBILITY_SPEC (for Key User)
  - Business Role template: SAP_BR_DEVELOPER (for Developer)

- Deploy application:
  - Business Catalog: SAP_CORE_BC_EXT_UI
  - Developer catalog: SAP_A4C_BC_DEV_UID_PC
  - Business Role templates: SAP_BR_DEVELOPER, SAP_BR_EXTENSIBILITY_SPEC

Note: Business roles can be named differently in instances (e.g., BR_DEVELOPER or Z_BR_DEVELOPER). Assign roles via S/4HANA Fiori app 'Maintain Business Users'.
```

**STEP**: Assign SAP_BR_DEVELOPER to a user (S/4HANA)
**DESCRIPTION**: Steps to add SAP_BR_DEVELOPER (or SAP_BR_EXTENSIBILITY_SPEC) to a user and validate catalogs.
**LANGUAGE**: Text
**CODE**:
```text
1. Launch Fiori app: Maintain Business Users
2. Search and select the user
3. Select 'Assigned Business Roles' -> Add -> search 'SAP_BR_DEVELOPER' (or required role)
4. Select the assigned role -> 'Business Catalogs' -> ensure SAP_CORE_BC_EXT_TST and SAP_A4C_BC_DEV_UID_PC are present
```

**STEP**: Debugging — Authorization Failures (Display Authorization Trace)
**DESCRIPTION**: Use S/4HANA Display Authorization Trace to find authorization failures for a user.
**LANGUAGE**: Text
**CODE**:
```text
1. In S/4HANA Cloud as Admin: Search for 'Display Authorization Trace'
2. Filter:
   - Status: Failed
   - Users: {username}
3. Inspect trace entries for missing authorization objects/roles.
Reference: https://help.sap.com/docs/SAP_S4HANA_CLOUD/55a7cb346519450cb9e6d21c1ecd6ec1/ebb91d3758c441b18bf9ebd0798d424e.html
```

**STEP**: Debugging — Connectivity Failures (Display Connectivity Trace)
**DESCRIPTION**: Use S/4HANA Display Connectivity Trace to find failed HTTP calls from BAS/destination. Filter by catalog request paths.
**LANGUAGE**: Text
**CODE**:
```text
1. In S/4HANA Cloud as Admin: Search for 'Display Connectivity Trace'
2. Create new Trace with:
   - Request Method: GET
   - Path Prefix: /sap/opu/odata/IWFND/CATALOGSERVICE
   OR
   - Path Prefix: /sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/
3. Save and reproduce the request from BAS, then inspect trace rows.
Reference: https://help.sap.com/docs/SAP_S4HANA_CLOUD/0f69f8fb28ac4bf48d2b57b9637e81fa/a4f6ccd072f147f299b1d856062c8dc8.html
```

**STEP**: Troubleshooting — Common Deployment Errors and fixes
**DESCRIPTION**: Error patterns, sample logs and remediation steps.
**LANGUAGE**: Bash / Text
**CODE**:
```bash
# Issue: "The use of Gateway OData V2 Service ... is not permitted."
error abap-deploy-task YY1_Some_Service The use of Gateway OData V2 Service Z_MY_SERVICE 0001 is not permitted.
# Cause: ABAP Language Version mismatch (ABAP for Cloud Development ≠ ABAP for Key Users)
# Fix: Ensure the app is built for the target tenant type as per Tenant Types documentation.

# Issue: HTTP 403 during deploy
info abap-deploy-task YY1_Some_App Starting to deploy.
error abap-deploy-task YY1_Some_App Request failed with status code 403
# Common causes:
# 1) Destination in BTP subaccount not configured with Authentication=SAMLAssertion.
# 2) BAS user missing deploy role (SAP_CORE_BC_EXT_UI or SAP_A4C_BC_DEV_UID_PC).
# Fix: Update destination Authentication to SAMLAssertion; assign required business roles.

# Issue: HTTP 400 — not permitted services
error The app uses not permitted services for ABAP for Cloud Development
error abap-deploy-task ZF_TEST_API Request failed with status code 400
# Cause: Service not allowed for this tenant type. Check Tenant Types and allowed services.
```

**STEP**: Troubleshooting — Missing services in catalogs
**DESCRIPTION**: If OData services are not returned in catalogs, verify user authorizations and that the service is exposed in the system.
**LANGUAGE**: Text
**CODE**:
```text
1. Call V2/V4 catalog endpoints (see test examples).
2. If a service is missing:
   - Confirm user has required roles (SAP_BR_DEVELOPER / SAP_CORE_BC_EXT_TST).
   - Confirm the OData service is activated and exposed via Communication Arrangement in S4HC.
3. See: ./README.md#authorization-requirements and community blog:
   https://community.sap.com/t5/technology-blog-posts-by-sap/exposing-an-odata-service-from-sap-s-4hana-cloud-public-edition-to-the-sap/ba-p/13628248
```

**STEP**: Support Communication User — partial URL destination method
**DESCRIPTION**: Allow SAP Support to access catalogs via a cloned partial URL destination with limited base URL.
**LANGUAGE**: Text
**CODE**:
```text
1. Clone your existing SAMLAssertion destination in SAP BTP.
2. Change Type to 'Partial URL' (only expose base Service URL).
3. Set Service URL to the OData catalog base (e.g., https://<s4hc-host>/sap/opu/odata/IWFND/CATALOGSERVICE).
4. Provide this cloned destination name to support so they can append service paths without exposing other endpoints.
Reference: https://ga.support.sap.com/dtp/viewer/index.html#/tree/3046/actions/45995:48363:53594:52803
```

**STEP**: Tenant Types — choose correct destination and allowed services
**DESCRIPTION**: Understand tenant-specific host endpoints and allowed services; follow tenant-specific destination generation links.
**LANGUAGE**: Text
**CODE**:
```text
Developer Extensibility (client 080):
- Purpose: full ABAP dev access to released cloud objects.
- Destination creation guide:
  https://help.sap.com/docs/SAP_S4HANA_CLOUD/0f69f8fb28ac4bf48d2b57b9637e81fa/0af2819bbe064a3da455753c8518dd81.html?version=2502.500

Key User Extensibility/Customizing (client 100):
- Purpose: configuration/customizing; low-code key user apps.
- Destination creation guide:
  https://help.sap.com/docs/SAP_S4HANA_CLOUD/0f69f8fb28ac4bf48d2b57b9637e81fa/31876c06f99645f289d802f9c95fb62b.html?version=2502.500
```

**STEP**: Full troubleshooting scenario — All HTTP requests from BAS fail
**DESCRIPTION**: Diagnostic checklist when BAS requests consistently fail.
**LANGUAGE**: Text
**CODE**:
```text
Case A — Connectivity established but calls failing:
1. Confirm traces in S4HC show incoming requests.
2. Ensure the Communication System for BAS is active:
   https://help.sap.com/docs/SAP_S4HANA_CLOUD/0f69f8fb28ac4bf48d2b57b9637e81fa/79ed4173a0e44a5085c2d236d14b5ab8.html
3. Confirm BAS user has SAP_BR_DEVELOPER (consume OData) or deploy roles.

Case B — No connectivity (no requests in S4HC traces):
1. Confirm Environment Check or curl indicates HTTP 500 and no hits on S4HC.
2. Clone the destination in BTP and reconfigure; use the new destination in BAS (the existing destination may be corrupted).
```

**STEP**: Related links & resources
**DESCRIPTION**: Quick access to related SAP documentation and tutorials (preserved links).
**LANGUAGE**: Text
**CODE**:
```text
Integrating SAP Business Application Studio:
https://help.sap.com/docs/SAP_S4HANA_CLOUD/0f69f8fb28ac4bf48d2b57b9637e81fa/22bc724fd51a4aa4a4d1c5854db7e026.html

Develop a Custom UI for S/4HANA Cloud:
https://developers.sap.com/tutorials/abap-custom-ui-bas-develop-s4hc.html

Create a SAP Fiori App and Deploy it to SAP S/4HANA Cloud:
https://developers.sap.com/tutorials/abap-s4hanacloud-procurement-purchasereq-shop-ui.html

Set Up Trust Between SAP Cloud Identity Services and SAP BTP (CF):
https://developers.sap.com/tutorials/abap-custom-ui-trust-cf.html

User Management (IAS or IDP) overview:
https://community.sap.com/t5/enterprise-resource-planning-blogs-by-sap/user-management-in-a-nutshell-for-the-sap-s-4hana-cloud-public-edition/ba-p/13556782
```

**STEP**: License
**DESCRIPTION**: Licensing statement for the documentation.
**LANGUAGE**: Text
**CODE**:
```text
Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
Licensed under the Apache Software License, version 2.0 (see ../../LICENSES/Apache-2.0.txt).
```
--------------------------------

**TITLE**: Handling Self-Signed SSL Certificates in SAP Fiori Tools (Actionable Guide)

**INTRODUCTION**: Practical, developer-focused steps to export, install, and configure trust for self-signed or private CA SSL certificates so SAP Fiori Tools, VS Code, Node.js, local UI5 preview and ABAP deployment can connect over HTTPS. Includes safe alternatives (NODE_EXTRA_CA_CERTS) and temporary bypass options (NODE_TLS_REJECT_UNAUTHORIZED) with security warnings.

**TAGS**: fiori-samples, ssl, certificates, nodejs, vscode, ui5, ui5-tooling, abap, macos, windows, linux

**STEP**: 1 — When to apply / prerequisites
**DESCRIPTION**: Apply these steps when the backend uses HTTPS with a certificate issued by a private or local CA that is not trusted by your OS or Node.js. If the backend is accessed via IP, ensure the certificate includes that IP in the SAN (Subject Alternative Name). If the certificate is invalid (expired, wrong host, broken chain) contact your administrator — these steps do not fix invalid certificates.
**LANGUAGE**: Text
**CODE**:
```text
Prerequisites:
- Certificate issued by a private or local CA (self-signed or enterprise CA).
- If connecting via IP, certificate must include IP in Subject Alternative Name (SAN).
- These steps assume the cert is otherwise valid (not expired, correct host name).
References:
- SAP Help: https://help.sap.com/docs/SAP_FIORI_tools/...
- Node.js extra CA docs: https://nodejs.org/api/cli.html#node_extra_ca_certsfile
```

**STEP**: 2 — Export the server/CA certificate from browser
**DESCRIPTION**: Use Edge/Chrome/Firefox to export the site certificate (CA or server cert depending on your CA structure). Save as .pem, .crt, .cer or .cert. Prefer exporting the CA certificate (the issuer) if available so multiple server certs are trusted.
**LANGUAGE**: Text
**CODE**:
```text
Chrome / Edge:
- Click padlock → "Connection is Not Secure" / "Certificate (Invalid)" → Details → Copy to File → follow wizard → save as .pem or .crt

Firefox:
- Padlock → "Connection Not Secure" → More Information → View Certificate → Details → Export → save as .crt or .cer

Output file examples:
- C:\path\to\your\certificate.crt
- /home/user/certs/my-ca.crt
```

**STEP**: 3 — Install certificate into OS trust store (so VS Code and browsers trust it)
**DESCRIPTION**: Install the exported CA certificate into the OS trust store. Prefer CLI commands for reproducibility: Windows (certutil) or macOS (security). GUI instructions are also available but are not scriptable.
**LANGUAGE**: PowerShell / Bash / Text
**CODE**:
```powershell
# Windows (CLI): Add certificate to Trusted Root Certification Authorities (requires admin)
certutil -addstore -f "Root" "C:\path\to\your\certificate.crt"

# Alternatively (GUI): Right-click .crt -> Install Certificate -> Local Machine or Current User -> Trusted Root Certification Authorities
```

```bash
# macOS (CLI): Add to System keychain and mark trusted (requires sudo)
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /path/to/your/certificate.crt

# Alternatively (GUI): Right-click certificate -> Open With -> Keychain Access -> select System keychain -> import
```

**STEP**: 4 — Configure Node.js to trust the custom CA (NODE_EXTRA_CA_CERTS)
**DESCRIPTION**: Use NODE_EXTRA_CA_CERTS to add the CA to Node.js trust store without disabling validation. Works for Node-based tools (SAP Fiori generator, ui5 tooling, npm, yarn). File path can be .pem/.crt/.cer/.cert.
**LANGUAGE**: PowerShell / Bash
**CODE**:
```powershell
# Windows PowerShell (current session only)
$env:NODE_EXTRA_CA_CERTS = "C:\path\to\your\certificate.crt"
# Verify
$env:NODE_EXTRA_CA_CERTS

# Run Node with the variable for one command
$env:NODE_EXTRA_CA_CERTS = "C:\path\to\your\certificate.crt"; node your-script.js
```

```bash
# macOS / Linux (current session only)
export NODE_EXTRA_CA_CERTS=/path/to/your/certificate.crt
# Verify
echo $NODE_EXTRA_CA_CERTS

# Run Node with the variable for one command
NODE_EXTRA_CA_CERTS=/path/to/your/certificate.crt node your-script.js
```

**STEP**: 5 — Temporary global bypass (NOT RECOMMENDED for production)
**DESCRIPTION**: For short-term development troubleshooting only: disable certificate verification globally in Node.js using NODE_TLS_REJECT_UNAUTHORIZED=0. This is insecure (MITM risk). Prefer NODE_EXTRA_CA_CERTS instead.
**LANGUAGE**: Bash / PowerShell
**CODE**:
```bash
# macOS / Linux (temporary, current session)
export NODE_TLS_REJECT_UNAUTHORIZED=0
# Run a command with bypass just for that execution
NODE_TLS_REJECT_UNAUTHORIZED=0 node your-script.js
```

```powershell
# Windows PowerShell (current session)
$env:NODE_TLS_REJECT_UNAUTHORIZED = '0'
# Run a Node.js script with this setting
$env:NODE_TLS_REJECT_UNAUTHORIZED = '0'; node your-script.js
```

**STEP**: 6 — Disable SSL validation for local UI5 preview (ui5.yaml)
**DESCRIPTION**: To accept self-signed certs in the local UI5 preview middleware, set ignoreCertError in ui5.yaml -> server -> customMiddleware -> fiori-tools-proxy configuration. Place this file at your project root (ui5.yaml).
**LANGUAGE**: YAML
**CODE**:
```yaml
# ui5.yaml (project root) - local preview proxy config
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
        ignoreCertError: false # set true to ignore cert errors (self-signed). Default = false
        ui5:
          path:
            - /resources
            - /test-resources
          url: https://ui5.sap.com
        backend:
          - path: /here
            url: https://my-backend-host:44300
```

**STEP**: 7 — Disable SSL validation for ABAP deployment (ui5-deploy.yaml)
**DESCRIPTION**: For deploy-to-abap tasks you can set ignoreCertError in ui5-deploy.yaml under the deploy task configuration. Use only if you understand the security risks.
**LANGUAGE**: YAML
**CODE**:
```yaml
# ui5-deploy.yaml (project root) - deploy-to-abap task
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
        ignoreCertError: true # set true to accept self-signed certs (insecure)
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

**STEP**: 8 — Persist environment variables (Windows and macOS/Linux)
**DESCRIPTION**: Examples to persist NODE_EXTRA_CA_CERTS or NODE_TLS_REJECT_UNAUTHORIZED. Prefer setting NODE_EXTRA_CA_CERTS persistently over disabling TLS checks.
**LANGUAGE**: PowerShell / Bash
**CODE**:
```powershell
# Windows - set permanently for all users (Machine) - requires admin
[Environment]::SetEnvironmentVariable("NODE_EXTRA_CA_CERTS", "C:\path\to\your\certificate.crt", "Machine")
# or set NODE_TLS_REJECT_UNAUTHORIZED (NOT RECOMMENDED)
[Environment]::SetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED", "0", "Machine")
```

```powershell
# Windows - set permanently for current user
[Environment]::SetEnvironmentVariable("NODE_EXTRA_CA_CERTS", "C:\path\to\your\certificate.crt", "User")
```

```bash
# Linux / macOS - for all users (requires sudo)
sudo sh -c 'echo "NODE_EXTRA_CA_CERTS=/path/to/your/certificate.crt" >> /etc/environment'

# Linux / macOS - for current user (Bash)
echo 'export NODE_EXTRA_CA_CERTS=/path/to/your/certificate.crt' >> ~/.bashrc
source ~/.bashrc

# Zsh
echo 'export NODE_EXTRA_CA_CERTS=/path/to/your/certificate.crt' >> ~/.zshrc
source ~/.zshrc
```

**STEP**: 9 — Security risks and recommended practices
**DESCRIPTION**: Summary of risks and best practices to keep environments secure.
**LANGUAGE**: Text
**CODE**:
```text
Security summary:
- Do NOT use NODE_TLS_REJECT_UNAUTHORIZED=0 or ignoreCertError:true in production.
- Risks: Man-in-the-Middle (MITM), broken chain of trust, malicious site access, policy violations.
Best practices:
1. Install the CA certificate into the OS trust store (Step 3) and/or use NODE_EXTRA_CA_CERTS (Step 4).
2. Use ui5.yaml / ui5-deploy.yaml ignoreCertError only for short-term dev scenarios and document why.
3. If certificate is invalid (expired, wrong host, broken chain) contact the certificate administrator — do not bypass validation.
```

**STEP**: 10 — Quick references
**DESCRIPTION**: Useful links and license reference for the original SAP Fiori Tools guidance.
**LANGUAGE**: Text
**CODE**:
```text
References:
- SAP Fiori Tools SSL docs: https://help.sap.com/docs/SAP_FIORI_tools/...
- SAP Community: https://community.sap.com/topics/fiori-tools
- Node.js: NODE_EXTRA_CA_CERTS docs: https://nodejs.org/api/cli.html#node_extra_ca_certsfile

License:
Copyright (c) 2009-2025 SAP SE or an SAP affiliate company. Apache-2.0 (see project LICENSE file)
```
--------------------------------

**TITLE**: Migrate Neo Fiori UI Application to Cloud Foundry using Managed Approuter (Option 1)

**INTRODUCTION**: Step-by-step migration of an exported Neo mtar/zip Fiori UI application into a new Fiori UI project prepared for Cloud Foundry deployment using a managed approuter. Includes unpacking, VS Code Fiori tooling migration, generation of xs-app.json, local testing, MTA build/deploy, and required security scope additions.

**TAGS**: fiori, sapui5, cloud-foundry, neo, approuter, migration, xs-app.json, xs-security.json, mta, BAS

**STEP**: 1 — Unpack exported Neo mtar/zip
**DESCRIPTION**: Unzip the exported mtar or zip file into a working folder. If the mtar contains nested zips, unzip them as required.
**LANGUAGE**: Bash
**CODE**:
```bash
unzip /home/user/projects/neo/solution.mtar -d /home/user/projects/neo/
# If the content includes nested archives, unzip them similarly
```

**STEP**: 2 — Create a new Fiori UI project folder
**DESCRIPTION**: Prepare a destination folder that will contain the migrated UI app files.
**LANGUAGE**: Bash
**CODE**:
```bash
mkdir -p /home/user/projects/fioriapp
```

**STEP**: 3 — Extract the Neo UI application into the new folder
**DESCRIPTION**: Unzip the Neo UI application package (example name: manageproductsneo.zip) into the Fiori UI folder created above.
**LANGUAGE**: Bash
**CODE**:
```bash
unzip /home/user/projects/neo/manageproductsneo.zip -d /home/user/projects/fioriapp/
```

**STEP**: 4 — Start Fiori tools migration (VS Code Command Palette)
**DESCRIPTION**: Run the automated migration to convert project structure and metadata for use with Fiori tools and BAS. Follow the interactive prompts.
**LANGUAGE**: Text
**CODE**:
```
Run in VS Code: "Fiori: Migrate Project for use in Fiori tools"
- Select the project folder (/home/user/projects/fioriapp)
- Ensure SAPUI5 preview version is latest or matches your project
- Start migration
Outcome: a migration results page will open with issues to address and an application information page with runnable commands.
```

**STEP**: 5 — Generate xs-app.json from neo-app.json
**DESCRIPTION**: Transform the Neo html5 descriptor (neo-app.json) into xs-app.json for Cloud Foundry routing. Re-run if xs-app.json is overwritten/deleted.
**LANGUAGE**: Text
**CODE**:
```
Run in VS Code: "Neo Migration: HTML 5 Application descriptor transformation"
- Select the file: neo-app.json
Outcome: xs-app.json is created with routes populated from neo-app.json (used for CF deployment)
```

**STEP**: 6 — Change to the UI application root
**DESCRIPTION**: Move into the project root to run deployment and build scripts.
**LANGUAGE**: Bash
**CODE**:
```bash
cd /home/user/projects/fioriapp
```

**STEP**: 7 — Configure deployment for Cloud Foundry (managed approuter)
**DESCRIPTION**: Run the deploy-config script to add the application to a managed approuter. Use the interactive selections shown.
**LANGUAGE**: Bash
**CODE**:
```bash
npm run deploy-config cf

# During prompts:
# - Destination: select "none" (xs-app.json already created)
# - Add application to managed application router: Yes
# - Overwrite xs-app.json: No (keep generated xs-app.json)
# After completion: review ui5.yaml and ui5-deploy.yaml to ensure parameters are correct
```

**STEP**: 8 — Start the UI locally (BAS preview)
**DESCRIPTION**: Preview the migrated UI locally to verify functionality before building.
**LANGUAGE**: Bash
**CODE**:
```bash
npm run start
# Preview UI in BAS / Fiori preview
```

**STEP**: 9 — Build MTA archive for Cloud Foundry
**DESCRIPTION**: Create the deployable multi-target application (MTA) archive.
**LANGUAGE**: Bash
**CODE**:
```bash
npm run build:mta
# Produces the MTA archive to be deployed to Cloud Foundry
```

**STEP**: 10 — Add security scopes and role templates to xs-security.json (SECURITY ALERT)
**DESCRIPTION**: The generated xs-security.json may be empty. Append required scopes, role-templates, and role-collections so role collections can be managed at the subaccount level and applied to routes.
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

**STEP**: 11 — Apply scopes to xs-app.json routes
**DESCRIPTION**: For any routes that require authorization, add the "scope" property referencing the scope in xs-security.json.
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

**STEP**: 12 — Deploy the generated MTA archive to Cloud Foundry
**DESCRIPTION**: Run the npm deploy script to push the MTA to CF via the configured toolchain.
**LANGUAGE**: Bash
**CODE**:
```bash
npm run deploy
```

**STEP**: 13 — Retrieve the deployed HTML5 app URL / verify deployment
**DESCRIPTION**: List HTML5 apps to retrieve the deployed application URL. Alternatively, use the BTP Cockpit (Subaccount > HTML5 Applications).
**LANGUAGE**: Bash
**CODE**:
```bash
# Example: list HTML5 apps and show the deployed app details (replace destination id as needed)
cf html5-list -di ns-manageproductsneo-destination-service --runtime launchpad

# Or: login to SAP BTP cockpit -> Subaccount -> HTML5 Applications -> find application URL
```

**STEP**: 14 — Map user to role collections and test access
**DESCRIPTION**: Ensure your user is assigned to the correct role-collection(s) in the SAP BTP subaccount so scoped routes do not return HTTP 403.
**LANGUAGE**: Text
**CODE**:
```
- In SAP BTP Cockpit: Subaccount -> Security -> Role Collections
- Assign your user to the "ViewerPUBLIC" (or other) role-collection created from xs-security.json
- Test the app URL; scoped routes require the appropriate role assignment
```

**STEP**: 15 — Undeploy (optional)
**DESCRIPTION**: Remove the deployed MTA/app from Cloud Foundry if required.
**LANGUAGE**: Bash
**CODE**:
```bash
npm run undeploy
```

**STEP**: 16 — Reference: additional scripts and configuration
**DESCRIPTION**: For extra commands and parameters, open package.json and review ui5.yaml and ui5-deploy.yaml for deployment options and customizations.
**LANGUAGE**: Text
**CODE**:
```
- Inspect package.json for available npm scripts (deploy, undeploy, build:mta, start, deploy-config)
- Check ui5.yaml and ui5-deploy.yaml to verify build and deploy parameters
```
--------------------------------

**TITLE**: Configure MTA for multiple migrated Neo UI applications (Managed Approuter)

**INTRODUCTION**: Step-by-step developer-focused guide to create a managed application router (approuter) project, migrate Neo UI apps into it, generate required descriptors, add security scopes, build and deploy an MTA archive to Cloud Foundry (BTP). Use in Business Application Studio (BAS) or VS Code with Fiori tools.

**TAGS**: mta, approuter, fiori, migration, neo, xs-app.json, xs-security.json, cf, html5

STEP: 1 — Generate Managed Approuter (BAS / VS Code)
DESCRIPTION: Create a managed approuter project using the CF Application Router Generator. Provide a unique MTA ID (example: managedapp) and set the project root folder (example: /home/user/projects/managedapp).
LANGUAGE: Shell / VSCode
CODE:
```bash
# In BAS or VS Code:
# From View -> Command Palette, run "Open CF Application Router Generator"
# Enter router path (example): /home/user/projects
# Select: Managed Approuter
# Enter unique MTA ID (example): managedapp
```

STEP: 2 — Change into managedapp root
DESCRIPTION: Move into the new managedapprouter project root created by the generator.
LANGUAGE: Bash
CODE:
```bash
cd /home/user/projects/managedapp/
```

STEP: 3 — Unzip exported Neo MTAR/ZIP
DESCRIPTION: Unpack your exported Neo mtar (or zip) into a working directory. Some mtar files contain nested zips that must be extracted separately.
LANGUAGE: Bash
CODE:
```bash
unzip /home/user/projects/neo/solution.mtar -d /home/user/projects/neo/
```

STEP: 4 — Unzip the Neo UI application to a subfolder in managedapp
DESCRIPTION: Extract the Neo application archive into the managedapp/fioriapp subfolder (create the subfolder if needed). This will be the UI app you migrate.
LANGUAGE: Bash
CODE:
```bash
unzip /home/user/projects/neo/manageproductsneo.zip -d /home/user/projects/managedapp/fioriapp
```

STEP: 5 — Migrate UI project for Fiori tools
DESCRIPTION: Run the Fiori tools migration to convert the UI app for local preview and tooling. Select the migrated project and appropriate SAPUI5 preview version, then start migration. Review migration results and the application information page.
LANGUAGE: Shell / VSCode
CODE:
```bash
# In BAS or VS Code:
# Run command: "Fiori: Migrate Project for use in Fiori tools"
# - Select your project (managedapp/fioriapp)
# - Choose SAPUI5 preview version (latest or project-appropriate)
# - Select "Start migration"
# - Review migration results and application information page
```

STEP: 6 — Transform neo-app.json to xs-app.json
DESCRIPTION: Convert the Neo router descriptor to the xs-app.json format used by Cloud Foundry. Use the Neo Migration tool to generate xs-app.json from neo-app.json. If xs-app.json is overwritten or deleted, re-run this migration step.
LANGUAGE: Shell / VSCode
CODE:
```bash
# In BAS or VS Code:
# Run command: "Neo Migration: HTML 5 Application descriptor transformation"
# - Select the project's neo-app.json
# - Tool generates xs-app.json in the UI project with routes populated from neo-app.json
```

STEP: 7 — Change into the Fiori UI application folder
DESCRIPTION: Adopt the UI project folder as the active working directory for subsequent npm commands and builds.
LANGUAGE: Bash
CODE:
```bash
cd /home/user/projects/managedapp/fioriapp
```

STEP: 8 — Create deploy config for Cloud Foundry
DESCRIPTION: Run the provided npm script to create deployment configuration for CF. When prompted:
- Destination: select "none" if xs-app.json already exists.
- Overwrite xs-app.json: answer "No" (if xs-app.json was generated in prior step).
- After execution, inspect ui5.yaml and ui5-deploy.yaml for correct parameters.
LANGUAGE: Bash
CODE:
```bash
npm run deploy-config cf
# Follow prompts:
# - Select destination: none (if xs-app.json already exists)
# - Overwrite xs-app.json: No (unless re-generating)
# Then manually review:
# /home/user/projects/managedapp/fioriapp/ui5.yaml
# /home/user/projects/managedapp/fioriapp/ui5-deploy.yaml
```

STEP: 9 — Preview the UI locally
DESCRIPTION: Start a local preview server to verify the migrated UI app runs locally in BAS/VS Code.
LANGUAGE: Bash
CODE:
```bash
npm run start
# Verify UI loads in SAPUI5 preview
```

STEP: 10 — Build MTA archive including all Fiori UI applications
DESCRIPTION: Build the MTA archive that bundles the approuter and appended Fiori UI apps.
LANGUAGE: Bash
CODE:
```bash
npm run build
# This builds the MTA archive (mta_archives/*.mtar) containing the managedapprouter and UI modules
```

STEP: 11 — SECURITY ALERT — Add scopes and role collections to xs-security.json
DESCRIPTION: The generated xs-security.json often contains no scopes/roles. Append the following scopes, role-templates, and role-collections to xs-security.json to enable role-based route protection. Replace $XSAPPNAME with your xs application name variable if required by your build.
LANGUAGE: JSON
CODE:
```json
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
```

STEP: 12 — Apply scopes to xs-app.json route(s)
DESCRIPTION: Protect one or more routes in xs-app.json by attaching the scope name you added to xs-security.json. Add the "scope" property to each route that requires role-based access.
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

STEP: 13 — Deploy MTA archive to Cloud Foundry
DESCRIPTION: Deploy the built MTA to your CF space using the provided npm script. After deployment, retrieve the HTML5 app runtime URL via cf CLI or BTP cockpit.
LANGUAGE: Bash
CODE:
```bash
npm run deploy

# To get the HTML5 app URL (example using managedapp-destination-service):
cf html5-list -u -di managedapp-destination-service -u --runtime launchpad

# Or: Login to SAP BTP cockpit -> Subaccount -> HTML5 Applications -> find deployed app URL
```

STEP: 14 — Verify role mapping to access scoped routes
DESCRIPTION: Ensure your BTP user is assigned to the correct role collections (e.g., ViewerPUBLIC) at the subaccount/org level; otherwise accessing scoped routes returns HTTP 403.
LANGUAGE: Shell / Console
CODE:
```bash
# No specific command; verify in SAP BTP cockpit:
# Subaccount -> Security -> Role Collections -> assign users to the "ViewerPUBLIC" role collection (or other role-collection names added)
```

STEP: 15 — Undeploy MTA archive (optional)
DESCRIPTION: Undeploy the application if you need to remove it from CF.
LANGUAGE: Bash
CODE:
```bash
npm run undeploy
```

STEP: 16 — Append additional migrated UI apps into the root mta.yaml
DESCRIPTION: To add more migrated UI apps to the same managedapp MTA, repeat steps 3–12 for each Neo UI app and add each migrated app as a subfolder under /home/user/projects/managedapp/. Ensure each new module is added to mta.yaml and built as part of the MTA archive.
LANGUAGE: Bash / YAML
CODE:
```bash
# Example folder structure:
# /home/user/projects/managedapp/
# ├─ mta.yaml
# ├─ approuter/...
# ├─ fioriapp/        <-- migrated UI app 1
# ├─ fioriapp2/       <-- migrated UI app 2 (repeat migration steps)
# ...
# After adding a new UI subfolder, update mta.yaml to include the new module and:
npm run build
npm run deploy
```
--------------------------------

**TITLE**: Migrate HTML5 Applications from SAP BTP Neo to Cloud Foundry (step-by-step code-ready guide)

**INTRODUCTION**: Practical, code-focused steps and complete configuration examples to migrate custom HTML5/Fiori applications from SAP BTP Neo to Cloud Foundry. Includes folder setup, service migration (destinations/connectivity), security config, Cloud Foundry commands, UI5 fixes, and common troubleshooting actions with exact file snippets to use or adapt.

**TAGS**: sap-btp, cloud-foundry, neo-to-cf, html5, fiori, ui5, migration, destinations, xs-security, mtad, mtar, config, approuter

STEP: 1 — Prerequisites and preparation
DESCRIPTION: Verify required subscriptions and access before migrating. Ensure SAP BTP account, SAP Business Application Studio (BAS) subscription, and SAP Launchpad Service are available. If services not visible, add entitlements in the subaccount Entitlements -> Configure Entitlements, then add via Service Marketplace.
LANGUAGE: Text
CODE:
```text
Required:
- SAP BTP account
- SAP Business Application Studio subscription (see BAS tutorial)
- SAP Launchpad Service subscription
- Access to your Neo project artifacts: *.mtar | *.zip | mta.yaml and UI project folders
```

STEP: 2 — Create SAP Fiori Dev Space (BAS)
DESCRIPTION: In the BTP cockpit open Instances and Subscriptions -> SAP Business Application Studio -> Dev Space Manager. Create a "Full Stack Cloud Application" dev space and enable SAP HANA Tools. This step prepares the environment for migration tasks and local testing.
LANGUAGE: Text
CODE:
```text
BTP cockpit -> Instances and Subscriptions -> SAP Business Application Studio -> Open Dev Space Manager
Create dev space:
- Type: Full Stack Cloud Application
- Enable: SAP HANA Tools
```

STEP: 3 — Generate migration folder and upload Neo artifacts
DESCRIPTION: Create a migration working folder in your BAS workspace, then upload Neo artifacts (mtar/zip, mta.yaml, project folders) into it.
LANGUAGE: Bash
CODE:
```bash
# create migration folder in BAS or local workspace
mkdir -p /home/user/projects/neo/

# Upload (drag-and-drop) the following into /home/user/projects/neo/:
# - *.mtar or *.zip exported from Neo
# - mta.yaml (if available)
# - webapp and project root files to inspect
```

STEP: 4 — Create base migration config files (xs-security.json, mtad.yaml, config.json)
DESCRIPTION: Create required files to provision Cloud Foundry managed services (destination, connectivity) and capture security role configuration. Use the templates below; place them in the migration folder.
LANGUAGE: Bash
CODE:
```bash
cd /home/user/projects/neo/
touch xs-security.json mtad.yaml config.json
```

STEP: 5 — mtad.yaml (provision subaccount-level destination & connectivity)
DESCRIPTION: Use this mtad schema to create managed-service resources for destination and connectivity. This example uses the "lite" service-plan and points destination initialization to config.json.
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

STEP: 6 — config.json (subaccount destination init data)
DESCRIPTION: This sample creates a subaccount-level destination named "northwind". Adjust fields (Name, URL, Authentication, etc.) for each destination you migrate. Note: subaccount-level destinations are accessible to all apps in the subaccount.
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

STEP: 7 — xs-security.json (global role collection and templates)
DESCRIPTION: Example xs-security.json defines an xsappname, tenant-mode, a scope, role-template and a role-collection so migrated apps can reference migrationcf.globalrole. Update names and roles per your security model.
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

STEP: 8 — Notes: subaccount vs instance-based destinations
DESCRIPTION: This configuration creates subaccount-level destinations (shared by all apps). If you want destinations scoped to an application instance (private to the app), migrate using instance-based destination configuration — see linked sample for managed approuter + instance-level destination pattern.
LANGUAGE: Text
CODE:
```text
Reference: Instance-based destination example:
https://blogs.sap.com/2022/02/10/build-and-deploy-a-cap-project-node.js-api-with-a-sap-fiori-elements-ui-and-a-managed-approuter-configuration/
```

STEP: 9 — Login to Cloud Foundry target and deploy services
DESCRIPTION: Authenticate to the Cloud Foundry endpoint for the target subaccount/space and deploy the resources defined in mtad.yaml/mtar. Run CF login and then CF deploy from the migration folder.
LANGUAGE: Bash
CODE:
```bash
# Login to CF (replace placeholders)
cf login -a <api-endpoint> -o <organisation> -s <space>

# Deploy the MTA/mtad configuration to provision services (run from migration folder)
cf deploy
```

STEP: 10 — Decide migration option for your UI application
DESCRIPTION: You have two folder-structure options for migrating Neo UI apps:
- Option1: migrate a single Fiori UI application (updated for @ui5/cli v3) — see Option1.md
- Option2: migrate multiple Fiori UI applications in a single project (references @ui5/cli v2) — see Option2.md
Both use managed approuter configuration for deployment.
LANGUAGE: Text
CODE:
```text
- Option1.md  -> Single UI app migration (use @ui5/cli v3)
- Option2.md  -> Multiple UI apps migration (uses @ui5/cli v2)
```

STEP: 11 — Sync Component IDs: Component.js, manifest.json, and test/flpSandbox.html
DESCRIPTION: If UI5 component fails to load locally (Component preload errors or getResourceBundle undefined), ensure Component.js metadata ID, manifest.json sap.app.id, and test/flpSandbox.html resource roots and additionalInformation values match. Update these three points to the same namespace.
LANGUAGE: JavaScript
CODE:
```javascript
// Component.js (example)
// Ensure the namespace here is the same used in manifest.json and test/flpSandbox.html
t.extend("ns.manageproductsneo.Component", { metadata: { manifest: "json" } });
```

LANGUAGE: JSON
CODE:
```json
// manifest.json (sap.app.id must match the Component namespace minus the .Component)
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
```text
# test/flpSandbox.html updates (ensure both entries use the full Component namespace)
Line 49: additionalInformation: "SAPUI5.Component=ns.manageproductsneo",
Line 69: data-sap-ui-resourceroots='{"ns.manageproductsneo": "../"}'
```

STEP: 12 — Fix manifest.json i18n configuration (invalid input / _loadI18n errors)
DESCRIPTION: If UI5 fails with "invalid input" when loading i18n, simplify the i18n entry in manifest.json to a string path. If still failing, bump minUI5Version or pin local ui5 version in ui5.yaml for local validation.
LANGUAGE: JSON
CODE:
```json
// Bad (causes invalid input)
"i18n": {
  "bundleUrl": "i18n/i18n.properties",
  "supportedLocales": [ "" ],
  "fallbackLocale": ""
},

// Good (use this)
"i18n": "i18n/i18n.properties"
```

LANGUAGE: YAML
CODE:
```yaml
# ui5.yaml: pin version for local ui5 tooling (example sets 1.109.0)
ui5:
  path:
    - /resources
    - /test-resources
  url: https://ui5.sap.com
  version: 1.109.0
```

STEP: 13 — Bump UI5 min version in manifest (optional)
DESCRIPTION: If i18n or other runtime features require newer UI5, update "minUI5Version" in manifest.json to a supported newer version. Consult UI5 version overview for supported versions.
LANGUAGE: JSON
CODE:
```json
// manifest.json
"sap.ui5": {
  "dependencies": {
    "minUI5Version": "1.109.0"
  }
}
```

STEP: 14 — Fix CI static analysis (locate-reuse-libs.js parsing error)
DESCRIPTION: If static code analysis fails with JS_PARSING_ERROR on locate-reuse-libs.js, update the analysis-plugin version in pom.xml to a newer 2.x release to avoid parsing errors.
LANGUAGE: XML
CODE:
```xml
<!-- Existing plugin snippet in pom.xml -->
<plugin>
  <groupId>com.sap.ca</groupId>
  <artifactId>analysis-plugin</artifactId>
  <version>${sap.analysis.version}</version>
</plugin>

<!-- Set property -->
<sap.analysis.version>2.0.4</sap.analysis.version>
```

STEP: 15 — Troubleshoot HTTP 403 errors after deployment (scope/role issues)
DESCRIPTION: If deployed app returns HTTP 403, check logs in BTP cockpit -> HTML5 Applications -> logs. Root cause is often missing scope/role mapping in xs-app.json or the role collection does not include the logged-in user. Add user to role collection, clear cookies or use incognito to revalidate session and roles.
LANGUAGE: Text
CODE:
```text
Troubleshooting actions:
- Review BTP cockpit -> HTML5 Applications -> select app -> Logs
- Verify xs-app.json route/app security scopes match xs-security.json role/collections
- Add user IDs to role-collection defined in xs-security.json if required
- Delete session cookies or use an incognito window to force re-login
```

STEP: 16 — Troubleshoot HTTP 404 errors for deployed app (absolute AJAX paths)
DESCRIPTION: If application returns 404 for static or API calls after deployment, inspect browser network requests. Absolute paths in AJAX calls will not resolve the unique GUID assigned to each app in Cloud Foundry. Convert absolute paths to relative paths or use destination service for back-end calls.
LANGUAGE: Text
CODE:
```text
Example fix:
- Change AJAX call from absolute path:
  GET https://my-subaccount-apps/some/api
- To relative path within app:
  GET /some/api
Or route API calls through a destination bound to the app.
```

STEP: 17 — Run local preview and common start command
DESCRIPTION: Use npm start or ui5 tooling to run local preview. If component or manifest mismatches exist they will surface here — use the previous steps to sync IDs and i18n.
LANGUAGE: Bash
CODE:
```bash
# from app root
npm install
npm run start
# or use @ui5/cli serve if configured
ui5 serve --config=ui5.yaml
```

STEP: 18 — Deploy the migrated UI to Cloud Foundry (managed approuter)
DESCRIPTION: After migration and testing, package and deploy the app (managed approuter configuration). Follow your chosen Option1/Option2 project layout and CI/CD pipeline to build mtar and push to CF. Example high-level commands depend on your pipeline; ensure mta archive contains correct mtad/mtar and xs-security.json.
LANGUAGE: Bash
CODE:
```bash
# Build MTA archive (example)
mbt build

# Deploy MTA archive to Cloud Foundry
cf deploy mta_archives/<your_project>.mtar
```

STEP: 19 — Reference links and further security administration
DESCRIPTION: Useful references for deeper migration, security administration and UI5 version details.
LANGUAGE: Text
CODE:
```text
References:
- Migration guide: https://help.sap.com/docs/HTML5_APPLICATIONS/b98f42a4d2cd40a9a3095e9f0492b465/b1763fd06421457b9970a3555020e750.html
- Security Admin: https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/1ff47b2d980e43a6b2ce294352333708.html
- UI5 manifest help: https://sapui5.hana.ondemand.com/sdk/#/topic/3a9babace121497abea8f0ea66e156d9.html
- UI5 version overview: https://sapui5.hana.ondemand.com/versionoverview.html
```

STEP: 20 — License
DESCRIPTION: License note for repo and content usage.
LANGUAGE: Text
CODE:
```text
Copyright (c) 2009-2025 SAP SE or an SAP affiliate company.
Licensed under the Apache Software License, version 2.0 (see ../LICENSES/Apache-2.0.txt).
```
--------------------------------

**TITLE**: Deploy Fiori generator extensions to Business Application Studio (BAS) using WEX

**INTRODUCTION**: Step-by-step, code-focused instructions to prepare, publish and register a Fiori generator extension so it is automatically installable in SAP Business Application Studio dev spaces via the WEX (Business Application Studio Extension Management) tool. Includes local build/test, GitHub release packaging with PAT, example WEX config JSON, deployment command and verification steps.

**TAGS**: BAS, Business Application Studio, Fiori, generator-extension, wex, npm, GitHub, PAT, release, yeoman

**STEP**: 1 — Build and test extension locally

**DESCRIPTION**: Build your extension (ensure compiled JS is included if using TypeScript), create a tarball with npm pack, and install locally to verify it works globally in your environment.

**LANGUAGE**: Shell

**CODE**:
```shell
# From the extension package root:
# 1. Ensure TypeScript is compiled and the compiled output is included in the package (e.g. dist/).
# 2. Create a tarball of the package:
npm pack

# This produces a file like: my-ext-1.0.0.tgz
# 3. Install the tarball globally to test:
npm install -g ./my-ext-1.0.0.tgz

# 4. Run any local generator/test commands to verify behavior
# (example — run your Yeoman generator):
yo @sample/fiori-gen-ext
```

**STEP**: 2 — Publish package to GitHub Releases and create a PAT

**DESCRIPTION**: Push your package repo to GitHub (private or restricted access). Create a GitHub Release and generate a GitHub Personal Access Token (PAT) with minimum scopes read:packages and repo. Use the release tarball URL (with embedded PAT for BAS access) as the yeomanPackages version URL in the WEX config.

**LANGUAGE**: Shell / Notes

**CODE**:
```text
# Recommended:
# - Push compiled package (including compiled JS/dist) to GitHub repo
# - Create a Release (e.g. v0.0.1) via GitHub UI or API so a tarball URL is available:
#   e.g. https://github.com/<UserName>/sample-fiori-gen-ext/archive/refs/tags/v0.0.1.tar.gz

# Create a GitHub PAT (classic) with scopes:
# - read:packages
# - repo

# Construct the authenticated tarball URL (example pattern used by BAS WEX):
https://<UserName>:<GithubPAT>@github.com/<UserName>/sample-fiori-gen-ext/archive/refs/tags/v0.0.1.tar.gz
```

**STEP**: 3 — Prepare WEX simple-extension config JSON

**DESCRIPTION**: Create a Simple Extension config file (example filename sample-extension.json). Fill yeomanPackages with an entry for your generator package using the authenticated tarball URL. Optionally set autoSelectExtensions to auto-install into new dev spaces.

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
    "thumbnail": "<base64-encoded-image>"
  },
  "hidden": false,
  "version": "0.0.2",
  "vscodeExtensions": [],
  "yeomanPackages": [
    {
      "name": "@sample/fiori-gen-ext",
      "versionRange": "https://<UserName>:<GithubPAT>@github.com/<UserName>/sample-fiori-gen-ext/archive/refs/tags/v0.0.1.tar.gz"
    }
  ]
}
```

Note: To auto-select the extension for all new dev spaces add the fully-qualified id to autoSelectExtensions, e.g.
```json
"autoSelectExtensions": ["ext-sap-ux-stage/testing-sample-gen-ext"]
```

**STEP**: 4 — Install WEX tool (if needed) and deploy the config

**DESCRIPTION**: Install the BAS Extension Management CLI and deploy your config file to register the extension option on the BAS Create Dev Spaces page.

**LANGUAGE**: Shell

**CODE**:
```shell
# Install WEX CLI globally (if not already installed)
npm install -g @sapse/business-application-studio-extension-management

# Deploy the config file (example file: sample-extension.json)
wex deploy --verbose -f sample-extension.json
```

**STEP**: 5 — Verify installation in a created dev space

**DESCRIPTION**: After successful deployment the extension option appears on the BAS Create Dev Spaces page. When selected (or auto-selected) and a dev space is created, the extension should be installed. Check the install log inside the dev space for errors or confirmation.

**LANGUAGE**: Shell / Paths

**CODE**:
```shell
# Create a dev space in BAS from the Create Dev Space page and select the new extension option.

# In the opened dev space, check the WEX install log:
# Log file path inside the dev space:
cat /extbin/generators/simple-extension-yo-install-output.txt

# Verify that the generator is installed and available:
# - Check global npm list for the package
npm ls -g --depth=0 | grep "@sample/fiori-gen-ext"

# - Or run the generator in the dev space to validate:
yo @sample/fiori-gen-ext
```
--------------------------------

**TITLE**: Sample Fiori generator extension sub-generator (implementation & deployment guide)

**INTRODUCTION**: This document explains how to build, install, test and implement a Fiori generator extension for @sap/generator-fiori. It provides actionable code-focused examples for implementing FioriGeneratorExtensionAPI, customizing existing prompts, adding UI navigation steps, and writing to the in-memory file system during the Yeoman lifecycle. Use these examples to create an extension package (module name must include "fiori-gen-ext") that can be installed globally or bundled for Business Application Studio (BAS).

**TAGS**: fiori, sap, generator, extension, yeoman, vscode, bas, fiori-tools, typescript

**STEP**: 1 — Build & install (local testing)

**DESCRIPTION**: Commands to build the sample extension, produce an installable tarball, and install globally for local testing.

**LANGUAGE**: bash

**CODE**:
```bash
# Clone repo and install dependencies
git clone https://github.com/SAP-samples/fiori-tools-samples.git
cd fiori-tools-samples/sample-fiori-gen-ext
yarn install

# Build a production bundle (uses esbuild in sample)
yarn bundle

# Create an installable artifact
npm pack

# Install the generated .tgz globally for local testing
# Replace path-to-generated-tgz with the generated file, e.g. sample-fiori-gen-ext-1.0.0.tgz
npm i -g <path-to-generated-tgz>
```

**STEP**: 2 — Bundle for Business Application Studio (BAS) deployment

**DESCRIPTION**: Recommended bundling workflow to avoid installs at devspace startup. Notes about esbuild and bundling requirements; alternative: publish GitHub release and let WEX deploy.

**LANGUAGE**: bash

**CODE**:
```bash
# Create a bundle suitable for BAS (esbuild + shelljs are used in sample)
yarn bundle

# Check the generated bundle into your repo (recommended for BAS/WEX deployment)
# Optionally: create installable artifact and install locally for testing
npm pack
npm i -g <path-to-generated-tgz>

# Alternative: Create a GitHub release (Draft a new release) and let WEX deploy the release
# See: sample repo deploy_extension.md for BAS-specific instructions
```

**STEP**: 3 — Valid install locations & package requirements

**DESCRIPTION**: Where to install extension modules so the Fiori generator picks them up, and required package.json fields.

**LANGUAGE**: text

**CODE**:
```
Install locations (one of):
1. Global npm module location (npm -g root) -> npm install -g <extension-module-tgz>
2. Any standard BAS pre-install locations (configure via BAS dev space)
3. Custom VSCode setting: "Application Wizard: Installation Location"

Required package.json settings:
- Module folder name or package name must include: "fiori-gen-ext"
- package.json must include the keyword: "fiori-generator-extension"
- Also include "yeoman-generator" keyword to indicate a Yeoman generator

Example package.json snippet:
{
  "name": "@acme/acme-fiori-gen-ext",
  "keywords": [
    "fiori-generator-extension",
    "yeoman-generator"
  ]
}
```

**STEP**: 4 — FioriGeneratorExtensionAPI interface (types & import)

**DESCRIPTION**: Interface your generator must implement. Import types from @sap/generator-fiori. Use these hooks to provide settings, prompt extensions, and UI steps.

**LANGUAGE**: typescript

**CODE**:
```typescript
// imports (add others as needed)
import Generator from "yeoman-generator";
import {
  FioriGeneratorExtensionAPI,
  FioriGeneratorSettings,
  FioriGeneratorPromptExtension,
  Step
} from "@sap/generator-fiori";

// Interface (for reference, implemented by your generator)
export interface FioriGeneratorExtensionAPI {
  _getSettings?: () => FioriGeneratorSettings;
  _getExtensions?: () => FioriGeneratorPromptExtension;
  _getSteps?: () => Step[];
}
```

**STEP**: 5 — Minimal extension generator skeleton (TypeScript)

**DESCRIPTION**: Class skeleton showing how to implement the extension API and hold local state. Use this as the base for _getExtensions, _getSteps, prompting and writing phases.

**LANGUAGE**: typescript

**CODE**:
```typescript
import Generator from "yeoman-generator";
import {
  FioriGeneratorExtensionAPI,
  FioriGeneratorPromptExtension
} from "@sap/generator-fiori";

export default class SampleFioriGenExt extends Generator implements FioriGeneratorExtensionAPI {
  // Optional: hold answers across phases
  private localAnswers: Record<string, any> = {};

  // Optional access to Fiori generator state (injected by composeWith)
  // public fioriGeneratorState: any;

  // Provide prompt extensions, steps, settings below...
}
```

**STEP**: 6 — Customize existing Fiori generator prompts (_getExtensions)

**DESCRIPTION**: Extend validators and defaults for built-in Project Attributes prompts. Use names from FioriGeneratorPromptNames to target specific questions (module name, title, namespace, description, targetFolder, ui5Version). Custom validations run in addition to internal validations — return true or an error message.

**LANGUAGE**: typescript

**CODE**:
```typescript
import { FioriGeneratorExtensionAPI, FioriGeneratorPromptExtension, FioriGeneratorPromptNames } from "@sap/generator-fiori";

class SampleFioriGenExt extends Generator implements FioriGeneratorExtensionAPI {
  _getExtensions(): FioriGeneratorPromptExtension {
    const { projectAttributes: { mainQuestions: questionNames } } = FioriGeneratorPromptNames;

    const extensions: FioriGeneratorPromptExtension = {
      "@sap/generator-fiori": {
        [questionNames.name]: {
          validate: (input: string): boolean | string => {
            if (!input || input.length < 3) {
              return "Name length must be >= 3 characters";
            }
            return true;
          },
          default: "superapp1"
        },
        [questionNames.title]: {
          default: "Super App"
        }
      }
    };
    return extensions;
  }
}
```

**STEP**: 7 — Add new left-hand navigation steps and prompts

**DESCRIPTION**: Provide _getSteps() to add navigation items (one step maps to one prompt() call). Implement prompting() to display questions for each step, store answers in localAnswers for later phases. Use guiOptions.breadcrumb as needed for Yeoman UI.

**LANGUAGE**: typescript

**CODE**:
```typescript
import Generator from "yeoman-generator";
import { FioriGeneratorExtensionAPI } from "@sap/generator-fiori";
import { IPrompt as YUIStep } from "@sap-devx/yeoman-ui-types";

export default class SampleFioriGenExt extends Generator implements FioriGeneratorExtensionAPI {
  private localAnswers: Record<string, any> = {};

  _getSteps(): YUIStep[] {
    return [
      { name: "Extension step 1", description: "Extension step 1 description" },
      { name: "Extension step 2", description: "Extension step 2 description" }
    ];
  }

  async prompting(): Promise<void> {
    // Prompts for "Extension step 1"
    const answersPrompt1 = await this.prompt([
      {
        type: "input",
        guiOptions: { breadcrumb: true },
        name: "prompt1",
        message: "Sample prompt1",
        default: "Default value prompt1",
        validate: (val: string) => val ? true : "Enter a value for prompt1"
      },
      {
        type: "input",
        guiOptions: { breadcrumb: true },
        name: "prompt2",
        message: "Sample prompt2",
        validate: (val: string) => val ? true : "Enter a value for prompt2"
      }
    ]);

    // Prompts for "Extension step 2"
    const answersPrompt2 = await this.prompt([
      {
        type: "input",
        guiOptions: { breadcrumb: true },
        name: "prompt3",
        message: "Sample prompt3",
        default: () => (this.fioriGeneratorState?.project?.namespace || "")
      },
      {
        type: "input",
        guiOptions: { breadcrumb: true },
        name: "prompt4",
        message: "Sample prompt4"
      }
    ]);

    // Combine answers for access in later phases
    this.localAnswers = { ...answersPrompt1, ...answersPrompt2 };
    this.log(`Extension answers: ${JSON.stringify(this.localAnswers)}`);
  }
}
```

**STEP**: 8 — Write/update files during the writing phase (in-memory FS)

**DESCRIPTION**: Use this.fs (Yeoman mem-fs) to write new files and extend existing JSON files (manifest.json, package.json). The Fiori generator composes your extension after prompting and ensures generated project files exist in mem-fs before your writing() runs.

**LANGUAGE**: typescript

**CODE**:
```typescript
import Generator from "yeoman-generator";

export default class SampleFioriGenExt extends Generator {
  private localAnswers: Record<string, any> = {};

  async writing(): Promise<void> {
    const manifestPath = this.destinationPath("webapp", "manifest.json");

    // Write a custom JSON file with answers
    this.fs.writeJSON(this.destinationPath("sample.json"), {
      moduleName: this.fioriGeneratorState?.project?.name,
      moduleNamespace: this.fioriGeneratorState?.project?.namespace,
      ...this.localAnswers
    });

    // Extend manifest.json with tags
    this.fs.extendJSON(manifestPath, {
      "sap.app": {
        tags: { keywords: ["fiori", "custom extension", "acme"] }
      }
    });

    // Add/extend package.json (e.g. devDependency)
    const packageJsonPath = this.destinationPath("package.json");
    if (this.fs.exists(packageJsonPath)) {
      this.fs.extendJSON(packageJsonPath, {
        devDependencies: { "fast-glob": "3.2.12" }
      });
    }
  }
}
```

**STEP**: 9 — Run & test the extension in VS Code / BAS / CLI

**DESCRIPTION**: After global install or bundling, open BAS or VS Code Application Wizard. Use "SAP Fiori application" generator (package @sap/generator-fiori v1.9.7+) — your extension steps should appear in the left-hand navigation. CLI usage is supported when installed globally.

**LANGUAGE**: text

**CODE**:
```
# If installed globally:
# - In Business Application Studio / VS Code: open Application Wizard, choose "SAP Fiori application"
# - In CLI: run the Fiori generator as you normally would (generator will compose installed extensions)

# Confirm UI shows "Extension step 1" and "Extension step 2" and the prompt defaults/validators are applied.
```

**STEP**: 10 — Deployment resources & additional help

**DESCRIPTION**: Links to sample repo and BAS deployment notes. Community support contacts.

**LANGUAGE**: text

**CODE**:
```
Sample extension repository:
https://github.com/SAP-samples/fiori-tools-samples/sample-fiori-gen-ext

BAS deployment notes:
sample-fiori-gen-ext/deploy_extension.md within the sample repository

Community & support:
- SAP Community Forum: https://answers.sap.com/tags/73555000100800002345
- Email: SAPFioriElements@sap.com
```
--------------------------------

**TITLE**: Add the xml-js External Library to an SAP Fiori (SAPUI5) Freestyle App

**INTRODUCTION**: This guide shows a reproducible, code-first method to add the xml-js third-party library to a SAPUI5 freestyle (Fiori) application. It includes npm installation, copying a browser-ready build into webapp resources, creating a small UI5 wrapper module, referencing the script in index.html, and example usage from a controller. Use this to parse/convert XML in the browser inside your SAP Fiori UI app.

**TAGS**: SAPUI5, Fiori, xml-js, third-party, npm, webapp, resources, controller, index.html

STEP: 1 — Install xml-js with npm
DESCRIPTION: Add the xml-js package to your project dependencies so you can access the package files (browser build) in node_modules.
LANGUAGE: Shell
CODE:
```bash
# from the root of your project (where package.json lives)
npm install xml-js --save
```

STEP: 2 — Copy browser UMD/minified build into webapp resources
DESCRIPTION: Copy the browser-ready bundle (UMD/minified) from node_modules into your application webapp/resources folder. Adjust paths if the package distribution differs (check node_modules/xml-js/dist or node_modules/xml-js for a browser build). Example uses the common dist/xml-js.min.js path and target folder webapp/resources/lib/xml-js/.
LANGUAGE: Shell
CODE:
```bash
# create target folder and copy the minified browser build
mkdir -p webapp/resources/lib/xml-js
cp node_modules/xml-js/dist/xml-js.min.js webapp/resources/lib/xml-js/xml-js.min.js
# If the package has a different path, inspect node_modules/xml-js/ to find the browser UMD file.
```

STEP: 3 — Create a small UI5 wrapper module for consistent sap.ui.define usage
DESCRIPTION: Create webapp/thirdparty/xml-js.js as a thin wrapper that returns the global object produced by the included browser bundle. This lets you require the library with sap.ui.define(['thirdparty/xml-js'], ...) in controllers and other UI5 modules.
LANGUAGE: JavaScript
CODE:
```javascript
// File: webapp/thirdparty/xml-js.js
// Thin wrapper: return the global produced by the included xml-js browser bundle
(function () {
  // xml-js exposes an object in the browser UMD build. Try common global names.
  var xmljs = window['xml-js'] || window.xmljs || window.convert || window.XMLJS || window.xml2js;
  if (!xmljs) {
    throw new Error("xml-js library not found. Ensure resources/lib/xml-js/xml-js.min.js is included in index.html");
  }

  // If UI5 is present, define as a UI5 module
  if (typeof sap !== "undefined" && sap.ui && sap.ui.define) {
    sap.ui.define([], function () { return xmljs; });
  } else if (typeof define === "function" && define.amd) {
    // AMD environment
    define(function () { return xmljs; });
  } else {
    // fall back to global
    window['thirdparty-xml-js'] = xmljs;
  }
}());
```

STEP: 4 — Include the xml-js browser script in index.html
DESCRIPTION: Add a script tag to load the browser bundle before your app bootstraps or before Component.js runs. This guarantees the global object exists before the wrapper/your modules are evaluated.
LANGUAGE: HTML
CODE:
```html
<!-- File: webapp/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Your App</title>
    <!-- Include xml-js browser build -->
    <script src="resources/lib/xml-js/xml-js.min.js"></script>

    <!-- UI5 bootstrap and other includes -->
    <script id="sap-ui-bootstrap" src="https://sapui5.hana.ondemand.com/resources/sap-ui-core.js"
            data-sap-ui-theme="sap_belize"
            data-sap-ui-libs="sap.m"
            data-sap-ui-compatversion="edge"
            data-sap-ui-oninit="module:sap/ui/core/ComponentSupport">
    </script>
  </head>
  <body class="sapUiBody" id="content">
    <!-- root control will be placed here by Component support -->
  </body>
</html>
```

STEP: 5 — Use xml-js from a UI5 controller
DESCRIPTION: Require the wrapper module as a UI5 dependency, then call xml-js functions (xml2js, js2xml). Example shows xml2js usage to convert an XML string to a JS object.
LANGUAGE: JavaScript
CODE:
```javascript
// File: webapp/controller/Main.controller.js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "thirdparty/xml-js" // path maps to webapp/thirdparty/xml-js.js created above
], function (Controller, xmljs) {
  "use strict";

  return Controller.extend("my.namespace.controller.Main", {
    onInit: function () {
      var xml = '<note><to>User</to><from>AI</from><body>Hello</body></note>';

      // xmljs exposes xml2js and js2xml functions
      var result = xmljs.xml2js(xml, { compact: true, spaces: 4 });
      console.log("Converted XML to JS object:", result);

      // convert back to XML example
      var xmlOut = xmljs.js2xml(result, { compact: true, spaces: 4 });
      console.log("Converted JS back to XML:", xmlOut);
    }
  });
});
```

STEP: 6 — Automate copy as an npm script (optional)
DESCRIPTION: Add an npm script to automate copying the browser build into your webapp resources after npm install.
LANGUAGE: JSON
CODE:
```json
// snippet for package.json
{
  "scripts": {
    "postinstall": "mkdir -p webapp/resources/lib/xml-js && cp node_modules/xml-js/dist/xml-js.min.js webapp/resources/lib/xml-js/xml-js.min.js"
  },
  "dependencies": {
    "xml-js": "^1.6.11"
  }
}
```

STEP: 7 — Notes and project references
DESCRIPTION: Additional context and references for this sample project.
LANGUAGE: Text
CODE:
- Example sample project: ./ztravelapp/README.md demonstrates adding xml-js to a freestyle SAPUI5 application.
- Prerequisites: an SAP BTP account and subscription to SAP Business Application Studio. See SAP BAS docs for environment setup.
- If deploying to BTP/Cloud Foundry or ABAP, verify copy strategy (web resources must be included in deployment artifact).
- Sub-account destination used in samples: northwind. See the attached northind configuration for destination details.
--------------------------------

**TITLE**: Add xml-js External Library to a Freestyle SAP Fiori (SAPUI5) Application

**INTRODUCTION**: Step-by-step instructions and ready-to-use code snippets to add the xml-js NPM package to a freestyle SAPUI5 application running in SAP Business Application Studio. Includes npm installs, ui5.yaml middleware configuration, and sample controller code that imports and uses xml-js via sap.ui.define.

**TAGS**: sapui5, fiori, ui5-tooling, npm, xml-js, middleware, ui5-tooling-modules, sap-btp, business-application-studio

**STEP**: Prerequisites
**DESCRIPTION**: Ensure you have the required accounts and subscriptions before beginning.
**LANGUAGE**: text
**CODE**:
```text
- SAP BTP account with a subscribed SAP Business Application Studio instance
- Dev Space: Create a "SAP Fiori" dev space in Business Application Studio
- Sub-account destination named: northwind
- Familiarity with freestyle SAPUI5 app generation (see SAP Fiori Tools docs)
```

**STEP**: Create SAP Fiori Dev Space
**DESCRIPTION**: From SAP BTP cockpit -> Instances and Subscriptions -> Open SAP Business Application Studio -> Create a new "SAP Fiori" dev space.
**LANGUAGE**: text
**CODE**:
```text
Open SAP BTP cockpit -> Instances and Subscriptions -> Select SAP Business Application Studio -> Open Dev Space Manager -> Create "SAP Fiori" dev space
```

**STEP**: Generate a freestyle SAPUI5 application
**DESCRIPTION**: Use SAP Fiori Tools in Business Application Studio to create a new freestyle UI5 application. See documentation link for guided steps and templates.
**LANGUAGE**: text
**CODE**:
```text
Documentation: https://sapui5.hana.ondemand.com/sdk/#/topic/a460a7348a6c431a8bd967ab9fb8d918
Follow the "Freestyle" app generator in SAP Business Application Studio (Wizard from Fiori project templates)
```

**STEP**: Install xml-js (third‑party library)
**DESCRIPTION**: Add xml-js to your project's package.json and install it into node_modules.
**LANGUAGE**: bash
**CODE**:
```bash
# From your project root
npm install xml-js --save-prod
```

**STEP**: Install UI5 tooling extension that enables use of NPM package names
**DESCRIPTION**: Install the ui5-tooling-modules package which provides the middleware/task to let UI5 tooling resolve NPM package names (third-party modules).
**LANGUAGE**: bash
**CODE**:
```bash
# From your project root
npm install ui5-tooling-modules --save-prod
```

**STEP**: Configure ui5.yaml to enable the middleware
**DESCRIPTION**: Edit ui5.yaml in your project root and add the ui5-tooling-modules middleware entry under server.customMiddleware. Preserve YAML alignment/indentation. This middleware exposes NPM modules under sap.ui.define.
**LANGUAGE**: yaml
**CODE**:
```yaml
# ui5.yaml (snippet showing where to append the middleware)
specVersion: '2.1'
metadata:
  name: your.app.namespace
server:
  customMiddleware:
    - name: ui5-tooling-modules-middleware
      afterMiddleware: compression
      configuration:
        addToNamespace: true
# (Other ui5.yaml sections such as "resources" and "builders" remain unchanged)
```

**STEP**: Import xml-js in your controller via sap.ui.define
**DESCRIPTION**: Update your controller (e.g., webapp/controller/View1.controller.js) to include "xml-js" in the dependency array and add the corresponding parameter name in the factory function. Use the imported module (named here as xmljs) to convert XML to JSON.
**LANGUAGE**: javascript
**CODE**:
```javascript
// File: webapp/controller/View1.controller.js
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "xml-js" // third-party NPM module
  ],
  function (Controller, xmljs) {
    "use strict";

    return Controller.extend("your.app.namespace.controller.View1", {
      onInit: function () {
        // Example: convert an XML string to JSON using xml-js
        var xml = '<root><item id="1">Value</item></root>';

        var xmlToJson = JSON.parse(
          xmljs.xml2json(xml, {
            compact: true,
            spaces: 4
          })
        );

        console.log(">>>> xmlToJson", JSON.stringify(xmlToJson));
        // Use xmlToJson in your controller logic...
      }

      // other controller methods...
    });
  }
);
```

**STEP**: Reference: Third-Party Modules with sap.ui.define
**DESCRIPTION**: Review UI5 documentation about including third-party modules via sap.ui.define (Third Party Modules section).
**LANGUAGE**: text
**CODE**:
```text
Documentation: https://sapui5.hana.ondemand.com/sdk/#/api/sap.ui%23methods/sap.ui.define
See "Third Party Modules" section for guidance on how they are imported and referenced via ui5-tooling middleware.
```

**STEP**: Verify and run your app
**DESCRIPTION**: Start the UI5 server (e.g., using "ui5 serve" or your project's start script) and test the controller to verify xml-js is available and functional.
**LANGUAGE**: bash
**CODE**:
```bash
# Example (use your project's configured start script if different)
npx ui5 serve --open index.html
# Or
npm start
```

**STEP**: Additional resources
**DESCRIPTION**: Helpful blog posts and resources on external libraries in UI5 and related tips.
**LANGUAGE**: text
**CODE**:
```text
- External libraries in UI5 + CAP + SAP Build Work Zone, Standard Edition:
  https://blogs.sap.com/2023/11/08/external-libraries-in-ui5-cap-sap-build-work-zone-standard-edition/

- Smart templates and SAP Fiori Apps – 57 Tips and Tricks:
  https://blogs.sap.com/2019/09/20/smart-templates-tips-and-tricks/
```
--------------------------------
