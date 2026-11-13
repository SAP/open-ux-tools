---
"@sap-ux/cf-deploy-config-writer": patch
---

FIX: Do not add a second standalone approuter when an `approuter.nodejs` module already exists in mta.yaml (e.g. the `.deploy/app-router` module scaffolded by newer `@sap/cds-dk`)
