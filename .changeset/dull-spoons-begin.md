---
'@sap-ux/generator-adp': patch
---

fix: The FLP sub-generator contains a page with a dynamic title. The Yeoman wizard does not support dynamic titles. We've changed the title to static text and moved the dynamic part to the description.
The internal page manager is patched to update the dynamic page description.
