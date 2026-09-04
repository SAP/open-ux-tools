import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import {
    assertSafeArchiveEntry,
    inspectPackedArtifact,
    verifyFileChecksum
} from '../../../../../scripts/mockserver-data-generator-dev-kit/lib/artifacts.mjs';
import {
    createDevKitManifest,
    fingerprintManifest
} from '../../../../../scripts/mockserver-data-generator-dev-kit/lib/manifest.mjs';

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
    const directory = mkdtempSync(join(tmpdir(), 'mockgen-dev-kit-test-'));
    temporaryDirectories.push(directory);
    return directory;
}

function makePackageTarball(options?: { includeDist?: boolean; packageName?: string }): string {
    const root = temporaryDirectory();
    const packageRoot = join(root, 'package');
    mkdirSync(join(packageRoot, 'dist'), { recursive: true });
    writeFileSync(
        join(packageRoot, 'package.json'),
        JSON.stringify({
            name: options?.packageName ?? '@sap-ux/mockserver-data-generator',
            version: '0.1.0',
            main: 'dist/index.js',
            exports: { '.': './dist/index.js' }
        })
    );
    if (options?.includeDist !== false) {
        writeFileSync(join(packageRoot, 'dist', 'index.js'), 'export const ok = true;\n');
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
        expect(artifact.bytes).toBeGreaterThan(0);
        expect(artifact.sha256).toMatch(/^[a-f\d]{64}$/);
    });

    test('rejects package-name mismatches and missing build output', () => {
        expect(() => inspectPackedArtifact(makePackageTarball(), '@example/wrong')).toThrow(/package name/i);
        expect(() =>
            inspectPackedArtifact(makePackageTarball({ includeDist: false }), '@sap-ux/mockserver-data-generator')
        ).toThrow(/build output/i);
    });

    test('detects checksum mismatches', () => {
        const archive = makePackageTarball();
        const wrong = createHash('sha256').update('wrong').digest('hex');
        expect(() => verifyFileChecksum(archive, wrong)).toThrow(/checksum mismatch/i);
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
