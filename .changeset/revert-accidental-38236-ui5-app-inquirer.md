---
"@sap-ux/ui5-application-inquirer": patch
---

fix(ui5-application-inquirer): revert accidental virtual-endpoints condition changes from #4675

The `when` condition and `capCdsInfo` parameter added to `getEnableVirtualEndpoints` in
PR #4675 (CLI system management) were unintentionally included — they belong to the
internal bug fix for #38236 which is not intended for open source.

Reverts the changes to `src/prompts/prompts1.ts`, `src/prompts/index.ts`, and the
corresponding test snapshots/cases.
