# OData Annotation Core Types

Package containing common types for working with OData annotations.

## Installation
Npm
`npm install --save @sap-ux/odata-annotation-core-types`

Yarn
`yarn add @sap-ux/odata-annotation-core-types`

Pnpm
`pnpm add @sap-ux/odata-annotation-core-types`

## Usage

### Annotation file creation
```Typescript
import {
    createElementNode,
    createTarget,
    createReference,
    createNamespace,
    AnnotationFile,
    Target,
    Reference,
    Element
} from '@sap-ux/odata-annotations-core-types';

const file: AnnotationFile = {
    uri: 'annotations.xml',
    type: 'annotation-file',
    namespace: createNamespace('MyNameSpace'),
    references: [],
    targets: []
};

const reference: Reference = createReference(
    'com.sap.vocabularies.UI.v1',
    'UI',
    'https://sap.github.io/odata-vocabularies/vocabularies/UI.xml'
);
file.references.push(reference);

const target: Target = createTarget('MyNamespace.MyEntityType');

const term: Element = createElementNode({
    name: 'UI.LineItem',
    attributes: {
        Qualifier: {
            name: 'Qualifier',
            type: 'attribute',
            value: 'mainList'
        }
    },
    content: [{ type: 'element', name: 'Collection', attributes: {}, content: [] }]
});
target.terms.push(term);
file.targets.push(target);

```

For other usage examples see unit tests in `odata-annotation-core-types/test`.

## Keywords
SAP ODATA annotations
