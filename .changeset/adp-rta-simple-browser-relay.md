---
"@sap-ux/adp-tooling": minor
"@sap-ux/preview-middleware": patch
"@sap-ux/fiori-mcp-server": patch
"@sap-ux/fiori-tools-plugin": patch
---

FEAT: ADP RTA automation via HTTP relay in BAS Simple Browser, with Cloud Foundry support.

Adds an opt-in relay transport so `run_rta_workflow_step` drives the adaptation editor through the Simple Browser instead of Playwright (selected automatically in BAS; set `SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN=true` to use locally). The Playwright transport is unchanged.

- `@sap-ux/preview-middleware`: opt-in `/adp/api/rta/*` routes inject a lightweight browser client into the adaptation editor; token-authenticated, single-owner relay; `__reload__`/`__ready__` coordinate restarts; `__fetch__` proxies OData metadata through the editor's session; UFA navigation actions (`describe_ui`/`execute_page_action`) normalised into the Flex envelope.
- `@sap-ux/fiori-mcp-server`: `httpTransport` dispatches all `run_rta_workflow_step` steps; editor sessions tracked with per-session free port and 64-char relay token; login-wait budget for backend IdP screens; key-user permission retry; CF adaptation projects supported across `open_adaptation_editor`, `read_odata_metadata_adp`, and `get_odata_metadata`.
- `@sap-ux/adp-tooling`: exposes `getMergedManifest`/`downloadAppResources` for CF manifest resolution; CF and ABAP gitignore templates updated.
