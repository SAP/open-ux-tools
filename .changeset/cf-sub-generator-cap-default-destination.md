---
"@sap-ux/cf-deploy-config-sub-generator": patch
"@sap-ux/cf-deploy-config-writer": patch
---

fix(cf-deploy-config-sub-generator): always show default destination option for CAP projects

Removes the `mtaDestinations.length` guard so the default instance-based destination
choice is always included in the CF destination dropdown for CAP projects, regardless
of whether any MTA destinations are exposed.
