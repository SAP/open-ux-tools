---
"@sap-ux/mock-data-generator": minor
---

FEAT: Replace the role classifier with a published-data classifier

The classifier's role head is retrained only on the published MockGen dataset (labels of commit 45ee63e plus the
classifier rename) and qualified through the sealed release gate; it replaces a head that was partly trained on
internal data. The encoder, tokenizer, field serializer and role registry are unchanged, and the concept and
relevance heads are unchanged. The head routes 46 roles (52 before) and abstains on the rest.

| | previous | new |
|---|---|---|
| sealed precision of accepted roles | 96.34% | 96.29% |
| sealed recall of supported fields without metadata | 65.54% (1,339/2,043) | 65.54% (1,301/1,985) |
| sealed unannotated status fields | 32/44 | 30/44 |
| sealed critical false positives | 2.60% | 2.47% |
| held-out precision / critical false positives / recall | 91.76% / 6.99% / 55.94% | 94.86% / 4.17% / 60.00% |
