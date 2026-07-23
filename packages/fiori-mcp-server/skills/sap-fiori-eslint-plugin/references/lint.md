# Run, Fix, and Scope ESLint on a Fiori Project

Run ESLint on a SAP Fiori project to check code quality and optionally auto-fix issues. Includes an **app-scope mode** that reproduces the exact file set checked by the Application Information panel and Page Map.

## App-scope mode — show only application issues (consistent with Application Information / Page Map)

Use this mode when the user says things like:
- "show all application issues for my app"
- "show UX consistency issues"
- "issues for app xyz"
- "same issues as Application Information" / "same issues as Page Map"

### Exact file scope used by Application Information / Page Map

The Application Information panel and Page Map do **not** lint all files in `webapp/`. They lint a precise, curated
set of files — nothing more. Running `npx eslint .` or `npx eslint webapp/` will produce a higher,
inconsistent count because it picks up JavaScript/TypeScript source files, test files, and other
files that the tooling never checks.

**Files linted by Application Information / Page Map (derived from the IDE extension source):**

| File | Standalone | CAP |
|---|:---:|:---:|
| `webapp/manifest.json` | ✅ | ✅ |
| `webapp/changes/**/*propertyChange.change` (OData V2 only) | ✅ | ✅ |
| All local XML files listed in the manifest via `localUri` (`ODataAnnotation`, `OData`, etc.) | ✅ | ❌ |
| `<app-folder>/<app-name>/**/*.cds` (app-level only) | ❌ | ✅ |

Key rules:
- Only `*propertyChange.change` files are included from the `changes/` folder — not all `.change` files; these only exist in OData V2 projects
- For CAP projects, only `.cds` files within the specific app directory are linted — not the project root, `db/`, `srv/`, or sibling apps
- For CAP projects, XML annotation files are **not** linted — the annotations live in `.cds` files instead
- For standalone projects, `.cds` files are **not** linted — only the manifest, all localUri XML files from manifest dataSources, and change files

### Detecting OData version

The OData version is declared explicitly in `manifest.json` under `sap.app.dataSources[*].settings.odataVersion`. A V4 project will have `"odataVersion": "4.0"` on its main data source; V2 projects either have `"2.0"` or omit the field entirely.

```bash
# Returns "v4" if any dataSource declares odataVersion 4.x, otherwise "v2"
node --input-type=commonjs -e "
const m = require('./webapp/manifest.json');
const ds = Object.values(m['sap.app']?.dataSources ?? {});
const isV4 = ds.some(d => (d.settings?.odataVersion ?? '').startsWith('4'));
console.log(isV4 ? 'v4' : 'v2');
"
```

- Result `v4` → **OData V4** — skip `.change` files
- Result `v2` → **OData V2** — include `*propertyChange.change` files

### Why counts differ without this scoping

Running `npx eslint .` or `npx eslint webapp/` picks up `.js`, `.ts`, controller files, test files,
and more — none of which Application Information or Page Map ever checks. This produces more issues and a higher
count than what the tooling shows.

### App-scope lint commands

Always target the exact file set explicitly. Substitute real paths where shown.

> **Windows (all commands in this section)**: Both the standalone and CAP commands use `find` and `$()` subshell expansion. They require **Git Bash** or **WSL** — they will not run in cmd.exe or PowerShell.

**Standalone Fiori app:**
```bash
# From the app root (where eslint.config.mjs and webapp/ are)

# 1. manifest.json
npx eslint webapp/manifest.json

# 2. propertyChange files — OData V2 projects only (skip if V4)
# Array assignment splits find output into separate elements (works in bash and zsh)
CHANGE_FILES=($(find webapp/changes -name "*propertyChange.change" 2>/dev/null))
[ ${#CHANGE_FILES[@]} -gt 0 ] && npx eslint "${CHANGE_FILES[@]}"

# 3. All local XML files declared in manifest dataSources via localUri
#    (covers annotation files, metadata.xml, service.xml, etc.)
XML_FILES=($(node --input-type=commonjs -e "
const m = require('./webapp/manifest.json');
const ds = Object.values(m['sap.app']?.dataSources ?? {});
ds.filter(d => d.settings?.localUri).forEach(d => console.log('webapp/' + d.settings.localUri));
"))
[ ${#XML_FILES[@]} -gt 0 ] && npx eslint "${XML_FILES[@]}"

# Or combine all three in one pass:
CHANGE_FILES=($(find webapp/changes -name "*propertyChange.change" 2>/dev/null))
XML_FILES=($(node --input-type=commonjs -e "
const m = require('./webapp/manifest.json');
const ds = Object.values(m['sap.app']?.dataSources ?? {});
ds.filter(d => d.settings?.localUri).forEach(d => console.log('webapp/' + d.settings.localUri));
"))
npx eslint webapp/manifest.json "${CHANGE_FILES[@]}" "${XML_FILES[@]}"
```

**CAP project — specific app:**
```bash
# From the CAP project root
APP=app/incidents   # replace with your app folder

# 1. manifest.json
npx eslint $APP/webapp/manifest.json

# 2. propertyChange files — OData V2 projects only (skip if V4)
CHANGE_FILES=($(find $APP/webapp/changes -name "*propertyChange.change" 2>/dev/null))
[ ${#CHANGE_FILES[@]} -gt 0 ] && npx eslint "${CHANGE_FILES[@]}"

# 3. CDS files (app-level only)
# The glob is intentionally quoted — ESLint resolves it internally, not the shell.
npx eslint "$APP/**/*.cds"
```

### Identifying the app name and local XML files

```bash
# Find webapp/ locations (CAP)
find app -maxdepth 2 -type d -name "webapp" -not -path "*/node_modules/*"

# Extract all local XML file paths from manifest (any dataSource with a localUri)
node --input-type=commonjs -e "
const m = require('./webapp/manifest.json');
const ds = m['sap.app']?.dataSources ?? {};
Object.values(ds).filter(d => d.settings?.localUri).forEach(d => console.log('webapp/' + d.settings.localUri));
"
```

If the user names a specific app, match by the parent folder of `webapp/`. If ambiguous, list found
apps and ask the user to confirm.

### Reporting app-scope results

Present results with a clear scope label so the user knows the count matches the tooling:

```
Application Issues (Application Information / Page Map scope):
  Standalone: manifest.json + all localUri XML files from manifest dataSources + *propertyChange.change files (V2 only)
  CAP:        manifest.json + <app>/**/*.cds + *propertyChange.change files (V2 only)

- X errors
- Y warnings
- Files affected: [list]
- Most common rules: [top 3]
```

When listing individual issues, use the table format described in Step 7.

If the count still differs from what the user sees in Application Information or Page Map, check:
1. **Missing annotation files** — the manifest may reference annotation URIs not covered by the glob above; extract them with the node snippet above
2. **ESLint config `files` glob** — the config may restrict which file types are checked (e.g. only `*.xml` but not `*.json`)
3. **Rule set variant** — confirm the config uses `recommended-for-s4hana` vs `recommended` to match what the tooling expects
4. **Plugin version** — Application Information and Page Map each load the plugin from the project's own `node_modules`; make sure `@sap-ux/eslint-plugin-fiori-tools` is installed there



## Step 1 — Verify ESLint is configured

Detect whether this is a standalone Fiori app or a CAP project, then check for a valid ESLint config.

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
# Find eslint configs inside <app-folder> subfolders, skipping node_modules
find <app-folder> -name "eslint.config.mjs" -not -path "*/node_modules/*" 2>/dev/null
```

Then verify each found config references `@sap-ux/eslint-plugin-fiori-tools`:
```bash
find <app-folder> -name "eslint.config.mjs" -not -path "*/node_modules/*" 2>/dev/null | while read config; do
  if grep -q "@sap-ux/eslint-plugin-fiori-tools" "$config"; then
    echo "✅ $config — plugin configured"
  else
    echo "❌ $config — missing @sap-ux/eslint-plugin-fiori-tools"
  fi
done
```

**Decision tree — what to do next:**

1. **Config found and references `@sap-ux/eslint-plugin-fiori-tools`** → proceed to Step 2.
2. **Legacy config found** (`.eslintrc`, `.eslintrc.js`, `.eslintrc.cjs`, `.eslintrc.json`, `.eslintrc.yml`) → follow [migrate.md](migrate.md) first, then return here.
3. **No config found at all** → follow [setup.md](setup.md) to create a fresh config, then return here.

To detect a legacy config:
```bash
ls .eslintrc .eslintrc.js .eslintrc.cjs .eslintrc.json .eslintrc.yml .eslintrc.yaml 2>/dev/null
```

For CAP projects, also check each app subfolder:
```bash
find <app-folder> -name ".eslintrc*" -not -path "*/node_modules/*" 2>/dev/null
```

## Step 2 — Locate the app to lint

Determine the **app-level directory** to lint — this is where `eslint.config.mjs` lives. Running ESLint from there (with `.` as the target) lets the config control which files are linted, covering all source files.

- **Standalone Fiori app**: project root (where `eslint.config.mjs` is)
- **CAP project**: each `<app-folder>/<app-name>/` subfolder (where its `eslint.config.mjs` is)

For CAP projects, list available apps:
```bash
find <app-folder> -name "eslint.config.mjs" -not -path "*/node_modules/*" 2>/dev/null
```

If the user specified a particular app or path, use that. Otherwise lint the detected location(s).

## Step 3 — Run lint (check mode)

Run ESLint from the app-level directory (where `eslint.config.mjs` is) using `.` as the target. This ensures the config is picked up correctly and all files the config covers are linted.

### Standalone Fiori app:
```bash
npx eslint .
```

### CAP project — specific app:
```bash
# Run from the app subfolder (where eslint.config.mjs is)
# Note: cd && ... is for terminal use only — not safe as a package.json script on Windows
cd <app-folder>/<app-name> && npx eslint .
```

### CAP project — all apps:
```bash
# Find and lint each app that has its own eslint.config.mjs
find <app-folder> -name "eslint.config.mjs" -not -path "*/node_modules/*" | while read config; do
  appdir=$(dirname "$config")
  echo "=== Linting $appdir ==="
  (cd "$appdir" && npx eslint . 2>&1)
done
```

### With detailed output format:
```bash
# More readable output with file/line references
npx eslint . --format stylish
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
npx eslint . --fix
```

### CAP — specific app:
```bash
# Note: cd && ... is for terminal use only — not safe as a package.json script on Windows
cd <app-folder>/<app-name> && npx eslint . --fix
```

**IMPORTANT**: The `--fix` flag modifies files in place. Before running:
1. Confirm with the user that they want auto-fixes applied
2. Recommend they have a clean git state or backup so fixes can be reviewed/reverted

After fixing, show what changed:
```bash
git diff --stat 2>/dev/null || echo "(git not available to show diff)"
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
ESLint Results:
- X errors found (N auto-fixed, M require manual fix)
- Y warnings found (P auto-fixed, Q require manual fix)
- Files with issues: [list key files]
- Most common violations: [top 3 rules]
```

When listing individual issues in a table, always include the source file as the first column and a separate Line column. Put the path as bare inline code `` `file:///absolute/path:line` `` — markdown link syntax breaks the `:line` suffix before VS Code's terminal link detector can parse it:

```
| File | Line | Rule | Issue |
|---|---|---|---|
| `file:///abs/path/webapp/localService/metadata.xml:123` | 123 | sap-description-column-label | MyField has generic label … |
```

If everything is clean:
```
✅ No ESLint issues found
```

## Tips

- Run `npx eslint . --fix-dry-run` to preview what auto-fixes would change without applying them
- Use `npx eslint . --rule '@sap-ux/fiori-tools/sap-no-localstorage: error'` to check a single rule
- Add `// eslint-disable-next-line @sap-ux/fiori-tools/<rule-name>` to suppress a specific rule on one line when a violation is intentional and documented