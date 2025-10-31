# @sap-ux/app-config-writer

The `@sap-ux/app-config-writer` adds or updates configurations to a SAP Fiori tools project.

## Features

### Smart Links configuration
You can define smart links in an application to provide navigation links to other SAP Fiori applications in a standardized way.
To be able to deliver an application with preconfigured targets for the included smart links, you need to import the available targets from a remote configuration of the SAP Fiori launchpad with the provided `add smart links config` command.
Then you can configure the smart links with the help of the preview mode for developer variant creation.
https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/ceb845a45dd94f4c8bd52f2976f99090.html?q=developer%20variant%20creation&locale=en-US

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

- You can easily add a smart links configuration by running:
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
## Changelog

See the [CHANGELOG.md](https://github.com/SAP/open-ux-tools/blob/main/packages/app-config-writer/CHANGELOG.md) file for details on changes and version history.
## Links

- [GitHub Package](https://github.com/SAP/open-ux-tools/tree/main/packages/app-config-writer)