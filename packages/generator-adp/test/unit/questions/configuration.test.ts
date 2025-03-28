import type { ToolsLogger } from '@sap-ux/logger';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import { isAxiosError, type AbapServiceProvider, AxiosError } from '@sap-ux/axios-extension';
import { FlexLayer, getConfiguredProvider, loadApps } from '@sap-ux/adp-tooling';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { ConfigAnswers, TargetApplication, TargetSystems } from '@sap-ux/adp-tooling';

import { initI18n } from '../../../src/utils/i18n';
import { configPromptNames } from '../../../src/app/types';
import { ConfigPrompter } from '../../../src/app/questions/configuration';

jest.mock('../../../src/app/questions/helper/conditions', () => ({
    showApplicationQuestion: jest.fn().mockResolvedValue(true),
    showCredentialQuestion: jest.fn().mockResolvedValue(true)
}));

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
    getHostEnvironment: jest.fn()
}));

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    getConfiguredProvider: jest.fn(),
    loadApps: jest.fn()
}));

jest.mock('@sap-ux/axios-extension', () => ({
    ...jest.requireActual('@sap-ux/axios-extension'),
    isAxiosError: jest.fn()
}));

const logger: ToolsLogger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
} as unknown as ToolsLogger;

const getSystemInfoMock = jest.fn();
const provider = {
    getLayeredRepository: jest.fn().mockReturnValue({
        getSystemInfo: getSystemInfoMock
    })
} as unknown as AbapServiceProvider;

const targetSystems: TargetSystems = {
    getSystems: jest.fn().mockResolvedValue([
        { Name: 'SystemB', Client: '200', Url: 'http://systemb.com', Authentication: 'Basic' },
        { Name: 'systemA', Client: '010', Url: 'http://systema.com', Authentication: 'NoAuthentication' }
    ]),
    getSystemRequiresAuth: jest.fn().mockResolvedValue(false)
} as unknown as TargetSystems;

const dummyApps = [
    { id: 'app1', title: 'App One', ach: '', bspName: '', bspUrl: '', fileType: '', registrationIds: [] },
    { id: 'app2', title: 'App Two', ach: '', bspName: '', bspUrl: '', fileType: '', registrationIds: [] }
];

const dummyAnswers: ConfigAnswers = {
    system: 'SYS010',
    username: 'user1',
    password: 'pass1',
    application: { id: 'app1', title: 'Some Title' } as unknown as TargetApplication
};

const loadAppsMock = loadApps as jest.Mock;
const isAxiosErrorMock = isAxiosError as unknown as jest.Mock;
const getHostEnvironmentMock = getHostEnvironment as jest.Mock;
const getConfiguredProviderMock = getConfiguredProvider as jest.Mock;

describe('ConfigPrompter Integration Tests', () => {
    let configPrompter: ConfigPrompter;
    const layer = FlexLayer.CUSTOMER_BASE;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        getHostEnvironmentMock.mockReturnValue(hostEnvironment.vscode);
        loadAppsMock.mockResolvedValue(dummyApps);
        getConfiguredProviderMock.mockResolvedValue(provider);
        configPrompter = new ConfigPrompter(targetSystems, layer, logger);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('General', () => {
        it('should return four prompts with correct names', () => {
            const prompts = configPrompter.getPrompts();

            expect(prompts).toHaveLength(6);
            const names = prompts.map((p) => p.name);

            names.map((name) => {
                expect(name).toContain(configPromptNames[name as configPromptNames]);
            });
        });
    });

    describe('System Prompt', () => {
        it('system prompt choices should return sorted endpoint names', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find(
                (p) => p.name === configPromptNames.system
            ) as ListQuestion<ConfigAnswers>;
            expect(systemPrompt).toBeDefined();

            const choicesFn = systemPrompt!.choices;
            expect(typeof choicesFn).toBe('function');

            const choices = await (choicesFn as () => Promise<string[]>)();
            expect(choices).toEqual(['systemA', 'SystemB']);
        });

        it('system prompt validate should return true', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(true);
        });

        it('system prompt validate should return string when input is empty', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();

            const result = await systemPrompt?.validate?.(undefined, dummyAnswers);

            expect(result).toEqual('Input cannot be empty.');
        });

        it('system prompt validate should throw error', async () => {
            const error = new Error('Test error');
            loadAppsMock.mockRejectedValue(error);

            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(error.message);
        });

        it('system prompt validate should throw error when system info call fails', async () => {
            const axiosError = {
                isAxiosError: true,
                message: 'Unauthorized',
                name: 'AxiosError',
                response: {
                    status: 401,
                    statusText: 'Unauthorized'
                }
            } as AxiosError;
            getSystemInfoMock.mockRejectedValueOnce(axiosError);
            isAxiosErrorMock.mockReturnValueOnce(true);

            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(`Authentication error: ${axiosError.message}`);
        });
    });

    describe('System CLI Validation Prompt', () => {
        beforeEach(() => {
            getHostEnvironmentMock.mockReturnValue(hostEnvironment.cli);
        });

        it('system validation cli prompt when should return false if all validations pass', async () => {
            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.systemValidationCli);
            expect(systemPrompt).toBeDefined();

            const whenFn = systemPrompt?.when;
            expect(typeof whenFn).toBe('function');

            const result = await (whenFn as (answers: ConfigAnswers) => Promise<boolean>)(dummyAnswers);

            expect(result).toEqual(false);
        });

        it('system validation cli prompt when should throw error if validation returns message', async () => {
            const error = new Error('Test error');
            loadAppsMock.mockRejectedValue(error);

            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.systemValidationCli);
            expect(systemPrompt).toBeDefined();

            const whenFn = systemPrompt?.when;
            expect(typeof whenFn).toBe('function');

            await expect((whenFn as (answers: ConfigAnswers) => Promise<boolean>)(dummyAnswers)).rejects.toThrow(
                error.message
            );
        });
    });

    describe('Username Prompt', () => {
        it('username prompt when function should call showCredentialQuestion and return its value', async () => {
            const prompts = configPrompter.getPrompts();
            const usernamePrompt = prompts.find((p) => p.name === configPromptNames.username);
            expect(usernamePrompt).toBeDefined();

            const whenFn = usernamePrompt?.when;
            expect(typeof whenFn).toBe('function');

            const whenResult = await (whenFn as (answers: ConfigAnswers) => Promise<boolean>)(dummyAnswers);
            expect(whenResult).toBe(true);
        });
    });

    describe('Password Prompt', () => {
        it('password prompt validate should call getConfiguredProvider and return true', async () => {
            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();

            const result = await passwordPrompt?.validate?.(dummyAnswers.password, dummyAnswers);

            expect(result).toBe(true);
        });

        it('password prompt validate should call return string if not value is passed', async () => {
            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();

            const result = await passwordPrompt?.validate?.(undefined, dummyAnswers);

            expect(result).toBe('Input cannot be empty.');
        });

        it('password prompt validate should call return error message when error occurs', async () => {
            const error = new Error('Test error');
            loadAppsMock.mockRejectedValue(error);

            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();

            const result = await passwordPrompt?.validate?.(dummyAnswers.password, dummyAnswers);

            expect(result).toBe('Test error');
        });
    });

    describe('Application Prompt', () => {
        it('application prompt validate should return true if value is passed', async () => {
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            expect(appPrompt).toBeDefined();

            const result = appPrompt?.validate?.(dummyApps[0], dummyAnswers);

            expect(result).toEqual(true);
        });

        it('application prompt validate should return string if value is not passed', async () => {
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.application);
            expect(appPrompt).toBeDefined();

            const result = appPrompt?.validate?.(undefined, dummyAnswers);

            expect(result).toEqual('Application has to be selected.');
        });
    });

    describe('Application CLI Validation Prompt', () => {
        beforeEach(() => {
            getHostEnvironmentMock.mockReturnValue(hostEnvironment.cli);
        });

        it('application validation cli prompt when should return false if all validations pass', async () => {
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find((p) => p.name === configPromptNames.appValidationCli);
            expect(appPrompt).toBeDefined();

            const whenFn = appPrompt?.when;
            expect(typeof whenFn).toBe('function');

            const result = await (whenFn as (answers: ConfigAnswers) => Promise<boolean>)(dummyAnswers);

            expect(result).toEqual(false);
        });
    });
});
