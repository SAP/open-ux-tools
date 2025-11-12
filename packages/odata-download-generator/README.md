# @sap-ux/odata-app-data-downloader

TODO

## Installation
Npm
`npm install --save @sap-ux/odata-app-data-downloader`

Yarn
`yarn add @sap-ux/odata-app-data-downloader`

Pnpm
`pnpm add @sap-ux/odata-app-data-downloader`

## Explainer

Prompts may be retrieved using `getPrompts` and then executed in another prompting module that supports `inquirer` type prompts. 

`getPrompts` is provided to allow consumers to access prompts. There may be cases where these can be transformed to support other prompting frameworks. Most prompt configuration is possible via `OdataServiceInquirerOptions` and calling `prompt`. This is the recommended approach.

Configurability of prompts is entirely controlled using the `OdataServiceInquirerOptions` parameter. 

See [Inquirer.js](https://www.npmjs.com/package/inquirer) for valid default properties.

## License

Read [License](./LICENSE).

## Keywords
SAP UI5 Application
Fiori Elements
Mockdata
Test
OPA5
