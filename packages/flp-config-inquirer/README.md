# @sap-ux/flp-config-inquirer

Provides Inquirer-based prompting to allow input and validation of data required to generate an **FLP** (*Fiori Launchpad*) configuration.

## Installation

Npm
`npm install --save @sap-ux/flp-config-inquirer`

Yarn
`yarn add @sap-ux/flp-config-inquirer`

Pnpm
`pnpm add @sap-ux/flp-config-inquirer`

## Explainer

The `@sap-ux/flp-config-inquirer` package provides a set of prompts for collecting user input required to generate FLP configuration. It leverages [Inquirer.js](https://www.npmjs.com/package/inquirer) for interactive command-line user interfaces.

You can retrieve the prompts using `getPrompts` and execute them with your own prompting mechanism. However, it is recommended to use the `prompt` function, which handles assigning default values to unanswered prompts based on provided prompt options. This ensures that hidden prompts or those not executed due to conditional logic are correctly populated.

Configurability of prompts is entirely controlled using the `FLPConfigPromptOptions` parameter.

- **Prompt Options**: Use `FLPConfigPromptOptions` to customize prompts, such as setting default values, hiding prompts, or adding validation.
- **Defaults Handling**: When prompts are hidden or not executed, default values or functions can be provided to ensure all required answers are available.
- **Conditional Prompts**: Some prompts may be conditionally displayed based on previous answers. The `prompt` function handles these conditions and default assignments.

### Inquirer usage example:

In the following example, the prompts are customized as follows:

- Sets a default `semanticObject` of `'MySemanticObject'`.
- Sets a default `action` of `'display'`.
- Hides the `title` prompt and provides a default value of `'My Application Title'`.

```ts
import { prompt, promptNames, type FLPConfigPromptOptions, type FLPConfigAnswers } from '@sap-ux/flp-config-inquirer';
import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import inquirer from 'inquirer';

const promptOptions: FLPConfigPromptOptions = {
    // Provides a default semantic object
    [promptNames.semanticObject]: {
        default: 'MySemanticObject'
    },
    // Provides a default action
    [promptNames.action]: {
        default: 'display'
    },
    // Hide the title prompt and provide a default value
    [promptNames.title]: {
        hide: true,
        default: 'My Application Title'
    }
};

const inquirerAdapter: InquirerAdapter = {
    prompt: inquirer.prompt
};

// Assume there are no existing inbound keys
const inboundKeys: string[] = [];

// flpConfigAnswers will contain all values required to generate an FLP configuration
const flpConfigAnswers: FLPConfigAnswers = await prompt(
    inquirerAdapter,
    inboundKeys,
    promptOptions
);

// Use flpConfigAnswers as needed
console.log('FLP Configuration Answers:', flpConfigAnswers);
```

## License

Read [License](./LICENSE).

## Keywords

SAP Fiori Launchpad
FLP Configuration
Inquirer
Prompting
Generator
