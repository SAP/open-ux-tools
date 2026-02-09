---
"@sap-ux/app-config-writer": patch
"@sap-ux/create": patch
"@sap-ux/preview-middleware": patch
---

feat: enable card generator support for CAP projects

- Add default FLP configuration when preview middleware exists but FLP config is missing
- Support path derivation for CAP projects when yaml path contains directory separators
- Use getSourcePath() for correct webapp path resolution in card generator handlers