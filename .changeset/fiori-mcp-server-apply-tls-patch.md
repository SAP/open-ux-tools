---
"@sap-ux/fiori-mcp-server": patch
"@sap-ux/odata-service-writer": patch
"@sap-ux/generator-odata-downloader": patch
---

Apply TLS patch, fix Zowe keyring loading, format metadata XML, pass real HOME to MCP server

- Apply `TlsPatch` in `fetch-service-metadata` before constructing `AbapServiceProvider` (was bypassed by instantiating directly instead of via `createForAbap`)
- Bundle `@zowe/secrets-for-zowe-sdk` native keyring via an inline shim that loads the platform `.node` binary directly from `dist/prebuilds/`, fixing credential lookup when running from a tgz install
- Use `SAP_TOOLS_DIR || getSapToolsDirectory()` to locate `~/.saptools` independently of `HOME`, so stored SAP systems are found even when the test harness overrides `HOME`
- Format fetched EDMX metadata with `xml-formatter` (4-space indent) before writing `metadata.xml`
- Surface the original XML parse error message when EDMX validation fails
