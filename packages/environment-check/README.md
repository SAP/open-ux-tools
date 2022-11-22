# @sap-ux/environment-check

Environment check for Business Application Studio and Visual Studio Code.

## Installation
Npm
`npm install --save @sap-ux/environment-check`

Yarn
`yarn add @sap-ux/environment-check`

Pnpm
`pnpm add @sap-ux/environment-check`

## Usage

```javascript
import {
    getEnvironment,
    checkEndpoints,
    checkEndpoint,
} from '@sap-ux/environment-check';

/**
 * Returns the environment, including ide, versions, extensions ...
 */
const environmentResults = await getEnvironment();

/**
 * Checks the SAP systems on Business Application Studio or locally saved systems and returns a list
 */
const sapSystemsResult = await checkEndpoints();

/**
 * Check an SAP system for v2 & v4 catalog service and other services 
 */
const sapSystemResult = await checkEndpoint(destination, username, password);

```

## CLI

A CLI application is also available to investigate the environment and destinations.

## Usage

```
$ envcheck --help

Usage 
    $ envcheck --sap-system <SAPSYSTEM> --output <OUTPUT> <WORKSPACE_ROOT>

Options
    --sap-system       SAP system to perform deep check, multiple SAP systems can be passed
    --output            json | markdown | verbose | zip format for output, if not specified all messages   except 'info' are shown

    <WORKSPACE_ROOT*>   path the root folder of a workspace. Multiple roots can be defined. We search for apps with destinations in workspaces
```
## Keywords
SAP Fiori Tools
