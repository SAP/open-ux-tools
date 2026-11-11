---
'@sap-ux/fiori-app-sub-generator': minor
'@sap-ux/fiori-generator-shared': minor
'@sap-ux/fiori-migration-writer': minor
---

INFRA: Revert shared base types from fiori-generator-shared

This reverts commit 5e9c94868b38d60d0643ea14e60f44f481138a80 (PR #5374).

The App Gen Project type is specifically designed for App Gen and should not be used outside that module to avoid creating unwanted cross-module dependencies.

Types moved back:
- ApiHubConfig: fiori-generator-shared → fiori-app-sub-generator
- ApiHubType: fiori-generator-shared → fiori-app-sub-generator
- BaseProject: removed from fiori-generator-shared
- BaseService: removed from fiori-generator-shared

fiori-migration-writer now defines its own Project and Service types directly.
