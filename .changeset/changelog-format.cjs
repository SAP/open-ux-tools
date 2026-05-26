// @ts-check
'use strict';

/**
 * @typedef {{ regex: RegExp; label: string }} PrefixEntry
 * @typedef {{ label: string; text: string }} ParsedSummary
 * @typedef {{ name: string; newVersion: string; oldVersion?: string }} DependencyRelease
 */

/** @type {PrefixEntry[]} */
const PREFIX_MAP = [
    { regex: /^FEAT:/i, label: 'Features' },
    { regex: /^FIX:/i, label: 'Bug Fixes' },
    { regex: /^BUMP:/i, label: 'Dependency Upgrades' }
];

/**
 * Extracts the category label and message text from a changeset summary.
 * Falls back to no label for summaries without a recognised prefix so that
 * old-style entries do not break the formatter.
 * @param {string} summary - Raw summary text from the changeset file body.
 * @returns {ParsedSummary}
 */
function parseSummary(summary) {
    const trimmed = summary.trim();
    for (const { regex, label } of PREFIX_MAP) {
        if (regex.test(trimmed)) {
            return { label, text: trimmed.replace(regex, '').trim() };
        }
    }
    return { label: '', text: trimmed };
}

/**
 * Formats a single changeset entry into a changelog bullet.
 * The category prefix (FEAT/FIX/BUMP) is rendered as a bold label on the bullet
 * because `@changesets/cli` always wraps all entries in its own `### Patch/Minor/Major Changes`
 * heading and that wrapper cannot be suppressed from the formatter.
 * Called once per changeset file by the `@changesets/cli` during `changeset version`.
 * @param {{ summary: string }} changeset - The changeset object provided by the `@changesets/cli`.
 * @param {string} _type - Release type ('major' | 'minor' | 'patch') — unused; label comes from prefix.
 * @returns {Promise<string>} Markdown bullet string for this changelog entry.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getReleaseLine(changeset, _type) {
    const { label, text } = parseSummary(changeset.summary);
    return label ? `#### ${label}\n\n- ${text}` : `- ${text}`;
}

/**
 * Formats dependency-only version bumps into a single collapsed bullet.
 * Called by the `@changesets/cli` when a package version is bumped solely because
 * one of its workspace dependencies released a new version.
 * @param {unknown[]} _changesets - Changesets that triggered the dependency bump — unused.
 * @param {DependencyRelease[]} dependenciesUpdated - Workspace packages that were updated.
 * @returns {Promise<string>} Collapsed markdown bullet, or empty string if nothing to report.
 */
async function getDependencyReleaseLine(_changesets, dependenciesUpdated) {
    if (!dependenciesUpdated || dependenciesUpdated.length === 0) {
        return '';
    }
    const entries = dependenciesUpdated.map((d) => `- ${d.name} ${d.oldVersion} → ${d.newVersion}`).join('\n');
    return `#### Workspace Updates\n\n${entries}`;
}

module.exports = { getReleaseLine, getDependencyReleaseLine };
