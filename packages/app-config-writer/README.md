# @sap-ux/app-config-config-writer

The `@sap-ux/app-config-writer` adds or removes a smartlinks configuration to an SAP UX project. 

## Installation
Npm
`npm install --save @sap-ux/app-config-writer`

Yarn
`yarn add @sap-ux/app-config-writer`

Pnpm
`pnpm add @sap-ux/app-config-writer`

## Usage
```Typescript
import { generateSmartLinksConfig } from '@sap-ux/app-config-writer';
import { join } from 'path';

const basePath = join(__dirname, 'test/fixtures/ui5-deploy-config');
// For destination in BAS, use `destination`
const target = { url: 'https://abc.abap.stagingaws.hanavlab.ondemand.com', client: '000' }
const auth = { username: 'username', password: 'password' }
const fs = await generateSmartLinksConfig(
    basePath,
    { target, auth }
);

fs.commit();
```

See more complex example in [`/test/unit`](./test/unit)

## Keywords
SAP Fiori elements