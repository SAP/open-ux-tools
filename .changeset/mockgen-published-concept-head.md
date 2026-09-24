---
"@sap-ux/mock-data-generator": minor
---

FEAT: Build the classifier's concept head from the published MockGen dataset only

The concept head's prototypes, value banks and per-concept acceptance minimums now come only from the
published concept catalogue and concept examples. It keeps 656 of the 926 concepts: the 270 code/text,
number and decimal concepts are left out because the published catalogue carries no code/text pairs or
numeric ranges for them. A field takes a concept when its similarity is at least 0.75, it beats the
runner-up by at least 0.02, and it is at least as close as the concept's own 25th-percentile example.
The learned acceptance layer is not used, because it was fitted to the previous prototypes.

On the held-out judged fields the head accepts 140 fields at 93.5% judged precision, against 274 at
94.9% before. The role head, relevance head and encoder are unchanged.
