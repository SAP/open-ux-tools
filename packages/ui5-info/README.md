[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/ui5-info/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/ui5-info)

# [`@sap-ux/ui5-info`](https://github.com/SAP/open-ux-tools/tree/main/packages/ui5-info)

Gets UI5 version info for available UI5 versions.

## Installation
Npm
`npm install --save @sap-ux/ui5-info`

Yarn
`yarn add @sap-ux/ui5-info`

Pnpm
`pnpm add @sap-ux/ui5-info`


## Usage

```javascript
import { getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';

const filterOptions: UI5VersionFilterOptions = {
    minSupportedUI5Version: '1.84.0',
    includeMaintained: true
};
const ui5Versions = await getUI5Versions(filterOptions);
/**
   ui5Versions :
  [
    {
        "version": "1.119.0",
        "maintained": true,
    },
    {
        "version": "1.117.0",
         "maintained": false,
    },
    {
        "version": "1.114.0",
         "maintained": true,
    },
    {
        "version": "1.108.0",
         "maintained": false,
    },
    {
        "version": "1.96.0",
         "maintained": false,
    },
    {
        "version": "1.84.0",
         "maintained": true,
    }
]
 */
```

See TypeScript doc for a full description of possible value for [`UI5VersionFilterOptions`](./src/types.ts)

## Keywords
SAP
UI5