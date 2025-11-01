# @sap-ux/fiori-freestyle-writer

Writer module allowing to generate custom SAPUI5 applications with different templates.

:warning: **All templates except the Basic template are deprecated** and will be removed in a future release. Please use the Custom page SAP Fiori template(`@sap-ux/fiori-elements-writer`)  as an alternative. 

## Installation
Npm
`npm install --save @sap-ux/fiori-freestyle-writer`

Yarn
`yarn add @sap-ux/fiori-freestyle-writer`

Pnpm
`pnpm add @sap-ux/fiori-freestyle-writer`

## Usage

Calling the `generate` function
```javascript
import { FreestyleApp, generate, OdataVersion, TemplateType } from '@sap-ux/fiori-freestyle-writer'
import { join } from 'path';

const exampleWriter = async () => {

  const appConfig =
    {
      app: {
        id: 'test.me',
        title: 'My Test App'
      },
      package: {
        name: 'test.me'
      },
      service: {
        url: 'https://services.odata.org',
        path: '/V2/Northwind/Northwind.svc',
        version: OdataVersion.v2,
        metadata: // Fetch from: https://services.odata.org/V2/Northwind/Northwind.svc$metadata
      },
      ui5: {
        version: '1.90.0',
        ui5Theme: 'sap_fiori_3',
        ui5Libs: 'sap.m,sap.ushell'
      },
      template: {
        type: TemplateType.Basic,
        settings: {
          viewName: 'CustomViewName'
      }
    };
  
const projectPath = join(curTestOutPath, name);
const fs = await generate(join(projectPath), appConfig);
return new Promise((resolve) => {
    fs.commit(resolve); // when using with Yeoman it handle the fs commit.
});
}

// Calling the function
await exampleWriter();

```

## Keywords
SAPUI5
SAP Fiori
SAP Fiori tools

## Changelog

See the [CHANGELOG.md](https://github.com/SAP/open-ux-tools/blob/main/packages/fiori-freestyle-writer/CHANGELOG.md) file for details on changes and version history.
## Links

- [GitHub Package](https://github.com/SAP/open-ux-tools/tree/main/packages/fiori-freestyle-writer)