---
"@sap-ux/ui5-test-writer": minor
---

FEAT: Emit List Report text-annotation column sort-order tests. Text/code columns with a maintained `Common.Text` annotation now get `iChangeSortOrder`/`iCheckSortOrder` tests (each reset to `SortOrder.None`), independent of the sort target's `UI.Hidden` state so a hiding annotation mistake is surfaced. These tests are generated only for the `latest` template bucket and only when the target UI5 version is 1.151.1 or greater (an unspecified version resolves to latest and is treated as supported).
