---
'@sap-ux/project-access': patch
---

New public method for `ApplicationAccess`
- `readManifest` - reads and returns the parsed `manifest.json` file for the application.
- `readFlexChanges` - reads and returns all Flex Changes (`*.change` files) associated with the application.
- `readAnnotationFiles` - reads and returns all annotation files associated with the application's main service.
