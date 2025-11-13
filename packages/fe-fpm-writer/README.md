[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/fe-fpm-writer/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/fe-fpm-writer)

# [`@sap-ux/fe-fpm-writer`](https://github.com/SAP/open-ux-tools/tree/main/packages/fe-fpm-writer)

Generates elements defined in the Fiori elements for OData v4 flexible programming model into Fiori elements applications


## Installation
Npm
`npm install --save @sap-ux/fe-fpm-writer`

Yarn
`yarn add @sap-ux/fe-fpm-writer`

Pnpm
`pnpm add @sap-ux/fe-fpm-writer`

## Usage
```Typescript
import { generate } from '@sap-ux/fe-fpm-writer';
import { join } from 'path';

const projectDir = join(__dirname, 'test/test-input/basic-lrop');
const fs = await generateCustomPage(
    targetPath,
    {
        name: 'MyCustomPage',
        entity: 'Booking',
        navigation: {
            sourcePage: 'TravelObjectPage',
            navEntity: '_Booking'
        }
});

fs.commit();

```
See more complex example in [`/test/integration/index.test.ts`](./test/integration/index.test.ts)
## Keywords
SAP Fiori elements