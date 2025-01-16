import { Severity } from '@sap-devx/yeoman-ui-types';
import type { ConfirmQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { readFile } from 'fs/promises';
import type { ListChoiceOptions, Question } from 'inquirer';
import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n';
import * as EntityHelper from '../../../../src/prompts/edmx/entity-helper';
import * as Types from '../../../../src/types';
import { getEntitySelectionQuestions } from '../../../../src/prompts/edmx/questions';
import LoggerHelper from '../../../../src/prompts/logger-helper';
import type { EntitySelectionAnswers } from '../../../../src/types';
import { EntityPromptNames } from '../../../../src/types';
import type { EntityAnswer } from '../../../../src/prompts/edmx/entity-helper';
import exp from 'constants';

describe('Test entity prompts', () => {
    let metadataV4WithDraftAndShareAnnot: string;
    let metadataV4WithAggregateTransforms: string;
    let metadataV2: string;
    let metadataV4WithDraftEntities: string;
    let metadataV2WithDraftRoot: string;

    beforeAll(async () => {
        // Read the test metadata files
        metadataV4WithDraftAndShareAnnot = await readFile(
            __dirname + '/test-data/metadataV4WithDraftAnnotationAndShareAction.xml',
            'utf8'
        );
        metadataV4WithAggregateTransforms = await readFile(
            __dirname + '/test-data/metadataV4WithAggregateTransforms.xml',
            'utf8'
        );
        metadataV2 = await readFile(__dirname + '/test-data/metadataV2.xml', 'utf8');
        metadataV4WithDraftEntities = await readFile(__dirname + '/test-data/metadataV4WithDraftEntities.xml', 'utf8');
        metadataV2WithDraftRoot = await readFile(__dirname + '/test-data/metadataV2WithDraftRoot.xml', 'utf8');
        // Ensure i18n texts are loaded so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    test('getEntityQuestions should return the questions when no options specified', () => {
        let questions = getEntitySelectionQuestions(metadataV2, 'lrop');
        expect(questions).toMatchSnapshot();

        // Invalid metadata
        const errorLogSpy = jest.spyOn(LoggerHelper.logger, 'log');
        questions = getEntitySelectionQuestions('{}', 'lrop');
        expect(questions).toEqual([]);
        expect(errorLogSpy).toBeCalledWith(expect.stringMatching('Unable to parse entities'));
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
            entitySetFilter: undefined,
            useEntityTypeAsName: true
        });
        expect(questions).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: EntityPromptNames.filterEntityType })])
        );
        const filterEntityPrompt = questions.find(
            (question) => question.name === EntityPromptNames.filterEntityType
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
            questions.find((question) => question.name === EntityPromptNames.filterEntityType)!.validate as Function
        )();
        expect(validateResult).toEqual(t('prompts.filterEntityType.noEntitiesError'));
    });

    test('getEntityQuestions should return the correct questions: `lrop`', async () => {
        const getEntityChoicesSpy = jest.spyOn(EntityHelper, 'getEntityChoices');
        // List Report Object Page
        let questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'lrop', false, {
            defaultMainEntityName: 'Customer'
        });
        expect(getEntityChoicesSpy).toHaveBeenCalledWith(metadataV4WithAggregateTransforms, {
            defaultMainEntityName: 'Customer',
            entitySetFilter: undefined,
            useEntityTypeAsName: false
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
        // todo: add a specifc test for the validate function to check the warning messages for each template/odata version
        expect(validateResult).toBeUndefined();

        const navEntityPrompt = questions.find(
            (question) => question.name === EntityPromptNames.navigationEntity
        ) as ListQuestion;
        expect((navEntityPrompt.when as Function)({})).toBe(false);
        // Navigation entity propmt should be shown when main entity is selected and the main entity has navigation properties.
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

    test('getEntityQuestions should return the correct questions: `fpm`', async () => {
        const getEntityChoicesSpy = jest.spyOn(EntityHelper, 'getEntityChoices');

        // Flexible Page Model aka. Custom Page
        const questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'fpm');
        expect(getEntityChoicesSpy).toHaveBeenCalledWith(metadataV4WithAggregateTransforms, {
            defaultMainEntityName: undefined,
            entitySetFilter: undefined,
            useEntityTypeAsName: false
        });
        // Note, no navigation entity for FPM
        expect(questions).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: EntityPromptNames.mainEntity })])
        );
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
            entitySetFilter: undefined,
            useEntityTypeAsName: false
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
            entitySetFilter: 'filterDraftEnabled',
            useEntityTypeAsName: false
        });
        getEntityChoicesSpy.mockClear();

        // Filter draft enabled entities when the template is Form Entry Object Page and `isCapService` is true
        questions = getEntitySelectionQuestions(metadataV4WithAggregateTransforms, 'worklist', true);
        expect(getEntityChoicesSpy).toHaveBeenCalledWith(metadataV4WithAggregateTransforms, {
            defaultMainEntityName: undefined,
            entitySetFilter: undefined,
            useEntityTypeAsName: false
        });
        expect(questions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: EntityPromptNames.mainEntity }),
                expect.objectContaining({ name: EntityPromptNames.addLineItemAnnotations })
            ])
        );
        getEntityChoicesSpy.mockClear();
    });

    // todo: Add test that correct params are passed to getEntityChoices based on the specified template type

    // Add test for ALP and do not provide annotations

    /* test('Test getEntityQuestions - LROP2 (VSCODE)', () => {
        //@ts-ignore
        getPlatform.mockReturnValueOnce(PLATFORMS.VSCODE);
        const entityQuestions = getEntityQuestions(
            PROJECT_TYPE.ListReportObjectPage,
            metadata,
            OdataVersion.v2,
            undefined,
            'SEMPRA_PROD'
        );
        expect(entityQuestions).toBeInstanceOf(Array);
        expect(entityQuestions[0].type).toBe('list');
        expect(entityQuestions[1].type).toBe('list');
        expect(entityQuestions[0].name).toBe('mainEntity');
        expect(entityQuestions[1].name).toBe('navigationEntity');
        expect(entityQuestions[0].message).toBe('Main entity');
        expect(entityQuestions[1].message).toBe('Navigation entity');
        //@ts-ignore
        expect(entityQuestions[0].additionalMessages()).toStrictEqual({
            message: 'The supplied entity cannot be found in the service. Please choose from the list above.',
            severity: Severity.warning
        });
    });

    it('Test getEntityQuestions - LROP2 (CLI)', () => {
        //@ts-ignore
        getPlatform.mockReturnValue(PLATFORMS.CLI);
        const entityValidationSpy = jest.spyOn(entityPrompts, 'entityValidation');

        const entityQuestions = getEntityQuestions(PROJECT_TYPE.ListReportObjectPage, metadata, OdataVersion.v2);
        expect(entityQuestions).toBeInstanceOf(Array);
        expect(entityQuestions[0].type).toBe('autocomplete');
        expect(entityQuestions[1].type).toBe('autocomplete');
        expect(entityQuestions[2].type).toBe('list');
        expect(entityQuestions[0].name).toBe('mainEntity');
        expect(entityQuestions[1].name).toBe('navigationEntity');
        expect(entityQuestions[2].name).toBe('tableType');
        expect(entityQuestions[0].message).toBe('Main entity');
        expect(entityQuestions[1].message).toBe('Navigation entity');
        expect(entityQuestions[2].message).toBe('Table type');
        expect(entityQuestions[2].name).toBe('tableType');
        const tableTypeChoices = ((entityQuestions[2] as ListQuestion).choices as Function)();
        expect(tableTypeChoices.length).toBe(4);
        //@ts-ignore
        expect(entityQuestions[0].choices).toMatchSnapshot();
        expect(entityValidationSpy).toBeCalled();
    });

    it('Test getEntityQuestions - showLayoutPrompts is false', () => {
        //@ts-ignore
        getPlatform.mockReturnValue(PLATFORMS.CLI);

        const entityQuestions = getEntityQuestions(
            PROJECT_TYPE.ListReportObjectPage,
            metadata,
            OdataVersion.v2,
            undefined,
            'Table',
            false
        );
        expect(entityQuestions).toBeInstanceOf(Array);
        expect(entityQuestions.length).toBe(2);
        expect(entityQuestions[0].name).toBe('mainEntity');
        expect(entityQuestions[1].name).toBe('navigationEntity');
    });

    it('Test getEntityQuestions - OVP2', () => {
        const entityQuestions = getEntityQuestions(PROJECT_TYPE.OverviewPage, metadata, OdataVersion.v2);
        expect(entityQuestions).toBeInstanceOf(Array);
        expect(entityQuestions[0].type).toBe('list');
        expect(entityQuestions[0].name).toBe('filterEntityType');
        expect(entityQuestions[0].message).toBe('Filter entity');
        //@ts-ignore
        expect(entityQuestions[0].choices()).toEqual([
            'I_CurrencyType',
            'SEPMRA_I_QuantityUnitType',
            'SEPMRA_I_DimensionUnitType',
            'SEPMRA_I_ProductCategoryType',
            'SEPMRA_C_CurrencyValueHelpType'
        ]);
        expect(entityQuestions[0].validate(undefined)).toBe(true);
        expect((entityQuestions[0] as AutocompleteQuestion).source(undefined, 'Sales')).toEqual([]);
    });

    it('Test getEntityQuestions - ALP4', () => {
        const entityQuestions = getEntityQuestions(PROJECT_TYPE.AnalyticalListPage, mockALPV4, OdataVersion.v4);
        expect(entityQuestions).toBeInstanceOf(Array);
        expect(entityQuestions[0].type).toBe('list');
        expect(entityQuestions[1].type).toBe('list');
        expect(entityQuestions[0].name).toBe('mainEntity');
        expect(entityQuestions[1].name).toBe('navigationEntity');
        expect(entityQuestions[0].message).toBe('Main entity');
        expect(entityQuestions[1].message).toBe('Navigation entity');
        //@ts-ignore
        expect(entityQuestions[0].choices).toMatchSnapshot();

        expect(entityQuestions[2].name).toBe('tableType');
        const tableTypeChoices = ((entityQuestions[2] as ListQuestion).choices as Function)();
        expect(tableTypeChoices.length).toBe(3);
        expect(tableTypeChoices).not.toContain({ name: t('TABLE_TYPE_TREE'), value: TableType.TREE });

        const alpChoices = [
            {
                name: 'SalesOrderItem',
                value: {
                    entityName: 'SalesOrderItem',
                    type: 'com.c_salesordermanage_sd_aggregate.SalesOrderItem'
                }
            },
            {
                name: 'SalesOrderManage',
                value: {
                    entityName: 'SalesOrderManage',
                    type: 'com.c_salesordermanage_sd_aggregate.SalesOrderManage'
                }
            }
        ];
        let alpVal = entityValidation(alpChoices, PROJECT_TYPE.AnalyticalListPage, OdataVersion.v2, undefined);
        expect(alpVal).toBe(true);
        alpVal = entityValidation([], PROJECT_TYPE.AnalyticalListPage, OdataVersion.v2, undefined);
        expect(alpVal).toBe('The template and service selected have no relevant entities that you can use.');
        alpVal = entityValidation([], PROJECT_TYPE.AnalyticalListPage, OdataVersion.v4, undefined);
        expect(alpVal).toBe(t('ERROR_NO_ENTITIES_RETURNED_V4_ALP'));
    });

    it('Test getEntityQuestions - Form Entry', () => {
        jest.spyOn(featuresEnabled, 'lcap').mockReturnValue(true);
        jest.spyOn(featuresEnabled, 'experimentalFeatures').mockReturnValue(true);
        //@ts-ignore
        getPlatform.mockReturnValue(PLATFORMS.SBAS);
        const entityQuestions = getEntityQuestions(PROJECT_TYPE.FormEntryObjectPage, metadata, OdataVersion.v4);
        expect(entityQuestions).toBeInstanceOf(Array);
        expect(entityQuestions[0].type).toBe('list');
        expect(entityQuestions[1].type).toBe('list');
        expect(entityQuestions[0].name).toBe('mainEntity');
        expect(entityQuestions[1].name).toBe('navigationEntity');
        expect(entityQuestions[0].message).toBe('Main entity');
        expect(entityQuestions[1].message).toBe('Navigation entity');
        //@ts-ignore
        expect(entityQuestions[0].choices).toMatchSnapshot();

        const formChoices = [
            {
                name: 'Capex',
                value: {
                    entityName: 'Capex',
                    type: 'MainService.Capex'
                }
            }
        ];

        const capJsonAppConfig = JSON.parse(
            readFileSync(path.join(__dirname, './test-input/cap-project/cap-package.json.test'), {
                encoding: 'utf-8'
            })
        );

        let formVal = entityValidation(
            formChoices,
            PROJECT_TYPE.FormEntryObjectPage,
            OdataVersion.v4,
            capJsonAppConfig
        );
        expect(formVal).toBe(true);
        expect(entityQuestions[0].validate(undefined)).toBe(formVal);
        formVal = entityValidation([], PROJECT_TYPE.FormEntryObjectPage, OdataVersion.v4, capJsonAppConfig);
        expect(formVal).toBe(t('ERROR_NO_DRAFT_ENABLED_ENTITIES'));
    });

    it('Test getEntityQuestions - Worklist - V4', () => {
        jest.spyOn(featuresEnabled, 'lcap').mockReturnValue(true);
        jest.spyOn(featuresEnabled, 'experimentalFeatures').mockReturnValue(true);
        const entityQuestions = getEntityQuestions(PROJECT_TYPE.Worklist, mockALPV4, OdataVersion.v4);
        expect(entityQuestions).toBeInstanceOf(Array);
        expect(entityQuestions.length).toBe(5);
        expect(entityQuestions[2].name).toBe('generateLROPAnnotations');
        // Just check if there is an input, as of UI5 1.123 release, input is required for tree table + oData V4
        expect(entityQuestions[4].validate('')).toBe(t('ERROR_HIERARCHY_QUALIFIER_REQUIRED_V4'));
        expect(entityQuestions[4].validate('valid input')).toBe(true);
    });

    it('Test getEntityQuestions (no entities)', () => {
        //@ts-ignore
        getPlatform.mockReturnValue(PLATFORMS.CLI);
        const entityValidationSpy = jest
            .spyOn(entityPrompts, 'entityValidation')
            .mockReturnValueOnce('The template and service selected have no relevant entities that you can use.');

        expect(() => {
            getEntityQuestions(PROJECT_TYPE.ListReportObjectPage, metadata, OdataVersion.v2);
        }).toThrow();
    });

    it('getEntityQuestions - FPM', () => {
        const entityQuestions = getEntityQuestions(PROJECT_TYPE.FlexibleProgrammingModel, metadata, OdataVersion.v4);
        expect(entityQuestions).toEqual([expect.objectContaining({ name: 'mainEntity' })]);
    });

    it('getEntityQuestions - Large Edmx', () => {
        //@ts-ignore
        getEdmxSizeInKb.mockReturnValue(2000);
        jest.spyOn(featuresEnabled, 'experimentalFeatures').mockReturnValue(true);
        const entityQuestions = getEntityQuestions(PROJECT_TYPE.ListReportObjectPage, metadata, OdataVersion.v4);
        expect(entityQuestions.length).toBe(5);
        expect(entityQuestions[2].name).toBe('generateLROPAnnotations');
        expect(entityQuestions[2].default).toBe(false);
    });

    it('getEntityQuestions - CAP Java', () => {
        jest.spyOn(featuresEnabled, 'experimentalFeatures').mockReturnValue(true);
        const capService: CapService = {
            projectPath: 'path/to/cap/java/project',
            capType: CAP_RUNTIME.JAVA,
            serviceName: 'test'
        };
        const entityQuestions = getEntityQuestions(
            PROJECT_TYPE.ListReportObjectPage,
            metadata,
            OdataVersion.v4,
            capService
        );
        console.log(entityQuestions);
        expect(entityQuestions.length).toBe(5);
        expect(entityQuestions[2].name).toBe('generateLROPAnnotations');
        expect(entityQuestions[2].default).toBe(true);
    });

    it('getAnnotationQuestions', () => {
        jest.spyOn(featuresEnabled, 'experimentalFeatures').mockReturnValue(true);
        jest.spyOn(featuresEnabled, 'lcap').mockReturnValue(true);
        let annotationQuestions = getAnnotationQuestions(PROJECT_TYPE.ListReportObjectPage, OdataVersion.v4);

        expect(annotationQuestions).toMatchInlineSnapshot(`
            Array [
              Object {
                "additionalMessages": [Function],
                "default": true,
                "guiOptions": Object {
                  "breadcrumb": "Generate Annotations",
                },
                "message": "Automatically add table columns to the list page and a section to the object page if none already exists?",
                "name": "generateLROPAnnotations",
                "type": "confirm",
              },
            ]
        `);

        // large edmx
        annotationQuestions = getAnnotationQuestions(PROJECT_TYPE.ListReportObjectPage, OdataVersion.v4, true);
        expect((annotationQuestions[0] as QuestionWithAdditionalMessages).additionalMessages(true)).toStrictEqual({
            message:
                'The metadata for this OData service is significantly large. It may take some time before this operation completes.',
            severity: 1
        });
        expect(annotationQuestions).toMatchInlineSnapshot(`
            Array [
              Object {
                "additionalMessages": [Function],
                "default": false,
                "guiOptions": Object {
                  "breadcrumb": "Generate Annotations",
                },
                "message": "Automatically add table columns to the list page and a section to the object page if none already exists?",
                "name": "generateLROPAnnotations",
                "type": "confirm",
              },
            ]
        `);

        // cap source
        annotationQuestions = getAnnotationQuestions(PROJECT_TYPE.ListReportObjectPage, OdataVersion.v4, true);
        expect((annotationQuestions[0] as QuestionWithAdditionalMessages).additionalMessages(true)).toStrictEqual({
            message: 'Basic value helps will also be created.',
            severity: 2
        });

        annotationQuestions = getAnnotationQuestions(PROJECT_TYPE.FormEntryObjectPage, OdataVersion.v4);
        expect(annotationQuestions).toMatchInlineSnapshot(`
            Array [
              Object {
                "additionalMessages": [Function],
                "default": true,
                "guiOptions": Object {
                  "breadcrumb": "Generate Annotations",
                },
                "message": "Automatically add a form to the generated application if none already exists?",
                "name": "generateFormAnnotations",
                "type": "confirm",
              },
            ]
        `);

        annotationQuestions = getAnnotationQuestions(PROJECT_TYPE.OverviewPage, OdataVersion.v4);
        expect(annotationQuestions).toMatchInlineSnapshot(`Array []`);

        jest.spyOn(featuresEnabled, 'experimentalFeatures').mockReturnValue(false);
        jest.spyOn(featuresEnabled, 'lcap').mockReturnValue(false);
        annotationQuestions = getAnnotationQuestions(PROJECT_TYPE.FormEntryObjectPage, OdataVersion.v4);
        expect(annotationQuestions).toMatchInlineSnapshot(`
            Array [
              Object {
                "additionalMessages": [Function],
                "default": true,
                "guiOptions": Object {
                  "breadcrumb": "Generate Annotations",
                },
                "message": "Automatically add a form to the generated application if none already exists?",
                "name": "generateFormAnnotations",
                "type": "confirm",
              },
            ]
        `);

        jest.spyOn(featuresEnabled, 'experimentalFeatures').mockReturnValue(false);
        jest.spyOn(featuresEnabled, 'lcap').mockReturnValue(true);
        annotationQuestions = getAnnotationQuestions(PROJECT_TYPE.FormEntryObjectPage, OdataVersion.v4);
        expect(annotationQuestions).toMatchInlineSnapshot(`
            Array [
              Object {
                "additionalMessages": [Function],
                "default": true,
                "guiOptions": Object {
                  "breadcrumb": "Generate Annotations",
                },
                "message": "Automatically add a form to the generated application if none already exists?",
                "name": "generateFormAnnotations",
                "type": "confirm",
              },
            ]
        `);

        annotationQuestions = getAnnotationQuestions(PROJECT_TYPE.ListReportObjectPage, OdataVersion.v4);
        //@ts-ignore
        expect(annotationQuestions[0].additionalMessages(true)).toBe(undefined);
    }); */
});
