---
"@sap-ux/mock-data-generator": minor
---

FEAT: Decide field concepts with a learned acceptance layer and use them for demoted roles

The classifier's concept head accepted a field when its similarity cleared fixed thresholds, which
judges confirmed for 93.4% of its decisions on held-out services. It now decides with a small
logistic acceptance layer trained on 1,193 judged field/concept pairs (two-of-three majority), using
the similarity, the gap to the runner-up concept, how the similarity compares with the concept's own
examples and the concept's value kind. On held-out services it accepts 20% more fields at 94.9%
judged precision.

A recognised role that no provider can serve on a field — a phone number role on a ten-character
extension column, or an application-specific role without a declared domain — used to drop the field
to the typed floor; the field now takes its concept's values when the concept head accepts one.

Across 131 real services the share of cells with recognised values rises from 52.5% to 54.0%, the
typed floor falls from 33.1% to 30.5%, and the typed cells that are neither keys, flags nor protocol
artifacts fall to 12.1% of all cells, with one service losing two concept cells on framework draft
fields.
