---
"@sap-ux/odata-service-inquirer": patch
---

FIX: Guard against null service in validate when useAutoComplete is true; prevents crash when YUI calls validate before any service is selected
