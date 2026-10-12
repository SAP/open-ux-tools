---
name: sap-fiori-create-cli-generate
description: Use when running @sap-ux/create generate — adaptation-project, opa5-tests.
metadata:
  author: sap-fiori-tools
  version: "1.4.14"
---

# [`generate`](#generate)

> For usage rules (--simulate, --password env:MY_VAR, CF restrictions) see the `sap-fiori-create-cli` skill.

The available subcommands are: adaptation-project, opa5-tests

--------------------------------

## [`generate adaptation-project`](#generate-adaptation-project)

Generate a new SAPUI5 adaptation project with optional prompts and configuration.

Example:

`npx --yes @sap-ux/create@latest generate adaptation-project`

Options:
- `-n, --skip-install` - Skip the `npm install` step.
- `-s, --simulate` - Simulate only. Do not write or install.
- `-y, --yes` - Use default values for all prompts.
- `--id [id]` - The ID of the adaptation project.
- `--reference [reference]` - The ID of the original application.
- `--url [url]` - The URL that points to the target system which contains the original application.
- `--ignoreCertErrors` - Ignore certificate errors when connecting to the target system.
- `--ft` - Enable SAP Fiori tools for the generated project.
- `--ts` - Enable TypeScript support for the generated project.
- `--package [package]` - The ABAP package to be used for deployments.
- `--transport [transport]` - The ABAP transport to be used for deployments.

--------------------------------

## [`generate opa5-tests`](#generate-opa5-tests)

Generate OPA5 integration tests for an existing SAP Fiori elements (OData V4) application.

Example:

`npx --yes @sap-ux/create@latest generate opa5-tests`

Options:
- `-t, --typescript` - Force generation of TypeScript test files. Otherwise, TypeScript is auto-detected from the presence of a `tsconfig.json`.
- `-s, --simulate` - Simulate only. Do not write. Also, sets `--verbose`
- `-v, --verbose` - Show verbose information.

