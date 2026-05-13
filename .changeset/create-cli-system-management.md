---
"@sap-ux/create": minor
---

feat(create): add CLI commands for managing saved backend systems (#37734)

Introduces five new commands for IDE-agnostic management of saved systems:

- `sap-ux add system` — add a backend system to ~/.fioritools; credentials stored securely in OS keychain
- `sap-ux list system` — list all saved systems (supports --json for MCP/automation)
- `sap-ux get system` — retrieve a single system by URL (supports --json)
- `sap-ux update system` — update name, username or credentials of an existing system
- `sap-ux remove system` — remove a system and its stored credentials

Sensitive data (passwords, tokens) is never included in CLI output or logs.
Credentials are read from interactive prompt or `SAP_UX_SYSTEM_PASSWORD` env var — never from CLI flags.
Commands are disabled in SAP Business Application Studio (where built-in system management applies).
