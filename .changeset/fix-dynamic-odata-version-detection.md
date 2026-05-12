---
"@sap-ux/odata-service-writer": minor
"@sap-ux/odata-service-inquirer": minor
---

fix(odata-service-writer, odata-service-inquirer): dynamically detect OData version 4.01 from service metadata

Previously, `odataVersion: "4.01"` was written into manifest.json for all OData V4 apps when minUI5Version >= 1.144, regardless of whether the backend service actually supported OData 4.01. This caused cache buster token generation failures in ABAP appIndex and deployment issues in WorkZone.

- Adds `OdataVersion.v401 = '4.01'` to the `OdataVersion` enum in `odata-service-writer`
- Fixes `parseOdataVersion` in `odata-service-inquirer` to correctly detect `4.01` from the metadata document version attribute instead of truncating via `Number.parseInt`
- Updates `manifest.ts` to write `odataVersion: "4.01"` only when the service metadata declares 4.01 **and** minUI5Version >= 1.144; plain OData V4 services always write `"4.0"`
