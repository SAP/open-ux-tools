# @sap-ux/environment-check

Environment check for Business Application Studio destinations.

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
    checkBASDestination
} from '@sap/ux-environment-check';

/**
 * Returns the environment, including ide, versions ...
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

```
## Keywords
SAP Fiori Tools
