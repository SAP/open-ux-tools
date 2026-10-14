# @sap-ux/fiori-skills

Install SAP Fiori AI agent skills to your local skills directory.

## Overview

This package bundles a set of AI agent skills for SAP Fiori development and provides a CLI to copy them into your local skills directory (default: `~/.agents/skills`).

Once installed, the skills are available to any AI agent client that reads from that directory (e.g. Claude Code, Cursor, and other agentskills.io-compatible clients).

## Bundled Skills

| Skill | Description |
|---|---|
| `fiori-eslint-setup` | Set up ESLint with `@sap-ux/eslint-plugin-fiori-tools` for a new Fiori or CAP project |
| `fiori-eslint-migrate` | Migrate a legacy `.eslintrc` config to ESLint 9 flat config format |
| `fiori-eslint-lint` | Run ESLint on a Fiori project and report or auto-fix issues |

## Usage

### Install skills to the default path (`~/.agents/skills`)

```bash
npx @sap-ux/fiori-skills
```

### Install skills to a custom path

```bash
npx @sap-ux/fiori-skills /path/to/your/skills
```

### Example output

```
Installing 3 Fiori skill(s) to: /Users/you/.agents/skills

  installed: fiori-eslint-lint
  installed: fiori-eslint-migrate
  installed: fiori-eslint-setup

Done. Skills are ready to use in your AI agent client.
```

Re-running the command on an existing installation updates the skills in place:

```
Installing 3 Fiori skill(s) to: /Users/you/.agents/skills

  updated: fiori-eslint-lint
  updated: fiori-eslint-migrate
  updated: fiori-eslint-setup

Done. Skills are ready to use in your AI agent client.
```

## Skill format

Each skill is a directory containing a `SKILL.md` file with YAML frontmatter and a markdown body following the [agentskills.io](https://agentskills.io) format. The frontmatter declares the skill name, description, and compatibility, and the body contains step-by-step instructions the agent follows at runtime.

## License

Apache-2.0
