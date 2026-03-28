---
'@sap-ux/cf-deploy-config-writer': patch
---

refactor: consolidate disk-write template rendering into a single module

Introduced `src/mta-config/template-renderer.ts` with `renderTemplateToDisk()`,
which centralises the `readFileSync` + EJS `render` + `writeFileSync` pattern
that was previously duplicated inline in `createMTA`, `createCAPMTAAppFrontend`,
and `addMtaExtensionConfig`. The hardcoded `__dirname`-relative path in `mta.ts`
is replaced with `getTemplatePath()`, making path resolution consistent across
all template call sites.
