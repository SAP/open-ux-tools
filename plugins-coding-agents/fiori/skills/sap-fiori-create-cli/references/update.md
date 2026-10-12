# `update` — Full Options

## [`update system`](#update-system)

Update an existing backend system in the saved systems store (`~/.fioritools`). The system is identified by its URL and optional SAP client.


Example:

`npx --yes @sap-ux/create@latest update system --url https://my-sap.example.com --name "New Name"`

`npx --yes @sap-ux/create@latest update system --url https://my-sap.example.com --client 100 --username newuser`

`npx --yes @sap-ux/create@latest update system` (interactive mode)

Options:
- `--url <string>` - URL of the backend system to update
- `--client <string>` - SAP client number to identify the system (optional)
- `--name <string>` - New display name for the system
- `--username <string>` - New username
- `--password <string>` - To avoid plain-text credentials in the shell's history, pass an env reference: --password env:MY_VAR
- `--clear-credentials` - Remove stored credentials from the system
- `--skip-connection-validation` - Skip connection verification before saving
- `--skip-check` - (Deprecated: use --skip-connection-validation) Skip connection verification before saving

--------------------------------

## [`update service-metadata`](#update-service-metadata)

Refresh the local OData service metadata.xml from the live backend for a Fiori application.
Also fetches value-help (external) service metadata when available.

Only supported for Fiori applications connected to an EDMX backend. CAP applications are not supported,
as their service metadata is generated locally from the CDS model rather than fetched from a backend.

Example:

`npx --yes @sap-ux/create@latest update service-metadata /path/to/my-fiori-app`

`npx --yes @sap-ux/create@latest update service-metadata /path/to/my-fiori-app --simulate`

> For the full workflow guide including prerequisites and manual steps, read `references/update-service-metadata.md`.

Options:
- `--service <name>` - Name of the data source in manifest.json (defaults to mainService or first service)
- `--no-value-help` - Skip fetching value-help (external) service metadata
- `-s, --simulate` - Simulate only. Do not write. Also sets `--verbose`.
- `-v, --verbose` - Show verbose information.

