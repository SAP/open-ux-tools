---
'@sap-ux/adp-flp-config-sub-generator': patch
'@sap-ux/generator-adp': patch
'@sap-ux/adp-tooling': patch
---

fix(adp)(vscode) Add notion for a stable id for a Yeoman wizard page. When we add/remove pages we filter them by stable id not the localizable name attribute which can have different values for the same page. This can happen if the name is localized with a parameter.
