---
"@sap-ux/fiori-mcp-server": patch
---

fix: bundle odata-annotation-core, odata-annotation-core-types and text-document-utils instead of marking them as external

These packages have no bundling obstacles and should be inlined into the dist rather than left as unresolved external imports that cause `ERR_MODULE_NOT_FOUND` when the server is run via npx.
