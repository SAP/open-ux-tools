---
"@sap-ux/adp-tooling": patch
"@sap-ux/preview-middleware": patch
"@sap-ux/fiori-mcp-server": patch
"@sap-ux/fiori-tools-plugin": patch
---

FEAT: Support adaptation editor RTA automation in an external browser tab through an HTTP relay in BAS.

The relay supports CF and ABAP adaptation projects, with automatic opening through the matching Application Modeler launcher or manual opening of the returned editor URL. Login completes in the external tab, and RTA startup waits for editor readiness and outline synchronization. The relay is selected automatically in BAS and can be enabled locally with `SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN=true`; normal desktop workflows continue to use Playwright.

- Authenticate relay requests with a per-session token, track the owning browser document, and confirm a new document is ready after reload. Recover transient connections and lost result acknowledgements without replaying editor actions. Report result serialization failures as acknowledged errors so later actions remain available.
- Bound UI5 action waits and track unresolved execution after timeouts or caller disconnections, blocking further editor actions while allowing shutdown.
- Fetch OData metadata through the authenticated browser with bounded timeouts, sequential service requests, and per-service errors. Preserve file saving for large metadata and return structured errors for results exceeding the configurable transfer limit, which defaults to 10 MiB. Translate the registered local editor origin to its browser origin while rejecting unrelated origins.
- Track editor processes throughout startup and shutdown, including pending launches and owned POSIX process groups after parent exit. Fail startup and attempt cleanup when BAS cannot expose a valid HTTPS editor URL.
- Request browser-tab closure before independently stopping the editor server. Report unconfirmed server termination as an unsuccessful stop and provide manual-close guidance when browser closure is not acknowledged.
- Resolve ABAP adaptation configuration from both `fiori-tools-preview` and `preview-middleware`, preserving the configured destination for merged manifests and base application resources.
