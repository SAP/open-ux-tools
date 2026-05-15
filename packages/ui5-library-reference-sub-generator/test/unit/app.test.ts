import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import fsextra from 'fs-extra';
import { rimraf } from 'rimraf';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import type { UI5LibraryReferenceAnswers } from '@sap-ux/ui5-library-reference-inquirer';

const testDirname = dirname(fileURLToPath(import.meta.url));
const testOutputDir = join(testDirname, '..', 'test-output', 'app');
const originalCwd = process.cwd();
const refLibGenPath = join(testDirname, '../../src/app');
let yoEnv4 = false;

// Pre-import actual modules for spreading
const actualFioriGenShared = await import('@sap-ux/fiori-generator-shared');
const actualUi5LibRefWriter = await import('@sap-ux/ui5-library-reference-writer');
const actualUi5LibRefInquirer = await import('@sap-ux/ui5-library-reference-inquirer');

// Mock functions
const mockSendTelemetry = jest.fn();
const mockIsExtensionInstalled = jest.fn().mockReturnValue(true);
const mockGenerate = jest.fn<(...args: any[]) => Promise<any>>().mockImplementation(actualUi5LibRefWriter.generate);
const mockPrompt = jest
    .fn<(...args: any[]) => Promise<UI5LibraryReferenceAnswers>>()
    .mockImplementation(actualUi5LibRefInquirer.prompt as any);

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...actualFioriGenShared,
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn().mockReturnValue({
            OperatingSystem: 'CLI',
            Platform: 'darwin'
        })
    },
    sendTelemetry: mockSendTelemetry,
    isExtensionInstalled: mockIsExtensionInstalled
}));

jest.unstable_mockModule('@sap-ux/ui5-library-reference-writer', () => ({
    generate: mockGenerate
}));

jest.unstable_mockModule('@sap-ux/ui5-library-reference-inquirer', () => ({
    ...actualUi5LibRefInquirer,
    prompt: mockPrompt
}));

// Mock the yeoman-test adapter - this is a CJS module
jest.unstable_mockModule('yeoman-test/lib/adapter', () => {
    // We need the actual adapter from CJS
    const actualAdapter = jest.requireActual('yeoman-test/lib/adapter') as any;
    return {
        TestAdapter: function TestAdapter() {
            const testAdapter = new actualAdapter.TestAdapter();
            if (yoEnv4) {
                Object.assign(testAdapter, { actualAdapter: {} });
            }
            return testAdapter;
        },
        DummyPrompt: actualAdapter.DummyPrompt
    };
});

const yeomanTest = (await import('yeoman-test')).default;
const RefLibGenerator = (await import('../../src/app')).default;
const { reuseLibs } = await import('./util/constants');
const { EventName } = await import('../../src/telemetryEvents');
const { t } = await import('../../src/utils/i18n');

afterAll(() => {
    process.chdir(originalCwd); // Generation changes the cwd, this breaks sonar report so we restore later
    rimraf.rimrafSync(testOutputDir);
});

describe('Test reference generator', () => {
    jest.setTimeout(60000);
    it('should run the generator', async () => {
        const testProjectPath = join(testOutputDir, 'test_project');
        fs.mkdirSync(testOutputDir, { recursive: true });
        fs.mkdirSync(testProjectPath);
        fsextra.copySync(join(testDirname, 'sample/test_project_lrop_v2'), testProjectPath);
        const showInformationSpy = jest.fn();
        const mockAppWizard = {
            setHeaderTitle: jest.fn(),
            showInformation: showInformationSpy
        };

        await yeomanTest
            .run(RefLibGenerator, {
                resolved: refLibGenPath
            })
            .withOptions({
                appWizard: mockAppWizard
            })
            .withPrompts({
                targetProjectFolder: testProjectPath,
                source: 'Workspace',
                referenceLibraries: reuseLibs.map((lib) => lib.value)
            });

        const manifest = await fs.promises.readFile(join(testProjectPath, 'webapp/manifest.json'), {
            encoding: 'utf8'
        });
        const updatedManifest = JSON.parse(manifest);
        expect(updatedManifest).toMatchSnapshot();
        expect(mockSendTelemetry).toHaveBeenCalledWith(
            EventName.LIB_REFERENCE_ADDED,
            expect.objectContaining({
                OperatingSystem: 'CLI',
                Platform: 'darwin'
            }),
            testProjectPath
        );
        expect(showInformationSpy).toHaveBeenCalledWith(t('info.filesGenerated'), MessageType.notification);
    });
    it('should run the generator custom webapp path', async () => {
        const testProject = join(testOutputDir, 'test_project_lrop_v2_custom_webapp_path');
        fs.mkdirSync(testOutputDir, { recursive: true });
        fs.mkdirSync(testProject);
        fsextra.copySync(join(testDirname, 'sample/test_project_lrop_v2_custom_webapp_path'), testProject);

        await yeomanTest
            .run(RefLibGenerator, {
                resolved: refLibGenPath
            })
            .withPrompts({
                targetProjectFolder: testProject,
                source: 'Workspace',
                referenceLibraries: reuseLibs.map((lib) => lib.value)
            });

        const manifest = await fs.promises.readFile(join(testProject, 'src/main/webapp/manifest.json'), {
            encoding: 'utf8'
        });
        const updatedManifest = JSON.parse(manifest);
        expect(updatedManifest).toMatchSnapshot();
    });

    it('should throw error when writing fails', async () => {
        mockGenerate.mockRejectedValueOnce(new Error('Error'));

        const testProject = join(testOutputDir, 'test_project_lrop_v2_custom_webapp_path_2');
        fs.mkdirSync(testOutputDir, { recursive: true });
        fs.mkdirSync(testProject);
        fsextra.copySync(join(testDirname, 'sample/test_project_lrop_v2_custom_webapp_path'), testProject);

        try {
            await yeomanTest
                .run(RefLibGenerator, {
                    resolved: refLibGenPath
                })
                .withPrompts({
                    targetProjectFolder: testProject,
                    source: 'Workspace',
                    referenceLibraries: reuseLibs.map((lib) => lib.value)
                });
        } catch (e) {
            expect(e.message).toBe(t('error.updatingApp'));
        }
    });

    it('prompting with yeoman-environment@^4 default adaptor (yo@5 support)', async () => {
        const testProject = join(testOutputDir, 'test_project_lrop_v2_custom_webapp_path_2');
        const promptAnswers = {
            targetProjectFolder: testProject,
            source: 'Workspace',
            referenceLibraries: reuseLibs.map((lib) => lib.value)
        } as unknown as UI5LibraryReferenceAnswers;
        mockGenerate.mockImplementationOnce(async () => ({}) as any);
        mockPrompt.mockResolvedValueOnce(promptAnswers as unknown as UI5LibraryReferenceAnswers);
        // Use the mocked adapter representing yeoman-environment@4
        yoEnv4 = true;
        await expect(
            yeomanTest
                .run(RefLibGenerator, {
                    resolved: refLibGenPath
                })
                .withOptions({ skipInstall: false })
        ).resolves.not.toThrow();
        expect(mockPrompt).toHaveBeenCalled();
    });
});
