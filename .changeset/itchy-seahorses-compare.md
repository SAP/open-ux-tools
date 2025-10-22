---
'@sap-ux/project-access': patch
---

Improve function `refreshSpecificationDistTags` - prevent caching `specification-dist-tags.json` if an error is returned in the JSON from `npm view @sap/ux-specification dist-tags --json`
