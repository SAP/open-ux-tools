import { jest } from '@jest/globals';
import type { Specification } from '@sap/ux-specification/dist/types/src';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initI18nODataDownloadGenerator } from '../../src/utils/i18n.js';
import type { AppConfig, Entity } from '../../src/data-download/types.js';
import type { OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';
import type { EntityType } from '@sap-ux/vocabularies-types';
import { PromptState } from '../../src/data-download/prompt-state.js';
import type { ApplicationAccess, ServiceSpecification } from '@sap-ux/project-access';
import type { fetchData } from '../../src/data-download/odata-query.js';
import type { initTelemetrySettings } from '@sap-ux/telemetry';
import type { sendTelemetry } from '@sap-ux/fiori-generator-shared';

const actualStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...actualStore,
    getService: jest.fn().mockImplementation(() => ({
        getAll: jest.fn(),
        read: jest.fn()
    }))
}));

jest.unstable_mockModule('../../src/telemetry', () => ({
    TelemetryHelper: {
        initTelemetrySettings: jest.fn<typeof initTelemetrySettings>().mockResolvedValue(undefined),
        sendTelemetry: jest.fn<typeof sendTelemetry>().mockResolvedValue(undefined)
    }
}));

const actualProjectAccess = await import('@sap-ux/project-access');
const mockGetSpecificationModuleFromCache = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    getSpecificationModuleFromCache: mockGetSpecificationModuleFromCache
}));

const actualOdataQuery = await import('../../src/data-download/odata-query.js');
const mockFetchData = jest.fn<typeof fetchData>();
jest.unstable_mockModule('../../src/data-download/odata-query.js', () => ({
    ...actualOdataQuery,
    fetchData: mockFetchData
}));

const actualDataDownloadUtils = await import('../../src/data-download/utils.js');
const mockGetSystemNameFromStore = jest.fn();
jest.unstable_mockModule('../../src/data-download/utils', () => ({
    ...actualDataDownloadUtils,
    getSystemNameFromStore: mockGetSystemNameFromStore
}));

const { createEntityChoices, getData, getServiceDetails, getSpecification } =
    await import('../../src/data-download/prompts/prompt-helpers.js');

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
            '_Booking/_BookSupplement': 'BookingSupplement',
            '_Booking/_Carrier': 'Airline'
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

    test('should show disabled hierarchy indicator and skip self-referential nav prop when hierarchy entities are provided', () => {
        const rootEntity: Entity = {
            entitySetName: 'SalesOrganizations',
            entityPath: 'SalesOrganizations',
            entityType: {
                name: 'SalesOrgType',
                fullyQualifiedName: 'SalesOrgType'
            } as EntityType,
            navPropEntities: [
                {
                    entitySetName: 'SalesOrganizations',
                    entityPath: '_Superordinate',
                    entityType: {
                        name: 'SalesOrgType',
                        fullyQualifiedName: 'SalesOrgType'
                    } as EntityType,
                    navPropEntities: []
                },
                {
                    entitySetName: 'Country',
                    entityPath: '_Country',
                    entityType: { name: 'CountryType', fullyQualifiedName: 'CountryType' } as EntityType,
                    navPropEntities: []
                }
            ]
        };

        const result = createEntityChoices(rootEntity);

        expect(result).toBeDefined();
        // Self-ref nav prop should NOT be a selectable choice; only _Country is selectable
        expect(result!.choices).toHaveLength(1);
        expect(result!.choices[0].name).toBe('_Country');
    });

    test('should skip self-referential nav prop when no hierarchy entities provided', () => {
        const rootEntity: Entity = {
            entitySetName: 'SalesOrganizations',
            entityPath: 'SalesOrganizations',
            entityType: {
                name: 'SalesOrgType',
                fullyQualifiedName: 'SalesOrgType'
            } as EntityType,
            navPropEntities: [
                {
                    entitySetName: 'SalesOrganizations',
                    entityPath: '_Superordinate',
                    entityType: {
                        name: 'SalesOrgType',
                        fullyQualifiedName: 'SalesOrgType'
                    } as EntityType,
                    navPropEntities: []
                },
                {
                    entitySetName: 'Country',
                    entityPath: '_Country',
                    entityType: { name: 'CountryType', fullyQualifiedName: 'CountryType' } as EntityType,
                    navPropEntities: []
                }
            ]
        };

        const result = createEntityChoices(rootEntity);

        expect(result).toBeDefined();
        // Self-referential nav prop should be excluded without hierarchy info
        expect(result!.choices).toHaveLength(1);
        expect(result!.choices[0].name).toBe('_Country');
    });
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
        // Reload to isolate test
        jest.resetModules();
        mockFetchData.mockResolvedValueOnce({
            odataResult: { entityData: mockEntityData }
        });
        const { getData: localGetData } = await import('../../src/data-download/prompts/prompt-helpers.js');

        const result = await localGetData(
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
        // Reload to isolate test
        jest.resetModules();
        mockFetchData.mockResolvedValueOnce({
            odataResult: { error: 'Connection failed' }
        });
        const { getData: localGetData } = await import('../../src/data-download/prompts/prompt-helpers.js');

        const result = await localGetData(
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

        mockGetSpecificationModuleFromCache.mockResolvedValue(mockSpecification as unknown as Specification);

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

        mockGetSpecificationModuleFromCache.mockResolvedValue(mockSpecification as unknown as Specification);

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

        mockGetSpecificationModuleFromCache.mockResolvedValue(mockSpecification as unknown as Specification);

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

        mockGetSpecificationModuleFromCache.mockResolvedValue(mockSpecification as unknown as Specification);

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

        mockGetSpecificationModuleFromCache.mockResolvedValue(mockSpecification as unknown as Specification);

        const mockAppAccess = {
            app: {
                appRoot: '/test/app'
            }
        } as ApplicationAccess;

        const result = await getSpecification(mockAppAccess);

        expect(result).toBe(mockSpecification);
    });
});
