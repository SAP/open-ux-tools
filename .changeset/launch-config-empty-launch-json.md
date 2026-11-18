---
"@sap-ux/launch-config": patch
---

FIX: adding a launch configuration no longer fails with `Cannot read properties of undefined (reading 'configurations')` when the existing `.vscode/launch.json` is empty, only contains comments or has no `configurations` array. The missing parts are added and existing content and comments are kept. A `configurations` property that is not an array is reported with a clear error
