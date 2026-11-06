---
'@sap-ux/mock-data-generator': patch
---

FIX: Generate the closest plausible value instead of placeholders or empty cells when roles, model captions or field lengths are uncertain

Give an uncertain field a guessed role only at the calibrated confidence where most such guesses are right, keep model values for a guessed role only when the role accepts them, keep one caption per code, use organisation names that claim no industry, and count fields with a guessed role as unsupported in the semantic coverage so it matches the routing statistics.
