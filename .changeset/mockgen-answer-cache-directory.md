---
"@sap-ux/mock-data-generator": patch
---

FEAT: Keep model answers on disk between generator processes

`createMockDataGenerator({ answerCacheDirectory })` keeps model answers in a bounded file per model revision in a
caller-owned absolute directory, so the data editor's per-generation workers reuse the answers of earlier runs
and spend their time budget on requests not seen yet. Malformed entries are skipped, symbolic links and relative
paths are refused, and a cache that cannot be used falls back to memory with a `SFT_ANSWER_CACHE_UNAVAILABLE`
info diagnostic.
