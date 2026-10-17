---
'@sap-ux/ui-components': patch
---

FIX: Prevent the translation input callout from restoring focus to its button when a new i18n entry is created. Restoring focus pulled focus back into the host (e.g. a VS Code webview) and dismissed any host dialog opened in response, such as a QuickPick for selecting the target i18n file.
