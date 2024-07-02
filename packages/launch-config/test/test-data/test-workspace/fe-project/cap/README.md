# Fiori elements v4 demo

## Setup

### Global NPM modules
Make sure the following modules are globally installed, if not install them in that order:
```
npm i yo -g
npm i @sap/cds -g
npm i @sap/cds-dk -g --force
```

### VSCode
* Install the Fiori tools VSCode extensions using the standard VSCode Extension UI and search for 'Fiori tools Extension Pack'. All extensions including the YeomanUI and the yeoman generators will be installed
* Installation of the CDS compiler version with LSP support:
https://sap.sharepoint.com/:f:/r/teams/SAPUXToolsSuite/Shared%20Documents/extension%20files/garage%20demo/wk20200301/CDS%20compiler%20with%20LSP%20annotation%20support?csf=1&web=1&e=gwslhE
* Important note: if VSCode keeps asking for update of the CDS compiler to a more recent version, you should say no. Reason: the cds compiler from the sharepoint contains the CDS LSP support flavor, while the official one does not

### Project Setup
In a terminal, run commands
* `git clone https://github.wdf.sap.corp/D045154/fe-garage-demo`
* `cd fe-garage-demo`
* `npm i`
* `git checkout fiori-test`
* `code .`

## Demo

### Step: Create the app with Application Wizard
* Choose in the VSCode menu View -> Command Palette...
* In the dialog dropdown, search for `SAP Fiori tools - Application Generator: Launch` and select it
* The wizard opens in a separate tab
* Dialog Step 'Select Generator':
  * Choose `SAP Fiori tools – Application Generator` and press 'Next'
* Dialog Step 'Template Selection':
  * Choose `List Report Page V4` and press 'Next'
* 'Dialog Step 'Service and Entity Selection':
  * Dropdown 'Select your data source': choose `Use a local CAP Project`
  * Click folder icon in field below to select CAP project folder
  * In file browser, choose the project root folder `fe-garage-demo`
  * Dropdown 'select OData service': choose `IncidentService`
  * Dropdown 'Enter Main Entity', choose `SafetyIncidents`
  * Press 'Next'
* Dialog Step 'Generate':
  * Enter the following values:
    * module name: `incidents` (if this doesn't match the custom page won't load later on)
    * Application Title: free to choose (Proposal: `My Incidents`)
    * namespace: `sap.fe.demo` (if this doesn't match the custom page won't load later on)
    * Leave Description as is
    <!-- * Toggle Advanced options to `yes`
      * Dropdown 'Select UI5 Version': Choose `1.79.1`
    * OPEN: option to deselect generation of annotation.cds file
      * for the changed demo choreography, the service already comes with an annotation.cds file
      * BLI created/discussed with Ian Quigley to be able to toggle this in the app generator -->
    * Press 'Next' to generate the application

### Step: Basic Annotations and Preview
* Open `annotation.cds` in generated `incidents` folder
* Place your cursor at the beginning of line 3 and type `fiori` and select the `fiori-tools annotate` snippet
* Manually create the selection fields using the auto-completion features
 * `SelectionFields : [incidentStatus_code, category_code, priority_code ]`
* Enter comma, press enter and type `fiori` and select the `fiori-tools lineitem` snippet
* Save file
* Open the preview by executing `npm start` and open the browser
* Show the ListReport and click on an item to show the still empty ObjectPage
* Go back to VSCode and place your cursor right where you left (directly after the closing `]`), enter command and return and then type `fiori` and select the `fiori-tools object page` snippet
* Save
* Refresh your browser and show that you have selection fields and a proper ObjectPage now

<!-- ### Step 3: Add chart to list report via guided help
* Guided help motivation: there are two options to add annotations: through LSP or through the guided help.
* For the non-experienced developer guided help gives a kick start, why LSP based annotation adding is for the expert
* In VSCode: right click on fe-garage-demo and select -> 'SAP Fiori Tools - Guided Development'
* In the 'search how-to guides' field enter 'chart'
* Expand the 'Add an interactive chart to a list report page' guide
* Read through the details and scroll down to
* Step 1: 'Annotate service entity with a UI.Chart annotation'
* Enter the following information for the parameters:
  * CDS File - `app/incidents/annotations.cds`
  * Service - `IncidentService`
  * Entity - `SafetyIncidents`
  * Dimensions Entity Property - `category_code`
  * Measures Entity Property - `IncidentsPerCategory (Aggregated Property)`
  * Leave all the other details as is
  * Click on Apply button
  * Verify the updates are made in the annotations.cds file
* Go to Step 2: 'Add a PresentationVariant to annotate the entity'
* Enter the following information for the parameters:
  * CDS File - `app/incidents/annotations.cds`
  * Service - `IncidentService`
  * Entity - `SafetyIncidents`
  * Click on Apply button
  * Verify the updates are made in the annotations.cds file 
* Save changed annotations.cds file
* Refresh browser window: view the chart added
* Select one or several chart columns and explain how table is filtered
* Change filter and explain how chart and table are updated -->

### Step: Application Modeling: FCL
* Collapse VSCode File browser so that the `Application Modeler` section becomes more prominent
* In Application Modeler, open you project and right click on `app.json` and select 'Show Page Map'
* Open "Global Page Settings" (page map toolbar on very right, small icon "[ |]") and toggle to "Flexible Column Layout"
* Refresh browser
* Resize the section with the horizontal arrows
* Resize browser window to small and big to show responsiveness of UI

### Step: Add Custom page
* Open page map again
* Press (+) on the object page
* Select page type `custom page` from the first drop down
* Select navigation entity `incidentFlow`
* Select `Create New View`
* Enter as View Name `ProcessFlow`
* Click 'Add'
* Show added page in page map
* Show added `ext` folder in `app/incidents/webapp`
* Open `ext/view/ProcessFlow.view.xml`
 * Explain that the tools have generated a skeleton for you and that you could develop any UI5 view now
 * Select all and type `fiori` and select the `fiori-tools view` snippet 
 * Save
* Open `ext/view/ProcessFlow.controller.js`
 * Explain that the tools have generated a skeleton for the controller as well
 * Select all and type `fiori` and select the `fiori-tools controller` snippet 
 * Save
* Refresh browser
* Select a Process Flow table line to navigate to process flow custom page
* Click on "Assigned Contact" link on object page to show minimal information that we will update next


### Step: Add Contact information from different system
* Go to https://api.sap.com/ and search for "Business Partner"
* Select "Business Partner (A2X)", switch to "Details"
* Click "Download API Specification" -> EDMX
* Save the file in the project root (next to the `package.json`)
* If `npm start` (`cds watch`) is still running in the console, the file is automatically imported and a CDS file is generated into `srv/external`. Otherwise run command `cds import API_BUSINESS_PARTNER.edmx`
* Copy `using { API_BUSINESS_PARTNER as external } from './external/API_BUSINESS_PARTNER.csn';` from terminal output
* Open file `srv/incidentservice.cds`, place cursor in line 2 paste the using statement
* Still in `incidentservice.cds`, place cursor after last entity line 24 and use snippet `fiori-tools BP to incidentservice`
* Still in `incidentservice.cds`, place cursor before `annotate IncidentService.Individual` in line 40, type `fiori` and select snippet `fiori-tools extend individual`
* Select line `annotate IncidentService.Individual` and start typing `fiori`, select `fiori-tools individual annotation` from snippets
* Refresh browser and show that the contact is now displayed