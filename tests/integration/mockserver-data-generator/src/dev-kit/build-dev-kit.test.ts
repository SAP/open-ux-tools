import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from '@jest/globals';
import { bundleEntry, renderReadme } from '../../../../../scripts/mockserver-data-generator-dev-kit/build-dev-kit.mjs';
import {
    configureFioriApplication,
    wrapStartMockScript
} from '../../../../../scripts/mockserver-data-generator-dev-kit/lib/bundle-installer.mjs';
import {
    assertSafeArchiveEntry,
    inspectPackedArtifact,
    sha256File,
    verifyFileChecksum
} from '../../../../../scripts/mockserver-data-generator-dev-kit/lib/artifacts.mjs';
import {
    createDevKitManifest,
    fingerprintManifest
} from '../../../../../scripts/mockserver-data-generator-dev-kit/lib/manifest.mjs';

const temporaryDirectories: string[] = [];
const pilotBridgeEntry = fileURLToPath(
    new URL('../../../../../scripts/mockserver-data-generator-dev-kit/prepare-pilot-model-cache.mjs', import.meta.url)
);
const fioriFixture = fileURLToPath(new URL('../../test/fixtures/fiori-v4', import.meta.url));
const cdsFioriFixture = fileURLToPath(new URL('../../test/fixtures/fiori-cds', import.meta.url));
const toolsPackageManager = (
    JSON.parse(readFileSync(fileURLToPath(new URL('../../../../../package.json', import.meta.url)), 'utf8')) as {
        packageManager: string;
    }
).packageManager;

function temporaryDirectory(): string {
    const directory = mkdtempSync(join(tmpdir(), 'mockgen-dev-kit-test-'));
    temporaryDirectories.push(directory);
    return directory;
}

function makePackageTarball(options?: {
    includeBin?: boolean;
    includeDist?: boolean;
    packageName?: string;
    reverseDependencies?: boolean;
}): string {
    const root = temporaryDirectory();
    const packageRoot = join(root, 'package');
    mkdirSync(join(packageRoot, 'dist'), { recursive: true });
    writeFileSync(
        join(packageRoot, 'package.json'),
        JSON.stringify({
            name: options?.packageName ?? '@sap-ux/mockserver-data-generator',
            version: '0.1.0',
            main: 'dist/index.js',
            bin: { 'mockserver-data-generator': 'dist/cli.js' },
            exports: { '.': './dist/index.js' },
            devDependencies: options?.reverseDependencies
                ? { '@example/z-last': '1.0.0', '@example/a-first': '1.0.0' }
                : { '@example/a-first': '1.0.0', '@example/z-last': '1.0.0' }
        })
    );
    if (options?.includeDist !== false) {
        writeFileSync(join(packageRoot, 'dist', 'index.js'), 'export const ok = true;\n');
    }
    if (options?.includeBin !== false) {
        writeFileSync(join(packageRoot, 'dist', 'cli.js'), '#!/usr/bin/env node\n');
    }
    const archive = join(root, 'package.tgz');
    execFileSync('tar', ['-czf', archive, '-C', root, 'package']);
    return archive;
}

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

describe('development kit artifact validation', () => {
    test('keeps standard missing-data generation enabled in the CDS canary fixture', () => {
        const ui5MockYaml = readFileSync(join(cdsFioriFixture, 'ui5-mock.yaml'), 'utf8');

        expect(ui5MockYaml).toMatch(/configuration:\s+generateMockData: true\s+metadataProcessor:/u);
    });

    test('wraps a simple Fiori start-mock script without changing its command', () => {
        const original =
            'fiori run --config ./ui5-mock.yaml --open "test/flpSandbox.html?sap-client=902&sap-ui-xx-viewCache=false"';

        expect(wrapStartMockScript(original)).toBe(`mockserver-data-generator start -- ${original}`);
        expect(wrapStartMockScript(`mockserver-data-generator start -- ${original}`)).toBe(
            `mockserver-data-generator start -- ${original}`
        );
    });

    test('rejects a persisted mockgen flag so the plain start command stays standard', () => {
        expect(() => wrapStartMockScript('fiori run --config ./ui5-mock.yaml --open "/" --mockgen')).toThrow(
            /must not contain --mockgen/i
        );
        expect(() => wrapStartMockScript('fiori run --config ./ui5-mock.yaml "--mockgen"')).toThrow(
            /must not contain --mockgen/i
        );
    });

    test.each([
        'vite --config ./ui5-mock.yaml',
        'NODE_ENV=test fiori run --config ./ui5-mock.yaml',
        'fiori run --config ./ui5-mock.yaml && echo changed',
        'fiori run --config ./ui5-mock.yaml | tee output.log',
        'fiori run --config $(select-config)',
        'fiori run --config ./ui5-mock.yaml > output.log',
        'fiori run --config "./ui5-mock.yaml'
    ])('rejects an unsupported start-mock shell script: %s', (script) => {
        expect(() => wrapStartMockScript(script)).toThrow(/simple fiori run command/i);
    });

    test('documents the read-only verification boundary in the portable archive', () => {
        const readme = renderReadme({
            fingerprint: 'a'.repeat(64),
            archiveSha256: undefined,
            reproducible: true,
            packages: [{ packageName: '@sap-ux/mockserver-data-generator', version: '0.1.0', sha256: 'b'.repeat(64) }]
        });

        expect(readme).toMatch(/operating-system\s+temporary directory/u);
        expect(readme).toMatch(/Installation and\s+restore still require a writable application/u);
        expect(readme).toContain('npm run start-mock -- --mockgen');
    });

    test('overrides production MockGen wiring with the unpublished local package', async () => {
        const appRoot = temporaryDirectory();
        cpSync(fioriFixture, appRoot, { recursive: true });

        await configureFioriApplication({
            appRoot,
            webappPath: join(appRoot, 'webapp'),
            generatorSpec: 'file:.mockserver-data-generator-dev/packages/generator.tgz'
        });

        const packageJson = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')) as {
            devDependencies?: Record<string, string>;
            scripts?: Record<string, string>;
        };
        const ui5MockYaml = readFileSync(join(appRoot, 'ui5-mock.yaml'), 'utf8');
        expect(packageJson.devDependencies?.['@sap-ux/mockserver-data-generator']).toBe(
            'file:.mockserver-data-generator-dev/packages/generator.tgz'
        );
        expect(packageJson.scripts?.['start-mock']).toMatch(
            /^mockserver-data-generator start -- fiori run --config \.\/ui5-mock\.yaml/u
        );
        expect(ui5MockYaml.match(/name: sap-fe-mockserver/gu)).toHaveLength(1);
        expect(ui5MockYaml).toMatch(/name: ['"]@sap-ux\/mockserver-data-generator\/fe-mockserver['"]/u);
        expect(ui5MockYaml).toContain('mode: auto');
    });

    test('preserves an existing start-mock command when the config writer also sees start', async () => {
        const appRoot = temporaryDirectory();
        cpSync(fioriFixture, appRoot, { recursive: true });
        const packageJsonPath = join(appRoot, 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
            scripts: Record<string, string>;
        };
        const original =
            'fiori run --config ./ui5-mock.yaml --open "test/flpSandbox.html?sap-client=902&sap-ui-xx-viewCache=false"';
        packageJson.scripts['start-mock'] = original;
        writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);

        await configureFioriApplication({
            appRoot,
            webappPath: join(appRoot, 'webapp'),
            generatorSpec: 'file:.mockserver-data-generator-dev/packages/generator.tgz'
        });

        const configured = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
            scripts: Record<string, string>;
        };
        expect(configured.scripts['start-mock']).toBe(`mockserver-data-generator start -- ${original}`);
    });

    test.each(['../escape', '/absolute/path', 'package/../../escape'])('rejects unsafe archive entry %s', (entry) => {
        expect(() => assertSafeArchiveEntry(entry)).toThrow(/unsafe archive entry/i);
    });

    test.each(['package/link -> target', 'package/hard link to target'])(
        'rejects symbolic or hard-linked archive metadata %s',
        (line) => {
            expect(() => assertSafeArchiveEntry('package/link', line)).toThrow(/link/i);
        }
    );

    test('validates package identity, build output, inventory, bytes, and checksum', () => {
        const archive = makePackageTarball();
        const artifact = inspectPackedArtifact(archive, '@sap-ux/mockserver-data-generator');

        expect(artifact.packageName).toBe('@sap-ux/mockserver-data-generator');
        expect(artifact.version).toBe('0.1.0');
        expect(artifact.entries).toContain('package/dist/index.js');
        expect(artifact.entries).toContain('package/dist/cli.js');
        expect(artifact.bytes).toBeGreaterThan(0);
        expect(artifact.sha256).toMatch(/^[a-f\d]{64}$/);
    });

    test('normalizes semantically identical packed manifests before hashing', async () => {
        const first = makePackageTarball();
        const second = makePackageTarball({ reverseDependencies: true });
        expect(sha256File(first)).not.toBe(sha256File(second));

        const artifacts =
            (await import('../../../../../scripts/mockserver-data-generator-dev-kit/lib/artifacts.mjs')) as unknown as {
                normalizePackedArtifact?: (archivePath: string, manager: { command: string; prefix: string[] }) => void;
            };
        expect(typeof artifacts.normalizePackedArtifact).toBe('function');
        artifacts.normalizePackedArtifact?.(first, { command: 'corepack', prefix: [toolsPackageManager] });
        artifacts.normalizePackedArtifact?.(second, { command: 'corepack', prefix: [toolsPackageManager] });

        expect(sha256File(first)).toBe(sha256File(second));
    });

    test('creates identical kit archives from equivalent trees with different timestamps', async () => {
        const root = temporaryDirectory();
        const firstRoot = join(root, 'first');
        const secondRoot = join(root, 'second');
        for (const sourceRoot of [firstRoot, secondRoot]) {
            mkdirSync(join(sourceRoot, 'kit', 'packages'), { recursive: true });
            writeFileSync(join(sourceRoot, 'kit', 'README.md'), 'portable kit\n');
            writeFileSync(join(sourceRoot, 'kit', 'packages', 'generator.tgz'), 'package bytes');
        }
        const oldTimestamp = new Date('2020-01-01T00:00:00.000Z');
        const newTimestamp = new Date('2026-01-01T00:00:00.000Z');
        for (const item of ['kit/packages/generator.tgz', 'kit/packages', 'kit/README.md', 'kit']) {
            utimesSync(join(firstRoot, item), oldTimestamp, oldTimestamp);
            utimesSync(join(secondRoot, item), newTimestamp, newTimestamp);
        }

        const artifacts =
            (await import('../../../../../scripts/mockserver-data-generator-dev-kit/lib/artifacts.mjs')) as unknown as {
                createDeterministicArchive?: (sourceRoot: string, entryName: string, archivePath: string) => void;
            };
        expect(typeof artifacts.createDeterministicArchive).toBe('function');
        const firstArchive = join(root, 'first.tgz');
        const secondArchive = join(root, 'second.tgz');
        artifacts.createDeterministicArchive?.(firstRoot, 'kit', firstArchive);
        await new Promise((resolve) => setTimeout(resolve, 1_100));
        artifacts.createDeterministicArchive?.(secondRoot, 'kit', secondArchive);

        expect(sha256File(firstArchive)).toBe(sha256File(secondArchive));
    });

    test('rejects package-name mismatches and missing build output', () => {
        expect(() => inspectPackedArtifact(makePackageTarball(), '@example/wrong')).toThrow(/package name/i);
        expect(() =>
            inspectPackedArtifact(makePackageTarball({ includeDist: false }), '@sap-ux/mockserver-data-generator')
        ).toThrow(/build output/i);
        expect(() =>
            inspectPackedArtifact(makePackageTarball({ includeBin: false }), '@sap-ux/mockserver-data-generator')
        ).toThrow(/build output/i);
    });

    test('detects checksum mismatches', () => {
        const archive = makePackageTarball();
        const wrong = createHash('sha256').update('wrong').digest('hex');
        expect(() => verifyFileChecksum(archive, wrong)).toThrow(/checksum mismatch/i);
    });

    test('bundles the pilot model bridge into one independently executable file', () => {
        const root = temporaryDirectory();
        const pilot = join(root, 'pilot');
        const classifier = join(pilot, 'packages/mockgen-models/retrieval-model');
        const classifierHead = join(pilot, 'packages/mockgen-core/models');
        const sft = join(pilot, 'var/sft/onnx-export');
        for (const directory of [classifier, classifierHead, sft]) {
            mkdirSync(directory, { recursive: true });
        }
        writeFileSync(join(classifier, 'model_int8.onnx'), 'classifier');
        writeFileSync(join(classifier, 'vocab.txt'), 'vocabulary');
        writeFileSync(join(classifierHead, 'embedding-classifier-head.json'), '{"dim":384}\n');
        writeFileSync(join(sft, 'model_int8.onnx'), 'generator');
        writeFileSync(join(sft, 'tokenizer.json'), '{}\n');
        writeFileSync(
            join(sft, 'config.json'),
            '{"num_hidden_layers":30,"num_key_value_heads":3,"hidden_size":576,"num_attention_heads":9}\n'
        );
        const bundled = join(root, 'prepare-pilot-model-cache.mjs');
        const cache = join(root, 'cache');
        const manifest = join(root, 'model-manifest.json');

        bundleEntry(pilotBridgeEntry, bundled);
        execFileSync(process.execPath, [bundled, '--pilot-root', pilot, '--cache', cache, '--manifest-out', manifest], {
            encoding: 'utf8'
        });

        const modelManifest = JSON.parse(readFileSync(manifest, 'utf8')) as {
            components: Array<{ files: Array<{ role: string; path: string }> }>;
            revision: string;
        };
        const configurationArtifact = modelManifest.components
            .flatMap(({ files }) => files)
            .find(({ role }) => role === 'generation-config');
        const configuration = JSON.parse(
            readFileSync(join(cache, 'mockgen-pilot-int8', modelManifest.revision, configurationArtifact!.path), 'utf8')
        ) as { samplingOptions: { maxNewTokens: number } };
        expect(configuration.samplingOptions.maxNewTokens).toBe(300);
    });
});

describe('development kit manifest', () => {
    test('is stable and labels dirty source trees non-reproducible', () => {
        const manifest = createDevKitManifest({
            packages: [
                {
                    packageName: '@sap-ux/mockserver-data-generator',
                    version: '0.1.0',
                    filename: 'generator.tgz',
                    bytes: 10,
                    sha256: 'a'.repeat(64),
                    entries: ['package/package.json'],
                    source: { repository: 'SAP/open-ux-tools', commit: '1'.repeat(40), dirty: true }
                }
            ],
            installer: {
                filename: 'setup-local-fiori-app.mjs',
                bytes: 20,
                sha256: 'b'.repeat(64),
                sourcePackageVersion: '1.0.18'
            }
        });

        expect(manifest.reproducible).toBe(false);
        expect(fingerprintManifest(manifest)).toBe(fingerprintManifest(JSON.parse(JSON.stringify(manifest))));
        expect(readFileSync(makePackageTarball())).toBeInstanceOf(Buffer);
    });
});
