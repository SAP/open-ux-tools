---
"@sap-ux/eslint-plugin-fiori-tools": patch
"@sap-ux/fiori-tools-plugin": patch
"sap-ux-sap-systems-ext": patch
---

BUMP: Rebuild / version-sync the bundle consumers for the Yeoman ESM stack upgrade

These packages have no source changes of their own. `@sap-ux/eslint-plugin-fiori-tools`
and `sap-ux-sap-systems-ext` inline their dependency graph into their shipped `dist` at
build time via esbuild, and that graph includes workspace packages released in the main
upgrade (e.g. `@sap-ux/i18n`, `@sap-ux/project-access`, `@sap-ux/fiori-annotation-api`), so
they must be re-released to pick up the new bundled code. `@sap-ux/fiori-tools-plugin` is
version-synced with `@sap-ux/fiori-mcp-server`. All three are enforced by
`pnpm validate:changesets`.
