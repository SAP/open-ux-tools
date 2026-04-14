# Test Fix Priority List

Packages ranked by complexity for ESM test migration. Complexity score considers:
dependency count, workspace coupling, test file count, `__dirname`/`__filename` usages (test + src),
jest mock usage, and total test lines.

---

## Tier 1: Simple (score 0-50) -- 29 packages

These packages have few dependencies, minimal mocking, and few or no `__dirname` usages.
Best candidates for establishing patterns and quick wins.

| # | Package | Test Files | Deps | WS Deps | `__dirname` (test) | `__dirname` (src) | Mocks | Test Lines | Score |
|---|---------|-----------|------|---------|-------------------|-------------------|-------|-----------|-------|
| 1 | `@sap-ux/sap-systems-ext-types` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | `@sap-ux/guided-answers-helper` | 1 | 0 | 0 | 0 | 0 | 0 | 51 | 2 |
| 3 | `@sap-ux/jest-runner-puppeteer` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 2 |
| 4 | `@sap-ux/fiori-tools-settings` | 1 | 2 | 0 | 0 | 0 | 3 | 72 | 9 |
| 5 | `@sap-ux/odata-annotation-core-types` | 2 | 1 | 1 | 0 | 0 | 0 | 400 | 11 |
| 6 | `@sap-ux/text-document-utils` | 4 | 1 | 0 | 0 | 0 | 0 | 551 | 12 |
| 7 | `@sap-ux/yaml` | 1 | 2 | 0 | 0 | 0 | 0 | 1251 | 12 |
| 8 | `@sap-ux/odata-entity-model` | 2 | 0 | 0 | 0 | 0 | 10 | 1239 | 20 |
| 9 | `@sap-ux-private/control-property-editor-common` | 5 | 0 | 0 | 0 | 0 | 10 | 424 | 22 |
| 10 | `@sap-ux/feature-toggle` | 2 | 0 | 0 | 0 | 0 | 17 | 311 | 22 |
| 11 | `@sap-ux-private/test-utils` | 1 | 0 | 0 | 0 | 4 | 0 | 60 | 22 |
| 12 | `@sap-ux/ui5-library-reference-writer` | 1 | 4 | 2 | 4 | 0 | 0 | 106 | 28 |
| 13 | `@sap-ux/serve-static-middleware` | 3 | 1 | 1 | 5 | 0 | 3 | 238 | 30 |
| 14 | `@sap-ux/ui5-config` | 3 | 6 | 1 | 0 | 1 | 0 | 1144 | 31 |
| 15 | `@sap-ux/system-access` | 2 | 5 | 4 | 0 | 0 | 7 | 349 | 34 |
| 16 | `@sap-ux/btp-utils` | 2 | 3 | 0 | 4 | 0 | 10 | 624 | 35 |
| 17 | `@sap-ux/ui5-library-writer` | 2 | 8 | 2 | 1 | 1 | 0 | 302 | 35 |
| 18 | `@sap-ux/abap-deploy-config-writer` | 2 | 8 | 3 | 2 | 0 | 1 | 195 | 36 |
| 19 | `@sap-ux/odata-annotation-core` | 9 | 2 | 2 | 1 | 0 | 0 | 1442 | 38 |
| 20 | `@sap-ux/xml-odata-annotation-converter` | 10 | 1 | 1 | 1 | 0 | 0 | 2138 | 38 |
| 21 | `@sap-ux/odata-vocabularies` | 9 | 1 | 1 | 0 | 0 | 10 | 1391 | 39 |
| 22 | `@sap-ux/cds-annotation-parser` | 5 | 5 | 4 | 1 | 0 | 0 | 1114 | 40 |
| 23 | `@sap-ux/logger` | 4 | 4 | 0 | 0 | 0 | 21 | 645 | 40 |
| 24 | `@sap-ux/project-input-validator` | 6 | 3 | 1 | 3 | 0 | 9 | 871 | 43 |
| 25 | `@sap-ux/reload-middleware` | 3 | 5 | 2 | 2 | 0 | 15 | 299 | 44 |
| 26 | `@sap-ux/deploy-config-generator-shared` | 5 | 7 | 3 | 0 | 0 | 11 | 233 | 45 |
| 27 | `@sap-ux/ui5-library-reference-inquirer` | 4 | 3 | 2 | 6 | 0 | 6 | 246 | 45 |
| 28 | `@sap-ux/nodejs-utils` | 5 | 4 | 1 | 1 | 0 | 20 | 584 | 46 |
| 29 | `@sap-ux-private/playwright` | 4 | 9 | 0 | 3 | 0 | 11 | 220 | 47 |

---

## Tier 2: Medium (score 51-200) -- 34 packages

Moderate complexity: more dependencies, heavier mocking, and/or more `__dirname` usages.

| # | Package | Test Files | Deps | WS Deps | `__dirname` (test) | `__dirname` (src) | Mocks | Test Lines | Score |
|---|---------|-----------|------|---------|-------------------|-------------------|-------|-----------|-------|
| 30 | `@sap-ux/mockserver-config-writer` | 6 | 5 | 2 | 6 | 0 | 2 | 841 | 52 |
| 31 | `@sap-ux/ui5-application-writer` | 4 | 8 | 1 | 2 | 3 | 1 | 914 | 53 |
| 32 | `@sap-ux/jest-file-matchers` | 2 | 5 | 0 | 15 | 0 | 0 | 154 | 59 |
| 33 | `@sap-ux/ui5-info` | 5 | 3 | 1 | 0 | 0 | 37 | 921 | 60 |
| 34 | `@sap-ux/cf-deploy-config-inquirer` | 5 | 5 | 3 | 0 | 0 | 28 | 1142 | 62 |
| 35 | `@sap-ux/ui5-proxy-middleware` | 3 | 7 | 2 | 0 | 0 | 31 | 1221 | 63 |
| 36 | `@sap-ux/ui5-library-sub-generator` | 2 | 9 | 6 | 3 | 0 | 18 | 928 | 71 |
| 37 | `@sap-ux/flp-config-inquirer` | 6 | 9 | 7 | 0 | 0 | 16 | 1108 | 72 |
| 38 | `@sap-ux/flp-config-sub-generator` | 1 | 12 | 8 | 2 | 0 | 17 | 594 | 75 |
| 39 | `@sap-ux/ui-prompting` | 10 | 2 | 1 | 0 | 0 | 47 | 2106 | 84 |
| 40 | `@sap-ux/ui5-library-inquirer` | 4 | 6 | 4 | 2 | 0 | 42 | 838 | 84 |
| 41 | `@sap-ux/backend-proxy-middleware` | 4 | 11 | 4 | 0 | 0 | 40 | 1059 | 87 |
| 42 | `@sap-ux/odata-service-writer` | 6 | 12 | 3 | 5 | 1 | 7 | 3588 | 89 |
| 43 | `@sap-ux/fiori-freestyle-writer` | 5 | 14 | 7 | 2 | 3 | 7 | 1211 | 93 |
| 44 | `@sap-ux/ui-service-inquirer` | 2 | 11 | 8 | 0 | 0 | 42 | 478 | 94 |
| 45 | `@sap-ux/ui5-application-inquirer` | 5 | 8 | 4 | 2 | 0 | 50 | 1125 | 99 |
| 46 | `@sap-ux/ui5-library-reference-sub-generator` | 1 | 9 | 6 | 5 | 0 | 50 | 509 | 105 |
| 47 | `@sap-ux/launch-config` | 11 | 8 | 3 | 8 | 0 | 28 | 2041 | 109 |
| 48 | `@sap-ux/fiori-generator-shared` | 12 | 10 | 3 | 8 | 1 | 24 | 839 | 110 |
| 49 | `@sap-ux/inquirer-common` | 8 | 20 | 9 | 2 | 0 | 14 | 2666 | 116 |
| 50 | `@sap-ux/fiori-elements-writer` | 9 | 16 | 9 | 2 | 2 | 24 | 2281 | 128 |
| 51 | `@sap-ux/cap-config-writer` | 6 | 9 | 4 | 25 | 0 | 12 | 550 | 131 |
| 52 | `@sap-ux/project-integrity` | 5 | 2 | 1 | 31 | 0 | 18 | 758 | 131 |
| 53 | `@sap-ux/abap-deploy-config-sub-generator` | 4 | 13 | 11 | 2 | 0 | 54 | 1168 | 132 |
| 54 | `@sap-ux/jest-environment-ui5` | 7 | 2 | 0 | 28 | 2 | 22 | 716 | 137 |
| 55 | `@sap-ux/control-property-editor` | 27 | 0 | 0 | 0 | 0 | 60 | 5867 | 143 |
| 56 | `@sap-ux/generator-odata-downloader` | 7 | 0 | 0 | 9 | 0 | 86 | 3802 | 146 |
| 57 | `@sap-ux/sap-systems-ext-webapp` | 20 | 0 | 0 | 0 | 0 | 100 | 1948 | 149 |
| 58 | `@sap-ux/cf-deploy-config-sub-generator` | 4 | 12 | 8 | 8 | 0 | 60 | 2020 | 150 |
| 59 | `@sap-ux/backend-proxy-middleware-cf` | 11 | 9 | 3 | 3 | 0 | 93 | 1762 | 159 |
| 60 | `@sap-ux/deploy-config-sub-generator` | 5 | 15 | 10 | 11 | 0 | 55 | 1300 | 164 |
| 61 | `@sap-ux/deploy-tooling` | 9 | 13 | 7 | 12 | 1 | 54 | 2082 | 170 |
| 62 | `@sap-ux/ui5-test-writer` | 6 | 10 | 3 | 21 | 5 | 42 | 4802 | 195 |
| 63 | `@sap-ux/ui-service-sub-generator` | 3 | 12 | 9 | 7 | 0 | 117 | 1152 | 200 |

---

## Tier 3: Complex (score 201+) -- 27 packages

High complexity: many dependencies, heavy mocking, extensive `__dirname` usage,
and/or very large test suites. These will take the most effort.

| # | Package | Test Files | Deps | WS Deps | `__dirname` (test) | `__dirname` (src) | Mocks | Test Lines | Score |
|---|---------|-----------|------|---------|-------------------|-------------------|-------|-----------|-------|
| 64 | `@sap-ux/fiori-docs-embeddings` | 4 | 0 | 0 | 0 | 0 | 175 | 4868 | 207 |
| 65 | `@sap-ux/store` | 16 | 4 | 1 | 0 | 0 | 151 | 2750 | 207 |
| 66 | `@sap-ux/i18n` | 21 | 3 | 1 | 11 | 0 | 119 | 2324 | 214 |
| 67 | `@sap-ux/preview-middleware` | 8 | 13 | 8 | 8 | 9 | 98 | 3424 | 250 |
| 68 | `@sap-ux/telemetry` | 15 | 10 | 6 | 37 | 0 | 61 | 2091 | 250 |
| 69 | `@sap-ux/abap-deploy-config-inquirer` | 19 | 13 | 10 | 0 | 0 | 160 | 3906 | 273 |
| 70 | `@sap-ux/adp-flp-config-sub-generator` | 2 | 14 | 11 | 27 | 0 | 128 | 1520 | 281 |
| 71 | `@sap-ux/repo-app-import-sub-generator` | 11 | 22 | 17 | 4 | 0 | 152 | 2496 | 293 |
| 72 | `@sap-ux/cf-deploy-config-writer` | 11 | 14 | 6 | 43 | 2 | 85 | 1882 | 301 |
| 73 | `@sap-ux/fe-fpm-writer` | 27 | 14 | 4 | 42 | 1 | 39 | 11291 | 320 |
| 74 | `@sap-ux/eslint-plugin-fiori-tools` | 70 | 24 | 5 | 9 | 3 | 27 | 11653 | 330 |
| 75 | `@sap-ux/environment-check` | 16 | 15 | 6 | 3 | 0 | 228 | 3173 | 332 |
| 76 | `@sap-ux/ui-components` | 49 | 6 | 0 | 1 | 0 | 176 | 11688 | 347 |
| 77 | `sap-ux-sap-systems-ext` | 28 | 0 | 0 | 10 | 0 | 314 | 3320 | 416 |
| 78 | `@sap-ux/app-config-writer` | 21 | 15 | 7 | 91 | 1 | 73 | 3335 | 460 |
| 79 | `@sap-ux/axios-extension` | 22 | 14 | 3 | 104 | 0 | 111 | 4275 | 525 |
| 80 | `@sap-ux/generator-adp` | 30 | 18 | 13 | 17 | 2 | 331 | 7197 | 562 |
| 81 | `@sap-ux/fiori-app-sub-generator` | 23 | 27 | 17 | 35 | 1 | 171 | 31227 | 588 |
| 82 | `@sap-ux/create` | 25 | 22 | 15 | 34 | 1 | 380 | 3648 | 644 |
| 83 | `@sap-ux/project-access` | 23 | 8 | 2 | 110 | 0 | 242 | 6666 | 673 |
| 84 | `@sap-ux/odata-service-inquirer` | 31 | 22 | 11 | 34 | 0 | 396 | 10281 | 688 |
| 85 | `@sap-ux/adp-tooling` | 51 | 26 | 13 | 14 | 10 | 512 | 15375 | 873 |
| 86 | `@sap-ux/cds-odata-annotation-converter` | 7 | 6 | 4 | 18 | 0 | 1 | 277869 | 1482 |
| 87 | `@sap-ux/fiori-annotation-api` | 25 | 17 | 9 | 32 | 0 | 14 | 289658 | 1669 |
| 88 | `@sap-ux-private/preview-middleware-client` | 58 | 1 | 1 | 2 | 0 | 2162 | 24502 | 2411 |
| 89 | `@sap-ux/annotation-generator` | 4 | 7 | 4 | 115 | 0 | 2 | 801255 | 4387 |
| 90 | `@sap-ux/fiori-mcp-server` | 31 | 6 | 2 | 176 | 2 | 189 | 760364 | 4608 |

---

## Statistics

| Metric | Count |
|--------|-------|
| **Total packages** | 90 |
| **Tier 1 (Simple)** | 29 packages |
| **Tier 2 (Medium)** | 34 packages |
| **Tier 3 (Complex)** | 27 packages |
| **Total `__dirname`/`__filename` in tests** | 1,232 |
| **Total `__dirname`/`__filename` in src** | 56 |
| **Grand total `__dirname`/`__filename`** | 1,288 |
| **Total jest mock usages** | ~9,100 |
| **Total test files** | ~1,100 |

---

## Recommended Fix Order

### Phase 1: Zero-dirname packages (quick wins)
Start with Tier 1 packages that have **zero** `__dirname` usages in both test and src.
These only need the Jest ESM configuration fix, no code changes:
- `sap-systems-ext-types`, `guided-answers-helper`, `jest-runner-puppeteer`, `fiori-tools-settings`
- `odata-annotation-core-types`, `text-document-utils`, `yaml`, `odata-entity-model`
- `control-property-editor-common`, `feature-toggle`, `system-access`, `logger`
- `odata-vocabularies`, `ui5-config`, `deploy-config-generator-shared`

### Phase 2: Low-dirname Tier 1 packages
Packages with 1-6 `__dirname` usages in tests -- quick manual fixes:
- `ui5-library-reference-writer` (4), `serve-static-middleware` (5), `btp-utils` (4)
- `ui5-library-writer` (1+1 src), `abap-deploy-config-writer` (2)
- `odata-annotation-core` (1), `xml-odata-annotation-converter` (1)
- `cds-annotation-parser` (1), `project-input-validator` (3), `reload-middleware` (2)
- `ui5-library-reference-inquirer` (6), `nodejs-utils` (1), `playwright` (3)

### Phase 3: Tier 2 packages (systematic)
Work through Tier 2 in score order. Focus on batching similar patterns.

### Phase 4: Tier 3 packages (heavyweight)
These require careful planning. Key challenges:
- **annotation-generator** (115 `__dirname` in tests, 800K test lines) -- mostly fixture paths
- **fiori-mcp-server** (176 `__dirname` in tests, 760K test lines) -- mostly fixture paths
- **project-access** (110 `__dirname` in tests) -- fixture-heavy
- **axios-extension** (104 `__dirname` in tests) -- fixture-heavy
- **app-config-writer** (91 `__dirname` in tests) -- fixture-heavy
- **preview-middleware-client** (2,162 mock usages, 58 test files) -- mock-heavy

### Common `__dirname` Replacement Pattern
```typescript
// Before (CJS)
const fixturePath = path.join(__dirname, 'fixtures', 'sample');

// After (ESM)
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, 'fixtures', 'sample');
```

Consider creating a shared test utility that provides this pattern to avoid repetition.
