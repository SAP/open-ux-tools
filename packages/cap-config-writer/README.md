# @sap-ux/cap-config-writer

Adds or removes configuration to a SAP CAP projects.

## Installation
Npm
`npm install --save @sap-ux/cap-config-writer`

Yarn
`yarn add @sap-ux/cap-config-writer`

Pnpm
`pnpm add @sap-ux/cap-config-writer`

## Usage
```Typescript
import { enabledCdsUi5Plugin } from '@sap-ux/cap-config-writer';

const fs = await enabledCdsUi5Plugin('path/to/cap-project');

fs.commit();
```

## Keywords
SAP Fiori elements
SAP CAP
SAP UI5
