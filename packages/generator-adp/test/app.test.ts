import fs from 'fs';
import { join } from 'path';
import { rimraf } from 'rimraf';
import yeomanTest from 'yeoman-test';
import { exec } from 'child_process';

import { isAppStudio } from '@sap-ux/btp-utils';
import type { TargetApplication } from '@sap-ux/adp-tooling';
import { getCredentialsFromStore } from '@sap-ux/system-access';
import * as fioriGenShared from '@sap-ux/fiori-generator-shared';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { TargetSystems, getAbapTarget, getConfiguredProvider, loadApps } from '@sap-ux/adp-tooling';

import adpGenerator from '../src/app';
import { initI18n, t } from '../src/utils/i18n';
import { EventName } from '../src/telemetryEvents';
import type { AdpGeneratorOptions } from '../src/app';
import { getDefaultProjectName } from '../src/app/questions/helper/default-values';

jest.mock('@sap-devx/feature-toggle-node', () => ({
    // Is BAS this will mean that the layer is CUSTOMER_BASE
    isFeatureEnabled: jest.fn().mockResolvedValue(false)
}));

jest.mock('../src/app/questions/helper/default-values.ts', () => ({
    ...jest.requireActual('../src/app/questions/helper/default-values.ts'),
    getDefaultProjectName: jest.fn()
}));

jest.mock('../src/app/questions/helper/conditions', () => ({
    ...jest.requireActual('../src/app/questions/helper/conditions'),
    showApplicationQuestion: jest.fn().mockReturnValue(true)
}));

jest.mock('@sap-ux/system-access', () => ({
    ...jest.requireActual('@sap-ux/system-access'),
    getCredentialsFromStore: jest.fn()
}));

jest.mock('child_process', () => ({
    ...jest.requireActual('child_process'),
    exec: jest.fn()
}));

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    getConfiguredProvider: jest.fn(),
    loadApps: jest.fn(),
    getAbapTarget: jest.fn()
}));

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
    sendTelemetry: jest.fn().mockReturnValue(new Promise(() => {})),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn().mockReturnValue({
            OperatingSystem: 'testOS',
            Platform: 'testPlatform'
        })
    },
    isExtensionInstalled: jest.fn().mockReturnValue(true),
    getHostEnvironment: jest.fn(),
    isCli: jest.fn().mockReturnValue(false)
}));

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

const originalCwd = process.cwd();
const testOutputDir = join(__dirname, 'test-output');
const generatorPath = join(__dirname, '../src/app/index.ts');

const endpoints = [{ Name: 'SystemA', Client: '010', Url: 'http://systema.com' }];
const apps: TargetApplication[] = [
    {
        ach: '',
        bspName: 'SOME_NAME',
        bspUrl: '/some/url',
        fileType: 'descriptor',
        id: 'sap.ui.demoapps.f1',
        registrationIds: ['F0303'],
        title: 'App One'
    }
];

const getAtoInfoMock = jest.fn();
const dummyProvider = {
    getAtoInfo: getAtoInfoMock
} as unknown as AbapServiceProvider;

const loadAppsMock = loadApps as jest.Mock;
const execMock = exec as unknown as jest.Mock;
const mockIsAppStudio = isAppStudio as jest.Mock;
const getAbapTargetMock = getAbapTarget as jest.Mock;
const getDefaultProjectNameMock = getDefaultProjectName as jest.Mock;
const getConfiguredProviderMock = getConfiguredProvider as jest.Mock;
const getCredentialsFromStoreMock = getCredentialsFromStore as jest.Mock;

describe('Adaptation Project Generator Integration Test', () => {
    jest.setTimeout(60000);

    let sendTelemetrySpy: jest.SpyInstance;

    beforeEach(() => {
        fs.mkdirSync(testOutputDir, { recursive: true });

        loadAppsMock.mockResolvedValue(apps);
        jest.spyOn(TargetSystems.prototype, 'getSystems').mockResolvedValue(endpoints);
        jest.spyOn(TargetSystems.prototype, 'getSystemRequiresAuth').mockResolvedValue(false);
        getConfiguredProviderMock.mockResolvedValue(dummyProvider);
        execMock.mockImplementation((_: string, callback: Function) => {
            callback(null, { stdout: 'ok', stderr: '' });
        });
        sendTelemetrySpy = jest.spyOn(fioriGenShared, 'sendTelemetry');
        getAbapTargetMock.mockResolvedValue({ url: 'http://systema.com', client: '010' });
        getAtoInfoMock.mockResolvedValue({ operationsType: 'P' });
        getDefaultProjectNameMock.mockReturnValue('app.variant1');
        getCredentialsFromStoreMock.mockResolvedValue(undefined);
    });

    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        process.chdir(originalCwd);
        rimraf.sync(testOutputDir);
    });

    it('should throw error when writing phase fails', async () => {
        const error = new Error('Test error');
        mockIsAppStudio.mockReturnValue(false);
        getConfiguredProviderMock.mockRejectedValueOnce(error);

        const answers = {
            system: 'http://systema.com',
            username: 'user1',
            password: 'pass1',
            application: { id: 'sap.ui.demoapps.f1', title: 'App One' }
        };

        const runContext = yeomanTest
            .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
            .withOptions({ shouldInstallDeps: false } as AdpGeneratorOptions)
            .withPrompts(answers);

        await expect(runContext.run()).rejects.toThrow(t('error.updatingApp'));
    });

    it('should generate an adaptation project successfully', async () => {
        mockIsAppStudio.mockReturnValue(false);

        const answers = {
            system: 'http://systema.com',
            username: 'user1',
            password: 'pass1',
            application: { id: 'sap.ui.demoapps.f1', title: 'App One' }
        };

        const runContext = yeomanTest
            .create(adpGenerator, { resolved: generatorPath }, { cwd: testOutputDir })
            .withOptions({ shouldInstallDeps: true } as AdpGeneratorOptions)
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        const generatedDirs = fs.readdirSync(testOutputDir);
        expect(generatedDirs.length).toBeGreaterThan(0);
        const projectFolder = join(testOutputDir, generatedDirs[0]);

        const manifestPath = join(projectFolder, 'webapp', 'manifest.appdescr_variant');
        const i18nPath = join(projectFolder, 'webapp', 'i18n', 'i18n.properties');

        expect(fs.existsSync(manifestPath)).toBe(true);
        expect(fs.existsSync(i18nPath)).toBe(true);

        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const i18nContent = fs.readFileSync(i18nPath, 'utf8');
        expect(manifestContent).toMatchSnapshot();
        expect(i18nContent).toMatchSnapshot();

        expect(sendTelemetrySpy).toHaveBeenCalledWith(
            EventName.ADAPTATION_PROJECT_CREATED,
            expect.objectContaining({
                OperatingSystem: 'testOS',
                Platform: 'testPlatform'
            }),
            projectFolder
        );
    });
});
