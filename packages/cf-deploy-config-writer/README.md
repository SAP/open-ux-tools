# @sap-ux/cf-deploy-config-writer

Add or amend Cloud Foundry deployment configuration to SAP projects.

## Prerequisites
* For CAP Projects the CDS binary is required, for more information refer to the [CDS Tool](https://www.npmjs.com/package/@sap/cds)
* For HTML5 Projects the MTA binary is required, for more information refer to the [MTA Tool](https://www.npmjs.com/package/mta), this is required to support the [mta-lib](https://www.npmjs.com/package/@sap/mta-lib) library which handles the flows for interacting with the `mta.yaml` configuration. 

## Installation
Npm
`npm install --save @sap-ux/cf-deploy-config-writer`

Yarn
`yarn add @sap-ux/cf-deploy-config-writer`

Pnpm
`pnpm add @sap-ux/cf-deploy-config-writer`

## Usage
Calling the `MtaConfig` library to add different types of modules, for example HTML5 resources, routing module and mta extension configurations to an existing MTA configuration file. Dependent on the [MTA Tool](https://www.npmjs.com/package/mta) for exploring and validating the changes being made.
```Typescript
import { MtaConfig } from '@sap-ux/cf-deploy-config-writer';
// Create a new instance of MtaConfig
const mtaConfig = await MtaConfig.newInstance('path/to/mta.yaml');
// Carry out some operations...
// 1. Add routing modules and also add managed approuter configuration
await mtaConfig.addRoutingModules(true);
// 2. Add new HTML5 app
await mtaConfig.addApp('myui5app', './');
// 3. Append a destination instance to the destination service, required by consumers of CAP services (e.g. approuter, destinations)
await mtaConfig.appendInstanceBasedDestination('mynewdestination');
// 4. Append mta extension configuration
await mtaConfig.addMtaExtensionConfig('mynewdestination', 'https://my-service-url.base', {
  key: 'ApiKey',
  value: `${apiHubKey}`
});
// 5. Save changes
await mtaConfig.save();
```

Calling the `generateAppConfig` function to append Cloud Foundry configuration to a HTML5 application, assumes `manifest.json` and `ui5.yaml` configurations are present otherwise the process will exit with an error;
```Typescript
import { generateAppConfig, DefaultMTADestination } from '@sap-ux/cf-deploy-config-writer'
import { join } from 'path';

const exampleWriter = async () => {
  const appPath = join(__dirname, 'testapp');
  // Option 1. Append managed approuter configuration, toggle `addManagedAppRouter` to false to ommit the managed approuter configuration being appended to the mta.yaml
  const fs = await generateAppConfig({appPath, addManagedAppRouter: true, destinationName: 'SAPBTPDestination'}); 
  // Option 2. For CAP flows, set the destination to DefaultMTADestination to create a destination instance between the HTML5 app and CAP Project
  const fs = await generateAppConfig({appPath, addManagedAppRouter: true, destinationName: DefaultMTADestination});
  return new Promise((resolve) => {
      fs.commit(resolve); // When using with Yeoman it handle the fs commit.
  });
}
// Calling the function
await exampleWriter();
```

Calling the `generateBaseConfig` function to generate a `new` Cloud Foundry configuration, supporting `managed` | `standalone` configurations;
```Typescript
import { generateBaseConfig, RouterModuleType } from '@sap-ux/cf-deploy-config-writer'
import { join } from 'path';

const exampleWriter = async () => {
  const mtaPath = join(__dirname, 'testapp');
  // Generate a managed approuter configuration, toggle the routerType to RouterModuleType.Standard for a standalone configuration
  const fs = await generateBaseConfig({ mtaId: 'myapp', routerType: RouterModuleType.Managed, mtaPath });
  return new Promise((resolve) => {
      fs.commit(resolve); // When using with Yeoman it handle the fs commit.
  });
}
// Calling the function
await exampleWriter();
```

## Keywords
SAP Fiori elements
SAP UI5
SAP Deployment
Cloud Foundry
MTA
Multi-Target Application

