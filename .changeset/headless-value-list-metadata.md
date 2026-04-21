---
"@sap-ux/axios-extension": patch
"@sap-ux/fiori-generator-shared": patch
"@sap-ux/fiori-app-sub-generator": patch
---

fix(axios-extension): export EntitySetData type
feat(fiori-generator-shared): add ExternalServiceConfig headless type supporting metadata and entityData as inline values or file paths
feat(fiori-app-sub-generator): resolve external service metadata and entityData file paths in headless generator before passing to writer
