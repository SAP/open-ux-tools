---
"@sap-ux/fiori-mcp-server": patch
---

FIX: Support Cloud Foundry adaptation projects across the UI automation flow.

- `read_odata_metadata_adp`: CF projects previously failed because the tool always built an ABAP service provider; it now detects CF projects and lists their OData data sources (with bound UI5 models) from the locally-built manifest, returning empty EDMX metadata since CF has no ABAP backend to proxy the `$metadata` request.
- `run_rta_workflow_step`: the browser bridge now reuses an authenticated session per backend (in-memory within a process; opt-in cross-restart via `PLAYWRIGHT_SESSION_STATE_PATH`, stored with owner-only permissions), and the `start`/`restart` steps return a structured `{ rtaStarted: false, needsUserAction: 'backend_login_required' }` signal instead of hanging/throwing when the editor URL serves a backend (XSUAA/OAuth2) login page. Session reuse is gated on an observed off-loopback redirect, so non-redirecting (ABAP) projects are unaffected. Adds a `PLAYWRIGHT_HEADLESS` env toggle.
- `open_adaptation_editor`: detects CF via `isCFEnvironment` and allows a longer startup timeout for CF (the embedded approuter is slow to boot). The editor server is started the same way as ABAP without opening a browser (the `start` step opens it); when a CF project has no built `dist/` the tool fails fast with guidance to build first.
