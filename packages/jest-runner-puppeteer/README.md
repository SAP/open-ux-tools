# @sap-ux/jest-runner-puppeteer

Library providing utility functions working with Puppeteer on Chrome and Edge browsers.

## Installation
Npm
`npm install --save @sap-ux/jest-runner-puppeteer`

Yarn
`yarn add @sap-ux/jest-runner-puppeteer`

Pnpm
`pnpm add @sap-ux/jest-runner-puppeteer`

## Usage

- jest-puppeteer-setup
- jest-puppeteer-teardown
- jest-puppeteer-environment
- jest-circus.setup

For use in jest config
```javscrupt
 
 const config = {
    globalSetup: '@sap-ux/jest-runner-puppeteer/dist/jest-puppeteer-setup.js',
    globalTeardown: '@sap-ux/jest-runner-puppeteer/dist/jest-puppeteer-teardown.js',
    testEnvironment: '@sap-ux/jest-runner-puppeteer/dist/jest-puppeteer-environment.js',
    setupFilesAfterEnv: ['expect-puppeteer', '@sap-ux/jest-runner-puppeteer/dist/jest-circus.setup.js'],
 }
 ```