---
name: sap-fiori-create-cli-change
description: Use when running @sap-ux/create change — data-source, inbound.
metadata:
  author: sap-fiori-tools
  version: "1.4.14"
---

# [`change`](#change)

> For usage rules (--simulate, --password env:MY_VAR, CF restrictions) see the `sap-fiori-create-cli` skill.

The available subcommands are: data-source, inbound

--------------------------------

## [`change data-source`](#change-data-source)

Replace the OData Source of the base application in an adaptation project.


This command is not supported for Cloud Foundry projects.

Example:

`npx --yes @sap-ux/create@latest change data-source`

Options:
- `-s, --simulate` - Simulate only. Do not write or install.
- `-c, --config <string>` - Path to the project configuration file in YAML format. _(default: `ui5.yaml`)_

--------------------------------

## [`change inbound`](#change-inbound)

Replace the inbound FLP configurations of the base application in an adaptation project.


This command is not supported for Cloud Foundry projects.

Example:

`npx --yes @sap-ux/create@latest change inbound`

Options:
- `-s, --simulate` - Simulate only. Do not write or install.

