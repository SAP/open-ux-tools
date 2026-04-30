---
'@sap-ux/preview-middleware': patch
'@sap-ux/adp-tooling': patch
---

fix: Prioritize local workspace fragments over deployed versions in adaptation project editor

When previewing an adaptation project connected to an ABAP system, locally created fragments and controllers are now correctly prioritized over their deployed counterparts. The LREP flex data response from the ABAP system includes inlined module content (fragment XMLs, controller JS) which prevented UI5 from requesting local workspace versions. The fix strips these inlined modules from the response so that UI5 falls back to HTTP requests, which the existing ADP proxy serves from the local workspace. Flex changes are left untouched as UI5 deduplicates them natively by fileName.