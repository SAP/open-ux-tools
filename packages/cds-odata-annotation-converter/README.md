# CDS OData Annotation Converter

## Installation
Npm
`npm install --save @sap-ux/cds-odata-annotation-converter`

Yarn
`yarn add @sap-ux/cds-odata-annotation-converter`

Pnpm
`pnpm add @sap-ux/cds-odata-annotation-converter`

## Usage

Convert CDS `annotationAstNodes` to annotation file format from `@sap-ux/odata-annotation-core-types`.

```Typescript
import { createCdsCompilerFacade, createMetadataCollector } from '@sap/ux-cds-compiler-facade';
import { toAnnotationFile, toTargetMap  } from '@sap-ux/cds-odata-annotation-converter';
import { VocabularyService } from '@sap-ux/odata-vocabularies';

const uri = 'file://my-service.cds';
const vocabularyService = new VocabularyService(true);
const facade = createCdsCompilerFacade(compileModel);
const cdsAnnotationFile = toTargetMap(fileIndex, uri, vocabularyService, facade);
const metadataElementMap = new Map();
const metadataCollector = createMetadataCollector(metadataElementMap, facade);
const { file: annotationFile } = toAnnotationFile(
    uri,
    vocabularyService,
    cdsAnnotationFile,
    metadataCollector
);
```

Generate CDS annotation text fragment. 

```Typescript
import { print } from '@sap-ux/cds-odata-annotation-converter';
import { Edm, createElementNode, createAttributeNode } from '@sap-ux/odata-annotation-core-types';

const element = createElementNode({
    name: Edm.PropertyValue,
    attributes: {
        [Edm.Property]: createAttributeNode(Edm.Property, 'Target'),
        [Edm.AnnotationPath]: createAttributeNode(Edm.AnnotationPath, '$0')
    },
});

// "Target : '$0'"
const text = print(element);
```

## Keywords
OData CAP CDS annotations
