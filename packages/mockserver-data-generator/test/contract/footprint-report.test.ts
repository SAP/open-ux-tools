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
            codeCommit: 'b'.repeat(40),
            sourceClean: true,
            modelRevision: 'c'.repeat(64),
            modelManifestSha256: 'd'.repeat(64),
            runtimePackage: 'onnxruntime-node',
            runtimeVersion: '1.24.3'
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
            unpackedBytes: 250_000
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
            approvedGeneratorBaselineBytes: 164_924_986,
            components: [
                { id: 'semantic-classifier', kind: 'classifier', fingerprint: 'e'.repeat(64), bytes: 23_719_591 },
                { id: 'row-generator', kind: 'sft', fingerprint: 'f'.repeat(64), bytes: 168_448_000 }
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
