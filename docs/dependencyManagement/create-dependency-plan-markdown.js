#!/usr/bin/env node
/**
 * Generate comprehensive dependency update plan in Markdown format
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error('Usage: node create-dependency-plan-markdown.js <version-report.json> <output.md>');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Try to load optional Knip report
const knipReportPath = path.join(path.dirname(inputFile), 'knip-report.json');
let knipReport = null;
if (fs.existsSync(knipReportPath)) {
  try {
    knipReport = JSON.parse(fs.readFileSync(knipReportPath, 'utf8'));
  } catch (err) {
    console.error('Warning: Could not parse knip-report.json');
  }
}

// Try to load optional depcheck report
const unusedDepsPath = path.join(path.dirname(inputFile), 'unused-dependencies.json');
let unusedDepsReport = null;
if (fs.existsSync(unusedDepsPath)) {
  try {
    unusedDepsReport = JSON.parse(fs.readFileSync(unusedDepsPath, 'utf8'));
  } catch (err) {
    console.error('Warning: Could not parse unused-dependencies.json');
  }
}

// Helper functions
function escapeMarkdown(text) {
  return text.replace(/\|/g, '\\|');
}

function formatDependencyName(name, currentVersion, latestVersion) {
  const escapedName = escapeMarkdown(name);
  // Strike through if current and latest versions are the same
  if (currentVersion === latestVersion) {
    return `~~\`${escapedName}\`~~`;
  }
  return `\`${escapedName}\``;
}

function sortByAge(deps) {
  return deps.sort((a, b) => {
    const aDate = a.currentVersionAge.split(' (')[0];
    const bDate = b.currentVersionAge.split(' (')[0];
    return aDate.localeCompare(bDate);
  });
}

function calculateRisk(dep) {
  const updateType = dep.updateType;
  const packageCount = dep.usedInPackages.length;
  const hasMultiple = dep.hasMultipleVersions;

  if (updateType === 'MAJOR' && packageCount >= 10) return 'CRITICAL';
  if (updateType === 'MAJOR' && packageCount >= 5) return 'HIGH';
  if (updateType === 'MAJOR' || hasMultiple) return 'MEDIUM';
  if (updateType === 'MINOR') return 'LOW';
  return 'VERY LOW';
}

function estimateEffort(dep) {
  const updateType = dep.updateType;
  const packageCount = dep.usedInPackages.length;

  if (updateType === 'PATCH') return '0.5-1h';
  if (updateType === 'MINOR') return '1-2h';
  if (updateType === 'MAJOR') {
    if (packageCount >= 10) return '8-16h';
    if (packageCount >= 5) return '4-8h';
    return '2-4h';
  }
  return '0.5h';
}

// Group dependencies
const major = report.dependencies.filter(d => d.updateType === 'MAJOR');
const minor = report.dependencies.filter(d => d.updateType === 'MINOR');
const patch = report.dependencies.filter(d => d.updateType === 'PATCH');
const upToDate = report.dependencies.filter(d => d.updateType === 'NONE');
const multipleVersions = report.dependencies.filter(d => d.hasMultipleVersions);
const olderThan6Months = report.dependencies.filter(d => d.isOlderThan6Months);
const olderThan6MonthsWithUpdates = report.dependencies.filter(d => d.isOlderThan6Months && d.updateType !== 'NONE');

// Sort major updates by priority
const majorCritical = major.filter(d => calculateRisk(d) === 'CRITICAL');
const majorHigh = major.filter(d => calculateRisk(d) === 'HIGH');
const majorMedium = major.filter(d => calculateRisk(d) === 'MEDIUM');

// Generate Markdown
let md = `# Dependency Update Plan

**Generated:** ${report.generatedDate}
**Scope:** ${report.analysisScope}

---

## Executive Summary

### 📊 Overview Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Packages Analyzed** | ${report.summary.totalPackages} | - |
| **Total Unique External Dependencies** | ${report.summary.totalUniqueExternalDependencies} | 100% |
| **Dependencies Older Than 6 Months** | ${report.summary.dependenciesOlderThan6Months} | ${((report.summary.dependenciesOlderThan6Months / report.summary.totalUniqueExternalDependencies) * 100).toFixed(1)}% |
| **Dependencies Older Than 6 Months with Updates Available** | ${olderThan6MonthsWithUpdates.length} | ${((olderThan6MonthsWithUpdates.length / report.summary.totalUniqueExternalDependencies) * 100).toFixed(1)}% |
| **Major Updates Available** | ${report.summary.majorUpdates} | ${((report.summary.majorUpdates / report.summary.totalUniqueExternalDependencies) * 100).toFixed(1)}% |
| **Minor Updates Available** | ${report.summary.minorUpdates} | ${((report.summary.minorUpdates / report.summary.totalUniqueExternalDependencies) * 100).toFixed(1)}% |
| **Patch Updates Available** | ${report.summary.patchUpdates} | ${((report.summary.patchUpdates / report.summary.totalUniqueExternalDependencies) * 100).toFixed(1)}% |
| **Up to Date** | ${report.summary.upToDate} | ${((report.summary.upToDate / report.summary.totalUniqueExternalDependencies) * 100).toFixed(1)}% |
| **Version Inconsistencies** | ${report.summary.multipleVersionsUsed} | ${((report.summary.multipleVersionsUsed / report.summary.totalUniqueExternalDependencies) * 100).toFixed(1)}% |

### 🎯 Update Priority Summary

- 🔴 **CRITICAL** (${majorCritical.length} deps): Major updates affecting 10+ packages
- 🟠 **HIGH** (${majorHigh.length} deps): Major updates affecting 5-9 packages
- 🟡 **MEDIUM** (${majorMedium.length} deps): Other major updates or version conflicts
- 🟢 **LOW** (${minor.length + patch.length} deps): Minor and patch updates
- ✅ **NONE** (${upToDate.length} deps): Already up to date

---

## Critical Findings

### Top 20 Most Critical Dependencies

`;

// Top 20 by age
const top20 = sortByAge([...olderThan6Months]).slice(0, 20);
md += `| # | Dependency | Current | Latest | Age | Type | Packages | Risk | Effort |\n`;
md += `|---|------------|---------|--------|-----|------|----------|------|--------|\n`;

top20.forEach((dep, idx) => {
  const status = dep.statusEmoji || '';
  const depName = formatDependencyName(dep.name, dep.currentVersion, dep.latestVersion);
  md += `| ${idx + 1} | ${status} ${depName} | ${dep.currentVersion} | ${dep.latestVersion} | ${dep.currentVersionAge.split(' (')[1]?.replace(')', '') || 'unknown'} | ${dep.updateType} | ${dep.usedInPackages.length} | ${calculateRisk(dep)} | ${estimateEffort(dep)} |\n`;
});

md += `\n---

## Update Breakdown by Type

### 🔴 Major Updates (${major.length} dependencies)

Major version updates may include breaking changes. Review changelogs and test thoroughly.

`;

// Critical major updates
if (majorCritical.length > 0) {
  md += `#### CRITICAL Priority (${majorCritical.length} dependencies)\n\n`;
  md += `| Status | Dependency | Current → Latest | Age | Packages Affected | Changelog |\n`;
  md += `|--------|------------|------------------|-----|-------------------|------------|\n`;
  sortByAge(majorCritical).forEach(dep => {
    const changelog = dep.changelogUrl ? `[Link](${dep.changelogUrl})` : 'N/A';
    const status = dep.statusEmoji || '🔴';
    const depName = formatDependencyName(dep.name, dep.currentVersion, dep.latestVersion);
    md += `| ${status} | ${depName} | ${dep.currentVersion} → ${dep.latestVersion} | ${dep.currentVersionAge.split(' (')[1]?.replace(')', '') || 'unknown'} | ${dep.usedInPackages.length} | ${changelog} |\n`;
  });
  md += `\n`;
}

// High priority major updates
if (majorHigh.length > 0) {
  md += `#### HIGH Priority (${majorHigh.length} dependencies)\n\n`;
  md += `| Status | Dependency | Current → Latest | Age | Packages Affected | Changelog |\n`;
  md += `|--------|------------|------------------|-----|-------------------|------------|\n`;
  sortByAge(majorHigh).forEach(dep => {
    const changelog = dep.changelogUrl ? `[Link](${dep.changelogUrl})` : 'N/A';
    const status = dep.statusEmoji || '🔴';
    const depName = formatDependencyName(dep.name, dep.currentVersion, dep.latestVersion);
    md += `| ${status} | ${depName} | ${dep.currentVersion} → ${dep.latestVersion} | ${dep.currentVersionAge.split(' (')[1]?.replace(')', '') || 'unknown'} | ${dep.usedInPackages.length} | ${changelog} |\n`;
  });
  md += `\n`;
}

// Medium priority major updates
if (majorMedium.length > 0) {
  md += `#### MEDIUM Priority (${majorMedium.length} dependencies)\n\n`;
  md += `<details>\n<summary>Click to expand (${majorMedium.length} dependencies)</summary>\n\n`;
  md += `| Status | Dependency | Current → Latest | Age | Packages Affected | Changelog |\n`;
  md += `|--------|------------|------------------|-----|-------------------|------------|\n`;
  sortByAge(majorMedium).forEach(dep => {
    const changelog = dep.changelogUrl ? `[Link](${dep.changelogUrl})` : 'N/A';
    const status = dep.statusEmoji || '🟡';
    const depName = formatDependencyName(dep.name, dep.currentVersion, dep.latestVersion);
    md += `| ${status} | ${depName} | ${dep.currentVersion} → ${dep.latestVersion} | ${dep.currentVersionAge.split(' (')[1]?.replace(')', '') || 'unknown'} | ${dep.usedInPackages.length} | ${changelog} |\n`;
  });
  md += `\n</details>\n\n`;
}

// Minor updates
md += `### 🟡 Minor Updates (${minor.length} dependencies)

Minor version updates include new features but should be backward compatible.

`;

if (minor.length > 0) {
  md += `<details>\n<summary>Click to expand (${minor.length} dependencies)</summary>\n\n`;
  md += `| Status | Dependency | Current → Latest | Age | Packages Affected |\n`;
  md += `|--------|------------|------------------|-----|-------------------|\n`;
  minor.forEach(dep => {
    const status = dep.statusEmoji || '🟡';
    const depName = formatDependencyName(dep.name, dep.currentVersion, dep.latestVersion);
    md += `| ${status} | ${depName} | ${dep.currentVersion} → ${dep.latestVersion} | ${dep.currentVersionAge.split(' (')[1]?.replace(')', '') || 'unknown'} | ${dep.usedInPackages.length} |\n`;
  });
  md += `\n</details>\n\n`;
}

// Patch updates
md += `### 🟢 Patch Updates (${patch.length} dependencies)

Patch updates include bug fixes only. Safe to update with minimal risk.

`;

if (patch.length > 0) {
  md += `<details>\n<summary>Click to expand (${patch.length} dependencies)</summary>\n\n`;
  md += `| Status | Dependency | Current → Latest | Packages Affected |\n`;
  md += `|--------|------------|------------------|-------------------|\n`;
  patch.forEach(dep => {
    const status = dep.statusEmoji || '🟢';
    const depName = formatDependencyName(dep.name, dep.currentVersion, dep.latestVersion);
    md += `| ${status} | ${depName} | ${dep.currentVersion} → ${dep.latestVersion} | ${dep.usedInPackages.length} |\n`;
  });
  md += `\n</details>\n\n`;
}

// Version inconsistencies
md += `---

## Version Inconsistencies

The following ${multipleVersions.length} dependencies have multiple versions in use across the workspace:

| Dependency | Versions in Use | Packages Affected | Recommended Action |
`;
md += `|------------|-----------------|-------------------|--------------------|\n`;

multipleVersions.forEach(dep => {
  const versions = dep.allVersionsUsed.join(', ');
  const depName = formatDependencyName(dep.name, dep.currentVersion, dep.latestVersion);
  md += `| ${depName} | ${versions} | ${dep.usedInPackages.length} | Standardize to ${dep.latestVersion} |\n`;
});

// Unused dependencies section (Knip)
if (knipReport) {
  md += `\n---

## Unused Dependencies (Knip Analysis)

Knip detected the following unused dependencies, exports, and files:

`;

  // Process issues array
  const issues = knipReport.issues || [];
  const filesAnalyzed = (knipReport.files || []).length;

  if (issues.length > 0) {
    md += `**Files analyzed:** ${filesAnalyzed}\n`;
    md += `**Issues found:** ${issues.length}\n\n`;

    // Group by issue type
    const issuesByType = {
      dependencies: [],
      devDependencies: [],
      unlisted: [],
      exports: [],
      types: [],
      enumMembers: [],
      duplicates: []
    };

    issues.forEach(issue => {
      const file = issue.file;

      if (issue.dependencies && issue.dependencies.length > 0) {
        issuesByType.dependencies.push({
          file,
          items: issue.dependencies.map(d => d.name || d)
        });
      }
      if (issue.devDependencies && issue.devDependencies.length > 0) {
        issuesByType.devDependencies.push({
          file,
          items: issue.devDependencies.map(d => d.name || d)
        });
      }
      if (issue.unlisted && issue.unlisted.length > 0) {
        issuesByType.unlisted.push({
          file,
          items: issue.unlisted.map(d => d.name || d)
        });
      }
      if (issue.exports && issue.exports.length > 0) {
        issuesByType.exports.push({
          file,
          items: issue.exports.map(e => e.name || e)
        });
      }
      if (issue.types && issue.types.length > 0) {
        issuesByType.types.push({
          file,
          items: issue.types.map(t => t.name || t)
        });
      }
      if (issue.enumMembers && issue.enumMembers.length > 0) {
        issuesByType.enumMembers.push({
          file,
          items: issue.enumMembers.map(e => e.name || e)
        });
      }
      if (issue.duplicates && issue.duplicates.length > 0) {
        issuesByType.duplicates.push({
          file,
          items: issue.duplicates.map(d => d.name || d)
        });
      }
    });

    // Unused dependencies
    if (issuesByType.dependencies.length > 0) {
      md += `### Unused Dependencies (${issuesByType.dependencies.length} files)\n\n`;
      md += `<details>\n<summary>Click to expand</summary>\n\n`;
      issuesByType.dependencies.slice(0, 20).forEach(({ file, items }) => {
        md += `**${file}**\n`;
        items.forEach(dep => md += `- \`${dep}\`\n`);
        md += `\n`;
      });
      if (issuesByType.dependencies.length > 20) {
        md += `... and ${issuesByType.dependencies.length - 20} more files\n\n`;
      }
      md += `\n</details>\n\n`;
    }

    // Unused devDependencies
    if (issuesByType.devDependencies.length > 0) {
      md += `### Unused Dev Dependencies (${issuesByType.devDependencies.length} files)\n\n`;
      md += `<details>\n<summary>Click to expand</summary>\n\n`;
      issuesByType.devDependencies.slice(0, 20).forEach(({ file, items }) => {
        md += `**${file}**\n`;
        items.forEach(dep => md += `- \`${dep}\`\n`);
        md += `\n`;
      });
      if (issuesByType.devDependencies.length > 20) {
        md += `... and ${issuesByType.devDependencies.length - 20} more files\n\n`;
      }
      md += `\n</details>\n\n`;
    }

    // Unlisted dependencies
    if (issuesByType.unlisted.length > 0) {
      md += `### Unlisted Dependencies (${issuesByType.unlisted.length} files)\n\n`;
      md += `<details>\n<summary>Click to expand</summary>\n\n`;
      issuesByType.unlisted.slice(0, 20).forEach(({ file, items }) => {
        md += `**${file}**\n`;
        items.forEach(dep => md += `- \`${dep}\`\n`);
        md += `\n`;
      });
      if (issuesByType.unlisted.length > 20) {
        md += `... and ${issuesByType.unlisted.length - 20} more files\n\n`;
      }
      md += `\n</details>\n\n`;
    }
  } else {
    md += `✅ No unused dependencies detected!\n\n`;
  }
}

// Implementation plan
md += `\n---

## Phased Implementation Plan

### Phase 1: Foundation & Quick Wins (Weeks 1-3)

**Goal:** Apply low-risk updates and fix version inconsistencies

**Tasks:**
- Apply all ${patch.length} patch updates
- Resolve ${multipleVersions.length} version inconsistencies
- Update development tooling (linters, formatters)

**Estimated Effort:** ${Math.ceil(patch.length * 0.5 + multipleVersions.length * 0.5)}h
**Risk Level:** LOW

### Phase 2: Medium Priority Major Updates (Weeks 4-7)

**Goal:** Update dependencies with <5 package impact

**Tasks:**
- Update ${majorMedium.filter(d => d.usedInPackages.length < 5).length} medium-priority major dependencies
- Apply ${minor.length} minor updates

**Estimated Effort:** ${Math.ceil(majorMedium.filter(d => d.usedInPackages.length < 5).length * 3 + minor.length * 1.5)}h
**Risk Level:** MEDIUM

### Phase 3: High Priority Major Updates (Weeks 8-12)

**Goal:** Update dependencies affecting 5-9 packages

**Tasks:**
- Update ${majorHigh.length} high-priority major dependencies
- Comprehensive testing after each update

**Estimated Effort:** ${majorHigh.length * 6}h
**Risk Level:** HIGH

### Phase 4: Critical Legacy Updates (Weeks 13-18)

**Goal:** Update dependencies affecting 10+ packages

**Tasks:**
- Update ${majorCritical.length} critical major dependencies
- May require incremental migration strategy
- Extensive testing and validation

**Estimated Effort:** ${majorCritical.length * 12}h
**Risk Level:** CRITICAL

### Total Estimated Effort

**${Math.ceil(patch.length * 0.5 + multipleVersions.length * 0.5 + majorMedium.filter(d => d.usedInPackages.length < 5).length * 3 + minor.length * 1.5 + majorHigh.length * 6 + majorCritical.length * 12)} hours** across 12-18 weeks

---

## Detailed Dependency List

### All ${report.dependencies.length} Dependencies

`;

md += `<details>\n<summary>Click to expand complete dependency list</summary>\n\n`;
md += `| Status | Dependency | Current | Latest | Age | Type | Used In | Action |\n`;
md += `|--------|------------|---------|--------|-----|------|---------|--------|\n`;

report.dependencies.forEach(dep => {
  const status = dep.statusEmoji || '⚪';
  const depName = formatDependencyName(dep.name, dep.currentVersion, dep.latestVersion);
  md += `| ${status} | ${depName} | ${dep.currentVersion} | ${dep.latestVersion} | ${dep.currentVersionAge.split(' (')[1]?.replace(')', '') || 'unknown'} | ${dep.updateType} | ${dep.usedInPackages.length} | ${dep.recommendedAction} |\n`;
});

md += `\n</details>\n\n`;

md += `---

## Recommendations

### Immediate Actions (This Sprint)

1. ✅ Apply all ${patch.length} **patch updates** - Low risk, high value
2. 🔍 Audit and resolve **version inconsistencies** for critical dependencies
3. 📝 Review breaking changes for top 5 critical dependencies

### Short Term (1-2 Months)

1. 🛠️ Update development tooling (linters, formatters, build tools)
2. 📦 Apply minor updates systematically
3. 🧪 Establish automated testing coverage before major updates

### Long Term (3-6 Months)

1. ⚛️ Plan migration strategy for critical framework updates
2. 🤖 Implement automated dependency update monitoring
3. 📅 Establish quarterly dependency review process

---

## Appendix

### Status Legend

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 | Up to date or patch update available | Safe to update |
| 🟡 | Minor update or recent major update | Review and update |
| 🔴 | Old major update (>6 months) or unknown | Requires careful review |

### Tools & Resources

- **npm view**: Check package information
- **pnpm outdated**: Check for outdated dependencies in specific package
- **pnpm -r outdated**: Check workspace-wide outdated dependencies
- **npm-check-updates**: Interactive update tool

### Regenerating This Report

\`\`\`bash
# From repository root
node ./docs/dependencyManagement/generate-dependency-update-plan.js
\`\`\`

### Success Metrics

- [ ] Zero dependencies >1 year old
- [ ] Zero version inconsistencies
- [ ] All security vulnerabilities resolved
- [ ] Automated dependency update process in place
- [ ] Quarterly dependency review cadence established

---

**Last Updated:** ${report.generatedDate}
**Generated by:** dependency update automation script
`;

// Write to file
fs.writeFileSync(outputFile, md);
console.log(`✅ Markdown plan written to: ${outputFile}`);
console.log(`   ${md.split('\n').length} lines, ${(md.length / 1024).toFixed(1)} KB`);
