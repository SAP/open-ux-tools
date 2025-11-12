# Dependency Update Tools

This directory contains scripts to analyze and plan dependency updates for the pnpm workspace monorepo.

## Quick Start

Generate a comprehensive dependency update plan:

```bash
# Using Node.js script (recommended)
node ./docs/dependencyManagement/generate-dependency-update-plan.js

# Or using shell script
./docs/dependencyManagement/generate-dependency-update-plan.sh
```

**Output:**
- `docs/dependencyManagement/DEPENDENCY_UPDATE_PLAN.md` - Comprehensive markdown plan
- `docs/dependencyManagement/version-report.json` - Detailed JSON report with all dependency information
- `docs/dependencyManagement/knip-report.json` - Knip unused dependencies report (if Knip check was run)
- `docs/dependencyManagement/unused-dependencies.json` - Depcheck report (if --check-unused was used)

## Scripts Overview

### 1. `generate-dependency-update-plan.js`

**Main orchestration script** - Runs the complete analysis pipeline.

**What it does:**
1. Collects all dependencies from workspace packages
2. Checks latest versions and analyzes updates needed
3. Checks for unused dependencies with Knip (optional)
4. Checks for unused dependencies with depcheck (optional)
5. Generates comprehensive markdown plan

**Usage:**
```bash
# Basic usage (includes Knip check by default)
node ./docs/dependencyManagement/generate-dependency-update-plan.js

# Skip version check and use existing version-report.json
node ./docs/dependencyManagement/generate-dependency-update-plan.js --skip-version-check

# Skip Knip unused dependencies check
node ./docs/dependencyManagement/generate-dependency-update-plan.js --skip-knip

# Include depcheck unused dependencies check
node ./docs/dependencyManagement/generate-dependency-update-plan.js --check-unused

# All checks enabled (version + knip + depcheck)
node ./docs/dependencyManagement/generate-dependency-update-plan.js --check-unused
```

**Options:**
- `--skip-version-check` - Skip updating version-report.json (use existing file)
- `--check-unused` - Run depcheck for unused dependencies analysis
- `--skip-knip` - Skip Knip unused dependencies check (runs by default)

**Runtime:**
- Version check: ~2-3 minutes (365+ dependencies)
- Knip check: ~2-5 minutes (uses npx, no installation required)
- Depcheck: ~5-10 minutes (all packages)

**Note:** Knip runs via `npx knip` and doesn't require installation. It will use a cached version after the first run.

---

### 2. `collect-dependencies.js`

Collects all external dependencies from the pnpm workspace.

**Features:**
- Scans all workspace packages
- Includes all packages (including `@sap-ux/*` packages)
- Identifies version inconsistencies
- Tracks which packages use each dependency

**Output:** JSON file with dependency inventory

**Usage:**
```bash
node docs/dependencyManagement/collect-dependencies.js > dependencies.json
```

**Output Format:**
```json
{
  "totalPackages": 76,
  "totalDependencies": 365,
  "dependencies": {
    "express": {
      "versions": ["4.21.2"],
      "usedInPackages": ["@sap/ux-ui5-tooling", "..."]
    }
  }
}
```

---

### 3. `check-dependency-versions.js`

Checks latest versions for all dependencies and analyzes update requirements.

**Features:**
- Queries npm registry for latest versions
- Calculates package ages
- Determines update type (MAJOR/MINOR/PATCH)
- Provides changelog URLs
- Recommends actions

**Usage:**
```bash
node docs/dependencyManagement/check-dependency-versions.js <collected-deps.json> > version-report.json
```

**Arguments:**
- `<collected-deps.json>` - Output from `collect-dependencies.js`

**Output:** Comprehensive version analysis report

---

### 4. `check-unused-dependencies.js`

Checks for unused dependencies across all workspace packages using depcheck.

**Features:**
- Scans all workspace packages
- Identifies unused dependencies and devDependencies
- Detects missing dependencies
- Finds invalid files and directories

**Usage:**
```bash
node docs/dependencyManagement/check-unused-dependencies.js > unused-dependencies.json
```

**Requirements:**
- `depcheck` must be available (available via npx)

**Output Format:**
```json
{
  "timestamp": "2025-11-11T10:00:00.000Z",
  "totalPackages": 83,
  "packagesWithIssues": 15,
  "packages": {
    "package-name": {
      "location": "packages/some-package",
      "unusedDependencies": ["unused-pkg"],
      "unusedDevDependencies": ["unused-dev-pkg"],
      "missing": {},
      "invalidFiles": {},
      "invalidDirs": {}
    }
  }
}
```

---

### 5. `create-dependency-plan-markdown.js`

Generates a markdown document from the version analysis report.

**Features:**
- Executive summary with statistics
- Traffic light status indicators (🟢 🟡 🔴)
- Critical findings (top 20 by age)
- Breakdown by update type (major/minor/patch)
- Version inconsistencies report
- Unused dependencies report (Knip)
- Phased implementation plan (4 phases)
- Complete dependency list
- Risk assessments and effort estimates

**Usage:**
```bash
node docs/dependencyManagement/create-dependency-plan-markdown.js <version-report.json> <output.md>
```

**Arguments:**
- `<version-report.json>` - Output from `check-dependency-versions.js`
- `<output.md>` - Path for output markdown file

**Optional Files:**
- `knip-report.json` - If present, includes Knip unused dependencies analysis
- `unused-dependencies.json` - If present, includes depcheck analysis

---

## Output Files

### DEPENDENCY_UPDATE_PLAN.md

Comprehensive markdown plan with:

- **Executive Summary** - Statistics and overview
- **Critical Findings** - Top 20 most critical updates with traffic light indicators
- **Update Breakdown** - All dependencies by type (🔴 Major, 🟡 Minor, 🟢 Patch)
- **Version Inconsistencies** - Dependencies with multiple versions
- **Unused Dependencies** - Knip analysis results (if available)
- **Phased Implementation Plan** - 4 phases over 12-18 weeks
- **Detailed Dependency List** - All 365+ dependencies with status colors
- **Recommendations** - Immediate, short-term, and long-term actions
- **Status Legend** - Traffic light color meanings

### version-report.json

Detailed JSON report with:

```json
{
  "generatedDate": "2025-11-11",
  "summary": {
    "totalPackages": 76,
    "totalUniqueExternalDependencies": 365,
    "dependenciesOlderThan6Months": 310,
    "majorUpdates": 118,
    "minorUpdates": 70,
    "patchUpdates": 61
  },
  "dependencies": [
    {
      "name": "package-name",
      "currentVersion": "1.0.0",
      "latestVersion": "2.0.0",
      "currentVersionAge": "2023-01-01 (2 years old)",
      "isOlderThan6Months": true,
      "updateType": "MAJOR",
      "status": "red",
      "statusEmoji": "🔴",
      "usedInPackages": ["pkg1", "pkg2"],
      "changelogUrl": "https://...",
      "recommendedAction": "Review required",
      "hasMultipleVersions": false,
      "allVersionsUsed": ["1.0.0"]
    }
  ]
}
```

### knip-report.json

Knip unused dependencies analysis (JSON format from `pnpm knip:json`):

```json
{
  "files": {
    "package.json": {
      "dependencies": ["unused-package"],
      "devDependencies": ["unused-dev-package"]
    }
  }
}
```

### unused-dependencies.json

Depcheck unused dependencies analysis:

```json
{
  "timestamp": "2025-11-11T10:00:00.000Z",
  "totalPackages": 83,
  "packagesWithIssues": 15,
  "packages": {
    "package-name": {
      "location": "packages/some-package",
      "unusedDependencies": ["unused-pkg"],
      "unusedDevDependencies": []
    }
  }
}
```

---

## Customization

### Exclude Additional Packages

Edit `collect-dependencies.js`:

```javascript
// Skip internal packages (currently includes all packages)
if (name.startsWith('@your-org/')) return;
```

### Adjust Age Threshold

Edit `check-dependency-versions.js`:

```javascript
// Change from 6 months to 12 months
isOlderThan6Months: diffMonths >= 12
```

### Modify Risk Calculation

Edit `create-dependency-plan-markdown.js`:

```javascript
function calculateRisk(dep) {
  // Customize risk levels based on your criteria
  const updateType = dep.updateType;
  const packageCount = dep.usedInPackages.length;

  if (updateType === 'MAJOR' && packageCount >= 10) return 'CRITICAL';
  // ... add your logic
}
```

---

## Troubleshooting

### "Permission denied" error

Make scripts executable:
```bash
chmod +x scripts/*.sh scripts/*.js
```

### "npm view" timeouts

The version check script has built-in timeout handling. If you experience frequent timeouts:

1. Check network connectivity
2. Verify npm registry access
3. Consider running on a different network

### Incomplete results

If some dependencies fail to fetch:

1. Check `/tmp/version-report.json` for error messages
2. Re-run specific checks manually: `npm view <package-name> version`
3. Dependencies with errors will be marked as "Manual check required"

---

## Maintenance

### Regular Updates

Run monthly to track dependency health:

```bash
# Add to cron or CI/CD pipeline
0 0 1 * * cd /path/to/repo && node ./docs/dependencyManagement/generate-dependency-update-plan.js
```

### CI Integration

Add to `.github/workflows/dependency-check.yml`:

```yaml
name: Dependency Check
on:
  schedule:
    - cron: '0 0 1 * *'  # Monthly
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - uses: pnpm/action-setup@v2
        with:
          version: 8.14.0
      - run: node ./docs/dependencyManagement/generate-dependency-update-plan.js
      - uses: actions/upload-artifact@v4
        with:
          name: dependency-plan
          path: |
            docs/dependencyManagement/DEPENDENCY_UPDATE_PLAN.md
            docs/dependencyManagement/version-report.json
```

---

## Related Commands

### Manual dependency checks

```bash
# Check outdated in specific package
cd packages/some-package
pnpm outdated

# Check workspace-wide
pnpm -r outdated

# Update single dependency
pnpm update <package>@<version>

# Update all patch versions
pnpm update <package> --latest
```

### Knip commands

```bash
# Run Knip analysis (full report)
pnpm knip

# Get JSON output
pnpm knip:json

# Check only production dependencies
pnpm knip:production
```

### Automated update tools

```bash
# npm-check-updates (interactive)
npx npm-check-updates -i

# Depcheck for unused dependencies
npx depcheck

# Dependabot (GitHub)
# Add .github/dependabot.yml configuration
```

---

## Support

For issues or questions:

1. Check this README
2. Review script comments
3. Open an issue in the repository

---

**Last Updated:** 2025-11-12

## Summary of Features

This dependency management toolkit provides:

✅ **Version Analysis**
- Checks 365+ dependencies against npm registry
- Identifies outdated packages with age and update type
- Traffic light status indicators (🟢 🟡 🔴)

✅ **Unused Dependencies Detection**
- Knip workspace-wide analysis (default)
- Depcheck per-package analysis (optional)
- Identifies unused dependencies and devDependencies

✅ **Comprehensive Reporting**
- Markdown plan with phased implementation
- JSON reports for CI/CD integration
- Risk assessment and effort estimation

✅ **Flexible Options**
- Skip version checks to save time
- Enable/disable unused dependency checks
- Reuse existing reports
