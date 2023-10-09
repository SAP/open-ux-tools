import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { formatSummary, summaryMessage, validateBeforeDeploy } from '../../../src/base/validate';
import { mockedProvider, mockedAdtService } from '../../__mocks__';
import { green, red, yellow } from 'chalk';
import { AtoService, ListPackageService, TransportChecksService } from '@sap-ux/axios-extension';

const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });

describe('deploy-test validation', () => {
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
            const output = await validateBeforeDeploy(
                {
                    appName: 'ZAPP1',
                    description: '',
                    package: 'MYPACKAGE',
                    transport: 'T000002',
                    client: '001',
                    url: 'https://test.dev'
                },
                mockedProvider as any,
                nullLogger
            );
            expect(output.result).toBe(true);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${green('√')} ${summaryMessage.allClientCheckPass}`);
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

            const output = await validateBeforeDeploy(
                {
                    appName: 'ZAPP1',
                    description: '',
                    package: 'MYPACKAGE',
                    transport: 'T000002',
                    client: '001',
                    url: 'https://test.dev'
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

            const output = await validateBeforeDeploy(
                {
                    appName: 'ZAPP1',
                    description: '',
                    package: 'MYPACKAGE',
                    transport: 'T000002',
                    client: '001',
                    url: 'https://test.dev'
                },
                mockedProvider as any,
                nullLogger
            );
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

            const output = await validateBeforeDeploy(
                {
                    appName: 'ZAPP1',
                    description: '',
                    package: 'MYPACKAGE',
                    transport: 'T000002',
                    client: '001',
                    url: 'https://test.dev'
                },
                mockedProvider as any,
                nullLogger
            );
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

            const output = await validateBeforeDeploy(
                {
                    appName: 'ZAPP1',
                    description: '',
                    package: 'MYPACKAGE',
                    transport: 'T000002',
                    client: '001',
                    url: 'https://test.dev'
                },
                mockedProvider as any,
                nullLogger
            );
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

            const output = await validateBeforeDeploy(
                {
                    appName: 'ZAPP1',
                    description: '',
                    package: 'MYPACKAGE',
                    transport: 'T000002',
                    client: '001',
                    url: 'https://test.dev'
                },
                mockedProvider as any,
                nullLogger
            );
            expect(output.result).toBe(true);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(`${green('√')} ${summaryMessage.transportCheckPass}`);
        });

        test('Invalid transport request number', async () => {
            mockedAdtService.listPackages.mockResolvedValueOnce(['TESTPACKAGE', 'MYPACKAGE']);
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
                    appName: 'ZAPP1',
                    description: '',
                    package: 'MYPACKAGE',
                    transport: 'T000004',
                    client: '001',
                    url: 'https://test.dev'
                },
                mockedProvider as any,
                nullLogger
            );
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

            const output = await validateBeforeDeploy(
                {
                    appName: 'ZAPP1',
                    description: '',
                    package: 'MYPACKAGE',
                    transport: 'T000004',
                    client: '001',
                    url: 'https://test.dev'
                },
                mockedProvider as any,
                nullLogger
            );
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

            const output = await validateBeforeDeploy(
                {
                    appName: 'ZAPP1',
                    description: '',
                    package: 'MYPACKAGE',
                    transport: 'T000004',
                    client: '001',
                    url: 'https://test.dev'
                },
                mockedProvider as any,
                nullLogger
            );
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

            const output = await validateBeforeDeploy(
                {
                    appName: 'ZAPP1',
                    description: '',
                    package: 'MYPACKAGE',
                    transport: 'T000004',
                    client: '001',
                    url: 'https://test.dev'
                },
                mockedProvider as any,
                nullLogger
            );
            expect(output.result).toBe(false);
            const summaryStr = formatSummary(output.summary);
            expect(summaryStr).toContain(
                `${yellow('?')} ${summaryMessage.adtServiceUndefined} for TransportChecksService`
            );
        });
    });
});
