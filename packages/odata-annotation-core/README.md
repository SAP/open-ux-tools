# @sap-ux/odata-annotation-core 

## Installation
Npm
`npm install --save @sap-ux/odata-annotation-core`

Yarn
`yarn add @sap-ux/odata-annotation-core `

Pnpm
`pnpm add @sap-ux/odata-annotation-core `

## Usage

```Typescript
import {
  parseIdentifier,
  toFullyQualifiedName,
} from "@sap-ux/odata-annotation-core";

const identifier = parseIdentifier("UI.LineItem");
const fullyQualifiedName = toFullyQualifiedName(
  {
    UI: "com.sap.vocabularies.UI.v1",
    "com.sap.vocabularies.UI.v1": "com.sap.vocabularies.UI.v1",
  },
  "Namespace1",
  identifier
); // com.sap.vocabularies.UI.v1.LineItem

```


```Typescript
import {
  parsePath,
  toFullyQualifiedPath,
} from "@sap-ux/odata-annotation-core";

const parsedPath = parsePath("MyAlias.MyType/@UI.LineItem#abc");
const fullyQualifiedName = toFullyQualifiedPath(
  {
    UI: "com.sap.vocabularies.UI.v1",
    "com.sap.vocabularies.UI.v1": "com.sap.vocabularies.UI.v1",
    MyAlias: "MyNamespace",
    MyNamespace: "MyNamespace"
  },
  "Namespace1",
  parsedPath
); // MyNamespace.MyType/@com.sap.vocabularies.UI.v1.LineItem

```

## Keywords
OData annotations
