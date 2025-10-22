import * as ui5LibraryInquirer from '@sap-ux/ui5-library-inquirer';
import * as ui5LibWriter from '@sap-ux/ui5-library-writer';
import * as fioriGenShared from '@sap-ux/fiori-generator-shared';
import { toMatchFolder } from '@sap-ux/jest-file-matchers';
import fs from 'node:fs';
import 'jest-extended';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import yeomanTest from 'yeoman-test';
import ReuseLibGen from '../../src/app';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import type { Editor } from 'mem-fs-editor';
import * as fioriToolsSettings from '@sap-ux/fiori-tools-settings';

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    // eslint-disable-next-line
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as typeof import('@sap-ux/fiori-generator-shared')),
    getDefaultTargetFolder: jest.fn(),
    isCli: jest.fn().mockReturnValue(true)
}));

jest.mock('@sap-ux/fiori-tools-settings', () => ({
    writeApplicationInfoSettings: jest.fn()
}));

let yoEnv4 = false;

expect.extend({ toMatchFolder });

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

const testOutputDir = join(__dirname, '../test-output');
const reuseLibGenPath = join(__dirname, '../../src/app');
const expectedOutputPath = join(__dirname, 'expected-output');
const originalCwd = process.cwd();

const mockPrompts = [
    {
        name: 'libraryName'
    },
    {
        name: 'namespace'
    },
    {
        name: 'targetFolder'
    },
    {
        name: 'ui5Version'
    },
    {
        name: 'enableTypescript'
    }
];

afterAll(() => {
    process.chdir(originalCwd); // Generation changes the cwd, this breaks sonar report so we restore later
});

describe('Test reuse lib generator', () => {
    jest.setTimeout(20000);

    afterEach(async () => {
        await rimraf(testOutputDir);
    });

    it('should run the generator', async () => {
        fs.mkdirSync(testOutputDir, { recursive: true });
        // Mock the prompt function to avoid network calls during tests
        jest.spyOn(ui5LibraryInquirer, 'prompt').mockResolvedValue({
            libraryName: 'library1',
            namespace: 'com.sap',
            targetFolder: testOutputDir,
            ui5Version: '1.108.0',
            enableTypescript: false
        });
        const writeApplicationInfoSettingsSpy = jest.spyOn(fioriToolsSettings, 'writeApplicationInfoSettings');

        await yeomanTest
            .run(ReuseLibGen, {
                resolved: reuseLibGenPath
            })
            .withOptions({ skipInstall: true })
            .withPrompts({
                libraryName: 'library1',
                namespace: 'com.sap',
                targetFolder: testOutputDir,
                ui5Version: '1.108.0',
                enableTypescript: false
            });

        expect(join(testOutputDir, 'com.sap.library1')).toMatchFolder(join(expectedOutputPath, 'library1'));
        expect(writeApplicationInfoSettingsSpy).toHaveBeenCalledWith(join(testOutputDir, 'com.sap.library1'));
    });

    it('should run the generator (typescript)', async () => {
        fs.mkdirSync(testOutputDir, { recursive: true });
        // Mock the prompt function to avoid network calls during tests
        jest.spyOn(ui5LibraryInquirer, 'prompt').mockResolvedValue({
            libraryName: 'tslibrary1',
            namespace: 'com.sap',
            targetFolder: testOutputDir,
            ui5Version: '1.108.0',
            enableTypescript: true
        });

        await yeomanTest
            .run(ReuseLibGen, {
                resolved: reuseLibGenPath
            })
            .withOptions({ skipInstall: true })
            .withPrompts({
                libraryName: 'tslibrary1',
                namespace: 'com.sap',
                targetFolder: testOutputDir,
                ui5Version: '1.108.0',
                enableTypescript: true
            });
        expect(join(testOutputDir, 'com.sap.tslibrary1')).toMatchFolder(join(expectedOutputPath, 'tslibrary1'));
    });
});

describe('Test generator methods', () => {
    jest.setTimeout(20000);

    afterEach(() => {
        rimraf.rimrafSync(testOutputDir);
    });

    it('should call getDefaultTargetFolder', async () => {
        jest.spyOn(ui5LibWriter, 'generate').mockResolvedValueOnce({} as Editor);
        const getDefaultTargetFolderSpy = jest
            .spyOn(fioriGenShared, 'getDefaultTargetFolder')
            .mockReturnValue('/some/path');
        // Mock the prompt function to avoid network calls during tests
        jest.spyOn(ui5LibraryInquirer, 'prompt').mockResolvedValue({
            libraryName: 'defaultlib',
            namespace: 'com.sap',
            targetFolder: '/some/path',
            ui5Version: '1.108.0',
            enableTypescript: false
        });

        await yeomanTest
            .run(ReuseLibGen, {
                resolved: reuseLibGenPath
            })
            .withOptions({ skipInstall: true, vscode: { workspace: {} } })
            .withPrompts({
                libraryName: undefined,
                namespace: undefined,
                targetFolder: undefined,
                ui5Version: undefined,
                enableTypescript: false
            });

        expect(getDefaultTargetFolderSpy).toHaveBeenCalled();
    });

    it('should throw error in writing phase', async () => {
        jest.spyOn(ui5LibWriter, 'generate').mockImplementationOnce(() => {
            throw new Error('Failed to generate UI5 lib');
        });
        // Mock the prompt function to avoid network calls during tests
        jest.spyOn(ui5LibraryInquirer, 'prompt').mockResolvedValue({
            libraryName: 'errorlib',
            namespace: 'com.sap',
            targetFolder: testOutputDir,
            ui5Version: '1.108.0',
            enableTypescript: false
        });

        await expect(
            yeomanTest
                .run(ReuseLibGen, {
                    resolved: reuseLibGenPath
                })
                .withOptions({ skipInstall: true })
                .withPrompts({
                    libraryName: 'tslibrary1',
                    namespace: 'com.sap',
                    targetFolder: testOutputDir,
                    ui5Version: '1.108.0',
                    enableTypescript: true
                })
        ).rejects.toThrow('An error occurred when generating the reusable SAPUI5 library.');
    });

    it('should resolve despite error in install phase', async () => {
        jest.spyOn(ui5LibWriter, 'generate').mockResolvedValueOnce({} as Editor);
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockRejectedValueOnce('Error installing dependencies'));
        // Mock the prompt function to avoid network calls during tests
        jest.spyOn(ui5LibraryInquirer, 'prompt').mockResolvedValue({
            libraryName: 'installErrorLib',
            namespace: 'com.sap',
            targetFolder: testOutputDir,
            ui5Version: '1.108.0',
            enableTypescript: false
        });

        await expect(
            yeomanTest
                .run(ReuseLibGen, {
                    resolved: reuseLibGenPath
                })
                .withOptions({ skipInstall: false })
                .withPrompts({
                    libraryName: 'tslibrary1',
                    namespace: 'com.sap',
                    targetFolder: testOutputDir,
                    ui5Version: '1.108.0',
                    enableTypescript: true
                })
        ).resolves.not.toThrow();

        expect(commandRunSpy).toHaveBeenCalledTimes(1);
    });

    it('prompting with yeoman-environment@^4 default adaptor (yo@5 support)', async () => {
        const promptAnswers = {
            libraryName: 'tslibrary1',
            namespace: 'com.sap',
            targetFolder: testOutputDir,
            ui5Version: '1.108.0',
            enableTypescript: true
        };
        jest.spyOn(ui5LibWriter, 'generate').mockResolvedValueOnce({} as Editor);
        const promptSpy = jest.spyOn(ui5LibraryInquirer, 'prompt').mockResolvedValue(promptAnswers);
        // Use the mocked adapter representing yeoman-environment@4
        yoEnv4 = true;
        await expect(
            yeomanTest
                .run(ReuseLibGen, {
                    resolved: reuseLibGenPath
                })
                .withOptions({ skipInstall: false })
        ).resolves.not.toThrow();
        expect(promptSpy).toHaveBeenCalled();
    });
});
