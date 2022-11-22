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
    checkBASDestinations,
    checkBASDestination, 
    checkEndpoints,
    checkEndpoint,
} from '@sap-ux/environment-check';

/**
 * Returns the environment, including ide, versions, extensions ...
 */
const environmentResults = await getEnvironment();

/**
 * Checks the destinations and returns a list
 */
const destinationResults = await checkBASDestinations();

/**
 * Check a BAS destination for v2 & v4 catalog service 
 */
const destResult = await checkBASDestination(destination, username, password);

/**
 * Checks the stored SAP Systems (or destinations on BAS) and returns a list
 */
const endpointResults = await checkEndpoints();

/**
 * Check the stored SAP System (or destination on BAS) for v2 & v4 catalog service and other services 
 */
const endpointResult = await checkEndpoint(destination, username, password);

```

## CLI

A CLI application is also available to investigate the environment and destinations.

## Usage

```
$ envcheck --help

Usage 
    $ envcheck --destination <DESTINATION> --output <OUTPUT> <WORKSPACE_ROOT>

Options
    --destination       destination or stored SAP system to perform deep check, multiple destinations can be passed
    --output            json | markdown | verbose | zip format for output, if not specified all messages   except 'info' are shown

    <WORKSPACE_ROOT*>   path the root folder of a workspace. Multiple roots can be defined. We search for apps with destinations in workspaces
```
## Keywords
SAP Fiori Tools
