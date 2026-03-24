---
'@sap-ux/cf-deploy-config-writer': patch
---

refactor: group cfConfig mutations in appendAppRouter to end of function

Resolved destination name upfront before any side-effects, then moved all
four cfConfig mutations (destinationName, destinationAuthentication,
cloudServiceName, addAppFrontendRouter) to a single grouped block after MTA
state is finalised. Eliminates the scattered mid-function mutation pattern
that made the final config state hard to trace. Logic is unchanged.
