---
'@sap-ux/fiori-mcp-server': minor
---

feat(fiori-mcp-server): add `importKeyUserChanges` flag to `generate_adaptation_project`. When set, the tool automatically fetches the DEFAULT adaptation's key user changes from LREP (using the same system and credentials supplied for the project) and forwards them to the `@sap-ux/adp` Yeoman generator. Generation aborts if the fetch fails or no DEFAULT adaptation exists.
