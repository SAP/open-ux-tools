import { join } from 'path';
import { prompt } from 'prompts';
import type { PromptObject } from 'prompts';
import type { ToolsLogger } from '@sap-ux/logger';
import * as Logger from '@sap-ux/logger';
import * as store from '@sap-ux/store';
import { getSmartLinksTargetFromPrompt } from '../../../src';
import { t } from '../../../src/i18n';
import * as utils from '../../../src/smartlinks-config/utils';

jest.mock('prompts', () => ({
    ...(jest.requireActual('prompts') as object),
    prompt: jest.fn()
}));
const mockPrompt = prompt as jest.Mock;

const loggerMock: ToolsLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
} as Partial<ToolsLogger> as ToolsLogger;
jest.spyOn(Logger, 'ToolsLogger').mockImplementation(() => loggerMock);

const serviceMock = { read: jest.fn() };

describe('Test function getSmartLinksConfigQuestions()', () => {
    // Mock setup
    const debugMock = loggerMock.debug as unknown as jest.SpyInstance;
    let getSystemCredentialsSpy: jest.SpyInstance;
    let getServiceMock: jest.SpyInstance;

    beforeEach(() => {
        jest.resetAllMocks();
        getSystemCredentialsSpy = jest.spyOn(utils, 'getSystemCredentials');
        getServiceMock = jest.spyOn(store, 'getService').mockImplementation(() => serviceMock as any);
    });

    describe('Prompt for target url and client: ', () => {
        // Mock exit by user on prompt for url and client
        mockPrompt.mockImplementationOnce((_values, onCancel) => onCancel());

        test('No ui5-deploy config', async () => {
            const basePath = join(__dirname, '../../fixtures/no-ui5-deploy-config');
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(debugMock.mock.calls[0][0].message).toContain(`File 'ui5-deploy.yaml' not found in project`);
            const promptForTarget = mockPrompt.mock.calls[0][0];
            expect(promptForTarget).toMatchSnapshot();
            expect(promptForTarget[0].initial).not.toBeDefined();
        });
        test('Existing ui5-deploy-config', async () => {
            const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(debugMock).not.toBeCalled();
            const promptForTarget = mockPrompt.mock.calls[0][0];
            expect(promptForTarget).toMatchSnapshot();
            expect(promptForTarget[0].initial).toBeDefined();
        });
        test('Existing ui5-deploy-config - picked initial', async () => {
            const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
            mockPrompt.mockImplementationOnce((choices: PromptObject[]) => {
                return {
                    [choices[0].name as string]: choices[0].initial,
                    [choices[1].name as string]: choices[1].initial
                };
            });
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(debugMock).not.toBeCalled();
            expect(getSystemCredentialsSpy).toBeCalledWith(
                'https://abc.abap.stagingaws.hanavlab.ondemand.com',
                undefined
            );
        });
    });

    describe('Check credentials', () => {
        const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
        const mockTarget = { url: 'mockUrl', client: 'mockClient' };
        const mockUser = { username: 'mockUser', password: 'mockPW' };

        test('No stored credentials', async () => {
            mockPrompt.mockResolvedValueOnce(mockTarget);
            mockPrompt.mockImplementationOnce((_values, onCancel) => onCancel());
            serviceMock.read.mockResolvedValue(undefined);
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(serviceMock.read).toBeCalledWith(mockTarget);
            const promptForCredentials = mockPrompt.mock.calls[1][0];
            expect(promptForCredentials).toMatchSnapshot();
            expect(promptForCredentials[0].choices).not.toBeDefined();
        });

        test('Stored credentials', async () => {
            mockPrompt.mockResolvedValueOnce(mockTarget);
            serviceMock.read.mockResolvedValue(mockUser);
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(serviceMock.read).toBeCalledWith(mockTarget);
            const promptForCredentials = mockPrompt.mock.calls[1][0];
            expect(promptForCredentials).toMatchSnapshot();
            expect(promptForCredentials[0].choices.length).toBe(2);
            expect(promptForCredentials[0].choices[1].title).toEqual(t('questions.credentialsDescription'));
        });

        test('Stored credentials - manual input', async () => {
            mockPrompt.mockResolvedValueOnce(mockTarget);
            serviceMock.read.mockResolvedValue(mockUser);
            mockPrompt.mockResolvedValueOnce({ credentials: false });
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(serviceMock.read).toBeCalledWith(mockTarget);
            const promptForCredentials = mockPrompt.mock.calls[1][0];
            const promptForUserPW = mockPrompt.mock.calls[2][0];
            expect(promptForCredentials[0].choices.length).toBe(2);
            expect(promptForUserPW[0].name).toBe('username');
        });
    });

    describe('Return prompt values', () => {
        const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
        const mockTarget = { url: 'mockUrl', client: 'mockClient' };
        const mockUser = { username: 'mockUser', password: 'mockPW' };

        test('Target and credentials provided', async () => {
            serviceMock.read.mockResolvedValue(mockUser);
            mockPrompt.mockResolvedValueOnce(mockTarget);
            mockPrompt.mockResolvedValueOnce({ credentials: mockUser });
            const config = await getSmartLinksTargetFromPrompt(basePath, loggerMock);
            expect(config).toMatchSnapshot();
            expect(config.credentials).toEqual(mockUser);
            expect(config.ignoreCertError).toEqual(undefined);
            expect(config.target).toEqual(mockTarget);
        });
        test('User aborted - no config provided', async () => {
            serviceMock.read.mockResolvedValue(mockUser);
            mockPrompt.mockResolvedValueOnce(mockTarget);
            mockPrompt.mockImplementationOnce((_values, onCancel) => onCancel);
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
        });
    });
});
