import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import 'jest-extended';
import { rimraf } from 'rimraf';
import { toMatchFolder } from '@sap-ux/jest-file-matchers';
import type { Editor } from 'mem-fs-editor';

const testDir = dirname(fileURLToPath(import.meta.url));

// Mock functions
const mockPrompt = jest.fn<any>();
const mockGenerate = jest.fn<any>();
const mockGetDefaultTargetFolder = jest.fn<any>();
const mockIsCli = jest.fn<any>().mockReturnValue(true);
const mockWriteApplicationInfoSettings = jest.fn<any>();

// Mock @sap-ux/ui5-library-inquirer - inline mock to avoid circular loading OOM
jest.unstable_mockModule('@sap-ux/ui5-library-inquirer', () => ({
    prompt: mockPrompt
}));

// Mock @sap-ux/ui5-library-writer
jest.unstable_mockModule('@sap-ux/ui5-library-writer', () => ({
    generate: mockGenerate
}));

// Create a mock logger that satisfies ILogWrapper interface
const mockLoggerInstance: Record<string, any> = {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    getChildLogger: jest.fn(),
    getLogLevel: jest.fn().mockReturnValue('off'),
    log: jest.fn()
};
mockLoggerInstance.getChildLogger.mockReturnValue(mockLoggerInstance);

// Mock @sap-ux/fiori-generator-shared - inline mock to avoid circular loading OOM
jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    getDefaultTargetFolder: mockGetDefaultTargetFolder,
    isCli: mockIsCli,
    DefaultLogger: mockLoggerInstance,
    LogWrapper: class LogWrapper {
        fatal = jest.fn();
        error = jest.fn();
        warn = jest.fn();
        info = jest.fn();
        debug = jest.fn();
        trace = jest.fn();
        getChildLogger = jest.fn().mockReturnValue(mockLoggerInstance);
        getLogLevel = jest.fn().mockReturnValue('off');
        log = jest.fn();
        constructor() {}
    }
}));

// Mock @sap-ux/fiori-tools-settings
jest.unstable_mockModule('@sap-ux/fiori-tools-settings', () => ({
    writeApplicationInfoSettings: mockWriteApplicationInfoSettings
}));

let yoEnv4 = false;

// Mock yeoman-test/lib/adapter
jest.unstable_mockModule('yeoman-test/lib/adapter', async () => {
    const actual = await import('yeoman-test/lib/adapter');
    return {
        ...actual,
        TestAdapter: function TestAdapter() {
            // @ts-expect-error - CJS interop
            const ActualTestAdapter = actual.TestAdapter || (actual as any).default?.TestAdapter;
            const testAdapter = new ActualTestAdapter();
            if (yoEnv4) {
                Object.assign(testAdapter, { actualAdapter: {} });
            }
            return testAdapter;
        }
    };
});

// Dynamic imports after mocks
const yeomanTest = await import('yeoman-test');
const { default: ReuseLibGen } = await import('../../src/app');
const { CommandRunner } = await import('@sap-ux/nodejs-utils');

// Import the real generate function from source path to bypass the jest mock
// Jest's module mock only applies to the package name, not direct source imports
const { generate: realGenerate } = await import('../../../ui5-library-writer/src/index');

// Default mockGenerate to call the real implementation
mockGenerate.mockImplementation(realGenerate);

expect.extend({ toMatchFolder });

const testOutputDir = join(testDir, '../test-output');
const reuseLibGenPath = join(testDir, '../../src/app');
const expectedOutputPath = join(testDir, 'expected-output');
const originalCwd = process.cwd();

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
        mockPrompt.mockResolvedValue({
            libraryName: 'library1',
            namespace: 'com.sap',
            targetFolder: testOutputDir,
            ui5Version: '1.108.0',
            enableTypescript: false
        });

        await yeomanTest.default
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
        expect(mockWriteApplicationInfoSettings).toHaveBeenCalledWith(join(testOutputDir, 'com.sap.library1'));
    });

    it('should run the generator (typescript)', async () => {
        fs.mkdirSync(testOutputDir, { recursive: true });
        // Mock the prompt function to avoid network calls during tests
        mockPrompt.mockResolvedValue({
            libraryName: 'tslibrary1',
            namespace: 'com.sap',
            targetFolder: testOutputDir,
            ui5Version: '1.108.0',
            enableTypescript: true
        });

        await yeomanTest.default
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
        mockGenerate.mockResolvedValueOnce({} as Editor);
        mockGetDefaultTargetFolder.mockReturnValue('/some/path');
        // Mock the prompt function to avoid network calls during tests
        mockPrompt.mockResolvedValue({
            libraryName: 'defaultlib',
            namespace: 'com.sap',
            targetFolder: '/some/path',
            ui5Version: '1.108.0',
            enableTypescript: false
        });

        await yeomanTest.default
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

        expect(mockGetDefaultTargetFolder).toHaveBeenCalled();
    });

    it('should throw error in writing phase', async () => {
        mockGenerate.mockImplementationOnce(() => {
            throw new Error('Failed to generate UI5 lib');
        });
        // Mock the prompt function to avoid network calls during tests
        mockPrompt.mockResolvedValue({
            libraryName: 'errorlib',
            namespace: 'com.sap',
            targetFolder: testOutputDir,
            ui5Version: '1.108.0',
            enableTypescript: false
        });

        await expect(
            yeomanTest.default
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
        mockGenerate.mockResolvedValueOnce({} as Editor);
        const commandRunSpy = (CommandRunner.prototype.run = jest
            .fn()
            .mockRejectedValueOnce('Error installing dependencies'));
        // Mock the prompt function to avoid network calls during tests
        mockPrompt.mockResolvedValue({
            libraryName: 'installErrorLib',
            namespace: 'com.sap',
            targetFolder: testOutputDir,
            ui5Version: '1.108.0',
            enableTypescript: false
        });

        await expect(
            yeomanTest.default
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
        mockGenerate.mockResolvedValueOnce({} as Editor);
        mockPrompt.mockResolvedValue(promptAnswers);
        // Use the mocked adapter representing yeoman-environment@4
        yoEnv4 = true;
        await expect(
            yeomanTest.default
                .run(ReuseLibGen, {
                    resolved: reuseLibGenPath
                })
                .withOptions({ skipInstall: false })
        ).resolves.not.toThrow();
        expect(mockPrompt).toHaveBeenCalled();
    });
});
