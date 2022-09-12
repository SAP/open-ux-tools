# @sap-ux/ui5-test-writer

OPA files writer for use within Yeoman generator and other prompting libraries. 


## Installation
Npm
`npm install --save @sap-ux/ui5-test-writer`

Yarn
`yarn add @sap-ux/ui5-test-writer`

Pnpm
`pnpm add @sap-ux/ui5-test-writer`

## Usage

2 public methods are available: one to generate all OPA test files for a Fiori elements for OData V4 application, another one to generate an additional page object file for a Fiori elements for OData V4 application.


### Generate all OPA test files for a Fiori elements for OData V4 application

Calling the `generateOPAFiles` function
```javascript
import { generateOPAFiles } from '@sap-ux/ui5-test-writer'

const exampleWriter = async () => {
    const myProjectPath = 'path/to/my/project'; // Path to the root of the Fiori app
    const fs = await generateOPAFiles(myProjectPath, { scriptName: 'myOpaTest' });
    return new Promise((resolve) => {
        fs.commit(resolve); // When using with Yeoman it handle the fs commit.
    });
}

// Calling the function
await exampleWriter();

```

### Generate an additional page object file

Calling the `generatePageObjectFile` function
```javascript
import { generatePageObjectFile } from '@sap-ux/ui5-test-writer'

const exampleWriter = async () => {
    const myProjectPath = 'path/to/my/project'; // Path to the root of the Fiori app
    const targetKey = 'MyNewPage';  // Key of the target in the app descriptor (in sap.ui5/routing/targets)
    const fs = await generatePageObjectFile(myProjectPath, { targetKey });
    return new Promise((resolve) => {
        fs.commit(resolve); // When using with Yeoman it handle the fs commit.
    });
}

// Calling the function
await exampleWriter();

```

## Keywords
SAP Fiori Elements
