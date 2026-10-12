# `get` — Full Options

## [`get system`](#get-system)

Retrieve details of a saved back-end system by URL. Sensitive data (passwords, tokens) is never included in the output.

Example:

`npx --yes @sap-ux/create@latest get system --url https://my-sap.example.com`

`npx --yes @sap-ux/create@latest get system --url https://my-sap.example.com --client 100`

`npx --yes @sap-ux/create@latest get system --url https://my-sap.example.com --json`

Options:
- `--url <string>` _(required)_ - URL of the backend system.
- `--client <string>` - SAP client number (optional).
- `--json` - Output as JSON, which is useful for automation and MCP integrations.

