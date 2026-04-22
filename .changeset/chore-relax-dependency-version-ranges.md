---
"@sap-ux/fe-fpm-cli": patch
"@sap-ux-private/ui-prompting-examples": patch
"@sap-ux/adp-flp-config-sub-generator": patch
"@sap-ux/adp-tooling": patch
"@sap-ux/annotation-generator": patch
"@sap-ux/btp-utils": patch
"@sap-ux/cf-deploy-config-sub-generator": patch
"@sap-ux/cf-deploy-config-writer": patch
"@sap-ux/deploy-config-generator-shared": patch
"@sap-ux/deploy-config-sub-generator": patch
"@sap-ux/eslint-plugin-fiori-tools": patch
"@sap-ux/fe-fpm-writer": patch
"@sap-ux/fiori-annotation-api": patch
"@sap-ux/fiori-app-sub-generator": patch
"@sap-ux/fiori-mcp-server": patch
"@sap-ux/fiori-tools-settings": patch
"@sap-ux/flp-config-sub-generator": patch
"@sap-ux/generator-adp": patch
"@sap-ux/i18n": patch
"@sap-ux/inquirer-common": patch
"@sap-ux/jest-file-matchers": patch
"@sap-ux/jest-runner-puppeteer": patch
"@sap-ux/logger": patch
"@sap-ux/mockserver-config-writer": patch
"@sap-ux/nodejs-utils": patch
"@sap-ux/odata-service-inquirer": patch
"@sap-ux/odata-service-writer": patch
"@sap-ux-private/playwright": patch
"@sap-ux/project-access": patch
"@sap-ux/project-input-validator": patch
"@sap-ux/project-integrity": patch
"@sap-ux/reload-middleware": patch
"@sap-ux/repo-app-import-sub-generator": patch
"@sap-ux/store": patch
"@sap-ux/text-document-utils": patch
"@sap-ux/ui-components": patch
"@sap-ux/ui-prompting": patch
"@sap-ux/ui-service-inquirer": patch
"@sap-ux/ui-service-sub-generator": patch
"@sap-ux/ui5-application-writer": patch
"@sap-ux/ui5-config": patch
"@sap-ux/ui5-info": patch
"@sap-ux/ui5-library-reference-inquirer": patch
"@sap-ux/ui5-library-reference-sub-generator": patch
"@sap-ux/ui5-library-reference-writer": patch
"@sap-ux/ui5-library-sub-generator": patch
"@sap-ux/ui5-library-writer": patch
"@sap-ux/ui5-proxy-middleware": patch
"@sap-ux/ui5-test-writer": patch
"@sap-ux/yaml": patch
---

chore: relax exact version pins in runtime `dependencies` to caret ranges (`^`)

Converts all exact-pinned versions in `dependencies` sections across the monorepo to caret ranges (e.g. `"2.1.0"` → `"^2.1.0"`). This follows npm best practice: exact pins in published packages unnecessarily restrict consumers and can cause duplicate installs or version conflicts. The pnpm lockfile continues to guarantee reproducible installs.

Also aligns several pre-existing version mismatches (`portfinder`, `dotenv`, `@types/vscode`, `@types/yeoman-environment`, `@types/yeoman-generator`, `@ui5/cli`) across workspace packages.
