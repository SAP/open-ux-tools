# @sap-ux/odata-service-inquirer

Provides Inquirer based end-user prompting to allow selection of a service from multiple data source types. This involves acquiring a connection to backend systems and retrieving edmx metadata for services provided by the catalog, from a local file or CAP project. This module also provides prompts that may be used to gather user selections to define the main and navigation entities and related prompts relating to application layout and annotation generation when creating a UI5 application using the `@sap-ux/fiori-freestyle-writer` and `@sap-ux/fiori-elements-writer` modules.

## Installation
Npm
`npm install --save @sap-ux/odata-service-inquirer`

Yarn
`yarn add @sap-ux/odata-service-inquirer`

Pnpm
`pnpm add @sap-ux/odata-service-inquirer`

## Explainer

Prompts may be retrieved using `getPrompts` and then executed in another prompting module that supports `inquirer` type prompts. 

`getPrompts` is provided to allow consumers to access prompts. There may be cases where these can be transformed to support other prompting frameworks. Most prompt configuration is possible via `OdataServiceInquirerOptions` and calling `prompt`. This is the recommended approach.

Configurability of prompts is entirely controlled using the `OdataServiceInquirerOptions` parameter. 

See [Inquirer.js](https://www.npmjs.com/package/inquirer) for valid default properties.

### Odata Service Inquirer usage example:

```TypeScript
import type { InquirerAdapter } from '@sap-ux/inquirer-common';
import type { OdataServiceAnswers, OdataServicePromptOptions } from '@sap-ux/odata-service-inquirer';
import { DatasourceType, prompt as serviceInquirerPrompt, CapService } from '@sap-ux/odata-service-inquirer';
import { generate as generateOdataService, OdataService, ServiceType } from '@sap-ux/odata-service-writer'
...
    const promptOpts = {
        datasourceType: {
            default: DatasourceType.capProject
        },
        metadata: {
            requiredOdataVersion: OdataVersion.v4
        },
        capProject: {
            capSearchPaths: this.workspaceFolders, // Pass VSCode workspace folders, for example, or any array of path strings
            defaultChoice: `/local/cap/project/path`
        },
        capService: {
            defaultChoice: {
                projectPath: '/local/cap/project/path',
                serviceName: 'MainOnlineService'
            }
        }
    } as OdataServicePromptOptions;

    /**
     * Pass an Inquirer prompt function https://www.npmjs.com/package/inquirer#methods
     */
    const inqAdaptor = {
        prompt: this.prompt.bind(this) // the inquirer prompting function, here we use the generators reference
    };

    const serviceAnswers: OdataServiceAnswers = await serviceInquirerPrompt(
        inqAdaptor as InquirerAdapter,
        promptOpts
    );

    const odataService: OdataService = {
        type: serviceAnswers.capService ? ServiceType.CDS : ServiceType.EDMX,
        url: serviceAnswers.metadata ? undefined : 'http://localhost',
        path: serviceAnswers.servicePath,
        metadata: serviceAnswers.metadata,
        version: serviceAnswers.odataVersion
    }
    generateOdataService(serviceAnswers.capService.projectPath, odataService);

...
```

## License

Read [License](./LICENSE).

## Keywords
SAP UI5 Application
Inquirer
Prompting
Generator
