---
"@sap-ux/mock-data-generator": patch
---

FEAT: Fill more fields with the fine-tuned model within the same time budget

The model is now called with at most eight fields per call (a code and its text stay together), the rows
of a call are decoded together, grammar-forced punctuation is fed without sampling, numbers follow their
type exactly (digits and range for integers, precision and scale for decimals, no exponents), strings end
at a word boundary near their maximum length, and the token bound is derived from the grammar. Each
proposed value is accepted on its own unless it belongs to a code/text pair, a generated code list row or
a row that echoes the instructions. Repetition penalty and the no-repeat n-gram ban apply to value tokens
only. When the model or the relevance check is unavailable, generation keeps deterministic values with a
`SFT_CANDIDATE_VERIFIER_UNAVAILABLE` warning instead of failing, each linked-text resource is verified on
its own, and a verified caption that cannot extend a value list is reported as a conflict instead of
failing the service. Native inference uses at most four threads and never more than the available cores.
An artifact can pin the previous behaviour with `"runtimeContract": 1` in its generation config.
