# @sap-ux/ui5-application-inquirer

Provides Inquirer based prompting to allow input and validation of data required to generate a UI5 application

## Installation
Npm
`npm install --save @sap-ux/ui5-application-inquirer`

Yarn
`yarn add @sap-ux/ui5-application-inquirer`

Pnpm
`pnpm add @sap-ux/ui5-application-inquirer`

## Explainer

Prompts may be retrieved using `getPrompts` and then executed in another prompting module that supports `inquirer` type prompts. However, it is recommended to call `prompt` so that unanswered prompts can be assigned defaults if provided via prompt options before returning, otherwise this needs to be taken care of by the callers prompting functionality. Note that hidden prompts, for example those hidden behind the advanced option, may not have been executed, depending on the users selection of `showAdvanced`. In addition, previous answers need to be provided to default functions, and this is taken care of when calling `prompt` but would need to be handled by the consumers prompting framework if using the prompts returned by `getPrompts` directly.

`getPrompts` is provided to allow consumers to access prompts. There may be cases where these can be transformed to support other prompting frameworks. Most prompt configuration is possible via `UI5ApplicationInquirerOptions` and calling `prompt`. 

Configurability of prompts is entirely controlled using the `UI5ApplicationInquirerOptions` parameter. Note that if a prompt is hidden specifiying the `hide` property as `true`,
the prompt validation or default functions will not be execute and so there may not be an answer provided for that prompt name. It is advisable therefore to provide a default
value or function when hiding prompts that are not specified as advanced option prompts.

Similarly if a prompt is set to be grouped under advanced options by specifying `advancedOption` as `true`, these prompts may not be executed if the end-user chooses not to set them. In this case a default will be provided based on the current fallback defaults or default provided as the property `default`. 
See [Inquirer.js](https://www.npmjs.com/package/inquirer) for valid default properties.

### Inquirer usage example:

In the following example the prompts are customised as follows:

- Provides a default application name of 'travelApp'
- Provides additional validation of description to be less than 50 characters
- Hides the UI5 version prompt behind an advanced confirm prompt

```javascript
import { type UI5ApplicationPromptOptions, type UI5ApplicationAnswerspromptNames, prompt } from '@sap-ux/ui5-application-inquirer';
import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import inquirer from 'inquirer';

const promptOptions: UI5ApplicationPromptOptions = {
    // Provides a default UI5 application name
    [promptNames.name]: {
        default: 'travelApp'
    },
    // Adds additional validation to description prompt
    [promptNames.description]: {
        validate: (description, previousAnsers) => {
            if (description.length > 50) {
                return 'Please enter a description less than 50 characters'
            }
        }
    },
    // Hide behind `showAdvanced` prompt
    [promptNames.ui5Version]: {
        advanced: true
    }
}

const inquirerAdapter: InquirerAdapter = {
    prompt: inquirer.prompt
};

// ui5AppAnswers will contain all values required to generate a UI5 app
const ui5AppAnswers: UI5ApplicationAnswers = await prompt(
    inquirerAdapter,
    promptOptions
);

```
## License

Read [License](./LICENSE).

## Keywords
SAP UI5 Application
Inquirer
Prompting
Generator
