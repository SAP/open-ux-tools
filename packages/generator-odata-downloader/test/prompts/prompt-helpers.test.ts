import { jest } from '@jest/globals';
import { ConsoleTransport, LogLevel, ToolsLogger } from '@sap-ux/logger';
import type { Specification } from '@sap/ux-specification/dist/types/src';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initI18nODataDownloadGenerator } from '../../src/utils/i18n';
import type { AppConfig, Entity, ReferencedEntities } from '../../src/data-download/types';
import type { OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';
import type { EntityType } from '@sap-ux/vocabularies-types';
import { PromptState } from '../../src/data-download/prompt-state';
import type { ApplicationAccess, ServiceSpecification } from '@sap-ux/project-access';

// Mock the sub-module exports via jest.unstable_mockModule to avoid read-only ESM property issues
const mockExecNpmCommand = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockWriteFile = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockReadJSON = jest.fn<(...args: unknown[]) => Promise<unknown>>();

// Mock for odata-query (jest.spyOn doesn't work on ESM namespace objects)
const mockFetchData = jest.fn();
jest.unstable_mockModule('../../src/data-download/odata-query', () => ({
    fetchData: mockFetchData,
    getExpands: jest.fn(),
    createQueryFromEntities: jest.fn()
}));

// Mock for utils.getSystemNameFromStore (jest.spyOn doesn't work on ESM namespace objects)
const mockGetSystemNameFromStore = jest.fn();
const mockGetEntityModel = jest.fn();
jest.unstable_mockModule('../../src/data-download/utils', () => ({
    getEntityModel: mockGetEntityModel,
    getSystemNameFromStore: mockGetSystemNameFromStore,
    createEntitySetData: jest.fn()
}));

// Mock @sap-ux/project-access to provide controllable getSpecificationModuleFromCache for getSpecification tests
const mockGetSpecificationModuleFromCache = jest.fn();
const mockCreateApplicationAccess = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    createApplicationAccess: mockCreateApplicationAccess,
    FileName: {
        AdaptationConfig: 'config.json', CapJavaApplicationYaml: 'application.yaml',
        ExtConfigJson: '.extconfig.json', IndexCds: 'index.cds', Library: '.library',
        Manifest: 'manifest.json', ManifestAppDescrVar: 'manifest.appdescr_variant',
        MtaYaml: 'mta.yaml', Package: 'package.json', Pom: 'pom.xml',
        SpecificationDistTags: 'specification-dist-tags.json', ServiceCds: 'services.cds',
        Tsconfig: 'tsconfig.json', Ui5Yaml: 'ui5.yaml', Ui5LocalYaml: 'ui5-local.yaml',
        Ui5MockYaml: 'ui5-mock.yaml', UI5DeployYaml: 'ui5-deploy.yaml',
        PackageLock: 'package-lock.json', XSAppJson: 'xs-app.json',
        XSSecurityJson: 'xs-security.json', DotGitIgnore: '.gitignore',
        MtaExtYaml: 'mta-ext.mtaext'
    },
    getSpecificationModuleFromCache: mockGetSpecificationModuleFromCache,
    DirName: { Webapp: 'webapp', LocalService: 'localService', Mockdata: 'mockdata' },
    getMockServerConfig: jest.fn(),
    FioriToolsSettings: {},
    MinCdsPluginUi5Version: '0.0.0',
    MinCdsVersion: '0.0.0',
    fioriToolsDirectory: '.fioritools',
    getFilePaths: jest.fn(),
    normalizePath: jest.fn(),
    addPackageDevDependency: jest.fn(),
    clearCdsModuleCache: jest.fn(),
    createProjectAccess: jest.fn(),
    deleteCapApp: jest.fn(),
    filterDataSourcesByType: jest.fn(),
    findAllApps: jest.fn(),
    findCapProjectRoot: jest.fn(),
    findCapProjects: jest.fn(),
    findFioriArtifacts: jest.fn(),
    findProjectRoot: jest.fn(),
    findRootsForPath: jest.fn(),
    getAllUi5YamlFileNames: jest.fn(),
    getAppRootFromWebappPath: jest.fn(),
    getAppProgrammingLanguage: jest.fn(),
    getAppType: jest.fn(),
    getCapCustomPaths: jest.fn(),
    getCapEnvironment: jest.fn(),
    getCapModelAndServices: jest.fn(),
    getCapServiceName: jest.fn(),
    getCapProjectType: jest.fn(),
    getCdsFiles: jest.fn(),
    getCdsRoots: jest.fn(),
    getCdsServices: jest.fn(),
    getCapI18nFolderNames: jest.fn(),
    getSpecification: jest.fn(),
    getSpecificationPath: jest.fn(),
    getI18nPropertiesPaths: jest.fn(),
    getI18nBundles: jest.fn(),
    getMinUI5VersionFromManifest: jest.fn(),
    getMinUI5VersionAsArray: jest.fn(),
    getMinimumUI5Version: jest.fn(),
    getMtaPath: jest.fn(),
    getMockDataPath: jest.fn(),
    getNodeModulesPath: jest.fn(),
    getPathMappings: jest.fn(),
    getProject: jest.fn(),
    getProjectType: jest.fn(),
    getWebappPath: jest.fn(),
    hasUI5CliV3: jest.fn(),
    isCapProject: jest.fn(),
    isCapJavaProject: jest.fn(),
    isCapNodeJsProject: jest.fn(),
    loadModuleFromProject: jest.fn(),
    readCapServiceMetadataEdmx: jest.fn(),
    readUi5Yaml: jest.fn(),
    refreshSpecificationDistTags: jest.fn(),
    toReferenceUri: jest.fn(),
    updatePackageScript: jest.fn(),
    getWorkspaceInfo: jest.fn(),
    hasMinCdsVersion: jest.fn(),
    checkCdsUi5PluginEnabled: jest.fn(),
    readFlexChanges: jest.fn(),
    processServices: jest.fn(),
    getMainService: jest.fn(),
    getGlobalCdsHomePath: jest.fn(),
    execNpmCommand: jest.fn(),
    findRecursiveHierarchyKey: jest.fn(),
    getTableCapabilitiesByEntitySet: jest.fn(),
    hasDependency: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/project-access/dist/command', () => ({
    execNpmCommand: mockExecNpmCommand
}));

jest.unstable_mockModule('@sap-ux/project-access/dist/file', () => ({
    deleteDirectory: jest.fn(),
    deleteFile: jest.fn(),
    fileExists: jest.fn(),
    readDirectory: jest.fn(),
    readFile: jest.fn(),
    readJSON: mockReadJSON,
    updatePackageJSON: jest.fn(),
    updateManifestJSON: jest.fn(),
    writeFile: mockWriteFile,
    findBy: jest.fn(),
    findFiles: jest.fn(),
    findFilesByExtension: jest.fn(),
    findFileUp: jest.fn(),
    getFilePaths: jest.fn()
}));

jest.unstable_mockModule('../../src/telemetry', () => ({
    TelemetryHelper: {
        initTelemetrySettings: jest.fn().mockResolvedValue(undefined),
        sendTelemetry: jest.fn().mockResolvedValue(undefined)
    }
}));

const {
    createEntityChoices,
    getData,
    getServiceDetails,
    getSpecification
} = await import('../../src/data-download/prompts/prompt-helpers');

// Import FileName from the mocked module (contains the real constant values we defined in the mock)
const { FileName, createApplicationAccess, getSpecificationModuleFromCache } = await import(
    '@sap-ux/project-access'
);
const { getEntityModel } = await import('../../src/data-download/utils');

const __testdir = dirname(fileURLToPath(import.meta.url));

// UIAnnotationTypes enum values
const UIAnnotationTypes = {
    ReferenceFacet: 'com.sap.vocabularies.UI.v1.ReferenceFacet',
    CollectionFacet: 'com.sap.vocabularies.UI.v1.CollectionFacet'
} as const;

describe('Test createEntityChoices', () => {
    beforeEach(() => {
        // Test isolation, this is a static cache
        PromptState.resetServiceCaches();
    });

    test('should return undefined when rootEntity has no navPropEntities', () => {
        const rootEntity: Entity = {
            entitySetName: 'Travel',
            entityPath: 'Travel',
            entityType: {
                name: 'TravelType'
            } as EntityType,
            navPropEntities: undefined
        };

        const result = createEntityChoices(rootEntity);
        expect(result).toBeUndefined();
    });

    test('should return empty choices when rootEntity has empty navPropEntities', () => {
        const rootEntity: Entity = {
            entitySetName: 'Travel',
            entityPath: 'Travel',
            entityType: {
                name: 'TravelType'
            } as EntityType,
            navPropEntities: []
        };

        const result = createEntityChoices(rootEntity);
        expect(result).toBeDefined();
        expect(result!.choices).toHaveLength(0);
        expect(result!.entitySetsFlat).toEqual({});
    });

    test('should create choices with default selection from ReferenceFacet annotations', () => {
        // Mock entity type with UI.Facets containing ReferenceFacet
        const mockEntityType = {
            name: 'TravelType',
            annotations: {
                UI: {
                    Facets: [
                        {
                            $Type: UIAnnotationTypes.ReferenceFacet,
                            Target: {
                                type: 'AnnotationPath',
                                value: '_Booking/@UI.LineItem'
                            }
                        }
                    ]
                }
            }
        } as unknown as EntityType;

        const rootEntity: Entity = {
            entitySetName: 'Travel',
            entityPath: 'Travel',
            entityType: mockEntityType,
            navPropEntities: [
                {
                    entitySetName: 'Booking',
                    entityPath: '_Booking',
                    entityType: {
                        name: 'BookingType'
                    } as EntityType,
                    navPropEntities: []
                },
                {
                    entitySetName: 'Agency',
                    entityPath: '_Agency',
                    entityType: {
                        name: 'TravelAgencyType'
                    } as EntityType,
                    navPropEntities: []
                }
            ]
        };

        const result = createEntityChoices(rootEntity);

        expect(result).toBeDefined();
        expect(result!.choices).toHaveLength(2);

        // _Booking should be default selected due to ReferenceFacet annotation
        const bookingChoice = result!.choices.find((c) => c.name === '_Booking');
        expect(bookingChoice?.checked).toBe(true);
        expect(bookingChoice?.value).toEqual({
            fullPath: '_Booking',
            entity: {
                entityPath: '_Booking',
                entitySetName: 'Booking',
                defaultSelected: true
            }
        });

        // _Agency should not be default selected (checked is undefined or falsy)
        const agencyChoice = result!.choices.find((c) => c.name === '_Agency');
        expect(agencyChoice?.checked).toBeFalsy();
    });

    test('should create choices with default selection from nested CollectionFacet annotations', () => {
        // Mock entity type with nested CollectionFacet containing ReferenceFacet
        const mockEntityType = {
            name: 'TravelType',
            annotations: {
                UI: {
                    Facets: [
                        {
                            $Type: UIAnnotationTypes.CollectionFacet,
                            Facets: [
                                {
                                    $Type: UIAnnotationTypes.ReferenceFacet,
                                    Target: {
                                        type: 'AnnotationPath',
                                        value: '_Booking/@UI.LineItem'
                                    }
                                },
                                {
                                    $Type: UIAnnotationTypes.CollectionFacet,
                                    Facets: [
                                        {
                                            $Type: UIAnnotationTypes.ReferenceFacet,
                                            Target: {
                                                type: 'AnnotationPath',
                                                value: '_Customer/@UI.FieldGroup'
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        } as EntityType;

        const rootEntity: Entity = {
            entitySetName: 'Travel',
            entityPath: 'Travel',
            entityType: mockEntityType,
            navPropEntities: [
                {
                    entitySetName: 'Booking',
                    entityPath: '_Booking',
                    entityType: { name: 'BookingType' } as EntityType,
                    navPropEntities: []
                },
                {
                    entitySetName: 'Passenger',
                    entityPath: '_Customer',
                    entityType: { name: 'PassengerType' } as EntityType,
                    navPropEntities: []
                },
                {
                    entitySetName: 'Agency',
                    entityPath: '_Agency',
                    entityType: { name: 'TravelAgencyType' } as EntityType,
                    navPropEntities: []
                }
            ]
        };

        const result = createEntityChoices(rootEntity);

        expect(result).toBeDefined();
        expect(result!.choices).toHaveLength(3);

        // Both _Booking and _Customer should be default selected due to nested facets
        expect(result!.choices.find((c) => c.name === '_Booking')?.checked).toBe(true);
        expect(result!.choices.find((c) => c.name === '_Customer')?.checked).toBe(true);
        expect(result!.choices.find((c) => c.name === '_Agency')?.checked).toBe(false);
    });

    test('should create choices with default selection from pageObjectEntities', () => {
        const rootEntity: Entity = {
            entitySetName: 'Travel',
            entityPath: 'Travel',
            entityType: {
                name: 'TravelType'
            } as EntityType,
            navPropEntities: [
                {
                    entitySetName: 'Booking',
                    entityPath: '_Booking',
                    entityType: { name: 'BookingType' } as EntityType,
                    navPropEntities: []
                }
            ]
        };

        const pageObjectEntities: Entity[] = [
            {
                entitySetName: 'Booking',
                entityPath: '_Booking',
                entityType: { name: 'BookingType' } as EntityType,
                page: {
                    contextPath: '/Travel/_Booking'
                } as unknown as Entity['page']
            }
        ];

        const result = createEntityChoices(rootEntity, pageObjectEntities);

        expect(result).toBeDefined();
        const bookingChoice = result!.choices.find((c) => c.name === '_Booking');
        expect(bookingChoice?.checked).toBe(true);
    });

    test('should create choices with default selection from pageObjectEntities using routePattern', () => {
        const rootEntity: Entity = {
            entitySetName: 'Travel',
            entityPath: 'Travel',
            entityType: {
                name: 'TravelType'
            } as EntityType,
            navPropEntities: [
                {
                    entitySetName: 'Booking',
                    entityPath: '_Booking',
                    entityType: {
                        name: 'BookingType'
                    } as EntityType,
                    navPropEntities: []
                }
            ]
        };

        const pageObjectEntities: Entity[] = [
            {
                entitySetName: 'Booking',
                entityPath: '_Booking',
                entityType: {
                    name: 'BookingType'
                } as EntityType,
                page: {
                    routePattern: '/Travel({key})/_Booking({key2}):?query:'
                } as unknown as Entity['page']
            }
        ];

        const result = createEntityChoices(rootEntity, pageObjectEntities);

        expect(result).toBeDefined();
        const bookingChoice = result!.choices.find((c) => c.name === '_Booking');
        expect(bookingChoice?.checked).toBe(true);
    });

    test('should handle nested navPropEntities recursively', () => {
        const rootEntity: Entity = {
            entitySetName: 'Travel',
            entityPath: 'Travel',
            entityType: {
                name: 'TravelType'
            } as EntityType,
            navPropEntities: [
                {
                    entitySetName: 'Booking',
                    entityPath: '_Booking',
                    entityType: {
                        name: 'BookingType'
                    } as EntityType,
                    navPropEntities: [
                        {
                            entitySetName: 'BookingSupplement',
                            entityPath: '_BookSupplement',
                            entityType: {
                                name: 'BookingSupplementType'
                            } as EntityType,
                            navPropEntities: []
                        },
                        {
                            entitySetName: 'Airline',
                            entityPath: '_Carrier',
                            entityType: {
                                name: 'AirlineType'
                            } as EntityType,
                            navPropEntities: []
                        }
                    ]
                }
            ]
        };

        const result = createEntityChoices(rootEntity);

        expect(result).toBeDefined();
        expect(result!.choices).toHaveLength(3);

        // Verify full paths are constructed correctly
        expect(result!.choices.map((c) => c.name).sort()).toEqual([
            '_Booking',
            '_Booking/_BookSupplement',
            '_Booking/_Carrier'
        ]);

        // Verify entitySetsFlat contains all entity sets
        expect(result!.entitySetsFlat).toEqual({
            _Booking: 'Booking',
            _BookSupplement: 'BookingSupplement',
            _Carrier: 'Airline'
        });
    });

    test('should sort choices alphabetically by name', () => {
        const rootEntity: Entity = {
            entitySetName: 'Travel',
            entityPath: 'Travel',
            entityType: {
                name: 'TravelType'
            } as EntityType,
            navPropEntities: [
                {
                    entitySetName: 'Passenger',
                    entityPath: '_Customer',
                    entityType: { name: 'PassengerType' } as EntityType,
                    navPropEntities: []
                },
                {
                    entitySetName: 'TravelAgency',
                    entityPath: '_Agency',
                    entityType: { name: 'TravelAgencyType' } as EntityType,
                    navPropEntities: []
                },
                {
                    entitySetName: 'Booking',
                    entityPath: '_Booking',
                    entityType: { name: 'BookingType' } as EntityType,
                    navPropEntities: []
                }
            ]
        };

        const result = createEntityChoices(rootEntity);

        expect(result).toBeDefined();
        expect(result!.choices.map((c) => c.name)).toEqual(['_Agency', '_Booking', '_Customer']);
    });

    test('should handle ReferenceFacet without path separator (no default selection)', () => {
        const mockEntityType = {
            name: 'TravelType',
            annotations: {
                UI: {
                    Facets: [
                        {
                            $Type: UIAnnotationTypes.ReferenceFacet,
                            Target: {
                                type: 'AnnotationPath',
                                value: '@UI.LineItem' // No path separator, should not select any nav entity
                            }
                        }
                    ]
                }
            }
        } as unknown as EntityType;

        const rootEntity: Entity = {
            entitySetName: 'Travel',
            entityPath: 'Travel',
            entityType: mockEntityType,
            navPropEntities: [
                {
                    entitySetName: 'Booking',
                    entityPath: '_Booking',
                    entityType: { name: 'BookingType' } as EntityType,
                    navPropEntities: []
                }
            ]
        };

        const result = createEntityChoices(rootEntity);

        expect(result).toBeDefined();
        expect(result!.choices.find((c) => c.name === '_Booking')?.checked).toBe(false);
    });

    // Skipped: This integration test requires real implementations of createApplicationAccess,
    // getSpecificationModuleFromCache, and getEntityModel. In ESM mode, jest.unstable_mockModule
    // intercepts all imports of the mocked modules, and jest.importActual is not available in
    // Jest 30. The other unit tests in this file need module-level mocks for @sap-ux/project-access
    // and ../../src/data-download/utils, which conflicts with this test's need for real functions.
    it.skip('should create entity set choices based on app model (from specification)', async () => {
        // Prevent spec from fetching versions and writing on test jobs
        mockExecNpmCommand.mockResolvedValueOnce('{"latest": "1.142.1"}');
        mockWriteFile.mockResolvedValueOnce();

        mockReadJSON.mockImplementation(async (path) => {
            if ((path as string).endsWith(FileName.SpecificationDistTags)) {
                return {
                    latest: '1.142.1'
                };
            }
            return JSON.parse(await readFile(path as string, 'utf8'));
        });
        // Load the test app
        const appPath = join(__testdir, '../test-data/test-apps/travel');

        const appAccess = await createApplicationAccess(appPath);

        // Usually loaded from backend, use local copy for testing
        const metadata = await readFile(join(appPath, '/webapp/localService/mainService/metadata.xml'), 'utf8');

        const logger = new ToolsLogger({ logLevel: LogLevel.Debug, transports: [new ConsoleTransport()] });
        // Use non-mocked spec to ensure integration
        const specResult = await getSpecificationModuleFromCache(appAccess.app.appRoot, { logger });

        if (typeof specResult === 'string') {
            throw new Error(specResult);
        }
        // Load the full entity model
        const entityModel = await getEntityModel(appAccess, specResult as Specification, metadata);
        expect(entityModel).not.toBe(String);
        expect(entityModel).not.toBe(undefined);

        const entityChoices = createEntityChoices(
            (entityModel! as ReferencedEntities).listEntity,
            (entityModel! as ReferencedEntities)?.pageObjectEntities
        );
        expect(entityChoices).toMatchSnapshot();
    }, 900000); // Very long spec load time on Windows
});

describe('Test getData', () => {
    beforeAll(async () => {
        await initI18nODataDownloadGenerator();
    });

    const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    };

    const mockServiceProvider = {
        log: undefined as unknown,
        service: jest.fn()
    };

    const mockODataService = {
        get: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockServiceProvider.service.mockReturnValue(mockODataService);
    });

    test('should return error message when metadata is missing', async () => {
        const result = await getData({ metadata: undefined }, { appAccess: {} } as any, []);
        expect(result).toBe('Data was not fetched');
    });

    test('should return error message when appAccess is missing', async () => {
        const result = await getData({ metadata: '<xml/>' }, { appAccess: undefined } as any, []);
        expect(result).toBe('Data was not fetched');
    });

    test('should return error message when connectedSystem is missing', async () => {
        const result = await getData({ metadata: '<xml/>', connectedSystem: undefined }, { appAccess: {} } as any, []);
        expect(result).toBe('Data was not fetched');
    });

    test('should return error message when servicePath is missing', async () => {
        const result = await getData(
            {
                metadata: '<xml/>',
                connectedSystem: {
                    serviceProvider: mockServiceProvider
                } as unknown as OdataServiceAnswers['connectedSystem']
            },
            { appAccess: {}, referencedEntities: {} } as unknown as AppConfig,
            []
        );
        expect(result).toBe('Data was not fetched');
    });

    test('should return odata query result on successful fetch', async () => {
        const mockEntityData = [{ id: 1, name: 'Test' }];
        mockFetchData.mockResolvedValueOnce({
            odataResult: { entityData: mockEntityData }
        });

        const result = await getData(
            {
                metadata: '<xml/>',
                connectedSystem: {
                    serviceProvider: mockServiceProvider
                } as unknown as OdataServiceAnswers['connectedSystem'],
                servicePath: '/sap/opu/odata/sap/TEST_SRV'
            },
            {
                appAccess: {},
                referencedEntities: { listEntity: { entitySetName: 'TestSet' } }
            } as unknown as AppConfig,
            [{ fullPath: 'Test', entity: { entitySetName: 'TestSet', entityPath: 'Test' } }]
        );
        expect(result).toEqual({ odataQueryResult: mockEntityData });
    });

    test('should return error string when fetchData returns error', async () => {
        mockFetchData.mockResolvedValueOnce({
            odataResult: { error: 'Connection failed' }
        });

        const result = await getData(
            {
                metadata: '<xml/>',
                connectedSystem: {
                    serviceProvider: mockServiceProvider
                } as unknown as OdataServiceAnswers['connectedSystem'],
                servicePath: '/sap/opu/odata/sap/TEST_SRV'
            },
            {
                appAccess: {},
                referencedEntities: { listEntity: { entitySetName: 'TestSet' } }
            } as unknown as AppConfig,
            []
        );
        expect(result).toBe('Connection failed');
    });
});

describe('Test getServiceDetails', () => {
    // Use test-apps/travel which has a real ui5.yaml file
    const testAppPath = join(__testdir, '../test-data/test-apps/travel');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return service path and URI from service specification', async () => {
        mockGetSystemNameFromStore.mockResolvedValue('MY_SYSTEM');

        const service: ServiceSpecification = {
            uri: '/sap/opu/odata4/sap/fe_draft_travel/srvd/sap/travel_processor/0001/',
            local: '/localService/mainService/metadata.xml'
        };

        const result = await getServiceDetails(testAppPath, service);

        expect(result.servicePath).toBe('/sap/opu/odata4/sap/fe_draft_travel/srvd/sap/travel_processor/0001/');
        expect(result.systemName).toBeDefined();
    });

    test('should return undefined system name when getSystemNameFromStore returns undefined', async () => {
        mockGetSystemNameFromStore.mockResolvedValue(undefined);

        const service: ServiceSpecification = {
            uri: '/sap/opu/odata4/sap/fe_draft_travel/srvd/sap/travel_processor/0001/',
            local: '/localService/mainService/metadata.xml'
        };

        const result = await getServiceDetails(testAppPath, service);

        expect(result.servicePath).toBe('/sap/opu/odata4/sap/fe_draft_travel/srvd/sap/travel_processor/0001/');
    });
});

describe('Test getSpecification', () => {
    beforeAll(async () => {
        await initI18nODataDownloadGenerator();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return specification when API version is 24 or higher', async () => {
        const mockSpecification = {
            getApiVersion: jest.fn().mockReturnValue({ version: '24' })
        };

        mockGetSpecificationModuleFromCache.mockResolvedValue(
            mockSpecification as unknown as Specification
        );

        const mockAppAccess = {
            app: {
                appRoot: '/test/app'
            }
        } as ApplicationAccess;

        const result = await getSpecification(mockAppAccess);

        expect(result).toBe(mockSpecification);
    });

    test('should return specification when API version is greater than 24', async () => {
        const mockSpecification = {
            getApiVersion: jest.fn().mockReturnValue({ version: '25' })
        };

        mockGetSpecificationModuleFromCache.mockResolvedValue(
            mockSpecification as unknown as Specification
        );

        const mockAppAccess = {
            app: {
                appRoot: '/test/app'
            }
        } as ApplicationAccess;

        const result = await getSpecification(mockAppAccess);

        expect(result).toBe(mockSpecification);
    });

    test('should return error message when API version is below 24', async () => {
        const mockSpecification = {
            getApiVersion: jest.fn().mockReturnValue({ version: '23' })
        };

        mockGetSpecificationModuleFromCache.mockResolvedValue(
            mockSpecification as unknown as Specification
        );

        const mockAppAccess = {
            app: {
                appRoot: '/test/app'
            }
        } as ApplicationAccess;

        const result = await getSpecification(mockAppAccess);

        expect(typeof result).toBe('string');
        expect(result).toContain('23');
    });

    test('should handle non-string API version (returns 0)', async () => {
        const mockSpecification = {
            getApiVersion: jest.fn().mockReturnValue({ version: undefined })
        };

        mockGetSpecificationModuleFromCache.mockResolvedValue(
            mockSpecification as unknown as Specification
        );

        const mockAppAccess = {
            app: {
                appRoot: '/test/app'
            }
        } as ApplicationAccess;

        const result = await getSpecification(mockAppAccess);

        // Version 0 is less than 24, should return error message
        expect(typeof result).toBe('string');
        expect(result).toContain('0');
    });

    test('should handle numeric string version correctly', async () => {
        const mockSpecification = {
            getApiVersion: jest.fn().mockReturnValue({ version: '100' })
        };

        mockGetSpecificationModuleFromCache.mockResolvedValue(
            mockSpecification as unknown as Specification
        );

        const mockAppAccess = {
            app: {
                appRoot: '/test/app'
            }
        } as ApplicationAccess;

        const result = await getSpecification(mockAppAccess);

        expect(result).toBe(mockSpecification);
    });
});
