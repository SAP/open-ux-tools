---
"@sap-ux/ui5-test-writer": minor
---

FEAT: Generate the List Report text-annotation OPA tests ("Check the Sort options for columns with a Text annotation" and "Check the presence of the text columns for columns with a Text annotation") for multi-table List Reports, emitting a per-view test for every tab (resolving each tab's text-annotated columns from the shared entity type's `Common.Text` metadata, and column personalization from each tab's own LineItem configuration). Rename these tests (previously "Check text annotation for columns" / "Check columns in adaptation dialog") and exclude columns whose own property is bound through a navigation property. A navigation-path text target is still asserted when the column's own property is a real field, except in an AnalyticalTable sort-order test (which cannot sort across a navigation).
