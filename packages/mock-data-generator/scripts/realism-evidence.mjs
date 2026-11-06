// Realism evidence: ties a realism sweep report to the exact build it assessed, and checks at release time that
// the package being released has passing reports. The corpus the sweep runs on lists private services and stays
// outside the repository, so the release gate verifies the sweep's reports instead of running it.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** The sweep profiles a release needs a passing report for: the data editor's, without and with model answers. */
export const RELEASE_PROFILES = Object.freeze(['editor/sft-off', 'editor/sft-on']);

/**
 * Every file under a directory, by path relative to the root, in code point order.
 *
 * @param {string} root the root
 * @param {string} directory directory to walk
 * @returns {string[]} the relative paths, with forward slashes
 */
function filesUnder(root, directory) {
    return readdirSync(directory, { withFileTypes: true })
        .flatMap((entry) => {
            const path = join(directory, entry.name);
            return entry.isDirectory() ? filesUnder(root, path) : [relative(root, path).split(sep).join('/')];
        })
        .sort((left, right) => (left < right ? -1 : Number(left > right)));
}

/**
 * The fingerprint of what decides generated values: the compiled code and the model manifest, which in turn
 * fingerprints every model, bank and rule resource. Equal fingerprints generate equal rows.
 *
 * @param {string} packageRoot package root holding dist/ and resources/models/manifest.json
 * @returns {string} SHA-256 hex digest
 * @example
 * const build = buildFingerprint(process.cwd());
 */
export function buildFingerprint(packageRoot) {
    const hash = createHash('sha256');
    const files = [
        ...filesUnder(packageRoot, join(packageRoot, 'dist')).filter((path) => path.endsWith('.js')),
        'resources/models/manifest.json'
    ];
    for (const path of files) {
        hash.update(`${path}\0`)
            .update(readFileSync(join(packageRoot, path)))
            .update('\0');
    }
    return hash.digest('hex');
}

/**
 * The reasons a set of realism reports does not qualify a build for release: one passing report per release
 * profile, made on this build with this version of the checks against a baseline, with no service failing, no
 * hard-check finding and no check worse than its baseline.
 *
 * @param {ReadonlyArray<object>} reports parsed realism-report.json files
 * @param {{ build: string, checksVersion: number }} expected the released build and checks version
 * @returns {string[]} the reasons, empty when the reports qualify the build
 * @example
 * const problems = realismEvidenceProblems(reports, { build: buildFingerprint(root), checksVersion: 4 });
 */
export function realismEvidenceProblems(reports, expected) {
    const problems = [];
    for (const profile of RELEASE_PROFILES) {
        const report = reports.find((candidate) => candidate?.profile === profile);
        if (!report) {
            problems.push(`${profile}: no realism report`);
            continue;
        }
        if (report.build !== expected.build) {
            problems.push(`${profile}: report was made on another build`);
        }
        if (report.checksVersion !== expected.checksVersion) {
            problems.push(
                `${profile}: report used checks version ${report.checksVersion}, not ${expected.checksVersion}`
            );
        }
        if (!report.baseline) {
            problems.push(`${profile}: report has no baseline`);
        }
        if (report.errors !== 0) {
            problems.push(`${profile}: ${report.errors} services failed to generate`);
        }
        if (!Array.isArray(report.hardFailures) || report.hardFailures.length > 0) {
            problems.push(`${profile}: hard checks failed: ${JSON.stringify(report.hardFailures)}`);
        }
        if (!Array.isArray(report.regressions) || report.regressions.length > 0) {
            problems.push(`${profile}: worse than its baseline: ${JSON.stringify(report.regressions)}`);
        }
    }
    return problems;
}
