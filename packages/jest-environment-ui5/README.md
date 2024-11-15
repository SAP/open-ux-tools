# @sap-ux/jest-environment-ui5

Test environment for Jest for SAPUI5.

The `@sap-ux/jest-environment-ui5` is a custom test environment for Jest that allows to run tests for SAPUI5 applications. 
It is based on the `@ui5/project` to resolve the UI5 dependencies and serve the application sources during the test execution.

Usage of this module is allowed but should be considered experimental, most scenario should work but some might not be supported.
 

## Installation
Npm
`npm install --save @sap-ux/jest-environment-ui5`

Yarn
`yarn add @sap-ux/jest-environment-ui5`

Pnpm
`pnpm add @sap-ux/jest-environment-ui5`

## Configuration
To use `jest` and the `@sap-ux/jest-ui5-environment`, your project needs to leverage the `@ui5/cli` (to resolve UI5 dependencies). 
All those dependencies needs to be added to your project `package.json`

Afterwards, a script executing the tests needs to be added. It can be a simple execution of `jest` or specific parameters can be added. More information at https://jestjs.io/docs/cli.

The `jest` execution is configured in `<root>/jest.config.js`. The example configuration below defines that the `@sap-ux/jest-ui5-environment` as well as how to fine the test files and addition configurations used for coverage reporting. For advanced configurations, please check https://jestjs.io/docs/configuration.

```javascript
module.exports = {
    // use custom test environment
    testEnvironment: "@sap-ux/jest-environment-ui5",

    // test files glob
    testMatch: ["**/webapp/test/**/*(*.)@(spec|test).js"],

    // define coverage
    collectCoverage: true,
    coverageDirectory: "coverage",
    collectCoverageFrom: ["**/webapp/test/**/*.js", "!**/webapp/localService/**", "!**/webapp/test/**"]
};
```

If it doesn't already exist, it is also required to create a `ui5.yaml` to define the application's dependency, so that the `@sap-ux/jest-ui5-environment` can resolve them e.g. if the app only requires `sap.m`, and UI5 version `1.97.1` then it would look like this.

```yaml
specVersion: "2.4"
metadata:
    name: "my-app"
type: application
framework:
    name: SAPUI5
    version: "1.97.1"
    libraries:
        - name: sap.m
```

## Enable reporting
```json
    "devDependencies": {
        "jest-html-reporter": "3"
    }
```

```javascript
module.exports = {
    // ...
    reporters: ["default", ["jest-html-reporter", { outputPath: "reports/jest-result.html" }]]
};
```

#### Update snapshots

Pass `-u` or `--update` to update the snapshot folder. Please use this with care and verify the contents are actually correct.

## Keywords
SAP Fiori Tools