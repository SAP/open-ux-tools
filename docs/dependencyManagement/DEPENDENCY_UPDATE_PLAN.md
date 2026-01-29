# Dependency Update Plan

**Generated:** 2026-01-28
**Scope:** All dependencies (including @sap-ux/* packages)

---

## Executive Summary

### 📊 Overview Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Packages Analyzed** | 96 | - |
| **Total Unique External Dependencies** | 293 | 100% |
| **Dependencies Older Than 6 Months** | 233 | 79.5% |
| **Dependencies Older Than 6 Months with Updates Available** | 159 | 54.3% |
| **Major Updates Available** | 94 | 32.1% |
| **Minor Updates Available** | 61 | 20.8% |
| **Patch Updates Available** | 48 | 16.4% |
| **Up to Date** | 85 | 29.0% |
| **Version Inconsistencies** | 42 | 14.3% |

### 🎯 Update Priority Summary

- 🔴 **CRITICAL** (16 deps): Major updates affecting 10+ packages
- 🟠 **HIGH** (15 deps): Major updates affecting 5-9 packages
- 🟡 **MEDIUM** (63 deps): Other major updates or version conflicts
- 🟢 **LOW** (109 deps): Minor and patch updates
- ✅ **NONE** (85 deps): Already up to date

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
| 10 | 🟢 ~~`requireindex`~~ | 1.2.0 | 1.2.0 | 7 years old | NONE | 1 | VERY LOW | 0.5h |
| 11 | 🟢 ~~`require-from-string`~~ | 2.0.2 | 2.0.2 | 7 years old | NONE | 1 | VERY LOW | 0.5h |
| 12 | 🟢 ~~`normalize-path`~~ | 3.0.0 | 3.0.0 | 7 years old | NONE | 1 | VERY LOW | 0.5h |
| 13 | 🔴 `@types/mem-fs` | 1.1.2 | 2.2.0 | 7 years old | MAJOR | 31 | CRITICAL | 8-16h |
| 14 | 🟢 ~~`connect-livereload`~~ | 0.6.1 | 0.6.1 | 7 years old | NONE | 1 | VERY LOW | 0.5h |
| 15 | 🟢 `@types/normalize-path` | 3.0.0 | 3.0.2 | 7 years old | PATCH | 1 | VERY LOW | 0.5-1h |
| 16 | 🟡 `reflect-metadata` | 0.1.13 | 0.2.2 | 7 years old | MINOR | 1 | LOW | 1-2h |
| 17 | 🟢 ~~`xml-js`~~ | 1.6.11 | 1.6.11 | 6 years old | NONE | 1 | VERY LOW | 0.5h |
| 18 | 🟢 `@types/redux-logger` | 3.0.7 | 3.0.13 | 6 years old | PATCH | 1 | VERY LOW | 0.5-1h |
| 19 | 🟢 `glob-gitignore` | 1.0.14 | 1.0.15 | 6 years old | PATCH | 1 | VERY LOW | 0.5-1h |
| 20 | 🟢 `@types/source-map-support` | 0.5.0 | 0.5.10 | 6 years old | PATCH | 1 | VERY LOW | 0.5-1h |

---

## Update Breakdown by Type

### 🔴 Major Updates (94 dependencies)

Major version updates may include breaking changes. Review changelogs and test thoroughly.

#### CRITICAL Priority (16 dependencies)

| Status | Dependency | Current → Latest | Age | Packages Affected | Changelog |
|--------|------------|------------------|-----|-------------------|------------|
| 🔴 | `@types/mem-fs` | 1.1.2 → 2.2.0 | 7 years old | 31 | N/A |
| 🔴 | `npm-run-all2` | 5.0.0 → 8.0.4 | 5 years old | 22 | [Link](https://github.com/bcomnes/npm-run-all2) |
| 🔴 | `inquirer` | 8.0.0 → 13.2.1 | 4 years old | 11 | [Link](https://github.com/SBoudrias/Inquirer.js) |
| 🔴 | `mem-fs` | 2.1.0 → 4.1.3 | 4 years old | 28 | [Link](https://github.com/SBoudrias/mem-fs) |
| 🔴 | `fs-extra` | 10.0.0 → 11.3.3 | 4 years old | 15 | [Link](https://github.com/jprichardson/node-fs-extra) |
| 🔴 | `@types/mem-fs-editor` | 7.0.1 → 10.0.1 | 4 years old | 35 | N/A |
| 🔴 | `mem-fs-editor` | 9.4.0 → 11.1.4 | 4 years old | 32 | [Link](https://github.com/SBoudrias/mem-fs-editor) |
| 🔴 | `yeoman-test` | 6.3.0 → 11.2.0 | 3 years old | 12 | [Link](https://github.com/yeoman/yeoman-test) |
| 🔴 | `@types/yeoman-generator` | 5.2.11 → 6.0.0 | 3 years old | 14 | N/A |
| 🔴 | `yeoman-generator` | 5.10.0 → 7.5.1 | 2 years old | 13 | [Link](https://github.com/yeoman/generator) |
| 🔴 | `@types/yeoman-environment` | 2.10.11 → 4.0.0 | 2 years old | 11 | N/A |
| 🔴 | `@types/yeoman-test` | 4.0.6 → 7.0.0 | 2 years old | 12 | N/A |
| 🔴 | `nock` | 13.4.0 → 14.0.10 | 2 years old | 11 | [Link](https://github.com/nock/nock) |
| 🔴 | `ejs` | 3.1.10 → 4.0.1 | 1 year old | 12 | [Link](git://github.com/mde/ejs) |
| 🔴 | `jest-extended` | 6.0.0 → 7.0.0 | 7 months old | 10 | [Link](https://github.com/jest-community/jest-extended) |
| 🟡 | `@types/inquirer` | 8.0.0 → 9.0.9 | unknown | 23 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |

#### HIGH Priority (15 dependencies)

| Status | Dependency | Current → Latest | Age | Packages Affected | Changelog |
|--------|------------|------------------|-----|-------------------|------------|
| 🔴 | `react` | 16.14.0 → 19.2.4 | 5 years old | 5 | [Link](https://github.com/facebook/react) |
| 🔴 | `react-dom` | 16.14.0 → 19.2.4 | 5 years old | 5 | [Link](https://github.com/facebook/react) |
| 🔴 | `os-name` | 4.0.1 → 6.1.0 | 4 years old | 6 | [Link](https://github.com/sindresorhus/os-name) |
| 🔴 | `chalk` | 4.1.2 → 5.6.2 | 4 years old | 8 | [Link](https://github.com/chalk/chalk) |
| 🔴 | `memfs` | 3.3.0 → 4.56.10 | 4 years old | 8 | [Link](https://github.com/streamich/memfs) |
| 🔴 | `@types/supertest` | 2.0.12 → 6.0.3 | 3 years old | 7 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `inquirer-autocomplete-prompt` | 2.0.1 → 3.0.1 | 2 years old | 6 | [Link](ssh://git@github.com/mokkabonna/inquirer-autocomplete-prompt) |
| 🔴 | `@types/inquirer-autocomplete-prompt` | 2.0.2 → 3.0.3 | 2 years old | 7 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/express` | 4.17.21 → 5.0.6 | 2 years old | 8 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/react-dom` | 16.9.24 → 19.2.3 | 2 years old | 5 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/react` | 16.14.55 → 19.2.10 | 2 years old | 5 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `fast-xml-parser` | 4.3.4 → 5.3.3 | 1 year old | 6 | [Link](https://github.com/NaturalIntelligence/fast-xml-parser) |
| 🔴 | `uuid` | 10.0.0 → 13.0.0 | 1 year old | 5 | [Link](https://github.com/uuidjs/uuid) |
| 🔴 | `dotenv` | 16.6.1 → 17.2.3 | 7 months old | 9 | [Link](git://github.com/motdotla/dotenv) |
| 🟡 | `js-yaml` | 3.14.2 → 4.1.1 | 2 months old | 5 | [Link](https://github.com/nodeca/js-yaml) |

#### MEDIUM Priority (63 dependencies)

<details>
<summary>Click to expand (63 dependencies)</summary>

| Status | Dependency | Current → Latest | Age | Packages Affected | Changelog |
|--------|------------|------------------|-----|-------------------|------------|
| 🔴 | `redux` | 4.0.4 → 5.0.1 | 6 years old | 2 | [Link](https://github.com/reduxjs/redux) |
| 🔴 | `which` | 2.0.2 → 6.0.0 | 6 years old | 1 | [Link](https://github.com/npm/node-which) |
| 🔴 | `read-pkg-up` | 7.0.1 → 11.0.0 | 6 years old | 3 | [Link](https://github.com/sindresorhus/read-pkg-up) |
| 🔴 | `ts-import-plugin` | 1.6.3 → 3.0.0 | 5 years old | 1 | [Link](ssh://git@github.com/Brooooooklyn/ts-import-plugin) |
| 🔴 | `figures` | 3.2.0 → 6.1.0 | 5 years old | 1 | [Link](https://github.com/sindresorhus/figures) |
| 🔴 | `open` | 7.0.3 → 11.0.0 | 5 years old | 1 | [Link](https://github.com/sindresorhus/open) |
| 🔴 | `filenamify` | 4.2.0 → 7.0.1 | 5 years old | 1 | [Link](https://github.com/sindresorhus/filenamify) |
| 🔴 | `react-markdown` | 5.0.2 → 10.1.0 | 5 years old | 2 | [Link](https://github.com/remarkjs/react-markdown) |
| 🔴 | `cross-env` | 7.0.3 → 10.1.0 | 5 years old | 4 | [Link](https://github.com/kentcdodds/cross-env) |
| 🔴 | `chevrotain` | 7.1.1 → 11.1.1 | 4 years old | 2 | [Link](git://github.com/Chevrotain/chevrotain) |
| 🔴 | `react-movable` | 2.5.4 → 3.4.1 | 4 years old | 1 | [Link](https://github.com/tajo/react-movable) |
| 🔴 | `@reduxjs/toolkit` | 1.6.1 → 2.11.2 | 4 years old | 2 | [Link](https://github.com/reduxjs/redux-toolkit) |
| 🔴 | `prettier` | 2.5.1 → 3.8.1 | 4 years old | 3 | [Link](https://github.com/prettier/prettier) |
| 🔴 | `xml-formatter` | 2.6.1 → 3.6.7 | 3 years old | 1 | [Link](https://github.com/chrisbottin/xml-formatter) |
| 🔴 | `minimatch` | 3.0.5 → 10.1.1 | 3 years old | 1 | [Link](ssh://git@github.com/isaacs/minimatch) |
| 🔴 | `@testing-library/react` | 12.1.5 → 16.3.2 | 3 years old | 4 | [Link](https://github.com/testing-library/react-testing-library) |
| 🔴 | `https-proxy-agent` | 5.0.1 → 7.0.6 | 3 years old | 3 | [Link](https://github.com/TooTallNate/proxy-agents) |
| 🔴 | `fast-check` | 2.25.0 → 4.5.3 | 3 years old | 1 | [Link](https://github.com/dubzzz/fast-check) |
| 🔴 | `commander` | 9.4.0 → 14.0.2 | 3 years old | 2 | [Link](https://github.com/tj/commander.js) |
| 🔴 | `yargs-parser` | 21.1.1 → 22.0.0 | 3 years old | 2 | [Link](https://github.com/yargs/yargs-parser) |
| 🔴 | `react-redux` | 7.2.9 → 9.2.0 | 3 years old | 2 | [Link](https://github.com/reduxjs/react-redux) |
| 🔴 | `@types/prettier` | 2.7.1 → 3.0.0 | 3 years old | 2 | N/A |
| 🔴 | `validate-npm-package-name` | 5.0.0 → 7.0.2 | 3 years old | 1 | [Link](https://github.com/npm/validate-npm-package-name) |
| 🔴 | `ignore` | 5.2.4 → 7.0.5 | 3 years old | 1 | [Link](ssh://git@github.com/kaelzhang/node-ignore) |
| 🔴 | `husky` | 8.0.3 → 9.1.7 | 3 years old | 1 | [Link](https://github.com/typicode/husky) |
| 🔴 | `style-loader` | 3.3.3 → 4.0.0 | 2 years old | 3 | [Link](https://github.com/webpack-contrib/style-loader) |
| 🔴 | `@ui5/fs` | 3.0.4 → 4.0.4 | 2 years old | 1 | [Link](ssh://git@github.com/SAP/ui5-fs) |
| 🔴 | `css-loader` | 6.8.1 → 7.1.3 | 2 years old | 3 | [Link](https://github.com/webpack/css-loader) |
| 🔴 | `yeoman-environment` | 3.19.3 → 5.1.2 | 2 years old | 2 | [Link](https://github.com/yeoman/environment) |
| 🔴 | `sass-loader` | 13.3.2 → 16.0.6 | 2 years old | 3 | [Link](https://github.com/webpack/sass-loader) |
| 🔴 | `babel-loader` | 9.1.3 → 10.0.0 | 2 years old | 3 | [Link](https://github.com/babel/babel-loader) |
| 🔴 | `@testing-library/jest-dom` | 5.17.0 → 6.9.1 | 2 years old | 4 | [Link](https://github.com/testing-library/jest-dom) |
| 🔴 | `jest-environment-jsdom` | 29.7.0 → 30.2.0 | 2 years old | 3 | [Link](https://github.com/jestjs/jest) |
| 🔴 | `eslint-plugin-storybook` | 0.6.15 → 10.2.1 | 2 years old | 3 | [Link](https://github.com/storybookjs/storybook) |
| 🔴 | `@types/archiver` | 5.3.4 → 7.0.0 | 2 years old | 1 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/serve-static` | 1.15.5 → 2.2.0 | 2 years old | 1 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🔴 | `@types/diff` | 5.0.9 → 8.0.0 | 2 years old | 2 | N/A |
| 🔴 | `tsconfig-paths` | 3.15.0 → 4.2.0 | 2 years old | 1 | [Link](https://github.com/dividab/tsconfig-paths) |
| 🔴 | `@testing-library/dom` | 9.3.4 → 10.4.1 | 2 years old | 2 | [Link](https://github.com/testing-library/dom-testing-library) |
| 🔴 | `pretty-quick` | 3.3.1 → 4.2.2 | 2 years old | 1 | [Link](https://github.com/prettier/pretty-quick) |
| 🔴 | `marked` | 12.0.0 → 17.0.1 | 1 year old | 1 | [Link](git://github.com/markedjs/marked) |
| 🔴 | `jest-dev-server` | 10.0.0 → 11.0.0 | 1 year old | 2 | [Link](https://github.com/argos-ci/jest-puppeteer) |
| 🔴 | `@sap/cds-compiler` | 4.8.0 → 6.6.2 | 1 year old | 1 | N/A |
| 🔴 | `@types/uuid` | 10.0.0 → 11.0.0 | 1 year old | 4 | N/A |
| 🔴 | `puppeteer-core` | 22.15.0 → 24.36.1 | 1 year old | 1 | [Link](https://github.com/puppeteer/puppeteer.git#main) |
| 🔴 | `json-parse-even-better-errors` | 4.0.0 → 5.0.0 | 1 year old | 1 | [Link](https://github.com/npm/json-parse-even-better-errors) |
| 🔴 | `serve-static` | 1.16.2 → 2.2.1 | 1 year old | 1 | [Link](https://github.com/expressjs/serve-static) |
| 🔴 | `@storybook/react` | 8.4.2 → 10.2.1 | 1 year old | 3 | [Link](https://github.com/storybookjs/storybook) |
| 🔴 | `@storybook/react-webpack5` | 8.4.2 → 10.2.1 | 1 year old | 3 | [Link](https://github.com/storybookjs/storybook) |
| 🔴 | `react-i18next` | 15.4.1 → 16.5.4 | 11 months old | 2 | [Link](https://github.com/i18next/react-i18next) |
| 🔴 | `globals` | 16.0.0 → 17.2.0 | 11 months old | 2 | [Link](https://github.com/sindresorhus/globals) |
| 🔴 | `http-proxy-middleware` | 2.0.9 → 3.0.5 | 9 months old | 4 | [Link](https://github.com/chimurai/http-proxy-middleware) |
| 🔴 | `eslint-plugin-jsdoc` | 50.8.0 → 62.4.1 | 7 months old | 2 | [Link](https://github.com/gajus/eslint-plugin-jsdoc) |
| 🔴 | `check-dependency-version-consistency` | 5.0.1 → 6.0.0 | 7 months old | 1 | [Link](https://github.com/bmish/check-dependency-version-consistency) |
| 🟡 | `update-ts-references` | 3.6.2 → 4.0.0 | 5 months old | 1 | [Link](https://github.com/eBayClassifiedsGroup/update-ts-references) |
| 🟡 | `applicationinsights` | 2.9.8 → 3.13.0 | 5 months old | 1 | [Link](https://github.com/microsoft/ApplicationInsights-node.js) |
| 🟡 | `@types/node` | 18.19.130 → 25.0.10 | 3 months old | 2 | [Link](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| 🟡 | `nx` | 21.6.5 → 22.4.2 | 3 months old | 1 | [Link](https://github.com/nrwl/nx) |
| 🟡 | `@eslint/core` | 0.17.0 → 1.0.1 | 3 months old | 1 | [Link](https://github.com/eslint/rewrite) |
| 🟡 | `body-parser` | 1.20.4 → 2.2.2 | 1 month old | 1 | [Link](https://github.com/expressjs/body-parser) |
| 🟡 | `storybook` | 8.6.15 → 10.2.1 | 1 month old | 3 | [Link](https://github.com/storybookjs/storybook) |
| 🟡 | `diff` | 5.2.2 → 8.0.3 | 8 days old | 1 | [Link](https://github.com/kpdecker/jsdiff) |
| 🟡 | `@ui5/project` | 3.9.0 || ^4.0.0 → 4.0.9 | unknown | 1 | [Link](ssh://git@github.com/SAP/ui5-project) |

</details>

### 🟡 Minor Updates (61 dependencies)

Minor version updates include new features but should be backward compatible.

<details>
<summary>Click to expand (61 dependencies)</summary>

| Status | Dependency | Current → Latest | Age | Packages Affected |
|--------|------------|------------------|-----|-------------------|
| 🟡 | `@changesets/cli` | 2.27.10 → 2.29.8 | 1 year old | 1 |
| 🟡 | `@playwright/test` | 1.56.1 → 1.58.0 | 3 months old | 3 |
| 🟡 | `esbuild` | 0.25.11 → 0.27.2 | 3 months old | 2 |
| 🟡 | `esbuild-sass-plugin` | 3.3.1 → 3.6.0 | 1 year old | 1 |
| 🟡 | `knip` | 5.69.0 → 5.82.1 | 2 months old | 1 |
| 🟡 | `rimraf` | 6.0.1 → 6.1.2 | 1 year old | 19 |
| 🟡 | `typescript-eslint` | 8.46.2 → 8.54.0 | 3 months old | 3 |
| 🟡 | `yaml` | 2.2.2 → 2.8.2 | 2 years old | 6 |
| 🟡 | `axios` | 1.12.2 → 1.13.4 | 4 months old | 16 |
| 🟡 | `sanitize-html` | 2.12.1 → 2.17.0 | 1 year old | 2 |
| 🟡 | `@babel/preset-react` | 7.27.1 → 7.28.5 | 9 months old | 3 |
| 🟡 | `@babel/preset-typescript` | 7.27.1 → 7.28.5 | 9 months old | 3 |
| 🟡 | `@storybook/components` | 8.4.2 → 8.6.14 | 1 year old | 2 |
| 🟡 | `@types/sanitize-html` | 2.11.0 → 2.16.0 | 1 year old | 2 |
| 🟡 | `@types/ws` | 8.5.12 → 8.18.1 | 1 year old | 1 |
| 🟡 | `sass` | 1.66.1 → 1.97.3 | 2 years old | 3 |
| 🟡 | `ts-loader` | 9.4.4 → 9.5.4 | 2 years old | 3 |
| 🟡 | `ws` | 8.18.0 → 8.19.0 | 1 year old | 1 |
| 🟡 | `@sap-devx/yeoman-ui-types` | 1.14.4 → 1.21.0 | 1 year old | 21 |
| 🟡 | `unionfs` | 4.4.0 → 4.6.0 | 5 years old | 8 |
| 🟡 | `semver` | 7.5.4 → 7.7.3 | 2 years old | 19 |
| 🟡 | `@types/lodash` | 4.14.202 → 4.17.23 | 2 years old | 15 |
| 🟡 | `@types/semver` | 7.5.2 → 7.7.1 | 2 years old | 19 |
| 🟡 | `@jest/types` | 30.0.0 → 30.2.0 | 7 months old | 6 |
| 🟡 | `@types/vscode` | 1.102.0 → 1.108.1 | 6 months old | 10 |
| 🟡 | `supertest` | 7.1.4 → 7.2.2 | 6 months old | 8 |
| 🟡 | `@sap-ux/vocabularies-types` | 0.13.1 → 0.14.6 | 2 months old | 8 |
| 🟡 | `@sap/bas-sdk` | 3.12.0 → 3.13.1 | 4 months old | 3 |
| 🟡 | `@fluentui/react` | 8.120.5 → 8.125.4 | 1 year old | 2 |
| 🟡 | `@fluentui/react-hooks` | 8.6.14 → 8.10.2 | 3 years old | 1 |
| 🟡 | `@eslint/json` | 0.13.2 → 0.14.0 | 5 months old | 1 |
| 🟡 | `@typescript-eslint/eslint-plugin` | 8.49.0 → 8.54.0 | 1 month old | 1 |
| 🟡 | `@typescript-eslint/parser` | 8.49.0 → 8.54.0 | 1 month old | 1 |
| 🟡 | `@typescript-eslint/rule-tester` | 8.46.2 → 8.54.0 | 3 months old | 1 |
| 🟡 | `eslint-plugin-eslint-plugin` | 7.2.0 → 7.3.0 | 3 months old | 1 |
| 🟡 | `@sap/service-provider-apis` | 2.5.1 → 2.7.0 | 4 months old | 2 |
| 🟡 | `@lancedb/lancedb` | 0.22.0 → 0.23.0 | 4 months old | 2 |
| 🟡 | `tsx` | 4.7.0 → 4.21.0 | 2 years old | 1 |
| 🟡 | `logform` | 2.4.0 → 2.7.0 | 3 years old | 2 |
| 🟡 | `zod` | 4.1.13 → 4.3.6 | 2 months old | 1 |
| 🟡 | `@sap-ai-sdk/foundation-models` | 2.3.0 → 2.5.0 | 2 months old | 1 |
| 🟡 | `@sap-ai-sdk/langchain` | 2.3.0 → 2.5.0 | 2 months old | 1 |
| 🟡 | `promptfoo` | 0.119.14 → 0.120.18 | 1 month old | 1 |
| 🟡 | `@langchain/mcp-adapters` | 1.0.2 → 1.1.2 | 1 month old | 1 |
| 🟡 | `jsonc-parser` | 3.2.0 → 3.3.1 | 3 years old | 3 |
| 🟡 | `winston` | 3.11.0 → 3.19.0 | 2 years old | 1 |
| 🟡 | `winston-transport` | 4.7.0 → 4.9.0 | 1 year old | 1 |
| 🟡 | `folder-hash` | 4.0.4 → 4.1.1 | 3 years old | 1 |
| 🟡 | `@sapui5/types` | 1.120.5 → 1.144.0 | 1 year old | 1 |
| 🟡 | `ui5-tooling-modules` | 3.33.0 → 3.34.3 | 3 months old | 1 |
| 🟡 | `ui5-tooling-transpile` | 3.9.2 → 3.10.1 | 4 months old | 1 |
| 🟡 | `@ui5/manifest` | 1.81.0 → 1.82.0 | 2 months old | 3 |
| 🟡 | `vscode-uri` | 3.0.7 → 3.1.0 | 3 years old | 3 |
| 🟡 | `livereload` | 0.9.3 → 0.10.3 | 4 years old | 1 |
| 🟡 | `@zowe/secrets-for-zowe-sdk` | 8.1.2 → 8.29.4 | 1 year old | 2 |
| 🟡 | `@vscode/vsce` | 3.6.0 → 3.7.1 | 7 months old | 1 |
| 🟡 | `reflect-metadata` | 0.1.13 → 0.2.2 | 7 years old | 1 |
| 🟡 | `@types/qs` | 6.9.1 → 6.14.0 | 5 years old | 1 |
| 🟡 | `@types/react-virtualized` | 9.21.29 → 9.22.3 | 2 years old | 1 |
| 🟡 | `@sap/subaccount-destination-service-provider` | 2.9.1 → 2.14.0 | 4 months old | 1 |
| 🟡 | `@sap-ux/ui5-middleware-fe-mockserver` | 2.3.38 → 2.4.2 | 20 days old | 1 |

</details>

### 🟢 Patch Updates (48 dependencies)

Patch updates include bug fixes only. Safe to update with minimal risk.

<details>
<summary>Click to expand (48 dependencies)</summary>

| Status | Dependency | Current → Latest | Packages Affected |
|--------|------------|------------------|-------------------|
| 🟢 | `@eslint/eslintrc` | 3.3.0 → 3.3.3 | 1 |
| 🟢 | `autoprefixer` | 10.4.21 → 10.4.23 | 1 |
| 🟢 | `eslint-config-prettier` | 10.1.1 → 10.1.8 | 1 |
| 🟢 | `eslint-plugin-prettier` | 5.5.4 → 5.5.5 | 1 |
| 🟢 | `eslint-plugin-sonarjs` | 3.0.5 → 3.0.6 | 1 |
| 🟢 | `react-virtualized` | 9.22.5 → 9.22.6 | 2 |
| 🟢 | `ts-jest` | 29.4.5 → 29.4.6 | 3 |
| 🟢 | `@types/vinyl` | 2.0.7 → 2.0.12 | 3 |
| 🟢 | `@babel/core` | 7.28.0 → 7.28.6 | 4 |
| 🟢 | `@babel/preset-env` | 7.28.0 → 7.28.6 | 3 |
| 🟢 | `fast-glob` | 3.3.1 → 3.3.3 | 3 |
| 🟢 | `lodash` | 4.17.21 → 4.17.23 | 17 |
| 🟢 | `adm-zip` | 0.5.10 → 0.5.16 | 4 |
| 🟢 | `@types/adm-zip` | 0.5.5 → 0.5.7 | 4 |
| 🟢 | `@types/ejs` | 3.1.2 → 3.1.5 | 11 |
| 🟢 | `@types/prompts` | 2.4.4 → 2.4.9 | 9 |
| 🟢 | `@sap-ux/annotation-converter` | 0.10.19 → 0.10.20 | 8 |
| 🟢 | `xpath` | 0.0.33 → 0.0.34 | 2 |
| 🟢 | `@xmldom/xmldom` | 0.8.10 → 0.8.11 | 2 |
| 🟢 | `@types/proxy-from-env` | 1.0.1 → 1.0.4 | 3 |
| 🟢 | `@types/http-proxy` | 1.17.5 → 1.17.17 | 2 |
| 🟢 | `@types/react-redux` | 7.1.33 → 7.1.34 | 2 |
| 🟢 | `@types/redux-logger` | 3.0.7 → 3.0.13 | 1 |
| 🟢 | `@types/remote-redux-devtools` | 0.5.4 → 0.5.8 | 1 |
| 🟢 | `@types/source-map-support` | 0.5.0 → 0.5.10 | 1 |
| 🟢 | `source-map-support` | 0.5.16 → 0.5.21 | 1 |
| 🟢 | `glob-gitignore` | 1.0.14 → 1.0.15 | 1 |
| 🟢 | `@types/minimist` | 1.2.2 → 1.2.5 | 1 |
| 🟢 | `@babel/eslint-parser` | 7.28.5 → 7.28.6 | 1 |
| 🟢 | `@eslint/config-helpers` | 0.5.0 → 0.5.1 | 1 |
| 🟢 | `@humanwhocodes/momoa` | 3.3.9 → 3.3.10 | 1 |
| 🟢 | `@eslint/plugin-kit` | 0.5.0 → 0.5.1 | 1 |
| 🟢 | `synckit` | 0.11.11 → 0.11.12 | 1 |
| 🟢 | `vscode-languageserver-textdocument` | 1.0.11 → 1.0.12 | 3 |
| 🟢 | `@sap-ux/edmx-parser` | 0.9.1 → 0.9.8 | 5 |
| 🟢 | `@modelcontextprotocol/sdk` | 1.25.2 → 1.25.3 | 1 |
| 🟢 | `@types/json-schema` | 7.0.5 → 7.0.15 | 1 |
| 🟢 | `@langchain/core` | 1.1.8 → 1.1.17 | 1 |
| 🟢 | `axios-logger` | 2.8.0 → 2.8.1 | 1 |
| 🟢 | `portfinder` | 1.0.32 → 1.0.38 | 3 |
| 🟢 | `@types/qrcode` | 1.5.5 → 1.5.6 | 1 |
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

The following 42 dependencies have multiple versions in use across the workspace:

| Dependency | Versions in Use | Packages Affected | Recommended Action |
|------------|-----------------|-------------------|--------------------|
| `@eslint/js` | 9, 9.22.0 | 2 | Standardize to error |
| `@types/node` | 18.19.130, 20.0.0 | 2 | Standardize to 25.0.10 |
| `esbuild` | 0.25.11, 0.25.6 | 2 | Standardize to 0.27.2 |
| `eslint` | 9, 9.39.1 | 4 | Standardize to error |
| `eslint-plugin-jsdoc` | 50.8.0, 61.5.0 | 2 | Standardize to 62.4.1 |
| `globals` | 16.0.0, 16.5.0 | 2 | Standardize to 17.2.0 |
| `npm-run-all2` | 5.0.0, 6.2.0, 7.0.2, 8.0.4 | 22 | Standardize to 8.0.4 |
| `prettier` | 2.5.1, 3.6.2 | 3 | Standardize to 3.8.1 |
| ~~`react-select`~~ | 5.10.2, 5.8.0 | 2 | Standardize to 5.10.2 |
| `react-virtualized` | 9.22.5, 9.22.6 | 2 | Standardize to 9.22.6 |
| `typescript-eslint` | 8.46.2, 8.49.0 | 3 | Standardize to 8.54.0 |
| `yaml` | 2.2.2, 2.3.3, 2.8.2 | 6 | Standardize to 2.8.2 |
| `inquirer` | 8.0.0, 8.2.7 | 11 | Standardize to 13.2.1 |
| `@types/inquirer` | 8.0.0, 8.2.6 | 23 | Standardize to 9.0.9 |
| `fast-xml-parser` | 4.3.4, 4.5.3 | 6 | Standardize to 5.3.3 |
| `@types/yeoman-environment` | 2.10.11, 2.10.8 | 11 | Standardize to 4.0.0 |
| `@types/yeoman-generator` | 5.2.11, 5.2.14 | 14 | Standardize to 6.0.0 |
| `@babel/core` | 7.28.0, 7.28.5 | 4 | Standardize to 7.28.6 |
| `@types/uuid` | 10.0.0, 3.4.11 | 4 | Standardize to 11.0.0 |
| `@sap-devx/yeoman-ui-types` | 1.14.4, 1.16.9 | 21 | Standardize to 1.21.0 |
| `memfs` | 3.3.0, 3.4.13 | 8 | Standardize to 4.56.10 |
| `semver` | 7.5.4, 7.6.3, 7.7.1 | 19 | Standardize to 7.7.3 |
| ~~`@types/fs-extra`~~ | 11.0.4, 9.0.13 | 15 | Standardize to 11.0.4 |
| `@types/semver` | 7.5.2, 7.5.4, 7.5.8, 7.7.0 | 19 | Standardize to 7.7.1 |
| `fs-extra` | 10.0.0, 11.1.1 | 15 | Standardize to 11.3.3 |
| `@jest/types` | 30.0.0, 30.0.1 | 6 | Standardize to 30.2.0 |
| `@types/vscode` | 1.102.0, 1.73.1 | 10 | Standardize to 1.108.1 |
| `adm-zip` | 0.5.10, 0.5.16 | 4 | Standardize to 0.5.16 |
| `js-yaml` | 3.14.2, 4.1.1 | 5 | Standardize to 4.1.1 |
| `uuid` | 10.0.0, 11.0.5, 3.4.0 | 5 | Standardize to 13.0.0 |
| `express` | 4, 4.22.1 | 8 | Standardize to 5.2.1 |
| `nock` | 13.4.0, 13.5.6 | 11 | Standardize to 14.0.10 |
| `@sap-ux/vocabularies-types` | 0.13.1, 0.14.5 | 8 | Standardize to 0.14.6 |
| `https-proxy-agent` | 5.0.1, 7.0.5 | 3 | Standardize to 7.0.6 |
| `http-proxy-middleware` | 2.0.9, 3.0.5 | 4 | Standardize to 3.0.5 |
| `@testing-library/jest-dom` | 5.17.0, 6.9.1 | 4 | Standardize to 6.9.1 |
| `@sap-ux/edmx-parser` | 0.9.1, 0.9.6 | 5 | Standardize to 0.9.8 |
| `logform` | 2.4.0, 2.6.0 | 2 | Standardize to 2.7.0 |
| `@ui5/cli` | 4, 4.0.33 | 3 | Standardize to error |
| `@ui5/project` | 3.9.0 || ^4.0.0, 4.0.8 | 1 | Standardize to 4.0.9 |
| `@types/prettier` | 2.7.1, 2.7.3 | 2 | Standardize to 3.0.0 |
| `jest-dev-server` | 10.0.0, 11.0.0 | 2 | Standardize to 11.0.0 |

---

## Unused Dependencies (Knip Analysis)

Knip detected the following unused dependencies, exports, and files:

**Files analyzed:** 838
**Issues found:** 440

### Unused Dependencies (24 files)

<details>
<summary>Click to expand</summary>

**packages/ui-service-sub-generator/package.json**
- `@sap-ux/inquirer-common`

**packages/fiori-app-sub-generator/package.json**
- `@sap-ux/annotation-generator`
- `@sap/service-provider-apis`

**packages/generator-adp/package.json**
- `@sap-devx/feature-toggle-node`
- `@sap-ux/store`

**packages/repo-app-import-sub-generator/package.json**
- `@sap-ux/store`
- `@sap-ux/system-access`

**packages/odata-service-inquirer/package.json**
- `os-name`

**packages/fiori-elements-writer/package.json**
- `@sap-ux/ui5-config`

**packages/adp-flp-config-sub-generator/package.json**
- `@sap-ux/store`

**examples/ui-prompting-examples/package.json**
- `react-markdown`
- `sanitize-html`

**packages/ui5-test-writer/package.json**
- `ejs`

**packages/ui5-library-reference-sub-generator/package.json**
- `@sap-ux/telemetry`

**packages/preview-middleware/package.json**
- `@sap-ux/control-property-editor-sources`
- `@sap-ux/system-access`

**packages/eslint-plugin-fiori-tools/package.json**
- `@sap-ux/odata-vocabularies`
- `@sap-ux/odata-entity-model`
- `@sap-ux/vocabularies-types`
- `lodash`
- `requireindex`
- `yaml`

**packages/ui5-library-inquirer/package.json**
- `@sap-ux/logger`

**packages/adp-tooling/package.json**
- `@sap-devx/yeoman-ui-types`
- `inquirer`

**packages/abap-deploy-config-writer/package.json**
- `@sap-ux/system-access`

**packages/fiori-annotation-api/package.json**
- `@sap-ux/annotation-converter`

**packages/cap-config-writer/package.json**
- `semver`
- `xml-js`

**packages/inquirer-common/package.json**
- `@sap-ux/feature-toggle`
- `@sap-ux/odata-service-writer`

**packages/odata-service-writer/package.json**
- `ejs`

**examples/odata-cli/package.json**
- `fast-xml-parser`

... and 4 more files


</details>

### Unused Dev Dependencies (49 files)

<details>
<summary>Click to expand</summary>

**packages/ui-service-sub-generator/package.json**
- `@sap-ux/store`

**packages/fiori-app-sub-generator/package.json**
- `@types/vscode`
- `jest-mock`

**packages/generator-adp/package.json**
- `@jest/types`
- `@types/fs-extra`
- `@types/inquirer`
- `@sap-ux/deploy-config-sub-generator`
- `fs-extra`

**packages/repo-app-import-sub-generator/package.json**
- `@jest/types`
- `@sap-ux/nodejs-utils`
- `@sap-ux/store`
- `memfs`
- `lodash`
- `@types/lodash`
- `unionfs`

**packages/odata-service-inquirer/package.json**
- `@sap-ux/fiori-freestyle-writer`

**packages/fiori-elements-writer/package.json**
- `@sap-ux/project-access`
- `@sap-ux/eslint-plugin-fiori-tools`

**packages/adp-flp-config-sub-generator/package.json**
- `@jest/types`
- `@types/vscode`

**examples/ui-prompting-examples/package.json**
- `@babel/helper-define-map`
- `@storybook/react`
- `@types/sanitize-html`
- `@types/uuid`
- `babel-loader`
- `css-loader`
- `eslint-plugin-storybook`
- `sass`
- `sass-loader`
- `style-loader`

**packages/ui5-test-writer/package.json**
- `@types/ejs`
- `@types/fs-extra`
- `fs-extra`

**packages/ui5-library-reference-sub-generator/package.json**
- `@jest/types`

**packages/preview-middleware/package.json**
- `@private/preview-middleware-client`
- `@sap-ux/store`
- `@types/prompts`

**packages/eslint-plugin-fiori-tools/package.json**
- `@typescript-eslint/rule-tester`

**packages/adp-tooling/package.json**
- `@types/inquirer`
- `dotenv`

**packages/fiori-annotation-api/package.json**
- `@sap/cds-compiler`

**packages/cap-config-writer/package.json**
- `@types/semver`

**packages/odata-service-writer/package.json**
- `@types/ejs`

**packages/axios-extension/package.json**
- `@sap-ux/vocabularies-types`

**package.json**
- `@eslint/js`
- `prebuild-install`
- `react-select`

**packages/deploy-config-sub-generator/package.json**
- `@types/js-yaml`
- `@sap-ux/abap-deploy-config-inquirer`
- `@sap/mta-lib`
- `js-yaml`
- `os-name`

**packages/ui-service-inquirer/package.json**
- `@types/inquirer-autocomplete-prompt`
- `@types/yeoman-test`
- `yeoman-test`

... and 29 more files


</details>

### Unlisted Dependencies (365 files)

<details>
<summary>Click to expand</summary>

**packages/generator-adp/jest.config.js**
- `@sap-ux/jest-file-matchers`

**packages/repo-app-import-sub-generator/jest.config.js**
- `@sap-ux/jest-file-matchers`

**packages/ui5-application-writer/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/flp-config-inquirer/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/preview-middleware/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/ui5-library-writer/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/fe-fpm-writer/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/deploy-config-generator-shared/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/ui5-library-reference-inquirer/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/abap-deploy-config-inquirer/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/cf-deploy-config-inquirer/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/eslint-plugin-fiori-tools/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/ui5-application-inquirer/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/annotation-generator/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/ui5-library-inquirer/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/deploy-tooling/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/ui-prompting/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/adp-tooling/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/abap-deploy-config-writer/jest.config.js**
- `vscode-languageserver-textdocument`

**packages/cap-config-writer/jest.config.js**
- `vscode-languageserver-textdocument`

... and 345 more files


</details>


---

## Phased Implementation Plan

### Phase 1: Foundation & Quick Wins (Weeks 1-3)

**Goal:** Apply low-risk updates and fix version inconsistencies

**Tasks:**
- Apply all 48 patch updates
- Resolve 42 version inconsistencies
- Update development tooling (linters, formatters)

**Estimated Effort:** 45h
**Risk Level:** LOW

### Phase 2: Medium Priority Major Updates (Weeks 4-7)

**Goal:** Update dependencies with <5 package impact

**Tasks:**
- Update 63 medium-priority major dependencies
- Apply 61 minor updates

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
- Update 16 critical major dependencies
- May require incremental migration strategy
- Extensive testing and validation

**Estimated Effort:** 192h
**Risk Level:** CRITICAL

### Total Estimated Effort

**608 hours** across 12-18 weeks

---

## Detailed Dependency List

### All 293 Dependencies

<details>
<summary>Click to expand complete dependency list</summary>

| Status | Dependency | Current | Latest | Age | Type | Used In | Action |
|--------|------------|---------|--------|-----|------|---------|--------|
| 🟡 | `@changesets/cli` | 2.27.10 | 2.29.8 | 1 year old | MINOR | 1 | Should update |
| 🟢 | `@eslint/eslintrc` | 3.3.0 | 3.3.3 | 11 months old | PATCH | 1 | Safe to update |
| 🔴 | `@eslint/js` | 9 | error | unknown | UNKNOWN | 2 | Manual check required |
| 🟡 | `@playwright/test` | 1.56.1 | 1.58.0 | 3 months old | MINOR | 3 | Should update |
| 🟢 | ~~`@types/jest`~~ | 30.0.0 | 30.0.0 | 7 months old | NONE | 1 | Up to date |
| 🟡 | `@types/node` | 18.19.130 | 25.0.10 | 3 months old | MAJOR | 2 | Should update |
| 🟢 | `autoprefixer` | 10.4.21 | 10.4.23 | 10 months old | PATCH | 1 | Safe to update |
| 🔴 | `check-dependency-version-consistency` | 5.0.1 | 6.0.0 | 7 months old | MAJOR | 1 | Review required |
| 🟡 | `esbuild` | 0.25.11 | 0.27.2 | 3 months old | MINOR | 2 | Should update |
| 🟡 | `esbuild-sass-plugin` | 3.3.1 | 3.6.0 | 1 year old | MINOR | 1 | Should update |
| 🔴 | `eslint` | 9 | error | unknown | UNKNOWN | 4 | Manual check required |
| 🟢 | `eslint-config-prettier` | 10.1.1 | 10.1.8 | 10 months old | PATCH | 1 | Safe to update |
| 🟢 | ~~`eslint-import-resolver-typescript`~~ | 4.4.4 | 4.4.4 | 7 months old | NONE | 1 | Up to date |
| 🟢 | ~~`eslint-plugin-import`~~ | 2.32.0 | 2.32.0 | 7 months old | NONE | 1 | Up to date |
| 🔴 | `eslint-plugin-jsdoc` | 50.8.0 | 62.4.1 | 7 months old | MAJOR | 2 | Review required |
| 🟢 | `eslint-plugin-prettier` | 5.5.4 | 5.5.5 | 5 months old | PATCH | 1 | Safe to update |
| 🟢 | ~~`eslint-plugin-promise`~~ | 7.2.1 | 7.2.1 | 1 year old | NONE | 1 | Up to date |
| 🟢 | `eslint-plugin-sonarjs` | 3.0.5 | 3.0.6 | 5 months old | PATCH | 1 | Safe to update |
| 🔴 | `globals` | 16.0.0 | 17.2.0 | 11 months old | MAJOR | 2 | Review required |
| 🔴 | `husky` | 8.0.3 | 9.1.7 | 3 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`jest`~~ | 30.2.0 | 30.2.0 | 4 months old | NONE | 1 | Up to date |
| 🟢 | ~~`jest-sonar`~~ | 0.2.16 | 0.2.16 | 2 years old | NONE | 1 | Up to date |
| 🟡 | `knip` | 5.69.0 | 5.82.1 | 2 months old | MINOR | 1 | Should update |
| 🔴 | `npm-run-all2` | 5.0.0 | 8.0.4 | 5 years old | MAJOR | 22 | Review required |
| 🟡 | `nx` | 21.6.5 | 22.4.2 | 3 months old | MAJOR | 1 | Should update |
| 🟢 | ~~`postcss`~~ | 8.5.6 | 8.5.6 | 7 months old | NONE | 1 | Up to date |
| 🟢 | ~~`prebuild-install`~~ | 7.1.3 | 7.1.3 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `prettier` | 2.5.1 | 3.8.1 | 4 years old | MAJOR | 3 | Review required |
| 🔴 | `pretty-quick` | 3.3.1 | 4.2.2 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`react-select`~~ | 5.10.2 | 5.10.2 | 6 months old | NONE | 2 | Up to date |
| 🟢 | `react-virtualized` | 9.22.5 | 9.22.6 | 2 years old | PATCH | 2 | Safe to update |
| 🟡 | `rimraf` | 6.0.1 | 6.1.2 | 1 year old | MINOR | 19 | Should update |
| 🟢 | `ts-jest` | 29.4.5 | 29.4.6 | 3 months old | PATCH | 3 | Safe to update |
| 🟢 | ~~`typescript`~~ | 5.9.3 | 5.9.3 | 3 months old | NONE | 2 | Up to date |
| 🟡 | `typescript-eslint` | 8.46.2 | 8.54.0 | 3 months old | MINOR | 3 | Should update |
| 🟡 | `update-ts-references` | 3.6.2 | 4.0.0 | 5 months old | MAJOR | 1 | Should update |
| 🔴 | `yargs-parser` | 21.1.1 | 22.0.0 | 3 years old | MAJOR | 2 | Review required |
| 🟡 | `yaml` | 2.2.2 | 2.8.2 | 2 years old | MINOR | 6 | Should update |
| 🔴 | `inquirer` | 8.0.0 | 13.2.1 | 4 years old | MAJOR | 11 | Review required |
| 🔴 | `mem-fs` | 2.1.0 | 4.1.3 | 4 years old | MAJOR | 28 | Review required |
| 🔴 | `mem-fs-editor` | 9.4.0 | 11.1.4 | 4 years old | MAJOR | 32 | Review required |
| 🟡 | `@types/inquirer` | 8.0.0 | 9.0.9 | unknown | MAJOR | 23 | Should update |
| 🔴 | `@types/mem-fs` | 1.1.2 | 2.2.0 | 7 years old | MAJOR | 31 | Review required |
| 🔴 | `@types/mem-fs-editor` | 7.0.1 | 10.0.1 | 4 years old | MAJOR | 35 | Review required |
| 🟢 | `@types/vinyl` | 2.0.7 | 2.0.12 | 3 years old | PATCH | 3 | Safe to update |
| 🔴 | `dotenv` | 16.6.1 | 17.2.3 | 7 months old | MAJOR | 9 | Review required |
| 🔴 | `fast-xml-parser` | 4.3.4 | 5.3.3 | 1 year old | MAJOR | 6 | Review required |
| 🔴 | `yeoman-generator` | 5.10.0 | 7.5.1 | 2 years old | MAJOR | 13 | Review required |
| 🔴 | `@types/yeoman-environment` | 2.10.11 | 4.0.0 | 2 years old | MAJOR | 11 | Review required |
| 🔴 | `@types/yeoman-generator` | 5.2.11 | 6.0.0 | 3 years old | MAJOR | 14 | Review required |
| 🟡 | `axios` | 1.12.2 | 1.13.4 | 4 months old | MINOR | 16 | Should update |
| 🔴 | `react-markdown` | 5.0.2 | 10.1.0 | 5 years old | MAJOR | 2 | Review required |
| 🟡 | `sanitize-html` | 2.12.1 | 2.17.0 | 1 year old | MINOR | 2 | Should update |
| 🟢 | `@babel/core` | 7.28.0 | 7.28.6 | 7 months old | PATCH | 4 | Safe to update |
| 🟢 | ~~`@babel/helper-define-map`~~ | 7.18.6 | 7.18.6 | 3 years old | NONE | 3 | Up to date |
| 🟢 | `@babel/preset-env` | 7.28.0 | 7.28.6 | 7 months old | PATCH | 3 | Safe to update |
| 🟡 | `@babel/preset-react` | 7.27.1 | 7.28.5 | 9 months old | MINOR | 3 | Should update |
| 🟡 | `@babel/preset-typescript` | 7.27.1 | 7.28.5 | 9 months old | MINOR | 3 | Should update |
| 🟢 | `@storybook/addons` | 7.6.20 | 7.6.17 | 1 year old | NONE | 2 | Up to date |
| 🟡 | `@storybook/components` | 8.4.2 | 8.6.14 | 1 year old | MINOR | 2 | Should update |
| 🔴 | `@storybook/react` | 8.4.2 | 10.2.1 | 1 year old | MAJOR | 3 | Review required |
| 🔴 | `@storybook/react-webpack5` | 8.4.2 | 10.2.1 | 1 year old | MAJOR | 3 | Review required |
| 🔴 | `@types/react` | 16.14.55 | 19.2.10 | 2 years old | MAJOR | 5 | Review required |
| 🔴 | `@types/react-dom` | 16.9.24 | 19.2.3 | 2 years old | MAJOR | 5 | Review required |
| 🟡 | `@types/sanitize-html` | 2.11.0 | 2.16.0 | 1 year old | MINOR | 2 | Should update |
| 🔴 | `@types/uuid` | 10.0.0 | 11.0.0 | 1 year old | MAJOR | 4 | Review required |
| 🟡 | `@types/ws` | 8.5.12 | 8.18.1 | 1 year old | MINOR | 1 | Should update |
| 🔴 | `babel-loader` | 9.1.3 | 10.0.0 | 2 years old | MAJOR | 3 | Review required |
| 🟢 | ~~`copyfiles`~~ | 2.4.1 | 2.4.1 | 5 years old | NONE | 4 | Up to date |
| 🔴 | `css-loader` | 6.8.1 | 7.1.3 | 2 years old | MAJOR | 3 | Review required |
| 🟢 | ~~`eslint-plugin-react`~~ | 7.37.5 | 7.37.5 | 9 months old | NONE | 4 | Up to date |
| 🔴 | `eslint-plugin-storybook` | 0.6.15 | 10.2.1 | 2 years old | MAJOR | 3 | Review required |
| 🔴 | `react` | 16.14.0 | 19.2.4 | 5 years old | MAJOR | 5 | Review required |
| 🔴 | `react-dom` | 16.14.0 | 19.2.4 | 5 years old | MAJOR | 5 | Review required |
| 🟡 | `sass` | 1.66.1 | 1.97.3 | 2 years old | MINOR | 3 | Should update |
| 🔴 | `sass-loader` | 13.3.2 | 16.0.6 | 2 years old | MAJOR | 3 | Review required |
| 🟡 | `storybook` | 8.6.15 | 10.2.1 | 1 month old | MAJOR | 3 | Should update |
| 🟢 | ~~`storybook-addon-turbo-build`~~ | 2.0.1 | 2.0.1 | 2 years old | NONE | 3 | Up to date |
| 🔴 | `style-loader` | 3.3.3 | 4.0.0 | 2 years old | MAJOR | 3 | Review required |
| 🟡 | `ts-loader` | 9.4.4 | 9.5.4 | 2 years old | MINOR | 3 | Should update |
| 🟢 | ~~`ts-node`~~ | 10.9.2 | 10.9.2 | 2 years old | NONE | 4 | Up to date |
| 🟡 | `ws` | 8.18.0 | 8.19.0 | 1 year old | MINOR | 1 | Should update |
| 🟢 | ~~`i18next`~~ | 25.8.0 | 25.8.0 | 7 days old | NONE | 45 | Up to date |
| 🟡 | `@sap-devx/yeoman-ui-types` | 1.14.4 | 1.21.0 | 1 year old | MINOR | 21 | Should update |
| 🔴 | `inquirer-autocomplete-prompt` | 2.0.1 | 3.0.1 | 2 years old | MAJOR | 6 | Review required |
| 🔴 | `@types/inquirer-autocomplete-prompt` | 2.0.2 | 3.0.3 | 2 years old | MAJOR | 7 | Review required |
| 🔴 | `@types/yeoman-test` | 4.0.6 | 7.0.0 | 2 years old | MAJOR | 12 | Review required |
| 🔴 | `memfs` | 3.3.0 | 4.56.10 | 4 years old | MAJOR | 8 | Review required |
| 🟡 | `unionfs` | 4.4.0 | 4.6.0 | 5 years old | MINOR | 8 | Should update |
| 🔴 | `yeoman-test` | 6.3.0 | 11.2.0 | 3 years old | MAJOR | 12 | Review required |
| 🟢 | `fast-glob` | 3.3.1 | 3.3.3 | 2 years old | PATCH | 3 | Safe to update |
| 🟢 | `lodash` | 4.17.21 | 4.17.23 | 4 years old | PATCH | 17 | Safe to update |
| 🟡 | `semver` | 7.5.4 | 7.7.3 | 2 years old | MINOR | 19 | Should update |
| 🟢 | ~~`@types/fs-extra`~~ | 11.0.4 | 11.0.4 | 2 years old | NONE | 15 | Up to date |
| 🟡 | `@types/lodash` | 4.14.202 | 4.17.23 | 2 years old | MINOR | 15 | Should update |
| 🟡 | `@types/semver` | 7.5.2 | 7.7.1 | 2 years old | MINOR | 19 | Should update |
| 🔴 | `fs-extra` | 10.0.0 | 11.3.3 | 4 years old | MAJOR | 15 | Review required |
| 🟡 | `@jest/types` | 30.0.0 | 30.2.0 | 7 months old | MINOR | 6 | Should update |
| 🟡 | `@types/vscode` | 1.102.0 | 1.108.1 | 6 months old | MINOR | 10 | Should update |
| 🟢 | ~~`@vscode-logging/logger`~~ | 2.0.0 | 2.0.0 | 2 years old | NONE | 9 | Up to date |
| 🟢 | ~~`@sap/cf-tools`~~ | 3.2.2 | 3.2.2 | 1 year old | NONE | 6 | Up to date |
| 🟢 | `adm-zip` | 0.5.10 | 0.5.16 | 3 years old | PATCH | 4 | Safe to update |
| 🔴 | `ejs` | 3.1.10 | 4.0.1 | 1 year old | MAJOR | 12 | Review required |
| 🟡 | `js-yaml` | 3.14.2 | 4.1.1 | 2 months old | MAJOR | 5 | Should update |
| 🟢 | ~~`prompts`~~ | 2.4.2 | 2.4.2 | 4 years old | NONE | 8 | Up to date |
| 🟢 | ~~`sanitize-filename`~~ | 1.6.3 | 1.6.3 | 6 years old | NONE | 1 | Up to date |
| 🔴 | `uuid` | 10.0.0 | 13.0.0 | 1 year old | MAJOR | 5 | Review required |
| 🟢 | `@types/adm-zip` | 0.5.5 | 0.5.7 | 2 years old | PATCH | 4 | Safe to update |
| 🟢 | `@types/ejs` | 3.1.2 | 3.1.5 | 2 years old | PATCH | 11 | Safe to update |
| 🔴 | `@types/express` | 4.17.21 | 5.0.6 | 2 years old | MAJOR | 8 | Review required |
| 🟢 | ~~`@types/js-yaml`~~ | 4.0.9 | 4.0.9 | 2 years old | NONE | 5 | Up to date |
| 🟢 | `@types/prompts` | 2.4.4 | 2.4.9 | 2 years old | PATCH | 9 | Safe to update |
| 🔴 | `@types/supertest` | 2.0.12 | 6.0.3 | 3 years old | MAJOR | 7 | Review required |
| 🔴 | `cross-env` | 7.0.3 | 10.1.0 | 5 years old | MAJOR | 4 | Review required |
| 🔴 | `express` | 4 | 5.2.1 | unknown | UNKNOWN | 8 | Manual check required |
| 🔴 | `nock` | 13.4.0 | 14.0.10 | 2 years old | MAJOR | 11 | Review required |
| 🟡 | `supertest` | 7.1.4 | 7.2.2 | 6 months old | MINOR | 8 | Should update |
| 🟢 | `@sap-ux/annotation-converter` | 0.10.19 | 0.10.20 | 21 days old | PATCH | 8 | Safe to update |
| 🟡 | `@sap-ux/vocabularies-types` | 0.13.1 | 0.14.6 | 2 months old | MINOR | 8 | Should update |
| 🔴 | `chalk` | 4.1.2 | 5.6.2 | 4 years old | MAJOR | 8 | Review required |
| 🟢 | ~~`detect-content-type`~~ | 1.2.0 | 1.2.0 | 7 years old | NONE | 1 | Up to date |
| 🔴 | `open` | 7.0.3 | 11.0.0 | 5 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`qs`~~ | 6.14.1 | 6.14.1 | 29 days old | NONE | 1 | Up to date |
| 🟢 | `xpath` | 0.0.33 | 0.0.34 | 2 years old | PATCH | 2 | Safe to update |
| 🟢 | `@xmldom/xmldom` | 0.8.10 | 0.8.11 | 2 years old | PATCH | 2 | Safe to update |
| 🔴 | `https-proxy-agent` | 5.0.1 | 7.0.6 | 3 years old | MAJOR | 3 | Review required |
| 🟢 | ~~`http-proxy-agent`~~ | 7.0.2 | 7.0.2 | 1 year old | NONE | 1 | Up to date |
| 🟢 | ~~`proxy-from-env`~~ | 1.1.0 | 1.1.0 | 5 years old | NONE | 3 | Up to date |
| 🟢 | `@types/proxy-from-env` | 1.0.1 | 1.0.4 | 5 years old | PATCH | 3 | Safe to update |
| 🔴 | `http-proxy-middleware` | 2.0.9 | 3.0.5 | 9 months old | MAJOR | 4 | Review required |
| 🟢 | ~~`@types/connect`~~ | 3.4.38 | 3.4.38 | 2 years old | NONE | 3 | Up to date |
| 🟢 | `@types/http-proxy` | 1.17.5 | 1.17.17 | 5 years old | PATCH | 2 | Safe to update |
| 🟢 | ~~`connect`~~ | 3.7.0 | 3.7.0 | 6 years old | NONE | 3 | Up to date |
| 🟡 | `@sap/bas-sdk` | 3.12.0 | 3.13.1 | 4 months old | MINOR | 3 | Should update |
| 🟢 | ~~`xml-js`~~ | 1.6.11 | 1.6.11 | 6 years old | NONE | 1 | Up to date |
| 🔴 | `chevrotain` | 7.1.1 | 11.1.1 | 4 years old | MAJOR | 2 | Review required |
| 🟢 | ~~`@sap/ux-cds-compiler-facade`~~ | 1.19.0 | 1.19.0 | 3 months old | NONE | 2 | Up to date |
| 🟢 | ~~`hasbin`~~ | 1.2.3 | 1.2.3 | 9 years old | NONE | 3 | Up to date |
| 🟢 | ~~`@types/hasbin`~~ | 1.2.2 | 1.2.2 | 2 years old | NONE | 3 | Up to date |
| 🟢 | ~~`@sap/mta-lib`~~ | 1.7.4 | 1.7.4 | 4 years old | NONE | 3 | Up to date |
| 🟢 | ~~`mta`~~ | 1.0.8 | 1.0.8 | 2 years old | NONE | 1 | Up to date |
| 🟡 | `@fluentui/react` | 8.120.5 | 8.125.4 | 1 year old | MINOR | 2 | Should update |
| 🟡 | `@fluentui/react-hooks` | 8.6.14 | 8.10.2 | 3 years old | MINOR | 1 | Should update |
| 🔴 | `@reduxjs/toolkit` | 1.6.1 | 2.11.2 | 4 years old | MAJOR | 2 | Review required |
| 🔴 | `@testing-library/jest-dom` | 5.17.0 | 6.9.1 | 2 years old | MAJOR | 4 | Review required |
| 🔴 | `@testing-library/react` | 12.1.5 | 16.3.2 | 3 years old | MAJOR | 4 | Review required |
| 🔴 | `@testing-library/dom` | 9.3.4 | 10.4.1 | 2 years old | MAJOR | 2 | Review required |
| 🟢 | `@types/react-redux` | 7.1.33 | 7.1.34 | 2 years old | PATCH | 2 | Safe to update |
| 🟢 | `@types/redux-logger` | 3.0.7 | 3.0.13 | 6 years old | PATCH | 1 | Safe to update |
| 🟢 | `@types/remote-redux-devtools` | 0.5.4 | 0.5.8 | 6 years old | PATCH | 1 | Safe to update |
| 🟢 | `@types/source-map-support` | 0.5.0 | 0.5.10 | 6 years old | PATCH | 1 | Safe to update |
| 🟡 | `body-parser` | 1.20.4 | 2.2.2 | 1 month old | MAJOR | 1 | Should update |
| 🟢 | ~~`jest-scss-transform`~~ | 1.0.4 | 1.0.4 | 1 year old | NONE | 4 | Up to date |
| 🔴 | `react-i18next` | 15.4.1 | 16.5.4 | 11 months old | MAJOR | 2 | Review required |
| 🔴 | `react-redux` | 7.2.9 | 9.2.0 | 3 years old | MAJOR | 2 | Review required |
| 🔴 | `redux` | 4.0.4 | 5.0.1 | 6 years old | MAJOR | 2 | Review required |
| 🟢 | ~~`redux-logger`~~ | 3.0.6 | 3.0.6 | 8 years old | NONE | 1 | Up to date |
| 🟢 | `source-map-support` | 0.5.16 | 0.5.21 | 6 years old | PATCH | 1 | Safe to update |
| 🟢 | ~~`stream-browserify`~~ | 3.0.0 | 3.0.0 | 5 years old | NONE | 1 | Up to date |
| 🔴 | `ts-import-plugin` | 1.6.3 | 3.0.0 | 5 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`postcss-modules`~~ | 6.0.1 | 6.0.1 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `@ui5/fs` | 3.0.4 | 4.0.4 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`esbuild-plugin-alias`~~ | 0.2.1 | 0.2.1 | 4 years old | NONE | 2 | Up to date |
| 🟢 | ~~`esbuild-plugin-copy`~~ | 2.1.1 | 2.1.1 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@esbuild-plugins/node-modules-polyfill`~~ | 0.2.2 | 0.2.2 | 3 years old | NONE | 2 | Up to date |
| 🔴 | `commander` | 9.4.0 | 14.0.2 | 3 years old | MAJOR | 2 | Review required |
| 🟡 | `diff` | 5.2.2 | 8.0.3 | 8 days old | MAJOR | 1 | Should update |
| 🔴 | `@types/diff` | 5.0.9 | 8.0.0 | 2 years old | MAJOR | 2 | Review required |
| 🔴 | `os-name` | 4.0.1 | 6.1.0 | 4 years old | MAJOR | 6 | Review required |
| 🟢 | ~~`archiver`~~ | 7.0.1 | 7.0.1 | 1 year old | NONE | 1 | Up to date |
| 🟢 | `glob-gitignore` | 1.0.14 | 1.0.15 | 6 years old | PATCH | 1 | Safe to update |
| 🔴 | `ignore` | 5.2.4 | 7.0.5 | 3 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`minimist`~~ | 1.2.8 | 1.2.8 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`yamljs`~~ | 0.3.0 | 0.3.0 | 8 years old | NONE | 1 | Up to date |
| 🔴 | `@types/archiver` | 5.3.4 | 7.0.0 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | `@types/minimist` | 1.2.2 | 1.2.5 | 4 years old | PATCH | 1 | Safe to update |
| 🟢 | `@babel/eslint-parser` | 7.28.5 | 7.28.6 | 3 months old | PATCH | 1 | Safe to update |
| 🟡 | `@eslint/json` | 0.13.2 | 0.14.0 | 5 months old | MINOR | 1 | Should update |
| 🟡 | `@eslint/core` | 0.17.0 | 1.0.1 | 3 months old | MAJOR | 1 | Should update |
| 🟢 | `@eslint/config-helpers` | 0.5.0 | 0.5.1 | 2 months old | PATCH | 1 | Safe to update |
| 🟡 | `@typescript-eslint/eslint-plugin` | 8.49.0 | 8.54.0 | 1 month old | MINOR | 1 | Should update |
| 🟡 | `@typescript-eslint/parser` | 8.49.0 | 8.54.0 | 1 month old | MINOR | 1 | Should update |
| 🟢 | ~~`@xml-tools/ast`~~ | 5.0.5 | 5.0.5 | 4 years old | NONE | 3 | Up to date |
| 🟢 | ~~`@xml-tools/parser`~~ | 1.0.11 | 1.0.11 | 4 years old | NONE | 3 | Up to date |
| 🟢 | `@humanwhocodes/momoa` | 3.3.9 | 3.3.10 | 6 months old | PATCH | 1 | Safe to update |
| 🟢 | `@eslint/plugin-kit` | 0.5.0 | 0.5.1 | 2 months old | PATCH | 1 | Safe to update |
| 🟢 | ~~`requireindex`~~ | 1.2.0 | 1.2.0 | 7 years old | NONE | 1 | Up to date |
| 🟢 | `synckit` | 0.11.11 | 0.11.12 | 6 months old | PATCH | 1 | Safe to update |
| 🟢 | ~~`c8`~~ | 10.1.3 | 10.1.3 | 1 year old | NONE | 1 | Up to date |
| 🟡 | `@typescript-eslint/rule-tester` | 8.46.2 | 8.54.0 | 3 months old | MINOR | 1 | Should update |
| 🟡 | `eslint-plugin-eslint-plugin` | 7.2.0 | 7.3.0 | 3 months old | MINOR | 1 | Should update |
| 🔴 | `xml-formatter` | 2.6.1 | 3.6.7 | 3 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`@types/jest-when`~~ | 3.5.5 | 3.5.5 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`jest-when`~~ | 3.7.0 | 3.7.0 | 1 year old | NONE | 1 | Up to date |
| 🟢 | `vscode-languageserver-textdocument` | 1.0.11 | 1.0.12 | 2 years old | PATCH | 3 | Safe to update |
| 🔴 | `@sap/cds-compiler` | 4.8.0 | 6.6.2 | 1 year old | MAJOR | 1 | Review required |
| 🟢 | `@sap-ux/edmx-parser` | 0.9.1 | 0.9.8 | 8 months old | PATCH | 5 | Safe to update |
| 🟡 | `@sap/service-provider-apis` | 2.5.1 | 2.7.0 | 4 months old | MINOR | 2 | Should update |
| 🔴 | `jest-extended` | 6.0.0 | 7.0.0 | 7 months old | MAJOR | 10 | Review required |
| 🟢 | ~~`jest-mock`~~ | 30.2.0 | 30.2.0 | 4 months old | NONE | 1 | Up to date |
| 🟢 | ~~`mock-spawn`~~ | 0.2.6 | 0.2.6 | 10 years old | NONE | 3 | Up to date |
| 🟢 | ~~`@npm/types`~~ | 2.1.0 | 2.1.0 | 9 months old | NONE | 1 | Up to date |
| 🟡 | `@lancedb/lancedb` | 0.22.0 | 0.23.0 | 4 months old | MINOR | 2 | Should update |
| 🟢 | ~~`@xenova/transformers`~~ | 2.17.2 | 2.17.2 | 1 year old | NONE | 2 | Up to date |
| 🟢 | ~~`node-fetch`~~ | 3.3.2 | 3.3.2 | 2 years old | NONE | 1 | Up to date |
| 🔴 | `marked` | 12.0.0 | 17.0.1 | 1 year old | MAJOR | 1 | Review required |
| 🟢 | ~~`gray-matter`~~ | 4.0.3 | 4.0.3 | 4 years old | NONE | 1 | Up to date |
| 🟡 | `tsx` | 4.7.0 | 4.21.0 | 2 years old | MINOR | 1 | Should update |
| 🔴 | `read-pkg-up` | 7.0.1 | 11.0.0 | 6 years old | MAJOR | 3 | Review required |
| 🟡 | `logform` | 2.4.0 | 2.7.0 | 3 years old | MINOR | 2 | Should update |
| 🟢 | `@modelcontextprotocol/sdk` | 1.25.2 | 1.25.3 | 21 days old | PATCH | 1 | Safe to update |
| 🟢 | ~~`@sap/ux-specification`~~ | 1.142.0 | 1.142.0 | 8 days old | NONE | 2 | Up to date |
| 🟢 | `@types/json-schema` | 7.0.5 | 7.0.15 | 5 years old | PATCH | 1 | Safe to update |
| 🟡 | `zod` | 4.1.13 | 4.3.6 | 2 months old | MINOR | 1 | Should update |
| 🟡 | `@sap-ai-sdk/foundation-models` | 2.3.0 | 2.5.0 | 2 months old | MINOR | 1 | Should update |
| 🟡 | `@sap-ai-sdk/langchain` | 2.3.0 | 2.5.0 | 2 months old | MINOR | 1 | Should update |
| 🟡 | `promptfoo` | 0.119.14 | 0.120.18 | 1 month old | MINOR | 1 | Should update |
| 🟡 | `@langchain/mcp-adapters` | 1.0.2 | 1.1.2 | 1 month old | MINOR | 1 | Should update |
| 🟢 | `@langchain/core` | 1.1.8 | 1.1.17 | 1 month old | PATCH | 1 | Safe to update |
| 🟢 | ~~`@sap-devx/feature-toggle-node`~~ | 2.0.3 | 2.0.3 | 10 months old | NONE | 1 | Up to date |
| 🟡 | `jsonc-parser` | 3.2.0 | 3.3.1 | 3 years old | MINOR | 3 | Should update |
| 🔴 | `figures` | 3.2.0 | 6.1.0 | 5 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`fuzzy`~~ | 0.1.3 | 0.1.3 | 9 years old | NONE | 1 | Up to date |
| 🔴 | `jest-environment-jsdom` | 29.7.0 | 30.2.0 | 2 years old | MAJOR | 3 | Review required |
| 🔴 | `tsconfig-paths` | 3.15.0 | 4.2.0 | 2 years old | MAJOR | 1 | Review required |
| 🔴 | `@ui5/cli` | 4 | error | unknown | UNKNOWN | 3 | Manual check required |
| 🟡 | `@ui5/project` | 3.9.0 || ^4.0.0 | 4.0.9 | unknown | MAJOR | 1 | Should update |
| 🟢 | ~~`dir-compare`~~ | 5.0.0 | 5.0.0 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `filenamify` | 4.2.0 | 7.0.1 | 5 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`jest-diff`~~ | 30.2.0 | 30.2.0 | 4 months old | NONE | 1 | Up to date |
| 🔴 | `minimatch` | 3.0.5 | 10.1.1 | 3 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`jest-environment-node`~~ | 30.2.0 | 30.2.0 | 4 months old | NONE | 1 | Up to date |
| 🔴 | `puppeteer-core` | 22.15.0 | 24.36.1 | 1 year old | MAJOR | 1 | Review required |
| 🔴 | `which` | 2.0.2 | 6.0.0 | 6 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`@types/yargs-parser`~~ | 21.0.3 | 21.0.3 | 2 years old | NONE | 1 | Up to date |
| 🟡 | `winston` | 3.11.0 | 3.19.0 | 2 years old | MINOR | 1 | Should update |
| 🟡 | `winston-transport` | 4.7.0 | 4.9.0 | 1 year old | MINOR | 1 | Should update |
| 🟢 | ~~`@types/debug`~~ | 4.1.12 | 4.1.12 | 2 years old | NONE | 1 | Up to date |
| 🟢 | `axios-logger` | 2.8.0 | 2.8.1 | 1 year old | PATCH | 1 | Safe to update |
| 🟢 | ~~`circular-reference-remover`~~ | 2.1.0 | 2.1.0 | 4 years old | NONE | 1 | Up to date |
| 🟢 | ~~`prettify-xml`~~ | 1.2.0 | 1.2.0 | 8 years old | NONE | 1 | Up to date |
| 🔴 | `@types/prettier` | 2.7.1 | 3.0.0 | 3 years old | MAJOR | 2 | Review required |
| 🟢 | ~~`@sap-ux/logger`~~ | 0.8.0 | 0.8.0 | 1 month old | NONE | 1 | Up to date |
| 🔴 | `jest-dev-server` | 10.0.0 | 11.0.0 | 1 year old | MAJOR | 2 | Review required |
| 🟡 | `folder-hash` | 4.0.4 | 4.1.1 | 3 years old | MINOR | 1 | Should update |
| 🟢 | ~~`@types/folder-hash`~~ | 4.0.4 | 4.0.4 | 2 years old | NONE | 1 | Up to date |
| 🟢 | `portfinder` | 1.0.32 | 1.0.38 | 3 years old | PATCH | 3 | Safe to update |
| 🟢 | ~~`promisify-child-process`~~ | 4.1.2 | 4.1.2 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`qrcode`~~ | 1.5.4 | 1.5.4 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `@sap-ux-private/playwright` | 0.2.5 | unknown | unknown | UNKNOWN | 1 | Manual check required |
| 🟢 | `@types/qrcode` | 1.5.5 | 1.5.6 | 2 years old | PATCH | 1 | Safe to update |
| 🟡 | `@sapui5/types` | 1.120.5 | 1.144.0 | 1 year old | MINOR | 1 | Should update |
| 🟡 | `ui5-tooling-modules` | 3.33.0 | 3.34.3 | 3 months old | MINOR | 1 | Should update |
| 🟡 | `ui5-tooling-transpile` | 3.9.2 | 3.10.1 | 4 months old | MINOR | 1 | Should update |
| 🟡 | `@ui5/manifest` | 1.81.0 | 1.82.0 | 2 months old | MINOR | 3 | Should update |
| 🟢 | ~~`findit2`~~ | 2.2.3 | 2.2.3 | 11 years old | NONE | 1 | Up to date |
| 🔴 | `json-parse-even-better-errors` | 4.0.0 | 5.0.0 | 1 year old | MAJOR | 1 | Review required |
| 🟡 | `vscode-uri` | 3.0.7 | 3.1.0 | 3 years old | MINOR | 3 | Should update |
| 🔴 | `validate-npm-package-name` | 5.0.0 | 7.0.2 | 3 years old | MAJOR | 1 | Review required |
| 🟢 | `@types/validate-npm-package-name` | 4.0.1 | 4.0.2 | 2 years old | PATCH | 1 | Safe to update |
| 🟢 | ~~`lz-string`~~ | 1.5.0 | 1.5.0 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`connect-livereload`~~ | 0.6.1 | 0.6.1 | 7 years old | NONE | 1 | Up to date |
| 🟡 | `livereload` | 0.9.3 | 0.10.3 | 4 years old | MINOR | 1 | Should update |
| 🟢 | ~~`@types/connect-livereload`~~ | 0.6.3 | 0.6.3 | 2 years old | NONE | 1 | Up to date |
| 🟢 | ~~`@types/livereload`~~ | 0.9.5 | 0.9.5 | 2 years old | NONE | 1 | Up to date |
| 🔴 | `yeoman-environment` | 3.19.3 | 5.1.2 | 2 years old | MAJOR | 2 | Review required |
| 🟢 | `@types/normalize-path` | 3.0.0 | 3.0.2 | 7 years old | PATCH | 1 | Safe to update |
| 🟡 | `@zowe/secrets-for-zowe-sdk` | 8.1.2 | 8.29.4 | 1 year old | MINOR | 2 | Should update |
| 🟢 | ~~`normalize-path`~~ | 3.0.0 | 3.0.0 | 7 years old | NONE | 1 | Up to date |
| 🟡 | `@vscode/vsce` | 3.6.0 | 3.7.1 | 7 months old | MINOR | 1 | Should update |
| 🟢 | ~~`@testing-library/user-event`~~ | 14.6.1 | 14.6.1 | 1 year old | NONE | 1 | Up to date |
| 🔴 | `serve-static` | 1.16.2 | 2.2.1 | 1 year old | MAJOR | 1 | Review required |
| 🔴 | `@types/serve-static` | 1.15.5 | 2.2.0 | 2 years old | MAJOR | 1 | Review required |
| 🟢 | ~~`pluralize`~~ | 8.0.0 | 8.0.0 | 6 years old | NONE | 1 | Up to date |
| 🟡 | `reflect-metadata` | 0.1.13 | 0.2.2 | 7 years old | MINOR | 1 | Should update |
| 🟢 | `@types/pluralize` | 0.0.30 | 0.0.33 | 2 years old | PATCH | 1 | Safe to update |
| 🟡 | `@types/qs` | 6.9.1 | 6.14.0 | 5 years old | MINOR | 1 | Should update |
| 🔴 | `fast-check` | 2.25.0 | 4.5.3 | 3 years old | MAJOR | 1 | Review required |
| 🟡 | `applicationinsights` | 2.9.8 | 3.13.0 | 5 months old | MAJOR | 1 | Should update |
| 🟢 | ~~`performance-now`~~ | 2.1.0 | 2.1.0 | 8 years old | NONE | 1 | Up to date |
| 🟢 | `vscode-languageserver-types` | 3.17.2 | 3.17.5 | 3 years old | PATCH | 1 | Safe to update |
| 🔴 | `react-movable` | 2.5.4 | 3.4.1 | 4 years old | MAJOR | 1 | Review required |
| 🟢 | `@types/enzyme` | 3.10.13 | 3.10.19 | 2 years old | PATCH | 1 | Safe to update |
| 🟢 | `@types/enzyme-adapter-react-16` | 1.0.6 | 1.0.9 | 5 years old | PATCH | 1 | Safe to update |
| 🟡 | `@types/react-virtualized` | 9.21.29 | 9.22.3 | 2 years old | MINOR | 1 | Should update |
| 🟢 | ~~`babel-jest`~~ | 30.2.0 | 30.2.0 | 4 months old | NONE | 2 | Up to date |
| 🟢 | ~~`enzyme`~~ | 3.11.0 | 3.11.0 | 6 years old | NONE | 1 | Up to date |
| 🟢 | `enzyme-adapter-react-16` | 1.15.7 | 1.15.8 | 3 years old | PATCH | 1 | Safe to update |
| 🟢 | ~~`require-from-string`~~ | 2.0.2 | 2.0.2 | 7 years old | NONE | 1 | Up to date |
| 🟡 | `@sap/subaccount-destination-service-provider` | 2.9.1 | 2.14.0 | 4 months old | MINOR | 1 | Should update |
| 🟢 | ~~`ajv`~~ | 8.17.1 | 8.17.1 | 1 year old | NONE | 1 | Up to date |
| 🟡 | `@sap-ux/ui5-middleware-fe-mockserver` | 2.3.38 | 2.4.2 | 20 days old | MINOR | 1 | Should update |
| 🟢 | ~~`@sap-ux/fe-mockserver-plugin-cds`~~ | 1.2.6 | 1.2.6 | 1 year old | NONE | 1 | Up to date |

</details>

---

## Recommendations

### Immediate Actions (This Sprint)

1. ✅ Apply all 48 **patch updates** - Low risk, high value
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

**Last Updated:** 2026-01-28
**Generated by:** dependency update automation script
