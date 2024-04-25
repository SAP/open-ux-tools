# @sap-ux/odata-service-inquirer

Provides Inquirer based end-user prompting to allow selection of a service from multiple data source types. This invloves aquiring a connection to backend systems and retrieving edmx metadata for services provided by the catalog, from a local file or CAP project.

## Installation
Npm
`npm install --save @sap-ux/odata-service-inquirer`

Yarn
`yarn add @sap-ux/odata-service-inquirer`

Pnpm
`pnpm add @sap-ux/odata-service-inquirer`

## Explainer

Prompts may be retrieved using `getPrompts` and then executed in another prompting module that supports `inquirer` type prompts. 

`getPrompts` is provided to allow consumers to access prompts. There may be cases where these can be transformed to support other prompting frameworks. Most prompt configuration is possible via `OdataServiceInquirerOptions` and calling `prompt`. 

Configurability of prompts is entirely controlled using the `OdataServiceInquirerOptions` parameter. 

See [Inquirer.js](https://www.npmjs.com/package/inquirer) for valid default properties.

### Inquirer usage example:

**TODO: REPLACE EXAMPLE**

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
