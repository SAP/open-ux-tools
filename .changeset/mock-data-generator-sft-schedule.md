---
'@sap-ux/mock-data-generator': patch
---

FIX: Keep model values for wide entity sets on slow machines by giving each entity set what remains of the time budget instead of an even share

Add the `sftFieldsPerCall` generation option, which the `data-editor` execution mode sets to three fields per call so each call finishes within the editor's deadline.
