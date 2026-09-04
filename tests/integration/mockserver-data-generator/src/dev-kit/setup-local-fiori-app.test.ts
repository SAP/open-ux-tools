import { createHash } from 'node:crypto';
import {
    existsSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    realpathSync,
    readdirSync,
    rmSync,
    symlinkSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
    parseArguments,
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

function writeKit(root: string, version = '0.0.0', buildLabel = version): void {
    mkdirSync(join(root, 'packages'), { recursive: true });
    const packages = [
        ['@sap-ux/mockserver-data-generator', `mockserver-data-generator-${version}.tgz`],
        ['@sap-ux/fe-mockserver-core', `fe-mockserver-core-${version}.tgz`],
        ['@sap-ux/ui5-middleware-fe-mockserver', `ui5-middleware-fe-mockserver-${version}.tgz`]
    ].map(([packageName, filename]) => {
        const filePath = join(root, 'packages', filename);
        writeFileSync(filePath, `${packageName}@${buildLabel}`);
        return {
            packageName,
            version,
            filename,
            bytes: readFileSync(filePath).byteLength,
            sha256: sha256(filePath),
            source: {
                repository:
                    packageName === '@sap-ux/mockserver-data-generator' ? 'SAP/open-ux-tools' : 'SAP/open-ux-odata',
                commit: packageName === '@sap-ux/mockserver-data-generator' ? 'a'.repeat(40) : 'b'.repeat(40),
                dirty: false
            }
        };
    });
    writeFileSync(
        join(root, 'dev-kit-manifest.json'),
        `${JSON.stringify({ formatVersion: 1, reproducible: true, packages }, null, 2)}\n`
    );
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
    test('parses explicit learned-model inputs without enabling a network download', () => {
        expect(
            parseArguments([
                '--app',
                '/fiori-app',
                '--model-manifest',
                '/model/manifest.json',
                '--model-cache',
                '/model/cache',
                '--verify'
            ])
        ).toMatchObject({
            appRoot: '/fiori-app',
            modelManifestPath: '/model/manifest.json',
            modelCacheDirectory: '/model/cache',
            verify: true
        });
    });

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
        expect(installed.packages).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    packageName: '@sap-ux/mockserver-data-generator',
                    source: { repository: 'SAP/open-ux-tools', commit: 'a'.repeat(40), dirty: false }
                })
            ])
        );
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

    test('keeps the previous working installation when a development-kit upgrade fails', async () => {
        const app = temporaryDirectory('mockgen-upgrade-app-');
        const firstKit = temporaryDirectory('mockgen-upgrade-first-kit-');
        const secondKit = temporaryDirectory('mockgen-upgrade-second-kit-');
        writeApplication(app);
        writeKit(firstKit, '0.0.0', 'first-build');
        writeKit(secondKit, '0.0.0', 'second-build');
        let configuredRelease = 'first';
        const configure = async ({ appRoot }: { appRoot: string }): Promise<void> => {
            const packageJson = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')) as {
                scripts: Record<string, string>;
                mockgenRelease?: string;
            };
            packageJson.scripts['start-mock'] = 'fiori run --config ./ui5-mock.yaml';
            packageJson.mockgenRelease = configuredRelease;
            writeFileSync(join(appRoot, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
            writeFileSync(join(appRoot, 'ui5-mock.yaml'), `mockgenRelease: ${configuredRelease}\n`);
        };
        await setupLocalFioriApp({
            appRoot: app,
            kitRoot: firstKit,
            configure,
            runner: async () => undefined,
            verifyInstalled: () => ({ installed: true })
        });
        const workingPackageJson = readFileSync(join(app, 'package.json'), 'utf8');
        const workingYaml = readFileSync(join(app, 'ui5-mock.yaml'), 'utf8');
        const workingJournal = JSON.parse(
            readFileSync(join(app, '.mockserver-data-generator-dev', 'recovery.json'), 'utf8')
        ) as {
            kit: { packages: Array<{ packageName: string; specification: string }> };
        };
        const workingGenerator = workingJournal.kit.packages.find(
            ({ packageName }) => packageName === '@sap-ux/mockserver-data-generator'
        );
        expect(workingGenerator).toBeDefined();
        const workingGeneratorPath = join(app, workingGenerator!.specification.slice('file:'.length));
        configuredRelease = 'second';
        const upgradeRunner = jest
            .fn<() => Promise<void>>()
            .mockRejectedValueOnce(new Error('upgrade failed'))
            .mockResolvedValueOnce(undefined);

        await expect(
            setupLocalFioriApp({
                appRoot: app,
                kitRoot: secondKit,
                configure,
                runner: upgradeRunner,
                verifyInstalled: () => ({ installed: true })
            })
        ).rejects.toThrow(/upgrade failed/i);

        expect(upgradeRunner).toHaveBeenCalledTimes(2);
        expect(readFileSync(join(app, 'package.json'), 'utf8')).toBe(workingPackageJson);
        expect(readFileSync(join(app, 'ui5-mock.yaml'), 'utf8')).toBe(workingYaml);
        expect(readFileSync(workingGeneratorPath, 'utf8')).toBe('@sap-ux/mockserver-data-generator@first-build');
        expect(
            JSON.parse(readFileSync(join(app, '.mockserver-data-generator-dev', 'recovery.json'), 'utf8')) as unknown
        ).toEqual(workingJournal);
    });

    test('upgrades to newer local artifacts while preserving the original restore point', async () => {
        const app = temporaryDirectory('mockgen-successful-upgrade-app-');
        const firstKit = temporaryDirectory('mockgen-successful-upgrade-first-kit-');
        const secondKit = temporaryDirectory('mockgen-successful-upgrade-second-kit-');
        writeApplication(app);
        writeKit(firstKit, '0.0.1');
        writeKit(secondKit, '0.0.2');
        const originalPackageJson = readFileSync(join(app, 'package.json'), 'utf8');
        const configure = async ({
            appRoot,
            generatorSpec
        }: {
            appRoot: string;
            generatorSpec: string;
        }): Promise<void> => {
            const packageJson = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')) as {
                scripts: Record<string, string>;
                devDependencies?: Record<string, string>;
            };
            packageJson.scripts['start-mock'] = 'fiori run --config ./ui5-mock.yaml';
            packageJson.devDependencies = { '@sap-ux/mockserver-data-generator': generatorSpec };
            writeFileSync(join(appRoot, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
            writeFileSync(join(appRoot, 'ui5-mock.yaml'), `generator: ${generatorSpec}\n`);
        };
        const runner = jest.fn(async () => undefined);
        await setupLocalFioriApp({
            appRoot: app,
            kitRoot: firstKit,
            configure,
            runner,
            verifyInstalled: () => ({ installed: true })
        });

        const upgraded = await setupLocalFioriApp({
            appRoot: app,
            kitRoot: secondKit,
            configure,
            runner,
            verifyInstalled: () => ({ installed: true })
        });

        expect(upgraded.packages).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    packageName: '@sap-ux/mockserver-data-generator',
                    version: '0.0.2',
                    specification: expect.stringContaining('mockserver-data-generator-0.0.2.tgz')
                })
            ])
        );
        const journal = JSON.parse(
            readFileSync(join(app, '.mockserver-data-generator-dev', 'recovery.json'), 'utf8')
        ) as { files: Record<string, { content: string }> };
        expect(journal.files['package.json'].content).toBe(originalPackageJson);

        await setupLocalFioriApp({ appRoot: app, kitRoot: secondKit, restore: true, runner });
        expect(readFileSync(join(app, 'package.json'), 'utf8')).toBe(originalPackageJson);
        expect(existsSync(join(app, 'ui5-mock.yaml'))).toBe(false);
        expect(existsSync(join(app, '.mockserver-data-generator-dev'))).toBe(false);
    });

    test('can restore the original application after dependency rollback for an upgrade fails', async () => {
        const app = temporaryDirectory('mockgen-upgrade-recovery-app-');
        const firstKit = temporaryDirectory('mockgen-upgrade-recovery-first-kit-');
        const secondKit = temporaryDirectory('mockgen-upgrade-recovery-second-kit-');
        writeApplication(app);
        writeKit(firstKit, '0.0.1');
        writeKit(secondKit, '0.0.2');
        const originalPackageJson = readFileSync(join(app, 'package.json'), 'utf8');
        let configuredRelease = 'first';
        const configure = async ({ appRoot }: { appRoot: string }): Promise<void> => {
            const packageJson = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')) as {
                scripts: Record<string, string>;
                mockgenRelease?: string;
            };
            packageJson.scripts['start-mock'] = 'fiori run --config ./ui5-mock.yaml';
            packageJson.mockgenRelease = configuredRelease;
            writeFileSync(join(appRoot, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
            writeFileSync(join(appRoot, 'ui5-mock.yaml'), `mockgenRelease: ${configuredRelease}\n`);
        };
        await setupLocalFioriApp({
            appRoot: app,
            kitRoot: firstKit,
            configure,
            runner: async () => undefined,
            verifyInstalled: () => ({ installed: true })
        });
        const workingPackageJson = readFileSync(join(app, 'package.json'), 'utf8');
        configuredRelease = 'second';
        const failedUpgradeRunner = jest
            .fn<() => Promise<void>>()
            .mockRejectedValueOnce(new Error('upgrade failed'))
            .mockRejectedValueOnce(new Error('upgrade dependency rollback failed'));

        await expect(
            setupLocalFioriApp({
                appRoot: app,
                kitRoot: secondKit,
                configure,
                runner: failedUpgradeRunner,
                verifyInstalled: () => ({ installed: true })
            })
        ).rejects.toThrow(/upgrade failed/i);

        expect(readFileSync(join(app, 'package.json'), 'utf8')).toBe(workingPackageJson);
        expect(
            JSON.parse(readFileSync(join(app, '.mockserver-data-generator-dev', 'recovery.json'), 'utf8')) as unknown
        ).toEqual(
            expect.objectContaining({
                status: 'upgrade-rollback-failed',
                dependencyRollbackError: 'upgrade dependency rollback failed'
            })
        );

        const restored = await setupLocalFioriApp({
            appRoot: app,
            kitRoot: secondKit,
            restore: true,
            runner: async () => undefined
        });
        expect(restored.status).toBe('restored');
        expect(readFileSync(join(app, 'package.json'), 'utf8')).toBe(originalPackageJson);
        expect(existsSync(join(app, 'ui5-mock.yaml'))).toBe(false);
        expect(existsSync(join(app, '.mockserver-data-generator-dev'))).toBe(false);
    });

    test('installs the pinned native runtime and configures a verified offline learned model', async () => {
        const app = temporaryDirectory('mockgen-learned-app-');
        const kit = temporaryDirectory('mockgen-learned-kit-');
        const model = temporaryDirectory('mockgen-learned-model-');
        const manifestPath = join(model, 'model-manifest.json');
        const cacheDirectory = join(model, 'cache');
        writeApplication(app);
        writeKit(kit);
        mkdirSync(cacheDirectory);
        writeFileSync(
            manifestPath,
            JSON.stringify({
                components: [
                    { runtime: { package: 'onnxruntime-node', version: '1.24.3' } },
                    { runtime: { package: 'onnxruntime-node', version: '1.24.3' } }
                ]
            })
        );
        const runner = jest.fn(async (_request: unknown): Promise<void> => undefined);
        const configure = jest.fn(async (_options: unknown): Promise<void> => undefined);
        const runCanary = jest.fn(
            async (
                _appRoot: string,
                _options?: { expectedLearned?: boolean }
            ): Promise<{ integrationVerified: true; learnedRuntimeVerified: true }> => ({
                integrationVerified: true,
                learnedRuntimeVerified: true
            })
        );
        const canonicalManifestPath = realpathSync(manifestPath);
        const canonicalCacheDirectory = realpathSync(cacheDirectory);

        const installed = await setupLocalFioriApp({
            appRoot: app,
            kitRoot: kit,
            modelManifestPath: manifestPath,
            modelCacheDirectory: cacheDirectory,
            verify: true,
            runner,
            configure,
            verifyInstalled: () => ({ installed: true }),
            runCanary
        });

        expect(installed).toMatchObject({ status: 'installed', modelVerified: true });
        const journal = JSON.parse(
            readFileSync(join(app, '.mockserver-data-generator-dev', 'recovery.json'), 'utf8')
        ) as { model: Record<string, unknown> };
        expect(journal.model).toEqual({
            manifestPath: canonicalManifestPath,
            manifestSha256: sha256(canonicalManifestPath),
            cacheDirectory: canonicalCacheDirectory,
            runtimeSpec: 'onnxruntime-node@1.24.3'
        });
        expect(configure).toHaveBeenCalledWith(
            expect.objectContaining({
                model: expect.objectContaining({
                    manifestPath: canonicalManifestPath,
                    cacheDirectory: canonicalCacheDirectory,
                    offline: true
                })
            })
        );
        expect(runner).toHaveBeenCalledWith(
            expect.objectContaining({ args: expect.arrayContaining(['--save-exact', 'onnxruntime-node@1.24.3']) })
        );
        expect(runCanary).toHaveBeenCalledWith(expect.any(String), { expectedLearned: true });
        expect(runner).toHaveBeenCalledWith(
            expect.objectContaining({
                command: process.execPath,
                args: expect.arrayContaining([
                    'verify',
                    '--manifest',
                    canonicalManifestPath,
                    '--cache',
                    canonicalCacheDirectory
                ])
            })
        );
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

    test('retries dependency reconciliation after installation and automatic rollback both fail', async () => {
        const app = temporaryDirectory('mockgen-rollback-retry-app-');
        const kit = temporaryDirectory('mockgen-rollback-retry-kit-');
        writeApplication(app);
        writeKit(kit);
        const original = readFileSync(join(app, 'package.json'), 'utf8');
        const configure = async ({ appRoot }: { appRoot: string }): Promise<void> => {
            writeFileSync(join(appRoot, 'package.json'), '{"changed":true}\n');
            writeFileSync(join(appRoot, 'ui5-mock.yaml'), 'changed: true\n');
        };
        const failedRunner = jest
            .fn<() => Promise<void>>()
            .mockRejectedValueOnce(new Error('install failed'))
            .mockRejectedValueOnce(new Error('automatic dependency rollback failed'));

        await expect(
            setupLocalFioriApp({
                appRoot: app,
                kitRoot: kit,
                configure,
                verifyInstalled: () => ({ installed: true }),
                runner: failedRunner
            })
        ).rejects.toThrow(/install failed/i);
        expect(readFileSync(join(app, 'package.json'), 'utf8')).toBe(original);
        expect(existsSync(join(app, 'ui5-mock.yaml'))).toBe(false);
        expect(
            JSON.parse(readFileSync(join(app, '.mockserver-data-generator-dev', 'recovery.json'), 'utf8'))
        ).toMatchObject({
            status: 'rolled-back',
            dependencyRollbackError: 'automatic dependency rollback failed'
        });

        const retryRunner = jest.fn(async () => undefined);
        const restored = await setupLocalFioriApp({
            appRoot: app,
            kitRoot: kit,
            restore: true,
            runner: retryRunner
        });

        expect(restored.status).toBe('restored');
        expect(retryRunner).toHaveBeenCalledTimes(1);
        expect(readFileSync(join(app, 'package.json'), 'utf8')).toBe(original);
        expect(existsSync(join(app, '.mockserver-data-generator-dev'))).toBe(false);
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
