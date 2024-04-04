# @sap-ux/ui5-library-reference-writer

Easy to use Reuse Library reference writer for use within Yeoman generator and other prompting libraries. 


## Installation
Npm
`npm install --save @sap-ux/ui5-library-reference-writer`

Yarn
`yarn add @sap-ux/ui5-library-reference-writer`

Pnpm
`pnpm add @sap-ux/ui5-library-reference-writer`

## Usage


Calling the `generate` function
```javascript
import { generate, ReuseLibConfig } from '@sap-ux/ui5-library-reference-writer'
import { join } from 'path';

const exampleWriter = async () => {

  const reuseLibConfig: ReuseLibConfig[] = [{
    name: 'my.namespace.reuse';
    path: 'sample/libs/my.namespace.reuse';
    type: 'library';
    uri: '/sap/ui5/reuse';
  }];

  const projectDir = join(__dirname, 'testapp');
  const fs = await generate(projectDir, reuseLibConfig);
  return new Promise((resolve) => {
      fs.commit(resolve); // When using with Yeoman it handle the fs commit.
  });
}

// Calling the function
await exampleWriter();

```

## Keywords
SAP Reuse Library
