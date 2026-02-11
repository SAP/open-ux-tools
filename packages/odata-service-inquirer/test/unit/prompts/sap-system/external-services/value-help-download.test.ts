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

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    TelemetryHelper: {
        createTelemetryData: jest.fn((props) => ({
            ...props,
            Platform: 'CLI',
            OperatingSystem: 'test'
        }))
    },
    hostEnvironment: {
        cli: { name: 'CLI', technical: 'CLI' },
        vscode: { name: 'Visual Studio Code', technical: 'VSCode' },
        bas: { name: 'SAP Business Application Studio', technical: 'SBAS' }
    }
}));

jest.mock('../../../../../src/utils', () => {
    const { hostEnvironment } = jest.requireActual('@sap-ux/fiori-generator-shared');
    return {
        ...jest.requireActual('../../../../../src/utils'),
        getPromptHostEnvironment: jest.fn(() => hostEnvironment.vscode) // Default to non-CLI for most tests
    };
});

const mockGetExternalServiceReferences = getExternalServiceReferences as jest.Mock;
const mockSendTelemetryEvent = sendTelemetryEvent as jest.Mock;
const mockGetPromptHostEnvironment = jest.requireMock('../../../../../src/utils').getPromptHostEnvironment;
const { hostEnvironment } = jest.requireMock('@sap-ux/fiori-generator-shared');

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

            const prompts = getValueHelpDownloadPrompt(connectionValidator, 'testNamespace', convertedMetadataRef);
            const prompt = prompts[0] as ConfirmQuestion;

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

            const prompts = getValueHelpDownloadPrompt(connectionValidator, 'testNamespace', convertedMetadataRef);
            const prompt = prompts[0] as ConfirmQuestion;

            const answers = {
                'testNamespace:serviceSelection': {
                    servicePath: '/sap/opu/odata/sap/MAIN_SRV'
                }
            };

            const result = typeof prompt.when === 'function' ? prompt.when(answers) : true;

            expect(result).toBe(false);
        });

        it('should return false when no converted metadata', () => {
            const prompts = getValueHelpDownloadPrompt(connectionValidator, 'testNamespace', {
                convertedMetadata: undefined
            });
            const prompt = prompts[0] as ConfirmQuestion;

            const answers = {
                'testNamespace:serviceSelection': {
                    servicePath: '/sap/opu/odata/sap/MAIN_SRV'
                }
            };

            const result = typeof prompt.when === 'function' ? prompt.when(answers) : true;

            expect(result).toBe(false);
        });

        it('should return false when no service path', () => {
            const prompts = getValueHelpDownloadPrompt(connectionValidator, 'testNamespace', convertedMetadataRef);
            const prompt = prompts[0] as ConfirmQuestion;

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
            const prompts = getValueHelpDownloadPrompt(connectionValidator, 'testNamespace', convertedMetadataRef);
            prompt = prompts[0] as ConfirmQuestion;

            // Trigger when condition to set externalServiceRefs
            const answers = {
                'testNamespace:serviceSelection': {
                    servicePath: '/sap/opu/odata/sap/MAIN_SRV'
                }
            };
            if (typeof prompt.when === 'function') {
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

            const result = typeof prompt.validate === 'function' ? await prompt.validate(true) : true;

            expect(result).toBe(true);
            expect(LoggerHelper.logger.info).toHaveBeenCalled();
            expect(PromptState.odataService.valueListMetadata).toBeUndefined();
        });

        it('should send FAILED telemetry when download fails', async () => {
            const error = new Error('Network error');
            mockAbapServiceProvider.fetchExternalServices.mockRejectedValue(error);

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
            const prompts = getValueHelpDownloadPrompt(connectionValidator, undefined, convertedMetadataRef);
            const prompt = prompts[0];

            expect(prompt.name).toBe(promptNames.valueHelpDownload);
        });

        it('should have correct prompt name with namespace', () => {
            const prompts = getValueHelpDownloadPrompt(connectionValidator, 'myNamespace', convertedMetadataRef);
            const prompt = prompts[0];

            expect(prompt.name).toBe(`myNamespace:${promptNames.valueHelpDownload}`);
        });

        it('should have confirm type', () => {
            const prompts = getValueHelpDownloadPrompt(connectionValidator, undefined, convertedMetadataRef);
            const prompt = prompts[0];

            expect(prompt.type).toBe('confirm');
        });

        it('should have a message', () => {
            const prompts = getValueHelpDownloadPrompt(connectionValidator, undefined, convertedMetadataRef);
            const prompt = prompts[0];

            expect(prompt.message).toBeDefined();
            expect(typeof prompt.message).toBe('string');
        });
    });

    describe('telemetry timing', () => {
        it('should measure download time accurately', async () => {
            mockGetExternalServiceReferences.mockReturnValue(mockExternalServiceRefs);
            const prompts = getValueHelpDownloadPrompt(connectionValidator, 'testNamespace', convertedMetadataRef);
            const prompt = prompts[0] as ConfirmQuestion;

            // Trigger when condition
            const answers = {
                'testNamespace:serviceSelection': {
                    servicePath: '/sap/opu/odata/sap/MAIN_SRV'
                }
            };
            if (typeof prompt.when === 'function') {
                prompt.when(answers);
            }

            // Mock a delay in fetchExternalServices
            mockAbapServiceProvider.fetchExternalServices.mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(mockExternalServiceMetadata), 100))
            );

            if (typeof prompt.validate === 'function') {
                await prompt.validate(true);
            }

            // Check that downloadTimeMs is >= 99ms (allow 1ms tolerance for timer imprecision)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const successCall = mockReportEvent.mock.calls.find(
                (call: any[]) => call[0]?.eventName === 'VALUE_HELP_DOWNLOAD_SUCCESS'
            );
            expect(successCall).toBeDefined();

            expect(successCall?.[0]?.measurements?.downloadTimeMs).toBeGreaterThanOrEqual(99);
        });
    });

    describe('CLI-specific behavior', () => {
        beforeEach(() => {
            // Mock CLI environment for these tests
            mockGetPromptHostEnvironment.mockReturnValue(hostEnvironment.cli);
        });

        afterEach(() => {
            // Restore to default non-CLI environment
            mockGetPromptHostEnvironment.mockReturnValue(hostEnvironment.vscode);
        });

        it('should return 2 prompts in CLI mode (confirm + hidden download trigger)', () => {
            const prompts = getValueHelpDownloadPrompt(connectionValidator, 'testNamespace', convertedMetadataRef);

            // In CLI mode, should have 2 prompts: confirm + hidden download
            expect(prompts.length).toBe(2);
            expect(prompts[0].type).toBe('confirm');
            expect(prompts[1].type).toBe('input'); // Hidden prompt
            expect(prompts[1].name).toContain('cliValueHelpDownload');
        });

        it('should trigger download via hidden prompt when user confirms in CLI', async () => {
            mockGetExternalServiceReferences.mockReturnValue(mockExternalServiceRefs);
            mockAbapServiceProvider.fetchExternalServices.mockResolvedValue(mockExternalServiceMetadata);

            const prompts = getValueHelpDownloadPrompt(connectionValidator, 'testNamespace', convertedMetadataRef);

            // Simulate user flow in CLI
            const confirmPrompt = prompts[0] as ConfirmQuestion;

            // Trigger when condition to set externalServiceRefs
            const answers = {
                'testNamespace:serviceSelection': {
                    servicePath: '/sap/opu/odata/sap/MAIN_SRV'
                },
                'testNamespace:valueHelpDownload': true // User answered "Y"
            };

            if (typeof confirmPrompt.when === 'function') {
                confirmPrompt.when(answers);
            }

            // Execute the hidden prompt's when condition
            const hiddenPrompt = prompts[1];
            if (typeof hiddenPrompt.when === 'function') {
                await hiddenPrompt.when(answers);
            }

            // Verify download was triggered
            expect(mockAbapServiceProvider.fetchExternalServices).toHaveBeenCalledWith(mockExternalServiceRefs);
            expect(PromptState.odataService.valueListMetadata).toEqual(mockExternalServiceMetadata);
        });

        it('should return 1 prompt in non-CLI mode (confirm with validate)', () => {
            // Switch back to non-CLI
            mockGetPromptHostEnvironment.mockReturnValue(hostEnvironment.vscode);

            const prompts = getValueHelpDownloadPrompt(connectionValidator, 'testNamespace', convertedMetadataRef);

            // In non-CLI mode, should have 1 prompt: confirm with validate function
            expect(prompts.length).toBe(1);
            expect(prompts[0].type).toBe('confirm');
        });
    });
});
