import * as fs from 'fs';
import * as path from 'path';
import * as memfs from 'memfs';
import * as fioriGenShared from '@sap-ux/fiori-generator-shared';
import yeomanTest from 'yeoman-test';
import unset from 'lodash/unset';
import get from 'lodash/get';
import set from 'lodash/set';
import { TestFixture } from './fixtures';
import FLPConfigGenerator from '../src/app';
import { initI18n, t } from '../src/utils';
import * as sapUxi18n from '@sap-ux/i18n';
import { hostEnvironment, sendTelemetry } from '@sap-ux/fiori-generator-shared';
import { isS4Installed } from '@sap-ux/deploy-config-generator-shared';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import { assertInboundsHasConfig } from './utils';
import type { PackageInfo } from '@sap-ux/nodejs-utils';
import type { Manifest } from '@sap-ux/project-access';
import type { FLPConfigAnswers } from '@sap-ux/flp-config-inquirer';

jest.mock('fs', () => {
    const fsLib = jest.requireActual('fs');
    const Union = require('unionfs').Union;
    const vol = require('memfs').vol;
    const _fs = new Union().use(fsLib);
    _fs.constants = fsLib.constants;
    return _fs.use(vol as unknown as typeof fs);
});

jest.mock('process', () => ({
    chdir: (): void => {
        return;
    }
}));
const processMock = process as jest.Mocked<typeof process>;

let foundGenExts: Partial<PackageInfo>[] = [];

const sapApp = 'sap.app';
const crossNavigation = 'crossNavigation';
const crossNavigationPropertyPath = [sapApp, crossNavigation];
const inboundsPropertyPath = [...crossNavigationPropertyPath, 'inbounds'];

jest.mock('@sap-ux/nodejs-utils', () => ({
    ...(jest.requireActual('@sap-ux/nodejs-utils') as object),
    findInstalledPackages: jest.fn(async () => foundGenExts) // Prevents searching for extensions
}));

jest.mock('@sap-ux/fiori-generator-shared', () => {
    return {
        ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
        TelemetryHelper: {
            initTelemetrySettings: jest.fn(),
            createTelemetryData: jest.fn().mockReturnValue({
                OperatingSystem: 'CLI',
                Platform: 'darwin'
            })
        },
        sendTelemetry: jest.fn(),
        isExtensionInstalled: jest.fn(),
        getHostEnvironment: () => {
            return hostEnvironment.cli;
        }
    };
});
const mockSendTelemetry = sendTelemetry as jest.Mock;

jest.mock('@sap-ux/deploy-config-generator-shared', () => {
    return {
        ...(jest.requireActual('@sap-ux/deploy-config-generator-shared') as {}),
        isS4Installed: jest.fn()
    };
});

const mockIsS4Installed = isS4Installed as jest.Mock;

describe('flp-config generator', () => {
    const testFixture = new TestFixture();
    const flpConfigGeneratorRelativePath = '../../src/flp-config';
    const flpConfigGeneratorPath = path.join(__dirname, flpConfigGeneratorRelativePath);
    const OUTPUT_DIR_PREFIX = '/apps';

    let cwdBeforeTests: string;
    let cwd: string;

    beforeEach(() => {
        memfs.vol.reset();
    });

    beforeAll(async () => {
        await initI18n();
        cwdBeforeTests = jest.requireActual('process').cwd();
        processMock.chdir = jest.fn().mockImplementation((dir): void => {
            if (dir && dir.startsWith(OUTPUT_DIR_PREFIX)) cwd = dir;
        }) as any;
    });

    afterAll(() => {
        jest.clearAllMocks();
        process.chdir(cwdBeforeTests); // Restore cwd. Otherwise sonar-test-reporter generates errors.
    });

    it('throw when webapp/manifest.json is missing', async () => {
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp`]: {}
            },
            '/'
        );
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
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
        ).rejects.toThrowError(t('error.noManifest', { path: path.resolve(`${appDir}/webapp/manifest.json`) }));
    });

    it('throw when manifest[sap.app] is missing', async () => {
        const existingManifest = testFixture.getContents('projectInvalidManifest/webapp/manifest.json');

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]: existingManifest
            },
            '/'
        );
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
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
        ).rejects.toThrowError(t('error.sapNotDefined'));
    });

    it('inbound key exists - overwrite: false', async () => {
        const existingManifest = testFixture.getContents('project/webapp/manifest.json');
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]: existingManifest
            },
            '/'
        );
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);

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
        expect(existingManifest).toBe(fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`).toString());
        expect(process.exit).toHaveBeenCalledWith(0);
        process.exit = exitImpl;
    });

    it('inbound key exists - overwrite: true', async () => {
        const existingManifest = testFixture.getContents('project/webapp/manifest.json');
        mockIsS4Installed.mockResolvedValueOnce(true);

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]: existingManifest
            },
            '/'
        );
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
        const answers: FLPConfigAnswers = {
            semanticObject: 'com-fiori-tools-travel',
            action: 'inbound',
            title: '{{flpTitle}}',
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
            fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`).toString()
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
        jest.spyOn(fioriGenShared, 'isExtensionInstalled').mockImplementation(() => {
            return true;
        });
        const existingManifest = testFixture.getContents('project/webapp/manifest.json');
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]: existingManifest
            },
            '/'
        );
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
        const answers: FLPConfigAnswers = {
            semanticObject: 'com-fiori-tools-travel',
            action: 'inbound',
            title: '{{flpTitle}}'
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
            fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`).toString()
        );
        expect(changedManifest).not.toBeUndefined();
        expect(showInformationSpy).toHaveBeenCalledWith(t('info.filesGenerated'), MessageType.notification);
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers);
    });

    it('adds `crossnavigation` config if none exists', async () => {
        const existingManifest: Manifest = JSON.parse(testFixture.getContents('project/webapp/manifest.json'));
        mockSendTelemetry.mockRejectedValueOnce(new Error('Telemetry error'));
        unset(existingManifest, crossNavigationPropertyPath);
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]: JSON.stringify(existingManifest)
            },
            '/'
        );
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
        const answers: FLPConfigAnswers = {
            semanticObject: 'so1',
            action: 'action1',
            title: '{{flpTitle}}',
            subTitle: '{{flpSubtitle}}'
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
            fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`).toString()
        );
        expect(changedManifest).not.toBeUndefined();
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers);
    });

    it('adds `crossNavigation.inbounds` config if none exists', async () => {
        const existingManifest = JSON.parse(testFixture.getContents('project/webapp/manifest.json'));
        unset(existingManifest, inboundsPropertyPath);
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]: JSON.stringify(existingManifest)
            },
            '/'
        );
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
        const answers: FLPConfigAnswers = {
            semanticObject: 'so1',
            action: 'action1',
            title: '{{flpTitle}}'
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
            fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`).toString()
        );
        expect(changedManifest).not.toBeUndefined();
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers);
    });

    it('adds `crossNavigation.inbounds` when `crossNavigation.inbounds` is empty', async () => {
        const existingManifest = JSON.parse(testFixture.getContents('project/webapp/manifest.json'));
        set(existingManifest, inboundsPropertyPath, {});
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]: JSON.stringify(existingManifest)
            },
            '/'
        );
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
        const answers: FLPConfigAnswers = {
            semanticObject: 'so1',
            action: 'action1',
            title: '{{flpTitle}}'
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
            fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`).toString()
        );
        expect(changedManifest).not.toBeUndefined();
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers);
    });

    it('adds optional `subTitle`, updates i18n file if present', async () => {
        const existingManifest = JSON.parse(testFixture.getContents('project/webapp/manifest.json'));
        const existingi18n = testFixture.getContents('project/webapp/i18n/i18n.properties');

        set(existingManifest, inboundsPropertyPath, {});
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]: JSON.stringify(existingManifest),
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/i18n/i18n.properties`]: existingi18n
            },
            '/'
        );
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
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
            fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`).toString()
        );
        expect(changedManifest).not.toBeUndefined();
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers, true);

        const i18nContent = fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/webapp/i18n/i18n.properties`).toString();
        expect(i18nContent).toContain('flpTitle=title1');
        expect(i18nContent).toContain('flpSubtitle=subtitle1');
    });

    it('adds flp-config, updates i18n file using bundle reference', async () => {
        const existingManifest = JSON.parse(testFixture.getContents('projectWithI18nBundle/app1/webapp/manifest.json'));
        const existingi18n = testFixture.getContents('project/webapp/i18n/i18n.properties');

        set(existingManifest, inboundsPropertyPath, {});
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]: JSON.stringify(existingManifest),
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/i18n/i18n.properties`]: existingi18n
            },
            '/'
        );
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
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
            fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`).toString()
        );
        expect(changedManifest).not.toBeUndefined();
        assertInboundsHasConfig(get(changedManifest, crossNavigationPropertyPath), answers, true);

        const i18nContent = fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/webapp/i18n/i18n.properties`).toString();
        expect(i18nContent).toContain('flpTitle=title1');
        expect(i18nContent).toContain('flpSubtitle=subtitle1');
    });

    it('shows error when createPropertiesI18nEntries fails', async () => {
        const existingManifest = JSON.parse(testFixture.getContents('projectWithI18nBundle/app1/webapp/manifest.json'));
        const existingi18n = testFixture.getContents('project/webapp/i18n/i18n.properties');
        jest.spyOn(sapUxi18n, 'createPropertiesI18nEntries').mockRejectedValueOnce(new Error('i18n error'));
        const showWarningSpy = jest.fn();
        const mockAppWizard = {
            showWarning: showWarningSpy,
            setHeaderTitle: jest.fn()
        };
        set(existingManifest, inboundsPropertyPath, {});
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]: JSON.stringify(existingManifest),
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/i18n/i18n.properties`]: existingi18n
            },
            '/'
        );
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
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
            t('warning.updatei18n', { path: `.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json` }),
            MessageType.notification
        );
    });
});
