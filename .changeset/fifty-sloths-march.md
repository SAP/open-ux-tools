---
'@sap-ux-private/preview-middleware-client': patch
'@sap-ux/preview-middleware': patch
---

call syncOutline in the initOutline because the attached event is not triggered for every case(if the app is already loaded before the event is attac
