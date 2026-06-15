---
"@sap-ux/fe-fpm-writer": patch
"@sap-ux-private/ui-prompting-examples": minor
---

feat(fe-fpm-writer): add Page building block full and basic template support

- Add `appendPageAggregations` to generate all 7 Page BB aggregations (`breadcrumbs`, `navigationActions`, `titleContent`, `actions`, `headerContent`, `items`, `footer`) with EJS templates and per-aggregation IDs
- Add `appendPageBBAggregation` API to append a single named aggregation to an existing `<macros:Page>` element in a view XML file
- Add `sortPageAggregationChildren` to reorder aggregation elements into the canonical `PAGE_AGGREGATIONS` order after insertion
- Add `PAGE_AGGREGATIONS` constant and `PageAggregationName` type (moved to `types.ts` for compile-time safety in `aggregations?: Partial<Record<PageAggregationName, string>>`)
- Add `PAGE_TEMPLATE_TYPE_FULL` / `PAGE_TEMPLATE_TYPE_BASIC` constants and `PageTemplateType` type
- Rename template type value `blank` → `basic`; rename prompt label "Page template" → "Page Layout", "Default content" → "Full", "Blank" → "Basic"
- Generate a JS or TS controller stub alongside the view (detected via `getAppProgrammingLanguage` with `.controller.ts` fallback)
- Insert a sample template comment as first child of `<macros:Page>` on first aggregation; guard against duplicate comment insertion
- Add null guards on `_nsMap` access; fix duplicate-ID issue in multi-element fragments
