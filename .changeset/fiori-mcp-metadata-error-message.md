---
"@sap-ux/fiori-mcp-server": patch
---

FIX: Report accurate metadata fetch/parse errors instead of misleading "not a valid OData V4 service". A temporarily unavailable system (e.g. an HTML error page returned with a 2xx status) is now reported as a fetch/availability problem, and parse failures are described in an OData-version-neutral way rather than wrongly blaming an OData V2 service for not being V4.
