---
"@sap-ux/repo-app-import-sub-generator": patch
---

FIX: Support app download on older ABAP systems — retry app list fetch without sap.app/sourceTemplate/id for both flows, and fall back to ADT FileStoreService when ABAP_REPOSITORY_SRV is unavailable
