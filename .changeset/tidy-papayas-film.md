---
'@sap-ux/launch-config': minor
---

Reverted the use of Node.js `fs` modules and replaced them with `mem-fs` for writing launch config files & Removed `writeApplicationInfoSettings()` from `@sap-ux/launch-config`
Refactoring create launch config functionalities.