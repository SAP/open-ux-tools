import type { HierarchyEntity, ReferencedEntities } from '../src/data-download/types';
import {
    clearRootHierarchyParentProperty,
    createEntitySetData,
    getHierarchyEntities,
    normalizeHierarchyNodeIds
} from '../src/data-download/utils';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ConvertedMetadata, EntitySet, EntityType } from '@sap-ux/vocabularies-types';

describe('Test utils', () => {
    describe('createEntitySetData', () => {
        test('should create an entity set data map for writing to files', async () => {
            const rootEntity = JSON.parse(
                await readFile(join(__dirname, './test-data/TravelEntityModel.json'), 'utf8')
            ) as ReferencedEntities['listEntity'];
            // No selected entities, only the unexpanded main/list entity is written
            let odataResult = (
                JSON.parse(await readFile(join(__dirname, './test-data/odataResult1.json'), 'utf8')) as {
                    value: unknown[];
                }
            ).value;
            let entitySetData = createEntitySetData(odataResult, {}, rootEntity.entitySetName);
            let expectedEntitySetData = await readFile(
                join(__dirname, './test-data/expected-output/test1/entityFileData.json'),
                'utf8'
            );
            expect(entitySetData).toEqual(JSON.parse(expectedEntitySetData));

            // More complex query, multiple entity set files created.
            odataResult = (
                JSON.parse(await readFile(join(__dirname, './test-data/odataResult2.json'), 'utf8')) as {
                    value: unknown[];
                }
            ).value;
            entitySetData = createEntitySetData(
                odataResult,
                {
                    _Country: 'Country',
                    _Agency: 'TravelAgency',
                    _Booking: 'Booking',
                    _Product: 'Supplement',
                    _SupplementText: 'SupplementText',
                    _Travel: 'Travel',
                    _BookSupplement: 'BookingSupplement',
                    _Currency: 'Currency',
                    _Carrier: 'Airline',
                    _Customer: 'Passenger'
                },
                rootEntity.entitySetName
            );
            expectedEntitySetData = await readFile(
                join(__dirname, './test-data/expected-output/test2/entityFileData.json'),
                'utf8'
            );
            expect(entitySetData).toEqual(JSON.parse(expectedEntitySetData));
        });

        test('should create an entity set data map for large odata results', async () => {
            const odataResult = (
                JSON.parse(await readFile(join(__dirname, './test-data/odataResult3.json'), 'utf8')) as {
                    value: unknown[];
                }
            ).value;
            const entitySetData = createEntitySetData(
                odataResult,
                {
                    _BankAddress: 'BankAddress',
                    _BankIntradayStatementRule: 'BankIntradayStatementRule',
                    _BankScriptedAddress: 'BankScriptedAddress',
                    _BankServiceMapping: 'CashBankServiceMapping',
                    _BusinessPartnerRating: 'BusinessPartnerRating',
                    _BusinessPartnerUsed: 'BusinessPartnerUsed',
                    _CompanyCodeUsed: 'CompanyCodeUsed',
                    _ContactPerson: 'ContactPerson',
                    _DtaMdmExchFrgnPaytTransac: 'DtaMdmExchFrgnPaytTransac',
                    _HouseBank: 'CashBankHouseBank',
                    _NettingBusinessPartner: 'CashBankNettingPartner',
                    _RelatedBranch: 'CashBankRelatedBranch',
                    _RiskBusinessPartner: 'RiskBusinessPartner',
                    _UserContactCardChange: 'UserContactCard',
                    _UserContactCardCreation: 'UserContactCard'
                },
                'CashBank'
            );
            const expectedEntitySetData = await readFile(
                join(__dirname, './test-data/expected-output/test3/entityFileData.json'),
                'utf8'
            );
            expect(entitySetData).toEqual(JSON.parse(expectedEntitySetData));
        });

        test('should remove duplicate entities at all nesting levels', () => {
            // Simulates OData result similar to Travel with expanded Bookings, where:
            // - Same Airline appears in multiple bookings across different travels
            // - Same Currency appears at travel level and booking level
            // - Same Customer appears on multiple bookings
            const odataResult = [
                {
                    TravelID: '1',
                    TravelName: 'Trip to Paris',
                    _Currency: { CurrencyCode: 'EUR', CurrencyName: 'Euro' },
                    _Booking: [
                        {
                            BookingID: 'B1',
                            _Carrier: { AirlineID: 'LH', AirlineName: 'Lufthansa' },
                            _Customer: { CustomerID: 'C1', CustomerName: 'John Doe' },
                            _Currency: { CurrencyCode: 'EUR', CurrencyName: 'Euro' } // duplicate of travel currency
                        },
                        {
                            BookingID: 'B2',
                            _Carrier: { AirlineID: 'LH', AirlineName: 'Lufthansa' }, // duplicate carrier
                            _Customer: { CustomerID: 'C2', CustomerName: 'Jane Smith' },
                            _Currency: { CurrencyCode: 'USD', CurrencyName: 'US Dollar' }
                        }
                    ]
                },
                {
                    TravelID: '2',
                    TravelName: 'Trip to London',
                    _Currency: { CurrencyCode: 'GBP', CurrencyName: 'British Pound' },
                    _Booking: [
                        {
                            BookingID: 'B3',
                            _Carrier: { AirlineID: 'BA', AirlineName: 'British Airways' },
                            _Customer: { CustomerID: 'C1', CustomerName: 'John Doe' }, // duplicate customer from Travel 1
                            _Currency: { CurrencyCode: 'GBP', CurrencyName: 'British Pound' } // duplicate of travel currency
                        },
                        {
                            BookingID: 'B4',
                            _Carrier: { AirlineID: 'LH', AirlineName: 'Lufthansa' }, // duplicate carrier from Travel 1
                            _Customer: { CustomerID: 'C2', CustomerName: 'Jane Smith' }, // duplicate customer
                            _Currency: { CurrencyCode: 'EUR', CurrencyName: 'Euro' } // duplicate currency from Travel 1
                        }
                    ]
                }
            ];

            const entitySetsFlat = {
                _Currency: 'Currency',
                _Booking: 'Booking',
                _Carrier: 'Airline',
                _Customer: 'Passenger'
            };

            const result = createEntitySetData(odataResult, entitySetsFlat, 'Travel');

            // 2 unique travels
            expect(result.Travel).toHaveLength(2);
            // 4 unique bookings (B1, B2, B3, B4)
            expect(result.Booking).toHaveLength(4);
            // 3 unique currencies (EUR, USD, GBP) - despite appearing 6 times in the data
            expect(result.Currency).toHaveLength(3);
            expect(result.Currency).toEqual(
                expect.arrayContaining([
                    { CurrencyCode: 'EUR', CurrencyName: 'Euro' },
                    { CurrencyCode: 'USD', CurrencyName: 'US Dollar' },
                    { CurrencyCode: 'GBP', CurrencyName: 'British Pound' }
                ])
            );
            // 2 unique airlines (LH, BA) - despite LH appearing 3 times
            expect(result.Airline).toHaveLength(2);
            expect(result.Airline).toEqual(
                expect.arrayContaining([
                    { AirlineID: 'LH', AirlineName: 'Lufthansa' },
                    { AirlineID: 'BA', AirlineName: 'British Airways' }
                ])
            );
            // 2 unique customers (C1, C2) - despite each appearing twice
            expect(result.Passenger).toHaveLength(2);
            expect(result.Passenger).toEqual(
                expect.arrayContaining([
                    { CustomerID: 'C1', CustomerName: 'John Doe' },
                    { CustomerID: 'C2', CustomerName: 'Jane Smith' }
                ])
            );
        });
    });

    describe('getHierarchyEntities', () => {
        function createMockEntitySet(
            name: string,
            entityType: Partial<EntityType>,
            hierarchyKey?: string,
            keys?: { name: string; type: string }[],
            entityProperties?: { name: string; type: string }[],
            isDraft?: boolean
        ): EntitySet {
            const annotations: Record<string, unknown> = {};
            if (hierarchyKey) {
                annotations.Aggregation = {
                    [hierarchyKey]: {
                        NodeProperty: {
                            type: 'PropertyPath',
                            value: 'ID',
                            $target: { name: 'ID', type: 'Edm.String' }
                        },
                        ParentNavigationProperty: {
                            type: 'NavigationPropertyPath',
                            value: 'Superordinate',
                            $target: {
                                name: 'Superordinate',
                                referentialConstraint: [{ sourceProperty: 'Parent', targetProperty: 'ID' }]
                            }
                        }
                    }
                };
            }

            const entitySetAnnotations: Record<string, unknown> = {};
            if (isDraft) {
                entitySetAnnotations.Common = { DraftRoot: { type: 'Org.OData.Common.V1.DraftRootType' } };
            }

            return {
                name,
                entityTypeName: entityType.fullyQualifiedName ?? name + 'Type',
                annotations: entitySetAnnotations,
                entityType: {
                    ...entityType,
                    keys: keys ?? [{ name: 'ID', type: 'Edm.String' }],
                    entityProperties: entityProperties ?? [{ name: 'Parent', type: 'Edm.String' }],
                    annotations
                } as EntityType
            } as EntitySet;
        }

        test('should return empty array when no hierarchy annotations exist', () => {
            const metadata = {
                entitySets: [createMockEntitySet('Travel', { fullyQualifiedName: 'TravelType' })]
            } as ConvertedMetadata;

            const result = getHierarchyEntities(metadata);
            expect(result).toEqual([]);
        });

        test('should detect hierarchy entity with RecursiveHierarchy annotation', () => {
            const metadata = {
                entitySets: [
                    createMockEntitySet('Travel', { fullyQualifiedName: 'TravelType' }),
                    createMockEntitySet(
                        'SalesOrganizations',
                        { fullyQualifiedName: 'SalesOrgType' },
                        'RecursiveHierarchy#SalesOrgHierarchy'
                    )
                ]
            } as ConvertedMetadata;

            const result = getHierarchyEntities(metadata);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                entitySetName: 'SalesOrganizations',
                entityTypeName: 'SalesOrgType',
                qualifier: 'SalesOrgHierarchy',
                nodeProperty: 'ID',
                parentProperty: 'Parent',
                parentPropertyType: 'Edm.String',
                isDraft: false,
                entityTypeKeys: ['ID']
            });
        });

        test('should detect multiple hierarchy entities', () => {
            const metadata = {
                entitySets: [
                    createMockEntitySet('SalesOrgs', { fullyQualifiedName: 'SalesOrgType' }, 'RecursiveHierarchy#H1'),
                    createMockEntitySet(
                        'CostCenters',
                        { fullyQualifiedName: 'CostCenterType' },
                        'RecursiveHierarchy#H2'
                    )
                ]
            } as ConvertedMetadata;

            const result = getHierarchyEntities(metadata);
            expect(result).toHaveLength(2);
        });

        test('should handle unqualified RecursiveHierarchy annotation', () => {
            const metadata = {
                entitySets: [
                    createMockEntitySet('SalesOrgs', { fullyQualifiedName: 'SalesOrgType' }, 'RecursiveHierarchy')
                ]
            } as ConvertedMetadata;

            const result = getHierarchyEntities(metadata);
            expect(result).toHaveLength(1);
            expect(result[0].qualifier).toBe('');
            expect(result[0].isDraft).toBe(false);
        });

        test('should detect draft-enabled hierarchy entities', () => {
            const draftKeys = [
                { name: 'ID', type: 'Edm.Guid' },
                { name: 'IsActiveEntity', type: 'Edm.Boolean' }
            ];
            const metadata = {
                entitySets: [
                    createMockEntitySet(
                        'Companies',
                        { fullyQualifiedName: 'CompanyType' },
                        'RecursiveHierarchy#CompanyHierarchy',
                        draftKeys,
                        [{ name: 'Parent', type: 'Edm.Guid' }],
                        true
                    )
                ]
            } as ConvertedMetadata;

            const result = getHierarchyEntities(metadata);
            expect(result).toHaveLength(1);
            expect(result[0].isDraft).toBe(true);
            expect(result[0].parentPropertyType).toBe('Edm.Guid');
        });
    });

    describe('normalizeHierarchyNodeIds', () => {
        test('should convert uppercase hex NodeId to GUID format when parent property is Edm.Guid', () => {
            const entityFileData: { [key: string]: object[] } = {
                Companies: [
                    {
                        Company: 'cb565aac-b20e-1fe1-8ba0-bdc76e7caee9',
                        OwnerCompany: '',
                        NodeId: 'CB565AACB20E1FE18BA0BDC76E7CAEE9'
                    },
                    {
                        Company: 'cb565aac-b20e-1fe1-8ba0-be99f8d2cefd',
                        OwnerCompany: 'cb565aac-b20e-1fe1-8ba0-bdc76e7caee9',
                        NodeId: 'CB565AACB20E1FE18BA0BE99F8D2CEFD'
                    }
                ]
            };
            const hierarchies: HierarchyEntity[] = [
                {
                    entitySetName: 'Companies',
                    entityTypeName: 'CompanyType',
                    qualifier: 'CompanyHierarchy',
                    nodeProperty: 'NodeId',
                    parentProperty: 'OwnerCompany',
                    parentPropertyType: 'Edm.Guid',
                    isDraft: true,
                    entityTypeKeys: []
                }
            ];

            normalizeHierarchyNodeIds(entityFileData, hierarchies);

            expect((entityFileData.Companies[0] as Record<string, unknown>).NodeId).toBe(
                'cb565aac-b20e-1fe1-8ba0-bdc76e7caee9'
            );
            expect((entityFileData.Companies[1] as Record<string, unknown>).NodeId).toBe(
                'cb565aac-b20e-1fe1-8ba0-be99f8d2cefd'
            );
        });

        test('should handle complex type node property path', () => {
            const entityFileData: { [key: string]: object[] } = {
                Companies: [
                    {
                        Company: 'cb565aac-b20e-1fe1-8ba0-bdc76e7caee9',
                        OwnerCompany: '',
                        __HierProps: { NodeId: 'CB565AACB20E1FE18BA0BDC76E7CAEE9' }
                    },
                    {
                        Company: 'cb565aac-b20e-1fe1-8ba0-be99f8d2cefd',
                        OwnerCompany: 'cb565aac-b20e-1fe1-8ba0-bdc76e7caee9',
                        __HierProps: { NodeId: 'CB565AACB20E1FE18BA0BE99F8D2CEFD' }
                    }
                ]
            };
            const hierarchies: HierarchyEntity[] = [
                {
                    entitySetName: 'Companies',
                    entityTypeName: 'CompanyType',
                    qualifier: 'CompanyHierarchy',
                    nodeProperty: '__HierProps/NodeId',
                    parentProperty: 'OwnerCompany',
                    parentPropertyType: 'Edm.Guid',
                    isDraft: true,
                    entityTypeKeys: []
                }
            ];

            normalizeHierarchyNodeIds(entityFileData, hierarchies);

            expect(
                ((entityFileData.Companies[0] as Record<string, unknown>).__HierProps as Record<string, unknown>).NodeId
            ).toBe('cb565aac-b20e-1fe1-8ba0-bdc76e7caee9');
            expect(
                ((entityFileData.Companies[1] as Record<string, unknown>).__HierProps as Record<string, unknown>).NodeId
            ).toBe('cb565aac-b20e-1fe1-8ba0-be99f8d2cefd');
        });

        test('should skip normalization when parent property is not Edm.Guid or Edm.UUID', () => {
            const entityFileData: { [key: string]: object[] } = {
                SalesOrgs: [{ ID: 'ABC123', Parent: 'XYZ', NodeId: 'ABC123' }]
            };
            const hierarchies: HierarchyEntity[] = [
                {
                    entitySetName: 'SalesOrgs',
                    entityTypeName: 'SalesOrgType',
                    qualifier: 'H1',
                    nodeProperty: 'NodeId',
                    parentProperty: 'Parent',
                    parentPropertyType: 'Edm.String',
                    isDraft: false,
                    entityTypeKeys: []
                }
            ];

            normalizeHierarchyNodeIds(entityFileData, hierarchies);

            expect((entityFileData.SalesOrgs[0] as Record<string, unknown>).NodeId).toBe('ABC123');
        });

        test('should skip NodeId values that are not 32-char uppercase hex', () => {
            const entityFileData: { [key: string]: object[] } = {
                Companies: [
                    {
                        Company: 'cb565aac-b20e-1fe1-8ba0-bdc76e7caee9',
                        OwnerCompany: '',
                        NodeId: 'cb565aac-b20e-1fe1-8ba0-bdc76e7caee9'
                    }
                ]
            };
            const hierarchies: HierarchyEntity[] = [
                {
                    entitySetName: 'Companies',
                    entityTypeName: 'CompanyType',
                    qualifier: 'H1',
                    nodeProperty: 'NodeId',
                    parentProperty: 'OwnerCompany',
                    parentPropertyType: 'Edm.Guid',
                    isDraft: false,
                    entityTypeKeys: []
                }
            ];

            normalizeHierarchyNodeIds(entityFileData, hierarchies);

            // Already in GUID format, should not be changed
            expect((entityFileData.Companies[0] as Record<string, unknown>).NodeId).toBe(
                'cb565aac-b20e-1fe1-8ba0-bdc76e7caee9'
            );
        });

        test('should also normalize for Edm.UUID parent property type', () => {
            const entityFileData: { [key: string]: object[] } = {
                Items: [
                    {
                        ID: '550e8400-e29b-41d4-a716-446655440000',
                        ParentID: '',
                        NodeId: '550E8400E29B41D4A716446655440000'
                    }
                ]
            };
            const hierarchies: HierarchyEntity[] = [
                {
                    entitySetName: 'Items',
                    entityTypeName: 'ItemType',
                    qualifier: 'H1',
                    nodeProperty: 'NodeId',
                    parentProperty: 'ParentID',
                    parentPropertyType: 'Edm.UUID',
                    isDraft: false,
                    entityTypeKeys: []
                }
            ];

            normalizeHierarchyNodeIds(entityFileData, hierarchies);

            expect((entityFileData.Items[0] as Record<string, unknown>).NodeId).toBe(
                '550e8400-e29b-41d4-a716-446655440000'
            );
        });
    });

    describe('clearRootHierarchyParentProperty', () => {
        test('should clear parent property only on root nodes (DistanceFromRoot === 0)', () => {
            const entityFileData: { [key: string]: object[] } = {
                SalesOrganizations: [
                    { ID: 'Root1', Parent: 'SomeValue', DistanceFromRoot: 0 },
                    { ID: 'Child1', Parent: 'Root1', DistanceFromRoot: 1 },
                    { ID: 'Child2', Parent: 'Child1', DistanceFromRoot: 2 }
                ]
            };
            const hierarchies: HierarchyEntity[] = [
                {
                    entitySetName: 'SalesOrganizations',
                    entityTypeName: 'SalesOrgType',
                    qualifier: 'SalesOrgHierarchy',
                    nodeProperty: 'ID',
                    parentProperty: 'Parent',
                    parentPropertyType: 'Edm.String',
                    isDraft: false,
                    entityTypeKeys: []
                }
            ];

            clearRootHierarchyParentProperty(entityFileData, hierarchies);

            expect((entityFileData.SalesOrganizations[0] as Record<string, unknown>).Parent).toBe('');
            expect((entityFileData.SalesOrganizations[1] as Record<string, unknown>).Parent).toBe('Root1');
            expect((entityFileData.SalesOrganizations[2] as Record<string, unknown>).Parent).toBe('Child1');
        });

        test('should handle complex type node property path', () => {
            const entityFileData: { [key: string]: object[] } = {
                Companies: [
                    { Company: 'A', OwnerCompany: 'X', __HierProps: { NodeId: 'A', DistanceFromRoot: 0 } },
                    { Company: 'B', OwnerCompany: 'A', __HierProps: { NodeId: 'B', DistanceFromRoot: 1 } }
                ]
            };
            const hierarchies: HierarchyEntity[] = [
                {
                    entitySetName: 'Companies',
                    entityTypeName: 'CompanyType',
                    qualifier: 'CompanyHierarchy',
                    nodeProperty: '__HierProps/NodeId',
                    parentProperty: 'OwnerCompany',
                    parentPropertyType: 'Edm.Guid',
                    isDraft: true,
                    entityTypeKeys: []
                }
            ];

            clearRootHierarchyParentProperty(entityFileData, hierarchies);

            expect((entityFileData.Companies[0] as Record<string, unknown>).OwnerCompany).toBe('');
            expect((entityFileData.Companies[1] as Record<string, unknown>).OwnerCompany).toBe('A');
        });

        test('should skip entity sets without the parent property', () => {
            const entityFileData: { [key: string]: object[] } = {
                SalesOrganizations: [{ ID: 'Root1', Parent: 'X', DistanceFromRoot: 0 }],
                Employees: [{ ID: 'E1', Name: 'John' }]
            };
            const hierarchies: HierarchyEntity[] = [
                {
                    entitySetName: 'SalesOrganizations',
                    entityTypeName: 'SalesOrgType',
                    qualifier: 'H1',
                    nodeProperty: 'ID',
                    parentProperty: 'Parent',
                    parentPropertyType: 'Edm.String',
                    isDraft: false,
                    entityTypeKeys: []
                }
            ];

            clearRootHierarchyParentProperty(entityFileData, hierarchies);

            expect((entityFileData.SalesOrganizations[0] as Record<string, unknown>).Parent).toBe('');
            expect((entityFileData.Employees[0] as Record<string, unknown>).Name).toBe('John');
        });
    });

    describe('getHierarchyEntities (integration)', () => {
        test('should detect hierarchy entities from real purchase order service metadata', async () => {
            const metadataXml = await readFile(
                join(__dirname, './test-data/test-apps/purchaseorder/webapp/localService/mainService/metadata.xml'),
                'utf-8'
            );
            const { convert } = await import('@sap-ux/annotation-converter');
            const { parse } = await import('@sap-ux/edmx-parser');
            const convertedMetadata = convert(parse(metadataXml));

            const result = getHierarchyEntities(convertedMetadata);

            // Real metadata has 8 entity sets with SAP__aggregation.RecursiveHierarchy annotations
            expect(result.length).toBeGreaterThanOrEqual(7);

            // PPS_PurchaseOrderItem: self-referential hierarchy, no referentialConstraint in EDMX
            const poItem = result.find((h) => h.entitySetName === 'PPS_PurchaseOrderItem');
            expect(poItem).toBeDefined();
            expect(poItem?.qualifier).toBe('I_PPS_PurchaseOrderItemHNRltn');
            expect(poItem?.nodeProperty).toBe('__HierarchyPropertiesForI_PPS_PurchaseOrderItemHNRltn/NodeId');
            expect(poItem?.parentProperty).toBe('PurchasingParentItem');
            expect(poItem?.isDraft).toBe(true);

            // PPS_PurOrdItemHierarchy: companion source entity, same qualifier
            const hierarchy = result.find((h) => h.entitySetName === 'PPS_PurOrdItemHierarchy');
            expect(hierarchy).toBeDefined();
            expect(hierarchy?.qualifier).toBe('I_PPS_PurchaseOrderItemHNRltn');
            expect(hierarchy?.parentProperty).toBe('PurchasingParentItem');
            expect(hierarchy?.isDraft).toBe(false);
            expect(hierarchy?.entityTypeKeys).toContain('PurchaseOrder');
            expect(hierarchy?.entityTypeKeys).toContain('PurchaseOrderItem');
        });
    });
});
