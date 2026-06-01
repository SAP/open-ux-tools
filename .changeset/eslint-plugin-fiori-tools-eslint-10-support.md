---
'@sap-ux/eslint-plugin-fiori-tools': minor
---

fix: support ESLint 10 by upgrading `@babel/eslint-parser` and `@babel/core` to `8.0.0-rc.6` and adding `@babel/parser@8.0.0-rc.6` as a runtime dependency. This avoids `@babel/eslint-parser`'s `createRequire` failing to load `@babel/parser@8` (pure ESM) under pnpm's strict `node_modules` isolation, where `@babel/parser` is otherwise not visible from the consumer's resolution paths.
