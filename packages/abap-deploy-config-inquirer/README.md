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

### ABAP Deploy Config Inquirer usage example:

```TypeScript
import type { InquirerAdapter } from '@sap-ux/inquirer-common';
import type { AbapDeployConfigAnswers, AbapDeployConfigPromptOptions } from '@sap-ux/abap-deploy-config-inquirer';
import { prompt as abapDeployConfigPrompt } from '@sap-ux/abap-deploy-config-inquirer';
import { generate as generateAbapDeployConfig } from '@sap-ux/odata-service-writer'

const promptOptions = {
    backendTarget: {
        abapTarget: {
            url: 'https://example.com',
            client: '100',
            scp: false
        },
        serviceProvider: serviceProvider, // connected abap service provider
        type: 'application'
    }
};

/**
 * Pass an Inquirer prompt function https://www.npmjs.com/package/inquirer#methods
 */
const inqAdaptor = {
    prompt: this.prompt.bind(this) // the inquirer prompting function, here we use the generators reference
};

const abapDeployConfigAnswers: AbapDeployConfigAnswers = await abapDeployConfigPrompt(
    inqAdaptor as InquirerAdapter,
    promptOpts
);

const projectDir = join(__dirname, 'testapp');
await generateAbapDeployConfig(
        projectDir,
        {
            target: {
                url: abapDeployConfigAnswers.url,
                client: abapDeployConfigAnswers.client,
                scp: abapDeployConfigAnswers.scp,
                destination: abapDeployConfigAnswers.destination
            },
            app: {
                name: abapDeployConfigAnswers.name,
                description: abapDeployConfigAnswers.description,
                package: abapDeployConfigAnswers.package,
                transport: abapDeployConfigAnswers.transport
            },
            index: abapDeployConfigAnswers.index
        },
        {
            baseFile: '/path/to/base/config', // e.g ui5.yaml
            deployFile: '/path/to/deploy/config', // e.g ui5-deploy.yaml
        },
        this.fs
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