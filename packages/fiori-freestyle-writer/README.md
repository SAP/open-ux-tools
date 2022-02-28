# @sap-ux/fiori-freestyle-writer

Easy to use Fiori Freestyle project files writer for use within Yeoman generator and other prompting libraries. 


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
        title: 'My Test App',
        flpAppId: 'testme-app'
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
        localVersion: '1.90.0',
        version: '', // I.e Latest
        ui5Theme: 'sap_fiori_3',
        ui5Libs: 'sap.m,sap.ushell'
      },
      template: {
        type: TemplateType.ListDetail,
        settings: {
          entity: {
            name: 'Suppliers',
            key: 'SupplierID',
            idProperty: 'CompanyName',
            numberProperty: undefined,
            unitOfMeasureProperty: undefined
          },
          lineItem: {
            name: 'Products',
            key: 'ProductID',
            idProperty: 'ProductName',
            numberProperty: 'UnitsInStock',
            unitOfMeasureProperty: 'QuantityPerUnit'
          }
        }
      }
    };
  
const projectPath = join(curTestOutPath, name);
const fs = await generate(join(projectPath), appConfig);
return new Promise((resolve) => {
    fs.commit(resolve); // When using with Yeoman it handle the fs commit.
});
}

// Calling the function
await exampleWriter();

```

## Keywords
SAP Fiori Freestyle
