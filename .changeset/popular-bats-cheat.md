---
'@sap-ux/project-access': patch
'@sap-ux/create': patch
---

**Fix**: Resolved an issue where running `npm install` after executing a create command would fail on Windows. This fix ensures that the installation process completes successfully across all platforms.
