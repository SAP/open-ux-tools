---
'@sap-ux/ui5-test-writer': patch
---

FIX: Correct OPA5 test generation for multi-view (multi-tab) List Reports

- A plain multi-view List Report is no longer mis-detected as an Analytical List Page; detection now uses the single `isALPManifestTarget` predicate, so the start page variable resolves and the filter-bar / navigate-to-ObjectPage steps render with the correct page name.
- The "Check table columns and actions" test is generated again for multi-view List Reports: column, action and contact-card extraction now reads the first non-custom view's table node (`table.views[key]`) instead of only `table.columns`.
- The ObjectPage journey navigates from the tab that actually exposes the page: it emits `iGoToView({ key })` and targets `onTable("<viewKey>")` for a non-default view (matched by the view's entity set), and keeps the single-table behaviour for the default view and single-table List Reports.
- The commented global-search template now includes a search-field cleanup (`iChangeSearchField(undefined)` / `iCheckSearchField(undefined)`) at the end of the flow.
