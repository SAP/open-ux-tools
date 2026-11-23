# Migrate Fiori ESLint to Flat Config

Migrate from legacy ESLint config (`.eslintrc`, `.eslintrc.js`, `eslint@8`, `eslint-plugin-fiori-custom`) to ESLint 10 flat config using `@sap-ux/eslint-plugin-fiori-tools@10`.

## Step 1 — Detect project type and what needs migrating

### Detect project type

**1a — Check if this is a CAP project** by looking for `@sap/cds` in `package.json` (most reliable, works regardless of folder layout):

```bash
grep -q '"@sap/cds"' package.json 2>/dev/null && echo "cap" || echo "standalone"
```

**1b — If CAP: get the configured app folder** using the CDS CLI (avoids hardcoding `app/`):

```bash
npx cds env get folders.app 2>/dev/null
```

If the command fails, fall back to `app/`. Use the resolved path as `<app-folder>` in all steps below.

### Scan for legacy ESLint artifacts

**Standalone Fiori app — check root:**
```bash
# Check for legacy config files
ls .eslintrc .eslintrc.js .eslintrc.cjs .eslintrc.json .eslintrc.yml .eslintrc.yaml 2>/dev/null

# Check for .eslintignore
ls .eslintignore 2>/dev/null

# Check current ESLint and plugin versions
grep -E '"eslint"|"fiori-custom"|"eslint-plugin-fiori"' package.json
```

**CAP project — check each app subfolder:**
```bash
find <app-folder> -name ".eslintrc*" -not -path "*/node_modules/*" 2>/dev/null
find <app-folder> -name "package.json" -not -path "*/node_modules/*" | xargs grep -l "eslint" 2>/dev/null
```

### 1c — Detect the webapp path

Before migrating, determine the actual webapp folder name — it may not be `webapp/`. Check `ui5.yaml` for a custom path mapping, then fall back to finding `manifest.json`:

```bash
# Check ui5.yaml for a custom webapp path
grep -A5 "paths:" ui5.yaml 2>/dev/null | grep "webapp:"

# If not configured in ui5.yaml, find manifest.json to locate the webapp root
find . -maxdepth 4 -name "manifest.json" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null
```

The directory containing `manifest.json` is the webapp root — use that path as `<webapp-path>` in the steps below. Do **not** assume `webapp/`.

## Step 2 — Use the automatic migration tool (recommended)

The `@sap-ux/create` tool can automatically migrate ESLint config. Run this from the app root (the folder containing the webapp folder):

```bash
npx --yes @sap-ux/create@latest convert eslint-config
```

For help and options:
```bash
npx --yes @sap-ux/create@latest convert eslint-config --help
```

**What the tool does automatically:**
1. Creates `eslint.config.mjs` with the flat config format
2. Migrates ignore patterns from `.eslintignore`
3. Updates `package.json` to ESLint 10 + `@sap-ux/eslint-plugin-fiori-tools@^10`
4. Removes the old `.eslintrc*` file
5. Removes the old `.eslintignore` file

If the automatic tool succeeds, jump to Step 5 to verify.

## Step 3 — Manual migration (if automatic tool fails or custom rules exist)

### 3a. Create eslint.config.mjs

The config file goes at the **app level** (next to the webapp folder resolved in Step 1b):

**Basic migration (was using `plugin:@sap-ux/eslint-plugin-fiori-tools/defaultJS`):**
```javascript
import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
    ...fioriTools.configs.recommended
];
```

**With custom ignores (migrate from .eslintignore):**
```javascript
import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
    {
        ignores: [
            'dist',
            'target',
            'localService',
            'backup'
            // Add any other patterns from your old .eslintignore here
        ]
    },
    ...fioriTools.configs.recommended
];
```

**If the project had custom rules on top of the defaults:**
```javascript
import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
    ...fioriTools.configs.recommended,
    {
        rules: {
            // Migrate any custom rule overrides here
            // Old: "fiori-custom/sap-no-localstorage": "error"
            // New: "@sap-ux/fiori-tools/sap-no-localstorage": "error"
        }
    }
];
```

### 3b. Migrate rule references in source code

If source files have ESLint disable comments using the old `fiori-custom/` prefix, update them:

```bash
# Find all references to old rule prefix (replace <webapp-path> with the path resolved in Step 1b)
grep -r "fiori-custom/" <webapp-path>/ --include="*.js" --include="*.ts" -l 2>/dev/null
```

Replace `fiori-custom/` with `@sap-ux/fiori-tools/`:

Examples:
- `// eslint-disable fiori-custom/sap-browser-api-warning` → `// eslint-disable @sap-ux/fiori-tools/sap-browser-api-warning`
- `// eslint-disable-next-line fiori-custom/sap-no-localstorage` → `// eslint-disable-next-line @sap-ux/fiori-tools/sap-no-localstorage`


## Step 4 — Update package.json dependencies

Update `eslint` to version 10 and `@sap-ux/eslint-plugin-fiori-tools` to version 10+. Remove `eslint-plugin-fiori-custom` if present.

Detect the package manager:
```bash
ls package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null
```

**npm:**
```bash
npm uninstall eslint-plugin-fiori-custom
npm install --save-dev eslint@^10 @sap-ux/eslint-plugin-fiori-tools@^10
```

**pnpm:**
```bash
pnpm remove eslint-plugin-fiori-custom
pnpm add --save-dev eslint@^10 @sap-ux/eslint-plugin-fiori-tools@^10
```

**yarn:**
```bash
yarn remove eslint-plugin-fiori-custom
yarn add --dev eslint@^10 @sap-ux/eslint-plugin-fiori-tools@^10
```

**For CAP projects**: Run from the app subfolder if it has its own `package.json`, or from the root if packages are shared.

## Step 5 — Verify the migration

Run ESLint to confirm no configuration errors (replace `<webapp-path>` with the path resolved in Step 1b):

```bash
# Check config is valid (should print config JSON, not an error)
npx eslint --print-config <webapp-path>/Component.js 2>&1 | head -5

# Run lint on the webapp
npx eslint <webapp-path>/ 2>&1 | head -40
```

If ESLint reports config errors, common fixes:
- **"Cannot find module '@sap-ux/eslint-plugin-fiori-tools'"** → Plugin not installed, run install command from Step 4
- **"FlatConfig is not supported"** → Using ESLint 8, upgrade to ESLint 10
- **"Unknown rule"** → Old rule prefix still in use, check for remaining `fiori-custom/` references

## What changed between ESLint 8 and 9+

| ESLint 8 (legacy) | ESLint 10 (flat config) |
|---|---|
| `.eslintrc` / `.eslintrc.js` | `eslint.config.mjs` |
| `.eslintignore` | `ignores` array in config |
| `extends: [...]` | Spread `...` configs into array |
| `plugins: { "fiori-custom": ... }` | Included in `fioriTools.configs.recommended` |
| `fiori-custom/` rule prefix | `@sap-ux/fiori-tools/` rule prefix |
| `plugin:@sap-ux/.../defaultJS` | `fioriTools.configs.recommended` |
