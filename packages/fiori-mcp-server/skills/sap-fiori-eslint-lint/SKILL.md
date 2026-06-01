---
name: sap-fiori-eslint-lint
description: Run ESLint on a SAP Fiori project and report results or auto-fix issues using @sap-ux/eslint-plugin-fiori-tools. Use when the user asks to lint, check code quality, fix ESLint errors, or run code style checks on a Fiori app.
compatibility: Requires Node.js and an eslint.config.mjs configured with @sap-ux/eslint-plugin-fiori-tools. If not configured, use the sap-fiori-eslint-setup skill first.
metadata:
  author: sap-fiori-tools
  version: "1.0"
---

# Fiori ESLint Lint & Fix

Run ESLint on a SAP Fiori project to check code quality and optionally auto-fix issues.

## Step 1 — Verify ESLint is configured

Detect whether this is a standalone Fiori app or a CAP project, then check for a valid ESLint config.

### Detect project type

```bash
# CAP project has a package.json with @sap/cds or a cds section, and an app/ folder
ls app/ 2>/dev/null && cat package.json 2>/dev/null | grep -q '"@sap/cds"' && echo "CAP project" || echo "Standalone Fiori app"
```

### Standalone Fiori app — check root config

```bash
ls eslint.config.mjs eslint.config.js eslint.config.cjs 2>/dev/null
```

Then verify the found config references `@sap-ux/eslint-plugin-fiori-tools`:
```bash
grep -l "@sap-ux/eslint-plugin-fiori-tools" eslint.config.mjs eslint.config.js eslint.config.cjs 2>/dev/null
```

### CAP project — check app subfolders only (NOT the root)

```bash
# Find eslint configs inside app/ subfolders, skipping node_modules
find app -name "eslint.config.mjs" -not -path "*/node_modules/*" 2>/dev/null
```

Then verify each found config references `@sap-ux/eslint-plugin-fiori-tools`:
```bash
find app -name "eslint.config.mjs" -not -path "*/node_modules/*" 2>/dev/null | while read config; do
  if grep -q "@sap-ux/eslint-plugin-fiori-tools" "$config"; then
    echo "✅ $config — plugin configured"
  else
    echo "❌ $config — missing @sap-ux/eslint-plugin-fiori-tools"
  fi
done
```

**Decision tree — what to do next:**

1. **Config found and references `@sap-ux/eslint-plugin-fiori-tools`** → proceed to Step 2.
2. **Legacy config found** (`.eslintrc`, `.eslintrc.js`, `.eslintrc.cjs`, `.eslintrc.json`, `.eslintrc.yml`) → use the `sap-fiori-eslint-migrate` skill to migrate to flat config first, then return here.
3. **No config found at all** → use the `sap-fiori-eslint-setup` skill to create a fresh config, then return here.

To detect a legacy config:
```bash
ls .eslintrc .eslintrc.js .eslintrc.cjs .eslintrc.json .eslintrc.yml .eslintrc.yaml 2>/dev/null
```

For CAP projects, also check each app subfolder:
```bash
find app -name ".eslintrc*" -not -path "*/node_modules/*" 2>/dev/null
```

## Step 2 — Locate the app to lint

Determine which directory to lint:

- **Standalone Fiori app**: `webapp/` at the project root
- **CAP project**: Each app under `app/<app-name>/webapp/`

For CAP projects, list available apps:
```bash
ls app/ 2>/dev/null
find app -name "manifest.json" -not -path "*/node_modules/*" 2>/dev/null
```

If the user specified a particular app or path, use that. Otherwise lint the detected location.

## Step 3 — Run lint (check mode)

Run ESLint to report issues without modifying files:

### Standalone Fiori app:
```bash
npx eslint webapp/
```

### CAP project — specific app:
```bash
# Run from the app subfolder (where eslint.config.mjs is)
cd app/<app-name> && npx eslint webapp/
```

### CAP project — all apps:
```bash
# Find and lint each app that has its own eslint.config.mjs
find app -name "eslint.config.mjs" -not -path "*/node_modules/*" | while read config; do
  appdir=$(dirname "$config")
  echo "=== Linting $appdir ==="
  (cd "$appdir" && npx eslint webapp/ 2>&1)
done
```

### With detailed output format:
```bash
# More readable output with file/line references
npx eslint webapp/ --format stylish
```

## Step 4 — Interpret the output

ESLint output shows:
- **Errors** (`error`): Must be fixed — these violate required Fiori coding standards
- **Warnings** (`warning`): Should be reviewed — best practice suggestions

Example output:
```
/path/to/webapp/controller/App.controller.js
  12:5  error    Local storage must not be used  @sap-ux/fiori-tools/sap-no-localstorage
  24:1  warning  DOM access is not recommended   @sap-ux/fiori-tools/sap-no-dom-access

✖ 2 problems (1 error, 1 warning)
  0 errors and 0 warnings potentially fixable with the `--fix` option.
```

Summarize the results for the user:
- Total errors and warnings
- Which files are affected
- The most common rule violations
- Whether any issues are auto-fixable

## Step 5 — Auto-fix issues (optional)

Many ESLint rules support automatic fixing. Run with `--fix` to apply safe fixes:

### Standalone:
```bash
npx eslint webapp/ --fix
```

### CAP — specific app:
```bash
cd app/<app-name> && npx eslint webapp/ --fix
```

**IMPORTANT**: The `--fix` flag modifies files in place. Before running:
1. Confirm with the user that they want auto-fixes applied
2. Recommend they have a clean git state or backup so fixes can be reviewed/reverted

After fixing, show what changed:
```bash
git diff --stat webapp/ 2>/dev/null || echo "(git not available to show diff)"
```

## Step 6 — Handle unfixable issues

Issues not fixed by `--fix` require manual code changes. For each unfixable error:

1. Read the relevant source file
2. Identify the problematic code pattern
3. Suggest or apply the correct Fiori-compliant alternative

### Common Fiori ESLint violations and fixes:

| Rule | Problem | Fix |
|---|---|---|
| `sap-no-localstorage` | `localStorage.setItem(...)` | Use `sap.ui.util.Storage` instead |
| `sap-no-sessionstorage` | `sessionStorage.getItem(...)` | Use `sap.ui.util.Storage` instead |
| `sap-no-dom-access` | `document.getElementById(...)` | Use UI5 control APIs instead |
| `sap-no-inner-html-write` | `element.innerHTML = ...` | Avoid; use UI5 controls for rendering |
| `sap-no-global-variable` | Using undeclared globals | Declare in `globals` config or import |
| `sap-no-hardcoded-url` | Hardcoded absolute URLs | Use relative paths or manifest datasources |
| `sap-no-navigator` | `navigator.userAgent` | Avoid browser detection; use UI5 APIs |
| `sap-flex-enabled` | Missing `flexEnabled: true` in manifest | Add `"flexEnabled": true` to `sap.ui5` section |

## Step 7 — Report summary

After linting (and optional fixing), provide a clear summary:

```
ESLint Results for webapp/:
- X errors found (N auto-fixed, M require manual fix)
- Y warnings found (P auto-fixed, Q require manual fix)
- Files with issues: [list key files]
- Most common violations: [top 3 rules]
```

If everything is clean:
```
✅ No ESLint issues found in webapp/
```

## Tips

- Run `npx eslint webapp/ --fix-dry-run` to preview what auto-fixes would change without applying them
- Use `npx eslint webapp/ --rule '@sap-ux/fiori-tools/sap-no-localstorage: error'` to check a single rule
- Add `// eslint-disable-next-line @sap-ux/fiori-tools/<rule-name>` to suppress a specific rule on one line when a violation is intentional and documented

