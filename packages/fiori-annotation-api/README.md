# @sap-ux/fiori-annotation-api 


## Installation
Npm
`npm install --save @sap-ux/fiori-annotation-api`

Yarn
`yarn add @sap-ux/fiori-annotation-api `

Pnpm
`pnpm add @sap-ux/fiori-annotation-api `

## Usage

Read projects annotations for a service in a SAP Fiori Elements project with local metadata and annotations in XML format.
Annotations are merged and returned in the same format as for SAP Fiori elements runtime.

```Typescript
import { readAnnotations, LocalService } from '@sap-ux/fiori-annotation-api';

const service: LocalService = {
    type: 'local',
    annotationFiles,
    metadataFile
};
const annotations = readAnnotations(service);
const entitySet = annotations.entitySets.find(entitySet => entitySet.name === 'MyEntity');
if (entitySet) {
    const lineItemLabels = entitySet.entityType.annotations.UI?.LineItem?.map(dataField => dataField.Label)
}
```


## Keywords
OData Fiori annotations
