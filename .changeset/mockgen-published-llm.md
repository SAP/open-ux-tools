---
"@sap-ux/mock-data-generator": minor
---

FEAT: Replace the fine-tuned row model with one trained only on the published MockGen dataset

The fine-tuned SmolLM2-135M-Instruct row model (base revision 12fd25f7) is retrained with LoRA on the
train split of the published SFT examples (2,493 of 2,778 records used; records over 2,048 tokens are
dropped), and exported to int8 ONNX. It replaces the earlier model, which was partly trained on
internal rows. The tokenizer, generation settings and runtime contract are unchanged.

On the 694 usable records of the published validation split, compared with the previous model:

| | previous | new |
|---|---|---|
| parsed output | 58.8% | 57.1% |
| keys match the prompt | 11.7% | 20.9% |
| fully valid | 3.5% | 7.1% |
| type violations per 1,000 cells | 54 | 23 |
| maxLength violations per 1,000 cells | 63 | 83 |
| judged plausible | 5% | 19% |

The runtime checks every generated value against the field's type and facets, so a value longer than
the field's maximum length is rejected cell by cell and the cell keeps its fallback value, as before.
