---
"@sap-ux/axios-extension": patch
"@sap-ux/fiori-generator-shared": patch
"@sap-ux/fiori-app-sub-generator": patch
---

feat(axios-extension): add metadataPath support to ValueListService and CodeListService via MetadataSource union type
feat(fiori-generator-shared): expose valueListMetadata in headless generator AppConfig payload
feat(fiori-app-sub-generator): pass through valueListMetadata from headless config to internal service state
