# @sap-ux/cds-annotation-parser

## Installation
Npm
`npm install --save @sap-ux/cds-annotation-parser`

Yarn
`yarn add @sap-ux/cds-annotation-parser`

Pnpm
`pnpm add @sap-ux/cds-annotation-parser`

## Usage
Examples of how to use CDS annotation parsing and abstract syntax tree (AST) node search functions.

```Typescript
import { parse, findAnnotationNode, getAstNodes, getNode } from '@sap-ux/cds-annotation-parser';

const ast = parse(`
  UI.LineItem #table1 : [
    {
      $type: 'UI.DataField',
      value: some.path,
      Label: 'Sample column'
    }  
  ]';
`);

if (ast !== undefined) {
    // Expected pathToLabel: "/value/items/0/properties/2/value"
    const pathToLabel = findAnnotationNode(ast, {
        position: { line: 5, character: 15 },
        includeDelimiterCharacters: true
    });
    
    // An array of nodes matching each segment of the path.
    const nodes = getAstNodes(ast, pathToLabel);
    const serializedNodes = nodes.map((n) =>
        Array.isArray(n) ? '<array of child elements>' : typeof n === 'object' ? `Node of type '${n.type}'` : n
    );
    /* Expected serializedNodes:
    [
        "Node of type 'collection'",
        "<array of child elements>",
        "Node of type 'record'",
        "<array of child elements>",
        "Node of type 'record-property'",
        "Node of type 'string'",
    ]
    */

    const termNode = getNode(ast, '/term');
    if (termNode.type === 'path') {
        // expected termName: "UI.LineItem"
        const termName = termNode.value;
    }

    const qualifierNode = getNode(ast, '/qualifier');
    if (qualifierNode.type === 'qualifier') {
        // expected qualifier: "table1"
        const qualifier = qualifierNode.value;
    }

    const propertyValueNode = getNode(ast, '/value/items/0/properties/1/value');
    if (propertyValueNode.type === 'path') {
        // expected value: "some.path"
        const value = propertyValueNode.value;
    }
}

```

## Keywords
OData annotations CAP CDS