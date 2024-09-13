---
'@sap-ux/fe-fpm-writer': patch
---

- During building block creation, add the 'sap.fe.macros' library to the 'manifest.json' if it is not already listed
- The API methods `generateBuildingBlock`, `getSerializedFileContent`, `PromptsAPI.submitAnswers`, and `PromptsAPI.getCodeSnippets` changed from synchronous to asynchronous.
