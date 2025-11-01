# @sap-ux/ui5-application-writer

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

## Changelog

See the [CHANGELOG.md](https://github.com/SAP/open-ux-tools/blob/main/packages/ui5-application-writer/CHANGELOG.md) file for details on changes and version history.
## Links

- [GitHub Package](https://github.com/SAP/open-ux-tools/tree/main/packages/ui5-application-writer)