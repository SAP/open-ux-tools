---
"@sap-ux/fiori-migration-writer": minor
---

FEAT: Introduce new @sap-ux/fiori-migration-writer package

This package provides migration capabilities for Fiori projects, extracted from SAP-internal tools to enable open-source collaboration. Key features:

- Project migration from WebIDE to modern Fiori tooling
- Template generation for migrated projects
- FLP configuration and UI5 tooling setup
- Support for regular projects, extension projects, adaptation projects, and reuse libraries
- Comprehensive validation and error handling

Security improvements:
- Fix incomplete string escaping in escapeSingleQuotes and escapeDoubleQuotes
- Fix incomplete pattern replacement in resolveAppIdFromPom
- Proper error type handling with instanceof checks
