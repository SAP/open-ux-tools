---
"@sap-ux/mock-data-generator": patch
---

FIX: Make one fine-tuned attempt per relevance-checked resource instead of three

A resource whose generated display values must be verified as relevant (synthetic value lists and
linked texts) was regenerated up to three times when the verifier declined a candidate. Each retry
reused the same prompt with a new seed and cost a full model call; on the Travel service a status
value list spent 12 seconds on three declined attempts. One attempt is now made, and a declined
resource keeps its deterministic rows as before. Measured on the Travel and cash bank services, the
fine-tuned tier accepts the same number of values with the retry removed, and Travel generation is
about 28% faster.
