# Dependency Update Plan

**Generated:** 2026-05-07
**Scope:** All dependencies (including @sap-ux/* packages)

---

## Executive Summary

### 📊 Overview Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Packages Analyzed** | 97 | - |
| **Total Unique External Dependencies** | 299 | 100% |
| **Dependencies Older Than 6 Months** | 188 | 62.9% |
| **Dependencies Older Than 6 Months with Updates Available** | 73 | 24.4% |
| **Major Updates Available** | 69 | 23.1% |
| **Minor Updates Available** | 38 | 12.7% |
| **Patch Updates Available** | 28 | 9.4% |
| **Up to Date** | 162 | 54.2% |
| **Version Inconsistencies** | 11 | 3.7% |

### 🎯 Update Priority Summary

- 🔴 **CRITICAL** (14 deps): Major updates affecting 10+ packages
- 🟠 **HIGH** (11 deps): Major updates affecting 5-9 packages
- 🟡 **MEDIUM** (44 deps): Other major updates or version conflicts
- 🟢 **LOW** (66 deps): Minor and patch updates
- ✅ **NONE** (162 deps): Already up to date

---

## Critical Findings

### Top 20 Most Critical Dependencies

| # | Dependency | Current | Latest | Age | Type | Packages | Risk | Effort |
|---|------------|---------|--------|-----|------|----------|------|--------|
| 1 | 🟢 ~~`findit2`~~ | 2.2.3 | 2.2.3 | 11 years old | NONE | 1 | VERY LOW | 0.5h |
| 2 | 🟢 ~~`mock-spawn`~~ | 0.2.6 | 0.2.6 | 10 years old | NONE | 3 | VERY LOW | 0.5h |
| 3 | 🟢 ~~`hasbin`~~ | 1.2.3 | 1.2.3 | 9 years old | NONE | 3 | VERY LOW | 0.5h |
| 4 | 🟢 ~~`fuzzy`~~ | 0.1.3 | 0.1.3 | 9 years old | NONE | 1 | VERY LOW | 0.5h |
| 5 | 🟢 ~~`performance-now`~~ | 2.1.0 | 2.1.0 | 9 years old | NONE | 1 | VERY LOW | 0.5h |
| 6 | 🟢 ~~`redux-logger`~~ | 3.0.6 | 3.0.6 | 8 years old | NONE | 1 | VERY LOW | 0.5h |
| 7 | 🟢 ~~`prettify-xml`~~ | 1.2.0 | 1.2.0 | 8 years old | NONE | 2 | VERY LOW | 0.5h |
| 8 | 🟢 ~~`yamljs`~~ | 0.3.0 | 0.3.0 | 8 years old | NONE | 1 | VERY LOW | 0.5h |
| 9 | 🟢 ~~`detect-content-type`~~ | 1.2.0 | 1.2.0 | 8 years old | NONE | 1 | VERY LOW | 0.5h |
| 10 | 🟢 ~~`requireindex`~~ | 1.2.0 | 1.2.0 | 8 years old | NONE | 1 | VERY LOW | 0.5h |
| 11 | 🟢 ~~`require-from-string`~~ | 2.0.2 | 2.0.2 | 8 years old | NONE | 1 | VERY LOW | 0.5h |
| 12 | 🟢 ~~`normalize-path`~~ | 3.0.0 | 3.0.0 | 8 years old | NONE | 1 | VERY LOW | 0.5h |
| 13 | 🔴 `@types/mem-fs` | 1.1.2 | 2.2.0 | 7 years old | MAJOR | 31 | CRITICAL | 8-16h |
| 14 | 🟢 ~~`connect-livereload`~~ | 0.6.1 | 0.6.1 | 7 years old | NONE | 1 | VERY LOW | 0.5h |
| 15 | 🟢 ~~`xml-js`~~ | 1.6.11 | 1.6.11 | 7 years old | NONE | 1 | VERY LOW | 0.5h |
| 16 | 🟢 ~~`connect`~~ | 3.7.0 | 3.7.0 | 6 years old | NONE | 2 | VERY LOW | 0.5h |
| 17 | 🟢 ~~`pluralize`~~ | 8.0.0 | 8.0.0 | 6 years old | NONE | 1 | VERY LOW | 0.5h |
| 18 | 🔴 `redux` | 4.0.4 | 5.0.1 | 6 years old | MAJOR | 2 | MEDIUM | 2-4h |
| 19 | 🔴 `read-pkg-up` | 7.0.1 | 11.0.0 | 6 years old | MAJOR | 3 | MEDIUM | 2-4h |
| 20 | 🟢 ~~`enzyme`~~ | 3.11.0 | 3.11.0 | 6 years old | NONE | 1 | VERY LOW | 0.5h |

---

## Update Breakdown by Type

### 🔴 Major Updates (69 dependencies)

Major version updates may include breaking changes. Review changelogs and test thoroughly.

#### CRITICAL Priority (14 dependencies)

| Status | Dependency | Current → Latest | Age | Packages Affected | Changelog |
|--------|------------|------------------|-----|-------------------|------------|
| 🔴 | `@types/mem-fs` | 1.1.2 → 2.2.0 | 7 years old | 31 | N/A |
| 🔴 | `mem-fs` | 2.1.0 → 4.1.4 | 5 years old | 28 | [Link](https://github.com/SBoudrias/mem-fs) |
| 🔴 | `@types/mem-fs-editor` | 7.0.1 → 10.0.1 | 4 years old | 35 | N/A |
| 🔴 | `mem-fs-editor` | 9.4.0 → 12.0.4 | 4 years old | 32 | [Link](https://github.com/SBoudrias/mem-fs-editor) |
| 🔴 | `yeoman-test` | 6.3.0 → 11.5.2 | 4 years old | 12 | [Link](https://github.com/yeoman/yeoman-test) |
| 🔴 | `@types/yeoman-generator` | 5.2.11 → 6.0.0 | 3 years old | 15 | N/A |
| 🔴 | `@types/inquirer` | 8.2.6 → 9.0.9 | 3 years old | 24 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `yeoman-generator` | 5.10.0 → 8.2.2 | 2 years old | 14 | [Link](https://github.com/yeoman/generator) |
| 🔴 | `@types/yeoman-environment` | 2.10.11 → 4.0.0 | 2 years old | 11 | N/A |
| 🔴 | `@types/yeoman-test` | 4.0.6 → 7.0.0 | 2 years old | 12 | N/A |
| 🔴 | `dotenv` | 16.4.5 → 17.4.2 | 2 years old | 10 | [Link](git://github.com/motdotla/dotenv) |
| 🔴 | `ejs` | 3.1.10 → 5.0.2 | 2 years old | 12 | [Link](git://github.com/mde/ejs) |
| 🔴 | `inquirer` | 8.2.7 → 13.4.2 | 9 months old | 12 | [Link](https://github.com/SBoudrias/Inquirer.js) |
| 🟡 | `i18next` | 25.10.10 → 26.0.10 | 1 month old | 46 | [Link](https://github.com/i18next/i18next) |

#### HIGH Priority (11 dependencies)

| Status | Dependency | Current → Latest | Age | Packages Affected | Changelog |
|--------|------------|------------------|-----|-------------------|------------|
| 🔴 | `react` | 16.14.0 → 19.2.6 | 5 years old | 5 | [Link](https://github.com/facebook/react) |
| 🔴 | `react-dom` | 16.14.0 → 19.2.6 | 5 years old | 5 | [Link](https://github.com/facebook/react) |
| 🔴 | `os-name` | 4.0.1 → 7.0.0 | 4 years old | 7 | [Link](https://github.com/sindresorhus/os-name) |
| 🔴 | `chalk` | 4.1.2 → 5.6.2 | 4 years old | 8 | [Link](https://github.com/chalk/chalk) |
| 🔴 | `memfs` | 3.4.13 → 4.57.2 | 3 years old | 8 | [Link](https://github.com/streamich/memfs) |
| 🔴 | `inquirer-autocomplete-prompt` | 2.0.1 → 3.0.1 | 2 years old | 6 | [Link](ssh://git@github.com/mokkabonna/inquirer-autocomplete-prompt) |
| 🔴 | `@types/inquirer-autocomplete-prompt` | 2.0.2 → 3.0.3 | 2 years old | 7 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/express` | 4.17.21 → 5.0.6 | 2 years old | 8 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/react-dom` | 16.9.25 → 19.2.3 | 1 year old | 5 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🟡 | `@types/react` | 16.14.69 → 19.2.14 | 3 months old | 5 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🟡 | `uuid` | 11.1.1 → 14.0.0 | 8 days old | 5 | [Link](https://github.com/uuidjs/uuid) |

#### MEDIUM Priority (44 dependencies)

<details>
<summary>Click to expand (44 dependencies)</summary>

| Status | Dependency | Current → Latest | Age | Packages Affected | Changelog |
|--------|------------|------------------|-----|-------------------|------------|
| 🔴 | `redux` | 4.0.4 → 5.0.1 | 6 years old | 2 | [Link](https://github.com/reduxjs/redux) |
| 🔴 | `read-pkg-up` | 7.0.1 → 11.0.0 | 6 years old | 3 | [Link](https://github.com/sindresorhus/read-pkg-up) |
| 🔴 | `figures` | 3.2.0 → 6.1.0 | 6 years old | 1 | [Link](https://github.com/sindresorhus/figures) |
| 🔴 | `proxy-from-env` | 1.1.0 → 2.1.0 | 6 years old | 3 | [Link](https://github.com/Rob--W/proxy-from-env) |
| 🔴 | `react-markdown` | 5.0.3 → 10.1.0 | 5 years old | 2 | [Link](https://github.com/remarkjs/react-markdown) |
| 🔴 | `chevrotain` | 7.1.1 → 12.0.0 | 5 years old | 2 | [Link](git://github.com/Chevrotain/chevrotain) |
| 🔴 | `filenamify` | 4.3.0 → 7.0.1 | 5 years old | 1 | [Link](https://github.com/sindresorhus/filenamify) |
| 🔴 | `react-movable` | 2.5.4 → 3.4.1 | 5 years old | 1 | [Link](https://github.com/tajo/react-movable) |
| 🔴 | `@reduxjs/toolkit` | 1.6.1 → 2.11.2 | 4 years old | 2 | [Link](https://github.com/reduxjs/redux-toolkit) |
| 🔴 | `mime-types` | 2.1.35 → 3.0.2 | 4 years old | 1 | [Link](https://github.com/jshttp/mime-types) |
| 🔴 | `@testing-library/react` | 12.1.5 → 16.3.2 | 4 years old | 4 | [Link](https://github.com/testing-library/react-testing-library) |
| 🔴 | `fast-check` | 2.25.0 → 4.7.0 | 4 years old | 1 | [Link](https://github.com/dubzzz/fast-check) |
| 🔴 | `yargs-parser` | 21.1.1 → 22.0.0 | 3 years old | 2 | [Link](https://github.com/yargs/yargs-parser) |
| 🔴 | `react-redux` | 7.2.9 → 9.2.0 | 3 years old | 2 | [Link](https://github.com/reduxjs/react-redux) |
| 🔴 | `ignore` | 5.2.4 → 7.0.5 | 3 years old | 1 | [Link](ssh://git@github.com/kaelzhang/node-ignore) |
| 🔴 | `husky` | 8.0.3 → 9.1.7 | 3 years old | 1 | [Link](https://github.com/typicode/husky) |
| 🔴 | `open` | 8.4.2 → 11.0.0 | 3 years old | 1 | [Link](https://github.com/sindresorhus/open) |
| 🔴 | `yeoman-environment` | 3.19.3 → 6.1.0 | 2 years old | 2 | [Link](https://github.com/yeoman/environment) |
| 🔴 | `jest-environment-jsdom` | 29.7.0 → 30.4.0 | 2 years old | 3 | [Link](https://github.com/jestjs/jest) |
| 🔴 | `eslint-plugin-storybook` | 0.6.15 → 10.3.6 | 2 years old | 3 | [Link](https://github.com/storybookjs/storybook) |
| 🔴 | `@types/mime-types` | 2.1.4 → 3.0.1 | 2 years old | 1 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/serve-static` | 1.15.5 → 2.2.0 | 2 years old | 1 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@testing-library/dom` | 9.3.4 → 10.4.1 | 2 years old | 2 | [Link](https://github.com/testing-library/dom-testing-library) |
| 🔴 | `marked` | 12.0.0 → 18.0.3 | 2 years old | 1 | [Link](git://github.com/markedjs/marked) |
| 🔴 | `http-proxy-agent` | 7.0.2 → 9.0.0 | 2 years old | 1 | [Link](https://github.com/TooTallNate/proxy-agents) |
| 🔴 | `@sap/cds-compiler` | 4.8.0 → 6.9.1 | 2 years old | 1 | N/A |
| 🔴 | `serve-static` | 1.16.2 → 2.2.1 | 1 year old | 1 | [Link](https://github.com/expressjs/serve-static) |
| 🔴 | `apache-arrow` | 18.1.0 → 21.1.0 | 1 year old | 1 | [Link](https://github.com/apache/arrow-js) |
| 🔴 | `https-proxy-agent` | 7.0.6 → 9.0.0 | 1 year old | 3 | [Link](https://github.com/TooTallNate/proxy-agents) |
| 🔴 | `http-proxy-middleware` | 3.0.5 → 4.0.0 | 1 year old | 4 | [Link](https://github.com/chimurai/http-proxy-middleware) |
| 🔴 | `applicationinsights` | 2.9.8 → 3.14.0 | 8 months old | 1 | [Link](https://github.com/microsoft/ApplicationInsights-node.js) |
| 🔴 | `@sap/approuter` | 20.8.0 → 21.4.0 | 7 months old | 1 | N/A |
| 🔴 | `react-i18next` | 15.7.4 → 17.0.7 | 7 months old | 2 | [Link](https://github.com/i18next/react-i18next) |
| 🔴 | `typescript` | 5.9.3 → 6.0.3 | 7 months old | 2 | [Link](https://github.com/microsoft/TypeScript) |
| 🔴 | `update-ts-references` | 4.0.0 → 6.0.0 | 7 months old | 1 | [Link](https://github.com/eBayClassifiedsGroup/update-ts-references) |
| 🔴 | `@eslint/json` | 0.14.0 → 1.2.0 | 6 months old | 1 | [Link](https://github.com/eslint/json) |
| 🟡 | `knip` | 5.69.0 → 6.12.1 | 5 months old | 1 | [Link](https://github.com/webpro-nl/knip) |
| 🟡 | `@storybook/react` | 8.6.17 → 10.3.6 | 2 months old | 3 | [Link](https://github.com/storybookjs/storybook) |
| 🟡 | `@storybook/react-webpack5` | 8.6.17 → 10.3.6 | 2 months old | 3 | [Link](https://github.com/storybookjs/storybook) |
| 🟡 | `storybook` | 8.6.17 → 10.3.6 | 2 months old | 3 | [Link](https://github.com/storybookjs/storybook) |
| 🟡 | `minimatch` | 3.1.5 → 10.2.5 | 2 months old | 1 | [Link](ssh://git@github.com/isaacs/minimatch) |
| 🟡 | `@types/node` | 20.19.37 → 25.6.2 | 2 months old | 2 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🟡 | `diff` | 8.0.4 → 9.0.0 | 1 month old | 1 | [Link](https://github.com/kpdecker/jsdiff) |
| 🟡 | `@ui5/project` | 3.9.0 || ^4.0.11 → 4.0.15 | unknown | 1 | [Link](ssh://git@github.com/SAP/ui5-project) |

</details>

### 🟡 Minor Updates (38 dependencies)

Minor version updates include new features but should be backward compatible.

<details>
<summary>Click to expand (38 dependencies)</summary>

| Status | Dependency | Current → Latest | Age | Packages Affected |
|--------|------------|------------------|-----|-------------------|
| 🟡 | `@changesets/cli` | 2.30.0 → 2.31.0 | 2 months old | 1 |
| 🟡 | `@playwright/test` | 1.58.2 → 1.59.1 | 3 months old | 3 |
| 🟡 | `autoprefixer` | 10.4.27 → 10.5.0 | 2 months old | 1 |
| 🟡 | `esbuild` | 0.27.4 → 0.28.0 | 1 month old | 2 |
| 🟡 | `eslint` | 10.0.3 → 10.3.0 | 2 months old | 6 |
| 🟡 | `eslint-plugin-jsdoc` | 62.8.1 → 62.9.0 | 1 month old | 2 |
| 🟡 | `eslint-plugin-promise` | 7.2.1 → 7.3.0 | 1 year old | 1 |
| 🟡 | `globals` | 17.4.0 → 17.6.0 | 2 months old | 2 |
| 🟡 | `jest` | 30.3.0 → 30.4.0 | 1 month old | 1 |
| 🟡 | `nx` | 22.6.1 → 22.7.1 | 1 month old | 1 |
| 🟡 | `typescript-eslint` | 8.57.2 → 8.59.2 | 1 month old | 3 |
| 🟡 | `sass` | 1.98.0 → 1.99.0 | 1 month old | 3 |
| 🟡 | `@jest/types` | 30.3.0 → 30.4.0 | 1 month old | 6 |
| 🟡 | `@types/vscode` | 1.102.0 → 1.118.0 | 10 months old | 10 |
| 🟡 | `@xmldom/xmldom` | 0.8.13 → 0.9.10 | 19 days old | 2 |
| 🟡 | `@types/content-type` | 1.0.0 → 1.1.9 | unknown | 1 |
| 🟡 | `@eslint/core` | 1.1.1 → 1.2.1 | 2 months old | 1 |
| 🟡 | `@typescript-eslint/eslint-plugin` | 8.57.2 → 8.59.2 | 1 month old | 1 |
| 🟡 | `@typescript-eslint/parser` | 8.57.2 → 8.59.2 | 1 month old | 1 |
| 🟡 | `@eslint/plugin-kit` | 0.6.1 → 0.7.1 | 2 months old | 1 |
| 🟡 | `@typescript-eslint/rule-tester` | 8.57.2 → 8.59.2 | 1 month old | 1 |
| 🟡 | `@sap/service-provider-apis` | 2.8.0 → 2.10.0 | 2 months old | 2 |
| 🟡 | `jest-mock` | 30.2.0 → 30.4.0 | 7 months old | 1 |
| 🟡 | `@lancedb/lancedb` | 0.22.0 → 0.27.2 | 8 months old | 2 |
| 🟡 | `tsx` | 4.7.0 → 4.21.0 | 2 years old | 1 |
| 🟡 | `zod` | 4.3.6 → 4.4.3 | 3 months old | 1 |
| 🟡 | `@sap-ai-sdk/foundation-models` | 2.9.0 → 2.10.0 | 1 month old | 1 |
| 🟡 | `@sap-ai-sdk/langchain` | 2.9.0 → 2.10.0 | 1 month old | 1 |
| 🟡 | `jest-diff` | 30.2.0 → 30.4.0 | 7 months old | 1 |
| 🟡 | `jest-environment-node` | 30.2.0 → 30.4.0 | 7 months old | 1 |
| 🟡 | `puppeteer-core` | 24.40.0 → 24.43.0 | 1 month old | 1 |
| 🟡 | `@sapui5/types` | 1.120.5 → 1.147.2 | 2 years old | 1 |
| 🟡 | `@ui5/manifest` | 1.85.0 → 1.86.0 | 28 days old | 3 |
| 🟡 | `@zowe/secrets-for-zowe-sdk` | 8.29.4 → 8.32.0 | 5 months old | 2 |
| 🟡 | `@vscode/vsce` | 3.7.1 → 3.9.1 | 5 months old | 1 |
| 🟡 | `babel-jest` | 30.3.0 → 30.4.0 | 1 month old | 2 |
| 🟡 | `@sap/subaccount-destination-service-provider` | 2.16.0 → 2.18.0 | 1 month old | 1 |
| 🟡 | `ajv` | 8.18.0 → 8.20.0 | 2 months old | 1 |

</details>

### 🟢 Patch Updates (28 dependencies)

Patch updates include bug fixes only. Safe to update with minimal risk.

<details>
<summary>Click to expand (28 dependencies)</summary>

| Status | Dependency | Current → Latest | Packages Affected |
|--------|------------|------------------|-------------------|
| 🟢 | `eslint-plugin-sonarjs` | 4.0.2 → 4.0.3 | 1 |
| 🟢 | `prettier` | 3.8.1 → 3.8.3 | 3 |
| 🟢 | `yaml` | 2.8.3 → 2.8.4 | 6 |
| 🟢 | `fast-xml-parser` | 5.7.2 → 5.7.3 | 6 |
| 🟢 | `@babel/preset-env` | 7.29.2 → 7.29.5 | 3 |
| 🟢 | `ts-loader` | 9.5.4 → 9.5.7 | 3 |
| 🟢 | `fs-extra` | 11.3.4 → 11.3.5 | 15 |
| 🟢 | `@vscode-logging/logger` | 2.0.8 → 2.0.9 | 10 |
| 🟢 | `@sap/cf-tools` | 3.3.0 → 3.3.1 | 7 |
| 🟢 | `adm-zip` | 0.5.16 → 0.5.17 | 4 |
| 🟢 | `nock` | 14.0.11 → 14.0.15 | 10 |
| 🟢 | `qs` | 6.15.0 → 6.15.1 | 1 |
| 🟢 | `@types/http-proxy` | 1.17.5 → 1.17.17 | 2 |
| 🟢 | `portfinder` | 1.0.32 → 1.0.38 | 4 |
| 🟢 | `@sap/bas-sdk` | 3.13.6 → 3.13.7 | 3 |
| 🟢 | `@babel/eslint-parser` | 7.28.5 → 7.28.6 | 1 |
| 🟢 | `@eslint/config-helpers` | 0.5.3 → 0.5.5 | 1 |
| 🟢 | `@humanwhocodes/momoa` | 3.3.9 → 3.3.10 | 1 |
| 🟢 | `eslint-plugin-eslint-plugin` | 7.3.2 → 7.3.3 | 1 |
| 🟢 | `jest-when` | 4.0.1 → 4.0.3 | 1 |
| 🟢 | `@sap/ux-specification` | 1.144.0 → 1.144.2 | 3 |
| 🟢 | `promptfoo` | 0.121.3 → 0.121.10 | 1 |
| 🟢 | `@langchain/core` | 1.1.40 → 1.1.45 | 1 |
| 🟢 | `odata-query` | 8.0.5 → 8.0.7 | 1 |
| 🟢 | `@ui5/cli` | 4.0.49 → 4.0.52 | 3 |
| 🟢 | `ui5-tooling-modules` | 3.35.0 → 3.35.2 | 1 |
| 🟢 | `@types/qs` | 6.15.0 → 6.15.1 | 1 |
| 🟢 | `@sap-ux/ui5-middleware-fe-mockserver` | 2.4.10 → 2.4.13 | 1 |

</details>

---

## Version Inconsistencies

The following 11 dependencies have multiple versions in use across the workspace:

| Dependency | Versions in Use | Packages Affected | Recommended Action |
|------------|-----------------|-------------------|--------------------|
| `eslint` | 10.0.3, 9 || ^10, 9.39.1 | 6 | Standardize to 10.3.0 |
| `dotenv` | 16.4.5, 17.4.2 | 10 | Standardize to 17.4.2 |
| `@types/yeoman-environment` | 2.10.11, 2.10.8 | 11 | Standardize to 4.0.0 |
| `@types/yeoman-generator` | 5.2.11, 5.2.14 | 15 | Standardize to 6.0.0 |
| `@types/vscode` | 1.102.0, 1.110.0 | 10 | Standardize to 1.118.0 |
| `@vscode-logging/logger` | 2.0.8, 2.0.9 | 10 | Standardize to 2.0.9 |
| `@sap/cf-tools` | 3.3.0, 3.3.1 | 7 | Standardize to 3.3.1 |
| `express` | 4, 4.22.1 | 7 | Standardize to 5.2.1 |
| `portfinder` | 1.0.32, 1.0.38 | 4 | Standardize to 1.0.38 |
| `@ui5/cli` | 4.0.49, 4.0.50 | 3 | Standardize to 4.0.52 |
| `@ui5/project` | 3.9.0 || ^4.0.11, 4.0.15 | 1 | Standardize to 4.0.15 |

---

## Phased Implementation Plan

### Phase 1: Foundation & Quick Wins (Weeks 1-3)

**Goal:** Apply low-risk updates and fix version inconsistencies

**Tasks:**
- Apply all 28 patch updates
- Resolve 11 version inconsistencies
- Update development tooling (linters, formatters)

**Estimated Effort:** 20h
**Risk Level:** LOW

### Phase 2: Medium Priority Major Updates (Weeks 4-7)

**Goal:** Update dependencies with <5 package impact

**Tasks:**
- Update 44 medium-priority major dependencies
- Apply 38 minor updates

**Estimated Effort:** 189h
**Risk Level:** MEDIUM

### Phase 3: High Priority Major Updates (Weeks 8-12)

**Goal:** Update dependencies affecting 5-9 packages

**Tasks:**
- Update 11 high-priority major dependencies
- Comprehensive testing after each update

**Estimated Effort:** 66h
**Risk Level:** HIGH

### Phase 4: Critical Legacy Updates (Weeks 13-18)

**Goal:** Update dependencies affecting 10+ packages

**Tasks:**
- Update 14 critical major dependencies
- May require incremental migration strategy
- Extensive testing and validation

**Estimated Effort:** 168h
**Risk Level:** CRITICAL

### Total Estimated Effort

**443 hours** across 12-18 weeks

---

## Detailed Dependency List

### All 299 Dependencies

<details>
<summary>Click to expand complete dependency list</summary>

| Status | Dependency | Current | Latest | Age | Type | Used In | Action |
|--------|------------|---------|--------|-----|------|---------|--------|
| 🟡 | `@changesets/cli` | 2.30.0 | 2.31.0 | 2 months old | MINOR | 1 | Should update |
| 🟢 | ~~`@eslint/eslintrc`~~ | 3.3.5 | 3.3.5 | 2 months old | NONE | 1 | Up to date |
| 🟢 | ~~`@eslint/js`~~ | 10.0.1 | 10.0.1 | 3 months old | NONE | 2 | Up to date |
| 🟡 | `@playwright/test` | 1.58.2 | 1.59.1 | 3 months old | MINOR | 3 | Should update |
| 🟢 | ~~`@types/jest`~~ | 30.0.0 | 30.0.0 | 10 months old | NONE | 1 | Up to date |
| 🟡 | `@types/node` | 20.19.37 | 25.6.2 | 2 months old | MAJOR | 2 | Should update |
| 🟡 | `autoprefixer` | 10.4.27 | 10.5.0 | 2 months old | MINOR | 1 | Should update |
| 🟢 | ~~`check-dependency-version-consistency`~~ | 6.0.0 | 6.0.0 | 4 months old | NONE | 1 | Up to date |
| 🟡 | `esbuild` | 0.27.4 | 0.28.0 | 1 month old | MINOR | 2 | Should update |
| 🟢 | ~~`esbuild-sass-plugin`~~ | 3.7.0 | 3.7.0 | 1 month old | NONE | 1 | Up to date |
| 🟡 | `eslint` | 10.0.3 | 10.3.0 | 2 months old | MINOR | 6 | Should update |
| 🟢 | ~~`eslint-config-prettier`~~ | 10.1.8 | 10.1.8 | 9 months old | NONE | 1 | Up to date |
| 🟢 | ~~`eslint-import-resolver-typescript`~~ | 4.4.4 | 4.4.4 | 10 months old | NONE | 1 | Up to date |
| 🟢 | ~~`eslint-plugin-import`~~ | 2.32.0 | 2.32.0 | 10 months old | NONE | 1 | Up to date |
| 🟡 | `eslint-plugin-jsdoc` | 62.8.1 | 62.9.0 | 1 month old | MINOR | 2 | Should update |
| 🟢 | ~~`eslint-plugin-prettier`~~ | 5.5.5 | 5.5.5 | 3 months old | NONE | 1 | Up to date |
| 🟡 | `eslint-plugin-promise` | 7.2.1 | 7.3.0 | 1 year old | MINOR | 1 | Should update |
| 🟢 | `eslint-plugin-sonarjs` | 4.0.2 | 4.0.3 | 1 month old | PATCH | 1 | Safe to update |
| 🟡 | `globals` | 17.4.0 | 17.6.0 | 2 months old | MINOR | 2 | Should update |
| 🔴 | `husky` | 8.0.3 | 9.1.7 | 3 years old | MAJOR | 1 | Review required |
| 🟡 | `jest` | 30.3.0 | 30.4.0 | 1 month old | MINOR | 1 | Should update |
| 🟢 | ~~`jest-sonar`~~ | 0.2.16 | 0.2.16 | 3 years old | NONE | 1 | Up to date |
| 🟡 | `knip` | 5.69.0 | 6.12.1 | 5 months old | MAJOR | 1 | Should update |
| 🟢 | ~~`npm-run-all2`~~ | 8.0.4 | 8.0.4 | 11 months old | NONE | 22 | Up to date |
| 🟡 | `nx` | 22.6.1 | 22.7.1 | 1 month old | MINOR | 1 | Should update |
| 🟢 | ~~`postcss`~~ | 8.5.14 | 8.5.14 | 3 days old | NONE | 1 | Up to date |
| 🟢 | ~~`prebuild-install`~~ | 7.1.3 | 7.1.3 | 1 year old | NONE | 1 | Up to date |
| 🟢 | `prettier` | 3.8.1 | 3.8.3 | 3 months old | PATCH | 3 | Safe to update |
| 🟢 | ~~`pretty-quick`~~ | 4.2.2 | 4.2.2 | 11 months old | NONE | 1 | Up to date |
| 🟢 | ~~`react-select`~~ | 5.10.2 | 5.10.2 | 10 months old | NONE | 2 | Up to date |
| 🟢 | ~~`react-virtualized`~~ | 9.22.6 | 9.22.6 | 1 year old | NONE | 2 | Up to date |
| 🟢 | ~~`rimraf`~~ | 6.1.3 | 6.1.3 | 2 months old | NONE | 20 | Up to date |
| 🟢 | ~~`ts-jest`~~ | 29.4.9 | 29.4.9 | 1 month old | NONE | 3 | Up to date |
| 🔴 | `typescript` | 5.9.3 | 6.0.3 | 7 months old | MAJOR | 2 | Review required |
| 🟡 | `typescript-eslint` | 8.57.2 | 8.59.2 | 1 month old | MINOR | 3 | Should update |
| 🔴 | `update-ts-references` | 4.0.0 | 6.0.0 | 7 months old | MAJOR | 1 | Review required |
| 🟢 | `yaml` | 2.8.3 | 2.8.4 | 1 month old | PATCH | 6 | Safe to update |
| 🔴 | `yargs-parser` | 21.1.1 | 22.0.0 | 3 years old | MAJOR | 2 | Review required |
| 🔴 | `inquirer` | 8.2.7 | 13.4.2 | 9 months old | MAJOR | 12 | Review required |
| 🔴 | `mem-fs` | 2.1.0 | 4.1.4 | 5 years old | MAJOR | 28 | Review required |
| 🔴 | `mem-fs-editor` | 9.4.0 | 12.0.4 | 4 years old | MAJOR | 32 | Review required |
| 🔴 | `@types/inquirer` | 8.2.6 | 9.0.9 | 3 years old | MAJOR | 24 | Review required |
| 🔴 | `@types/mem-fs` | 1.1.2 | 2.2.0 | 7 years old | MAJOR | 31 | Review required |
| 🔴 | `@types/mem-fs-editor` | 7.0.1 | 10.0.1 | 4 years old | MAJOR | 35 | Review required |
| 🟢 | ~~`@types/vinyl`~~ | 2.0.12 | 2.0.12 | 2 years old | NONE | 3 | Up to date |
| 🔴 | `dotenv` | 16.4.5 | 17.4.2 | 2 years old | MAJOR | 10 | Review required |
| 🟢 | `fast-xml-parser` | 5.7.2 | 5.7.3 | 13 days old | PATCH | 6 | Safe to update |
| 🔴 | `yeoman-generator` | 5.10.0 | 8.2.2 | 2 years old | MAJOR | 14 | Review required |
| 🔴 | `@types/yeoman-environment` | 2.10.11 | 4.0.0 | 2 years old | MAJOR | 11 | Review required |
| 🔴 | `@types/yeoman-generator` | 5.2.11 | 6.0.0 | 3 years old | MAJOR | 15 | Review required |
| 🟢 | ~~`axios`~~ | 1.16.0 | 1.16.0 | 5 days old | NONE | 15 | Up to date |
| 🔴 | `react-markdown` | 5.0.3 | 10.1.0 | 5 years old | MAJOR | 2 | Review required |
| 🟢 | ~~`sanitize-html`~~ | 2.17.3 | 2.17.3 | 22 days old | NONE | 2 | Up to date |
| 🟢 | ~~`@babel/core`~~ | 7.29.0 | 7.29.0 | 3 months old | NONE | 4 | Up to date |
| 🟢 | ~~`@babel/helper-define-map`~~ | 7.18.6 | 7.18.6 | 3 years old | NONE | 3 | Up to date |
| 🟢 | `@babel/preset-env` | 7.29.2 | 7.29.5 | 1 month old | PATCH | 3 | Safe to update |
| 🟢 | ~~`@babel/preset-react`~~ | 7.28.5 | 7.28.5 | 6 months old | NONE | 3 | Up to date |
| 🟢 | ~~`@babel/preset-typescript`~~ | 7.28.5 | 7.28.5 | 6 months old | NONE | 3 | Up to date |
| 🟢 | ~~`@storybook/components`~~ | 8.6.14 | 8.6.14 | 11 months old | NONE | 2 | Up to date |
| 🟢 | `@storybook/manager-api` | 8.6.17 | 8.6.14 | 2 months old | NONE | 2 | Up to date |
| 🟡 | `@storybook/react` | 8.6.17 | 10.3.6 | 2 months old | MAJOR | 3 | Should update |
| 🟡 | `@storybook/react-webpack5` | 8.6.17 | 10.3.6 | 2 months old | MAJOR | 3 | Should update |
| 🟡 | `@types/react` | 16.14.69 | 19.2.14 | 3 months old | MAJOR | 5 | Should update |
| 🔴 | `@types/react-dom` | 16.9.25 | 19.2.3 | 1 year old | MAJOR | 5 | Review required |
| 🟢 | ~~`@types/sanitize-html`~~ | 2.16.1 | 2.16.1 | 2 months old | NONE | 2 | Up to date |
| 🟢 | ~~`@types/uuid`~~ | 11.0.0 | 11.0.0 | 7 months old | NONE | 4 | Up to date |
| 🟢 | ~~`@types/ws`~~ | 8.18.1 | 8.18.1 | 1 year old | NONE | 1 | Up to date |
| 🟢 | ~~`babel-loader`~~ | 10.1.1 | 10.1.1 | 1 month old | NONE | 3 | Up to date |
| 🟢 | ~~`copyfiles`~~ | 2.4.1 | 2.4.1 | 5 years old | NONE | 4 | Up to date |
| 🟢 | ~~`css-loader`~~ | 7.1.4 | 7.1.4 | 2 months old | NONE | 3 | Up to date |
| 🟢 | ~~`eslint-plugin-react`~~ | 7.37.5 | 7.37.5 | 1 year old | NONE | 4 | Up to date |
| 🔴 | `eslint-plugin-storybook` | 0.6.15 | 10.3.6 | 2 years old | MAJOR | 3 | Review required |
| 🔴 | `react` | 16.14.0 | 19.2.6 | 5 years old | MAJOR | 5 | Review required |
| 🔴 | `react-dom` | 16.14.0 | 19.2.6 | 5 years old | MAJOR | 5 | Review required |
| 🟡 | `sass` | 1.98.0 | 1.99.0 | 1 month old | MINOR | 3 | Should update |
| 🟢 | ~~`sass-loader`~~ | 16.0.7 | 16.0.7 | 3 months old | NONE | 3 | Up to date |
| 🟡 | `storybook` | 8.6.17 | 10.3.6 | 2 months old | MAJOR | 3 | Should update |
| 🟢 | ~~`storybook-addon-turbo-build`~~ | 2.0.1 | 2.0.1 | 3 years old | NONE | 3 | Up to date |
| 🟢 | ~~`style-loader`~~ | 4.0.0 | 4.0.0 | 2 years old | NONE | 3 | Up to date |
| 🟢 | `ts-loader` | 9.5.4 | 9.5.7 | 8 months old | PATCH | 3 | Safe to update |
| 🟢 | ~~`ts-node`~~ | 10.9.2 | 10.9.2 | 2 years old | NONE | 5 | Up to date |
| 🟢 | ~~`ws`~~ | 8.20.0 | 8.20.0 | 1 month old | NONE | 1 | Up to date |
| 🟡 | `i18next` | 25.10.10 | 26.0.10 | 1 month old | MAJOR | 46 | Should update |
| 🟢 | ~~`@sap-devx/yeoman-ui-types`~~ | 1.23.0 | 1.23.0 | 1 month old | NONE | 22 | Up to date |
| 🔴 | `inquirer-autocomplete-prompt` | 2.0.1 | 3.0.1 | 2 years old | MAJOR | 6 | Review required |
| 🔴 | `@types/inquirer-autocomplete-prompt` | 2.0.2 | 3.0.3 | 2 years old | MAJOR | 7 | Review required |
| 🔴 | `@types/yeoman-test` | 4.0.6 | 7.0.0 | 2 years old | MAJOR | 12 | Review required |
| 🔴 | `memfs` | 3.4.13 | 4.57.2 | 3 years old | MAJOR | 8 | Review required |
| 🟢 | ~~`unionfs`~~ | 4.6.0 | 4.6.0 | 9 months old | NONE | 8 | Up to date |
| 🔴 | `yeoman-test` | 6.3.0 | 11.5.2 | 4 years old | MAJOR | 12 | Review required |
| 🟢 | ~~`fast-glob`~~ | 3.3.3 | 3.3.3 | 1 year old | NONE | 3 | Up to date |
| 🟢 | ~~`lodash`~~ | 4.18.1 | 4.18.1 | 1 month old | NONE | 17 | Up to date |
| 🟢 | ~~`semver`~~ | 7.7.4 | 7.7.4 | 3 months old | NONE | 19 | Up to date |
| 🟢 | ~~`@types/fs-extra`~~ | 11.0.4 | 11.0.4 | 2 years old | NONE | 15 | Up to date |
| 🟢 | ~~`@types/lodash`~~ | 4.17.24 | 4.17.24 | 2 months old | NONE | 15 | Up to date |
| 🟢 | ~~`@types/semver`~~ | 7.7.1 | 7.7.1 | 8 months old | NONE | 19 | Up to date |
| 🟢 | `fs-extra` | 11.3.4 | 11.3.5 | 2 months old | PATCH | 15 | Safe to update |
| 🟡 | `@jest/types` | 30.3.0 | 30.4.0 | 1 month old | MINOR | 6 | Should update |
| 🟡 | `@types/vscode` | 1.102.0 | 1.118.0 | 10 months old | MINOR | 10 | Should update |
| 🟢 | `@vscode-logging/logger` | 2.0.8 | 2.0.9 | 2 months old | PATCH | 10 | Safe to update |
| 🟢 | `@sap/cf-tools` | 3.3.0 | 3.3.1 | 3 months old | PATCH | 7 | Safe to update |
| 🟢 | `adm-zip` | 0.5.16 | 0.5.17 | 1 year old | PATCH | 4 | Safe to update |
| 🔴 | `ejs` | 3.1.10 | 5.0.2 | 2 years old | MAJOR | 12 | Review required |
| 🟢 | ~~`js-yaml`~~ | 4.1.1 | 4.1.1 | 5 months old | NONE | 5 | Up to date |
| 🟢 | ~~`prompts`~~ | 2.4.2 | 2.4.2 | 4 years old | NONE | 8 | Up to date |
| 🟢 | ~~`sanitize-filename`~~ | 1.6.4 | 1.6.4 | 1 month old | NONE | 1 | Up to date |
| 🟡 | `uuid` | 11.1.1 | 14.0.0 | 8 days old | MAJOR | 5 | Should update |
| 🟢 | ~~`@types/adm-zip`~~ | 0.5.8 | 0.5.8 | 1 month old | NONE | 4 | Up to date |
| 🟢 | ~~`@types/ejs`~~ | 3.1.5 | 3.1.5 | 2 years old | NONE | 11 | Up to date |
| 🔴 | `@types/express` | 4.17.21 | 5.0.6 | 2 years old | MAJOR | 8 | Review required |
| 🟢 | ~~`@types/js-yaml`~~ | 4.0.9 | 4.0.9 | 2 years old | NONE | 5 | Up to date |
| 🟢 | ~~`@types/prompts`~~ | 2.4.9 | 2.4.9 | 2 years old | NONE | 9 | Up to date |
| 🟢 | ~~`@types/supertest`~~ | 7.2.0 | 7.2.0 | 2 months old | NONE | 6 | Up to date |
| 🟢 | ~~`cross-env`~~ | 10.1.0 | 10.1.0 | 7 months old | NONE | 4 | Up to date |
| 🔴 | `express` | 4 | 5.2.1 | unknown | UNKNOWN | 7 | Manual check required |
| 🟢 | `nock` | 14.0.11 | 14.0.15 | 2 months old | PATCH | 10 | Safe to update |
| 🟢 | ~~`supertest`~~ | 7.2.2 | 7.2.2 | 4 months old | NONE | 7 | Up to date |
| 🟢 | ~~`@sap-ux/annotation-converter`~~ | 0.10.21 | 0.10.21 | 2 months old | NONE | 10 | Up to date |
| 🟢 | ~~`@sap-ux/vocabularies-types`~~ | 0.15.0 | 0.15.0 | 2 months old | NONE | 12 | Up to date |
| 🔴 | `chalk` | 4.1.2 | 5.6.2 | 4 years old | MAJOR | 8 | Review required |
| 🟢 | ~~`cross-spawn`~~ | 7.0.6 | 7.0.6 | 1 year old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/cross-spawn`~~ | 6.0.6 | 6.0.6 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`detect-content-type`~~ | 1.2.0 | 1.2.0 | 8 years old | NONE | 1 | Up to date |
| 🔴 | `open` | 8.4.2 | 11.0.0 | 3 years old | MAJOR | 1 | Review required |
| 🟢 | `qs` | 6.15.0 | 6.15.1 | 2 months old | PATCH | 1 | Safe to update |
| 🟢 | ~~`xpath`~~ | 0.0.34 | 0.0.34 | 2 years old | NONE | 2 | Up to date |
| 🟡 | `@xmldom/xmldom` | 0.8.13 | 0.9.10 | 19 days old | MINOR | 2 | Should update |
| 🔴 | `https-proxy-agent` | 7.0.6 | 9.0.0 | 1 year old | MAJOR | 3 | Review required |
| 🔴 | `http-proxy-agent` | 7.0.2 | 9.0.0 | 2 years old | MAJOR | 1 | Review required |
| 🔴 | `proxy-from-env` | 1.1.0 | 2.1.0 | 6 years old | MAJOR | 3 | Review required |
| 🟢 | ~~`@types/proxy-from-env`~~ | 1.0.4 | 1.0.4 | 2 years old | NONE | 3 | Up to date |
| 🔴 | `http-proxy-middleware` | 3.0.5 | 4.0.0 | 1 year old | MAJOR | 4 | Review required |
| 🟢 | ~~`@types/connect`~~ | 3.4.38 | 3.4.38 | 2 years old | NONE | 2 | Up to date |
| 🟢 | `@types/http-proxy` | 1.17.5 | 1.17.17 | 5 years old | PATCH | 2 | Safe to update |
| 🟢 | ~~`connect`~~ | 3.7.0 | 3.7.0 | 6 years old | NONE | 2 | Up to date |
| 🔴 | `@sap/approuter` | 20.8.0 | 21.4.0 | 7 months old | MAJOR | 1 | Review required |
| 🟢 | ~~`content-type`~~ | 1.0.5 | 1.0.5 | 3 years old | NONE | 1 | Up to date |
| 🔴 | `mime-types` | 2.1.35 | 3.0.2 | 4 years old | MAJOR | 1 | Review required |
| 🟢 | `portfinder` | 1.0.32 | 1.0.38 | 3 years old | PATCH | 4 | Safe to update |
| 🟡 | `@types/content-type` | 1.0.0 | 1.1.9 | unknown | MINOR | 1 | Should update |
| 🔴 | `@types/mime-types` | 2.1.4 | 3.0.1 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | `@sap/bas-sdk` | 3.13.6 | 3.13.7 | 23 days old | PATCH | 3 | Safe to update |
| 🟢 | ~~`xml-js`~~ | 1.6.11 | 1.6.11 | 7 years old | NONE | 1 | Up to date |
| 🔴 | `chevrotain` | 7.1.1 | 12.0.0 | 5 years old | MAJOR | 2 | Review required |
| 🟢 | ~~`@sap/ux-cds-compiler-facade`~~ | 1.21.0 | 1.21.0 | 1 month old | NONE | 2 | Up to date |
| 🟢 | ~~`hasbin`~~ | 1.2.3 | 1.2.3 | 9 years old | NONE | 3 | Up to date |
| 🟢 | ~~`@types/hasbin`~~ | 1.2.2 | 1.2.2 | 2 years old | NONE | 3 | Up to date |
| 🟢 | ~~`@sap/mta-lib`~~ | 1.7.4 | 1.7.4 | 4 years old | NONE | 3 | Up to date |
| 🟢 | ~~`mta`~~ | 1.0.8 | 1.0.8 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@fluentui/react`~~ | 8.125.5 | 8.125.5 | 2 months old | NONE | 2 | Up to date |
| 🟢 | ~~`@fluentui/react-hooks`~~ | 8.10.2 | 8.10.2 | 4 months old | NONE | 1 | Up to date |
| 🔴 | `@reduxjs/toolkit` | 1.6.1 | 2.11.2 | 4 years old | MAJOR | 2 | Review required |
| 🟢 | ~~`@testing-library/jest-dom`~~ | 6.9.1 | 6.9.1 | 7 months old | NONE | 4 | Up to date |
| 🔴 | `@testing-library/react` | 12.1.5 | 16.3.2 | 4 years old | MAJOR | 4 | Review required |
| 🔴 | `@testing-library/dom` | 9.3.4 | 10.4.1 | 2 years old | MAJOR | 2 | Review required |
| 🟢 | ~~`@types/react-redux`~~ | 7.1.34 | 7.1.34 | 1 year old | NONE | 2 | Up to date |
| 🟢 | ~~`@types/redux-logger`~~ | 3.0.13 | 3.0.13 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/remote-redux-devtools`~~ | 0.5.8 | 0.5.8 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/source-map-support`~~ | 0.5.10 | 0.5.10 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`jest-scss-transform`~~ | 1.0.4 | 1.0.4 | 1 year old | NONE | 4 | Up to date |
| 🔴 | `react-i18next` | 15.7.4 | 17.0.7 | 7 months old | MAJOR | 2 | Review required |
| 🔴 | `react-redux` | 7.2.9 | 9.2.0 | 3 years old | MAJOR | 2 | Review required |
| 🔴 | `redux` | 4.0.4 | 5.0.1 | 6 years old | MAJOR | 2 | Review required |
| 🟢 | ~~`redux-logger`~~ | 3.0.6 | 3.0.6 | 8 years old | NONE | 1 | Up to date |
| 🟢 | ~~`source-map-support`~~ | 0.5.21 | 0.5.21 | 4 years old | NONE | 1 | Up to date |
| 🟢 | ~~`stream-browserify`~~ | 3.0.0 | 3.0.0 | 6 years old | NONE | 1 | Up to date |
| 🟢 | ~~`ts-import-plugin`~~ | 3.0.0 | 3.0.0 | 3 years old | NONE | 1 | Up to date |
| 🟢 | ~~`postcss-modules`~~ | 6.0.1 | 6.0.1 | 1 year old | NONE | 1 | Up to date |
| 🟢 | ~~`@ui5/fs`~~ | 4.0.5 | 4.0.5 | 2 months old | NONE | 1 | Up to date |
| 🟢 | ~~`esbuild-plugin-alias`~~ | 0.2.1 | 0.2.1 | 4 years old | NONE | 2 | Up to date |
| 🟢 | ~~`esbuild-plugin-copy`~~ | 2.1.1 | 2.1.1 | 3 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@esbuild-plugins/node-modules-polyfill`~~ | 0.2.2 | 0.2.2 | 3 years old | NONE | 2 | Up to date |
| 🟢 | ~~`commander`~~ | 14.0.3 | 14.0.3 | 3 months old | NONE | 2 | Up to date |
| 🟡 | `diff` | 8.0.4 | 9.0.0 | 1 month old | MAJOR | 1 | Should update |
| 🟢 | ~~`@types/diff`~~ | 8.0.0 | 8.0.0 | 11 months old | NONE | 1 | Up to date |
| 🔴 | `os-name` | 4.0.1 | 7.0.0 | 4 years old | MAJOR | 7 | Review required |
| 🟢 | ~~`archiver`~~ | 7.0.1 | 7.0.1 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`glob-gitignore`~~ | 1.0.15 | 1.0.15 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `ignore` | 5.2.4 | 7.0.5 | 3 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`minimist`~~ | 1.2.8 | 1.2.8 | 3 years old | NONE | 1 | Up to date |
| 🟢 | ~~`yamljs`~~ | 0.3.0 | 0.3.0 | 8 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/archiver`~~ | 7.0.0 | 7.0.0 | 6 months old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/minimist`~~ | 1.2.5 | 1.2.5 | 2 years old | NONE | 1 | Up to date |
| 🟢 | `@babel/eslint-parser` | 7.28.5 | 7.28.6 | 6 months old | PATCH | 1 | Safe to update |
| 🔴 | `@eslint/json` | 0.14.0 | 1.2.0 | 6 months old | MAJOR | 1 | Review required |
| 🟡 | `@eslint/core` | 1.1.1 | 1.2.1 | 2 months old | MINOR | 1 | Should update |
| 🟢 | `@eslint/config-helpers` | 0.5.3 | 0.5.5 | 2 months old | PATCH | 1 | Safe to update |
| 🟡 | `@typescript-eslint/eslint-plugin` | 8.57.2 | 8.59.2 | 1 month old | MINOR | 1 | Should update |
| 🟡 | `@typescript-eslint/parser` | 8.57.2 | 8.59.2 | 1 month old | MINOR | 1 | Should update |
| 🟢 | ~~`@xml-tools/ast`~~ | 5.0.5 | 5.0.5 | 4 years old | NONE | 3 | Up to date |
| 🟢 | ~~`@xml-tools/parser`~~ | 1.0.11 | 1.0.11 | 4 years old | NONE | 3 | Up to date |
| 🟢 | `@humanwhocodes/momoa` | 3.3.9 | 3.3.10 | 9 months old | PATCH | 1 | Safe to update |
| 🟡 | `@eslint/plugin-kit` | 0.6.1 | 0.7.1 | 2 months old | MINOR | 1 | Should update |
| 🟢 | ~~`requireindex`~~ | 1.2.0 | 1.2.0 | 8 years old | NONE | 1 | Up to date |
| 🟢 | ~~`synckit`~~ | 0.11.12 | 0.11.12 | 3 months old | NONE | 1 | Up to date |
| 🟡 | `@typescript-eslint/rule-tester` | 8.57.2 | 8.59.2 | 1 month old | MINOR | 1 | Should update |
| 🟢 | `eslint-plugin-eslint-plugin` | 7.3.2 | 7.3.3 | 2 months old | PATCH | 1 | Safe to update |
| 🟢 | ~~`xml-formatter`~~ | 3.7.0 | 3.7.0 | 1 month old | NONE | 1 | Up to date |
| 🟢 | `jest-when` | 4.0.1 | 4.0.3 | 1 month old | PATCH | 1 | Safe to update |
| 🟢 | ~~`vscode-languageserver-textdocument`~~ | 1.0.12 | 1.0.12 | 1 year old | NONE | 3 | Up to date |
| 🔴 | `@sap/cds-compiler` | 4.8.0 | 6.9.1 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`@sap-ux/edmx-parser`~~ | 0.10.0 | 0.10.0 | 2 months old | NONE | 7 | Up to date |
| 🟡 | `@sap/service-provider-apis` | 2.8.0 | 2.10.0 | 2 months old | MINOR | 2 | Should update |
| 🟢 | ~~`jest-extended`~~ | 7.0.0 | 7.0.0 | 6 months old | NONE | 10 | Up to date |
| 🟡 | `jest-mock` | 30.2.0 | 30.4.0 | 7 months old | MINOR | 1 | Should update |
| 🟢 | ~~`mock-spawn`~~ | 0.2.6 | 0.2.6 | 10 years old | NONE | 3 | Up to date |
| 🟢 | ~~`@npm/types`~~ | 2.1.0 | 2.1.0 | 1 year old | NONE | 1 | Up to date |
| 🟡 | `@lancedb/lancedb` | 0.22.0 | 0.27.2 | 8 months old | MINOR | 2 | Should update |
| 🟢 | ~~`@xenova/transformers`~~ | 2.17.2 | 2.17.2 | 1 year old | NONE | 2 | Up to date |
| 🟢 | ~~`node-fetch`~~ | 3.3.2 | 3.3.2 | 2 years old | NONE | 1 | Up to date |
| 🔴 | `marked` | 12.0.0 | 18.0.3 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`gray-matter`~~ | 4.0.3 | 4.0.3 | 5 years old | NONE | 1 | Up to date |
| 🟡 | `tsx` | 4.7.0 | 4.21.0 | 2 years old | MINOR | 1 | Should update |
| 🔴 | `read-pkg-up` | 7.0.1 | 11.0.0 | 6 years old | MAJOR | 3 | Review required |
| 🟢 | ~~`logform`~~ | 2.7.0 | 2.7.0 | 1 year old | NONE | 2 | Up to date |
| 🔴 | `apache-arrow` | 18.1.0 | 21.1.0 | 1 year old | MAJOR | 1 | Review required |
| 🟢 | ~~`@modelcontextprotocol/sdk`~~ | 1.29.0 | 1.29.0 | 1 month old | NONE | 1 | Up to date |
| 🟢 | `@sap/ux-specification` | 1.144.0 | 1.144.2 | 1 month old | PATCH | 3 | Safe to update |
| 🟢 | ~~`@types/json-schema`~~ | 7.0.15 | 7.0.15 | 2 years old | NONE | 1 | Up to date |
| 🟡 | `zod` | 4.3.6 | 4.4.3 | 3 months old | MINOR | 1 | Should update |
| 🟡 | `@sap-ai-sdk/foundation-models` | 2.9.0 | 2.10.0 | 1 month old | MINOR | 1 | Should update |
| 🟡 | `@sap-ai-sdk/langchain` | 2.9.0 | 2.10.0 | 1 month old | MINOR | 1 | Should update |
| 🟢 | `promptfoo` | 0.121.3 | 0.121.10 | 1 month old | PATCH | 1 | Safe to update |
| 🟢 | ~~`@langchain/mcp-adapters`~~ | 1.1.3 | 1.1.3 | 2 months old | NONE | 1 | Up to date |
| 🟢 | `@langchain/core` | 1.1.40 | 1.1.45 | 22 days old | PATCH | 1 | Safe to update |
| 🟢 | ~~`@sap-devx/feature-toggle-node`~~ | 2.1.0 | 2.1.0 | 2 months old | NONE | 1 | Up to date |
| 🟢 | ~~`deepmerge`~~ | 4.3.1 | 4.3.1 | 3 years old | NONE | 1 | Up to date |
| 🟢 | `odata-query` | 8.0.5 | 8.0.7 | 7 months old | PATCH | 1 | Safe to update |
| 🟢 | ~~`prettify-xml`~~ | 1.2.0 | 1.2.0 | 8 years old | NONE | 2 | Up to date |
| 🟢 | ~~`jsonc-parser`~~ | 3.3.1 | 3.3.1 | 1 year old | NONE | 3 | Up to date |
| 🔴 | `figures` | 3.2.0 | 6.1.0 | 6 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`fuzzy`~~ | 0.1.3 | 0.1.3 | 9 years old | NONE | 1 | Up to date |
| 🔴 | `jest-environment-jsdom` | 29.7.0 | 30.4.0 | 2 years old | MAJOR | 3 | Review required |
| 🟢 | ~~`tsconfig-paths`~~ | 4.2.0 | 4.2.0 | 3 years old | NONE | 1 | Up to date |
| 🟢 | `@ui5/cli` | 4.0.49 | 4.0.52 | 1 month old | PATCH | 3 | Safe to update |
| 🟡 | `@ui5/project` | 3.9.0 || ^4.0.11 | 4.0.15 | unknown | MAJOR | 1 | Should update |
| 🟢 | ~~`dir-compare`~~ | 5.0.0 | 5.0.0 | 2 years old | NONE | 1 | Up to date |
| 🔴 | `filenamify` | 4.3.0 | 7.0.1 | 5 years old | MAJOR | 1 | Review required |
| 🟡 | `jest-diff` | 30.2.0 | 30.4.0 | 7 months old | MINOR | 1 | Should update |
| 🟡 | `minimatch` | 3.1.5 | 10.2.5 | 2 months old | MAJOR | 1 | Should update |
| 🟡 | `jest-environment-node` | 30.2.0 | 30.4.0 | 7 months old | MINOR | 1 | Should update |
| 🟡 | `puppeteer-core` | 24.40.0 | 24.43.0 | 1 month old | MINOR | 1 | Should update |
| 🟢 | ~~`which`~~ | 6.0.1 | 6.0.1 | 2 months old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/yargs-parser`~~ | 21.0.3 | 21.0.3 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`winston`~~ | 3.19.0 | 3.19.0 | 5 months old | NONE | 1 | Up to date |
| 🟢 | ~~`winston-transport`~~ | 4.9.0 | 4.9.0 | 1 year old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/debug`~~ | 4.1.13 | 4.1.13 | 1 month old | NONE | 1 | Up to date |
| 🟢 | ~~`axios-logger`~~ | 2.8.1 | 2.8.1 | 1 year old | NONE | 1 | Up to date |
| 🟢 | ~~`circular-reference-remover`~~ | 2.1.0 | 2.1.0 | 4 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@sap-ux/logger`~~ | 0.8.5 | 0.8.5 | 29 days old | NONE | 1 | Up to date |
| 🟢 | ~~`jest-dev-server`~~ | 11.0.0 | 11.0.0 | 1 year old | NONE | 2 | Up to date |
| 🟢 | ~~`folder-hash`~~ | 4.1.2 | 4.1.2 | 2 months old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/folder-hash`~~ | 4.0.4 | 4.0.4 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`promisify-child-process`~~ | 5.0.1 | 5.0.1 | 3 months old | NONE | 1 | Up to date |
| 🟢 | ~~`qrcode`~~ | 1.5.4 | 1.5.4 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `@sap-ux-private/playwright` | 0.2.15 | unknown | unknown | UNKNOWN | 1 | Manual check required |
| 🟢 | ~~`@types/qrcode`~~ | 1.5.6 | 1.5.6 | 6 months old | NONE | 1 | Up to date |
| 🟡 | `@sapui5/types` | 1.120.5 | 1.147.2 | 2 years old | MINOR | 1 | Should update |
| 🟢 | `ui5-tooling-modules` | 3.35.0 | 3.35.2 | 1 month old | PATCH | 1 | Safe to update |
| 🟢 | ~~`ui5-tooling-transpile`~~ | 3.11.0 | 3.11.0 | 1 month old | NONE | 1 | Up to date |
| 🟡 | `@ui5/manifest` | 1.85.0 | 1.86.0 | 28 days old | MINOR | 3 | Should update |
| 🟢 | ~~`findit2`~~ | 2.2.3 | 2.2.3 | 11 years old | NONE | 1 | Up to date |
| 🟢 | ~~`json-parse-even-better-errors`~~ | 5.0.0 | 5.0.0 | 6 months old | NONE | 1 | Up to date |
| 🟢 | ~~`vscode-uri`~~ | 3.1.0 | 3.1.0 | 1 year old | NONE | 3 | Up to date |
| 🟢 | ~~`validate-npm-package-name`~~ | 7.0.2 | 7.0.2 | 4 months old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/validate-npm-package-name`~~ | 4.0.2 | 4.0.2 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`lz-string`~~ | 1.5.0 | 1.5.0 | 3 years old | NONE | 1 | Up to date |
| 🟢 | ~~`connect-livereload`~~ | 0.6.1 | 0.6.1 | 7 years old | NONE | 1 | Up to date |
| 🟢 | ~~`livereload`~~ | 0.10.3 | 0.10.3 | 8 months old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/connect-livereload`~~ | 0.6.3 | 0.6.3 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/livereload`~~ | 0.9.5 | 0.9.5 | 2 years old | NONE | 1 | Up to date |
| 🔴 | `yeoman-environment` | 3.19.3 | 6.1.0 | 2 years old | MAJOR | 2 | Review required |
| 🟢 | ~~`@types/normalize-path`~~ | 3.0.2 | 3.0.2 | 2 years old | NONE | 1 | Up to date |
| 🟡 | `@zowe/secrets-for-zowe-sdk` | 8.29.4 | 8.32.0 | 5 months old | MINOR | 2 | Should update |
| 🟢 | ~~`normalize-path`~~ | 3.0.0 | 3.0.0 | 8 years old | NONE | 1 | Up to date |
| 🟡 | `@vscode/vsce` | 3.7.1 | 3.9.1 | 5 months old | MINOR | 1 | Should update |
| 🟢 | ~~`@testing-library/user-event`~~ | 14.6.1 | 14.6.1 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `serve-static` | 1.16.2 | 2.2.1 | 1 year old | MAJOR | 1 | Review required |
| 🔴 | `@types/serve-static` | 1.15.5 | 2.2.0 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`pluralize`~~ | 8.0.0 | 8.0.0 | 6 years old | NONE | 1 | Up to date |
| 🟢 | ~~`reflect-metadata`~~ | 0.2.2 | 0.2.2 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/pluralize`~~ | 0.0.33 | 0.0.33 | 2 years old | NONE | 1 | Up to date |
| 🟢 | `@types/qs` | 6.15.0 | 6.15.1 | 2 months old | PATCH | 1 | Safe to update |
| 🔴 | `fast-check` | 2.25.0 | 4.7.0 | 4 years old | MAJOR | 1 | Review required |
| 🔴 | `applicationinsights` | 2.9.8 | 3.14.0 | 8 months old | MAJOR | 1 | Review required |
| 🟢 | ~~`performance-now`~~ | 2.1.0 | 2.1.0 | 9 years old | NONE | 1 | Up to date |
| 🟢 | ~~`vscode-languageserver-types`~~ | 3.17.5 | 3.17.5 | 2 years old | NONE | 1 | Up to date |
| 🔴 | `react-movable` | 2.5.4 | 3.4.1 | 5 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`@types/enzyme`~~ | 3.10.19 | 3.10.19 | 1 year old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/enzyme-adapter-react-16`~~ | 1.0.9 | 1.0.9 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/react-virtualized`~~ | 9.22.3 | 9.22.3 | 7 months old | NONE | 1 | Up to date |
| 🟡 | `babel-jest` | 30.3.0 | 30.4.0 | 1 month old | MINOR | 2 | Should update |
| 🟢 | ~~`enzyme`~~ | 3.11.0 | 3.11.0 | 6 years old | NONE | 1 | Up to date |
| 🟢 | ~~`enzyme-adapter-react-16`~~ | 1.15.8 | 1.15.8 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`require-from-string`~~ | 2.0.2 | 2.0.2 | 8 years old | NONE | 1 | Up to date |
| 🟡 | `@sap/subaccount-destination-service-provider` | 2.16.0 | 2.18.0 | 1 month old | MINOR | 1 | Should update |
| 🟡 | `ajv` | 8.18.0 | 8.20.0 | 2 months old | MINOR | 1 | Should update |
| 🟢 | `@sap-ux/ui5-middleware-fe-mockserver` | 2.4.10 | 2.4.13 | 2 months old | PATCH | 1 | Safe to update |
| 🟢 | ~~`@sap-ux/fe-mockserver-plugin-cds`~~ | 1.2.6 | 1.2.6 | 1 year old | NONE | 1 | Up to date |

</details>

---

## Recommendations

### Immediate Actions (This Sprint)

1. ✅ Apply all 28 **patch updates** - Low risk, high value
2. 🔍 Audit and resolve **version inconsistencies** for critical dependencies
3. 📝 Review breaking changes for top 5 critical dependencies

### Short Term (1-2 Months)

1. 🛠️ Update development tooling (linters, formatters, build tools)
2. 📦 Apply minor updates systematically
3. 🧪 Establish automated testing coverage before major updates

### Long Term (3-6 Months)

1. ⚛️ Plan migration strategy for critical framework updates
2. 🤖 Implement automated dependency update monitoring
3. 📅 Establish quarterly dependency review process

---

## Appendix

### Status Legend

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 | Up to date or patch update available | Safe to update |
| 🟡 | Minor update or recent major update | Review and update |
| 🔴 | Old major update (>6 months) or unknown | Requires careful review |

### Tools & Resources

- **npm view**: Check package information
- **pnpm outdated**: Check for outdated dependencies in specific package
- **pnpm -r outdated**: Check workspace-wide outdated dependencies
- **npm-check-updates**: Interactive update tool

### Regenerating This Report

```bash
# From repository root
node ./docs/dependencyManagement/generate-dependency-update-plan.cjs
```

### Success Metrics

- [ ] Zero dependencies >1 year old
- [ ] Zero version inconsistencies
- [ ] All security vulnerabilities resolved
- [ ] Automated dependency update process in place
- [ ] Quarterly dependency review cadence established

---

**Last Updated:** 2026-05-07
**Generated by:** dependency update automation script
