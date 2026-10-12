# `list` — Full Options

## [`list system`](#list-system)

List all back-end systems in the saved system store (`~/.fioritools`). Sensitive data, such as passwords and tokens, is never included in the output.

Example:

`npx --yes @sap-ux/create@latest list system`

`npx --yes @sap-ux/create@latest list system --json`

Options:
- `--json` - Output as JSON, which is useful for automation and MCP integrations.

