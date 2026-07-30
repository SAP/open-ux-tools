---
'@sap-ux/eslint-plugin-fiori-tools': patch
---

The bump to 8.0.1 in #4956 caused the esbuild step to fail silently — @babel/core@8.0.1 pulls in @babel/parser@8.0.4 (via its ^8.0.0 peer range) which broke the patchBabelEslintParser plugin, so the published 10.7.14 lib/index.js is raw tsc output rather than a bundle. Consumers hit ERR_MODULE_NOT_FOUND for @babel/eslint-parser at runtime.
