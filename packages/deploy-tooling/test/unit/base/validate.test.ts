import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { formatSummary, summaryMessage, validateBeforeDeploy } from '../../../src/base/validate';
import { mockedProvider, mockedAdtService } from '../../__mocks__';
import { green, red, yellow } from 'chalk';
import { TransportChecksService } from '@sap-ux/axios-extension';
import { t } from '@sap-ux/project-input-validator/src/i18n';
import exp from 'constants';

const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });

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


        test('Skip validating url if destination is provided', async () => {
            const name = 'nslooooooooooooooooooooog/ZAPP1';
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
                    target: { ...target, destination, url: undefined }
                },
                mockedProvider as any,
                nullLogger
            );
            expect(output.result).toBe(false);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${red('×')} ${t('deploy.invalidAppNameMultipleReason')}`);
            expect(summaryStr).toContain(`${t('deploy.abapInvalidAppNameLength', { length: name.length })}`);
            expect(summaryStr).toContain(`${t('deploy.abapInvalidAppName', { prefix })}`);
            expect(summaryStr).not.toContain(`${t('general.invalidUrl')}`);
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
});
