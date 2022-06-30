---
'@sap-ux/fe-fpm-writer': minor
---

`eventHandler` property enhancement for custom actions, sections, columns and views:
- Allow to update existing js handler file with new method by providing method as script fragment string;
- Allow to pass file and method name for new custom handler js file;
- Custom Actions. `eventHandler` property is moved from `CustomAction.settings` to root level of `CustomAction` interface.