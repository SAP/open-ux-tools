---
"@sap-ux/fiori-mcp-server": patch
---

FIX: Support Cloud Foundry adaptation projects in `read_odata_metadata_adp`. CF projects previously failed because the tool always built an ABAP service provider; it now detects CF projects and lists their OData data sources (with bound UI5 models) from the locally-built manifest, returning empty EDMX metadata since CF has no ABAP backend to proxy the `$metadata` request.
