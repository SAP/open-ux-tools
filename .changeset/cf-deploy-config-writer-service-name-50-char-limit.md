---
"@sap-ux/cf-deploy-config-writer": patch
---

FIX: Cap generated managed service-names at the Cloud Foundry 50 character limit so long MTA IDs no longer produce service instance names that get silently truncated at deploy time, breaking destination-content ServiceInstanceName references
