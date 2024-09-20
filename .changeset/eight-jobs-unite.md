---
'@sap-ux/fe-fpm-writer': patch
---

Added property `allowAutoAddDependencyLib` to the building block API. This property allows turning off the automatic addition of the 'sap.fe.macros' library to the 'manifest.json' file under library dependencies (`"sap.ui5"/"dependencies"/"libs"`). The default value is `true`.
