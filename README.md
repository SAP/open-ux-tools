# @sap/open-ux-tools-root

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

## Containing files

1. The LICENSE file:
In the most cases, the license of SAP's projects is `Apache 2.0`.

2. The .reuse/dep5 file: 
The [Reuse Tool](https://reuse.software/) must be used for your open source project. You can find the .reuse/dep5 in the project initial. Please replace the parts inside the single angle quotation marks < > by the specific information for your repository.
