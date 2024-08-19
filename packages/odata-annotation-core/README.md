# OData Annotation Core

Package containing low level building blocks and utility functions for working with OData annotations.

## Installation
Npm
`npm install --save @sap-ux/odata-annotation-core`

Yarn
`yarn add @sap-ux/sap-ux/odata-annotation-core`

Pnpm
`pnpm add @sap-ux/sap-ux/odata-annotation-core`

## Usage

### Parse identifier
#### Term name:
```Typescript
import { parseIdentifier } from '@sap-ux/odata-annotations-core';

const { type, name, namespaceOrAlias } = parseIdentifier('com.sap.vocabularies.UI.v1.LineItem');
// Expected 
// type: 'identifier',
// namespaceOrAlias: 'com.sap.vocabularies.UI.v1',
// name: 'LineItem'

```
#### Function name:
```Typescript
import { parseIdentifier } from '@sap-ux/odata-annotations-core';

const identifier = 'MySchema.MyAction(Collection(MySchema.MyBindingType),Collection(MySchema.MyType))';
const { type, name, namespaceOrAlias, parameters } = parseIdentifier(identifier);
// Expected 
// type: 'action-function',
// namespaceOrAlias: 'MySchema',
// name: 'MyAction'
// parameters: 
//    [
//        {
//            type: 'collection',
//            name: 'MyBindingType',
//            namespaceOrAlias: 'MySchema'
//        },
//        {
//            type: 'collection',
//            name: 'MyType',
//            namespaceOrAlias: 'MySchema'
//        }
//    ]
```

### Conversion to fully qualified name

```Typescript
import type { ParsedName } from '@sap-ux/odata-annotations-core';
import { toFullyQualifiedName } from '@sap-ux/odata-annotations-core';

const aliasMap: { [aliasOrNamespace: string]: string } = {
    UI: 'com.sap.vocabularies.UI.v1',
    'com.sap.vocabularies.UI.v1': 'com.sap.vocabularies.UI.v1'
};
                    
const identifier1: ParsedName = {
    type: 'identifier',
    name: 'LineItem',
    namespaceOrAlias: 'UI'
}

const identifier2: ParsedName = {
    type: 'identifier',
    name: 'FieldGroup',
    namespaceOrAlias: 'com.sap.vocabularies.UI.v1'
}

const identifier3: ParsedName = {
    type: 'identifier',
    name: 'MyEntityType',
}

const currentWorkspace = 'MyNamespace';

const fqName1 = toFullyQualifiedName(aliasMap, currentWorkspace, identifier1);
const fqName2 = toFullyQualifiedName(aliasMap, currentWorkspace, identifier2);
const fqName3 = toFullyQualifiedName(aliasMap, currentWorkspace, identifier3);
// Expected
// fqName1: 'com.sap.vocabularies.UI.v1.LineItem'
// fqName2: 'com.sap.vocabularies.UI.v1.FieldGroup'
// fqName3: 'MyNamespace.MyEntityType

```

For other usage examples see unit tests in `odata-annotation-core/test`.

## Keywords
SAP ODATA annotations
