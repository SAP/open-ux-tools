---
'@sap-ux/project-access': patch
---

FIX: `getSpecification` and `getSpecificationPath` methods did not consider `memFs` for reading `minUI5Version` from `manifest.json` and dev dependency from `package.json`. This caused these files to be read from the physical file system instead of the in-memory file system, leading to incorrect version detection and loading wrong specification version.