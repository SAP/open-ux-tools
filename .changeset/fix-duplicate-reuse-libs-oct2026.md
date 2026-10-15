---
"@sap-ux/fiori-migration-writer": patch
---

Fix duplicate reuse library detection in migration view by deduplicating project roots discovered through multiple strategies. Projects with both package.json and pom.xml markers, and libraries with nested manifest.json files, now appear exactly once.
