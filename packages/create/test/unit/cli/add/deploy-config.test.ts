import { jest } from '@jest/globals';
import type { Editor } from 'mem-fs-editor';
import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

import { createProjectAccessMock } from '../__mocks__/project-access-mock';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockGetLogger = jest.fn();
const mockSetLogLevelVerbose = jest.fn();
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

jest.unstable_mockModule('../../../../src/validation', () => ({
    validateBasePath: jest.fn(),
    validateAdpAppType: jest.fn(),
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
}));

const mockGetPrompts = jest.fn();
const mockReconcileAnswers = jest.fn();
jest.unstable_mockModule('@sap-ux/abap-deploy-config-inquirer', () => ({
    getPrompts: mockGetPrompts,
    reconcileAnswers: mockReconcileAnswers
}));

const mockGenerate = jest.fn();
jest.unstable_mockModule('@sap-ux/abap-deploy-config-writer', () => ({
    generate: mockGenerate
}));

const mockGetAppType = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () =>
    createProjectAccessMock({
        getAppType: mockGetAppType
    })
);

const mockPrompt = jest.fn();
// prompts default export is a function with 'prompt' as a property
const mockPromptsModule = Object.assign(mockPrompt, { prompt: mockPrompt });
jest.unstable_mockModule('prompts', () => ({
    default: mockPromptsModule
}));

const mockGetExistingAdpProjectType = jest.fn();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    getExistingAdpProjectType: mockGetExistingAdpProjectType,
    getVariant: jest.fn(),
    isCFEnvironment: jest.fn().mockResolvedValue(false)
}));

const { addDeployConfigCommand } = await import('../../../../src/cli/add/deploy-config');

describe('add/deploy-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');

    let loggerMock: ToolsLogger;
    let fsMock: Editor;

    const getArgv = (arg: string[]) => ['', '', ...arg];

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock setup
        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        mockGetLogger.mockReturnValue(loggerMock);
        mockSetLogLevelVerbose.mockImplementation(() => undefined);
        fsMock = {
            dump: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        mockGetExistingAdpProjectType.mockResolvedValue(undefined);
        mockReconcileAnswers.mockReturnValue({});
    });

    test('should prompt for target when not provided', async () => {
        mockGetPrompts.mockResolvedValueOnce({ prompts: [], answers: {} });
        mockGenerate.mockResolvedValueOnce(fsMock);
        mockPrompt.mockResolvedValueOnce({ target: 'abap' });

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot]));

        // Result check
        expect(mockPrompt).toHaveBeenCalledTimes(1);
        expect(mockGetPrompts).toHaveBeenCalledTimes(1);
        expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    test('should log when cf deploy config is requested', async () => {
        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--target', 'cf']));

        // Result check
        expect(loggerMock.info).toHaveBeenCalledWith('Cloud Foundry deployment is not yet implemented.');
    });

    test('should add deploy config', async () => {
        mockGetPrompts.mockResolvedValueOnce({ prompts: [], answers: {} });
        mockGenerate.mockResolvedValueOnce(fsMock);

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--target', 'abap']));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('should add deploy config for Fiori elements project', async () => {
        mockGetPrompts.mockResolvedValueOnce({ prompts: [], answers: {} });
        mockGenerate.mockResolvedValueOnce(fsMock);
        mockGetAppType.mockResolvedValue('SAP Fiori elements');

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--target', 'abap']));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('should add deploy config for Adp project', async () => {
        mockGetExistingAdpProjectType.mockResolvedValue(AdaptationProjectType.ON_PREMISE);
        mockGetPrompts.mockResolvedValueOnce({ prompts: [], answers: {} });
        mockGenerate.mockResolvedValueOnce(fsMock);
        mockGetAppType.mockResolvedValue('Fiori Adaptation');

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot]));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(mockGetPrompts).toHaveBeenCalledWith(
            {
                ui5AbapRepo: { hideIfOnPremise: true },
                packageAutocomplete: {
                    useAutocomplete: true,
                    additionalValidation: {
                        shouldValidatePackageType: true,
                        shouldValidatePackageForStartingPrefix: true
                    }
                },
                packageManual: {
                    additionalValidation: {
                        shouldValidatePackageType: true,
                        shouldValidatePackageForStartingPrefix: true
                    }
                },
                transportInputChoice: { hideIfOnPremise: true },
                adpProjectType: AdaptationProjectType.ON_PREMISE
            },
            loggerMock,
            false
        );
    });

    test('should add deploy config --simulate', async () => {
        mockGetPrompts.mockResolvedValueOnce({ prompts: [], answers: {} });
        mockGenerate.mockResolvedValueOnce(fsMock);

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--target', 'abap', '--simulate']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('should add deploy config --verbose', async () => {
        mockGetPrompts.mockResolvedValueOnce({ prompts: [], answers: {} });
        mockGenerate.mockResolvedValueOnce(fsMock);

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--target', 'abap', '--verbose']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('should report error', async () => {
        const errorObj = new Error('Error generating deployment configuration');

        mockGetPrompts.mockResolvedValueOnce({ prompts: [], answers: {} });
        mockGenerate.mockImplementationOnce(() => {
            throw errorObj;
        });

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--target', 'abap', '--verbose']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith(`Error while executing add deploy-config '${errorObj.message}'`);
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('should add deployment config when answers are returned by prompting', async () => {
        const promptAnswers = {
            url: 'http://example.com',
            client: '100',
            scp: false,
            ui5AbapRepo: 'ZUI5_REPO',
            package: 'ZPACKAGE',
            description: 'UI5 App',
            transport: 'TRDUMMY'
        };

        mockGetPrompts.mockResolvedValueOnce({ prompts: [], answers: {} });
        mockGenerate.mockResolvedValueOnce(fsMock);
        mockPrompt.mockResolvedValueOnce({ target: 'abap' });
        mockReconcileAnswers.mockReturnValueOnce(promptAnswers);

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--verbose']));

        // Result check
        expect(loggerMock.debug).toHaveBeenCalledWith(
            `Adding deployment configuration : ${JSON.stringify(
                {
                    target: {
                        url: promptAnswers.url,
                        client: promptAnswers.client,
                        scp: promptAnswers.scp
                    },
                    app: {
                        name: promptAnswers.ui5AbapRepo,
                        package: promptAnswers.package,
                        description: promptAnswers.description,
                        transport: promptAnswers.transport
                    }
                },
                null,
                2
            )}`
        );
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('should add deployment config for Adp project with on-Premise system when answers are returned by prompting ', async () => {
        const promptAnswers = {
            url: 'http://example.com',
            client: '100',
            isS4HC: false,
            package: 'ZPACKAGE',
            transport: 'TRDUMMY'
        };

        mockGetPrompts.mockResolvedValueOnce({ prompts: [], answers: {} });
        mockGetAppType.mockResolvedValue('Fiori Adaptation');
        mockGenerate.mockResolvedValueOnce(fsMock);
        mockPrompt.mockResolvedValueOnce({ target: 'abap' });
        mockReconcileAnswers.mockReturnValueOnce(promptAnswers);

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--verbose']));

        // Result check
        expect(loggerMock.debug).toHaveBeenCalledWith(
            `Adding deployment configuration : ${JSON.stringify(
                {
                    target: {
                        url: promptAnswers.url,
                        client: promptAnswers.client
                    },
                    app: {
                        package: promptAnswers.package,
                        transport: promptAnswers.transport
                    }
                },
                null,
                2
            )}`
        );
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('should add deployment config for Adp project with Cloud system when answers are returned by prompting ', async () => {
        const promptAnswers = {
            url: 'http://example.com',
            client: '100',
            isS4HC: true,
            ui5AbapRepo: 'ZUI5_REPO',
            package: 'ZPACKAGE',
            description: 'UI5 App',
            transport: 'TRDUMMY'
        };

        mockGetPrompts.mockResolvedValueOnce({ prompts: [], answers: {} });
        mockGetAppType.mockResolvedValue('Fiori Adaptation');
        mockGenerate.mockResolvedValueOnce(fsMock);
        mockPrompt.mockResolvedValueOnce({ target: 'abap' });
        mockReconcileAnswers.mockReturnValueOnce(promptAnswers);

        // Test execution
        const command = new Command('add');
        addDeployConfigCommand(command);
        await command.parseAsync(getArgv(['deploy-config', appRoot, '--verbose']));

        // Result check
        expect(loggerMock.debug).toHaveBeenCalledWith(
            `Adding deployment configuration : ${JSON.stringify(
                {
                    target: {
                        url: promptAnswers.url,
                        client: promptAnswers.client
                    },
                    app: {
                        name: promptAnswers.ui5AbapRepo,
                        package: promptAnswers.package,
                        description: promptAnswers.description,
                        transport: promptAnswers.transport
                    }
                },
                null,
                2
            )}`
        );
        expect(fsMock.commit).toHaveBeenCalled();
    });
});
