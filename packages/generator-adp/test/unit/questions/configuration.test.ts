import type { ToolsLogger } from '@sap-ux/logger';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import { FlexLayer, TargetApplications } from '@sap-ux/adp-tooling';
import type { AbapProvider, ConfigAnswers, TargetApplication, TargetSystems } from '@sap-ux/adp-tooling';

import { initI18n } from '../../../src/utils/i18n';
import { configPromptNames } from '../../../src/app/types';
import { ConfigPrompter } from '../../../src/app/questions/configuration';
import { showCredentialQuestion } from '../../../src/app/questions/helper/conditions';

jest.mock('../../../src/app/questions/helper/conditions', () => ({
    showApplicationQuestion: jest.fn().mockResolvedValue(true),
    showCredentialQuestion: jest.fn().mockResolvedValue(true)
}));

const logger: ToolsLogger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
} as unknown as ToolsLogger;

const abapProvider = {
    setProvider: jest.fn().mockResolvedValue(undefined)
} as unknown as AbapProvider;

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

describe('ConfigPrompter Integration Tests', () => {
    let configPrompter: ConfigPrompter;
    let getAppsMock: jest.SpyInstance;
    const layer = FlexLayer.CUSTOMER_BASE;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        getAppsMock = jest
            .spyOn(TargetApplications.prototype, 'getApps')
            .mockImplementation(() => Promise.resolve(dummyApps));
        configPrompter = new ConfigPrompter(abapProvider, targetSystems, layer, logger);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('General', () => {
        it('should return four prompts with correct names', () => {
            const prompts = configPrompter.getPrompts();

            expect(prompts).toHaveLength(4);
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
            getAppsMock.mockRejectedValue(error);

            const prompts = configPrompter.getPrompts();
            const systemPrompt = prompts.find((p) => p.name === configPromptNames.system);
            expect(systemPrompt).toBeDefined();

            const result = await systemPrompt?.validate?.(dummyAnswers.system, dummyAnswers);

            expect(result).toEqual(error.message);
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
            expect(showCredentialQuestion).toHaveBeenCalledWith(dummyAnswers, expect.anything());
        });
    });

    describe('Password Prompt', () => {
        it('password prompt validate should call setProvider and return true', async () => {
            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();

            const result = await passwordPrompt?.validate?.(dummyAnswers.password, dummyAnswers);

            expect(result).toBe(true);
            expect(abapProvider.setProvider).toHaveBeenCalledWith(
                dummyAnswers.system,
                undefined,
                dummyAnswers.username,
                dummyAnswers.password
            );
        });

        it('password prompt validate should call return string if not value is passed', async () => {
            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();

            const result = await passwordPrompt?.validate?.(undefined, dummyAnswers);

            expect(result).toBe('Input cannot be empty.');
            expect(abapProvider.setProvider).not.toHaveBeenCalled();
        });

        it('password prompt validate should call return error message when error occurs', async () => {
            const error = new Error('Test error');
            getAppsMock.mockRejectedValue(error);

            const prompts = configPrompter.getPrompts();
            const passwordPrompt = prompts.find((p) => p.name === configPromptNames.password);
            expect(passwordPrompt).toBeDefined();

            const result = await passwordPrompt?.validate?.(dummyAnswers.password, dummyAnswers);

            expect(result).toBe('Test error');
            expect(abapProvider.setProvider).toHaveBeenCalledWith(
                dummyAnswers.system,
                undefined,
                dummyAnswers.username,
                dummyAnswers.password
            );
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

        it('application prompt choices should return values from getApplicationChoices', async () => {
            const prompts = configPrompter.getPrompts();
            const appPrompt = prompts.find(
                (p) => p.name === configPromptNames.application
            ) as ListQuestion<ConfigAnswers>;
            expect(appPrompt).toBeDefined();

            const choicesFn = appPrompt!.choices;
            expect(typeof choicesFn).toBe('function');

            const choices = await (choicesFn as () => Promise<string[]>)();

            expect(choices).toEqual([
                {
                    name: 'App One (app1)',
                    value: {
                        ach: '',
                        bspName: '',
                        bspUrl: '',
                        fileType: '',
                        id: 'app1',
                        registrationIds: [],
                        title: 'App One'
                    }
                },
                {
                    name: 'App Two (app2)',
                    value: {
                        ach: '',
                        bspName: '',
                        bspUrl: '',
                        fileType: '',
                        id: 'app2',
                        registrationIds: [],
                        title: 'App Two'
                    }
                }
            ]);
        });
    });
});
