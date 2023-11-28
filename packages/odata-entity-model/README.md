# OData Entity Model

Package containing metadata service, which allows to look up elements from entity data model of an OData service.

## Installation
Npm
`npm install --save @sap-ux/odata-entity-model`

Yarn
`yarn add @sap-ux/odata-entity-model`

Pnpm
`pnpm add @sap-ux/odata-entity-model`

## Usage

1. Import the needed functions in your modules

    ```typescript
    import { MetadataService  } from '@sap-ux/odata-entity-model';
    const metadataFileUri = 'testFileUri';
    const metadataElements: MetadataElement[] = [
        {
            isAnnotatable: true,
            kind: 'EntityType',
            name: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department',
            path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department',
            isCollectionValued: false,
            isComplexType: false,
            isEntityType: true,
            content: [
                {
                    content: [],
                    isAnnotatable: true,
                    kind: 'Property',
                    name: 'Sector',
                    path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Sector',
                    isCollectionValued: false,
                    isComplexType: false,
                    isEntityType: false,
                    edmPrimitiveType: 'Edm.String'
                }
            ]
        }];
    const metadata = new MetadataService({ ODataVersion: '4.0' });
    metadata.import(metadataElements, metadataFileUri);
    const pathBase = metadata.getMetadataElement('com.sap.gateway.default.iwbep.tea_busi.v0001.Department');
```

For usage examples see unit tests in `odata-entity-model/test`.