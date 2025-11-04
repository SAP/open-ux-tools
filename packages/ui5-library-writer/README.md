[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/ui5-library-writer/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/ui5-library-writer)

# [`@sap-ux/ui5-library-writer`](https://github.com/SAP/open-ux-tools/tree/main/packages/ui5-library-writer)

Easy to use Reuse Library files writer for use within Yeoman generator and other prompting libraries. 


## Installation
Npm
`npm install --save @sap-ux/ui5-library-writer`

Yarn
`yarn add @sap-ux/ui5-library-writer`

Pnpm
`pnpm add @sap-ux/ui5-library-writer`

## Usage


Calling the `generate` function
```javascript
import { generate } from '@sap-ux/ui5-library-writer'
import { join } from 'path';

const exampleWriter = async () => {

  const reuseLibConfig = {
    libraryName: 'myUI5Library';
    namespace: 'com.myorg';
    framework: 'SAPUI5'; // SAPUI5 | OpenUI5
    frameworkVersion: '1.102.19';
    author: 'UX Tools';
    typescript: false;
  };

  const projectDir = join(__dirname, 'testLibs');
  const fs = await generate(join(projectDir), appConfig);
  return new Promise((resolve) => {
      fs.commit(resolve); // When using with Yeoman it handle the fs commit.
  });
}

// Calling the function
await exampleWriter();

```

## Keywords
SAP Reuse Library

