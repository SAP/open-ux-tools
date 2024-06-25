# @sap-ux/abap-deploy-config-writer

Easy to use ABAP deployment configuration writer for use within Yeoman generator and other prompting libraries. 


## Installation
Npm
`npm install --save @sap-ux/abap-deploy-config-writer`

Yarn
`yarn add @sap-ux/abap-deploy-config-writer`

Pnpm
`pnpm add @sap-ux/abap-deploy-config-writer`

## Usage


Calling the `generate` function
```javascript
import { generate } from '@sap-ux/abap-deploy-config-writer'
import { join } from 'path';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';

const exampleWriter = async () => {

  const abapDeployConfig: AbapDeployConfig[] = [
        {
            target: { url: 'https://example.com', client: '000', scp: false },
            app: { name: 'testapp', package: 'TESTPKG12', description: 'Deployment description', transport: 'TR123' }
        }
    ];

  const projectDir = join(__dirname, 'testapp');
  const fs = await generate(projectDir, abapDeployConfig);
  return new Promise((resolve) => {
      fs.commit(resolve); // When using with Yeoman it handle the fs commit.
  });
}

// Calling the function
await exampleWriter();

```

## Keywords
SAP Reuse Library
