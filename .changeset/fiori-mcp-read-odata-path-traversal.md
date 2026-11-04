---
"@sap-ux/fiori-mcp-server": patch
---

FIX: sanitize the data source name before using it in path.join so a crafted key cannot write outside the project when saveLocal is true.
