[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/ui5-application-writer/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/ui5-application-writer)

# [`@sap-ux/ui5-application-writer`](https://github.com/SAP/open-ux-tools/tree/main/packages/ui5-application-writer)

Writes a basic ui5 application


## Installation
Npm
`npm install --save @sap-ux/ui5-application-writer`

Yarn
`yarn add @sap-ux/ui5-application-writer`

Pnpm
`pnpm add @sap-ux/ui5-application-writer`

## Usage
```Typescript
import { generate } from '@sap-ux/ui5-application-writer';
import { join } from 'path';

const projectDir = join(__dirname, 'testapp1');
const fs = await generate(projectDir, {
    app: {
        id: 'testAppId',
        title: 'Test App Title',
        description: 'Test App Description'
    },
    package: {
        name: 'testPackageName'
    }
});

fs.commit();

```

## Keywords
SAP Fiori Freestyle

