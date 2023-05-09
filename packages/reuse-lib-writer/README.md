# @sap-ux/reuse-lib-writer

Easy to use Reuse Library files writer for use within Yeoman generator and other prompting libraries. 


## Installation
Npm
`npm install --save @sap-ux/reuse-lib-writer`

Yarn
`yarn add @sap-ux/reuse-lib-writer`

Pnpm
`pnpm add @sap-ux/reuse-lib-writer`

## Usage


Calling the `generate` function
```javascript
import { generate } from '@sap-ux/reuse-lib-writer'
import { join } from 'path';

const exampleWriter = async () => {

  const reuseLibConfig = {
    libraryName: 'myUI5Library';
    namespace: 'com.myorg';
    framework: 'SAPUI5'; // SAPUI5 | OpenUI5
    frameworkVersion: '1.102.19';
    author: 'New User';
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
