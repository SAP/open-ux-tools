# `@sap-ux/mockserver-data-generator-cap`

Opt-in CAP Node.js development plugin for `@sap-ux/mockserver-data-generator`. It seeds only empty persistence entities after CAP emits its awaited `served` event. Existing rows are never deleted, replaced, or updated; their key values remain available when generating missing dependent entities.

The package is separate from the Fiori mockserver provider. Installing `@sap-ux/mockserver-data-generator` alone has no CAP runtime side effect.

The supported CAP Node.js range is 9.8 through 10.x on Node.js 22 or newer. The package's real SQLite integration suite runs against CAP 10; the packed-package consumer smoke is also validated against CAP 9.9 before preview publication.

## Configure

Install this package as a development dependency in a CAP Node.js project and opt in through a development or test profile:

~~~json
{
  "devDependencies": {
    "@sap-ux/mockserver-data-generator-cap": "0.0.0"
  },
  "cds": {
    "mockserverDataGenerator": {
      "[development]": {
        "enabled": true,
        "rowsPerEntity": 10,
        "seed": 42,
        "mode": "auto",
        "sftTimeoutMs": 30000,
        "generatedDataCache": true
      }
    }
  }
}
~~~

Both the explicit `enabled: true` setting and an active `development` or `test` profile are required. A production profile is always a no-op.

For the optional learned tier, also provide `modelManifestPath`, optionally `modelCacheDirectory`, and `modelOffline`. `sftTimeoutMs` bounds each entity-level SFT inference and defaults to 30 seconds. Model weights remain outside npm and are verified through the shared generator model-cache contract. Model acquisition or inference failure degrades to deterministic generation; a database failure rolls the transaction back and does not prevent CAP startup.

Generated-data caching is enabled by default and uses the shared SAP tools user cache with its enforced 32 MiB quota. Set `generatedDataCacheDirectory` to use an explicit cache directory, or set `generatedDataCache` to `false` to disable it. A verified cache hit is validated against the current persistence schema and existing rows before use, and it does not initialize the classifier or SFT sessions. When every persistence entity already contains data, the plugin skips generation, cache access, and learned-runtime initialization entirely.

## Verify the npm boundary

Repository contributors can build the package and run `pnpm check:package`
from this directory. The shared package checker inspects the exact CAP
adapter tarball, rejects learned/development artifacts and unsafe archive
members, enforces the five-MiB compressed-size ceiling, and guards import of
the packed public API and `cds-plugin.js` against standard Node.js network
entry points.
