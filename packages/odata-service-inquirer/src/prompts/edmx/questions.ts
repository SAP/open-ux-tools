import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Annotations } from '@sap-ux/axios-extension';
import type { TableType, TemplateType } from '@sap-ux/fiori-elements-writer';
import type { ConfirmQuestion, InputQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import { searchChoices } from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ListChoiceOptions, Question } from 'inquirer';
import { t } from '../../i18n';
import type {
    AlpTableConfigAnswers,
    AnnotationGenerationAnswers,
    EntityPromptOptions,
    EntitySelectionAnswers,
    TableConfigAnswers
} from '../../types';
import { EntityPromptNames, MetadataSizeWarningLimitKb } from '../../types';
import { PromptState } from '../../utils';
import LoggerHelper from '../logger-helper';
import { getAnalyticListPageQuestions } from './alp-questions';
import type { EntitySetFilter } from './entity-helper';
import {
    type EntityAnswer,
    type NavigationEntityAnswer,
    getEntityChoices,
    getNavigationEntityChoices
} from './entity-helper';

/**
 *
 * @param entityChoiceOptions
 * @param templateType
 * @param odataVersion
 * @param isCapService
 */
function validateEntityChoices(
    entityChoiceOptions: ListChoiceOptions<EntityAnswer>[],
    templateType: TemplateType,
    odataVersion: OdataVersion,
    isCapService: boolean
): string | void {
    let validationMsg;
    if (entityChoiceOptions.length === 0) {
        if (templateType === 'feop' && isCapService) {
            validationMsg = t('prompts.mainEntitySelection.noDraftEnabledEntitiesError');
        }
        validationMsg =
            templateType === 'alp' && odataVersion === OdataVersion.v4
                ? t('prompts.mainEntitySelection.noEntitiesAlpV4Error')
                : t('prompts.mainEntitySelection.noEntitiesError');
    }

    if (PromptState.isYUI && validationMsg) {
        LoggerHelper.logger.debug(`Exiting due to validation error: ${validationMsg}`);
        throw new Error(t('errors.exitingGeneration', { exitReason: validationMsg }));
    }
}

/**
 * Get the questions that may be used to prompt for entity selection and related information, table types, layout options and annotation generation.
 *
 * @param metadata
 * @param templateType
 * @param isCapService
 * @param promptOptions - options that can control some of the prompt behavior. See {@link EntityPromptOptions} for details
 * @param annotations - annotations should be provided when the specified template type is analytic list page, and the metadata odata version is '2', in order to determine the presentation variant qualifiers.
 *  If none are provided, or the odata version is not '2', the presentation variant qualifier prompt will not be shown.
 * @returns the prompts used to provide input for system selection and a reference to the answers object which will be populated with the user's responses once `inquirer.prompt` returns
 */
export function getEntitySelectionQuestions(
    metadata: string,
    templateType: TemplateType,
    isCapService = false,
    promptOptions?: EntityPromptOptions,
    annotations?: Annotations
): Question<EntitySelectionAnswers & TableConfigAnswers & AnnotationGenerationAnswers & AlpTableConfigAnswers>[] {
    let entitySetFilter: EntitySetFilter | undefined;
    if (templateType === 'feop' && !!isCapService) {
        entitySetFilter = 'filterDraftEnabled';
    } else if (templateType === 'alp') {
        entitySetFilter = 'filterAggregateTransformationsOnly';
    }

    const entityChoices = getEntityChoices(metadata, {
        useEntityTypeAsName: templateType === 'ovp',
        defaultMainEntityName: promptOptions?.defaultMainEntityName,
        entitySetFilter
    });

    if (!entityChoices.convertedMetadata || !entityChoices.odataVersion) {
        // getEntityChoiceOptions will log an error if the metadata or its odata version are unparseable
        return [];
    }
    const odataVersion = entityChoices.odataVersion;

    const entityQuestions: Question<
        EntitySelectionAnswers & TableConfigAnswers & AnnotationGenerationAnswers & AlpTableConfigAnswers
    >[] = [];

    // OVP only has filter entity, does not use tables and we do not add annotations
    if (templateType === 'ovp') {
        entityQuestions.push({
            type: promptOptions?.useAutoComplete ? 'autocomplete' : 'list',
            name: EntityPromptNames.filterEntityType,
            message: t('prompts.filterEntityType.message'),
            guiOptions: {
                breadcrumb: true
            },
            choices: entityChoices.choices,
            source: (preAnswers: EntitySelectionAnswers, input: string) =>
                searchChoices(input, entityChoices.choices as ListChoiceOptions[]),
            default: entityChoices.defaultMainEntityIndex ?? entityChoices.draftRootIndex ?? 0,
            validate: () => (entityChoices.choices.length === 0 ? t('prompts.filterEntityType.noEntitiesError') : true)
        } as ListQuestion<EntitySelectionAnswers>);
    } else {
        entityQuestions.push({
            type: promptOptions?.useAutoComplete ? 'autocomplete' : 'list',
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
            additionalMessages: () => {
                if (promptOptions?.defaultMainEntityName && entityChoices.defaultMainEntityIndex === undefined) {
                    return {
                        message: t('prompts.mainEntitySelection.defaultEntityNameNotFoundWarning'),
                        severity: Severity.warning
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
                    if (answers.mainEntity) {
                        navigationEntityChoices = getNavigationEntityChoices(
                            convertedMetadata,
                            odataVersion,
                            answers.mainEntity.entitySetName
                        );
                        return navigationEntityChoices.length > 0;
                    }
                    return false;
                },
                type: promptOptions?.useAutoComplete ? 'autocomplete' : 'list',
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

        entityQuestions.push(...getAddAnnotationQuestions(metadata, templateType, odataVersion, isCapService));

        if (!promptOptions?.hideTableLayoutPrompts) {
            entityQuestions.push(...getTableLayoutQuestions(templateType, odataVersion, isCapService));
        }

        if (templateType === 'alp') {
            entityQuestions.push(
                ...getAnalyticListPageQuestions(odataVersion, annotations, promptOptions?.hideTableLayoutPrompts)
            );
        }
    }
    return entityQuestions;
}

/**
 *
 * @param templateType
 * @param odataVersion
 * @param isCapService
 * @returns
 */
function getTableLayoutQuestions(
    templateType: TemplateType,
    odataVersion: OdataVersion,
    isCapService: boolean
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
        const tableTypeDefault: TableType = templateType === 'alp' ? 'AnalyticalTable' : 'ResponsiveTable';
        tableLayoutQuestions.push({
            when: (prevAnswers: EntitySelectionAnswers) => !!prevAnswers.mainEntity,
            type: 'list',
            name: EntityPromptNames.tableType,
            message: t('prompts.tableType.message'),
            guiOptions: {
                hint: t('prompts.tableType.hint'),
                breadcrumb: true
            },
            choices: (): ListChoiceOptions[] => tableTypeChoices,
            default: tableTypeDefault
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
            default: '',
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
 * @param {string} edmx - The EDMX string to measure.
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
 * @param metadata
 * @param templateType
 * @param odataVersion
 * @param isCapService
 * @returns
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
