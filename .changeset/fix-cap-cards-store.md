---
"@sap-ux/preview-middleware": patch
---

Fix /cards/store and /editor/i18n endpoints for CAP projects by using getSourcePath() instead of path.resolve() for webapp path resolution.