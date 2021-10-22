# @sap-ux/odata-service-writer

Writes the odata service related file updates to an existing UI5 project specified by the base path.


## Installation
Npm
`npm install --save @sap-ux/odata-service-writer`

Yarn
`yarn add @sap-ux/odata-service-writer`

Pnpm
`pnpm add @sap-ux/odata-service-writer`

## Usage

```Typescript
import { OdataVersion, OdataService, generate } from '@sap-ux/odata-service-writer';
import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

...

fs = create(createStorage()); // Or use fs from Yeoman

 const config:  OdataService = {
            url: 'http://localhost',
            path: '/sap/odata/testme',
            version: OdataVersion.v4,
            destination: {
                name: 'test'
            }
        };
const testDir = '/tmp';

await generate(testDir, config, fs);
        
```

## Keywords
SAP Fiori Freestyle
