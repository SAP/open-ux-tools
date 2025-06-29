import { getEntityChoices, getNavigationEntityChoices } from '../../../../src/prompts/edmx/entity-helper';
import { readFile } from 'fs/promises';
import { parse } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { join } from 'path';

describe('Test entity helper functions', () => {
    let metadataV4WithAggregateTransforms: string;
    let metadataV4WithAliasAggregateTransforms: string;
    let metadataV2: string;
    let metadataV4WithDraftEntities: string;
    let metadataV2WithDraftRoot: string;

    beforeAll(async () => {
        metadataV4WithAggregateTransforms = await readFile(
            join(__dirname, '../test-data/metadataV4WithAggregateTransforms.xml'),
            'utf8'
        );
        metadataV4WithAliasAggregateTransforms = await readFile(
            join(__dirname, '../test-data/metadataV4WithAliasAggregateTransforms.xml'),
            'utf8'
        );
        metadataV2 = await readFile(join(__dirname, '../test-data/metadataV2.xml'), 'utf8');
        metadataV4WithDraftEntities = await readFile(
            join(__dirname, '../test-data/metadataV4WithDraftEntities.xml'),
            'utf8'
        );
        metadataV2WithDraftRoot = await readFile(join(__dirname, '../test-data/metadataV2WithDraftRoot.xml'), 'utf8');
    });

    describe('Test getNavigationEntityOptions', () => {
        test('should return v4 navigation entities', async () => {
            const parsedEdmx = parse(metadataV4WithDraftEntities);
            const convertedMetadata = convert(parsedEdmx);
            const navChoices = getNavigationEntityChoices(convertedMetadata, OdataVersion.v4, 'Travel');
            expect(navChoices.length).toEqual(2);
            expect(navChoices[0].name).toEqual('None');
            expect(navChoices[0].value).toEqual({});
            expect(navChoices[1].name).toEqual('_Booking');
            expect(navChoices[1].value).toEqual({
                navigationPropertyName: '_Booking',
                entitySetName: 'Booking'
            });
        });

        test('should return v2 navigation entities', async () => {
            const parsedEdmx = parse(metadataV2);
            const convertedMetadata = convert(parsedEdmx);
            const navChoices = getNavigationEntityChoices(convertedMetadata, OdataVersion.v2, 'SEPMRA_C_PD_Product');
            expect(navChoices[0].name).toEqual('None');
            expect(navChoices[0].value).toEqual({});
            expect(navChoices.length).toEqual(22);
            expect(navChoices[1].value).toEqual({
                entitySetName: 'I_DraftAdministrativeData',
                navigationPropertyName: 'DraftAdministrativeData'
            });
            expect(navChoices).toMatchSnapshot();
        });
    });

    describe('Test filter entities with aggregate transformation annotation', () => {
        test('should filter ALP v4 entities', () => {
            const fitleredChoices = [
                {
                    name: 'SalesOrderItem',
                    value: {
                        entitySetName: 'SalesOrderItem',
                        entitySetType: 'com.c_salesordermanage_sd_aggregate.SalesOrderItem'
                    }
                },
                {
                    name: 'SalesOrderManage',
                    value: {
                        entitySetName: 'SalesOrderManage',
                        entitySetType: 'com.c_salesordermanage_sd_aggregate.SalesOrderManage'
                    }
                }
            ];

            const filteredChoicesWithAggregationAlias = [
                {
                    name: 'C_MockAccountReconciliation',
                    value: {
                        entitySetName: 'C_MockAccountReconciliation',
                        entitySetType:
                            'com.sap.mock.srvd.z_mockaccountreconciliation.v0001.C_MockAccountReconciliationType'
                    }
                }
            ];

            const filteredEntities = getEntityChoices(metadataV4WithAggregateTransforms, {
                entitySetFilter: 'filterAggregateTransformationsOnly'
            });
            expect(filteredEntities.choices).toEqual(fitleredChoices);

            const filteredEntitiesAggregationAlias = getEntityChoices(metadataV4WithAliasAggregateTransforms, {
                entitySetFilter: 'filterAggregateTransformationsOnly'
            });
            expect(filteredEntitiesAggregationAlias.choices).toEqual(filteredChoicesWithAggregationAlias);

            // Metadata is odata v2 instead of v4, `filterAggregateTransformationsOnly` is ignored
            const filteredEntitiesNoEdmx = getEntityChoices(metadataV2, {
                entitySetFilter: 'filterAggregateTransformationsOnly'
            });
            expect(filteredEntitiesNoEdmx.choices).toMatchSnapshot();
        });
    });

    describe('Test getEntityChoices', () => {
        test('should return all entity sets', () => {
            const entityOptions = getEntityChoices(metadataV4WithDraftEntities);
            expect(entityOptions.choices.length).toEqual(14);
            expect(entityOptions.choices[0].name).toEqual('Airline');
            expect(entityOptions.choices[0].value).toEqual({
                entitySetName: 'Airline',
                entitySetType: 'com.sap.gateway.srvd.dmo.sd_travel_mduu.v0001.AirlineType'
            });
        });

        test('should return all draft roots', () => {
            const entityOptions = getEntityChoices(metadataV2WithDraftRoot);
            expect(entityOptions.choices.length).toEqual(23);
            expect(entityOptions.choices[7].name).toEqual('SEPMRA_C_PD_Product');
            expect(entityOptions.draftRootIndex).toBe(7);
        });

        test('should preselect the specified main entity', () => {
            const entityOptions = getEntityChoices(metadataV4WithDraftEntities, { defaultMainEntityName: 'Airline' });
            expect(entityOptions.choices.length).toEqual(14);
            expect(entityOptions.choices[entityOptions.defaultMainEntityIndex!]).toEqual({
                name: 'Airline',
                value: {
                    entitySetName: 'Airline',
                    entitySetType: 'com.sap.gateway.srvd.dmo.sd_travel_mduu.v0001.AirlineType'
                }
            });
        });

        test('should return draft enabled entity sets only', async () => {
            const entityOptions = getEntityChoices(metadataV4WithDraftEntities, {
                entitySetFilter: 'filterDraftEnabled'
            });
            expect(entityOptions.choices[4].name).toEqual('Travel');
            expect(entityOptions.choices).toMatchInlineSnapshot(`
                [
                  {
                    "name": "Booking",
                    "value": {
                      "entitySetName": "Booking",
                      "entitySetType": "com.sap.gateway.srvd.dmo.sd_travel_mduu.v0001.BookingType",
                    },
                  },
                  {
                    "name": "BookingSupplement",
                    "value": {
                      "entitySetName": "BookingSupplement",
                      "entitySetType": "com.sap.gateway.srvd.dmo.sd_travel_mduu.v0001.BookingSupplementType",
                    },
                  },
                  {
                    "name": "Supplement",
                    "value": {
                      "entitySetName": "Supplement",
                      "entitySetType": "com.sap.gateway.srvd.dmo.sd_travel_mduu.v0001.SupplementType",
                    },
                  },
                  {
                    "name": "SupplementText",
                    "value": {
                      "entitySetName": "SupplementText",
                      "entitySetType": "com.sap.gateway.srvd.dmo.sd_travel_mduu.v0001.SupplementTextType",
                    },
                  },
                  {
                    "name": "Travel",
                    "value": {
                      "entitySetName": "Travel",
                      "entitySetType": "com.sap.gateway.srvd.dmo.sd_travel_mduu.v0001.TravelType",
                    },
                  },
                ]
            `);
        });

        test('should use entity type name as choice name', async () => {
            const entityOptions = getEntityChoices(metadataV2, {});
            const typeNameChoices = entityOptions.choices;
            expect(typeNameChoices).toMatchSnapshot();
            expect(typeNameChoices[0].name).toEqual('I_Currency');
            expect(typeNameChoices[0].value.entitySetName).toEqual('I_Currency');
            expect(typeNameChoices[0].value.entitySetType).toEqual('SEPMRA_PROD_MAN.I_CurrencyType');
        });

        test('should set mainEntityParameterName for a single valid parameterised main entity', async () => {
            const v4ParamertrisedEntitiesMetadata = await readFile(
                join(__dirname, '../test-data/parameterised-entity-metadata.xml'),
                'utf8'
            );
            const result = getEntityChoices(v4ParamertrisedEntitiesMetadata);
            // Check that the choices contain the mainEntityParameterName property
            const expectedChoicesWithParameterisedMainEntity = [
                {
                    name: 'ZC_STOCKAGEING',
                    value: {
                        entitySetName: 'ZC_STOCKAGEING',
                        entitySetType: 'com.sap.gateway.srvd.zserv_d_stock_ageing.v0001.ZC_STOCKAGEINGParameters',
                        mainEntityParameterName: 'Set'
                    }
                }
            ];
            expect(result.choices).toEqual(expectedChoicesWithParameterisedMainEntity);
        });

        test('should set mainEntityParameterName for multiple valid parameterised main entities', async () => {
            const v4MultiParamertrisedEntitiesMetadata = await readFile(
                join(__dirname, '../test-data/multiple-parameterised-entities-metadata.xml'),
                'utf8'
            );
            const result = getEntityChoices(v4MultiParamertrisedEntitiesMetadata);
            const expectedMultiParamEntities = [
                {
                    name: 'ChangeableFields',
                    value: {
                        entitySetName: 'ChangeableFields',
                        entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.ChangeableFieldsParameters',
                        mainEntityParameterName: 'Set'
                    }
                },
                {
                    name: 'CustomFunction',
                    value: {
                        entitySetName: 'CustomFunction',
                        entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.CustomFunctionParameters',
                        mainEntityParameterName: 'Set'
                    }
                },
                {
                    name: 'CustomHint',
                    value: {
                        entitySetName: 'CustomHint',
                        entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.CustomHintParameters',
                        mainEntityParameterName: 'Set'
                    }
                },
                {
                    name: 'CustomLink',
                    value: {
                        entitySetName: 'CustomLink',
                        entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.CustomLinkParameters',
                        mainEntityParameterName: 'Set'
                    }
                },
                {
                    name: 'CustomText',
                    value: {
                        entitySetName: 'CustomText',
                        entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.CustomTextParameters',
                        mainEntityParameterName: 'Set'
                    }
                },
                {
                    name: 'InterfaceDisplayName',
                    value: {
                        entitySetName: 'InterfaceDisplayName',
                        entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.InterfaceDisplayNameParameters',
                        mainEntityParameterName: 'Set'
                    }
                },
                {
                    name: 'InterfaceStatistics',
                    value: {
                        entitySetName: 'InterfaceStatistics',
                        entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.InterfaceStatisticsParameters',
                        mainEntityParameterName: 'Set'
                    }
                },
                {
                    name: 'MessageComment',
                    value: {
                        entitySetName: 'MessageComment',
                        entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.MessageCommentType'
                    }
                },
                {
                    name: 'MessageProcessStatus',
                    value: {
                        entitySetName: 'MessageProcessStatus',
                        entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.MessageProcessStatusType'
                    }
                }
            ];
            expect(result.choices).toEqual(expectedMultiParamEntities);
        });

        test('should return no mainEntityParameterName when no valid parameterised navigation property exists', async () => {
            const result = getEntityChoices(metadataV4WithDraftEntities);
            // Check that none of the choices have mainEntityParameterName defined
            result.choices.forEach((choice) => {
                expect(choice.value).not.toHaveProperty('mainEntityParameterName');
            });
        });
    });
});
