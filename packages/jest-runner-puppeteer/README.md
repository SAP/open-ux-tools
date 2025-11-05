[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/jest-runner-puppeteer/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/jest-runner-puppeteer)

# [`@sap-ux/jest-runner-puppeteer`](https://github.com/SAP/open-ux-tools/tree/main/packages/jest-runner-puppeteer)

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