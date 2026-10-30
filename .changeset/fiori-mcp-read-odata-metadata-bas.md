---
"@sap-ux/fiori-mcp-server": patch
---

FIX: read_odata_metadata_adp now connects in SAP Business Application Studio — resolve the ADP target via the shared getAdpConfig reader so the full AbapTarget (including the BAS destination) is passed through, and support the preview-middleware config in addition to fiori-tools-preview
