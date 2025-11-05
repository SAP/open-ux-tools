[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/mockserver-config-writer/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/mockserver-config-writer)

# [`@sap-ux/mockserver-config-writer`](https://github.com/SAP/open-ux-tools/tree/main/packages/mockserver-config-writer)

Adds or removes configuration for mockserver module `@sap-ux/ui5-middleware-fe-mockserver` to an SAP UX project.

## Installation
Npm
`npm install --save @sap-ux/mockserver-config-writer`

Yarn
`yarn add @sap-ux/mockserver-config-writer`

Pnpm
`pnpm add @sap-ux/mockserver-config-writer`

## Usage
```Typescript
import { generateMockserverConfig } from '@sap-ux/mockserver-config-writer';
import { join } from 'path';

const basePath = join(__dirname, 'test/fixtures/bare-minimum');
const fs = await generateMockserverConfig(
    basePath,
    {
        webappPath: join(basePath, 'webapp'),
});

fs.commit();
```

See more complex example in [`/test/unit`](./test/unit)

## Keywords
SAP Fiori elements
SAP Fiori - UI5 middleware for the Fiori elements mock server