# @sap-ux/ui5-info

Gets UI5 version info for available UI5 versions.

## Installation
Npm
`npm install --save @sap-ux/ui5-library-writer`

Yarn
`yarn add @sap-ux/ui5-library-writer`

Pnpm
`pnpm add @sap-ux/ui5-library-writer`


## Usage

```javascript
import { getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';

const filterOptions: UI5VersionFilterOptions = {
    useCache: true,
    removeDuplicateVersions: true,
    groupUI5Versions: true
};
const ui5Versions = await getUI5Versions(filterOptions);
```

See TypeScript doc for a full description of possible value for [`UI5VersionFilterOptions`](./src/types.ts)

## Keywords
SAP
UI5
