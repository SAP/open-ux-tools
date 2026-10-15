---
"@sap-ux/fiori-migration-writer": patch
---

FIX: Load the project folder into mem-fs at migration start so existence checks see untracked files on disk and are not silently overwritten; unify the existence check and simplify readJSON
