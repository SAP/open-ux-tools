# Dependency Update Plan

**Generated:** 2025-11-12
**Scope:** All dependencies (including @sap-ux/* packages)

---

## Executive Summary

### 📊 Overview Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Packages Analyzed** | 95 | - |
| **Total Unique External Dependencies** | 282 | 100% |
| **Dependencies Older Than 6 Months** | 225 | 79.8% |
| **Dependencies Older Than 6 Months with Updates Available** | 156 | 55.3% |
| **Major Updates Available** | 100 | 35.5% |
| **Minor Updates Available** | 47 | 16.7% |
| **Patch Updates Available** | 40 | 14.2% |
| **Up to Date** | 90 | 31.9% |
| **Version Inconsistencies** | 37 | 13.1% |

### 🎯 Update Priority Summary

- 🔴 **CRITICAL** (15 deps): Major updates affecting 10+ packages
- 🟠 **HIGH** (15 deps): Major updates affecting 5-9 packages
- 🟡 **MEDIUM** (70 deps): Other major updates or version conflicts
- 🟢 **LOW** (87 deps): Minor and patch updates
- ✅ **NONE** (90 deps): Already up to date

---

## Critical Findings

### Top 20 Most Critical Dependencies

| # | Dependency | Current | Latest | Age | Type | Packages | Risk | Effort |
|---|------------|---------|--------|-----|------|----------|------|--------|
| 1 | 🟢 ~~`findit2`~~ | 2.2.3 | 2.2.3 | 11 years old | NONE | 1 | VERY LOW | 0.5h |
| 2 | 🟢 ~~`mock-spawn`~~ | 0.2.6 | 0.2.6 | 10 years old | NONE | 3 | VERY LOW | 0.5h |
| 3 | 🟢 ~~`hasbin`~~ | 1.2.3 | 1.2.3 | 9 years old | NONE | 3 | VERY LOW | 0.5h |
| 4 | 🟢 ~~`fuzzy`~~ | 0.1.3 | 0.1.3 | 9 years old | NONE | 1 | VERY LOW | 0.5h |
| 5 | 🟢 ~~`performance-now`~~ | 2.1.0 | 2.1.0 | 8 years old | NONE | 1 | VERY LOW | 0.5h |
| 6 | 🟢 ~~`redux-logger`~~ | 3.0.6 | 3.0.6 | 8 years old | NONE | 1 | VERY LOW | 0.5h |
| 7 | 🟢 ~~`prettify-xml`~~ | 1.2.0 | 1.2.0 | 8 years old | NONE | 1 | VERY LOW | 0.5h |
| 8 | 🟢 ~~`yamljs`~~ | 0.3.0 | 0.3.0 | 8 years old | NONE | 1 | VERY LOW | 0.5h |
| 9 | 🟢 ~~`detect-content-type`~~ | 1.2.0 | 1.2.0 | 7 years old | NONE | 1 | VERY LOW | 0.5h |
| 10 | 🟢 ~~`require-from-string`~~ | 2.0.2 | 2.0.2 | 7 years old | NONE | 1 | VERY LOW | 0.5h |
| 11 | 🟢 ~~`normalize-path`~~ | 3.0.0 | 3.0.0 | 7 years old | NONE | 1 | VERY LOW | 0.5h |
| 12 | 🔴 `@types/mem-fs` | 1.1.2 | 2.2.0 | 6 years old | MAJOR | 31 | CRITICAL | 8-16h |
| 13 | 🟢 ~~`connect-livereload`~~ | 0.6.1 | 0.6.1 | 6 years old | NONE | 1 | VERY LOW | 0.5h |
| 14 | 🟢 `@types/normalize-path` | 3.0.0 | 3.0.2 | 6 years old | PATCH | 1 | VERY LOW | 0.5-1h |
| 15 | 🟡 `reflect-metadata` | 0.1.13 | 0.2.2 | 6 years old | MINOR | 1 | LOW | 1-2h |
| 16 | 🟢 ~~`xml-js`~~ | 1.6.11 | 1.6.11 | 6 years old | NONE | 1 | VERY LOW | 0.5h |
| 17 | 🟢 `@types/redux-logger` | 3.0.7 | 3.0.13 | 6 years old | PATCH | 1 | VERY LOW | 0.5-1h |
| 18 | 🟢 `glob-gitignore` | 1.0.14 | 1.0.15 | 6 years old | PATCH | 1 | VERY LOW | 0.5-1h |
| 19 | 🟢 `@types/source-map-support` | 0.5.0 | 0.5.10 | 6 years old | PATCH | 1 | VERY LOW | 0.5-1h |
| 20 | 🟢 ~~`connect`~~ | 3.7.0 | 3.7.0 | 6 years old | NONE | 2 | VERY LOW | 0.5h |

---

## Update Breakdown by Type

### 🔴 Major Updates (100 dependencies)

Major version updates may include breaking changes. Review changelogs and test thoroughly.

#### CRITICAL Priority (15 dependencies)

| Status | Dependency | Current → Latest | Age | Packages Affected | Changelog |
|--------|------------|------------------|-----|-------------------|------------|
| 🔴 | `@types/mem-fs` | 1.1.2 → 2.2.0 | 6 years old | 31 | N/A |
| 🔴 | `npm-run-all2` | 5.0.0 → 8.0.4 | 5 years old | 22 | [Link](https://github.com/bcomnes/npm-run-all2) |
| 🔴 | `inquirer` | 8.0.0 → 12.11.1 | 4 years old | 11 | [Link](https://github.com/SBoudrias/Inquirer.js) |
| 🔴 | `mem-fs` | 2.1.0 → 4.1.2 | 4 years old | 28 | [Link](https://github.com/SBoudrias/mem-fs) |
| 🔴 | `fs-extra` | 10.0.0 → 11.3.2 | 4 years old | 15 | [Link](https://github.com/jprichardson/node-fs-extra) |
| 🔴 | `@types/mem-fs-editor` | 7.0.1 → 10.0.1 | 4 years old | 35 | N/A |
| 🔴 | `mem-fs-editor` | 9.4.0 → 11.1.4 | 3 years old | 32 | [Link](https://github.com/SBoudrias/mem-fs-editor) |
| 🔴 | `yeoman-test` | 6.3.0 → 11.1.0 | 3 years old | 12 | [Link](https://github.com/yeoman/yeoman-test) |
| 🔴 | `@types/yeoman-generator` | 5.2.11 → 6.0.0 | 3 years old | 13 | N/A |
| 🔴 | `yeoman-generator` | 5.10.0 → 7.5.1 | 2 years old | 13 | [Link](https://github.com/yeoman/generator) |
| 🔴 | `@types/yeoman-environment` | 2.10.11 → 4.0.0 | 2 years old | 11 | N/A |
| 🔴 | `@types/yeoman-test` | 4.0.6 → 7.0.0 | 2 years old | 12 | N/A |
| 🔴 | `nock` | 13.4.0 → 14.0.10 | 1 year old | 10 | [Link](https://github.com/nock/nock) |
| 🟡 | `jest-extended` | 6.0.0 → 7.0.0 | 5 months old | 10 | [Link](https://github.com/jest-community/jest-extended) |
| 🟡 | `@types/inquirer` | 8.0.0 → 9.0.9 | unknown | 23 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |

#### HIGH Priority (15 dependencies)

| Status | Dependency | Current → Latest | Age | Packages Affected | Changelog |
|--------|------------|------------------|-----|-------------------|------------|
| 🔴 | `js-yaml` | 3.14.0 → 4.1.1 | 5 years old | 5 | [Link](https://github.com/nodeca/js-yaml) |
| 🔴 | `react` | 16.14.0 → 19.2.0 | 5 years old | 5 | [Link](https://github.com/facebook/react) |
| 🔴 | `react-dom` | 16.14.0 → 19.2.0 | 5 years old | 5 | [Link](https://github.com/facebook/react) |
| 🔴 | `os-name` | 4.0.1 → 6.1.0 | 4 years old | 6 | [Link](https://github.com/sindresorhus/os-name) |
| 🔴 | `chalk` | 4.1.2 → 5.6.2 | 4 years old | 8 | [Link](https://github.com/chalk/chalk) |
| 🔴 | `memfs` | 3.3.0 → 4.51.0 | 4 years old | 8 | [Link](https://github.com/streamich/memfs) |
| 🔴 | `@types/supertest` | 2.0.12 → 6.0.3 | 3 years old | 6 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `dotenv` | 16.3.1 → 17.2.3 | 2 years old | 9 | [Link](git://github.com/motdotla/dotenv) |
| 🔴 | `inquirer-autocomplete-prompt` | 2.0.1 → 3.0.1 | 2 years old | 6 | [Link](ssh://git@github.com/mokkabonna/inquirer-autocomplete-prompt) |
| 🔴 | `@types/inquirer-autocomplete-prompt` | 2.0.2 → 3.0.3 | 2 years old | 7 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/express` | 4.17.21 → 5.0.5 | 2 years old | 7 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/react-dom` | 16.9.24 → 19.2.3 | 1 year old | 5 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/react` | 16.14.55 → 19.2.4 | 1 year old | 5 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `fast-xml-parser` | 4.3.4 → 5.3.1 | 1 year old | 6 | [Link](https://github.com/NaturalIntelligence/fast-xml-parser) |
| 🔴 | `uuid` | 10.0.0 → 13.0.0 | 1 year old | 5 | [Link](https://github.com/uuidjs/uuid) |

#### MEDIUM Priority (70 dependencies)

<details>
<summary>Click to expand (70 dependencies)</summary>

| Status | Dependency | Current → Latest | Age | Packages Affected | Changelog |
|--------|------------|------------------|-----|-------------------|------------|
| 🔴 | `redux` | 4.0.4 → 5.0.1 | 6 years old | 2 | [Link](https://github.com/reduxjs/redux) |
| 🔴 | `which` | 2.0.2 → 6.0.0 | 5 years old | 1 | [Link](https://github.com/npm/node-which) |
| 🔴 | `read-pkg-up` | 7.0.1 → 11.0.0 | 5 years old | 3 | [Link](https://github.com/sindresorhus/read-pkg-up) |
| 🔴 | `ts-import-plugin` | 1.6.3 → 3.0.0 | 5 years old | 1 | [Link](ssh://git@github.com/Brooooooklyn/ts-import-plugin) |
| 🔴 | `figures` | 3.2.0 → 6.1.0 | 5 years old | 1 | [Link](https://github.com/sindresorhus/figures) |
| 🔴 | `open` | 7.0.3 → 10.2.0 | 5 years old | 1 | [Link](https://github.com/sindresorhus/open) |
| 🔴 | `mkdirp` | 1.0.4 → 3.0.1 | 5 years old | 2 | [Link](https://github.com/isaacs/node-mkdirp) |
| 🔴 | `filenamify` | 4.2.0 → 7.0.1 | 5 years old | 1 | [Link](https://github.com/sindresorhus/filenamify) |
| 🔴 | `react-markdown` | 5.0.2 → 10.1.0 | 5 years old | 2 | [Link](https://github.com/remarkjs/react-markdown) |
| 🔴 | `cross-env` | 7.0.3 → 10.1.0 | 4 years old | 3 | [Link](https://github.com/kentcdodds/cross-env) |
| 🔴 | `chevrotain` | 7.1.1 → 11.0.3 | 4 years old | 2 | [Link](git://github.com/Chevrotain/chevrotain) |
| 🔴 | `react-movable` | 2.5.4 → 3.4.1 | 4 years old | 1 | [Link](https://github.com/tajo/react-movable) |
| 🔴 | `@reduxjs/toolkit` | 1.6.1 → 2.10.1 | 4 years old | 2 | [Link](https://github.com/reduxjs/redux-toolkit) |
| 🔴 | `yeoman-environment` | 3.8.0 → 5.0.0 | 4 years old | 2 | [Link](https://github.com/yeoman/environment) |
| 🔴 | `prettier` | 2.5.1 → 3.6.2 | 3 years old | 3 | [Link](https://github.com/prettier/prettier) |
| 🔴 | `xml-formatter` | 2.6.1 → 3.6.7 | 3 years old | 1 | [Link](https://github.com/chrisbottin/xml-formatter) |
| 🔴 | `minimatch` | 3.0.5 → 10.1.1 | 3 years old | 1 | [Link](ssh://git@github.com/isaacs/minimatch) |
| 🔴 | `@testing-library/react` | 12.1.5 → 16.3.0 | 3 years old | 4 | [Link](https://github.com/testing-library/react-testing-library) |
| 🔴 | `https-proxy-agent` | 5.0.1 → 7.0.6 | 3 years old | 3 | [Link](https://github.com/TooTallNate/proxy-agents) |
| 🔴 | `fast-check` | 2.25.0 → 4.3.0 | 3 years old | 1 | [Link](https://github.com/dubzzz/fast-check) |
| 🔴 | `diff` | 5.1.0 → 8.0.2 | 3 years old | 1 | [Link](git://github.com/kpdecker/jsdiff) |
| 🔴 | `commander` | 9.4.0 → 14.0.2 | 3 years old | 2 | [Link](https://github.com/tj/commander.js) |
| 🔴 | `yargs-parser` | 21.1.1 → 22.0.0 | 3 years old | 2 | [Link](https://github.com/yargs/yargs-parser) |
| 🔴 | `react-redux` | 7.2.9 → 9.2.0 | 3 years old | 2 | [Link](https://github.com/reduxjs/react-redux) |
| 🔴 | `validate-npm-package-name` | 5.0.0 → 7.0.0 | 3 years old | 1 | [Link](https://github.com/npm/validate-npm-package-name) |
| 🔴 | `ignore` | 5.2.4 → 7.0.5 | 2 years old | 1 | [Link](ssh://git@github.com/kaelzhang/node-ignore) |
| 🔴 | `husky` | 8.0.3 → 9.1.7 | 2 years old | 1 | [Link](https://github.com/typicode/husky) |
| 🔴 | `@typescript-eslint/eslint-plugin` | 5.59.0 → 8.46.4 | 2 years old | 3 | [Link](https://github.com/typescript-eslint/typescript-eslint) |
| 🔴 | `@typescript-eslint/parser` | 5.59.0 → 8.46.4 | 2 years old | 3 | [Link](https://github.com/typescript-eslint/typescript-eslint) |
| 🔴 | `style-loader` | 3.3.3 → 4.0.0 | 2 years old | 3 | [Link](https://github.com/webpack-contrib/style-loader) |
| 🔴 | `@ui5/fs` | 3.0.4 → 4.0.3 | 2 years old | 1 | [Link](ssh://git@github.com/SAP/ui5-fs) |
| 🔴 | `css-loader` | 6.8.1 → 7.1.2 | 2 years old | 3 | [Link](https://github.com/webpack-contrib/css-loader) |
| 🔴 | `@types/prettier` | 2.7.3 → 3.0.0 | 2 years old | 1 | N/A |
| 🔴 | `sass-loader` | 13.3.2 → 16.0.6 | 2 years old | 3 | [Link](https://github.com/webpack/sass-loader) |
| 🔴 | `babel-loader` | 9.1.3 → 10.0.0 | 2 years old | 3 | [Link](https://github.com/babel/babel-loader) |
| 🔴 | `@testing-library/jest-dom` | 5.17.0 → 6.9.1 | 2 years old | 4 | [Link](https://github.com/testing-library/jest-dom) |
| 🔴 | `jest-environment-jsdom` | 29.7.0 → 30.2.0 | 2 years old | 3 | [Link](https://github.com/jestjs/jest) |
| 🔴 | `@testing-library/dom` | 9.3.3 → 10.4.1 | 2 years old | 2 | [Link](https://github.com/testing-library/dom-testing-library) |
| 🔴 | `eslint-plugin-storybook` | 0.6.15 → 10.0.7 | 2 years old | 3 | [Link](https://github.com/storybookjs/storybook) |
| 🔴 | `@types/archiver` | 5.3.4 → 7.0.0 | 2 years old | 1 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/serve-static` | 1.15.5 → 2.2.0 | 2 years old | 1 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/diff` | 5.0.9 → 8.0.0 | 1 year old | 2 | N/A |
| 🔴 | `tsconfig-paths` | 3.15.0 → 4.2.0 | 1 year old | 1 | [Link](https://github.com/dividab/tsconfig-paths) |
| 🔴 | `eslint-plugin-jsdoc` | 46.10.1 → 61.2.0 | 1 year old | 1 | [Link](https://github.com/gajus/eslint-plugin-jsdoc) |
| 🔴 | `pretty-quick` | 3.3.1 → 4.2.2 | 1 year old | 1 | [Link](https://github.com/prettier/pretty-quick) |
| 🔴 | `marked` | 12.0.0 → 17.0.0 | 1 year old | 1 | [Link](git://github.com/markedjs/marked) |
| 🔴 | `jest-dev-server` | 10.0.0 → 11.0.0 | 1 year old | 2 | [Link](https://github.com/argos-ci/jest-puppeteer) |
| 🔴 | `@sap/cds-compiler` | 4.8.0 → 6.4.6 | 1 year old | 1 | N/A |
| 🔴 | `eslint-plugin-sonarjs` | 0.25.1 → 3.0.5 | 1 year old | 1 | [Link](https://github.com/SonarSource/SonarJS) |
| 🔴 | `@types/uuid` | 10.0.0 → 11.0.0 | 1 year old | 4 | N/A |
| 🔴 | `eslint-plugin-promise` | 6.6.0 → 7.2.1 | 1 year old | 1 | [Link](https://github.com/eslint-community/eslint-plugin-promise) |
| 🔴 | `puppeteer-core` | 22.15.0 → 24.29.1 | 1 year old | 1 | [Link](https://github.com/puppeteer/puppeteer.git#main) |
| 🔴 | `json-parse-even-better-errors` | 4.0.0 → 5.0.0 | 1 year old | 1 | [Link](https://github.com/npm/json-parse-even-better-errors) |
| 🔴 | `body-parser` | 1.20.3 → 2.2.0 | 1 year old | 1 | [Link](https://github.com/expressjs/body-parser) |
| 🔴 | `serve-static` | 1.16.2 → 2.2.0 | 1 year old | 1 | [Link](https://github.com/expressjs/serve-static) |
| 🔴 | `@storybook/react` | 8.4.2 → 10.0.7 | 1 year old | 3 | [Link](https://github.com/storybookjs/storybook) |
| 🔴 | `@storybook/react-webpack5` | 8.4.2 → 10.0.7 | 1 year old | 3 | [Link](https://github.com/storybookjs/storybook) |
| 🔴 | `storybook` | 8.4.2 → 10.0.7 | 1 year old | 3 | [Link](https://github.com/storybookjs/storybook) |
| 🔴 | `react-i18next` | 15.4.1 → 16.3.1 | 8 months old | 2 | [Link](https://github.com/i18next/react-i18next) |
| 🔴 | `http-proxy-middleware` | 2.0.9 → 3.0.5 | 7 months old | 3 | [Link](https://github.com/chimurai/http-proxy-middleware) |
| 🔴 | `eslint-import-resolver-typescript` | 3.10.1 → 4.4.4 | 6 months old | 1 | [Link](https://github.com/import-js/eslint-import-resolver-typescript) |
| 🟡 | `eslint-config-prettier` | 8.10.2 → 10.1.8 | 3 months old | 1 | [Link](https://github.com/prettier/eslint-config-prettier) |
| 🟡 | `eslint-plugin-prettier` | 4.2.5 → 5.5.4 | 3 months old | 1 | [Link](https://github.com/prettier/eslint-plugin-prettier) |
| 🟡 | `@langchain/mcp-adapters` | 0.6.0 → 1.0.0 | 3 months old | 1 | [Link](ssh://git@github.com/langchain-ai/langchainjs) |
| 🟡 | `update-ts-references` | 3.6.2 → 4.0.0 | 3 months old | 1 | [Link](https://github.com/eBayClassifiedsGroup/update-ts-references) |
| 🟡 | `applicationinsights` | 2.9.8 → 3.12.0 | 3 months old | 1 | [Link](https://github.com/microsoft/ApplicationInsights-node.js) |
| 🟡 | `@langchain/core` | 0.3.75 → 1.0.4 | 2 months old | 1 | [Link](ssh://git@github.com/langchain-ai/langchainjs) |
| 🟡 | `@types/node` | 18.19.130 → 24.10.1 | 1 month old | 2 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🟡 | `nx` | 21.6.5 → 22.0.3 | 28 days old | 1 | [Link](https://github.com/nrwl/nx) |
| 🟡 | `@ui5/project` | 3.9.0 || ^4.0.0 → 4.0.8 | unknown | 1 | [Link](ssh://git@github.com/SAP/ui5-project) |

</details>

### 🟡 Minor Updates (47 dependencies)

Minor version updates include new features but should be backward compatible.

<details>
<summary>Click to expand (47 dependencies)</summary>

| Status | Dependency | Current → Latest | Age | Packages Affected |
|--------|------------|------------------|-----|-------------------|
| 🟡 | `esbuild` | 0.25.11 → 0.27.0 | 28 days old | 2 |
| 🟡 | `rimraf` | 6.0.1 → 6.1.0 | 1 year old | 19 |
| 🟡 | `axios` | 1.12.2 → 1.13.2 | 1 month old | 15 |
| 🟡 | `sanitize-html` | 2.12.1 → 2.17.0 | 1 year old | 2 |
| 🟡 | `@babel/preset-react` | 7.27.1 → 7.28.5 | 6 months old | 3 |
| 🟡 | `@babel/preset-typescript` | 7.27.1 → 7.28.5 | 6 months old | 3 |
| 🟡 | `@storybook/components` | 8.4.2 → 8.6.14 | 1 year old | 2 |
| 🟡 | `@types/sanitize-html` | 2.11.0 → 2.16.0 | 1 year old | 2 |
| 🟡 | `@types/ws` | 8.5.12 → 8.18.1 | 1 year old | 1 |
| 🟡 | `eslint-plugin-react` | 7.33.2 → 7.37.5 | 2 years old | 4 |
| 🟡 | `sass` | 1.66.1 → 1.94.0 | 2 years old | 3 |
| 🟡 | `ts-loader` | 9.4.4 → 9.5.4 | 2 years old | 3 |
| 🟡 | `i18next` | 25.3.0 → 25.6.2 | 4 months old | 45 |
| 🟡 | `@sap-devx/yeoman-ui-types` | 1.14.4 → 1.20.2 | 1 year old | 21 |
| 🟡 | `unionfs` | 4.4.0 → 4.6.0 | 5 years old | 8 |
| 🟡 | `semver` | 7.5.4 → 7.7.3 | 2 years old | 18 |
| 🟡 | `@types/lodash` | 4.14.202 → 4.17.20 | 1 year old | 16 |
| 🟡 | `@types/semver` | 7.5.2 → 7.7.1 | 2 years old | 18 |
| 🟡 | `@jest/types` | 30.0.0 → 30.2.0 | 5 months old | 6 |
| 🟡 | `@types/vscode` | 1.102.0 → 1.106.0 | 4 months old | 10 |
| 🟡 | `qs` | 6.11.0 → 6.14.0 | 3 years old | 1 |
| 🟡 | `yaml` | 2.2.2 → 2.8.1 | 2 years old | 5 |
| 🟡 | `@fluentui/react` | 8.120.5 → 8.125.1 | 1 year old | 2 |
| 🟡 | `@fluentui/react-hooks` | 8.6.14 → 8.10.1 | 2 years old | 1 |
| 🟡 | `tsx` | 4.7.0 → 4.20.6 | 1 year old | 1 |
| 🟡 | `logform` | 2.4.0 → 2.7.0 | 3 years old | 2 |
| 🟡 | `@modelcontextprotocol/sdk` | 1.17.5 → 1.21.1 | 2 months old | 1 |
| 🟡 | `@sap/ux-specification` | 1.136.6 → 1.139.0 | 1 month old | 1 |
| 🟡 | `@sap-ai-sdk/foundation-models` | 2.0.0 → 2.1.0 | 1 month old | 1 |
| 🟡 | `@sap-ai-sdk/langchain` | 2.0.0 → 2.1.0 | 1 month old | 1 |
| 🟡 | `promptfoo` | 0.118.6 → 0.119.6 | 1 month old | 1 |
| 🟡 | `jsonc-parser` | 3.2.0 → 3.3.1 | 3 years old | 3 |
| 🟡 | `winston` | 3.11.0 → 3.18.3 | 2 years old | 1 |
| 🟡 | `winston-transport` | 4.7.0 → 4.9.0 | 1 year old | 1 |
| 🟡 | `folder-hash` | 4.0.4 → 4.1.1 | 2 years old | 1 |
| 🟡 | `@sapui5/types` | 1.120.5 → 1.142.0 | 1 year old | 1 |
| 🟡 | `@ui5/manifest` | 1.76.0 → 1.80.0 | 4 months old | 2 |
| 🟡 | `vscode-uri` | 3.0.7 → 3.1.0 | 2 years old | 3 |
| 🟡 | `livereload` | 0.9.3 → 0.10.3 | 4 years old | 1 |
| 🟡 | `@zowe/secrets-for-zowe-sdk` | 8.1.2 → 8.29.1 | 1 year old | 2 |
| 🟡 | `@vscode/vsce` | 3.6.0 → 3.7.0 | 4 months old | 1 |
| 🟡 | `@testing-library/user-event` | 14.5.1 → 14.6.1 | 2 years old | 1 |
| 🟡 | `reflect-metadata` | 0.1.13 → 0.2.2 | 6 years old | 1 |
| 🟡 | `@types/qs` | 6.9.1 → 6.14.0 | 5 years old | 1 |
| 🟡 | `@types/react-virtualized` | 9.21.29 → 9.22.3 | 1 year old | 1 |
| 🟡 | `@types/i18next-fs-backend` | 1.1.2 → 1.2.0 | 4 years old | 1 |
| 🟡 | `@sap-ux/ui5-middleware-fe-mockserver` | 2.2.97 → 2.3.20 | 5 months old | 1 |

</details>

### 🟢 Patch Updates (40 dependencies)

Patch updates include bug fixes only. Safe to update with minimal risk.

<details>
<summary>Click to expand (40 dependencies)</summary>

| Status | Dependency | Current → Latest | Packages Affected |
|--------|------------|------------------|-------------------|
| 🟢 | `autoprefixer` | 10.4.21 → 10.4.22 | 1 |
| 🟢 | `knip` | 5.69.0 → 5.69.1 | 1 |
| 🟢 | `react-virtualized` | 9.22.5 → 9.22.6 | 2 |
| 🟢 | `@types/vinyl` | 2.0.7 → 2.0.12 | 3 |
| 🟢 | `@babel/core` | 7.28.0 → 7.28.5 | 3 |
| 🟢 | `@babel/preset-env` | 7.28.0 → 7.28.5 | 3 |
| 🟢 | `ws` | 8.18.0 → 8.18.3 | 1 |
| 🟢 | `fast-glob` | 3.3.1 → 3.3.3 | 3 |
| 🟢 | `adm-zip` | 0.5.10 → 0.5.16 | 4 |
| 🟢 | `@types/adm-zip` | 0.5.5 → 0.5.7 | 4 |
| 🟢 | `@types/ejs` | 3.1.2 → 3.1.5 | 11 |
| 🟢 | `@types/prompts` | 2.4.4 → 2.4.9 | 9 |
| 🟢 | `@sap-ux/annotation-converter` | 0.10.2 → 0.10.7 | 7 |
| 🟢 | `xpath` | 0.0.33 → 0.0.34 | 2 |
| 🟢 | `@xmldom/xmldom` | 0.8.10 → 0.8.11 | 2 |
| 🟢 | `@types/proxy-from-env` | 1.0.1 → 1.0.4 | 3 |
| 🟢 | `@types/http-proxy` | 1.17.5 → 1.17.17 | 1 |
| 🟢 | `@types/react-redux` | 7.1.33 → 7.1.34 | 2 |
| 🟢 | `@types/redux-logger` | 3.0.7 → 3.0.13 | 1 |
| 🟢 | `@types/remote-redux-devtools` | 0.5.4 → 0.5.8 | 1 |
| 🟢 | `@types/source-map-support` | 0.5.0 → 0.5.10 | 1 |
| 🟢 | `source-map-support` | 0.5.16 → 0.5.21 | 1 |
| 🟢 | `glob-gitignore` | 1.0.14 → 1.0.15 | 1 |
| 🟢 | `@types/minimist` | 1.2.2 → 1.2.5 | 1 |
| 🟢 | `vscode-languageserver-textdocument` | 1.0.11 → 1.0.12 | 3 |
| 🟢 | `@sap-ux/edmx-parser` | 0.9.1 → 0.9.6 | 3 |
| 🟢 | `@lancedb/lancedb` | 0.22.0 → 0.22.3 | 2 |
| 🟢 | `@types/json-schema` | 7.0.5 → 7.0.15 | 1 |
| 🟢 | `zod` | 4.1.5 → 4.1.12 | 1 |
| 🟢 | `axios-logger` | 2.8.0 → 2.8.1 | 1 |
| 🟢 | `portfinder` | 1.0.32 → 1.0.38 | 3 |
| 🟢 | `@types/qrcode` | 1.5.5 → 1.5.6 | 1 |
| 🟢 | `ui5-tooling-modules` | 3.33.0 → 3.33.6 | 1 |
| 🟢 | `@types/validate-npm-package-name` | 4.0.1 → 4.0.2 | 1 |
| 🟢 | `@types/normalize-path` | 3.0.0 → 3.0.2 | 1 |
| 🟢 | `@types/pluralize` | 0.0.30 → 0.0.33 | 1 |
| 🟢 | `vscode-languageserver-types` | 3.17.2 → 3.17.5 | 1 |
| 🟢 | `@types/enzyme` | 3.10.13 → 3.10.19 | 1 |
| 🟢 | `@types/enzyme-adapter-react-16` | 1.0.6 → 1.0.9 | 1 |
| 🟢 | `enzyme-adapter-react-16` | 1.15.7 → 1.15.8 | 1 |

</details>

---

## Version Inconsistencies

The following 37 dependencies have multiple versions in use across the workspace:

| Dependency | Versions in Use | Packages Affected | Recommended Action |
|------------|-----------------|-------------------|--------------------|
| `@types/node` | 18.19.130, 20.0.0 | 2 | Standardize to 24.10.1 |
| `@typescript-eslint/eslint-plugin` | 5.59.0, 7.1.1, 7.18.0 | 3 | Standardize to 8.46.4 |
| `@typescript-eslint/parser` | 5.59.0, 5.62.0, 7.18.0 | 3 | Standardize to 8.46.4 |
| `esbuild` | 0.25.11, 0.25.6 | 2 | Standardize to 0.27.0 |
| `eslint` | 8, 8.57.0, 8.57.1 | 2 | Standardize to 9.39.1 |
| `npm-run-all2` | 5.0.0, 6.2.0, 7.0.2, 8.0.4 | 22 | Standardize to 8.0.4 |
| `prettier` | 2.5.1, 2.8.8 | 3 | Standardize to 3.6.2 |
| ~~`react-select`~~ | 5.10.2, 5.8.0 | 2 | Standardize to 5.10.2 |
| `react-virtualized` | 9.22.5, 9.22.6 | 2 | Standardize to 9.22.6 |
| `inquirer` | 8.0.0, 8.2.7 | 11 | Standardize to 12.11.1 |
| `@types/inquirer` | 8.0.0, 8.2.6 | 23 | Standardize to 9.0.9 |
| `fast-xml-parser` | 4.3.4, 4.4.1 | 6 | Standardize to 5.3.1 |
| `@types/yeoman-environment` | 2.10.11, 2.10.8 | 11 | Standardize to 4.0.0 |
| `@types/yeoman-generator` | 5.2.11, 5.2.14 | 13 | Standardize to 6.0.0 |
| `@types/uuid` | 10.0.0, 3.4.11 | 4 | Standardize to 11.0.0 |
| `@sap-devx/yeoman-ui-types` | 1.14.4, 1.16.9 | 21 | Standardize to 1.20.2 |
| `memfs` | 3.3.0, 3.4.13 | 8 | Standardize to 4.51.0 |
| `semver` | 7.5.4, 7.6.3, 7.7.1 | 18 | Standardize to 7.7.3 |
| ~~`@types/fs-extra`~~ | 11.0.4, 9.0.13 | 15 | Standardize to 11.0.4 |
| `@types/semver` | 7.5.2, 7.5.4, 7.5.8, 7.7.0 | 18 | Standardize to 7.7.1 |
| `fs-extra` | 10.0.0, 11.1.1 | 15 | Standardize to 11.3.2 |
| `@jest/types` | 30.0.0, 30.0.1 | 6 | Standardize to 30.2.0 |
| `@types/vscode` | 1.102.0, 1.73.1 | 10 | Standardize to 1.106.0 |
| `adm-zip` | 0.5.10, 0.5.16 | 4 | Standardize to 0.5.16 |
| `js-yaml` | 3.14.0, 4.1.0 | 5 | Standardize to 4.1.1 |
| `uuid` | 10.0.0, 11.0.5, 3.4.0 | 5 | Standardize to 13.0.0 |
| `express` | 4, 4.21.2 | 7 | Standardize to 5.1.0 |
| `nock` | 13.4.0, 13.5.6 | 10 | Standardize to 14.0.10 |
| `@sap-ux/annotation-converter` | 0.10.2, 0.10.3 | 7 | Standardize to 0.10.7 |
| `https-proxy-agent` | 5.0.1, 7.0.5 | 3 | Standardize to 7.0.6 |
| `http-proxy-middleware` | 2.0.9, 3.0.5 | 3 | Standardize to 3.0.5 |
| `yaml` | 2.2.2, 2.3.3 | 5 | Standardize to 2.8.1 |
| `@testing-library/jest-dom` | 5.17.0, 6.4.8 | 4 | Standardize to 6.9.1 |
| `logform` | 2.4.0, 2.6.0 | 2 | Standardize to 2.7.0 |
| `@ui5/cli` | 4, 4.0.33 | 3 | Standardize to error |
| `@ui5/project` | 3.9.0 || ^4.0.0, 4.0.8 | 1 | Standardize to 4.0.8 |
| `jest-dev-server` | 10.0.0, 11.0.0 | 2 | Standardize to 11.0.0 |

---

## Phased Implementation Plan

### Phase 1: Foundation & Quick Wins (Weeks 1-3)

**Goal:** Apply low-risk updates and fix version inconsistencies

**Tasks:**
- Apply all 40 patch updates
- Resolve 37 version inconsistencies
- Update development tooling (linters, formatters)

**Estimated Effort:** 39h
**Risk Level:** LOW

### Phase 2: Medium Priority Major Updates (Weeks 4-7)

**Goal:** Update dependencies with <5 package impact

**Tasks:**
- Update 70 medium-priority major dependencies
- Apply 47 minor updates

**Estimated Effort:** 281h
**Risk Level:** MEDIUM

### Phase 3: High Priority Major Updates (Weeks 8-12)

**Goal:** Update dependencies affecting 5-9 packages

**Tasks:**
- Update 15 high-priority major dependencies
- Comprehensive testing after each update

**Estimated Effort:** 90h
**Risk Level:** HIGH

### Phase 4: Critical Legacy Updates (Weeks 13-18)

**Goal:** Update dependencies affecting 10+ packages

**Tasks:**
- Update 15 critical major dependencies
- May require incremental migration strategy
- Extensive testing and validation

**Estimated Effort:** 180h
**Risk Level:** CRITICAL

### Total Estimated Effort

**589 hours** across 12-18 weeks

---

## Detailed Dependency List

### All 282 Dependencies

<details>
<summary>Click to expand complete dependency list</summary>

| Status | Dependency | Current | Latest | Age | Type | Used In | Action |
|--------|------------|---------|--------|-----|------|---------|--------|
| 🟢 | ~~`@changesets/cli`~~ | 2.29.7 | 2.29.7 | 2 months old | NONE | 1 | Up to date |
| 🟢 | ~~`@playwright/test`~~ | 1.56.1 | 1.56.1 | 26 days old | NONE | 2 | Up to date |
| 🟢 | ~~`@types/jest`~~ | 30.0.0 | 30.0.0 | 4 months old | NONE | 1 | Up to date |
| 🟡 | `@types/node` | 18.19.130 | 24.10.1 | 1 month old | MAJOR | 2 | Should update |
| 🔴 | `@typescript-eslint/eslint-plugin` | 5.59.0 | 8.46.4 | 2 years old | MAJOR | 3 | Review required |
| 🔴 | `@typescript-eslint/parser` | 5.59.0 | 8.46.4 | 2 years old | MAJOR | 3 | Review required |
| 🟢 | `autoprefixer` | 10.4.21 | 10.4.22 | 8 months old | PATCH | 1 | Safe to update |
| 🟢 | ~~`check-dependency-version-consistency`~~ | 5.0.1 | 5.0.1 | 4 months old | NONE | 1 | Up to date |
| 🟡 | `esbuild` | 0.25.11 | 0.27.0 | 28 days old | MINOR | 2 | Should update |
| 🟢 | ~~`esbuild-sass-plugin`~~ | 3.3.1 | 3.3.1 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `eslint` | 8 | 9.39.1 | unknown | UNKNOWN | 2 | Manual check required |
| 🟡 | `eslint-config-prettier` | 8.10.2 | 10.1.8 | 3 months old | MAJOR | 1 | Should update |
| 🔴 | `eslint-import-resolver-typescript` | 3.10.1 | 4.4.4 | 6 months old | MAJOR | 1 | Review required |
| 🟢 | ~~`eslint-plugin-import`~~ | 2.32.0 | 2.32.0 | 4 months old | NONE | 1 | Up to date |
| 🔴 | `eslint-plugin-jsdoc` | 46.10.1 | 61.2.0 | 1 year old | MAJOR | 1 | Review required |
| 🟡 | `eslint-plugin-prettier` | 4.2.5 | 5.5.4 | 3 months old | MAJOR | 1 | Should update |
| 🔴 | `eslint-plugin-promise` | 6.6.0 | 7.2.1 | 1 year old | MAJOR | 1 | Review required |
| 🔴 | `eslint-plugin-sonarjs` | 0.25.1 | 3.0.5 | 1 year old | MAJOR | 1 | Review required |
| 🔴 | `husky` | 8.0.3 | 9.1.7 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`jest`~~ | 30.2.0 | 30.2.0 | 1 month old | NONE | 1 | Up to date |
| 🟢 | ~~`jest-sonar`~~ | 0.2.16 | 0.2.16 | 2 years old | NONE | 1 | Up to date |
| 🟢 | `knip` | 5.69.0 | 5.69.1 | 1 day old | PATCH | 1 | Safe to update |
| 🔴 | `npm-run-all2` | 5.0.0 | 8.0.4 | 5 years old | MAJOR | 22 | Review required |
| 🟡 | `nx` | 21.6.5 | 22.0.3 | 28 days old | MAJOR | 1 | Should update |
| 🟢 | ~~`postcss`~~ | 8.5.6 | 8.5.6 | 4 months old | NONE | 1 | Up to date |
| 🟢 | ~~`prebuild-install`~~ | 7.1.3 | 7.1.3 | 9 months old | NONE | 1 | Up to date |
| 🔴 | `prettier` | 2.5.1 | 3.6.2 | 3 years old | MAJOR | 3 | Review required |
| 🔴 | `pretty-quick` | 3.3.1 | 4.2.2 | 1 year old | MAJOR | 1 | Review required |
| 🟢 | ~~`react-select`~~ | 5.10.2 | 5.10.2 | 4 months old | NONE | 2 | Up to date |
| 🟢 | `react-virtualized` | 9.22.5 | 9.22.6 | 2 years old | PATCH | 2 | Safe to update |
| 🟡 | `rimraf` | 6.0.1 | 6.1.0 | 1 year old | MINOR | 19 | Should update |
| 🟢 | ~~`ts-jest`~~ | 29.4.5 | 29.4.5 | 1 month old | NONE | 3 | Up to date |
| 🟢 | ~~`typescript`~~ | 5.9.3 | 5.9.3 | 1 month old | NONE | 2 | Up to date |
| 🟡 | `update-ts-references` | 3.6.2 | 4.0.0 | 3 months old | MAJOR | 1 | Should update |
| 🔴 | `yargs-parser` | 21.1.1 | 22.0.0 | 3 years old | MAJOR | 2 | Review required |
| 🔴 | `inquirer` | 8.0.0 | 12.11.1 | 4 years old | MAJOR | 11 | Review required |
| 🔴 | `mem-fs` | 2.1.0 | 4.1.2 | 4 years old | MAJOR | 28 | Review required |
| 🔴 | `mem-fs-editor` | 9.4.0 | 11.1.4 | 3 years old | MAJOR | 32 | Review required |
| 🟡 | `@types/inquirer` | 8.0.0 | 9.0.9 | unknown | MAJOR | 23 | Should update |
| 🔴 | `@types/mem-fs` | 1.1.2 | 2.2.0 | 6 years old | MAJOR | 31 | Review required |
| 🔴 | `@types/mem-fs-editor` | 7.0.1 | 10.0.1 | 4 years old | MAJOR | 35 | Review required |
| 🟢 | `@types/vinyl` | 2.0.7 | 2.0.12 | 3 years old | PATCH | 3 | Safe to update |
| 🔴 | `dotenv` | 16.3.1 | 17.2.3 | 2 years old | MAJOR | 9 | Review required |
| 🔴 | `fast-xml-parser` | 4.3.4 | 5.3.1 | 1 year old | MAJOR | 6 | Review required |
| 🔴 | `yeoman-generator` | 5.10.0 | 7.5.1 | 2 years old | MAJOR | 13 | Review required |
| 🔴 | `@types/yeoman-environment` | 2.10.11 | 4.0.0 | 2 years old | MAJOR | 11 | Review required |
| 🔴 | `@types/yeoman-generator` | 5.2.11 | 6.0.0 | 3 years old | MAJOR | 13 | Review required |
| 🟡 | `axios` | 1.12.2 | 1.13.2 | 1 month old | MINOR | 15 | Should update |
| 🔴 | `react-markdown` | 5.0.2 | 10.1.0 | 5 years old | MAJOR | 2 | Review required |
| 🟡 | `sanitize-html` | 2.12.1 | 2.17.0 | 1 year old | MINOR | 2 | Should update |
| 🟢 | `@babel/core` | 7.28.0 | 7.28.5 | 4 months old | PATCH | 3 | Safe to update |
| 🟢 | ~~`@babel/helper-define-map`~~ | 7.18.6 | 7.18.6 | 3 years old | NONE | 3 | Up to date |
| 🟢 | `@babel/preset-env` | 7.28.0 | 7.28.5 | 4 months old | PATCH | 3 | Safe to update |
| 🟡 | `@babel/preset-react` | 7.27.1 | 7.28.5 | 6 months old | MINOR | 3 | Should update |
| 🟡 | `@babel/preset-typescript` | 7.27.1 | 7.28.5 | 6 months old | MINOR | 3 | Should update |
| 🟢 | `@storybook/addons` | 7.6.20 | 7.6.17 | 1 year old | NONE | 2 | Up to date |
| 🟡 | `@storybook/components` | 8.4.2 | 8.6.14 | 1 year old | MINOR | 2 | Should update |
| 🔴 | `@storybook/react` | 8.4.2 | 10.0.7 | 1 year old | MAJOR | 3 | Review required |
| 🔴 | `@storybook/react-webpack5` | 8.4.2 | 10.0.7 | 1 year old | MAJOR | 3 | Review required |
| 🔴 | `@types/react` | 16.14.55 | 19.2.4 | 1 year old | MAJOR | 5 | Review required |
| 🔴 | `@types/react-dom` | 16.9.24 | 19.2.3 | 1 year old | MAJOR | 5 | Review required |
| 🟡 | `@types/sanitize-html` | 2.11.0 | 2.16.0 | 1 year old | MINOR | 2 | Should update |
| 🔴 | `@types/uuid` | 10.0.0 | 11.0.0 | 1 year old | MAJOR | 4 | Review required |
| 🟡 | `@types/ws` | 8.5.12 | 8.18.1 | 1 year old | MINOR | 1 | Should update |
| 🔴 | `babel-loader` | 9.1.3 | 10.0.0 | 2 years old | MAJOR | 3 | Review required |
| 🟢 | ~~`copyfiles`~~ | 2.4.1 | 2.4.1 | 4 years old | NONE | 4 | Up to date |
| 🔴 | `css-loader` | 6.8.1 | 7.1.2 | 2 years old | MAJOR | 3 | Review required |
| 🟡 | `eslint-plugin-react` | 7.33.2 | 7.37.5 | 2 years old | MINOR | 4 | Should update |
| 🔴 | `eslint-plugin-storybook` | 0.6.15 | 10.0.7 | 2 years old | MAJOR | 3 | Review required |
| 🔴 | `react` | 16.14.0 | 19.2.0 | 5 years old | MAJOR | 5 | Review required |
| 🔴 | `react-dom` | 16.14.0 | 19.2.0 | 5 years old | MAJOR | 5 | Review required |
| 🟡 | `sass` | 1.66.1 | 1.94.0 | 2 years old | MINOR | 3 | Should update |
| 🔴 | `sass-loader` | 13.3.2 | 16.0.6 | 2 years old | MAJOR | 3 | Review required |
| 🔴 | `storybook` | 8.4.2 | 10.0.7 | 1 year old | MAJOR | 3 | Review required |
| 🟢 | ~~`storybook-addon-turbo-build`~~ | 2.0.1 | 2.0.1 | 2 years old | NONE | 3 | Up to date |
| 🔴 | `style-loader` | 3.3.3 | 4.0.0 | 2 years old | MAJOR | 3 | Review required |
| 🟡 | `ts-loader` | 9.4.4 | 9.5.4 | 2 years old | MINOR | 3 | Should update |
| 🟢 | ~~`ts-node`~~ | 10.9.2 | 10.9.2 | 1 year old | NONE | 4 | Up to date |
| 🟢 | `ws` | 8.18.0 | 8.18.3 | 1 year old | PATCH | 1 | Safe to update |
| 🟡 | `i18next` | 25.3.0 | 25.6.2 | 4 months old | MINOR | 45 | Should update |
| 🟡 | `@sap-devx/yeoman-ui-types` | 1.14.4 | 1.20.2 | 1 year old | MINOR | 21 | Should update |
| 🔴 | `inquirer-autocomplete-prompt` | 2.0.1 | 3.0.1 | 2 years old | MAJOR | 6 | Review required |
| 🔴 | `@types/inquirer-autocomplete-prompt` | 2.0.2 | 3.0.3 | 2 years old | MAJOR | 7 | Review required |
| 🔴 | `@types/yeoman-test` | 4.0.6 | 7.0.0 | 2 years old | MAJOR | 12 | Review required |
| 🔴 | `memfs` | 3.3.0 | 4.51.0 | 4 years old | MAJOR | 8 | Review required |
| 🟡 | `unionfs` | 4.4.0 | 4.6.0 | 5 years old | MINOR | 8 | Should update |
| 🔴 | `yeoman-test` | 6.3.0 | 11.1.0 | 3 years old | MAJOR | 12 | Review required |
| 🟢 | `fast-glob` | 3.3.1 | 3.3.3 | 2 years old | PATCH | 3 | Safe to update |
| 🟢 | ~~`lodash`~~ | 4.17.21 | 4.17.21 | 4 years old | NONE | 16 | Up to date |
| 🟡 | `semver` | 7.5.4 | 7.7.3 | 2 years old | MINOR | 18 | Should update |
| 🟢 | ~~`@types/fs-extra`~~ | 11.0.4 | 11.0.4 | 2 years old | NONE | 15 | Up to date |
| 🟡 | `@types/lodash` | 4.14.202 | 4.17.20 | 1 year old | MINOR | 16 | Should update |
| 🟡 | `@types/semver` | 7.5.2 | 7.7.1 | 2 years old | MINOR | 18 | Should update |
| 🔴 | `fs-extra` | 10.0.0 | 11.3.2 | 4 years old | MAJOR | 15 | Review required |
| 🟡 | `@jest/types` | 30.0.0 | 30.2.0 | 5 months old | MINOR | 6 | Should update |
| 🟡 | `@types/vscode` | 1.102.0 | 1.106.0 | 4 months old | MINOR | 10 | Should update |
| 🟢 | ~~`@vscode-logging/logger`~~ | 2.0.0 | 2.0.0 | 1 year old | NONE | 9 | Up to date |
| 🟢 | ~~`@sap/cf-tools`~~ | 3.2.2 | 3.2.2 | 1 year old | NONE | 6 | Up to date |
| 🟢 | `adm-zip` | 0.5.10 | 0.5.16 | 2 years old | PATCH | 4 | Safe to update |
| 🟢 | ~~`ejs`~~ | 3.1.10 | 3.1.10 | 1 year old | NONE | 12 | Up to date |
| 🔴 | `js-yaml` | 3.14.0 | 4.1.1 | 5 years old | MAJOR | 5 | Review required |
| 🟢 | ~~`prompts`~~ | 2.4.2 | 2.4.2 | 4 years old | NONE | 8 | Up to date |
| 🟢 | ~~`sanitize-filename`~~ | 1.6.3 | 1.6.3 | 6 years old | NONE | 1 | Up to date |
| 🔴 | `uuid` | 10.0.0 | 13.0.0 | 1 year old | MAJOR | 5 | Review required |
| 🟢 | `@types/adm-zip` | 0.5.5 | 0.5.7 | 1 year old | PATCH | 4 | Safe to update |
| 🟢 | `@types/ejs` | 3.1.2 | 3.1.5 | 2 years old | PATCH | 11 | Safe to update |
| 🔴 | `@types/express` | 4.17.21 | 5.0.5 | 2 years old | MAJOR | 7 | Review required |
| 🟢 | ~~`@types/js-yaml`~~ | 4.0.9 | 4.0.9 | 2 years old | NONE | 5 | Up to date |
| 🟢 | `@types/prompts` | 2.4.4 | 2.4.9 | 2 years old | PATCH | 9 | Safe to update |
| 🔴 | `@types/supertest` | 2.0.12 | 6.0.3 | 3 years old | MAJOR | 6 | Review required |
| 🔴 | `cross-env` | 7.0.3 | 10.1.0 | 4 years old | MAJOR | 3 | Review required |
| 🔴 | `express` | 4 | 5.1.0 | unknown | UNKNOWN | 7 | Manual check required |
| 🔴 | `nock` | 13.4.0 | 14.0.10 | 1 year old | MAJOR | 10 | Review required |
| 🟢 | ~~`supertest`~~ | 7.1.4 | 7.1.4 | 3 months old | NONE | 7 | Up to date |
| 🟢 | `@sap-ux/annotation-converter` | 0.10.2 | 0.10.7 | 9 months old | PATCH | 7 | Safe to update |
| 🟢 | ~~`@sap-ux/vocabularies-types`~~ | 0.13.0 | 0.13.0 | 10 months old | NONE | 5 | Up to date |
| 🔴 | `chalk` | 4.1.2 | 5.6.2 | 4 years old | MAJOR | 8 | Review required |
| 🟢 | ~~`detect-content-type`~~ | 1.2.0 | 1.2.0 | 7 years old | NONE | 1 | Up to date |
| 🔴 | `open` | 7.0.3 | 10.2.0 | 5 years old | MAJOR | 1 | Review required |
| 🟡 | `qs` | 6.11.0 | 6.14.0 | 3 years old | MINOR | 1 | Should update |
| 🟢 | `xpath` | 0.0.33 | 0.0.34 | 2 years old | PATCH | 2 | Safe to update |
| 🟢 | `@xmldom/xmldom` | 0.8.10 | 0.8.11 | 2 years old | PATCH | 2 | Safe to update |
| 🔴 | `https-proxy-agent` | 5.0.1 | 7.0.6 | 3 years old | MAJOR | 3 | Review required |
| 🟢 | ~~`http-proxy-agent`~~ | 7.0.2 | 7.0.2 | 1 year old | NONE | 1 | Up to date |
| 🟢 | ~~`proxy-from-env`~~ | 1.1.0 | 1.1.0 | 5 years old | NONE | 3 | Up to date |
| 🟢 | `@types/proxy-from-env` | 1.0.1 | 1.0.4 | 5 years old | PATCH | 3 | Safe to update |
| 🔴 | `http-proxy-middleware` | 2.0.9 | 3.0.5 | 7 months old | MAJOR | 3 | Review required |
| 🟢 | `@types/http-proxy` | 1.17.5 | 1.17.17 | 4 years old | PATCH | 1 | Safe to update |
| 🟡 | `yaml` | 2.2.2 | 2.8.1 | 2 years old | MINOR | 5 | Should update |
| 🟢 | ~~`connect`~~ | 3.7.0 | 3.7.0 | 6 years old | NONE | 2 | Up to date |
| 🟢 | ~~`@types/connect`~~ | 3.4.38 | 3.4.38 | 2 years old | NONE | 2 | Up to date |
| 🟢 | ~~`@sap/bas-sdk`~~ | 3.12.0 | 3.12.0 | 1 month old | NONE | 3 | Up to date |
| 🟢 | ~~`xml-js`~~ | 1.6.11 | 1.6.11 | 6 years old | NONE | 1 | Up to date |
| 🔴 | `chevrotain` | 7.1.1 | 11.0.3 | 4 years old | MAJOR | 2 | Review required |
| 🟢 | ~~`@sap/ux-cds-compiler-facade`~~ | 1.19.0 | 1.19.0 | 1 month old | NONE | 2 | Up to date |
| 🟢 | ~~`hasbin`~~ | 1.2.3 | 1.2.3 | 9 years old | NONE | 3 | Up to date |
| 🟢 | ~~`@types/hasbin`~~ | 1.2.2 | 1.2.2 | 2 years old | NONE | 3 | Up to date |
| 🟢 | ~~`@sap/mta-lib`~~ | 1.7.4 | 1.7.4 | 4 years old | NONE | 3 | Up to date |
| 🟢 | ~~`mta`~~ | 1.0.8 | 1.0.8 | 1 year old | NONE | 1 | Up to date |
| 🟡 | `@fluentui/react` | 8.120.5 | 8.125.1 | 1 year old | MINOR | 2 | Should update |
| 🟡 | `@fluentui/react-hooks` | 8.6.14 | 8.10.1 | 2 years old | MINOR | 1 | Should update |
| 🔴 | `@reduxjs/toolkit` | 1.6.1 | 2.10.1 | 4 years old | MAJOR | 2 | Review required |
| 🔴 | `@testing-library/jest-dom` | 5.17.0 | 6.9.1 | 2 years old | MAJOR | 4 | Review required |
| 🔴 | `@testing-library/react` | 12.1.5 | 16.3.0 | 3 years old | MAJOR | 4 | Review required |
| 🔴 | `@testing-library/dom` | 9.3.3 | 10.4.1 | 2 years old | MAJOR | 2 | Review required |
| 🟢 | `@types/react-redux` | 7.1.33 | 7.1.34 | 1 year old | PATCH | 2 | Safe to update |
| 🟢 | `@types/redux-logger` | 3.0.7 | 3.0.13 | 6 years old | PATCH | 1 | Safe to update |
| 🟢 | `@types/remote-redux-devtools` | 0.5.4 | 0.5.8 | 5 years old | PATCH | 1 | Safe to update |
| 🟢 | `@types/source-map-support` | 0.5.0 | 0.5.10 | 6 years old | PATCH | 1 | Safe to update |
| 🔴 | `body-parser` | 1.20.3 | 2.2.0 | 1 year old | MAJOR | 1 | Review required |
| 🟢 | ~~`jest-scss-transform`~~ | 1.0.4 | 1.0.4 | 1 year old | NONE | 4 | Up to date |
| 🔴 | `react-i18next` | 15.4.1 | 16.3.1 | 8 months old | MAJOR | 2 | Review required |
| 🔴 | `react-redux` | 7.2.9 | 9.2.0 | 3 years old | MAJOR | 2 | Review required |
| 🔴 | `redux` | 4.0.4 | 5.0.1 | 6 years old | MAJOR | 2 | Review required |
| 🟢 | ~~`redux-logger`~~ | 3.0.6 | 3.0.6 | 8 years old | NONE | 1 | Up to date |
| 🟢 | `source-map-support` | 0.5.16 | 0.5.21 | 6 years old | PATCH | 1 | Safe to update |
| 🟢 | ~~`stream-browserify`~~ | 3.0.0 | 3.0.0 | 5 years old | NONE | 1 | Up to date |
| 🔴 | `ts-import-plugin` | 1.6.3 | 3.0.0 | 5 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`postcss-modules`~~ | 6.0.1 | 6.0.1 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `@ui5/fs` | 3.0.4 | 4.0.3 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`esbuild-plugin-alias`~~ | 0.2.1 | 0.2.1 | 4 years old | NONE | 2 | Up to date |
| 🟢 | ~~`esbuild-plugin-copy`~~ | 2.1.1 | 2.1.1 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@esbuild-plugins/node-modules-polyfill`~~ | 0.2.2 | 0.2.2 | 2 years old | NONE | 2 | Up to date |
| 🔴 | `commander` | 9.4.0 | 14.0.2 | 3 years old | MAJOR | 2 | Review required |
| 🔴 | `diff` | 5.1.0 | 8.0.2 | 3 years old | MAJOR | 1 | Review required |
| 🔴 | `@types/diff` | 5.0.9 | 8.0.0 | 1 year old | MAJOR | 2 | Review required |
| 🔴 | `os-name` | 4.0.1 | 6.1.0 | 4 years old | MAJOR | 6 | Review required |
| 🟢 | ~~`archiver`~~ | 7.0.1 | 7.0.1 | 1 year old | NONE | 1 | Up to date |
| 🟢 | `glob-gitignore` | 1.0.14 | 1.0.15 | 6 years old | PATCH | 1 | Safe to update |
| 🔴 | `ignore` | 5.2.4 | 7.0.5 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`minimist`~~ | 1.2.8 | 1.2.8 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`yamljs`~~ | 0.3.0 | 0.3.0 | 8 years old | NONE | 1 | Up to date |
| 🔴 | `@types/archiver` | 5.3.4 | 7.0.0 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | `@types/minimist` | 1.2.2 | 1.2.5 | 4 years old | PATCH | 1 | Safe to update |
| 🟢 | ~~`eslint-plugin-fiori-custom`~~ | 2.6.7 | 2.6.7 | 2 years old | NONE | 1 | Up to date |
| 🔴 | `xml-formatter` | 2.6.1 | 3.6.7 | 3 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`@types/jest-when`~~ | 3.5.5 | 3.5.5 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`jest-when`~~ | 3.7.0 | 3.7.0 | 11 months old | NONE | 1 | Up to date |
| 🟢 | ~~`@xml-tools/ast`~~ | 5.0.5 | 5.0.5 | 4 years old | NONE | 2 | Up to date |
| 🟢 | ~~`@xml-tools/parser`~~ | 1.0.11 | 1.0.11 | 4 years old | NONE | 2 | Up to date |
| 🟢 | `vscode-languageserver-textdocument` | 1.0.11 | 1.0.12 | 2 years old | PATCH | 3 | Safe to update |
| 🔴 | `@sap/cds-compiler` | 4.8.0 | 6.4.6 | 1 year old | MAJOR | 1 | Review required |
| 🟢 | `@sap-ux/edmx-parser` | 0.9.1 | 0.9.6 | 5 months old | PATCH | 3 | Safe to update |
| 🟢 | ~~`@sap/service-provider-apis`~~ | 2.5.1 | 2.5.1 | 1 month old | NONE | 2 | Up to date |
| 🟡 | `jest-extended` | 6.0.0 | 7.0.0 | 5 months old | MAJOR | 10 | Should update |
| 🟢 | ~~`jest-mock`~~ | 30.2.0 | 30.2.0 | 1 month old | NONE | 1 | Up to date |
| 🟢 | ~~`mock-spawn`~~ | 0.2.6 | 0.2.6 | 10 years old | NONE | 3 | Up to date |
| 🟢 | ~~`@npm/types`~~ | 2.1.0 | 2.1.0 | 6 months old | NONE | 1 | Up to date |
| 🟢 | `@lancedb/lancedb` | 0.22.0 | 0.22.3 | 2 months old | PATCH | 2 | Safe to update |
| 🟢 | ~~`@xenova/transformers`~~ | 2.17.2 | 2.17.2 | 1 year old | NONE | 2 | Up to date |
| 🟢 | ~~`node-fetch`~~ | 3.3.2 | 3.3.2 | 2 years old | NONE | 1 | Up to date |
| 🔴 | `marked` | 12.0.0 | 17.0.0 | 1 year old | MAJOR | 1 | Review required |
| 🟢 | ~~`gray-matter`~~ | 4.0.3 | 4.0.3 | 4 years old | NONE | 1 | Up to date |
| 🟡 | `tsx` | 4.7.0 | 4.20.6 | 1 year old | MINOR | 1 | Should update |
| 🔴 | `read-pkg-up` | 7.0.1 | 11.0.0 | 5 years old | MAJOR | 3 | Review required |
| 🟡 | `logform` | 2.4.0 | 2.7.0 | 3 years old | MINOR | 2 | Should update |
| 🔴 | `@sap-ux/fiori-docs-embeddings` | * | 0.4.3 | unknown | UNKNOWN | 1 | Manual check required |
| 🟡 | `@modelcontextprotocol/sdk` | 1.17.5 | 1.21.1 | 2 months old | MINOR | 1 | Should update |
| 🟡 | `@sap/ux-specification` | 1.136.6 | 1.139.0 | 1 month old | MINOR | 1 | Should update |
| 🟢 | `@types/json-schema` | 7.0.5 | 7.0.15 | 5 years old | PATCH | 1 | Safe to update |
| 🟢 | `zod` | 4.1.5 | 4.1.12 | 2 months old | PATCH | 1 | Safe to update |
| 🟡 | `@sap-ai-sdk/foundation-models` | 2.0.0 | 2.1.0 | 1 month old | MINOR | 1 | Should update |
| 🟡 | `@sap-ai-sdk/langchain` | 2.0.0 | 2.1.0 | 1 month old | MINOR | 1 | Should update |
| 🟡 | `promptfoo` | 0.118.6 | 0.119.6 | 1 month old | MINOR | 1 | Should update |
| 🟡 | `@langchain/mcp-adapters` | 0.6.0 | 1.0.0 | 3 months old | MAJOR | 1 | Should update |
| 🟡 | `@langchain/core` | 0.3.75 | 1.0.4 | 2 months old | MAJOR | 1 | Should update |
| 🟢 | ~~`@sap-devx/feature-toggle-node`~~ | 2.0.3 | 2.0.3 | 8 months old | NONE | 1 | Up to date |
| 🟡 | `jsonc-parser` | 3.2.0 | 3.3.1 | 3 years old | MINOR | 3 | Should update |
| 🔴 | `figures` | 3.2.0 | 6.1.0 | 5 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`fuzzy`~~ | 0.1.3 | 0.1.3 | 9 years old | NONE | 1 | Up to date |
| 🔴 | `jest-environment-jsdom` | 29.7.0 | 30.2.0 | 2 years old | MAJOR | 3 | Review required |
| 🔴 | `tsconfig-paths` | 3.15.0 | 4.2.0 | 1 year old | MAJOR | 1 | Review required |
| 🔴 | `@ui5/cli` | 4 | error | unknown | UNKNOWN | 3 | Manual check required |
| 🟡 | `@ui5/project` | 3.9.0 || ^4.0.0 | 4.0.8 | unknown | MAJOR | 1 | Should update |
| 🟢 | ~~`dir-compare`~~ | 5.0.0 | 5.0.0 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `filenamify` | 4.2.0 | 7.0.1 | 5 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`jest-diff`~~ | 30.2.0 | 30.2.0 | 1 month old | NONE | 1 | Up to date |
| 🔴 | `minimatch` | 3.0.5 | 10.1.1 | 3 years old | MAJOR | 1 | Review required |
| 🔴 | `mkdirp` | 1.0.4 | 3.0.1 | 5 years old | MAJOR | 2 | Review required |
| 🟢 | ~~`jest-environment-node`~~ | 30.2.0 | 30.2.0 | 1 month old | NONE | 1 | Up to date |
| 🔴 | `puppeteer-core` | 22.15.0 | 24.29.1 | 1 year old | MAJOR | 1 | Review required |
| 🔴 | `which` | 2.0.2 | 6.0.0 | 5 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`@types/yargs-parser`~~ | 21.0.3 | 21.0.3 | 2 years old | NONE | 1 | Up to date |
| 🟡 | `winston` | 3.11.0 | 3.18.3 | 2 years old | MINOR | 1 | Should update |
| 🟡 | `winston-transport` | 4.7.0 | 4.9.0 | 1 year old | MINOR | 1 | Should update |
| 🟢 | ~~`@types/debug`~~ | 4.1.12 | 4.1.12 | 2 years old | NONE | 1 | Up to date |
| 🟢 | `axios-logger` | 2.8.0 | 2.8.1 | 1 year old | PATCH | 1 | Safe to update |
| 🟢 | ~~`circular-reference-remover`~~ | 2.1.0 | 2.1.0 | 3 years old | NONE | 1 | Up to date |
| 🟢 | ~~`prettify-xml`~~ | 1.2.0 | 1.2.0 | 8 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@sap-ux/logger`~~ | 0.7.1 | 0.7.1 | 7 days old | NONE | 1 | Up to date |
| 🔴 | `jest-dev-server` | 10.0.0 | 11.0.0 | 1 year old | MAJOR | 2 | Review required |
| 🟡 | `folder-hash` | 4.0.4 | 4.1.1 | 2 years old | MINOR | 1 | Should update |
| 🟢 | ~~`@types/folder-hash`~~ | 4.0.4 | 4.0.4 | 2 years old | NONE | 1 | Up to date |
| 🟢 | `portfinder` | 1.0.32 | 1.0.38 | 3 years old | PATCH | 3 | Safe to update |
| 🟢 | ~~`promisify-child-process`~~ | 4.1.2 | 4.1.2 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`qrcode`~~ | 1.5.4 | 1.5.4 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `@sap-ux-private/playwright` | 0.2.2 | unknown | unknown | UNKNOWN | 1 | Manual check required |
| 🟢 | `@types/qrcode` | 1.5.5 | 1.5.6 | 2 years old | PATCH | 1 | Safe to update |
| 🟡 | `@sapui5/types` | 1.120.5 | 1.142.0 | 1 year old | MINOR | 1 | Should update |
| 🟢 | `ui5-tooling-modules` | 3.33.0 | 3.33.6 | 29 days old | PATCH | 1 | Safe to update |
| 🟢 | ~~`ui5-tooling-transpile`~~ | 3.9.2 | 3.9.2 | 1 month old | NONE | 1 | Up to date |
| 🟢 | ~~`findit2`~~ | 2.2.3 | 2.2.3 | 11 years old | NONE | 1 | Up to date |
| 🔴 | `json-parse-even-better-errors` | 4.0.0 | 5.0.0 | 1 year old | MAJOR | 1 | Review required |
| 🟡 | `@ui5/manifest` | 1.76.0 | 1.80.0 | 4 months old | MINOR | 2 | Should update |
| 🟡 | `vscode-uri` | 3.0.7 | 3.1.0 | 2 years old | MINOR | 3 | Should update |
| 🔴 | `validate-npm-package-name` | 5.0.0 | 7.0.0 | 3 years old | MAJOR | 1 | Review required |
| 🟢 | `@types/validate-npm-package-name` | 4.0.1 | 4.0.2 | 2 years old | PATCH | 1 | Safe to update |
| 🟢 | ~~`lz-string`~~ | 1.5.0 | 1.5.0 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`connect-livereload`~~ | 0.6.1 | 0.6.1 | 6 years old | NONE | 1 | Up to date |
| 🟡 | `livereload` | 0.9.3 | 0.10.3 | 4 years old | MINOR | 1 | Should update |
| 🟢 | ~~`@types/connect-livereload`~~ | 0.6.3 | 0.6.3 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/livereload`~~ | 0.9.5 | 0.9.5 | 2 years old | NONE | 1 | Up to date |
| 🔴 | `yeoman-environment` | 3.8.0 | 5.0.0 | 4 years old | MAJOR | 2 | Review required |
| 🟢 | `@types/normalize-path` | 3.0.0 | 3.0.2 | 6 years old | PATCH | 1 | Safe to update |
| 🟡 | `@zowe/secrets-for-zowe-sdk` | 8.1.2 | 8.29.1 | 1 year old | MINOR | 2 | Should update |
| 🟢 | ~~`normalize-path`~~ | 3.0.0 | 3.0.0 | 7 years old | NONE | 1 | Up to date |
| 🟡 | `@vscode/vsce` | 3.6.0 | 3.7.0 | 4 months old | MINOR | 1 | Should update |
| 🟡 | `@testing-library/user-event` | 14.5.1 | 14.6.1 | 2 years old | MINOR | 1 | Should update |
| 🔴 | `serve-static` | 1.16.2 | 2.2.0 | 1 year old | MAJOR | 1 | Review required |
| 🔴 | `@types/serve-static` | 1.15.5 | 2.2.0 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`pluralize`~~ | 8.0.0 | 8.0.0 | 6 years old | NONE | 1 | Up to date |
| 🟡 | `reflect-metadata` | 0.1.13 | 0.2.2 | 6 years old | MINOR | 1 | Should update |
| 🟢 | `@types/pluralize` | 0.0.30 | 0.0.33 | 2 years old | PATCH | 1 | Safe to update |
| 🟡 | `@types/qs` | 6.9.1 | 6.14.0 | 5 years old | MINOR | 1 | Should update |
| 🔴 | `fast-check` | 2.25.0 | 4.3.0 | 3 years old | MAJOR | 1 | Review required |
| 🟡 | `applicationinsights` | 2.9.8 | 3.12.0 | 3 months old | MAJOR | 1 | Should update |
| 🟢 | ~~`performance-now`~~ | 2.1.0 | 2.1.0 | 8 years old | NONE | 1 | Up to date |
| 🟢 | `vscode-languageserver-types` | 3.17.2 | 3.17.5 | 3 years old | PATCH | 1 | Safe to update |
| 🔴 | `react-movable` | 2.5.4 | 3.4.1 | 4 years old | MAJOR | 1 | Review required |
| 🟢 | `@types/enzyme` | 3.10.13 | 3.10.19 | 2 years old | PATCH | 1 | Safe to update |
| 🟢 | `@types/enzyme-adapter-react-16` | 1.0.6 | 1.0.9 | 5 years old | PATCH | 1 | Safe to update |
| 🟡 | `@types/react-virtualized` | 9.21.29 | 9.22.3 | 1 year old | MINOR | 1 | Should update |
| 🟢 | ~~`babel-jest`~~ | 30.2.0 | 30.2.0 | 1 month old | NONE | 2 | Up to date |
| 🟢 | ~~`enzyme`~~ | 3.11.0 | 3.11.0 | 5 years old | NONE | 1 | Up to date |
| 🟢 | `enzyme-adapter-react-16` | 1.15.7 | 1.15.8 | 3 years old | PATCH | 1 | Safe to update |
| 🟢 | ~~`require-from-string`~~ | 2.0.2 | 2.0.2 | 7 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@sap/subaccount-destination-service-provider`~~ | 2.9.1 | 2.9.1 | 1 month old | NONE | 1 | Up to date |
| 🟢 | ~~`ajv`~~ | 8.17.1 | 8.17.1 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `@types/prettier` | 2.7.3 | 3.0.0 | 2 years old | MAJOR | 1 | Review required |
| 🟡 | `@types/i18next-fs-backend` | 1.1.2 | 1.2.0 | 4 years old | MINOR | 1 | Should update |
| 🟡 | `@sap-ux/ui5-middleware-fe-mockserver` | 2.2.97 | 2.3.20 | 5 months old | MINOR | 1 | Should update |
| 🟢 | ~~`@sap-ux/fe-mockserver-plugin-cds`~~ | 1.2.6 | 1.2.6 | 11 months old | NONE | 1 | Up to date |

</details>

---

## Recommendations

### Immediate Actions (This Sprint)

1. ✅ Apply all 40 **patch updates** - Low risk, high value
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
node ./docs/dependencyManagement/generate-dependency-update-plan.js
```

### Success Metrics

- [ ] Zero dependencies >1 year old
- [ ] Zero version inconsistencies
- [ ] All security vulnerabilities resolved
- [ ] Automated dependency update process in place
- [ ] Quarterly dependency review cadence established

---

**Last Updated:** 2025-11-12
**Generated by:** dependency update automation script
