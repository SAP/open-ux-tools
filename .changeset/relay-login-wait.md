---
"@sap-ux/fiori-mcp-server": patch
---

FEAT: the HTTP relay `start` step now waits across an interactive backend/IdP login. While the Simple Browser is on the login screen the injected client is absent and the relay action times out, so `startRTA` is re-sent until the editor page returns and answers or a login budget (SAP_FIORI_MCP_ADP_RELAY_LOGIN_WAIT_MS, default 120000 ms) elapses — at which point it reports `needsUserAction: backend_login_required` instead of failing. The bounded key-user retry is unchanged.
