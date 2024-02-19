# `@sap-ux/i18n`

Package containing low level APIs and utility functions for working with i18n of a project. For more convenient high level APIs on i18n, check [`@sap-ux/project-access`](../project-access)


## Installation
Npm
`npm install --save @sap-ux/i18n`

Yarn
`yarn add @sap-ux/i18n`

Pnpm
`pnpm add @sap-ux/i18n`

## Usage

### Read i18n bundle from a CAP project

```typescript
import { getCapI18nBundle } from '@sap-ux/i18n';
import { join } from 'path';

/**
 * Sample CDS environment
 **/
const env = Object.freeze({
    i18n: {
        folders: ['_i18n', 'i18n', 'assets/i18n'],
        default_language: 'en'
    }
});
const PROJECT_ROOT = 'absolute/path/to/project';
const filePaths = [join(PROJECT_ROOT, 'srv', 'service.cds')];
const bundle = await getCapI18nBundle(PROJECT_ROOT, env, filePaths);
```
For detailed example usage check unit test of [`getCapI18nBundle`](./test/unit/read/cap/bundle.test.ts)


### Read i18n properties file of a project

```typescript
import { getPropertiesI18nBundle } from '@sap-ux/i18n';
import { join } from 'path';

const PROJECT_ROOT = 'absolute/path/to/project';
const i18nFilePath = join(PROJECT_ROOT, 'webapp', 'i18n', 'i18n.properties');
const bundle = await getPropertiesI18nBundle(i18nFilePath);

```
For detailed example usage check unit test of [`getPropertiesI18nBundle`](./test/unit/read/properties/bundle.test.ts)

### Write to i18n file of a CAP project

```typescript
import { createCapI18nEntries } from '@sap-ux/i18n';
import { join } from 'path';

const newEntries = [
    {
        key: 'NewKey',
        value: 'New Value'
    }
];
/**
 * Sample CDS environment
 **/
const env = Object.freeze({
    i18n: {
        folders: ['_i18n', 'i18n', 'assets/i18n'],
        default_language: 'en'
    }
});
const PROJECT_ROOT = 'absolute/path/to/project';
const cdsFilePath = join(PROJECT_ROOT, 'src', 'service.cds')
const result = await createCapI18nEntries(PROJECT_ROOT, cdsFilePath, newEntries, env);
```
For detailed example usage check unit test of [`createCapI18nEntries`](./test/unit/write/cap/create.test.ts)

### Write to i18n properties file of a project

```typescript
import { createPropertiesI18nEntries } from '@sap-ux/i18n';
import { join } from 'path';

const newEntries = [
    {
        key: 'NewKey',
        value: 'New Value'
    }
];
const PROJECT_ROOT = 'absolute/path/to/project';
const i18nFilePath = join(PROJECT_ROOT, 'webapp', 'i18n', 'i18n.properties');

const result = await createPropertiesI18nEntries(i18nFilePath, newEntries, PROJECT_ROOT);
```
For detailed example usage check unit test of [`createPropertiesI18nEntries`](./test/unit/write/properties/create.test.ts)


For more available APIs, check in [`/src/index`](./src/index.ts)


## Keywords
i18n
CAP i18n
UI5 i18n
