#!/usr/bin/env node

/**
 * Backfills missing release dates on existing changelog entries using git commit history.
 *
 * For each `## X.Y.Z` heading without a `*Released:*` metadata line, this script finds
 * the commit that introduced that heading and adds a `*Released: <ISO date>*` line below it.
 *
 * Usage:
 *   node scripts/changelog-backfill-dates.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PACKAGES_DIR = path.join(__dirname, '..', 'packages');
const ROOT = path.join(__dirname, '..');

// Match a version heading NOT already followed by a *Released:* line
const VERSION_HEADING_RE = /^(## (\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?))\n(?!\n\*Released:)/gm;

const dryRun = process.argv.includes('--dry-run');

/**
 * Find the commit date when a specific version heading was added to a changelog file.
 */
function getCommitDateForVersion(relativeFilePath, version) {
    try {
        // Use git log -S to find the commit that added this version string
        const output = execSync(
            `git log --diff-filter=M --format="%aI" -S "## ${version}" --reverse -- "${relativeFilePath}"`,
            { encoding: 'utf8', cwd: ROOT }
        ).trim();

        if (output) {
            // Take the first (earliest) commit that introduced this heading
            const firstDate = output.split('\n')[0].trim();
            return firstDate;
        }

        // Fallback: try with git log searching for the version bump commit
        const tagOutput = execSync(
            `git log --format="%aI" --all --grep="## ${version}" --reverse -- "${relativeFilePath}"`,
            {
                encoding: 'utf8',
                cwd: ROOT
            }
        ).trim();

        if (tagOutput) {
            return tagOutput.split('\n')[0].trim();
        }
    } catch {
        // Ignore git errors
    }
    return null;
}

function backfillChangelog(filePath) {
    const relPath = path.relative(ROOT, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    const updates = [];

    const updated = content.replace(VERSION_HEADING_RE, (match, heading, version) => {
        const commitDate = getCommitDateForVersion(relPath, version);
        if (commitDate) {
            changed = true;
            updates.push({ version, date: commitDate });
            return `${heading}\n\n*Released: ${commitDate}*\n`;
        }
        // No commit date found — leave unchanged
        updates.push({ version, date: null });
        return match;
    });

    if (changed && !dryRun) {
        fs.writeFileSync(filePath, updated, 'utf8');
    }

    return { relPath, updates, changed };
}

function run() {
    if (dryRun) {
        console.log('🔍 DRY RUN — no files will be modified\n');
    }

    const packages = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true });
    const files = packages
        .filter((d) => d.isDirectory())
        .map((d) => path.join(PACKAGES_DIR, d.name, 'CHANGELOG.md'))
        .filter((f) => fs.existsSync(f));

    let totalUpdated = 0;
    let totalMissing = 0;

    for (const file of files) {
        const { relPath, updates, changed } = backfillChangelog(file);

        if (updates.length === 0) {
            continue;
        }

        const dated = updates.filter((u) => u.date);
        const missing = updates.filter((u) => !u.date);

        if (dated.length > 0 || missing.length > 0) {
            console.log(`\n📦 ${relPath}`);
        }

        for (const u of dated) {
            console.log(`  ✅ ${u.version} → ${u.date}`);
        }
        for (const u of missing) {
            console.log(`  ⚠️  ${u.version} — no commit date found`);
        }

        if (changed) {
            totalUpdated++;
        }
        totalMissing += missing.length;
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Updated: ${totalUpdated} changelog(s)`);
    if (totalMissing > 0) {
        console.log(`Missing: ${totalMissing} version(s) could not be dated`);
    }
    if (dryRun) {
        console.log('\nRe-run without --dry-run to apply changes.');
    }
}

run();
