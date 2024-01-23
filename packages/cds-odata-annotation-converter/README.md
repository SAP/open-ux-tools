# CDS OData Annotation Converter

## Installation
Npm
`npm install --save @sap-ux/cds-odata-annotation-converter`

Yarn
`yarn add @sap-ux/cds-odata-annotation-converter `

Pnpm
`pnpm add @sap-ux/cds-odata-annotation-converter `

## Usage

Convert CDS annotationAstNodes collected from annotationAssignments in `BlitzIndex`  to annotation document.

```Typescript
import { toAnnotationFile  } from '@sap-ux/cds-odata-annotation-converter';

// convert to annotation document format
toAnnotationFile = (
    vocabularyService: VocabularyService,
    cdsAnnotationFile: CdsAnnotationFile,
    metadataCollector: MetadataCollector,
    position?: Position,
    propagationMap?: {
        [sourceTargetName: string]: {
            [propagatedTargetName: string]: boolean;
        };
    }
): { file: AnnotationFile; pointer?: PositionPointer; nodeRange?: Range; diagnostics?: Diagnostic[] } 
```


Convert ast (XsnCompileModel) defined to a `Map<string, MetadataCollectorEntry>`.

```Typescript
toMetadata = (ast: XsnCompileModel, serviceName?: string): Map<string, MetadataCollectorEntry> 
```

## Keywords
OData annotations
