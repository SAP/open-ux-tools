---
'@sap-ux/fiori-freestyle-writer': patch
'@sap-ux/fe-fpm-writer': patch
---

fix: generate custom page files in ext/view folder

When creating a custom page application via app-gen in CAP projects, the Main.controller.js and Main.view.xml files are now correctly generated in the webapp/ext/view/ folder instead of webapp/ext/[pageName]/ (e.g., ext/main). This aligns the behavior with Page Map and follows Fiori extension folder structure conventions.

Fixes #26751
