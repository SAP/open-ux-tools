---
'@sap-ux/app-config-writer': minor
---

FEAT: skip package updates for enableCardGeneratorConfig and add exports map with cards-config subpath

Adds an `exports` field to `@sap-ux/app-config-writer`, which previously only declared `main`. Adding an explicit exports map is a potentially breaking change for any consumer that deep-imports an unlisted path — only the root entry point and the new `cards-config` subpath are exposed. A minor bump is used because no existing documented API is removed, but consumers relying on undocumented internal paths will need to update their imports.
