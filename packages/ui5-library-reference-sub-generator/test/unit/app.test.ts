import yeomanTest from 'yeoman-test';
import path from 'node:path';
import fs from 'node:fs';
import fsextra from 'fs-extra';
import RefLibGenerator from '../../src/app';
import { reuseLibs } from './util/constants';
import { rimraf } from 'rimraf';
import { EventName } from '../../src/telemetryEvents';
import { t } from '../../src/utils/i18n';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import * as fioriGenShared from '@sap-ux/fiori-generator-shared';
import * as ui5LibRefWriter from '@sap-ux/ui5-library-reference-writer';
import * as ui5LibraryRefInquirer from '@sap-ux/ui5-library-reference-inquirer';
import type { UI5LibraryReferenceAnswers } from '@sap-ux/ui5-library-reference-inquirer';

const testOutputDir = path.join(__dirname, '..', 'test-output', 'app');
const originalCwd = process.cwd();
const refLibGenPath = path.join(__dirname, '../../src/app');
let yoEnv4 = false;

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn().mockReturnValue({
            OperatingSystem: 'CLI',
            Platform: 'darwin'
        })
    },
    sendTelemetry: jest.fn(),
    isExtensionInstalled: jest.fn().mockReturnValue(true)
}));

jest.mock('yeoman-test/lib/adapter', () => ({
    TestAdapter: function TestAdapter() {
        const testAdapter = new (jest.requireActual('yeoman-test/lib/adapter').TestAdapter)();
        if (yoEnv4) {
            Object.assign(testAdapter, { actualAdapter: {} });
        }
        return testAdapter;
    },
    DummyPrompt: jest.requireActual('yeoman-test/lib/adapter').DummyPrompt
}));

afterAll(() => {
    process.chdir(originalCwd); // Generation changes the cwd, this breaks sonar report so we restore later
    rimraf.rimrafSync(testOutputDir);
});

describe('Test reference generator', () => {
    jest.setTimeout(60000);
    it('should run the generator', async () => {
        const sendTelemetrySpy = jest.spyOn(fioriGenShared, 'sendTelemetry');
        const testProjectPath = path.join(testOutputDir, 'test_project');
        fs.mkdirSync(testOutputDir, { recursive: true });
        fs.mkdirSync(testProjectPath);
        fsextra.copySync(path.join(__dirname, 'sample/test_project_lrop_v2'), testProjectPath);
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

        const manifest = await fs.promises.readFile(path.join(testProjectPath, 'webapp/manifest.json'), {
            encoding: 'utf8'
        });
        const updatedManifest = JSON.parse(manifest);
        expect(updatedManifest).toMatchSnapshot();
        expect(sendTelemetrySpy).toHaveBeenCalledWith(
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
        const testProject = path.join(testOutputDir, 'test_project_lrop_v2_custom_webapp_path');
        fs.mkdirSync(testOutputDir, { recursive: true });
        fs.mkdirSync(testProject);
        fsextra.copySync(path.join(__dirname, 'sample/test_project_lrop_v2_custom_webapp_path'), testProject);

        await yeomanTest
            .run(RefLibGenerator, {
                resolved: refLibGenPath
            })
            .withPrompts({
                targetProjectFolder: testProject,
                source: 'Workspace',
                referenceLibraries: reuseLibs.map((lib) => lib.value)
            });

        const manifest = await fs.promises.readFile(path.join(testProject, 'src/main/webapp/manifest.json'), {
            encoding: 'utf8'
        });
        const updatedManifest = JSON.parse(manifest);
        expect(updatedManifest).toMatchSnapshot();
    });

    it('should throw error when writing fails', async () => {
        const testProject = path.join(testOutputDir, 'test_project_lrop_v2_custom_webapp_path_2');
        fs.mkdirSync(testOutputDir, { recursive: true });
        fs.mkdirSync(testProject);
        fsextra.copySync(path.join(__dirname, 'sample/test_project_lrop_v2_custom_webapp_path'), testProject);
        jest.spyOn(ui5LibRefWriter, 'generate').mockRejectedValueOnce(new Error('Error'));

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
        const testProject = path.join(testOutputDir, 'test_project_lrop_v2_custom_webapp_path_2');
        const promptAnswers = {
            targetProjectFolder: testProject,
            source: 'Workspace',
            referenceLibraries: reuseLibs.map((lib) => lib.value)
        } as unknown as ui5LibraryRefInquirer.UI5LibraryReferenceAnswers;
        jest.spyOn(ui5LibRefWriter, 'generate').mockResolvedValueOnce({} as any);
        const promptSpy = jest
            .spyOn(ui5LibraryRefInquirer, 'prompt')
            .mockResolvedValue(promptAnswers as unknown as UI5LibraryReferenceAnswers);
        // Use the mocked adapter representing yeoman-environment@4
        yoEnv4 = true;
        await expect(
            yeomanTest
                .run(RefLibGenerator, {
                    resolved: refLibGenPath
                })
                .withOptions({ skipInstall: false })
        ).resolves.not.toThrow();
        expect(promptSpy).toHaveBeenCalled();
    });
});
