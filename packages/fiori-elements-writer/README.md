# @sap-ux/fiori-elements-writer

Easy to use Fiori Elements project files writer for use within Yeoman generator and other prompting libraries. 


## Installation
Npm
`npm install --save @sap-ux/fiori-elements-writer`

Yarn
`yarn add @sap-ux/fiori-elements-writer`

Pnpm
`pnpm add @sap-ux/fiori-elements-writer`

## Usage


Calling the `generate` function
```javascript
import { FioriElementsApp, generate, OdataVersion, TemplateType } from '@sap-ux/fiori-elements-writer'
import { join } from 'path';

const exampleWriter = async () => {

  const appConfig = {
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
      version: '1.98.0',
      ui5Theme: 'sap_fiori_3'
    },
    template: {
      type: TemplateType.ListReportObjectPage,
      settings: {
        entityConfig: {
          mainEntity: {
            entityName: 'Suppliers'
          },
          navigationEntity: {
            EntitySet: 'Products',
            Name: 'Products',
            Role: ''
          }
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
SAP Fiori Elements
