import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
    existsSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    symlinkSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const temporaryRoots: string[] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function runChecker(cwd: string, env: NodeJS.ProcessEnv = process.env) {
    return spawnSync(process.execPath, [join(packageRoot, 'scripts/check-package.mjs')], {
        cwd,
        encoding: 'utf8',
        env
    });
}

function fakePackage(
    files: Readonly<Record<string, string | Buffer>>,
    packageJson: Readonly<Record<string, unknown>> = {}
) {
    const root = mkdtempSync(join(tmpdir(), 'mockserver-data-generator-package-test-'));
    temporaryRoots.push(root);
    writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({
            name: '@sap-ux/mockserver-data-generator-test',
            version: '1.0.0',
            files: ['dist', '.mockgen-cache'],
            ...packageJson
        })
    );
    const publishedFiles = {
        'dist/index.js': 'export {};',
        'dist/fe-mockserver.cjs': 'module.exports = class Provider {};',
        ...files
    };
    for (const [path, content] of Object.entries(publishedFiles)) {
        const destination = join(root, path);
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination, content);
    }
    return root;
}

function modelManifest(overrides: Readonly<Record<string, unknown>> = {}) {
    return JSON.stringify({
        formatVersion: 1,
        bundleId: 'mockgen-test',
        revision: 'a'.repeat(64),
        lifecycle: 'preview',
        components: [
            {
                id: 'sft',
                kind: 'sft',
                version: '1.0.0',
                fingerprint: 'b'.repeat(64),
                files: [
                    {
                        role: 'weights',
                        path: 'sft/model.onnx',
                        bytes: 1024,
                        sha256: 'c'.repeat(64),
                        url: 'https://models.example.test/sft/model.onnx',
                        ...overrides
                    }
                ]
            }
        ],
        ...('revision' in overrides ? { revision: overrides.revision } : {})
    });
}

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { recursive: true, force: true });
    }
});

describe('published package boundary', () => {
    it('tests the exact runtime dependency version declared for consumers', () => {
        const packageJson: unknown = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
        const installedDependency: unknown = JSON.parse(
            readFileSync(join(packageRoot, 'node_modules', 'fast-xml-parser', 'package.json'), 'utf8')
        );
        if (!isRecord(packageJson) || !isRecord(packageJson.dependencies) || !isRecord(installedDependency)) {
            throw new Error('Package dependency metadata is missing');
        }

        expect(installedDependency.version).toBe(packageJson.dependencies['fast-xml-parser']);
    });

    it('exposes the package check as an explicit package script', () => {
        const packageJson: unknown = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
        if (!isRecord(packageJson) || !isRecord(packageJson.scripts)) {
            throw new Error('Package scripts are missing');
        }

        expect(packageJson.scripts['check:package']).toBe('node scripts/check-package.mjs');
    });

    it('publishes the operational documentation linked from the package README', () => {
        const packageJson: unknown = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
        if (!isRecord(packageJson) || !Array.isArray(packageJson.files)) {
            throw new Error('Package file allow-list is missing');
        }

        expect(packageJson.files).toContain('docs');
    });

    it('keeps every relative README link inside the published package', () => {
        const readme = readFileSync(join(packageRoot, 'README.md'), 'utf8');
        const relativeLinks = [...readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)]
            .map((match) => match[1])
            .filter((target): target is string => Boolean(target))
            .filter((target) => !target.startsWith('#') && !/^[a-z][a-z\d+.-]*:/iu.test(target))
            .map((target) => target.split('#', 1)[0]);
        const invalidLinks = relativeLinks.filter((target) => {
            const resolvedTarget = resolve(packageRoot, target);
            const packageRelativeTarget = relative(packageRoot, resolvedTarget);
            return (
                packageRelativeTarget.startsWith('..') ||
                isAbsolute(packageRelativeTarget) ||
                !existsSync(resolvedTarget) ||
                !lstatSync(resolvedTarget).isFile()
            );
        });

        expect(invalidLinks).toEqual([]);
    });

    it('enforces the documented internal dependency direction', () => {
        const sourceRoot = join(packageRoot, 'src');
        const layerRules: Readonly<Record<string, ReadonlySet<string>>> = {
            schema: new Set(['schema']),
            semantics: new Set(['schema', 'semantics', 'types']),
            generation: new Set(['generation', 'schema', 'semantics', 'types']),
            model: new Set(['model', 'types']),
            cache: new Set(['cache', 'types'])
        };
        const violations: string[] = [];
        for (const [layer, allowedTargets] of Object.entries(layerRules)) {
            const layerRoot = join(sourceRoot, layer);
            for (const entry of readdirSync(layerRoot, { withFileTypes: true })) {
                if (!entry.isFile() || !/\.[cm]?ts$/u.test(entry.name)) {
                    continue;
                }
                const sourcePath = join(layerRoot, entry.name);
                const source = readFileSync(sourcePath, 'utf8');
                const relativeImports = [...source.matchAll(/(?:from\s+|import\s*\()\s*['"](\.\.?\/[^'"]+)['"]/gu)];
                for (const match of relativeImports) {
                    const importTarget = match[1];
                    if (!importTarget) {
                        continue;
                    }
                    const targetFromSourceRoot = relative(sourceRoot, resolve(dirname(sourcePath), importTarget))
                        .split(sep)
                        .join('/');
                    const targetLayer = targetFromSourceRoot.split('/', 1)[0]?.replace(/\.[^.]+$/u, '');
                    if (!targetLayer || !allowedTargets.has(targetLayer)) {
                        violations.push(`${layer}/${entry.name} -> ${importTarget}`);
                    }
                }
            }
        }

        expect(violations).toEqual([]);
    });

    it('packs the current package below the size ceiling without forbidden artifacts', () => {
        const result = runChecker(packageRoot);

        expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
        const report: unknown = JSON.parse(result.stdout);
        if (!isRecord(report)) {
            throw new Error('Package check returned an invalid report');
        }
        expect(report.packageName).toBe('@sap-ux/mockserver-data-generator');
        expect(report.maximumBytes).toBe(5 * 1024 * 1024);
        expect(typeof report.files).toBe('number');
        expect(typeof report.bytes).toBe('number');
        expect(report.networkFree).toBe(true);
    });

    it.each([
        'dist/model.onnx',
        'dist/model.safetensors',
        'dist/checkpoint.pt',
        'dist/weights.bin',
        'dist/training.jsonl',
        'dist/index.js.map',
        '.mockgen-cache/generated.json',
        'dist/judge-results/provider-output.json'
    ])('rejects forbidden published artifact %s', (path) => {
        const result = runChecker(fakePackage({ [path]: 'forbidden' }));

        expect(result.status).toBe(1);
        expect(result.stderr).toContain(path);
    });

    it('rejects packed text containing an absolute developer path', () => {
        const result = runChecker(
            fakePackage({ 'dist/config.js': "export const source = '/Users/developer/private/mockgen/model.onnx';" })
        );

        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/absolute developer path/i);
    });

    it('checks packed bytes instead of source restored by a postpack script', () => {
        const result = runChecker(
            fakePackage(
                {
                    'dist/config.js': "export const source = 'safe';",
                    'dist/index.js': 'export {};',
                    'dist/fe-mockserver.cjs': 'module.exports = class Provider {};',
                    'prepack.mjs':
                        "import { writeFileSync } from 'node:fs'; writeFileSync('dist/config.js', \"export const source = '/Users/developer/private/model.onnx';\");",
                    'postpack.mjs':
                        "import { writeFileSync } from 'node:fs'; writeFileSync('dist/config.js', \"export const source = 'safe';\");"
                },
                {
                    files: ['dist'],
                    scripts: { prepack: 'node prepack.mjs', postpack: 'node postpack.mjs' }
                }
            )
        );

        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/absolute developer path/i);
    });

    it('checks network access from the packed entrypoint instead of the restored source', () => {
        const result = runChecker(
            fakePackage(
                {
                    'dist/index.js': 'export {};',
                    'dist/fe-mockserver.cjs': 'module.exports = class Provider {};',
                    'prepack.mjs':
                        "import { writeFileSync } from 'node:fs'; writeFileSync('dist/index.js', \"import { get } from 'node:http'; const request = get('http://127.0.0.1:9'); await new Promise((resolve) => request.once('error', resolve));\");",
                    'postpack.mjs':
                        "import { writeFileSync } from 'node:fs'; writeFileSync('dist/index.js', 'export {};');"
                },
                {
                    files: ['dist'],
                    scripts: { prepack: 'node prepack.mjs', postpack: 'node postpack.mjs' }
                }
            )
        );

        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/network_access_during_public_construction/i);
    });

    it.each([
        [
            'named HTTP import',
            "import { get } from 'node:http'; const request = get('http://127.0.0.1:9'); await new Promise((resolve) => request.once('error', resolve));"
        ],
        ['DNS promises', "import dns from 'node:dns'; await dns.promises.lookup('127.0.0.1');"],
        [
            'HTTP/2',
            "import http2 from 'node:http2'; const session = http2.connect('http://127.0.0.1:9'); await new Promise((resolve) => session.once('error', resolve));"
        ],
        [
            'UDP sockets',
            "import dgram from 'node:dgram'; const socket = dgram.createSocket('udp4'); await new Promise((resolve) => socket.bind(0, '127.0.0.1', resolve)); socket.close();"
        ]
    ])('blocks %s during packed public construction', (_description, publicEntry) => {
        const result = runChecker(
            fakePackage({
                'dist/index.js': publicEntry,
                'dist/fe-mockserver.cjs': 'module.exports = class Provider {};'
            })
        );

        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/network_access_during_public_construction/i);
    });

    it.each([
        '/root/private/mockgen/model.onnx',
        'C:/Users/developer/private/mockgen/model.onnx',
        String.raw`C:\\Users\\developer\\private\\mockgen\\model.onnx`,
        String.raw`\\\\build-server\\private-share\\mockgen\\model.onnx`
    ])('rejects packed text containing developer-local path %s', (developerPath) => {
        const result = runChecker(
            fakePackage({ 'dist/config.js': `export const source = ${JSON.stringify(developerPath)};` })
        );

        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/absolute developer path/i);
    });

    it('uses the inherited package-manager executable when pnpm is not on PATH', () => {
        const result = runChecker(packageRoot, { ...process.env, PATH: '/usr/bin:/bin' });

        expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
    });

    it('confirms pnpm omits symbolic links from the archive', () => {
        const root = fakePackage({
            'dist/index.js': 'export {};',
            'dist/fe-mockserver.cjs': 'module.exports = class Provider {};',
            'outside.txt': 'not part of the package'
        });
        symlinkSync(join(root, 'outside.txt'), join(root, 'dist', 'linked.txt'));

        const result = runChecker(root);

        expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
        expect(JSON.parse(result.stdout)).toMatchObject({ files: 3 });
    });

    it('rejects a compressed tarball above the five MiB ceiling', () => {
        const result = runChecker(fakePackage({ 'dist/random.dat': randomBytes(5 * 1024 * 1024) }));

        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/5 MiB/i);
    });

    it.each([
        ['mutable revision', { revision: 'main' }],
        ['missing byte size', { bytes: undefined }],
        ['invalid SHA-256', { sha256: 'not-a-checksum' }]
    ])('rejects a published model manifest with %s', (_description, overrides) => {
        const result = runChecker(fakePackage({ 'dist/model-manifest.json': modelManifest(overrides) }));

        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/model manifest/i);
    });
});
