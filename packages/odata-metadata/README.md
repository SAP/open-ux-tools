# @sap-ux/odata-metadata 

## Installation
Npm
`npm install --save @sap-ux/odata-metadata`

Yarn
`yarn add @sap-ux/odata-metadata `

Pnpm
`pnpm add @sap-ux/odata-metadata `

## Usage

Metadata service with XML metadata files. To read the XML files and extract the metadata elements `@xml-tools/parser`, `@xml-tools/ast` and `@sap-ux/xml-annotation-converter` packages are used in the example.

```Typescript
import { readFile } from 'fs/promises';
import { buildAst } from '@xml-tools/ast';
import { parse } from '@xml-tools/parser';
import { convertMetadataDocument } from '@sap-ux/xml-annotation-converter';
import { MetadataService } from ' @sap-ux/odata-metadata';

// read annotation file
const text = await readFile('metadata.xml', 'utf8');
// parse XML
const { cst, tokenVector } = parse(text);
// build AST
const ast = buildAst(cst, tokenVector);
// convert to annotation document format
const metadata = convertMetadataDocument(ast);
const metadataService = new MetadataService();
metadataService.import(metadata);
const targetKinds = metadataService.getEdmTargetKinds('/com.sap.gateway.default.iwbep.tea_busi.v0001.Department');
const hasEntityContainerTargetKind = targetKinds.includes('EntityContainer')
```

## Keywords
OData annotations
