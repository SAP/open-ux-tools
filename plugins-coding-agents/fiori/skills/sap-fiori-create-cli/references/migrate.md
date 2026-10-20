# `migrate` — Full Options

## [`migrate`](#migrate)

Migrate legacy WebIDE Fiori project to modern Fiori tools format. In BAS, a destination is required. Outside BAS, hostname and client are required; destination is optional.

Options:
- `-d, --destination <name>` - SAP System destination name (required in BAS)
- `-s, --sap-system-name <name>` - SAP System name (alias for destination)
- `-H, --hostname <host>` - Backend hostname (required outside BAS unless resolved from a saved system)
- `-c, --client <client>` - SAP Client (required outside BAS unless resolved from destination or saved system)
- `-u, --ui5-version <version>` - UI5 version (defaults to source project version)
- `-f, --force` - Force migration even if project is already a Fiori tools project
- `-n, --skip-install` - Skip the `npm install` step after migration

