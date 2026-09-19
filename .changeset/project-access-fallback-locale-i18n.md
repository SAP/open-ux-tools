---
"@sap-ux/project-access": minor
---

FEAT: Support `fallbackLocale` in i18n path resolution and bundle reading. `I18nPropertiesPaths` now includes optional `sap.app.fallbackLocale` and per-model `fallbackLocalePath` fields. `getI18nPropertiesPaths` extracts the fallback locale from `sap.app.i18n` and `sap.ui5.models[key].settings`. `getI18nBundles` merges fallback locale entries into the primary bundle so keys defined only in the fallback file no longer trigger a "not available" warning. New `createI18nEntriesAtPath` export allows writing to a caller-specified properties file path.
