---
'@sap-ux/eslint-plugin-fiori-tools': minor
---

chore(eslint-plugin-fiori-tools): migrate to ESM module system

Migrated internal code to ESM (ECMAScript Modules) with NodeNext module resolution. This is a non-breaking change for consumers as the plugin continues to work with ESLint 9.x. The major version bump to 10.x is reserved for ESLint 10 support (see PR #4439).

**Note**: This package follows ESLint's versioning convention where the major version aligns with the supported ESLint major version (currently 9.x).
