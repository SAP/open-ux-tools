import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import {
    createCanaryLaunch,
    createCanaryConfiguration,
    createCanaryEnvironment,
    discoverCanaryTarget,
    extractCanaryTimings,
    verifyCanaryProcessEvidence,
    verifyInstalledApplication
} from '../../../../../scripts/mockserver-data-generator-dev-kit/lib/verify-app.mjs';

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
    const directory = mkdtempSync(join(tmpdir(), 'mockgen-verify-app-'));
    temporaryDirectories.push(directory);
    return directory;
}

function writeInstalledPackage(appRoot: string, packageName: string, version: string): void {
    const packageRoot = join(appRoot, 'node_modules', ...packageName.split('/'));
    mkdirSync(join(packageRoot, 'dist'), { recursive: true });
    writeFileSync(
        join(packageRoot, 'package.json'),
        JSON.stringify({ name: packageName, version, main: 'dist/index.js' })
    );
    writeFileSync(join(packageRoot, 'dist', 'index.js'), 'module.exports = {};\n');
    if (packageName === '@sap-ux/mockserver-data-generator') {
        writeFileSync(join(packageRoot, 'dist', 'cli.js'), '#!/usr/bin/env node\n');
    }
}

type ExpectedPackage = { packageName: string; version: string; specification: string };

function writeVerifiedApp(): { appRoot: string; packages: ExpectedPackage[] } {
    const appRoot = temporaryDirectory();
    const packages = [
        {
            packageName: '@sap-ux/mockserver-data-generator',
            version: '0.1.0',
            specification: 'file:.mockserver-data-generator-dev/packages/generator.tgz'
        },
        {
            packageName: '@sap-ux/fe-mockserver-core',
            version: '1.7.15',
            specification: 'file:.mockserver-data-generator-dev/packages/core.tgz'
        },
        {
            packageName: '@sap-ux/ui5-middleware-fe-mockserver',
            version: '2.4.16',
            specification: 'file:.mockserver-data-generator-dev/packages/middleware.tgz'
        }
    ];
    writeFileSync(
        join(appRoot, 'package.json'),
        `${JSON.stringify(
            {
                scripts: {
                    'start-mock': 'mockserver-data-generator start -- fiori run --config ./ui5-mock.yaml'
                },
                devDependencies: Object.fromEntries(packages.map((entry) => [entry.packageName, entry.specification])),
                ui5: { dependencies: ['@sap-ux/ui5-middleware-fe-mockserver'] }
            },
            null,
            2
        )}\n`
    );
    mkdirSync(join(appRoot, 'webapp', 'localService', 'mainService'), { recursive: true });
    writeFileSync(join(appRoot, 'webapp', 'manifest.json'), '{}\n');
    writeFileSync(
        join(appRoot, 'webapp', 'localService', 'mainService', 'metadata.xml'),
        '<Schema><EntityContainer><EntitySet Name="Products" /></EntityContainer></Schema>\n'
    );
    writeFileSync(
        join(appRoot, 'ui5-mock.yaml'),
        `server:
  customMiddleware:
    - name: sap-fe-mockserver
      configuration:
        mockDataGenerator:
          name: '@sap-ux/mockserver-data-generator/fe-mockserver'
        services:
          - urlPath: /sap/opu/odata4/mockgen
            metadataPath: ./webapp/localService/mainService/metadata.xml
`
    );
    for (const entry of packages) {
        writeInstalledPackage(appRoot, entry.packageName, entry.version);
    }
    return { appRoot, packages };
}

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

describe('installed application verification', () => {
    test('verifies local origins, versions, exports, and the single standard middleware', () => {
        const fixture = writeVerifiedApp();
        const result = verifyInstalledApplication(fixture.appRoot, fixture.packages);

        expect(result.installed).toBe(true);
        expect(result.middlewareCount).toBe(1);
        expect(result.providerName).toBe('@sap-ux/mockserver-data-generator/fe-mockserver');
    });

    test('rejects a generator in legacy ui5.dependencies', () => {
        const fixture = writeVerifiedApp();
        const packageJsonPath = join(fixture.appRoot, 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        packageJson.ui5.dependencies.push('@sap-ux/mockserver-data-generator');
        writeFileSync(packageJsonPath, JSON.stringify(packageJson));

        expect(() => verifyInstalledApplication(fixture.appRoot, fixture.packages)).toThrow(/ui5\.dependencies/i);
    });

    test('rejects an unwrapped start-mock script', () => {
        const fixture = writeVerifiedApp();
        const packageJsonPath = join(fixture.appRoot, 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        packageJson.scripts['start-mock'] = 'fiori run --config ./ui5-mock.yaml';
        writeFileSync(packageJsonPath, JSON.stringify(packageJson));

        expect(() => verifyInstalledApplication(fixture.appRoot, fixture.packages)).toThrow(/mockgen launcher/i);
    });

    test('rejects a start-mock script whose config is only mentioned by another argument', () => {
        const fixture = writeVerifiedApp();
        const packageJsonPath = join(fixture.appRoot, 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        packageJson.scripts['start-mock'] =
            'mockserver-data-generator start -- fiori run --config ./other.yaml --open ./ui5-mock.yaml';
        writeFileSync(packageJsonPath, JSON.stringify(packageJson));

        expect(() => verifyInstalledApplication(fixture.appRoot, fixture.packages)).toThrow(/target ui5-mock\.yaml/i);
    });

    test('runs HTTP canaries through the installed launcher and appends activation only when requested', () => {
        const fixture = writeVerifiedApp();
        const executable = join(fixture.appRoot, 'node_modules', '.bin', 'fiori');
        const childArgs = ['run', '--config', '/tmp/mockgen-canary.yaml', '--port', '12345'];

        expect(createCanaryLaunch(fixture.appRoot, executable, childArgs, false)).toEqual({
            command: process.execPath,
            args: [
                join(fixture.appRoot, 'node_modules', '@sap-ux', 'mockserver-data-generator', 'dist', 'cli.js'),
                'start',
                '--',
                executable,
                ...childArgs
            ]
        });
        expect(createCanaryLaunch(fixture.appRoot, executable, childArgs, true).args).toEqual([
            join(fixture.appRoot, 'node_modules', '@sap-ux', 'mockserver-data-generator', 'dist', 'cli.js'),
            'start',
            '--',
            executable,
            ...childArgs,
            '--mockgen'
        ]);
    });

    test('rejects an installed package with a missing conditional export target', () => {
        const fixture = writeVerifiedApp();
        const packageJsonPath = join(
            fixture.appRoot,
            'node_modules',
            '@sap-ux',
            'mockserver-data-generator',
            'package.json'
        );
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        packageJson.exports = {
            '.': './dist/index.js',
            './fe-mockserver': { require: './dist/fe-mockserver.cjs' }
        };
        writeFileSync(packageJsonPath, JSON.stringify(packageJson));

        expect(() => verifyInstalledApplication(fixture.appRoot, fixture.packages)).toThrow(
            /missing a required installed export/i
        );
    });

    test('discovers metadata and first entity target without executing the start script', () => {
        const fixture = writeVerifiedApp();
        expect(discoverCanaryTarget(fixture.appRoot)).toEqual({
            servicePath: '/sap/opu/odata4/mockgen',
            metadataPath: join(fixture.appRoot, 'webapp/localService/mainService/metadata.xml'),
            entitySet: 'Products'
        });
    });

    test('discovers the first entity target from CDS metadata before starting the server', () => {
        const fixture = writeVerifiedApp();
        const metadataPath = join(fixture.appRoot, 'webapp/localService/mainService/metadata.cds');
        writeFileSync(
            metadataPath,
            'namespace MockGen.Sample;\nservice Catalog { entity Products { key ID: Integer; } }\n'
        );
        const yamlPath = join(fixture.appRoot, 'ui5-mock.yaml');
        writeFileSync(yamlPath, readFileSync(yamlPath, 'utf8').replace('metadata.xml', 'metadata.cds'));

        expect(discoverCanaryTarget(fixture.appRoot)).toEqual({
            servicePath: '/sap/opu/odata4/mockgen',
            metadataPath,
            entitySet: 'Products'
        });
    });

    test('creates an isolated debug configuration so provider evidence is observable', () => {
        const fixture = writeVerifiedApp();
        const sourcePath = join(fixture.appRoot, 'ui5-mock.yaml');
        const source = readFileSync(sourcePath, 'utf8');
        const canary = createCanaryConfiguration(fixture.appRoot);

        expect(canary.path).not.toBe(sourcePath);
        expect(readFileSync(sourcePath, 'utf8')).toBe(source);
        expect(readFileSync(canary.path, 'utf8')).toMatch(/^\s+debug: true$/mu);

        canary.cleanup();
        expect(() => readFileSync(canary.path, 'utf8')).toThrow();
    });

    test('creates the canary configuration without writing inside the application', () => {
        const fixture = writeVerifiedApp();
        const sourcePath = join(fixture.appRoot, 'ui5-mock.yaml');
        const source = readFileSync(sourcePath, 'utf8');
        chmodSync(sourcePath, 0o444);
        chmodSync(fixture.appRoot, 0o555);
        let cleanup: () => void = () => undefined;
        try {
            const canary = createCanaryConfiguration(fixture.appRoot);
            cleanup = canary.cleanup;
            const relativeCanaryPath = relative(fixture.appRoot, canary.path);

            expect(relativeCanaryPath.startsWith('..') || isAbsolute(relativeCanaryPath)).toBe(true);
            expect(readFileSync(sourcePath, 'utf8')).toBe(source);
        } finally {
            cleanup();
            chmodSync(fixture.appRoot, 0o755);
            chmodSync(sourcePath, 0o644);
        }
    });

    test('forces the learned canary to execute instead of reusing generated rows', () => {
        const fixture = writeVerifiedApp();
        const sourcePath = join(fixture.appRoot, 'ui5-mock.yaml');
        const source = readFileSync(sourcePath, 'utf8');
        const canary = createCanaryConfiguration(fixture.appRoot, { expectedLearned: true });
        const configuration = readFileSync(canary.path, 'utf8');

        expect(readFileSync(sourcePath, 'utf8')).toBe(source);
        expect(configuration).toMatch(/mockDataGenerator:\s+[\s\S]*options:\s+[\s\S]*generatedDataCache: false/mu);

        canary.cleanup();
    });

    test('overrides an enabled generated-row cache only in the temporary learned configuration', () => {
        const fixture = writeVerifiedApp();
        const sourcePath = join(fixture.appRoot, 'ui5-mock.yaml');
        const source = readFileSync(sourcePath, 'utf8').replace(
            "          name: '@sap-ux/mockserver-data-generator/fe-mockserver'",
            "          name: '@sap-ux/mockserver-data-generator/fe-mockserver'\n          options:\n            generatedDataCache: true"
        );
        writeFileSync(sourcePath, source);
        const canary = createCanaryConfiguration(fixture.appRoot, { expectedLearned: true });
        const configuration = readFileSync(canary.path, 'utf8');

        expect(readFileSync(sourcePath, 'utf8')).toBe(source);
        expect(configuration).toContain('generatedDataCache: false');
        expect(configuration).not.toContain('generatedDataCache: true');

        canary.cleanup();
    });

    test('binds a performance canary to an explicit generated-data cache directory', () => {
        const fixture = writeVerifiedApp();
        const cacheDirectory = join(fixture.appRoot, '.performance-cache');
        mkdirSync(cacheDirectory);
        const canary = createCanaryConfiguration(fixture.appRoot, {
            expectedLearned: true,
            generatedDataCacheDirectory: cacheDirectory
        });
        const configuration = readFileSync(canary.path, 'utf8');

        expect(configuration).toMatch(/generatedDataCache: true/u);
        expect(configuration).toContain(`generatedDataCacheDirectory: ${JSON.stringify(cacheDirectory)}`);
        expect(configuration).not.toContain('generatedDataCache: false');

        canary.cleanup();
    });
});

describe('canary process evidence', () => {
    const providerEvidence = 'Provider mockdata found for Products';
    const learnedEvidence = 'MOCK_DATA_GENERATOR_CAPABILITIES: mode=hybrid classifier=ready sft=ready';

    test('accepts provider evidence for the deterministic development path', () => {
        expect(verifyCanaryProcessEvidence(providerEvidence, 'Products')).toEqual({ providerExecuted: true });
    });

    test('proves the standard fallback without accepting provider-generation evidence', () => {
        expect(verifyCanaryProcessEvidence('Missing mockdata will be generated', 'Products', false, false)).toEqual({
            providerExecuted: false,
            standardFallbackVerified: true
        });
        expect(() => verifyCanaryProcessEvidence(providerEvidence, 'Products', false, false)).toThrow(
            /unexpectedly published/i
        );
    });

    test('overwrites ambient activation explicitly for each canary', () => {
        expect(createCanaryEnvironment(false, { PATH: '/test/bin', SAP_UX_MOCKGEN_ENABLED: '1' })).toEqual({
            PATH: '/test/bin',
            SAP_UX_MOCKGEN_ENABLED: '0',
            BROWSER: 'none'
        });
        expect(createCanaryEnvironment(true, { PATH: '/test/bin' })).toEqual({
            PATH: '/test/bin',
            SAP_UX_MOCKGEN_ENABLED: '1',
            BROWSER: 'none'
        });
    });

    test('requires classifier and SFT readiness for the learned development path', () => {
        expect(() => verifyCanaryProcessEvidence(providerEvidence, 'Products', true)).toThrow(/classifier and SFT/i);
        expect(verifyCanaryProcessEvidence(`${providerEvidence}\n${learnedEvidence}`, 'Products', true)).toEqual({
            providerExecuted: true,
            learnedRuntimeVerified: true
        });
    });
});

describe('canary performance evidence', () => {
    test('extracts provider and host timings without accepting ambiguous duplicate phases', () => {
        const output = [
            'mock-data-generator:debug MOCK_DATA_GENERATOR_TIMING: phase=runtime-initialization durationMs=712.350',
            'mock-data-generator:debug MOCK_DATA_GENERATOR_TIMING: phase=whole-service durationMs=11754.725',
            'mock-data-generator:complete service=/sap/opu/odata4/mockgen durationMs=11760.125'
        ].join('\n');

        expect(extractCanaryTimings(output)).toEqual({
            runtimeInitializationMs: 712.35,
            wholeServiceGenerationMs: 11754.725,
            hostProviderMs: 11760.125
        });
        expect(() => extractCanaryTimings(`${output}\n${output}`)).toThrow(/unique timing/u);
    });

    test('accepts a cache-hit timing only when no model runtime was initialized', () => {
        const output = [
            'mock-data-generator:debug GENERATED_DATA_CACHE_HIT: reused',
            'mock-data-generator:debug MOCK_DATA_GENERATOR_CAPABILITIES: mode=deterministic classifier=unavailable sft=unavailable',
            'mock-data-generator:debug MOCK_DATA_GENERATOR_TIMING: phase=generated-data-cache-hit durationMs=4.125',
            'mock-data-generator:complete service=/sap/opu/odata4/mockgen durationMs=5.250'
        ].join('\n');

        expect(extractCanaryTimings(output, { expectedCacheHit: true })).toEqual({
            generatedDataCacheHitMs: 4.125,
            hostProviderMs: 5.25
        });
        expect(() =>
            extractCanaryTimings(
                `${output}\nmock-data-generator:debug MOCK_DATA_GENERATOR_TIMING: phase=runtime-initialization durationMs=12.500`,
                {
                    expectedCacheHit: true
                }
            )
        ).toThrow(/initialized a learned model runtime/u);
    });
});
