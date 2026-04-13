
--------------------------------

# Commands in SAP Fiori Tools


# Commands in SAP Fiori Tools

<br>

## Commands in Application Info page
|Feature|Group|SAP Fiori elements|SAPUI5 freestyle|Fiori Reuse|v2|v4|EDMX Backend|CAP Node.js|CAP Java|Fiori Adaptation|Component|Description|Command|
|--|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|--|--|
|Deploy|Common Tasks|✓|✓|✓|✓|✓|✓|✓||✓|✓|Deploy the application using the configuration which is by default stored in the `ui5-deploy.yaml` file.|<sub>`sap.ux.appGenerator.launchDeploy`</sub>|
|Manage Service Models|Common Tasks|✓|✓||✓|✓|✓||||✓|Sync the local copy of the metadata.xml file with the back end.|<sub>`sap.ux.serviceManager.openServiceMgr`</sub>|
|Open Adaptation Editor|Common Tasks|||||||||✓||Open the Adaptation Editor to create adaptations.|<sub>`sap.ux.adp.openAdaptationEditor`</sub>|
|Open Guided Development|Common Tasks|✓|||✓|✓|✓|✓|✓|||Open Guided Development to access guides that explain how to implement certain functionality.|<sub>`sap.ux.help.openGuidedDevelopmentFromExplorer`</sub>|
|Open Page Map|Common Tasks|✓|✓||✓|✓|✓|✓|✓|||Open the Page Map to see application pages and navigation paths.|<sub>`sap.ux.pageMap.showMap`</sub>|
|Preview Application|Common Tasks|✓|✓||✓|✓|✓|✓||✓|✓|Select a start script to preview the application.|<sub>`sap.ux.pageEditor.previewExternal`</sub>|
|Add Card Editor Config|Configuration|✓|||✓|✓|✓|||||Add the configuration for the card generator and tooling.|<sub>`npx --yes @sap-ux/create@latest add cards-editor`</sub>|
|Add Deploy Config|Configuration|✓|✓|✓|✓|✓|✓|✓||✓|✓|Add deploy configuration.|<sub>`sap.ux.appGenerator.launchDeployConfig`</sub>|
|Add Mockserver Config|Configuration|✓|✓||✓|✓|✓|||||Add configuration for mockserver middleware.|<sub>`npx --yes @sap-ux/create@latest add mockserver-config`</sub>|
|Add SAP Fiori Launchpad Config|Configuration|✓|✓||✓|✓|✓|✓|✓|||Add the SAP Fiori launchpad configuration to the application.|<sub>`sap.ux.appGenerator.launchFlpConfig`</sub>|
|Add Variants Config|Configuration|✓|✓||✓|✓|✓|||||Add the configuration for variants creation.|<sub>`sap.ux.applicationModeler.addVariantsConfig`</sub>|
|Test deployment|Deploy|✓|✓|✓|✓|✓|✓|✓|✓|✓|✓|Start deployment in test mode.|<sub>`npm run deploy-test`</sub>|
|Undeploy|Deploy|✓|✓|✓|✓|✓|✓|✓||✓|✓|Remove a deployed artifact from the back end or cloud.|<sub>`npm run undeploy`</sub>|
|Add Local Annotation File|Manage|||||||||✓||Add a local annotation file to the adaptation project.|<sub>`sap.ux.adp.addAnnotationFile`</sub>|
|Add OData Service|Manage|||||||||✓||Add an OData service and SAPUI5 model to the adaptation project.|<sub>`sap.ux.adp.addODataServiceAndModel`</sub>|
|Add SAP Fiori Launchpad Config|Manage|||||||||✓||Add the SAP Fiori launchpad configuration to the application.|<sub>`sap.ux.adp.addFlpConfig`</sub>|
|Add SAPUI5 Components|Manage|||||||||✓||Add SAPUI5 component usages to the adaptation project.|<sub>`sap.ux.adp.addSAPUI5ComponentUsages`</sub>|
|Build Application|Manage|✓|✓||✓|✓||||||Build the application. The results are stored in the `dist` folder.|<sub>`npm run build`</sub>|
|Change minUI5Version|Manage|✓|✓||✓|✓|✓|✓|✓|||Change the minimum version of SAPUI5 that this application requires.|<sub>`sap.ux.applicationModeler.changeMinUI5Version`</sub>|
|Check Node Modules|Manage|✓|✓||✓|✓|✓|✓|✓|✓||Check node module dependencies for newer versions.|<sub>`npm outdated`</sub>|
|Check Service|Manage|✓|||✓|✓|✓|||||View service entities and their annotations. Copy annotations to a local annotation file.|<sub>`sap.ux.serviceModeler.openFile`</sub>|
|Convert Preview Config|Manage|✓|✓||✓|✓|✓|||||Convert the configuration to preview the application with virtual endpoints.|<sub>`sap.ux.applicationModeler.convertPreview`</sub>|
|Create Archive|Manage|✓|✓|✓|✓|✓|✓|✓|✓|✓|✓|Export the project, excluding the node_modules folder, to a `.zip` file.|<sub>`sap.ux.environmentcheck.archiveProject`</sub>|
|Manage XML Annotations|Manage|✓|✓||✓|✓|✓||||✓|Create and maintain local XML annotation files.|<sub>`sap.ux.serviceManager.openAnnotationFileMgr`</sub>|
|Open Card Editor|Manage|✓|||✓|✓|✓|||||Open the card generator for editing.|<sub>`npm run start-cards-generator`</sub>|
|Open Data Editor|Manage|✓|✓||✓|✓|✓|||||Open the Data Editor to maintain mock data.|<sub>`sap.ux.dataEditor.open`</sub>|
|Open Documentation|Manage|✓|||✓|✓|✓|✓|✓|||Open the documentation of available manifest and SAPUI5 flexibility properties.|<sub>`sap.ux.applicationModeler.showDocu`</sub>|
|Replace OData Service|Manage|||||||||✓||Replace the OData service of the adaptation project.|<sub>`sap.ux.adp.replaceODataService`</sub>|
|Run UI5 Linter|Manage|✓|✓|✓|✓|✓|✓|✓|✓|✓|✓|Check compatibility of your project with SAPUI5 version 2.|<sub>`sap.ux.applicationModeler.runUI5Linter`</sub>|
|Run Variants Management|Manage|✓|✓||✓|✓|✓|||||Run the configuration for variants creation.|<sub>`npm run start-variants-management`</sub>|
|Validate Project|Manage|✓|||✓|✓|✓|||||Validate the project and generate a report.|<sub>`sap.ux.applicationModeler.validate`</sub>|

<br>

## Commands in Command Palette
|Category|Title|Command|when|Source|
|--|--|--|--|--|
|Fiori|Restart XML Annotation Language Server|<sub>`sap.ux.annoataionModeler.startXmlServer `</sub>||packages/annotation-modeler/ide-extension/package.json|
|Fiori|Add Configuration for Variants Creation|<sub>`sap.ux.applicationModeler.addVariantsConfig `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Add Deployment Configuration|<sub>`sap.ux.appGenerator.launchDeployConfig `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Add Embedded Configuration for SAP Fiori Launchpad|<sub>`sap.ux.applicationModeler.flpEmbeddedMode `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Add Reference to SAP Fiori Reusable Libraries|<sub>`sap.ux.appGenerator.launchReferenceLib `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Add SAP Fiori Launchpad Configuration|<sub>`sap.ux.appGenerator.launchFlpConfig `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Add SAP Fiori Launchpad Configuration for Adaptation Project|<sub>`sap.ux.adp.addFlpConfig `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Add SAP System|<sub>`sap.ux.applicationModeler.sapSystems.add `</sub>|VSCode only|packages/application-modeler/ide-extension/package.json|
|Fiori|Archive Project|<sub>`sap.ux.environmentcheck.archiveProject `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Change Telemetry Settings|<sub>`sap.ux.applicationModeler.changeTelemetrySettings `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Change the Minimum SAPUI5 Version|<sub>`sap.ux.applicationModeler.changeMinUI5Version `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Convert Preview Configuration|<sub>`sap.ux.applicationModeler.convertPreview `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Delete Application from CAP Project|<sub>`sap.ux.applicationModeler.deleteCapApp `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Deploy Application|<sub>`sap.ux.appGenerator.launchDeploy `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Download ADT Deployed App from SAPUI5 ABAP Repository|<sub>`sap.ux.appGenerator.appDownloadFromRepo `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Enable App-to-App Navigation Preview|<sub>`sap.ux.applicationModeler.appToAppNavigation `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Generate UI Service|<sub>`sap.ux.appGenerator.launchUiServiceGen `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Import SAP System|<sub>`sap.ux.applicationModeler.sapSystems.import `</sub>|VSCode only|packages/application-modeler/ide-extension/package.json|
|Fiori|Migrate Project for Use in SAP Fiori Tools|<sub>`sap.ux.applicationModeler.migrateProject `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Open Adaptation Editor|<sub>`sap.ux.adp.openAdaptationEditor `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Open Adaptation Project Generator|<sub>`sap.ux.adp.openAdaptationProjectGenerator `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Open Application Generator|<sub>`sap.ux.appGenerator.launch `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Open Application Info|<sub>`sap.ux.application.info `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Open CF Application Router Generator|<sub>`sap.ux.appGenerator.launchDeployment `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Open Data Editor|<sub>`sap.ux.dataEditor.open `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Open Environment Check|<sub>`sap.ux.environmentcheck.open `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Open Reusable Library Generator|<sub>`sap.ux.appGenerator.launchReuseLibGen `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Open Run Configurations|<sub>`sap.ux.applicationModler.launchConfig `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Preview Application|<sub>`sap.ux.pageEditor.previewExternal `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Refresh Application Modeler View|<sub>`sap.ux.applicationModeler.configExplorer.refresh `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Run UI5 Linter|<sub>`sap.ux.applicationModeler.runUI5Linter `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Show Output Channel|<sub>`sap.ux.applicationModeler.showOutputChannel `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Show Page Editor|<sub>`sap.ux.pageMap.showPageEditor `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Show Page Map|<sub>`sap.ux.pageMap.showMap `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Show Release Notes|<sub>`sap.ux.fioriTools.showReleaseNotes `</sub>||packages/application-modeler/ide-extension/package.json|
|Fiori|Show SAP System Details|<sub>`sap.ux.applicationModeler.sapSystems.show `</sub>|VSCode only|packages/application-modeler/ide-extension/package.json|
|Fiori|Validate Project|<sub>`sap.ux.applicationModeler.validate `</sub>||packages/application-modeler/ide-extension/package.json|
|SAP Fiori AI|Clear Chat History|<sub>`sap.ux.fiori.tools.ai.chatView.clearChatMessages `</sub>||packages/fiori-ai/extensions/chat/ide-extension/package.json|
|SAP Fiori AI|Export Chat History|<sub>`sap.ux.fiori.tools.ai.chatView.exportChatMessages `</sub>||packages/fiori-ai/extensions/chat/ide-extension/package.json|
|SAP Fiori AI|Open ReadMe|<sub>`sap.ux.fiori.tools.ai.chatView.openReadMe `</sub>||packages/fiori-ai/extensions/chat/ide-extension/package.json|
|Fiori Tools AI|Launch the Project Accelerator|<sub>`sap.ux.help.fiori.ai.launchProjectAccelerator `</sub>|showBetaFeatures && isEnabledFioriAI|packages/help/ide-extension/package.json|
|Fiori|Open Guided Development|<sub>`sap.ux.help.openGuidedDevelopment `</sub>||packages/help/ide-extension/package.json|
|Fiori|Open Guided Development to the Side|<sub>`sap.ux.help.openGuidedDevelopmentToTheSide `</sub>||packages/help/ide-extension/package.json|
|Fiori|Request New Guide|<sub>`sap.ux.help.openGuidedDevelopmentRequestNewGuide `</sub>||packages/help/ide-extension/package.json|
|Fiori|Open Annotation File Manager|<sub>`sap.ux.serviceManager.openAnnotationFileMgr `</sub>||packages/service-modeler/ide-extension/package.json|
|Fiori|Open Service Manager|<sub>`sap.ux.serviceManager.openServiceMgr `</sub>||packages/service-modeler/ide-extension/package.json|
|Fiori|Open Service Modeler|<sub>`sap.ux.serviceModeler.openFileCmdPalatte `</sub>||packages/service-modeler/ide-extension/package.json|
|Fiori|Open Service Modeler to the Side|<sub>`sap.ux.serviceModeler.openFileToTheSide `</sub>||packages/service-modeler/ide-extension/package.json|
|Fiori|Open Walkthrough|<sub>`sap.ux.applicationModeler.walkthrough.launch `</sub>||packages/application-modeler/ide-extension/package.json|

--------------------------------
