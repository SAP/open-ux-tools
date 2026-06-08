---
"@sap-ux/preview-middleware": patch
---

fix: restore LocalStorageConnector for non-ADP projects

PR #4122 removed LocalStorageConnector globally but it should only be omitted for adaptation projects (ADP). Non-ADP Fiori projects still need the connector for local variant storage on CUSTOMER/USER layers.
