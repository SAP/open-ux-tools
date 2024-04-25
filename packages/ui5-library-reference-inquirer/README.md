# @sap-ux/ui5-library-reference-inquirer

Provides Inquirer based prompting to allow input and validation of data required to generate a UI5 library


## Installation
Npm
`npm install --save @sap-ux/ui5-library-reference-inquirer`

Yarn
`yarn add @sap-ux/ui5-library-reference-inquirer`

Pnpm
`pnpm add @sap-ux/ui5-library-reference-inquirer`

## Usage

Example with Yeoman generator no options, e.g. cli prompting only :

```javascript
import Generator from 'yeoman-generator';
import { generate, type ReuseLibConfig } from '@sap-ux/ui5-library-reference-writer'
import { prompt, type UI5LibraryReferenceAnswers } from '@sap-ux/ui5-library-reference-inquirer';
import { ToolsLogger } from '@sap-ux/logger';

export default class UI5LibraryReferenceGenerator extends Generator {
    answers: UI5LibraryReferenceAnswers = {};
    logger: ToolsLogger;

    constructor(args: string | string[], opts: Generator.GeneratorOptions) {
        super(args, opts);
        this.logger = new ToolsLogger();
    }

    public async prompting(): Promise<void> {        
        const answers = await prompt();
        Object.assign(this.answers, answers);
    }

    public async writing(): Promise<void> {
        const reuseLibConfigs: ReuseLibConfig[] = [];
        if (this.answers.referenceLibraries) {
            for (const lib of this.answers.referenceLibraries) {
                reuseLibConfigs.push({
                    name: lib.name,
                    path: lib.path,
                    type: lib.type,
                    uri: lib.uri
                });
            }
        }

        try {
            await generate(this.answers.targetFolder, reuseLibConfigs);
        } catch (e) {
            this.logger.error('Error generating reference to library');
        }
    }
}
```

## Keywords
SAP Fiori Elements
Yeoman
Generator
