---
'@sap-ux/axios-extension': minor
---

This change implements a new ADT service `FileStoreService`.
`FileStoreService` supports querying the file structure and file content in a deployed Fiori app archive.

Example use case:

```
const fileStoreService = await provider.getAdtService<FileStoreService>(FileStoreService);
// Fetch a list of files and folders in the app's root folder.
const rootFolderContent = await fileStoreService.getAppArchiveContent('folder' 'ZFIORIAPP');
// Fetch a list of files and folders in <root>/webapp
const webappFolderContent = await fileStoreService.getAppArchiveContent('folder' 'ZFIORIAPP', '/webapp');
// Fetch the text content as string from <root>/package.json file. 
const fileContent = await fileStoreService.getAppArchiveContent('file' 'ZFIORIAPP', '/package.json');
```