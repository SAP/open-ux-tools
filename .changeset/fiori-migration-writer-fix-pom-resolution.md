---
"@sap-ux/fiori-migration-writer": patch
---

FIX: Resolve pom.xml artifactId placeholder when manifest app ID contains ${project.artifactId},
     Prevent overwriting existing mockserver.js during migration when mem-fs editor context is active
     Load the project folder into mem-fs at migration start so existence checks see untracked files on disk and are not silently overwritten; unify the existence check and simplify readJSON