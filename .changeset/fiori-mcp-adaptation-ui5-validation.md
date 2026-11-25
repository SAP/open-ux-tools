---
"@sap-ux/fiori-mcp-server": patch
---

FIX: Validate the configured SAPUI5 version before opening the adaptation editor, starting or restarting RTA, and reading OData metadata, including internal snapshot versions and the latest-version default for Cloud Foundry projects without a configured version.

Report thrown validation failures as MCP tool errors so clients can display them for tools with output schemas.

Tool descriptions instruct callers to report unsupported versions and stop without suggesting, offering, or performing version changes unless the user explicitly requests them.

Allow these checks to be skipped by setting `SAP_FIORI_MCP_SKIP_UI5_VERSION_VALIDATION=true` in the server environment; validation remains enabled by default.
