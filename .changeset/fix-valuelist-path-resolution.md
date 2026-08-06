---
'@sap-ux/axios-extension': patch
---

Fixed fetchExternalServices() to properly resolve relative paths with '../' navigation in ValueListReferences by using URL API instead of path.posix.join().
