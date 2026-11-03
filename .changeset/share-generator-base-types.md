---
"@sap-ux/fiori-generator-shared": minor
"@sap-ux/fiori-app-sub-generator": major
"@sap-ux/fiori-migration-writer": minor
---

FIX: add `ApiHubType`, `ApiHubConfig`, `BaseProject` and `BaseService` to `@sap-ux/fiori-generator-shared` and use them in `@sap-ux/fiori-app-sub-generator` and `@sap-ux/fiori-migration-writer` instead of duplicated definitions. `ApiHubType` and `ApiHubConfig` are no longer exported from `@sap-ux/fiori-app-sub-generator`, and its unused `Credentials`, `PackageJson` and `Script` types are removed
