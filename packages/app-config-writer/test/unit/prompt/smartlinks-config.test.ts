import { join } from 'path';
import { prompt } from 'prompts';
import type { PromptObject } from 'prompts';
import * as btp from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import * as Logger from '@sap-ux/logger';
import * as store from '@sap-ux/store';
import { getSmartLinksTargetFromPrompt } from '../../../src';
import { t } from '../../../src/i18n';
import * as utils from '../../../src/smartlinks-config/utils';
import { promptUserPass } from '../../../src/prompt';
import { yellow } from 'chalk';

jest.mock('prompts', () => ({
    ...(jest.requireActual('prompts') as object),
    prompt: jest.fn()
}));
const promptMock = prompt as jest.Mock;

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

const loggerMock: ToolsLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
} as Partial<ToolsLogger> as ToolsLogger;
jest.spyOn(Logger, 'ToolsLogger').mockImplementation(() => loggerMock);

const serviceMock = { read: jest.fn() };
let isAppStudioMock: jest.SpyInstance;
let listDestinationsMock: jest.SpyInstance;

describe('Test function getSmartLinksTargetFromPrompt', () => {
    // Mock setup
    const debugMock = loggerMock.debug as unknown as jest.SpyInstance;
    let getSystemCredentialsSpy: jest.SpyInstance;
    let getServiceMock: jest.SpyInstance;

    beforeEach(() => {
        jest.resetAllMocks();
        isAppStudioMock = jest.spyOn(btp, 'isAppStudio');
        getSystemCredentialsSpy = jest.spyOn(utils, 'getLocalStoredCredentials');
        getServiceMock = jest.spyOn(store, 'getService').mockImplementation(() => serviceMock as any);
        listDestinationsMock = jest.spyOn(btp, 'listDestinations');
    });

    describe('Prompt for target url and client: ', () => {
        test('No ui5-deploy config', async () => {
            const basePath = join(__dirname, '../../fixtures/no-ui5-deploy-config');
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(debugMock.mock.calls[0][0].message).toContain(`File 'ui5-deploy.yaml' not found in project`);
            const promptForTarget = promptMock.mock.calls[0][0];
            expect(promptForTarget).toMatchSnapshot();
            expect(promptForTarget[0].initial).not.toBeDefined();
        });
        test('Existing ui5-deploy-config', async () => {
            const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(debugMock).not.toBeCalled();
            const promptForTarget = promptMock.mock.calls[0][0];
            expect(promptForTarget).toMatchSnapshot();
            expect(promptForTarget[0].initial).toBeDefined();
        });
        test('Existing ui5-deploy-config - picked initial', async () => {
            const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
            promptMock.mockImplementationOnce((choices: PromptObject[]) => ({
                [choices[0].name as string]: choices[0].initial,
                [choices[1].name as string]: (choices[1].format as any)(choices[1].initial)
            }));
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(debugMock).not.toBeCalled();
            expect(getSystemCredentialsSpy).toBeCalledWith(
                'https://abc.abap.stagingaws.hanavlab.ondemand.com',
                '100',
                loggerMock
            );
        });
    });

    describe('Prompt for destination on BAS: ', () => {
        beforeEach(() => {
            jest.resetAllMocks();
            isAppStudioMock.mockResolvedValue(true);
        });

        test('No ui5-deploy config', async () => {
            const basePath = join(__dirname, '../../fixtures/no-ui5-deploy-config');
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(debugMock.mock.calls[0][0].message).toContain(`File 'ui5-deploy.yaml' not found in project`);
            const promptForTarget = promptMock.mock.calls[0][0];
            expect(promptForTarget).toMatchSnapshot();
            expect(promptForTarget[0].initial).not.toBeDefined();
        });
        test('Existing ui5-deploy-config', async () => {
            const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(debugMock).not.toBeCalled();
            const promptForTarget = promptMock.mock.calls[0][0];
            expect(promptForTarget).toMatchSnapshot();
            expect(promptForTarget[0].initial).toBeDefined();
        });
        test('Existing ui5-deploy-config - picked initial', async () => {
            const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
            promptMock.mockImplementationOnce((choices: PromptObject[]) => ({
                [choices[0].name as string]: choices[0].initial
            }));
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(debugMock).not.toBeCalled();
            expect(listDestinationsMock).toBeCalled();
            expect(getSystemCredentialsSpy).not.toBeCalled();
        });
    });

    describe('Check credentials (local)', () => {
        const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
        const mockTarget = { url: 'mockUrl', client: 'mockClient' };
        const mockUser = { username: 'mockUser', password: 'mockPW' };

        test('No stored credentials', async () => {
            promptMock.mockResolvedValueOnce(mockTarget);
            serviceMock.read.mockResolvedValue(undefined);
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(serviceMock.read).toBeCalledWith(mockTarget);
            const promptForCredentials = promptMock.mock.calls[1][0];
            expect(promptForCredentials).toMatchSnapshot();
            expect(promptForCredentials[0].choices).not.toBeDefined();
        });

        test('Stored credentials', async () => {
            promptMock.mockResolvedValueOnce(mockTarget);
            serviceMock.read.mockResolvedValue(mockUser);
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(serviceMock.read).toBeCalledWith(mockTarget);
            const promptForCredentials = promptMock.mock.calls[1][0];
            expect(promptForCredentials).toMatchSnapshot();
            expect(promptForCredentials[0].choices.length).toBe(2);
            expect(promptForCredentials[0].choices[1].title).toEqual(t('questions.credentialsDescription'));
        });

        test('Stored credentials - manual input', async () => {
            promptMock.mockResolvedValueOnce(mockTarget);
            serviceMock.read.mockResolvedValue(mockUser);
            promptMock.mockResolvedValueOnce({ credentials: false });
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(serviceMock.read).toBeCalledWith(mockTarget);
            const promptForCredentials = promptMock.mock.calls[1][0];
            const promptForUserPW = promptMock.mock.calls[2][0];
            expect(promptForCredentials[0].choices.length).toBe(2);
            expect(promptForUserPW[0].name).toBe('username');
        });
    });
    describe('Check credentials (BAS)', () => {
        const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
        const mockDestination = { destination: 'ABC123' };
        const destinationsMock = {
            'ABC123': {
                Name: 'ABC123',
                Type: 'MockType',
                Authentication: 'NoAuthentication',
                ProxyType: 'NoProxy',
                Description: 'MockDestination',
                Host: 'MockHost'
            }
        };
        test('Destination not found - ask for credentials', async () => {
            isAppStudioMock.mockResolvedValue(true);
            promptMock.mockResolvedValueOnce(mockDestination);

            listDestinationsMock.mockResolvedValue(undefined);
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            const promptForCredentials = promptMock.mock.calls[1][0];
            expect(promptForCredentials).toMatchSnapshot();
            expect(promptForCredentials[0].choices).not.toBeDefined();
        });

        test('Destination found (NoAuthentication) - ask for credentials', async () => {
            isAppStudioMock.mockResolvedValue(true);
            promptMock.mockResolvedValueOnce(mockDestination);

            listDestinationsMock.mockResolvedValue(destinationsMock);
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            const promptForCredentials = promptMock.mock.calls[1][0];
            expect(promptForCredentials).toMatchSnapshot();
            expect(promptForCredentials[0].choices).not.toBeDefined();
        });
        test('Destination found - use credentials', async () => {
            isAppStudioMock.mockResolvedValue(true);
            destinationsMock.ABC123.Authentication = 'BasicAuthentication';
            promptMock.mockResolvedValueOnce(mockDestination);

            listDestinationsMock.mockResolvedValue(destinationsMock);
            const config = await getSmartLinksTargetFromPrompt(basePath, loggerMock);
            expect(config.auth).toEqual(undefined);
            expect(config.ignoreCertErrors).toEqual(undefined);
            expect(config.target.destination).toEqual(mockDestination.destination);
            expect(config.target.url).toEqual(undefined);
            expect(config.target.client).toEqual(undefined);
            const promptForCredentials = promptMock.mock.calls[1];
            expect(promptForCredentials).not.toBeDefined();
        });
    });

    describe('Return prompt values', () => {
        const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
        const mockTarget = { url: 'mockUrl', client: 'mockClient' };
        const mockUser = { username: 'mockUser', password: 'mockPW' };

        test('Target and credentials provided', async () => {
            serviceMock.read.mockResolvedValue(mockUser);
            promptMock.mockResolvedValueOnce(mockTarget);
            promptMock.mockResolvedValueOnce({ credentials: mockUser });
            const config = await getSmartLinksTargetFromPrompt(basePath, loggerMock);
            expect(config).toMatchSnapshot();
            expect(config.auth).toEqual(mockUser);
            expect(config.ignoreCertErrors).toEqual(undefined);
            expect(config.target).toEqual(mockTarget);
        });
        test('User aborted on choose target - no config provided', async () => {
            promptMock.mockImplementation((_choices, cancel) => {
                const processSpy = jest.spyOn(process, 'exit');
                processSpy.mockImplementation();
                cancel.onCancel();
                expect(loggerMock.info).toHaveBeenLastCalledWith(yellow('Operation aborted by the user.'));
                expect(processSpy).toBeCalled();
            });
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
        });
    });
    describe('Target validation', () => {
        const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');

        test('BAS', async () => {
            isAppStudioMock.mockResolvedValueOnce(true);
            promptMock.mockImplementationOnce((choices: PromptObject[]) => {
                const destination = choices[0];
                expect(destination.name).toEqual('destination');
                expect((destination.validate as any)()).toEqual('Please provide a target for configuration');
                expect((destination.validate as any)('abc')).toBeTruthy();
                expect(choices[1]).not.toBeDefined();
                return { destination: 'mockDestination' };
            });
            promptMock.mockResolvedValueOnce({});
            await getSmartLinksTargetFromPrompt(basePath, loggerMock);
        });
        test('Local environment', async () => {
            promptMock.mockImplementationOnce((choices: PromptObject[]) => {
                const url = choices[0];
                expect(url.name).toBe('url');
                expect((url.validate as any)()).toEqual('Please provide a target for configuration');
                expect((url.validate as any)('abc')).toBeTruthy();
                const client = choices[1];
                expect(client.name).toBe('client');
                expect((client.format as any)('123')).toEqual('123');
                expect((client.format as any)(123)).toEqual('123');
                return { url: 'mockUrl' };
            });
            promptMock.mockResolvedValueOnce({});
            await getSmartLinksTargetFromPrompt(basePath, loggerMock);
        });
    });
});

describe('Test promptUserPass', () => {
    const userPrompt = { username: 'mockUser', password: 'mockPassword' };
    test('Return username, password', async () => {
        promptMock.mockResolvedValueOnce(userPrompt);
        expect(await promptUserPass(loggerMock)).toEqual(userPrompt);
    });
    test('Validation', async () => {
        promptMock.mockImplementation((choices: PromptObject[]) => {
            const username = choices[0];
            expect(username.name).toBe('username');
            expect((username.validate as any)()).toEqual('Username can not be empty.');
            expect((username.validate as any)('abc')).toBeTruthy();
            const password = choices[1];
            expect(password.name).toBe('password');
            expect((password.validate as any)()).toEqual('Password can not be empty.');
            expect((password.validate as any)(' ')).toEqual('Password can not be empty.');
            expect((password.validate as any)('123')).toBeTruthy();
            return userPrompt;
        });
        await promptUserPass(loggerMock);
    });
    test('onCancel', async () => {
        promptMock.mockImplementation((_choices, cancel) => {
            const processSpy = jest.spyOn(process, 'exit');
            processSpy.mockImplementation();
            cancel.onCancel();
            expect(loggerMock.info).toHaveBeenLastCalledWith(yellow('Operation aborted by the user.'));
            expect(processSpy).toBeCalled();
        });
        await expect(promptUserPass(loggerMock)).rejects.toThrow();
        await expect(promptUserPass()).rejects.toThrow();
    });
});
