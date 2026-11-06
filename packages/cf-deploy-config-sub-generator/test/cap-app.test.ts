import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import yeomanTest from 'yeoman-test';
import { TestFixture } from './fixtures/index.js';
import type { MemFsEditor as Editor } from 'mem-fs-editor';

const __testdirname = dirname(fileURLToPath(import.meta.url));

const mockHasbinSync = jest.fn() as jest.Mock;

jest.unstable_mockModule('hasbin', () => ({
    default: { sync: mockHasbinSync },
    sync: mockHasbinSync
}));

// Import MockMta AFTER mocks are set up
const { MockMta } = await import('./utils/mock-mta.js');

jest.unstable_mockModule('@sap/mta-lib', () => ({
    Mta: MockMta
}));

const mockIsAppStudio = jest.fn() as jest.Mock;
const realBtpUtils = await import('@sap-ux/btp-utils');

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: () => mockIsAppStudio(),
    listDestinations: () => jest.fn()
}));

const mockFindCapProjectRoot = jest.fn() as jest.Mock;
const realProjectAccess = await import('@sap-ux/project-access');

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...realProjectAccess,
    findCapProjectRoot: () => mockFindCapProjectRoot()
}));

const mockGetHostEnvironment = jest.fn() as jest.Mock;
const mockSendTelemetry = jest.fn() as jest.Mock;
const mockIsExtensionInstalled = jest.fn().mockReturnValue(true);
const realFioriGenShared = await import('@sap-ux/fiori-generator-shared');

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...realFioriGenShared,
    sendTelemetry: () => mockSendTelemetry(),
    isExtensionInstalled: (...args: unknown[]) => mockIsExtensionInstalled(...args),
    getHostEnvironment: () => mockGetHostEnvironment(),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn()
    }
}));

const mockGenerateCAPConfig = jest.fn<(...args: unknown[]) => unknown>();
const mockGenerateAppConfig = jest.fn<(...args: unknown[]) => unknown>();
const realCfDeployWriter = await import('@sap-ux/cf-deploy-config-writer');

jest.unstable_mockModule('@sap-ux/cf-deploy-config-writer', () => ({
    ...realCfDeployWriter,
    generateCAPConfig: (...args: unknown[]) => mockGenerateCAPConfig(...args),
    generateAppConfig: (...args: unknown[]) => mockGenerateAppConfig(...args)
}));

// Dynamic imports after mock registration
const { default: CFGenerator } = await import('../src/app/index.js');
const { initI18n } = await import('../src/utils/index.js');
const { RouterModuleType } = await import('@sap-ux/cf-deploy-config-writer');

const mockShowInformation = jest.fn() as jest.Mock;
const mockShowError = jest.fn() as jest.Mock;
const mockAppWizard = {
    showInformation: mockShowInformation,
    showError: mockShowError
};

describe('Cloud foundry generator tests', () => {
    jest.setTimeout(10000);
    let fsMock: Editor;
    let outputDir: string;
    const cfGenPath = join(__testdirname, '../src/app');
    const testFixture = new TestFixture();

    const seedFiles = (files: Record<string, string>): void => {
        for (const [filePath, contents] of Object.entries(files)) {
            fs.mkdirSync(dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, contents);
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        outputDir = fs.mkdtempSync(join(os.tmpdir(), 'cf-cap-app-'));
        fsMock = {
            dump: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        // Default: delegate to real implementations
        mockGenerateCAPConfig.mockImplementation((...args) =>
            (realCfDeployWriter.generateCAPConfig as Function)(...args)
        );
        mockGenerateAppConfig.mockImplementation((...args) =>
            (realCfDeployWriter.generateAppConfig as Function)(...args)
        );
        mockIsExtensionInstalled.mockReturnValue(true);
    });

    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.resetAllMocks();
        fs.rmSync(outputDir, { recursive: true, force: true });
    });

    it('Validate Approuter prompting aborts if user doesnt want to proceed', async () => {
        mockHasbinSync.mockReturnValue(true);
        const capRoot = join(outputDir, 'capmissingmta');
        mockFindCapProjectRoot.mockReturnValueOnce(capRoot);
        mockGenerateCAPConfig.mockResolvedValue(fsMock);
        mockGenerateAppConfig.mockResolvedValue(fsMock);

        seedFiles({
            [join(capRoot, 'app/testui5app/webapp/manifest.json')]: testFixture.getContents(
                'cap/app/testui5app/webapp/manifest.json'
            ),
            [join(capRoot, 'app/testui5app/package.json')]: testFixture.getContents('cap/app/testui5app/package.json'),
            [join(capRoot, 'app/testui5app/ui5.yaml')]: testFixture.getContents('cap/app/testui5app/ui5.yaml'),
            [join(capRoot, 'app/services.cds')]: testFixture.getContents('cap/app/services.cds'),
            [join(capRoot, 'db/schmea.cds')]: testFixture.getContents('cap/db/schema.cds'),
            [join(capRoot, 'srv/cat-service.cds')]: testFixture.getContents('cap/srv/cat-service.cds')
        });
        const appDir = join(capRoot, 'app', 'testui5app');

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true,
                    appWizard: mockAppWizard,
                    launchStandaloneFromYui: true,
                    launchDeployConfigAsSubGenerator: false
                })
                .withPrompts({
                    addCapMtaContinue: false,
                    routerType: RouterModuleType.Managed,
                    mtaPath: capRoot,
                    mtaId: 'capmtaid'
                })
                .run()
        ).resolves.not.toThrow();
        expect(mockGenerateCAPConfig).not.toHaveBeenCalled();
        expect(mockGenerateAppConfig).not.toHaveBeenCalled();
        expect(mockFindCapProjectRoot).toHaveBeenCalled();
        expect(mockSendTelemetry).not.toHaveBeenCalled();
    });

    it('Validate Approuter prompting is shown if HTML5 is being added to a CAP project with missing mta', async () => {
        mockHasbinSync.mockReturnValue(true);
        const capRoot = join(outputDir, 'capmissingmta');
        mockFindCapProjectRoot.mockReturnValue(capRoot);
        mockGenerateCAPConfig.mockResolvedValue(fsMock);
        mockGenerateAppConfig.mockResolvedValue(fsMock);

        seedFiles({
            [join(capRoot, 'app/testui5app/webapp/manifest.json')]: testFixture.getContents(
                'cap/app/testui5app/webapp/manifest.json'
            ),
            [join(capRoot, 'app/testui5app/package.json')]: testFixture.getContents('cap/app/testui5app/package.json'),
            [join(capRoot, 'app/testui5app/ui5.yaml')]: testFixture.getContents('cap/app/testui5app/ui5.yaml'),
            [join(capRoot, 'app/services.cds')]: testFixture.getContents('cap/app/services.cds'),
            [join(capRoot, 'db/schmea.cds')]: testFixture.getContents('cap/db/schema.cds'),
            [join(capRoot, 'srv/cat-service.cds')]: testFixture.getContents('cap/srv/cat-service.cds'),
            [join(capRoot, 'package.json')]: testFixture.getContents('cap/package.json')
        });
        const appDir = join(capRoot, 'app', 'testui5app');

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true,
                    appWizard: mockAppWizard,
                    launchStandaloneFromYui: true,
                    launchDeployConfigAsSubGenerator: false
                })
                .withPrompts({
                    addCapMtaContinue: true,
                    routerType: RouterModuleType.Managed,
                    mtaPath: capRoot,
                    mtaId: 'capmtaid' // Will be ignored as question is disabled
                })
                .run()
        ).resolves.not.toThrow();
        expect(mockGenerateCAPConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                mtaId: 'captestproject', // Read from the package.json
                addCapMtaContinue: true,
                mtaPath: capRoot,
                routerType: 'managed'
            }),
            expect.anything(),
            expect.anything()
        );
        expect(mockGenerateAppConfig).toHaveBeenCalled();
        expect(mockFindCapProjectRoot).toHaveBeenCalled();
        expect(mockSendTelemetry).toHaveBeenCalled();
        expect(mockIsExtensionInstalled).toHaveBeenCalled();
    });
});
