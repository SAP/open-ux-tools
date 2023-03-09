# @sap-ux/app-config-writer

The `@sap-ux/app-config-writer` adds or removes smartlinks configuration for a SAP UX project. 

## Installation
Npm
`npm install --save @sap-ux/app-config-writer`

Yarn
`yarn add @sap-ux/app-config-writer`

Pnpm
`pnpm add @sap-ux/app-config-writer`

## Usage

```Typescript
import { generateSmartLinksConfig } from '@sap-ux/app-config-writer';

const myProjectPath = 'path/to/my/project'; // Path to the root of the Fiori app
const target = {
  url: 'https://abc.abap.stagingaws.hanavlab.ondemand.com', // For BAS, use `destination`
  client: '100', // Optional client
};
const auth = { username: 'user', password: 'password' }; // Authentication details

const exampleSmartLinksConfig = async () => {
  const fs = await generateSmartLinksConfig(myProjectPath, { target, auth });
  return new Promise((resolve) => {
    fs.commit(resolve);
  });
};

// Calling the function
exampleSmartLinksConfig();
```

See more complex example in [`/test/unit`](./test/unit)

## Keywords
SAP Fiori elements