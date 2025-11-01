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

## Example: Reading and Writing MTA Configurations
Generate an `MtaConfig` instance to read an `mta.yaml` configuration to allow you to append different resources and modules. For example HTML5 resources, routing modules or append mta extension configurations.

Dependent on the [MTA Tool](https://www.npmjs.com/package/mta) being installed globally on your dev space.
- For VSCode, run the command `npm i -g mta`
- For Business Application Studio, the binary is already installed

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

## Example: Appending a `Managed` Approuter Configuration to an SAP Fiori UI5 Application

Calling the `generateAppConfig` function to append Cloud Foundry configuration to a HTML5 application, assumes `manifest.json` and `ui5.yaml` configurations are present otherwise the process will exit with an error;
```Typescript
import { generateAppConfig, DefaultMTADestination } from '@sap-ux/cf-deploy-config-writer'
import { join } from 'path';

const exampleWriter = async () => {
  const ui5AppPath = join(__dirname, 'testapp');
  // Option 1. Append managed approuter configuration, toggle `addManagedAppRouter` to false to ommit the managed approuter configuration being appended to the mta.yaml
  const fs = await generateAppConfig({appPath: ui5AppPath, addManagedAppRouter: true, destinationName: 'SAPBTPDestination'}); 
  return new Promise((resolve) => {
      fs.commit(resolve); // When using with Yeoman it handle the fs commit.
  });
}
// Calling the function
await exampleWriter();
```

## Example: Generate or Append a `Managed` Approuter Configuration to a SAP Fiori UI5 Application

Calling the `generateAppConfig` function to append Cloud Foundry configuration to a HTML5 application;
- Assumes `manifest.json` and `ui5.yaml` configurations are present in the target folder
- Supports `CAP` projects where an existing `mta.yaml` is already present and you are adding a SAP Fiori UI5 app to it

```Typescript
import { generateAppConfig, DefaultMTADestination } from '@sap-ux/cf-deploy-config-writer'
import { join } from 'path';

const exampleWriter = async () => {
  const ui5AppPath = join(__dirname, 'testapp');
  // Option 1. Append managed approuter configuration, toggle `addManagedAppRouter` to false to ommit the managed approuter configuration being appended to the mta.yaml
  const fs = await generateAppConfig({appPath: ui5AppPath, addManagedAppRouter: true, destinationName: 'SAPBTPDestination'}); 
  // Option 2. For CAP flows, set the destination to DefaultMTADestination to create a destination instance between the HTML5 app and CAP Project
  const fs = await generateAppConfig({appPath: ui5AppPath, addManagedAppRouter: true, destinationName: DefaultMTADestination});
  return new Promise((resolve) => {
      fs.commit(resolve); // When using with Yeoman it handle the fs commit.
  });
}
// Calling the function
await exampleWriter();
```

## Example: Generate a Base `Managed` | `Standard` Approuter Configuration

Calling the `generateBaseConfig` function to generate a `new` Cloud Foundry configuration, supporting `Managed` | `Standard` configurations;
- Creates a new `mta.yaml` into the specified `mtaPath`, it will fail if an existing `mta.yaml` is found
- Optional parameters include adding a `connectivity` service if the SAP BTP destination is using an `OnPremise` configuration
- New configuration will include a destination instance to expose a `UI5` endpoint, consumed by SAP Fiori applications when deployed to Cloud Foundry
```Typescript
import { generateBaseConfig, RouterModuleType } from '@sap-ux/cf-deploy-config-writer'
import { join } from 'path';

const exampleWriter = async () => {
  const mtaPath = join(__dirname, 'testproject');
  // If your SAPUI5 application will be consuming an SAB BTP OnPremise destination, Connectivity serivce is required; Refer to https://discovery-center.cloud.sap/serviceCatalog/connectivity-service?region=all
  const addConnectivityService = true;
  // Generate an approuter configuration, with the default being a Managed Approuter, toggle the routerType to genereate RouterModuleType.AppFront or RouterModuleType.Standard configurations
  const fs = await generateBaseConfig({ mtaId: 'mymtaproject', routerType: RouterModuleType.Managed, mtaPath, addConnectivityService });
  return new Promise((resolve) => {
      fs.commit(resolve); // When using with Yeoman it handle the fs commit.
  });
}
// Calling the function
await exampleWriter();
```

## Example: Generate a CAP `Managed` | `AppFront` | `Standard` Approuter Configuration
Calling the `generateCAPConfig` function to generate a `new` Cloud Foundry configuration, supporting `Managed` | `AppFront` | `Standard` configurations;
- Generate a CAP `mta.yaml` with `destination`, `HTML5-Repo` and `XSUAA` services added by default
- To align the `package.json` and `package-lock.json` to support the mta prebuild script `npm ci`, you need to execute the `npm install`
- New configuration will include destination instances to expose `UI5` and `CAP` endpoints, consumed by SAP Fiori applications when deployed to Cloud Foundry

```Typescript
import { generateCAPConfig, RouterModuleType } from '@sap-ux/cf-deploy-config-writer'
import { join } from 'path';

const exampleWriter = async () => {
  const mtaPath = join(__dirname, 'testcapproject');
  // Generate an approuter configuration, with the default being a Managed Approuter, toggle the routerType to genereate RouterModuleType.AppFront or RouterModuleType.Standard configurations 
  const fs = await generateCAPConfig({ mtaId: 'mymtaproject', routerType: RouterModuleType.Managed, mtaPath });
  return new Promise((resolve) => {
      fs.commit(resolve); // When using with Yeoman it handle the fs commit.
  });
}
// Calling the function
await exampleWriter();
```

## Additional Information

* When appending Cloud Foundry deployment configuration to a HTML5 application that is missing a backend `path` in`ui5.yaml`, or there is no `dataSources` defined in `manifest.json`, the `xs-app.json` routing is appended with `'<apply-service-segment-path>'`. This is to allow you to append a custom service path if you introduce custom AJAX calls or add a new OData service.

For example, the following configuration will be appended to the `xs-app.json` routing list:

```json
{
  "source": "^<apply-service-segment-path>/(.*)$",
  "target": "<apply-service-segment-path>/$1",
  "destination": "mydestination",
  "authenticationType": "xsuaa",
  "csrfProtection": false
}
```

Replace `<apply-service-segment-path>` with the actual service path you want to use, for example `/sap` or `/myservice`;


## Keywords
SAP Fiori elements
SAP UI5
SAP Deployment
Cloud Foundry
MTA
Multi-Target Application
CAP
CDS


## Changelog

See the [CHANGELOG.md](https://github.com/SAP/open-ux-tools/blob/main/packages/cf-deploy-config-writer/CHANGELOG.md) file for details on changes and version history.
## Links

- [GitHub Package](https://github.com/SAP/open-ux-tools/tree/main/packages/cf-deploy-config-writer)