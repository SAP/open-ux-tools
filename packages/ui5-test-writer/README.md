[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/ui5-test-writer/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/ui5-test-writer)

# [`@sap-ux/ui5-test-writer`](https://github.com/SAP/open-ux-tools/tree/main/packages/ui5-test-writer)

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

The `generateOPAFiles` function creates OPA5 tests suite for Fiori elements applications by analyzing the project structure and generating dynamic test cases based on actual application configuration.

#### How it works:

1. **Analyzes the project** using `@sap/ux-specification` to create an application model that represents the UI structure
2. **Extracts UI controls** from the applications page models, for example:
   - Filter bar fields from the FilterBar control
   - Table columns from the Table control aggregations
3. **Generates test files** based on the extracted information:
   - Common test infrastructure files (e.g. testsuite)
   - Page object files for each page defined in the routing targets
   - Journey files with dynamic test assertions for application configuration
   - Journey runner configuration

This approach ensures that OPA tests are tailored to the specific features and controls present in your application, rather than generating generic tests that might not match your actual UI.

#### Usage Example

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