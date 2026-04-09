import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapTarget } from '@sap-ux/system-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

const mockIsAppStudio = jest.fn();
const mockValidateEmptyString = jest.fn();
const mockGetConfiguredProvider = jest.fn();

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio
}));

const realProjectInputValidator = await import('@sap-ux/project-input-validator');
jest.unstable_mockModule('@sap-ux/project-input-validator', () => ({
    ...realProjectInputValidator,
    validateEmptyString: mockValidateEmptyString
}));

const realAdpTooling = await import('@sap-ux/adp-tooling');
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...realAdpTooling,
    getConfiguredProvider: mockGetConfiguredProvider
}));

const { initI18n, t } = await import('../../../../src/utils/i18n');
const { configPromptNames } = await import('../../../../src/app/types');
const { getCredentialsPrompts } = await import('../../../../src/base/questions/credentials');

type Credentials = import('../../../../src/types').Credentials;

describe('Credentials Prompts', () => {
    let mockLogger: ToolsLogger;
    let mockAbapTarget: AbapTarget;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as unknown as ToolsLogger;

        mockAbapTarget = {
            url: 'some-system',
            destination: 'SYS_010',
            client: '010'
        };

        mockIsAppStudio.mockReturnValue(false);
        mockValidateEmptyString.mockReturnValue(true);
    });

    describe('getCredentialsPrompts', () => {
        it('should return an array with username and password prompts', () => {
            const result = getCredentialsPrompts(mockAbapTarget, mockLogger);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe(configPromptNames.username);
            expect(result[1].name).toBe(configPromptNames.password);
        });

        it('should pass abapTarget and logger to password prompt', () => {
            const result = getCredentialsPrompts(mockAbapTarget, mockLogger);
            const passwordPrompt = result[1];

            expect(passwordPrompt.type).toBe('password');
            expect(passwordPrompt.name).toBe(configPromptNames.password);
        });
    });

    describe('Username Prompt', () => {
        it('should have correct username prompt structure', () => {
            const result = getCredentialsPrompts(mockAbapTarget, mockLogger);
            const usernamePrompt = result[0];

            expect(usernamePrompt.type).toBe('input');
            expect(usernamePrompt.name).toBe(configPromptNames.username);
            expect(usernamePrompt.message).toBe(t('prompts.usernameLabel'));
            expect(usernamePrompt.guiOptions).toEqual({
                mandatory: true
            });
        });

        it('should have mandatory guiOptions', () => {
            const result = getCredentialsPrompts(mockAbapTarget, mockLogger);
            const usernamePrompt = result[0];

            expect(usernamePrompt.guiOptions).toEqual({
                mandatory: true
            });
        });
    });

    describe('Password Prompt', () => {
        let passwordPrompt: any;
        let mockGetSystemInfo: jest.Mock;

        beforeEach(() => {
            const result = getCredentialsPrompts(mockAbapTarget, mockLogger);
            passwordPrompt = result[1];
            mockGetSystemInfo = jest.fn();
            mockGetConfiguredProvider.mockResolvedValue({
                getLayeredRepository: () => ({ getSystemInfo: mockGetSystemInfo })
            } as unknown as AbapServiceProvider);
        });

        it('should have correct password prompt structure', () => {
            expect(passwordPrompt).toEqual({
                type: 'password',
                name: configPromptNames.password,
                message: t('prompts.passwordLabel'),
                mask: '*',
                guiOptions: {
                    mandatory: true,
                    type: 'login'
                },
                validate: expect.any(Function)
            });
        });

        it('should use system URL when not in AppStudio', async () => {
            mockIsAppStudio.mockReturnValue(false);
            mockAbapTarget.url = 'some-system';
            mockValidateEmptyString.mockReturnValue(true);
            mockGetSystemInfo.mockResolvedValue({});

            const prompts = getCredentialsPrompts(mockAbapTarget, mockLogger);
            const passwordPrompt = prompts[1];
            const validateFunction = passwordPrompt.validate as (
                value: string,
                answers: any
            ) => Promise<boolean | string>;

            const result = await validateFunction('pass', { username: 'user' });

            expect(mockGetConfiguredProvider).toHaveBeenCalledWith(
                {
                    system: 'some-system',
                    client: '010',
                    username: 'user',
                    password: 'pass'
                },
                mockLogger
            );
            expect(mockGetSystemInfo).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should use destination when in AppStudio', async () => {
            mockIsAppStudio.mockReturnValue(true);
            mockAbapTarget.destination = 'SYS_010';
            mockValidateEmptyString.mockReturnValue(true);
            mockGetSystemInfo.mockResolvedValue({});

            const prompts = getCredentialsPrompts(mockAbapTarget, mockLogger);
            const passwordPrompt = prompts[1];
            const validateFunction = passwordPrompt.validate as (
                value: string,
                answers: any
            ) => Promise<boolean | string>;

            const result = await validateFunction('pass', { username: 'user' });

            expect(mockGetConfiguredProvider).toHaveBeenCalledWith(
                {
                    system: 'SYS_010',
                    client: '010',
                    username: 'user',
                    password: 'pass'
                },
                mockLogger
            );
            expect(mockGetSystemInfo).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should return error when username is empty', async () => {
            mockValidateEmptyString.mockReturnValue(true);

            const prompts = getCredentialsPrompts(mockAbapTarget, mockLogger);
            const passwordPrompt = prompts[1];
            const validateFunction = passwordPrompt.validate as (
                value: string,
                answers: any
            ) => Promise<boolean | string>;

            const result = await validateFunction('pass', { username: '' } as Credentials);

            expect(result).toBe(t('error.pleaseProvideAllRequiredData'));
        });

        it('should return validation error for empty string', async () => {
            mockValidateEmptyString.mockReturnValue('Password is required');

            const prompts = getCredentialsPrompts(mockAbapTarget, mockLogger);
            const passwordPrompt = prompts[1];
            const validateFunction = passwordPrompt.validate as (
                value: string,
                answers: any
            ) => Promise<boolean | string>;

            const result = await validateFunction!('', { username: 'user' } as Credentials);

            expect(result).toBe('Password is required');
            expect(mockValidateEmptyString).toHaveBeenCalledWith('');
        });

        it('should return login failure message for response error', async () => {
            mockValidateEmptyString.mockReturnValue(true);
            const mockError = {
                response: {
                    status: 401,
                    statusText: 'Unauthorized'
                }
            };
            mockGetSystemInfo.mockRejectedValue(mockError);

            const prompts = getCredentialsPrompts(mockAbapTarget, mockLogger);
            const passwordPrompt = prompts[1];
            const validateFunction = passwordPrompt.validate as (
                value: string,
                answers: any
            ) => Promise<boolean | string>;

            const result = await validateFunction('pass', { username: 'user' } as Credentials);

            expect(result).toBe('Login failed: 401 Unauthorized');
        });

        it('should return generic login failure message for non-response error', async () => {
            mockValidateEmptyString.mockReturnValue(true);
            const mockError = new Error('Network error');
            mockGetConfiguredProvider.mockRejectedValue(mockError);

            const prompts = getCredentialsPrompts(mockAbapTarget, mockLogger);
            const passwordPrompt = prompts[1];
            const validateFunction = passwordPrompt.validate as (
                value: string,
                answers: any
            ) => Promise<boolean | string>;

            const result = await validateFunction('pass', { username: 'user' } as any);

            expect(result).toBe('Login failed.');
        });
    });
});
