import type { CheckEnvironmentOptions, Destination } from '../../src';
import { checkEnvironment, getEnvironment } from '../../src/checks/environment';
import { checkBASDestinations, needsUsernamePassword, checkBASDestination } from '../../src/checks/destination';
import { DevelopmentEnvironment, Severity } from '../../src/types';
import { isAppStudio } from '@sap-ux/btp-utils';
import axios from 'axios';
import { join } from 'path';

jest.mock('axios');
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn(),
    getAppStudioProxyURL: jest.fn()
}));
const mockIsAppStudio = isAppStudio as jest.Mock;

jest.mock('../../src/checks/destination', () => ({
    checkBASDestinations: jest.fn(),
    needsUsernamePassword: jest.fn(),
    checkBASDestination: jest.fn()
}));
const mockCheckBASDestinations = checkBASDestinations as jest.Mock;
const mockNeedsUsernamePassword = needsUsernamePassword as jest.Mock;
const mockCheckBASDestination = checkBASDestination as jest.Mock;
describe('Test for getEnvironmentCheck()', () => {
    test('Ensure correct dev environment, getEnvironmentCheck()', async () => {
        const { environment, messages } = await getEnvironment();
        expect(
            environment.developmentEnvironment === DevelopmentEnvironment.BAS ||
                environment.developmentEnvironment === DevelopmentEnvironment.VSCode
        ).toBeTruthy();
        expect(messages.length).toBeGreaterThan(0);
    });

    test('Ensure correct dev environment, getEnvironmentCheck()', async () => {
        mockIsAppStudio.mockReturnValue(true);
        const { environment, messages } = await getEnvironment();
        expect(environment.developmentEnvironment === DevelopmentEnvironment.BAS).toBeTruthy();
        expect(messages.length).toBeGreaterThan(0);
    });
});

describe('Test for checkEnvironment()', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('Destinations that need authentication and no credentials are supplied, getEnvironmentCheck()', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [
            {
                Name: 'ONE',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEUsage: 'odata_abap',
                Host: 'https://one.dest:123'
            },
            {
                Name: 'TWO',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'OnPremise',
                Description: 'TWO_DESC',
                'sap-client': '111',
                WebIDEUsage: 'odata_abap,dev_abap',
                Host: 'http://two.dest:234',
                WebIDEExposedHost: 'http://two.dest:345'
            }
        ];
        mockCheckBASDestinations.mockImplementationOnce(() => Promise.resolve({ messages: [], destinations: data }));
        mockCheckBASDestination.mockImplementationOnce(() =>
            Promise.resolve({
                messages: [],
                destinationResults: {
                    v2: {},
                    v4: {},
                    HTML5DynamicDestination: 'true'
                }
            })
        );
        mockNeedsUsernamePassword.mockReturnValueOnce(true);

        const options: CheckEnvironmentOptions = {
            workspaceRoots: [join(__dirname, '..', 'sample-workspace')],
            destinations: ['ONE']
        };

        // Test execution
        const result = await checkEnvironment(options);
        const warningMessage = result.messages?.find(
            (m) => m.text.includes('requires username/password') && m.severity === Severity.Warning
        );

        // Result check
        expect(result.destinations).toEqual(data);
        expect(result.messages).toBeDefined();
        expect(warningMessage).toBeDefined();
        expect(result.messages.length).toBeGreaterThan(0);
        expect(result.destinationResults).toBeDefined();
    });
    test('Destinations that need authentication and credentials are supplied, getEnvironmentCheck()', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [
            {
                Name: 'ONE',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                'HTML5.DynamicDestination': 'true',
                Description: 'ONE_DESC',
                WebIDEUsage: 'odata_abap',
                Host: 'https://one.dest:123'
            },
            {
                Name: 'TEST_DEST_B1',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'OnPremise',
                'HTML5.DynamicDestination': 'true',
                Description: 'TWO_DESC',
                WebIDEUsage: 'odata_abap,dev_abap',
                Host: 'http://two.dest:234',
                WebIDEExposedHost: 'http://two.dest:345'
            },
            {
                Name: 'TEST_DEST_A',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'OnPremise',
                'HTML5.DynamicDestination': 'true',
                Description: 'TWO_DESC',
                WebIDEUsage: 'odata_abap,dev_abap',
                Host: 'http://two.dest:234',
                WebIDEExposedHost: 'http://two.dest:345'
            },
            {
                Name: 'TEST_DEST_B2',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'OnPremise',
                'HTML5.DynamicDestination': 'true',
                Description: 'TWO_DESC',
                WebIDEUsage: 'odata_abap,dev_abap',
                Host: 'http://two.dest:234',
                WebIDEExposedHost: 'http://two.dest:345'
            }
        ];
        const v2catalogResponse = {
            status: 200,
            data: {
                d: {
                    results: ['V2_S1', 'V2_S2', 'V2_S3']
                }
            }
        };
        const v4catalogResponse = {
            status: 200,
            data: {
                value: [
                    { DefaultSystem: { Services: ['V4_S1'] } },
                    { DefaultSystem: { Services: ['V4_S2'] } },
                    { DefaultSystem: { Services: ['V4_S3'] } }
                ]
            }
        };
        mockCheckBASDestinations.mockImplementationOnce(() => Promise.resolve({ messages: [], destinations: data }));

        mockCheckBASDestination.mockImplementation(() =>
            Promise.resolve({
                messages: [],
                destinationResults: {
                    v2: v2catalogResponse,
                    v4: v4catalogResponse,
                    HTML5DynamicDestination: 'true'
                }
            })
        );
        mockNeedsUsernamePassword.mockReturnValueOnce(true);

        const mockCredentialCallback = jest
            .fn()
            .mockImplementation((destination: Destination) =>
                Promise.resolve({ username: destination.Name + 'USER', password: 'pwd' })
            );
        const options: CheckEnvironmentOptions = {
            workspaceRoots: [join(__dirname, '..', 'sample-workspace')],
            destinations: ['ONE'],
            credentialCallback: mockCredentialCallback
        };
        // Test execution
        const result = await checkEnvironment(options);

        // Result check
        expect(mockCredentialCallback).toBeCalledWith(data[0]);
        expect(result.destinations).toEqual(data);
        expect(result.messages).toBeDefined();
        expect(result.messages.find((m) => m.severity >= Severity.Warning)).toBeUndefined();
        expect(result.messages.length).toBeGreaterThan(0);
        expect(result.destinationResults).toBeDefined();
    });

    test('Destinations that does not need authentication, getEnvironmentCheck()', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [
            {
                Name: 'EC1_NOAUTH',
                Type: 'HTTP',
                Authentication: 'BasicAuthentication',
                ProxyType: 'OnPremise',
                Description: 'EC1',
                'sap-client': '100',
                WebIDEUsage: 'odata_abap',
                Host: 'http://ccwdfgl9773.devint.net.sap:50000'
            }
        ];
        mockCheckBASDestinations.mockImplementationOnce(() => Promise.resolve({ messages: [], destinations: data }));
        mockCheckBASDestination.mockImplementationOnce(() =>
            Promise.resolve({
                messages: [],
                destinationResults: {
                    v2: {},
                    v4: {},
                    HTML5DynamicDestination: 'true'
                }
            })
        );
        mockNeedsUsernamePassword.mockReturnValueOnce(false);

        const options: CheckEnvironmentOptions = {
            workspaceRoots: [join(__dirname, '..', 'sample-workspace')],
            destinations: [data[0].Name]
        };

        // Test execution
        const result = await checkEnvironment(options);

        // Result check
        expect(result.destinations).toEqual(data);
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBeGreaterThan(0);
        expect(result.destinationResults).toBeDefined();
    });
    test('No deep dive destination, getEnvironmentCheck()', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [
            {
                Name: 'ONE',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEUsage: 'odata_abap',
                Host: 'https://one.dest:123'
            }
        ];
        mockCheckBASDestinations.mockImplementationOnce(() => Promise.resolve({ messages: [], destinations: data }));
        mockCheckBASDestination.mockImplementationOnce(() =>
            Promise.resolve({
                messages: [],
                destinationResults: {
                    v2: {},
                    v4: {},
                    HTML5DynamicDestination: 'true'
                }
            })
        );
        mockNeedsUsernamePassword.mockReturnValueOnce(false);

        const options: CheckEnvironmentOptions = {
            workspaceRoots: ['test/workspace']
        };

        // Test execution
        const result = await checkEnvironment(options);
        const warningMessage = result.messages?.find(
            (m) => m.text.includes('No destinations details requested') && m.severity === Severity.Info
        );

        // Result check
        expect(warningMessage).toBeDefined();
        expect(result.destinations).toEqual(data);
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBeGreaterThan(0);
        expect(result.destinationResults).toBeDefined();
    });
    test('Checking for deep dive destination that does not exist in the list, getEnvironmentCheck()', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [
            {
                Name: 'ONE',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEUsage: 'odata_abap',
                Host: 'https://one.dest:123'
            }
        ];
        mockCheckBASDestinations.mockImplementationOnce(() => Promise.resolve({ messages: [], destinations: data }));
        mockCheckBASDestination.mockImplementationOnce(() =>
            Promise.resolve({
                messages: [],
                destinationResults: {
                    v2: {},
                    v4: {},
                    HTML5DynamicDestination: 'true'
                }
            })
        );
        mockNeedsUsernamePassword.mockReturnValueOnce(false);

        const options: CheckEnvironmentOptions = {
            workspaceRoots: [join(__dirname, '..', 'sample-workspace')],
            destinations: ['NotInList']
        };

        // Test execution
        const result = await checkEnvironment(options);
        const warningMessage = result.messages?.find(
            (m) => m.text.includes(`Couldn't find destination`) && m.severity === Severity.Warning
        );

        // Result check
        expect(warningMessage).toBeDefined();
        expect(result.destinations).toEqual(data);
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBeGreaterThan(0);
        expect(result.destinationResults).toBeDefined();
    });
    test('credentialCallBack is defined but no username and/or password is supplied while it is required, getEnvironmentCheck()', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        const data = [
            {
                Name: 'ONE',
                Type: 'HTTP',
                Authentication: 'NoAuthentication',
                ProxyType: 'Internet',
                Description: 'ONE_DESC',
                WebIDEUsage: 'odata_abap',
                Host: 'https://one.dest:123'
            }
        ];
        mockCheckBASDestinations.mockImplementationOnce(() => Promise.resolve({ messages: [], destinations: data }));
        mockCheckBASDestination.mockImplementationOnce(() =>
            Promise.resolve({
                messages: [],
                destinationResults: {
                    v2: {},
                    v4: {},
                    HTML5DynamicDestination: 'true'
                }
            })
        );
        mockNeedsUsernamePassword.mockReturnValueOnce(true);

        const mockCredentialCallback = jest.fn().mockImplementation(() => Promise.resolve({}));
        const options: CheckEnvironmentOptions = {
            workspaceRoots: [join(__dirname, '..', 'sample-workspace')],
            destinations: [data[0].Name],
            credentialCallback: mockCredentialCallback
        };

        // Test execution
        const result = await checkEnvironment(options);

        // Result check
        expect(result.destinations).toEqual(data);
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBeGreaterThan(0);
        expect(result.destinationResults).toBeDefined();
    });
});
