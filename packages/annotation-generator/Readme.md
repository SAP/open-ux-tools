# Fiori Annotation Generator API

Reads annotations for a service in a SAP Fiori Elements project with local metadata. Allows generation of annotations for generation of new Fiori Elements apps.

## Installation
Npm   
`npm install --save @sap-ux/annotation-generator`

Yarn   
`yarn add @sap-ux/annotation-generator`

Pnpm   
`pnpm add @sap-ux/annotation-generator`

## Usage

Annotation generation example with SAP CAP CDS project:

```typescript
import { join } from 'path';
import { create as createStore } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';

import { getProject } from '@sap-ux/project-access';

import type { AnnotationServiceParameters, GenerateAnnotationsOptions } from '@sap-ux/annotation-generator';
import { generateAnnotations} from '@sap-ux/annotation-generator';

const project = await getProject(projectRootFolder);
const fs = createEditor(createStore());

const appName = 'app/project1';
const serviceParameters: AnnotationServiceParameters = {
    project,
    serviceName: 'MainService',
    appName
};

const options: GenerateAnnotationsOptions = {
    entitySetName: 'Capex',
    annotationFilePath: join(appName, 'annotations.cds'),
    addValueHelps: true,
    addFacets: true,
    addLineItems: true
};
await generateAnnotations(fs, serviceParameters, options);
```

Annotation generation example with standalone UI project and OData backend:

```typescript
import { join } from 'path';
import { create as createStore } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';

import { getProject } from '@sap-ux/project-access';

import type { AnnotationServiceParameters, GenerateAnnotationsOptions } from '@sap-ux/annotation-generator';
import { generateAnnotations} from '@sap-ux/annotation-generator';

const project = await getProject(projectRootFolder);
const fs = createEditor(createStore());

const serviceParameters: AnnotationServiceParameters = {
    project,
    serviceName: 'mainService',
};

const options: GenerateAnnotationsOptions = {
    entitySetName: 'Individual',
    annotationFilePath: join('webapp', 'annotations', 'annotation.xml'),
    addValueHelps: true,
    addFacets: true,
    addLineItems: true
};
await generateAnnotations(fs, serviceParameters, options);
```


## Keywords
OData annotations, app generation
