---
'@sap-ux/eslint-plugin-fiori-tools': patch
---

FIX: Downgrade the @babel/core dependency to 8.0.0-rc.6 to align with the other @babel/* packages. This ensures consistent versioning across all Babel dependencies and resolves a peer dependency mismatch between @babel/eslint-parser and @babel/core.
