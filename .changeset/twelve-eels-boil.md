---
'@sap-ux/axios-extension': major
---

Added a new AdtService class: ListPackageService. It provides API function 
`listPackages({maxResult: number, phrase: string})` which returns all existing package names that
has prefix matching input parameter `phrase`.

```javascript
const listPackageService = await provider.getAdtService<ListPackageService>(ListPackageService);
const packages = await listPackageService.listPackages({maxResult: 50, phrase: 'Z_'});
```