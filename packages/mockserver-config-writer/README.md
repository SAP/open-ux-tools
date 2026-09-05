[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/mockserver-config-writer/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/mockserver-config-writer)

# [`@sap-ux/mockserver-config-writer`](https://github.com/SAP/open-ux-tools/tree/main/packages/mockserver-config-writer)

Adds or removes configuration for mockserver module `@sap-ux/ui5-middleware-fe-mockserver` to an SAP UX project.

For the standard FE mockserver, the writer also adds the lightweight
`@sap-ux/mockserver-data-generator` development dependency, configures it as an
inactive data provider, and preserves the generated Fiori command behind the
MockGen launcher. It does not add MockGen to the legacy `ui5.dependencies`
list. A caller that selects another mockserver module or skips `package.json`
changes does not receive this automatic wiring.

## Installation
Npm
`npm install --save @sap-ux/mockserver-config-writer`

Yarn
`yarn add @sap-ux/mockserver-config-writer`

Pnpm
`pnpm add @sap-ux/mockserver-config-writer`

## Usage
```Typescript
import { generateMockserverConfig } from '@sap-ux/mockserver-config-writer';
import { join } from 'path';

const basePath = join(__dirname, 'test/fixtures/bare-minimum');
const fs = await generateMockserverConfig(
    basePath,
    {
        webappPath: join(basePath, 'webapp'),
});

fs.commit();
```

The generated application keeps one mockserver script. Run it normally for the
standard mockserver behavior:

```bash
npm run start-mock
```

Append the flag after npm's argument separator to enable MockGen in the same
server process:

```bash
npm run start-mock -- --mockgen
```

The npm package contains only the generator code. Large model weights and the
matching platform runtime are not bundled in it; the production launcher will
download and checksum-verify approved artifacts on the first flagged start and
reuse the local cache on later starts. This automatic artifact acquisition is
still under development for the initial preview.

See more complex example in [`/test/unit`](./test/unit)

## Keywords
SAP Fiori elements
SAP Fiori - UI5 middleware for the Fiori elements mock server
