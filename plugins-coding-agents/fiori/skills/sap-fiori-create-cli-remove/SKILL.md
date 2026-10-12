---
name: sap-fiori-create-cli-remove
description: Use when running @sap-ux/create remove — mockserver-config, system.
metadata:
  author: sap-fiori-tools
  version: "1.4.14"
---

# [`remove`](#remove)

> For usage rules (--simulate, --password env:MY_VAR, CF restrictions) see the `sap-fiori-create-cli` skill.

The available subcommands are: mockserver-config, system

--------------------------------

## [`remove mockserver-config`](#remove-mockserver-config)

Removes the configuration for the `@sap-ux/ui5-middleware-fe-mockserver` mockserver module.

Example:

`npx --yes @sap-ux/create@latest remove mockserver-config`

Options:
- `-v, --verbose` - Show verbose information.
- `-f, --force` - Do not ask for confirmation when deleting files.

--------------------------------

## [`remove system`](#remove-system)

Remove a saved back-end system from the saved system store (`~/.fioritools`). Also deletes any stored credentials in the OS keychain.

Example:

`npx --yes @sap-ux/create@latest remove system --url https://my-sap.example.com`

`npx --yes @sap-ux/create@latest remove system --url https://my-sap.example.com --client 100`

`npx --yes @sap-ux/create@latest remove system` (interactive mode)

Options:
- `--url <string>` - URL of the backend system to remove
- `--client <string>` - SAP client number (optional)
- `--force` - Skip confirmation prompt

