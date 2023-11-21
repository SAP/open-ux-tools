#  @sap-ux-private/playwright
The `@sap-ux-private/playwright` is a central package for UI test. It contains [playwright](https://www.npmjs.com/package/playwright) plus some other utility functions.

## Core Principle
Core idea is to create a copy of a project and perform operations on copied project.

## Usage
### Add dependencies
Add `"@sap-ux-private/playwright"` as `devDependencies` to `package.json` file of your module. If you need environment variables from a  `.env` file, you need to add `"dotenv"` too.
Install dependencies.

### Add config file
Add `playwright.config.ts` to root of your module where `package.json` resides and include this file in the `tsconfig.eslint.json` e.g ` "include": [..., "playwright.config.ts"]`.
If you need environment variables from a  `.env` file, add `import 'dotenv/config';` to config file

[See example](https://github.com/SAP/open-ux-tools/blob/main/packages/preview-middleware/playwright.config.ts)

### Add command to script
Add `"test:integration": "playwright test"` to `package.json`. 

**Note:** `"test:integration"` can be any name

### Some important command line options
* `pnpm run test:integration --ui`
* `pnpm run test:integration --headed`
* `pnpm run test:integration --debug`

[Check all possible options](https://playwright.dev/docs/test-cli)


## Known limitation
`startServer` with [Parallelism](https://playwright.dev/docs/test-parallel) options may not give desired result. If you are using `startServer`, disable parallelism by adding `workers: 1` in `playwright.config.ts` file.
