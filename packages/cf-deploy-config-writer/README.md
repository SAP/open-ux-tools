# @sap-ux/cf-deploy-config-writer

Add or amend Cloud Foundry deployment configuration to SAP projects.

## Installation
Npm
`npm install --save @sap-ux/cf-deploy-config-writer`

Yarn
`yarn add @sap-ux/cf-deploy-config-writer`

Pnpm
`pnpm add @sap-ux/cf-deploy-config-writer`

## Usage
Calling the MtaConfig class;
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

Calling the `generate` function to append Cloud Foundry configuration to a HTML5 project;
```Typescript
import { generateAppConfig } from '@sap-ux/cf-deploy-config-writer'
import { join } from 'path';

const exampleWriter = async () => {
  const projectDir = join(__dirname, 'testapp');
  const fs = await generateAppConfig(projectDir);
  return new Promise((resolve) => {
      fs.commit(resolve); // When using with Yeoman it handle the fs commit.
  });
}

// Calling the function
await exampleWriter();
```

Calling the `generateRootConfig` function to generate a new Cloud Foundry configuration, supporting managed | standalone configurations;
```Typescript
import { generateRootConfig } from '@sap-ux/cf-deploy-config-writer'
import { join } from 'path';

const exampleWriter = async () => {
  const mtaPath = join(__dirname, 'testapp');
  const fs = await generateRootConfig({mtaId: 'myapp', version: '0.0.1', description: 'My app description', routerType: 'standard', mtaPath});
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

