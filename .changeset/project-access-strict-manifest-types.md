---
'@sap-ux/project-access': minor
---

fix(project-access): restore strict types from `@ui5/manifest` for the `Manifest` and `ManifestNamespace` exports

Removes the local ambient module declaration that was redeclaring `@ui5/manifest`
with permissive `[key: string]: any` shapes (and an optional `'sap.app'`).
Consumers now receive the real, strict types shipped by `@ui5/manifest`. This
matches the pre-ESM behaviour and brings back accurate compile-time checking
of manifest structures (e.g. `Manifest['sap.app']` is required again).
