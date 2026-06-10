---
name: sap-fiori-eslint-setup
description: Set up ESLint with @sap-ux/eslint-plugin-fiori-tools for a Fiori app — standalone or inside a CAP project. Use when a Fiori project is missing an eslint.config.mjs, when the user asks to configure or add ESLint, or when linting has never been set up.
compatibility: Requires Node.js with npm, pnpm, or yarn. Designed for SAP Fiori freestyle and Fiori elements projects.
metadata:
  author: sap-fiori-tools
  version: "1.0"
---

# Fiori ESLint Setup

Set up ESLint with `@sap-ux/eslint-plugin-fiori-tools` for a SAP Fiori or CAP project.

## Step 1 — Detect project type and app location

First, determine whether this is:
- **Standalone Fiori app** — `webapp/manifest.json` exists at the project root
- **CAP project** — `app/` folder exists containing one or more Fiori apps (each with their own `webapp/manifest.json`)

```bash
# Check for standalone Fiori app
ls webapp/manifest.json 2>/dev/null && echo "standalone" || echo "not-standalone"

# Check for CAP project: app/ folder AND @sap/cds in package.json
if ls app/ 2>/dev/null && grep -q '"@sap/cds"' package.json 2>/dev/null; then echo "cap"; else echo "not-cap"; fi
```

## Step 2 — Determine the correct config location

**IMPORTANT**: The `eslint.config.mjs` must be placed at the **app level**, not the CAP project root.

| Project type | Config location |
|---|---|
| Standalone Fiori | `./eslint.config.mjs` (project root) |
| CAP — single app | `./app/<app-name>/eslint.config.mjs` |
| CAP — multiple apps | One `eslint.config.mjs` per app: `./app/<app-name>/eslint.config.mjs` |

For CAP projects, list the apps:
```bash
ls app/
```

## Step 3 — Check if config already exists

Before creating anything, check if a config already exists:

```bash
# Standalone
ls eslint.config.mjs eslint.config.js .eslintrc .eslintrc.js .eslintrc.json .eslintrc.yml 2>/dev/null

# CAP app level (replace <app-name> with actual app folder name)
ls app/<app-name>/eslint.config.mjs app/<app-name>/.eslintrc 2>/dev/null
```

If a config already exists, inform the user and offer to:
1. Leave it as-is (if it already uses `@sap-ux/eslint-plugin-fiori-tools`)
2. Use the `sap-fiori-eslint-migrate` skill to migrate it to flat config syntax

## Step 4 — Determine the right configuration

Ask the user (or infer from project context) which config variant to use:

- **`recommended`** — For most Fiori freestyle and Fiori elements projects. Lints JS/TS in `webapp/`.
- **`recommended-for-s4hana`** — For S/4HANA Fiori elements apps. Adds annotation validation for `manifest.json`, `*.xml`, and `*.cds` files.

Use `recommended-for-s4hana` if you detect any of these signals:
- Project has CDS files (`*.cds`)
- `manifest.json` references `sap.fe.templates` or `sap.ovp`
- User mentions "S/4HANA", "Fiori elements", or "annotations"

## Step 5 — Check if the plugin is installed

```bash
# Check package.json for the plugin
cat package.json | grep "eslint-plugin-fiori-tools"
```

If missing, install it. Choose the package manager the project uses:

```bash
# Detect package manager
ls package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null
```

Install commands:
```bash
# npm
npm install --save-dev @sap-ux/eslint-plugin-fiori-tools eslint

# pnpm
pnpm add --save-dev @sap-ux/eslint-plugin-fiori-tools eslint

# yarn
yarn add --dev @sap-ux/eslint-plugin-fiori-tools eslint
```

**Note**: For CAP projects, run the install command from the **app subfolder** that has its own `package.json`. If the app shares the root `package.json`, install at the root.

## Step 6 — Create the eslint.config.mjs

Create the config file at the location determined in Step 2.

### Recommended config (standalone Fiori or CAP app):

```javascript
import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
    ...fioriTools.configs.recommended
];
```

### Recommended-for-S/4HANA config:

```javascript
import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
    ...fioriTools.configs['recommended-for-s4hana']
];
```

### With custom ignores (add if needed):

```javascript
import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
    {
        ignores: ['dist', 'target', 'localService', 'backup']
    },
    ...fioriTools.configs.recommended
];
```

## Step 7 — Add a lint script to package.json (optional)

If the project's `package.json` has a `scripts` section but no `lint` script, offer to add one:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

For CAP apps where the config is in a subfolder, the script should be run from within that subfolder (e.g., `cd app/<app-name> && eslint webapp/`) or by passing `--config app/<app-name>/eslint.config.mjs` from the project root.

## Step 8 — Verify the setup

Run ESLint to verify the config works:

```bash
npx eslint --print-config webapp/Component.js 2>/dev/null | head -20
```

Or run a quick lint to confirm no config errors:

```bash
npx eslint webapp/ --max-warnings 9999 2>&1 | head -20
```

## Important notes

- ESLint 9+ requires Node.js >= 18.18.0
- The plugin expects `webapp/` relative to the config file location
- Do NOT place the config at the CAP project root if apps have their own `package.json` — ESLint will not resolve the plugin correctly
- Use `.eslintignore` patterns in the `ignores` array of `eslint.config.mjs` (flat config has no `.eslintignore` support)
- The `recommended` config already includes ignores for `target/`, `localService/`, `backup/`, and `*.d.ts` files
