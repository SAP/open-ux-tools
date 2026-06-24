---
name: sap-fiori-eslint-plugin
description: >
  Work with ESLint and @sap-ux/eslint-plugin-fiori-tools for SAP Fiori projects.
  Handles three scenarios - configure ESLint from scratch, migrate from a legacy
  ESLint setup, or run/fix lint issues — in standalone Fiori apps and CAP projects.
  Use when the user asks to set up, migrate, or run ESLint on a Fiori app.
compatibility: Requires Node.js with npm, pnpm, or yarn. Designed for SAP Fiori freestyle and Fiori elements projects (standalone or inside a CAP project).
metadata:
  author: sap-fiori-tools
  version: "1.0"
---

# SAP Fiori ESLint Plugin

Work with `@sap-ux/eslint-plugin-fiori-tools` on SAP Fiori projects: set up ESLint from scratch, migrate from a legacy configuration, or run and fix lint issues.

## Determine which task to perform

Identify the user's intent from their request:

| User says / situation | Task | Reference |
|---|---|---|
| "Set up ESLint", "Add ESLint", no `eslint.config.mjs` exists | **Set up** | [references/setup.md](references/setup.md) |
| "Migrate ESLint", `.eslintrc` / eslint@8 present, upgrade ESLint | **Migrate** | [references/migrate.md](references/migrate.md) |
| "Run ESLint", "Check my code", "Fix lint errors", `eslint.config.mjs` exists | **Lint** | [references/lint.md](references/lint.md) |

If the intent is unclear, check the project state:

```bash
# Check for existing ESLint config (any format)
ls eslint.config.mjs eslint.config.js .eslintrc .eslintrc.js .eslintrc.cjs .eslintrc.json .eslintrc.yml .eslintrc.yaml 2>/dev/null
```

- **No config found** → follow [references/setup.md](references/setup.md)
- **Legacy config found** (`.eslintrc*`) → follow [references/migrate.md](references/migrate.md)
- **Flat config found** (`eslint.config.mjs`) → follow [references/lint.md](references/lint.md)

For CAP projects, also check each app subfolder:

```bash
find . -name "eslint.config.mjs" -o -name ".eslintrc*" | grep -v node_modules 2>/dev/null
```

## Common context: project type detection

All three tasks start by determining whether this is a standalone Fiori app or a CAP project. Run this once and share the result across steps:

```bash
grep -q '"@sap/cds"' package.json 2>/dev/null && echo "cap" || echo "standalone"
```

For CAP projects, get the configured app folder:

```bash
npx cds env get folders.app 2>/dev/null
# Falls back to 'app/' if not configured
```
