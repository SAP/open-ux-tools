# @sap-ux/deploy-config-writer

Adds or amends deployment configuration for SAP projects.

## Installation
Npm
`npm install --save @sap-ux/deploy-config-writer`

Yarn
`yarn add @sap-ux/deploy-config-writer`

Pnpm
`pnpm add @sap-ux/deploy-config-writer`

## Usage
```Typescript
import { MtaConfig } from '@sap-ux/deploy-config-writer';
// Create a new instance of MtaConfig
const mtaConfig = await MtaConfig.newInstance('path/to/mta.yaml');
// Add routing modules and also add managed approuter configuration
await mtaConfig.addRoutingModules(true);
// Add new HTML5 app
await mtaConfig.addApp('myui5app', './');
// Append a destination instance to the destination service, required by consumers of CAP services (e.g. approuter, destinations)
await mtaConfig.appendInstanceBasedDestination('mynewdestination');
// Append mta extension configuration
await mtaConfig.addMtaExtensionConfig('mynewdestination', 'https://my-service-url.base', {
  key: 'ApiKey',
  value: `${apiHubKey}`
});
// Save the changes
await mtaConfig.save();
```

## Keywords
SAP Fiori elements
SAP UI5
SAP Deployment

