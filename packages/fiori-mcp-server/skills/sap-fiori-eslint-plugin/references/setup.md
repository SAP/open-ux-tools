# Set Up ESLint for a Fiori Project

Set up ESLint with `@sap-ux/eslint-plugin-fiori-tools` for a SAP Fiori or CAP project.

## Step 1 — Detect project type and app location

**1a — Check if this is a CAP project** by looking for `@sap/cds` in `package.json` (most reliable, works regardless of folder layout):

```bash
grep -q '"@sap/cds"' package.json 2>/dev/null && echo "cap" || echo "standalone"
```

**1b — If CAP: get the configured app folder** using the CDS CLI (avoids hardcoding `app/`):

```bash
npx cds env get folders.app 2>/dev/null
```

This returns the actual app folder path (e.g. `app`, `applications`, or a custom name). If the command fails, fall back to checking for `app/`.

**1c — Find the Fiori app(s)** by locating `manifest.json` files one level below the app folder:

```bash
# Replace <app-folder> with the result from 1b
find <app-folder> -maxdepth 2 -name "manifest.json" 2>/dev/null
```

For a standalone Fiori app, search from the project root:

```bash
find . -maxdepth 3 -name "manifest.json" 2>/dev/null
```

**1d — Determine the webapp path** by checking `ui5.yaml` first (the `resources.configuration.paths.webapp` key), then falling back to `manifest.json` location. The directory containing `manifest.json` is the webapp root (e.g. `webapp/`, `src/`, or any custom path). Do **not** assume `webapp/`.

```bash
# Check ui5.yaml for a custom webapp path
grep -A5 "paths:" ui5.yaml 2>/dev/null | grep "webapp:"

# If not set, find manifest.json to locate the webapp root
find . -maxdepth 4 -name "manifest.json" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null
```

## Step 2 — Determine the correct config location

**IMPORTANT**: The `eslint.config.mjs` must be placed at the **app level** (the folder containing the webapp root), not the CAP project root.

| Project type | Config location |
|---|---|
| Standalone Fiori | Project root (next to the webapp folder) |
| CAP — single app | `<app-folder>/<app-name>/` (next to the webapp folder) |
| CAP — multiple apps | One `eslint.config.mjs` per app, each next to its own webapp folder |

## Step 3 — Check if config already exists

Before creating anything, check if a config already exists:

```bash
# Standalone
ls eslint.config.mjs eslint.config.js .eslintrc .eslintrc.js .eslintrc.json .eslintrc.yml 2>/dev/null

# CAP app level (use the path resolved in Step 1)
ls <app-folder>/<app-name>/eslint.config.mjs <app-folder>/<app-name>/.eslintrc 2>/dev/null
```

If a config already exists, inform the user and offer to:
1. Leave it as-is (if it already uses `@sap-ux/eslint-plugin-fiori-tools`)
2. Use [migrate.md](migrate.md) to migrate it to flat config syntax

## Step 4 — Determine the right configuration

Ask the user (or infer from project context) which config variant to use:

- **`recommended`** — For most Fiori freestyle and Fiori elements projects. Lints JS/TS in the webapp folder (resolved in Step 1d).
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

For CAP apps where the config is in a subfolder, choose the approach that fits the project layout:

| Approach | Command | Prerequisite |
|---|---|---|
| Change directory | `cd <app-folder>/<app-name> && eslint <webapp-path>/` | None |
| Explicit config flag | `eslint --config <app-folder>/<app-name>/eslint.config.mjs <app-folder>/<app-name>/<webapp-path>/` | None |
| npm workspaces | `npm run lint --workspace=<app-folder>/<app-name>` | Root `package.json` must declare the app as a workspace |

Check first:

```bash
node -e "const p=require('./package.json'); console.log(p.workspaces)"
```

If this prints the app paths, the `--workspace` flag will work.

## Step 8 — Verify the setup

Run ESLint to verify the config works (replace `<webapp-path>` with the path resolved in Step 1d):

```bash
npx eslint --print-config <webapp-path>/Component.js 2>/dev/null | head -20
```

Or run a quick lint to confirm no config errors:

```bash
npx eslint <webapp-path>/ --max-warnings 9999 2>&1 | head -20
```

## Important notes

- ESLint 10 requires Node.js >= 18.18.0
- The plugin expects the webapp path relative to the config file location — use the path resolved in Step 1d, do not assume `webapp/`
- Do NOT place the config at the CAP project root if apps have their own `package.json` — ESLint will not resolve the plugin correctly
- Use `.eslintignore` patterns in the `ignores` array of `eslint.config.mjs` (flat config has no `.eslintignore` support)
- The `recommended` config already includes ignores for `target/`, `localService/`, `backup/`, and `*.d.ts` files
