
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
### Licensing

Copyright (2021) SAP SE and `open-ux-tools` contributors. Please see our [LICENSE](./LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available via the [REUSE tool](https://api.reuse.software/info/github.com/SAP/open-ux-tools).
