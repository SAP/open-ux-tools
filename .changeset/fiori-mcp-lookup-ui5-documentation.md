---
"@sap-ux/fiori-mcp-server": minor
---

FEAT: Add `lookup_ui5_documentation` tool that resolves UI5 control documentation from a library's designtime api.json. The `lookupType` discriminator supports "aggregation" (type, cardinality, visibility, since, description), "property" (type, defaultValue, group, bindable, visibility, since, description) and "event" (parameters, visibility, since, description). Inherited members are resolved by walking the control's inheritance chain across libraries, and each result reports the declaring class (`definedIn`) and whether it was `inherited`. The UI5 version is taken from ui5.yaml when present and otherwise falls back to the app's manifest.json `minUI5Version`, so lookups target the app's pinned version rather than the latest CDN docs.
