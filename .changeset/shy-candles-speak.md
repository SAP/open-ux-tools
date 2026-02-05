---
'@sap-ux/project-access': patch
---

Fixed: `getSpecification` fails with `ENOENT: no such file or directory, open '/home/user/.fioritools/specification-dist-tags.json'"` if .fioritools does not exist before the call.
