---
'@sap-ux/ui5-library-reference-sub-generator': minor
'@sap-ux/abap-deploy-config-sub-generator': minor
'@sap-ux/cds-odata-annotation-converter': minor
'@sap-ux/cf-deploy-config-sub-generator': minor
'@sap-ux-private/control-property-editor-common': minor
'@sap-ux/deploy-config-generator-shared': minor
'@sap-ux/ui5-library-reference-inquirer': minor
'@sap-ux/xml-odata-annotation-converter': minor
'@sap-ux/repo-app-import-sub-generator': minor
'@sap-ux/adp-flp-config-sub-generator': minor
'@sap-ux/ui5-library-reference-writer': minor
'@sap-ux/abap-deploy-config-inquirer': minor
'@sap-ux/backend-proxy-middleware-cf': minor
'@sap-ux/deploy-config-sub-generator': minor
'@sap-ux/odata-annotation-core-types': minor
'@sap-ux/generator-odata-downloader': minor
'@sap-ux-private/adaptation-editor-tests': minor
'@sap-ux/abap-deploy-config-writer': minor
'@sap-ux/cf-deploy-config-inquirer': minor
'@sap-ux-private/preview-middleware-client': minor
'@sap-ux/ui5-library-sub-generator': minor
'@sap-ux/backend-proxy-middleware': minor
'@sap-ux/flp-config-sub-generator': minor
'@sap-ux/mockserver-config-writer': minor
'@sap-ux/ui-service-sub-generator': minor
'@sap-ux/ui5-application-inquirer': minor
'@sap-ux/cf-deploy-config-writer': minor
'@sap-ux/control-property-editor': minor
'@sap-ux/fiori-app-sub-generator': minor
'@sap-ux/project-input-validator': minor
'@sap-ux/serve-static-middleware': minor
'@sap-ux/fiori-freestyle-writer': minor
'@sap-ux/fiori-generator-shared': minor
'@sap-ux/odata-service-inquirer': minor
'@sap-ux/sap-systems-ext-webapp': minor
'@sap-ux/ui5-application-writer': minor
'@sap-ux-private/ui-prompting-examples': minor
'@sap-ux/cds-annotation-parser': minor
'@sap-ux/fiori-docs-embeddings': minor
'@sap-ux/fiori-elements-writer': minor
'@sap-ux/guided-answers-helper': minor
'@sap-ux/jest-runner-puppeteer': minor
'@sap-ux/odata-annotation-core': minor
'@sap-ux/sap-systems-ext-types': minor
'@sap-ux/annotation-generator': minor
'@sap-ux/fiori-annotation-api': minor
'@sap-ux/fiori-tools-settings': minor
'@sap-ux/jest-environment-ui5': minor
'@sap-ux/odata-service-writer': minor
'@sap-ux/ui5-library-inquirer': minor
'@sap-ux/ui5-proxy-middleware': minor
'@sap-ux/flp-config-inquirer': minor
'@sap-ux/text-document-utils': minor
'@sap-ux/ui-service-inquirer': minor
'@sap-ux/jest-file-matchers': minor
'@sap-ux/odata-entity-model': minor
'@sap-ux/odata-vocabularies': minor
'@sap-ux/preview-middleware': minor
'@sap-ux/ui5-library-writer': minor
'@sap-ux/app-config-writer': minor
'@sap-ux/cap-config-writer': minor
'@sap-ux/environment-check': minor
'@sap-ux/project-integrity': minor
'@sap-ux/reload-middleware': minor
'@sap-ux/generator-simple-fe': minor
'@sap-ux/fiori-mcp-server': minor
'@sap-ux/axios-extension': minor
'@sap-ux/inquirer-common': minor
'@sap-ux/ui5-test-writer': minor
'@sap-ux/deploy-tooling': minor
'@sap-ux/feature-toggle': minor
'@sap-ux/project-access': minor
'@sap-ux/fe-fpm-writer': minor
'@sap-ux/generator-adp': minor
'@sap-ux/launch-config': minor
'@sap-ux/system-access': minor
'@sap-ux/ui-components': minor
'@sap-ux/nodejs-utils': minor
'@sap-ux/ui-prompting': minor
'@sap-ux/adp-tooling': minor
'@sap-ux/fe-fpm-cli': minor
'@sap-ux-private/playwright': minor
'@sap-ux/ui5-config': minor
'@sap-ux/odata-cli': minor
'@sap-ux/btp-utils': minor
'@sap-ux/telemetry': minor
'@sap-ux/ui5-info': minor
'@sap-ux/create': minor
'@sap-ux/logger': minor
'@sap-ux/store': minor
'@sap-ux/i18n': minor
'@sap-ux/yaml': minor
'@sap-ux/types': minor
---

# BREAKING CHANGE: Migration to ECMAScript Modules (ESM)

All packages in the SAP Open UX Tools monorepo have been migrated from CommonJS (CJS) to ECMAScript Modules (ESM) with NodeNext module resolution.

## What Changed

- **Module System**: All packages now use native ESM (`"type": "module"` in package.json)
- **TypeScript Configuration**: Updated to `module: "NodeNext"` and `moduleResolution: "NodeNext"`
- **Import Statements**: All relative imports now include explicit `.js` extensions (per ESM spec)
- **Build Output**: Generated JavaScript files are now ESM modules
- **Node.js Requirement**: Minimum Node.js version remains >=20.x (ESM is stable in Node 20+)


### Jest Configuration (for Testing)

If your project tests code that imports these packages, update your Jest configuration:

```js
export default {
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }]
  }
};
```

And run Jest with: `NODE_OPTIONS='--experimental-vm-modules' jest`


