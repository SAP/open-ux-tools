import { ConsoleTransport, LogLevel, ToolsLogger } from '@sap-ux/logger';
import { createApplicationAccess, FileName, getSpecificationModuleFromCache } from '@sap-ux/project-access';
import * as commandMock from '@sap-ux/project-access/dist/command';
import * as fileMock from '@sap-ux/project-access/dist/file';
import type { Specification } from '@sap/ux-specification/dist/types/src';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createEntityChoices, getData } from '../../src/data-download/prompts/prompt-helpers';
import { getEntityModel } from '../../src/data-download/utils';
import { promptNames } from '../../src/data-download/prompts/prompts';
import * as odataQueryModule from '../../src/data-download/odata-query';
import { initI18nODataDownloadGenerator } from '../../src/utils/i18n';
import type { Entity } from '../../src/data-download/types';
import type { EntityType } from '@sap-ux/vocabularies-types';

const readJSONOriginal = fileMock.readJSON;

// UIAnnotationTypes enum values
const UIAnnotationTypes = {
    ReferenceFacet: 'com.sap.vocabularies.UI.v1.ReferenceFacet',
    CollectionFacet: 'com.sap.vocabularies.UI.v1.CollectionFacet'
} as const;

describe('Test createEntityChoices', () => {
    test('should return undefined when rootEntity has no navPropEntities', () => {
        const rootEntity: Entity = {
            entitySetName: 'Travel',
            entityPath: 'Travel',
            entityType: undefined,
            navPropEntities: undefined
        };

        const result = createEntityChoices(rootEntity);
        expect(result).toBeUndefined();
    });

    test('should return empty choices when rootEntity has empty navPropEntities', () => {
        const rootEntity: Entity = {
            entitySetName: 'Travel',
            entityPath: 'Travel',
            entityType: undefined,
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
                    entityType: undefined,
                    navPropEntities: []
                },
                {
                    entitySetName: 'Agency',
                    entityPath: '_Agency',
                    entityType: undefined,
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
        } as unknown as EntityType;

        const rootEntity: Entity = {
            entitySetName: 'Travel',
            entityPath: 'Travel',
            entityType: mockEntityType,
            navPropEntities: [
                {
                    entitySetName: 'Booking',
                    entityPath: '_Booking',
                    entityType: undefined,
                    navPropEntities: []
                },
                {
                    entitySetName: 'Passenger',
                    entityPath: '_Customer',
                    entityType: undefined,
                    navPropEntities: []
                },
                {
                    entitySetName: 'Agency',
                    entityPath: '_Agency',
                    entityType: undefined,
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
            entityType: undefined,
            navPropEntities: [
                {
                    entitySetName: 'Booking',
                    entityPath: '_Booking',
                    entityType: undefined,
                    navPropEntities: []
                }
            ]
        };

        const pageObjectEntities: Entity[] = [
            {
                entitySetName: 'Booking',
                entityPath: '_Booking',
                entityType: undefined,
                page: {
                    contextPath: '/Travel/_Booking'
                } as any
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
            entityType: undefined,
            navPropEntities: [
                {
                    entitySetName: 'Booking',
                    entityPath: '_Booking',
                    entityType: undefined,
                    navPropEntities: []
                }
            ]
        };

        const pageObjectEntities: Entity[] = [
            {
                entitySetName: 'Booking',
                entityPath: '_Booking',
                entityType: undefined,
                page: {
                    routePattern: '/Travel({key})/_Booking({key2}):?query:'
                } as any
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
            entityType: undefined,
            navPropEntities: [
                {
                    entitySetName: 'Booking',
                    entityPath: '_Booking',
                    entityType: undefined,
                    navPropEntities: [
                        {
                            entitySetName: 'BookingSupplement',
                            entityPath: '_BookSupplement',
                            entityType: undefined,
                            navPropEntities: []
                        },
                        {
                            entitySetName: 'Airline',
                            entityPath: '_Carrier',
                            entityType: undefined,
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
            entityType: undefined,
            navPropEntities: [
                {
                    entitySetName: 'Passenger',
                    entityPath: '_Customer',
                    entityType: undefined,
                    navPropEntities: []
                },
                {
                    entitySetName: 'TravelAgency',
                    entityPath: '_Agency',
                    entityType: undefined,
                    navPropEntities: []
                },
                {
                    entitySetName: 'Booking',
                    entityPath: '_Booking',
                    entityType: undefined,
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
                    entityType: undefined,
                    navPropEntities: []
                }
            ]
        };

        const result = createEntityChoices(rootEntity);

        expect(result).toBeDefined();
        expect(result!.choices.find((c) => c.name === '_Booking')?.checked).toBe(false);
    });

    it('should create entity set choices based on app model (from specification)', async () => {
        // Prevent spec from fetching versions and writing on test jobs
        jest.spyOn(commandMock, 'execNpmCommand').mockResolvedValueOnce('{"latest": "1.142.1"}');
        jest.spyOn(fileMock, 'writeFile').mockResolvedValueOnce();

        jest.spyOn(fileMock, 'readJSON').mockImplementation(async (path) => {
            if (path.endsWith(FileName.SpecificationDistTags)) {
                return {
                    latest: '1.142.1'
                };
            }
            return await readJSONOriginal(path);
        });
        // Load the test app
        const appPath = join(__dirname, '../test-data/test-apps/travel');

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
        if (!entityModel) {
            throw new Error('Expected entity model is undefined');
        }

        const entityChoices = createEntityChoices(entityModel.listEntity, entityModel?.pageObjectEntities);
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
        // Mock the static logger on ODataDownloadGenerator
        jest.doMock('../../src/data-download/odata-download-generator', () => ({
            ODataDownloadGenerator: {
                logger: mockLogger
            }
        }));
    });

    test('should return error message when metadata is missing', async () => {
        const result = await getData({ metadata: undefined }, { appAccess: {} } as any, {});
        expect(result).toBe('Data was not fetched');
    });

    test('should return error message when appAccess is missing', async () => {
        const result = await getData({ metadata: '<xml/>' }, { appAccess: undefined } as any, {});
        expect(result).toBe('Data was not fetched');
    });

    test('should return error message when connectedSystem is missing', async () => {
        const result = await getData({ metadata: '<xml/>', connectedSystem: undefined }, { appAccess: {} } as any, {});
        expect(result).toBe('Data was not fetched');
    });

    test('should return error message when servicePath is missing', async () => {
        const result = await getData(
            {
                metadata: '<xml/>',
                connectedSystem: { serviceProvider: mockServiceProvider } as any
            },
            { appAccess: {}, referencedEntities: {} } as any,
            {}
        );
        expect(result).toBe('Data was not fetched');
    });

    test('should return error message when confirmDownload is false', async () => {
        const result = await getData(
            {
                metadata: '<xml/>',
                connectedSystem: { serviceProvider: mockServiceProvider } as any,
                servicePath: '/sap/opu/odata/sap/TEST_SRV'
            },
            { appAccess: {}, referencedEntities: {} } as any,
            { [promptNames.confirmDownload]: false }
        );
        expect(result).toBe('Data was not fetched');
    });

    test('should return odata query result on successful fetch', async () => {
        const mockEntityData = [{ id: 1, name: 'Test' }];
        jest.spyOn(odataQueryModule, 'fetchData').mockResolvedValueOnce({
            odataResult: { entityData: mockEntityData }
        } as any);

        const result = await getData(
            {
                metadata: '<xml/>',
                connectedSystem: { serviceProvider: mockServiceProvider } as any,
                servicePath: '/sap/opu/odata/sap/TEST_SRV'
            },
            {
                appAccess: {},
                referencedEntities: { listEntity: { entitySetName: 'TestSet' } }
            } as any,
            {
                [promptNames.confirmDownload]: true,
                [promptNames.relatedEntitySelection]: [{ fullPath: 'Test', entity: { entitySetName: 'TestSet' } }]
            }
        );
        expect(result).toEqual({ odataQueryResult: mockEntityData });
    });

    test('should return error string when fetchData returns error', async () => {
        jest.spyOn(odataQueryModule, 'fetchData').mockResolvedValueOnce({
            odataResult: { error: 'Connection failed' }
        } as any);

        const result = await getData(
            {
                metadata: '<xml/>',
                connectedSystem: { serviceProvider: mockServiceProvider } as any,
                servicePath: '/sap/opu/odata/sap/TEST_SRV'
            },
            {
                appAccess: {},
                referencedEntities: { listEntity: { entitySetName: 'TestSet' } }
            } as any,
            {
                [promptNames.confirmDownload]: true,
                [promptNames.relatedEntitySelection]: []
            }
        );
        expect(result).toBe('Connection failed');
    });
});
