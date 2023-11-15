# @sap-ux/ui5-library-inquirer

Provides Inquirer based prompting to allow input and validation of data required to generate a UI5 library


## Installation
Npm
`npm install --save @sap-ux/ui5-library-inquirer`

Yarn
`yarn add @sap-ux/ui5-library-inquirer`

Pnpm
`pnpm add @sap-ux/ui5-library-inquirer`

## Usage

Example with Yeoman generator no options, e.g. cli prompting only :

```javascript
import Generator from 'yeoman-generator';
import { generate, type UI5LibConfig } from '@sap-ux/ui5-library-writer';
import { prompt, type UI5LibraryAnswers } from '@sap-ux/ui5-library-inquirer';

export default class UI5LibraryGenerator extends Generator {
    answers: UI5LibraryAnswers = {};
 
    constructor(args: string | string[], opts: Generator.GeneratorOptions) {
        super(args, opts);
    }

    public async prompting(): Promise<void> {
        const answers = await prompt();
        Object.assign(this.answers, answers);
    }

     public async writing(): Promise<void> {
        const ui5Lib: UI5LibConfig = {
            libraryName: this.answers.libraryName,
            namespace: this.answers.namespace,
            framework: 'SAPUI5',
            frameworkVersion: this.answers.ui5Version,
            author: 'Fiori tools',
            typescript: this.answers.enableTypescript
        };

        try {
            await generate(this.answers.targetFolder, ui5Lib, this.fs);
        } catch (e) {}
    }
}
```

Example with Yeoman generator passing options with adapter, e.g. @sap-devx/yeoman-ui integration :

```javascript
import Generator from 'yeoman-generator';
import { generate, type UI5LibConfig } from '@sap-ux/ui5-library-writer';
import { prompt, type UI5LibraryAnswers } from '@sap-ux/ui5-library-inquirer';

export default class UI5LibraryGenerator extends Generator {
    answers: UI5LibraryAnswers = {};
    targetFolder: string;
 
    constructor(args: string | string[], opts: Generator.GeneratorOptions) {
        super(args, opts);
        this.targetFolder = opts.targetFolder;
    }

    public async prompting(): Promise<void> {
        const answers = await prompt(
            {
                targetFolder: this.targetFolder,
                includeSeparators: true,
                useAutocomplete: false
            },
            this.env?.adapter
        );
        Object.assign(this.answers, answers);
    }

     public async writing(): Promise<void> {
        const ui5Lib: UI5LibConfig = {
            libraryName: this.answers.libraryName,
            namespace: this.answers.namespace,
            framework: 'SAPUI5',
            frameworkVersion: this.answers.ui5Version,
            author: 'Fiori tools',
            typescript: this.answers.enableTypescript
        };

        try {
            await generate(this.answers.targetFolder, ui5Lib, this.fs);
        } catch (e) {}
    }
}
```

## Keywords
SAP Fiori Elements
Yeoman
Generator
