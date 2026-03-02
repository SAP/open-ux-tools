---
"@sap-ux/abap-deploy-config-inquirer": patch
"@sap-ux/abap-deploy-config-sub-generator": patch
"@sap-ux/abap-deploy-config-writer": patch
"@sap-ux/adp-tooling": patch
"@sap-ux/annotation-generator": patch
"@sap-ux/app-config-writer": patch
"@sap-ux/axios-extension": patch
"@sap-ux/backend-proxy-middleware": patch
"@sap-ux/backend-proxy-middleware-cf": patch
"@sap-ux/btp-utils": patch
"@sap-ux/cap-config-writer": patch
"@sap-ux/cds-odata-annotation-converter": patch
"@sap-ux/cf-deploy-config-inquirer": patch
"@sap-ux/cf-deploy-config-sub-generator": patch
"@sap-ux/cf-deploy-config-writer": patch
"@sap-ux/control-property-editor": patch
"@sap-ux/create": patch
"@sap-ux/deploy-config-generator-shared": patch
"@sap-ux/deploy-config-sub-generator": patch
"@sap-ux/deploy-tooling": patch
"@sap-ux/environment-check": patch
"@sap-ux/eslint-plugin-fiori-tools": patch
"@sap-ux/fe-fpm-writer": patch
"@sap-ux/fiori-annotation-api": patch
"@sap-ux/fiori-app-sub-generator": patch
"@sap-ux/fiori-docs-embeddings": patch
"@sap-ux/fiori-elements-writer": patch
"@sap-ux/fiori-freestyle-writer": patch
"@sap-ux/fiori-generator-shared": patch
"@sap-ux/fiori-mcp-server": patch
"@sap-ux/fiori-tools-settings": patch
"@sap-ux/flp-config-inquirer": patch
"@sap-ux/flp-config-sub-generator": patch
"@sap-ux/generator-adp": patch
"@sap-ux/i18n": patch
"@sap-ux/inquirer-common": patch
"@sap-ux/jest-file-matchers": patch
"@sap-ux/jest-runner-puppeteer": patch
"@sap-ux/launch-config": patch
"@sap-ux/logger": patch
"@sap-ux/mockserver-config-writer": patch
"@sap-ux/nodejs-utils": patch
"@sap-ux/odata-service-inquirer": patch
"@sap-ux/odata-service-writer": patch
"@sap-ux/odata-vocabularies": patch
"@sap-ux/preview-middleware": patch
"@sap-ux/project-access": patch
"@sap-ux/project-input-validator": patch
"@sap-ux/reload-middleware": patch
"@sap-ux/repo-app-import-sub-generator": patch
"@sap-ux/sap-systems-ext": patch
"@sap-ux/sap-systems-ext-webapp": patch
"@sap-ux/store": patch
"@sap-ux/system-access": patch
"@sap-ux/telemetry": patch
"@sap-ux/ui-service-inquirer": patch
"@sap-ux/ui-service-sub-generator": patch
"@sap-ux/ui5-application-inquirer": patch
"@sap-ux/ui5-application-writer": patch
"@sap-ux/ui5-config": patch
"@sap-ux/ui5-info": patch
"@sap-ux/ui5-library-inquirer": patch
"@sap-ux/ui5-library-reference-inquirer": patch
"@sap-ux/ui5-library-reference-sub-generator": patch
"@sap-ux/ui5-library-reference-writer": patch
"@sap-ux/ui5-library-sub-generator": patch
"@sap-ux/ui5-library-writer": patch
"@sap-ux/ui5-proxy-middleware": patch
"@sap-ux/ui5-test-writer": patch
"@sap-ux/yaml": patch
---

chore: update third-party dependencies to use semver ranges for security patch propagation

- Updated axios, fast-xml-parser, semver, lodash, ejs, i18next, dotenv, chalk, commander, ajv, mem-fs, mem-fs-editor, and prompts to use caret (^) version ranges
- Added pnpm overrides for transitive dependency security patches (form-data, tar-fs, rollup, axios, fast-xml-parser, semver)
- Updated dependabot.yml to group security-critical dependency updates
- Documented CVE reference table and semver categorization strategy in docs/version-overrides.md

This change allows downstream consumers of @sap-ux packages to automatically receive security patches for these dependencies when running npm/pnpm update.
