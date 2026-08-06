---
"@sap-ux/fiori-tools-settings": minor
---

feat(fiori-tools-settings): add VS Code setting check for Application Info Page auto-open

Add optional `getConfiguration` parameter to `loadApplicationInfoFromSettings()` to support checking the `ApplicationWizard.autoOpenApplicationInfoPage` VS Code setting. When the setting is disabled, the Application Info Page will not automatically open after project generation.

- Backwards compatible: defaults to enabled (true) when `getConfiguration` not provided
- Setting key: `ApplicationWizard.autoOpenApplicationInfoPage`
- New parameter: `getConfiguration?: () => { get<T>(key: string, defaultValue?: T): T | undefined }`
