---
name: sap-fiori-create-cli
description: Use when asked to run any @sap-ux/create CLI command for SAP Fiori projects. Routes to the specific command skill. Use when the exact subcommand is unknown or when providing general guidance.
argument-hint: command and subcommand (e.g., add mockserver-config, generate adaptation-project)
metadata:
  author: sap-fiori-tools
  version: "1.4.14"
---

## How to use this CLI

- Always invoke via `npx -y @sap-ux/create@latest` — never suggest a global install.
- Run with `--simulate` / `-s` first for any write command when the user has not confirmed they want files changed. It implies `--verbose` on most subcommands.
- Pass passwords via `--password env:MY_VAR` — never plain-text in the shell command.
- Commands that prompt interactively (`generate adaptation-project`, `add model`, `add component-usages`) require either `-y` / `--yes` or all required flags pre-filled to run non-interactively.
- `add annotations`, `change data-source`, and `change inbound` are not supported for Cloud Foundry projects.
- `add adp-cf-config` is experimental and may change or be removed without notice.

---

# Commands

| Command | Subcommands | Skill |
|---|---|---|
| `generate` | `adaptation-project`, `opa5-tests` | `sap-fiori-create-cli-generate` |
| `add` | `mockserver-config`, `smartlinks-config`, `eslint-config`, `cds-plugin-ui5`, `inbound-navigation`, `cards-editor`, `model`, `annotations`, `html`, `component-usages`, `deploy-config`, `variants-config`, `adp-cf-config`, `system`, `flp-embedded-config` | `sap-fiori-create-cli-add` |
| `convert` | `preview-config`, `eslint-config` | `sap-fiori-create-cli-convert` |
| `remove` | `mockserver-config`, `system` | `sap-fiori-create-cli-remove` |
| `update` | `system`, `service-metadata` | `sap-fiori-create-cli-update` |
| `change` | `data-source`, `inbound` | `sap-fiori-create-cli-change` |
| `list` | `system` | `sap-fiori-create-cli-list` |
| `get` | `system` | `sap-fiori-create-cli-get` |

Invoke the skill for the specific command group to get full options and examples.
