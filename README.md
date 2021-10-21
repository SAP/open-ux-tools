
# @sap-ux/open-ux-tools-root

[![REUSE status](https://api.reuse.software/badge/github.com/SAP/open-ux-tools)](https://api.reuse.software/info/github.com/SAP/open-ux-tools)

Open UX Tools is a set of tools and libraries that makes it faster and easier to develop SAP Fiori applications.

## Setup

### Install `pnpm` globally

To install `pnpm` globally using `npm`, run the following:
```shell
npm install -g pnpm
```

More information on pnpm installation options can be found [here](https://pnpm.io/installation).
### Install dependencies
To install `dependencies` and `devDependencies` run following command at root of the repo:

```shell
pnpm install
```
### Build packages

To transpile the packages, run the following command at the root of the repo or in the individual package:

```shell
pnpm build
```

### Format sources using `prettier`

To format sources, run the following command at the root of the repo or in the individual package:

```shell
pnpm format
```

### Run linting of sources using `eslint`

To run linting of sources, run the following command at the root of the repo or in the individual package:

```shell
pnpm lint
```

To fix linting errors that can fixed automatically, run the following command at the root of the repo or in the individual package:

```shell
pnpm lint:fix
```

### Run unit tests in packages

To run unit test using `jest`, run the following command at the root of the repo or in the individual package:

```shell
pnpm test
```

### Create changesets for feature or bug fix branches

A [changeset](https://github.com/atlassian/changesets) workflow has been setup to version and publish packages to npmjs.com. To create changesets in a feature or bug fix branch, run one of the following commands:

```shell
pnpm cset
```

```shell
pnpm changeset
```

This command brings up an [inquirer.js](https://github.com/SBoudrias/Inquirer.js/) style command line interface with prompts to capture changed packages, bump versions (patch, minor or major) and a message to be included in the changelog files. The changeset configuration files in the `.changeset` folder at the root need to be committed and pushed to the branch. These files will be used in the GitHub Actions workflow to bump versions and publish the packages.

The general recommendation is to run this changeset command after a feature or bug fix is completed and before creating a pull request. 

A GitHub bot [changeset-bot](https://github.com/apps/changeset-bot) has been enabled that adds a comment to pull requests with changeset information from the branch and includes a warning when no changesets are found.

### Publish to npmjs.com

Publishing packages to npmjs.com is done on every merge commit made to the main branch. This is done in two steps in the GitHub Actions workflow:

1. The version job bump versions of all packages for which changes are detected in the changeset configuration files and also update changelog files. This job is run when a pull request branch is merged to the main branch and basically runs `changeset version` and commits and pushes the changes made to the `package.json`, changelog and pnpm lock files.

2. The release job is setup to run after the version merge commit has been pushed to the main branch in the version job. This job publishes the changed packages to npmjs.com

### Licensing

Copyright (2021) SAP SE and `open-ux-tools` contributors. Please see our [LICENSE](./LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available via the [REUSE tool](https://api.reuse.software/info/github.com/SAP/open-ux-tools).
