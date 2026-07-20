---
'@sap-ux/project-access': patch
---

FIX: `getSpecification` method did not consider `memFs` for reading `minUI5Version` version from `manifest.json` file. This caused the `minUI5Version` to be read from the physical file system instead of the in-memory file system, leading to incorrect version detection and loading wrong specification version.