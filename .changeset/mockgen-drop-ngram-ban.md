---
"@sap-ux/mock-data-generator": patch
---

FIX: Stop banning repeated n-grams in model values

The no-repeat n-gram ban added with runtime contract 2 was measured without benefit (fewer accepted
model values at equal load, no difference in judged realism), so `noRepeatNgramSize` is again not
applied. The repetition penalty still applies to value tokens only.
