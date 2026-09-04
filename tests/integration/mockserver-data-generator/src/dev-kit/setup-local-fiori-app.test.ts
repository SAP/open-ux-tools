import { createHash } from 'node:crypto';
import {
    existsSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    symlinkSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
    setupLocalFioriApp,
    validateApplicationRoot
} from '../../../../../scripts/mockserver-data-generator-dev-kit/setup-local-fiori-app.mjs';
import { detectPackageManager } from '../../../../../scripts/mockserver-data-generator-dev-kit/lib/package-manager.mjs';

const temporaryDirectories: string[] = [];

function temporaryDirectory(prefix: string): string {
    const directory = mkdtempSync(join(tmpdir(), prefix));
    temporaryDirectories.push(directory);
    return directory;
}

function writeApplication(root: string, packageName = 'test-fiori-app'): void {
    mkdirSync(join(root, 'webapp'), { recursive: true });
    writeFileSync(
        join(root, 'package.json'),
        `${JSON.stringify({ name: packageName, scripts: { start: 'fiori run' } }, null, 2)}\n`
    );
    writeFileSync(join(root, 'webapp', 'manifest.json'), '{"sap.app":{"id":"test.app"}}\n');
    writeFileSync(join(root, 'ui5.yaml'), "specVersion: '4.0'\nmetadata:\n  name: test.app\ntype: application\n");
    writeFileSync(join(root, 'package-lock.json'), '{"lockfileVersion":3}\n');
}

function sha256(filePath: string): string {
    return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function writeKit(root: string): void {
    mkdirSync(join(root, 'packages'), { recursive: true });
    const packages = [
        ['@sap-ux/mockserver-data-generator', 'mockserver-data-generator.tgz'],
        ['@sap-ux/fe-mockserver-core', 'fe-mockserver-core.tgz'],
        ['@sap-ux/ui5-middleware-fe-mockserver', 'ui5-middleware-fe-mockserver.tgz']
    ].map(([packageName, filename]) => {
        const filePath = join(root, 'packages', filename);
        writeFileSync(filePath, packageName);
        return {
            packageName,
            version: '0.0.0',
            filename,
            bytes: readFileSync(filePath).byteLength,
            sha256: sha256(filePath)
        };
    });
    writeFileSync(join(root, 'dev-kit-manifest.json'), `${JSON.stringify({ formatVersion: 1, packages }, null, 2)}\n`);
}

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

describe('application and package-manager validation', () => {
    test('requires an absolute Fiori application path', () => {
        expect(() => validateApplicationRoot('relative/app')).toThrow(/absolute/i);
    });

    test('rejects repositories, missing manifests, and symlinked roots', () => {
        const repository = temporaryDirectory('mockgen-repository-');
        writeApplication(repository, '@sap-ux/open-ux-tools-root');
        expect(() => validateApplicationRoot(repository)).toThrow(/repository/i);

        const missingManifest = temporaryDirectory('mockgen-missing-manifest-');
        writeApplication(missingManifest);
        rmSync(join(missingManifest, 'webapp', 'manifest.json'));
        expect(() => validateApplicationRoot(missingManifest)).toThrow(/manifest/i);

        const linkParent = temporaryDirectory('mockgen-link-parent-');
        const link = join(linkParent, 'linked-app');
        symlinkSync(repository, link);
        expect(() => validateApplicationRoot(link)).toThrow(/symbolic link/i);
    });

    test('detects npm and pnpm and rejects mixed lockfiles', () => {
        const app = temporaryDirectory('mockgen-package-manager-');
        writeApplication(app);
        expect(detectPackageManager(app).name).toBe('npm');
        writeFileSync(join(app, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
        expect(() => detectPackageManager(app)).toThrow(/multiple lockfiles/i);
        rmSync(join(app, 'package-lock.json'));
        expect(detectPackageManager(app).name).toBe('pnpm');
    });
});

describe('transactional local setup', () => {
    test('dry-run reports a plan without writing or invoking a package manager', async () => {
        const app = temporaryDirectory('mockgen-dry-run-app-');
        const kit = temporaryDirectory('mockgen-dry-run-kit-');
        writeApplication(app);
        writeKit(kit);
        const packageJsonBefore = readFileSync(join(app, 'package.json'), 'utf8');
        const runner = jest.fn(async () => undefined);

        const result = await setupLocalFioriApp({ appRoot: app, kitRoot: kit, dryRun: true, runner });

        expect(result.status).toBe('dry-run');
        expect(result.packages).toHaveLength(3);
        expect(readFileSync(join(app, 'package.json'), 'utf8')).toBe(packageJsonBefore);
        expect(existsSync(join(app, '.mockserver-data-generator-dev'))).toBe(false);
        expect(runner).not.toHaveBeenCalled();
    });

    test('rejects a symlinked recovery root before writing outside the application', async () => {
        const app = temporaryDirectory('mockgen-state-link-app-');
        const kit = temporaryDirectory('mockgen-state-link-kit-');
        const outside = temporaryDirectory('mockgen-state-link-outside-');
        writeApplication(app);
        writeKit(kit);
        symlinkSync(outside, join(app, '.mockserver-data-generator-dev'), 'dir');

        await expect(setupLocalFioriApp({ appRoot: app, kitRoot: kit, runner: async () => undefined })).rejects.toThrow(
            /symbolic link/i
        );
        expect(readdirSync(outside)).toEqual([]);
    });

    test('rejects a symlinked artifact directory before writing outside the application', async () => {
        const app = temporaryDirectory('mockgen-packages-link-app-');
        const kit = temporaryDirectory('mockgen-packages-link-kit-');
        const outside = temporaryDirectory('mockgen-packages-link-outside-');
        writeApplication(app);
        writeKit(kit);
        mkdirSync(join(app, '.mockserver-data-generator-dev'));
        symlinkSync(outside, join(app, '.mockserver-data-generator-dev', 'packages'), 'dir');

        await expect(setupLocalFioriApp({ appRoot: app, kitRoot: kit, runner: async () => undefined })).rejects.toThrow(
            /symbolic link/i
        );
        expect(readdirSync(outside)).toEqual([]);
    });

    test('installs local artifacts, keeps start-mock, and can restore original files', async () => {
        const app = temporaryDirectory('mockgen-install-app-');
        const kit = temporaryDirectory('mockgen-install-kit-');
        writeApplication(app);
        writeKit(kit);
        const originals = {
            packageJson: readFileSync(join(app, 'package.json'), 'utf8'),
            lockfile: readFileSync(join(app, 'package-lock.json'), 'utf8')
        };
        const runner = jest.fn(async ({ cwd, args }: { cwd: string; args: string[] }) => {
            if (args.includes('--save-dev')) {
                writeFileSync(join(cwd, 'package-lock.json'), '{"lockfileVersion":3,"installed":true}\n');
            }
        });
        const configure = jest.fn(async ({ appRoot, generatorSpec }: { appRoot: string; generatorSpec: string }) => {
            const packageJson = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8'));
            packageJson.scripts['start-mock'] = 'fiori run --config ./ui5-mock.yaml';
            packageJson.devDependencies = { '@sap-ux/mockserver-data-generator': generatorSpec };
            writeFileSync(join(appRoot, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
            writeFileSync(join(appRoot, 'ui5-mock.yaml'), 'mockDataGenerator: configured\n');
        });

        const installed = await setupLocalFioriApp({
            appRoot: app,
            kitRoot: kit,
            runner,
            configure,
            verifyInstalled: () => ({ installed: true })
        });
        expect(installed.status).toBe('installed');
        expect(configure).toHaveBeenCalledTimes(1);
        expect(runner).toHaveBeenCalledWith(
            expect.objectContaining({
                command: 'npm',
                cwd: installed.appRoot,
                args: expect.arrayContaining(['--save-dev'])
            })
        );
        expect(existsSync(join(app, '.mockserver-data-generator-dev', 'recovery.json'))).toBe(true);

        const restored = await setupLocalFioriApp({ appRoot: app, kitRoot: kit, restore: true, runner });
        expect(restored.status).toBe('restored');
        expect(readFileSync(join(app, 'package.json'), 'utf8')).toBe(originals.packageJson);
        expect(readFileSync(join(app, 'package-lock.json'), 'utf8')).toBe(originals.lockfile);
        expect(existsSync(join(app, 'ui5-mock.yaml'))).toBe(false);
        expect(existsSync(join(app, '.mockserver-data-generator-dev'))).toBe(false);
    });

    test('rolls back owned files when installation fails', async () => {
        const app = temporaryDirectory('mockgen-failure-app-');
        const kit = temporaryDirectory('mockgen-failure-kit-');
        writeApplication(app);
        writeKit(kit);
        const original = readFileSync(join(app, 'package.json'), 'utf8');
        const configure = async ({ appRoot }: { appRoot: string }) => {
            writeFileSync(join(appRoot, 'package.json'), '{"changed":true}\n');
            writeFileSync(join(appRoot, 'ui5-mock.yaml'), 'changed: true\n');
        };

        await expect(
            setupLocalFioriApp({
                appRoot: app,
                kitRoot: kit,
                configure,
                verifyInstalled: () => ({ installed: true }),
                runner: async () => {
                    throw new Error('install failed');
                }
            })
        ).rejects.toThrow(/install failed/i);
        expect(readFileSync(join(app, 'package.json'), 'utf8')).toBe(original);
        expect(existsSync(join(app, 'ui5-mock.yaml'))).toBe(false);
    });

    test('refuses restore after a developer edits an installer-owned file', async () => {
        const app = temporaryDirectory('mockgen-conflict-app-');
        const kit = temporaryDirectory('mockgen-conflict-kit-');
        writeApplication(app);
        writeKit(kit);
        const configure = async ({ appRoot }: { appRoot: string }) => {
            writeFileSync(join(appRoot, 'package.json'), '{"configured":true}\n');
            writeFileSync(join(appRoot, 'ui5-mock.yaml'), 'configured: true\n');
        };
        await setupLocalFioriApp({
            appRoot: app,
            kitRoot: kit,
            configure,
            runner: async () => undefined,
            verifyInstalled: () => ({ installed: true })
        });
        writeFileSync(join(app, 'package.json'), '{"developerEdit":true}\n');

        await expect(
            setupLocalFioriApp({ appRoot: app, kitRoot: kit, restore: true, runner: async () => undefined })
        ).rejects.toThrow(/changed after MockGen setup/i);
        expect(readFileSync(join(app, 'package.json'), 'utf8')).toContain('developerEdit');
    });
});
