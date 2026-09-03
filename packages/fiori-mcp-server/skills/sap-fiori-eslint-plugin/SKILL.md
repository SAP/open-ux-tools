---
name: sap-fiori-eslint-plugin
description: >
  Configure, migrate, or run ESLint with @sap-ux/eslint-plugin-fiori-tools in SAP Fiori projects
  (standalone or CAP). Use when ESLint is missing and the user wants to add it or add code quality
  checks; when an existing .eslintrc or eslint@8 config needs upgrading to ESLint 9 flat config;
  when the user wants to run linting, fix lint errors, or ESLint is broken or not working; or when
  the user wants to see the application issues or UX consistency issues for a specific app — e.g.
  "show application issue(s) for my project <project_name>", "show application issues for app X",
  "UX consistency issues", "issues consistent with Page Map",
  "same issues as Application Information".
compatibility: Requires Node.js with npm, pnpm, or yarn. Designed for SAP Fiori freestyle and Fiori elements projects (standalone or inside a CAP project).
metadata:
  author: sap-fiori-tools
  version: "0.0.2"
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
| "Show all application issues", "show UX consistency issues", "issues for app X", "same issues as Page Map/App Info" | **App issues only** | [references/lint.md](references/lint.md) — follow the **App-scope mode** section |

If the intent is unclear, check the project state:

```bash
# Check for existing ESLint config (any format)
ls eslint.config.mjs eslint.config.js .eslintrc .eslintrc.js .eslintrc.cjs .eslintrc.json .eslintrc.yml .eslintrc.yaml 2>/dev/null
```

- **No config found** → follow [references/setup.md](references/setup.md)
- **Legacy config found** (`.eslintrc*`) → follow [references/migrate.md](references/migrate.md)
- **Flat config found** (`eslint.config.mjs`) → follow [references/lint.md](references/lint.md)


If the intent is still unclear, ask the user to clarify whether they want to set up ESLint, migrate an existing config, or run linting.
