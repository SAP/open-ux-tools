---
"@sap-ux/ui5-test-writer": patch
---

FIX: Refine List Report text-annotation column sort-order tests. Text/code columns with a maintained `Common.Text` annotation now get `iChangeSortOrder`/`iCheckSortOrder` tests (each reset to `SortOrder.None`), independent of the sort target's `UI.Hidden` state so a hiding annotation mistake is surfaced. Distinct code columns that share one text target each keep their own sort test, while the text-property assertion is emitted once per target. These tests are generated only for the `1.152` and `latest` template buckets (a UI5 version of 1.152.0 or greater, or an unspecified version which resolves to latest).
