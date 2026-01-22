import type {
    AbapServiceProvider,
    AdaptationDescriptor,
    AxiosError,
    FlexVersion,
    KeyUserChangeContent
} from '@sap-ux/axios-extension';
import { isAxiosError } from '@sap-ux/axios-extension';
import type { ToolsLogger } from '@sap-ux/logger';
import type { SystemLookup } from '@sap-ux/adp-tooling';
import { getConfiguredProvider } from '@sap-ux/adp-tooling';
import { validateEmptyString } from '@sap-ux/project-input-validator';

import { getKeyUserSystemAdditionalMessages } from '../../../src/app/questions/helper/additional-messages';
import { initI18n, t } from '../../../src/utils/i18n';
import { keyUserPromptNames } from '../../../src/app/types';
import {
    KeyUserImportPrompter,
    DEFAULT_ADAPTATION_ID,
    determineFlexVersion
} from '../../../src/app/questions/key-user';
import { getAdaptationChoices, getKeyUserSystemChoices } from '../../../src/app/questions/helper/choices';

jest.mock('@sap-ux/project-input-validator', () => ({
    ...jest.requireActual('@sap-ux/project-input-validator'),
    validateEmptyString: jest.fn()
}));

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    getConfiguredProvider: jest.fn()
}));

jest.mock('../../../src/app/questions/helper/additional-messages', () => ({
    getKeyUserSystemAdditionalMessages: jest.fn()
}));

jest.mock('../../../src/app/questions/helper/choices', () => ({
    getAdaptationChoices: jest.fn(),
    getKeyUserSystemChoices: jest.fn()
}));

jest.mock('@sap-ux/axios-extension', () => ({
    ...jest.requireActual('@sap-ux/axios-extension'),
    isAxiosError: jest.fn()
}));

const logger: ToolsLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn()
} as unknown as ToolsLogger;

const mockLayeredRepository = {
    listAdaptations: jest.fn(),
    getKeyUserData: jest.fn(),
    getFlexVersions: jest.fn()
};

const defaultProvider: AbapServiceProvider = {
    getLayeredRepository: jest.fn().mockReturnValue(mockLayeredRepository),
    isAbapCloud: jest.fn().mockResolvedValue(true)
} as unknown as AbapServiceProvider;

const systemLookup: SystemLookup = {
    getSystems: jest.fn().mockResolvedValue([
        { Name: 'SystemA', Client: '100', Url: '/systema', Authentication: 'NoAuthentication' },
        { Name: 'SystemB', Client: '200', Url: '/systemb', Authentication: 'Basic' }
    ]),
    getSystemRequiresAuth: jest.fn()
} as unknown as SystemLookup;

const mockAdaptations: AdaptationDescriptor[] = [
    { id: DEFAULT_ADAPTATION_ID, title: 'Default Adaptation', type: 'DEFAULT' }
];

const mockMultipleAdaptations: AdaptationDescriptor[] = [
    { id: DEFAULT_ADAPTATION_ID, title: 'Default Adaptation', type: 'DEFAULT' },
    { id: 'CTX1', title: 'Context 1', type: 'CONTEXT', contexts: { role: ['/UI2/ADMIN'] } }
];

const mockFlexVersions: FlexVersion[] = [{ versionId: '1.0.0' } as FlexVersion];

const mockKeyUserChanges: KeyUserChangeContent[] = [
    {
        content: {
            fileName: 'test.change',
            changeType: 'rename',
            reference: 'test.app'
        }
    }
];

const getSystemsMock = systemLookup.getSystems as jest.Mock;
const isAxiosErrorMock = isAxiosError as unknown as jest.Mock;
const validateEmptyStringMock = validateEmptyString as jest.Mock;
const getConfiguredProviderMock = getConfiguredProvider as jest.Mock;
const getAdaptationChoicesMock = getAdaptationChoices as jest.Mock;
const getKeyUserSystemChoicesMock = getKeyUserSystemChoices as jest.Mock;
const getKeyUserDataMock = mockLayeredRepository.getKeyUserData as jest.Mock;
const getFlexVersionsMock = mockLayeredRepository.getFlexVersions as jest.Mock;
const listAdaptationsMock = mockLayeredRepository.listAdaptations as jest.Mock;
const getSystemRequiresAuthMock = systemLookup.getSystemRequiresAuth as jest.Mock;
const getKeyUserSystemAdditionalMessagesMock = getKeyUserSystemAdditionalMessages as jest.Mock;

describe('KeyUserImportPrompter', () => {
    const componentId = 'demoapps.rta';
    const defaultSystem = 'SystemA';
    let prompter: KeyUserImportPrompter;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        validateEmptyStringMock.mockReturnValue(true);
        getKeyUserSystemAdditionalMessagesMock.mockReturnValue(undefined);
        getAdaptationChoicesMock.mockReturnValue([{ name: 'Default Adaptation', value: mockAdaptations[0] }]);
        getKeyUserSystemChoicesMock.mockReturnValue([
            { name: 'SystemA', value: 'SystemA' },
            { name: 'SystemB', value: 'SystemB' }
        ]);

        prompter = new KeyUserImportPrompter(systemLookup, componentId, defaultProvider, defaultSystem, logger);
    });

    describe('Constructor and Properties', () => {
        it('should initialize with provided parameters', () => {
            expect(prompter).toBeDefined();
            expect(prompter.changes).toEqual([]);
        });
    });

    describe('getPrompts', () => {
        it('should return all prompts by default', () => {
            const prompts = prompter.getPrompts();
            expect(prompts).toHaveLength(4);
            expect(prompts.map((p) => p.name)).toEqual([
                keyUserPromptNames.keyUserSystem,
                keyUserPromptNames.keyUserUsername,
                keyUserPromptNames.keyUserPassword,
                keyUserPromptNames.keyUserAdaptation
            ]);
        });

        it('should filter out hidden prompts', () => {
            const prompts = prompter.getPrompts({
                [keyUserPromptNames.keyUserSystem]: { hide: true },
                [keyUserPromptNames.keyUserPassword]: { hide: true }
            });
            expect(prompts).toHaveLength(2);
            expect(prompts.map((p) => p.name)).toEqual([
                keyUserPromptNames.keyUserUsername,
                keyUserPromptNames.keyUserAdaptation
            ]);
        });
    });

    describe('System Prompt', () => {
        describe('choices', () => {
            it('should call getKeyUserSystemChoices with systems and default system', async () => {
                const mockSystems = [
                    { Name: 'SystemA', Client: '100', Url: '/systema', Authentication: 'NoAuthentication' },
                    { Name: 'SystemB', Client: '200', Url: '/systemb', Authentication: 'Basic' }
                ];
                getSystemsMock.mockResolvedValue(mockSystems);

                const prompt = (prompter as any).getSystemPrompt();
                await prompt.choices();

                expect(getSystemsMock).toHaveBeenCalled();
                expect(getKeyUserSystemChoicesMock).toHaveBeenCalledWith(mockSystems, defaultSystem);
            });
        });

        describe('default', () => {
            it('should use provided default value', () => {
                const prompt = (prompter as any).getSystemPrompt({ default: 'SystemB' });
                expect(prompt.default).toBe('SystemB');
            });
        });

        describe('validate', () => {
            const answers = {
                keyUserSystem: 'SystemA',
                keyUserUsername: 'user',
                keyUserPassword: 'pass',
                keyUserAdaptation: mockAdaptations[0]
            };

            it('should return error if system is empty', async () => {
                validateEmptyStringMock.mockReturnValue('System is required');
                const prompt = prompter['getSystemPrompt']();
                const result = await prompt?.validate?.('', answers);
                expect(result).toBe('System is required');
            });

            it('should use default provider when default system is selected', async () => {
                getFlexVersionsMock.mockResolvedValue({ versions: mockFlexVersions });
                listAdaptationsMock.mockResolvedValue({ adaptations: mockAdaptations });
                getKeyUserDataMock.mockResolvedValue({ contents: mockKeyUserChanges });

                const prompt = prompter['getSystemPrompt']();
                const result = await prompt?.validate?.(defaultSystem, answers);

                expect(result).toBe(true);
                expect(getSystemRequiresAuthMock).not.toHaveBeenCalled();
                expect(getConfiguredProviderMock).not.toHaveBeenCalled();
                expect(prompter.changes).toEqual(mockKeyUserChanges);
            });

            it('should check auth requirement for non-default system', async () => {
                getSystemRequiresAuthMock.mockResolvedValue(false);
                getConfiguredProviderMock.mockResolvedValue(defaultProvider);
                getFlexVersionsMock.mockResolvedValue({ versions: mockFlexVersions });
                listAdaptationsMock.mockResolvedValue({ adaptations: mockAdaptations });
                getKeyUserDataMock.mockResolvedValue({ contents: mockKeyUserChanges });

                const prompt = prompter['getSystemPrompt']();
                const result = await prompt?.validate?.('SystemB', answers);

                expect(result).toBe(true);
                expect(getSystemRequiresAuthMock).toHaveBeenCalledWith('SystemB');
                expect(getConfiguredProviderMock).toHaveBeenCalled();
            });

            it('should return true if auth is required (will show password prompt)', async () => {
                getSystemRequiresAuthMock.mockResolvedValue(true);

                const prompt = prompter['getSystemPrompt']();
                const result = await prompt?.validate?.('SystemB', answers);

                expect(result).toBe(true);
                expect(getSystemRequiresAuthMock).toHaveBeenCalledWith('SystemB');
                expect(getConfiguredProviderMock).not.toHaveBeenCalled();
            });

            it('should return error when no key-user changes found for DEFAULT', async () => {
                getFlexVersionsMock.mockResolvedValue({ versions: mockFlexVersions });
                listAdaptationsMock.mockResolvedValue({ adaptations: mockAdaptations });
                getKeyUserDataMock.mockResolvedValue({ contents: [] });

                const prompt = prompter['getSystemPrompt']();
                const result = await prompt?.validate?.(defaultSystem, answers);

                expect(result).toBe(t('error.keyUserNoChangesDefault'));
            });

            it('should return error message on exception', async () => {
                getSystemRequiresAuthMock.mockRejectedValue(new Error('Connection failed'));

                const prompt = prompter['getSystemPrompt']();
                const result = await prompt?.validate?.('SystemB', answers);

                expect(result).toBe('Connection failed');
            });
        });

        describe('additionalMessages', () => {
            it('should call getKeyUserSystemAdditionalMessages with correct parameters', () => {
                prompter['adaptations'] = mockAdaptations;
                prompter['isAuthRequired'] = false;

                const prompt = prompter['getSystemPrompt']();
                prompt?.additionalMessages?.();

                expect(getKeyUserSystemAdditionalMessagesMock).toHaveBeenCalledWith({
                    adaptations: mockAdaptations,
                    isAuthRequired: false,
                    isSystemPrompt: true
                });
            });
        });
    });

    describe('Username Prompt', () => {
        describe('default', () => {
            it('should use provided default value', () => {
                const prompt = prompter['getUsernamePrompt']({ default: 'testuser' });
                expect(prompt.default).toBe('testuser');
            });
        });

        describe('filter', () => {
            it('should trim whitespace from input', () => {
                const prompt = prompter['getUsernamePrompt']();
                expect(
                    prompt?.filter?.('  testuser  ', {
                        keyUserSystem: 'SystemB',
                        keyUserAdaptation: mockAdaptations[0]
                    })
                ).toBe('testuser');
            });
        });

        describe('validate', () => {
            it('should call validateEmptyString', () => {
                validateEmptyStringMock.mockReturnValue('Username is required');
                const prompt = prompter['getUsernamePrompt']();
                const result = prompt?.validate?.('', {
                    keyUserSystem: 'SystemB',
                    keyUserAdaptation: mockAdaptations[0]
                });
                expect(result).toBe('Username is required');
                expect(validateEmptyStringMock).toHaveBeenCalledWith('');
            });
        });

        describe('when', () => {
            it('should return true when auth is required and system is selected', () => {
                prompter['isAuthRequired'] = true;
                const prompt = (prompter as any).getUsernamePrompt();
                expect(prompt.when({ keyUserSystem: 'SystemB' })).toBe(true);
            });

            it('should return false when auth is not required', () => {
                prompter['isAuthRequired'] = false;
                const prompt = (prompter as any).getUsernamePrompt();
                expect(prompt.when({ keyUserSystem: 'SystemB' })).toBe(false);
            });

            it('should return false when system is not selected', () => {
                prompter['isAuthRequired'] = true;
                const prompt = (prompter as any).getUsernamePrompt();
                expect(prompt.when({})).toBe(false);
            });
        });
    });

    describe('Password Prompt', () => {
        describe('default', () => {
            it('should use provided default value', () => {
                const prompt = prompter['getPasswordPrompt']({
                    default: 'testpass'
                });
                expect(prompt.default).toBe('testpass');
            });
        });

        describe('validate', () => {
            const answers = {
                keyUserSystem: 'SystemB',
                keyUserUsername: 'user',
                keyUserPassword: 'pass',
                keyUserAdaptation: mockAdaptations[0]
            };

            it('should return error if password is empty', async () => {
                validateEmptyStringMock.mockReturnValue('Password is required');
                const prompt = prompter['getPasswordPrompt']();
                const result = await prompt?.validate?.('', answers);
                expect(result).toBe('Password is required');
            });

            it('should create provider and validate key-user changes', async () => {
                getConfiguredProviderMock.mockResolvedValue(defaultProvider);
                getFlexVersionsMock.mockResolvedValue({ versions: mockFlexVersions });
                listAdaptationsMock.mockResolvedValue({ adaptations: mockAdaptations });
                getKeyUserDataMock.mockResolvedValue({ contents: mockKeyUserChanges });

                const prompt = prompter['getPasswordPrompt']();
                const result = await prompt?.validate?.('password123', answers);

                expect(result).toBe(true);
                expect(getConfiguredProviderMock).toHaveBeenCalledWith(
                    {
                        system: 'SystemB',
                        client: undefined,
                        username: 'user',
                        password: 'password123'
                    },
                    logger
                );
                expect(getKeyUserDataMock).toHaveBeenCalledWith(componentId, DEFAULT_ADAPTATION_ID);
            });

            it('should return error message on exception', async () => {
                getConfiguredProviderMock.mockRejectedValue(new Error('Authentication failed'));

                const prompt = prompter['getPasswordPrompt']();
                const result = await prompt?.validate?.('password123', answers);

                expect(result).toBe('Authentication failed');
            });
        });

        describe('additionalMessages', () => {
            it('should call getKeyUserSystemAdditionalMessages with correct parameters', () => {
                prompter['adaptations'] = mockAdaptations;
                prompter['isAuthRequired'] = true;

                const prompt = prompter['getPasswordPrompt']();
                prompt?.additionalMessages?.();

                expect(getKeyUserSystemAdditionalMessagesMock).toHaveBeenCalledWith({
                    adaptations: mockAdaptations,
                    isAuthRequired: true,
                    isSystemPrompt: false
                });
            });
        });

        describe('when', () => {
            it('should return true when auth is required and system is selected', () => {
                prompter['isAuthRequired'] = true;
                const prompt = (prompter as any).getPasswordPrompt();
                expect(prompt.when({ keyUserSystem: 'SystemB' })).toBe(true);
            });

            it('should return false when auth is not required', () => {
                prompter['isAuthRequired'] = false;
                const prompt = (prompter as any).getPasswordPrompt();
                expect(prompt.when({ keyUserSystem: 'SystemB' })).toBe(false);
            });

            it('should return false when system is not selected', () => {
                prompter['isAuthRequired'] = true;
                const prompt = (prompter as any).getPasswordPrompt();
                expect(prompt.when({})).toBe(false);
            });
        });
    });

    describe('Adaptation Prompt', () => {
        describe('choices', () => {
            it('should call getAdaptationChoices with adaptations', () => {
                prompter['adaptations'] = mockAdaptations;
                const prompt = (prompter as any).getAdaptationPrompt();
                prompt.choices();

                expect(getAdaptationChoicesMock).toHaveBeenCalledWith(mockAdaptations);
            });
        });

        describe('default', () => {
            it('should return first choice name', () => {
                prompter['adaptations'] = mockAdaptations;
                const prompt = prompter['getAdaptationPrompt']();
                const result = prompt?.default?.();
                expect(result).toBe('Default Adaptation');
            });
        });

        describe('validate', () => {
            it('should return false if adaptation is null', async () => {
                const prompt = prompter['getAdaptationPrompt']();
                const result = await prompt?.validate?.(null);
                expect(result).toBe(false);
            });

            it('should return true when key-user changes are found', async () => {
                prompter['adaptations'] = mockAdaptations;
                getKeyUserDataMock.mockResolvedValue({ contents: mockKeyUserChanges });

                const prompt = prompter['getAdaptationPrompt']();
                const result = await prompt?.validate?.(mockAdaptations[0]);

                expect(result).toBe(true);
                expect(getKeyUserDataMock).toHaveBeenCalledWith(componentId, DEFAULT_ADAPTATION_ID);
                expect(prompter.changes).toEqual(mockKeyUserChanges);
            });

            it('should return error when no changes found for DEFAULT adaptation (single adaptation)', async () => {
                prompter['adaptations'] = mockAdaptations;
                getKeyUserDataMock.mockResolvedValue({ contents: [] });

                const prompt = prompter['getAdaptationPrompt']();
                const result = await prompt?.validate?.(mockAdaptations[0]);

                expect(result).toBe(t('error.keyUserNoChangesDefault'));
                expect(logger.warn).not.toHaveBeenCalled();
            });

            it('should return error when no changes found for specific adaptation', async () => {
                prompter['adaptations'] = mockMultipleAdaptations;
                getKeyUserDataMock.mockResolvedValue({ contents: [] });

                const prompt = prompter['getAdaptationPrompt']();
                const result = await prompt?.validate?.(mockMultipleAdaptations[1]);

                expect(result).toBe(t('error.keyUserNoChangesAdaptation', { adaptationId: 'CTX1' }));
                expect(logger.warn).toHaveBeenCalled();
            });

            it('should return error message on exception', async () => {
                prompter['adaptations'] = mockAdaptations;
                const error = new Error('API call failed');
                getKeyUserDataMock.mockRejectedValue(error);
                isAxiosErrorMock.mockReturnValue(false);

                const prompt = prompter['getAdaptationPrompt']();
                const result = await prompt?.validate?.(mockAdaptations[0]);

                expect(result).toBe('API call failed');
                expect(logger.error).toHaveBeenCalled();
                expect(logger.debug).toHaveBeenCalledWith(error);
            });

            it('should return user-friendly message for 404 status code', async () => {
                prompter['adaptations'] = mockAdaptations;
                const axiosError = {
                    isAxiosError: true,
                    message: 'Not Found',
                    name: 'AxiosError',
                    response: {
                        status: 404,
                        statusText: 'Not Found'
                    }
                } as AxiosError;
                getKeyUserDataMock.mockRejectedValue(axiosError);
                isAxiosErrorMock.mockReturnValue(true);

                const prompt = prompter['getAdaptationPrompt']();
                const result = await prompt?.validate?.(mockAdaptations[0]);

                expect(result).toBe(t('error.keyUserNotSupported'));
                expect(logger.error).toHaveBeenCalled();
                expect(logger.debug).toHaveBeenCalledWith(axiosError);
            });
        });

        describe('when', () => {
            it('should return true when multiple adaptations exist', () => {
                prompter['adaptations'] = mockMultipleAdaptations;
                const prompt = (prompter as any).getAdaptationPrompt();
                expect(prompt.when()).toBe(true);
            });

            it('should return false when only one adaptation exists', () => {
                prompter['adaptations'] = mockAdaptations;
                const prompt = (prompter as any).getAdaptationPrompt();
                expect(prompt.when()).toBe(false);
            });
        });
    });

    describe('Internal Methods', () => {
        describe('loadDataAndValidateKeyUserChanges', () => {
            it('should load flex versions and adaptations', async () => {
                getFlexVersionsMock.mockResolvedValue({ versions: mockFlexVersions });
                listAdaptationsMock.mockResolvedValue({ adaptations: mockAdaptations });
                getKeyUserDataMock.mockResolvedValue({ contents: mockKeyUserChanges });

                const result = await prompter['loadDataAndValidateKeyUserChanges']();

                expect(getFlexVersionsMock).toHaveBeenCalledWith(componentId);
                expect(listAdaptationsMock).toHaveBeenCalledWith(componentId, '1.0.0');
                expect(result).toBe(true);
            });

            it('should validate key-user changes when only DEFAULT adaptation exists', async () => {
                getFlexVersionsMock.mockResolvedValue({ versions: mockFlexVersions });
                listAdaptationsMock.mockResolvedValue({ adaptations: mockAdaptations });
                getKeyUserDataMock.mockResolvedValue({ contents: mockKeyUserChanges });

                const result = await prompter['loadDataAndValidateKeyUserChanges']();

                expect(getKeyUserDataMock).toHaveBeenCalledWith(componentId, DEFAULT_ADAPTATION_ID);
                expect(result).toBe(true);
            });

            it('should return true when multiple adaptations exist', async () => {
                getFlexVersionsMock.mockResolvedValue({ versions: mockFlexVersions });
                listAdaptationsMock.mockResolvedValue({ adaptations: mockMultipleAdaptations });

                const result = await prompter['loadDataAndValidateKeyUserChanges']();

                expect(result).toBe(true);
                expect(getKeyUserDataMock).not.toHaveBeenCalled();
            });

            it('should throw error when no adaptations found', async () => {
                getFlexVersionsMock.mockResolvedValue({ versions: mockFlexVersions });
                listAdaptationsMock.mockResolvedValue({ adaptations: [] });

                await expect(prompter['loadDataAndValidateKeyUserChanges']()).rejects.toThrow();
            });
        });
    });
});

describe('determineFlexVersion', () => {
    it('should return second version when first version is draft (versionId "0")', () => {
        const flexVersions: FlexVersion[] = [
            { versionId: '0' } as FlexVersion,
            { versionId: '00025E29EA041FD0BB9495569AC3D2AD' } as FlexVersion
        ];
        expect(determineFlexVersion(flexVersions)).toBe('00025E29EA041FD0BB9495569AC3D2AD');
    });

    it('should return first version when it is not draft (versionId is not "0")', () => {
        const flexVersions: FlexVersion[] = [
            { versionId: '1.0.0' } as FlexVersion,
            { versionId: '00025E29EA041FD0BB9495569AC3D2AD' } as FlexVersion
        ];
        expect(determineFlexVersion(flexVersions)).toBe('1.0.0');
    });

    it('should return empty string when array is empty or null/undefined', () => {
        expect(determineFlexVersion([])).toBe('');
        expect(determineFlexVersion(null as any)).toBe('');
        expect(determineFlexVersion(undefined as any)).toBe('');
    });

    it('should return empty string when only one version exists and it is "0"', () => {
        const flexVersions: FlexVersion[] = [{ versionId: '0' } as FlexVersion];
        expect(determineFlexVersion(flexVersions)).toBe('');
    });
});
