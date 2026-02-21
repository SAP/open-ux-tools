import { MessageType } from '@sap-devx/yeoman-ui-types';
import { getHostEnvironment, hostEnvironment, LogWrapper } from '@sap-ux/fiori-generator-shared';
import { generateMockserverConfig } from '@sap-ux/mockserver-config-writer';
import { writeExternalServiceMetadata } from '@sap-ux/odata-service-writer';
import { getMockServerConfig } from '@sap-ux/project-access';
import { join } from 'path';
import { ODataDownloadGenerator } from '../src/data-download/odata-download-generator';
import { getODataDownloaderPrompts, promptNames } from '../src/data-download/prompts/prompts';
import { getValueHelpSelectionPrompt } from '../src/data-download/prompts/value-help-prompts';
import { createEntitySetData } from '../src/data-download/utils';

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    DefaultLogger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    },
    getHostEnvironment: jest.fn(),
    hostEnvironment: {
        cli: 'CLI',
        vscode: 'vscode'
    },
    LogWrapper: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        getLogLevel: jest.fn().mockReturnValue('info')
    }))
}));

jest.mock('@sap-ux/odata-service-writer', () => ({
    writeExternalServiceMetadata: jest.fn()
}));

jest.mock('@sap-ux/mockserver-config-writer', () => ({
    generateMockserverConfig: jest.fn()
}));

jest.mock('@sap-ux/project-access', () => ({
    DirName: {
        Webapp: 'webapp',
        LocalService: 'localService',
        Mockdata: 'mockdata'
    },
    getMockServerConfig: jest.fn()
}));

jest.mock('../src/data-download/prompts/prompts');
jest.mock('../src/data-download/prompts/value-help-prompts');
jest.mock('../src/data-download/utils');

// Mock yeoman-generator
const mockPrompt = jest.fn();
const mockWriteDestinationJSON = jest.fn();
const mockWriteDestination = jest.fn();
const mockDestinationRoot = jest.fn();
const mockLog = jest.fn();
const mockFs = { write: jest.fn() };

jest.mock('yeoman-generator', () => {
    return class MockGenerator {
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
});

jest.mock('../src/utils/i18n', () => ({
    initI18nODataDownloadGenerator: jest.fn().mockResolvedValue(undefined),
    t: jest.fn((key: string) => key)
}));

describe('ODataDownloadGenerator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
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

            expect(LogWrapper).toHaveBeenCalledWith(
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

            expect(LogWrapper).toHaveBeenCalledWith(
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

            (createEntitySetData as jest.Mock).mockReturnValue(mockEntityFileData);

            // Set up generator state via prompting
            (getODataDownloaderPrompts as jest.Mock).mockResolvedValue({
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

            (getValueHelpSelectionPrompt as jest.Mock).mockReturnValue({
                questions: [],
                valueHelpData: undefined
            });

            (getMockServerConfig as jest.Mock).mockResolvedValue(null);
            mockPrompt.mockResolvedValue({});

            await generator.prompting();
            await generator.writing();

            expect(mockDestinationRoot).toHaveBeenCalledWith(join('/test/app'));
            expect(createEntitySetData).toHaveBeenCalledWith([{ TravelID: '1' }], { Travel: 'Travel' }, 'Travel');
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
            (createEntitySetData as jest.Mock).mockReturnValue(mockEntityFileData);

            (getODataDownloaderPrompts as jest.Mock).mockResolvedValue({
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

            (getValueHelpSelectionPrompt as jest.Mock).mockReturnValue({
                questions: [],
                valueHelpData: undefined
            });

            // Mock server config with custom mockdata path
            (getMockServerConfig as jest.Mock).mockResolvedValue({
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

            (createEntitySetData as jest.Mock).mockReturnValue({});

            (getODataDownloaderPrompts as jest.Mock).mockResolvedValue({
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
                        metadata: '<metadata/>'
                    }
                },
                questions: []
            });

            (getValueHelpSelectionPrompt as jest.Mock).mockReturnValue({
                questions: [],
                valueHelpData: mockValueHelpData
            });

            (getMockServerConfig as jest.Mock).mockResolvedValue(null);
            mockPrompt.mockResolvedValue({});

            await generator.prompting();
            await generator.writing();

            expect(writeExternalServiceMetadata).toHaveBeenCalledWith(
                mockFs,
                join('/test/app', 'webapp'),
                mockValueHelpData,
                'mainService',
                '/sap/opu/odata4/sap/travel'
            );
        });

        it('should write resolveExternalServiceReferences to ui5-mock.yaml when value help data and mock config exist', async () => {
            const mockValueHelpData = [{ path: '/sap/opu/odata4/sap/valuehelp', entities: [] }];

            (createEntitySetData as jest.Mock).mockReturnValue({});

            (getODataDownloaderPrompts as jest.Mock).mockResolvedValue({
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
                        metadata: '<metadata/>'
                    }
                },
                questions: []
            });

            (getValueHelpSelectionPrompt as jest.Mock).mockReturnValue({
                questions: [],
                valueHelpData: mockValueHelpData
            });

            (getMockServerConfig as jest.Mock).mockResolvedValue({
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

            expect(generateMockserverConfig).toHaveBeenCalledWith(
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
            (createEntitySetData as jest.Mock).mockReturnValue({});

            (getODataDownloaderPrompts as jest.Mock).mockResolvedValue({
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

            (getValueHelpSelectionPrompt as jest.Mock).mockReturnValue({
                questions: [],
                valueHelpData: undefined
            });

            (getMockServerConfig as jest.Mock).mockResolvedValue(null);
            mockPrompt.mockResolvedValue({
                [promptNames.updateMainServiceMetadata]: true
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

            (getODataDownloaderPrompts as jest.Mock).mockRejectedValue(testError);
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);

            await expect(generator.prompting()).rejects.toThrow();
        });

        it('should show error in appWizard when not in CLI mode', async () => {
            const mockShowError = jest.fn();
            const generator = new ODataDownloadGenerator([], {});
            // Access private appWizard via any cast
            (generator as any).appWizard = { showError: mockShowError };

            const testError = 'Prompting failed';
            (getODataDownloaderPrompts as jest.Mock).mockRejectedValue(testError);
            (getHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.vscode);

            await expect(generator.prompting()).rejects.toThrow(testError);
            expect(mockShowError).toHaveBeenCalledWith(testError, MessageType.notification);
        });
    });

    describe('mock server config path matching', () => {
        it('should match service paths ignoring leading/trailing slashes', async () => {
            const generator = new ODataDownloadGenerator([], {});

            (createEntitySetData as jest.Mock).mockReturnValue({ Travel: [] });

            (getODataDownloaderPrompts as jest.Mock).mockResolvedValue({
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

            (getValueHelpSelectionPrompt as jest.Mock).mockReturnValue({
                questions: [],
                valueHelpData: undefined
            });

            // Mock config has path without trailing slash
            (getMockServerConfig as jest.Mock).mockResolvedValue({
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
