---
name: sap-fiori-create-cli-get
description: Use when running @sap-ux/create get — system.
metadata:
  author: sap-fiori-tools
  version: "1.4.14"
---

# [`get`](#get)

> For usage rules (--simulate, --password env:MY_VAR, CF restrictions) see the `sap-fiori-create-cli` skill.

The available subcommands are: system

--------------------------------

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

