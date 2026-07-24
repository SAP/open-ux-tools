---
"@sap-ux/preview-middleware": patch
---

FEAT: Support annotation-based changes in the adaptation editor. `.annotation_change` files are read into the change stack, and on startup the project descriptor is upgraded to register the `@i18n` model before the merged manifest is fetched — so projects created before this support start resolving annotation-change bindings. The descriptor update is written to disk (visible as a git diff) and is best-effort, so a failure does not block editor startup.
