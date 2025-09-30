---
'@sap-ux/generator-adp': patch
---

fix: FLP sub generator contains a page with dynamic title, yeoman wizard is not meant to work with dynamic titles. We change the title to a static text and put the dynamic part in the description.
The internal page manager we used is patched to update the dynamic page description.
