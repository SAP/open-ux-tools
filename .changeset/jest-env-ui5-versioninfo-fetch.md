---
'@sap-ux/jest-environment-ui5': patch
---

Return a well-formed fetch response so UI5 2.0 VersionInfo.load() works. The mock fetch now provides `ok`/`status` and a `json()` method and synthesizes `sap-ui-version.json` (generated at serve time, not on disk), which previously made Core bootstrap throw "status code undefined" and crash every suite on UI5 2.0 projects. Also restores `hasher`/`signals` in the isV2 shim map so they load in the UI5 loader context.
