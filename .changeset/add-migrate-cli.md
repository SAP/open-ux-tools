---
"@sap-ux/create": minor
---

FEAT: Add `migrate` CLI command for converting WebIDE projects to Fiori tools format

**New Command: `sap-ux migrate`**

Migrate legacy WebIDE Fiori projects (SAP Web IDE, Build Work Zone, etc.) to modern Fiori tools format with UI5 tooling support.

Features:
- Interactive migration prompts for missing configuration
- Path validation with security checks  
- Support for destination, hostname, SAP client, UI5 version overrides
- Comprehensive error handling and user feedback
- Full test coverage (293 test cases)

Usage:
```sh
npx @sap-ux/create@latest migrate /path/to/project --destination MY_SYSTEM
```

Migration includes:
- neo-app.json → ui5.yaml conversion
- UI5 dependencies in package.json
- Backend proxy configuration
- Launch configuration for testing
- TypeScript setup (if applicable)

Depends on @sap-ux/fiori-migration-writer package.
