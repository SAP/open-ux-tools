---
'@sap-ux-private/preview-middleware-client': patch
'@sap-ux/preview-middleware': patch
---

fix: Fixed various bugs related to Enable Variant Management for Tables quick action. It was unnecessarily disabled in some apps on List Report; changing Object Page table type led to enabling this action again; action is disabled now for custom tables, where it can't be applied.
