---
"@sap-ux/fiori-mcp-server": patch
---

FIX: Support Cloud Foundry adaptation projects across the UI automation flow.

- `read_odata_metadata_adp` detects CF projects and lists their OData data sources from the built manifest (empty EDMX, as CF has no ABAP backend to proxy `$metadata`).
- `run_rta_workflow_step` adds a `get_odata_metadata` step that fetches real EDMX through the editor's authenticated session, reuses an authenticated session per project (keyed by `appPath`), waits for interactive login and the editor's `app-loaded` signal before starting RTA, and makes `appPath` a required input for `start`/`restart`/`get_odata_metadata`.
- `open_adaptation_editor` detects CF and allows a longer startup for the embedded approuter.
