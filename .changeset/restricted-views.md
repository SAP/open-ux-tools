---
"@sap-ux/adp-tooling": patch
"@sap-ux/axios-extension": patch
"@sap-ux/generator-adp": patch
---

FEAT: Handle key-user changes with restricted views when importing them into an adaptation project — strip restrictions that cannot be represented in ADP, load the changes in the CLI (where the list prompt validation does not run) and warn in the terminal when imported changes have restricted views, and log in telemetry whether the user chose to import key-user changes
