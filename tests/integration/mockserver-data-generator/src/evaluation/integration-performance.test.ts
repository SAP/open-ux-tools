import { createHash } from 'node:crypto';
import { describe, expect, test } from '@jest/globals';
import {
    buildIntegrationPerformanceReport,
    validateIntegrationPerformanceReport
} from '../../../../../scripts/mockserver-data-generator-evaluation/lib/integration-performance.mjs';
import { parseArguments } from '../../../../../scripts/mockserver-data-generator-evaluation/measure-integration.mjs';

const sha = (character: string): string => character.repeat(64);

function measurement(): Record<string, unknown> {
    return {
        candidate: {
            generator: {
                packageName: '@sap-ux/mockserver-data-generator',
                packageVersion: '0.0.0',
                packageArchiveSha256: sha('1'),
                entrySha256: sha('2'),
                buildFingerprint: sha('3'),
                sourceCommit: '4'.repeat(40)
            },
            hostPackages: [
                {
                    packageName: '@sap-ux/fe-mockserver-core',
                    packageVersion: '1.7.15',
                    packageArchiveSha256: sha('5'),
                    sourceCommit: '6'.repeat(40)
                },
                {
                    packageName: '@sap-ux/ui5-middleware-fe-mockserver',
                    packageVersion: '2.4.16',
                    packageArchiveSha256: sha('7'),
                    sourceCommit: '6'.repeat(40)
                }
            ],
            model: { manifestSha256: sha('8'), revision: sha('9') },
            runtime: {
                packageName: 'onnxruntime-node',
                packageVersion: '1.24.3',
                packageArchiveSha256: sha('a')
            }
        },
        environment: {
            node: 'v22.22.2',
            platform: 'darwin',
            architecture: 'arm64',
            cpu: 'test-cpu'
        },
        fixture: {
            fingerprint: sha('b'),
            metadataSha256: sha('c'),
            applicationManifestSha256: sha('d'),
            mockConfigurationSha256: sha('e'),
            servicePath: '/sap/opu/odata4/mockgen',
            entitySet: 'Products'
        },
        observations: {
            cold: Array.from({ length: 5 }, (_entry, index) => ({
                runtimeInitializationMs: 700 + index,
                wholeServiceGenerationMs: 11_000 + index,
                hostProviderMs: 11_010 + index
            })),
            warmCache: Array.from({ length: 5 }, (_entry, index) => ({
                generatedDataCacheHitMs: 4 + index,
                hostProviderMs: 5 + index,
                modelSessionInitialized: false
            })),
            firstUseAcquisitionMs: [800, 810, 820, 830, 840]
        },
        acquisitionTimeoutMs: 30_000
    };
}

describe('integrated performance evidence', () => {
    test('requires explicit absolute artifact and application inputs', () => {
        expect(
            parseArguments([
                '--',
                '--app',
                '/tmp/fiori-app',
                '--model-manifest',
                '/tmp/model.json',
                '--model-cache',
                '/tmp/model-cache',
                '--runtime-tarball',
                '/tmp/runtime.tgz',
                '--output',
                '/tmp/report.json',
                '--runs',
                '10'
            ])
        ).toEqual({
            appRoot: '/tmp/fiori-app',
            modelManifest: '/tmp/model.json',
            modelCache: '/tmp/model-cache',
            runtimeTarball: '/tmp/runtime.tgz',
            output: '/tmp/report.json',
            runs: 10
        });
        expect(() =>
            parseArguments([
                '--app',
                'relative-app',
                '--model-manifest',
                '/tmp/model.json',
                '--model-cache',
                '/tmp/model-cache',
                '--output',
                '/tmp/report.json'
            ])
        ).toThrow('--app must be an absolute path');
        expect(() =>
            parseArguments([
                '--app',
                '/tmp/app',
                '--model-manifest',
                '/tmp/model.json',
                '--model-cache',
                '/tmp/model-cache',
                '--output',
                '/tmp/report.json',
                '--runs',
                '4'
            ])
        ).toThrow('--runs must be an integer from 5 through 100');
    });

    test('aggregates complete cold, cache-hit, acquisition, and host observations', () => {
        const report = buildIntegrationPerformanceReport(measurement());

        expect(report.integrationReady).toBe(true);
        expect(report.metrics).toMatchObject({
            coldServiceGenerationMs: { samples: 5, p50: 11_002, p95: 11_004 },
            warmCacheStartupMs: { samples: 5, p50: 6, p95: 8 },
            firstUseAcquisitionMs: { samples: 5, p50: 820, p95: 840 },
            hostProviderMs: { samples: 5, p50: 11_012, p95: 11_014 }
        });
        expect(report.reportFingerprint).toMatch(/^[a-f\d]{64}$/u);
        const unsigned = { ...report } as Record<string, unknown>;
        delete unsigned.reportFingerprint;
        const canonical = (value: unknown): string => {
            if (Array.isArray(value)) {
                return `[${value.map(canonical).join(',')}]`;
            }
            if (value !== null && typeof value === 'object') {
                const object = value as Record<string, unknown>;
                return `{${Object.keys(object)
                    .sort()
                    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
                    .join(',')}}`;
            }
            return JSON.stringify(value);
        };
        expect(createHash('sha256').update(canonical(unsigned)).digest('hex')).toBe(report.reportFingerprint);
    });

    test('rejects incomplete samples and cache hits that initialized a model session', () => {
        const incomplete = measurement();
        (incomplete.observations as { cold: unknown[] }).cold.pop();
        expect(() => buildIntegrationPerformanceReport(incomplete)).toThrow(
            /cold observations must contain at least 5/u
        );

        const unsafeWarm = measurement();
        (
            unsafeWarm.observations as { warmCache: Array<{ modelSessionInitialized: boolean }> }
        ).warmCache[0].modelSessionInitialized = true;
        expect(() => buildIntegrationPerformanceReport(unsafeWarm)).toThrow(/must not initialize a model session/u);
    });

    test('validates every footprint binding before importing timings', () => {
        const report = buildIntegrationPerformanceReport(measurement());
        const expected = {
            packageName: '@sap-ux/mockserver-data-generator',
            packageVersion: '0.0.0',
            packageArchiveSha256: sha('1'),
            generatorEntrySha256: sha('2'),
            generatorBuildFingerprint: sha('3'),
            codeCommit: '4'.repeat(40),
            modelManifestSha256: sha('8'),
            modelRevision: sha('9'),
            runtimePackage: 'onnxruntime-node',
            runtimeVersion: '1.24.3',
            runtimePackageArchiveSha256: sha('a'),
            node: 'v22.22.2',
            platform: 'darwin',
            architecture: 'arm64',
            cpu: 'test-cpu'
        };

        expect(validateIntegrationPerformanceReport(report, expected).timings).toEqual({
            coldServiceGenerationMs: report.observations.cold.map(
                ({ wholeServiceGenerationMs }: { wholeServiceGenerationMs: number }) => wholeServiceGenerationMs
            ),
            warmCacheStartupMs: report.observations.warmCache.map(
                ({ generatedDataCacheHitMs }: { generatedDataCacheHitMs: number }) => generatedDataCacheHitMs
            ),
            firstUseAcquisitionMs: report.observations.firstUseAcquisitionMs,
            hostProviderMs: report.observations.cold.map(
                ({ hostProviderMs }: { hostProviderMs: number }) => hostProviderMs
            )
        });
        expect(() =>
            validateIntegrationPerformanceReport(report, { ...expected, runtimePackageArchiveSha256: sha('f') })
        ).toThrow(/runtime package archive SHA-256 does not match/u);
        expect(() => validateIntegrationPerformanceReport(report, { ...expected, cpu: 'other-cpu' })).toThrow(
            /CPU does not match/u
        );
    });
});
