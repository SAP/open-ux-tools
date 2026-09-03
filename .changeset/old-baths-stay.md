---
'@sap-ux/deploy-config-sub-generator': patch
'@sap-ux/fiori-app-sub-generator': patch
---

FIX: Replace this.env.error() with throw to support newer Yeoman versions that no longer expose env.error
