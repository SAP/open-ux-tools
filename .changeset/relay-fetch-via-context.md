---
"@sap-ux/preview-middleware": patch
"@sap-ux/fiori-mcp-server": patch
---

FEAT: the RTA relay now supports an authenticated same-origin fetch via a `__fetch__` command, so `get_odata_metadata` works over the HTTP relay (e.g. CF adaptation projects in BAS) by fetching EDMX through the editor page's browser context.
