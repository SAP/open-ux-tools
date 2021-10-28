# @sap-ux/ui5-config
Utility module to create and update [UI5 tooling configuration](https://sap.github.io/ui5-tooling/pages/Configuration/) files (`ui5*.yaml`) with helper methods specifically for Fiori tools middlewares.

## Installation
Npm
`npm install --save @sap-ux/ui5-config`

Yarn
`yarn add @sap-ux/ui5-config`

Pnpm
`pnpm add @sap-ux/ui5-config`

## Usage

Create a new config file
```javascript
// generate an empty instance
const ui5Config = await UI5Config.newInstance('');

// set the UI5 framework with a specific version
ui5Config.addUI5Framework('SAPUI5', '1.64.0', []);

// create the file
fs.write('./ui5.yaml', ui5Config.toString());
```

Add a middleware to an existing file
```javascript
// load a config from the filesytem
const ui5Config = await UI5Config.newInstance(fs.read('./ui5.yaml'));

// add a middlewre
ui5Config.addFioriToolsAppReloadMiddleware();

// write the changes back to the filestystem
fs.write('./ui5.yaml', ui5Config.toString());
```

See more example in [`/test/index.test.ts`](./test/index.test.ts)

## Keywords
SAP Fiori freestyle
