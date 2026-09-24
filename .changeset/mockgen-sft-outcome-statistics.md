---
"@sap-ux/mock-data-generator": patch
---

FEAT: Report why the fine-tuned tier did not fill a field

Fine-tuned statistics now say how each resource's attempt ended (`outcome`: accepted, partial, rejected,
unverified, timeout or failed), how many rows came back without a complete candidate, how many candidates
of each field failed validation (`invalidSlots`), and which resources the time budget or an earlier
failure left without an attempt (`skippedResources`). The inspection report carries these statistics,
the value-tier totals, the typed-floor causes and, per field, the split between model-written cells and
the tier that wrote the rest (`valueTier`). All additions are optional fields; generated values are
unchanged.
