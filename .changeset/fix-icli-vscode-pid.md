---
"@sap-ux/fiori-generator-shared": patch
---

FIX: Prevent isCli() returning true inside VS Code extension host on Windows/Node 24.x by checking VSCODE_PID environment variable
