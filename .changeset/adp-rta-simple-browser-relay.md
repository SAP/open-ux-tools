---
"@sap-ux/preview-middleware": patch
"@sap-ux/fiori-mcp-server": patch
---

FEAT: Opt-in, session-owned HTTP relay for the ADP RTA workflow in BAS Simple Browser, without a server-side browser.

Enable with `SAP_FIORI_MCP_ADP_TOOLS=true`. The relay transport is selected automatically in BAS (`isAppStudio()`); set `SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN=true` to exercise it locally. Playwright remains the transport for local and Cloud Foundry automation, so both coexist.

- `@sap-ux/preview-middleware` owns the opt-in `/adp/api/rta/*` routes, relay state, and injected browser client, registered and injected only for adaptation previews whose editor child was given a valid 64-hex-character token privately by MCP; ordinary ADP previews and non-ADP previews are unchanged, so ADP tooling stays independent of the optional MCP automation. Requests authenticate with the `X-Relay-Token` header. The relay allows at most one pending/in-flight command and one owning browser document (`clientId`), rejecting conflicting polls, wrong-owner results, and duplicate completions; edits are never automatically replayed. `__reload__`/`__ready__` coordinate a fresh document, and `startRTA` adopts the editor's developer-mode UI adaptation instead of failing on a key-user permission error.
- An authenticated same-origin `__fetch__` command lets `get_odata_metadata` fetch EDMX through the editor page's browser context, so it works over the relay for Cloud Foundry adaptation projects in BAS.
- The client keeps polling when a result submission fails (the failed POST is logged, and a `__reload__` still reloads the page), and targets the current window only when running inside a frame — in the top document a missing editor frame throws a clear "frame not found" error instead of silently targeting the parent. The client script is read once at module load and served without per-request file-system access.
- `@sap-ux/fiori-mcp-server` retries transient `startRTA` key-user permission failures over the relay without reloading or replaying edits, directs the generic modification workflow to the dedicated adaptation tools when it detects an adaptation project, and `read_odata_metadata_adp` connects in BAS by resolving the ADP target via the shared `getAdpConfig` reader (passing the full `AbapTarget` including the BAS destination) and supports the preview-middleware config in addition to `fiori-tools-preview`.
