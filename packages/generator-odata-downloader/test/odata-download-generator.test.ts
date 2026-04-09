import { jest } from '@jest/globals';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import { join } from 'node:path';

// Create a mock AbapServiceProvider class for instanceof checks
class MockAbapServiceProvider {
    get = jest.fn();
    fetchExternalServices = jest.fn();
}

jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    AbapServiceProvider: MockAbapServiceProvider
}));

const mockGetHostEnvironment = jest.fn();
const mockHostEnvironment = {
    cli: 'CLI',
    vscode: 'vscode'
};
const mockLogWrapper = jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    getLogLevel: jest.fn().mockReturnValue('info')
}));
jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    DefaultLogger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    },
    getHostEnvironment: mockGetHostEnvironment,
    hostEnvironment: mockHostEnvironment,
    LogWrapper: mockLogWrapper,
    setYeomanEnvConflicterForce: jest.fn()
}));

const mockWriteExternalServiceMetadata = jest.fn();
jest.unstable_mockModule('@sap-ux/odata-service-writer', () => ({
    writeExternalServiceMetadata: mockWriteExternalServiceMetadata
}));

const mockGenerateMockserverConfig = jest.fn();
jest.unstable_mockModule('@sap-ux/mockserver-config-writer', () => ({
    generateMockserverConfig: mockGenerateMockserverConfig
}));

const mockGetMockServerConfig = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    DirName: {
        Webapp: 'webapp',
        LocalService: 'localService',
        Mockdata: 'mockdata'
    },
    getMockServerConfig: mockGetMockServerConfig
}));

const mockGetODataDownloaderPrompts = jest.fn();
const mockPromptNames = {
    appSelection: 'appSelection',
    toggleSelection: 'toggleSelection',
    relatedEntitySelection: 'relatedEntitySelection',
    skipDataDownload: 'skipDataDownload',
    updateMainServiceMetadata: 'updateMainServiceMetadata'
};
jest.unstable_mockModule('../src/data-download/prompts/prompts', () => ({
    getODataDownloaderPrompts: mockGetODataDownloaderPrompts,
    promptNames: mockPromptNames
}));

const mockGetValueHelpSelectionPrompt = jest.fn();
jest.unstable_mockModule('../src/data-download/prompts/value-help-prompts', () => ({
    getValueHelpSelectionPrompt: mockGetValueHelpSelectionPrompt
}));

const mockCreateEntitySetData = jest.fn();
jest.unstable_mockModule('../src/data-download/utils', () => ({
    createEntitySetData: mockCreateEntitySetData
}));

// Mock yeoman-generator
const mockPrompt = jest.fn();
const mockWriteDestinationJSON = jest.fn();
const mockWriteDestination = jest.fn();
const mockDestinationRoot = jest.fn();
const mockLog = jest.fn();
const mockFs = { write: jest.fn() };

jest.unstable_mockModule('yeoman-generator', () => {
    const MockGenerator = class {
        options: any = {};
        env: any = { conflicter: { force: false } };
        fs = mockFs;
        prompt = mockPrompt;
        writeDestinationJSON = mockWriteDestinationJSON;
        writeDestination = mockWriteDestination;
        destinationRoot = mockDestinationRoot;
        log = mockLog;
        rootGeneratorVersion() {
            return '1.0.0';
        }
        rootGeneratorName() {
            return 'test-generator';
        }
        constructor(args: unknown, opts: Record<string, unknown>, _features?: unknown) {
            this.options = opts ?? {};
        }
    };
    return { default: MockGenerator };
});

jest.unstable_mockModule('../src/utils/i18n', () => ({
    initI18nODataDownloadGenerator: jest.fn().mockResolvedValue(undefined),
    t: jest.fn((key: string) => key)
}));

jest.unstable_mockModule('../src/telemetry', () => ({
    TelemetryHelper: {
        initTelemetrySettings: jest.fn().mockResolvedValue(undefined),
        sendTelemetry: jest.fn().mockResolvedValue(undefined)
    }
}));

const { ODataDownloadGenerator } = await import('../src/data-download/odata-download-generator');
const { AbapServiceProvider } = await import('@sap-ux/axios-extension');

describe('ODataDownloadGenerator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.cli);
    });

    describe('static logger', () => {
        it('should return the default logger initially', () => {
            expect(ODataDownloadGenerator.logger).toBeDefined();
        });
    });

    describe('_configureLogging', () => {
        it('should create a LogWrapper with correct parameters', () => {
            const generator = new ODataDownloadGenerator([], {});

            generator._configureLogging('info' as any, undefined as any, undefined);

            expect(mockLogWrapper).toHaveBeenCalledWith(
                'test-generator',
                expect.any(Function),
                'info',
                undefined,
                undefined
            );
        });

        it('should pass vscode logger when provided', () => {
            const generator = new ODataDownloadGenerator([], {});
            const mockVscLogger = { log: jest.fn() };
            const mockVscode = { window: {} };

            generator._configureLogging('debug' as any, mockVscLogger as any, mockVscode);

            expect(mockLogWrapper).toHaveBeenCalledWith(
                'test-generator',
                expect.any(Function),
                'debug',
                mockVscLogger,
                mockVscode
            );
        });
    });

    describe('writing', () => {
        let generator: ODataDownloadGenerator;

        beforeEach(() => {
            generator = new ODataDownloadGenerator([], {});
        });

        it('should write entity data files when odata results exist', async () => {
            const mockEntityFileData = {
                Travel: [{ TravelID: '1' }],
                Booking: [{ BookingID: '100' }]
            };

            mockCreateEntitySetData.mockReturnValue(mockEntityFileData);

            // Set up generator state via prompting
            mockGetODataDownloaderPrompts.mockResolvedValue({
                answers: {
                    application: {
                        appAccess: {
                            getAppRoot: () => '/test/app',
                            app: { mainService: 'mainService' }
                        },
                        referencedEntities: {
                            listEntity: { entitySetName: 'Travel', semanticKeys: [], entityPath: 'Travel' }
                        },
                        relatedEntityChoices: {
                            entitySetsFlat: { Travel: 'Travel' }
                        }
                    },
                    odataQueryResult: {
                        odata: [{ TravelID: '1' }]
                    },
                    odataServiceAnswers: {
                        servicePath: '/sap/opu/odata4/sap/travel',
                        metadata: '<metadata/>'
                    }
                },
                questions: []
            });

            mockGetValueHelpSelectionPrompt.mockReturnValue({
                questions: [],
                valueHelpData: undefined
            });

            mockGetMockServerConfig.mockResolvedValue(null);
            mockPrompt.mockResolvedValue({});

            await generator.prompting();
            await generator.writing();

            expect(mockDestinationRoot).toHaveBeenCalledWith(join('/test/app'));
            expect(mockCreateEntitySetData).toHaveBeenCalledWith([{ TravelID: '1' }], { Travel: 'Travel' }, 'Travel');
            expect(mockWriteDestinationJSON).toHaveBeenCalledTimes(2);
            expect(mockWriteDestinationJSON).toHaveBeenCalledWith(
                join('webapp', 'localService', 'mockdata', 'Travel.json'),
                [{ TravelID: '1' }]
            );
            expect(mockWriteDestinationJSON).toHaveBeenCalledWith(
                join('webapp', 'localService', 'mockdata', 'Booking.json'),
                [{ BookingID: '100' }]
            );
        });

        it('should use mock server config path when available', async () => {
            const mockEntityFileData = { Travel: [{ TravelID: '1' }] };
            mockCreateEntitySetData.mockReturnValue(mockEntityFileData);

            mockGetODataDownloaderPrompts.mockResolvedValue({
                answers: {
                    application: {
                        appAccess: {
                            getAppRoot: () => '/test/app',
                            app: { mainService: 'mainService' }
                        },
                        referencedEntities: {
                            listEntity: { entitySetName: 'Travel', semanticKeys: [], entityPath: 'Travel' }
                        },
                        relatedEntityChoices: {
                            entitySetsFlat: {}
                        }
                    },
                    odataQueryResult: { odata: [{ TravelID: '1' }] },
                    odataServiceAnswers: {
                        servicePath: '/sap/opu/odata4/sap/travel/',
                        metadata: '<metadata/>'
                    }
                },
                questions: []
            });

            mockGetValueHelpSelectionPrompt.mockReturnValue({
                questions: [],
                valueHelpData: undefined
            });

            // Mock server config with custom mockdata path
            mockGetMockServerConfig.mockResolvedValue({
                services: [
                    {
                        urlPath: '/sap/opu/odata4/sap/travel',
                        mockdataPath: 'custom/mockdata/path'
                    }
                ]
            });

            mockPrompt.mockResolvedValue({});

            await generator.prompting();
            await generator.writing();

            expect(mockWriteDestinationJSON).toHaveBeenCalledWith(join('custom/mockdata/path', 'Travel.json'), [
                { TravelID: '1' }
            ]);
        });

        it('should write value help data when available', async () => {
            const mockValueHelpData = [{ path: '/sap/opu/odata4/sap/valuehelp', entities: [] }];
            const mockServiceProvider = new AbapServiceProvider({} as any);

            mockCreateEntitySetData.mockReturnValue({});

            mockGetODataDownloaderPrompts.mockResolvedValue({
                answers: {
                    application: {
                        appAccess: {
                            getAppRoot: () => '/test/app',
                            app: { mainService: 'mainService' }
                        },
                        referencedEntities: {
                            listEntity: { entitySetName: 'Travel', semanticKeys: [], entityPath: 'Travel' }
                        },
                        relatedEntityChoices: {
                            entitySetsFlat: {}
                        }
                    },
                    odataQueryResult: { odata: [] },
                    odataServiceAnswers: {
                        servicePath: '/sap/opu/odata4/sap/travel',
                        metadata: '<metadata/>',
                        connectedSystem: {
                            serviceProvider: mockServiceProvider
                        }
                    }
                },
                questions: []
            });

            mockGetValueHelpSelectionPrompt.mockReturnValue({
                questions: [],
                valueHelpData: mockValueHelpData
            });

            mockGetMockServerConfig.mockResolvedValue(null);
            mockPrompt.mockResolvedValue({});

            await generator.prompting();
            await generator.writing();

            expect(mockWriteExternalServiceMetadata).toHaveBeenCalledWith(
                mockFs,
                join('/test/app', 'webapp'),
                mockValueHelpData,
                'mainService',
                '/sap/opu/odata4/sap/travel'
            );
        });

        it('should write resolveExternalServiceReferences to ui5-mock.yaml when value help data and mock config exist', async () => {
            const mockValueHelpData = [{ path: '/sap/opu/odata4/sap/valuehelp', entities: [] }];
            const mockServiceProvider = new AbapServiceProvider({} as any);

            mockCreateEntitySetData.mockReturnValue({});

            mockGetODataDownloaderPrompts.mockResolvedValue({
                answers: {
                    application: {
                        appAccess: {
                            getAppRoot: () => '/test/app',
                            app: { mainService: 'mainService' }
                        },
                        referencedEntities: {
                            listEntity: { entitySetName: 'Travel', semanticKeys: [], entityPath: 'Travel' }
                        },
                        relatedEntityChoices: {
                            entitySetsFlat: {}
                        }
                    },
                    odataQueryResult: { odata: [] },
                    odataServiceAnswers: {
                        servicePath: '/sap/opu/odata4/sap/travel',
                        metadata: '<metadata/>',
                        connectedSystem: {
                            serviceProvider: mockServiceProvider
                        }
                    }
                },
                questions: []
            });

            mockGetValueHelpSelectionPrompt.mockReturnValue({
                questions: [],
                valueHelpData: mockValueHelpData
            });

            mockGetMockServerConfig.mockResolvedValue({
                services: [
                    {
                        urlPath: '/sap/opu/odata4/sap/travel',
                        mockdataPath: 'webapp/localService/mockdata'
                    }
                ]
            });
            mockPrompt.mockResolvedValue({});

            await generator.prompting();
            await generator.writing();

            expect(mockGenerateMockserverConfig).toHaveBeenCalledWith(
                '/test/app',
                expect.objectContaining({
                    webappPath: join('/test/app', 'webapp'),
                    packageJsonConfig: { skip: true },
                    ui5MockYamlConfig: {
                        overwrite: true,
                        resolveExternalServiceReferences: {
                            mainService: true
                        }
                    }
                }),
                mockFs
            );
        });

        it('should update main service metadata when requested', async () => {
            mockCreateEntitySetData.mockReturnValue({});

            mockGetODataDownloaderPrompts.mockResolvedValue({
                answers: {
                    application: {
                        appAccess: {
                            getAppRoot: () => '/test/app',
                            app: { mainService: 'mainService' }
                        },
                        referencedEntities: {
                            listEntity: { entitySetName: 'Travel', semanticKeys: [], entityPath: 'Travel' }
                        },
                        relatedEntityChoices: {
                            entitySetsFlat: {}
                        }
                    },
                    odataQueryResult: { odata: [] },
                    odataServiceAnswers: {
                        servicePath: '/sap/opu/odata4/sap/travel',
                        metadata: '<edmx:Edmx><edmx:DataServices></edmx:DataServices></edmx:Edmx>'
                    }
                },
                questions: []
            });

            mockGetValueHelpSelectionPrompt.mockReturnValue({
                questions: [],
                valueHelpData: undefined
            });

            mockGetMockServerConfig.mockResolvedValue(null);
            mockPrompt.mockResolvedValue({
                [mockPromptNames.updateMainServiceMetadata]: true
            });

            await generator.prompting();
            await generator.writing();

            expect(mockWriteDestination).toHaveBeenCalledWith(
                join('/test/app', 'webapp', 'localService', 'mainService', 'metadata.xml'),
                expect.stringContaining('edmx:Edmx')
            );
        });
    });

    describe('prompting error handling', () => {
        it('should throw error and log when prompting fails in CLI', async () => {
            const generator = new ODataDownloadGenerator([], {});
            const testError = new Error('Prompting failed');

            mockGetODataDownloaderPrompts.mockRejectedValue(testError);
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.cli);

            await expect(generator.prompting()).rejects.toThrow();
        });

        it('should show error in appWizard when not in CLI mode', async () => {
            const mockShowError = jest.fn();
            const generator = new ODataDownloadGenerator([], {});
            // Access private appWizard via any cast
            (generator as any).appWizard = { showError: mockShowError };

            const testError = 'Prompting failed';
            mockGetODataDownloaderPrompts.mockRejectedValue(testError);
            mockGetHostEnvironment.mockReturnValue(mockHostEnvironment.vscode);

            await expect(generator.prompting()).rejects.toThrow(testError);
            expect(mockShowError).toHaveBeenCalledWith(testError, MessageType.notification);
        });
    });

    describe('mock server config path matching', () => {
        it('should match service paths ignoring leading/trailing slashes', async () => {
            const generator = new ODataDownloadGenerator([], {});

            mockCreateEntitySetData.mockReturnValue({ Travel: [] });

            mockGetODataDownloaderPrompts.mockResolvedValue({
                answers: {
                    application: {
                        appAccess: {
                            getAppRoot: () => '/test/app',
                            app: { mainService: 'mainService' }
                        },
                        referencedEntities: {
                            listEntity: { entitySetName: 'Travel', semanticKeys: [], entityPath: 'Travel' }
                        },
                        relatedEntityChoices: {
                            entitySetsFlat: {}
                        }
                    },
                    odataQueryResult: { odata: [] },
                    odataServiceAnswers: {
                        // Service path with trailing slash
                        servicePath: '/sap/opu/odata4/sap/travel/',
                        metadata: '<metadata/>'
                    }
                },
                questions: []
            });

            mockGetValueHelpSelectionPrompt.mockReturnValue({
                questions: [],
                valueHelpData: undefined
            });

            // Mock config has path without trailing slash
            mockGetMockServerConfig.mockResolvedValue({
                services: [
                    {
                        urlPath: 'sap/opu/odata4/sap/travel',
                        mockdataPath: 'matched/path'
                    }
                ]
            });

            mockPrompt.mockResolvedValue({});

            await generator.prompting();
            await generator.writing();

            // Should have matched despite different slash formatting
            expect(mockWriteDestinationJSON).toHaveBeenCalledWith(join('matched/path', 'Travel.json'), []);
        });
    });
});
