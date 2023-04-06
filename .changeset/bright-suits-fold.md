---
'@sap-ux/project-access': minor
---

Updated API of search function `findAllApps()`. It now takes a 2nd argument to
include UI5 library projects in the returned Fiori app list.

E.g.
```typescript
const appsAndLibraries = findAllApps(wsFolders, true);
```

The update is backward compatible since the 2nd argument is optional and default value should return same list as previous versions.
