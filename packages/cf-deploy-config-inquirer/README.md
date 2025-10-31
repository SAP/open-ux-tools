# @sap-ux/cf-deploy-config-inquirer

Prompts module that can provide prompts for Cloud Foundry deployment config writer.

## Installation
Npm
`npm install --save @sap-ux/cf-deploy-config-inquirer`

Yarn
`yarn add @sap-ux/cf-deploy-config-inquirer`

Pnpm
`pnpm add @sap-ux/cf-deploy-config-inquirer`


## Explainer

Prompts may be retrieved using `getPrompts` and then executed in another prompting module that supports `inquirer` type prompts. 

`getPrompts` is provided to allow consumers to access cloud foundry prompts. There may be cases where these can be transformed to support other prompting frameworks. Most prompt configuration is possible via `CfDeployConfigPromptOptions` and calling `prompt`. This is the recommended approach.

Configurability of prompts is entirely controlled using the `CfDeployConfigPromptOptions` parameter. 

See [Inquirer.js](https://www.npmjs.com/package/inquirer) for valid default properties.

### Cloud Foundry Deploy Config Inquirer usage example:

```TypeScript
import type { InquirerAdapter } from '@sap-ux/inquirer-common';
import type { CfDeployConfigAnswers, CfDeployConfigPromptOptions } from '@sap-ux/cf-deploy-config-inquirer';
import { prompt as cfDeployConfigPrompt, promptNames } from '@sap-ux/cf-deploy-config-inquirer';

const promptOptions = {
    [promptNames.destinationName]: {
        defaultValue: 'defaultDestination',
        hint: false
    },
    [promptNames.addManagedAppRouter]: true,
    [promptNames.overwrite]: true
};

/**
 * Pass an Inquirer prompt function https://www.npmjs.com/package/inquirer#methods
 */
const inqAdaptor = {
    prompt: this.prompt.bind(this) // the inquirer prompting function, here we use the generators reference
};

const cfDeployConfigAnswers: CfDeployConfigAnswers = await cfDeployConfigPrompt(
    inqAdaptor as InquirerAdapter,
    promptOpts
);
```

## License

Read [License](./LICENSE).

## Keywords
SAP UI5 Application
Inquirer
Prompting
Generator
Deployment

## Changelog

See the [CHANGELOG.md](https://github.com/SAP/open-ux-tools/blob/main/packages/cf-deploy-config-inquirer/CHANGELOG.md) file for details on changes and version history.
## Links

- [GitHub Package](https://github.com/SAP/open-ux-tools/tree/main/packages/cf-deploy-config-inquirer)