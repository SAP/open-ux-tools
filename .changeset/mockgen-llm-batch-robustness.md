---
"@sap-ux/mock-data-generator": patch
---

FIX: Keep completed model rows when a resource's time runs out, and protect verified captions

Rows of one model call are decoded in batches of at most four, so a time budget keeps the batches
already finished; a generator that stops at its budget gets 1.5 seconds to return them before the
attempt counts as a timeout. A resource whose rows did not complete in time is reported as
`incomplete` rather than `rejected`. A resource with any verified model caption is treated as verified,
so finalization never copies such a caption onto a code it was not verified for.
