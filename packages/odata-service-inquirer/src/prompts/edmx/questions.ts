import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Annotations } from '@sap-ux/axios-extension';
import type { TableType, TemplateType } from '@sap-ux/fiori-elements-writer';
import type { ConfirmQuestion, InputQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import {
    searchChoices,
    getRecursiveHierarchyQualifierForEntitySet,
    findEntitySetByName
} from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ListChoiceOptions, Question } from 'inquirer';
import { t } from '../../i18n';
import type {
    AlpTableConfigAnswers,
    AnnotationGenerationAnswers,
    EntityPromptOptions,
    EntitySelectionAnswers,
    TableConfigAnswers,
    PageBuildingBlockAnswers
} from '../../types';
import { EntityPromptNames, MetadataSizeWarningLimitKb } from '../../types';
import { PromptState } from '../../utils';
import LoggerHelper from '../logger-helper';
import { getAnalyticListPageQuestions } from './alp-questions';
import {
    type EntityAnswer,
    type EntityChoiceOptions,
    type EntitySetFilter,
    getDefaultTableType,
    getEntityChoices,
    getNavigationEntityChoices,
    type NavigationEntityAnswer
} from './entity-helper';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';

/**
 * Validate the entity choice options. If the entity choice options are empty, a validation message will be returned.
 *
 * @param entityChoiceOptions the entity choice options to validate
 * @param templateType the template type, the validation message may vary based on the template type
 * @param odataVersion the OData version, used to generate a specific validation message for ALP V4
 * @param isCapService whether the service is a CAP service or not
 * @returns true is validation passes, otherwise a string with the validation message
 */
function validateEntityChoices(
    entityChoiceOptions: ListChoiceOptions<EntityAnswer>[],
    templateType: TemplateType,
    odataVersion: OdataVersion,
    isCapService: boolean
): string | boolean {
    let validationMsg;
    if (entityChoiceOptions.length === 0) {
        if (templateType === 'feop' && isCapService) {
            validationMsg = t('prompts.mainEntitySelection.noDraftEnabledEntitiesError');
        } else if (templateType === 'alp' && odataVersion === OdataVersion.v4) {
            validationMsg = t('prompts.mainEntitySelection.noEntitiesAlpV4Error');
        } else {
            validationMsg = t('prompts.mainEntitySelection.noEntitiesError');
        }
    }

    if (!PromptState.isYUI && validationMsg) {
        LoggerHelper.logger.debug(`Exiting due to validation error: ${validationMsg}`);
        throw new Error(t('errors.exitingGeneration', { exitReason: validationMsg }));
    }
    return validationMsg ?? true;
}

/**
 * Get the questions that may be used to prompt for entity selection and related information, table types, layout options and annotation generation.
 *
 * @param metadata the metadata (edmx) string of the service
 * @param templateType the template type of the application to be generated from the prompt answers
 * @param isCapService whether the service is a CAP service or not
 * @param promptOptions options that can control some of the prompt behavior. See {@link EntityPromptOptions} for details
 * @param annotations annotations should be provided when the specified template type is analytic list page, and the metadata odata version is '2', in order to determine the presentation variant qualifiers.
 *  If none are provided, or the odata version is not '2', the presentation variant qualifier prompt will not be shown.
 * @returns the prompts used to provide input for system selection and a reference to the answers object which will be populated with the user's responses once `inquirer.prompt` returns
 */
export function getEntitySelectionQuestions(
    metadata: string,
    templateType: TemplateType,
    isCapService = false,
    promptOptions?: EntityPromptOptions,
    annotations?: Annotations
): Question<
    EntitySelectionAnswers &
        TableConfigAnswers &
        AnnotationGenerationAnswers &
        AlpTableConfigAnswers &
        PageBuildingBlockAnswers
>[] {
    const useAutoComplete = promptOptions?.useAutoComplete;
    let entitySetFilter: EntitySetFilter | undefined;
    if (templateType === 'feop' && !!isCapService) {
        entitySetFilter = 'filterDraftEnabled';
    } else if (templateType === 'alp') {
        entitySetFilter = 'filterAggregateTransformationsOnly';
    }

    const entityChoices = getEntityChoices(metadata, {
        defaultMainEntityName: promptOptions?.defaultMainEntityName,
        entitySetFilter
    });

    if (!entityChoices.convertedMetadata || !entityChoices.odataVersion) {
        // getEntityChoiceOptions will log an error if the metadata or its odata version are unparseable
        return [];
    }
    const odataVersion = entityChoices.odataVersion;

    const entityQuestions: Question<
        EntitySelectionAnswers &
            TableConfigAnswers &
            AnnotationGenerationAnswers &
            AlpTableConfigAnswers &
            PageBuildingBlockAnswers
    >[] = [];

    // OVP only has filter entity, does not use tables and we do not add annotations
    if (templateType === 'ovp') {
        entityQuestions.push(getFilterEntitySetQuestions(entityChoices, useAutoComplete));
        // Return early since OVP does not have table layout prompts
        return entityQuestions;
    }

    entityQuestions.push({
        type: useAutoComplete ? 'autocomplete' : 'list',
        name: EntityPromptNames.mainEntity,
        message: t('prompts.mainEntitySelection.message'),
        guiOptions: {
            breadcrumb: true
        },
        choices: entityChoices.choices,
        source: (prevAnswers: unknown, input: string) =>
            searchChoices(input, entityChoices.choices as ListChoiceOptions[]),
        default: entityChoices.defaultMainEntityIndex ?? entityChoices.draftRootIndex ?? 0,
        validate: () => validateEntityChoices(entityChoices.choices, templateType, odataVersion, isCapService),
        additionalMessages: (answers: EntitySelectionAnswers) => {
            if (promptOptions?.defaultMainEntityName && entityChoices.defaultMainEntityIndex === undefined) {
                return {
                    message: t('prompts.mainEntitySelection.defaultEntityNameNotFoundWarning'),
                    severity: Severity.warning
                };
            }
            if (answers.mainEntity?.mainEntityParameterName) {
                // display a warning if the main entity has a mainEntityParameterName
                return {
                    message: t('prompts.mainEntitySelection.mainEntityParameterFoundInfo'),
                    severity: Severity.information
                };
            }
        }
    } as ListQuestion<EntitySelectionAnswers>);

    const convertedMetadata = entityChoices.convertedMetadata;
    // No nav entity for FPM
    if (templateType !== 'fpm') {
        let navigationEntityChoices: ListChoiceOptions<NavigationEntityAnswer>[];
        entityQuestions.push({
            when: (answers: EntitySelectionAnswers) => {
                // Skip navigation entity selection if the selected main entity has mainEntityParameterName.
                if (answers.mainEntity && !answers.mainEntity.mainEntityParameterName) {
                    navigationEntityChoices = getNavigationEntityChoices(
                        convertedMetadata,
                        odataVersion,
                        answers.mainEntity.entitySetName
                    );
                    return navigationEntityChoices.length > 0;
                }
                return false;
            },
            type: useAutoComplete ? 'autocomplete' : 'list',
            name: EntityPromptNames.navigationEntity,
            message: t('prompts.navigationEntitySelection.message'),
            guiOptions: {
                applyDefaultWhenDirty: true, // Selected nav entity may no longer be present if main entity changes
                breadcrumb: true
            },
            choices: () => navigationEntityChoices,
            source: (preAnswers: EntitySelectionAnswers, input: string) =>
                searchChoices(input, navigationEntityChoices as ListChoiceOptions[]),
            default: 0
        } as ListQuestion<EntitySelectionAnswers>);
    }

    if (promptOptions?.displayPageBuildingBlockPrompt) {
        entityQuestions.push(...getPageBuildingBlockQuestions());
    }

    entityQuestions.push(...getAddAnnotationQuestions(metadata, templateType, odataVersion, isCapService));

    if (!promptOptions?.hideTableLayoutPrompts) {
        entityQuestions.push(...getTableLayoutQuestions(templateType, odataVersion, isCapService, convertedMetadata));
    }

    if (templateType === 'alp') {
        entityQuestions.push(
            ...getAnalyticListPageQuestions(odataVersion, annotations, promptOptions?.hideTableLayoutPrompts)
        );
    }
    return entityQuestions;
}

/**
 * Get the questions for page building block.
 *
 * @returns the page building block questions
 */
function getPageBuildingBlockQuestions(): Question<PageBuildingBlockAnswers>[] {
    const pageBuildingBlockQuestions: Question<PageBuildingBlockAnswers>[] = [];

    pageBuildingBlockQuestions.push({
        type: 'confirm',
        name: EntityPromptNames.addPageBuildingBlock,
        message: t('prompts.pageBuildingBlock.message'),
        default: false,
        guiOptions: {
            breadcrumb: true,
            hint: t('prompts.pageBuildingBlock.tooltip')
        },
        additionalMessages: (addPageBuildingBlock: boolean) => {
            if (addPageBuildingBlock) {
                return {
                    message: t('prompts.pageBuildingBlock.warning'),
                    severity: Severity.warning
                };
            }
        }
    } as ConfirmQuestion<PageBuildingBlockAnswers>);

    // If the user wants to add a Page Building Block, ask for the title
    pageBuildingBlockQuestions.push({
        when: (answers: EntitySelectionAnswers & PageBuildingBlockAnswers) => answers.addPageBuildingBlock === true,
        type: 'input',
        name: EntityPromptNames.pageBuildingBlockTitle,
        message: t('prompts.pageBuildingBlock.titleMessage'),
        guiOptions: {
            breadcrumb: true,
            mandatory: true
        },
        validate: (input: string) => !!input
    } as InputQuestion<PageBuildingBlockAnswers>);

    return pageBuildingBlockQuestions;
}

/**
 * Get the questions that may be used to prompt for table layout options.
 *
 * @param templateType used to determine if the tree table option should be included
 * @param odataVersion used to determine if the hierarchy qualifier is required when the selected table type is TreeTable
 * @param isCapService used to determine if the tree table option should be included
 * @param metadata the metadata (edmx) string of the service
 * @returns the table layout questions
 */
function getTableLayoutQuestions(
    templateType: TemplateType,
    odataVersion: OdataVersion,
    isCapService: boolean,
    metadata: ConvertedMetadata
): Question<TableConfigAnswers>[] {
    const tableTypeChoices: { name: string; value: TableType }[] = [
        { name: t('prompts.tableType.choiceAnalytical'), value: 'AnalyticalTable' },
        { name: t('prompts.tableType.choiceGrid'), value: 'GridTable' },
        { name: t('prompts.tableType.choiceResponsive'), value: 'ResponsiveTable' }
    ];

    if (templateType !== 'alp' && !isCapService) {
        tableTypeChoices.push({ name: t('prompts.tableType.choiceTree'), value: 'TreeTable' });
    }
    const tableLayoutQuestions: Question<TableConfigAnswers>[] = [];

    if (templateType === 'lrop' || templateType === 'worklist' || templateType === 'alp') {
        // Variables to manage analytical table defaults across prompts
        let setAnalyticalTableDefault = false;
        let selectedEntity: EntityAnswer | undefined;
        tableLayoutQuestions.push({
            when: (prevAnswers: EntitySelectionAnswers) => !!prevAnswers.mainEntity,
            type: 'list',
            name: EntityPromptNames.tableType,
            message: t('prompts.tableType.message'),
            guiOptions: {
                hint: t('prompts.tableType.hint'),
                breadcrumb: true,
                applyDefaultWhenDirty: true // set table type on entity selection change
            },
            choices: tableTypeChoices,
            default: (prevAnswers: EntitySelectionAnswers & TableConfigAnswers) => {
                const currentEntity = prevAnswers?.mainEntity;

                // Only re-evaluate if entity has changed or no previous selection exists
                if (currentEntity?.entitySetName !== selectedEntity?.entitySetName || !prevAnswers?.tableType) {
                    const defaultTableType = getDefaultTableType(
                        templateType,
                        metadata,
                        odataVersion,
                        isCapService,
                        currentEntity?.entitySetName
                    );

                    // Update tracking variables
                    selectedEntity = currentEntity;
                    setAnalyticalTableDefault = defaultTableType === 'AnalyticalTable';
                    return defaultTableType;
                }

                // Entity hasn't changed and user has a selection - preserve their choice
                // Reset the analytical table default flag since this is user's choice, not system default
                setAnalyticalTableDefault = false;
                return prevAnswers.tableType;
            },
            additionalMessages: () => {
                if (setAnalyticalTableDefault) {
                    return {
                        message: t('prompts.tableType.analyticalTableDefault'),
                        severity: Severity.information
                    };
                }
            }
        } as ListQuestion<TableConfigAnswers>);

        tableLayoutQuestions.push({
            when: (prevAnswers: TableConfigAnswers) =>
                prevAnswers?.tableType === 'TreeTable' && odataVersion === OdataVersion.v4,
            type: 'input',
            name: EntityPromptNames.hierarchyQualifier,
            message: t('prompts.hierarchyQualifier.message'),
            guiOptions: {
                hint: t('prompts.hierarchyQualifier.hint'),
                breadcrumb: true,
                mandatory: true
            },
            default: (prevAnswers: EntitySelectionAnswers & TableConfigAnswers) => {
                // Auto-populate qualifier from RecursiveHierarchy annotation if available
                if (prevAnswers?.mainEntity?.entitySetName) {
                    const entitySet = findEntitySetByName(metadata, prevAnswers.mainEntity.entitySetName);
                    return entitySet ? getRecursiveHierarchyQualifierForEntitySet(entitySet) : '';
                }
                return '';
            },
            validate: (input: string) => {
                if (!input) {
                    return t('prompts.hierarchyQualifier.qualifierRequiredForV4Warning');
                }
                return true;
            }
        } as InputQuestion<TableConfigAnswers>);
    }
    return tableLayoutQuestions;
}

/**
 * Returns the size of an EDMX string in kilobytes.
 *
 * @param {string} edmx The EDMX string to measure.
 * @returns {number} The size of the EDMX string in kilobytes. Returns 0 if the input is null, undefined, or an empty string.
 */
function getEdmxSizeInKb(edmx: string): number {
    if (edmx) {
        const sizeInBytes = Buffer.byteLength(edmx);
        return sizeInBytes / 1024;
    }
    return 0;
}

/**
 * Get the questions that may be used to prompt for adding annotations. Only a subset of the questions will be returned based on the template type and OData version.
 *
 * @param metadata the metadata (edmx) string of the service, used to determine if the metadata is large and the user should be warned about processing time
 * @param templateType only specific template types will have line item annotations
 * @param odataVersion only specific OData versions will have line item annotations
 * @param isCapService whether the service is a CAP service or not
 * @returns the annotation generation questions
 */
function getAddAnnotationQuestions(
    metadata: string,
    templateType: TemplateType,
    odataVersion: OdataVersion,
    isCapService: boolean
): ConfirmQuestion<AnnotationGenerationAnswers>[] {
    const largeEdmxDataset = getEdmxSizeInKb(metadata) > MetadataSizeWarningLimitKb;
    const annotationQuestions: ConfirmQuestion<AnnotationGenerationAnswers>[] = [];

    if (templateType === 'feop') {
        annotationQuestions.push({
            type: 'confirm',
            name: EntityPromptNames.addFEOPAnnotations,
            guiOptions: {
                breadcrumb: t('prompts.addFEOPAnnotations.breadcrumb')
            },
            message: t('prompts.addFEOPAnnotations.message'),
            additionalMessages: (addFEOPAnnotations: boolean) => {
                if (addFEOPAnnotations && largeEdmxDataset) {
                    return {
                        message: t('warnings.largeMetadataDocument'),
                        severity: Severity.warning
                    };
                }
            },
            default: !largeEdmxDataset
        } as ConfirmQuestion<AnnotationGenerationAnswers>);
        // Return early since FEOP does not have line item annotations
        return annotationQuestions;
    }

    if ((templateType === 'lrop' || templateType === 'worklist') && odataVersion === OdataVersion.v4) {
        annotationQuestions.push({
            type: 'confirm',
            name: EntityPromptNames.addLineItemAnnotations,
            guiOptions: {
                breadcrumb: t('prompts.addLineItemAnnotations.breadcrumb')
            },
            message: t('prompts.addLineItemAnnotations.message'),
            additionalMessages: (answer: boolean) => {
                if (answer) {
                    if (largeEdmxDataset) {
                        return {
                            message: t('warnings.largeMetadataDocument'),
                            severity: Severity.warning
                        };
                    } else if (isCapService) {
                        return {
                            message: t('prompts.addLineItemAnnotations.valueHelpsAnnotationsInfoMessage'),
                            severity: Severity.information
                        };
                    }
                }
            },
            default: !largeEdmxDataset
        } as ConfirmQuestion<AnnotationGenerationAnswers>);
    }
    return annotationQuestions;
}

/**
 * Get the questions that may be used to prompt for filter entity selection for the OVP template type.
 *
 * @param entityChoices Filter entity type prompt choices
 * @param useAutoComplete Determines if entity related prompts should use auto complete on user input
 * @returns the ovp specific filter entity type selection question
 */
function getFilterEntitySetQuestions(
    entityChoices: EntityChoiceOptions,
    useAutoComplete = false
): Question<EntitySelectionAnswers> {
    return {
        type: useAutoComplete ? 'autocomplete' : 'list',
        name: EntityPromptNames.filterEntitySet,
        message: t('prompts.filterEntitySet.message'),
        guiOptions: {
            breadcrumb: true
        },
        choices: entityChoices.choices,
        source: (preAnswers: EntitySelectionAnswers, input: string) =>
            searchChoices(input, entityChoices.choices as ListChoiceOptions[]),
        default: entityChoices.defaultMainEntityIndex ?? entityChoices.draftRootIndex ?? 0,
        validate: () => (entityChoices.choices.length === 0 ? t('prompts.filterEntitySet.noEntitiesError') : true)
    } as ListQuestion<EntitySelectionAnswers>;
}
