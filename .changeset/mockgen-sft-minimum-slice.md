---
"@sap-ux/mock-data-generator": patch
---

FIX: Give each fine-tuned call a usable time slice instead of splitting the budget into fragments

The fine-tuned tier's service budget was divided evenly across every eligible entity, so a service
with many entities gave each call about a second — too short for the local model on a two-core
machine to return a row, and most of the budget was spent on calls that timed out. Each call now gets
at least four seconds (or the whole budget when it is smaller), cheaper entities go first, and once the
budget cannot fund another call the remaining entities keep their deterministic rows and one
`SFT_BUDGET_EXHAUSTED` diagnostic reports how many were skipped. On the cash bank service the model
now contributes 150 accepted values within the same 20-second budget, up from 93.
