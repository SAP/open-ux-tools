---
"@sap-ux/preview-middleware": patch
---

FEAT: Own the opt-in ADP RTA relay routes, state, and injected browser client in preview middleware, without changes to ADP tooling.

Register `/adp/api/rta/*` and inject the client only for adaptation projects with a valid 64-hex-character token supplied privately to the editor child by MCP. The token is generated internally, not configured by users; relay API requests require Bearer authorization. Ordinary ADP previews without a valid token and non-ADP previews remain unchanged.

Allow at most one pending/in-flight command and one owning browser document (`clientId`); reject conflicting polls, wrong-owner results, and duplicate completions instead of delivering a command twice. The client executes UI5 `FrontendActionsAPI` calls in the real page and never automatically replays actions or result submissions. `__reload__` retires the old document, and `__ready__` permits MCP to verify readiness from a fresh document without a mutation. MCP stop signals the launcher to close its owned tab and terminates its owned editor process without waiting for a browser stop sentinel.
