---
"@sap-ux/fiori-migration-writer": patch
---

FIX: Deduplicate project roots to prevent duplicate reuse library detection. Projects with both package.json and pom.xml markers, and libraries with nested manifest.json files, now appear exactly once in migration view.
