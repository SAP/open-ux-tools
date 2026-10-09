---
"@sap-ux/ui5-test-writer": minor
---

FEAT: Split the List Report "Check table columns and actions" journey block into one `opaTest` per action (both single-table and multi-tab), and assert selection states for selection-driven bound actions in the `latest` FE V4 bucket. Fixes an `iCheckRows` timeout in multi-tab journeys by searching before the row check.
