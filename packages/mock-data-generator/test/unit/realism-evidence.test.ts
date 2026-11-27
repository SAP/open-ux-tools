import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const scriptUrl = pathToFileURL(resolve(process.cwd(), 'scripts', 'realism-evidence.mjs')).href;

interface Evidence {
    RELEASE_PROFILES: ReadonlyArray<string>;
    buildFingerprint(packageRoot: string): string;
    realismEvidenceProblems(
        reports: ReadonlyArray<Record<string, unknown>>,
        expected: { build: string; checksVersion: number }
    ): string[];
}

/**
 * A passing report of one profile.
 *
 * @param profile the sweep profile
 * @returns the report
 */
function passing(profile: string): Record<string, unknown> {
    const corpus = 'a'.repeat(64);
    return {
        profile,
        build: 'b'.repeat(64),
        checksVersion: 4,
        corpus,
        source: 'generation',
        baseline: { packageVersion: '0.1.0-dev.25', profile, checksVersion: 4, corpus },
        services: 1,
        perService: [{ id: 'sample', status: 'ok', rows: 3 }],
        checks: { placeholder: { cells: 3 } },
        errors: 0,
        hardFailures: [],
        regressions: []
    };
}

describe('realism evidence', () => {
    const expected = { build: 'b'.repeat(64), checksVersion: 4 };

    it('accepts one passing report per release profile', async () => {
        // Given a passing report for each release profile
        const { RELEASE_PROFILES, realismEvidenceProblems } = (await import(scriptUrl)) as Evidence;
        // Then the build qualifies
        expect(realismEvidenceProblems(RELEASE_PROFILES.map(passing), expected)).toEqual([]);
    });

    it.each([
        [
            'an empty sweep',
            (reports: Record<string, unknown>[]) => [{ ...reports[0], services: 0, perService: [] }, reports[1]],
            'no complete service coverage'
        ],
        [
            'a skipped service',
            (reports: Record<string, unknown>[]) => [
                { ...reports[0], perService: [{ id: 'sample', status: 'no-rows' }] },
                reports[1]
            ],
            'no complete service coverage'
        ],
        [
            'a service with no rows',
            (reports: Record<string, unknown>[]) => [
                { ...reports[0], perService: [{ id: 'sample', status: 'ok', rows: 0 }] },
                reports[1]
            ],
            'no complete service coverage'
        ],
        [
            'a different baseline corpus',
            (reports: Record<string, unknown>[]) => [
                { ...reports[0], baseline: { profile: reports[0].profile, checksVersion: 4, corpus: 'c'.repeat(64) } },
                reports[1]
            ],
            'baseline used a different profile or corpus'
        ],
        ['a missing profile', (reports: Record<string, unknown>[]) => reports.slice(1), 'no realism report'],
        [
            'another build',
            (reports: Record<string, unknown>[]) => [{ ...reports[0], build: 'c' }, reports[1]],
            'another build'
        ],
        [
            'other checks',
            (reports: Record<string, unknown>[]) => [{ ...reports[0], checksVersion: 3 }, reports[1]],
            'checks version 3'
        ],
        [
            'no baseline',
            (reports: Record<string, unknown>[]) => [{ ...reports[0], baseline: undefined }, reports[1]],
            'no baseline'
        ],
        [
            'a failed service',
            (reports: Record<string, unknown>[]) => [{ ...reports[0], errors: 1 }, reports[1]],
            '1 services failed'
        ],
        [
            'a hard finding',
            (reports: Record<string, unknown>[]) => [
                { ...reports[0], hardFailures: ['placeholder: 1 fields, 2 cells'] },
                reports[1]
            ],
            'hard checks failed'
        ],
        [
            'a regression',
            (reports: Record<string, unknown>[]) => [
                { ...reports[0], regressions: ['shared-text: 1/2 -> 2/3'] },
                reports[1]
            ],
            'worse than its baseline'
        ]
    ])('refuses %s', async (_case, change, reason) => {
        // Given passing reports with one defect
        const { RELEASE_PROFILES, realismEvidenceProblems } = (await import(scriptUrl)) as Evidence;
        const reports = change(RELEASE_PROFILES.map(passing));
        // When they are checked
        const problems = realismEvidenceProblems(reports, expected);
        // Then the defect is named
        expect(problems).toEqual([expect.stringContaining(reason)]);
    });

    it('fingerprints the compiled code and the model manifest, and nothing else', async () => {
        // Given a package root with code, a manifest and an unrelated file
        const { buildFingerprint } = (await import(scriptUrl)) as Evidence;
        const root = await mkdtemp(join(tmpdir(), 'mockgen-evidence-'));
        try {
            await mkdir(join(root, 'dist', 'model'), { recursive: true });
            await mkdir(join(root, 'resources', 'models'), { recursive: true });
            await writeFile(join(root, 'dist', 'model', 'a.js'), 'export const a = 1;');
            await writeFile(join(root, 'resources', 'models', 'manifest.json'), '{"revision":"r"}');
            await writeFile(join(root, 'dist', 'a.d.ts'), 'export declare const a: 1;');
            const before = buildFingerprint(root);
            // When a declaration file changes, then code
            await writeFile(join(root, 'dist', 'a.d.ts'), 'export declare const a: number;');
            const afterDeclaration = buildFingerprint(root);
            await writeFile(join(root, 'dist', 'model', 'a.js'), 'export const a = 2;');
            const afterCode = buildFingerprint(root);
            // Then only the code change moves the fingerprint
            expect(afterDeclaration).toBe(before);
            expect(afterCode).not.toBe(before);
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
});
