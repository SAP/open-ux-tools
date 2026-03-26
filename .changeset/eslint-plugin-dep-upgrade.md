---
"@sap-ux/eslint-plugin-fiori-tools": patch
---

fix(eslint-plugin-fiori-tools): upgrade runtime dependencies and fix @eslint/core 1.x compatibility

- Upgrade @babel/core, @eslint/json, @eslint/config-helpers, globals, synckit, yaml, semver, @sap-ux/vocabularies-types
- Cast rules to `Plugin['rules']` for stricter @eslint/core 1.x type definitions

chore(eslint-plugin-fiori-tools): align typescript-eslint peer dependency ^8.46.2 → ^8.57.2
