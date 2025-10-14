import { join } from 'node:path';
import { prompt, inject } from 'prompts';
import * as prompts from 'prompts';
import type { PromptObject } from 'prompts';
import * as btp from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import * as Logger from '@sap-ux/logger';
import { getService } from '@sap-ux/store';
import { getSmartLinksTargetFromPrompt } from '../../../src';
import * as utils from '../../../src/smartlinks-config/utils';
import { promptUserPass } from '../../../src/prompt';
import { yellow } from 'chalk';
import i18next from 'i18next';
import { initI18n } from '../../../src/i18n';

jest.mock('prompts', () => ({
    ...jest.requireActual('prompts'),
    prompt: jest.fn()
}));
let promptMock: jest.Mock | jest.SpyInstance = prompt as jest.Mock;
const serviceMock = { read: jest.fn() };

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));
jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn()
}));
const getServiceMock: jest.Mock = getService as jest.Mock;

const loggerMock: ToolsLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
} as Partial<ToolsLogger> as ToolsLogger;
jest.spyOn(Logger, 'ToolsLogger').mockImplementation(() => loggerMock);

let isAppStudioMock: jest.SpyInstance;
let listDestinationsMock: jest.SpyInstance;

let basePath: string;
const getProject = (basePath: string) => join(__dirname, `../../fixtures/${basePath}`);
const mockTarget = { url: 'https://abc.example', client: '100' };
const mockAuth = { username: 'mockUser', password: 'mockPW' };

beforeAll(async () => {
    await initI18n();
});
describe('Test function getSmartLinksTargetFromPrompt', () => {
    // Mock setup
    const debugMock = loggerMock.debug as unknown as jest.SpyInstance;
    let getSystemCredentialsSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        isAppStudioMock = jest.spyOn(btp, 'isAppStudio');
        getSystemCredentialsSpy = jest.spyOn(utils, 'getLocalStoredCredentials');
        listDestinationsMock = jest.spyOn(btp, 'listDestinations');
        getServiceMock.mockImplementation(() => serviceMock);
        jest.spyOn(i18next, 't').mockImplementation((...args: any[]) => args[0]);
    });

    describe('Check prompt steps: ', () => {
        test('Local with url', async () => {
            const basePath = join(__dirname, '../../fixtures/no-ui5-deploy-config');
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(debugMock.mock.calls[0][0].message).toContain(`File 'ui5-deploy.yaml' not found in project`);
            const [urlPrompt, clientPrompt] = promptMock.mock.calls[0][0];
            // Conditional url prompt
            expect(urlPrompt.name).toEqual('url');
            expect(urlPrompt.type()).toEqual('text');
            expect(urlPrompt.initial).not.toBeDefined();
            expect(urlPrompt.validate).toBeDefined();
            expect(urlPrompt.message).toContain('SmartLinks configuration source url');
            // Conditional client prompt
            expect(clientPrompt.name).toEqual('client');
            expect(clientPrompt.type()).toEqual(null);
            expect(clientPrompt.initial).not.toBeDefined();
            expect(clientPrompt.format).toBeDefined();
            expect(clientPrompt.message).toContain('client');
        });

        test('BAS with destination/url', async () => {
            const basePath = join(__dirname, '../../fixtures/no-ui5-deploy-config');
            isAppStudioMock.mockResolvedValue(true);
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(debugMock.mock.calls[0][0].message).toContain(`File 'ui5-deploy.yaml' not found in project`);
            const [destinationOrUrlPrompt, destinationPrompt, urlPrompt, clientPrompt] = promptMock.mock.calls[0][0];
            // First select destination or url
            expect(destinationOrUrlPrompt.name).toEqual('select');
            expect(destinationOrUrlPrompt.type()).toEqual('select');
            expect(destinationOrUrlPrompt.message).toContain('SmartLinks configuration source ');
            expect(destinationOrUrlPrompt.choices).toMatchObject([
                { title: 'Enter destination', value: 'destination' },
                { title: 'Enter url', value: 'url' }
            ]);
            // Conditional destination prompt
            expect(destinationPrompt.name).toEqual('destination');
            expect(destinationPrompt.type()).toEqual(null);
            expect(destinationPrompt.initial).not.toBeDefined();
            expect(destinationPrompt.validate).toBeDefined();
            expect(destinationPrompt.message).toContain('SmartLinks configuration source destination ');
            // Conditional url prompt
            expect(urlPrompt.name).toEqual('url');
            expect(urlPrompt.type()).toEqual('text');
            expect(urlPrompt.initial).not.toBeDefined();
            expect(urlPrompt.validate).toBeDefined();
            expect(urlPrompt.message).toContain('SmartLinks configuration source url ');
            // Conditional client prompt
            expect(clientPrompt.name).toEqual('client');
            expect(clientPrompt.type()).toEqual(null);
            expect(clientPrompt.initial).not.toBeDefined();
            expect(clientPrompt.format).toBeDefined();
            expect(clientPrompt.message).toContain('client');
        });
    });

    describe('Local prompts for target url and client: ', () => {
        beforeEach(() => {
            promptMock = jest
                .spyOn(prompts, 'prompt')
                .mockImplementation((questions) => jest.requireActual('prompts').prompt(questions));
        });
        test('No ui5-deploy config', async () => {
            basePath = 'no-ui5-deploy-config';
            inject([mockTarget.url]);
            const result = await getSmartLinksTargetFromPrompt(getProject(basePath), loggerMock);
            expect(result.target).toMatchObject({ url: mockTarget.url });
            expect(debugMock.mock.calls[0][0].message).toContain(`'ui5-deploy.yaml' not found`);
            const [urlPrompt, clientPrompt] = promptMock.mock.calls[0][0];
            expect(urlPrompt.type).toEqual('text');
            expect(urlPrompt.initial).not.toBeDefined();
            expect(clientPrompt.type).toEqual('text');
            expect(clientPrompt.initial).not.toBeDefined();
        });
        test('Existing ui5-deploy-config', async () => {
            basePath = 'ui5-deploy-config';
            inject([mockTarget.url, mockTarget.client]);
            const result = await getSmartLinksTargetFromPrompt(getProject(basePath), loggerMock);
            expect(result.target).toMatchObject({ url: mockTarget.url });
            expect(debugMock).not.toHaveBeenCalled();
            expect(getSystemCredentialsSpy).toHaveBeenCalledWith(mockTarget.url, mockTarget.client, loggerMock);
            const [urlPrompt, clientPrompt] = promptMock.mock.calls[0][0];
            expect(urlPrompt.initial).toBeDefined();
            expect(urlPrompt.message).toContain('SmartLinks configuration source url (ui5-deploy.yaml)');
            expect(clientPrompt.initial).toBeDefined();
            expect(clientPrompt.message).toContain('SAP client (ui5-deploy.yaml)');
        });
        test('Existing ui5-deploy-config - picked initial', async () => {
            basePath = 'ui5-deploy-config';
            promptMock.mockImplementationOnce((choices: PromptObject[]) => ({
                [choices[0].name as string]: choices[0].initial,
                [choices[1].name as string]: (choices[1].format as any)(choices[1].initial)
            }));
            inject([mockAuth.username, mockAuth.password]);
            const result = await getSmartLinksTargetFromPrompt(getProject(basePath), loggerMock);
            expect(result.target).toMatchObject({ url: mockTarget.url, client: mockTarget.client });
            expect(result.auth).toMatchObject(mockAuth);
            expect(debugMock).not.toHaveBeenCalled();
            expect(getSystemCredentialsSpy).toHaveBeenCalled();
        });
    });

    describe('Prompts on BAS for destination/url', () => {
        beforeEach(() => {
            jest.resetAllMocks();
            isAppStudioMock.mockResolvedValue(true);
            promptMock = jest
                .spyOn(prompts, 'prompt')
                .mockImplementation((questions) => jest.requireActual('prompts').prompt(questions));
            jest.spyOn(i18next, 't').mockImplementation((...args: any[]) => args[0]);
        });

        test('Use destination (no deploy config)', async () => {
            basePath = 'no-ui5-deploy-config';
            inject(['destination', 'ABC123']);
            await getSmartLinksTargetFromPrompt(getProject(basePath), loggerMock);
            const [destinationOrUrlPrompt, destinationPrompt, urlPrompt, clientPrompt] = promptMock.mock.calls[0][0];
            expect(destinationOrUrlPrompt.type).toEqual('select');
            expect(destinationPrompt.type).toEqual('text');
            expect(destinationPrompt.initial).not.toBeDefined();
            expect(urlPrompt.type).toEqual(null);
            expect(clientPrompt.type).toEqual(null);
        });
        test('Use url (no deploy config)', async () => {
            basePath = 'no-ui5-deploy-config';
            inject(['url']);
            await getSmartLinksTargetFromPrompt(getProject(basePath), loggerMock);
            const [destinationOrUrlPrompt, destinationPrompt, urlPrompt, clientPrompt] = promptMock.mock.calls[0][0];
            expect(destinationOrUrlPrompt.type).toEqual('select');
            expect(destinationPrompt.type).toEqual(null);
            expect(urlPrompt.type).toEqual('text');
            expect(urlPrompt.initial).not.toBeDefined();
            expect(clientPrompt.type).toEqual(null);
        });
        test('Use existing destination', async () => {
            basePath = 'ui5-deploy-config';
            inject([true, mockAuth.username, mockAuth.password]);
            const result = await getSmartLinksTargetFromPrompt(getProject(basePath), loggerMock);
            expect(result.target).toMatchObject({ destination: 'ABC123', url: undefined, client: undefined });
            expect(result.auth).toMatchObject(mockAuth);
            const [initialPrompt, destinationOrUrlPrompt, destinationPrompt, urlPrompt, clientPrompt] =
                promptMock.mock.calls[0][0];
            expect(initialPrompt).toMatchObject({ name: 'destination', type: 'confirm', initial: true });
            expect(initialPrompt.message).toContain('Do you want to use ABC123');
            expect(initialPrompt.format).toBeDefined();
            expect(destinationOrUrlPrompt.type).toEqual(null);
            expect(destinationPrompt.type).toEqual(null);
            expect(urlPrompt.type).toEqual(null);
            expect(clientPrompt.type).toEqual(null);
            expect(listDestinationsMock).toHaveBeenCalled();
            expect(getSystemCredentialsSpy).not.toHaveBeenCalled();
        });
    });

    describe('Check credentials (local)', () => {
        basePath = 'ui5-deploy-config';
        beforeEach(() => promptMock.mockResolvedValueOnce(mockTarget));

        test('No stored credentials', async () => {
            serviceMock.read.mockResolvedValue(undefined);
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            const [usernamePrompt, passwordPrompt] = promptMock.mock.calls[1][0];
            expect(usernamePrompt.choices).not.toBeDefined();
            expect(usernamePrompt.message).toContain('Username');
            expect(usernamePrompt.validate).toBeDefined();
            expect(usernamePrompt).toMatchObject({
                name: 'username',
                type: 'text'
            });
            expect(passwordPrompt.message).toContain('Password');
            expect(passwordPrompt.validate).toBeDefined();
            expect(passwordPrompt).toMatchObject({
                name: 'password',
                type: 'invisible'
            });
        });

        test('Stored credentials', async () => {
            serviceMock.read.mockResolvedValue(mockAuth);
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(serviceMock.read).toHaveBeenCalledWith(mockTarget);
            const promptForCredentials = promptMock.mock.calls[1][0][0];
            expect(promptForCredentials.choices.length).toBe(2);
            expect(promptForCredentials.choices[0].title).toContain('Use');
            expect(promptForCredentials.choices[0].value).toMatchObject({ username: 'mockUser', password: 'mockPW' });
            expect(promptForCredentials.choices[1].title).toContain('Provide username and password');
            expect(promptForCredentials.choices[1].value).toBeFalsy();
            expect(promptForCredentials.initial).toBe(0);
        });

        test('Stored credentials - manual input', async () => {
            serviceMock.read.mockResolvedValue(mockAuth);
            promptMock.mockResolvedValueOnce({ credentials: false });
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            expect(serviceMock.read).toHaveBeenCalledWith(mockTarget);
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
            expect(promptForCredentials.length).toBe(2);
            expect(promptForCredentials[0].choices).not.toBeDefined();
        });

        test('Destination found (NoAuthentication) - ask for credentials', async () => {
            isAppStudioMock.mockResolvedValue(true);
            promptMock.mockResolvedValueOnce(mockDestination);

            listDestinationsMock.mockResolvedValue(destinationsMock);
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
            const promptForCredentials = promptMock.mock.calls[1][0];
            expect(promptForCredentials.length).toBe(2);
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
                expect(processSpy).toHaveBeenCalled();
            });
            await expect(getSmartLinksTargetFromPrompt(basePath, loggerMock)).rejects.toThrow();
        });
    });
    describe('Target validation', () => {
        const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');

        test('BAS', async () => {
            isAppStudioMock.mockResolvedValueOnce(true);
            promptMock.mockImplementationOnce((choices: PromptObject[]) => {
                const destination = choices.find(
                    (choice) => choice.name === 'destination' && choice.initial === 'ABC123'
                );
                expect(destination?.name).toEqual('destination');
                expect((destination?.validate as any)()).toEqual('Please provide a target for the configuration.');
                expect((destination?.validate as any)('abc')).toBeTruthy();
                return { destination: destination?.initial };
            });
            promptMock.mockResolvedValueOnce({});
            await getSmartLinksTargetFromPrompt(basePath, loggerMock);
        });
        test('Local environment', async () => {
            promptMock.mockImplementationOnce((choices: PromptObject[]) => {
                const url = choices[0];
                expect(url.name).toBe('url');
                expect((url.validate as any)()).toEqual('Please provide a target for the configuration.');
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
            expect((username.validate as any)()).toEqual('Username cannot be empty. Provide a value for the username.');
            expect((username.validate as any)('abc')).toBeTruthy();
            const password = choices[1];
            expect(password.name).toBe('password');
            expect((password.validate as any)()).toEqual('Password cannot be empty. Provide a value for the password.');
            expect((password.validate as any)(' ')).toEqual(
                'Password cannot be empty. Provide a value for the password.'
            );
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
            expect(processSpy).toHaveBeenCalled();
        });
        await expect(promptUserPass(loggerMock)).rejects.toThrow();
        await expect(promptUserPass()).rejects.toThrow();
    });
});
