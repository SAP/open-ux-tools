[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/odata-service-writer/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/odata-service-writer)

# [`@sap-ux/odata-service-writer`](https://github.com/SAP/open-ux-tools/tree/main/packages/odata-service-writer)

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