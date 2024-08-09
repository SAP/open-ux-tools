# @sap-ux/abap-deploy-config-inquirer

Provides Inquirer based end-user prompting to retrieve the ABAP deployment configuration for an application. This involves acquiring a connection to the chosen backend system and retrieving the associated packages and transport requests for the system.

## Installation
Npm
`npm install --save @sap-ux/abap-deploy-config-inquirer`

Yarn
`yarn add @sap-ux/abap-deploy-config-inquirer`

Pnpm
`pnpm add @sap-ux/abap-deploy-config-inquirer`

## Explainer

Prompts may be retrieved using `getPrompts` and then executed in another prompting module that supports `inquirer` type prompts. 

`getPrompts` is provided to allow consumers to access prompts. There may be cases where these can be transformed to support other prompting frameworks. Most prompt configuration is possible via `AbapDeployConfigPromptOptions` and calling `prompt`. This is the recommended approach.

Configurability of prompts is entirely controlled using the `AbapDeployConfigPromptOptions` parameter. 

See [Inquirer.js](https://www.npmjs.com/package/inquirer) for valid default properties.

### Odata Service Inquirer usage example:

```TypeScript
// todo : code examples
```

## License

Read [License](./LICENSE).

## Keywords
SAP UI5 Application
Inquirer
Prompting
Generator
