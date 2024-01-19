# `@sap-ux/i18n`

Package containing low level APIs and utility functions for working with i18n of a project. For more convenient high level APIs on i18n, check [`@sap-ux/project-access`](../project-access/src/i18n/index.ts)


## Installation
Npm
`npm install --save @sap-ux/i18n`

Yarn
`yarn add @sap-ux/i18n`

Pnpm
`pnpm add @sap-ux/i18n`

## Usage
* Read i18n bundle from CAP project [`getCapI18nBundle`](./test/unit/read/cap/bundle.test.ts)
* Read i18n properties file of a project: [`getPropertiesI18nBundle`](./test/unit/read/properties/bundle.test.ts)
* Write to i18n file of a CAP project: [`createCapI18nEntry`](./test/unit/write/cap/create.test.ts)
* Write to i18n properties file of a project: [`createPropertiesI18nEntry`](./test/unit/write/properties/create.test.ts)

For more available APIs, check in [`/src/index`](./src/index.ts)


## Keywords
i18n
CAP i18n
UI5 i18n
