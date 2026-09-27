---
"@sap-ux/mock-data-generator": minor
---

FEAT: Replace the fine-tuned row model with one retrained for runtime contract 2

The SmolLM2-135M-Instruct row model (base revision 12fd25f7) is retrained with the same LoRA recipe for three
epochs on examples rendered in the runtime's own contract-2 prompts: the published SFT examples and teacher rows
written for public service schemas, with every example that held a null removed. The tokenizer and generation
settings are unchanged.

Measured against the previous model in the same package build and the same interleaved run (60 editor-profile
services and the 131-service two-row corpus):

| | previous | new |
|---|---|---|
| null cells (editor / two-row) | 0.47% / 0.23% | 0% / 0% |
| strings cut at their maximum length (editor / two-row) | 9.16% / 8.77% | 5.15% / 5.49% |
| valid cells | 100% | 100% |
| model-written columns judged realistic | 36.0% | 53.2% |
