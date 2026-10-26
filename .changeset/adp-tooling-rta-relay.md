---
"@sap-ux/preview-middleware": patch
---

FIX: Keep ADP tooling independent of optional MCP automation. Register the authenticated RTA relay in preview middleware only when an editor child receives a session token; ordinary adaptation previews remain unchanged.
