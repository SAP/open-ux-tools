---
"@sap-ux/abap-deploy-config-sub-generator": patch
"@sap-ux/abap-deploy-config-writer": patch
"@sap-ux/adp-flp-config-sub-generator": patch
"@sap-ux/adp-tooling": patch
"@sap-ux/annotation-generator": patch
"@sap-ux/app-config-writer": patch
"@sap-ux/cap-config-writer": patch
"@sap-ux/cf-deploy-config-sub-generator": patch
"@sap-ux/cf-deploy-config-writer": patch
"@sap-ux/create": patch
"@sap-ux/deploy-config-generator-shared": patch
"@sap-ux/deploy-config-sub-generator": patch
"@sap-ux/fe-fpm-writer": patch
"@sap-ux/fiori-annotation-api": patch
"@sap-ux/fiori-app-sub-generator": patch
"@sap-ux/fiori-elements-writer": patch
"@sap-ux/fiori-freestyle-writer": patch
"@sap-ux/fiori-generator-shared": patch
"@sap-ux/fiori-mcp-server": patch
"@sap-ux/fiori-migration-writer": patch
"@sap-ux/fiori-tools-settings": patch
"@sap-ux/flp-config-sub-generator": patch
"@sap-ux/generator-adp": patch
"@sap-ux/generator-odata-downloader": patch
"@sap-ux/i18n": patch
"@sap-ux/launch-config": patch
"@sap-ux/mockserver-config-writer": patch
"@sap-ux/odata-service-writer": patch
"@sap-ux/preview-middleware": patch
"@sap-ux/project-access": patch
"@sap-ux/repo-app-import-sub-generator": patch
"@sap-ux/ui-service-inquirer": patch
"@sap-ux/ui-service-sub-generator": patch
"@sap-ux/ui5-application-writer": patch
"@sap-ux/ui5-library-reference-sub-generator": patch
"@sap-ux/ui5-library-reference-writer": patch
"@sap-ux/ui5-library-sub-generator": patch
"@sap-ux/ui5-library-writer": patch
"@sap-ux/ui5-test-writer": patch
---

FEAT: Upgrade the Yeoman stack to the v8/v6 ESM line (yeoman-generator 5→8, yeoman-environment 3→6), with the mem-fs 2→4 / mem-fs-editor 9→12 upgrade as its prerequisite. Migrates generator option typing, async `composeWith`/`env.lookup`/`env.create`, `spawnCommand`→`spawn`, inquirer-sourced `Question` types, and the mem-fs-editor v12 (promise-based `commit`, `MemFsEditor` type, `dump`/`move` rename passes) API across the workspace.
