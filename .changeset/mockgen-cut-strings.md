---
"@sap-ux/mock-data-generator": patch
---

FIX: End model strings at a word boundary instead of cutting them at their maximum length

The steering window is now a third of a string's maximum length (at least 2, at most 12 characters), so short
columns stop starting words earlier. When the grammar still has to close a string at its maximum while the
model wanted to keep writing, the value is shortened to its last complete word, or a code to its last complete
segment (`INV-2018-0` becomes `INV-2018`).
