#!/usr/bin/env node

/**
 * Adds the current date and time as a metadata line below changelog version headings
 * that don't already have a release date.
 *
 * Changesets generates headings like `## 1.2.3` — this script adds a
 * `*Released: 2026-03-20T14:30:00Z*` line below so every release is timestamped,
 * without modifying the heading itself (which would break Renovate anchor links).
 *
 * Usage:
 *   node scripts/changelog-add-dates.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PACKAGES_DIR = path.join(__dirname, '..', 'packages');

// Match a version heading NOT already followed by a *Released:* line
// Captures: heading line + the next blank line (if any)
const VERSION_HEADING_RE = /^(## \d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\n(?!\n\*Released:)/gm;

function getChangedChangelogs() {
    try {
        const output = execSync('git diff --name-only HEAD', { encoding: 'utf8', cwd: path.join(__dirname, '..') });
        return output
            .split('\n')
            .filter((f) => f.endsWith('CHANGELOG.md') && f.startsWith('packages/'))
            .map((f) => path.join(__dirname, '..', f));
    } catch {
        // If git diff fails (e.g. no commits yet), fall back to processing all changelogs
        return null;
    }
}

function addDatesToChangelog(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    let changed = false;

    const updated = content.replace(VERSION_HEADING_RE, (match, heading) => {
        changed = true;
        return `${heading}\n\n*Released: ${now}*\n`;
    });

    if (changed) {
        fs.writeFileSync(filePath, updated, 'utf8');
        console.log(`  Updated: ${path.relative(path.join(__dirname, '..'), filePath)}`);
    }

    return changed;
}

function run() {
    // Try to only process changelogs that changed in this version bump
    let files = getChangedChangelogs();

    if (files === null || files.length === 0) {
        // Fall back: scan all changelogs for headings missing dates
        const packages = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true });
        files = packages
            .filter((d) => d.isDirectory())
            .map((d) => path.join(PACKAGES_DIR, d.name, 'CHANGELOG.md'))
            .filter((f) => fs.existsSync(f));
    }

    let count = 0;
    for (const file of files) {
        if (addDatesToChangelog(file)) {
            count++;
        }
    }

    if (count > 0) {
        console.log(`\n✅ Added dates to ${count} changelog(s)`);
    } else {
        console.log('ℹ️  No changelog headings needed date updates');
    }
}

run();
