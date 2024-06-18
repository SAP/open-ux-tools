# @sap-ux/fiori-annotation-api

Provides high level design time API for working with OData services in context of SAP Fiori Elements. It uses the same data types for annotations and metadata as SAP Fiori Elements runtime and provides abstraction over service definition languages.

## Installation
Npm   
`npm install --save @sap-ux/fiori-annotation-api`

Yarn   
`yarn add @sap-ux/fiori-annotation-api`

Pnpm   
`pnpm add @sap-ux/fiori-annotation-api`


## Features

- Supports local XML data and SAP CAP CDS projects.
- Read service metadata.
- Read service annotations.
- Change annotations.
- Serialize annotations to XML or SAP CAP CDS.


## Limitations

The following features are not supported:
- Using changes with logical and arithmetic operators: `Apply`, `And`, `Add` etc.

## Usage
See usage in [`test/unit/fiori-service.test.ts`](test/unit/fiori-service.test.ts).

## Keywords
OData Fiori annotations

