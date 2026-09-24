---
"@sap-ux/mock-data-generator": patch
---

FEAT: Spend the data editor's model budget on more entities and on what the app displays

New generation options: `sftModelRows` lets the fine-tuned model write that many rows per entity and
fills the remaining rows from those values field by field (a code and its text move together, and a
text whose code is not generated is never reused), and `sftPriorityTargets` fills the listed entity sets
first. A generator created with `executionMode: 'data-editor'` now defaults to a 20-second budget, a
30-second call timeout and 4 model rows per entity; explicit options still win, and
`executionModeDefaults(mode)` reports each mode's defaults. The generator keeps completed model answers
in memory for the lifetime of the process, so an identical request returns the same values without
running the model again.
