import { Severity } from '@sap-devx/yeoman-ui-types';
import { TableType } from '@sap-ux/fiori-elements-writer';
import type { ConfirmQuestion, ListQuestion, InputQuestion } from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { readFile } from 'fs/promises';
import type { ListChoiceOptions, Question } from 'inquirer';
import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n';
import type { EntityAnswer } from '../../../../src/prompts/edmx/entity-helper';
import * as EntityHelper from '../../../../src/prompts/edmx/entity-helper';
import { getEntitySelectionQuestions } from '../../../../src/prompts/edmx/questions';
import LoggerHelper from '../../../../src/prompts/logger-helper';
import type { EntitySelectionAnswers, PageBuildingBlockAnswers } from '../../../../src/types';
import * as Types from '../../../../src/types';
import { EntityPromptNames } from '../../../../src/types';
import { PromptState } from '../../../../src/utils';
import { join } from 'node:path';
import { parse } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';

describe('Test entity prompts', () => {
    let metadataV4WithAggregateTransforms: string;
    let metadataV2: string;
    let metadataV4WithDraftEntities: string;
    let metadataV2NoEntities: string;

    beforeAll(async () => {
        metadataV4WithAggregateTransforms = await readFile(
            join(__dirname, '../test-data/metadataV4WithAggregateTransforms.xml'),
            'utf8'
        );
        metadataV2 = await readFile(join(__dirname, '../test-data/metadataV2.xml'), 'utf8');
        metadataV4WithDraftEntities = await readFile(
            join(__dirname, '../test-data/metadataV4WithDraftEntities.xml'),
            'utf8'
        );
        metadataV2NoEntities = await readFile(join(__dirname, '../test-data/metadataV2NoEntities.xml'), 'utf8');
        // Ensure i18n texts are loaded so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    test('getEntityQuestions should return the questions when no options specified', () => {
        let questions = getEntitySelectionQuestions(metadataV2, 'lrop');
        expect(questions).toMatchSnapshot();

        // Invalid metadata
        const errorLogSpy = jest.spyOn(LoggerHelper.logger, 'error');
        questions = getEntitySelectionQuestions('{}', 'lrop');
        expect(questions).toEqual([]);
        expect(errorLogSpy).toHaveBeenCalledWith(expect.stringMatching('Unable to parse entities'));
    });

    test('getEntityQuestions should return prompts based options specified', () => {
        // Preselect the main entity using option `defaultMainEntityName`
        let questions = getEntitySelectionQuestions(metadataV2, 'lrop', false, {
            defaultMainEntityName: 'SEPMRA_C_PD_Product'
        });
        const mainEntityPrompt = questions.find(
            (question) => question.name === EntityPromptNames.mainEntity
        ) as ListQuestion;
        const mainEntityIndex = (mainEntityPrompt.choices as ListChoiceOptions<EntitySelectionAnswers>[]).findIndex(
            (choice) => choice.name === 'SEPMRA_C_PD_Product'
        );
        expect(mainEntityPrompt?.default).toBe(mainEntityIndex);

        // Hide the table layout prompts using option `hideTableLayoutPrompts`
        questions = getEntitySelectionQuestions(metadataV2, 'lrop', false, {
            hideTableLayoutPrompts: true
        });
        expect(questions.find((question) => question.name === EntityPromptNames.tableType)).toBeUndefined();
        expect(questions.find((question) => question.name === EntityPromptNames.hierarchyQualifier)).toBeUndefined();

        // Enable autocomplete for specific prompts using option `autoComplete`
        questions = getEntitySelectionQuestions(metadataV2, 'lrop', false, {
            useAutoComplete: true
        });
        const autoCompletePrompts = questions.filter((question) => (question as Question).type === 'autocomplete');
        expect(autoCompletePrompts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: EntityPromptNames.mainEntity }),
                expect.objectContaining({ name: EntityPromptNames.navigationEntity })
            ])
        );
    });

    test('getEntityQuestions should return the correct questions: `ovp`', async () => {
        const getEntityChoicesSpy = jest.spyOn(EntityHelper, 'getEntityChoices');
        // Analytical List Page
        let questions = getEntitySelectionQuestions(metadataV2, 'ovp');
        expect(getEntityChoicesSpy).toHaveBeenCalledWith(metadataV2, {
            defaultMainEntityName: undefined,
            entitySetFilter: undefined
        });
        expect(questions).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: EntityPromptNames.filterEntitySet })])
        );
        const filterEntityPrompt = questions.find(
            (question) => question.name === EntityPromptNames.filterEntitySet
        ) as ListQuestion;
        // Specific entity choices should be tested by the entity helper tests
        expect((filterEntityPrompt.choices as []).length).toBe(25);

        let validateResult = (filterEntityPrompt!.validate as Function)();
        expect(validateResult).toBe(true);

        // Filter entity type prompt validation message when no choices
        getEntityChoicesSpy.mockReturnValueOnce({
            choices: [],
            odataVersion: OdataVersion.v2,
            convertedMetadata: { version: '2' } as ConvertedMetadata
        });
        questions = getEntitySelectionQuestions(metadataV2, 'ovp');
        validateResult = (
            questions.find((question) => question.name === EntityPromptNames.filterEntitySet)!.validate as Function
        )();
        expect(validateResult).toEqual(t('prompts.filterEntitySet.noEntitiesError'));
    });

    test('getEntityQuestions should return the correct questions: `lrop`', async () => {
        const getEntityChoicesSpy = jest.spyOn(EntityHelper, 'getEntityChoices');
        // List Report Object Page
        let questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'lrop', false, {
            defaultMainEntityName: 'Customer'
        });
        expect(getEntityChoicesSpy).toHaveBeenCalledWith(metadataV4WithAggregateTransforms, {
            defaultMainEntityName: 'Customer',
            entitySetFilter: undefined
        });
        expect(questions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: EntityPromptNames.mainEntity }),
                expect.objectContaining({ name: EntityPromptNames.navigationEntity }),
                expect.objectContaining({ name: EntityPromptNames.addLineItemAnnotations }),
                expect.objectContaining({ name: EntityPromptNames.tableType }),
                expect.objectContaining({ name: EntityPromptNames.hierarchyQualifier })
            ])
        );
        let mainEntityPrompt = questions.find(
            (question) => question.name === EntityPromptNames.mainEntity
        ) as ListQuestion;
        // Specific entity choices should be tested by the entity helper tests
        expect((mainEntityPrompt.choices as []).length).toBe(38);
        const mainEntityIndex = (mainEntityPrompt.choices as ListChoiceOptions<EntitySelectionAnswers>[]).findIndex(
            (choice) => choice.name === 'Customer'
        );
        expect(mainEntityPrompt?.default).toBe(mainEntityIndex);
        questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'lrop', false, {
            defaultMainEntityName: 'NotFoundEntity'
        });
        mainEntityPrompt = questions.find((question) => question.name === EntityPromptNames.mainEntity) as ListQuestion;
        expect(mainEntityPrompt.additionalMessages!()).toEqual({
            message: t('prompts.mainEntitySelection.defaultEntityNameNotFoundWarning'),
            severity: Severity.warning
        });
        // validate is currently used to warn about no entities, although perhaps we shoudld be using additionalMessages
        const validateResult = (mainEntityPrompt.validate as Function)();
        expect(validateResult).toBe(true);

        const navEntityPrompt = questions.find(
            (question) => question.name === EntityPromptNames.navigationEntity
        ) as ListQuestion;
        expect((navEntityPrompt.when as Function)({})).toBe(false);
        // Navigation entity prompt should be shown when main entity is selected and the main entity has navigation properties.
        // Navigation entity choices are tested fully by the entity helper tests.
        expect(
            (navEntityPrompt.when as Function)({
                [EntityPromptNames.mainEntity]: {
                    entitySetName: 'Material',
                    entitySetType: 'com.c_salesordermanage_sd_aggregate.Material'
                } as EntityAnswer
            })
        ).toBe(true);
        expect((navEntityPrompt.choices as Function)().length).toEqual(2);
    });

    test('`mainEntity` question should conditionally return validation message', async () => {
        PromptState.isYUI = true;
        // FEOP - error if no draft enabled enities
        let questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'feop', true);
        let mainEntityPrompt = questions.find(
            (question) => question.name === EntityPromptNames.mainEntity
        ) as ListQuestion;
        let validateResult = (mainEntityPrompt.validate as Function)();
        expect(validateResult).toBe(t('prompts.mainEntitySelection.noDraftEnabledEntitiesError'));

        // ALP - error if no aggregate transforms
        questions = getEntitySelectionQuestions(metadataV4WithDraftEntities, 'alp');
        mainEntityPrompt = questions.find((question) => question.name === EntityPromptNames.mainEntity) as ListQuestion;
        validateResult = (mainEntityPrompt.validate as Function)();
        expect(validateResult).toBe(t('prompts.mainEntitySelection.noEntitiesAlpV4Error'));

        // No entities
        questions = getEntitySelectionQuestions(metadataV2NoEntities, 'worklist');
        mainEntityPrompt = questions.find((question) => question.name === EntityPromptNames.mainEntity) as ListQuestion;
        validateResult = (mainEntityPrompt.validate as Function)();
        expect(validateResult).toBe(t('prompts.mainEntitySelection.noEntitiesError'));

        // CLI exit with error if no entities
        PromptState.isYUI = false;
        questions = getEntitySelectionQuestions(metadataV2NoEntities, 'worklist');
        mainEntityPrompt = questions.find((question) => question.name === EntityPromptNames.mainEntity) as ListQuestion;
        expect(() => (mainEntityPrompt.validate as Function)()).toThrow(
            'Exiting generation. Exit: The template and service selected have no relevant entities that you can use.'
        );
    });

    test('should show line item annotation generation prompt and additional messages', async () => {
        // LROP and Worklist templates are the only ones that show the line item annotation prompt
        let questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'lrop', true);
        let addLineItemAnnotationsPrompt = questions.find(
            (question) => question.name === EntityPromptNames.addLineItemAnnotations
        ) as ConfirmQuestion;

        expect(addLineItemAnnotationsPrompt.additionalMessages!()).toBeUndefined();
        expect(addLineItemAnnotationsPrompt.additionalMessages!(true)).toEqual({
            message: t('prompts.addLineItemAnnotations.valueHelpsAnnotationsInfoMessage'),
            severity: 2
        });
        // Large edmx processing warning, should be shown when the metadata size exceeds the warning limit
        Object.defineProperty(Types, 'MetadataSizeWarningLimitKb', { value: 1 });
        questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'lrop', true);
        addLineItemAnnotationsPrompt = questions.find(
            (question) => question.name === EntityPromptNames.addLineItemAnnotations
        ) as ConfirmQuestion;

        expect(addLineItemAnnotationsPrompt.additionalMessages!(true)).toEqual({
            message: t('warnings.largeMetadataDocument'),
            severity: 1
        });

        // FEOP template should not show the line item annotation prompt
        Object.defineProperty(Types, 'MetadataSizeWarningLimitKb', { value: 1 });
        questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'feop');
        addLineItemAnnotationsPrompt = questions.find(
            (question) => question.name === EntityPromptNames.addLineItemAnnotations
        ) as ConfirmQuestion;
        expect(addLineItemAnnotationsPrompt).toBeUndefined();
        const addFEOPAnnotations = questions.find(
            (question) => question.name === EntityPromptNames.addFEOPAnnotations
        ) as ConfirmQuestion;
        expect(addFEOPAnnotations.additionalMessages!(true)).toEqual({
            message: t('warnings.largeMetadataDocument'),
            severity: 1
        });
    });

    test('getEntityQuestions should return the questions depending on the specified template type and odata version', () => {
        const getEntityChoicesSpy = jest.spyOn(EntityHelper, 'getEntityChoices');
        // Analytical List Page
        let questions = getEntitySelectionQuestions(metadataV2, 'alp');
        expect(questions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: EntityPromptNames.mainEntity }),
                expect.objectContaining({ name: EntityPromptNames.navigationEntity }),
                expect.objectContaining({ name: EntityPromptNames.tableType }),
                expect.objectContaining({ name: EntityPromptNames.tableMultiSelect }),
                expect.objectContaining({ name: EntityPromptNames.tableAutoHide }),
                expect.objectContaining({ name: EntityPromptNames.smartVariantManagement })
            ])
        );
        getEntityChoicesSpy.mockClear();

        // Form Entry Object Page
        questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'feop');
        expect(getEntityChoicesSpy).toHaveBeenCalledWith(metadataV4WithAggregateTransforms, {
            defaultMainEntityName: undefined,
            entitySetFilter: undefined
        });
        expect(questions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: EntityPromptNames.mainEntity }),
                expect.objectContaining({ name: EntityPromptNames.addFEOPAnnotations })
            ])
        );
        // Filter draft enabled entities when the template is Form Entry Object Page and `isCapService` is true
        questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'feop', true);
        expect(getEntityChoicesSpy).toHaveBeenCalledWith(metadataV4WithAggregateTransforms, {
            defaultMainEntityName: undefined,
            entitySetFilter: 'filterDraftEnabled'
        });
        getEntityChoicesSpy.mockClear();

        // Filter draft enabled entities when the template is Form Entry Object Page and `isCapService` is true
        questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'worklist', true);
        expect(getEntityChoicesSpy).toHaveBeenCalledWith(metadataV4WithAggregateTransforms, {
            defaultMainEntityName: undefined,
            entitySetFilter: undefined
        });
        expect(questions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: EntityPromptNames.mainEntity }),
                expect.objectContaining({ name: EntityPromptNames.addLineItemAnnotations })
            ])
        );
        getEntityChoicesSpy.mockClear();

        // Flexible Page Model aka. Custom Page
        questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'fpm');
        expect(getEntityChoicesSpy).toHaveBeenCalledWith(metadataV4WithAggregateTransforms, {
            defaultMainEntityName: undefined,
            entitySetFilter: undefined
        });
        // Note, no navigation entity for FPM
        expect(questions).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: EntityPromptNames.mainEntity })])
        );
    });

    test('should prompt for table layout options', async () => {
        let questions = getEntitySelectionQuestions(metadataV2, 'lrop', false, { hideTableLayoutPrompts: true });

        expect(questions).not.toContainEqual(expect.objectContaining({ name: EntityPromptNames.tableType }));
        expect(questions).not.toContainEqual(expect.objectContaining({ name: EntityPromptNames.hierarchyQualifier }));

        questions = getEntitySelectionQuestions(metadataV2, 'lrop', false, { hideTableLayoutPrompts: false });

        expect(questions).toContainEqual(expect.objectContaining({ name: EntityPromptNames.tableType }));
        expect(questions).toContainEqual(expect.objectContaining({ name: EntityPromptNames.hierarchyQualifier }));

        let tableType = questions.find((question) => question.name === EntityPromptNames.tableType) as ListQuestion;
        expect(
            (tableType.when as Function)({
                [EntityPromptNames.mainEntity]: {
                    entitySetName: 'SEPMRA_C_PD_Product',
                    entitySetType: 'SEPMRA_C_PD_ProductType'
                } as EntityAnswer
            })
        ).toBe(true);
        expect(tableType.choices as []).toEqual([
            {
                name: 'Analytical',
                value: 'AnalyticalTable'
            },
            {
                name: 'Grid',
                value: 'GridTable'
            },
            {
                name: 'Responsive',
                value: 'ResponsiveTable'
            },
            {
                name: 'Tree',
                value: 'TreeTable'
            }
        ]);
        expect(tableType.default()).toEqual('ResponsiveTable');

        // For V4, if the selected entity has aggregate transformations, use AnalyticalTable as default
        questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'lrop', false);
        tableType = questions.find((question) => question.name === EntityPromptNames.tableType) as ListQuestion;
        // Simulate prevAnswers with mainEntity that has aggregate transformations
        const aggEntity = {
            [EntityPromptNames.mainEntity]: {
                entitySetName: 'SalesOrderItem',
                entitySetType: 'com.c_salesordermanage_sd_aggregate.SalesOrderItem'
            }
        };
        expect((tableType.default as Function)(aggEntity)).toEqual('AnalyticalTable');
        expect((tableType.additionalMessages as Function)('AnalyticalTable')).toEqual({
            message: t('prompts.tableType.analyticalTableDefault'),
            severity: Severity.information
        });

        // If the user has already selected a table type for the same entity, return it
        // First call establishes the entity
        (tableType.default as Function)({
            [EntityPromptNames.mainEntity]: {
                entitySetName: 'SEPMRA_C_PD_Product',
                entitySetType: 'SEPMRA_C_PD_ProductType'
            }
        });
        // Second call with same entity and existing table type should preserve user choice
        const prevAnswersWithTableType = {
            [EntityPromptNames.tableType]: 'GridTable',
            [EntityPromptNames.mainEntity]: {
                entitySetName: 'SEPMRA_C_PD_Product', // Same entity as above
                entitySetType: 'SEPMRA_C_PD_ProductType'
            }
        };
        expect((tableType.default as Function)(prevAnswersWithTableType)).toEqual('GridTable');

        // Otherwise, default to ResponsiveTable
        const prevAnswersNoSpecial = {
            [EntityPromptNames.mainEntity]: {
                entitySetName: 'SomeOtherEntity',
                entitySetType: 'SomeOtherType'
            }
        };
        expect((tableType.default as Function)(prevAnswersNoSpecial)).toEqual('ResponsiveTable');

        // If no prevAnswers, default to ResponsiveTable
        expect((tableType.default as Function)()).toEqual('ResponsiveTable');

        // For ALP with entity that has complete analytical transformations, use AnalyticalTable as default
        questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'alp', false);
        tableType = questions.find((question) => question.name === EntityPromptNames.tableType) as ListQuestion;
        expect(
            (tableType.default as Function)({
                [EntityPromptNames.mainEntity]: {
                    entitySetName: 'SalesOrderItem',
                    entitySetType: 'com.c_salesordermanage_sd_aggregate.SalesOrderItemType'
                }
            })
        ).toEqual('AnalyticalTable');

        const hierarchyQualifier = questions.find(
            (question) => question.name === EntityPromptNames.hierarchyQualifier
        ) as ListQuestion;

        Object.values(TableType).forEach((tableTypeValue) => {
            expect(
                (hierarchyQualifier.when as Function)({
                    [EntityPromptNames.tableType]: tableTypeValue
                })
            ).toBe(['AnalyticalTable', 'GridTable', 'ResponsiveTable'].includes(tableTypeValue) ? false : true);
        });

        expect((hierarchyQualifier.validate as Function)('Some qualifier value')).toBe(true);
        expect((hierarchyQualifier.validate as Function)('')).toEqual(
            t('prompts.hierarchyQualifier.qualifierRequiredForV4Warning')
        );

        // Test qualifier auto-population functionality
        const metadataV4WithHierarchyQualifier = await readFile(
            join(__dirname, '../test-data/metadataV4WithHierarchyRecursiveHierarchy.xml'),
            'utf8'
        );
        const questionsWithQualifier = getEntitySelectionQuestions(metadataV4WithHierarchyQualifier, 'lrop', false);
        const hierarchyQualifierWithAutoPopulation = questionsWithQualifier.find(
            (question) => question.name === EntityPromptNames.hierarchyQualifier
        ) as InputQuestion;

        // Test that the default function auto-populates with qualifier from metadata
        const mockAnswersWithQualifiedEntity = {
            [EntityPromptNames.mainEntity]: {
                entitySetName: 'P_SADL_HIER_UUID_D_COMPNY_ROOT'
            }
        };
        expect((hierarchyQualifierWithAutoPopulation.default as Function)(mockAnswersWithQualifiedEntity)).toBe(
            'I_SADL_HIER_UUID_COMPANY_NODE'
        );

        // Test that the default function returns empty string when no qualifier found
        const mockAnswersWithoutQualifier = {
            [EntityPromptNames.mainEntity]: {
                entitySetName: 'SomeOtherEntity'
            }
        };
        expect((hierarchyQualifierWithAutoPopulation.default as Function)(mockAnswersWithoutQualifier)).toBe('');
    });

    test('should skip navigation entity prompt when metadata contains a valid parameterised main entity', async () => {
        const getEntityChoicesSpy = jest.spyOn(EntityHelper, 'getEntityChoices');
        const v4ParamertrisedEntitiesMetadata = await readFile(
            join(__dirname, '../test-data/parameterised-entity-metadata.xml'),
            'utf8'
        );
        const mockChoices = [
            {
                name: 'ZC_STOCKAGEING',
                value: {
                    entitySetName: 'ZC_STOCKAGEING',
                    entitySetType: 'com.sap.gateway.srvd.zserv_d_stock_ageing.v0001.ZC_STOCKAGEINGParameters',
                    mainEntityParameterName: 'Set'
                }
            }
        ];
        getEntityChoicesSpy.mockReturnValueOnce({
            choices: mockChoices,
            odataVersion: OdataVersion.v4,
            convertedMetadata: convert(parse(v4ParamertrisedEntitiesMetadata)) as ConvertedMetadata
        });
        const questions = getEntitySelectionQuestions(v4ParamertrisedEntitiesMetadata, 'lrop', false, {
            defaultMainEntityName: 'ZC_STOCKAGEING'
        });
        const mainEntityPrompt = questions.find(
            (question) => question.name === EntityPromptNames.mainEntity
        ) as ListQuestion;
        // Expect additional messages to be shown for parameterised main entity
        expect(mainEntityPrompt.additionalMessages!()).toEqual({
            message: t('prompts.mainEntitySelection.defaultEntityNameNotFoundWarning'),
            severity: Severity.warning
        });
        const navEntityPrompt = questions.find(
            (question) => question.name === EntityPromptNames.navigationEntity
        ) as ListQuestion;
        // expect nav entity prompt to be hidden since main entity is parameterised
        expect(
            (navEntityPrompt.when as Function)({
                [EntityPromptNames.mainEntity]: {
                    entitySetName: 'ZC_STOCKAGEING',
                    entitySetType: 'com.sap.gateway.srvd.zserv_d_stock_ageing.v0001.ZC_STOCKAGEINGParameters',
                    mainEntityParameterName: 'Set'
                } as EntityAnswer
            })
        ).toBe(false);
    });

    test('should skip navigation entity prompt when metadata contains multiple parameterised main entities', async () => {
        const getEntityChoicesSpy = jest.spyOn(EntityHelper, 'getEntityChoices');
        const metadataV4WithMultipleParameterisedEntities = await readFile(
            join(__dirname, '../test-data/multiple-parameterised-entities-metadata.xml'),
            'utf8'
        );
        // Pass a mix of parameterised and non-parameterised entities
        const mockChoices = [
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
                    entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.CustomFunctionParameters'
                }
            },
            {
                name: 'CustomHint',
                value: {
                    entitySetName: 'CustomHint',
                    entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.CustomHintParameters',
                    mainEntityParameterName: 'Set'
                }
            }
        ];

        // Mock for the first main entity
        getEntityChoicesSpy.mockReturnValueOnce({
            choices: mockChoices,
            odataVersion: OdataVersion.v4,
            convertedMetadata: convert(parse(metadataV4WithMultipleParameterisedEntities)) as ConvertedMetadata,
            defaultMainEntityIndex: 0
        });
        const questionsForChangeableFields = getEntitySelectionQuestions(
            metadataV4WithMultipleParameterisedEntities,
            'lrop',
            false,
            {
                defaultMainEntityName: 'ChangeableFields'
            }
        );
        const navEntityPromptForChangeableFields = questionsForChangeableFields.find(
            (question) => question.name === EntityPromptNames.navigationEntity
        ) as ListQuestion;

        // Check if navigation entity prompt is hidden for parameterised main entity
        expect(
            (navEntityPromptForChangeableFields.when as Function)({
                [EntityPromptNames.mainEntity]: {
                    entitySetName: 'ChangeableFields',
                    entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.ChangeableFieldsParameters',
                    mainEntityParameterName: 'Set'
                } as EntityAnswer
            })
        ).toBe(false);

        // Mock for the second main entity
        getEntityChoicesSpy.mockReturnValueOnce({
            choices: mockChoices,
            odataVersion: OdataVersion.v4,
            convertedMetadata: convert(parse(metadataV4WithMultipleParameterisedEntities)) as ConvertedMetadata,
            defaultMainEntityIndex: 1
        });

        const questionsForCustomFunction = getEntitySelectionQuestions(
            metadataV4WithMultipleParameterisedEntities,
            'lrop',
            false,
            {
                defaultMainEntityName: 'CustomFunction'
            }
        );
        const navEntityPromptForCustomFunction = questionsForCustomFunction.find(
            (question) => question.name === EntityPromptNames.navigationEntity
        ) as ListQuestion;

        // Check if navigation entity prompt is shown for non-parameterised main entity
        expect(
            (navEntityPromptForCustomFunction.when as Function)({
                [EntityPromptNames.mainEntity]: {
                    entitySetName: 'CustomFunction',
                    entitySetType: 'com.sap.gateway.srvd.aif.messagemonitor.v0001.CustomFunctionParameters'
                } as EntityAnswer
            })
        ).toBe(true);
    });

    test('pageBuildingBlockTitle question is displayed when addPageBuildingBlock is true', () => {
        const promptOptions = { displayPageBuildingBlockPrompt: true };
        const questions = getEntitySelectionQuestions(metadataV2, 'fpm', false, promptOptions);

        const addPageBuildingBlockQuestion = questions.find(
            (q) => q.name === EntityPromptNames.addPageBuildingBlock
        ) as ConfirmQuestion;
        expect(addPageBuildingBlockQuestion).toBeDefined();
        expect(addPageBuildingBlockQuestion.message).toBe(t('prompts.pageBuildingBlock.message'));
        expect(addPageBuildingBlockQuestion.default).toBe(false);
        expect(addPageBuildingBlockQuestion.guiOptions?.hint).toBe(t('prompts.pageBuildingBlock.tooltip'));
        if (typeof addPageBuildingBlockQuestion?.additionalMessages === 'function') {
            const message = addPageBuildingBlockQuestion.additionalMessages({
                addPageBuildingBlock: true
            } as PageBuildingBlockAnswers);
            expect(message).toEqual({
                message: t('prompts.pageBuildingBlock.warning'),
                severity: Severity.warning
            });
        }

        const pageBlockTitleQuestion = questions.find((q) => q.name === EntityPromptNames.pageBuildingBlockTitle);
        expect(typeof pageBlockTitleQuestion?.when).toBe('function');
        if (typeof pageBlockTitleQuestion?.when === 'function') {
            expect(pageBlockTitleQuestion.when({ addPageBuildingBlock: true } as PageBuildingBlockAnswers)).toBe(true);
        }
        // check that page title is mandatory
        if (typeof pageBlockTitleQuestion?.validate === 'function') {
            expect(pageBlockTitleQuestion.validate('')).toBe(false);
            expect(pageBlockTitleQuestion.validate('My Title')).toBe(true);
        }
    });

    test('pageBuildingBlockTitle question is not displayed when addPageBuildingBlock is false', () => {
        const promptOptions = { displayPageBuildingBlockPrompt: true };
        const questions = getEntitySelectionQuestions(metadataV2, 'fpm', false, promptOptions);
        const addPageBuildingBlockQuestion = questions.find(
            (q) => q.name === EntityPromptNames.addPageBuildingBlock
        ) as ConfirmQuestion;
        expect(addPageBuildingBlockQuestion).toBeDefined();
        expect(addPageBuildingBlockQuestion.guiOptions?.hint).toBe(t('prompts.pageBuildingBlock.tooltip'));
        if (typeof addPageBuildingBlockQuestion?.additionalMessages === 'function') {
            const message = addPageBuildingBlockQuestion.additionalMessages();
            expect(message).toEqual(undefined);
        }

        const pageBlockTitleQuestion = questions.find((q) => q.name === EntityPromptNames.pageBuildingBlockTitle);
        // Should not display when addPageBuildingBlock is false
        if (typeof pageBlockTitleQuestion?.when === 'function') {
            expect(pageBlockTitleQuestion.when({ addPageBuildingBlock: false } as PageBuildingBlockAnswers)).toBe(
                false
            );
        }
    });
});
