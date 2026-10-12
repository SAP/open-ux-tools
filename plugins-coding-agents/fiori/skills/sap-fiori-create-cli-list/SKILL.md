---
name: sap-fiori-create-cli-list
description: Use when running @sap-ux/create list — system.
metadata:
  author: sap-fiori-tools
  version: "1.4.14"
---

# [`list`](#list)

> For usage rules (--simulate, --password env:MY_VAR, CF restrictions) see the `sap-fiori-create-cli` skill.

The available subcommands are: system

--------------------------------

## [`list system`](#list-system)

List all back-end systems in the saved system store (`~/.fioritools`). Sensitive data, such as passwords and tokens, is never included in the output.

Example:

`npx --yes @sap-ux/create@latest list system`

`npx --yes @sap-ux/create@latest list system --json`

Options:
- `--json` - Output as JSON, which is useful for automation and MCP integrations.

