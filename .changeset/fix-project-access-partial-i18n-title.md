---
"@sap-ux/project-access": patch
---

FIX: Resolve partial i18n placeholders in `sap.app.title`. Previously, only a title consisting entirely of `{{key}}` was resolved; a title like `"44 {{appTitle}}"` was returned as-is. The function now detects embedded `{{key}}` tokens via regex and resolves all of them, returning `undefined` if any token cannot be resolved (which triggers the caller's fallback to the technical app name).
