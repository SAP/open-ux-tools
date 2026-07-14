---
name: sap-fiori-eslint-plugin
description: >
  Configure, migrate, or run ESLint with @sap-ux/eslint-plugin-fiori-tools in SAP Fiori projects
  (standalone or CAP). Use when a project is missing ESLint entirely, when an existing .eslintrc
  or eslint@8 config needs upgrading to ESLint 9 flat config, or when the user wants to run linting,
  fix lint errors, or troubleshoot ESLint problems, or when the user wants to see only application
  issues consistent with what is shown in the SAP Fiori tools Application Information panel
  or Page Map.
  Trigger phrases include: "set up ESLint", "add ESLint", "configure linting",
  "add code quality checks", "I have lint errors", "lint is failing",
  "ESLint errors in my code", "fix lint issues", "my linting is broken",
  "ESLint isn't working", "ESLint not working", "my .eslintrc is outdated", "migrate ESLint",
  "upgrade ESLint", "update my ESLint config", "convert .eslintrc to flat config",
  "show all application issues", "show all UX consistency issues", "show issues for my app",
  "application issues only", "issues for app", "consistent with Page Map",
  "same issues as Application Information", "UX issues for my app".
compatibility: Requires Node.js with npm, pnpm, or yarn. Designed for SAP Fiori freestyle and Fiori elements projects (standalone or inside a CAP project).
metadata:
  author: sap-fiori-tools
  version: "0.0.1"
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
