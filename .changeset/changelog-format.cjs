// @ts-check
'use strict';

/**
 * @typedef {{ regex: RegExp; label: string }} PrefixEntry
 * @typedef {{ label: string; text: string }} ParsedSummary
 * @typedef {{ name: string; newVersion: string; oldVersion?: string }} DependencyRelease
 * @typedef {{ name: string; type: string }} ChangesetRelease
 * @typedef {{ summary: string; commit?: string; releases?: ChangesetRelease[] }} Changeset
 */

const REPO_URL = 'https://github.com/SAP/open-ux-tools';

/** @type {PrefixEntry[]} */
const PREFIX_MAP = [
    { regex: /^FEAT:/i, label: 'Features' },
    { regex: /^FIX:/i, label: 'Bug Fixes' },
    { regex: /^BUMP:/i, label: 'Dependency Updates' }
];

/**
 * Tracks packages that have already received a release date header in this run,
 * preventing duplicate date entries when multiple changesets touch the same package.
 * @type {Set<string>}
 */
const releaseDateAdded = new Set();

/**
 * Returns the release date section markdown if this is the first entry for the given package,
 * or an empty string if the date has already been emitted for this package in this run.
 * Also records the package name in the set to prevent duplicate date sections.
 * @param {string} packageName - Name of the package being released
 * @returns {string} Markdown string for the release date section
 */
function getReleaseDateSection(packageName) {
    if (releaseDateAdded.has(packageName)) {
        return '';
    }
    releaseDateAdded.add(packageName);
    const date = new Date().toISOString().slice(0, 10);
    return `#### Release Date\n\n${date}\n\n`;
}

/**
 * Extracts the category label and message text from a changeset summary.
 * Bot-generated changesets (e.g. Renovate `fix(deps): ...`) use scoped conventional commit style
 * and bypass prefix validation — they are normalized to `BUMP:` so they render under
 * `#### Dependency Updates` rather than the `#### Changes` fallback.
 * @param {string} summary - Raw summary text from the changeset file body.
 * @returns {ParsedSummary} Object containing the category label and the message text with the prefix removed.
 */
function parseSummary(summary) {
    const trimmed = summary.trim();
    // Normalize scoped conventional commit style (e.g. `fix(deps): ...`, `chore(dev-deps): ...`)
    // to BUMP: - only bot-generated changesets use this format and bypass prefix validation.
    const normalized = trimmed.replace(/^[a-z]+\([a-z-]+\): /i, 'BUMP: ');
    for (const { regex, label } of PREFIX_MAP) {
        if (regex.test(normalized)) {
            return { label, text: normalized.replace(regex, '').trim() };
        }
    }
    return { label: 'Changes', text: normalized };
}

/**
 * Formats a single changeset entry into a changelog bullet.
 * Always called before getDependencyReleaseLine, so the release date header is
 * emitted here on the first call per package and skipped on subsequent calls.
 * @param {Changeset} changeset - The changeset object provided by the `@changesets/cli`.
 * @param {string} _type - Release type ('major' | 'minor' | 'patch') — unused; label comes from prefix.
 * @returns {Promise<string>} Markdown string for this changelog entry.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getReleaseLine(changeset, _type) {
    const packageName = changeset.releases?.find((r) => r.type !== 'none')?.name ?? '';
    const dateHeader = getReleaseDateSection(packageName);
    const { label, text } = parseSummary(changeset.summary);
    const [firstLine, ...remainingLines] = text.split('\n').map((l) => l.trimEnd());
    const continuationLines = remainingLines.filter((l) => l.trim() !== '');
    const commitLink = changeset.commit
        ? ` [[${changeset.commit.slice(0, 7)}](${REPO_URL}/commit/${changeset.commit})]`
        : '';
    const bullet =
        continuationLines.length > 0
            ? `- ${firstLine}\n\n  ${continuationLines.join('\n  ')}${commitLink}`
            : `- ${firstLine}${commitLink}`;
    return `${dateHeader}${label ? `#### ${label}\n\n${bullet}` : bullet}`;
}

/**
 * Formats dependency-only version bumps into a collapsed bullet list.
 * Always called after getReleaseLine, so the release date header is only emitted
 * here when no explicit changesets exist for this package (dep-bump-only releases).
 * @param {Changeset[]} changesets - Changesets that triggered the dependency bump.
 * @param {DependencyRelease[]} dependenciesUpdated - Workspace packages that were updated.
 * @returns {Promise<string>} Collapsed markdown section, or empty string if nothing to report.
 */
async function getDependencyReleaseLine(changesets, dependenciesUpdated) {
    if (!dependenciesUpdated || dependenciesUpdated.length === 0) {
        return '';
    }
    const packageName = changesets[0]?.releases?.[0]?.name ?? '';
    const dateHeader = getReleaseDateSection(packageName);
    const entries = dependenciesUpdated.map((d) => `- ${d.name} ${d.oldVersion} → ${d.newVersion}`).join('\n');
    return `${dateHeader}#### Workspace Updates\n\n${entries}`;
}

module.exports = { getReleaseLine, getDependencyReleaseLine };
