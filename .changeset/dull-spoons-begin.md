---
'@sap-ux/generator-adp': patch
'@sap-ux/adp-flp-config-sub-generator': patch
---

fix: The FLP sub-generator contains a page with a dynamic title. The Yeoman wizard does not support dynamic titles. We've changed the title to static text and moved the dynamic part to the description. The internal page manager is patched to update the dynamic page description. When the FLP generator is started as a standalone generator the name and the description of the
Tiles page are also updated accordingly.
