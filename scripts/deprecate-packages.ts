#!/usr/bin/env node
/**
 * npm deprecation automation for open-ux-tools monorepo.
 *
 * Rules applied in order:
 *   1. Age filter       — drop versions older than `ageMonths`
 *   2. Node filter      — drop versions requiring only unsupported Node majors
 *   3. Per-minor/day    — keep only the latest patch per (minor, calendar-day)
 *   4. Count cap        — keep at most `maxSupportedVersions` newest survivors
 *   5. Cross-dep guard  — rescue any candidate that a non-deprecated version depends on (fixpoint)
 *
 * Legacy anchors are always kept regardless of all other rules.
 *
 * Usage:
 *   node_modules/.bin/ts-node scripts/deprecate-packages.ts                         # dry run, all packages
 *   node_modules/.bin/ts-node scripts/deprecate-packages.ts --packages @sap-ux/foo  # dry run, one package
 *   node_modules/.bin/ts-node scripts/deprecate-packages.ts --execute               # apply deprecations
 *   node_modules/.bin/ts-node scripts/deprecate-packages.ts --config path/to/config.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { execSync } from 'child_process';

const scriptDir: string = __dirname;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LegacyAnchor = string | { version: string; reason: string };

interface DeprecationConfig {
    packages: '*' | string[];
    ageMonths: number;
    maxSupportedVersions: number;
    supportedNodeMajors: number[];
    legacyAnchors: Record<string, LegacyAnchor[]>;
    excludePackages: string[];
}

interface NpmVersionMeta {
    engines?: { node?: string };
    dependencies?: Record<string, string>;
}

interface NpmRegistryDoc {
    name: string;
    'dist-tags': Record<string, string>;
    time: Record<string, string>;
    versions: Record<string, NpmVersionMeta>;
}

type DeprecationReason =
    | { kind: 'age'; publishedAt: string; cutoff: string }
    | { kind: 'node-unsupported'; engines: string }
    | { kind: 'same-day-duplicate'; minor: number; day: string; supersededBy: string }
    | { kind: 'count-cap'; rank: number; max: number };

interface VersionDecision {
    version: string;
    status: 'active' | 'anchor' | 'deprecate' | 'rescued';
    anchorReason?: string;
    deprecateReason?: DeprecationReason;
    rescuedBy?: string; // "Q@w" that references this version
}

interface PackageReport {
    name: string;
    totalVersions: number;
    decisions: VersionDecision[];
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const execute = args.includes('--execute');
const dryRun = !execute;

const packagesArgIdx = args.indexOf('--packages');
const packagesArgValue = packagesArgIdx !== -1 ? args[packagesArgIdx + 1] : undefined;
const packagesFilter = packagesArgValue ? packagesArgValue.split(',').map((s) => s.trim()) : undefined;

const configArgIdx = args.indexOf('--config');
const configPath =
    configArgIdx !== -1
        ? path.resolve(args[configArgIdx + 1])
        : path.resolve(scriptDir, 'deprecation-config.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fetchJson(url: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
        https
            .get(url, { headers: { Accept: 'application/json' } }, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Failed to parse JSON from ${url}: ${(e as Error).message}`));
                    }
                });
            })
            .on('error', reject);
    });
}

function nodeRangeSupportsOnlyUnsupportedMajors(range: string | undefined, supportedMajors: number[]): boolean {
    if (!range) {
        return false; // no constraint = assume compatible
    }
    const minSupported = Math.min(...supportedMajors);

    // Check for an explicit upper bound that excludes all supported majors.
    // Patterns: "<20", "<=19", "< 20", "<= 19"
    const upperBoundMatch = range.match(/<[=]?\s*(\d+)/);
    if (upperBoundMatch) {
        const upperBound = Number(upperBoundMatch[1]);
        // e.g. "<20" with supportedMajors [22,24]: upperBound=20 <= minSupported=22 → all supported majors excluded
        // e.g. "<22" with supportedMajors [22,24]: upperBound=22 <= minSupported=22 → 22 excluded
        // e.g. "<23" with supportedMajors [22,24]: upperBound=23 > minSupported=22 → 22 is included
        if (upperBound <= minSupported) {
            return true;
        }
    }

    // Open-ended ranges like ">=16", ">=20", "^18" are NOT unsupported-only —
    // they allow any version at or above the lower bound, which includes supported majors.
    return false;
}

function semverCompare(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

function parseSemver(v: string): { major: number; minor: number; patch: number } | null {
    const m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!m) return null;
    return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function loadConfig(): DeprecationConfig {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw) as DeprecationConfig;
}

function discoverPublicPackages(repoRoot: string, config: DeprecationConfig): string[] {
    const packagesDir = path.join(repoRoot, 'packages');
    const folders = fs.readdirSync(packagesDir);
    const names: string[] = [];
    for (const folder of folders) {
        const pkgJsonPath = path.join(packagesDir, folder, 'package.json');
        if (!fs.existsSync(pkgJsonPath)) continue;
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')) as {
            name: string;
            private?: boolean;
        };
        if (pkg.private) continue;
        if (config.excludePackages.includes(pkg.name)) continue;
        names.push(pkg.name);
    }
    return names;
}

function resolveAnchorVersion(anchor: LegacyAnchor): string {
    return typeof anchor === 'string' ? anchor : anchor.version;
}

function resolveAnchorReason(anchor: LegacyAnchor): string | undefined {
    return typeof anchor === 'string' ? undefined : anchor.reason;
}

// ---------------------------------------------------------------------------
// Core deprecation logic
// ---------------------------------------------------------------------------

function computeDecisions(
    doc: NpmRegistryDoc,
    config: DeprecationConfig,
    anchorDefs: LegacyAnchor[]
): VersionDecision[] {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - config.ageMonths);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const anchorVersionSet = new Map<string, string | undefined>(
        anchorDefs.map((a) => [resolveAnchorVersion(a), resolveAnchorReason(a)])
    );

    const timeMap = doc.time;
    const allVersions = Object.keys(timeMap).filter((v) => v !== 'created' && v !== 'modified');

    // Sort newest first
    allVersions.sort((a, b) => new Date(timeMap[b]).getTime() - new Date(timeMap[a]).getTime());

    const decisions = new Map<string, VersionDecision>();

    // Mark anchors first — they survive all rules
    for (const v of allVersions) {
        if (anchorVersionSet.has(v)) {
            decisions.set(v, {
                version: v,
                status: 'anchor',
                anchorReason: anchorVersionSet.get(v)
            });
        }
    }

    // Step 1: Age filter
    const afterAge: string[] = [];
    for (const v of allVersions) {
        if (decisions.has(v)) {
            afterAge.push(v);
            continue;
        }
        const publishedAt = timeMap[v].slice(0, 10);
        if (publishedAt < cutoffStr) {
            decisions.set(v, {
                version: v,
                status: 'deprecate',
                deprecateReason: { kind: 'age', publishedAt, cutoff: cutoffStr }
            });
        } else {
            afterAge.push(v);
        }
    }

    // Step 2: Node support filter
    const afterNode: string[] = [];
    for (const v of afterAge) {
        if (decisions.has(v)) {
            afterNode.push(v);
            continue;
        }
        const nodeRange = doc.versions[v]?.engines?.node;
        if (nodeRangeSupportsOnlyUnsupportedMajors(nodeRange, config.supportedNodeMajors)) {
            decisions.set(v, {
                version: v,
                status: 'deprecate',
                deprecateReason: { kind: 'node-unsupported', engines: nodeRange ?? '' }
            });
        } else {
            afterNode.push(v);
        }
    }

    // Step 3: Per-minor/per-day collapse
    // Group by (minor, day) — keep newest patch per group
    const minorDayMap = new Map<string, string[]>();
    for (const v of afterNode) {
        if (decisions.has(v)) continue;
        const parsed = parseSemver(v);
        if (!parsed) continue;
        const day = timeMap[v].slice(0, 10);
        const key = `${parsed.minor}|${day}`;
        if (!minorDayMap.has(key)) minorDayMap.set(key, []);
        minorDayMap.get(key)!.push(v);
    }

    const afterCollapse: string[] = [];
    for (const [key, versions] of minorDayMap) {
        // Sort by semver descending — keep first
        versions.sort((a, b) => semverCompare(b, a));
        afterCollapse.push(versions[0]);
        const [minorStr, day] = key.split('|');
        for (const dup of versions.slice(1)) {
            decisions.set(dup, {
                version: dup,
                status: 'deprecate',
                deprecateReason: {
                    kind: 'same-day-duplicate',
                    minor: Number(minorStr),
                    day,
                    supersededBy: versions[0]
                }
            });
        }
    }

    // Re-sort after collapse (still newest first)
    afterCollapse.sort((a, b) => new Date(timeMap[b]).getTime() - new Date(timeMap[a]).getTime());

    // Step 4: Count cap — keep max N newest, deprecate the rest
    // Anchors don't count toward the cap
    const nonAnchorSurvivors = afterCollapse.filter((v) => !anchorVersionSet.has(v));
    const kept = nonAnchorSurvivors.slice(0, config.maxSupportedVersions);
    const capped = nonAnchorSurvivors.slice(config.maxSupportedVersions);

    for (const v of kept) {
        if (!decisions.has(v)) {
            decisions.set(v, { version: v, status: 'active' });
        }
    }
    capped.forEach((v, i) => {
        decisions.set(v, {
            version: v,
            status: 'deprecate',
            deprecateReason: {
                kind: 'count-cap',
                rank: config.maxSupportedVersions + i + 1,
                max: config.maxSupportedVersions
            }
        });
    });

    // Any remaining undecided versions (e.g. versions with non-semver tags) → active
    for (const v of allVersions) {
        if (!decisions.has(v)) {
            decisions.set(v, { version: v, status: 'active' });
        }
    }

    // Return sorted newest-first
    return allVersions.map((v) => decisions.get(v)!);
}

// ---------------------------------------------------------------------------
// Cross-dependency fixpoint (Step 5)
// ---------------------------------------------------------------------------

function buildCrossRefMap(
    allDocs: Map<string, NpmRegistryDoc>
): Map<string, Map<string, Set<string>>> {
    // crossRefMap[depPkg][depVer] = Set of "pkg@ver" that depend on it
    const crossRefMap = new Map<string, Map<string, Set<string>>>();

    for (const [pkg, doc] of allDocs) {
        for (const [ver, meta] of Object.entries(doc.versions)) {
            for (const [depPkg, depVer] of Object.entries(meta.dependencies ?? {})) {
                if (!allDocs.has(depPkg)) continue; // only care about intra-monorepo deps
                // Handle npm: aliases like "@sap-ux/control-property-editor-sources": "npm:@sap-ux/control-property-editor@0.8.1"
                const resolvedDepVer = depVer.startsWith('npm:')
                    ? depVer.replace(/^npm:[^@]+@/, '')
                    : depVer;
                if (!crossRefMap.has(depPkg)) crossRefMap.set(depPkg, new Map());
                const pkgMap = crossRefMap.get(depPkg)!;
                if (!pkgMap.has(resolvedDepVer)) pkgMap.set(resolvedDepVer, new Set());
                pkgMap.get(resolvedDepVer)!.add(`${pkg}@${ver}`);
            }
        }
    }

    return crossRefMap;
}

function applyFixpoint(
    allDecisions: Map<string, VersionDecision[]>,
    crossRefMap: Map<string, Map<string, Set<string>>>
): void {
    // Worklist: start with all versions currently marked for deprecation
    const worklist: Array<{ pkg: string; ver: string }> = [];

    for (const [pkg, decisions] of allDecisions) {
        for (const d of decisions) {
            if (d.status === 'deprecate') {
                worklist.push({ pkg, ver: d.version });
            }
        }
    }

    // Build a fast lookup: pkg+ver → decision object
    const decisionIndex = new Map<string, VersionDecision>();
    for (const [pkg, decisions] of allDecisions) {
        for (const d of decisions) {
            decisionIndex.set(`${pkg}@${d.version}`, d);
        }
    }

    // Worklist: process until empty
    // When we rescue a version, we add it to the worklist so its own dependents get re-checked
    const processed = new Set<string>();

    while (worklist.length > 0) {
        const { pkg, ver } = worklist.pop()!;
        const key = `${pkg}@${ver}`;
        if (processed.has(key)) continue;
        processed.add(key);

        const decision = decisionIndex.get(key);
        if (!decision || decision.status !== 'deprecate') continue;

        // Check if any non-deprecated version of any package depends on this version
        const dependents = crossRefMap.get(pkg)?.get(ver);
        if (!dependents) continue;

        for (const dependent of dependents) {
            const depDecision = decisionIndex.get(dependent);
            if (!depDecision) continue;
            if (depDecision.status === 'active' || depDecision.status === 'anchor' || depDecision.status === 'rescued') {
                // This version is referenced by a non-deprecated version — rescue it
                decision.status = 'rescued';
                decision.rescuedBy = dependent;
                // Add this rescued version to the worklist so its own dependencies get checked too
                worklist.push({ pkg, ver });
                break;
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function formatReport(reports: PackageReport[]): string {
    const lines: string[] = [];
    let totalDeprecate = 0;
    let totalRescued = 0;
    let totalActive = 0;
    let totalAnchor = 0;

    for (const report of reports) {
        const active = report.decisions.filter((d) => d.status === 'active');
        const anchors = report.decisions.filter((d) => d.status === 'anchor');
        const toDeprecate = report.decisions.filter((d) => d.status === 'deprecate');
        const rescued = report.decisions.filter((d) => d.status === 'rescued');

        totalActive += active.length;
        totalAnchor += anchors.length;
        totalDeprecate += toDeprecate.length;
        totalRescued += rescued.length;

        lines.push(`\n${'─'.repeat(70)}`);
        lines.push(`${report.name}  (${report.totalVersions} versions total)`);
        lines.push(`${'─'.repeat(70)}`);
        lines.push(`  active      : ${active.length}`);
        lines.push(`  anchored    : ${anchors.length}`);
        lines.push(`  to deprecate: ${toDeprecate.length}`);
        lines.push(`  rescued     : ${rescued.length}`);

        if (anchors.length > 0) {
            lines.push(`\n  Anchors:`);
            for (const d of anchors) {
                const reason = d.anchorReason ? `  [${d.anchorReason}]` : '';
                lines.push(`    ${d.version}${reason}`);
            }
        }

        if (rescued.length > 0) {
            lines.push(`\n  Rescued (cross-dep):`);
            for (const d of rescued) {
                lines.push(`    ${d.version}  ← referenced by ${d.rescuedBy}`);
            }
        }

        if (toDeprecate.length > 0) {
            lines.push(`\n  To deprecate (${toDeprecate.length}):`);
            // Group by reason kind for readability
            const byKind = new Map<string, VersionDecision[]>();
            for (const d of toDeprecate) {
                const k = d.deprecateReason?.kind ?? 'unknown';
                if (!byKind.has(k)) byKind.set(k, []);
                byKind.get(k)!.push(d);
            }
            for (const [kind, items] of byKind) {
                lines.push(`    [${kind}] (${items.length} versions)`);
                // Show first 5 examples
                for (const d of items.slice(0, 5)) {
                    let detail = '';
                    const r = d.deprecateReason;
                    if (r?.kind === 'age') detail = `published ${r.publishedAt}`;
                    else if (r?.kind === 'node-unsupported') detail = `engines.node: "${r.engines}"`;
                    else if (r?.kind === 'same-day-duplicate') detail = `superseded by ${r.supersededBy} on ${r.day}`;
                    else if (r?.kind === 'count-cap') detail = `rank ${r.rank} > max ${r.max}`;
                    lines.push(`      ${d.version}  (${detail})`);
                }
                if (items.length > 5) lines.push(`      ... and ${items.length - 5} more`);
            }
        }
    }

    lines.push(`\n${'═'.repeat(70)}`);
    lines.push(`SUMMARY`);
    lines.push(`${'═'.repeat(70)}`);
    lines.push(`  Packages processed : ${reports.length}`);
    lines.push(`  Active             : ${totalActive}`);
    lines.push(`  Anchored           : ${totalAnchor}`);
    lines.push(`  Rescued (cross-dep): ${totalRescued}`);
    lines.push(`  To deprecate       : ${totalDeprecate}`);
    lines.push('');

    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Execute deprecations
// ---------------------------------------------------------------------------

const DEPRECATION_MESSAGE =
    'Deprecated: superseded by newer releases. See https://github.com/SAP/open-ux-tools for the latest.';

function executeDeprecations(reports: PackageReport[]): void {
    let count = 0;
    let errors = 0;
    for (const report of reports) {
        for (const d of report.decisions) {
            if (d.status !== 'deprecate') continue;
            const spec = `${report.name}@${d.version}`;
            try {
                execSync(`npm deprecate "${spec}" "${DEPRECATION_MESSAGE}"`, { stdio: 'inherit' });
                count++;
            } catch (e) {
                console.error(`  ERROR deprecating ${spec}: ${(e as Error).message}`);
                errors++;
            }
        }
    }
    console.log(`\nDone. Deprecated: ${count}. Errors: ${errors}.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const config = loadConfig();
    const repoRoot = path.resolve(scriptDir, '..');

    // Resolve package list
    let packages: string[];
    if (packagesFilter) {
        packages = packagesFilter;
    } else if (config.packages === '*') {
        packages = discoverPublicPackages(repoRoot, config);
    } else {
        packages = config.packages.filter((p) => !config.excludePackages.includes(p));
    }

    console.log(`\nFetching npm metadata for ${packages.length} packages...`);

    // Fetch all package metadata in parallel (concurrency-capped at 10)
    const allDocs = new Map<string, NpmRegistryDoc>();
    const CONCURRENCY = 10;
    for (let i = 0; i < packages.length; i += CONCURRENCY) {
        const batch = packages.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
            batch.map(async (pkg) => {
                const doc = (await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`)) as NpmRegistryDoc;
                return { pkg, doc };
            })
        );
        for (const result of results) {
            if (result.status === 'fulfilled') {
                allDocs.set(result.value.pkg, result.value.doc);
            } else {
                console.warn(`  WARN: Could not fetch metadata for a package: ${result.reason}`);
            }
        }
        process.stdout.write(`  ${Math.min(i + CONCURRENCY, packages.length)}/${packages.length} fetched\r`);
    }
    console.log(`  ${allDocs.size}/${packages.length} packages fetched successfully.`);

    // Compute per-package decisions (steps 1–4)
    const allDecisions = new Map<string, VersionDecision[]>();
    for (const [pkg, doc] of allDocs) {
        const anchors = config.legacyAnchors[pkg] ?? [];
        const decisions = computeDecisions(doc, config, anchors);
        allDecisions.set(pkg, decisions);
    }

    // Step 5: Cross-dependency fixpoint
    console.log('Building cross-dependency map...');
    const crossRefMap = buildCrossRefMap(allDocs);
    console.log('Running cross-dependency fixpoint...');
    applyFixpoint(allDecisions, crossRefMap);

    // Build reports
    const reports: PackageReport[] = [];
    for (const [pkg, doc] of allDocs) {
        reports.push({
            name: pkg,
            totalVersions: Object.keys(doc.time).filter((v) => v !== 'created' && v !== 'modified').length,
            decisions: allDecisions.get(pkg)!
        });
    }
    reports.sort((a, b) => a.name.localeCompare(b.name));

    const report = formatReport(reports);
    console.log(report);

    if (dryRun) {
        console.log('DRY RUN — no changes made. Re-run with --execute to apply deprecations.');
    } else {
        console.log('Applying deprecations...');
        executeDeprecations(reports);
    }
}

main().catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
});
