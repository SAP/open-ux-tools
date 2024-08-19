import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import {
    formatSummary,
    showAdditionalInfoForOnPrem,
    summaryMessage,
    validateBeforeDeploy,
    checkForCredentials
} from '../../../src/base/validate';
import { mockedProvider, mockedAdtService } from '../../__mocks__';
import { green, red, yellow } from 'chalk';
import { TransportChecksService } from '@sap-ux/axios-extension';
import type { AxiosError } from '@sap-ux/axios-extension';
import { t } from '@sap-ux/project-input-validator/src/i18n';
import { isAppStudio, isOnPremiseDestination, listDestinations, Authentication } from '@sap-ux/btp-utils';

const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });

jest.mock('@sap-ux/btp-utils');
const mockIsAppStudio = isAppStudio as jest.Mock;
const mockListDestinations = listDestinations as jest.Mock;
const mockisOnPremiseDestination = isOnPremiseDestination as jest.Mock;

describe('deploy-test validation', () => {
    // default app for testing
    const app = {
        name: 'ZAPP1',
        description: '',
        package: 'MYPACKAGE',
        transport: 'T000002'
    };
    // same target used in all tests
    const target = {
        client: '001',
        url: 'https://test.dev'
    };
    // standard valid test config
    const testConfig = { app, target };

    beforeEach(() => {
        mockedAdtService.listPackages.mockReset();
        mockedAdtService.getTransportRequests.mockReset();
        mockedAdtService.getAtoInfo.mockReset();
        mockedProvider.getAdtService.mockReturnValue(mockedAdtService);
    });

    describe('Input format validation', () => {
        test('Valid input text format', async () => {
            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000002' },
                { transportNumber: 'T000003' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });
            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, nullLogger);
            expect(output.result).toBe(true);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${green('√')} ${summaryMessage.allClientCheckPass}`);
        });

        test('Capture invalid app name', async () => {
            const name = 'nslooooooooooooooooooooog/ZAPP1';
            const prefix = 'Z';

            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000002' },
                { transportNumber: 'T000003' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: prefix
            });

            const output = await validateBeforeDeploy(
                {
                    app: { ...app, name },
                    target
                },
                mockedProvider as any,
                nullLogger
            );
            expect(output.result).toBe(false);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${red('×')} ${t('deploy.invalidAppNameMultipleReason')}`);
            expect(summaryStr).toContain(`${t('deploy.abapInvalidAppNameLength', { length: name.length })}`);
            expect(summaryStr).toContain(`${t('deploy.abapInvalidAppName', { prefix })}`);
        });

        test('Detect invalid deploy target', async () => {
            const name = 'ZAPP1';
            const prefix = 'Z';
            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000002' },
                { transportNumber: 'T000003' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: prefix
            });

            const output = await validateBeforeDeploy(
                {
                    app: { ...app, name },
                    target: { ...target, url: '' }
                },
                mockedProvider as any,
                nullLogger
            );
            expect(output.result).toBe(false);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${t('Invalid deploy target')}`);
        });

        test('Skip validating url if destination is provided', async () => {
            mockIsAppStudio.mockReturnValueOnce(true);
            const name = 'ZAPP1';
            const prefix = 'Z';
            const destination = 'TestDestination';
            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000002' },
                { transportNumber: 'T000003' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: prefix
            });

            const output = await validateBeforeDeploy(
                {
                    app: { ...app, name },
                    target: { ...target, destination, url: '' }
                },
                mockedProvider as any,
                nullLogger
            );
            expect(output.result).toBe(true);
        });

        test('adtService error', async () => {
            const name = 'nslooooooooooooooooooooog/Z-APP1';
            const prefix = 'Z';

            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000002' },
                { transportNumber: 'T000003' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: prefix
            });

            mockedProvider.getAdtService.mockImplementation(() => {
                return undefined;
            });

            const output = await validateBeforeDeploy(
                {
                    app: { ...app, name },
                    target
                },
                mockedProvider as any,
                nullLogger
            );
            expect(output.result).toBe(false);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${yellow('?')} ${summaryMessage.adtServiceUndefined} for AtoService`);
            expect(summaryStr).toContain(`${red('×')} ${t('deploy.invalidAppNameMultipleReason')}`);
            expect(summaryStr).toContain(`${t('deploy.abapInvalidAppNameLength', { length: name.length })}`);
            expect(summaryStr).toContain(`${t('deploy.charactersForbiddenInAppName')}`);
        });

        test('getAtoInfo throws error', async () => {
            const name = 'nslooooooooooooooooooooog/Z-APP1';
            const prefix = 'Z';
            mockedAdtService.getAtoInfo.mockRejectedValueOnce(new Error(''));
            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000002' },
                { transportNumber: 'T000003' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: prefix
            });

            const output = await validateBeforeDeploy(
                {
                    app: { ...app, name },
                    target
                },
                mockedProvider as any,
                nullLogger
            );
            expect(output.result).toBe(false);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${yellow('?')} ${summaryMessage.atoAdtAccessError}`);
            expect(summaryStr).toContain(`${red('×')} ${t('deploy.invalidAppNameMultipleReason')}`);
            expect(summaryStr).toContain(`${t('deploy.abapInvalidAppNameLength', { length: name.length })}`);
            expect(summaryStr).toContain(`${t('deploy.charactersForbiddenInAppName')}`);
        });
    });

    describe('Validate package name against ADT', () => {
        test('Valid package name', async () => {
            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000002' },
                { transportNumber: 'T000003' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });

            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, nullLogger);
            expect(output.result).toBe(true);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${green('√')} ${summaryMessage.packageCheckPass}`);
        });

        test('Valid package name - small case $tmp', async () => {
            mockedAdtService.listPackages.mockResolvedValueOnce(['$TMP']);
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000002' },
                { transportNumber: 'T000003' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });

            const output = await validateBeforeDeploy(
                {
                    app: { ...app, package: '$tmp' },
                    target
                },
                mockedProvider as any,
                nullLogger
            );
            expect(output.result).toBe(true);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${green('√')} ${summaryMessage.packageCheckPass}`);
            expect(summaryStr).toContain(
                `${yellow('?')} Package name contains lower case letter(s). $TMP is used for ADT validation.`
            );
        });

        test('Invalid package name', async () => {
            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'TESTPACKAGE1']);
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000002' },
                { transportNumber: 'T000003' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });

            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, nullLogger);
            expect(output.result).toBe(false);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${red('×')} ${summaryMessage.packageNotFound}`);
        });

        test('Error validating package name', async () => {
            mockedAdtService.listPackages.mockRejectedValueOnce(new Error(''));
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000002' },
                { transportNumber: 'T000003' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });

            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, nullLogger);
            expect(output.result).toBe(false);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${yellow('?')} ${summaryMessage.pacakgeAdtAccessError}`);
        });

        test('adtService error', async () => {
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });

            mockedProvider.getAdtService.mockImplementation((adtServiceClass) => {
                if (adtServiceClass.name === 'AtoService') {
                    return mockedAdtService;
                } else {
                    return undefined;
                }
            });

            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, nullLogger);
            expect(output.result).toBe(false);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${yellow('?')} ${summaryMessage.adtServiceUndefined} for ListPackageService`);
        });
    });

    describe('Validate transport request number against ADT', () => {
        test('Valid transport request number', async () => {
            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000002' },
                { transportNumber: 'T000003' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });

            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, nullLogger);
            expect(output.result).toBe(true);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${green('√')} ${summaryMessage.transportCheckPass}`);
        });

        test('Invalid transport request number', async () => {
            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000003' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });

            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, nullLogger);
            expect(output.result).toBe(false);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${red('×')} ${summaryMessage.transportNotFound}`);
        });

        test('Error validate transport request number', async () => {
            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getTransportRequests.mockRejectedValueOnce(new Error(''));
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });

            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, nullLogger);
            expect(output.result).toBe(false);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${yellow('?')} ${summaryMessage.transportAdtAccessError}`);
        });

        test('Local package', async () => {
            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getTransportRequests.mockRejectedValueOnce(
                new Error(TransportChecksService.LocalPackageError)
            );
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });

            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, nullLogger);
            expect(output.result).toBe(true);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${green('√')} ${summaryMessage.transportNotRequired}`);
        });

        test('Valid package name - small case local package $tmp', async () => {
            mockedAdtService.listPackages.mockResolvedValueOnce(['$TMP']);
            mockedAdtService.getTransportRequests.mockRejectedValueOnce(
                new Error(TransportChecksService.LocalPackageError)
            );
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });

            const output = await validateBeforeDeploy(
                {
                    app: { ...app, package: '$tmp' },
                    target
                },
                mockedProvider as any,
                nullLogger
            );
            expect(output.result).toBe(true);
            expect(mockedAdtService.listPackages).toBeCalledWith({ 'phrase': '$TMP' });
            expect(mockedAdtService.getTransportRequests).toBeCalledWith('$TMP', 'ZAPP1');
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${green('√')} ${summaryMessage.transportNotRequired}`);
            expect(summaryStr).toContain(
                `${yellow('?')} Package name contains lower case letter(s). $TMP is used for ADT validation.`
            );
        });

        test('Valid transport - small case transport number', async () => {
            mockedAdtService.listPackages.mockResolvedValueOnce(['TEST']);
            mockedAdtService.getTransportRequests.mockResolvedValueOnce([
                { transportNumber: 'T000001' },
                { transportNumber: 'T000002' }
            ]);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });

            const output = await validateBeforeDeploy(
                {
                    app: {
                        ...testConfig.app,
                        package: 'test',
                        transport: 't000002'
                    },
                    target: { ...testConfig.target }
                },
                mockedProvider as any,
                nullLogger
            );
            expect(output.result).toBe(true);
            expect(mockedAdtService.listPackages).toBeCalledWith({ 'phrase': 'TEST' });
            expect(mockedAdtService.getTransportRequests).toBeCalledWith('TEST', 'ZAPP1');
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(
                `${yellow('?')} Package name contains lower case letter(s). TEST is used for ADT validation.`
            );
            expect(summaryStr).toContain(
                `${yellow(
                    '?'
                )} Transport request number contains lower case letter(s). T000002 is used for ADT validation.`
            );
            expect(summaryStr).toContain(`${green('√')} ${summaryMessage.packageCheckPass}`);
            expect(summaryStr).toContain(`${green('√')} ${summaryMessage.transportCheckPass}`);
        });

        test('adtService error', async () => {
            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getAtoInfo.mockResolvedValueOnce({
                developmentPrefix: 'Z'
            });
            mockedProvider.getAdtService.mockImplementation((adtServiceClass) => {
                if (adtServiceClass.name === 'AtoService') {
                    return mockedAdtService;
                } else if (adtServiceClass.name === 'ListPackageService') {
                    return mockedAdtService;
                } else {
                    return undefined;
                }
            });

            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, nullLogger);
            expect(output.result).toBe(false);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(
                `${yellow('?')} ${summaryMessage.adtServiceUndefined} for TransportChecksService`
            );
        });
    });

    describe('Validate show additional info', () => {
        const destinationsMock = { 'ABC123': {} };
        test.each([
            ['Show additional info', true, destinationsMock, true, 'ABC123', true],
            ['If not in App Studio', false, destinationsMock, true, 'ABC123', false],
            ['If destination not provided', true, destinationsMock, true, '', false],
            ['If non-onPremise destination', true, destinationsMock, false, 'ABC123', false]
        ])(
            '%s',
            async (
                desc,
                isAppStudio,
                listDestinationsMock,
                isOnPremiseDestinationMock,
                destinationMock,
                expectedResult
            ) => {
                mockIsAppStudio.mockReturnValue(isAppStudio);
                mockListDestinations.mockResolvedValue(listDestinationsMock);
                mockisOnPremiseDestination.mockResolvedValue(isOnPremiseDestinationMock);
                const result = await showAdditionalInfoForOnPrem(destinationMock);
                expect(result).toBe(expectedResult);
            }
        );
    });

    describe('Check for credentials', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });
        const mockLogger = {
            warn: jest.fn()
        };
        const noAuthMock = { Name: 'noAuth', Authentication: Authentication.NO_AUTHENTICATION };
        const basicAuthMock = { Name: 'basicAuth', Authentication: Authentication.BASIC_AUTHENTICATION };
        const samlAuthMock = { Name: 'samlAuth', Authentication: Authentication.SAML_ASSERTION };
        const destinationsMock = {
            'noAuth': noAuthMock,
            'basicAuth': basicAuthMock,
            'samlAuth': samlAuthMock
        };
        test.each([
            ['SAMLAssertion - False', true, destinationsMock, samlAuthMock.Name, false],
            ['NoAuthentication - True', true, destinationsMock, noAuthMock.Name, true],
            ['BasicAuthentication - True', true, destinationsMock, basicAuthMock.Name, true],
            ['If destination not provided', true, destinationsMock, '', true]
        ])('%s', async (desc, isAppStudio, listDestinationsMock, destinationMock, expectedResult) => {
            mockIsAppStudio.mockReturnValue(isAppStudio);
            mockListDestinations.mockResolvedValue(listDestinationsMock);
            const result = await checkForCredentials(destinationMock, mockLogger as any);
            expect(result).toBe(expectedResult);
            if (destinationMock === samlAuthMock.Name) {
                expect(mockLogger.warn).toHaveBeenCalled();
            } else {
                expect(mockLogger.warn).not.toHaveBeenCalled();
            }
        });
    });

    describe('Validate error does not show full stack trace', () => {
        jest.resetAllMocks();
        const mockLogger = {
            error: jest.fn(),
            debug: jest.fn()
        };
        jest.mock('@sap-ux/logger', () => {
            const sapUxLogger = jest.requireActual('@sap-ux/logger');
            return {
                ...sapUxLogger,
                ToolsLogger: jest.fn(() => mockLogger)
            };
        });
        const mockAxiosError403 = {
            response: {
                status: 403,
                statusText: 'Forbidden'
            },
            message: 'Request failed with status code 403'
        } as AxiosError;
        test('Only error message shown when error is thrown', async () => {
            const logMock = jest.spyOn(mockLogger, 'error');
            const mockAxiosError401 = {
                response: {
                    status: 401,
                    statusText: 'Unauthorized'
                },
                message: 'Request failed with status code 401'
            } as AxiosError;
            mockedProvider.getAdtService.mockRejectedValueOnce(mockAxiosError401);

            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, mockLogger as any);

            expect(output.result).toBe(false);
            expect(logMock).toHaveBeenCalledWith(mockAxiosError401.message);
        });
        test('Only error message shown when error is thrown - validateTransport', async () => {
            const logMock = jest.spyOn(mockLogger, 'error');

            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
            mockedAdtService.getTransportRequests.mockRejectedValueOnce(mockAxiosError403);

            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, mockLogger as any);

            expect(output.result).toBe(false);
            expect(logMock).toHaveBeenLastCalledWith(mockAxiosError403.message);
        });
        test('Only error message shown when error is thrown - validatePackage', async () => {
            const logMock = jest.spyOn(mockLogger, 'error');
            mockedAdtService.listPackages.mockRejectedValueOnce(mockAxiosError403);

            const output = await validateBeforeDeploy(testConfig, mockedProvider as any, mockLogger as any);
            expect(output.result).toBe(false);
            expect(logMock).toHaveBeenLastCalledWith(mockAxiosError403.message);
        });
    });
});
