import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repositoryRoot = resolve(packageRoot, '..', '..');
const scriptPath = join(packageRoot, 'scripts', 'measure-footprint.mjs');
const temporaryRoots: string[] = [];

interface GateResult {
    actual: number | boolean | null;
    threshold?: number | null;
    expected?: boolean;
    status: 'pass' | 'fail' | 'not-measured';
}

interface FootprintReport {
    reportFingerprint: string;
    metrics: {
        npm: { packedBytes: number; unpackedBytes: number };
        installation: {
            deterministicBytes: number;
            learnedBytes: number;
            runtimeIncrementalBytes: number;
        };
        model: { downloadBytes: number; verifiedCacheBytes: number; manifestBytes: number };
        cache: { generatedDataQuotaBytes: number };
        total: { incrementalInstalledAndCacheBytes: number };
        latencyMs: { providerModuleLoad: { p50: number; p95: number } };
    };
    gates: Record<string, GateResult>;
    footprintReady: boolean;
}

interface FootprintHarness {
    buildFootprintReport(input: unknown): FootprintReport;
    measureDirectory(root: string): { logicalBytes: number; files: number; symbolicLinks: number };
    parseArguments(argv: string[]): Record<string, unknown> | undefined;
    parseGeneratorBaseline(value: unknown): {
        id: string;
        artifact: { bytes: number; sha256: string };
        recordFingerprint: string;
    };
    validateEvaluationReport(
        value: unknown,
        expected: unknown
    ): {
        classifierCohortSha256: string;
        sftCohortSha256: string;
    };
}

async function loadHarness(): Promise<FootprintHarness> {
    return (await import(pathToFileURL(scriptPath).href)) as FootprintHarness;
}

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { recursive: true, force: true });
    }
});

function completeMeasurement(): unknown {
    return {
        candidate: {
            packageName: '@sap-ux/mockserver-data-generator',
            packageVersion: '0.0.0',
            packageArchiveSha256: 'a'.repeat(64),
            generatorEntrySha256: '1'.repeat(64),
            codeCommit: 'b'.repeat(40),
            sourceClean: true,
            modelRevision: 'c'.repeat(64),
            modelManifestSha256: 'd'.repeat(64),
            runtimePackage: 'onnxruntime-node',
            runtimeVersion: '1.24.3',
            generatorBaselineFingerprint: '6ee61ae3a2e6e2790064a529b6ef4fc71f5779371e79bed036fb997cd82c1398'
        },
        environment: {
            node: 'v22.22.2',
            platform: 'darwin',
            architecture: 'arm64',
            packageManager: 'npm@10.9.4',
            cpu: 'test-cpu'
        },
        package: {
            packedBytes: 57_460,
            unpackedBytes: 250_000,
            boundaryClean: true
        },
        installation: {
            deterministicBytes: 1_000_000,
            learnedBytes: 220_000_000,
            runtimeIncrementalBytes: 219_000_000
        },
        model: {
            manifestBytes: 10_000,
            downloadBytes: 192_167_584,
            verifiedCacheBytes: 192_167_584,
            generatorBytes: 164_924_986,
            generatorBaseline: {
                schemaVersion: 1,
                id: 'mockgen-pilot-int8-generator-v1',
                lifecycle: 'frozen-development-baseline',
                artifact: {
                    bytes: 164_924_986,
                    sha256: '8241c95937623d6b5e61e6057f85e3ab5ede22a2bc0e57f221092db9bc8011da'
                },
                targetFormula: 'floor(artifact.bytes / 2)',
                source: {
                    modelManifestSha256: '9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961',
                    pilotExportReportSha256: '1e79460315eca0d292eb1e5ad5034b8f85e2c07427d305223a356e5813614540'
                },
                recordFingerprint: '6ee61ae3a2e6e2790064a529b6ef4fc71f5779371e79bed036fb997cd82c1398'
            },
            components: [
                { id: 'semantic-classifier', kind: 'classifier', fingerprint: 'e'.repeat(64), bytes: 23_719_591 },
                { id: 'row-generator', kind: 'sft', fingerprint: 'f'.repeat(64), bytes: 168_448_000 }
            ],
            artifacts: [
                { componentId: 'semantic-classifier', role: 'encoder', fingerprint: '2'.repeat(64), bytes: 10 },
                { componentId: 'row-generator', role: 'model', fingerprint: '3'.repeat(64), bytes: 20 }
            ]
        },
        generatedDataCacheQuotaBytes: 32 * 1024 * 1024,
        timings: {
            providerModuleLoadMs: [100, 200, 250],
            modelSessionLoadMs: [4_000, 5_000],
            coldServiceGenerationMs: [24_000, 25_000],
            warmCacheStartupMs: [150, 200],
            t2GenerationMs: [19_000, 20_000],
            firstUseAcquisitionMs: [29_000, 30_000],
            hostProviderMs: [59_000, 60_000]
        },
        memory: { peakRssBytes: 350_000_000 }
    };
}

describe('footprint report contract', () => {
    test('exposes the measurement harness as an explicit repository script', () => {
        const packageJson = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
            scripts: Record<string, string>;
        };

        expect(packageJson.scripts['mockserver-data-generator:measure-footprint']).toBe(
            'node packages/mockserver-data-generator/scripts/measure-footprint.mjs'
        );
    });

    test('keeps package, runtime, model, cache, and latency measurements separate', async () => {
        const { buildFootprintReport } = await loadHarness();

        const report = buildFootprintReport(completeMeasurement());

        expect(report.metrics).toMatchObject({
            npm: { packedBytes: 57_460, unpackedBytes: 250_000 },
            installation: {
                deterministicBytes: 1_000_000,
                learnedBytes: 220_000_000,
                runtimeIncrementalBytes: 219_000_000
            },
            model: { manifestBytes: 10_000, downloadBytes: 192_167_584, verifiedCacheBytes: 192_167_584 },
            cache: { generatedDataQuotaBytes: 32 * 1024 * 1024 },
            total: { incrementalInstalledAndCacheBytes: 445_722_016 },
            latencyMs: { providerModuleLoad: { p50: 200, p95: 250 } }
        });
        expect(report.gates.npmPacked).toEqual({ actual: 57_460, threshold: 5 * 1024 * 1024, status: 'pass' });
        expect(report.gates.packageBoundary).toEqual({ actual: true, expected: true, status: 'pass' });
        expect(report.gates.modelDownload.status).toBe('pass');
        expect(report.gates.modelCache.status).toBe('pass');
        expect(report.gates.totalFootprint.status).toBe('fail');
        expect(report.gates.generatorOptimization.status).toBe('fail');
        expect(report.gates.providerModuleLoad.status).toBe('pass');
        expect(report.gates.sourceClean.status).toBe('pass');
        expect(report.reportFingerprint).toMatch(/^[a-f\d]{64}$/u);
        expect(report.footprintReady).toBe(false);
    });

    test('marks unavailable runtime measurements as not measured instead of passing them', async () => {
        const { buildFootprintReport } = await loadHarness();
        const input = completeMeasurement() as { timings?: unknown; memory?: unknown };
        delete input.timings;
        delete input.memory;

        const report = buildFootprintReport(input);

        expect(report.gates.providerModuleLoad.status).toBe('not-measured');
        expect(report.gates.modelSessionLoad.status).toBe('not-measured');
        expect(report.gates.coldServiceGeneration.status).toBe('not-measured');
        expect(report.footprintReady).toBe(false);
    });

    test('supports a package-only baseline without inventing learned footprint results', async () => {
        const { buildFootprintReport } = await loadHarness();
        const input = completeMeasurement() as {
            candidate: Record<string, unknown>;
            installation: Record<string, unknown>;
            model?: unknown;
        };
        delete input.model;
        delete input.candidate.modelRevision;
        delete input.candidate.modelManifestSha256;
        delete input.candidate.runtimePackage;
        delete input.candidate.runtimeVersion;
        delete input.candidate.generatorBaselineFingerprint;
        delete input.installation.learnedBytes;
        delete input.installation.runtimeIncrementalBytes;

        const report = buildFootprintReport(input);

        expect(report.gates.modelDownload.status).toBe('not-measured');
        expect(report.gates.totalFootprint.status).toBe('not-measured');
        expect(report.gates.generatorOptimization.status).toBe('not-measured');
        expect(report.gates.generatorOptimization.threshold).toBeNull();
        expect(report.footprintReady).toBe(false);
    });

    test('does not accept measurements from a dirty candidate as footprint-ready evidence', async () => {
        const { buildFootprintReport } = await loadHarness();
        const input = completeMeasurement() as { candidate: { sourceClean: boolean } };
        input.candidate.sourceClean = false;

        const report = buildFootprintReport(input);

        expect(report.gates.sourceClean).toEqual({ actual: false, expected: true, status: 'fail' });
        expect(report.footprintReady).toBe(false);
    });

    test('does not accept a package that failed the packed-artifact boundary', async () => {
        const { buildFootprintReport } = await loadHarness();
        const input = completeMeasurement() as { package: { boundaryClean: boolean } };
        input.package.boundaryClean = false;

        const report = buildFootprintReport(input);

        expect(report.gates.packageBoundary).toEqual({ actual: false, expected: true, status: 'fail' });
        expect(report.footprintReady).toBe(false);
    });

    test('accepts pnpm separators and rejects partial numeric CLI values and free-form baselines', async () => {
        const { parseArguments } = await loadHarness();

        expect(parseArguments(['--', '--output', '/tmp/footprint.json', '--runs', '10', '--enforce'])).toMatchObject({
            runs: 10,
            enforce: true
        });
        expect(() => parseArguments(['--output', '/tmp/footprint.json', '--runs', '2junk'])).toThrow(
            '--runs must be a decimal integer'
        );
        expect(() =>
            parseArguments(['--output', '/tmp/footprint.json', '--generator-baseline-bytes', '999999999'])
        ).toThrow('Unknown argument: --generator-baseline-bytes');
    });

    test('rejects a modified frozen generator baseline even when its fields remain plausible', async () => {
        const { parseGeneratorBaseline } = await loadHarness();
        const baseline = {
            schemaVersion: 1,
            id: 'mockgen-pilot-int8-generator-v1',
            lifecycle: 'frozen-development-baseline',
            artifact: { bytes: 164_924_986, sha256: '8'.repeat(64) },
            targetFormula: 'floor(artifact.bytes / 2)',
            source: {
                modelManifestSha256: '9'.repeat(64),
                pilotExportReportSha256: 'a'.repeat(64)
            },
            recordFingerprint: 'f'.repeat(64)
        };

        expect(() => parseGeneratorBaseline(baseline)).toThrow('generator baseline fingerprint does not match');
    });

    test('rejects self-consistent evaluation evidence from another platform', async () => {
        const { validateEvaluationReport } = await loadHarness();
        const classifierArtifacts = [
            { id: 'encoder', filename: 'encoder.onnx', bytes: 10, sha256: '1'.repeat(64) },
            { id: 'head', filename: 'head.json', bytes: 11, sha256: '2'.repeat(64) },
            { id: 'vocabulary', filename: 'vocab.txt', bytes: 12, sha256: '3'.repeat(64) }
        ];
        const sftArtifacts = [
            { id: 'model', filename: 'model.onnx', bytes: 20, sha256: '4'.repeat(64) },
            { id: 'tokenizer', filename: 'tokenizer.json', bytes: 21, sha256: '5'.repeat(64) }
        ];
        const canonicalJson = (value: unknown): string => {
            if (Array.isArray(value)) {
                return `[${value.map(canonicalJson).join(',')}]`;
            }
            if (value !== null && typeof value === 'object') {
                const object = value as Record<string, unknown>;
                return `{${Object.keys(object)
                    .sort()
                    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
                    .join(',')}}`;
            }
            return JSON.stringify(value);
        };
        const sha256 = (value: unknown): string => createHash('sha256').update(canonicalJson(value)).digest('hex');
        const report: Record<string, unknown> = {
            schemaVersion: 1,
            createdAt: '2026-09-04T00:00:00.000Z',
            harness: {
                repository: 'SAP/open-ux-tools',
                package: '@sap-ux/mockserver-data-generator',
                packageVersion: '0.0.0',
                generatorEntry: 'index.js',
                generatorEntrySha256: '6'.repeat(64),
                codeCommit: '7'.repeat(40),
                sourceClean: true,
                node: 'v22.22.2',
                platform: 'linux-x64',
                cpu: 'test-cpu',
                runtime: { package: 'onnxruntime-node', version: '1.24.3' }
            },
            policy: { processIsolation: true },
            classifier: {
                componentFingerprint: sha256(classifierArtifacts),
                artifacts: [
                    ...classifierArtifacts,
                    { id: 'classifier-gold-cohort', filename: 'gold.jsonl', bytes: 30, sha256: '8'.repeat(64) }
                ],
                metrics: { loadMs: 10, processMaxRssBytes: 100 }
            },
            sft: [
                {
                    candidate: 'int8',
                    componentFingerprint: sha256(sftArtifacts),
                    artifacts: [
                        ...sftArtifacts,
                        { id: 'sft-held-out-cohort', filename: 'held-out.json', bytes: 31, sha256: '9'.repeat(64) }
                    ],
                    metrics: { loadMs: 20, processMaxRssBytes: 200, latencyMs: { p50: 30, p95: 40 } }
                }
            ]
        };
        report.reportFingerprint = sha256(report);

        expect(() =>
            validateEvaluationReport(report, {
                packageName: '@sap-ux/mockserver-data-generator',
                packageVersion: '0.0.0',
                generatorEntrySha256: '6'.repeat(64),
                codeCommit: '7'.repeat(40),
                node: 'v22.22.2',
                platform: 'darwin-arm64',
                cpu: 'test-cpu',
                runtimePackage: 'onnxruntime-node',
                runtimeVersion: '1.24.3',
                classifierArtifacts,
                sftArtifacts
            })
        ).toThrow('evaluation report platform does not match the current measurement');
    });

    test('counts regular installed files without following npm executable links', async () => {
        const { measureDirectory } = await loadHarness();
        const root = mkdtempSync(join(tmpdir(), 'mockgen-footprint-directory-'));
        temporaryRoots.push(root);
        mkdirSync(join(root, 'lib'));
        mkdirSync(join(root, 'bin'));
        writeFileSync(join(root, 'lib', 'tool.js'), '12345');
        symlinkSync('../lib/tool.js', join(root, 'bin', 'tool'));

        expect(measureDirectory(root)).toEqual({ logicalBytes: 5, files: 1, symbolicLinks: 1 });
    });
});
