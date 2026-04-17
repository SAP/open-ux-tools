---
'@sap-ux/ui5-library-reference-sub-generator': major
'@sap-ux/abap-deploy-config-sub-generator': major
'@sap-ux/cds-odata-annotation-converter': major
'@sap-ux/cf-deploy-config-sub-generator': major
'@sap-ux-private/control-property-editor-common': major
'@sap-ux/deploy-config-generator-shared': major
'@sap-ux/ui5-library-reference-inquirer': major
'@sap-ux/xml-odata-annotation-converter': major
'@sap-ux/repo-app-import-sub-generator': major
'@sap-ux/adp-flp-config-sub-generator': major
'@sap-ux/ui5-library-reference-writer': major
'@sap-ux/abap-deploy-config-inquirer': major
'@sap-ux/backend-proxy-middleware-cf': major
'@sap-ux/deploy-config-sub-generator': major
'@sap-ux/odata-annotation-core-types': major
'@sap-ux/generator-odata-downloader': major
'@sap-ux-private/adaptation-editor-tests': major
'@sap-ux/abap-deploy-config-writer': major
'@sap-ux/cf-deploy-config-inquirer': major
'@sap-ux-private/preview-middleware-client': major
'@sap-ux/ui5-library-sub-generator': major
'@sap-ux/backend-proxy-middleware': major
'@sap-ux/flp-config-sub-generator': major
'@sap-ux/mockserver-config-writer': major
'@sap-ux/ui-service-sub-generator': major
'@sap-ux/ui5-application-inquirer': major
'@sap-ux/cf-deploy-config-writer': major
'@sap-ux/control-property-editor': major
'@sap-ux/fiori-app-sub-generator': major
'@sap-ux/project-input-validator': major
'@sap-ux/serve-static-middleware': major
'@sap-ux/fiori-freestyle-writer': major
'@sap-ux/fiori-generator-shared': major
'@sap-ux/odata-service-inquirer': major
'@sap-ux/sap-systems-ext-webapp': major
'@sap-ux/ui5-application-writer': major
'@sap-ux-private/ui-prompting-examples': major
'@sap-ux/cds-annotation-parser': major
'@sap-ux/fiori-docs-embeddings': major
'@sap-ux/fiori-elements-writer': major
'@sap-ux/guided-answers-helper': major
'@sap-ux/jest-runner-puppeteer': major
'@sap-ux/odata-annotation-core': major
'@sap-ux/sap-systems-ext-types': major
'@sap-ux/annotation-generator': major
'@sap-ux/fiori-annotation-api': major
'@sap-ux/fiori-tools-settings': major
'@sap-ux/jest-environment-ui5': major
'@sap-ux/odata-service-writer': major
'@sap-ux/ui5-library-inquirer': major
'@sap-ux/ui5-proxy-middleware': major
'@sap-ux/flp-config-inquirer': major
'@sap-ux/text-document-utils': major
'@sap-ux/ui-service-inquirer': major
'@sap-ux/jest-file-matchers': major
'@sap-ux/odata-entity-model': major
'@sap-ux/odata-vocabularies': major
'@sap-ux/preview-middleware': major
'@sap-ux/ui5-library-writer': major
'@sap-ux/app-config-writer': major
'@sap-ux/cap-config-writer': major
'@sap-ux/environment-check': major
'@sap-ux/project-integrity': major
'@sap-ux/reload-middleware': major
'@sap-ux/generator-simple-fe': major
'@sap-ux/fiori-mcp-server': major
'@sap-ux/axios-extension': major
'@sap-ux/inquirer-common': major
'@sap-ux/ui5-test-writer': major
'@sap-ux/deploy-tooling': major
'@sap-ux/feature-toggle': major
'@sap-ux/project-access': major
'@sap-ux/fe-fpm-writer': major
'@sap-ux/generator-adp': major
'@sap-ux/launch-config': major
'@sap-ux/system-access': major
'@sap-ux/ui-components': major
'@sap-ux/nodejs-utils': major
'@sap-ux/ui-prompting': major
'@sap-ux/adp-tooling': major
'@sap-ux/fe-fpm-cli': major
'@sap-ux-private/playwright': major
'@sap-ux/ui5-config': major
'@sap-ux/odata-cli': major
'@sap-ux/btp-utils': major
'@sap-ux/telemetry': major
'@sap-ux/ui5-info': major
'@sap-ux/create': major
'@sap-ux/logger': major
'@sap-ux/store': major
'@sap-ux/i18n': major
'@sap-ux/yaml': major
'@sap-ux/types': major
---

# BREAKING CHANGE: Migration to ECMAScript Modules (ESM)

All packages in the SAP UX Tools monorepo have been migrated from CommonJS (CJS) to ECMAScript Modules (ESM) with NodeNext module resolution.

## What Changed

- **Module System**: All packages now use native ESM (`"type": "module"` in package.json)
- **TypeScript Configuration**: Updated to `module: "NodeNext"` and `moduleResolution: "NodeNext"`
- **Import Statements**: All relative imports now include explicit `.js` extensions (per ESM spec)
- **Build Output**: Generated JavaScript files are now ESM modules
- **Node.js Requirement**: Minimum Node.js version remains >=20.x (ESM is stable in Node 20+)

## Action Required for Consuming Projects

### 1. TypeScript Projects

If your project imports these packages and uses TypeScript, update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

Or use `"module": "ESNext"` with `"moduleResolution": "Bundler"` if using a modern bundler.

### 2. Bundler Configuration

Ensure your bundler (webpack, rollup, esbuild, vite, etc.) is configured to handle ESM modules:

- **webpack 5+**: ESM is supported by default
- **rollup**: Use `format: 'es'` in output config
- **esbuild**: Use `format: 'esm'`
- **vite**: ESM is the default

### 3. Jest Configuration (for Testing)

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

### 4. Runtime Imports

- **ESM projects**: No changes needed - imports work as before
- **CJS projects**: You may need to use dynamic `import()` to load these packages:

```javascript
// CJS project importing ESM package
const { someFunction } = await import('@sap-ux/package-name');
```

### 5. Package.json Type

If your project is ESM (`"type": "module"`), ensure you're using `.js` extensions in your own relative imports.

## Why This Change?

- **Modern JavaScript Standard**: ESM is the official JavaScript module standard
- **Better Tree-shaking**: ESM enables better dead code elimination in bundlers
- **Native Node.js Support**: Node.js has stabilized ESM support since version 12
- **Future-proof**: The JavaScript ecosystem is moving to ESM

## Migration Guide

For detailed migration guidance, common issues, and troubleshooting, see:
- [TypeScript ESM Documentation](https://www.typescriptlang.org/docs/handbook/modules/theory.html#the-esm-syntax-of-typescript-source-does-not-always-match-the-esm-syntax-of-the-emitted-javascript)
- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- [Jest ESM Support](https://jestjs.io/docs/ecmascript-modules)

## Need Help?

If you encounter issues during migration:
1. Check that your TypeScript version is >= 5.0
2. Verify your bundler supports ESM
3. Review the documentation links above
4. Open an issue at https://github.com/SAP/open-ux-tools/issues

## Breaking Change Details

This is marked as a **major version** because:
- Projects using older TypeScript configurations may need updates
- CJS-only projects will need to use dynamic imports
- Build tooling may require configuration changes

Most modern projects with up-to-date tooling should require minimal changes.
