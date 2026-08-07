---
"@sap-ux/preview-middleware": minor
---

feat: support FLP Sandbox 2.0 for UI5 1.150+

The preview middleware now uses the new FLP Sandbox 2.0 automatically when the project targets UI5 1.150 or higher (including legacy-free builds). UI Adaptation, the card generator, and all other preview features work as before. Set `flp.useNewSandbox: false` in `ui5.yaml` to keep using the previous sandbox if needed.
