---
"@sap-ux/project-access": patch
"@sap-ux/eslint-plugin-fiori-tools": patch
"sap-ux-sap-systems-ext": patch
"@sap-ux/fiori-mcp-server": patch
---

FIX: findCapProjectRoot now correctly starts search at the given path instead of its parent, so passing a CAP root directly returns it as expected
