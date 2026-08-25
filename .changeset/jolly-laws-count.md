---
'@sap-ux/environment-check': patch
---

FIX: `archiveProject` method throws error `Cannot read properties of undefined (reading 'test')` because of incompatible versions of `ignore` package between `@sap-ux/environment-check` and  `glob-gitignore`(expected v5).
