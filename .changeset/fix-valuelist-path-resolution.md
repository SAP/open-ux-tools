---
'@sap-ux/axios-extension': patch
---

FIX: Properly resolve relative paths with '../' navigation in ValueListReferences by using URL API instead of path.posix.join() in fetchExternalServices().
