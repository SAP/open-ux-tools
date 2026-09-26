---
"@sap-ux/mock-data-generator": patch
---

FEAT: Bound the whole generation time with `sftDeadlineMs`

The new option gives the fine-tuned tier at most what remains of the deadline after the classifier and
deterministic tiers (and at most `sftBudgetMs`), keeping a short reserve for finalization. The data editor
execution mode defaults it to 20 seconds, so a service whose classification is slow no longer waits for a
full 20-second model phase on top.
