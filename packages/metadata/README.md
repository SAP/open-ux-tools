# Metadata

Package containing metadata service

## Installation
Npm
`npm install --save @sap-ux/metadata`

Yarn
`yarn add @sap-ux/metadata`

Pnpm
`pnpm add @sap-ux/metadata`

## Usage

1. Import the needed functions in your modules

    ```typescript
    import { MetadataService  } from '@sap/ux-metadata';
    
    const metadata = new MetadataService({ ODataVersion: '4.0' });
    metadata.import((v4metadata as any).metadata, 'testDummy/metadataV4.xml');
    const pathBase = metadata.getMetadataElement('IncidentService.Incidents');
```

For usage examples see unit tests in `metadata/test`.