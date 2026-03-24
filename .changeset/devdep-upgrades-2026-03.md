---
"@sap-ux/project-integrity": patch
"@sap-ux-private/playwright": patch
---

fix: update devDependencies and fix @types/node 20.x compatibility

- Upgrade devDependencies across the monorepo (eslint plugins, jest, typescript-eslint, sass, adm-zip, @types/*, ui5-tooling, and more)
- Fix ReadStream data event handler in project-integrity for @types/node 20.x (chunk type widened to `string | Buffer`)
- Fix invalid @param JSDoc tags in playwright types
