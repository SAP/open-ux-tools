import { jest } from '@jest/globals';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import type { PackageInfo } from '@sap-ux/nodejs-utils';
import type { Manifest } from '@sap-ux/project-access';
import type { FLPConfigAnswers } from '@sap-ux/flp-config-inquirer';

const __dirname = join(fileURLToPath(import.meta.url), '..');

const foundGenExts: Partial<PackageInfo>[] = [];

const mockIsExtensionInstalled = jest.fn();
const mockSendTelemetry = jest.fn();

// Pre-import @sap-ux/i18n before mocking to get real implementations
const realI18n = await import('@sap-ux/i18n');
const mockCreatePropertiesI18nEntries = jest.fn<typeof realI18n.createPropertiesI18nEntries>().mockImplementation(
    (...args) => realI18n.createPropertiesI18nEntries(...args)
);

jest.unstable_mockModule('@sap-ux/i18n', () => ({
    ...realI18n,
    createPropertiesI18nEntries: mockCreatePropertiesI18nEntries
}));

jest.unstable_mockModule('@sap-ux/nodejs-utils', () => ({
    findInstalledPackages: jest.fn(async () => foundGenExts),
    CommandRunner: jest.fn().mockImplementation(() => ({
        run: jest.fn()
    })),
    setGlobalRejectUnauthorized: jest.fn(),
    ProxyValidationStatus: { VALID: 'VALID', INVALID: 'INVALID', NOT_SET: 'NOT_SET' },
    validateProxySettings: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => {
    const mockLogWrapper = jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }));
    return {
        TelemetryHelper: {
            initTelemetrySettings: jest.fn(),
            createTelemetryData: jest.fn().mockReturnValue({
                OperatingSystem: 'CLI',
                Platform: 'darwin'
            })
        },
        sendTelemetry: mockSendTelemetry,
        isExtensionInstalled: mockIsExtensionInstalled,
        getHostEnvironment: () => 'CLI',
        hostEnvironment: { cli: 'CLI', bas: 'BAS' },
        YUI_EXTENSION_ID: 'SAPOSS.app-studio-toolkit',
        YUI_MIN_VER_FILES_GENERATED_MSG: '1.14.0',
        setYeomanEnvConflicterForce: jest.fn(),
        getDefaultTargetFolder: jest.fn(),
        isCommandRegistered: jest.fn(),
        getPackageScripts: jest.fn(),
        getBootstrapResourceUrls: jest.fn(),
        getFlpId: jest.fn(),
        getSemanticObject: jest.fn(),
        generateAppGenInfo: jest.fn(),
        DefaultLogger: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        },
        LogWrapper: mockLogWrapper
    };
});

// Dynamic imports after mock registration
const path = await import('node:path');
const yeomanTest = (await import('yeoman-test')).default;
const unset = (await import('lodash/unset')).default;
const get = (await import('lodash/get')).default;
const set = (await import('lodash/set')).default;
const { TestFixture } = await import('./fixtures');
const { default: FLPConfigGenerator } = await import('../src/app');
const { initI18n, t } = await import('../src/utils');
const { MessageType } = await import('@sap-devx/yeoman-ui-types');
const { assertInboundsHasConfig } = await import('./utils');
const { rimraf } = await import('rimraf');

const sapApp = 'sap.app';
const crossNavigation = 'crossNavigation';
const crossNavigationPropertyPath = [sapApp, crossNavigation];
const inboundsPropertyPath = [...crossNavigationPropertyPath, 'inbounds'];

/** Helper to create a temp directory with project files and return it */
function createTempProject(manifest: string, additionalFiles?: Record<string, string>): string {
    const tmpDir = fs.mkdtempSync(join(__dirname, 'test-output-'));
    const webappDir = join(tmpDir, 'webapp');
    fs.mkdirSync(webappDir, { recursive: true });

    if (manifest !== '') {
        fs.writeFileSync(join(webappDir, 'manifest.json'), manifest);
    }

    if (additionalFiles) {
        for (const [relPath, content] of Object.entries(additionalFiles)) {
            const fullPath = join(tmpDir, relPath);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, content);
        }
    }

    return tmpDir;
}

const originalCwd = process.cwd();

describe('flp-config generator', () => {
    const testFixture = new TestFixture();
    const flpConfigGeneratorPath = join(__dirname, '../../src/flp-config');
    const tempDirs: string[] = [];

    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
        mockCreatePropertiesI18nEntries.mockImplementation(
            (...args) => realI18n.createPropertiesI18nEntries(...args)
        );
    });

    afterAll(() => {
        process.chdir(originalCwd);
        for (const dir of tempDirs) {
            rimraf.sync(dir);
        }
    });

    function makeTempDir(manifest: string, additionalFiles?: Record<string, string>): string {
        const dir = createTempProject(manifest, additionalFiles);
        tempDirs.push(dir);
        return dir;
    }

    it('throw when webapp/manifest.json is missing', async () => {
        const appDir = makeTempDir(''); // no manifest written
        // Remove the empty manifest.json that was not written
        const manifestPath = join(appDir, 'webapp', 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            fs.unlinkSync(manifestPath);
        }

        await expect(
            yeomanTest
                .create(
                    FLPConfigGenerator,
                    {
                        resolved: flpConfigGeneratorPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .run()
        ).rejects.toThrow(t('error.noManifest', { path: path.resolve(join(appDir, 'webapp/manifest.json')) }));
    });

    it('throw when manifest[sap.app] is missing', async () => {
        const existingManifest = testFixture.getContents('projectInvalidManifest/webapp/manifest.json');
        const appDir = makeTempDir(existingManifest);

        await expect(
            yeomanTest
                .create(
                    FLPConfigGenerator,
                    {
                        resolved: flpConfigGeneratorPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .run()
        ).rejects.toThrow(t('error.sapNotDefined'));
    });

    it('inbound key exists - overwrite: false', async () => {
        const existingManifest = testFixture.getContents('project/webapp/manifest.json');
        const appDir = makeTempDir(existingManifest);

        const exitImpl = process.exit;
        process.exit = jest.fn((code: any) => code as never);

        await expect(
            yeomanTest
                .create(
                    FLPConfigGenerator,
                    {
                        resolved: flpConfigGeneratorPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .withPrompts({
                    semanticObject: 'com-fiori-tools-travel',
                    action: 'inbound',
                    title: 'title1',
                    subTitle: 'subtitle1',
                    overwrite: false
                } as FLPConfigAnswers)
                .run()
        ).resolves.not.toThrow();
        expect(existingManifest).toBe(
            fs.readFileSync(join(appDir, 'webapp/manifest.json')).toString()
        );
        expect(process.exit).toHaveBeenCalledWith(0);
        process.exit = exitImpl;
    });

    it('inbound key exists - overwrite: true', async () => {
        const existingManifest = testFixture.getContents('project/webapp/manifest.json');
        const appDir = makeTempDir(existingManifest);
        const answers: FLPConfigAnswers = {
            semanticObject: 'com-fiori-tools-travel',
            action: 'inbound',
            title: '{{com-fiori-tools-travel-inbound.flpTitle}}',
            overwrite: true
        };

        await expect(
            yeomanTest
                .create(
                    FLPConfigGenerator,
                    {
                        resolved: flpConfigGeneratorPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .withPrompts({
                    s4Continue: true,
                    ...answers
                })
                .run()
        ).resolves.not.toThrow();

        const changedManifest: Manifest = JSON.parse(
            fs.readFileSync(join(appDir, 'webapp/manifest.json')).toString()
        );
        expect(changedManifest).toBeDefined();
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers);
    });

    it('inbound key exists - overwrite silently with option', async () => {
        const showInformationSpy = jest.fn();
        const mockAppWizard = {
            showInformation: showInformationSpy,
            setHeaderTitle: jest.fn()
        };
        mockIsExtensionInstalled.mockImplementation(() => {
            return true;
        });
        const existingManifest = testFixture.getContents('project/webapp/manifest.json');
        const appDir = makeTempDir(existingManifest);
        const answers: FLPConfigAnswers = {
            semanticObject: 'com-fiori-tools-travel',
            action: 'inbound',
            title: '{{com-fiori-tools-travel-inbound.flpTitle}}',
            overwrite: true
        };

        await expect(
            yeomanTest
                .create(
                    FLPConfigGenerator,
                    {
                        resolved: flpConfigGeneratorPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .withOptions({ overwrite: true, appWizard: mockAppWizard, launchFlpConfigAsSubGenerator: false })
                .withPrompts(answers)
                .run()
        ).resolves.not.toThrow();

        const changedManifest: Manifest = JSON.parse(
            fs.readFileSync(join(appDir, 'webapp/manifest.json')).toString()
        );
        expect(changedManifest).not.toBeUndefined();
        expect(showInformationSpy).toHaveBeenCalledWith(t('info.filesGenerated'), MessageType.notification);
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers);
    });

    it('adds `crossnavigation` config if none exists', async () => {
        const existingManifest: Manifest = JSON.parse(testFixture.getContents('project/webapp/manifest.json'));
        mockSendTelemetry.mockRejectedValueOnce(new Error('Telemetry error'));
        unset(existingManifest, crossNavigationPropertyPath);
        const appDir = makeTempDir(JSON.stringify(existingManifest));
        const answers: FLPConfigAnswers = {
            semanticObject: 'so1',
            action: 'action1',
            title: '{{so1-action1.flpTitle}}',
            subTitle: '{{so1-action1.flpSubtitle}}'
        };

        await expect(
            yeomanTest
                .create(
                    FLPConfigGenerator,
                    {
                        resolved: flpConfigGeneratorPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .withPrompts(answers)
                .run()
        ).resolves.not.toThrow();

        const changedManifest = JSON.parse(
            fs.readFileSync(join(appDir, 'webapp/manifest.json')).toString()
        );
        expect(changedManifest).not.toBeUndefined();
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers);
    });

    it('adds `crossNavigation.inbounds` config if none exists', async () => {
        const existingManifest = JSON.parse(testFixture.getContents('project/webapp/manifest.json'));
        unset(existingManifest, inboundsPropertyPath);
        const appDir = makeTempDir(JSON.stringify(existingManifest));
        const answers: FLPConfigAnswers = {
            semanticObject: 'so1',
            action: 'action1',
            title: '{{so1-action1.flpTitle}}'
        };

        await expect(
            yeomanTest
                .create(
                    FLPConfigGenerator,
                    {
                        resolved: flpConfigGeneratorPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .withPrompts(answers)
                .run()
        ).resolves.not.toThrow();

        const changedManifest: Manifest = JSON.parse(
            fs.readFileSync(join(appDir, 'webapp/manifest.json')).toString()
        );
        expect(changedManifest).not.toBeUndefined();
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers);
    });

    it('adds `crossNavigation.inbounds` when `crossNavigation.inbounds` is empty', async () => {
        const existingManifest = JSON.parse(testFixture.getContents('project/webapp/manifest.json'));
        set(existingManifest, inboundsPropertyPath, {});
        const appDir = makeTempDir(JSON.stringify(existingManifest));
        const answers: FLPConfigAnswers = {
            semanticObject: 'so1',
            action: 'action1',
            title: '{{so1-action1.flpTitle}}'
        };

        await expect(
            yeomanTest
                .create(
                    FLPConfigGenerator,
                    {
                        resolved: flpConfigGeneratorPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .withPrompts(answers)
                .run()
        ).resolves.not.toThrow();

        const changedManifest: Manifest = JSON.parse(
            fs.readFileSync(join(appDir, 'webapp/manifest.json')).toString()
        );
        expect(changedManifest).not.toBeUndefined();
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers);
    });

    it('adds optional `subTitle`, updates i18n file if present', async () => {
        const existingManifest = JSON.parse(testFixture.getContents('project/webapp/manifest.json'));
        const existingi18n = testFixture.getContents('project/webapp/i18n/i18n.properties');

        set(existingManifest, inboundsPropertyPath, {});
        const appDir = makeTempDir(JSON.stringify(existingManifest), {
            'webapp/i18n/i18n.properties': existingi18n
        });
        const answers: FLPConfigAnswers = {
            semanticObject: 'so1',
            action: 'action1',
            title: 'title1',
            subTitle: 'subtitle1'
        };

        await expect(
            yeomanTest
                .create(
                    FLPConfigGenerator,
                    {
                        resolved: flpConfigGeneratorPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .withPrompts(answers)
                .run()
        ).resolves.not.toThrow();

        const changedManifest: Manifest = JSON.parse(
            fs.readFileSync(join(appDir, 'webapp/manifest.json')).toString()
        );
        expect(changedManifest).not.toBeUndefined();
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers, true);

        const i18nContent = fs.readFileSync(join(appDir, 'webapp/i18n/i18n.properties')).toString();
        expect(i18nContent).toContain(`${answers.semanticObject}-${answers.action}.flpTitle=${answers.title}`);
        expect(i18nContent).toContain(`${answers.semanticObject}-${answers.action}.flpSubtitle=${answers.subTitle}`);
    });

    it('adds flp-config, updates i18n file using bundle reference', async () => {
        const existingManifest = JSON.parse(testFixture.getContents('projectWithI18nBundle/app1/webapp/manifest.json'));
        const existingi18n = testFixture.getContents('project/webapp/i18n/i18n.properties');

        set(existingManifest, inboundsPropertyPath, {});
        const appDir = makeTempDir(JSON.stringify(existingManifest), {
            'webapp/i18n/i18n.properties': existingi18n
        });
        const answers: FLPConfigAnswers = {
            semanticObject: 'so1',
            action: 'action1',
            title: 'title1',
            subTitle: 'subtitle1'
        };

        await expect(
            yeomanTest
                .create(
                    FLPConfigGenerator,
                    {
                        resolved: flpConfigGeneratorPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .withPrompts(answers)
                .run()
        ).resolves.not.toThrow();

        const changedManifest: Manifest = JSON.parse(
            fs.readFileSync(join(appDir, 'webapp/manifest.json')).toString()
        );
        expect(changedManifest).not.toBeUndefined();
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers, true);

        const i18nContent = fs.readFileSync(join(appDir, 'webapp/i18n/i18n.properties')).toString();
        expect(i18nContent).toContain(`${answers.semanticObject}-${answers.action}.flpTitle=${answers.title}`);
        expect(i18nContent).toContain(`${answers.semanticObject}-${answers.action}.flpSubtitle=${answers.subTitle}`);
    });

    it('shows error when createPropertiesI18nEntries fails', async () => {
        const existingManifest = JSON.parse(testFixture.getContents('projectWithI18nBundle/app1/webapp/manifest.json'));
        const existingi18n = testFixture.getContents('project/webapp/i18n/i18n.properties');
        mockCreatePropertiesI18nEntries.mockRejectedValueOnce(new Error('i18n error'));
        const showWarningSpy = jest.fn();
        const mockAppWizard = {
            showWarning: showWarningSpy,
            setHeaderTitle: jest.fn()
        };
        set(existingManifest, inboundsPropertyPath, {});
        const appDir = makeTempDir(JSON.stringify(existingManifest), {
            'webapp/i18n/i18n.properties': existingi18n
        });
        const answers: FLPConfigAnswers = {
            semanticObject: 'so1',
            action: 'action1',
            title: 'title1',
            subTitle: 'subtitle1'
        };

        await expect(
            yeomanTest
                .create(
                    FLPConfigGenerator,
                    {
                        resolved: flpConfigGeneratorPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .withPrompts(answers)
                .withOptions({ appWizard: mockAppWizard })
                .run()
        ).resolves.not.toThrow();

        expect(showWarningSpy).toHaveBeenCalledWith(
            t('warning.updatei18n', { path: join(appDir, 'webapp/i18n/i18n.properties') }),
            MessageType.notification
        );
    });
});
