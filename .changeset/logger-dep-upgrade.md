---
"@sap-ux/logger": patch
---

fix(logger): upgrade winston dependencies and fix logform type compatibility

- Upgrade winston 3.11.0 → 3.19.0 and winston-transport 4.7.0 → 4.9.0
- Cast logform TransformableInfo `label` and `labelColor` fields to `string | undefined` for compatibility with logform 2.7.0
