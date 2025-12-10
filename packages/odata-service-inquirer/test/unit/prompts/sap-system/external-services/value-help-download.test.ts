import type { ConfirmQuestion } from '@sap-ux/inquirer-common';
import { sendTelemetryEvent } from '@sap-ux/inquirer-common';
import type { ExternalService, ExternalServiceReference } from '@sap-ux/axios-extension';
import { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { getExternalServiceReferences } from '@sap-ux/odata-service-writer';
import type { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';
import { getValueHelpDownloadPrompt } from '../../../../../src/prompts/datasources/sap-system/external-services/value-help-download';
import { promptNames } from '../../../../../src/types';
import { PromptState } from '../../../../../src/utils';
import LoggerHelper from '../../../../../src/prompts/logger-helper';
import { initI18nOdataServiceInquirer } from '../../../../../src/i18n';

const mockReportEvent = jest.fn();
const mockTelemetryClient = {
    reportEvent: mockReportEvent
};

jest.mock('@sap-ux/inquirer-common', () => ({
    ...jest.requireActual('@sap-ux/inquirer-common'),
    sendTelemetryEvent: jest.fn(),
    getTelemetryClient: jest.fn(() => mockTelemetryClient)
}));

jest.mock('@sap-ux/odata-service-writer', () => ({
    ...jest.requireActual('@sap-ux/odata-service-writer'),
    getExternalServiceReferences: jest.fn()
}));

jest.mock('../../../../../src/prompts/logger-helper', () => ({
    __esModule: true,
    default: {
        logger: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        }
    }
}));

const mockGetExternalServiceReferences = getExternalServiceReferences as jest.Mock;
const mockSendTelemetryEvent = sendTelemetryEvent as jest.Mock;

describe('getValueHelpDownloadPrompt', () => {
    let connectionValidator: ConnectionValidator;
    let convertedMetadataRef: { convertedMetadata: ConvertedMetadata | undefined };
    let mockAbapServiceProvider: jest.Mocked<AbapServiceProvider>;

    const mockExternalServiceRefs: ExternalServiceReference[] = [
        {
            path: '/sap/opu/odata/sap/VALUEHELP_SRV',
            type: 'value-list',
            target: 'ValueHelp1',
            serviceRootPath: '/sap/opu/odata/sap/VALUEHELP_SRV',
            value: 'ValueHelp1'
        } as unknown as ExternalServiceReference,
        {
            path: '/sap/opu/odata/sap/VALUEHELP2_SRV',
            type: 'value-list',
            target: 'ValueHelp2',
            serviceRootPath: '/sap/opu/odata/sap/VALUEHELP2_SRV',
            value: 'ValueHelp2'
        } as unknown as ExternalServiceReference
    ];

    const mockExternalServiceMetadata: ExternalService[] = [
        {
            path: '/sap/opu/odata/sap/VALUEHELP_SRV',
            metadata:
                '<?xml version="1.0"?><edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"/>'
        } as ExternalService,
        {
            path: '/sap/opu/odata/sap/VALUEHELP2_SRV',
            metadata:
                '<?xml version="1.0"?><edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"/>'
        } as ExternalService
    ];

    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        delete PromptState.odataService.valueListMetadata;

        mockAbapServiceProvider = {
            fetchExternalServices: jest.fn()
        } as unknown as jest.Mocked<AbapServiceProvider>;

        // Make the mock pass instanceof check
        Object.setPrototypeOf(mockAbapServiceProvider, AbapServiceProvider.prototype);

        connectionValidator = {
            serviceProvider: mockAbapServiceProvider
        } as unknown as ConnectionValidator;

        convertedMetadataRef = {
            convertedMetadata: {} as ConvertedMetadata
        };
    });

    describe('when condition', () => {
        it('should return true when external service references exist', () => {
            mockGetExternalServiceReferences.mockReturnValue(mockExternalServiceRefs);

            const prompt = getValueHelpDownloadPrompt(
                connectionValidator,
                'testNamespace',
                convertedMetadataRef
            ) as ConfirmQuestion;

            const answers = {
                'testNamespace:serviceSelection': {
                    servicePath: '/sap/opu/odata/sap/MAIN_SRV'
                }
            };

            const result = typeof prompt.when === 'function' ? prompt.when(answers) : true;

            expect(result).toBe(true);
            expect(mockGetExternalServiceReferences).toHaveBeenCalledWith(
                '/sap/opu/odata/sap/MAIN_SRV',
                convertedMetadataRef.convertedMetadata
            );
        });

        it('should return false when no external service references exist', () => {
            mockGetExternalServiceReferences.mockReturnValue([]);

            const prompt = getValueHelpDownloadPrompt(
                connectionValidator,
                'testNamespace',
                convertedMetadataRef
            ) as ConfirmQuestion;

            const answers = {
                'testNamespace:serviceSelection': {
                    servicePath: '/sap/opu/odata/sap/MAIN_SRV'
                }
            };

            const result = typeof prompt.when === 'function' ? prompt.when(answers) : true;

            expect(result).toBe(false);
        });

        it('should return false when no converted metadata', () => {
            const prompt = getValueHelpDownloadPrompt(connectionValidator, 'testNamespace', {
                convertedMetadata: undefined
            }) as ConfirmQuestion;

            const answers = {
                'testNamespace:serviceSelection': {
                    servicePath: '/sap/opu/odata/sap/MAIN_SRV'
                }
            };

            const result = typeof prompt.when === 'function' ? prompt.when(answers) : true;

            expect(result).toBe(false);
        });

        it('should return false when no service path', () => {
            const prompt = getValueHelpDownloadPrompt(
                connectionValidator,
                'testNamespace',
                convertedMetadataRef
            ) as ConfirmQuestion;

            const answers = {
                'testNamespace:serviceSelection': {}
            };

            const result = typeof prompt.when === 'function' ? prompt.when(answers) : true;

            expect(result).toBe(false);
        });
    });

    describe('validate function', () => {
        let prompt: ConfirmQuestion;

        beforeEach(() => {
            mockGetExternalServiceReferences.mockReturnValue(mockExternalServiceRefs);
            prompt = getValueHelpDownloadPrompt(
                connectionValidator,
                'testNamespace',
                convertedMetadataRef
            ) as ConfirmQuestion;

            // Trigger when condition to set externalServiceRefs
            const answers = {
                'testNamespace:serviceSelection': {
                    servicePath: '/sap/opu/odata/sap/MAIN_SRV'
                }
            };
            if (typeof prompt.when === 'function') {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                prompt.when(answers);
            }
        });

        it('should send PROMPTED telemetry when user chooses not to download', async () => {
            const result = typeof prompt.validate === 'function' ? await prompt.validate(false) : true;

            expect(result).toBe(true);
            expect(mockSendTelemetryEvent).toHaveBeenCalledWith(
                'VALUE_HELP_DOWNLOAD_PROMPTED',
                expect.objectContaining({
                    userChoseToDownload: false
                })
            );
            expect(PromptState.odataService.valueListMetadata).toBeUndefined();
        });

        it('should send PROMPTED and SUCCESS telemetry when download succeeds', async () => {
            mockAbapServiceProvider.fetchExternalServices.mockResolvedValue(mockExternalServiceMetadata);

            const result = typeof prompt.validate === 'function' ? await prompt.validate(true) : true;

            expect(result).toBe(true);
            expect(mockSendTelemetryEvent).toHaveBeenCalledTimes(1);
            expect(mockSendTelemetryEvent).toHaveBeenCalledWith(
                'VALUE_HELP_DOWNLOAD_PROMPTED',
                expect.objectContaining({
                    userChoseToDownload: true
                })
            );
            expect(mockReportEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventName: 'VALUE_HELP_DOWNLOAD_SUCCESS',
                    properties: expect.objectContaining({
                        userChoseToDownload: true,
                        valueHelpCount: 2
                    }),
                    measurements: expect.objectContaining({
                        downloadTimeMs: expect.any(Number)
                    })
                }),
                expect.any(Number) // SampleRate
            );
            expect(PromptState.odataService.valueListMetadata).toEqual(mockExternalServiceMetadata);
        });

        it('should log info when no external services are fetched', async () => {
            mockAbapServiceProvider.fetchExternalServices.mockResolvedValue([]);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const result = typeof prompt.validate === 'function' ? await prompt.validate(true) : true;

            expect(result).toBe(true);
            expect(LoggerHelper.logger.info).toHaveBeenCalled();
            expect(PromptState.odataService.valueListMetadata).toBeUndefined();
        });

        it('should send FAILED telemetry when download fails', async () => {
            const error = new Error('Network error');
            mockAbapServiceProvider.fetchExternalServices.mockRejectedValue(error);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const result = typeof prompt.validate === 'function' ? await prompt.validate(true) : true;

            expect(result).toBe(true);
            expect(mockSendTelemetryEvent).toHaveBeenCalledTimes(1);
            expect(mockSendTelemetryEvent).toHaveBeenCalledWith(
                'VALUE_HELP_DOWNLOAD_PROMPTED',
                expect.objectContaining({
                    userChoseToDownload: true
                })
            );
            expect(mockReportEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventName: 'VALUE_HELP_DOWNLOAD_FAILED',
                    properties: expect.objectContaining({
                        userChoseToDownload: true,
                        error: 'Network error'
                    }),
                    measurements: expect.objectContaining({
                        downloadTimeMs: expect.any(Number)
                    })
                }),
                expect.any(Number) // SampleRate
            );
            expect(LoggerHelper.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to fetch external service metadata')
            );
            expect(PromptState.odataService.valueListMetadata).toBeUndefined();
        });

        it('should not fetch when service provider is not AbapServiceProvider', async () => {
            Object.defineProperty(connectionValidator, 'serviceProvider', {
                value: {},
                writable: true,
                configurable: true
            });

            const result = typeof prompt.validate === 'function' ? await prompt.validate(true) : true;

            expect(result).toBe(true);
            expect(mockAbapServiceProvider.fetchExternalServices).not.toHaveBeenCalled();
            expect(mockSendTelemetryEvent).toHaveBeenCalledTimes(1);
            expect(mockSendTelemetryEvent).toHaveBeenCalledWith(
                'VALUE_HELP_DOWNLOAD_PROMPTED',
                expect.objectContaining({
                    userChoseToDownload: true
                })
            );
        });
    });

    describe('prompt properties', () => {
        it('should have correct prompt name without namespace', () => {
            const prompt = getValueHelpDownloadPrompt(connectionValidator, undefined, convertedMetadataRef);

            expect(prompt.name).toBe(promptNames.valueHelpDownload);
        });

        it('should have correct prompt name with namespace', () => {
            const prompt = getValueHelpDownloadPrompt(connectionValidator, 'myNamespace', convertedMetadataRef);

            expect(prompt.name).toBe(`myNamespace:${promptNames.valueHelpDownload}`);
        });

        it('should have confirm type', () => {
            const prompt = getValueHelpDownloadPrompt(connectionValidator, undefined, convertedMetadataRef);

            expect(prompt.type).toBe('confirm');
        });

        it('should have a message', () => {
            const prompt = getValueHelpDownloadPrompt(connectionValidator, undefined, convertedMetadataRef);

            expect(prompt.message).toBeDefined();
            expect(typeof prompt.message).toBe('string');
        });
    });

    describe('telemetry timing', () => {
        it('should measure download time accurately', async () => {
            mockGetExternalServiceReferences.mockReturnValue(mockExternalServiceRefs);
            const prompt = getValueHelpDownloadPrompt(
                connectionValidator,
                'testNamespace',
                convertedMetadataRef
            ) as ConfirmQuestion;

            // Trigger when condition
            const answers = {
                'testNamespace:serviceSelection': {
                    servicePath: '/sap/opu/odata/sap/MAIN_SRV'
                }
            };
            if (typeof prompt.when === 'function') {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                prompt.when(answers);
            }

            // Mock a delay in fetchExternalServices
            mockAbapServiceProvider.fetchExternalServices.mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(mockExternalServiceMetadata), 100))
            );

            if (typeof prompt.validate === 'function') {
                await prompt.validate(true);
            }

            // Check that downloadTimeMs is >= 100ms
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const successCall = mockReportEvent.mock.calls.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
                (call: any[]) => call[0]?.eventName === 'VALUE_HELP_DOWNLOAD_SUCCESS'
            );
            expect(successCall).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            expect(successCall?.[0]?.measurements?.downloadTimeMs).toBeGreaterThanOrEqual(100);
        });
    });
});
