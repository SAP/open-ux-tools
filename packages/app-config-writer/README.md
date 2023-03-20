# @sap-ux/app-config-writer

The `@sap-ux/app-config-writer` adds or updates configurations to a SAP Fiori tools project.

## Features

### Smart Links configuration
Smart Link controls can be defined in an application to provide navigation links to other SAP Fiori applications in a standardized way.
To deliver an application with pre-configured targets for the included smart links, the smartlinks configuration enables local preview changes to be applied to the smart links.

## Installation
Npm
`npm install --save @sap-ux/app-config-writer`

Yarn
`yarn add @sap-ux/app-config-writer`

Pnpm
`pnpm add @sap-ux/app-config-writer`

## Usage

### Smart Links configuration

#### Using @sap-ux/create module

- You can easily add a smartlinks configuration by running:
    `npm init @sap-ux add smartlinks-config`

#### Using @sap-ux/app-config-writer
```Typescript
import { generateSmartLinksConfig } from '@sap-ux/app-config-writer';

const myProjectPath = 'path/to/my/project'; // Path to the root of the Fiori app
const target = {
  url: 'https://abc.example', // For BAS, use `destination`
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