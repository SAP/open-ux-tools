---
'@sap-ux/btp-utils': patch
'@sap-ux/deploy-tooling': patch
---

fix: allow deployment to OnPremise destinations with WebIDEUsage odata_gen

isAbapSystem now returns true for destinations with ProxyType=OnPremise, fixing deployments that failed with a cryptic 'bind' error when WebIDEUsage was set to odata_gen. deploy-tooling also now surfaces an actionable error message if a non-ABAP provider is resolved.
