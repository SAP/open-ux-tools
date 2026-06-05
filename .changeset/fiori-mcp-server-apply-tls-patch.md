---
"@sap-ux/fiori-mcp-server": patch
---

fix(fiori-mcp-server): apply TlsPatch in fetch-service-metadata flow

The `fetch-service-metadata` functionality instantiates `AbapServiceProvider`
directly (bypassing `createForAbap`), so the TLS patch installed by the axios
factory was never applied. Mirror the `factory.ts` pattern by calling
`TlsPatch.isPatchRequired(baseURL)` / `TlsPatch.apply()` before constructing
the provider, so requests to SAP corporate hosts (`*.sap.corp`, `*.net.sap`)
succeed without requiring `node -r @sap/patchtls` at the host process level.
